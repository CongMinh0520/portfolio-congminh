// /sitemap.xml: danh sách trang để Google tìm bài mới nhanh hơn. Tự cập nhật theo dữ liệu (lưu đệm 1 giờ).
import { rest, originOf } from './_lib.js'
import { renderSitemap } from '../render/feeds.js'

export async function GET(request) {
  const origin = originOf(request)
  const [posts, projects, bugs, settings] = await Promise.all([
    rest('posts?select=id,title,slug,published_at,canonical_source,url&visible=eq.true&order=published_at.desc'),
    rest('projects?select=id,title&visible=eq.true&order=sort.asc'),
    rest('bugs?select=id,title,found_at&visible=eq.true&order=sort.asc'),
    rest('settings?select=hidden&id=eq.1'),
  ])
  const xml = renderSitemap({ posts, projects, bugs, hidden: settings?.[0]?.hidden || [], origin })
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } })
}
