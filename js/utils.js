// ==========================================
// HÀM TIỆN ÍCH & BẢO MẬT DỮ LIỆU
// ==========================================

function isSuperAdmin() {
  return Boolean(currentUser && currentUser.email === SUPER_ADMIN_EMAIL);
}

// Ghép đuôi nội bộ ngầm để Supabase Auth xác thực bằng Mã GV
function toAuthEmail(code) {
  const clean = String(code || "").trim().toLowerCase().replace(/\s+/g, "");
  if (!clean) return "";
  return clean.includes("@") ? clean : `${clean}@noibo.edu.vn`;
}

// Hiển thị sạch Mã GV (loại bỏ đuôi @noibo.edu.vn nếu có, giữ nguyên email Admin)
function cleanTeacherCode(raw) {
  if (!raw) return "";
  const str = String(raw).trim();
  if (str.toLowerCase().endsWith("@noibo.edu.vn")) {
    return str.slice(0, -13);
  }
  return str;
}

// Chuẩn hóa tên tổ viết tắt trong Excel về đúng tên chuẩn trên hệ thống
function normalizeDepartmentName(rawDept) {
  const d = String(rawDept || "").trim();
  if (!d) return "Chưa phân tổ";
  const lower = d.toLowerCase();
  if (lower.includes("kt&pl") || lower.includes("kinh tế")) return "Giáo dục kinh tế và pháp luật";
  if (lower.includes("qp&an") || lower.includes("quốc phòng")) return "Giáo dục quốc phòng và an ninh";
  if (lower === "toán") return "Toán học";
  if (lower === "văn") return "Ngữ văn";
  if (lower === "lý") return "Vật lý";
  if (lower === "hóa") return "Hóa học";
  if (lower === "sinh") return "Sinh học";
  if (lower === "sử") return "Lịch sử";
  if (lower === "địa") return "Địa lý";
  if (lower === "tin") return "Tin học";
  return d;
}

// Chống XSS khi render dữ liệu ra bảng HTML
function escapeHTML(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Chặn XSS qua giao thức URL nguy hiểm (VD: javascript:, data:)
function safeUrl(rawUrl) {
  const str = String(rawUrl || "").trim();
  if (/^https?:\/\//i.test(str)) {
    return encodeURI(str);
  }
  return "#";
}

// Chuyển tên có dấu thành slug thư mục
function toSlug(str) {
  return String(str || "").toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getRoleLabel(role) {
  return ROLE_LABELS[role] || "Giáo viên";
}

function getPositionLabel(pos) {
  return POSITION_LABELS[pos] || "";
}

// Trích xuất File ID từ URL Google Drive
function extractDriveFileId(url) {
  const str = String(url || "");
  const pathMatch = str.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (pathMatch) return pathMatch[1];
  const queryMatch = str.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (queryMatch) return queryMatch[1];
  return "";
}

// Tự động cuộn mượt tới vùng nội dung bên phải khi chọn mục ở cây thư mục bên trái
function scrollToRightContent() {
  const rightPanel = document.getElementById("right-content-area");
  if (!rightPanel) return;
  const headerOffset = 88;
  const elementPosition = rightPanel.getBoundingClientRect().top;
  const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
  window.scrollTo({
    top: Math.max(0, offsetPosition),
    behavior: "smooth"
  });
}

// Đổ danh sách Tổ bộ môn tập trung từ config.js vào tất cả các thẻ <select>
function populateDepartmentSelects() {
  const fullOptions = ["Ban Giám Hiệu", ...STANDARD_DEPARTMENTS, "Chưa phân tổ"];

  const fillSelect = (id, items, leadingOption = null, defaultValue = null) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = "";
    if (leadingOption) {
      const opt = document.createElement("option");
      opt.value = leadingOption.value;
      opt.innerText = leadingOption.text;
      el.appendChild(opt);
    }
    items.forEach(dept => {
      const opt = document.createElement("option");
      opt.value = dept;
      opt.innerText = dept;
      if (defaultValue && dept === defaultValue) opt.selected = true;
      el.appendChild(opt);
    });
  };

  fillSelect("filter_user_department", fullOptions, { value: "all", text: "Tất cả các tổ (Toàn trường)" });
  fillSelect("bulk_target_dept", STANDARD_DEPARTMENTS, { value: "", text: "-- Chuyển sang tổ... --" });
  fillSelect("edit_department", fullOptions);
  fillSelect("add_department", fullOptions, null, "Tin học");
}

function loadDepartmentOptions() {
  ["filter_department", "folder_filter_department"].forEach(selectId => {
    const selectEl = document.getElementById(selectId);
    if (!selectEl) return;
    selectEl.innerHTML = `<option value="all">Tất cả các tổ bộ môn (${STANDARD_DEPARTMENTS.length} tổ)</option>`;
    STANDARD_DEPARTMENTS.forEach(dept => {
      const option = document.createElement("option");
      option.value = dept;
      option.innerText = dept;
      selectEl.appendChild(option);
    });
  });
}

// Kiểm tra định dạng & dung lượng tệp trước khi tải lên
function validateUploadFile(file, allowedExts = ALLOWED_UPLOAD_EXTS) {
  if (!file) return "Vui lòng chọn tệp tài liệu!";
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "Tệp vượt quá 25MB! Vui lòng chọn tệp nhỏ hơn.";
  }
  const ext = String(file.name || "").split(".").pop().toLowerCase();
  if (!allowedExts.includes(ext)) {
    return `Định dạng .${ext} không được phép tải lên!`;
  }
  return null;
}

// Đọc tệp sang chuỗi Base64 bằng Promise
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const parts = String(reader.result || "").split(",");
      resolve(parts[1] || "");
    };
    reader.onerror = () => reject(new Error("Lỗi khi đọc tệp từ thiết bị!"));
    reader.readAsDataURL(file);
  });
}

// Hàm gửi tệp có cơ chế tự động giãn luồng & thử lại khi > 30 người nộp cùng 1 giây
async function postToAppsScriptWithRetry(formData, btnElement, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        body: formData,
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });

      const textResult = await res.text();
      // Khi quá 30 luồng đồng thời, Google trả về trang HTML báo bận thay vì JSON -> thử lại
      return JSON.parse(textResult);
    } catch (err) {
      if (attempt === maxRetries) {
        throw new Error("Hệ thống đang quá tải do có quá nhiều người nộp cùng một giây. Vui lòng bấm Nộp lại sau vài giây!");
      }
      const waitMs = 1500 + Math.floor(Math.random() * 2500);
      if (btnElement) {
        btnElement.innerText = `Đang xếp hàng nộp (${attempt}/${maxRetries - 1})...`;
      }
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }
  }
}
