// ==========================================
// DUYỆT HỒ SƠ & XUẤT BÁO CÁO TIẾN ĐỘ (.XLSX)
// ==========================================

async function loadReviewSubmissions() {
  let query = client.from("submissions")
    .select("*")
    .order("submitted_at", { ascending: false })
    .limit(2000);

  if (userProfile.role === "hod" || userProfile.role === "vice_hod") {
    query = query.eq("department", userProfile.department);
    const filterDeptEl = document.getElementById("filter_department");
    if (filterDeptEl) filterDeptEl.classList.add("hidden");
  } else if (userProfile.role === "admin") {
    const selectedDept = document.getElementById("filter_department").value;
    if (selectedDept && selectedDept !== "all") {
      query = query.eq("department", selectedDept);
    }
  }

  const selectedWeek = document.getElementById("filter_week").value;
  if (selectedWeek) {
    query = query.eq("week_no", parseInt(selectedWeek, 10));
  }

  const selectedStatus = document.getElementById("filter_status").value;
  if (selectedStatus && selectedStatus !== "all") {
    query = query.eq("status", selectedStatus);
  }

  const { data, error } = await query;
  const tbody = document.getElementById("review-body");
  tbody.innerHTML = "";

  if (error || !data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-400 italic">Không tìm thấy hồ sơ nào phù hợp với bộ lọc</td></tr>`;
    return;
  }

  data.forEach(item => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50 transition";
    const safeId = Number(item.id);
    tr.innerHTML = `
      <td class="p-3.5 font-semibold text-slate-900">${escapeHTML(item.teacher_name)}</td>
      <td class="p-3.5 text-slate-600">${escapeHTML(item.department)}</td>
      <td class="p-3.5 text-slate-600">${item.grade ? "Khối " + escapeHTML(item.grade) : "Toàn trường"} - T${escapeHTML(item.week_no || "-")}</td>
      <td class="p-3.5 text-slate-800">${escapeHTML(item.title)}</td>
      <td class="p-3.5">
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${item.status === "approved" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}">
          <span class="w-1.5 h-1.5 rounded-full mr-1.5 ${item.status === "approved" ? "bg-emerald-500" : "bg-amber-500"}"></span>
          ${item.status === "approved" ? "Đã duyệt" : "Chờ duyệt"}
        </span>
      </td>
      <td class="p-3.5 text-right space-x-2">
        <a href="${safeUrl(item.file_url)}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline font-medium">Xem file</a>
        ${item.status === "pending" && Number.isFinite(safeId) ? `<button onclick="approveSubmission(${safeId})" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1 rounded-lg shadow-xs transition">Duyệt</button>` : '<span class="text-xs text-slate-400 font-medium">Đã hoàn tất</span>'}
        ${userProfile.role === "admin" && Number.isFinite(safeId) ? `<button onclick="deleteReviewSubmission(${safeId})" class="bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold px-2.5 py-1 rounded-lg transition">Xóa</button>` : ""}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function approveSubmission(id) {
  const { error } = await client.from("submissions").update({ status: "approved" }).eq("id", id);
  if (error) {
    alert("Lỗi khi duyệt: " + error.message);
  } else {
    loadReviewSubmissions();
    loadMySubmissions();
    if (typeof loadFooterStats === "function") loadFooterStats();
  }
}

async function exportProgressReport() {
  const { data: profiles, error: profileErr } = await client.from("profiles").select("*");
  if (profileErr) return alert("Lỗi tải danh sách giáo viên: " + profileErr.message);

  const { data: submissions, error: subErr } = await client.from("submissions").select("*").range(0, 9999);
  if (subErr) return alert("Lỗi tải danh sách nộp bài: " + subErr.message);

  let targetProfiles = profiles.filter(p => p.role !== "admin");
  let reportTitle = "BaoCaoTienDo_ToanTruong";

  if (userProfile.role === "hod" || userProfile.role === "vice_hod") {
    targetProfiles = targetProfiles.filter(p => p.department === userProfile.department);
    reportTitle = `BaoCaoTienDo_${toSlug(userProfile.department)}`;
  } else if (userProfile.role === "admin") {
    const selectedDept = document.getElementById("filter_department").value;
    if (selectedDept && selectedDept !== "all") {
      targetProfiles = targetProfiles.filter(p => p.department === selectedDept);
      reportTitle = `BaoCaoTienDo_${toSlug(selectedDept)}`;
    }
  }

  const reportData = targetProfiles.map(teacher => {
    const teacherSubs = submissions.filter(s => s.teacher_id === teacher.id);
    const totalSubmitted = teacherSubs.length;
    const hasLessonPlan = teacherSubs.some(s => s.category === "giao-an");
    const weeksList = [...new Set(teacherSubs.map(s => s.week_no).filter(Boolean))]
      .sort((a, b) => a - b)
      .join(", ");

    return {
      "Họ và tên": teacher.full_name,
      "Mã GV": cleanTeacherCode(teacher.email) || "N/A",
      "Tổ bộ môn": teacher.department,
      "Chức vụ": getRoleLabel(teacher.role),
      "Kiêm nhiệm": teacher.position === "gvcn" ? "GVCN" : (teacher.position === "doan" ? "Cán bộ Đoàn" : ""),
      "Tổng số bài đã nộp": totalSubmitted,
      "Đã nộp Giáo án": hasLessonPlan ? "Đã nộp" : "Chưa nộp",
      "Các tuần đã nộp": weeksList || "Không có",
      "Trạng thái chung": totalSubmitted > 0 ? "Đã tham gia nộp bài" : "Chưa nộp bài nào"
    };
  });

  if (reportData.length === 0) return alert("Không có dữ liệu để xuất báo cáo!");

  const worksheet = XLSX.utils.json_to_sheet(reportData);
  worksheet["!cols"] = [
    { wch: 25 }, { wch: 15 }, { wch: 24 }, { wch: 15 },
    { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 25 }, { wch: 22 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "BaoCaoTienDo");

  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `${reportTitle}_${dateStr}.xlsx`);
}

async function deleteReviewSubmission(id) {
  const deleted = await deleteSubmissionAndDrive(
    id,
    "Xóa hồ sơ này khỏi cả Website và Google Drive (chuyển vào Thùng rác Drive)?"
  );
  if (deleted) {
    loadReviewSubmissions();
    loadSharedDocs();
    loadMySubmissions();
    if (typeof loadFooterStats === "function") loadFooterStats();
  }
}

// Đồng bộ 2 chiều thủ công từ nút BGH trên giao diện Web
async function syncDriveNow() {
  if (!userProfile || userProfile.role !== "admin") {
    return alert("Chỉ Ban Giám Hiệu mới có quyền đồng bộ toàn trường!");
  }

  const btn = document.getElementById("btn-sync-drive");
  const originalHtml = btn ? btn.innerHTML : "";
  if (btn) {
    btn.disabled = true;
    btn.innerText = "Đang đồng bộ...";
  }

  try {
    const { data: { session } } = await client.auth.getSession();
    const formData = new URLSearchParams({
      action: "syncDrive",
      accessToken: session ? session.access_token : ""
    });

    const res = await postToAppsScriptWithRetry(formData, btn, 2);
    if (!res.success) {
      throw new Error(res.error || "Đồng bộ thất bại");
    }

    alert(
      `Đồng bộ 2 chiều hoàn tất!\n` +
      `- Tổng tệp trên Drive: ${res.totalDriveFiles}\n` +
      `- Thêm mới từ Drive về Web: ${res.inserted}\n` +
      `- Cập nhật tên/thư mục: ${res.updated}\n` +
      `- Gỡ bản ghi đã xóa trên Drive: ${res.deleted}`
    );

    loadReviewSubmissions();
    loadSharedDocs();
    loadMySubmissions();
    if (typeof loadFooterStats === "function") loadFooterStats();
  } catch (err) {
    alert("Lỗi đồng bộ: " + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  }
}
