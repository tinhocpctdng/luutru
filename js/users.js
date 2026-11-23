// ==========================================
// QUẢN LÝ NGƯỜI DÙNG (CHỈ QUẢN TRỊ VIÊN GỐC)
// ==========================================

async function loadAllUsers() {
  const { data, error } = await client.from("profiles").select("*").order("created_at", { ascending: false });
  const tbody = document.getElementById("users-body");

  if (error) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-red-500">Lỗi tải danh sách: ${escapeHTML(error.message)}</td></tr>`;
    return;
  }

  allUsersCache = data || [];
  const validIds = new Set(allUsersCache.map(u => u.id));
  selectedUserIds.forEach(id => {
    if (!validIds.has(id)) selectedUserIds.delete(id);
  });

  filterUserTable();
}

function filterUserTable() {
  const selectedDept = document.getElementById("filter_user_department")?.value || "all";
  const keyword = (document.getElementById("search_user_input")?.value || "").trim().toLowerCase();

  const filtered = allUsersCache.filter(u => {
    if (selectedDept !== "all") {
      const userDept = u.role === "admin" ? "Ban Giám Hiệu" : (u.department || "Chưa phân tổ");
      if (userDept !== selectedDept) return false;
    }
    if (keyword) {
      const displayCode = cleanTeacherCode(u.email).toLowerCase();
      const matchName = u.full_name && u.full_name.toLowerCase().includes(keyword);
      const matchCode = displayCode.includes(keyword);
      if (!matchName && !matchCode) return false;
    }
    return true;
  });

  currentFilteredUsers = filtered;
  renderUsersTable(filtered);
}

function renderUsersTable(usersList) {
  const tbody = document.getElementById("users-body");
  const countLabel = document.getElementById("user-count-label");
  if (countLabel) countLabel.innerText = `Hiển thị: ${usersList.length} / ${allUsersCache.length} tài khoản`;

  tbody.innerHTML = "";
  if (usersList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-400 italic">Không tìm thấy tài khoản nào phù hợp với điều kiện lọc.</td></tr>`;
    updateBulkActionUI();
    return;
  }

  const posBadge = {
    gvcn: '<span class="ml-1.5 px-2 py-0.5 text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">GVCN</span>',
    doan: '<span class="ml-1.5 px-2 py-0.5 text-[11px] bg-sky-50 text-sky-700 border border-sky-200 rounded-full">Cán bộ Đoàn</span>'
  };

  usersList.forEach(user => {
    const isChecked = selectedUserIds.has(user.id);
    const displayCode = cleanTeacherCode(user.email);
    const safeUid = escapeHTML(user.id);
    const roleLabel =
      user.role === "admin" ? '<span class="text-purple-600 font-bold">Ban Giám Hiệu</span>' :
      user.role === "hod" ? '<span class="text-blue-600 font-bold">Tổ trưởng</span>' :
      user.role === "vice_hod" ? '<span class="text-indigo-600 font-bold">Tổ phó</span>' :
      user.role === "clerk" ? '<span class="text-amber-600 font-bold">Văn thư</span>' : "Giáo viên";

    const extraPos = posBadge[user.position] || "";

    const tr = document.createElement("tr");
    tr.className = isChecked ? "bg-purple-50/70 transition" : "hover:bg-slate-50 transition";
    tr.innerHTML = `
      <td class="p-3.5 text-center">
        <input type="checkbox" ${isChecked ? "checked" : ""} onchange="toggleSingleUser('${safeUid}', this.checked)"
               class="rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer">
      </td>
      <td class="p-3.5 font-semibold text-slate-900">${escapeHTML(user.full_name)}</td>
      <td class="p-3.5 font-bold text-blue-700">${escapeHTML(displayCode || "N/A")}</td>
      <td class="p-3.5 text-slate-600">${user.role === "admin" ? '<span class="text-slate-400 italic">- Ban Giám Hiệu -</span>' : escapeHTML(user.department)}</td>
      <td class="p-3.5">${roleLabel}${extraPos}</td>
      <td class="p-3.5 text-right space-x-2">
        <button data-id="${safeUid}" data-name="${escapeHTML(user.full_name)}" data-dept="${escapeHTML(user.department)}" data-role="${escapeHTML(user.role)}" data-pos="${escapeHTML(user.position || "none")}"
                onclick="openEditModalFromBtn(this)"
                class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 rounded-lg text-xs font-semibold transition">Sửa</button>
        <button onclick="deleteUserProfile('${safeUid}')"
                class="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1 rounded-lg text-xs font-semibold transition">Xóa</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  updateBulkActionUI();
}

function toggleSingleUser(userId, isChecked) {
  if (isChecked) selectedUserIds.add(userId);
  else selectedUserIds.delete(userId);
  renderUsersTable(currentFilteredUsers);
}

function toggleSelectAllUsers(checkbox) {
  if (checkbox.checked) {
    currentFilteredUsers.forEach(u => selectedUserIds.add(u.id));
  } else {
    currentFilteredUsers.forEach(u => selectedUserIds.delete(u.id));
  }
  renderUsersTable(currentFilteredUsers);
}

function clearSelectedUsers() {
  selectedUserIds.clear();
  renderUsersTable(currentFilteredUsers);
}

function updateBulkActionUI() {
  const bulkBar = document.getElementById("bulk-user-actions");
  const countEl = document.getElementById("selected-users-count");
  const selectAllEl = document.getElementById("select_all_users");

  if (countEl) countEl.innerText = selectedUserIds.size;
  if (bulkBar) {
    bulkBar.classList.toggle("hidden", selectedUserIds.size === 0);
  }

  if (selectAllEl) {
    if (currentFilteredUsers.length === 0) {
      selectAllEl.checked = false;
      selectAllEl.indeterminate = false;
    } else {
      const selectedInView = currentFilteredUsers.filter(u => selectedUserIds.has(u.id)).length;
      selectAllEl.checked = selectedInView === currentFilteredUsers.length;
      selectAllEl.indeterminate = selectedInView > 0 && selectedInView < currentFilteredUsers.length;
    }
  }
}

function formatUsersForExcel(users) {
  return users.map(user => ({
    "Mã GV": cleanTeacherCode(user.email),
    "Mật khẩu": "",
    "Họ và tên": user.full_name,
    "Tổ bộ môn": user.role === "admin" ? "Không áp dụng" : user.department,
    "Quyền hạn": getRoleLabel(user.role),
    "Chức vụ kiêm nhiệm": getPositionLabel(user.position)
  }));
}

function downloadUsersWorkbook(users, sheetName, fileName) {
  const worksheet = XLSX.utils.json_to_sheet(formatUsersForExcel(users));
  worksheet["!cols"] = [{ wch: 15 }, { wch: 14 }, { wch: 25 }, { wch: 28 }, { wch: 18 }, { wch: 22 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
}

function exportSelectedUsersToExcel() {
  if (selectedUserIds.size === 0) return alert("Vui lòng chọn ít nhất 1 tài khoản!");
  const selectedList = allUsersCache.filter(u => selectedUserIds.has(u.id));
  downloadUsersWorkbook(selectedList, "TaiKhoanDaChon", `DanhSach_DaChon_${selectedList.length}GV.xlsx`);
}

async function exportUsersToExcel() {
  const { data, error } = await client.from("profiles").select("*").order("created_at", { ascending: false });
  if (error) return alert("Lỗi tải dữ liệu: " + error.message);
  downloadUsersWorkbook(data || [], "DanhSachGiaoVien", "DanhSachGiaoVien.xlsx");
}

async function bulkChangeDepartment() {
  const targetDept = document.getElementById("bulk_target_dept").value;
  if (!targetDept) return alert("Vui lòng chọn tổ bộ môn muốn chuyển đến!");
  if (selectedUserIds.size === 0) return;

  const ids = Array.from(selectedUserIds).filter(id => id !== currentUser.id);
  if (ids.length === 0) return alert("Không thể thay đổi tổ của tài khoản Admin đang đăng nhập!");

  if (!confirm(`Chuyển ${ids.length} tài khoản đã chọn sang tổ "${targetDept}"?`)) return;

  const { error } = await client.from("profiles")
    .update({ department: targetDept })
    .in("id", ids);

  if (error) {
    alert("Lỗi cập nhật tổ: " + error.message);
  } else {
    alert(`Đã chuyển ${ids.length} tài khoản sang tổ ${targetDept} thành công!`);
    document.getElementById("bulk_target_dept").value = "";
    loadAllUsers();
  }
}

async function bulkDeleteSelectedUsers() {
  if (selectedUserIds.size === 0) return;

  const idsToDelete = Array.from(selectedUserIds).filter(id => id !== currentUser.id);
  if (idsToDelete.length === 0) {
    return alert("Bạn không thể tự xóa tài khoản của chính mình đang đăng nhập!");
  }

  if (!confirm(`CẢNH BÁO: Bạn có chắc chắn muốn xóa ${idsToDelete.length} tài khoản đã chọn khỏi hệ thống?`)) return;

  const { error } = await client.from("profiles")
    .delete()
    .in("id", idsToDelete);

  if (error) {
    alert("Lỗi khi xóa hàng loạt: " + error.message);
  } else {
    alert(`Đã xóa thành công ${idsToDelete.length} tài khoản!`);
    selectedUserIds.clear();
    loadAllUsers();
  }
}

function openEditModalFromBtn(btn) {
  openEditModal(
    btn.getAttribute("data-id"),
    btn.getAttribute("data-name"),
    btn.getAttribute("data-dept"),
    btn.getAttribute("data-role"),
    btn.getAttribute("data-pos")
  );
}

function openEditModal(id, name, dept, role, pos) {
  document.getElementById("edit_user_id").value = id;
  document.getElementById("edit_full_name").value = name;
  document.getElementById("edit_department").value = dept;
  document.getElementById("edit_role").value = role;
  document.getElementById("edit_position").value = pos || "none";
  document.getElementById("edit-user-modal").classList.remove("hidden");
  document.getElementById("edit_department").disabled = role === "admin";
}

function closeEditModal() {
  document.getElementById("edit-user-modal").classList.add("hidden");
}

async function saveUserUpdate() {
  const id = document.getElementById("edit_user_id").value;
  const full_name = document.getElementById("edit_full_name").value.trim();
  let department = document.getElementById("edit_department").value;
  const role = document.getElementById("edit_role").value;
  const position = document.getElementById("edit_position").value;

  if (role === "admin") department = "Không áp dụng";
  if (!full_name) return alert("Vui lòng nhập tên");

  const { error } = await client.from("profiles")
    .update({ full_name, department, role, position })
    .eq("id", id);

  if (error) {
    alert("Lỗi cập nhật: " + error.message);
  } else {
    alert("Cập nhật thông tin thành công!");
    closeEditModal();
    loadAllUsers();
  }
}

function openAddModal() {
  document.getElementById("add_email").value = "";
  document.getElementById("add_password").value = "";
  document.getElementById("add_full_name").value = "";
  document.getElementById("add_position").value = "none";
  document.getElementById("add-user-modal").classList.remove("hidden");
  document.getElementById("add_department").disabled = document.getElementById("add_role").value === "admin";
}

function closeAddModal() {
  document.getElementById("add-user-modal").classList.add("hidden");
}

async function saveNewUser() {
  const teacherCode = document.getElementById("add_email").value.trim().replace(/\s+/g, "");
  const password = document.getElementById("add_password").value;
  const full_name = document.getElementById("add_full_name").value.trim();
  let department = document.getElementById("add_department").value;
  const role = document.getElementById("add_role").value;
  const position = document.getElementById("add_position").value;

  if (role === "admin") department = "Không áp dụng";
  const btn = document.getElementById("btn-save-new-user");

  if (!teacherCode || !password || !full_name) {
    return alert("Vui lòng nhập đầy đủ Mã giáo viên, Mật khẩu và Họ tên!");
  }
  if (password.length < 6) {
    return alert("Mật khẩu phải có ít nhất 6 ký tự!");
  }

  btn.disabled = true;
  btn.innerText = "Đang tạo...";

  const authEmail = toAuthEmail(teacherCode);
  const adminAuthClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });

  const { data, error } = await adminAuthClient.auth.signUp({
    email: authEmail,
    password: password,
    options: {
      data: { full_name, department, role, position }
    }
  });

  if (!error && data && data.user) {
    await new Promise(resolve => setTimeout(resolve, 200));
    await client.from("profiles").upsert({
      id: data.user.id,
      email: teacherCode,
      full_name: full_name,
      department: department,
      role: role,
      position: position,
      must_change_pw: true
    });
  }

  btn.disabled = false;
  btn.innerText = "Tạo tài khoản";

  if (error) {
    alert("Lỗi tạo tài khoản: " + error.message);
  } else {
    alert(`Đã tạo tài khoản "${teacherCode}" thành công!`);
    closeAddModal();
    setTimeout(() => loadAllUsers(), 800);
  }
}

async function deleteUserProfile(id) {
  if (id === currentUser.id) {
    return alert("Bạn không thể tự xóa tài khoản của chính mình đang đăng nhập!");
  }

  const confirmDelete = confirm("CẢNH BÁO: Hành động này sẽ xóa hồ sơ giáo viên khỏi danh sách hệ thống. Bạn có chắc chắn xóa?");
  if (!confirmDelete) return;

  const { error } = await client.from("profiles").delete().eq("id", id);

  if (error) {
    alert("Lỗi xóa tài khoản: " + error.message);
  } else {
    alert("Đã xóa hồ sơ giáo viên thành công!");
    loadAllUsers();
  }
}

async function importUsersFromExcel(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName]);

      if (jsonData.length === 0) return alert("File Excel trống!");

      let createdCount = 0;
      let updatedCount = 0;
      let failCount = 0;
      const errorLogs = [];

      const adminAuthClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      });

      const tbody = document.getElementById("users-body");

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        const rawCode = row["Mã GV"] !== undefined ? row["Mã GV"] : row["Email"];
        const teacherCode = rawCode ? String(rawCode).trim().replace(/\s+/g, "") : "";

        const password = row["Mật khẩu"] ? String(row["Mật khẩu"]).trim() : "123456";
        const fullName = row["Họ và tên"] ? String(row["Họ và tên"]).trim() : "";
        let dept = normalizeDepartmentName(row["Tổ bộ môn"]);
        const roleStr = row["Quyền hạn"] ? String(row["Quyền hạn"]).trim() : "Giáo viên";
        const posStr = row["Chức vụ kiêm nhiệm"] ? String(row["Chức vụ kiêm nhiệm"]).trim().toLowerCase() : "";

        if (!teacherCode || !fullName) continue;

        tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-blue-600 font-semibold">Đang đồng bộ dòng ${i + 1}/${jsonData.length}: ${escapeHTML(fullName)} (${escapeHTML(teacherCode)})...</td></tr>`;

        let role = "teacher";
        if (roleStr === "Quản trị viên" || roleStr === "Admin" || roleStr === "Ban Giám Hiệu") role = "admin";
        else if (roleStr === "Tổ trưởng") role = "hod";
        else if (roleStr === "Tổ phó") role = "vice_hod";
        else if (roleStr === "Nhân viên Văn thư" || roleStr === "Văn thư") role = "clerk";

        if (role === "admin") dept = "Không áp dụng";

        let position = "none";
        if (posStr.includes("chủ nhiệm") || posStr === "gvcn") position = "gvcn";
        else if (posStr.includes("đoàn") || posStr.includes("bí thư") || posStr.includes("công đoàn") || posStr === "doan") position = "doan";

        const authEmail = toAuthEmail(teacherCode);

        const { data: existingUser } = await client
          .from("profiles")
          .select("id")
          .or(`email.ilike.${teacherCode},email.eq.${authEmail}`)
          .maybeSingle();

        if (existingUser) {
          const { error: updateErr } = await client
            .from("profiles")
            .update({
              email: teacherCode,
              full_name: fullName,
              department: dept,
              role: role,
              position: position
            })
            .eq("id", existingUser.id);

          if (!updateErr) updatedCount++;
          else {
            failCount++;
            errorLogs.push(`${teacherCode}: ${updateErr.message}`);
          }
        } else {
          if (password.length < 6) {
            failCount++;
            errorLogs.push(`${teacherCode}: Mật khẩu phải từ 6 ký tự trở lên`);
            continue;
          }

          const { data: signUpData, error: signUpErr } = await adminAuthClient.auth.signUp({
            email: authEmail,
            password: password,
            options: {
              data: { full_name: fullName, department: dept, role: role, position: position }
            }
          });

          if (!signUpErr) {
            if (signUpData && signUpData.user) {
              await new Promise(resolve => setTimeout(resolve, 200));
              await client.from("profiles").upsert({
                id: signUpData.user.id,
                email: teacherCode,
                full_name: fullName,
                department: dept,
                role: role,
                position: position,
                must_change_pw: true
              });
            }
            createdCount++;
          } else {
            failCount++;
            errorLogs.push(`${teacherCode}: ${signUpErr.message}`);
          }

          await new Promise(resolve => setTimeout(resolve, 250));
        }
      }

      let summary = `Hoàn tất đồng bộ dữ liệu!\n- Tạo mới: ${createdCount} tài khoản\n- Cập nhật: ${updatedCount} tài khoản\n- Lỗi/Bỏ qua: ${failCount} dòng`;
      if (errorLogs.length > 0) summary += `\n\nChi tiết lỗi:\n` + errorLogs.slice(0, 5).join("\n");
      alert(summary);

      setTimeout(() => loadAllUsers(), 1000);
    } catch (error) {
      alert("Lỗi đọc file Excel: " + error.message);
      loadAllUsers();
    }
  };

  reader.readAsArrayBuffer(file);
  e.target.value = "";
}
