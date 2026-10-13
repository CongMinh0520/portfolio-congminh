# Hiệu năng

Trang có nhiều hiệu ứng: con trỏ chuột, tuyết rơi, hoa mai, pháo hoa, parallax khi cuộn. Dù vậy trang vẫn mở nhanh và cuộn mượt, kể cả trên máy yếu hay điện thoại. Dưới đây là những gì giúp làm được điều đó.

## Hiệu ứng nhẹ, tự điều chỉnh theo máy

- **Tự giảm khi máy yếu:** trang theo dõi tốc độ khung hình. Khi máy bắt đầu chậm, hiệu ứng tự giảm mật độ và chất lượng, máy ổn định lại thì tăng lên.
- **Hiệu ứng theo mùa chạy riêng:** tuyết, hoa và pháo hoa được vẽ ở một luồng tách khỏi trang (Web Worker). Vì vậy cuộn và bấm vẫn mượt khi hiệu ứng đang chạy. Trình duyệt không hỗ trợ thì tự dùng cách vẽ thông thường.
- **Tốc độ ổn định trên mọi màn hình:** chuyển động tính theo thời gian thật, nên màn 60 Hz hay 144 Hz đều chạy cùng tốc độ. Số khung hình có giới hạn hợp lý (tuyết và hoa 30 khung/giây, pháo hoa 45), không tốn sức máy vô ích.
- **Hiệu ứng chuột biết nghỉ:** đứng yên khi chuột không di chuyển và chỉ vẽ lại vùng có thay đổi. Trên điện thoại và máy tính bảng thì hoàn toàn không tải.
- **Tải sau:** hiệu ứng chỉ tải khi trang đã hiện xong nội dung chính, nên không làm chậm lần mở đầu.

## Cuộn mượt

- Parallax, thanh tiến độ đọc và đường vẽ theo cuộn chạy bằng CSS của trình duyệt, không cần JavaScript tính từng khung hình. Trình duyệt cũ có bản dự phòng.
- Menu tự đánh dấu mục đang xem mà không phải theo dõi liên tục từng lần cuộn.
- Bỏ các lớp làm mờ nền tốn tài nguyên. Dải chữ chạy tự dừng khi ra khỏi màn hình.
- Các mục bên dưới trang (Kinh nghiệm, Dự án, Blog) chỉ được dựng khi sắp cuộn tới.

## Tải dữ liệu nhanh

- **Một lần gọi cho cả trang chủ:** toàn bộ nội dung trang chủ lấy về trong 1 request thay vì 7.
- **Mở lại tức thì:** lần ghé sau, trang hiện ngay nội dung đã lưu rồi lặng lẽ cập nhật bản mới.
- **Trang công khai gọn nhẹ:** thư viện Supabase đầy đủ và kết nối realtime chỉ dùng trong trang Admin, khách không phải tải.

## Tài nguyên được lưu đệm lâu dài

- File giao diện (JavaScript, CSS) được trình duyệt giữ 1 năm. Những lần ghé sau gần như không phải tải lại.
- React được tách thành file riêng, ít thay đổi giữa các phiên bản nên vẫn dùng được bản đã lưu.
- Kết nối tới máy chủ dữ liệu được mở sẵn từ đầu. Ảnh bài viết và dự án được tải trước khi rê chuột vào thẻ, bấm vào là hiện ngay.
- Ảnh có kích thước khai báo sẵn nên trang không bị nhảy bố cục khi ảnh hiện ra.
