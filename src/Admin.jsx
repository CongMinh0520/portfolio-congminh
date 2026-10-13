import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { supabase, demoMode, demoAccount } from './supabase.js'
import { GRADS, DEMO_SETTINGS, SECTIONS } from './siteBase.js'
import { loadTable, loadSettings } from './useContent.js'
import RichEditor from './RichEditor.jsx'
import CursorFX, { POINTERS, TRAILS, parseCursor, joinCursor } from './CursorFX.jsx'
import HeroAdmin, { ImageField } from './HeroAdmin.jsx'
import SeasonAdmin from './SeasonAdmin.jsx'
import AutoPostAdmin from './AutoPostAdmin.jsx'
import { subscribePosts, subscribeTable } from './live.js'
import { postStatus, STATUS_PATCH, STATUS_ORDER, sortPosts, publishPatch } from './postStatus.js'
import MessagesAdmin, { loadMessages, SetupHelp } from './MessagesAdmin.jsx'
import LangPage, { LangTabs, EnEditor, missingOf } from './LangAdmin.jsx'
import AccountAdmin, { profileOf } from './AccountAdmin.jsx'
import BrandAdmin from './BrandAdmin.jsx'
import NotifyAdmin from './NotifyAdmin.jsx'
import { notifyOf, fire, setTabCount, loadAdminSettings } from './notify.js'
import { useAdminLang, setAdminLang, useA, at, adminLocale, adminDictReady, loadAdminDict } from './adminLang.js'
// Ngày đăng trong danh sách: 12/10/2026 (Việt) hoặc Oct 12, 2026 (English)
const fmtDay = d => { const t = new Date(`${String(d).slice(0, 10)}T00:00:00`); return isNaN(t) ? d : adminLocale() === 'vi-VN' ? String(d).slice(0, 10).split('-').reverse().join('/') : t.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
import StatsPanel from './StatsAdmin.jsx'
import VersionAdmin from './VersionAdmin.jsx'
import BackupAdmin from './BackupAdmin.jsx'
import { markOwner } from './stats.js'
import { BrandIcon, BrandLogo, brandOf, useFavicon } from './Brand.jsx'
import { TR_FIELDS, SETTINGS_TR, CTA_TR } from './i18n.js'
import { Markdown } from './Detail.jsx'
import { href, postPath, projectPath, bugPath, bugCode, navigate, usePath } from './router.js'
import { BugReport, BugBadges, SEVERITIES, PRIORITIES, STATUSES } from './Bugs.jsx'
import SelfTestAdmin from './SelfTestAdmin.jsx'
import { mergeHero, DEFAULT_HERO } from './HeroVisual.jsx'
import { autoCover, coverOf, newSeed } from './autoArt.js'

/* ---------------- Cấu hình nội dung ---------------- */
const SCHEMA = {
  projects: { label: 'Dự án', icon: 'folder', title: 'title', sub: 'category', fields: [
    ['title', 'Tiêu đề', 'text'], ['image', 'Ảnh bìa', 'cover'], ['category', 'Danh mục (VD: API · POSTMAN)', 'text'],
    ['description', 'Mô tả ngắn (hiện trên thẻ)', 'textarea'], ['grad', 'Bảng màu cho ảnh tự tạo', 'select'],
    ['role', 'Vai trò của bạn', 'text'], ['duration', 'Thời gian (VD: 3 tháng)', 'text'], ['tools', 'Công cụ (cách nhau bằng dấu phẩy)', 'tags'],
    ['content', 'Nội dung trang chi tiết', 'markdown'], ['link', 'Link ngoài (sản phẩm, tài liệu… để trống = ẩn nút)', 'text'] ] },
  skills: { label: 'Kỹ năng', icon: 'bolt', title: 'title', sub: 'description', fields: [
    ['icon', 'Icon (emoji)', 'text'], ['title', 'Tên kỹ năng', 'text'], ['description', 'Mô tả', 'textarea'],
    ['tags', 'Tags (cách nhau bằng dấu phẩy)', 'tags'] ] },
  jobs: { label: 'Kinh nghiệm', icon: 'briefcase', title: 'role', sub: 'period', fields: [
    ['period', 'Thời gian (VD: 2024 – Hiện tại)', 'text'], ['role', 'Vị trí', 'text'], ['description', 'Mô tả', 'textarea'] ] },
  posts: { label: 'Blog', icon: 'doc', title: 'title', sub: 'excerpt', fields: [
    ['title', 'Tiêu đề', 'text'], ['image', 'Ảnh bìa', 'cover'], ['published_at', 'Ngày đăng', 'date'], ['excerpt', 'Tóm tắt (hiện trên thẻ và khung Tóm tắt đầu bài)', 'textarea'],
    ['tags', 'Thẻ (cách nhau bằng dấu phẩy, VD: Automation, Playwright)', 'tags'],
    ['content', 'Nội dung bài viết', 'markdown'], ['url', 'Link bản gốc (nếu đăng ở nơi khác, để trống = ẩn nút)', 'text'],
    ['canonical_source', 'Bản chính cho Google', 'check'] ] },
  bugs: { label: 'Bug mẫu', icon: 'bug', title: 'title', sub: 'product', fields: [
    ['title', 'Tiêu đề bug (ngắn, nói rõ lỗi gì)', 'text'],
    ['severity', 'Mức độ nghiêm trọng (Severity)', 'pick', SEVERITIES.map(k => [k, k[0].toUpperCase() + k.slice(1)])],
    ['priority', 'Độ ưu tiên (Priority)', 'pick', PRIORITIES.map(k => [k, k[0].toUpperCase() + k.slice(1)])],
    ['status', 'Trạng thái', 'pick', [['reported', 'Đã báo cáo'], ['fixed', 'Đã sửa'], ['wontfix', 'Không sửa']]],
    ['found_at', 'Ngày phát hiện', 'date'], ['product', 'Sản phẩm / trang bị lỗi', 'text'],
    ['product_url', 'Link tới nơi bị lỗi (để trống = ẩn nút)', 'text'], ['environment', 'Môi trường (VD: Windows 10 · Chrome 152 · 1280×720)', 'text'],
    ['steps', 'Các bước tái hiện (mỗi bước một dòng: 1. … 2. …)', 'textarea'], ['expected', 'Kết quả mong đợi', 'textarea'], ['actual', 'Kết quả thực tế', 'textarea'],
    ['image', 'Ảnh bằng chứng (tùy chọn)', 'shot'], ['content', 'Ghi chú thêm (ảnh hưởng, cách tạm né, nguyên nhân…)', 'markdown'],
    ['tags', 'Thẻ (cách nhau bằng dấu phẩy, VD: UI, Giỏ hàng)', 'tags'] ] },
  footer_links: { label: 'Menu footer', icon: 'list', title: 'label', sub: 'href', fields: [
    ['label', 'Tên hiển thị', 'text'], ['href', 'Đường dẫn (VD: #work hoặc https://...)', 'text'] ] },
  socials: { label: 'Mạng xã hội', icon: 'link', title: 'label', sub: 'url', fields: [
    ['label', 'Tên (GitHub, LinkedIn, Facebook, Zalo...)', 'text'], ['url', 'Link', 'text'] ] },
}

const SETTINGS_GROUPS = [
  ['Giới thiệu', 'Hiện ở cột đầu tiên của footer.', [
    ['footer_tagline', 'Giới thiệu ngắn', 'textarea'],
    ['availability', 'Trạng thái (VD: Đang nhận dự án freelance)', 'text'] ]],
  ['Liên hệ', 'Email cũng là nút ở mục Liên hệ trên trang chủ.', [
    ['email', 'Email', 'text'], ['phone', 'Số điện thoại', 'text'],
    ['address', 'Địa chỉ / khu vực', 'text'], ['working_hours', 'Giờ làm việc', 'text'] ]],
  ['Cuối trang', 'Dòng nhỏ ở đáy trang.', [
    ['copyright', 'Dòng bản quyền', 'text'], ['footer_note', 'Ghi chú cuối trang', 'text'] ]],
]

const NAV = [
  ['', [['dashboard', 'Tổng quan', 'grid'], ['messages', 'Tin nhắn', 'mail']]],
  ['NỘI DUNG', [...['posts', 'projects', 'bugs', 'skills', 'jobs'].map(k => [k, SCHEMA[k].label, SCHEMA[k].icon]), ['selftest', 'Trang Kiểm thử web', 'flask']]],
  ['GIAO DIỆN', [['brand', 'Thương hiệu', 'badge'], ['hero', 'Đầu trang', 'image'], ['layout', 'Bố cục trang chủ', 'eye'], ['cursor', 'Hiệu ứng chuột', 'cursor'], ['season', 'Hiệu ứng theo mùa', 'snow']]],
  ['THÔNG TIN & LIÊN HỆ', [['settings', 'Thông tin chung', 'sliders'], ...['footer_links', 'socials'].map(k => [k, SCHEMA[k].label, SCHEMA[k].icon])]],
  ['CÀI ĐẶT', [['notify', 'Thông báo', 'bell'], ['lang', 'Ngôn ngữ', 'globe'], ['autopost', 'Đăng bài tự động', 'link'], ['backup', 'Sao lưu', 'download'], ['version', 'Phiên bản', 'info']]],
]
const TITLES = { ...Object.fromEntries(NAV.flatMap(([, items]) => items.map(([k, l]) => [k, l]))), account: 'Tài khoản của tôi' }
// Mỗi mục Admin có đường dẫn riêng (VD /admin/blog) để tải lại trang hay bấm Back vẫn đúng mục
const ADMIN_SLUGS = {
  dashboard: '', account: 'tai-khoan', brand: 'thuong-hieu', notify: 'thong-bao', messages: 'tin-nhan', lang: 'ngon-ngu', hero: 'dau-trang', layout: 'bo-cuc', cursor: 'hieu-ung-chuot', season: 'hieu-ung-mua',
  projects: 'du-an', skills: 'ky-nang', jobs: 'kinh-nghiem', posts: 'blog', bugs: 'bug-mau', selftest: 'kiem-thu',
  footer_links: 'menu-footer', socials: 'mang-xa-hoi', settings: 'thong-tin-chung', autopost: 'dang-bai-tu-dong', version: 'phien-ban', backup: 'sao-luu',
}
const adminPath = k => (ADMIN_SLUGS[k] ? `/admin/${ADMIN_SLUGS[k]}` : '/admin')
const pageFromPath = p => {
  const slug = (String(p).split('?')[0].match(/^\/admin\/([^/]+)/) || [])[1]
  return Object.keys(ADMIN_SLUGS).find(k => ADMIN_SLUGS[k] === slug) || 'dashboard'
}

// Bản English trước khi lưu: bỏ ô trống, tags thành mảng gọn
const cleanEn = (en, fields) => {
  const out = {}
  fields.forEach(([k, , type]) => {
    let v = en?.[k]
    if (type === 'tags') v = (Array.isArray(v) ? v : String(v ?? '').split(',')).map(x => String(x).trim()).filter(Boolean)
    if (Array.isArray(v) ? v.length : String(v ?? '').trim()) out[k] = v
  })
  return out
}

/* ---------------- UI nhỏ ---------------- */
const ICONS = {
  download: 'M12 3v12 M7 10l5 5 5-5 M5 21h14',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 16v-5 M12 8h.01',
  grid: 'M3 3h7v9H3z M14 3h7v5h-7z M14 12h7v9h-7z M3 16h7v5H3z',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
  briefcase: 'M3 8h18v12H3z M8 8V5h8v3 M3 13h18',
  doc: 'M6 3h9l4 4v14H6z M14 3v5h5 M9 13h7 M9 17h5',
  list: 'M8 6h12 M8 12h12 M8 18h12 M4 6h.01 M4 12h.01 M4 18h.01',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  sliders: 'M4 6h9 M19 6h1 M4 12h3 M13 12h7 M4 18h11 M20 18h0 M18 6a2 2 0 1 1-4 0a2 2 0 1 1 4 0 M12 12a2 2 0 1 1-4 0a2 2 0 1 1 4 0 M20 18a2 2 0 1 1-4 0a2 2 0 1 1 4 0',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M15 12a3 3 0 1 1-6 0a3 3 0 1 1 6 0',
  eyeOff: 'M3 3l18 18 M10.6 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3 3.6 M6.6 6.6C3.8 8.5 2 12 2 12s4 7 10 7a9.6 9.6 0 0 0 5.4-1.6 M9.9 9.9a3 3 0 0 0 4.2 4.2',
  logout: 'M15 4h4v16h-4 M10 8l-4 4 4 4 M6 12h10',
  plus: 'M12 5v14 M5 12h14',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M21 21l-4.3-4.3',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  x: 'M6 6l12 12 M18 6 6 18',
  up: 'M12 19V5 M6 11l6-6 6 6',
  down: 'M12 5v14 M18 13l-6 6-6-6',
  edit: 'M4 20h4L19 9l-4-4L4 16z M14 6l4 4',
  trash: 'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13',
  external: 'M14 4h6v6 M20 4l-9 9 M18 14v6H4V6h6',
  collapse: 'M15 6l-6 6 6 6',
  check: 'M5 12l5 5L20 7',
  snow: 'M12 2v20 M3.3 7l17.4 10 M20.7 7L3.3 17 M9 3.5l3 2 3-2 M9 20.5l3-2 3 2',
  image: 'M4 5h16v14H4z M4 16l5-5 4 4 3-3 4 4 M15 9.5a1.5 1.5 0 1 1 0-.01',
  cursor: 'M5 3l14 7-6 2-2 6z M13 13l6 6',
  mail: 'M3 6h18v12H3z M3 7l9 6 9-6',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4z M10 20a2 2 0 0 0 4 0',
  badge: 'M12 3l2.6 2.2 3.4-.3.8 3.3 2.9 1.8-1.3 3.1 1.3 3.1-2.9 1.8-.8 3.3-3.4-.3L12 21l-2.6-2.2-3.4.3-.8-3.3-2.9-1.8 1.3-3.1-1.3-3.1 2.9-1.8.8-3.3 3.4.3z M9 12l2 2 4-4',
  bug: 'M8 9a4 4 0 0 1 8 0v5a4 4 0 0 1-8 0z M12 9v9 M8 12H4 M20 12h-4 M8 16l-3 2 M16 16l3 2 M8 8 5 6 M16 8l3-2 M10 5 9 3 M14 5l1-2',
  flask: 'M9 3h6 M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3 M7 15h10',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M3 12h18 M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9 M12 3C9.5 5.6 8.2 8.6 8.2 12s1.3 6.4 3.8 9',
}
const Icon = ({ name, className = 'size-[18px]' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`flex-none ${className}`} aria-hidden="true">
    <path d={ICONS[name]} />
  </svg>
)

const grad = 'bg-gradient-to-r from-pink to-purple'
const input = 'w-full rounded-lg border border-line bg-[#0b0d16] px-3 py-2.5 text-sm outline-none transition focus:border-purple focus:ring-2 focus:ring-purple/25'
const btn = 'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple disabled:opacity-50'
const ghost = `${btn} border border-line text-[#c9cbd8] hover:border-[#3a3f5a] hover:bg-white/5 hover:text-white`
const iconBtn = 'grid size-8 place-items-center rounded-md text-muted transition hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent'

const storage = {
  get(k) { try { return localStorage.getItem(k) } catch { return null } },
  set(k, v) { try { localStorage.setItem(k, v) } catch {} },
}

// Chèn phần tử JSX vào câu đã dịch: rich(a('Đang ẩn {n} phần'), { n: <b>3</b> })
const rich = (s, parts) => String(s).split(/\{(\w+)\}/).map((p, i) => (i % 2 ? <Fragment key={i}>{parts[p]}</Fragment> : p))

function Toggle({ on, onClick, label, small }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onClick}
      className={`relative flex-none rounded-full transition ${small ? 'h-5 w-9' : 'h-6 w-11'} ${on ? grad : 'bg-[#2a2e45]'}`}>
      <i className={`absolute top-0.5 rounded-full bg-white shadow transition-all ${small ? 'size-4' : 'size-5'} ${on ? (small ? 'left-[18px]' : 'left-[22px]') : 'left-0.5'}`} />
    </button>
  )
}

function StatusPill({ visible, onClick }) {
  const a = useA()
  return (
    <button onClick={onClick} title={a('Bấm để đổi')}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition ${visible
        ? 'bg-[#3ddc97]/12 text-[#5fe3a9] hover:bg-[#3ddc97]/20' : 'bg-white/8 text-muted hover:bg-white/12'}`}>
      <i className={`size-1.5 rounded-full ${visible ? 'bg-[#3ddc97]' : 'bg-muted'}`} />{visible ? a('Hiển thị') : a('Đang ẩn')}
    </button>
  )
}

function Field({ id, type, value, onChange, form, table, toast, opts }) {
  const a = useA()
  if (type === 'pick') return (
    <div id={id} role="radiogroup" className="flex flex-wrap gap-1.5">
      {opts.map(([k, l]) => (
        <button key={k} type="button" role="radio" aria-checked={(value || opts[0][0]) === k} onClick={() => onChange(k)}
          className={`rounded-full border px-3 py-1.5 text-xs transition ${(value || opts[0][0]) === k ? 'border-purple bg-purple/15 font-semibold text-white' : 'border-line text-muted hover:text-white'}`}>{a(l)}</button>
      ))}
    </div>)
  if (type === 'shot') return <ImageField id={id} wide value={value} onChange={onChange} toast={toast} />
  if (type === 'cover') {
    const kind = table === 'projects' ? 'project' : 'post'
    const fallback = coverOf({ ...form, image: '' }, kind)
    return <ImageField id={id} wide value={value} fallback={fallback} onChange={onChange} toast={toast}
      extra={<button type="button" onClick={() => onChange(autoCover({ seed: newSeed(), palette: kind === 'project' ? (form.grad || 'neon') : undefined, label: kind === 'project' ? (form.category || '').split('·')[0].trim() : 'BLOG' }))} className={`${ghost} px-3 py-1.5 text-xs`}>✨ {a('Tạo mẫu khác')}</button>} />
  }
  if (type === 'markdown') return <RichEditor id={id} value={value} onChange={onChange} />
  if (type === 'check') {
    const noUrl = !String(form?.url || '').trim()
    return (
      <div className={`flex items-start justify-between gap-4 rounded-lg border border-line px-4 py-3 ${noUrl ? 'opacity-50' : ''}`}>
        <div className="text-xs leading-relaxed text-muted">
          <p className="text-sm font-medium text-white">{a('Bản ở link gốc là bản chính')}</p>
          {noUrl ? a('Điền "Link bản gốc" ở trên trước.') : value ? a('Google ưu tiên hiện bài gốc; bài trên web của bạn không vào sitemap.') : a('Đang tắt: bài trên web của bạn là bản chính.')}
          <span className="block">{a('Chỉ bật khi bài này là bản đăng lại của bài đã đăng ở nơi khác.')}</span>
        </div>
        <Toggle on={!!value && !noUrl} label={a('Bản ở link gốc là bản chính')} onClick={() => !noUrl && onChange(!value)} />
      </div>
    )
  }
  if (type === 'date') return <input id={id} type="date" className={input} value={value ?? ''} onChange={e => onChange(e.target.value)} />
  if (type === 'textarea') return <textarea id={id} rows={4} className={input} value={value ?? ''} onChange={e => onChange(e.target.value)} />
  if (type === 'select') return (
    <div className="grid grid-cols-4 gap-2">
      {Object.entries(GRADS).map(([k, g]) => (
        <button type="button" key={k} onClick={() => onChange(k)} aria-label={k}
          className={`h-12 rounded-lg bg-gradient-to-br ${g} ring-offset-2 ring-offset-card transition ${(value ?? 'neon') === k ? 'ring-2 ring-white' : 'opacity-70 hover:opacity-100'}`} />
      ))}
    </div>)
  if (type === 'tags') return <input id={id} className={input} value={Array.isArray(value) ? value.join(', ') : value ?? ''} onChange={e => onChange(e.target.value)} />
  return <input id={id} className={input} value={value ?? ''} onChange={e => onChange(e.target.value)} />
}

/* ---------------- Đăng nhập ---------------- */
function Login({ brand }) {
  const a = useA()
  const [email, setEmail] = useState(demoMode ? demoAccount().email : ''); const [pw, setPw] = useState(demoMode ? demoAccount().password : '')
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const submit = async e => {
    e.preventDefault(); setBusy(true); setErr('')
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
    setBusy(false); if (error) setErr(error.message)
  }
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <form onSubmit={submit} className="w-full max-w-[400px] space-y-4 rounded-2xl border border-line bg-card p-7 shadow-[0_30px_80px_#00000080]">
        <div className="mb-2 flex items-center gap-3">
          <BrandIcon brand={brand} className="size-10 rounded-xl text-sm" />
          <div><h1 className="text-lg font-bold leading-tight">{a('Đăng nhập quản trị')}</h1><p className="text-xs text-muted"><BrandLogo brand={brand} imgClass="h-4" /> Portfolio</p></div>
        </div>
        <label htmlFor="login-email" className="block"><span className="mb-1.5 block text-xs font-medium text-muted">Email</span>
          <input id="login-email" className={input} type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
        <label htmlFor="login-pw" className="block"><span className="mb-1.5 block text-xs font-medium text-muted">{a('Mật khẩu')}</span>
          <input id="login-pw" className={input} type="password" value={pw} onChange={e => setPw(e.target.value)} required /></label>
        {demoMode && <p className="rounded-lg border border-purple/40 bg-purple/10 p-3 text-xs leading-relaxed text-[#c9cbd8]">{rich(a('Chế độ demo, tài khoản đã điền sẵn: {email} / {password}'), { email: <b>{demoAccount().email}</b>, password: <b>{demoAccount().password}</b> })}</p>}
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button disabled={busy} className={`${btn} ${grad} w-full py-2.5`}>{busy ? a('Đang đăng nhập…') : a('Đăng nhập')}</button>
        <a href={href('/')} className="block text-center text-xs text-muted hover:text-white">← {a('Về trang chủ')}</a>
      </form>
    </div>
  )
}

/* ---------------- Tổng quan ---------------- */
function Dashboard({ go, counts }) {
  const a = useA()
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Object.entries(SCHEMA).map(([k, cfg]) => {
          const c = counts[k]
          return (
            <button key={k} onClick={() => go(k)}
              className="group flex items-start gap-4 rounded-xl border border-line bg-card p-5 text-left transition hover:border-purple/60">
              <span className="grid size-11 flex-none place-items-center rounded-lg bg-purple/15 text-[#a99cff]"><Icon name={cfg.icon} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-muted">{a(cfg.label)}</span>
                <span className="block text-2xl font-bold tabular-nums">{c ? c.total : '–'}</span>
                <span className="mt-1 block text-xs text-muted">{c ? (c.hidden ? a('{n} mục đang ẩn', { n: c.hidden }) : a('Tất cả đang hiển thị')) : a('Đang tải…')}</span>
              </span>
              <span className="text-muted transition group-hover:translate-x-1 group-hover:text-white">→</span>
            </button>
          )
        })}
      </div>
      <div className="rounded-xl border border-line bg-card p-5">
        <h2 className="mb-3 font-semibold">{a('Thao tác nhanh')}</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => go('projects', true)} className={`${btn} ${grad}`}><Icon name="plus" className="size-4" />{a('Thêm dự án')}</button>
          <button onClick={() => go('posts', true)} className={ghost}><Icon name="plus" className="size-4" />{a('Viết bài blog')}</button>
          <button onClick={() => go('settings')} className={ghost}><Icon name="sliders" className="size-4" />{a('Sửa thông tin liên hệ')}</button>
          <button onClick={() => go('layout')} className={ghost}><Icon name="eye" className="size-4" />{a('Ẩn/hiện phần trên trang chủ')}</button>
          <button onClick={() => go('hero')} className={ghost}><Icon name="image" className="size-4" />{a('Sửa ảnh, chữ đầu trang')}</button>
          <button onClick={() => go('cursor')} className={ghost}><Icon name="cursor" className="size-4" />{a('Chọn hiệu ứng con trỏ')}</button>
        </div>
      </div>
      <StatsPanel go={go} />
    </div>
  )
}

/* ---------------- Danh sách + form trượt ---------------- */
// Blog: Đã đăng / Bản nháp (tự soạn, chưa đăng) / Chờ duyệt (Easy AI gửi, chưa đăng)
const POST_TABS = [['all', 'Tất cả'], ['published', 'Đã đăng'], ['draft', 'Bản nháp'], ['review', 'Chờ duyệt']]
const STATUS_UI = {
  published: ['Đã đăng', 'bg-[#3ddc97]/12 text-[#5fe3a9]', 'bg-[#3ddc97]'],
  draft: ['Bản nháp', 'bg-white/8 text-[#c9cbd8]', 'bg-[#9a9db3]'],
  review: ['Chờ duyệt', 'bg-[#f8d27c]/15 text-[#f8d27c]', 'bg-[#f8d27c]'],
}
// Đủ 3 trạng thái trên một hàng: trạng thái đang dùng tô màu, còn lại mờ; bấm để chuyển ngay
const MSG_TO = { published: 'Đã đăng bài', draft: 'Đã chuyển về bản nháp', review: 'Đã chuyển sang chờ duyệt' }
function StatusSwitch({ r, onPick }) {
  const a = useA()
  const cur = postStatus(r)
  return (
    <span role="radiogroup" aria-label={a('Trạng thái bài')} className="inline-flex flex-wrap gap-1">
      {STATUS_ORDER.map(k => {
        const on = k === cur
        return (
          <button key={k} type="button" role="radio" aria-checked={on} disabled={on} onClick={() => onPick(r, k)} title={on ? a('Trạng thái hiện tại') : a('Chuyển sang {status}', { status: a(STATUS_UI[k][0]) })}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium transition ${STATUS_UI[k][1]} ${on ? 'cursor-default ring-1 ring-current/30' : 'opacity-35 grayscale hover:opacity-80 hover:grayscale-0'}`}>
            <i className={`size-1.5 rounded-full ${STATUS_UI[k][2]}`} />{a(STATUS_UI[k][0])}
          </button>
        )
      })}
    </span>
  )
}
const StatusTag = ({ st }) => <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_UI[st][1]}`}><i className={`size-1.5 rounded-full ${STATUS_UI[st][2]}`} />{at(STATUS_UI[st][0])}</span>

function Manager({ table, toast, openNew, onChanged, live }) {
  const a = useA()
  const cfg = SCHEMA[table]
  const [rows, setRows] = useState(null); const [q, setQ] = useState('')
  const [form, setForm] = useState(null); const [busy, setBusy] = useState(false)
  const [pendingDel, setPendingDel] = useState(null); const [err, setErr] = useState('')
  const isPosts = table === 'posts'
  const [tab, setTab] = useState('all'); const [view, setView] = useState(null)
  const trFields = TR_FIELDS[table]; const [formLang, setFormLang] = useState('vi')
  useEffect(() => setFormLang('vi'), [form?.id, form === null])

  const reload = () => loadTable(table).then(r => { setRows(r); onChanged() })
    .catch(e => setErr(table === 'bugs' && /bugs|schema cache|42P01|PGRST/i.test(e.message) ? a('Chưa có bảng Bug mẫu: chạy file supabase/migration-qa.sql trong Supabase → SQL Editor.') : e.message))
  useEffect(() => { setRows(null); setForm(null); setQ(''); setErr(''); reload() }, [table])
  // Realtime: bảng Blog tự cập nhật khi có thay đổi (không đếm lại các bảng khác)
  useEffect(() => { if (live && table === 'posts') loadTable(table).then(setRows).catch(() => {}) }, [live])
  useEffect(() => { if (openNew && rows) newItem() }, [openNew, rows === null])

  // Bài blog mới mặc định là bản nháp và lên đầu danh sách
  const newItem = () => setForm(isPosts
    ? { visible: false, sort: (rows?.length ? Math.min(...rows.map(r => r.sort || 0)) : 0) - 1, published_at: new Date().toISOString().slice(0, 10) }
    : { visible: true, grad: 'neon', sort: (rows?.length ? Math.max(...rows.map(r => r.sort || 0)) : 0) + 1,
      ...(table === 'bugs' ? { severity: 'major', priority: 'medium', status: 'reported', found_at: new Date().toISOString().slice(0, 10) } : {}) })
  const filtered = useMemo(() => (isPosts ? sortPosts(rows || []) : rows || []).filter(r =>
    (!isPosts || tab === 'all' || postStatus(r) === tab) &&
    (!q || [r[cfg.title], r[cfg.sub], r.description].join(' ').toLowerCase().includes(q.toLowerCase()))), [rows, q, tab])
  const statusCount = k => (rows || []).filter(r => k === 'all' || postStatus(r) === k).length

  const run = async (query, okMsg) => {
    const { error } = await query
    if (error) { toast(error.message, 'error'); return false }
    if (okMsg) toast(okMsg); reload(); return true
  }
  const save = async (e, publish) => {
    e?.preventDefault?.(); setBusy(true)
    const visible = isPosts && publish !== undefined ? publish : form.visible !== false
    const payload = { sort: Number(form.sort) || 0, visible, ...(isPosts ? { review: false } : {}) }
    cfg.fields.forEach(([k, , type, opts]) => {
      let v = form[k]
      if (type === 'pick') v = opts.some(o => o[0] === v) ? v : opts[0][0]
      if (type === 'tags') v = (Array.isArray(v) ? v : String(v ?? '').split(',')).map(s => s.trim()).filter(Boolean)
      if (type === 'date') v = v || null
      if (type === 'check') v = !!v && !!String(form.url || '').trim()
      payload[k] = v === null ? null : v ?? ''
    })
    if (trFields) payload.en = cleanEn(form.en, trFields)
    const msg = isPosts ? (visible ? (form.visible === false || !form.id ? a('Đã đăng bài') : a('Đã cập nhật bài')) : a('Đã lưu bản nháp')) : form.id ? a('Đã lưu thay đổi') : a('Đã thêm mới')
    const ok = await run(form.id ? supabase.from(table).update(payload).eq('id', form.id) : supabase.from(table).insert(payload), msg)
    setBusy(false); if (ok) setForm(null)
  }
  // Bài đang ẩn được đăng → ngày đăng hôm nay, lên đầu trang Blog
  const minSort = () => Math.min(0, ...(rows || []).map(x => Number(x.sort) || 0))
  const setStatus = (r, k) => run(supabase.from(table).update(k === 'published' && postStatus(r) !== 'published' ? publishPatch(minSort()) : STATUS_PATCH[k]).eq('id', r.id), a(MSG_TO[k]))
  const publishPost = r => setStatus(r, 'published')
  const toggleVisible = r => run(supabase.from(table).update({ visible: r.visible === false }).eq('id', r.id),
    r.visible === false ? a('Đã hiện trên trang') : a('Đã ẩn khỏi trang'))
  const del = async r => {
    if (pendingDel !== r.id) return setPendingDel(r.id)
    setPendingDel(null); run(supabase.from(table).delete().eq('id', r.id), a('Đã xóa'))
  }
  const move = async (i, dir) => {
    const x = filtered[i], b = filtered[i + dir]; if (!x || !b) return
    const [sa, sb] = [x.sort ?? i, b.sort ?? i + dir]
    await supabase.from(table).update({ sort: sb === sa ? sa + dir : sb }).eq('id', x.id)
    await supabase.from(table).update({ sort: sa }).eq('id', b.id)
    reload()
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="relative min-w-0 flex-1 sm:max-w-xs">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"><Icon name="search" className="size-4" /></span>
          <input id={`search-${table}`} className={`${input} pl-9`} placeholder={a('Tìm trong {name}…', { name: a(cfg.label).toLowerCase() })} value={q} onChange={e => setQ(e.target.value)} />
        </label>
        <button onClick={newItem} className={`${btn} ${grad} ml-auto`}><Icon name="plus" className="size-4" />{isPosts ? a('Viết bài mới') : a('Thêm mới')}</button>
      </div>
      {isPosts && (
        <div className="mb-4 flex flex-wrap gap-2" role="tablist">
          {POST_TABS.map(([k, l]) => {
            const n = statusCount(k)
            return (
              <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition ${tab === k ? 'border-purple bg-purple/15 text-white' : 'border-line text-muted hover:text-white'}`}>
                {a(l)}<span className={`rounded-full px-1.5 text-[11px] tabular-nums ${k === 'review' && n ? 'bg-[#f8d27c] font-bold text-[#161525]' : 'bg-white/10'}`}>{n}</span>
              </button>
            )
          })}
        </div>
      )}
      {err && <p className="mb-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{err}</p>}

      <div className="overflow-hidden rounded-xl border border-line bg-card">
        <div className={`hidden gap-4 border-b ${isPosts ? 'grid-cols-[64px_minmax(0,1fr)_280px_130px]' : 'grid-cols-[64px_minmax(0,1fr)_200px_170px]'} border-line px-4 py-3 text-[11px] font-semibold tracking-wider text-muted md:grid`}>
          <span>{isPosts ? a('NGÀY ĐĂNG') : a('THỨ TỰ')}</span><span>{a('NỘI DUNG')}</span><span>{a('TRẠNG THÁI')}</span><span className="text-right">{a('THAO TÁC')}</span>
        </div>
        {rows === null && <p className="p-8 text-center text-sm text-muted">{a('Đang tải…')}</p>}
        {rows && !filtered.length && (
          <div className="p-10 text-center">
            <p className="text-sm text-muted">{q ? a('Không tìm thấy mục nào khớp.') : a('Chưa có dữ liệu.')}</p>
            {!q && <button onClick={newItem} className={`${ghost} mt-3`}><Icon name="plus" className="size-4" />{a('Thêm mục đầu tiên')}</button>}
          </div>
        )}
        <ul>
          {filtered.map((r, i) => (
            <li key={r.id} className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-b border-line px-4 py-3 last:border-0 ${isPosts ? 'md:grid-cols-[64px_minmax(0,1fr)_280px_130px]' : 'md:grid-cols-[64px_minmax(0,1fr)_200px_170px]'} ${r.visible === false ? 'bg-white/[0.015]' : ''}`}>
              {isPosts
                ? <div className="hidden text-xs tabular-nums text-muted md:block" title={a('Blog tự sắp xếp theo ngày đăng')}>{r.published_at ? fmtDay(r.published_at) : '—'}</div>
                : <div className="hidden items-center gap-0.5 md:flex">
                    <button className={iconBtn} disabled={i === 0 || !!q} onClick={() => move(i, -1)} aria-label={a('Lên')}><Icon name="up" className="size-4" /></button>
                    <button className={iconBtn} disabled={i === filtered.length - 1 || !!q} onClick={() => move(i, 1)} aria-label={a('Xuống')}><Icon name="down" className="size-4" /></button>
                  </div>}
              <button onClick={() => setForm(r)} className={`min-w-0 text-left ${r.visible === false ? 'opacity-60' : ''}`}>
                <span className="flex items-center gap-2.5">
                  {(table === 'projects' || table === 'posts') && <img src={coverOf(r, table === 'projects' ? 'project' : 'post')} alt="" className="h-8 w-[61px] flex-none rounded-md object-cover" />}
                  {table === 'skills' && r.icon && <i className="grid size-8 flex-none place-items-center rounded-md bg-white/5 not-italic">{r.icon}</i>}
                  {table === 'bugs' && <i className="flex-none rounded-md bg-pink/15 px-1.5 py-1 font-mono text-[11px] font-semibold not-italic text-pink">{bugCode(r)}</i>}
                  <span className="min-w-0">
                    <span className="flex min-w-0 items-center gap-2"><span className="truncate font-medium hover:text-pink">{r[cfg.title]}</span>{r.source === 'easyai' && <span className="flex-none rounded bg-purple/20 px-1.5 py-0.5 text-[10px] font-semibold text-[#b5aaff]">{a('TỰ ĐỘNG')}</span>}
                      {trFields && missingOf(trFields, r, r.en || {}) > 0 && <span title={a('Chưa có đủ bản English')} className="flex-none rounded border border-[#f8d27c]/40 px-1.5 py-0.5 text-[10px] font-semibold text-[#f8d27c]">{a('EN chưa dịch')}</span>}</span>
                    <span className="block truncate text-xs text-muted">{r[cfg.sub] || '—'}</span>
                  </span>
                </span>
              </button>
              <div className="col-span-2 col-start-1 row-start-2 md:col-span-1 md:col-start-auto md:row-start-auto">{isPosts
                ? <StatusSwitch r={r} onPick={setStatus} />
                : <StatusPill visible={r.visible !== false} onClick={() => toggleVisible(r)} />}</div>
              <div className="col-start-2 row-start-1 flex items-center justify-end gap-1 md:col-start-auto md:row-start-auto">
                {pendingDel === r.id ? (
                  <>
                    <button onClick={() => setPendingDel(null)} className={`${ghost} px-2.5 py-1.5 text-xs`}>{a('Hủy')}</button>
                    <button onClick={() => del(r)} className={`${btn} bg-red-500 px-2.5 py-1.5 text-xs text-white hover:bg-red-600`}>{a('Xóa thật')}</button>
                  </>
                ) : (
                  <>
                    {(isPosts || table === 'bugs') && r.visible === false
                      ? <button onClick={() => setView(r)} className={iconBtn} aria-label={a('Xem trước')} title={a('Xem trước')}><Icon name="eye" className="size-4" /></button>
                      : (table === 'posts' || table === 'projects' || table === 'bugs') && <a href={href(table === 'posts' ? postPath(r) : table === 'bugs' ? bugPath(r) : projectPath(r))} className={iconBtn} aria-label={a('Xem trang chi tiết')} title={a('Xem trang chi tiết')}><Icon name="external" className="size-4" /></a>}
                    <button onClick={() => setForm(r)} className={iconBtn} aria-label={a('Sửa')}><Icon name="edit" className="size-4" /></button>
                    <button onClick={() => del(r)} className={`${iconBtn} hover:!bg-red-500/15 hover:!text-red-300`} aria-label={a('Xóa')}><Icon name="trash" className="size-4" /></button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
      {rows && (isPosts
        ? <p className="mt-3 text-xs text-muted">{a('{published} đã đăng · {draft} bản nháp · {review} chờ duyệt. Bản nháp và bài chờ duyệt chỉ bạn thấy trong Admin.', { published: statusCount('published'), draft: statusCount('draft'), review: statusCount('review') })}</p>
        : <p className="mt-3 text-xs text-muted">{a('{n} mục · {hidden} đang ẩn. Bấm vào trạng thái để ẩn/hiện nhanh.', { n: rows.length, hidden: rows.filter(r => r.visible === false).length })}</p>)}
      {view && table === 'bugs' && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={() => setView(null)}>
          <div className="max-h-[90vh] w-full max-w-[860px] overflow-y-auto rounded-2xl border border-line bg-[#07080f] p-6 sm:p-8" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between gap-3"><span className="text-xs text-muted">{a('Xem trước · đang ẩn')}</span><button onClick={() => setView(null)} className={`${ghost} px-3 py-1.5 text-xs`}>{a('Đóng')}</button></div>
            <h1 className="mb-4 text-[clamp(22px,3.6vw,32px)] font-bold leading-tight">{view.title}</h1>
            <BugBadges b={view} />
            <div className="mt-6"><BugReport b={view} /></div>
            <div className="mt-8 flex justify-end gap-2">
              <button onClick={() => { setForm(view); setView(null) }} className={ghost}>{a('Sửa')}</button>
              <button onClick={() => { toggleVisible(view); setView(null) }} className={`${btn} ${grad}`}>{a('Hiện trên trang')}</button>
            </div>
          </div>
        </div>
      )}
      {view && table !== 'bugs' && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={() => setView(null)}>
          <div className="max-h-[90vh] w-full max-w-[760px] overflow-y-auto rounded-2xl border border-line bg-[#07080f] p-6 sm:p-8" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between gap-3"><StatusTag st={postStatus(view)} /><button onClick={() => setView(null)} className={`${ghost} px-3 py-1.5 text-xs`}>{a('Đóng')}</button></div>
            <h1 className="text-[clamp(24px,4vw,36px)] font-bold leading-tight">{view.title}</h1>
            <img src={coverOf(view, 'post')} alt="" className="mt-5 aspect-[1200/630] w-full rounded-xl border border-line object-cover" />
            {view.excerpt && <p className="mt-5 border-b border-line pb-5 text-[#dfe0ea]">{view.excerpt}</p>}
            <div className="mt-5"><Markdown text={view.content} /></div>
            <div className="mt-8 flex justify-end gap-2">
              <button onClick={() => { setForm(view); setView(null) }} className={ghost}>{a('Sửa')}</button>
              <button onClick={() => { publishPost(view); setView(null) }} className={`${btn} ${grad}`}>{postStatus(view) === 'review' ? a('Duyệt & đăng') : a('Đăng bài')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Form trượt từ phải */}
      <div className={`fixed inset-0 z-50 ${form ? '' : 'pointer-events-none'}`} aria-hidden={!form}>
        <div onClick={() => setForm(null)} className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity ${form ? 'opacity-100' : 'opacity-0'}`} />
        <form onSubmit={save}
          className={`absolute inset-y-0 right-0 flex w-full max-w-[640px] flex-col border-l border-line bg-[#0d0f1a] shadow-2xl transition-transform duration-300 ${form ? 'translate-x-0' : 'translate-x-full'}`}>
          {form && <>
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div><p className="text-xs text-muted">{a(cfg.label)}</p><h3 className="font-semibold">{form.id ? a('Chỉnh sửa') : a('Thêm mới')}</h3></div>
              <button type="button" onClick={() => setForm(null)} className={iconBtn} aria-label={a('Đóng')}><Icon name="x" /></button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              {trFields && <LangTabs value={formLang} onChange={setFormLang} missing={missingOf(trFields, form, form.en || {})} />}
              {formLang === 'en' && trFields ? <EnEditor key={form.id ?? 'new'} idPrefix={`en-${table}`} fields={trFields} base={form} en={form.en || {}} toast={toast} onChange={en => setForm(f => ({ ...f, en }))} /> : <>
              {cfg.fields.map(([k, lab, type, opts]) => (
                <div key={`${form.id ?? 'new'}-${k}`}>
                  <label htmlFor={`f-${table}-${k}`} className="mb-1.5 block text-xs font-medium text-muted">{a(lab)}</label>
                  <Field id={`f-${table}-${k}`} type={type} opts={opts} value={form[k]} form={form} table={table} toast={toast} onChange={v => setForm(f => ({ ...f, [k]: v }))} />
                </div>
              ))}
              {!isPosts && <div className="flex items-center justify-between rounded-lg border border-line px-4 py-3">
                <div><p className="text-sm font-medium">{a('Hiển thị trên trang')}</p><p className="text-xs text-muted">{a('Tắt để ẩn mà vẫn giữ nội dung')}</p></div>
                <Toggle on={form.visible !== false} label={a('Hiển thị trên trang')} onClick={() => setForm({ ...form, visible: form.visible === false })} />
              </div>}
              </>}
            </div>
            {isPosts ? (() => {
              const st = form.id ? postStatus(form) : 'draft'
              return (
                <div className="space-y-2 border-t border-line px-5 py-4">
                  <p className="text-xs text-muted">{a('Trạng thái:')} <StatusTag st={st} /></p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={busy} onClick={() => save(null, false)} className={`${ghost} flex-1 py-2.5`}>{st === 'published' ? a('Chuyển về bản nháp') : a('Lưu nháp')}</button>
                    <button type="button" disabled={busy} onClick={() => save(null, true)} className={`${btn} ${grad} flex-1 py-2.5`}>{busy ? a('Đang lưu…') : st === 'published' ? a('Cập nhật bài') : st === 'review' ? a('Duyệt & đăng') : a('Đăng bài')}</button>
                  </div>
                </div>
              )
            })() : (
            <div className="flex gap-3 border-t border-line px-5 py-4">
              <button type="submit" disabled={busy} className={`${btn} ${grad} flex-1 py-2.5`}>{busy ? a('Đang lưu…') : a('Lưu')}</button>
              <button type="button" onClick={() => setForm(null)} className={`${ghost} py-2.5`}>{a('Hủy')}</button>
            </div>)}
          </>}
        </form>
      </div>
    </div>
  )
}

/* ---------------- Thông tin chung ---------------- */
function SettingsForm({ toast }) {
  const a = useA()
  const [form, setForm] = useState(null); const [dirty, setDirty] = useState(false); const [busy, setBusy] = useState(false)
  const [formLang, setFormLang] = useState('vi')
  useEffect(() => {
    loadSettings().then(r => setForm({ ...DEMO_SETTINGS, ...(r || {}), hidden: r?.hidden || [] }))
      .catch(e => { toast(e.message, 'error'); setForm({ ...DEMO_SETTINGS }) })
  }, [])
  const set = patch => { setDirty(true); setForm({ ...form, ...patch }) }
  const save = async e => {
    e.preventDefault(); setBusy(true)
    const hero = form.hero && { ...form.hero, en: { ...(form.hero.en || {}), post_cta: cleanEn(form.hero.en?.post_cta, CTA_TR.map(([p, l, t]) => [p.split('.')[1], l, t])) } }
    const { error } = await supabase.from('settings').upsert({ ...form, id: 1, en: cleanEn(form.en, SETTINGS_TR), ...(hero ? { hero } : {}) })
    setBusy(false); if (error) return toast(error.message, 'error')
    setDirty(false); toast(a('Đã lưu thông tin chung'))
  }
  if (!form) return <p className="text-muted">{a('Đang tải…')}</p>
  return (
    <form onSubmit={save} className="space-y-5 pb-24">
      {(() => { const hh = mergeHero(form.hero); return <LangTabs value={formLang} onChange={setFormLang} missing={missingOf(SETTINGS_TR, form, form.en || {}) + missingOf(CTA_TR, hh, hh.en)} /> })()}
      {formLang === 'en' ? (() => {
        const hh = mergeHero(form.hero)
        return <>
          <section className="rounded-xl border border-line bg-card">
            <header className="border-b border-line px-5 py-4"><h2 className="font-semibold">{a('Giới thiệu, liên hệ, cuối trang · English')}</h2><p className="text-xs text-muted">{a('Email, số điện thoại, link giữ nguyên nên không cần dịch.')}</p></header>
            <div className="p-5"><EnEditor idPrefix="en-s" fields={SETTINGS_TR} base={form} en={form.en || {}} toast={toast} onChange={en => set({ en })} /></div>
          </section>
          <section className="rounded-xl border border-line bg-card">
            <header className="border-b border-line px-5 py-4"><h2 className="font-semibold">{a('Khối kêu gọi cuối bài viết · English')}</h2></header>
            <div className="p-5"><EnEditor idPrefix="en-cta" fields={CTA_TR} base={hh} en={hh.en} toast={toast} onChange={en => set({ hero: { ...(form.hero || {}), en } })} /></div>
          </section>
        </>
      })() : <>
      {SETTINGS_GROUPS.map(([title, hint, fields]) => (
        <section key={title} className="rounded-xl border border-line bg-card">
          <header className="border-b border-line px-5 py-4"><h2 className="font-semibold">{a(title)}</h2><p className="text-xs text-muted">{a(hint)}</p></header>
          <div className="space-y-5 p-5">
            {fields.map(([k, lab, type]) => {
              const hidden = (form.hidden || []).includes(k)
              const toggle = () => { const h = new Set(form.hidden || []); hidden ? h.delete(k) : h.add(k); set({ hidden: [...h] }) }
              return (
                <div key={k}>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <label htmlFor={`s-${k}`} className={`text-xs font-medium ${hidden ? 'text-muted/60' : 'text-muted'}`}>{a(lab)}</label>
                    <span className="flex items-center gap-2 text-xs text-muted">{hidden ? a('Đang ẩn') : a('Hiển thị')}<Toggle small on={!hidden} label={a('Hiển thị {name}', { name: a(lab) })} onClick={toggle} /></span>
                  </div>
                  <div className={hidden ? 'opacity-50' : ''}><Field id={`s-${k}`} type={type} value={form[k]} onChange={v => set({ [k]: v })} /></div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
      {(() => {
        const c = mergeHero(form.hero).post_cta
        const setC = patch => set({ hero: { ...(form.hero || {}), post_cta: { ...c, ...patch } } })
        const row = (k, lab, area) => (
          <div key={k}>
            <label htmlFor={`cta-${k}`} className="mb-1.5 block text-xs font-medium text-muted">{lab}</label>
            {area ? <textarea id={`cta-${k}`} rows={2} className={input} value={c[k] || ''} onChange={e => setC({ [k]: e.target.value })} />
                  : <input id={`cta-${k}`} className={input} value={c[k] || ''} onChange={e => setC({ [k]: e.target.value })} />}
          </div>
        )
        return (
          <section className="rounded-xl border border-line bg-card">
            <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div><h2 className="font-semibold">{a('Khối kêu gọi cuối bài viết')}</h2><p className="text-xs text-muted">{a('Hiện ở cuối mỗi bài Blog, dẫn người đọc liên hệ với bạn.')}</p></div>
              <Toggle small on={c.show !== false} label={a('Hiện khối kêu gọi')} onClick={() => setC({ show: c.show === false })} />
            </header>
            <div className={`space-y-4 p-5 ${c.show === false ? 'opacity-50' : ''}`}>
              {row('title', a('Tiêu đề'))}{row('text', a('Mô tả ngắn'), true)}
              <div className="grid gap-4 sm:grid-cols-2">{row('button', a('Chữ trên nút'))}{row('link', a('Nút dẫn tới (VD /#contact, mailto:ban@email.com, https://zalo.me/...)'))}</div>
              <button type="button" onClick={() => setC({ ...DEFAULT_HERO.post_cta })} className="text-xs text-muted hover:text-white">{a('Về mặc định')}</button>
            </div>
          </section>
        )
      })()}
      </>}
      <div className={`sticky bottom-4 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-[0_10px_40px_#00000080] backdrop-blur transition ${dirty ? 'border-purple/50 bg-[#141728]/95' : 'border-line bg-card/90'}`}>
        <span className="text-sm text-muted">{dirty ? a('Có thay đổi chưa lưu') : a('Mọi thay đổi đã được lưu')}</span>
        <button disabled={busy || !dirty} className={`${btn} ${grad}`}>{busy ? a('Đang lưu…') : a('Lưu thay đổi')}</button>
      </div>
    </form>
  )
}

/* ---------------- Bố cục trang chủ (ẩn/hiện từng phần) ---------------- */
function LayoutForm({ toast }) {
  const a = useA()
  const [row, setRow] = useState(null); const [hidden, setHidden] = useState(new Set())
  const [dirty, setDirty] = useState(false); const [busy, setBusy] = useState(false)
  useEffect(() => {
    loadSettings().then(r => { const full = { ...DEMO_SETTINGS, ...(r || {}) }; setRow(full); setHidden(new Set(full.hidden || [])) })
      .catch(e => { toast(e.message, 'error'); setRow({ ...DEMO_SETTINGS }); setHidden(new Set(DEMO_SETTINGS.hidden)) })
  }, [])
  const flip = k => { const h = new Set(hidden); h.has(k) ? h.delete(k) : h.add(k); setHidden(h); setDirty(true) }
  const setGroup = (keys, show) => { const h = new Set(hidden); keys.forEach(k => show ? h.delete(k) : h.add(k)); setHidden(h); setDirty(true) }
  const save = async () => {
    setBusy(true)
    const { error } = await supabase.from('settings').upsert({ ...row, id: 1, hidden: [...hidden] })
    setBusy(false); if (error) return toast(error.message, 'error')
    setDirty(false); toast(a('Đã lưu bố cục trang chủ'))
  }
  if (!row) return <p className="text-muted">{a('Đang tải…')}</p>
  const secKeys = SECTIONS.flatMap(([, , items]) => items.map(([k]) => k))
  const offCount = secKeys.filter(k => hidden.has(k)).length
  return (
    <div className="space-y-5 pb-24">
      <p className="text-sm text-muted">{a('Bật/tắt từng phần trên trang chủ. Phần bị tắt vẫn giữ nguyên nội dung, bật lại là hiện ngay.')} {rich(a('Đang ẩn {n}/{total} phần.'), { n: <b className="text-white">{offCount}</b>, total: secKeys.length })}</p>
      {SECTIONS.map(([title, hint, items]) => {
        const keys = items.map(([k]) => k)
        return (
          <section key={title} className="rounded-xl border border-line bg-card">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div><h2 className="font-semibold">{a(title)}</h2><p className="text-xs text-muted">{a(hint)}</p></div>
              <div className="flex gap-2">
                <button onClick={() => setGroup(keys, true)} className={`${ghost} px-2.5 py-1.5 text-xs`}>{a('Hiện tất cả')}</button>
                <button onClick={() => setGroup(keys, false)} className={`${ghost} px-2.5 py-1.5 text-xs`}>{a('Ẩn tất cả')}</button>
              </div>
            </header>
            <ul>
              {items.map(([k, lab]) => {
                const on = !hidden.has(k)
                const parentOff = k.startsWith('sec_footer_') && hidden.has('sec_footer')
                return (
                  <li key={k} className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5 last:border-0">
                    <span className={`flex min-w-0 items-center gap-3 text-sm ${on && !parentOff ? '' : 'text-muted'}`}>
                      <span className={on && !parentOff ? 'text-[#b5aaff]' : 'text-[#5d6180]'}><Icon name={on ? 'eye' : 'eyeOff'} className="size-4" /></span>
                      <span className="min-w-0">{a(lab)}{parentOff && <span className="block text-xs text-muted">{a('Đang ẩn theo “Toàn bộ footer”')}</span>}</span>
                    </span>
                    <Toggle on={on} label={a(lab)} onClick={() => flip(k)} />
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
      <div className={`sticky bottom-4 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-[0_10px_40px_#00000080] backdrop-blur transition ${dirty ? 'border-purple/50 bg-[#141728]/95' : 'border-line bg-card/90'}`}>
        <span className="text-sm text-muted">{dirty ? a('Có thay đổi chưa lưu') : a('Mọi thay đổi đã được lưu')}</span>
        <button onClick={save} disabled={busy || !dirty} className={`${btn} ${grad}`}>{busy ? a('Đang lưu…') : a('Lưu bố cục')}</button>
      </div>
    </div>
  )
}

/* ---------------- Hiệu ứng chuột ---------------- */
// Để ngoài CursorPage: nếu khai báo bên trong, mỗi lần chọn React dựng lại cả khối → mất focus, trang có thể nhảy lên đầu
const CursorGroup = ({ title, hint, list, k, pick, saved, setPick }) => (
  <section className="space-y-3">
    <div><h2 className="text-lg font-semibold">{title}</h2><p className="text-sm text-muted">{hint}</p></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {list.map(([key, nm, desc]) => {
        const on = pick[k] === key
        return (
          <button type="button" key={key} onClick={() => setPick(p => ({ ...p, [k]: key }))} aria-pressed={on}
            className={`group relative flex min-h-[124px] flex-col items-start gap-1.5 rounded-xl border p-5 text-left transition ${on ? 'border-purple bg-purple/10 shadow-[0_0_0_3px_#6650ff33]' : 'border-line bg-card hover:border-[#3a3f5a]'}`}>
            <span className="flex w-full items-center justify-between gap-2">
              <span className="font-semibold">{at(nm)}</span>
              {saved[k] === key && <span className="rounded-full bg-[#3ddc97]/15 px-2 py-0.5 text-[10px] font-semibold text-[#5fe3a9]">{at('ĐANG DÙNG')}</span>}
            </span>
            <span className="text-[13px] leading-relaxed text-muted">{at(desc)}</span>
            {on && <span className="mt-auto pt-2 text-xs font-medium text-[#b5aaff]">{at('Đang xem thử trên trang này')}</span>}
          </button>
        )
      })}
    </div>
  </section>
)

function CursorPage({ toast }) {
  const a = useA()
  const [row, setRow] = useState(null)
  const [pick, setPick] = useState({ pointer: 'none', trail: 'none' })
  const [saved, setSaved] = useState({ pointer: 'none', trail: 'none' }); const [busy, setBusy] = useState(false)
  useEffect(() => {
    loadSettings().then(r => { const full = { ...DEMO_SETTINGS, ...(r || {}) }; setRow(full); const c = parseCursor(full.cursor_effect); setPick(c); setSaved(c) })
      .catch(e => { toast(e.message, 'error'); setRow({ ...DEMO_SETTINGS }) })
  }, [])
  const dirty = pick.pointer !== saved.pointer || pick.trail !== saved.trail
  const save = async () => {
    setBusy(true)
    const { error } = await supabase.from('settings').upsert({ ...row, id: 1, cursor_effect: joinCursor(pick) })
    setBusy(false); if (error) return toast(error.message, 'error')
    setSaved(pick); toast(a('Đã áp dụng cho trang chủ'))
  }
  if (!row) return <p className="text-muted">{a('Đang tải…')}</p>
  const name = (list, k) => list.find(c => c[0] === k)?.[1]
  return (
    <div className="space-y-8 pb-24">
      <p className="text-sm text-muted">{rich(a('Chọn {pointer} và {trail}, hai thứ chạy cùng lúc. Bấm để xem thử rồi {move}; ưng thì bấm “Áp dụng cho trang chủ”. Trên điện thoại và máy bật giảm chuyển động, hiệu ứng tự tắt.'), { pointer: <b className="text-white">{a('một kiểu con trỏ')}</b>, trail: <b className="text-white">{a('một hiệu ứng di chuột')}</b>, move: <b className="text-white">{a('di chuột khắp trang này')}</b> })}</p>
      <CursorGroup pick={pick} saved={saved} setPick={setPick} k="pointer" list={POINTERS} title={a('Hiệu ứng con trỏ')} hint={a('Thay đổi chính con trỏ chuột và cách nó phản ứng khi trỏ vào nút, link, thẻ.')} />
      <CursorGroup pick={pick} saved={saved} setPick={setPick} k="trail" list={TRAILS} title={a('Hiệu ứng di chuột')} hint={a('Vệt sáng hoặc nền phản ứng theo đường di chuột; con trỏ giữ nguyên.')} />
      <div className="rounded-xl border border-dashed border-line p-6">
        <p className="mb-4 text-xs font-semibold tracking-wider text-muted">{a('KHU THỬ: DI CHUỘT QUA CÁC NÚT VÀ THẺ')}</p>
        <div className="flex flex-wrap gap-3">
          <button className={`${btn} ${grad}`}>{a('Xem dự án')}</button>
          <button className={ghost}>{a('Liên hệ')}</button>
          <a href="#admin" onClick={e => e.preventDefault()} className="self-center text-sm text-pink underline underline-offset-4">{a('Một đường link')}</a>
        </div>
        <div data-cursor-label={a('XEM')} className="mt-4 rounded-xl border border-line bg-card p-4 text-sm text-muted">{a('Thẻ dự án mẫu: trỏ vào đây để thử “Con trỏ có chữ”. Bấm chuột ở bất kỳ đâu để thử “Mực loang” và “Tia lửa khi bấm”.')}</div>
      </div>
      <div className={`sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-[0_10px_40px_#00000080] backdrop-blur transition ${dirty ? 'border-purple/50 bg-[#141728]/95' : 'border-line bg-card/90'}`}>
        <span className="text-sm text-muted">{rich(a('Con trỏ: {pointer} · Di chuột: {trail}'), { pointer: <b className="text-white">{a(name(POINTERS, pick.pointer))}</b>, trail: <b className="text-white">{a(name(TRAILS, pick.trail))}</b> })}{dirty ? ' ' + a('(đang xem thử, chưa áp dụng)') : ''}</span>
        <button onClick={save} disabled={busy || !dirty} className={`${btn} ${grad}`}>{busy ? a('Đang lưu…') : a('Áp dụng cho trang chủ')}</button>
      </div>
      <CursorFX effect={joinCursor(pick)} hideNative={false} />
    </div>
  )
}

/* ---------------- Khung chính ---------------- */
export default function Admin() {
  const [session, setSession] = useState(undefined)
  // Ngôn ngữ giao diện Admin: theo lựa chọn đã lưu trong tài khoản (Tài khoản của tôi → Ngôn ngữ trang Admin)
  const adminLang = useAdminLang()
  // Admin để English: chờ tải bảng English (rất nhanh) để không chớp chữ tiếng Việt
  const [, setDictTick] = useState(0)
  useEffect(() => { if (!adminDictReady()) loadAdminDict().then(() => setDictTick(x => x + 1)) }, [adminLang])
  const a = useA()
  useEffect(() => { const l = session?.user?.user_metadata?.admin_lang; if (l) setAdminLang(l) }, [session?.user?.user_metadata?.admin_lang])
  // Trình duyệt đã đăng nhập Admin: không đếm lượt xem trang chủ của chính bạn
  useEffect(() => { if (session) markOwner() }, [session])
  useEffect(() => { const h = document.documentElement, old = h.lang; h.lang = adminLang; return () => { h.lang = old } }, [adminLang])
  const path = usePath(); const page = pageFromPath(path); const [openNew, setOpenNew] = useState(0)
  const [collapsed, setCollapsed] = useState(storage.get('cm-admin-collapsed') === '1')
  const [drawer, setDrawer] = useState(false)
  const [toasts, setToasts] = useState([])
  const [counts, setCounts] = useState({})
  // Thương hiệu (logo, biểu tượng, favicon) cho thanh bên, trang đăng nhập và tab trình duyệt
  const [brand, setBrand] = useState(brandOf())
  // Cấu hình thông báo (âm thanh, thông báo hệ thống, số trên tab); dùng ref để realtime luôn đọc bản mới nhất
  const [notify, setNotify] = useState(notifyOf()); const notifyRef = useRef(notify); notifyRef.current = notify
  useEffect(() => { loadSettings().then(r => setBrand(brandOf(r))).catch(() => {}) }, [])
  useEffect(() => { if (session) loadAdminSettings().then(r => setNotify(notifyOf(r))).catch(() => {}) }, [session])
  useFavicon(brand)
  // Cài Admin lên màn hình chính (cần cho thông báo đẩy trên iPhone) + biểu tượng
  useEffect(() => {
    const add = (tag, attrs) => { const el = document.createElement(tag); Object.assign(el, attrs); el.dataset.admin = '1'; document.head.appendChild(el); return el }
    const els = [add('link', { rel: 'manifest', href: '/manifest.webmanifest' }), add('link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }),
      add('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }), add('meta', { name: 'theme-color', content: '#07080f' })]
    return () => els.forEach(e => e.remove())
  }, [])
  // Trang Admin không cho Google lập chỉ mục
  useEffect(() => {
    let m = document.head.querySelector('meta[name="robots"]')
    if (!m) { m = document.createElement('meta'); m.name = 'robots'; document.head.appendChild(m) }
    m.content = 'noindex, nofollow'
    return () => m.remove()
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])
  const countOf = (t, r) => setCounts(c => ({
    ...c, [t]: { total: r.length, hidden: r.filter(x => x.visible === false).length, ...(t === 'posts' ? { waiting: r.filter(x => postStatus(x) === 'review').length } : {}) },
    ...(t === 'posts' ? { autopost: { waiting: r.filter(x => x.source === 'easyai' && postStatus(x) === 'review').length } } : {}),
  }))
  const refreshCounts = (tables = Object.keys(SCHEMA)) => tables.forEach(t => loadTable(t).then(r => countOf(t, r)).catch(() => {}))
  const refreshMessages = () => loadMessages().then(r => setCounts(c => ({ ...c, messages: { waiting: r.filter(m => !m.read).length, tip: 'tin nhắn chưa đọc' } }))).catch(() => {})
  useEffect(() => { if (session) { refreshCounts(); refreshMessages() } }, [session])

  // Realtime bài viết: báo bài mới từ Easy AI, cập nhật số chờ duyệt và danh sách đang mở
  const [live, setLive] = useState(0)
  useEffect(() => {
    if (!session) return
    return subscribePosts(batch => {
      batch.filter(e => e.eventType === 'INSERT' && e.new?.source === 'easyai')
        .forEach(e => fire(notifyRef.current, 'post', { title: e.new.visible === false ? at('Có bài mới từ Easy AI: {title} (chờ duyệt)', { title: e.new.title }) : at('Có bài mới từ Easy AI: {title}', { title: e.new.title }), body: e.new.excerpt, toast, onOpen: () => go('posts') }))
      refreshCounts(['posts']); setLive(v => v + 1)
    })
  }, [session])
  // Realtime tin nhắn từ form Liên hệ: báo ngay + cập nhật số chưa đọc trên menu
  const [msgLive, setMsgLive] = useState(0)
  useEffect(() => {
    if (!session) return
    return subscribeTable('messages', batch => {
      batch.filter(e => e.eventType === 'INSERT' && e.new?.name)
        .forEach(e => fire(notifyRef.current, 'message', { title: at('Tin nhắn mới từ {name}', { name: e.new.name }), body: e.new.message, toast: t => toast(t, 'mail'), onOpen: () => go('messages') }))
      refreshMessages(); setMsgLive(v => v + 1)
    })
  }, [session])

  const toast = (text, kind = 'ok') => {
    const id = Math.random(); setToasts(t => [...t, { id, text, kind }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), kind === 'mail' ? 6000 : 2600)
  }
  const go = (k, add) => { if (k !== page) navigate(adminPath(k)); setDrawer(false); setOpenNew(add ? Date.now() : 0) }
  // Số trên tab trình duyệt: tin chưa đọc + bài chờ duyệt (tùy cài đặt Thông báo)
  const tabN = (notify.events.message.tab ? counts.messages?.waiting || 0 : 0) + (notify.events.post.tab ? counts.posts?.waiting || 0 : 0)
  useEffect(() => { setTabCount(session ? tabN : 0, `${at(TITLES[page]) || 'Admin'} — Admin`) }, [tabN, page, session, adminLang])
  const toggleCollapse = () => { const v = !collapsed; setCollapsed(v); storage.set('cm-admin-collapsed', v ? '1' : '0') }

  if (session === undefined || !adminDictReady()) return <p className="mt-24 text-center text-muted">{a('Đang tải…')}</p>
  if (!session) return <Login brand={brand} />

  const mini = collapsed && !drawer
  const me = profileOf(session.user)
  const sidebar = (
    <aside className={`flex h-full flex-col border-r border-line bg-[#0a0b14] transition-[width] duration-300 ${mini ? 'w-[72px]' : 'w-[264px]'}`}>
      <div className={`flex h-16 items-center gap-3 border-b border-line ${mini ? 'justify-center px-2' : 'px-5'}`}>
        <BrandIcon brand={brand} />
        {!mini && <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold"><BrandLogo brand={brand} imgClass="h-5" /></p><p className="text-[11px] text-muted">{a('Quản trị nội dung')}</p></div>}
        {drawer && <button onClick={() => setDrawer(false)} className={iconBtn} aria-label={a('Đóng menu')}><Icon name="x" /></button>}
      </div>
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {NAV.map(([group, items]) => (
          <div key={group || 'top'}>
            {group && !mini && <p className="mb-2 px-3 text-[10px] font-bold tracking-[1.5px] text-[#5d6180]">{a(group)}</p>}
            {group && mini && <hr className="mx-3 mb-3 border-line" />}
            <ul className="space-y-1">
              {items.map(([k, label, icon]) => {
                const active = page === k, c = counts[k]
                return (
                  <li key={k}>
                    <button onClick={() => go(k)} title={mini ? a(label) : undefined}
                      className={`relative flex w-full items-center gap-3 rounded-lg py-2 text-sm transition ${mini ? 'justify-center px-0' : 'px-3'}
                        ${active ? 'bg-purple/15 font-semibold text-white' : 'text-[#a3a6bd] hover:bg-white/5 hover:text-white'}`}>
                      {active && <i className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-r ${grad}`} />}
                      <span className={active ? 'text-[#b5aaff]' : ''}><Icon name={icon} /></span>
                      {!mini && <span className="flex-1 truncate text-left">{a(label)}</span>}
                      {!mini && c && c.total !== undefined && <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[11px] tabular-nums text-muted">{c.total}</span>}
                      {c?.waiting > 0 && <span title={`${c.waiting} ${a(c.tip || 'bài chờ duyệt')}`} className={`rounded-md bg-[#f8d27c] px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-[#161525] ${mini ? 'absolute right-1 top-1 px-1 py-0 text-[9px]' : ''}`}>{c.waiting}</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="space-y-1 border-t border-line p-3">
        <a href={href('/')} title={mini ? a('Xem trang') : undefined} className={`flex items-center gap-3 rounded-lg py-2.5 text-sm text-[#a3a6bd] transition hover:bg-white/5 hover:text-white ${mini ? 'justify-center' : 'px-3'}`}>
          <Icon name="external" />{!mini && a('Xem trang')}
        </a>
        {/* Bấm ảnh/tên để mở Tài khoản của tôi */}
        <div className={`flex items-center gap-1 rounded-lg ${page === 'account' ? 'bg-purple/15' : ''}`}>
          <button onClick={() => go('account')} title={mini ? a('Tài khoản của tôi') : undefined}
            className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg py-2 text-left transition hover:bg-white/5 ${mini ? 'justify-center' : 'px-3'}`}>
            <img src={me.avatar || me.fallback} alt="" className="size-8 flex-none rounded-full object-cover" />
            {!mini && <span className="min-w-0 flex-1">
              {me.name && <span className="block truncate text-sm font-medium text-white">{me.name}</span>}
              <span className="block truncate text-xs text-muted">{me.email}</span>
            </span>}
          </button>
          {!mini && <button onClick={() => supabase.auth.signOut()} className={`${iconBtn} mr-1`} aria-label={a('Đăng xuất')} title={a('Đăng xuất')}><Icon name="logout" className="size-4" /></button>}
        </div>
      </div>
    </aside>
  )

  return (
    <div className="flex min-h-screen">
      {/* Sidebar desktop */}
      <div className="sticky top-[env(safe-area-inset-top,0px)] hidden h-screen flex-none lg:block">{sidebar}</div>
      {/* Sidebar mobile (drawer) */}
      <div className={`fixed inset-0 z-50 lg:hidden ${drawer ? '' : 'pointer-events-none'}`}>
        <div onClick={() => setDrawer(false)} className={`absolute inset-0 bg-black/60 transition-opacity ${drawer ? 'opacity-100' : 'opacity-0'}`} />
        <div className={`absolute inset-y-0 left-0 transition-transform duration-300 ${drawer ? 'translate-x-0' : '-translate-x-full'}`}>{sidebar}</div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-[env(safe-area-inset-top,0px)] z-40 flex h-16 items-center gap-3 border-b border-line bg-[#07080f]/80 px-4 backdrop-blur-xl sm:px-6">
          <button onClick={() => setDrawer(true)} className={`${iconBtn} lg:hidden`} aria-label={a('Mở menu')}><Icon name="menu" /></button>
          <button onClick={toggleCollapse} className={`${iconBtn} hidden lg:grid`} aria-label={a('Thu gọn menu')}>
            <Icon name="collapse" className={`size-4 transition ${collapsed ? 'rotate-180' : ''}`} />
          </button>
          <div className="min-w-0">
            <p className="text-[11px] text-muted">Admin / {a(TITLES[page])}</p>
            <div className="flex items-center gap-2">
              <h1 className="truncate text-base font-semibold leading-tight">{a(TITLES[page])}</h1>
              {page === 'messages' && <SetupHelp />}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {page === 'dashboard' && <Dashboard go={go} counts={counts} />}
          {page === 'settings' && <SettingsForm toast={toast} />}
          {page === 'layout' && <LayoutForm toast={toast} />}
          {page === 'selftest' && <SelfTestAdmin toast={toast} />}
          {page === 'cursor' && <CursorPage toast={toast} />}
          {page === 'hero' && <HeroAdmin toast={toast} />}
          {page === 'season' && <SeasonAdmin toast={toast} />}
          {page === 'lang' && <LangPage toast={toast} go={go} />}
          {page === 'notify' && <NotifyAdmin toast={toast} onSaved={setNotify} />}
          {page === 'brand' && <BrandAdmin toast={toast} onSaved={setBrand} />}
          {page === 'account' && <AccountAdmin session={session} toast={toast} />}
          {page === 'messages' && <MessagesAdmin toast={toast} live={msgLive} onChanged={refreshMessages} />}
          {page === 'autopost' && <AutoPostAdmin toast={toast} go={go} live={live} />}
          {page === 'version' && <VersionAdmin />}
          {page === 'backup' && <BackupAdmin toast={toast} onChanged={() => { refreshCounts(); refreshMessages() }} />}
          {SCHEMA[page] && <Manager key={page} table={page} toast={toast} openNew={openNew} onChanged={refreshCounts} live={live} />}
        </main>
      </div>

      {/* Toasts */}
      <div className="pointer-events-none fixed left-1/2 top-[calc(72px+env(safe-area-inset-top,0px))] z-[60] flex -translate-x-1/2 flex-col items-center gap-2" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm shadow-xl ${t.kind === 'error' ? 'border-red-500/40 bg-[#2a1218] text-red-200' : t.kind === 'mail' ? 'border-pink/40 bg-[#24121e] text-[#ffd6ea]' : 'border-[#3ddc97]/30 bg-[#0f1f1a] text-[#bff3dc]'}`}>
            {t.kind === 'ok' && <Icon name="check" className="size-4 text-[#3ddc97]" />}
            {t.kind === 'mail' && <Icon name="mail" className="size-4 text-pink" />}{t.text}
            {t.kind === 'mail' && page !== 'messages' && <button onClick={() => go('messages')} className="pointer-events-auto ml-1 rounded-md bg-white/10 px-2 py-0.5 text-xs font-semibold hover:bg-white/20">{a('Xem')}</button>}
          </div>
        ))}
      </div>
    </div>
  )
}
