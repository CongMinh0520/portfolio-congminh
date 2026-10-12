// Trang chi tiết bài Blog / Dự án: chèn sẵn tiêu đề, mô tả, ảnh chia sẻ vào HTML
// để Facebook, Zalo, Google đọc được ngay mà không cần chạy JavaScript. Giao diện vẫn là trang React như cũ.
import { rest, originOf, postPath, projectPath, idFromSlug, esc, SITE_NAME, homeInfo } from './_lib.js'

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

let shell // lưu đệm index.html trong lúc hàm còn "ấm"
async function loadShell(origin) {
  if (shell) return shell
  // index.html sau khi build (vercel.json gói kèm file này vào hàm); không có thì tải qua web
  // app.html: bản deploy trên Vercel (index.html đã bỏ để trang chủ đi qua hàm này)
  for (const f of ['app.html', 'index.html']) { if (!shell) try { shell = await readFile(join(process.cwd(), 'dist', f), 'utf8') } catch {} }
  if (!shell) { try { const r = await fetch(`${origin}/app.html`); if (r.ok) shell = await r.text() } catch {} }
  return shell || '<!doctype html><html lang="vi"><head><meta charset="utf-8"></head><body><div id="root"></div></body></html>'
}

const plain = (s, n = 160) => { const t = String(s || '').replace(/[#*_`>\[\]()!]/g, '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : t }
const ogImage = (origin, img, title, kind, date) => /^https?:\/\//i.test(img || '') ? img
  : `${origin}/api/og?${new URLSearchParams({ title, kind, ...(date ? { date } : {}) })}`

export async function GET(request) {
  const origin = originOf(request)
  const q = new URL(request.url).searchParams
  const type = q.get('type'), id = idFromSlug(q.get('slug'))
  let html = await loadShell(origin)
  let meta = null, status = 200

  if (type === 'home') {
    // Trang chủ: tiêu đề, mô tả, ảnh chia sẻ lấy từ phần Đầu trang (Admin) — đổi trong Admin là link chia sẻ đổi theo
    const [st] = (await rest('settings?select=hero,lang_default,footer_tagline,en&id=eq.1')) || []
    const socials = (await rest('socials?select=url&visible=eq.true&order=sort.asc')) || []
    const home = homeInfo(st)
    meta = { title: `${SITE_NAME} — Manual QA Tester`, ogTitle: home.title || `${SITE_NAME} — Manual QA Tester`, desc: plain(home.lead || st?.footer_tagline || ''), type: 'website',
      image: `${origin}/api/og?${new URLSearchParams({ home: '1', v: home.v })}`, canonical: origin + '/', locale: home.lang === 'en' ? 'en_US' : 'vi_VN',
      ld: { '@context': 'https://schema.org', '@type': 'Person', name: SITE_NAME, jobTitle: 'Manual QA Tester', url: origin + '/',
        ...(/^https?:\/\//i.test(home.avatar) ? { image: home.avatar } : {}), ...(socials.length ? { sameAs: socials.map(x => x.url).filter(u => /^https?:\/\//i.test(u)) } : {}) } }
  } else if (type === 'post' && id) {
    const [p] = (await rest(`posts?select=id,title,slug,excerpt,content,image,published_at,url,canonical_source,tags&id=eq.${id}&visible=eq.true`)) || []
    if (p) {
      const desc = plain(p.excerpt || p.content)
      meta = { title: `${p.title} — ${SITE_NAME}`, ogTitle: p.title, desc, type: 'article', image: ogImage(origin, p.image, p.title, 'Blog', p.published_at),
        canonical: p.canonical_source && /^https?:\/\//i.test(p.url || '') ? p.url : origin + postPath(p), published: p.published_at,
        ld: { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.title, description: desc, datePublished: p.published_at, author: { '@type': 'Person', name: SITE_NAME }, mainEntityOfPage: origin + postPath(p) } }
    } else status = 404
  } else if (type === 'project' && id) {
    const [p] = (await rest(`projects?select=id,title,description,image,category&id=eq.${id}&visible=eq.true`)) || []
    if (p) meta = { title: `${p.title} — ${SITE_NAME}`, ogTitle: p.title, desc: plain(p.description), type: 'website', image: ogImage(origin, p.image, p.title, p.category || 'Dự án'), canonical: origin + projectPath(p) }
    else status = 404
  }

  if (meta) {
    // Bỏ các thẻ mặc định trong index.html rồi chèn thẻ riêng của trang
    if (meta.desc) html = html.replace(/<meta name="description"[^>]*>\s*/i, '').replace(/<meta property="og:description"[^>]*>\s*/i, '')
    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(meta.title)}</title>`)
      .replace(/<meta property="og:(type|title|locale)"[^>]*>\s*/gi, '')
    const tags = [
      meta.desc && `<meta name="description" content="${esc(meta.desc)}">`,
      `<meta property="og:type" content="${meta.type}">`,
      `<meta property="og:title" content="${esc(meta.ogTitle)}">`,
      meta.desc && `<meta property="og:description" content="${esc(meta.desc)}">`,
      `<meta property="og:url" content="${esc(meta.canonical)}">`,
      `<meta property="og:site_name" content="${esc(SITE_NAME)}">`,
      `<meta property="og:locale" content="${meta.locale || 'vi_VN'}">`,
      `<meta property="og:image" content="${esc(meta.image)}">`,
      `<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">`,
      `<meta name="twitter:card" content="summary_large_image">`,
      `<meta name="twitter:title" content="${esc(meta.ogTitle)}">`,
      meta.desc && `<meta name="twitter:description" content="${esc(meta.desc)}">`,
      `<meta name="twitter:image" content="${esc(meta.image)}">`,
      meta.published && `<meta property="article:published_time" content="${esc(meta.published)}">`,
      `<link rel="canonical" href="${esc(meta.canonical)}">`,
      meta.ld && `<script type="application/ld+json" id="seo-ld">${JSON.stringify(meta.ld).replace(/</g, '\\u003c')}</script>`,
    ].filter(Boolean).join('\n')
    html = html.replace(/<\/head>/i, `${tags}\n</head>`)
  }
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400' } })
}
