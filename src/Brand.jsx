// Thương hiệu: logo, biểu tượng vuông, favicon. Lưu ở settings.brand (Admin → Thương hiệu).
// Chưa tải ảnh thì dùng mặc định: logo chữ "Cong.Minh", biểu tượng chữ "CM" nền hồng tím, favicon tạo từ biểu tượng.
import { useEffect } from 'react'

export const DEFAULT_BRAND = { logo: '', logo_text: 'Cong.Minh', icon: '', icon_text: 'CM', favicon: '' }
export const brandOf = s => ({ ...DEFAULT_BRAND, ...(s?.brand && typeof s.brand === 'object' ? s.brand : {}) })

const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
/** Biểu tượng mặc định dạng SVG (dùng làm favicon khi chưa tải ảnh) */
export const defaultIconSvg = (text = 'CM') => 'data:image/svg+xml,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#e94b9e"/><stop offset="1" stop-color="#6650ff"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="url(#g)"/><text x="32" y="41" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="${text.length > 2 ? 20 : 26}" font-weight="900" fill="#fff">${esc(text.slice(0, 3))}</text></svg>`)
export const faviconOf = b => b.favicon || b.icon || defaultIconSvg(b.icon_text || 'CM')

/** Logo: ảnh đã tải lên, hoặc logo chữ (dấu chấm tô hồng) */
export function BrandLogo({ brand, className = '', imgClass = 'h-8' }) {
  const b = brand || DEFAULT_BRAND
  if (b.logo) return <img src={b.logo} alt={b.logo_text || 'Logo'} className={`w-auto max-w-[180px] object-contain ${imgClass}`} />
  const parts = String(b.logo_text || DEFAULT_BRAND.logo_text).split(/(\.)/)
  return <span className={className}>{parts.map((p, i) => (p === '.' ? <span key={i} className="text-pink">.</span> : p))}</span>
}

/** Biểu tượng vuông: ảnh đã tải lên, hoặc chữ viết tắt trên nền hồng tím */
export function BrandIcon({ brand, className = 'size-9 rounded-lg text-xs' }) {
  const b = brand || DEFAULT_BRAND
  if (b.icon) return <img src={b.icon} alt="" className={`flex-none object-cover ${className}`} />
  return <span className={`grid flex-none place-items-center bg-gradient-to-r from-pink to-purple font-black ${className}`}>{(b.icon_text || 'CM').slice(0, 3)}</span>
}

/** Gắn favicon vào tab trình duyệt */
export function useFavicon(brand) {
  const href = faviconOf(brand || DEFAULT_BRAND)
  useEffect(() => {
    let el = document.head.querySelector('link[rel="icon"]')
    if (!el) { el = document.createElement('link'); el.rel = 'icon'; document.head.appendChild(el) }
    el.href = href
  }, [href])
}
