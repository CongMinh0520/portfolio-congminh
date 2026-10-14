// Từ khóa thêm cho các phần bên trong trang Admin khi tìm bằng Ctrl+K (đồng nghĩa, tiếng Anh…).
// Danh sách phần thì TỰ LẬP lúc build (xem adminSections trong vite.config.js) — thêm/đổi tên phần không cần sửa file này.
// File này chỉ để gõ chữ khác vẫn ra, VD "push" → Thông báo đẩy. Thiếu hay thừa dòng nào cũng không sao.
// Khóa = đúng tiêu đề tiếng Việt của phần.
export const SYNONYMS = {
  // Tổng quan → Thống kê
  'Lượt xem theo ngày': 'thống kê stats views analytics biểu đồ',
  'Xem nhiều nhất': 'thống kê top phổ biến popular',
  'Khách đến từ đâu': 'thống kê nguồn referrer google facebook traffic',
  'Thiết bị': 'thống kê điện thoại máy tính mobile desktop device',
  'Ngôn ngữ khách xem': 'thống kê tiếng anh english visitors language',
  'Thao tác nhanh': 'shortcut lối tắt',
  // Thông báo
  'Thông báo đẩy': 'push notification iphone điện thoại web push',
  'Trên trình duyệt này': 'browser máy này',
  'Thông báo hệ thống': 'system notification góc màn hình desktop',
  'Âm lượng': 'âm thanh volume tiếng chuông sound',
  'Email': 'gửi email resend mail',
  'Gửi tới': 'địa chỉ email nhận thông báo',
  'Âm thanh': 'chuông sound tiếng',
  'Thông báo trong trang': 'toast in-app',
  'Số trên tab trình duyệt': 'badge tab count đếm chưa đọc',
  // Tài khoản
  'Hồ sơ': 'tên ảnh đại diện avatar profile',
  'Ngôn ngữ trang Admin': 'english tiếng việt language admin',
  'Email đăng nhập': 'đổi email login',
  'Mật khẩu': 'đổi mật khẩu password',
  // Thương hiệu
  'Logo': 'logo chữ ảnh thương hiệu',
  'Biểu tượng': 'icon app hình vuông',
  'Favicon': 'icon tab trình duyệt',
  // Đầu trang
  'Huy hiệu': 'badge open to qa',
  'Tiêu đề & giới thiệu': 'headline tiêu đề lớn đoạn giới thiệu hero',
  'Nút & số liệu': 'nút xem dự án liên hệ stats số năm kinh nghiệm',
  'File CV (PDF)': 'tải cv resume pdf',
  'Hình tròn đại diện': 'ảnh avatar hình tròn thẻ số liệu',
  'Dải chữ chạy': 'marquee chữ chạy ngang',
  // Hiệu ứng theo mùa, con trỏ
  'Chế độ': 'bật tắt tự động mode',
  'Hiệu ứng': 'tuyết hoa đào lá rơi snow',
  'Mật độ': 'nhiều ít density',
  'Lịch tự động': 'tết noel trung thu lịch calendar',
  'Hiệu ứng con trỏ': 'cursor chuột pointer',
  'Hiệu ứng di chuột': 'cursor trail vệt sáng chuột',
  // Ngôn ngữ
  'Hiển thị trên trang chủ': 'nút đổi ngôn ngữ english trang chủ',
  'Tiến độ bản English': 'chưa dịch thiếu bản dịch translation progress',
  'Gợi ý bản dịch tự động': 'dịch tự động mymemory auto translate',
  // Đăng bài tự động
  'Bài nhận từ Easy AI': 'easy ai bài tự động chờ duyệt',
  'Cách kết nối (làm một lần)': 'kết nối setup khóa bí mật secret webhook',
  // Sao lưu, phiên bản, kiểm thử
  'Tải bản sao lưu': 'backup export xuất file json',
  'Khôi phục từ file': 'restore import nhập file',
  'Thông tin web': 'version phiên bản',
  'Công nghệ sử dụng': 'tech stack react vite supabase',
  'Tính năng hiện có': 'features',
  'Lịch sử phiên bản': 'changelog thay đổi',
  'Điểm Lighthouse': 'lighthouse performance hiệu năng điểm',
  'Trình duyệt và thiết bị đã test': 'browser device chrome safari',
  'Checklist trợ năng và chất lượng': 'accessibility a11y checklist',
}
