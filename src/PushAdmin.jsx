// Admin → Cài đặt → Thông báo → Thông báo đẩy: nhận thông báo trên điện thoại / máy tính kể cả khi đã đóng Admin.
// Trình duyệt đăng ký nhận (service worker public/sw.js) → lưu vào bảng push_subscriptions → hàm gui-tin-nhan / nhan-bai gửi.
// Cần: VITE_VAPID_PUBLIC_KEY (Vercel) + VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (Supabase secrets). Xem nút "?".
import { useEffect, useRef, useState } from 'react'
import { supabase, demoMode } from './supabase.js'
import { Copy, Value } from './AutoPostAdmin.jsx'
import { useA, at, adminLocale } from './adminLang.js'

const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''
const grad = 'bg-gradient-to-r from-pink to-purple'
const btn = 'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition disabled:opacity-50'
const ghost = `${btn} border border-line text-[#c9cbd8] hover:border-[#3a3f5a] hover:bg-white/5 hover:text-white`

const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const fromB64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0))
const supported = () => typeof window !== 'undefined' && window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
const standalone = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true
// Tên thiết bị dễ nhận ra, VD "Chrome · Windows"
function deviceLabel() {
  const ua = navigator.userAgent
  const br = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /CocCoc/.test(ua) ? 'Cốc Cốc' /* vi-only: tên trình duyệt */ : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : at('Trình duyệt')
  const os = /Android/.test(ua) ? 'Android' : isIOS() ? (/iPad/.test(ua) || navigator.maxTouchPoints > 1 && /Macintosh/.test(ua) ? 'iPad' : 'iPhone') : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : ''
  return [br, os].filter(Boolean).join(' · ')
}
const register = () => navigator.serviceWorker.register('/sw.js', { scope: '/admin/' })

/** Tạo cặp khóa VAPID ngay trong trình duyệt (khóa riêng không gửi đi đâu) */
async function makeVapid() {
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
  return { publicKey: b64u(await crypto.subtle.exportKey('raw', kp.publicKey)), privateKey: (await crypto.subtle.exportKey('jwk', kp.privateKey)).d }
}

function Help() {
  const a = useA()
  const [open, setOpen] = useState(false); const [keys, setKeys] = useState(null); const box = useRef(null)
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
  const keyBox = (label, v) => (
    <div className="space-y-1"><p className="text-xs text-muted">{label}</p>
      <div className="flex items-center gap-2"><code className="min-w-0 flex-1 truncate rounded bg-black/40 px-2 py-1 font-mono text-[11.5px] text-[#c9bfff]" title={v}>{v}</code><Copy text={v} /></div></div>
  )
  return (
    <div ref={box} className="relative inline-block">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label={a('Cách bật thông báo đẩy')} title={a('Cách bật thông báo đẩy')}
        className={`grid size-[22px] place-items-center rounded-full border text-xs font-bold transition ${open ? 'border-purple bg-purple/20 text-white' : 'border-line text-muted hover:border-purple hover:text-white'}`}>?</button>
      {open && (
        <div role="dialog" aria-label={a('Cách bật thông báo đẩy')} className="fixed inset-x-4 top-20 z-50 rounded-xl border border-line bg-[#0d0f1a] p-4 text-left shadow-[0_20px_60px_#000000b0] sm:absolute sm:inset-x-auto sm:left-0 sm:top-8 sm:w-[460px]">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div><p className="font-semibold">{a('Cách bật thông báo đẩy')}</p><p className="text-xs text-muted">{a('Làm một lần, khoảng 10 phút. Sau đó bật riêng trên từng điện thoại / máy tính.')}</p></div>
            <button type="button" onClick={() => setOpen(false)} className="text-muted hover:text-white" aria-label={a('Đóng')}>✕</button>
          </div>
          <ol className="max-h-[60vh] overflow-y-auto pr-1">
            {step(1, a('Tạo bảng lưu thiết bị'), <p>{a('Cài mới bằng schema.sql thì đã có. Database cũ: chạy supabase/migration-push.sql trong SQL Editor.')}</p>)}
            {step(2, a('Tạo cặp khóa VAPID'), <>
              <p>{a('Bấm nút dưới để tạo. Khóa riêng chỉ hiện ở đây, chép cất ngay; đóng hộp này là mất.')}</p>
              {!keys ? <button type="button" onClick={async () => setKeys(await makeVapid())} className={`${btn} ${grad} px-3 py-1.5 text-xs`}>{a('Tạo khóa')}</button>
                : <div className="space-y-2 rounded-lg border border-line p-2.5">{keyBox(a('Khóa công khai (Public key)'), keys.publicKey)}{keyBox(a('Khóa riêng (Private key) — không chia sẻ'), keys.privateKey)}</div>}
            </>)}
            {step(3, a('Đặt khóa công khai cho web'), <><p>{a('Vercel → Settings → Environment Variables, thêm rồi Redeploy:')}</p><Value>VITE_VAPID_PUBLIC_KEY</Value><p className="-mt-1 text-xs text-muted">{a('Giá trị: khóa công khai ở bước 2.')}</p></>)}
            {step(4, a('Đặt khóa cho máy chủ'), <><p>{a('Supabase → Edge Functions → Secrets, thêm:')}</p><Value>VAPID_PUBLIC_KEY</Value><Value>VAPID_PRIVATE_KEY</Value><Value>VAPID_SUBJECT</Value><p className="-mt-1 text-xs text-muted">{a('VAPID_SUBJECT là email của bạn dạng mailto:ban@gmail.com.')}</p></>)}
            {step(5, a('Cập nhật 2 hàm'), <p>{a('Dùng nút "?" ở mục Email để chép mã mới của gui-tin-nhan và nhan-bai, dán vào từng hàm rồi Deploy.')}</p>)}
            {step(6, a('Bật trên từng thiết bị'), <><p>{a('Mở Admin → Thông báo trên điện thoại / máy tính → "Bật trên thiết bị này" → "Gửi thử".')}</p><p>{a('iPhone / iPad (iOS 16.4 trở lên): mở Admin bằng Safari → nút Chia sẻ → "Thêm vào MH chính", mở Admin từ biểu tượng đó rồi mới bật.')}</p></>)}
          </ol>
        </div>
      )}
    </div>
  )
}

export function PushCard({ toast }) {
  const a = useA()
  const [mine, setMine] = useState(null) // subscription của trình duyệt này
  const [list, setList] = useState(null); const [busy, setBusy] = useState(''); const [confirm, setConfirm] = useState(null)
  const ok = supported(), iosNeedsHome = ok && isIOS() && !standalone()
  const when = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString(adminLocale(), { day: 'numeric', month: 'numeric', year: 'numeric' }) }

  const reload = () => supabase.from('push_subscriptions').select('*').order('created_at', { ascending: false }).then(({ data, error }) => setList(error ? [] : data || []))
  useEffect(() => {
    reload()
    if (ok) navigator.serviceWorker.getRegistration('/admin/').then(r => r?.pushManager.getSubscription()).then(s => setMine(s || false)).catch(() => setMine(false))
    else setMine(false)
  }, [])

  const enable = async () => {
    setBusy('on')
    try {
      const p = await Notification.requestPermission()
      if (p !== 'granted') throw new Error(at('Trình duyệt đang chặn thông báo. Mở biểu tượng ổ khóa cạnh thanh địa chỉ để cho phép.'))
      const reg = await register(); await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: fromB64u(VAPID) })
      const j = sub.toJSON()
      const { error } = await supabase.from('push_subscriptions').upsert({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, label: deviceLabel() }, { onConflict: 'endpoint' })
      if (error) { await sub.unsubscribe().catch(() => {}); throw new Error(/push_subscriptions|schema cache/i.test(error.message) ? at('Chưa có bảng lưu thiết bị: chạy supabase/migration-push.sql.') : error.message) }
      setMine(sub); reload(); toast(a('Đã bật thông báo đẩy trên thiết bị này'))
    } catch (e) { toast(e.message || String(e), 'error') }
    setBusy('')
  }
  const remove = async row => {
    setBusy(`rm-${row.id}`)
    if (mine && row.endpoint === mine.endpoint) { await mine.unsubscribe().catch(() => {}); setMine(false) }
    const { error } = await supabase.from('push_subscriptions').delete().eq('id', row.id)
    setBusy(''); setConfirm(null); if (error) return toast(error.message, 'error')
    reload(); toast(a('Đã gỡ thiết bị'))
  }
  const test = async () => {
    setBusy('test')
    try {
      const { data, error } = await supabase.functions.invoke('gui-tin-nhan', { body: { action: 'test-push' } })
      if (error) throw error
      const why = { 'no-key': a('Máy chủ chưa có khóa VAPID (bước 4).'), 'no-device': a('Chưa có thiết bị nào bật.'), failed: a('Gửi chưa được, xem nhật ký hàm gui-tin-nhan trên Supabase.') }
      data?.sent ? toast(a('Đã gửi tới {n} thiết bị', { n: data.sent })) : toast(why[data?.reason] || a('Hàm gui-tin-nhan chưa có bản mới (bước 5).'), 'error')
    } catch (e) { toast(a('Chưa gửi được: {msg}', { msg: e.message || String(e) }), 'error') }
    setBusy('')
  }

  const mineRow = mine && list?.find(r => r.endpoint === mine.endpoint)
  return (
    <section className="rounded-xl border border-line bg-card">
      <header className="border-b border-line px-5 py-4">
        <div className="flex items-center gap-2"><h2 className="font-semibold">{a('Thông báo đẩy')}</h2><Help /></div>
        <p className="text-xs text-muted">{a('Nhận thông báo trên điện thoại / máy tính kể cả khi đã đóng Admin. Bật riêng trên từng thiết bị.')}</p>
      </header>
      <div className="space-y-4 p-5">
        {demoMode ? <p className="text-sm text-[#f8d27c]">{a('Bản demo không gửi thông báo đẩy thật. Bấm nút "?" để xem cách bật khi đưa web lên.')}</p>
          : !VAPID ? <p className="text-sm text-[#f8d27c]">{a('Chưa đặt khóa VITE_VAPID_PUBLIC_KEY cho web. Bấm nút "?" và làm bước 2–3.')}</p>
          : !ok ? <p className="text-sm text-muted">{a('Trình duyệt này không hỗ trợ thông báo đẩy.')}</p>
          : iosNeedsHome ? <p className="text-sm text-[#f8d27c]">{a('iPhone / iPad: cần thêm Admin vào Màn hình chính rồi mở từ biểu tượng đó (bấm "?" bước 6).')}</p>
          : (
            <div className="flex flex-wrap items-center gap-3">
              {mine
                ? <span className="rounded-full bg-[#3ddc97]/12 px-2.5 py-1 text-xs font-medium text-[#5fe3a9]">{a('Đang bật trên thiết bị này')}</span>
                : <button onClick={enable} disabled={!!busy || mine === null} className={`${btn} ${grad}`}>{busy === 'on' ? a('Đang bật…') : a('Bật trên thiết bị này')}</button>}
              <button onClick={test} disabled={!!busy || !list?.length} className={ghost}>{busy === 'test' ? a('Đang gửi…') : a('Gửi thử tới tất cả thiết bị')}</button>
            </div>
          )}
        {list?.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-muted">{a('Thiết bị đang nhận ({n})', { n: list.length })}</p>
            <ul className="divide-y divide-line/70 rounded-lg border border-line">
              {list.map(r => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
                  <span className="min-w-0 flex-1 truncate">{r.label || a('Thiết bị')}{mineRow?.id === r.id && <span className="ml-2 text-xs text-[#5fe3a9]">{a('(thiết bị này)')}</span>}</span>
                  <span className="text-xs text-muted">{a('Bật ngày {date}', { date: when(r.created_at) })}</span>
                  {confirm === r.id
                    ? <span className="flex gap-1 text-xs"><button onClick={() => remove(r)} disabled={!!busy} className="rounded bg-red-500/80 px-2 py-1 font-semibold text-white">{a('Gỡ')}</button><button onClick={() => setConfirm(null)} className="rounded px-2 py-1 text-muted hover:bg-white/10">{a('Hủy')}</button></span>
                    : <button onClick={() => setConfirm(r.id)} className={`${ghost} px-2.5 py-1 text-xs hover:border-red-500/50 hover:text-red-300`}>{a('Gỡ')}</button>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
