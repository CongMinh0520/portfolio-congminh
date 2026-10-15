// /robots.txt: cho phép Google đọc toàn trang, chặn khu Admin, chỉ đường tới sitemap.
import { originOf } from './_lib.js'
import { renderRobots } from '../render/feeds.js'

export function GET(request) {
  const origin = originOf(request)
  const body = renderRobots(origin)
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, s-maxage=86400' } })
}
