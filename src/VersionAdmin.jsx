// Admin → Cài đặt → Phiên bản: thông tin của web, tính năng, công nghệ sử dụng, lịch sử phiên bản.
// Số phiên bản, ngày build và phiên bản thư viện tự lấy lúc build (vite.config.js → __APP_INFO__).
// Ra phiên bản mới: tăng "version" trong package.json và thêm một mục vào CHANGELOG bên dưới.
import { demoMode } from './supabase.js'
import { useA, adminLocale, getAdminLang } from './adminLang.js'

/* global __APP_INFO__ */
const INFO = typeof __APP_INFO__ !== 'undefined' ? __APP_INFO__ : { version: '1.0.0', built: '', deps: {} }
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const TURNSTILE = Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY)
const HASH = Boolean(import.meta.env.VITE_HASH_ROUTER)

// Lịch sử phiên bản: mới nhất ở trên
const CHANGELOG = [
  { version: '1.2.0', date: '2026-10-14', items: [
    'Bug mẫu: danh sách bug kèm trang chi tiết (mức độ, ưu tiên, các bước tái hiện, bằng chứng), quản lý trong Admin.',
    'Trang Kiểm thử web (/kiem-thu): kết quả tự kiểm thử chính web này, có điểm Lighthouse làm bằng chứng.',
    'CV online (/cv) và RSS cho Blog (/rss.xml).',
    'Bố cục trang chủ: công tắc bật/tắt nút CV, dòng Kiểm thử và link RSS.',
    'Admin: tìm kiếm mọi thứ bằng Ctrl+K / ⌘K hoặc phím /, tìm tới cả từng phần trong trang, có bộ lọc và gõ tắt.',
    'Thông báo: chỉnh tên người gửi email (Resend).',
    'Trang chủ hiện ngay nhờ nhúng sẵn dữ liệu vào HTML; gộp request Supabase, cache tài nguyên, hiệu ứng nhẹ hơn.',
    'Đường dẫn không tồn tại hoặc trang đã tắt trả đúng mã 404; sitemap bỏ /blog khi tắt mục Blog.',
    'Tự tải lại trang khi file JS lỗi sau deploy mới thay vì để trống trang; sửa các lỗi tìm được khi kiểm thử.',
  ] },
  { version: '1.1.0', date: '2026-10-12', items: [
    'Nút Tải CV (PDF, có bản tiếng Anh) ở đầu trang và footer.',
    'Sao lưu toàn bộ nội dung về 1 file và khôi phục an toàn (không xóa gì).',
    'Thông báo đẩy tới điện thoại / máy tính kể cả khi đã đóng Admin.',
    'Ảnh xem trước riêng cho trang chủ khi chia sẻ link.',
    'Trang chủ nhẹ hơn: nội dung mẫu và bảng chữ English của Admin chỉ tải khi cần.',
    'Ngày đăng trong danh sách Blog của Admin hiện đúng kiểu English.',
  ] },
  { version: '1.0.0', date: '2026-10-12', items: [
    'Bản đầy đủ đầu tiên: trang chủ portfolio, Blog, trang chi tiết dự án, form Liên hệ có chống spam.',
    'Admin quản lý toàn bộ nội dung, giao diện, thương hiệu, hiệu ứng, hộp thư, thông báo và đăng bài tự động từ Easy AI.',
    'Song ngữ Việt / Anh cho trang chủ, bài blog và giao diện Admin.',
    'SEO: link đẹp, sitemap.xml, robots.txt, ảnh chia sẻ Facebook/Zalo, trang 404 riêng.',
    'Thống kê lượt xem ngay trong Tổng quan.',
  ] },
]

// Tính năng hiện có, chia theo nhóm
const FEATURES = [
  ['Trang chủ', ['Đầu trang, Kỹ năng, Kinh nghiệm, Dự án, Blog, Liên hệ; ẩn/hiện từng phần', 'Hiệu ứng con trỏ, hiệu ứng theo mùa (tuyết, hoa mai, hoa đào, pháo hoa)', 'Nút đổi ngôn ngữ VI | EN, trang 404 riêng', 'Nút Tải CV (PDF) ở đầu trang và footer, CV online (/cv)', 'Bug mẫu và trang Kiểm thử web (kết quả tự kiểm thử, điểm Lighthouse)', 'Form Liên hệ có Cloudflare Turnstile chống spam']],
  ['Blog', ['Bài viết Markdown có ảnh, mục lục, thời gian đọc, thẻ, bài liên quan', 'Phân trang 9 bài/trang, lọc theo thẻ, tự xếp theo ngày đăng', 'Ba trạng thái: Bản nháp, Chờ duyệt, Đã đăng', 'Bản tiếng Anh cho từng bài; bài đăng lại có thể trỏ bản chính về link gốc']],
  ['Admin', ['Đăng nhập bằng Supabase Auth, trang Tài khoản của tôi (tên, ảnh, email, mật khẩu)', 'Hộp thư tin nhắn dạng hội thoại, trả lời email ngay trong Admin (mẫu trả lời, AI viết nháp, đính kèm file, chữ ký, ghi chú nội bộ)', 'Thông báo âm thanh, thông báo hệ thống, số trên tab, email qua Resend', 'Đăng bài tự động từ Easy AI (có duyệt bài)', 'Giao diện Admin tiếng Việt / English', 'Dashboard lượt xem: lượt xem, người xem, bài xem nhiều, nguồn khách, thiết bị, ngôn ngữ', 'Thông báo đẩy tới điện thoại / máy tính', 'Sao lưu và khôi phục nội dung', 'Tìm kiếm nhanh Ctrl+K / ⌘K hoặc phím /']],
  ['SEO & chia sẻ', ['Link đẹp theo tên bài (/blog/ten-bai-12)', 'sitemap.xml, robots.txt, RSS (/rss.xml), thẻ canonical, dữ liệu có cấu trúc (JSON-LD)', 'Ảnh xem trước khi chia sẻ link lên Facebook / Zalo (cả trang chủ)', 'Trang Admin và trang 404 không cho Google lập chỉ mục']],
]

// Công nghệ: [tên, gói npm để lấy phiên bản (nếu có), dùng để làm gì]
const STACK = [
  ['Giao diện (frontend)', [
    ['React', 'react', 'Thư viện dựng giao diện trang chủ và Admin'],
    ['Vite', 'vite', 'Công cụ chạy thử và đóng gói web'],
    ['Tailwind CSS', 'tailwindcss', 'Viết giao diện, màu sắc, bố cục'],
    ['TipTap', '@tiptap/react', 'Khung soạn bài blog trong Admin (Markdown, ảnh)'],
    ['Web Audio, Notification API', '', 'Âm thanh và thông báo hệ thống trong Admin (có sẵn trong trình duyệt)'],
    ['Service Worker, Web Push', '', 'Nhận thông báo đẩy khi đã đóng Admin (public/sw.js)'],
  ]],
  ['Máy chủ & dữ liệu (backend)', [
    ['Supabase', '@supabase/supabase-js', 'Database Postgres, đăng nhập, kho ảnh, realtime'],
    ['Supabase Edge Functions (Deno)', '', 'Hàm gui-tin-nhan (form Liên hệ) và nhan-bai (nhận bài Easy AI)'],
    ['Vercel', '', 'Đưa web lên mạng, hàm sitemap / robots / thẻ chia sẻ'],
    ['@vercel/og', '@vercel/og', 'Tạo ảnh xem trước khi chia sẻ link'],
    ['web-push', '', 'Gửi thông báo đẩy có chữ ký VAPID (trong hàm Supabase)'],
  ]],
  ['Dịch vụ bên ngoài', [
    ['Cloudflare Turnstile', '', 'Ô chống spam ở form Liên hệ'],
    ['Resend', '', 'Gửi email báo tin nhắn mới / bài mới'],
    ['MyMemory', '', 'Gợi ý bản dịch Việt → Anh trong Admin'],
    ['Easy AI', '', 'Gửi bài viết sang Blog (đăng bài tự động)'],
  ]],
]

function Card({ title, hint, children }) {
  return (
    <section className="rounded-xl border border-line bg-card">
      <header className="border-b border-line px-5 py-4"><h2 className="font-semibold">{title}</h2>{hint && <p className="text-xs text-muted">{hint}</p>}</header>
      <div className="p-5">{children}</div>
    </section>
  )
}

export default function VersionAdmin() {
  const a = useA()
  const date = iso => { if (!iso) return '–'; const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso); return isNaN(d) ? iso : d.toLocaleDateString(adminLocale(), { day: 'numeric', month: 'long', year: 'numeric' }) }
  const time = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleTimeString(adminLocale(), { hour: '2-digit', minute: '2-digit' }) }
  const host = SUPABASE_URL.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  const rows = [
    [a('Phiên bản'), <b key="v" className="font-mono">v{INFO.version}</b>],
    [a('Ngày build'), INFO.built ? `${date(INFO.built)} · ${time(INFO.built)}` : '–'],
    [a('Dữ liệu'), demoMode ? <span key="d" className="text-[#f8d27c]">{a('Bản demo: lưu trong trình duyệt này, chưa nối Supabase')}</span> : <span key="d">{a('Supabase')} · <code className="font-mono text-[13px]">{host}</code></span>],
    [a('Địa chỉ web'), <code key="o" className="break-all font-mono text-[13px]">{location.origin}</code>],
    [a('Kiểu đường dẫn'), HASH ? a('Dạng #/blog/… (bản xem thử 1 file)') : a('Link thật /blog/… (bản deploy)')],
    [a('Ô chống spam (Turnstile)'), TURNSTILE ? a('Đã gắn Site Key') : a('Chưa gắn Site Key')],
    [a('Ngôn ngữ Admin'), getAdminLang() === 'en' ? 'English' : 'Tiếng Việt'],
  ]
  return (
    <div className="mx-auto max-w-[920px] space-y-5 pb-16">
      <section className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-gradient-to-r from-pink/15 via-card to-purple/15 p-5">
        <span className="grid size-14 flex-none place-items-center rounded-2xl bg-gradient-to-br from-pink to-purple font-mono text-sm font-bold">v{INFO.version.split('.').slice(0, 2).join('.')}</span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">Cong.Minh Portfolio <span className="font-mono text-[#c9bfff]">v{INFO.version}</span></h2>
          <p className="text-sm text-muted">{a('Portfolio Manual QA Tester kèm trang quản trị nội dung. Build ngày {date}.', { date: date(INFO.built) })}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${demoMode ? 'border-[#f8d27c]/40 bg-[#f8d27c]/10 text-[#f8d27c]' : 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'}`}>{demoMode ? a('Bản demo') : a('Đang chạy thật')}</span>
      </section>

      <Card title={a('Thông tin web')}>
        <dl className="divide-y divide-line/70 text-sm">
          {rows.map(([k, v]) => <div key={k} className="grid gap-1 py-2.5 sm:grid-cols-[220px_1fr] sm:gap-4"><dt className="text-muted">{k}</dt><dd className="min-w-0 text-[#dfe0ea]">{v}</dd></div>)}
        </dl>
      </Card>

      <Card title={a('Công nghệ sử dụng')} hint={a('Phiên bản lấy đúng theo thư viện đang cài lúc build.')}>
        <div className="space-y-6">
          {STACK.map(([group, items]) => (
            <div key={group}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">{a(group)}</h3>
              <ul className="divide-y divide-line/70 rounded-lg border border-line">
                {items.map(([name, pkg, use]) => (
                  <li key={name} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[230px_90px_1fr] sm:items-baseline sm:gap-4">
                    <span className="font-semibold text-white">{name}</span>
                    <span className="font-mono text-[12.5px] text-[#c9bfff]">{pkg && INFO.deps[pkg] ? `v${INFO.deps[pkg]}` : '—'}</span>
                    <span className="text-[#c9cbd8]">{a(use)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      <Card title={a('Tính năng hiện có')}>
        <div className="grid gap-5 sm:grid-cols-2">
          {FEATURES.map(([group, items]) => (
            <div key={group}>
              <h3 className="mb-2 font-semibold">{a(group)}</h3>
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-[#c9cbd8] marker:text-pink">{items.map(t => <li key={t}>{a(t)}</li>)}</ul>
            </div>
          ))}
        </div>
      </Card>

      <Card title={a('Lịch sử phiên bản')} hint={a('Mỗi lần nâng cấp lớn sẽ thêm một mục ở đây.')}>
        <ol className="space-y-5">
          {CHANGELOG.map(v => (
            <li key={v.version} className="relative border-l border-line pl-5">
              <i aria-hidden="true" className="absolute -left-[5px] top-1.5 size-2.5 rounded-full bg-gradient-to-br from-pink to-purple" />
              <p className="flex flex-wrap items-baseline gap-x-3"><b className="font-mono">v{v.version}</b><span className="text-xs text-muted">{date(v.date)}</span></p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#c9cbd8] marker:text-muted">{v.items.map(t => <li key={t}>{a(t)}</li>)}</ul>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  )
}
