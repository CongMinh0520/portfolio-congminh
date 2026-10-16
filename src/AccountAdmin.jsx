// Admin → Tài khoản của tôi: tên hiển thị, ảnh đại diện, đổi email, đổi mật khẩu, đăng xuất.
// Hồ sơ lưu trong user_metadata của Supabase Auth (không cần thêm bảng).
import { useEffect, useState } from 'react'
import { supabase, demoMode } from './supabase.js'
import { ImageField } from './HeroAdmin.jsx'
import { autoAvatar } from './autoArt.js'
import { ADMIN_LANGS, setAdminLang, useAdminLang, useA, adminLocale } from './adminLang.js'

const grad = 'bg-gradient-to-r from-pink to-purple'
const input = 'w-full rounded-lg border border-line bg-[#0b0d16] px-3 py-2.5 text-sm outline-none transition focus:border-purple focus:ring-2 focus:ring-purple/25'
const btn = 'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition disabled:opacity-50'
const ghost = `${btn} border border-line text-[#c9cbd8] hover:border-[#3a3f5a] hover:bg-white/5 hover:text-white`
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Tên và ảnh hiển thị của người đang đăng nhập (dùng ở sidebar và trang này) */
export function profileOf(user) {
  const meta = user?.user_metadata || {}
  const email = user?.email || ''
  const name = (meta.name || '').trim()
  const initials = (name || email).split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
  return { name, email, initials, avatar: meta.avatar || '', fallback: autoAvatar({ seed: email || 'x', text: initials }) }
}

const Card = ({ title, hint, children }) => (
  <section className="rounded-xl border border-line bg-card">
    <header className="border-b border-line px-5 py-4"><h2 className="font-semibold">{title}</h2>{hint && <p className="text-xs text-muted">{hint}</p>}</header>
    <div className="space-y-4 p-5">{children}</div>
  </section>
)
const Field = ({ id, label, children, err }) => (
  <div className="min-w-0">
    <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-muted">{label}</label>{children}
    {err && <p className="mt-1.5 text-xs text-red-300">{err}</p>}
  </div>
)
function Password({ id, value, onChange, show, autoComplete }) {
  return <input id={id} type={show ? 'text' : 'password'} autoComplete={autoComplete} className={input} value={value} onChange={e => onChange(e.target.value)} />
}

/** Xác thực 2 bước (TOTP): thêm app xác thực bằng mã QR, xem và gỡ thiết bị đã thêm */
function MfaCard({ toast, onChange }) {
  const a = useA()
  const [factors, setFactors] = useState(null); const [enroll, setEnroll] = useState(null)
  const [name, setName] = useState(''); const [code, setCode] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const load = async () => {
    const { data, error } = await supabase.auth.mfa.listFactors()
    if (error) { setErr(error.message); return [] }
    const list = (data?.all || []).filter(f => f.factor_type === 'totp')
    setFactors(list.filter(f => f.status === 'verified')); onChange?.(list.some(f => f.status === 'verified'))
    return list
  }
  useEffect(() => { load() }, [])
  const start = async () => {
    setBusy(true); setErr('')
    // Dọn các lần thêm bỏ dở (chưa nhập mã) để Supabase không báo trùng tên
    const list = await load()
    for (const f of list.filter(f => f.status !== 'verified')) await supabase.auth.mfa.unenroll({ factorId: f.id })
    const label = name.trim() || a('App xác thực {n}', { n: list.filter(f => f.status === 'verified').length + 1 })
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: label, issuer: location.hostname })
    setBusy(false); if (error) return setErr(error.message)
    setEnroll(data); setCode('')
  }
  const cancel = async () => { if (enroll) await supabase.auth.mfa.unenroll({ factorId: enroll.id }); setEnroll(null); setErr(''); setName('') }
  const verify = async e => {
    e.preventDefault()
    const v = code.replace(/\s/g, '')
    if (!/^\d{6}$/.test(v)) return setErr(a('Nhập đủ 6 chữ số.'))
    setBusy(true); setErr('')
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enroll.id, code: v })
    setBusy(false); if (error) return setErr(a('Mã không đúng hoặc đã hết hạn.'))
    setEnroll(null); setName(''); await load(); toast(a('Đã bật xác thực 2 bước'))
  }
  const remove = async f => {
    const last = factors.length === 1
    if (!window.confirm(last ? a('Gỡ {name}? Đây là thiết bị cuối cùng, đăng nhập sẽ chỉ còn cần mật khẩu.', { name: f.friendly_name }) : a('Gỡ {name}?', { name: f.friendly_name }))) return
    const { error } = await supabase.auth.mfa.unenroll({ factorId: f.id })
    if (error) return toast(error.message, 'error')
    await load(); toast(last ? a('Đã tắt xác thực 2 bước') : a('Đã gỡ thiết bị'))
  }
  const on = factors?.length > 0
  return (
    <Card title={a('Xác thực 2 bước')} hint={a('Ngoài mật khẩu, mỗi lần đăng nhập cần thêm mã 6 số trong app xác thực trên điện thoại (Google Authenticator, Authy, 1Password…).')}>
      {factors === null ? <p className="text-sm text-muted">{a('Đang tải…')}</p> : (
        <p className={`rounded-lg border px-3 py-2 text-sm ${on ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-[#f8d27c]/40 bg-[#f8d27c]/10 text-[#f8d27c]'}`}>
          {on ? a('Đang bật. Đăng nhập cần mật khẩu và mã xác thực.') : a('Đang tắt. Ai biết mật khẩu là vào được Admin, nên bật.')}
        </p>
      )}
      {on && (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {factors.map(f => (
            <li key={f.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
              <span className="min-w-0"><b className="block truncate">{f.friendly_name || f.id.slice(0, 8)}</b><span className="text-xs text-muted">{a('Thêm ngày {d}', { d: new Date(f.created_at).toLocaleDateString(adminLocale()) })}</span></span>
              <button type="button" onClick={() => remove(f)} className={`${ghost} hover:border-red-500/50 hover:text-red-300`}>{a('Gỡ')}</button>
            </li>
          ))}
        </ul>
      )}
      {enroll ? (
        <form onSubmit={verify} noValidate className="space-y-4 rounded-lg border border-line p-4">
          <p className="text-sm">{a('1. Mở app xác thực, chọn thêm tài khoản rồi quét mã QR (hoặc nhập khóa bên dưới).')}</p>
          <div className="flex flex-wrap items-start gap-4">
            {enroll.totp.qr_code && <img src={enroll.totp.qr_code} alt={a('Mã QR xác thực 2 bước')} className="size-44 rounded-lg bg-white p-2" />}
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="text-xs text-muted">{a('Khóa bí mật (nhập tay nếu không quét được):')}</p>
              <code className="block break-all rounded-lg border border-line bg-[#0b0d16] px-3 py-2 font-mono text-sm">{enroll.totp.secret}</code>
              {demoMode && <p className="text-xs text-muted">{a('Bản demo không có mã QR; nhập khóa này vào app xác thực.')}</p>}
            </div>
          </div>
          <Field id="mfa-new-code" label={a('2. Nhập mã 6 số app đang hiện')} err={err}>
            <input id="mfa-new-code" className={`${input} max-w-[200px] text-center font-mono tracking-[0.3em]`} inputMode="numeric" autoComplete="one-time-code" maxLength={7}
              value={code} onChange={e => { setCode(e.target.value); setErr('') }} placeholder="000000" />
          </Field>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={cancel} className={ghost}>{a('Hủy')}</button>
            <button disabled={busy || !code.trim()} className={`${btn} ${grad}`}>{busy ? a('Đang kiểm tra…') : a('Xác nhận và bật')}</button>
          </div>
        </form>
      ) : factors !== null && (
        <div className="space-y-3">
          {err && <p className="text-xs text-red-300">{err}</p>}
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px] flex-1"><Field id="mfa-name" label={a('Tên thiết bị (để nhận ra khi gỡ)')}>
              <input id="mfa-name" className={input} value={name} maxLength={40} placeholder={a('VD: iPhone của Minh')} onChange={e => setName(e.target.value)} />
            </Field></div>
            <button type="button" disabled={busy} onClick={start} className={on ? ghost : `${btn} ${grad}`}>{busy ? a('Đang tạo…') : on ? a('Thêm thiết bị khác') : a('Bật xác thực 2 bước')}</button>
          </div>
        </div>
      )}
    </Card>
  )
}

export default function AccountAdmin({ session, toast }) {
  const a = useA()
  const user = session.user, me = profileOf(user)

  /* ---- Hồ sơ ---- */
  const [name, setName] = useState(me.name); const [avatar, setAvatar] = useState(me.avatar); const [busyP, setBusyP] = useState(false)
  useEffect(() => { setName(me.name); setAvatar(me.avatar) }, [user.id])
  const dirtyP = name.trim() !== me.name || avatar !== me.avatar
  const saveProfile = async e => {
    e.preventDefault(); setBusyP(true)
    const { error } = await supabase.auth.updateUser({ data: { name: name.trim(), avatar } })
    setBusyP(false); if (error) return toast(error.message, 'error')
    toast(a('Đã lưu hồ sơ'))
  }

  /* ---- Ngôn ngữ trang Admin: đổi ngay, lưu theo tài khoản ---- */
  const adminLang = useAdminLang()
  const chooseAdminLang = async l => {
    if (l === adminLang) return
    setAdminLang(l)
    const { error } = await supabase.auth.updateUser({ data: { admin_lang: l } })
    if (error) toast(error.message, 'error')
  }

  /* ---- Email ---- */
  const [email, setEmail] = useState(''); const [errE, setErrE] = useState(''); const [busyE, setBusyE] = useState(false); const [sentTo, setSentTo] = useState('')
  const pending = user.new_email || sentTo
  const saveEmail = async e => {
    e.preventDefault()
    const v = email.trim().toLowerCase()
    if (!EMAIL_RE.test(v)) return setErrE(a('Email chưa đúng định dạng, VD ten@gmail.com.'))
    if (v === user.email) return setErrE(a('Đây đang là email hiện tại.'))
    setErrE(''); setBusyE(true)
    const { error } = await supabase.auth.updateUser({ email: v }, { emailRedirectTo: `${location.origin}/admin/tai-khoan` })
    setBusyE(false); if (error) return setErrE(error.message)
    setEmail('')
    if (demoMode) toast(a('Đã đổi email đăng nhập'))
    else { setSentTo(v); toast(a('Đã gửi thư xác nhận')) }
  }

  /* ---- Mật khẩu ---- */
  // Đã bật xác thực 2 bước: hỏi mã 6 số thay cho mật khẩu cũ (đăng nhập lại để kiểm tra sẽ hạ phiên về aal1)
  const [mfaOn, setMfaOn] = useState(false)
  const [pw, setPw] = useState({ cur: '', next: '', again: '' }); const [show, setShow] = useState(false)
  const [errW, setErrW] = useState({}); const [busyW, setBusyW] = useState(false)
  const setP = k => v => { setPw(p => ({ ...p, [k]: v })); setErrW(x => ({ ...x, [k]: '' })) }
  const savePassword = async e => {
    e.preventDefault()
    const v = {}
    if (mfaOn ? !/^\d{6}$/.test(pw.cur.replace(/\s/g, '')) : !pw.cur) v.cur = mfaOn ? a('Nhập đủ 6 chữ số.') : a('Nhập mật khẩu đang dùng.')
    if (pw.next.length < 8) v.next = a('Mật khẩu mới cần ít nhất 8 ký tự.')
    else if (!mfaOn && pw.next === pw.cur) v.next = a('Mật khẩu mới phải khác mật khẩu cũ.')
    if (pw.again !== pw.next) v.again = a('Hai ô mật khẩu mới chưa giống nhau.')
    setErrW(v); if (Object.keys(v).length) return
    setBusyW(true)
    // Kiểm tra lại mật khẩu cũ trước khi đổi, phòng khi ai đó dùng máy đang đăng nhập sẵn
    if (mfaOn) {
      const { data: f } = await supabase.auth.mfa.listFactors()
      const fid = f?.totp?.[0]?.id
      const check = fid ? await supabase.auth.mfa.challengeAndVerify({ factorId: fid, code: pw.cur.replace(/\s/g, '') }) : { error: true }
      if (check.error) { setBusyW(false); return setErrW({ cur: a('Mã không đúng hoặc đã hết hạn.') }) }
    } else {
      const check = await supabase.auth.signInWithPassword({ email: user.email, password: pw.cur })
      if (check.error) { setBusyW(false); return setErrW({ cur: a('Mật khẩu đang dùng không đúng.') }) }
    }
    const { error } = await supabase.auth.updateUser({ password: pw.next })
    setBusyW(false); if (error) return setErrW({ next: error.message })
    setPw({ cur: '', next: '', again: '' }); setShow(false); toast(a('Đã đổi mật khẩu'))
  }

  return (
    <div className="mx-auto max-w-[720px] space-y-5 pb-16">
      <Card title={a('Hồ sơ')} hint={a('Tên và ảnh hiện ở góc dưới menu Admin. Không hiện ra trang công khai.')}>
        <form onSubmit={saveProfile} className="space-y-4">
          <Field id="acc-avatar" label={a('Ảnh đại diện')}>
            <ImageField id="acc-avatar" round value={avatar} fallback={me.fallback} onChange={setAvatar} toast={toast} />
          </Field>
          <Field id="acc-name" label={a('Tên hiển thị')}>
            <input id="acc-name" className={input} value={name} maxLength={60} placeholder={a('VD: Công Minh')} onChange={e => setName(e.target.value)} />
          </Field>
          <div className="flex justify-end"><button disabled={busyP || !dirtyP} className={`${btn} ${grad}`}>{busyP ? a('Đang lưu…') : a('Lưu hồ sơ')}</button></div>
        </form>
      </Card>

      <Card title={a('Ngôn ngữ trang Admin')} hint={a('Chỉ đổi chữ trong Admin cho tài khoản này. Trang chủ chỉnh ở Cài đặt → Ngôn ngữ.')}>
        <div role="radiogroup" aria-label={a('Ngôn ngữ trang Admin')} className="flex flex-wrap gap-2">
          {ADMIN_LANGS.map(([k, label]) => (
            <button key={k} type="button" role="radio" aria-checked={adminLang === k} onClick={() => chooseAdminLang(k)}
              className={`rounded-lg border px-4 py-2 text-sm transition ${adminLang === k ? 'border-purple bg-purple/15 font-semibold text-white' : 'border-line text-muted hover:text-white'}`}>{label}</button>
          ))}
        </div>
      </Card>

      <Card title={a('Email đăng nhập')} hint={demoMode ? a('Bản demo: đổi là có hiệu lực ngay.') : a('Supabase gửi thư xác nhận tới cả email cũ và email mới; bấm link trong thư mới đổi xong.')}>
        <p className="text-sm">{a('Đang dùng:')} <b className="break-all">{user.email}</b></p>
        {pending && pending !== user.email && <p className="rounded-lg border border-[#f8d27c]/40 bg-[#f8d27c]/10 px-3 py-2 text-sm text-[#f8d27c]">{a('Đang chờ xác nhận đổi sang')} <b className="break-all">{pending}</b>. {a('Mở hộp thư (cả email cũ và mới) và bấm link xác nhận.')}</p>}
        <form onSubmit={saveEmail} noValidate className="space-y-4">
          <Field id="acc-email" label={a('Email mới')} err={errE}>
            <input id="acc-email" type="email" autoComplete="email" className={input} value={email} placeholder="ten@gmail.com" onChange={e => { setEmail(e.target.value); setErrE('') }} />
          </Field>
          <div className="flex justify-end"><button disabled={busyE || !email.trim()} className={ghost}>{busyE ? a('Đang gửi…') : a('Đổi email')}</button></div>
        </form>
      </Card>

      <Card title={a('Mật khẩu')} hint={a('Ít nhất 8 ký tự. Nên dùng cụm từ dài, khác mật khẩu ở nơi khác.')}>
        <form onSubmit={savePassword} className="space-y-4">
          <input type="email" autoComplete="username" value={user.email} readOnly hidden />
          {mfaOn
            ? <Field id="acc-pw-cur" label={a('Mã xác thực 6 số (thay cho mật khẩu cũ)')} err={errW.cur}><input id="acc-pw-cur" className={`${input} max-w-[200px] font-mono tracking-[0.3em]`} inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={pw.cur} onChange={e => setP('cur')(e.target.value)} /></Field>
            : <Field id="acc-pw-cur" label={a('Mật khẩu đang dùng')} err={errW.cur}><Password id="acc-pw-cur" value={pw.cur} onChange={setP('cur')} show={show} autoComplete="current-password" /></Field>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="acc-pw-new" label={a('Mật khẩu mới')} err={errW.next}><Password id="acc-pw-new" value={pw.next} onChange={setP('next')} show={show} autoComplete="new-password" /></Field>
            <Field id="acc-pw-again" label={a('Nhập lại mật khẩu mới')} err={errW.again}><Password id="acc-pw-again" value={pw.again} onChange={setP('again')} show={show} autoComplete="new-password" /></Field>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted"><input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)} className="accent-[#6650ff]" />{a('Hiện mật khẩu')}</label>
            <button disabled={busyW || !pw.cur || !pw.next} className={`${btn} ${grad}`}>{busyW ? a('Đang đổi…') : a('Đổi mật khẩu')}</button>
          </div>
        </form>
      </Card>

      <MfaCard toast={toast} onChange={setMfaOn} />

      <Card title={a('Đăng xuất')} hint={a('Thoát khỏi Admin trên trình duyệt này.')}>
        <button onClick={() => supabase.auth.signOut()} className={`${ghost} hover:border-red-500/50 hover:text-red-300`}>{a('Đăng xuất')}</button>
      </Card>
    </div>
  )
}
