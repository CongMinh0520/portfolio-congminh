// /sitemap.xml: danh sách trang để Google tìm bài mới nhanh hơn. Tự cập nhật theo dữ liệu (lưu đệm 1 giờ).
import { rest, originOf, postPath, projectPath, bugPath, esc } from './_lib.js'

export async function GET(request) {
  const origin = originOf(request)
  const [posts, projects, bugs, settings] = await Promise.all([
    rest('posts?select=id,title,slug,published_at,canonical_source,url&visible=eq.true&order=published_at.desc'),
    rest('projects?select=id,title&visible=eq.true&order=sort.asc'),
    rest('bugs?select=id,title,found_at&visible=eq.true&order=sort.asc'),
    rest('settings?select=hidden&id=eq.1'),
  ])
  const hidden = new Set(settings?.[0]?.hidden || [])
  const urls = [
    { loc: `${origin}/`, priority: '1.0' },
    { loc: `${origin}/blog`, priority: '0.8' },
    // Bài đăng lại có "bản gốc là bản chính" thì không đưa vào (Google sẽ tính cho bản gốc)
    ...(posts || []).filter(p => !(p.canonical_source && p.url)).map(p => ({ loc: origin + postPath(p), lastmod: p.published_at, priority: '0.7' })),
    ...(projects || []).map(p => ({ loc: origin + projectPath(p), priority: '0.6' })),
    ...(bugs || []).map(b => ({ loc: origin + bugPath(b), lastmod: b.found_at, priority: '0.5' })),
    ...(hidden.has('sec_page_selftest') ? [] : [{ loc: `${origin}/kiem-thu`, priority: '0.5' }]),
    ...(hidden.has('sec_page_cv') ? [] : [{ loc: `${origin}/cv`, priority: '0.6' }]),
  ]
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${esc(String(u.lastmod).slice(0, 10))}</lastmod>` : ''}<priority>${u.priority}</priority></url>`).join('\n')}
</urlset>
`
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } })
}
