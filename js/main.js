// ==========================================
// KHỞI TẠO ỨNG DỤNG & ĐIỀU HƯỚNG TAB
// ==========================================

async function initApplication() {
  let { data: profile } = await client
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .maybeSingle();

  // Chặn tài khoản không có trong danh sách profiles (trừ Admin gốc)
  if (!profile) {
    if (isSuperAdmin()) {
      const { data: adminProf } = await client.from("profiles").insert({
        id: currentUser.id,
        email: currentUser.email,
        full_name: "Quản trị Hệ thống",
        department: "Ban Giám Hiệu",
        role: "admin",
        position: "none",
        must_change_pw: false
      }).select().single();
      profile = adminProf;
    } else {
      await client.auth.signOut();
      alert("Tài khoản của bạn chưa được cấp quyền hoặc đã bị thu hồi khỏi hệ thống!");
      location.reload();
      return;
    }
  }

  userProfile = profile;

  // Cập nhật giao diện Header
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("app-screen").classList.remove("hidden");
  document.getElementById("user-name").innerText = userProfile.full_name;

  // Bắt buộc đổi mật khẩu khi đăng nhập lần đầu (trừ Admin gốc)
  if (userProfile.must_change_pw === true && !isSuperAdmin()) {
    openPasswordModal(true);
  }

  // Tạo chữ viết tắt cho Avatar tròn trên Header
  const nameParts = String(userProfile.full_name || "GV").trim().split(/\s+/);
  const initials = nameParts.length >= 2
    ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
    : nameParts[0].slice(0, 2).toUpperCase();
  const avatarEl = document.getElementById("user-avatar");
  if (avatarEl) avatarEl.innerText = initials;

  // Hiển thị/ẩn nhãn Tổ bộ môn
  const deptBadge = document.getElementById("dept-badge");
  if (userProfile.role === "admin" || isSuperAdmin()) {
    deptBadge.classList.add("hidden");
  } else {
    deptBadge.innerText = "Tổ: " + userProfile.department;
    deptBadge.classList.remove("hidden");
  }

  document.getElementById("user-role").innerText = isSuperAdmin()
    ? "Quản trị Hệ thống"
    : getRoleLabel(userProfile.role);

  // Mở khung đăng tải ở "Kho chung toàn trường" CHỈ CHO Admin và Văn thư
  if (userProfile.role === "admin" || userProfile.role === "clerk") {
    const uploadBox = document.getElementById("upload-template-box");
    if (uploadBox) uploadBox.classList.remove("hidden");
  }

  // Hiển thị Tab duyệt bài cho Tổ trưởng, Tổ phó và BGH
  if (userProfile.role === "admin" || userProfile.role === "hod" || userProfile.role === "vice_hod") {
    document.getElementById("tab-btn-review").classList.remove("hidden");
    if (userProfile.role === "admin") {
      loadDepartmentOptions();
      const syncBtn = document.getElementById("btn-sync-drive");
      if (syncBtn) syncBtn.classList.remove("hidden");
    }
    loadReviewSubmissions();
  }

  // Hiển thị nút Quản trị Hệ thống CHỈ DÀNH CHO Quản trị viên gốc
  if (isSuperAdmin()) {
    document.getElementById("tab-btn-users").classList.remove("hidden");
    loadAllUsers();
  }

  // Dựng danh mục lưu trữ và cây thư mục bên trái
  renderAllowedCategories();
  renderFolderTree();

  // Tải dữ liệu cơ bản & kích hoạt đếm giờ tự đăng xuất
  loadMySubmissions();
  loadSharedDocs();
  switchTab("upload");
  resetIdleTimer();
}

function switchTab(tab) {
  const tabs = ["upload", "my-docs", "shared", "folder-view", "review", "users"];

  tabs.forEach(t => {
    const section = document.getElementById(`tab-${t}`);
    if (section) section.classList.add("hidden");
  });

  const btnUpload = document.getElementById("tab-btn-upload");
  const btnDocs = document.getElementById("tab-btn-docs");
  const btnReview = document.getElementById("tab-btn-review");
  const btnUsers = document.getElementById("tab-btn-users");

  if (btnUpload) btnUpload.className = "w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-slate-100 text-slate-700 font-medium text-sm flex items-center transition";
  if (btnDocs) btnDocs.className = "w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-slate-100 text-slate-700 font-medium text-sm flex items-center transition";

  if (btnReview) {
    if (userProfile && (userProfile.role === "admin" || userProfile.role === "hod" || userProfile.role === "vice_hod")) {
      btnReview.className = "px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold text-xs sm:text-sm inline-flex items-center transition shadow-xs";
    } else {
      btnReview.className = "hidden";
    }
  }

  if (btnUsers) {
    if (isSuperAdmin()) {
      btnUsers.className = "px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-semibold text-xs sm:text-sm inline-flex items-center transition shadow-xs";
    } else {
      btnUsers.className = "hidden";
    }
  }

  const activeSection = document.getElementById(`tab-${tab}`);
  if (activeSection) activeSection.classList.remove("hidden");

  if (tab === "upload" && btnUpload) {
    btnUpload.className = "w-full text-left px-3.5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm flex items-center shadow-sm shadow-blue-600/20 transition";
  } else if (tab === "my-docs" && btnDocs) {
    btnDocs.className = "w-full text-left px-3.5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm flex items-center shadow-sm shadow-blue-600/20 transition";
  } else if (tab === "review" && btnReview) {
    btnReview.className = "px-3.5 py-2 rounded-xl bg-amber-500 text-white border border-amber-500 font-semibold text-xs sm:text-sm inline-flex items-center shadow-sm transition";
  } else if (tab === "users" && btnUsers) {
    btnUsers.className = "px-3.5 py-2 rounded-xl bg-purple-600 text-white border border-purple-600 font-semibold text-xs sm:text-sm inline-flex items-center shadow-sm transition";
  }
}

// ==========================================
// GIỮ PHIÊN ĐĂNG NHẬP KHI TẢI LẠI TRANG (F5)
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
  populateDepartmentSelects();

  document.getElementById("add_role").addEventListener("change", (e) => {
    document.getElementById("add_department").disabled = e.target.value === "admin";
  });
  document.getElementById("edit_role").addEventListener("change", (e) => {
    document.getElementById("edit_department").disabled = e.target.value === "admin";
  });

  const { data: { session } } = await client.auth.getSession();
  if (session && session.user) {
    currentUser = session.user;
    const btn = document.getElementById("btn-login");
    if (btn) {
      btn.disabled = true;
      btn.innerText = "Đang khôi phục phiên...";
    }
    await initApplication();
  }
});

client.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_OUT") {
    currentUser = null;
    userProfile = null;
    document.getElementById("app-screen").classList.add("hidden");
    document.getElementById("login-screen").classList.remove("hidden");
  }
});
