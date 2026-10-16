# Hướng dẫn cho AI agent / bot

File này dành cho bot đọc trước khi sửa code trong repo này. Mục tiêu: hiểu nhanh dự án,
chạy đúng các bước kiểm tra, và **không làm hồi quy các bất biến bảo mật**.

Portfolio QA Tester: React 19 + Vite (SPA) · Supabase (Postgres + Auth + Edge Functions) ·
Vercel (hàm `api/` cho SEO/RSS/OG). Nội dung chỉnh trong trang Admin, không sửa code.

---

## Lệnh hay dùng

```bash
npm install            # cài deps
npm run dev            # dev server (vite), nối Supabase thật theo .env
npx vite --mode demo   # dev với backend giả trong trình duyệt (không chạm DB thật)
npm run build          # vite build + prerender trang tĩnh (scripts/prerender.mjs)
```

Kiểm tra bảo mật (xem thêm `scripts/security/README.md`):

```bash
npm run test:xss       # nạp payload XSS vào hàm render (render/), exit 0 = tất cả PASS
npm run test:rls       # gọi REST bằng anon key, xác nhận RLS: bảng riêng [] , ghi 401
```

- `test:xss` chỉ cần Node. Chạy lại khi sửa `render/shared.js`, `render/page.js`,
  `render/feeds.js`, hoặc `src/Detail.jsx`.
- `test:rls` cần `.env` có `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`. Chạy lại khi
  đổi RLS/migration trong `supabase/`. Chỉ gọi API bình thường, không ghi dữ liệu thật.

---

## Bất biến bảo mật — KHÔNG được phá

1. **Không dùng `dangerouslySetInnerHTML` / `innerHTML`.** Nội dung do người dùng/DB cung
   cấp phải render bằng React node (xem `src/Detail.jsx`) hoặc chuỗi đã escape. Mọi output
   HTML phía server phải qua `esc()` (`render/shared.js`); JSON nhúng vào HTML phải
   `.replace(/</g, '\u003c')` (xem `render/page.js`).
2. **Markdown chỉ cho link an toàn:** `absUrl()`/nhánh link chặn `javascript:`; ảnh chỉ
   nhận `https?:`. Parser markdown phải luôn tiến con trỏ dòng (đã từng có DoS lặp vô hạn
   với dòng `![` không phải ảnh hợp lệ — xem lịch sử git). Thêm case vào `test:xss` nếu sửa.
3. **Query luôn tham số hóa.** Dùng client Supabase / id dạng số. Không nối chuỗi vào
   filter. SQL trong `supabase/` dùng `format('%I'/%L')` + `quote_ident`; `.ilike` phải
   escape `% _ \`.
4. **RLS là tuyến phòng thủ chính.** Bảng `messages`/`admins`/`push_subscriptions` chỉ
   Admin đọc/ghi; nội dung public read, admin write qua `is_admin()` (security definer).
   Việc Admin ở Edge Function phải kiểm `Authorization` Bearer token **và** bảng `admins`.
   Đừng nới RLS/thêm policy `using (true)` cho bảng nhạy cảm.
5. **Secret:** chỉ biến `VITE_*` (anon key, Turnstile site key, VAPID public) được lộ ra
   client — đều là khóa công khai. `service_role` chỉ dùng trong `supabase/functions`
   (server). Không log secret, không commit `.env` (đã có trong `.gitignore`).
6. **Form Liên hệ** (`supabase/functions/gui-tin-nhan`): giữ Turnstile + honeypot +
   giới hạn độ dài. **Nhận bài** (`nhan-bai`): giữ HMAC + chống replay + lọc thẻ nguy hiểm.
7. **Header bảo mật** ở `vercel.json`: giữ CSP (script-src KHÔNG `unsafe-inline`),
   HSTS, X-Content-Type-Options, X-Frame-Options, `object-src 'none'`, `frame-ancestors 'none'`.

## Bản đồ bề mặt nhạy cảm

| Khu vực | File | Rủi ro cần canh |
|---|---|---|
| Render nội dung DB → HTML (SSR/RSS) | `render/shared.js`, `render/page.js`, `render/feeds.js` | XSS, DoS parser |
| Render nội dung phía client | `src/Detail.jsx` (`Markdown`, `inline`) | XSS, DoS parser |
| Truy cập dữ liệu công khai | `src/api.js`, `api/_lib.js`, `api/page.js` | injection filter, lộ bài ẩn |
| Form liên hệ (nhận input lạ) | `supabase/functions/gui-tin-nhan/index.ts` | spam, auth việc Admin, CORS |
| Nhận bài tự động | `supabase/functions/nhan-bai/index.ts` | giả mạo (HMAC), thẻ nguy hiểm |
| RLS / quyền | `supabase/migration-admin-lockdown.sql`, `supabase/schema.sql` | nới quyền ngoài ý muốn |
| Header | `vercel.json` | hạ cấp CSP |

---

## Quy ước làm việc

- **Branch:** tên tiếng Anh, kebab-case (vd `fix-markdown-parser-infinite-loop`).
- **Commit & mô tả PR:** viết **tiếng Việt**.
- **KHÔNG thêm dòng attribution** (không `Co-Authored-By`, không "Generated with…") vào
  commit hay PR.
- Sửa logic parser/render thì cập nhật/chạy `npm run test:xss`; đổi RLS thì chạy
  `npm run test:rls`; đổi code chạy được thì `npm run build` phải qua.
