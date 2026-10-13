// Dùng chung cho các hàm Vercel (file bắt đầu bằng "_" không thành đường dẫn API).
// Đọc dữ liệu công khai từ Supabase bằng khóa anon (giống trang web), biến môi trường đặt trên Vercel.
export const SUPA = (process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '')
const KEY = process.env.VITE_SUPABASE_ANON_KEY || ''
export const SITE_NAME = 'Công Minh'

export async function rest(path) {
  if (!SUPA || !KEY) return null
  try {
    const r = await fetch(`${SUPA}/rest/v1/${path}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })
    return r.ok ? r.json() : null
  } catch { return null }
}

/** Địa chỉ gốc của web theo request, VD https://congminh.dev */
export function originOf(request) {
  const u = new URL(request.url)
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || u.host
  const proto = request.headers.get('x-forwarded-proto') || u.protocol.replace(':', '') || 'https'
  return `${proto}://${host}`
}

// Giống src/router.js
export const slugify = (s = '') => String(s)
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'bai-viet'
export const postPath = p => `/blog/${slugify(p.slug || p.title)}-${p.id}`
export const projectPath = p => `/du-an/${slugify(p.slug || p.title)}-${p.id}`
export const bugPath = b => `/bug/${slugify(b.slug || b.title)}-${b.id}`
export const idFromSlug = s => Number((String(s).match(/(?:^|-)(\d+)$/) || [])[1]) || null

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

/** Chữ trên trang chủ cho thẻ chia sẻ: tiêu đề, giới thiệu, huy hiệu, ảnh đại diện theo ngôn ngữ mặc định. v = mã đổi khi nội dung đổi (ảnh chia sẻ không bị lưu đệm bản cũ) */
export function homeInfo(st) {
  const hero = st?.hero && typeof st.hero === 'object' ? st.hero : {}
  const lang = st?.lang_default === 'en' ? 'en' : 'vi'
  const en = lang === 'en' && hero.en && typeof hero.en === 'object' ? hero.en : {}
  const pick = (x, y) => (typeof y === 'string' && y.trim() ? y : x)
  const t = hero.title || {}, et = en.title || {}
  const useEn = lang === 'en' && (et.before || et.highlight || et.after)
  const before = useEn ? et.before || '' : t.before ?? 'Mình tìm ra '
  const highlight = useEn ? et.highlight || '' : t.highlight ?? 'lỗi'
  const after = useEn ? et.after || '' : t.after ?? ' trước khi người dùng thấy'
  const lead = pick(hero.lead || '', en.lead)
  const badge = pick(hero.badge?.text || 'OPEN TO QA OPPORTUNITIES', en.badge?.text)
  const avatar = hero.avatar?.image || ''
  const initials = hero.avatar?.text || 'CM'
  const title = `${before}${highlight}${after}`.replace(/\s+/g, ' ').trim()
  let v = 0; for (const ch of title + lead + badge + avatar + initials) v = (v * 31 + ch.charCodeAt(0)) >>> 0
  return { lang, before, highlight, after, title, lead, badge, avatar, initials, v: v.toString(36) }
}

/* Markdown → HTML cho RSS (cùng cú pháp với trang web: src/Detail.jsx). Chữ luôn được escape; link tương đối thành link đầy đủ. */
const absUrl = (u, origin) => (/^https?:\/\//i.test(u) || /^mailto:/i.test(u) ? u : /^\//.test(u) ? origin + u : '')
const unesc = t => t.replace(/\\([\\`*_{}[\]()#+\-.!>|~])/g, '$1')
// Tách từng đoạn đậm / nghiêng / code / link giống hàm inline() của trang web
function mdInline(text, origin) {
  const re = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g
  const plain = s => esc(unesc(s))
  let out = '', last = 0, m
  while ((m = re.exec(text))) {
    if (m.index > last) out += plain(text.slice(last, m.index))
    const t = m[0]
    if (t.startsWith('**')) out += `<strong>${plain(t.slice(2, -2))}</strong>`
    else if (t.startsWith('*')) out += `<em>${plain(t.slice(1, -1))}</em>`
    else if (t.startsWith('`')) out += `<code>${esc(t.slice(1, -1))}</code>`
    else { const [, label, u] = t.match(/\[([^\]]+)\]\(([^)]+)\)/); const a = absUrl(u, origin); out += a ? `<a href="${esc(a)}">${plain(label)}</a>` : plain(label) }
    last = re.lastIndex
  }
  return out + plain(text.slice(last))
}
export function mdToHtml(md = '', origin = '') {
  const lines = String(md).replace(/\r/g, '').split('\n'), out = []
  let i = 0
  while (i < lines.length) {
    const l = lines[i]
    if (!l.trim()) { i++; continue }
    if (l.startsWith('```')) { const code = []; i++; while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++]); i++; out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`); continue }
    const h = l.match(/^(#{1,3}) (.+)/)
    if (h) { const n = h[1].length === 3 ? 3 : 2; out.push(`<h${n}>${mdInline(h[2], origin)}</h${n}>`); i++; continue }
    if (/^\s*[-*+] /.test(l)) { const it = []; while (i < lines.length && /^\s*[-*+] /.test(lines[i])) it.push(`<li>${mdInline(lines[i++].replace(/^\s*[-*+] /, ''), origin)}</li>`); out.push(`<ul>${it.join('')}</ul>`); continue }
    if (/^\s*\d+\. /.test(l)) { const it = []; while (i < lines.length && /^\s*\d+\. /.test(lines[i])) it.push(`<li>${mdInline(lines[i++].replace(/^\s*\d+\. /, ''), origin)}</li>`); out.push(`<ol>${it.join('')}</ol>`); continue }
    if (/^>\s?/.test(l)) { const q = []; while (i < lines.length && /^>\s?/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, '')); out.push(`<blockquote><p>${mdInline(q.join(' '), origin)}</p></blockquote>`); continue }
    const img = l.trim().match(/^!\[([^\]]*)\]\((https?:[^)\s]+)\)$/)
    if (img) { out.push(`<p><img src="${esc(img[2])}" alt="${esc(img[1])}"></p>`); i++; continue }
    const p = []; while (i < lines.length && lines[i].trim() && !/^(#{1,3} |\s*[-*+] |\s*\d+\. |>|```|!\[)/.test(lines[i])) p.push(lines[i++])
    out.push(`<p>${mdInline(p.join(' '), origin)}</p>`)
  }
  return out.join('\n')
}
