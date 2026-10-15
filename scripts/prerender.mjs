// Build trang tĩnh (Jamstack): chạy sau `vite build`, tải dữ liệu công khai 1 lần rồi ghi sẵn HTML cho từng trang,
// cùng RSS, sitemap, robots.txt vào dist/. Vercel phục vụ thẳng các file này từ CDN, không gọi Supabase mỗi lượt xem.
// Bài / dự án / bug mới thêm sau lần build vẫn mở được: vercel.json chuyển đường dẫn chưa có file sang api/page.
//
// Địa chỉ web (canonical, og:url, sitemap): SITE_URL, hoặc tên miền production của Vercel.
// Thiếu biến Supabase (chạy demo) thì bỏ qua. Trên Vercel mà tải dữ liệu lỗi thì dừng build để giữ bản đang chạy.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { postPath, projectPath, bugPath } from '../render/shared.js'
import { STATIC, homeMeta, postMeta, projectMeta, bugMeta, staticMeta, renderPage } from '../render/page.js'
import { renderRss, renderSitemap, renderRobots } from '../render/feeds.js'

const DIST = 'dist'

// Chạy ở máy: đọc .env (Vercel đã có sẵn biến môi trường)
if (existsSync('.env')) for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2')
}
const SUPA = (process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '')
const KEY = process.env.VITE_SUPABASE_ANON_KEY || ''
const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL
const ORIGIN = (process.env.SITE_URL || (prod ? `https://${prod}` : '') || 'https://congminh-qa.vercel.app').replace(/\/+$/, '')

if (!SUPA || !KEY) { console.log('prerender: chưa có VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY → bỏ qua (bản demo)'); process.exit(0) }

async function homeData() {
  const r = await fetch(`${SUPA}/rest/v1/rpc/get_home`, { method: 'POST', headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, body: '{}' })
  if (!r.ok) throw new Error(`get_home ${r.status}: ${await r.text()}`)
  return r.json()
}

let data
try { data = await homeData() } catch (e) {
  console.error('prerender: không tải được dữ liệu:', e.message)
  process.exit(process.env.VERCEL ? 1 : 0)
}

const shell = readFileSync(join(DIST, 'app.html'), 'utf8')
const shown = rows => (rows || []).filter(r => r.visible !== false)
const posts = shown(data.posts), projects = shown(data.projects), bugs = shown(data.bugs), socials = shown(data.socials)
const hidden = data.settings?.hidden || []
const time = d => Date.parse(d) || 0

let n = 0
const write = (path, body) => { const f = join(DIST, path); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, body); n++ }
const page = (path, meta, status = 200) => write(path, renderPage(shell, { meta, status, data }))

page('index.html', homeMeta(data.settings, socials, ORIGIN))
for (const p of posts) page(`${postPath(p)}.html`, postMeta(p, ORIGIN))
for (const p of projects) page(`${projectPath(p)}.html`, projectMeta(p, ORIGIN))
for (const b of bugs) page(`${bugPath(b)}.html`, bugMeta(b, ORIGIN))
// Trang tĩnh đã tắt trong Admin → Bố cục thì không tạo file: đường dẫn rơi về api/page và trả 404 như trước
for (const key of Object.keys(STATIC)) if (!STATIC[key].off || !hidden.includes(STATIC[key].off)) page(`${key}.html`, staticMeta(key, { settings: data.settings }, ORIGIN))
page('404.html', null, 404)

// Cùng thứ tự với truy vấn cũ trong api/rss.js và api/sitemap.js
// Mới nhất trước; ô trống xếp cuối (nullsLast) hoặc đầu (mặc định của Postgres khi sắp giảm dần)
const byDate = (k, nullsLast) => (a, b) => {
  const an = a[k] == null, bn = b[k] == null
  return an !== bn ? (an ? 1 : -1) * (nullsLast ? 1 : -1) : time(b[k]) - time(a[k])
}
const bySort = (a, b) => (a.sort ?? 0) - (b.sort ?? 0)
const rssPosts = [...posts].sort(byDate('published_at', true)).slice(0, 30), rssBugs = [...bugs].sort(bySort).slice(0, 20)
write('rss.xml', renderRss({ posts: rssPosts, bugs: rssBugs, origin: ORIGIN }))
write('rss-en.xml', renderRss({ posts: rssPosts, bugs: rssBugs, origin: ORIGIN, en: true }))
write('sitemap.xml', renderSitemap({ posts: [...posts].sort(byDate('published_at', false)), projects: [...projects].sort(bySort), bugs: [...bugs].sort(bySort), hidden, origin: ORIGIN }))
write('robots.txt', renderRobots(ORIGIN))

console.log(`prerender: ${n} file (${posts.length} bài, ${projects.length} dự án, ${bugs.length} bug) cho ${ORIGIN}`)
