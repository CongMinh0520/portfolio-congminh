// Khối Liên hệ cuối trang chủ: thông tin liên hệ + form gửi tin nhắn (có Cloudflare Turnstile chống spam).
// Tin nhắn được lưu và xem trong Admin → Tin nhắn.
import { useEffect, useRef, useState } from 'react'
import { demoMode, insertRow } from './api.js'
import { useT } from './i18n.js'

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || ''
const FN_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '') + '/functions/v1/gui-tin-nhan'
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const grad = 'bg-gradient-to-r from-pink to-purple'
const input = 'w-full rounded-xl border border-line bg-[#0b0d16] px-4 py-3 text-[15px] text-white outline-none transition placeholder:text-[#5d6180] focus:border-purple focus:ring-2 focus:ring-purple/25'

let turnstileLoading
const loadTurnstile = () => turnstileLoading ||= new Promise((ok, fail) => {
  if (window.turnstile) return ok(window.turnstile)
  const s = document.createElement('script')
  s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
  s.async = true; s.onload = () => ok(window.turnstile); s.onerror = fail
  document.head.appendChild(s)
})

/** Ô chống spam: Turnstile thật khi có site key; bản demo dùng ô xác nhận giả lập */
function Captcha({ onToken, resetKey }) {
  const { t, lang } = useT()
  const box = useRef(null); const wid = useRef(null)
  const [demoOk, setDemoOk] = useState(false); const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (demoMode || !SITE_KEY) return
    let alive = true; setFailed(false)
    loadTurnstile().then(ts => {
      if (!alive || !box.current) return
      if (wid.current != null) ts.remove(wid.current)
      box.current.innerHTML = ''
      wid.current = ts.render(box.current, {
        sitekey: SITE_KEY, theme: 'dark', language: lang,
        callback: t => onToken(t), 'expired-callback': () => onToken(''), 'error-callback': () => onToken(''),
      })
    }).catch(() => { turnstileLoading = null; if (alive) { setFailed(true); onToken('') } })
    return () => { alive = false; if (wid.current != null) try { window.turnstile?.remove(wid.current) } catch {} wid.current = null }
  }, [resetKey, lang])
  useEffect(() => { setDemoOk(false) }, [resetKey])
  if (demoMode || !SITE_KEY) return (
    <button type="button" onClick={() => { setDemoOk(true); onToken('demo') }} aria-pressed={demoOk}
      className="flex w-full max-w-[300px] items-center gap-3 rounded-xl border border-line bg-[#0b0d16] px-4 py-3 text-left text-sm transition hover:border-[#3a3f5a]">
      <span className={`grid size-6 flex-none place-items-center rounded-md border-2 ${demoOk ? 'border-[#3ddc97] bg-[#3ddc97] text-[#07080f]' : 'border-[#5d6180]'}`}>{demoOk ? '✓' : ''}</span>
      <span className="min-w-0 flex-1">{demoOk ? t('ct.robot.ok') : t('ct.robot')}<span className="block text-[11px] text-muted">{demoMode ? t('ct.robot.demo') : t('ct.robot.nokey')}</span></span>
    </button>
  )
  return <>
    <div ref={box} className={failed ? 'hidden' : 'min-h-[65px]'} />
    {failed && <p className="max-w-[420px] rounded-xl border border-[#f8d27c]/40 bg-[#f8d27c]/10 px-4 py-3 text-sm text-[#f8d27c]">{t('ct.robot.fail')}</p>}
  </>
}

export default function Contact({ settings: s, socials = [] }) {
  const { t } = useT()
  const [f, setF] = useState({ name: '', email: '', message: '', website: '' })
  const [err, setErr] = useState({}); const [token, setToken] = useState('')
  const [state, setState] = useState('idle'); const [msg, setMsg] = useState(''); const [round, setRound] = useState(0)
  const set = k => e => { setF({ ...f, [k]: e.target.value }); setErr({ ...err, [k]: '' }) }

  const submit = async e => {
    e.preventDefault()
    const v = {}
    if (!f.name.trim()) v.name = t('ct.e.name')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) v.email = t('ct.e.email')
    if (f.message.trim().length < 5) v.message = t('ct.e.msg')
    if (!token) v.captcha = t('ct.e.captcha')
    setErr(v); if (Object.keys(v).length) return
    setState('sending'); setMsg('')
    try {
      const payload = { name: f.name.trim(), email: f.email.trim(), message: f.message.trim(), website: f.website, page: location.href }
      if (demoMode) {
        if (!payload.website) {
          const { error } = await insertRow('messages', { ...payload, website: undefined, created_at: new Date().toISOString(), read: false, user_agent: navigator.userAgent.slice(0, 300) })
          if (error) throw new Error(error.message)
        }
      } else {
        const r = await fetch(FN_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: `Bearer ${ANON}` }, body: JSON.stringify({ ...payload, token }) }).catch(() => null)
        if (!r) throw new Error(t('ct.e.fail')) // mất mạng / không gọi được máy chủ
        const d = await r.json().catch(() => ({}))
        if (!r.ok || !d.ok) { const k = `ct.srv.${d.code}`, m = t(k); throw new Error(m !== k ? m : d.error || t('ct.e.fail')) }
      }
      setState('done'); setF({ name: '', email: '', message: '', website: '' }); setToken(''); setRound(x => x + 1)
    } catch (ex) {
      setState('error'); setMsg(ex.message || t('ct.e.fail')); setToken(''); setRound(x => x + 1)
    }
  }

  const tel = (s.phone || '').replace(/[^\d+]/g, '')
  const field = (k, label, el) => (
    <div>
      <label htmlFor={`ct-${k}`} className="mb-1.5 block text-sm font-medium">{label} <span className="text-pink">*</span></label>
      {el}
      {err[k] && <p className="mt-1.5 text-xs text-red-300">{err[k]}</p>}
    </div>
  )

  return (
    <div className="grid overflow-hidden rounded-3xl border border-line bg-card md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="bg-[radial-gradient(500px_300px_at_0%_0%,#6650ff40,transparent_70%)] p-7 sm:p-10">
        <p className="text-[11px] font-bold tracking-[2px] text-pink">{t('ct.label')}</p>
        <h2 className="mt-2.5 text-[clamp(26px,3.6vw,40px)] font-bold leading-[1.12] tracking-tight [text-wrap:balance]">{t('ct.title')}</h2>
        <p className="mt-4 max-w-[420px] leading-relaxed text-muted">{t('ct.text')}</p>
        <ul className="mt-8 space-y-3 text-sm">
          {s.email && <li className="flex items-center gap-3"><span className="grid size-9 flex-none place-items-center rounded-lg bg-white/5">✉️</span><a href={`mailto:${s.email}`} className="break-all transition hover:text-pink">{s.email}</a></li>}
          {s.phone && <li className="flex items-center gap-3"><span className="grid size-9 flex-none place-items-center rounded-lg bg-white/5">📞</span><a href={`tel:${tel}`} className="transition hover:text-pink">{s.phone}</a></li>}
          {s.address && <li className="flex items-center gap-3"><span className="grid size-9 flex-none place-items-center rounded-lg bg-white/5">📍</span><span className="text-muted">{s.address}</span></li>}
        </ul>
        {socials.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {socials.map(x => <a key={x.id} href={x.url} target="_blank" rel="noreferrer" className="rounded-full border border-line px-3.5 py-1.5 text-[13px] text-[#c9cbd8] transition hover:border-purple hover:bg-purple/15 hover:text-white">{x.label} ↗</a>)}
          </div>
        )}
      </div>

      <div className="border-t border-line p-7 sm:p-10 md:border-l md:border-t-0">
        {state === 'done' ? (
          <div className="grid h-full place-items-center py-10 text-center">
            <div>
              <span className="mx-auto grid size-14 place-items-center rounded-full bg-[#3ddc97]/15 text-2xl text-[#5fe3a9]">✓</span>
              <h3 className="mt-5 text-xl font-semibold">{t('ct.done')}</h3>
              <p className="mt-2 text-muted">{t('ct.done.text')}</p>
              <button onClick={() => setState('idle')} className="mt-6 rounded-xl border border-line px-5 py-2.5 text-sm font-semibold transition hover:border-purple hover:bg-purple/10">{t('ct.again')}</button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="space-y-5">
            <div>
              <h3 className="text-xl font-semibold">{t('ct.form')}</h3>
              <p className="mt-1 text-sm text-muted">{t('ct.req').split('*')[0]}<span className="text-pink">*</span>{t('ct.req').split('*')[1]}</p>
            </div>
            {field('name', t('ct.name'), <input id="ct-name" autoComplete="name" className={input} value={f.name} onChange={set('name')} placeholder={t('ct.ph.name')} />)}
            {field('email', t('ct.email'), <input id="ct-email" type="email" autoComplete="email" className={input} value={f.email} onChange={set('email')} placeholder={t('ct.ph.email')} />)}
            {field('message', t('ct.msg'), <textarea id="ct-message" rows={5} className={input} value={f.message} onChange={set('message')} placeholder={t('ct.ph.msg')} />)}
            {/* Ô bẫy cho bot: người thật không thấy, không điền */}
            <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" value={f.website} onChange={set('website')} className="absolute -left-[9999px] h-0 w-0 opacity-0" />
            <div>
              <Captcha onToken={t => { setToken(t); setErr(e => ({ ...e, captcha: '' })) }} resetKey={round} />
              {err.captcha && <p className="mt-1.5 text-xs text-red-300">{err.captcha}</p>}
            </div>
            {state === 'error' && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{msg}</p>}
            <button disabled={state === 'sending'} className={`${grad} w-full rounded-xl px-6 py-3.5 text-sm font-semibold shadow-[0_10px_30px_#6650ff55] transition hover:-translate-y-0.5 disabled:opacity-60 sm:w-auto`}>
              {state === 'sending' ? t('ct.sending') : t('ct.send')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
