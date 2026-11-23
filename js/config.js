// ==========================================
// CẤU HÌNH HỆ THỐNG (Chỉnh sửa tập trung tại đây)
// ==========================================
const SUPABASE_URL = "https://kprcbeqbwsslbojedmvr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwcmNiZXFid3NzbGJvamVkbXZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQyNjQ5ODUsImV4cCI6MjEwOTg0MDk4NX0.qYqQojqnXJrpfCzrKYKgRezAlqEpq2Us5RRhGyD65b4";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxUdZgK7dYQFhJIUmhQRlDR8N1o9zjyw_A58qudOPxRVBqYjsGzpKCH8x8kffUefNfS/exec";
const SUPER_ADMIN_EMAIL = "vulongdng@gmail.com";

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // Tự đăng xuất sau 15 phút không thao tác
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB
const ALLOWED_UPLOAD_EXTS = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"];

// Danh sách chuẩn 14 Tổ bộ môn (nguồn dữ liệu duy nhất cho toàn hệ thống)
const STANDARD_DEPARTMENTS = [
  "Toán học",
  "Vật lý",
  "Hóa học",
  "Sinh học",
  "Tin học",
  "Ngữ văn",
  "Lịch sử",
  "Địa lý",
  "Tiếng Anh",
  "Tiếng Pháp - Nhật",
  "Giáo dục kinh tế và pháp luật",
  "Giáo dục thể chất",
  "Giáo dục quốc phòng và an ninh",
  "Văn phòng"
];

const ROLE_LABELS = {
  admin: "Ban Giám Hiệu",
  hod: "Tổ trưởng",
  vice_hod: "Tổ phó",
  clerk: "Nhân viên Văn thư",
  teacher: "Giáo viên"
};

const POSITION_LABELS = {
  none: "",
  gvcn: "Giáo viên chủ nhiệm",
  doan: "Cán bộ Đoàn"
};

const SHARED_CATEGORIES = ["van-ban-chi-dao", "quy-che", "bieu-mau"];

// Cấu hình danh mục nộp hồ sơ theo quyền hạn
const CATEGORY_GROUPS = [
  {
    label: "Kho chung toàn trường",
    roles: ["admin", "clerk"],
    options: [
      { value: "van-ban-chi-dao", text: "Văn bản chỉ đạo cấp trên" },
      { value: "quy-che", text: "Nội quy / Quy chế hoạt động" },
      { value: "bieu-mau", text: "Biểu mẫu hành chính / Kế hoạch chung" }
    ]
  },
  {
    label: "Ban Giám Hiệu",
    roles: ["admin"],
    options: [
      { value: "nghi-quyet", text: "Nghị quyết / Kế hoạch chiến lược" },
      { value: "kiem-tra-noi-bo", text: "Hồ sơ Kiểm tra nội bộ" },
      { value: "thi-dua", text: "Hồ sơ Thi đua - Khen thưởng" }
    ]
  },
  {
    label: "Tổ chuyên môn",
    roles: ["admin", "hod", "vice_hod", "teacher"],
    excludeDept: "văn phòng",
    options: [
      { value: "ke-hoach-giao-duc", text: "Kế hoạch giáo dục tổ/nhóm", allowedRoles: ["admin", "hod", "vice_hod"] },
      { value: "giao-an", text: "Kế hoạch bài dạy (Giáo án)" },
      { value: "de-thi", text: "Ngân hàng đề thi / Ma trận" },
      { value: "bien-ban", text: "Biên bản sinh hoạt tổ chuyên môn", allowedRoles: ["admin", "hod", "vice_hod"] },
      { value: "hsg-khkt", text: "Bồi dưỡng HSG / Chuyên đề KHKT" },
      { value: "so-diem", text: "Sổ theo dõi và đánh giá" }
    ]
  },
  {
    label: "Tổ Văn phòng (Hành chính)",
    roles: ["admin", "clerk", "teacher"],
    onlyDept: "văn phòng",
    options: [
      { value: "van-thu", text: "Công văn đi / đến (Văn thư)", allowedRoles: ["admin", "clerk"] },
      { value: "nhan-su", text: "Hồ sơ Nhân sự - Lương" },
      { value: "ke-toan", text: "Hồ sơ Kế toán - Tài chính" },
      { value: "thu-vien-thiet-bi", text: "Hồ sơ Thư viện - Thiết bị" }
    ]
  },
  {
    label: "Chủ nhiệm & Đoàn thể",
    roles: ["admin", "hod", "vice_hod", "clerk", "teacher"],
    requirePosition: true,
    options: [
      { value: "chu-nhiem", text: "Kế hoạch & Sổ Chủ nhiệm lớp", pos: ["gvcn"] },
      { value: "hop-phu-huynh", text: "Biên bản họp Phụ huynh", pos: ["gvcn"] },
      { value: "cong-doan", text: "Hồ sơ Công đoàn", pos: ["doan"] },
      { value: "doan-thanh-nien", text: "Hồ sơ Đoàn Thanh niên", pos: ["doan"] }
    ]
  }
];

// Cấu hình cây thư mục lưu trữ bên trái
function getFolderTreeConfig(role, department) {
  return [
    {
      id: "shared",
      name: "Kho chung toàn trường",
      roles: ["admin", "hod", "vice_hod", "clerk", "teacher"],
      isShared: true,
      children: [
        { value: "van-ban-chi-dao", name: "Văn bản chỉ đạo cấp trên" },
        { value: "quy-che", name: "Nội quy / Quy chế" },
        { value: "bieu-mau", name: "Biểu mẫu hành chính" }
      ]
    },
    {
      id: "bgh",
      name: "Ban Giám Hiệu",
      roles: ["admin"],
      children: [
        { value: "nghi-quyet", name: "Nghị quyết / Chiến lược" },
        { value: "kiem-tra-noi-bo", name: "Kiểm tra nội bộ" },
        { value: "thi-dua", name: "Thi đua - Khen thưởng" }
      ]
    },
    {
      id: "dept",
      name: role === "admin" ? `Tổ chuyên môn (${STANDARD_DEPARTMENTS.length} Tổ)` : `Tổ ${department}`,
      roles: ["admin", "hod", "vice_hod", "teacher"],
      excludeDept: "văn phòng",
      children: [
        { value: "ke-hoach-giao-duc", name: "Kế hoạch giáo dục tổ" },
        { value: "giao-an", name: "Kế hoạch bài dạy (Giáo án)" },
        { value: "de-thi", name: "Ngân hàng đề thi / Ma trận" },
        { value: "bien-ban", name: "Biên bản sinh hoạt tổ" },
        { value: "hsg-khkt", name: "Bồi dưỡng HSG / KHKT" },
        { value: "so-diem", name: "Sổ theo dõi & đánh giá" }
      ]
    },
    {
      id: "office",
      name: "Tổ Văn phòng",
      roles: ["admin", "clerk", "teacher"],
      onlyDept: "văn phòng",
      children: [
        { value: "van-thu", name: "Công văn đi / đến" },
        { value: "nhan-su", name: "Hồ sơ Nhân sự - Lương" },
        { value: "ke-toan", name: "Kế toán - Tài chính" },
        { value: "thu-vien-thiet-bi", name: "Thư viện - Thiết bị" }
      ]
    },
    {
      id: "union",
      name: "Chủ nhiệm & Đoàn thể",
      roles: ["admin", "hod", "vice_hod", "clerk", "teacher"],
      requirePosition: true,
      children: [
        { value: "chu-nhiem", name: "Kế hoạch & Sổ Chủ nhiệm", pos: ["gvcn"] },
        { value: "hop-phu-huynh", name: "Biên bản họp Phụ huynh", pos: ["gvcn"] },
        { value: "cong-doan", name: "Hồ sơ Công đoàn", pos: ["doan"] },
        { value: "doan-thanh-nien", name: "Hồ sơ Đoàn Thanh niên", pos: ["doan"] }
      ]
    }
  ];
}

// Khởi tạo Supabase Client & Trạng thái dùng chung
const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let userProfile = null;
let currentSelectedCategory = null;
let currentFolderContext = null;
let allUsersCache = [];
let selectedUserIds = new Set();
let currentFilteredUsers = [];
