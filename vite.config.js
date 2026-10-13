import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { readFileSync, copyFileSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'

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

export default defineConfig({
  plugins: [react(), tailwindcss(), preconnect(), ...(process.env.SINGLEFILE ? [viteSingleFile()] : [appShell()])],
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
