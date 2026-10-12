// Supabase Edge Function: nhận bài đăng tự động từ Easy AI và lưu vào bảng posts.
// Địa chỉ sau khi deploy: https://<project-ref>.supabase.co/functions/v1/nhan-bai
// Secrets cần đặt: EASYAI_SECRET (khóa bí mật từ Easy AI), SITE_URL (VD https://congminh.dev)
// Thông báo đẩy (không bắt buộc): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.
// SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY được Supabase tự cung cấp.
// Khi deploy nhớ TẮT "Verify JWT" (Enforce JWT verification) vì Easy AI không gửi token Supabase.

import { createClient } from 'npm:@supabase/supabase-js@2.49.4'
import { parse, HTMLElement, TextNode, Node } from 'npm:node-html-parser@7.0.1'

const MAX_AGE = 300 // giây: yêu cầu cũ hơn 5 phút bị từ chối (chống gửi lại)
const enc = new TextEncoder()

async function sign(secret: string, data: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data)))
  return 'sha256=' + [...sig].map(b => b.toString(16).padStart(2, '0')).join('')
}
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}
const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

/* ---------- HTML → Markdown (chỉ giữ thẻ an toàn, bỏ script/style/iframe…) ---------- */
const DROP = new Set(['script', 'style', 'iframe', 'noscript', 'object', 'embed', 'form', 'input', 'button', 'svg', 'head', 'title', 'meta', 'link'])
const safeUrl = (u = '') => (/^(https?:|mailto:)/i.test(u.trim()) ? u.trim().replace(/[()\s]/g, m => encodeURIComponent(m)) : '')
const escMd = (t: string) => t.replace(/([\\`*[\]])/g, '\\$1')

function inline(n: Node): string {
  if (n instanceof TextNode) return escMd(n.text.replace(/\s+/g, ' '))
  if (!(n instanceof HTMLElement)) return ''
  const tag = (n.tagName || '').toLowerCase()
  if (DROP.has(tag)) return ''
  const inner = () => n.childNodes.map(inline).join('')
  switch (tag) {
    case 'br': return ' '
    case 'strong': case 'b': { const t = inner().trim(); return t ? `**${t}**` : '' }
    case 'em': case 'i': { const t = inner().trim(); return t ? `*${t}*` : '' }
    case 'code': { const t = n.text.replace(/`/g, "'").trim(); return t ? `\`${t}\`` : '' }
    case 'a': { const t = inner().trim(), h = safeUrl(n.getAttribute('href')); return h && t ? `[${t}](${h})` : t }
    case 'img': return '' // ảnh trong dòng chữ được tách thành khối riêng ở blocks()
    default: return inner()
  }
}

function blocks(n: Node, out: string[]) {
  if (n instanceof TextNode) { const t = escMd(n.text.replace(/\s+/g, ' ')).trim(); if (t) out.push(t); return }
  if (!(n instanceof HTMLElement)) return
  const tag = (n.tagName || '').toLowerCase()
  if (DROP.has(tag)) return
  const text = () => n.childNodes.map(inline).join('').replace(/\s+/g, ' ').trim()
  const imgs = () => n.querySelectorAll('img').forEach(im => {
    const src = safeUrl(im.getAttribute('src')); if (src) out.push(`![${escMd((im.getAttribute('alt') || '').trim())}](${src})`)
  })
  switch (tag) {
    case 'h1': case 'h2': { const t = text(); if (t) out.push(`## ${t}`); return }
    case 'h3': case 'h4': case 'h5': case 'h6': { const t = text(); if (t) out.push(`### ${t}`); return }
    case 'p': { const t = text(); if (t) out.push(t); imgs(); return }
    case 'img': { const src = safeUrl(n.getAttribute('src')); if (src) out.push(`![${escMd((n.getAttribute('alt') || '').trim())}](${src})`); return }
    case 'figcaption': { const t = text(); if (t) out.push(`*${t}*`); return }
    case 'ul': case 'ol': {
      const items = n.querySelectorAll('li').map(li => li.childNodes.filter(c => !(c instanceof HTMLElement && /^(ul|ol)$/i.test(c.tagName))).map(inline).join('').replace(/\s+/g, ' ').trim()).filter(Boolean)
      if (items.length) out.push(items.map((t, i) => (tag === 'ol' ? `${i + 1}. ${t}` : `- ${t}`)).join('\n'))
      return
    }
    case 'blockquote': { const sub: string[] = []; n.childNodes.forEach(c => blocks(c, sub)); const t = sub.join(' ').trim(); if (t) out.push(`> ${t}`); return }
    case 'pre': { const t = n.text.replace(/```/g, "'''").replace(/\s+$/, ''); if (t) out.push('```\n' + t + '\n```'); return }
    case 'tr': { const cells = n.querySelectorAll('th,td').map(c => c.childNodes.map(inline).join('').trim()).filter(Boolean); if (cells.length) out.push(cells.join(' | ')); return }
    case 'hr': return
    default: n.childNodes.forEach(c => blocks(c, out))
  }
}
export function htmlToMarkdown(html: string) {
  const out: string[] = []
  // pre được phân tích như thẻ thường để lấy đúng chữ bên trong <pre><code>…</code></pre>
  parse(String(html || ''), { comment: false, blockTextElements: { script: true, noscript: true, style: true } }).childNodes.forEach(c => blocks(c, out))
  return out.join('\n\n').replace(/\n{3,}/g, '\n\n').trim()
}
// Chữ thuần (dùng làm tóm tắt) lấy từ Markdown đã lọc: bỏ ảnh, code, ký hiệu định dạng
// Thẻ: nhận mảng ["AI","Automation"] hoặc chuỗi "AI, Automation"; tối đa 8 thẻ
const toTags = (v: unknown) => (Array.isArray(v) ? v : String(v ?? '').split(','))
  .map(t => String(typeof t === 'object' && t ? (t as any).name ?? '' : t).trim()).filter(Boolean).slice(0, 8)
// Giống slugify ở website: bỏ dấu, chữ thường, nối bằng gạch ngang
const slugify = (s = '') => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'bai-viet'

const plainFromMd = (md: string) => md
  .replace(/```[\s\S]*?```/g, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  .replace(/^(#{2,3} |> |- |\d+\. )/gm, '').replace(/\\([\\`*[\]])/g, '$1').replace(/[*`]/g, '')
  .replace(/\s+/g, ' ').trim()

/* ---------- Email báo qua Resend (bật/tắt ở Admin → Cài đặt → Thông báo) ----------
   Secrets: RESEND_API_KEY (bắt buộc để gửi), RESEND_FROM (địa chỉ gửi), SITE_URL (nút mở Admin).
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
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: Deno.env.get('RESEND_FROM') || 'onboarding@resend.dev', to: [to], subject: m.subject, html, ...(m.replyTo ? { reply_to: m.replyTo } : {}) }),
      signal: AbortSignal.timeout(8000),
    })
    if (!r.ok) console.error('Resend', r.status, await r.text().catch(() => ''))
    return r.ok ? 'sent' : `error ${r.status}`
  } catch (e) { console.error('Resend', e); return 'error' }
}

/* ---------- Nhận bài ---------- */
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
  if (req.method !== 'POST') return json(405, { error: 'Chỉ nhận POST' })
  const secret = Deno.env.get('EASYAI_SECRET')
  if (!secret) return json(500, { error: 'Chưa đặt EASYAI_SECRET trong Supabase Secrets' })

  const raw = await req.text() // body thô, kiểm chữ ký trước khi parse
  const ts = req.headers.get('X-Timestamp') || ''
  const got = req.headers.get('X-Signature') || ''
  const fresh = Math.abs(Date.now() / 1000 - Number(ts)) <= MAX_AGE
  if (!fresh || !safeEqual(got, await sign(secret, `${ts}.${raw}`))) return new Response(null, { status: 401 })

  let body: any
  try { body = JSON.parse(raw) } catch { return json(400, { error: 'Body không phải JSON' }) }
  if (body?.event === 'ping') return new Response(null, { status: 204 }) // nút "Kiểm tra kết nối"

  const post = body?.post || {}
  const title = String(post.title || '').trim()
  if (!title) return json(400, { error: 'Thiếu post.title' })
  const key = req.headers.get('X-Idempotency-Key') || ''
  if (!key) return json(400, { error: 'Thiếu X-Idempotency-Key' })
  const publish = body?.mode === 'publish'

  const content = htmlToMarkdown(post.html || '')
  const text = plainFromMd(content)
  const excerptSrc = String(post.excerpt || post.summary || post.description || text)
  const excerpt = excerptSrc.length > 180 ? excerptSrc.slice(0, 177).replace(/\s+\S*$/, '') + '…' : excerptSrc
  const date = String(post.published_at || post.date || '').slice(0, 10)
  const fields = {
    title,
    slug: String(post.slug || ''),
    content,
    excerpt,
    image: safeUrl(post.cover_url || post.cover || ''),
    published_at: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date().toISOString().slice(0, 10),
    url: '',
    source: 'easyai',
    tags: toTags(post.tags ?? post.categories ?? post.keywords),
  }

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const { data: found, error: e1 } = await db.from('posts').select('id, visible').eq('external_key', key).maybeSingle()
  if (e1) return json(500, { error: e1.message })

  let id: number
  if (found) {
    // Gửi lại cùng bài: cập nhật. "Đăng thẳng" thì hiện bài; "Lưu nháp" thì giữ nguyên trạng thái ẩn/hiện hiện tại.
    const { error } = await db.from('posts').update({ ...fields, ...(publish ? { visible: true } : {}) }).eq('id', found.id)
    if (error) return json(500, { error: error.message })
    id = found.id
  } else {
    // Bài mới lên đầu danh sách Blog. "Lưu nháp" → ẩn, chờ duyệt trong Admin.
    const { data: first } = await db.from('posts').select('sort').order('sort', { ascending: true }).limit(1).maybeSingle()
    const sort = (first?.sort ?? 1) - 1
    const { data, error } = await db.from('posts').insert({ ...fields, external_key: key, sort, visible: publish }).select('id').single()
    if (error) return json(500, { error: error.message })
    id = data.id
    await sendMail(db, 'post', {
      subject: `Bài mới từ Easy AI: ${title}`, heading: publish ? 'Easy AI vừa đăng một bài lên Blog' : 'Easy AI gửi một bài đang chờ duyệt',
      rows: [['Tiêu đề', title], ['Trạng thái', publish ? 'Đã đăng' : 'Chờ duyệt']], body: excerpt,
      path: '/admin/blog', button: publish ? 'Xem trong Admin' : 'Duyệt bài',
    })
    await sendPush(db, 'post', { title: publish ? `Easy AI vừa đăng: ${title}` : `Bài chờ duyệt: ${title}`, body: excerpt || '', path: '/admin/blog' })
  }

  const site = (Deno.env.get('SITE_URL') || '').replace(/\/+$/, '')
  return json(200, { external_id: String(id), url: `${site}/blog/${slugify(fields.slug || title)}-${id}` })
})
