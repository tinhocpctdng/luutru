// ==========================================
// XÁC THỰC, ĐỔI MẬT KHẨU & TỰ ĐĂNG XUẤT
// ==========================================

let isForcedPasswordChange = false;
let idleTimer = null;

// 1. Xử lý Đăng Nhập
async function handleLogin() {
  const code = document.getElementById("email").value.trim().replace(/\s+/g, "");
  const password = document.getElementById("password").value;
  const btn = document.getElementById("btn-login");

  if (!code || !password) return alert("Vui lòng điền đủ Mã giáo viên và mật khẩu!");

  btn.disabled = true;
  btn.innerText = "Đang kiểm tra...";

  const { data, error } = await client.auth.signInWithPassword({
    email: toAuthEmail(code),
    password: password
  });

  if (error) {
    alert("Đăng nhập thất bại: Sai mã giáo viên hoặc mật khẩu!");
    btn.disabled = false;
    btn.innerText = "Đăng Nhập Hệ Thống";
    return;
  }

  currentUser = data.user;
  await initApplication();
}

// 2. Đăng Xuất
async function handleLogout() {
  await client.auth.signOut();
  location.reload();
}

// Bật/tắt hiển thị mật khẩu
function togglePasswordVisibility(inputIds, checkboxId) {
  const isChecked = Boolean(document.getElementById(checkboxId)?.checked);
  inputIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.type = isChecked ? "text" : "password";
  });
}

// 3. Đổi mật khẩu (bắt buộc ở lần đăng nhập đầu tiên)
function openPasswordModal(isForced = false) {
  isForcedPasswordChange = Boolean(isForced);
  const p1El = document.getElementById("new_password");
  const p2El = document.getElementById("confirm_password");
  const chkEl = document.getElementById("show_new_password");

  p1El.value = "";
  p2El.value = "";
  p1El.type = "password";
  p2El.type = "password";
  if (chkEl) chkEl.checked = false;

  const modal = document.getElementById("password-modal");
  const titleEl = modal.querySelector("h3");
  const cancelBtn = document.getElementById("btn-cancel-password");

  if (isForcedPasswordChange) {
    titleEl.innerText = "⚠️ Yêu cầu đổi mật khẩu lần đầu";
    if (cancelBtn) cancelBtn.classList.add("hidden");
  } else {
    titleEl.innerText = "Đổi mật khẩu đăng nhập";
    if (cancelBtn) cancelBtn.classList.remove("hidden");
  }
  modal.classList.remove("hidden");
}

function closePasswordModal() {
  if (isForcedPasswordChange) return;
  document.getElementById("password-modal").classList.add("hidden");
}

async function saveNewPassword() {
  const p1 = document.getElementById("new_password").value;
  const p2 = document.getElementById("confirm_password").value;
  const btn = document.getElementById("btn-save-password");

  if (!p1 || p1.length < 6) {
    return alert("Mật khẩu mới phải có ít nhất 6 ký tự!");
  }
  if (p1 === "123456" || p1 === "12345678") {
    return alert("Vì lý do bảo mật đề thi, vui lòng không đặt mật khẩu mặc định dễ đoán!");
  }
  if (p1 !== p2) {
    return alert("Mật khẩu xác nhận không khớp!");
  }

  btn.disabled = true;
  btn.innerText = "Đang lưu...";

  const { error } = await client.auth.updateUser({ password: p1 });
  if (!error && userProfile) {
    await client.from("profiles").update({ must_change_pw: false }).eq("id", currentUser.id);
    userProfile.must_change_pw = false;
    isForcedPasswordChange = false;
  }

  btn.disabled = false;
  btn.innerText = "Cập nhật";

  if (error) {
    alert("Lỗi đổi mật khẩu: " + error.message);
  } else {
    alert("Đã cập nhật mật khẩu bảo mật thành công!");
    document.getElementById("password-modal").classList.add("hidden");
  }
}

// ==========================================
// BẢO MẬT PHÒNG MÁY: TỰ ĐĂNG XUẤT SAU 15 PHÚT KHÔNG THAO TÁC
// ==========================================
function resetIdleTimer() {
  clearTimeout(idleTimer);
  if (currentUser) {
    idleTimer = setTimeout(async () => {
      await client.auth.signOut();
      alert("Phiên làm việc đã tự động đăng xuất do không có thao tác trong 15 phút để bảo vệ dữ liệu!");
      location.reload();
    }, IDLE_TIMEOUT_MS);
  }
}

["mousemove", "mousedown", "keydown", "touchstart", "scroll"].forEach(evt => {
  document.addEventListener(evt, resetIdleTimer, true);
});
