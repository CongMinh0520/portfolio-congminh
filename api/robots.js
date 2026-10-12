// /robots.txt: cho phép Google đọc toàn trang, chặn khu Admin, chỉ đường tới sitemap.
import { originOf } from './_lib.js'

export function GET(request) {
  const origin = originOf(request)
  const body = ['User-agent: *', 'Allow: /', 'Allow: /api/og', 'Disallow: /admin', 'Disallow: /api/', '', `Sitemap: ${origin}/sitemap.xml`, ''].join('\n')
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, s-maxage=86400' } })
}
