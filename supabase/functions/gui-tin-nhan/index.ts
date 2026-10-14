// Supabase Edge Function: nhận form Liên hệ trên trang chủ, kiểm tra Cloudflare Turnstile rồi lưu vào bảng messages.
// Địa chỉ: https://<project-ref>.supabase.co/functions/v1/gui-tin-nhan
// Secret cần đặt: TURNSTILE_SECRET (Secret key của Turnstile trên Cloudflare).
// Gửi email báo + trả lời khách từ Admin (không bắt buộc): RESEND_API_KEY, RESEND_FROM, SITE_URL.
// AI viết nháp trả lời (không bắt buộc): ANTHROPIC_API_KEY.
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
// Tên người gửi chỉnh ở Admin; RESEND_FROM chỉ cần địa chỉ (có sẵn "Tên <địa chỉ>" thì tên ở Admin được ưu tiên)
function fromAddr(n: any) {
  const base = (Deno.env.get('RESEND_FROM') || 'onboarding@resend.dev').trim()
  const addr = base.match(/<([^>]+)>/)?.[1] || base
  const fromName = String(n?.email_from_name || '').replace(/[<>"\r\n]/g, '').trim().slice(0, 60)
  return fromName ? `"${fromName}" <${addr}>` : base
}
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
    const from = fromAddr(n)
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

/* ---------- Trả lời khách ngay trong Admin → Tin nhắn ----------
   Nội dung viết kiểu markdown đơn giản: **đậm**, _nghiêng_, link, dòng bắt đầu bằng "- " là danh sách. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
function inlineMd(line: string) {
  // escape trước rồi mới thêm thẻ, nên chữ gõ vào không thành HTML được
  return escHtml(line)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/(^|[\s(])_(.+?)_(?=[\s).,!?]|$)/g, '$1<i>$2</i>')
    .replace(/\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)]/g, u => `<a href="${u}" style="color:#6650ff">${u}</a>`)
}
function mdToHtml(text: string) {
  const out: string[] = []; let list: string[] = []
  const flush = () => { if (list.length) out.push(`<ul style="margin:0 0 12px;padding-left:20px">${list.map(x => `<li>${x}</li>`).join('')}</ul>`); list = [] }
  text.split(/\n/).forEach(l => {
    const m = l.match(/^\s*[-*•]\s+(.*)$/)
    if (m) { list.push(inlineMd(m[1])); return }
    flush(); out.push(l.trim() ? `${inlineMd(l)}<br>` : '<br>')
  })
  flush()
  return out.join('\n')
}
async function sendReply(db: any, b: any) {
  const to = String(b?.to || '').trim().slice(0, 200)
  const subject = String(b?.subject || '').replace(/[\r\n]/g, ' ').trim().slice(0, 200) || 'Re: Liên hệ'
  const text = String(b?.text || '').trim().slice(0, 10000)
  const signature = String(b?.signature || '').trim().slice(0, 1000)
  const quote = b?.quote && typeof b.quote === 'object'
    ? { name: String(b.quote.name || '').slice(0, 120), when: String(b.quote.when || '').slice(0, 60), message: String(b.quote.message || '').slice(0, 5000) } : null
  const files = (Array.isArray(b?.attachments) ? b.attachments : []).slice(0, 5)
    .filter((f: any) => /^https:\/\//.test(String(f?.url || '')))
    .map((f: any) => ({ name: String(f.name || 'file').slice(0, 120), url: String(f.url), size: Number(f.size) || 0, type: String(f.type || '').slice(0, 100) }))
  if (!EMAIL_RE.test(to)) return { status: 400, data: { code: 'email', error: 'Email người nhận chưa đúng.' } }
  if (!text) return { status: 400, data: { code: 'required', error: 'Chưa có nội dung.' } }
  // Lưu vào hội thoại (gom theo email khách); "Gửi lại" thì cập nhật đúng dòng cũ
  const save = async (status: string) => {
    const row = { name: String(b?.from_name || 'Admin').slice(0, 120), email: to, message: text, subject, attachments: files, direction: 'out', status, read: true }
    const { error } = b?.retryId
      ? await db.from('messages').update(row).eq('id', Number(b.retryId)).eq('direction', 'out')
      : await db.from('messages').insert(row)
    if (error) console.error('Lưu trả lời', error)
  }

  const key = Deno.env.get('RESEND_API_KEY')
  if (!key) { await save('failed'); return { status: 200, data: { ok: false, code: 'no-key', error: 'Máy chủ chưa có RESEND_API_KEY.' } } }
  const { data: s } = await db.from('settings').select('email').eq('id', 1).maybeSingle()
  const { data: a } = await db.from('admin_settings').select('notify').eq('id', 1).maybeSingle()
  const n = (a?.notify && typeof a.notify === 'object') ? a.notify : {}
  // Khách bấm "Trả lời" trong thư là về thẳng hộp thư thật của chủ web
  const replyTo = String(n.email_to || s?.email || '').trim()
  const body = mdToHtml(text) + (signature ? `<div style="margin-top:20px;padding-top:12px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:14px">${mdToHtml(signature)}</div>` : '')
  const quoted = quote?.message ? `<div style="margin-top:24px;color:#6b7280;font-size:13px">${escHtml(quote.when ? `${quote.when}, ${quote.name}:` : `${quote.name}:`)}</div>
<blockquote style="margin:6px 0 0;padding:8px 14px;border-left:3px solid #d1d5db;color:#4b5563;font-size:14px;white-space:pre-wrap">${escHtml(quote.message)}</blockquote>` : ''
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111827;font-size:15px;line-height:1.6">
<div style="height:4px;border-radius:4px;background:linear-gradient(90deg,#e94b9e,#6650ff);margin-bottom:20px"></div>
${body}${quoted}</div>`
  const plain = [text, signature && `\n--\n${signature}`, quote?.message && `\n\n${quote.name}:\n> ${quote.message.replace(/\n/g, '\n> ')}`].filter(Boolean).join('\n')
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromAddr(n), to: [to], subject, html, text: plain,
        ...(EMAIL_RE.test(replyTo) ? { reply_to: replyTo } : {}),
        ...(files.length ? { attachments: files.map((f: any) => ({ filename: f.name, path: f.url })) } : {}),
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (r.ok) { await save('sent'); return { status: 200, data: { ok: true, status: 'sent' } } }
    const detail = await r.text().catch(() => '')
    console.error('Resend reply', r.status, detail)
    await save('failed')
    // 403: địa chỉ gửi chưa verify tên miền (onboarding@resend.dev chỉ gửi được tới email chủ tài khoản Resend)
    return { status: 200, data: { ok: false, code: r.status === 403 ? 'domain' : 'resend', error: detail.slice(0, 300) || `Resend ${r.status}` } }
  } catch (e) {
    console.error('Resend reply', e); await save('failed')
    return { status: 200, data: { ok: false, code: 'resend', error: String(e) } }
  }
}

/* ---------- AI viết nháp trả lời (Claude) ---------- */
const INTENTS: Record<string, string> = {
  thanks: 'Cảm ơn người gửi đã liên hệ và trả lời đúng điều họ hỏi.',
  meet: 'Đề xuất hẹn một buổi gọi/gặp ngắn; để trống thời gian cụ thể dạng [thời gian] cho chủ web điền.',
  decline: 'Từ chối lịch sự, ngắn gọn, giữ thiện cảm.',
  cv: 'Gửi kèm CV theo yêu cầu và mời họ hỏi thêm nếu cần.',
  free: 'Trả lời phù hợp nhất với nội dung hội thoại.',
}
async function draftReply(db: any, b: any) {
  const key = Deno.env.get('ANTHROPIC_API_KEY')
  if (!key) return { status: 200, data: { ok: false, code: 'no-ai', error: 'Máy chủ chưa có ANTHROPIC_API_KEY.' } }
  const email = String(b?.email || '').trim().toLowerCase()
  if (!EMAIL_RE.test(email)) return { status: 400, data: { code: 'email', error: 'Thiếu email hội thoại.' } }
  // Không phân biệt hoa thường, giống cách Admin gom hội thoại (escape % _ để ilike so khớp đúng từng chữ)
  const { data: rows } = await db.from('messages').select('name, message, direction, created_at')
    .ilike('email', email.replace(/[\\%_]/g, c => '\\' + c)).order('created_at', { ascending: true }).limit(40)
  const thread = (rows || []).filter((m: any) => m.direction !== 'note')
  if (!thread.length) return { status: 404, data: { code: 'empty', error: 'Không tìm thấy hội thoại.' } }
  const owner = String(b?.owner || 'chủ web').slice(0, 80)
  const transcript = thread.map((m: any) => `[${m.direction === 'out' ? `${owner} (đã trả lời)` : m.name} · ${String(m.created_at).slice(0, 16).replace('T', ' ')}]\n${m.message}`).join('\n\n')
  const lang = b?.lang === 'en' ? 'tiếng Anh' : b?.lang === 'vi' ? 'tiếng Việt' : 'cùng ngôn ngữ người gửi đã viết'
  const hint = String(b?.hint || '').trim().slice(0, 500)
  try {
    const { default: Anthropic } = await import('npm:@anthropic-ai/sdk')
    const client = new Anthropic({ apiKey: key })
    const res: any = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 2000,
      output_config: { effort: 'low' },
      // Bị từ chối nhầm thì API tự chạy lại bằng model dự phòng
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: `Bạn viết nháp email trả lời cho ${owner}, chủ một website portfolio cá nhân, gửi tới người vừa liên hệ qua form trên web. Giọng thân thiện, chuyên nghiệp, ngắn gọn (thường 3–8 câu). Chỉ trả về phần thân thư: mở đầu bằng lời chào có tên người nhận, không có dòng tiêu đề, không ký tên (chữ ký được thêm tự động). Không bịa thông tin cụ thể (giá, ngày giờ, đường link); cần thì để chỗ trống dạng [điền ...]. Chỉ dùng **đậm** và danh sách "- " khi thật cần.`,
      messages: [{ role: 'user', content: `Hội thoại đến giờ:\n\n${transcript}\n\nViết thư trả lời bằng ${lang}. Mục đích: ${INTENTS[b?.intent] || INTENTS.free}${hint ? `\nGhi chú thêm của ${owner}: ${hint}` : ''}` }],
    } as any)
    if (res.stop_reason === 'refusal') return { status: 200, data: { ok: false, code: 'refusal', error: 'AI không viết nháp cho hội thoại này.' } }
    const text = (res.content || []).filter((c: any) => c.type === 'text').map((c: any) => c.text).join('').trim()
    return { status: 200, data: text ? { ok: true, text } : { ok: false, code: 'ai', error: 'AI chưa trả về nội dung.' } }
  } catch (e: any) {
    console.error('Claude', e?.status, e?.message)
    return { status: 200, data: { ok: false, code: 'ai', error: e?.message || String(e) } }
  }
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

  // Việc của Admin (gửi thử thông báo đẩy, trả lời khách, AI viết nháp): chỉ người đã đăng nhập Admin (token thật) mới gọi được
  if (['test-push', 'reply', 'draft'].includes(b?.action)) {
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
    const { data: u } = await db.auth.getUser(token).catch(() => ({ data: null }))
    if (!u?.user) return json(401, { code: 'auth', error: 'Cần đăng nhập Admin.' })
    if (b.action === 'reply') { const r = await sendReply(db, b); return json(r.status, r.data) }
    if (b.action === 'draft') { const r = await draftReply(db, b); return json(r.status, r.data) }
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
