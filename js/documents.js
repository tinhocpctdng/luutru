// ==========================================
// NỘP HỒ SƠ, HỒ SƠ CÁ NHÂN & KHO CHUNG TOÀN TRƯỜNG
// ==========================================

// 1. Tải file lên Google Drive qua Google Apps Script
async function handleUpload(e) {
  e.preventDefault();
  const fileInput = document.getElementById("file_input");
  const file = fileInput.files[0];

  const validationError = validateUploadFile(file);
  if (validationError) return alert(validationError);

  const category = document.getElementById("category").value;
  const grade = document.getElementById("grade").value;
  const week_no = document.getElementById("week_no").value;
  const title = document.getElementById("doc_title").value.trim();
  const btn = document.getElementById("btn-submit");

  if (!title) return alert("Vui lòng nhập tên bài học / tiêu đề hồ sơ!");

  const isSharedDoc = SHARED_CATEGORIES.includes(category);

  btn.disabled = true;
  btn.innerText = "Đang đẩy tệp lên hệ thống...";

  try {
    const base64Data = await readFileAsBase64(file);
    const { data: { session } } = await client.auth.getSession();

    const formData = new URLSearchParams();
    formData.append("fileName", file.name);
    formData.append("mimeType", file.type || "application/octet-stream");
    formData.append("fileData", base64Data);
    formData.append("teacherName", userProfile.full_name);
    formData.append("week", week_no);
    formData.append("department", userProfile.department);
    formData.append("category", category);
    if (isSharedDoc) formData.append("isTemplate", "true");
    formData.append("accessToken", session ? session.access_token : "");

    const result = await postToAppsScriptWithRetry(formData, btn);
    if (!result.success) throw new Error(result.error || "Lỗi Google Drive");

    const deptSlug = toSlug(userProfile.department);
    const storageLabel = isSharedDoc
      ? `00_cong-khai/${category}/${file.name}`
      : `GoogleDrive/02_to-chuyen-mon/${deptSlug}/${category}`;

    const { error: dbError } = await client.from("submissions").insert({
      teacher_id: currentUser.id,
      teacher_name: userProfile.full_name,
      department: userProfile.department,
      category: category,
      grade: grade && grade !== "all" ? parseInt(grade, 10) : null,
      week_no: week_no ? parseInt(week_no, 10) : null,
      title: title,
      file_name: file.name,
      file_url: result.fileUrl,
      storage_path: storageLabel,
      status: isSharedDoc ? "approved" : "pending"
    });

    if (dbError) throw new Error("Lỗi lưu DB Supabase: " + dbError.message);

    alert("Đã nộp hồ sơ thành công vào Kho lưu trữ của nhà trường!");
    fileInput.value = "";
    document.getElementById("doc_title").value = "";
    loadMySubmissions();
    if (isSharedDoc) loadSharedDocs();
    switchTab("my-docs");
  } catch (err) {
    alert("Thao tác thất bại: " + err.message);
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.innerText = "Nộp hồ sơ lên hệ thống";
  }
}

// 2. Lấy danh sách hồ sơ cá nhân
async function loadMySubmissions() {
  const { data } = await client.from("submissions")
    .select("*")
    .eq("teacher_id", currentUser.id)
    .order("submitted_at", { ascending: false });

  const tbody = document.getElementById("my-docs-body");
  tbody.innerHTML = "";
  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-400 italic">Chưa có tài liệu nào được tải lên.</td></tr>`;
    return;
  }

  data.forEach(item => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50 transition";
    const safeId = Number(item.id);
    tr.innerHTML = `
      <td class="p-3.5 font-semibold text-slate-700">Tuần ${escapeHTML(item.week_no || "-")}</td>
      <td class="p-3.5 text-slate-600">${item.grade ? "Khối " + escapeHTML(item.grade) : "Toàn trường"}</td>
      <td class="p-3.5 font-medium text-slate-900">${escapeHTML(item.title)}</td>
      <td class="p-3.5 text-slate-500">${new Date(item.submitted_at).toLocaleDateString("vi-VN")}</td>
      <td class="p-3.5">
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${item.status === "approved" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}">
          <span class="w-1.5 h-1.5 rounded-full mr-1.5 ${item.status === "approved" ? "bg-emerald-500" : "bg-amber-500"}"></span>
          ${item.status === "approved" ? "Đã duyệt" : "Chờ duyệt"}
        </span>
      </td>
      <td class="p-3.5 text-right space-x-3">
        <a href="${safeUrl(item.file_url)}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline font-semibold">Tải về</a>
        ${item.status === "pending" && Number.isFinite(safeId) ? `<button onclick="deleteMySubmission(${safeId})" class="text-red-500 hover:underline text-xs font-semibold">Xóa</button>` : ""}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function deleteMySubmission(id) {
  if (!confirm("Bạn muốn xóa hồ sơ đang chờ duyệt này để nộp lại?")) return;
  const { error } = await client.from("submissions").delete().eq("id", id);
  if (error) alert("Lỗi khi xóa: " + error.message);
  else loadMySubmissions();
}

// 3. Lấy danh sách Kho chung toàn trường
async function loadSharedDocs(subCategory = null, customTitle = null) {
  const titleEl = document.getElementById("shared-folder-title");
  if (titleEl && customTitle) titleEl.innerText = customTitle;

  let query = client.from("submissions")
    .select("*")
    .like("storage_path", "00_cong-khai/%")
    .order("submitted_at", { ascending: false });

  if (subCategory) {
    query = query.eq("category", subCategory);
  }

  const { data } = await query;
  const container = document.getElementById("shared-docs-list");
  container.innerHTML = "";
  if (!data || data.length === 0) {
    container.innerHTML = `<div class="text-sm text-slate-400 italic py-4">Hiện chưa có văn bản / biểu mẫu nào trong mục này.</div>`;
    return;
  }

  data.forEach(item => {
    const div = document.createElement("div");
    div.className = "flex justify-between items-center p-3.5 bg-slate-50/80 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 transition";
    div.innerHTML = `
      <div>
        <div class="font-semibold text-slate-800">${escapeHTML(item.title)}</div>
        <div class="text-xs text-slate-400 mt-0.5">Người đăng: ${escapeHTML(item.teacher_name)} • Ngày: ${new Date(item.submitted_at).toLocaleDateString("vi-VN")}</div>
      </div>
      <a href="${safeUrl(item.file_url)}" target="_blank" rel="noopener noreferrer" class="text-xs sm:text-sm bg-white border border-slate-300 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 px-3.5 py-1.5 rounded-xl text-slate-700 font-semibold transition">Tải xuống</a>
    `;
    container.appendChild(div);
  });
}

// 4. Đăng tải biểu mẫu chung (BGH và Nhân viên Văn thư)
async function handleUploadTemplate(e) {
  e.preventDefault();
  if (userProfile.role !== "admin" && userProfile.role !== "clerk") {
    return alert("Bạn không có quyền thực hiện thao tác này!");
  }

  const subCatEl = document.getElementById("template_category");
  const subCat = subCatEl ? subCatEl.value : "bieu-mau";
  const title = document.getElementById("template_title").value.trim();
  const fileInput = document.getElementById("template_file");
  const file = fileInput.files[0];
  const btn = document.getElementById("btn-upload-template");

  if (!title) return alert("Vui lòng nhập tên văn bản / biểu mẫu!");
  const validationError = validateUploadFile(file, ["pdf", "doc", "docx", "xls", "xlsx"]);
  if (validationError) return alert(validationError);

  btn.disabled = true;
  btn.innerText = "Đang tải lên kho chung...";

  try {
    const base64Data = await readFileAsBase64(file);
    const { data: { session } } = await client.auth.getSession();

    const formData = new URLSearchParams();
    formData.append("fileName", file.name);
    formData.append("mimeType", file.type || "application/octet-stream");
    formData.append("fileData", base64Data);
    formData.append("teacherName", userProfile.full_name || "Ban Giám Hiệu");
    formData.append("category", subCat);
    formData.append("isTemplate", "true");
    formData.append("accessToken", session ? session.access_token : "");

    const result = await postToAppsScriptWithRetry(formData, btn);
    if (!result.success) throw new Error(result.error || "Lỗi Google Drive");

    const { error: dbError } = await client.from("submissions").insert({
      teacher_id: currentUser.id,
      teacher_name: userProfile.full_name || "Ban Giám Hiệu",
      department: userProfile.department || "Ban Giám Hiệu",
      category: subCat,
      title: title,
      file_name: file.name,
      file_url: result.fileUrl,
      storage_path: `00_cong-khai/${subCat}/${file.name}`,
      status: "approved"
    });

    if (dbError) {
      throw new Error("Tệp đã lên Drive nhưng lỗi lưu Database Supabase: " + dbError.message);
    }

    alert("Đã đăng tải biểu mẫu lên kho chung thành công!");
    document.getElementById("template_title").value = "";
    fileInput.value = "";
    loadSharedDocs(subCat);
  } catch (err) {
    alert("Thông báo lỗi: " + err.message);
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.innerText = "Đăng tải";
  }
}
