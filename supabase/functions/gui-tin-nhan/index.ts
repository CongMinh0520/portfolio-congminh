// Supabase Edge Function: nhận form Liên hệ trên trang chủ, kiểm tra Cloudflare Turnstile rồi lưu vào bảng messages.
// Địa chỉ: https://<project-ref>.supabase.co/functions/v1/gui-tin-nhan
// Secret cần đặt: TURNSTILE_SECRET (Secret key của Turnstile trên Cloudflare).
// Gửi email báo (không bắt buộc): RESEND_API_KEY, RESEND_FROM, SITE_URL.
// Thông báo đẩy (không bắt buộc): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.
// SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY được Supabase tự cung cấp. Giữ nguyên "Verify JWT" (website gửi kèm anon key).

import { createClient } from 'npm:@supabase/supabase-js@2.49.4'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
// `code` để trang hiện lỗi đúng ngôn ngữ khách đang xem; `error` là câu tiếng Việt dự phòng
const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

/* ---------- Email báo qua Resend (bật/tắt ở Admin → Cài đặt → Thông báo) ----------
   Secrets: RESEND_API_KEY (bắt buộc để gửi), RESEND_FROM (địa chỉ gửi; tên người gửi chỉnh ở Admin), SITE_URL (nút mở Admin).
   Thiếu khóa hoặc đang tắt thì bỏ qua, không làm hỏng việc chính. */
const escHtml = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c])
async function sendMail(db: any, event: 'message' | 'post', m: { subject: string, heading: string, rows: [string, string][], body?: string, replyTo?: string, path: string, button: string }) {
  try {
    const key = Deno.env.get('RESEND_API_KEY')
    if (!key) return 'no-key'
    const { data: s } = await db.from('settings').select('email').eq('id', 1).maybeSingle()
    const { data: a } = await db.from('admin_settings').select('notify').eq('id', 1).maybeSingle()
    const n = (a?.notify && typeof a.notify === 'object') ? a.notify : {}
    const on = n.events?.[event]?.email ?? (event === 'message')
    const to = String(n.email_to || s?.email || '').trim()
    if (!on || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return 'off'
    const site = (Deno.env.get('SITE_URL') || '').replace(/\/+$/, '')
    const rows = m.rows.map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;white-space:nowrap">${escHtml(k)}</td><td style="padding:4px 0;color:#111827">${escHtml(v)}</td></tr>`).join('')
    const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827">
<div style="height:4px;border-radius:4px;background:linear-gradient(90deg,#e94b9e,#6650ff);margin-bottom:20px"></div>
<h2 style="margin:0 0 16px;font-size:20px">${escHtml(m.heading)}</h2>
<table style="border-collapse:collapse;font-size:14px;margin-bottom:16px">${rows}</table>
${m.body ? `<div style="white-space:pre-wrap;font-size:15px;line-height:1.6;background:#f3f4f6;border-radius:10px;padding:14px 16px;margin-bottom:20px">${escHtml(m.body)}</div>` : ''}
${site ? `<a href="${escHtml(site + m.path)}" style="display:inline-block;background:#6650ff;color:#fff;text-decoration:none;font-weight:bold;padding:10px 18px;border-radius:8px">${escHtml(m.button)}</a>` : ''}
<p style="margin-top:24px;font-size:12px;color:#9ca3af">Email tự động từ web portfolio. Tắt ở Admin → Cài đặt → Thông báo.</p></div>`
    // Tên người gửi chỉnh ở Admin; RESEND_FROM chỉ cần địa chỉ (có sẵn "Tên <địa chỉ>" thì tên ở Admin được ưu tiên)
    const base = (Deno.env.get('RESEND_FROM') || 'onboarding@resend.dev').trim()
    const addr = base.match(/<([^>]+)>/)?.[1] || base
    const fromName = String(n.email_from_name || '').replace(/[<>"\r\n]/g, '').trim().slice(0, 60)
    const from = fromName ? `"${fromName}" <${addr}>` : base
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject: m.subject, html, ...(m.replyTo ? { reply_to: m.replyTo } : {}) }),
      signal: AbortSignal.timeout(8000),
    })
    if (!r.ok) console.error('Resend', r.status, await r.text().catch(() => ''))
    return r.ok ? 'sent' : `error ${r.status}`
  } catch (e) { console.error('Resend', e); return 'error' }
}

/* ---------- Thông báo đẩy (Web Push) tới điện thoại / máy tính đã bật ở Admin → Cài đặt → Thông báo ----------
   Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (VD mailto:ban@gmail.com). Thiếu khóa hoặc đang tắt thì bỏ qua. */
async function sendPush(db: any, event: 'message' | 'post' | 'test', p: { title: string, body: string, path: string }) {
  try {
    const pub = Deno.env.get('VAPID_PUBLIC_KEY'), priv = Deno.env.get('VAPID_PRIVATE_KEY')
    if (!pub || !priv) return { sent: 0, reason: 'no-key' }
    if (event !== 'test') {
      const { data: a } = await db.from('admin_settings').select('notify').eq('id', 1).maybeSingle()
      const on = a?.notify?.events?.[event]?.push ?? true
      if (!on) return { sent: 0, reason: 'off' }
    }
    const { data: subs } = await db.from('push_subscriptions').select('id, endpoint, p256dh, auth')
    if (!subs?.length) return { sent: 0, reason: 'no-device' }
    const webpush = (await import('npm:web-push@3.6.7')).default
    webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com', pub, priv)
    const payload = JSON.stringify({ title: p.title.slice(0, 120), body: p.body.slice(0, 200), url: p.path, tag: `cm-${event}` })
    let sent = 0
    await Promise.all(subs.map(async (s: any) => {
      try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400 }); sent++ }
      catch (e: any) {
        // Thiết bị đã gỡ quyền / hết hạn: xóa khỏi danh sách
        if (e?.statusCode === 404 || e?.statusCode === 410) await db.from('push_subscriptions').delete().eq('id', s.id)
        else console.error('Push', e?.statusCode, e?.body || e?.message)
      }
    }))
    return { sent, reason: sent ? 'ok' : 'failed' }
  } catch (e) { console.error('Push', e); return { sent: 0, reason: 'error' } }
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json(405, { code: 'method', error: 'Chỉ nhận POST' })

  let b: any
  try { b = await req.json() } catch { return json(400, { code: 'invalid', error: 'Dữ liệu gửi lên không hợp lệ.' }) }
  if (b?.website) return json(200, { ok: true }) // ô bẫy (honeypot): bot điền vào thì bỏ qua, không lưu

  // Admin bấm "Gửi thử" thông báo đẩy: chỉ người đã đăng nhập Admin (token thật) mới gọi được
  if (b?.action === 'test-push') {
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
    const { data: u } = await db.auth.getUser(token).catch(() => ({ data: null }))
    if (!u?.user) return json(401, { code: 'auth', error: 'Cần đăng nhập Admin.' })
    return json(200, await sendPush(db, 'test', { title: 'Thông báo thử từ Admin', body: 'Thông báo đẩy đã chạy trên thiết bị này.', path: '/admin/thong-bao' }))
  }

  const name = String(b?.name || '').trim().slice(0, 120)
  const email = String(b?.email || '').trim().slice(0, 200)
  const message = String(b?.message || '').trim().slice(0, 5000)
  if (!name || !message) return json(400, { code: 'required', error: 'Vui lòng nhập họ tên và nội dung.' })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { code: 'email', error: 'Email chưa đúng định dạng.' })

  // Kiểm tra ô chống spam Cloudflare Turnstile
  const secret = Deno.env.get('TURNSTILE_SECRET')
  if (!secret) return json(500, { code: 'config', error: 'Máy chủ chưa đặt TURNSTILE_SECRET.' })
  const form = new FormData()
  form.append('secret', secret); form.append('response', String(b?.token || ''))
  const ip = req.headers.get('CF-Connecting-IP') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  if (ip) form.append('remoteip', ip)
  const check = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form }).then(r => r.json()).catch(() => null)
  if (!check?.success) return json(400, { code: 'captcha', error: 'Xác minh chống spam chưa thành công, vui lòng thử lại.' })

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const { error } = await db.from('messages').insert({
    name, email, message, read: false,
    page: String(b?.page || '').slice(0, 300),
    user_agent: (req.headers.get('user-agent') || '').slice(0, 300),
  })
  if (error) return json(500, { code: 'save', error: 'Chưa lưu được tin nhắn, vui lòng thử lại sau.' })
  // Email báo cho chủ web; bấm "Trả lời" trong email là trả lời thẳng cho khách
  await sendMail(db, 'message', {
    subject: `Tin nhắn mới từ ${name}`, heading: 'Có tin nhắn mới từ form Liên hệ',
    rows: [['Họ tên', name], ['Email', email], ['Gửi từ', String(b?.page || '')]], body: message,
    replyTo: email, path: '/admin/tin-nhan', button: 'Mở hộp thư',
  })
  await sendPush(db, 'message', { title: `Tin nhắn mới từ ${name}`, body: message, path: '/admin/tin-nhan' })
  return json(200, { ok: true })
})
