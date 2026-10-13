// Định tuyến: link đẹp dạng /blog/ten-bai-12 (bản deploy) hoặc #/blog/ten-bai-12 (bản demo 1 file).
// Bản demo không có máy chủ để trả về đúng trang cho đường dẫn thật, nên dùng dấu # thay thế.
import { useEffect, useState } from 'react'

export const HASH = import.meta.env.VITE_HASH_ROUTER === '1'

/** Bỏ dấu tiếng Việt, đổi thành chữ thường nối bằng gạch ngang */
export const slugify = (s = '') => String(s)
  .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'bai-viet'

export const postPath = p => `/blog/${slugify(p.slug || p.title)}-${p.id}`
export const projectPath = p => `/du-an/${slugify(p.slug || p.title)}-${p.id}`
export const bugPath = b => `/bug/${slugify(b.slug || b.title)}-${b.id}`
/** Mã hiển thị của bug: id 7 → BUG-007 */
export const bugCode = b => `BUG-${String(b?.id ?? 0).padStart(3, '0')}`
export const tagPath = t => `/blog?the=${encodeURIComponent(t)}`
/** Trang danh sách Blog có lọc thẻ và số trang: /blog, /blog?trang=2, /blog?the=QA&trang=3 */
export const blogPath = (tag = '', n = 1) => {
  const q = [tag && `the=${encodeURIComponent(tag)}`, n > 1 && `trang=${n}`].filter(Boolean).join('&')
  return q ? `/blog?${q}` : '/blog'
}
/** Lấy id ở cuối đường dẫn: "ten-bai-12" → 12 */
export const idFromSlug = s => Number((String(s).match(/(?:^|-)(\d+)$/) || [])[1]) || null

/** Đường dẫn cho thẻ <a href>: tự đổi sang dạng #/… ở bản demo. Hỗ trợ link ngoài, mailto, #muc và /#muc */
export function href(link = '/') {
  if (/^(https?:|mailto:|tel:)/i.test(link)) return link
  if (link.startsWith('#')) return HASH ? link : `/${link}`
  if (link.startsWith('/#')) return HASH ? link.slice(1) : link
  return HASH ? `#${link}` : link
}

/** Đường dẫn hiện tại (có cả ?query), VD "/blog?the=QA" */
export function currentPath() {
  if (HASH) { const h = location.hash; return h.startsWith('#/') ? h.slice(1) : '/' }
  return location.pathname + location.search
}

export function navigate(path, { replace = false } = {}) {
  if (HASH) {
    const target = path.startsWith('/#') ? path.slice(1) : `#${path}`
    if (replace) { history.replaceState(null, '', target); dispatchEvent(new Event('routechange')) } else location.hash = target
    return
  }
  history[replace ? 'replaceState' : 'pushState'](null, '', path)
  dispatchEvent(new Event('routechange'))
}

/** Theo dõi đường dẫn hiện tại */
export function usePath() {
  const [p, setP] = useState(currentPath)
  useEffect(() => {
    const f = () => setP(currentPath())
    addEventListener('popstate', f); addEventListener('hashchange', f); addEventListener('routechange', f)
    return () => { removeEventListener('popstate', f); removeEventListener('hashchange', f); removeEventListener('routechange', f) }
  }, [])
  return p
}
