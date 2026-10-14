import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { readFileSync, copyFileSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Thông tin phiên bản cho Admin → Phiên bản: số phiên bản, ngày build, phiên bản thật của từng thư viện đang cài
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
const installed = name => { try { return JSON.parse(readFileSync(new URL(`./node_modules/${name}/package.json`, import.meta.url), 'utf8')).version } catch { return '' } }
const deps = Object.fromEntries(Object.entries({ ...pkg.dependencies, ...pkg.devDependencies }).map(([n, r]) => [n, installed(n) || String(r).replace(/^[\^~]/, '')]))
const APP_INFO = { version: pkg.version, built: new Date().toISOString(), deps }

// npm run build        → bản deploy bình thường (tách file, trang Admin tải riêng)
// npm run build:single → gộp tất cả vào 1 file index.html (để xem thử / gửi file)
// Bản deploy: thêm app.html (khung trang cho mọi đường dẫn). Trên Vercel bỏ index.html để trang chủ "/"
// đi qua hàm api/page (chèn tiêu đề, mô tả, ảnh chia sẻ riêng cho trang chủ).
const appShell = () => ({
  name: 'app-shell',
  apply: 'build',
  closeBundle() {
    const dir = this?.environment?.config?.build?.outDir || 'dist'
    const index = join(dir, 'index.html')
    if (!existsSync(index)) return
    copyFileSync(index, join(dir, 'app.html'))
    if (process.env.VERCEL) rmSync(index)
  },
})

// Mở sẵn kết nối tới Supabase ngay từ lúc trình duyệt đọc HTML (tiết kiệm bước bắt tay DNS/TLS cho request dữ liệu đầu tiên)
const preconnect = () => {
  let origin = ''
  return {
    name: 'preconnect-supabase',
    configResolved(c) { try { origin = new URL(loadEnv(c.mode, c.root, 'VITE_').VITE_SUPABASE_URL).origin } catch { origin = '' } },
    transformIndexHtml: () => origin ? [{ tag: 'link', attrs: { rel: 'preconnect', href: origin, crossorigin: '' }, injectTo: 'head-prepend' }] : [],
  }
}

// Admin → Tìm kiếm (Ctrl+K): tự lập danh sách các phần bên trong từng trang Admin (VD Thông báo › Thông báo đẩy)
// bằng cách đọc code lúc build/dev, nên thêm hay đổi tên một phần là ô tìm kiếm tự cập nhật, không phải sửa tay.
// - Trang nào dùng component nào: đọc dòng `page === 'notify' && <NotifyAdmin` trong Admin.jsx + dòng import
// - Lấy chữ trong <h2>/<h3> và title={a('…')} / title: '…' của file trang đó và các file phụ nó dùng (VD PushAdmin.jsx)
// - Bỏ chuỗi giống câu chú thích (dài, có dấu . ? ! :) và trang đã có tìm theo từng ô (Thông tin chung, Bố cục, Tin nhắn)
// Dùng: import SECTIONS from 'virtual:admin-sections' → [[trang, tiêu đề tiếng Việt], …]
const adminSections = () => {
  const ID = 'virtual:admin-sections', RID = '\0' + ID
  const SKIP_PAGES = new Set(['settings', 'layout', 'messages'])
  const src = f => readFileSync(new URL(`./src/${f}`, import.meta.url), 'utf8')
  const importsOf = code => Object.fromEntries([...code.matchAll(/^import\s+([^;]+?)\s+from\s+'\.\/(\w+\.jsx)'/gm)]
    .flatMap(([, names, file]) => names.replace(/[{}]/g, ' ').split(/[\s,]+/).filter(n => /^[A-Z]/.test(n)).map(n => [n, file])))
  // Thân một component viết ngay trong Admin.jsx (VD Dashboard): từ "function X(" tới khối/hàm kế tiếp
  const bodyOf = (code, name) => {
    const i = code.indexOf(`function ${name}(`); if (i < 0) return ''
    const rest = code.slice(i + 1), j = rest.search(/\n(?:export default )?function |\n\/\* -{3,}/)
    return j < 0 ? rest : rest.slice(0, j)
  }
  const titlesIn = code => [
    ...[...code.matchAll(/<h[23][^>]*>\s*\{a\('([^']+)'\)/g)].map(m => m[1]),
    ...[...code.matchAll(/<h[23][^>]*>([^<{}]+)<\/h[23]>/g)].map(m => m[1].trim()),
    // title= chỉ tính khi truyền vào component (<Card title=…>, <Row title=…>); title= trên thẻ thường là chú thích khi rê chuột
    ...[...code.matchAll(/<[A-Z]\w*\b[^<]*?\btitle=\{a\('([^']+)'\)\}/g)].map(m => m[1]),
    ...[...code.matchAll(/\btitle: '([^']+)'/g)].map(m => m[1]),
  ].filter(t => t && t.length <= 50 && !/[.?!:"“{]/.test(t))
  return {
    name: 'admin-sections',
    resolveId: id => (id === ID ? RID : null),
    load(id) {
      if (id !== RID) return null
      const admin = src('Admin.jsx'), imp = importsOf(admin)
      const pages = [...admin.matchAll(/page === '(\w+)' && <(\w+)/g)].filter(([, p]) => !SKIP_PAGES.has(p))
      const pageFiles = new Set(pages.map(([, , c]) => imp[c]).filter(Boolean))
      const out = []
      pages.forEach(([, page, comp]) => {
        // Code của trang: file riêng, hoặc thân hàm trong Admin.jsx kèm các file nó dùng (VD Dashboard → StatsAdmin.jsx)
        const own = imp[comp] ? src(imp[comp]) : bodyOf(admin, comp)
        const ownImp = imp[comp] ? importsOf(own) : imp
        // File phụ của trang (VD PushAdmin.jsx). Bỏ trang khác và component dùng chung mà Admin.jsx cũng import
        // (VD RichEditor: nút In đậm, Chèn link… không phải "phần" của trang) — trừ khi trang viết ngay trong Admin.jsx
        const shared = f => imp[comp] && Object.values(imp).includes(f)
        const used = [...new Set([...own.matchAll(/<([A-Z]\w+)/g)].map(m => ownImp[m[1]]))]
          .filter(f => f && f !== imp[comp] && !pageFiles.has(f) && f !== 'Admin.jsx' && !shared(f))
        const codes = [own, ...used.map(f => { this.addWatchFile(fileURLToPath(new URL(`./src/${f}`, import.meta.url))); return src(f) })]
        if (imp[comp]) this.addWatchFile(fileURLToPath(new URL(`./src/${imp[comp]}`, import.meta.url)))
        const seen = new Set()
        codes.flatMap(titlesIn).forEach(t => { if (!seen.has(t)) { seen.add(t); out.push([page, t]) } })
      })
      this.addWatchFile(fileURLToPath(new URL('./src/Admin.jsx', import.meta.url)))
      return `export default ${JSON.stringify(out)}`
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), preconnect(), adminSections(), ...(process.env.SINGLEFILE ? [viteSingleFile()] : [appShell()])],
  build: {
    target: 'es2022', // trình duyệt từ 2022 trở lên: bỏ bớt mã chuyển đổi cú pháp cũ
    // Bản deploy: tách React ra file riêng. File này hầu như không đổi giữa các lần deploy nên khách giữ cache được
    // (cache dài 1 năm cho /assets), chỉ tải lại phần code của bạn khi có bản mới. Bản 1 file (demo) không tách.
    ...(process.env.SINGLEFILE ? {} : { rolldownOptions: { output: { codeSplitting: { groups: [
      { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 20 },
    ] } } } }),
  },
  // Bản 1 file (demo) không có máy chủ trả trang cho link thật → dùng link dạng #/blog/...
  define: { 'import.meta.env.VITE_HASH_ROUTER': JSON.stringify(process.env.SINGLEFILE ? '1' : ''), __APP_INFO__: JSON.stringify(APP_INFO) },
})
