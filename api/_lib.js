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
