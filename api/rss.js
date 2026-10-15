// /rss.xml (Tiếng Việt) và /rss-en.xml (English): bài Blog + Bug mẫu, có toàn bộ nội dung.
// Bài chưa có bản English thì dùng bản Tiếng Việt. Tự cập nhật theo dữ liệu (lưu đệm 1 giờ).
import { rest, originOf } from './_lib.js'
import { renderRss } from '../render/feeds.js'

export async function GET(request) {
  const origin = originOf(request)
  const en = new URL(request.url).searchParams.get('lang') === 'en'
  const [posts, bugs] = await Promise.all([
    rest('posts?select=id,title,slug,excerpt,content,image,published_at,created_at,tags,en&visible=eq.true&order=published_at.desc.nullslast&limit=30'),
    rest('bugs?select=id,title,severity,priority,product,environment,steps,expected,actual,content,image,found_at,created_at,tags,en&visible=eq.true&order=sort.asc&limit=20'),
  ])
  const xml = renderRss({ posts, bugs, origin, en })
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } })
}
