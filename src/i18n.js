// Song ngữ Việt / Anh cho trang chủ.
// - Chữ giao diện (menu, nút, tiêu đề mục, form…) nằm trong UI bên dưới.
// - Nội dung tự nhập trong Admin lưu bản English ở cột `en` của từng dòng (VD projects.en.title).
//   Ô nào chưa có bản English thì hiện bản Tiếng Việt.
import { createContext, useContext, useSyncExternalStore } from 'react'
import { mergeHero } from './HeroVisual.jsx'

export const LANGS = [['vi', 'Tiếng Việt', 'VI'], ['en', 'English', 'EN']]

/* ---------- Ngôn ngữ khách đã chọn (lưu trong trình duyệt của khách) ---------- */
const KEY = 'cm-lang'
// Link có ?lang=en (VD từ RSS tiếng Anh) mở đúng ngôn ngữ đó
const fromUrl = (() => { try { const q = new URLSearchParams(location.search).get('lang'); return q === 'vi' || q === 'en' ? q : null } catch { return null } })()
if (fromUrl) try { localStorage.setItem(KEY, fromUrl) } catch { /* chặn lưu: vẫn dùng trong phiên này */ }
let choice = fromUrl || (() => { try { const v = localStorage.getItem(KEY); return v === 'vi' || v === 'en' ? v : null } catch { return null } })()
const subs = new Set()
export function chooseLang(l) {
  choice = l
  try { localStorage.setItem(KEY, l) } catch { /* trình duyệt chặn lưu: vẫn đổi trong phiên này */ }
  subs.forEach(f => f())
}
const useChoice = () => useSyncExternalStore(cb => { subs.add(cb); return () => subs.delete(cb) }, () => choice)

/** Ngôn ngữ đang hiển thị: khách chọn (nếu Admin bật nút đổi) hoặc ngôn ngữ mặc định */
export function useSiteLang(settings = {}) {
  const c = useChoice()
  const def = settings.lang_default === 'en' ? 'en' : 'vi'
  return settings.lang_switch !== false && c ? c : def
}

export const LangCtx = createContext('vi')
/** t('khoa') trả chữ theo ngôn ngữ đang hiển thị; có thể truyền {n} để thay số */
export function useT() {
  const lang = useContext(LangCtx)
  const t = (k, vars) => {
    let s = UI[lang]?.[k] ?? UI.vi[k] ?? k
    if (vars) Object.entries(vars).forEach(([a, b]) => { s = s.replaceAll(`{${a}}`, b) })
    return s
  }
  return { t, lang }
}

/* ---------- Nội dung tự nhập: trường nào có bản English ---------- */
export const TR_FIELDS = {
  projects: [['title', 'Tiêu đề', 'text'], ['category', 'Danh mục', 'text'], ['description', 'Mô tả ngắn', 'textarea'], ['role', 'Vai trò', 'text'], ['duration', 'Thời gian', 'text'], ['content', 'Nội dung trang chi tiết', 'markdown']],
  skills: [['title', 'Tên kỹ năng', 'text'], ['description', 'Mô tả', 'textarea'], ['tags', 'Tags (cách nhau bằng dấu phẩy)', 'tags']],
  jobs: [['period', 'Thời gian', 'text'], ['role', 'Vị trí', 'text'], ['description', 'Mô tả', 'textarea']],
  footer_links: [['label', 'Tên hiển thị', 'text']],
  posts: [['title', 'Tiêu đề', 'text'], ['excerpt', 'Tóm tắt', 'textarea'], ['tags', 'Thẻ (cách nhau bằng dấu phẩy)', 'tags'], ['content', 'Nội dung bài viết', 'markdown']],
  bugs: [['title', 'Tiêu đề bug', 'text'], ['product', 'Sản phẩm / trang bị lỗi', 'text'], ['environment', 'Môi trường', 'text'], ['steps', 'Các bước tái hiện', 'textarea'],
    ['expected', 'Kết quả mong đợi', 'textarea'], ['actual', 'Kết quả thực tế', 'textarea'], ['content', 'Ghi chú thêm', 'markdown'], ['tags', 'Thẻ (cách nhau bằng dấu phẩy)', 'tags']],
}
export const SETTINGS_TR = [['footer_tagline', 'Giới thiệu ngắn', 'textarea'], ['availability', 'Trạng thái', 'text'], ['address', 'Địa chỉ / khu vực', 'text'], ['working_hours', 'Giờ làm việc', 'text'], ['copyright', 'Dòng bản quyền', 'text'], ['footer_note', 'Ghi chú cuối trang', 'text']]

const filled = v => (Array.isArray(v) ? v.length > 0 : typeof v === 'string' ? v.trim() !== '' : v != null && v !== '')
/** Có bản English cho trường này chưa (gốc trống thì coi như không cần dịch) */
export const hasEn = (row, k) => !filled(row?.[k]) || filled(row?.en?.[k])

export function localizeRow(row, fields, lang) {
  if (lang !== 'en' || !row) return row
  const en = row.en || {}, out = { ...row }
  fields.forEach(([k]) => { if (filled(row[k]) && filled(en[k])) out[k] = en[k] })
  return out
}
// Bài viết / dự án: giữ link theo tiêu đề tiếng Việt để đổi ngôn ngữ không đổi đường dẫn
export const localizeList = (rows, table, lang) => (lang === 'en'
  ? rows.map(r => ({ ...localizeRow(r, TR_FIELDS[table] || [], lang), ...(table === 'posts' || table === 'projects' || table === 'bugs' ? { slug: r.slug || r.title } : {}) }))
  : rows)
export const localizeSettings = (s, lang) => localizeRow(s, SETTINGS_TR, lang)

/* ---------- Đầu trang: chữ có bản English, lưu ở settings.hero.en ---------- */
export const HERO_TR = [
  ['badge.text', 'Huy hiệu'], ['lead', 'Đoạn giới thiệu', 'textarea'],
  ['buttons.primary', 'Nút chính'], ['buttons.secondary', 'Nút phụ'],
  ['card1.value', 'Thẻ trên: chữ lớn'], ['card1.label', 'Thẻ trên: chữ nhỏ'],
  ['card2.value', 'Thẻ dưới: chữ lớn'], ['card2.label', 'Thẻ dưới: chữ nhỏ'],
]
export const CTA_TR = [['post_cta.title', 'Tiêu đề'], ['post_cta.text', 'Mô tả ngắn', 'textarea'], ['post_cta.button', 'Chữ trên nút']]
export const getPath = (o, p) => p.split('.').reduce((a, k) => a?.[k], o)
export const setPath = (o, p, v) => {
  const ks = p.split('.'), root = structuredClone(o || {}); let cur = root
  ks.slice(0, -1).forEach(k => { cur[k] = cur[k] && typeof cur[k] === 'object' ? cur[k] : {}; cur = cur[k] })
  cur[ks.at(-1)] = v; return root
}

/** Cấu hình đầu trang theo ngôn ngữ. Tiêu đề 3 phần: có bất kỳ phần English nào thì dùng cả 3 phần English. */
export function heroFor(raw, lang) {
  const h = mergeHero(raw)
  if (lang !== 'en') return h
  const en = h.en || {}, out = structuredClone(h)
  ;[...HERO_TR, ...CTA_TR].forEach(([p]) => { const v = getPath(en, p); if (filled(getPath(h, p)) && filled(v)) Object.assign(out, setPath(out, p, v)) })
  const et = en.title || {}
  if (filled(et.before) || filled(et.highlight) || filled(et.after)) out.title = { ...out.title, before: et.before || '', highlight: et.highlight || '', after: et.after || '' }
  out.stats = h.stats.map((s, i) => ({ ...s, value: filled(en.stats?.[i]?.value) ? en.stats[i].value : s.value, label: filled(en.stats?.[i]?.label) ? en.stats[i].label : s.label }))
  out.marquee = { ...out.marquee, items: (h.marquee.items || []).map((x, i) => (filled(en.marquee?.items?.[i]) ? en.marquee.items[i] : x)) }
  return out
}

/* ---------- Chữ giao diện ---------- */
export const UI = {
  vi: {
    'nav.home': 'Trang chủ', 'nav.skills': 'Kỹ năng', 'nav.experience': 'Kinh nghiệm', 'nav.work': 'Dự án', 'nav.blog': 'Blog', 'nav.contact': 'Liên hệ',
    'nav.open': 'Mở menu', 'nav.lang': 'Đổi ngôn ngữ', skip: 'Bỏ qua, tới nội dung chính',
    'hero.primary': 'Xem dự án', 'hero.secondary': 'Liên hệ', 'hero.cv': 'Tải CV',
    'skills.label': 'KỸ NĂNG', 'skills.title': 'Bộ kỹ năng kiểm thử', 'skills.intro': 'Từ đọc hiểu yêu cầu, viết test case đến báo bug và kiểm tra lại sau khi sửa.',
    'exp.label': 'KINH NGHIỆM', 'exp.title': 'Kinh nghiệm làm việc',
    'work.label': 'DỰ ÁN', 'work.title': 'Dự án đã tham gia', 'work.more': 'Xem chi tiết', 'cursor.view': 'XEM', 'cursor.read': 'ĐỌC',
    'blog.label': 'BLOG', 'blog.title': 'Chia sẻ về QA', 'blog.all': 'Xem tất cả bài viết ({n})',
    'foot.cv': 'Tải CV ↓', 'foot.menu': 'MENU', 'foot.contact': 'LIÊN HỆ', 'foot.socials': 'KẾT NỐI',
    'seo.blog': 'Bài viết về kiểm thử phần mềm, tự động hóa và chất lượng sản phẩm.',
    // Liên hệ
    'ct.label': 'LIÊN HỆ', 'ct.title': 'Cần một tester cẩn thận cho sản phẩm của bạn?', 'ct.text': 'Gửi vài dòng mô tả là đủ, không cần tài liệu chỉn chu. Mình sẽ phản hồi qua email sớm nhất có thể.',
    'ct.form': 'Gửi tin nhắn cho mình', 'ct.req': 'Các mục có dấu * là bắt buộc.', 'ct.name': 'Họ và tên', 'ct.email': 'Email', 'ct.msg': 'Nội dung',
    'ct.ph.name': 'Nguyễn Văn A', 'ct.ph.email': 'ten@email.com', 'ct.ph.msg': 'Sản phẩm của bạn là gì, cần test phần nào, thời gian dự kiến…',
    'ct.e.name': 'Vui lòng nhập họ tên.', 'ct.e.email': 'Email chưa đúng định dạng, VD ten@gmail.com.', 'ct.e.msg': 'Vui lòng nhập nội dung (ít nhất vài chữ).', 'ct.e.captcha': 'Vui lòng xác nhận ô chống spam.',
    'ct.e.fail': 'Chưa gửi được, vui lòng thử lại sau.', 'ct.send': 'Gửi tin nhắn', 'ct.sending': 'Đang gửi…',
    'ct.done': 'Đã gửi tin nhắn!', 'ct.done.text': 'Cảm ơn bạn. Mình sẽ phản hồi qua email sớm nhất có thể.', 'ct.again': 'Gửi tin nhắn khác',
    'ct.srv.invalid': 'Dữ liệu gửi lên không hợp lệ, vui lòng thử lại.', 'ct.srv.required': 'Vui lòng nhập họ tên và nội dung.', 'ct.srv.email': 'Email chưa đúng định dạng.',
    'ct.srv.captcha': 'Xác minh chống spam chưa thành công, vui lòng thử lại.', 'ct.srv.config': 'Form đang bảo trì, vui lòng liên hệ qua email.', 'ct.srv.save': 'Chưa lưu được tin nhắn, vui lòng thử lại sau.',
    'ct.robot.fail': 'Không tải được ô chống spam. Hãy tắt trình chặn quảng cáo cho trang này rồi tải lại trang.',
    'ct.robot': 'Tôi không phải robot', 'ct.robot.ok': 'Thành công!', 'ct.robot.demo': 'Bản demo: mô phỏng Cloudflare Turnstile', 'ct.robot.nokey': 'Chưa cấu hình Turnstile',
    // Blog & chi tiết
    'post.mins': '{n} phút đọc', 'post.read': 'Đọc tiếp', 'post.home': '← Trang chủ', 'post.allTitle': 'Tất cả bài viết', 'post.count': '{n} bài viết về kiểm thử phần mềm, tự động hóa và chất lượng sản phẩm.',
    'pg.nav': 'Phân trang', 'pg.prev': 'Trước', 'pg.next': 'Sau', 'pg.page': 'Trang', 'pg.range': 'Bài {a}–{b} trong {n} bài', 'pg.none': 'Trang {n} không có bài nào.', 'pg.last': 'Về trang cuối ({n}) →',
    'post.allTag': 'Tất cả', 'post.none': 'Chưa có bài viết', 'post.noneTag': 'với thẻ',
    'post.back': '← Tất cả bài viết', 'post.summary': 'Tóm tắt:', 'post.empty': 'Bài viết chưa có nội dung chi tiết.', 'post.source': 'Đọc bản gốc ↗',
    'post.related': 'Bài viết liên quan', 'post.allLink': 'Tất cả bài viết →', 'post.unit': 'Bài', 'post.notfound': 'bài viết',
    'toc.title': 'Mục lục', 'toc.side': 'TRÊN TRANG NÀY', 'pager.prev': '← {x} trước', 'pager.next': '{x} tiếp →',
    'nf.text': 'Không tìm thấy {x} này. Có thể nó đã bị ẩn hoặc xóa.', 'nf.back': '← Quay lại',
    'nf.title': 'Không tìm thấy trang này', 'nf.lead': 'Link có thể đã đổi, đã bị xóa hoặc gõ nhầm một chữ.', 'nf.home': 'Về trang chủ', 'nf.blog': 'Xem Blog', 'nf.read': 'Có thể bạn muốn đọc',
    'nf.bug.sev': 'Mức độ: Thấp', 'nf.bug.title': 'Trang không tồn tại', 'nf.bug.steps': 'Bước tái hiện', 'nf.bug.open': 'Mở', 'nf.bug.expected': 'Mong đợi', 'nf.bug.expectedv': 'Thấy nội dung trang',
    'nf.bug.actual': 'Thực tế', 'nf.bug.actualv': 'Trang 404 (chính là trang này)', 'nf.bug.status': 'Cách khắc phục', 'nf.bug.statusv': 'Về trang chủ hoặc xem Blog',
    'proj.back': '← Tất cả dự án', 'proj.label': 'DỰ ÁN', 'proj.role': 'Vai trò', 'proj.time': 'Thời gian', 'proj.cat': 'Danh mục', 'proj.tools': 'Công cụ',
    'proj.empty': 'Dự án chưa có mô tả chi tiết.', 'proj.link': 'Xem sản phẩm / tài liệu ↗', 'proj.unit': 'Dự án', 'proj.notfound': 'dự án',
    // Bug mẫu
    'nav.bugs': 'Bug mẫu', 'bugs.label': 'BUG REPORT', 'bugs.title': 'Bug mình đã tìm ra', 'bugs.intro': 'Bug report mẫu viết như khi làm thật: bước tái hiện, kết quả mong đợi và thực tế, mức độ nghiêm trọng.',
    'bugs.self': 'Mình cũng đã tự kiểm thử chính trang web này.', 'bugs.selfLink': 'Xem kết quả →', 'bugs.open': 'Xem bug report', 'bugs.back': '← Tất cả bug mẫu', 'bugs.unit': 'Bug', 'bugs.notfound': 'bug report',
    'bug.sev': 'Mức độ', 'bug.pri': 'Ưu tiên', 'bug.status': 'Trạng thái', 'bug.found': 'Ngày phát hiện', 'bug.product': 'Sản phẩm', 'bug.env': 'Môi trường',
    'bug.steps': 'Các bước tái hiện', 'bug.expected': 'Kết quả mong đợi', 'bug.actual': 'Kết quả thực tế', 'bug.evidence': 'Bằng chứng', 'bug.notes': 'Ghi chú', 'bug.visit': 'Mở nơi xảy ra lỗi ↗',
    'sev.critical': 'Critical', 'sev.major': 'Major', 'sev.minor': 'Minor', 'sev.trivial': 'Trivial', // thuật ngữ quen thuộc trong nghề QA, giữ tiếng Anh
    'pri.high': 'High', 'pri.medium': 'Medium', 'pri.low': 'Low',
    'st.reported': 'Đã báo cáo', 'st.fixed': 'Đã sửa', 'st.wontfix': 'Không sửa',
    // Trang Kiểm thử web
    'qa.label': 'KIỂM THỬ', 'qa.title': 'Mình đã test chính trang web này', 'qa.scores': 'Điểm Lighthouse', 'qa.mobile': 'Điện thoại', 'qa.desktop': 'Máy tính',
    'qa.perf': 'Hiệu năng', 'qa.a11y': 'Trợ năng', 'qa.best': 'Thực hành tốt', 'qa.seo': 'SEO', 'qa.measured': 'Đo ngày {d} bằng {tool}.',
    'qa.envs': 'Trình duyệt và thiết bị đã test', 'qa.checks': 'Checklist trợ năng và chất lượng', 'qa.found': 'Bug tự tìm ra trên web này',
    'qa.r.pass': 'Đạt', 'qa.r.issue': 'Có lỗi', 'qa.r.todo': 'Chưa test', 'qa.f.fixed': 'Đã sửa', 'qa.f.open': 'Đang theo dõi', 'qa.f.note': 'Ghi nhận',
    'qa.ok': 'Đạt', 'qa.no': 'Chưa đạt', 'qa.seo.desc': 'Kết quả tự kiểm thử trang web portfolio: điểm Lighthouse, trình duyệt đã test, checklist trợ năng và các bug đã tìm ra.',
    // CV online
    'cv.view': 'Xem CV online', 'cv.print': 'In / Lưu PDF', 'cv.pdf': 'Tải file PDF', 'cv.tip': 'Mẹo: trong hộp thoại in, chọn "Lưu dưới dạng PDF" và tắt "Đầu trang và chân trang".',
    'cv.role': 'Manual QA Tester', 'cv.about': 'Giới thiệu', 'cv.skills': 'Kỹ năng', 'cv.exp': 'Kinh nghiệm', 'cv.projects': 'Dự án', 'cv.bugs': 'Bug report mẫu', 'cv.web': 'Portfolio',
    'cv.seo': 'CV online của Công Minh, Manual QA Tester: kỹ năng, kinh nghiệm và dự án. In hoặc lưu PDF ngay trên trình duyệt.',
    // RSS
    'rss.follow': 'Theo dõi qua RSS', 'rss.title': 'RSS',
  },
  en: {
    'nav.home': 'Home', 'nav.skills': 'Skills', 'nav.experience': 'Experience', 'nav.work': 'Work', 'nav.blog': 'Blog', 'nav.contact': 'Contact',
    'nav.open': 'Open menu', 'nav.lang': 'Change language', skip: 'Skip to main content',
    'hero.primary': 'View projects', 'hero.secondary': 'Contact', 'hero.cv': 'Download CV',
    'skills.label': 'SKILLS', 'skills.title': 'Testing skill set', 'skills.intro': 'From understanding requirements and writing test cases to reporting bugs and retesting fixes.',
    'exp.label': 'EXPERIENCE', 'exp.title': 'Work experience',
    'work.label': 'WORK', 'work.title': 'Projects I have worked on', 'work.more': 'View details', 'cursor.view': 'VIEW', 'cursor.read': 'READ',
    'blog.label': 'BLOG', 'blog.title': 'Notes on QA', 'blog.all': 'See all posts ({n})',
    'foot.cv': 'Download CV ↓', 'foot.menu': 'MENU', 'foot.contact': 'CONTACT', 'foot.socials': 'CONNECT',
    'seo.blog': 'Articles about software testing, automation and product quality.',
    'ct.label': 'CONTACT', 'ct.title': 'Need a careful tester for your product?', 'ct.text': 'A few lines are enough, no polished documents needed. I will get back to you by email as soon as I can.',
    'ct.form': 'Send me a message', 'ct.req': 'Fields marked * are required.', 'ct.name': 'Full name', 'ct.email': 'Email', 'ct.msg': 'Message',
    'ct.ph.name': 'Jane Doe', 'ct.ph.email': 'name@email.com', 'ct.ph.msg': 'What is your product, which parts need testing, expected timeline…',
    'ct.e.name': 'Please enter your name.', 'ct.e.email': 'Please enter a valid email, e.g. name@gmail.com.', 'ct.e.msg': 'Please write a message (at least a few words).', 'ct.e.captcha': 'Please complete the spam check.',
    'ct.e.fail': 'Could not send your message, please try again later.', 'ct.send': 'Send message', 'ct.sending': 'Sending…',
    'ct.done': 'Message sent!', 'ct.done.text': 'Thank you. I will reply by email as soon as I can.', 'ct.again': 'Send another message',
    'ct.srv.invalid': 'Invalid data, please try again.', 'ct.srv.required': 'Please enter your name and a message.', 'ct.srv.email': 'Please enter a valid email.',
    'ct.srv.captcha': 'Spam check failed, please try again.', 'ct.srv.config': 'The form is under maintenance, please contact me by email.', 'ct.srv.save': 'Could not save your message, please try again later.',
    'ct.robot.fail': 'The spam check could not load. Please disable your ad blocker for this site and reload the page.',
    'ct.robot': 'I am not a robot', 'ct.robot.ok': 'Success!', 'ct.robot.demo': 'Demo: simulated Cloudflare Turnstile', 'ct.robot.nokey': 'Turnstile is not configured',
    'post.mins': '{n} min read', 'post.read': 'Read more', 'post.home': '← Home', 'post.allTitle': 'All posts', 'post.count': '{n} posts about software testing, automation and product quality.',
    'pg.nav': 'Pagination', 'pg.prev': 'Previous', 'pg.next': 'Next', 'pg.page': 'Page', 'pg.range': 'Posts {a}–{b} of {n}', 'pg.none': 'Page {n} has no posts.', 'pg.last': 'Go to the last page ({n}) →',
    'post.allTag': 'All', 'post.none': 'No posts yet', 'post.noneTag': 'tagged',
    'post.back': '← All posts', 'post.summary': 'Summary:', 'post.empty': 'This post has no content yet.', 'post.source': 'Read the original ↗',
    'post.related': 'Related posts', 'post.allLink': 'All posts →', 'post.unit': 'post', 'post.notfound': 'post',
    'toc.title': 'Contents', 'toc.side': 'ON THIS PAGE', 'pager.prev': '← Previous {x}', 'pager.next': 'Next {x} →',
    'nf.text': 'This {x} could not be found. It may have been hidden or deleted.', 'nf.back': '← Go back',
    'nf.title': 'Page not found', 'nf.lead': 'The link may have changed, been removed, or has a typo.', 'nf.home': 'Back to home', 'nf.blog': 'Browse the blog', 'nf.read': 'You might like',
    'nf.bug.sev': 'Severity: Low', 'nf.bug.title': 'Page does not exist', 'nf.bug.steps': 'Steps to reproduce', 'nf.bug.open': 'Open', 'nf.bug.expected': 'Expected', 'nf.bug.expectedv': 'See the page content',
    'nf.bug.actual': 'Actual', 'nf.bug.actualv': 'A 404 page (this one)', 'nf.bug.status': 'Workaround', 'nf.bug.statusv': 'Go back home or browse the blog',
    'proj.back': '← All projects', 'proj.label': 'PROJECT', 'proj.role': 'Role', 'proj.time': 'Duration', 'proj.cat': 'Category', 'proj.tools': 'Tools',
    'proj.empty': 'This project has no detailed description yet.', 'proj.link': 'View product / docs ↗', 'proj.unit': 'project', 'proj.notfound': 'project',
    'nav.bugs': 'Bug reports', 'bugs.label': 'BUG REPORTS', 'bugs.title': 'Bugs I have found', 'bugs.intro': 'Sample bug reports written the way I write them at work: steps to reproduce, expected vs actual result, severity.',
    'bugs.self': 'I also tested this very website.', 'bugs.selfLink': 'See the results →', 'bugs.open': 'Read the report', 'bugs.back': '← All bug reports', 'bugs.unit': 'bug', 'bugs.notfound': 'bug report',
    'bug.sev': 'Severity', 'bug.pri': 'Priority', 'bug.status': 'Status', 'bug.found': 'Found on', 'bug.product': 'Product', 'bug.env': 'Environment',
    'bug.steps': 'Steps to reproduce', 'bug.expected': 'Expected result', 'bug.actual': 'Actual result', 'bug.evidence': 'Evidence', 'bug.notes': 'Notes', 'bug.visit': 'Open where it happens ↗',
    'sev.critical': 'Critical', 'sev.major': 'Major', 'sev.minor': 'Minor', 'sev.trivial': 'Trivial',
    'pri.high': 'High', 'pri.medium': 'Medium', 'pri.low': 'Low',
    'st.reported': 'Reported', 'st.fixed': 'Fixed', 'st.wontfix': "Won't fix",
    'qa.label': 'TESTING', 'qa.title': 'I tested this very website', 'qa.scores': 'Lighthouse scores', 'qa.mobile': 'Mobile', 'qa.desktop': 'Desktop',
    'qa.perf': 'Performance', 'qa.a11y': 'Accessibility', 'qa.best': 'Best practices', 'qa.seo': 'SEO', 'qa.measured': 'Measured on {d} with {tool}.',
    'qa.envs': 'Browsers and devices tested', 'qa.checks': 'Accessibility and quality checklist', 'qa.found': 'Bugs I found on this site',
    'qa.r.pass': 'Pass', 'qa.r.issue': 'Issue', 'qa.r.todo': 'Not tested yet', 'qa.f.fixed': 'Fixed', 'qa.f.open': 'Monitoring', 'qa.f.note': 'Noted',
    'qa.ok': 'Pass', 'qa.no': 'Not yet', 'qa.seo.desc': 'Results of testing this portfolio website: Lighthouse scores, browsers tested, an accessibility checklist and the bugs found.',
    'cv.view': 'View CV online', 'cv.print': 'Print / Save as PDF', 'cv.pdf': 'Download PDF file', 'cv.tip': 'Tip: in the print dialog choose "Save as PDF" and turn off "Headers and footers".',
    'cv.role': 'Manual QA Tester', 'cv.about': 'Profile', 'cv.skills': 'Skills', 'cv.exp': 'Experience', 'cv.projects': 'Projects', 'cv.bugs': 'Sample bug reports', 'cv.web': 'Portfolio',
    'cv.seo': 'Online CV of Công Minh, Manual QA Tester: skills, experience and projects. Print or save as PDF right in your browser.',
    'rss.follow': 'Follow via RSS', 'rss.title': 'RSS',
  },
}
