// Trang dựng lúc chạy (dự phòng): trang chủ, bài, dự án, bug, trang tĩnh đã được scripts/prerender.mjs ghi sẵn thành file HTML.
// Hàm này chỉ chạy khi đường dẫn chưa có file: bài / dự án / bug mới thêm sau lần build, slug cũ, đường dẫn lạ (404).
// Chèn sẵn tiêu đề, mô tả, ảnh chia sẻ và dữ liệu trang chủ vào HTML giống bản dựng sẵn (cùng module render/).
import { rest, homeData, originOf, idFromSlug } from './_lib.js'
import { STATIC, homeMeta, postMeta, projectMeta, bugMeta, staticMeta, renderPage } from '../render/page.js'

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
    meta = homeMeta(st, socials, origin)
  } else if (type === 'post' && id) {
    const [p] = (await rest(`posts?select=id,title,slug,excerpt,content,image,published_at,url,canonical_source,tags&id=eq.${id}&visible=eq.true`)) || []
    if (p) meta = postMeta(p, origin)
    else status = 404
  } else if (type === 'project' && id) {
    const [p] = (await rest(`projects?select=id,title,description,image,category&id=eq.${id}&visible=eq.true`)) || []
    if (p) meta = projectMeta(p, origin)
    else status = 404
  } else if (type === 'notfound') status = 404 // đường dẫn lạ (vercel.json: mọi đường dẫn chưa khớp)
  else if (type === 'bug' && id) {
    const [b] = (await rest(`bugs?select=id,title,product,actual,image&id=eq.${id}&visible=eq.true`)) || []
    if (b) meta = bugMeta(b, origin)
    else status = 404
  } else if (type === 'static' && STATIC[q.get('page')]?.off && ((await dataP)?.settings?.hidden || []).includes(STATIC[q.get('page')].off)) {
    status = 404 // trang đã tắt trong Admin → Bố cục (client cũng hiện "Không tìm thấy", App.jsx)
  } else if (type === 'static' && STATIC[q.get('page')]) {
    // /cv, /kiem-thu, /blog: tiêu đề, mô tả, ảnh chia sẻ riêng (giống useSeo trong src/App.jsx)
    const page = q.get('page')
    meta = staticMeta(page, { tag: q.get('the') || '', n: Math.max(1, parseInt(q.get('trang'), 10) || 1), settings: page === 'cv' ? (await dataP)?.settings : undefined }, origin)
  }

  // Nhúng dữ liệu trang chủ. Trình duyệt vẫn tự tải bản mới ở nền nên sửa trong Admin vẫn hiện ra.
  html = renderPage(html, { meta, status, data: await dataP })
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400' } })
}
