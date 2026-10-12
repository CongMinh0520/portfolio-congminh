# Checklist đưa web Công Minh lên Supabase

Oct 12, 2026 · @Kha Phan

## Tổng quan

Phần lớn tính năng chạy ngay khi web nối Supabase: chỉ cần chạy **một file `schema.sql`**. Chỉ 3 thứ phải cài thêm bằng tay: form Liên hệ (Turnstile + 1 hàm), Easy AI (1 hàm, tùy chọn) và nơi host web.

| Tính năng | Cần cài gì | Ở bước |
| --- | --- | --- |
| Admin sửa mọi phần trang chủ (dự án, kỹ năng, kinh nghiệm, blog, footer, mạng xã hội, thông tin chung) | Tự có sau `schema.sql` + tài khoản admin | 1 |
| Ẩn/hiện từng phần, bố cục trang chủ | Tự có sau `schema.sql` | 1 |
| Đầu trang tùy chỉnh, tải ảnh (avatar, ảnh bìa) | Kho ảnh `media` tạo sẵn trong `schema.sql` | 1 |
| Ảnh bìa và avatar tự tạo | Không cần gì (vẽ ngay trong trình duyệt) | – |
| Hiệu ứng chuột, hiệu ứng theo mùa, tiêu đề RGB, hiệu ứng cuộn | Không cần gì (lưu trong bảng settings) | – |
| Trang chi tiết blog/dự án, link đẹp `/blog/ten-bai-12`, link riêng từng mục Admin | Nơi host phải chuyển mọi đường dẫn về `index.html` (đã có sẵn `vercel.json` và `public/_redirects`) | 3 |
| SEO bài viết: mục lục, thẻ, bài liên quan, Google đọc tiêu đề/mô tả | Không cần gì | – |
| Bản nháp / chờ duyệt / đăng bài | Tự có sau `schema.sql` | 1 |
| Realtime (bài mới, tin nhắn mới hiện ngay) | Bật sẵn trong `schema.sql` | 1 |
| Song ngữ VI/EN, nút gợi ý dịch MyMemory | Cột `en` có sẵn trong `schema.sql`; MyMemory không cần khóa | 1 |
| Form Liên hệ + hộp thư Admin → Tin nhắn | Turnstile + hàm `gui-tin-nhan` + 1 secret | 2 |
| Easy AI tự đăng bài | Hàm `nhan-bai` + 2 secret (chỉ khi dùng) | 4 |
| Ảnh xem trước khi chia sẻ link bài lên Facebook/Zalo | Tự chạy trên Vercel (hàm trong thư mục api), không cần cài thêm | – |
| Tài khoản của tôi (tên, ảnh đại diện, đổi mật khẩu, đổi email) | Tự có; riêng đổi email cần đặt URL Configuration trong Supabase Auth | 3 |
| Thương hiệu (logo, biểu tượng, favicon) | Cột brand có sẵn trong schema.sql | 1 |
| Thông báo trong Admin: âm thanh, thông báo hệ thống, số trên tab (Admin → Cài đặt → Thông báo) | Tự có; bấm "Cho phép thông báo" trên từng trình duyệt | 1 |
| Email báo tin nhắn mới / bài Easy AI | Tài khoản Resend + 3 secret + cập nhật 2 hàm | 2b |
| sitemap.xml, robots.txt | Tự chạy trên Vercel; nên gửi sitemap cho Google Search Console | 3 |
| Thống kê lượt xem (Admin → Tổng quan) | Bảng page\_views + hàm view\_stats có sẵn trong schema.sql. Database cài từ bản cũ: chạy thêm supabase/migration-thong-ke.sql | 1 |
| Trang 404 riêng (link sai, bài/dự án đã ẩn hoặc xóa) | Tự có, không cần cài | – |
| Nút Tải CV (đầu trang + footer) | Tự có; tải PDF ở Admin → Đầu trang → File CV | – |
| Sao lưu / khôi phục (Admin → Cài đặt → Sao lưu) | Hàm restore\_backup có sẵn trong schema.sql. Database cũ: chạy supabase/migration-sao-luu.sql | 1 |
| Thông báo đẩy khi đã đóng Admin | Khóa VAPID + 1 biến Vercel + 3 secret + cập nhật 2 hàm | 2c |
| Ảnh chia sẻ riêng cho trang chủ | Tự chạy trên Vercel (trang chủ đi qua hàm api/page) | 3 |
| Blog song ngữ, bài đăng lại chọn bản gốc là bản chính | Cột mới có sẵn trong schema.sql | 1 |

## Tình trạng hiện tại

Code backend đã viết đủ trong file zip, nhưng **chưa chạy thật** vì chưa đưa lên Supabase. Làm xong các bước trong checklist này thì web và Admin mới dùng dữ liệu thật.

**Đã có (code backend)**

- Database: `schema.sql` tạo mọi bảng (dự án, blog, kỹ năng, kinh nghiệm, menu, mạng xã hội, cài đặt, tin nhắn), phân quyền (khách chỉ đọc, Admin mới sửa), kho ảnh, realtime, nội dung mẫu.
- Đăng nhập Admin bằng Supabase Auth, có đổi mật khẩu, đổi email, hồ sơ.
- Hàm `gui-tin-nhan`: nhận form Liên hệ, kiểm tra ô chống spam Cloudflare, lưu tin nhắn.
- Hàm `nhan-bai`: nhận bài từ Easy AI, kiểm tra chữ ký bảo mật.
- Hàm Vercel trong thư mục `api`: `sitemap.xml`, `robots.txt`, chèn sẵn tiêu đề/mô tả/ảnh cho từng bài Blog và Dự án (Facebook, Zalo, Google đọc được), tạo ảnh chia sẻ 1200×630.
- Email báo qua Resend trong 2 hàm `gui-tin-nhan` và `nhan-bai`, bật/tắt ở Admin → Cài đặt → Thông báo.

**Chưa chạy thật**

- Bản demo đang xem không dùng backend: dữ liệu lưu tạm trong trình duyệt, người khác mở không thấy, xóa dữ liệu trình duyệt là mất.
- Chưa thử với Supabase và Cloudflare thật. Hai hàm đã chạy thử bằng Deno với database giả và ô chống spam giả, đều đúng. Sau khi làm xong checklist, chạy Bước 5 để kiểm tra trên bản thật.

## Chuẩn bị

Làm theo đúng thứ tự các bước bên dưới; tổng khoảng 45–60 phút, tất cả đều có gói miễn phí.

- [ ] Tải và giải nén `portfolio-congminh-supabase.zip` (bản mới nhất, có song ngữ và form Liên hệ)
- [ ] Tài khoản **Supabase** (supabase.com)
- [ ] Tài khoản **Cloudflare** (dash.cloudflare.com) – chỉ để lấy ô chống spam, không cần chuyển tên miền sang Cloudflare
- [ ] Tài khoản **GitHub** + **Vercel** (hoặc Netlify) để đưa web lên mạng
- [ ] (Không bắt buộc) Tên miền riêng, VD `congminh.dev`
- [ ] Một chỗ ghi chú riêng để cất các khóa sẽ chép ra (Project URL, anon key, Site Key, Secret Key, khóa Easy AI)

Nội dung bạn đã sửa trên trang demo **không tự chuyển sang** Supabase (nó chỉ nằm trong trình duyệt). Web thật bắt đầu từ nội dung mẫu trong `schema.sql`, sau đó bạn sửa trong Admin.

## Bước 1 – Supabase

Xong bước này là Admin, ảnh, realtime, song ngữ và hộp thư đều có chỗ lưu.

1. **Tạo project**
   - [ ] supabase.com → **New project**, Region chọn **Singapore**
   - [ ] Ghi lại mật khẩu database
2. **Tạo bảng và dữ liệu**
   - [ ] **SQL Editor** → New query → dán **toàn bộ** `supabase/schema.sql` → **Run**, thấy "Success"
   - [ ] **Không** chạy các file `migration-*.sql` (chỉ dành cho database cũ cần nâng cấp)
3. **Khóa đăng ký và tạo tài khoản admin**
   - [ ] **Authentication → Sign In / Providers → Email** → tắt **"Allow new users to sign up"** (bắt buộc: nếu để bật, người lạ tự đăng ký là sửa được web)
   - [ ] **Authentication → Users → Add user** → email + mật khẩu của bạn, tick **Auto Confirm User**
4. **Chép khóa API** (Project Settings → API Keys → tab **Legacy API Keys**)
   - [ ] **Project URL**, dạng `https://xxxx.supabase.co`
   - [ ] Khóa **anon public**, bắt đầu bằng `eyJ…` (không dùng loại `sb_publishable_…`, vì hàm gửi form cần khóa dạng `eyJ`)
   - [ ] **Không** chép khóa `service_role` vào đâu cả
5. **Kiểm tra nhanh**
   - [ ] **Table Editor** có: `projects`, `skills`, `jobs`, `posts`, `footer_links`, `socials`, `settings`, `messages`
   - [ ] **Storage** có bucket `media` (Public)
   - [ ] **Database → Publications → supabase\_realtime** có `posts` và `messages`

## Bước 2 – Form Liên hệ

Xong bước này, ô "mô phỏng Cloudflare Turnstile" thành ô chống spam thật và tin nhắn vào Admin → Tin nhắn.

1. **Tạo ô chống spam**
   - [ ] dash.cloudflare.com → **Turnstile** → **Add widget**
   - [ ] Hostname: tên miền web (VD `congminh.dev`, hoặc `ten-du-an.vercel.app` nếu chưa có tên miền); thêm `localhost` nếu muốn thử trên máy
   - [ ] Widget mode: **Managed** → **Create**
   - [ ] Chép **Site Key** (dùng ở Bước 3) và **Secret Key** (dùng ngay dưới)
2. **Tạo hàm nhận form**
   - [ ] Supabase → **Edge Functions** → **Deploy a new function** → **Via Editor**
   - [ ] Tên đúng: `gui-tin-nhan`
   - [ ] Xóa mã mẫu, dán nội dung `supabase/functions/gui-tin-nhan/index.ts` → **Deploy**
   - [ ] **Giữ nguyên** "Enforce JWT verification" đang bật
3. **Lưu khóa bí mật**
   - [ ] Edge Functions → **Secrets** → thêm `TURNSTILE_SECRET` = Secret Key

Thử trên máy khi chưa có tên miền: Cloudflare có cặp khóa thử luôn cho qua, Site Key `1x00000000000000000000AA` và Secret `1x0000000000000000000000000000000AA`. Đổi sang khóa thật trước khi cho khách dùng.

## Bước 2b – Email báo (Resend, không bắt buộc)

Xong bước này, có tin nhắn mới (và tuỳ chọn: bài Easy AI mới) là có email báo, kể cả khi Admin đang đóng. Trong email bấm Trả lời là trả lời thẳng cho khách. Nút "?" cạnh chữ Email ở Admin → Thông báo có sẵn các bước này kèm nút sao chép.

1. **Tạo tài khoản và địa chỉ gửi**
   - [ ] Đăng ký **resend.com**
   - [ ] Có tên miền: Domains → Add domain → thêm bản ghi DNS → chờ Verified
   - [ ] Chưa có tên miền: dùng `onboarding@resend.dev` (chỉ gửi được tới email đăng ký Resend)
   - [ ] API Keys → Create API Key → chép khóa `re_…`
2. **Lưu khóa vào Supabase** (Edge Functions → Secrets)
   - [ ] `RESEND_API_KEY` = khóa vừa chép
   - [ ] `RESEND_FROM` = VD `Công Minh <thongbao@congminh.dev>` hoặc `onboarding@resend.dev`
   - [ ] `SITE_URL` = địa chỉ web (nếu chưa có từ Bước 4)
3. **Cập nhật hàm và bật trong Admin**
   - [ ] Deploy lại `gui-tin-nhan` (và `nhan-bai` nếu dùng Easy AI) bằng mã mới trong file zip
   - [ ] Admin → Cài đặt → Thông báo → ô "Gửi tới" (để trống = email ở Thông tin chung) → bật Email cho từng loại → Lưu
   - [ ] Cùng trang đó: bấm **Cho phép thông báo** trên mỗi máy/trình duyệt bạn mở Admin

## Bước 2c – Thông báo đẩy (không bắt buộc)

Xong bước này, điện thoại / máy tính nhận thông báo tin nhắn mới và bài Easy AI kể cả khi đã đóng Admin. Làm sau Bước 3 cũng được.

- [ ] Bảng `push_subscriptions` đã có trong `schema.sql`. Database cài từ bản cũ: chạy thêm `supabase/migration-push.sql`
- [ ] Admin → Cài đặt → Thông báo → mục **Thông báo đẩy** → nút **?** → bước 2 **Tạo khóa** → chép cất cả 2 khóa (khóa riêng chỉ hiện một lần)
- [ ] Vercel → Settings → Environment Variables: thêm `VITE_VAPID_PUBLIC_KEY` = khóa công khai → Redeploy
- [ ] Supabase → Edge Functions → Secrets: thêm `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (dạng `mailto:email-cua-ban`)
- [ ] Cập nhật lại 2 hàm `gui-tin-nhan` và `nhan-bai` bằng mã mới (nút **?** ở mục Email có nút chép mã) → Deploy
- [ ] Trên từng thiết bị: mở Admin → Thông báo → **Bật trên thiết bị này** → **Gửi thử tới tất cả thiết bị**
- [ ] iPhone / iPad (iOS 16.4+): mở Admin bằng Safari → Chia sẻ → **Thêm vào MH chính**, mở Admin từ biểu tượng đó rồi mới bật

## Bước 3 – Đưa web lên mạng

Dùng Vercel (bạn đã chọn). Nếu sau này đổi sang Netlify thì file `public/_redirects` đã có sẵn.

1. **Đưa code lên GitHub**
   - [ ] Tạo repo mới (nên để **Private**), tải toàn bộ nội dung đã giải nén lên
   - [ ] **Không** tải file `.env` (nếu có) lên GitHub
2. **Tạo project trên Vercel**
   - [ ] vercel.com → **Add New → Project** → Import repo vừa tạo
   - [ ] Framework: **Vite** (tự nhận), Build: `npm run build`, Output: `dist`
3. **Biến môi trường** (Settings → Environment Variables)

| Tên biến | Giá trị | Lấy ở đâu |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` | Bước 1, mục 4 |
| `VITE_SUPABASE_ANON_KEY` | `eyJ…` | Bước 1, mục 4 |
| `VITE_TURNSTILE_SITE_KEY` | Site Key | Bước 2, mục 1 |

4. **Chạy và gắn tên miền**
   - [ ] Bấm **Deploy**; mỗi lần sửa biến môi trường phải **Redeploy**
   - [ ] (Không bắt buộc) **Settings → Domains** → gắn tên miền riêng
   - [ ] Thêm đúng tên miền đang dùng vào Hostname của Turnstile (Bước 2)

5) **Cho phép link xác nhận đổi email** (cần cho Admin → Tài khoản của tôi → Đổi email)
   - [ ] Supabase → **Authentication → URL Configuration** → Site URL = địa chỉ web, VD `https://congminh.dev`
   - [ ] Redirect URLs → Add URL: `https://congminh.dev/admin/tai-khoan` (làm lại nếu sau này đổi tên miền)
   - [ ] Lưu ý: email mặc định của Supabase chỉ gửi được vài thư mỗi giờ; đổi email nhiều lần liên tục có thể phải chờ

6. **Báo cho Google sau khi web chạy** (không bắt buộc, nên làm)
   - [ ] search.google.com/search-console → thêm tên miền → xác minh
   - [ ] Sitemaps → nhập `sitemap.xml` → Submit
   - [ ] Không cần biến môi trường mới: các hàm trong thư mục `api` dùng sẵn 2 biến `VITE_SUPABASE_…` ở trên

Chạy thử trên máy trước (không bắt buộc): chép `.env.example` thành `.env`, điền 3 biến trên, rồi chạy `npm install` và `npm run dev`.

## Bước 4 – Easy AI đăng bài tự động (tùy chọn)

Chỉ làm khi bạn dùng Easy AI để gửi bài vào Blog; không làm thì Blog vẫn viết tay bình thường.

1. **Tạo hàm nhận bài**
   - [ ] Supabase → Edge Functions → Deploy a new function → Via Editor, tên đúng: `nhan-bai`
   - [ ] Dán nội dung `supabase/functions/nhan-bai/index.ts` → **Deploy**
   - [ ] Vào hàm → Details → **tắt** "Enforce JWT verification" → Save (ngược với hàm `gui-tin-nhan`)
2. **Thêm kênh trên Easy AI**
   - [ ] Thêm kênh → Loại **Website** → **Tự động gửi tới website**
   - [ ] Địa chỉ nhận bài: `https://xxxx.supabase.co/functions/v1/nhan-bai`
   - [ ] Chọn "Lưu nháp để duyệt" (an toàn) hoặc "Đăng thẳng"
   - [ ] Chép ngay **khóa bí mật** (chỉ hiện một lần)
3. **Lưu khóa vào Supabase** (Edge Functions → Secrets)
   - [ ] `EASYAI_SECRET` = khóa bí mật vừa chép
   - [ ] `SITE_URL` = địa chỉ web, VD `https://congminh.dev`
4. **Kiểm tra**
   - [ ] Trên Easy AI bấm **Kiểm tra kết nối** → thấy "Kết nối website hoạt động"
   - [ ] Gửi thử một bài → Admin hiện thông báo và bài nằm ở tab **Chờ duyệt**

## Bước 5 – Kiểm tra sau khi lên mạng

Tick hết danh sách này là web đã chạy thật đầy đủ.

- [ ] Mở `https://ten-mien/admin` → đăng nhập được bằng tài khoản ở Bước 1
- [ ] Trang chủ **không** còn dòng "Chế độ demo" ở trang đăng nhập Admin
- [ ] Sửa một chữ trong Admin → trang chủ đổi theo
- [ ] Admin → Đầu trang → tải ảnh avatar → Lưu → ảnh hiện trên trang chủ
- [ ] Admin → Bố cục trang chủ → ẩn thử một mục → mục biến mất, bật lại được
- [ ] Admin → Hiệu ứng chuột / Hiệu ứng theo mùa → áp dụng → trang chủ có hiệu ứng
- [ ] Blog: viết bài, **Lưu nháp** (không hiện ngoài trang) rồi **Đăng bài** (hiện ngay)
- [ ] Mở trực tiếp một link bài dạng `/blog/ten-bai-12` và bấm F5 → không bị lỗi 404
- [ ] Mở `/admin/tin-nhan` rồi F5 → vẫn đúng mục
- [ ] Form Liên hệ: ô chống spam là ô Cloudflare thật (không còn chữ "mô phỏng") → gửi thử → Admin → Tin nhắn báo tin mới
- [ ] Bấm **VI | EN** trên menu → trang đổi ngôn ngữ
- [ ] Admin → một form bất kỳ → tab English → **✨ Gợi ý** → có bản dịch
- [ ] Trên điện thoại: mở trang chủ và Admin, không bị tràn ngang

* [ ] Admin → bấm ảnh/tên ở góc dưới thanh bên → đổi tên, ảnh đại diện → hiện ngay ở thanh bên
* [ ] Đổi mật khẩu → đăng xuất → đăng nhập bằng mật khẩu mới
* [ ] Đổi email → nhận thư xác nhận ở cả email cũ và mới → bấm link → quay về đúng trang Tài khoản
* [ ] Admin → Thương hiệu → tải logo, biểu tượng, favicon → trang chủ và tab trình duyệt đổi theo

- [ ] Gửi form Liên hệ khi Admin đang mở ở tab khác → nghe âm thanh, thấy thông báo góc màn hình, tab Admin hiện số "(1)"
- [ ] Đóng Admin, gửi form Liên hệ → nhận email báo (nếu đã làm Bước 2b) → bấm Trả lời trong email ra đúng email khách
- [ ] Mở `https://ten-mien/sitemap.xml` và `https://ten-mien/robots.txt` → có nội dung
- [ ] Dán link một bài vào developers.facebook.com/tools/debug → thấy đúng tiêu đề, mô tả, ảnh; thử gửi link qua Zalo
- [ ] Admin → Blog → mở một bài → tab English → Gợi ý → Lưu → trang chủ bấm EN thấy bài tiếng Anh, link bài không đổi
- [ ] Bài đăng lại: điền Link bản gốc + bật "Bản ở link gốc là bản chính" → bài đó không còn trong sitemap.xml
- [ ] Duyệt một bài Easy AI → bài lên đầu trang Blog (Blog tự xếp theo ngày đăng)
- [ ] Mở trang chủ bằng điện thoại hoặc trình duyệt ẩn danh (chưa đăng nhập Admin), xem vài trang → vài phút sau Admin → Tổng quan → Lượt xem trang có số, không còn nhãn "Dữ liệu mẫu". Trình duyệt đã đăng nhập Admin thì không được đếm.
- [ ] Mở một link không có, VD https://ten-mien/abc → hiện trang 404 riêng có nút Về trang chủ
- [ ] Dán link trang chủ vào developers.facebook.com/tools/debug → thấy ảnh xem trước có câu ở Đầu trang
- [ ] Admin → Đầu trang → File CV → tải PDF → Lưu → trang chủ có nút **Tải CV** (đầu trang và footer)
- [ ] Admin → Cài đặt → Sao lưu → **Tải bản sao lưu** → có file .json; cất ở Google Drive hoặc máy tính
- [ ] Nếu làm Bước 2c: gửi form Liên hệ khi đã đóng Admin → điện thoại nhận thông báo đẩy, bấm vào mở đúng Tin nhắn

## Lưu ý

**Bảo mật**

- Khóa `service_role` không bao giờ đặt vào biến `VITE_...`, GitHub hay gửi cho ai; Supabase tự cấp nó cho các hàm.
- `TURNSTILE_SECRET` và `EASYAI_SECRET` chỉ nằm trong Supabase → Secrets.
- Trang chủ không có link nào tới Admin; bảo vệ thật là đăng nhập + **tắt đăng ký mới** (Bước 1).

**Gói miễn phí**

- Supabase tạm dừng project miễn phí nếu không có hoạt động trong 1 tuần; vào dashboard bấm Restore là chạy lại, dữ liệu không mất.
- MyMemory: khoảng 5.000 ký tự dịch/ngày, điền email ở Admin → Ngôn ngữ để lên khoảng 50.000.

**Việc chưa làm**

- Ảnh xem trước riêng cho **trang chủ**: đã làm (bản 1.1.0). Trên Vercel trang chủ đi qua hàm api/page, ảnh tạo ở /api/og?home=1
- Thông báo đẩy (Web Push) khi Admin đóng hẳn: đã làm (bản 1.1.0), cài theo Bước 2c

## Dành cho Claude ở cuộc trò chuyện mới

Mở cuộc trò chuyện mới thì làm 2 việc: **đính kèm file `portfolio-congminh-supabase.zip` bản mới nhất** và **dán link tài liệu này**. Claude không giữ code giữa các cuộc trò chuyện; thiếu file zip thì chỉ đọc được hướng dẫn, không sửa được web.

Câu mẫu để dán:

```
Đây là web portfolio của tôi (file zip đính kèm). Đọc tài liệu "Checklist đưa web Công Minh lên Supabase" ở link này trước: <dán link>. Giờ tôi muốn: <việc cần làm>.
```

**Bối cảnh dự án**

- Web portfolio của **Công Minh, Manual QA Tester** (gần 2 năm; web thương mại điện tử, app di động, phần mềm quản lý, ví blockchain). Automation ghi là "đang học", không bịa số liệu.
- Giao diện tối, tông hồng `#e94b9e` – tím `#6650ff`. Ngôn ngữ chính Tiếng Việt, có bản English.
- Code: React 19 + Vite + Tailwind v4 + Supabase (Postgres, Auth, Storage `media`, Realtime, Edge Functions Deno). Không có Supabase thì tự chạy chế độ demo lưu localStorage (`src/demoBackend.js`).
- Build thường: `npm run build`. Build một file HTML demo: `npm run build:single` (link dạng `#/blog/...`).

**Bản đồ file**

| File | Chức năng |
| --- | --- |
| `src/App.jsx` | Trang chủ, menu, footer, định tuyến trang |
| `src/Admin.jsx` | Khung Admin, sidebar, form nội dung (`SCHEMA`), Thông tin chung, Bố cục, Hiệu ứng chuột |
| `src/HeroAdmin.jsx`, `src/HeroVisual.jsx` | Đầu trang: cấu hình mặc định `DEFAULT_HERO`, xem trước, RGB |
| `src/Detail.jsx` | Trang Blog, chi tiết bài/dự án, mục lục, Markdown |
| `src/Contact.jsx`, `src/MessagesAdmin.jsx` | Form Liên hệ + hộp thư Admin |
| `src/i18n.js`, `src/LangAdmin.jsx`, `src/translate.js` | Song ngữ, tab English, gợi ý dịch MyMemory |
| `src/AutoPostAdmin.jsx` | Hướng dẫn + danh sách bài Easy AI |
| `src/CursorFX.jsx`, `src/SeasonFX.jsx`, `src/SeasonAdmin.jsx` | Hiệu ứng chuột, hiệu ứng theo mùa |
| `src/data.js` | Nội dung mẫu + danh sách phần ẩn/hiện |
| `src/router.js`, `src/seo.js`, `src/live.js` | Đường dẫn đẹp, thẻ SEO, realtime (đã giảm tải) |
| `supabase/schema.sql` | Toàn bộ database cho cài mới |
| `supabase/migration-*.sql` | Nâng cấp database cũ theo từng tính năng |
| `supabase/functions/gui-tin-nhan`, `supabase/functions/nhan-bai` | Hàm nhận form Liên hệ, hàm nhận bài Easy AI |
| src/AccountAdmin.jsx | Tài khoản của tôi: tên, ảnh đại diện, đổi email, đổi mật khẩu (Supabase Auth user\_metadata) |
| src/Brand.jsx, src/BrandAdmin.jsx | Thương hiệu: logo, biểu tượng, favicon (cột settings.brand) |
| src/notify.js, src/sounds.js, src/NotifyAdmin.jsx | Thông báo: âm thanh, thông báo hệ thống, số trên tab, cài đặt (bảng admin\_settings, khách không đọc được) |
| api/ (sitemap.js, robots.js, page.js, og.js) | Hàm Vercel: sitemap, robots, chèn thẻ chia sẻ cho từng bài, tạo ảnh chia sẻ; vercel.json nối đường dẫn |
| src/stats.js, src/statsCalc.js, src/StatsAdmin.jsx | Đếm lượt xem (không lưu IP, không đếm Admin và bot) và dashboard trong Tổng quan; SQL ở supabase/migration-thong-ke.sql |
| src/PushAdmin.jsx, public/sw.js, public/manifest.webmanifest | Thông báo đẩy: bật trên thiết bị, tạo khóa VAPID, gửi thử; SQL ở supabase/migration-push.sql |
| src/BackupAdmin.jsx, src/VersionAdmin.jsx | Sao lưu / khôi phục (SQL ở supabase/migration-sao-luu.sql); trang Phiên bản (CHANGELOG, công nghệ) |
| src/postStatus.js | Trạng thái bài Blog và tự sắp xếp theo ngày đăng |

**Quy tắc của chủ web (luôn giữ)**

- Chỉ làm đúng việc được nhờ; muốn làm thêm gì phải hỏi trước.
- Không hiểu bước nào thì hỏi.
- Ưu tiên dễ dùng: Admin có hướng dẫn từng bước và nút sao chép, thông báo bằng tiếng Việt.
- Không làm web lag: hiệu ứng nhẹ, realtime gộp sự kiện.
- Không đặt link Admin trên trang công khai; không thêm nút xóa/khôi phục hàng loạt bấm một lần.
- Không dùng hiệu ứng mờ (blur).
- Mỗi khi làm tính năng mới cần cài đặt thêm sau khi đưa lên web (chạy SQL, tạo hàm, thêm secret, biến môi trường, tài khoản dịch vụ…): ghi ngay vào checklist này, đúng bước, kèm việc cần kiểm tra ở Bước 5. Sửa database thì cập nhật cả `schema.sql` lẫn thêm một file `migration-*.sql` mới, và ghi vào `README.md`.

Bản demo đang xem thử (không phải web thật): [Công Minh Portfolio](https://claude.ai/artifact/GZqhxwmRGNq8XmmMk1Z129), Admin ở `#admin`, đăng nhập `admin@demo.com` / `demo123`.
