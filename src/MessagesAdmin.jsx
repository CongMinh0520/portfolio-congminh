// Admin → Tin nhắn: hộp thư dạng hội thoại. Tin nhắn cùng một email gom thành một hội thoại.
// Hướng dẫn bật form thật nằm gọn trong nút "?" cạnh tiêu đề.
import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase, demoMode } from './supabase.js'
import { Copy, Value } from './AutoPostAdmin.jsx'
import SQL from '../supabase/migration-messages.sql?raw'
import FN_CODE from '../supabase/functions/gui-tin-nhan/index.ts?raw'
import { useA, at, adminLocale } from './adminLang.js'
import ReplyComposer, { TemplatesDialog, FileChip, Icon, sendReplyMail, replyErrorText } from './ReplyComposer.jsx'
import { loadAdminSettings } from './notify.js'
import { loadSettings } from './useContent.js'

const grad = 'bg-gradient-to-r from-pink to-purple'
const btn = 'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition disabled:opacity-50'
const ghost = `${btn} border border-line text-[#c9cbd8] hover:border-[#3a3f5a] hover:bg-white/5 hover:text-white`
const input = 'w-full rounded-lg border border-line bg-[#0b0d16] px-3 py-2 text-sm outline-none transition focus:border-purple focus:ring-2 focus:ring-purple/25'

/** Tin khách gửi (không tính thư Admin trả lời và ghi chú nội bộ) */
export const isIn = m => (m.direction || 'in') === 'in'
export const loadMessages = () => supabase.from('messages').select('*').order('created_at', { ascending: false })
  .then(({ data, error }) => { if (error) throw error; return data || [] })

const ago = iso => {
  const s = (Date.now() - new Date(iso)) / 1000
  if (!(s >= 0)) return ''
  if (s < 60) return at('Vừa xong')
  if (s < 3600) return at('{n} phút', { n: Math.floor(s / 60) })
  if (s < 86400) return at('{n} giờ', { n: Math.floor(s / 3600) })
  if (s < 86400 * 7) return at('{n} ngày', { n: Math.floor(s / 86400) })
  return new Date(iso).toLocaleDateString(adminLocale(), { day: 'numeric', month: 'numeric' })
}
const timeOf = iso => { try { return new Date(iso).toLocaleString(adminLocale(), { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'numeric', year: 'numeric' }) } catch { return iso } }
const clockOf = iso => { try { return new Date(iso).toLocaleTimeString(adminLocale(), { hour: '2-digit', minute: '2-digit' }) } catch { return '' } }
const dayOf = iso => { try { return new Date(iso).toLocaleDateString(adminLocale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) } catch { return '' } }
const PALETTES = [['#e94b9e', '#6650ff'], ['#ff9a54', '#e94b9e'], ['#22c3ff', '#6650ff'], ['#3ddc97', '#22c3ff'], ['#f8d27c', '#ff9a54'], ['#a58bff', '#e94b9e']]
/** Màu riêng cho từng người, cố định theo email */
const colorOf = key => { let h = 0; for (const c of String(key)) h = (h * 31 + c.charCodeAt(0)) >>> 0; const [c1, c2] = PALETTES[h % PALETTES.length]; return `linear-gradient(135deg, ${c1}, ${c2})` }
const GLOBE = 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M3 12h18 M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9 M12 3C9.5 5.6 8.2 8.6 8.2 12s1.3 6.4 3.8 9'
const MAIL = 'M3 6h18v12H3z M3 7l9 6 9-6'
const Svg = ({ d, className }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d={d} /></svg>
const Avatar = ({ t, size = 'size-11 text-sm' }) => (
  <span className={`relative grid flex-none place-items-center rounded-full font-bold text-white ${size}`} style={{ background: colorOf(t.key) }}>
    {initials(t.name)}
    <span title={at('Form liên hệ')} className="absolute -bottom-0.5 -right-0.5 grid size-[18px] place-items-center rounded-full border-2 border-card bg-purple"><Svg d={MAIL} className="size-2.5" /></span>
  </span>
)
const initials = n => (n || '?').trim().split(/\s+/).slice(-2).map(w => w[0]).join('').toUpperCase()

/** Gom tin nhắn theo email (không phân biệt hoa thường) thành hội thoại, mới nhất lên đầu.
    Tên và số chưa đọc chỉ tính tin khách gửi; xem trước lấy tin cuối cùng (kể cả thư mình trả lời). */
function toThreads(rows) {
  const map = new Map()
  rows.forEach(m => {
    const k = String(m.email || '').trim().toLowerCase()
    const t = map.get(k) || { key: k, email: m.email, msgs: [] }
    t.msgs.push(m); map.set(k, t)
  })
  return [...map.values()].map(t => {
    t.msgs.sort((x, y) => new Date(x.created_at) - new Date(y.created_at))
    const ins = t.msgs.filter(isIn)
    const last = t.msgs[t.msgs.length - 1], lastIn = ins[ins.length - 1] || last
    return { ...t, name: lastIn.name, last, lastIn, unread: ins.filter(m => !m.read).length }
  }).sort((x, y) => new Date(y.last.created_at) - new Date(x.last.created_at))
}

/* ---------- Nút "?" mở hướng dẫn bật form thật ---------- */
export function SetupHelp() {
  const a = useA()
  const [open, setOpen] = useState(false); const box = useRef(null)
  useEffect(() => {
    if (!open) return
    const close = e => { if (e.key === 'Escape' || (e.type === 'mousedown' && !box.current?.contains(e.target))) setOpen(false) }
    document.addEventListener('mousedown', close); document.addEventListener('keydown', close)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close) }
  }, [open])
  const step = (n, title, body) => (
    <li className="flex gap-3"><span className={`${grad} grid size-6 flex-none place-items-center rounded-full text-xs font-bold`}>{n}</span>
      <div className="min-w-0 flex-1 space-y-1.5 pb-4"><p className="font-semibold text-white">{title}</p><div className="space-y-1.5 text-[13px] leading-relaxed text-[#c9cbd8]">{body}</div></div></li>
  )
  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label={a('Cách bật form liên hệ thật')}
        className={`peer grid size-[22px] place-items-center rounded-full border text-xs font-bold transition ${open ? 'border-purple bg-purple/20 text-white' : 'border-line text-muted hover:border-purple hover:text-white'}`}>?</button>
      {/* Gợi ý khi rê chuột */}
      {!open && <span role="tooltip" className="pointer-events-none absolute left-[30px] top-1/2 z-50 hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-[#1d2033] px-2.5 py-1 text-xs font-medium text-[#dfe0ea] shadow-lg peer-hover:block peer-focus-visible:block">{a('Cách bật form liên hệ thật')}</span>}
      {open && (
        <div role="dialog" aria-label={a('Cách bật form liên hệ thật')} className="fixed inset-x-4 top-20 z-50 rounded-xl border border-line bg-[#0d0f1a] p-4 shadow-[0_20px_60px_#000000b0] sm:absolute sm:inset-x-auto sm:left-0 sm:top-8 sm:w-[440px]">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div><p className="font-semibold">{a('Cách bật form liên hệ thật')}</p><p className="text-xs text-muted">{a('Làm một lần trên Supabase và Cloudflare, khoảng 10 phút.')}</p></div>
            <button type="button" onClick={() => setOpen(false)} className="text-muted hover:text-white" aria-label={a('Đóng')}>✕</button>
          </div>
          {demoMode && <p className="mb-3 rounded-lg border border-[#f8d27c]/40 bg-[#f8d27c]/10 p-2.5 text-xs text-[#f8d27c]">{a('Bản demo: form gửi vào hộp thư giả lập, ô chống spam cũng là giả lập.')}</p>}
          <ol className="max-h-[60vh] overflow-y-auto pr-1">
            {step(1, a('Tạo bảng lưu tin nhắn'), <><p>{a('Supabase → SQL Editor → dán → Run. (Cài bằng schema.sql thì bỏ qua.)')}</p><Copy text={SQL} label={a('Sao chép SQL')} /></>)}
            {step(2, a('Tạo ô chống spam'), <p>{a('dash.cloudflare.com → Turnstile → Add widget, Hostname là tên miền web, mode Managed. Lấy')} <b>Site Key</b> {a('và')} <b>Secret Key</b>.</p>)}
            {step(3, a('Tạo hàm nhận form'), <><p>{a('Supabase → Edge Functions → Deploy a new function → Via Editor, tên:')}</p><Value>gui-tin-nhan</Value><p>{a('Dán mã rồi Deploy,')} <b>{a('giữ nguyên')}</b> "Enforce JWT verification".</p><Copy text={FN_CODE} label={a('Sao chép mã hàm')} /></>)}
            {step(4, a('Lưu Secret Key'), <><p>Edge Functions → Secrets:</p><Value>TURNSTILE_SECRET</Value></>)}
            {step(5, a('Thêm Site Key cho web'), <><p>{a('Vercel → Settings → Environment Variables, rồi Redeploy:')}</p><Value>VITE_TURNSTILE_SITE_KEY</Value></>)}
            {step(6, a('Gửi thử'), <p>{a('Trang chủ → Liên hệ → gửi form, tin hiện ngay ở đây.')}</p>)}
            {step(7, a('Trả lời khách ngay trong Admin'), <><p>{a('Chạy lại SQL ở bước 1 và Deploy lại mã hàm ở bước 3 (bản mới). Email gửi qua Resend (Cài đặt → Thông báo → Email).')}</p>
              <p>{a('Muốn gửi được tới mọi khách: Resend → Domains → verify tên miền, rồi đặt RESEND_FROM là địa chỉ trên tên miền đó. Chưa có tên miền thì bấm mũi tên cạnh nút Gửi → "Mở trong Gmail".')}</p></>)}
            {step(8, a('AI viết nháp (không bắt buộc)'), <><p>{a('Lấy API key ở console.anthropic.com, rồi Edge Functions → Secrets:')}</p><Value>ANTHROPIC_API_KEY</Value></>)}
          </ol>
          <details className="border-t border-line pt-3 text-xs text-[#c9cbd8]">
            <summary className="cursor-pointer font-semibold text-white">{a('Gặp lỗi?')}</summary>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>{a('Form hiện "Chưa cấu hình Turnstile": thiếu biến ở bước 5 hoặc chưa Redeploy.')}</li>
              <li>{a('"Xác minh chống spam chưa thành công": Secret Key sai hoặc tên miền chưa có trong Hostname.')}</li>
              <li>{a('"Form đang bảo trì": thiếu secret ở bước 4.')}</li>
              <li>{a('"Chưa lưu được tin nhắn": chưa chạy SQL ở bước 1.')}</li>
            </ul>
          </details>
        </div>
      )}
    </div>
  )
}

/* Bong bóng tin: khách bên trái; thư mình trả lời (tím) và ghi chú nội bộ (vàng) bên phải */
function Bubble({ m, cur, retrying, onRetry }) {
  const a = useA()
  const files = m.attachments || []
  if (isIn(m)) return (
    <div className="flex max-w-[min(640px,85%)] items-end gap-2.5">
      <span className="grid size-7 flex-none place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: colorOf(cur.key) }} aria-hidden="true">{initials(m.name)}</span>
      <div className="min-w-0">
        <div className="rounded-2xl rounded-bl-[4px] bg-[#1d2033] px-3.5 py-2.5">
          {m.name !== cur.name && <p className="mb-1 text-xs font-semibold text-[#b5aaff]">{m.name}</p>}
          <p className="whitespace-pre-wrap text-[15px] leading-[1.55] text-[#eceef6] [overflow-wrap:anywhere]">{m.message}</p>
        </div>
        <p className="mt-1 pl-1 text-xs text-[#8b8fa8]" title={timeOf(m.created_at)}>{clockOf(m.created_at)}</p>
      </div>
    </div>
  )
  // Ghi chú nội bộ: ô viền đứt màu vàng ở giữa, tách hẳn khỏi thư gửi khách
  if (m.direction === 'note') return (
    <div className="mx-auto w-full max-w-[560px] rounded-xl border border-dashed border-[#6b5a2e] bg-[#1e1b12] px-3.5 py-2.5">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-[#f8d27c]"><Icon d="M5 3h10l4 4v14H5z M15 3v4h4 M8 12h8 M8 16h5" className="size-3.5" />{a('Ghi chú nội bộ · chỉ Admin thấy')}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-[1.55] text-[#ece4cc] [overflow-wrap:anywhere]">{m.message}</p>
      {files.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{files.map(f => <FileChip key={f.url} f={f} href={f.url} />)}</div>}
      <p className="mt-1 text-xs text-[#a99a6e]" title={timeOf(m.created_at)}>{clockOf(m.created_at)}{m.name ? ` · ${m.name}` : ''}</p>
    </div>
  )
  const failed = m.status === 'failed'
  return (
    <div className="ml-auto flex max-w-[min(640px,85%)] flex-col items-end">
      <div className={`min-w-0 rounded-2xl rounded-br-[4px] px-3.5 py-2.5 ${failed ? 'border border-red-400/50 bg-red-500/[0.10]' : 'bg-[#3a2d7a]'}`}>
        {m.subject && <p className="mb-1 truncate text-xs font-semibold text-[#c9bfff]">{m.subject}</p>}
        <p className="whitespace-pre-wrap text-[15px] leading-[1.55] text-[#f4f1ff] [overflow-wrap:anywhere]">{m.message}</p>
        {files.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{files.map(f => <FileChip key={f.url} f={f} href={f.url} />)}</div>}
      </div>
      <p className={`mt-1 flex flex-wrap items-center justify-end gap-x-1.5 pr-1 text-xs ${failed ? 'text-red-300' : 'text-[#8b8fa8]'}`} title={timeOf(m.created_at)}>
        {clockOf(m.created_at)} · {failed ? a('Chưa gửi được') : m.status === 'external' ? a('Soạn trong Gmail / app email') : a('Đã gửi email')}
        {m.status === 'sent' && <span aria-hidden="true">✓✓</span>}
        {failed && <button type="button" onClick={onRetry} disabled={retrying} className="ml-1 font-semibold underline underline-offset-2 hover:text-white disabled:opacity-60">{retrying ? a('Đang gửi…') : a('Gửi lại')}</button>}
      </p>
    </div>
  )
}

export default function MessagesAdmin({ toast, live, onChanged, openThread }) {
  const a = useA()
  const [rows, setRows] = useState(null); const [err, setErr] = useState('')
  const [onlyUnread, setOnlyUnread] = useState(false); const [q, setQ] = useState('')
  const [openKey, setOpenKey] = useState(null)
  // Mở thẳng một hội thoại (chọn từ ô Tìm kiếm)
  useEffect(() => { if (openThread) setOpenKey(openThread.key) }, [openThread])
  const end = useRef(null)
  const reload = () => loadMessages().then(r => { setRows(r); setErr('') }).catch(e => { setRows([]); setErr(e.message || String(e)) })
  useEffect(() => { reload() }, [live])

  // Cho ô soạn trả lời: mẫu + chữ ký, tên người gửi, file CV ở Trang chủ (cho thư viện file)
  const [replyCfg, setReplyCfg] = useState({}); const [manage, setManage] = useState(false)
  const [me, setMe] = useState({ from: '', cvs: [] }); const [extraFiles, setExtraFiles] = useState([])
  useEffect(() => {
    Promise.all([loadAdminSettings().catch(() => null), loadSettings().catch(() => null), supabase.auth.getUser().catch(() => null)]).then(([adm, st, u]) => {
      setReplyCfg(adm?.reply && typeof adm.reply === 'object' ? adm.reply : {})
      const name = String(adm?.notify?.email_from_name || u?.data?.user?.user_metadata?.name || '').trim()
      const cv = st?.hero?.cv || {}
      const cvs = [[cv.file, cv.name], [cv.file_en, cv.name_en]].filter(([f]) => f).map(([url, n], i) => ({ url, name: n || (i ? 'CV-en.pdf' : 'CV.pdf'), type: 'application/pdf', cv: true }))
      setMe({ from: name, cvs })
    })
  }, [])
  // Thư viện file: CV + mọi file đã đính kèm trước đây + file trong mẫu (không trùng)
  const library = useMemo(() => {
    const seen = new Map()
    ;[...me.cvs, ...extraFiles, ...(rows || []).flatMap(m => m.attachments || []), ...(replyCfg.templates || []).flatMap(t => t.files || [])]
      .forEach(f => { if (f?.url && !seen.has(f.url)) seen.set(f.url, f) })
    return [...seen.values()]
  }, [me.cvs, extraFiles, rows, replyCfg])
  const [retrying, setRetrying] = useState(null)
  const retry = async m => {
    setRetrying(m.id)
    const r = await sendReplyMail({ retryId: m.id, to: m.email, subject: m.subject, text: m.message, from_name: m.name, attachments: m.attachments || [], signature: replyCfg.signature_on !== false ? replyCfg.signature || '' : '' })
    setRetrying(null); reload()
    r.ok ? toast(a('Đã gửi email tới {email}', { email: m.email }), 'mail') : toast(replyErrorText(r), 'error')
  }

  const threads = useMemo(() => toThreads(rows || []), [rows])
  const unreadThreads = threads.filter(t => t.unread).length
  const shown = threads.filter(t => (!onlyUnread || t.unread) && (!q.trim() || `${t.name} ${t.email} ${t.msgs.map(m => m.message).join(' ')}`.toLowerCase().includes(q.trim().toLowerCase())))
  const cur = threads.find(t => t.key === openKey)

  const setRead = async (ids, read) => {
    if (!ids.length) return
    setRows(rs => rs.map(x => (ids.includes(x.id) ? { ...x, read } : x)))
    const { error } = await supabase.from('messages').update({ read }).in('id', ids)
    if (error) { toast(error.message, 'error'); reload() }
    onChanged?.()
  }
  // Mở hội thoại (hoặc có tin mới trong hội thoại đang mở) → đánh dấu đã đọc, cuộn xuống tin mới nhất
  useEffect(() => {
    if (!cur) return
    const ids = cur.msgs.filter(m => !m.read).map(m => m.id)
    if (ids.length) setRead(ids, true)
    requestAnimationFrame(() => end.current?.scrollIntoView({ block: 'end' }))
  }, [openKey, cur?.msgs.length, cur?.unread])

  const last = cur?.lastIn
  // Thư trả lời soạn sẵn theo ngôn ngữ Admin đang chọn
  const reply = last && `mailto:${last.email}?subject=${encodeURIComponent(a('Re: Liên hệ từ portfolio Công Minh'))}&body=${encodeURIComponent(a('Chào {name},\n\n\n\n---\n{name} đã viết:\n> {quote}', { name: last.name, quote: last.message.replace(/\n/g, '\n> ') }))}`

  return (
    <div>
      {err && <p className="mb-3 rounded-lg border border-[#f8d27c]/40 bg-[#f8d27c]/10 p-3 text-sm text-[#f8d27c]">{a('Chưa đọc được hộp thư ({err}). Bấm nút "?" cạnh chữ Tin nhắn và làm bước 1.', { err })}</p>}

      <div className="grid h-[calc(100vh-8.5rem)] min-h-[440px] overflow-hidden rounded-xl border border-line bg-card lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        {/* ---- Danh sách hội thoại ---- */}
        <div className={`flex min-h-0 min-w-0 flex-col lg:border-r lg:border-line ${cur ? 'hidden lg:flex' : 'flex'}`}>
          <div className="flex items-center gap-2 border-b border-line p-3">
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-[#0b0d16] px-3 text-muted transition focus-within:border-purple focus-within:ring-2 focus-within:ring-purple/25">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="size-4 flex-none" aria-hidden="true"><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M21 21l-4.3-4.3" /></svg>
              <span className="sr-only">{a('Tìm tin nhắn')}</span>
              <input id="msg-search" className="min-w-0 flex-1 bg-transparent py-2 text-sm text-white outline-none placeholder:text-[#5d6180]" placeholder={a('Tìm kiếm')} value={q} onChange={e => setQ(e.target.value)} />
            </label>
            <button type="button" onClick={() => setOnlyUnread(v => !v)} aria-pressed={onlyUnread} title={onlyUnread ? a('Đang chỉ hiện chưa đọc — bấm để hiện tất cả') : a('Chỉ hiện chưa đọc')} aria-label={a('Chỉ hiện chưa đọc')}
              className={`relative grid size-[38px] flex-none place-items-center rounded-lg border transition ${onlyUnread ? 'border-purple bg-purple/15 text-[#c9bfff]' : 'border-line text-muted hover:text-white'}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className="size-4" aria-hidden="true"><path d="M4 5h16l-6 7v6l-4 2v-8z" /></svg>
              {unreadThreads > 0 && <span className="absolute -right-1.5 -top-1.5 min-w-[18px] rounded-full bg-pink px-1 text-center text-[10px] font-bold leading-[18px] text-white">{unreadThreads}</span>}
            </button>
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto">
            {rows === null && <li className="p-6 text-center text-sm text-muted">{a('Đang tải…')}</li>}
            {rows && !shown.length && <li className="p-8 text-center text-sm text-muted">{q ? a('Không tìm thấy hội thoại nào.') : onlyUnread && threads.length ? a('Đã đọc hết.') : a('Chưa có tin nhắn nào. Khách gửi form Liên hệ trên trang chủ là tin hiện ở đây.')}</li>}
            {shown.map(t => (
              <li key={t.key}>
                <button onClick={() => setOpenKey(t.key)}
                  className={`flex w-full gap-3 border-b border-line/70 px-3.5 py-3 text-left transition hover:bg-white/5 ${t.key === openKey ? 'bg-[#1b1d33] shadow-[inset_3px_0_0_#8b6cff]' : t.unread ? 'bg-white/[0.03]' : ''}`}>
                  <Avatar t={t} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 text-[11px] text-[#7d81a0]"><Svg d={GLOBE} className="size-3 text-[#22c3ff]" />{a('Form liên hệ')}</span>
                    <span className="flex items-baseline gap-2">
                      <span className={`min-w-0 flex-1 truncate ${t.unread ? 'font-bold text-white' : 'text-[#c9cbd8]'}`}>{t.name}</span>
                      <span className={`flex-none text-[11px] ${t.unread ? 'text-[#b5aaff]' : 'text-muted'}`}>{ago(t.last.created_at)}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className={`min-w-0 flex-1 truncate text-[13px] ${t.unread ? 'font-semibold text-[#dfe0ea]' : 'text-[#7d81a0]'}`}>{t.last.direction === 'note' ? a('Ghi chú: ') : t.last.direction === 'out' ? a('Bạn: ') : ''}{t.last.message}</span>
                      {t.unread > 0 && <span className="grid h-[18px] min-w-[18px] flex-none place-items-center rounded-full bg-red-500 px-1 text-[11px] font-bold tabular-nums text-white">{t.unread}</span>}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* ---- Hội thoại đang mở ---- */}
        <div className={`min-h-0 min-w-0 flex-col ${cur ? 'flex' : 'hidden lg:flex'}`}>
          {!cur ? (
            <div className="grid flex-1 place-items-center p-8 text-center text-sm text-muted">{a('Chọn một hội thoại để xem.')}</div>
          ) : (<>
            <header className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
              <button onClick={() => setOpenKey(null)} className={`${ghost} px-2.5 lg:hidden`} aria-label={a('Về danh sách')}>←</button>
              <Avatar t={cur} size="size-10 text-sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{cur.name}</p>
                <a href={`mailto:${cur.email}`} className="block truncate text-[13px] text-[#9a9eb8] hover:text-white hover:underline">{cur.email}</a>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a href={reply} className={ghost} title={a('Mở app email trên máy với thư trả lời soạn sẵn')}><Icon d="mail" />{a('Mở app email')}</a>
                <button onClick={() => { setOpenKey(null); setRead([cur.lastIn.id], false) }} className={ghost} title={a('Đánh dấu chưa đọc và đóng hội thoại')}>{a('Đánh dấu chưa đọc')}</button>
              </div>
            </header>
            <div className="min-h-[120px] flex-1 space-y-3.5 overflow-y-auto px-4 py-5 sm:px-7">
              {cur.msgs.map((m, i) => {
                const newDay = i === 0 || dayOf(m.created_at) !== dayOf(cur.msgs[i - 1].created_at)
                return (
                  <div key={m.id}>
                    {newDay && <p className="my-3 flex justify-center"><span className="rounded-full bg-[#1a1d2e] px-3 py-1 text-xs font-medium text-[#b4b7cc]">{dayOf(m.created_at)}</span></p>}
                    <Bubble m={m} cur={cur} retrying={retrying === m.id} onRetry={() => retry(m)} />
                  </div>
                )
              })}
              <div ref={end} />
            </div>
            <ReplyComposer thread={cur} quoteMsg={isIn(cur.lastIn) ? cur.lastIn : null} cfg={replyCfg} library={library} fromName={me.from || 'Admin'} owner={me.from}
              toast={toast} onSaved={reload} onClose={() => setOpenKey(null)} onManage={() => setManage(true)} onLibraryAdd={f => setExtraFiles(l => [...l, f])} onCfgSaved={setReplyCfg} />
          </>)}
        </div>
      </div>
      {manage && <TemplatesDialog cfg={replyCfg} library={library} toast={toast} onClose={() => setManage(false)} onSaved={setReplyCfg} />}
    </div>
  )
}
