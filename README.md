# Công Minh — Portfolio QA Tester

Website giới thiệu bản thân của **Công Minh**, Manual QA Tester với gần 2 năm kinh nghiệm kiểm thử website thương mại điện tử, ứng dụng di động, phần mềm quản lý và ví blockchain.

🔗 **https://congminh-qa.vercel.app**

## Trên trang có gì

- **Giới thiệu:** kinh nghiệm, lĩnh vực đã làm và nền tảng đã test.
- **Kỹ năng:** Manual Testing, API & dữ liệu (Postman, SQL, DevTools), quản lý bug và tài liệu (Jira, TestRail…).
- **Kinh nghiệm:** các vị trí đã làm.
- **Dự án:** mỗi dự án có trang riêng ghi vai trò, thời gian, công cụ và nội dung chi tiết.
- **Blog:** bài viết về kỹ thuật kiểm thử, lọc được theo thẻ, có mục lục, thời gian đọc và bài liên quan.
- **Liên hệ:** email, điện thoại, mạng xã hội, file CV và form gửi tin nhắn.

Trang có 2 ngôn ngữ Tiếng Việt và English, xem tốt trên cả điện thoại lẫn máy tính. Hiệu ứng chuột và hiệu ứng theo mùa (tuyết, hoa mai, hoa đào, pháo hoa) tự giảm bớt khi máy yếu.

## Trang quản trị

Mọi nội dung trên trang đều chỉnh được trong trang Admin, không cần sửa code:

- Soạn bài Blog và dự án bằng trình soạn thảo trực quan, chuyển bài giữa Đã đăng, Bản nháp và Chờ duyệt.
- Nhận bài tự động từ Easy AI.
- Hộp thư tin nhắn từ form Liên hệ, có thông báo khi có tin mới.
- Thống kê lượt xem: lượt xem, người xem, bài đọc nhiều, nguồn truy cập, thiết bị.
- Tùy chỉnh đầu trang, thương hiệu, bố cục, hiệu ứng, ngôn ngữ.
- Sao lưu và khôi phục dữ liệu.

## Công nghệ

| Phần | Công nghệ |
|---|---|
| Giao diện | React 19, Tailwind CSS 4, Vite |
| Dữ liệu & đăng nhập | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| Chống spam | Cloudflare Turnstile |
| Hosting & SEO | Vercel (sitemap, ảnh chia sẻ tự tạo, thẻ meta cho từng bài) |
| Soạn thảo | Tiptap |

## Cấu trúc thư mục

```
src/        Giao diện trang công khai và trang Admin
api/        Hàm Vercel: SEO, sitemap, robots, ảnh chia sẻ
supabase/   Cấu trúc database và Edge Functions
public/     Icon, manifest, service worker
```
