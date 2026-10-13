# Các thay đổi hiệu năng (bước 1–9)

Cách dùng: chép đè toàn bộ thư mục này lên project (giữ nguyên `.env` và `node_modules` của bạn), chạy `npm install` rồi `npm run build`.
Hoặc áp một lần: `git apply tong-hop-buoc-1-9.patch` trên bản gốc bạn gửi.

**Việc bạn cần làm 1 lần:** Supabase → SQL Editor → dán `supabase/migration-get-home.sql` → Run. Chưa chạy cũng không hỏng, web tự quay về tải từng bảng.

| Bước | Nội dung | File chính |
|---|---|---|
| 1 | Hiệu ứng mùa tính theo thời gian thật, giới hạn FPS (tuyết/hoa 30, pháo hoa 45), gộp nét vẽ, vẽ sẵn sprite | SeasonFX.jsx |
| 2 | Hiệu ứng chuột viết lại: 1 vòng lặp dùng chung, tự ngủ khi chuột đứng yên, chỉ xóa vùng thay đổi, "giọt thạch" bằng canvas | CursorFX.jsx |
| 3 | Parallax / thanh tiến độ / đường vẽ bằng CSS scroll-driven animation (có bản JS dự phòng); menu bằng IntersectionObserver; cuộn mượt native | App.jsx, index.css |
| 4 | Bỏ backdrop-blur, chấm nhấp nháy đổi sang transform/opacity, dải chữ tạm dừng khi ra khỏi màn hình, 1 observer chung cho Reveal, content-visibility cho các mục dưới | App.jsx, index.css |
| 5 | 7 request Supabase → 1 (`get_home()`), lưu bản trước (SWR), bỏ realtime + supabase-js khỏi trang công khai | api.js, useContent.js, Contact.jsx, stats.js, supabase/migration-get-home.sql |
| 6 | Cache 1 năm cho /assets, kích thước ảnh, preconnect, cacheControl khi upload ảnh, tải trước ảnh khi rê chuột | vercel.json, vite.config.js, prefetch.js, Detail.jsx, App.jsx, supabase.js |
| 7 | Tách React ra file riêng, target es2022 | vite.config.js |
| 8 | Bộ điều tiết chất lượng (tự giảm khi máy yếu, tự tăng lại khi ổn), tải muộn hiệu ứng, không tải hiệu ứng chuột trên cảm ứng | quality.js, seasonCfg.js, SeasonFX.jsx, CursorFX.jsx, App.jsx |
| 9 | Hiệu ứng mùa vẽ trong Web Worker (OffscreenCanvas), tự quay về cách cũ nếu trình duyệt không hỗ trợ | seasonEngine.js, seasonWorker.js, SeasonFX.jsx |

## Giới hạn đã biết
- Mọi phép đo dùng Chromium không GPU (chỉ so sánh tương đối). Chưa thử trên máy có GPU thật, màn 144 Hz, Firefox, Safari.
- Khách đang mở tab không còn nhận cập nhật realtime (phải tải lại); Admin vẫn realtime.
- Ảnh trong nội dung bài viết chưa có kích thước khai báo (không biết tỉ lệ), có thể nhích nhẹ khi hiện.
- Chiều cao ước lượng của các mục (content-visibility) lấy từ dữ liệu mẫu; dữ liệu thật có thể lệch nhẹ.
- `npm audit` báo 3 lỗ hổng mức high (gói `braces`), chưa xem ảnh hưởng.
