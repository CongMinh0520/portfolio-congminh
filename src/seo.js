// Cập nhật tiêu đề tab, mô tả, ảnh chia sẻ (Open Graph / Twitter), link chuẩn và dữ liệu có cấu trúc cho từng trang.
// Google đọc được vì Google chạy JavaScript. Facebook/Zalo cần nơi host tạo sẵn thẻ cho từng bài (xem README).
import { useEffect } from 'react'
import { HASH } from './router.js'

const SITE = 'Công Minh'
const setMeta = (attr, key, content) => {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!content) { el?.remove(); return }
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el) }
  el.setAttribute('content', content)
}
const setLink = (rel, url) => {
  let el = document.head.querySelector(`link[rel="${rel}"]`)
  if (!el) { el = document.createElement('link'); el.rel = rel; document.head.appendChild(el) }
  el.href = url
}
const setLinkOpt = (rel, url) => {
  let el = document.head.querySelector(`link[rel="${rel}"]`)
  if (!url) { el?.remove(); return }
  if (!el) { el = document.createElement('link'); el.rel = rel; document.head.appendChild(el) }
  el.href = url
}
const absolute = u => { try { return u && !u.startsWith('data:') ? new URL(u, location.origin).href : '' } catch { return '' } }

export function useSeo({ title, description = '', image = '', type = 'website', published, modified, path, prev, next, noindex, canonical } = {}) {
  useEffect(() => {
    const full = title ? `${title} — ${SITE}` : `${SITE} — Software Tester`
    document.title = full
    const desc = String(description || '').slice(0, 160)
    const img = absolute(image)
    // canonical: bài đăng lại chọn "bản gốc là bản chính" thì trỏ về link gốc
    const url = canonical || (path && !HASH ? new URL(path, location.origin).href : location.href)
    setMeta('name', 'description', desc)
    setMeta('property', 'og:title', title || full); setMeta('property', 'og:description', desc)
    setMeta('property', 'og:type', type); setMeta('property', 'og:url', url); setMeta('property', 'og:image', img)
    setMeta('property', 'og:locale', 'vi_VN'); setMeta('property', 'og:site_name', SITE)
    setMeta('name', 'twitter:card', img ? 'summary_large_image' : 'summary')
    setMeta('name', 'twitter:title', title || full); setMeta('name', 'twitter:description', desc); setMeta('name', 'twitter:image', img)
    setMeta('property', 'article:published_time', type === 'article' ? published : '')
    setMeta('property', 'article:modified_time', type === 'article' ? (modified || published) : '')
    setLink('canonical', url)
    // Phân trang: liên kết trang trước/sau; trang không có nội dung thì báo Google đừng lập chỉ mục
    const abs = p => (p ? (HASH ? new URL('#' + p, location.href).href : new URL(p, location.origin).href) : '')
    setLinkOpt('prev', abs(prev)); setLinkOpt('next', abs(next))
    setMeta('name', 'robots', noindex ? 'noindex, follow' : '')
    // Dữ liệu có cấu trúc cho bài viết (Google hiển thị đẹp hơn trong kết quả tìm kiếm)
    let ld = document.getElementById('seo-ld')
    if (type === 'article') {
      if (!ld) { ld = document.createElement('script'); ld.type = 'application/ld+json'; ld.id = 'seo-ld'; document.head.appendChild(ld) }
      ld.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'BlogPosting', headline: title, description: desc, image: img || undefined, datePublished: published, dateModified: modified || published, author: { '@type': 'Person', name: SITE }, mainEntityOfPage: url })
    } else ld?.remove()
  }, [title, description, image, type, published, modified, path, prev, next, noindex, canonical])
}
