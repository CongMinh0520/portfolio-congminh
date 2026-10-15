// Thẻ SEO / chia sẻ cho từng loại trang và chèn chúng vào khung HTML (dist/app.html).
// Hàm thuần: nhận dữ liệu đã tải sẵn, trả meta hoặc chuỗi HTML.
import { SITE_NAME, esc, homeInfo, postPath, projectPath, bugPath } from './shared.js'

export const plain = (s, n = 160) => { const t = String(s || '').replace(/[#*_`>\[\]()!]/g, '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : t }
const ogImage = (origin, img, title, kind, date) => /^https?:\/\//i.test(img || '') ? img
  : `${origin}/api/og?${new URLSearchParams({ title, kind, ...(date ? { date } : {}) })}`

// Trang tĩnh: đường dẫn, tiêu đề, mô tả, chữ nhỏ trên ảnh chia sẻ
export const STATIC = {
  cv: { path: '/cv', off: 'sec_page_cv', title: 'CV', kind: 'Manual QA Tester', desc: 'CV online của Công Minh, Manual QA Tester: kỹ năng, kinh nghiệm và dự án. In hoặc lưu PDF ngay trên trình duyệt.' },
  'kiem-thu': { path: '/kiem-thu', off: 'sec_page_selftest', title: 'Mình đã test chính trang web này', kind: 'QA', desc: 'Kết quả tự kiểm thử trang web portfolio: điểm Lighthouse, trình duyệt đã test, checklist trợ năng và các bug đã tìm ra.' },
  blog: { path: '/blog', title: 'Blog', kind: 'Blog', desc: 'Bài viết về kiểm thử phần mềm, tự động hóa và chất lượng sản phẩm.' },
}

/** Trang chủ: tiêu đề, mô tả, ảnh chia sẻ lấy từ phần Đầu trang (Admin) */
export function homeMeta(st, socials, origin) {
  const home = homeInfo(st)
  return { title: `${SITE_NAME} — Manual QA Tester`, ogTitle: home.title || `${SITE_NAME} — Manual QA Tester`, desc: plain(home.lead || st?.footer_tagline || ''), type: 'website',
    image: `${origin}/api/og?${new URLSearchParams({ home: '1', v: home.v })}`, canonical: origin + '/', locale: home.lang === 'en' ? 'en_US' : 'vi_VN',
    ld: { '@context': 'https://schema.org', '@type': 'Person', name: SITE_NAME, jobTitle: 'Manual QA Tester', url: origin + '/',
      ...(/^https?:\/\//i.test(home.avatar) ? { image: home.avatar } : {}), ...(socials.length ? { sameAs: socials.map(x => x.url).filter(u => /^https?:\/\//i.test(u)) } : {}) } }
}

export function postMeta(p, origin) {
  const desc = plain(p.excerpt || p.content)
  return { title: `${p.title} — ${SITE_NAME}`, ogTitle: p.title, desc, type: 'article', image: ogImage(origin, p.image, p.title, 'Blog', p.published_at),
    canonical: p.canonical_source && /^https?:\/\//i.test(p.url || '') ? p.url : origin + postPath(p), published: p.published_at,
    ld: { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.title, description: desc, datePublished: p.published_at, author: { '@type': 'Person', name: SITE_NAME }, mainEntityOfPage: origin + postPath(p) } }
}

export const projectMeta = (p, origin) =>
  ({ title: `${p.title} — ${SITE_NAME}`, ogTitle: p.title, desc: plain(p.description), type: 'website', image: ogImage(origin, p.image, p.title, p.category || 'Dự án'), canonical: origin + projectPath(p) })

export const bugMeta = (b, origin) =>
  ({ title: `${b.title} — ${SITE_NAME}`, ogTitle: b.title, desc: plain([b.product, b.actual].filter(Boolean).join(' — ')), type: 'article', image: ogImage(origin, b.image, b.title, 'Bug report'), canonical: origin + bugPath(b) })

/** /cv, /kiem-thu, /blog (có thể kèm ?the=…&trang=…). settings dùng lấy ảnh đại diện cho /cv */
export function staticMeta(page, { tag = '', n = 1, settings } = {}, origin) {
  const sp = STATIC[page]
  let title = sp.title, path = sp.path, image = ''
  if (page === 'blog') {
    title = `${tag ? `Blog #${tag}` : 'Blog'}${n > 1 ? ` — Trang ${n}` : ''}`
    path = '/blog' + ([tag && `the=${encodeURIComponent(tag)}`, n > 1 && `trang=${n}`].filter(Boolean).join('&').replace(/^./, '?$&'))
  }
  if (page === 'cv') { const av = homeInfo(settings).avatar; if (/^https?:\/\//i.test(av)) image = av }
  return { title: `${title} — ${SITE_NAME}`, ogTitle: title, desc: sp.desc, type: 'website', image: image || ogImage(origin, '', title, sp.kind), canonical: origin + path }
}

/** Chèn thẻ meta, noindex (404) và dữ liệu trang chủ (src/useContent.js đọc thẻ cm-data) vào khung HTML */
export function renderPage(shell, { meta, status = 200, data }) {
  let html = shell
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
  if (data) html = html.replace(/<\/body>/i, `<script id="cm-data" type="application/json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>\n</body>`)
  return html
}
