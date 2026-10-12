// Admin → Cài đặt → Thông báo: chọn kiểu thông báo và âm thanh cho từng loại sự kiện, email qua Resend.
import { useEffect, useRef, useState } from 'react'
import { supabase, demoMode } from './supabase.js'
import { loadSettings } from './useContent.js'
import { Copy, Value } from './AutoPostAdmin.jsx'
import { SOUNDS, playSound } from './sounds.js'
import { EVENTS, SYSTEM_MODES, notifyOf, fire, systemPermission, askPermission, canSystem, loadAdminSettings } from './notify.js'
import { useA } from './adminLang.js'
import { PushCard } from './PushAdmin.jsx'
import FN_MSG from '../supabase/functions/gui-tin-nhan/index.ts?raw'
import FN_POST from '../supabase/functions/nhan-bai/index.ts?raw'

const grad = 'bg-gradient-to-r from-pink to-purple'
const btn = 'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition disabled:opacity-50'
const ghost = `${btn} border border-line text-[#c9cbd8] hover:border-[#3a3f5a] hover:bg-white/5 hover:text-white`
const input = 'w-full rounded-lg border border-line bg-[#0b0d16] px-3 py-2.5 text-sm outline-none transition focus:border-purple focus:ring-2 focus:ring-purple/25'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function Toggle({ on, onClick, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onClick}
      className={`relative h-6 w-11 flex-none rounded-full transition ${on ? grad : 'bg-[#2a2e45]'}`}>
      <i className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}
const Row = ({ title, hint, children }) => (
  <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-line px-5 py-4 last:border-0">
    <div className="min-w-0 flex-1 basis-56"><p className="text-sm font-medium">{title}</p>{hint && <p className="text-xs text-muted">{hint}</p>}</div>
    <div className="flex flex-wrap items-center gap-2">{children}</div>
  </div>
)

/* Nút "?" hướng dẫn cài Resend */
function EmailHelp() {
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
    <div ref={box} className="relative inline-block">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label={a('Cách bật gửi email')} title={a('Cách bật gửi email')}
        className={`grid size-[22px] place-items-center rounded-full border text-xs font-bold transition ${open ? 'border-purple bg-purple/20 text-white' : 'border-line text-muted hover:border-purple hover:text-white'}`}>?</button>
      {open && (
        <div role="dialog" aria-label={a('Cách bật gửi email')} className="fixed inset-x-4 top-20 z-50 rounded-xl border border-line bg-[#0d0f1a] p-4 text-left shadow-[0_20px_60px_#000000b0] sm:absolute sm:inset-x-auto sm:left-0 sm:top-8 sm:w-[440px]">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div><p className="font-semibold">{a('Cách bật gửi email (Resend)')}</p><p className="text-xs text-muted">{a('Làm một lần, khoảng 10 phút. Email được gửi từ máy chủ nên đóng Admin vẫn nhận được.')}</p></div>
            <button type="button" onClick={() => setOpen(false)} className="text-muted hover:text-white" aria-label={a('Đóng')}>✕</button>
          </div>
          <ol className="max-h-[60vh] overflow-y-auto pr-1">
            {step(1, a('Tạo tài khoản Resend'), <p>{a('Đăng ký ở')} <b>resend.com</b> {a('(có gói miễn phí).')}</p>)}
            {step(2, a('Chọn địa chỉ gửi'), <><p><b>{a('Có tên miền:')}</b> {a('Domains → Add domain → thêm các bản ghi DNS Resend đưa → chờ Verified. Gửi từ địa chỉ như thongbao@tenmien.')}</p><p><b>{a('Chưa có tên miền:')}</b> {a('dùng địa chỉ thử onboarding@resend.dev; địa chỉ này chỉ gửi được tới email bạn dùng đăng ký Resend.')}</p></>)}
            {step(3, a('Tạo khóa API'), <p>{a('API Keys → Create API Key → chép khóa (bắt đầu bằng re_).')}</p>)}
            {step(4, a('Lưu vào Supabase'), <><p>{a('Edge Functions → Secrets, thêm:')}</p><Value>RESEND_API_KEY</Value><p className="-mt-1 text-xs text-muted">{a('Giá trị: khóa ở bước 3.')}</p><Value>RESEND_FROM</Value><p className="-mt-1 text-xs text-muted">{a('VD: Công Minh <thongbao@congminh.dev> hoặc onboarding@resend.dev')}</p><Value>SITE_URL</Value><p className="-mt-1 text-xs text-muted">{a('Địa chỉ web, để email có nút mở Admin (đã có nếu làm Easy AI).')}</p></>)}
            {step(5, a('Cập nhật 2 hàm'), <><p>{a('Edge Functions → mở từng hàm → thay mã bằng bản mới → Deploy:')}</p><div className="flex flex-wrap gap-2"><Copy text={FN_MSG} label={a('Chép mã gui-tin-nhan')} /><Copy text={FN_POST} label={a('Chép mã nhan-bai')} /></div></>)}
            {step(6, a('Gửi thử'), <p>{a('Gửi một form Liên hệ trên trang chủ, email báo sẽ tới địa chỉ ở ô "Gửi tới".')}</p>)}
          </ol>
        </div>
      )}
    </div>
  )
}

export default function NotifyAdmin({ toast, onSaved }) {
  const a = useA()
  const [cfg, setCfg] = useState(null); const [ownerEmail, setOwnerEmail] = useState('')
  const [dirty, setDirty] = useState(false); const [busy, setBusy] = useState(false)
  const [perm, setPerm] = useState(systemPermission()); const [errEmail, setErrEmail] = useState('')
  useEffect(() => {
    loadSettings().then(r => setOwnerEmail(r?.email || '')).catch(() => {})
    loadAdminSettings().then(r => setCfg(notifyOf(r))).catch(e => { toast(e.message, 'error'); setCfg(notifyOf()) })
  }, [])
  if (!cfg) return <p className="text-muted">{a('Đang tải…')}</p>

  const set = patch => { setDirty(true); setCfg(c => ({ ...c, ...patch })) }
  const setEv = (k, patch) => { setDirty(true); setCfg(c => ({ ...c, events: { ...c.events, [k]: { ...c.events[k], ...patch } } })) }
  const save = async () => {
    if (cfg.email_to && !EMAIL_RE.test(cfg.email_to.trim())) return setErrEmail(a('Email chưa đúng định dạng.'))
    setErrEmail(''); setBusy(true)
    const next = { ...cfg, email_to: cfg.email_to.trim() }
    const { error } = await supabase.from('admin_settings').upsert({ id: 1, notify: next })
    setBusy(false); if (error) return toast(a('{msg}. Đã chạy supabase/migration-thong-bao-seo.sql chưa?', { msg: error.message }), 'error')
    setDirty(false); onSaved?.(next); toast(a('Đã lưu cài đặt thông báo'))
  }
  const allow = async () => { const p = await askPermission(); setPerm(p); if (p === 'denied') toast(a('Trình duyệt đang chặn thông báo. Mở biểu tượng ổ khóa cạnh thanh địa chỉ để cho phép.'), 'error') }
  const test = k => {
    const [, name] = EVENTS.find(e => e[0] === k)
    fire({ ...cfg, events: { ...cfg.events, [k]: { ...cfg.events[k], system: cfg.events[k].system === 'off' ? 'off' : 'always' } } }, k,
      { title: k === 'message' ? a('Tin nhắn mới từ Khách thử') : a('Có bài mới từ Easy AI: Bài thử'), body: a('Đây là thông báo thử cho "{name}".', { name: a(name) }), toast })
  }
  const permText = a({ granted: 'Đã cho phép', denied: 'Đang bị chặn', default: 'Chưa cho phép', unsupported: 'Trình duyệt này không hỗ trợ' }[perm])

  return (
    <div className="space-y-5 pb-24">
      <section className="rounded-xl border border-line bg-card">
        <header className="border-b border-line px-5 py-4"><h2 className="font-semibold">{a('Trên trình duyệt này')}</h2>
          <p className="text-xs text-muted">{a('Âm thanh, thông báo hệ thống và số trên tab chỉ chạy khi Admin đang mở (kể cả ở tab nền). Đóng hẳn Admin thì dùng email.')}</p></header>
        <Row title={a('Thông báo hệ thống')} hint={a('Hiện ở góc màn hình máy tính / điện thoại, kể cả khi bạn đang ở tab khác.')}>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${perm === 'granted' ? 'bg-[#3ddc97]/12 text-[#5fe3a9]' : perm === 'denied' ? 'bg-red-500/10 text-red-300' : 'bg-white/8 text-muted'}`}>{permText}</span>
          {canSystem() && perm !== 'granted' && <button onClick={allow} className={`${btn} ${grad}`}>{a('Cho phép thông báo')}</button>}
        </Row>
        <Row title={a('Âm lượng')} hint={`${cfg.volume}%`}>
          <input type="range" min="0" max="100" value={cfg.volume} aria-label={a('Âm lượng')} onChange={e => set({ volume: Number(e.target.value) })} className="w-48 accent-[#6650ff]" />
          <button onClick={() => playSound('chime', cfg.volume)} className={`${ghost} px-3 py-1.5 text-xs`}>▶ {a('Nghe thử')}</button>
        </Row>
      </section>

      <section className="rounded-xl border border-line bg-card">
        <header className="flex items-center gap-2 border-b border-line px-5 py-4"><h2 className="font-semibold">Email</h2><EmailHelp /></header>
        <Row title={a('Gửi tới')} hint={a('Để trống = dùng email ở Thông tin chung{owner}.', { owner: ownerEmail ? ` (${ownerEmail})` : '' })}>
          <div className="w-full sm:w-72">
            <input type="email" aria-label={a('Email nhận thông báo')} className={input} value={cfg.email_to} placeholder={ownerEmail || 'ban@gmail.com'} onChange={e => { set({ email_to: e.target.value }); setErrEmail('') }} />
            {errEmail && <p className="mt-1 text-xs text-red-300">{errEmail}</p>}
          </div>
        </Row>
        {demoMode && <p className="px-5 pb-4 text-xs text-[#f8d27c]">{a('Bản demo không gửi email thật. Bấm nút "?" để xem cách bật khi đưa web lên.')}</p>}
      </section>

      <PushCard toast={toast} />

      {EVENTS.map(([k, name, hint]) => {
        const e = cfg.events[k]
        return (
          <section key={k} className="rounded-xl border border-line bg-card" aria-label={a(name)}>
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div><h2 className="font-semibold">{a(name)}</h2><p className="text-xs text-muted">{a(hint)}</p></div>
              <button onClick={() => test(k)} className={`${ghost} px-3 py-1.5 text-xs`}>{a('Gửi thử thông báo')}</button>
            </header>
            <Row title={a('Âm thanh')} hint={a('Bấm để chọn và nghe thử.')}>
              {SOUNDS.map(([s, label]) => (
                <button key={s} type="button" aria-pressed={e.sound === s} onClick={() => { setEv(k, { sound: s }); playSound(s, cfg.volume) }}
                  className={`rounded-full border px-3 py-1 text-xs transition ${e.sound === s ? 'border-purple bg-purple/20 font-semibold text-white' : 'border-line text-muted hover:text-white'}`}>{s !== 'none' && '♪ '}{a(label)}</button>
              ))}
            </Row>
            <Row title={a('Thông báo hệ thống')} hint={perm === 'granted' ? a('Hiện ở góc màn hình.') : a('Cần bấm "Cho phép thông báo" ở trên trước.')}>
              <div className="flex rounded-lg border border-line bg-[#0b0d16] p-1 text-xs" role="radiogroup" aria-label={a('Thông báo hệ thống: {name}', { name: a(name) })}>
                {SYSTEM_MODES.map(([m, label]) => (
                  <button key={m} type="button" role="radio" aria-checked={e.system === m} onClick={() => setEv(k, { system: m })}
                    className={`rounded-md px-2.5 py-1.5 transition ${e.system === m ? 'bg-purple/25 font-semibold text-white' : 'text-muted hover:text-white'}`}>{a(label)}</button>
                ))}
              </div>
            </Row>
            <Row title={a('Thông báo trong trang')} hint={a('Ô nhỏ hiện ở đầu trang Admin vài giây.')}><Toggle on={e.toast} label={a('Thông báo trong trang: {name}', { name: a(name) })} onClick={() => setEv(k, { toast: !e.toast })} /></Row>
            <Row title={a('Số trên tab trình duyệt')} hint={k === 'message' ? a('VD "(2) Admin": số tin nhắn chưa đọc.') : a('VD "(1) Admin": số bài đang chờ duyệt.')}><Toggle on={e.tab} label={a('Số trên tab: {name}', { name: a(name) })} onClick={() => setEv(k, { tab: !e.tab })} /></Row>
            <Row title="Email" hint={a('Gửi email tới địa chỉ ở mục Email, kể cả khi Admin đang đóng.')}><Toggle on={e.email} label={`Email: ${a(name)}`} onClick={() => setEv(k, { email: !e.email })} /></Row>
            <Row title={a('Thông báo đẩy')} hint={a('Gửi tới các thiết bị đã bật ở mục Thông báo đẩy, kể cả khi Admin đang đóng.')}><Toggle on={e.push !== false} label={a('Thông báo đẩy: {name}', { name: a(name) })} onClick={() => setEv(k, { push: e.push === false })} /></Row>
          </section>
        )
      })}

      <div className={`sticky bottom-4 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-[0_10px_40px_#00000080] backdrop-blur transition ${dirty ? 'border-purple/50 bg-[#141728]/95' : 'border-line bg-card/90'}`}>
        <span className="text-sm text-muted">{dirty ? a('Có thay đổi chưa lưu') : a('Mọi thay đổi đã được lưu')}</span>
        <button onClick={save} disabled={busy || !dirty} className={`${btn} ${grad}`}>{busy ? a('Đang lưu…') : a('Lưu cài đặt')}</button>
      </div>
    </div>
  )
}
