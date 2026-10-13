// /rss.xml (Tiếng Việt) và /rss-en.xml (English): bài Blog + Bug mẫu, có toàn bộ nội dung.
// Bài chưa có bản English thì dùng bản Tiếng Việt. Tự cập nhật theo dữ liệu (lưu đệm 1 giờ).
import { rest, originOf, postPath, bugPath, esc, mdToHtml, SITE_NAME } from './_lib.js'

const cdata = s => `<![CDATA[${String(s).replace(/]]>/g, ']]]]><![CDATA[>')}]]>`
const filled = v => (Array.isArray(v) ? v.length > 0 : typeof v === 'string' ? v.trim() !== '' : v != null)
// Lấy bản English của từng ô nếu có
const pick = (row, k, en) => (en && filled(row.en?.[k]) ? row.en[k] : row[k])
const rfc822 = d => { const t = new Date(d); return isNaN(t) ? '' : t.toUTCString() }

const L = {
  vi: { title: `${SITE_NAME} — Blog QA`, desc: 'Bài viết về kiểm thử phần mềm và bug report mẫu của Công Minh, Manual QA Tester.', steps: 'Các bước tái hiện', expected: 'Kết quả mong đợi', actual: 'Kết quả thực tế', sev: 'Mức độ', pri: 'Ưu tiên', env: 'Môi trường', product: 'Sản phẩm', cat: 'Bug report' },
  en: { title: `${SITE_NAME} — QA Blog`, desc: 'Articles about software testing and sample bug reports by Công Minh, Manual QA Tester.', steps: 'Steps to reproduce', expected: 'Expected result', actual: 'Actual result', sev: 'Severity', pri: 'Priority', env: 'Environment', product: 'Product', cat: 'Bug report' },
}
const cap = s => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1)

export async function GET(request) {
  const origin = originOf(request)
  const en = new URL(request.url).searchParams.get('lang') === 'en'
  const lg = en ? 'en' : 'vi', T = L[lg]
  const q = en ? '?lang=en' : ''
  const [posts, bugs] = await Promise.all([
    rest('posts?select=id,title,slug,excerpt,content,image,published_at,created_at,tags,en&visible=eq.true&order=published_at.desc.nullslast&limit=30'),
    rest('bugs?select=id,title,severity,priority,product,environment,steps,expected,actual,content,image,found_at,created_at,tags,en&visible=eq.true&order=sort.asc&limit=20'),
  ])
  const items = [
    ...(posts || []).map(p => {
      const link = origin + postPath(p) + q
      const body = [p.image && `<p><img src="${esc(p.image)}" alt=""></p>`, filled(pick(p, 'excerpt', en)) && `<p><strong>${esc(pick(p, 'excerpt', en))}</strong></p>`, mdToHtml(pick(p, 'content', en) || '', origin)].filter(Boolean).join('\n')
      return { title: pick(p, 'title', en), link, date: p.published_at || p.created_at, desc: pick(p, 'excerpt', en) || '', html: body, tags: pick(p, 'tags', en) || [] }
    }),
    ...(bugs || []).map(b => {
      const link = origin + bugPath(b) + q
      const sec = (h, md) => (filled(md) ? `<h3>${esc(h)}</h3>\n${mdToHtml(md, origin)}` : '')
      const facts = [[T.sev, cap(b.severity)], [T.pri, cap(b.priority)], [T.product, pick(b, 'product', en)], [T.env, pick(b, 'environment', en)]].filter(([, v]) => filled(v))
      const body = [
        `<ul>${facts.map(([k, v]) => `<li><strong>${esc(k)}:</strong> ${esc(v)}</li>`).join('')}</ul>`,
        sec(T.steps, pick(b, 'steps', en)), sec(T.expected, pick(b, 'expected', en)), sec(T.actual, pick(b, 'actual', en)),
        b.image && `<p><img src="${esc(b.image)}" alt=""></p>`, mdToHtml(pick(b, 'content', en) || '', origin),
      ].filter(Boolean).join('\n')
      return { title: `[BUG-${String(b.id).padStart(3, '0')}] ${pick(b, 'title', en)}`, link, date: b.found_at || b.created_at, desc: pick(b, 'product', en) || '', html: body, tags: [T.cat, ...(pick(b, 'tags', en) || [])] }
    }),
  ].sort((x, y) => (Date.parse(y.date) || 0) - (Date.parse(x.date) || 0)).slice(0, 40)

  const self = `${origin}/rss${en ? '-en' : ''}.xml`
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
  <title>${esc(T.title)}</title>
  <link>${esc(origin + '/' + q)}</link>
  <description>${esc(T.desc)}</description>
  <language>${en ? 'en' : 'vi'}</language>
  <atom:link href="${esc(self)}" rel="self" type="application/rss+xml"/>
  ${items[0] ? `<lastBuildDate>${rfc822(items[0].date)}</lastBuildDate>` : ''}
${items.map(it => `  <item>
    <title>${esc(it.title)}</title>
    <link>${esc(it.link)}</link>
    <guid isPermaLink="true">${esc(it.link)}</guid>
    ${rfc822(it.date) ? `<pubDate>${rfc822(it.date)}</pubDate>` : ''}
    ${(Array.isArray(it.tags) ? it.tags : []).map(c => `<category>${esc(c)}</category>`).join('')}
    <description>${esc(it.desc)}</description>
    <content:encoded>${cdata(it.html)}</content:encoded>
  </item>`).join('\n')}
</channel>
</rss>
`
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } })
}
