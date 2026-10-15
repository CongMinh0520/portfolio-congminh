// Dùng chung cho các hàm Vercel (file bắt đầu bằng "_" không thành đường dẫn API).
// Đọc dữ liệu công khai từ Supabase bằng khóa anon (giống trang web), biến môi trường đặt trên Vercel.
export const SUPA = (process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '')
const KEY = process.env.VITE_SUPABASE_ANON_KEY || ''

export async function rest(path) {
  if (!SUPA || !KEY) return null
  try {
    const r = await fetch(`${SUPA}/rest/v1/${path}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })
    return r.ok ? r.json() : null
  } catch { return null }
}

/** Toàn bộ dữ liệu trang chủ (hàm SQL get_home, xem supabase/migration-get-home.sql); lỗi thì trả null */
export async function homeData() {
  if (!SUPA || !KEY) return null
  try {
    const r = await fetch(`${SUPA}/rest/v1/rpc/get_home`, { method: 'POST', headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, body: '{}' })
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

export { SITE_NAME, slugify, postPath, projectPath, bugPath, idFromSlug, esc, homeInfo, mdToHtml } from '../render/shared.js'
