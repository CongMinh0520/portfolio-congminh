# scripts/security — bộ probe bảo mật

Bộ kiểm thử nhanh để xác nhận phòng thủ XSS và RLS/phân quyền còn nguyên sau mỗi lần sửa.

## xss-probe.mjs
Nạp payload XSS vào các hàm render thuần phía server (`render/shared.js`, `render/page.js`,
`render/feeds.js`) và kiểm output có tạo được thẻ/handler thực thi không.

```bash
node scripts/security/xss-probe.mjs      # exit 0 = tất cả PASS
```

Bao gồm cả 2 payload `![...` (ảnh tương đối / có đuôi) từng gây **lặp vô hạn (DoS)** ở
`mdToHtml` và `Markdown` — nay render thành text trơ. Hàm `Markdown` phía client
(`src/Detail.jsx`) là bản sao của `mdToHtml`, cùng tính chất.

## rls-probe.sh
Gọi Supabase REST bằng **anon key** (đọc từ `.env`) để xác nhận RLS: bảng riêng
(`messages`/`admins`/`push_subscriptions`) trả `[]`, ghi nội dung bị `401`, bài ẩn và
filter lạ không rò dữ liệu, RPC `restore_backup` bị `401`. Chỉ gọi API bình thường trên
project của chính bạn.

```bash
bash scripts/security/rls-probe.sh
```
