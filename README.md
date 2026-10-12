# Portfolio Công Minh — React + Tailwind + Supabase

## 1. Tạo database
1. Vào https://supabase.com → New project.
2. SQL Editor → dán toàn bộ `supabase/schema.sql` → Run (tạo bảng, phân quyền, dữ liệu mẫu).
   Nếu bạn đã chạy bản cũ trước đó, chạy thêm `supabase/migration-footer.sql` (nếu chưa có footer) `supabase/migration-visibility.sql` (ẩn/hiện) `supabase/migration-details.sql` (trang chi tiết) `supabase/migration-cursor.sql` (hiệu ứng chuột) và `supabase/migration-hero.sql` (đầu trang, ảnh bìa, kho ảnh).

## 2. Tạo tài khoản admin
1. Authentication → Providers → Email: **tắt "Allow new users to sign up"** (để không ai tự đăng ký được).
2. Authentication → Users → Add user → nhập email + mật khẩu của bạn.

## 3. Chạy
```bash
cp .env.example .env     # điền URL và anon key (Project Settings → API)
npm install
npm run dev              # http://localhost:5173
```
- Trang chủ: `/`
- Admin: `/#admin` (đăng nhập bằng tài khoản ở bước 2)

## 4. Build / deploy
`npm run build` → `dist/index.html` (1 file). Đưa lên Vercel, Netlify hoặc Cloudflare Pages
(nhớ khai báo 2 biến môi trường `VITE_SUPABASE_*` trên dịch vụ đó).

## Bảo mật
- Anon key công khai được; an toàn nhờ Row Level Security: ai cũng đọc, chỉ user đã đăng nhập mới ghi.
- Không dùng `service_role` key trong frontend.
- Chưa cấu hình `.env` thì app chạy **chế độ demo**: backend giả lập trong trình duyệt, đăng nhập admin bằng `admin@demo.com` / `demo123`, mọi tính năng (thêm/sửa/xóa, ẩn/hiện, footer) đều dùng được, dữ liệu lưu localStorage.

## Footer có thể chỉnh trong Admin
- **Menu footer**: thêm/sửa/xóa link (nội bộ `#work` hoặc ngoài `https://...`).
- **Mạng xã hội**: GitHub, LinkedIn, Facebook, Zalo... (tên + link).
- **Thông tin chung**: giới thiệu ngắn, trạng thái nhận việc, email, điện thoại, địa chỉ, giờ làm việc, link CV, bản quyền, ghi chú. Email cũng là nút ở mục Liên hệ trên trang chủ.
- Ô nào để trống thì phần đó tự ẩn trên trang.

## Ẩn / hiện
- Mọi mục trong danh sách (dự án, kỹ năng, kinh nghiệm, blog, menu, mạng xã hội) có công tắc **Hiển thị trên trang**: tắt = ẩn nhưng vẫn giữ nội dung, bật lại bất cứ lúc nào.
- Tab **Thông tin chung**: mỗi trường (giờ làm việc, điện thoại, địa chỉ, CV…) có công tắc riêng.

## Truy cập Admin
Trang chủ không có link nào dẫn tới Admin. Tự gõ `#admin` vào cuối địa chỉ trang (VD: `https://ten-mien.com/#admin`). Bảo mật thật nằm ở đăng nhập Supabase + tắt đăng ký mới, không phải ở việc giấu link.

## Bố cục trang chủ
Admin → **Bố cục trang chủ**: bật/tắt từng phần (huy hiệu, đoạn giới thiệu, nút, số liệu, hình đại diện, dải chữ chạy, từng mục Kỹ năng/Kinh nghiệm/Dự án/Blog/Liên hệ, từng cột footer). Lưu chung vào cột `settings.hidden`, không cần chạy thêm SQL.

## Trang chi tiết
- Mỗi dự án có trang riêng `#project-<id>`, mỗi bài blog có trang riêng `#post-<id>`.
- Nội dung soạn trong Admin (ô "Nội dung"), hỗ trợ định dạng: `## tiêu đề`, `- gạch đầu dòng`, `**đậm**`, `` `code` ``, `[chữ](link)`, `> ghi chú`.
- Dự án có thêm Vai trò, Thời gian, Công cụ. Bài viết có Ngày đăng; thời gian đọc tự tính.

## Soạn nội dung
Ô "Nội dung" của Blog và Dự án là trình soạn thảo trực quan (Tiptap): bấm nút để tạo tiêu đề, in đậm, nghiêng, link, danh sách, trích dẫn, khối mã; dán từ Word / Google Docs vẫn giữ định dạng. Nội dung được lưu dạng Markdown.

## Hiệu ứng chuột
Admin → **Hiệu ứng chuột**: 12 kiểu (Vòng tròn đuổi theo, Đốm sáng, Bụi sao, Sao chổi, Nam châm, Lưới chấm phản ứng, Tâm ngắm khóa mục tiêu, Con trỏ có chữ, Mực loang, Giọt thạch, Tia lửa khi bấm, Soi bug). Các kiểu mới được viết lại từ đầu, lấy cảm hứng từ React Bits và các portfolio trên Awwwards, không dùng thư viện ngoài. Bấm để xem thử ngay trong Admin, rồi "Áp dụng cho trang chủ".

## Build
- `npm run build`: bản deploy (tách file; phần Admin + trình soạn thảo chỉ tải khi mở `#admin`).
- `npm run build:single`: gộp thành 1 file `dist/index.html`.

## Đầu trang & hình ảnh
- Admin → **Đầu trang**: sửa huy hiệu, tiêu đề (chữ tô màu + màu), đoạn giới thiệu, nút, dãy số liệu, hình tròn đại diện (ảnh, chữ viết tắt, màu), 2 thẻ số liệu (hình, chữ, màu), dải chữ chạy (nội dung, ký hiệu, màu, tốc độ). Có khung xem trước trực tiếp.
- **Ảnh tự tạo**: mỗi dự án / bài blog chưa có ảnh bìa sẽ tự có một ảnh hình học riêng (cố định theo từng mục). Trong form có nút "✨ Tạo mẫu khác" để đổi mẫu, hoặc tải ảnh của bạn lên. Avatar cũng có nút "✨ Tạo avatar tự động".
- Ảnh tải lên được thu nhỏ rồi lưu vào Supabase Storage (bucket `media`).

## Hiệu ứng theo mùa & chữ RGB
- Admin → **Đầu trang** → Tiêu đề: "Kiểu tô màu" chọn Gradient 2 màu hoặc **RGB chạy** (cầu vồng chạy liên tục, chỉnh tốc độ).
- Admin → **Hiệu ứng theo mùa**: Tuyết rơi, Hoa mai rơi, Hoa đào rơi, Pháo hoa; mật độ Ít / Vừa / Nhiều.
  - Chế độ **Luôn bật** một hiệu ứng, hoặc **Tự động theo ngày** với lịch lặp mỗi năm (mặc định: pháo hoa 31/12–1/1, hoa mai 20/1–25/2, tuyết 1/12–30/12; Tết âm lịch đổi ngày nên chỉnh lại mỗi năm).
  - Lưu chung cột `settings.hero`, không cần chạy thêm SQL.

## Đăng bài tự động từ Easy AI
Hàm nhận bài: `supabase/functions/nhan-bai/index.ts` (Supabase Edge Function, kiểm chữ ký HMAC, chuyển HTML → Markdown an toàn, lưu theo X-Idempotency-Key).
Làm theo hướng dẫn từng bước trong **Admin → Đăng bài tự động** (SQL `supabase/migration-auto-post.sql`, deploy hàm qua Dashboard, tắt Enforce JWT, đặt secrets `EASYAI_SECRET` và `SITE_URL`).
Bài "Lưu nháp" vào ở trạng thái **Chờ duyệt**; duyệt bằng nút "Duyệt & đăng".
Deploy bằng CLI (tùy chọn): `npx supabase functions deploy nhan-bai --no-verify-jwt` rồi `npx supabase secrets set EASYAI_SECRET=... SITE_URL=https://...`.

### Realtime
Bảng `posts` được bật Supabase Realtime (trong `migration-auto-post.sql`). Admin hiện thông báo khi có bài mới từ Easy AI và số bài chờ duyệt cạnh mục "Đăng bài tự động"; trang chủ tự hiện bài vừa duyệt/đăng mà không cần tải lại. Chỉ một kết nối cho bảng posts, các thay đổi liên tiếp được gộp lại (0,6–0,8 giây) để trang không bị giật.

## Blog: link đẹp, SEO, mục lục, thẻ
- Link bài: `/blog/ten-bai-viet-12` (bản demo 1 file dùng `#/blog/ten-bai-viet-12`). Trang danh sách: `/blog`, lọc theo thẻ: `/blog?the=Automation`. Dự án: `/du-an/ten-du-an-3`. Admin: `/admin` hoặc `/#admin`. Link cũ `#post-5` tự chuyển sang link mới.
- Host phải trả `index.html` cho mọi đường dẫn: đã có sẵn `vercel.json` (Vercel) và `public/_redirects` (Netlify).
- Mỗi trang tự đặt tiêu đề tab, mô tả, ảnh chia sẻ, link chuẩn và dữ liệu BlogPosting cho Google. Facebook/Zalo không chạy JavaScript nên để hiện đúng ảnh/tiêu đề từng bài khi chia sẻ cần thêm bước tạo sẵn thẻ ở phía host (làm khi chọn xong nơi host).
- Bài viết: khung Tóm tắt, mục lục tự sinh từ tiêu đề (cột phải trên máy tính, khung gập trên điện thoại), thẻ, bài liên quan (cùng thẻ), khối kêu gọi cuối bài (chỉnh trong Admin → Thông tin chung).
- Chạy `supabase/migration-blog-seo.sql` để có cột thẻ (đã gộp vào đoạn SQL ở Admin → Đăng bài tự động).

## Form Liên hệ + Hộp thư (Admin → Tin nhắn)

- Form ở mục Liên hệ trang chủ: Họ tên, Email, Nội dung, ô chống spam Cloudflare Turnstile và ô bẫy bot ẩn.
- Tin nhắn lưu vào bảng `messages`. Khách không đọc được bảng này; chỉ admin đã đăng nhập mới đọc được.
- Admin → **Tin nhắn**: danh sách mới nhất trước, tab Chưa đọc, mở tin là tự đánh dấu đã đọc, Trả lời qua email, Xóa.
- Có tin mới: Admin đang mở sẽ hiện thông báo ngay (realtime) và số tin chưa đọc trên menu.
- Cách bật (hướng dẫn chi tiết + nút sao chép có sẵn trong Admin → Tin nhắn):
  1. Chạy `supabase/migration-messages.sql` (cài mới bằng schema.sql thì đã có).
  2. Cloudflare → Turnstile → Add widget → lấy Site Key + Secret Key.
  3. Deploy Edge Function `gui-tin-nhan` (giữ nguyên Verify JWT).
  4. Secret `TURNSTILE_SECRET` = Secret Key.
  5. Biến môi trường `VITE_TURNSTILE_SITE_KEY` = Site Key, rồi build/deploy lại.

## Thống kê lượt xem (Admin → Tổng quan)

- Web tự ghi mỗi lượt xem trang chủ / Blog / bài / dự án / trang 404 vào bảng `page_views` (không lưu IP; "người xem" là mã ngẫu nhiên trong trình duyệt khách). Gửi lúc trình duyệt rảnh nên không làm chậm trang.
- Không đếm: bot, trình duyệt tự động, trình duyệt đã đăng nhập Admin; tải lại cùng trang trong 30 phút chỉ tính 1 lần.
- Dashboard dưới Tổng quan: lượt xem, người xem, lượt đọc blog, tin nhắn mới (so với kỳ trước), biểu đồ theo ngày, xem nhiều nhất, khách đến từ đâu, thiết bị, ngôn ngữ; chọn 7 / 30 / 90 ngày. Số liệu đọc qua hàm `view_stats(days)` (chỉ Admin gọi được).
- Bản demo hiện **dữ liệu mẫu** (có nhãn), web thật chỉ hiện số thật.
- Database cũ: chạy `supabase/migration-thong-ke.sql` (cài mới bằng schema.sql thì đã có).

## Trang 404

- Link sai, bài hoặc dự án đã ẩn/xóa → trang 404 riêng (song ngữ, có "bug report" nhỏ, nút về trang chủ / Blog, gợi ý 3 bài mới). Trang 404 có `noindex` để Google không lập chỉ mục; lượt vào trang 404 được đếm trong dashboard.

## Nút Tải CV

- Admin → Đầu trang → **File CV (PDF)**: tải PDF lên (hoặc dán link Google Drive), có ô riêng cho CV tiếng Anh. Có file thì đầu trang và footer hiện nút **Tải CV** / **Download CV**. Link CV cũ ở Thông tin chung (`settings.cv_url`) vẫn được dùng nếu chưa tải file.

## Sao lưu / khôi phục (Admin → Cài đặt → Sao lưu)

- Tải 1 file JSON gồm bài viết, dự án, kỹ năng, kinh nghiệm, menu, mạng xã hội, tin nhắn, cài đặt (ảnh chỉ lưu link).
- Khôi phục không xóa gì: mặc định chỉ thêm lại mục đã mất (giữ nguyên id nên link bài không đổi); tùy chọn ghi đè mục cùng id. Hàm SQL `restore_backup` — database cũ chạy `supabase/migration-sao-luu.sql`.

## Thông báo đẩy (Web Push)

- Admin → Cài đặt → Thông báo → **Thông báo đẩy**: bật trên từng thiết bị, gửi thử, gỡ thiết bị; công tắc riêng cho tin nhắn mới và bài Easy AI.
- Cài: nút "?" tạo khóa VAPID ngay trong trình duyệt → `VITE_VAPID_PUBLIC_KEY` (Vercel) + `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (Supabase secrets) → cập nhật 2 hàm. Bảng `push_subscriptions` (database cũ: `supabase/migration-push.sql`).
- `public/sw.js` chỉ xử lý thông báo (không lưu đệm trang). iPhone/iPad cần thêm Admin vào Màn hình chính (`public/manifest.webmanifest`).

## Ảnh chia sẻ trang chủ & tốc độ

- Trên Vercel, bản build bỏ `index.html` (giữ `app.html`) để trang chủ "/" đi qua `api/page` → chèn tiêu đề, mô tả, JSON-LD Person và ảnh `/api/og?home=1` (lấy chữ ở Đầu trang). Build ở nơi khác vẫn có `index.html` như cũ.
- Trang chủ chỉ tải phần cần thiết: nội dung mẫu (`data.js`), backend demo và bảng chữ English của Admin (`admin-en/`) tách thành file riêng, chỉ tải khi cần. Lighthouse (bản build, máy thử): điện thoại 98, máy tính 100.

## Phiên bản (Admin → Cài đặt → Phiên bản)

- Trang tổng hợp thông tin web: số phiên bản, ngày build, đang chạy demo hay Supabase thật, địa chỉ web, Turnstile đã gắn chưa; công nghệ sử dụng (phiên bản thư viện tự lấy lúc build từ `package.json` / `node_modules`); tính năng hiện có; lịch sử phiên bản.
- Ra phiên bản mới: tăng `version` trong `package.json` và thêm một mục vào `CHANGELOG` trong `src/VersionAdmin.jsx`.

## Giao diện Admin tiếng Anh (Tài khoản của tôi → Ngôn ngữ trang Admin)

- Mỗi tài khoản tự chọn Tiếng Việt / English cho chữ trong Admin; lưu ở `user_metadata.admin_lang` (không cần thêm bảng) và trong trình duyệt.
- Chữ Admin viết tiếng Việt trong code, bọc bằng `a('...')` (`const a = useA()` từ `src/adminLang.js`); bản English nằm ở `src/admin-en/*.js`, khóa là đúng câu tiếng Việt. Thiếu bản English thì hiện tiếng Việt.
- Thêm chữ mới vào Admin: nhớ bọc `a()` và thêm dòng vào `src/admin-en/`. Nội dung tự nhập (bài, dự án…) không đổi theo ngôn ngữ Admin.

## Song ngữ Việt / Anh (Admin → Ngôn ngữ)

- Khách bấm **VI | EN** trên menu để đổi; trang nhớ lựa chọn trong trình duyệt của khách.
- Admin → Ngôn ngữ: chọn ngôn ngữ mặc định, bật/tắt nút đổi, xem tiến độ dịch từng phần.
- Chữ giao diện (menu, nút, tiêu đề mục, form liên hệ, footer, trang Blog/Dự án) có sẵn 2 ngôn ngữ trong `src/i18n.js`.
- Nội dung tự nhập có tab **English** trong form: Đầu trang, Kỹ năng, Kinh nghiệm, Dự án, Menu footer, Thông tin chung, khối kêu gọi cuối bài. Ô để trống thì hiện bản Tiếng Việt. Bài blog cũng có tab English (10 bài mẫu đã có sẵn bản English; database cũ chạy `supabase/migration-blog-en.sql`, chỉ điền vào bài mẫu còn trống bản English).
- Nút **✨ Gợi ý** dịch bằng MyMemory (miễn phí, không cần khóa; khoảng 5.000 ký tự/ngày, điền email ở Admin → Ngôn ngữ để lên khoảng 50.000). Gợi ý chỉ điền vào ô, bấm Lưu mới lưu.
- Cài đặt: chạy `supabase/migration-i18n.sql` (cài mới bằng schema.sql thì đã có).

## Tài khoản của tôi (Admin → bấm ảnh/tên ở góc dưới thanh bên)

- Đổi tên hiển thị, ảnh đại diện (lưu trong hồ sơ Supabase Auth, không cần bảng mới).
- Đổi mật khẩu: phải nhập đúng mật khẩu đang dùng, mật khẩu mới ít nhất 8 ký tự.
- Đổi email: Supabase gửi thư xác nhận tới cả email cũ và mới. Cần đặt Authentication → URL Configuration: Site URL = địa chỉ web, Redirect URLs thêm `https://ten-mien/admin/tai-khoan`.

## Thương hiệu (Admin → Giao diện → Thương hiệu)

- Logo (ảnh hoặc logo chữ), biểu tượng vuông (ảnh hoặc chữ viết tắt), favicon. Có hiệu lực ngay.
- Lưu ở cột `settings.brand`. Database cũ: chạy `supabase/migration-brand.sql` (cài mới bằng schema.sql thì đã có).

## Trạng thái bài Blog

- Admin → Blog: mỗi bài hiện đủ 3 trạng thái Đã đăng / Bản nháp / Chờ duyệt; trạng thái đang dùng tô màu, còn lại mờ. Bấm để chuyển ngay.
- Cột `posts.review` phân biệt Chờ duyệt với Bản nháp. Database cũ: chạy `supabase/migration-post-status.sql` (cài mới bằng schema.sql thì đã có).

## Thông báo (Admin → Cài đặt → Thông báo)

- Từng loại sự kiện (Tin nhắn mới, Bài mới từ Easy AI) chọn riêng: âm thanh (7 kiểu + tắt), thông báo hệ thống (tắt / khi ở tab khác / luôn luôn), thông báo trong trang, số trên tab, email.
- Âm thanh, thông báo hệ thống, số trên tab chạy khi Admin đang mở. Email gửi từ máy chủ qua Resend (secrets `RESEND_API_KEY`, `RESEND_FROM`, `SITE_URL`), đóng Admin vẫn nhận.
- Cài đặt lưu ở bảng `admin_settings` (chỉ Admin đọc được).

## SEO trên Vercel (thư mục `api/`)

- `/sitemap.xml`, `/robots.txt` tự tạo theo dữ liệu (robots chặn `/admin`).
- `/blog/...` và `/du-an/...` đi qua `api/page.js` để chèn sẵn tiêu đề, mô tả, ảnh chia sẻ, canonical → Facebook/Zalo/Google đọc được không cần JavaScript.
- `api/og.js` tạo ảnh chia sẻ 1200×630 cho bài chưa có ảnh bìa (thư viện `@vercel/og`).

## Blog song ngữ và bản chính

- Form bài viết có tab English (có nút Gợi ý dịch). Đổi ngôn ngữ không đổi link bài.
- "Bản ở link gốc là bản chính": canonical trỏ về link gốc, bài không vào sitemap.
- Blog tự sắp xếp theo ngày đăng; duyệt/đăng bài đang ẩn thì ngày đăng = hôm nay và lên đầu.
- Database cũ: chạy `supabase/migration-thong-bao-seo.sql` và `supabase/migration-post-status.sql`.
