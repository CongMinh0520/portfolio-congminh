// Trang chi tiết bài Blog / Dự án: chèn sẵn tiêu đề, mô tả, ảnh chia sẻ vào HTML
// để Facebook, Zalo, Google đọc được ngay mà không cần chạy JavaScript. Giao diện vẫn là trang React như cũ.
// Mọi trang đi qua hàm này (kể cả type=static: /blog, /cv, /kiem-thu) đều được nhúng sẵn dữ liệu trang chủ.
import { rest, homeData, originOf, postPath, projectPath, bugPath, idFromSlug, esc, SITE_NAME, homeInfo } from './_lib.js'

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

// Trang tĩnh: đường dẫn, tiêu đề, mô tả, chữ nhỏ trên ảnh chia sẻ (vercel.json truyền ?page=…)
const STATIC = {
  cv: { path: '/cv', off: 'sec_page_cv', title: 'CV', kind: 'Manual QA Tester', desc: 'CV online của Công Minh, Manual QA Tester: kỹ năng, kinh nghiệm và dự án. In hoặc lưu PDF ngay trên trình duyệt.' },
  'kiem-thu': { path: '/kiem-thu', off: 'sec_page_selftest', title: 'Mình đã test chính trang web này', kind: 'QA', desc: 'Kết quả tự kiểm thử trang web portfolio: điểm Lighthouse, trình duyệt đã test, checklist trợ năng và các bug đã tìm ra.' },
  blog: { path: '/blog', title: 'Blog', kind: 'Blog', desc: 'Bài viết về kiểm thử phần mềm, tự động hóa và chất lượng sản phẩm.' },
}

export async function GET(request) {
  const origin = originOf(request)
  const q = new URL(request.url).searchParams
  const type = q.get('type'), id = idFromSlug(q.get('slug'))
  // Dữ liệu trang chủ tải song song, nhúng sẵn vào HTML: trình duyệt vẽ trang ngay, không phải chờ gọi Supabase
  const dataP = homeData()
  let html = await loadShell(origin)
  let meta = null, status = 200

  if (type === 'home') {
    // Trang chủ: tiêu đề, mô tả, ảnh chia sẻ lấy từ phần Đầu trang (Admin) — đổi trong Admin là link chia sẻ đổi theo
    const data = await dataP
    const [st] = data ? [data.settings] : (await rest('settings?select=hero,lang_default,footer_tagline,en&id=eq.1')) || []
    const socials = data ? (data.socials || []).filter(x => x.visible !== false) : (await rest('socials?select=url&visible=eq.true&order=sort.asc')) || []
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
  } else if (type === 'notfound') status = 404 // đường dẫn lạ (vercel.json: mọi đường dẫn chưa khớp)
  else if (type === 'bug' && id) {
    const [b] = (await rest(`bugs?select=id,title,product,actual,image&id=eq.${id}&visible=eq.true`)) || []
    if (b) meta = { title: `${b.title} — ${SITE_NAME}`, ogTitle: b.title, desc: plain([b.product, b.actual].filter(Boolean).join(' — ')), type: 'article', image: ogImage(origin, b.image, b.title, 'Bug report'), canonical: origin + bugPath(b) }
    else status = 404
  } else if (type === 'static' && STATIC[q.get('page')]?.off && ((await dataP)?.settings?.hidden || []).includes(STATIC[q.get('page')].off)) {
    status = 404 // trang đã tắt trong Admin → Bố cục (client cũng hiện "Không tìm thấy", App.jsx)
  } else if (type === 'static' && STATIC[q.get('page')]) {
    // /cv, /kiem-thu, /blog: tiêu đề, mô tả, ảnh chia sẻ riêng (giống useSeo trong src/App.jsx)
    const sp = STATIC[q.get('page')]
    let title = sp.title, path = sp.path, image = ''
    if (q.get('page') === 'blog') {
      const tag = q.get('the') || '', n = Math.max(1, parseInt(q.get('trang'), 10) || 1)
      title = `${tag ? `Blog #${tag}` : 'Blog'}${n > 1 ? ` — Trang ${n}` : ''}`
      path = '/blog' + ([tag && `the=${encodeURIComponent(tag)}`, n > 1 && `trang=${n}`].filter(Boolean).join('&').replace(/^./, '?$&'))
    }
    if (q.get('page') === 'cv') { const data = await dataP; const av = homeInfo(data?.settings).avatar; if (/^https?:\/\//i.test(av)) image = av }
    meta = { title: `${title} — ${SITE_NAME}`, ogTitle: title, desc: sp.desc, type: 'website', image: image || ogImage(origin, '', title, sp.kind), canonical: origin + path }
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
  // Trang không tồn tại: báo Google đừng lập chỉ mục (giao diện "Không tìm thấy" do React vẽ)
  if (status === 404) html = html.replace(/<\/head>/i, '<meta name="robots" content="noindex">\n</head>')
  // Nhúng dữ liệu (src/useContent.js đọc thẻ này). Trình duyệt vẫn tự tải bản mới ở nền nên sửa trong Admin vẫn hiện ra.
  const data = await dataP
  if (data) html = html.replace(/<\/body>/i, `<script id="cm-data" type="application/json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>\n</body>`)
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400' } })
}
