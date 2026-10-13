// Hiệu ứng con trỏ chuột. Chọn trong Admin → Hiệu ứng chuột.
// Tự tắt trên màn hình cảm ứng và khi máy bật "giảm chuyển động".
//
// Cách làm nhẹ (giữ nguyên 12 kiểu):
// - Một bộ theo dõi chuột + một vòng lặp requestAnimationFrame DÙNG CHUNG cho mọi lớp hiệu ứng.
// - Mọi hiệu ứng tự NGỦ khi chuột đứng yên (không còn tốn CPU/GPU), có chuyển động thì tự thức dậy.
// - Chuyển động chỉ dùng transform / translate / scale (không đổi width, margin → không bắt trình duyệt tính lại bố cục).
// - Hiệu ứng canvas chỉ xóa/vẽ lại đúng vùng thay đổi (dirty-rect) và chạy tối đa 60 khung/giây, tính theo thời gian thật.
// - Không dùng mix-blend-mode / bộ lọc SVG toàn màn hình (đây là các thứ làm trình duyệt phải trộn lại cả trang mỗi khung hình).
import { useEffect, useRef } from 'react'
import { quality } from './quality.js'

// Hiệu ứng CON TRỎ: thay đổi chính con trỏ (thường ẩn mũi tên mặc định)
export const POINTERS = [
  ['none', 'Mặc định', 'Giữ mũi tên mặc định của máy.'],
  ['target', 'Tâm ngắm khóa mục tiêu', '4 góc khung xoay chậm quanh con trỏ; trỏ vào nút hay link thì bung ra “khóa” đúng khung nút. (Cảm hứng từ Target Cursor của React Bits)'],
  ['label', 'Con trỏ có chữ', 'Chấm tròn nổi bật trên mọi nền; trỏ vào thẻ dự án hay bài blog thì phình to, hiện chữ XEM / ĐỌC. Kiểu hay gặp ở portfolio Awwwards.'],
  ['ring', 'Vòng tròn đuổi theo', 'Chấm nhỏ đi đúng con trỏ, vòng tròn lướt theo sau. Phồng to khi trỏ vào nút và link.'],
  ['blob', 'Giọt thạch', 'Vài giọt tròn dính vào nhau như thạch, đuổi theo con trỏ với tốc độ khác nhau. (Cảm hứng từ Blob Cursor)'],
  ['magnetic', 'Nam châm', 'Chấm + vòng tròn; nút và link bị “hút” nhẹ về phía con trỏ khi đến gần.'],
  ['inspector', 'Soi bug (DevTools)', 'Tâm ngắm kèm tọa độ, trỏ vào đâu hiện khung đo như DevTools.'],
]
// Hiệu ứng DI CHUỘT: vệt / nền phản ứng theo chuyển động, giữ nguyên con trỏ
export const TRAILS = [
  ['none', 'Tắt', 'Không có hiệu ứng khi di chuột.'],
  ['dots', 'Lưới chấm phản ứng', 'Nền có lưới chấm mờ; quanh con trỏ các chấm sáng hồng tím và dạt ra, rồi trôi về chỗ cũ. Không che nội dung.'],
  ['glow', 'Đốm sáng', 'Một quầng sáng hồng tím mềm lướt theo chuột, như đèn rọi trên nền tối.'],
  ['splash', 'Mực loang', 'Di chuột để lại vệt mực hồng tím loang ra rồi tan dần, bấm chuột thì bung mạnh hơn. (Bản nhẹ, cảm hứng từ Splash Cursor)'],
  ['comet', 'Sao chổi', 'Một dải sáng mượt kéo đuôi theo đường di chuột.'],
  ['sparkle', 'Bụi sao', 'Mỗi lần di chuột rắc ra những hạt sáng li ti rồi tan dần.'],
  ['spark', 'Tia lửa khi bấm', 'Mỗi lần bấm chuột bắn ra các tia sáng nhỏ quanh điểm bấm. (Cảm hứng từ Click Spark)'],
]
// Lưu chung 1 cột: "contro+dichuot", VD "target+dots". Giá trị cũ chỉ có 1 kiểu vẫn đọc được.
export function parseCursor(v) {
  const parts = String(v || 'none').split('+')
  const pointer = parts.find(p => POINTERS.some(([k]) => k === p && k !== 'none')) || 'none'
  const trail = parts.find(p => TRAILS.some(([k]) => k === p && k !== 'none')) || 'none'
  return { pointer, trail }
}
export const joinCursor = ({ pointer, trail }) => `${pointer || 'none'}+${trail || 'none'}`

const PINK = [233, 75, 158], PURPLE = [102, 80, 255]
const mix = t => PINK.map((c, i) => Math.round(c + (PURPLE[i] - c) * t))
const lerp = (a, b, t) => a + (b - a) * t
// lerp theo thời gian: k = số "khung 60 Hz" đã trôi qua → màn 120/144 Hz không đuổi nhanh hơn
const lerpK = (a, b, t, k) => a + (b - a) * (1 - Math.pow(1 - t, k))
const px = v => Math.round(v * 10) / 10
const tr = (x, y) => `${px(x)}px ${px(y)}px`
const INTERACTIVE = 'a, button, [role="button"], [role="switch"], input, textarea, select, label'
const CLICKABLE = 'a, button, [role="button"], [role="switch"]'

// Chỉ ghi style khi giá trị đổi (ghi lại giá trị cũ vẫn làm trình duyệt kiểm tra lại style)
const put = (e, p, v) => { const c = e._c || (e._c = {}); if (c[p] !== v) { c[p] = v; e.style[p] = v } }

/* ================= Trạng thái chuột + vòng lặp dùng chung ================= */
const m = { x: typeof innerWidth === 'number' ? innerWidth / 2 : 0, y: typeof innerHeight === 'number' ? innerHeight / 2 : 0, seen: false, down: false, hover: null, target: null, stale: true, epoch: 0 }
const subs = new Set() // mỗi lớp hiệu ứng đăng ký 1 hàm "đánh thức"
const poke = () => { for (const w of subs) w() }

let users = 0, detach = null
function attach() {
  const offs = []
  const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); offs.push(() => t.removeEventListener(ev, fn, o)) }
  // Handler chỉ ghi vài số; việc tìm phần tử đang trỏ (closest) để dành cho vòng lặp, tối đa 1 lần/khung
  on(window, 'pointermove', e => { m.x = e.clientX; m.y = e.clientY; m.seen = true; m.target = e.target; m.stale = true; poke() }, { passive: true })
  on(window, 'pointerdown', () => { m.down = true; poke() })
  on(window, 'pointerup', () => { m.down = false; poke() })
  on(document.documentElement, 'pointerleave', () => { m.seen = false; poke() })
  // Cuộn / đổi cỡ cửa sổ: các kích thước đã lưu đệm (khung nút, khung soi bug) cần tính lại
  on(window, 'scroll', () => { m.epoch++; poke() }, { passive: true, capture: true })
  on(window, 'resize', () => { m.epoch++; poke() })
  return () => offs.forEach(f => f())
}
const retain = () => { if (users++ === 0) detach = attach() }
const release = () => { if (--users === 0) { detach?.(); detach = null } }

const ticks = new Set(), fresh = new Set()
let raf = 0, prevTs = 0
const frame = ts => {
  raf = 0
  quality.frame(ts)
  const dt = prevTs ? Math.min(50, ts - prevTs) : 16.667
  prevTs = ts
  if (m.stale) { m.hover = m.target?.closest?.(INTERACTIVE) || null; m.stale = false }
  const k = dt / 16.667
  for (const t of [...ticks]) if (t(ts, k, fresh.delete(t)) === false) ticks.delete(t) // tick trả false = đã yên, đi ngủ
  if (ticks.size) raf = requestAnimationFrame(frame); else prevTs = 0
}
const schedule = t => { if (!ticks.has(t)) { ticks.add(t); fresh.add(t) } if (!raf) raf = requestAnimationFrame(frame) }

// Giới hạn 60 khung/giây cho hiệu ứng canvas hạt, có bù nhịp để màn tần số cao vẫn ra ~60
const capped = fn => {
  const BASE = 1000 / 60; let next = 0, prev = 0
  return (ts, k, first) => {
    if (first) { next = 0; prev = 0 }
    const iv = BASE / quality.fps // máy yếu: bộ điều tiết hạ tốc độ vẽ tối đa
    if (ts + 1 < next) return true
    const late = ts - next
    next = late > iv ? ts + iv : ts + iv - Math.max(0, late)
    const dt = prev ? Math.min(50, ts - prev) : BASE; prev = ts
    return fn(ts, dt / BASE)
  }
}

// Hộp bao các thứ đã vẽ → lần sau chỉ xóa đúng vùng đó thay vì cả màn hình
const bounds = () => ({
  x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9,
  reset() { this.x0 = this.y0 = 1e9; this.x1 = this.y1 = -1e9 },
  add(x, y, r = 0) { if (x - r < this.x0) this.x0 = x - r; if (y - r < this.y0) this.y0 = y - r; if (x + r > this.x1) this.x1 = x + r; if (y + r > this.y1) this.y1 = y + r },
  get has() { return this.x1 >= this.x0 },
})
const clearBounds = (ctx, b, pad = 3) => { if (b.has) ctx.clearRect(b.x0 - pad, b.y0 - pad, b.x1 - b.x0 + pad * 2, b.y1 - b.y0 + pad * 2) }

function CursorLayer({ effect = 'none', hideNative = true }) {
  const root = useRef(null)

  useEffect(() => {
    if (!effect || effect === 'none') return
    if (matchMedia('(pointer: coarse)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const host = root.current
    host.innerHTML = ''
    const el = (css, cls = '') => { const d = document.createElement('div'); d.className = cls; d.style.cssText = `position:fixed;left:0;top:0;pointer-events:none;${css}`; host.appendChild(d); return d }
    let tick = null
    const cleanups = []
    const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); cleanups.push(() => t.removeEventListener(ev, fn, o)) }
    const wake = () => { if (tick) schedule(tick) }
    // Canvas phủ cả màn hình, tự co giãn theo cửa sổ; dpr tối đa 1.5 (hạt mờ, không cần 2x)
    // res < 1: vẽ ở độ phân giải thấp rồi phóng to bằng CSS — dành cho hiệu ứng mờ mềm (ít điểm ảnh hơn nhiều, nhìn gần như không khác)
    const makeCanvas = (css, mount, res = 1) => {
      const c = document.createElement('canvas'); c.style.cssText = `position:fixed;inset:0;pointer-events:none;${css}`
      if (mount) mount(c); else host.appendChild(c)
      const ctx = c.getContext('2d'); const cv = { c, ctx, dpr: 1, W: 0, H: 0, onSize: null }
      const size = () => {
        cv.dpr = Math.min(1.5, devicePixelRatio || 1); cv.W = innerWidth; cv.H = innerHeight
        const sc = cv.dpr * res
        c.width = Math.round(cv.W * sc); c.height = Math.round(cv.H * sc); c.style.width = cv.W + 'px'; c.style.height = cv.H + 'px'
        ctx.setTransform(sc, 0, 0, sc, 0, 0); cv.onSize?.()
      }
      size(); on(window, 'resize', () => { size(); wake() })
      return cv
    }

    subs.add(wake); retain()
    cleanups.push(() => { subs.delete(wake); if (tick) { ticks.delete(tick); fresh.delete(tick) } release() })

    if (hideNative && ['ring', 'magnetic', 'inspector', 'target', 'label', 'blob'].includes(effect)) {
      const st = document.createElement('style')
      st.textContent = 'html.cfx-hide, html.cfx-hide *{cursor:none!important} html.cfx-hide input, html.cfx-hide textarea, html.cfx-hide [contenteditable]{cursor:text!important}'
      host.appendChild(st); document.documentElement.classList.add('cfx-hide')
      cleanups.push(() => document.documentElement.classList.remove('cfx-hide'))
    }

    const SETTLE = 0.1 // sai số (px) coi như "đã tới nơi" → cho vòng lặp ngủ

    /* ---------- Vòng tròn / Nam châm ---------- */
    if (effect === 'ring' || effect === 'magnetic') {
      // Chấm trắng có viền tối mảnh thay cho mix-blend-mode: vẫn nhìn rõ trên cả nền sáng lẫn tối
      const dot = el('width:8px;height:8px;margin:-4px 0 0 -4px;border-radius:50%;background:#fff;box-shadow:0 0 0 1px rgba(10,12,20,.55);z-index:9999;will-change:translate;transition:opacity .2s')
      const ring = el('width:38px;height:38px;margin:-19px 0 0 -19px;border-radius:50%;border:1.5px solid rgba(233,75,158,.85);z-index:9998;will-change:translate,scale;transition:scale .25s cubic-bezier(.22,1,.36,1),background-color .25s,border-color .25s,opacity .2s')
      const r = { x: m.x, y: m.y }
      let pulled = null, hov = null, firstHover = true
      const drop = () => { if (pulled) { put(pulled, 'transform', ''); pulled = null } }
      cleanups.push(drop)
      tick = (ts, k) => {
        r.x = lerpK(r.x, m.x, 0.18, k); r.y = lerpK(r.y, m.y, 0.18, k)
        put(dot, 'translate', tr(m.x, m.y))
        put(ring, 'translate', tr(r.x, r.y))
        const big = !!m.hover
        // phồng to bằng scale (compositor) thay vì đổi width/height/margin (bắt tính lại bố cục)
        put(ring, 'scale', String(Math.round((big ? 64 / 38 : 1) * (m.down ? 0.8 : 1) * 1000) / 1000))
        put(ring, 'backgroundColor', big ? 'rgba(102,80,255,.16)' : 'transparent')
        put(ring, 'borderColor', big ? 'rgba(102,80,255,.9)' : 'rgba(233,75,158,.85)')
        put(dot, 'opacity', m.seen ? '1' : '0'); put(ring, 'opacity', m.seen ? '1' : '0')
        if (effect === 'magnetic') {
          // Chỉ đo offsetWidth / getBoundingClientRect khi phần tử đang trỏ ĐỔI, không đo mỗi khung hình
          if (m.hover !== hov || firstHover) {
            hov = m.hover; firstHover = false
            const t = hov && hov.matches('a, button') && hov.offsetWidth < 360 ? hov : null
            if (t !== pulled) {
              drop()
              if (t) {
                const b = t.getBoundingClientRect()
                pulled = t; pulled._m = { x: b.left + b.width / 2 + scrollX, y: b.top + b.height / 2 + scrollY }
                t.style.transition = 'transform .35s cubic-bezier(.22,1,.36,1)'
              }
            }
          }
          if (pulled) {
            const cx = pulled._m.x - scrollX, cy = pulled._m.y - scrollY
            put(pulled, 'transform', `translate(${px((m.x - cx) * 0.3)}px, ${px((m.y - cy) * 0.3)}px)`)
          }
        }
        return Math.abs(r.x - m.x) > SETTLE || Math.abs(r.y - m.y) > SETTLE
      }
    }

    /* ---------- Đốm sáng ---------- */
    if (effect === 'glow') {
      // Bỏ mix-blend-mode:screen (nền tối nên gần như không khác), quầng sáng nằm trên lớp riêng, chỉ dịch chuyển bằng translate
      const g = el('width:520px;height:520px;margin:-260px 0 0 -260px;border-radius:50%;z-index:9990;opacity:0;will-change:translate,scale;transition:opacity .4s;background:radial-gradient(circle, rgba(233,75,158,.32), rgba(102,80,255,.18) 40%, transparent 68%)')
      const core = el('width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;z-index:9999;will-change:translate;background:radial-gradient(circle,#fff,rgba(233,75,158,.6) 60%,transparent)')
      const r = { x: m.x, y: m.y }
      tick = (ts, k) => {
        r.x = lerpK(r.x, m.x, 0.08, k); r.y = lerpK(r.y, m.y, 0.08, k)
        put(g, 'translate', tr(r.x, r.y)); put(g, 'scale', m.hover ? '1.25' : '1')
        put(g, 'opacity', m.seen ? '1' : '0')
        put(core, 'translate', tr(m.x, m.y)); put(core, 'opacity', m.seen ? '1' : '0')
        return Math.abs(r.x - m.x) > 0.5 || Math.abs(r.y - m.y) > 0.5 // quầng sáng 520px mờ → lệch nửa pixel không ai thấy
      }
    }

    /* ---------- Canvas: Bụi sao ---------- */
    if (effect === 'sparkle') {
      const cv = makeCanvas('z-index:9999'); const { ctx } = cv
      const parts = []; let last = { x: m.x, y: m.y }
      let prevB = bounds(), nextB = bounds()
      cv.onSize = () => { prevB.reset() }
      const star = (x, y, r, rot) => {
        ctx.beginPath()
        for (let i = 0; i < 8; i++) { const a = rot + i * Math.PI / 4, rr = i % 2 ? r * 0.35 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) }
        ctx.closePath(); ctx.fill()
      }
      tick = capped((ts, k) => {
        clearBounds(ctx, prevB); nextB.reset()
        ctx.globalCompositeOperation = 'lighter'
        const dist = Math.hypot(m.x - last.x, m.y - last.y)
        let busy = dist > 0 || m.down
        const n = Math.min(Math.round(6 * quality.n), Math.floor(dist / 7))
        for (let i = 0; i < n; i++) {
          const t = i / Math.max(1, n)
          parts.push({ x: lerp(last.x, m.x, t), y: lerp(last.y, m.y, t), vx: (Math.random() - 0.5) * 1.2, vy: (Math.random() - 0.5) * 1.2 + 0.4,
            r: 1.5 + Math.random() * 3.5, life: 1, rot: Math.random() * 6, spin: (Math.random() - 0.5) * 0.2, col: mix(Math.random()), shape: Math.random() < 0.35 })
        }
        if (m.down && Math.random() < 0.6) parts.push({ x: m.x, y: m.y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, r: 2 + Math.random() * 3, life: 1, rot: 0, spin: 0.1, col: mix(Math.random()), shape: true })
        last = { x: m.x, y: m.y }
        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i]; p.x += p.vx * k; p.y += p.vy * k; p.vy += 0.03 * k; p.life -= 0.018 * k; p.rot += p.spin * k
          if (p.life <= 0) { parts.splice(i, 1); continue }
          ctx.fillStyle = `rgba(${p.col},${p.life})`
          if (p.shape) { const rr = p.r * 1.6 * p.life + 1; star(p.x, p.y, rr, p.rot); nextB.add(p.x, p.y, rr + 1) }
          else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2); ctx.fill(); nextB.add(p.x, p.y, p.r + 1) }
        }
        ;[prevB, nextB] = [nextB, prevB]
        return busy || parts.length > 0
      })
    }

    /* ---------- Canvas: Sao chổi ---------- */
    if (effect === 'comet') {
      const cv = makeCanvas('z-index:9999'); const { ctx } = cv
      const pts = []; const head = { x: m.x, y: m.y }
      let prevB = bounds(), nextB = bounds()
      cv.onSize = () => { prevB.reset() }
      tick = capped((ts, k) => {
        clearBounds(ctx, prevB, 4); nextB.reset()
        ctx.globalCompositeOperation = 'lighter'
        head.x = lerpK(head.x, m.x, 0.35, k); head.y = lerpK(head.y, m.y, 0.35, k)
        pts.unshift({ x: head.x, y: head.y }); if (pts.length > Math.round(28 * quality.n)) pts.pop()
        if (!m.seen) pts.length = 0
        const w = m.hover ? 14 : 9
        ctx.lineCap = 'round'
        for (let i = 1; i < pts.length; i++) {
          const t = i / pts.length
          ctx.strokeStyle = `rgba(${mix(t)},${(1 - t) * 0.9})`
          ctx.lineWidth = (1 - t) * w + 0.5
          ctx.beginPath(); ctx.moveTo(pts[i - 1].x, pts[i - 1].y); ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke()
        }
        if (pts.length) {
          ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.arc(pts[0].x, pts[0].y, 3, 0, Math.PI * 2); ctx.fill()
          for (const p of pts) nextB.add(p.x, p.y, w / 2 + 2)
        }
        ;[prevB, nextB] = [nextB, prevB]
        const tail = pts[pts.length - 1]
        return !!tail && (Math.hypot(head.x - m.x, head.y - m.y) > 0.3 || Math.hypot(pts[0].x - tail.x, pts[0].y - tail.y) > 0.3)
      })
    }

    /* ---------- Lưới chấm phản ứng ---------- */
    if (effect === 'dots') {
      // Canvas nằm dưới nội dung: chèn đầu <body>, còn main/footer/aside được đặt position:relative để vẽ đè lên
      const cv = makeCanvas('z-index:0', c => { document.body.prepend(c); cleanups.push(() => c.remove()) }); const { ctx, c } = cv
      const st = document.createElement('style'); st.textContent = 'html.cfx-under main, html.cfx-under footer, html.cfx-under aside{position:relative}'
      host.appendChild(st); document.documentElement.classList.add('cfx-under'); cleanups.push(() => document.documentElement.classList.remove('cfx-under'))
      const S = 26, R = 140, PUSH = 22
      // Lưới chấm mờ tĩnh là ảnh nền lặp của chính canvas (vẽ một lần, trình duyệt tự lát) → mỗi khung hình KHÔNG phải vẽ lại ~1.600 chấm
      const tile = `<svg xmlns='http://www.w3.org/2000/svg' width='${S}' height='${S}'><rect x='${S / 2 - 1.1}' y='${S / 2 - 1.1}' width='2.2' height='2.2' fill='white' fill-opacity='.1'/></svg>`
      c.style.backgroundImage = `url("data:image/svg+xml,${encodeURIComponent(tile)}")`; c.style.backgroundSize = `${S}px ${S}px`
      let cols = 0, rows = 0, K, OX, OY, isAct
      const act = [] // chỉ các chấm đang dạt ra / đang trôi về mới được tính — thay vì cả ~1.600 chấm mỗi khung hình
      let prevB = bounds(), nextB = bounds()
      cv.onSize = () => {
        cols = Math.ceil((cv.W + S / 2) / S); rows = Math.ceil((cv.H + S / 2) / S)
        K = new Float32Array(cols * rows); OX = new Float32Array(cols * rows); OY = new Float32Array(cols * rows); isAct = new Uint8Array(cols * rows); act.length = 0
        prevB.reset()
      }
      cv.onSize()
      tick = capped((ts, k) => {
        clearBounds(ctx, prevB, 4); nextB.reset()
        let woke = false
        if (m.seen) { // đánh thức các chấm vừa lọt vào bán kính của chuột
          const i0 = Math.max(0, Math.floor((m.x - R - S / 2) / S)), i1 = Math.min(cols - 1, Math.ceil((m.x + R - S / 2) / S))
          const j0 = Math.max(0, Math.floor((m.y - R - S / 2) / S)), j1 = Math.min(rows - 1, Math.ceil((m.y + R - S / 2) / S))
          for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
            const id = i * rows + j
            if (!isAct[id] && Math.hypot(S / 2 + i * S - m.x, S / 2 + j * S - m.y) < R) { isAct[id] = 1; act.push(id); woke = true }
          }
        }
        let moving = woke
        for (let n = act.length - 1; n >= 0; n--) {
          const id = act[n], i = (id / rows) | 0, j = id - i * rows
          const x = S / 2 + i * S, y = S / 2 + j * S
          const dx = x - m.x, dy = y - m.y, dist = Math.hypot(dx, dy) || 1
          const e = m.seen && dist < R ? (1 - dist / R) ** 2 : 0
          // dạt ra nhanh, trôi về chậm
          const t = e > K[id] ? 0.35 : 0.06
          const pk = K[id], px0 = OX[id], py0 = OY[id]
          K[id] = lerpK(K[id], e, t, k)
          OX[id] = lerpK(OX[id], (dx / dist) * e * PUSH, t, k); OY[id] = lerpK(OY[id], (dy / dist) * e * PUSH, t, k)
          // còn dịch chuyển đáng kể thì vẽ tiếp khung sau; chuột đứng yên trên lưới và các chấm đã dừng thì ngủ (giữ nguyên hình đã vẽ)
          if (Math.abs(K[id] - pk) > 0.0005 || Math.abs(OX[id] - px0) + Math.abs(OY[id] - py0) > 0.02) moving = true
          if (K[id] < 0.01) { // còn rất mờ: chỉ còn chấm mờ tĩnh của lưới (không vẽ gì thêm) → ngừng tính
            if (e === 0) { K[id] = OX[id] = OY[id] = 0; isAct[id] = 0; act[n] = act[act.length - 1]; act.pop() }
            continue
          }
          ctx.fillStyle = `rgba(${mix(Math.min(1, dist / R))},${0.25 + K[id] * 0.75})`
          ctx.beginPath(); ctx.arc(x + OX[id], y + OY[id], 1.3 + K[id] * 2.6, 0, Math.PI * 2); ctx.fill()
          nextB.add(x + OX[id], y + OY[id], 5)
        }
        ;[prevB, nextB] = [nextB, prevB]
        return moving
      })
    }

    /* ---------- Tâm ngắm khóa mục tiêu ---------- */
    if (effect === 'target') {
      const ease = 'cubic-bezier(.22,1,.36,1)'
      const dot = el('width:6px;height:6px;margin:-3px 0 0 -3px;border-radius:50%;background:#fff;z-index:9999;box-shadow:0 0 10px #e94b9e;will-change:translate')
      const wrap = el('z-index:9998;width:0;height:0;will-change:transform')
      const L = 12
      const sides = ['border-right:0;border-bottom:0', 'border-left:0;border-bottom:0', 'border-right:0;border-top:0', 'border-left:0;border-top:0']
      const corners = sides.map(sd => { const c = document.createElement('div'); c.style.cssText = `position:absolute;left:0;top:0;width:${L}px;height:${L}px;border:2.5px solid #fff;${sd};border-radius:2px;transition:border-color .25s`; wrap.appendChild(c); return c })
      const tag = el(`z-index:9998;font:700 9px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:1.5px;color:#e94b9e;white-space:nowrap;opacity:0;will-change:translate;transition:opacity .25s ${ease}`)
      tag.textContent = 'TARGET LOCKED'
      const b = { x: m.x, y: m.y, w: 34, h: 34 }; let ang = 0
      // Khung nút đang trỏ chỉ đo lại khi đổi nút hoặc khi cuộn / đổi cỡ cửa sổ (trước đây đo mỗi khung hình)
      let hovT, rect = null, rectEpoch = -1, lastSeen = 0
      let lastW = -1, lastH = -1, lastLock = null
      tick = (ts, k) => {
        const t = m.hover && m.hover.matches(CLICKABLE) ? m.hover : null
        if (t !== hovT || (t && rectEpoch !== m.epoch)) { hovT = t; rectEpoch = m.epoch; rect = t ? t.getBoundingClientRect() : null }
        const pad = 7
        const goal = rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, w: rect.width + pad * 2, h: rect.height + pad * 2 }
                          : { x: m.x, y: m.y, w: m.down ? 24 : 34, h: m.down ? 24 : 34 }
        const kk = rect ? 0.25 : 0.32
        b.x = lerpK(b.x, goal.x, kk, k); b.y = lerpK(b.y, goal.y, kk, k); b.w = lerpK(b.w, goal.w, 0.22, k); b.h = lerpK(b.h, goal.h, 0.22, k)
        let locked = false
        if (rect) { const near = Math.round(ang / 180) * 180; ang = lerpK(ang, near, 0.25, k); if (Math.abs(ang - near) < 0.5) { ang = near; locked = true } } else ang = (ang + 1.4 * k) % 360
        put(wrap, 'transform', `translate3d(${px(b.x)}px,${px(b.y)}px,0) rotate(${Math.round(ang * 100) / 100}deg)`)
        const hw = b.w / 2, hh = b.h / 2
        // 4 góc chỉ cập nhật khi kích thước khung đổi thật sự; màu chỉ đổi khi vào/ra nút
        if (Math.abs(b.w - lastW) > 0.05 || Math.abs(b.h - lastH) > 0.05) {
          lastW = b.w; lastH = b.h
          ;[[-hw, -hh], [hw - L, -hh], [-hw, hh - L], [hw - L, hh - L]].forEach(([cx, cy], i) => put(corners[i], 'transform', `translate(${px(cx)}px,${px(cy)}px)`))
        }
        if (!!rect !== lastLock) { lastLock = !!rect; corners.forEach((c, i) => put(c, 'borderColor', rect ? (i % 3 ? '#a58bff' : '#e94b9e') : 'rgba(255,255,255,.85)')) }
        put(dot, 'translate', tr(m.x, m.y))
        put(tag, 'translate', tr(b.x - hw, b.y - hh - 16)); put(tag, 'opacity', rect && m.seen ? '1' : '0')
        put(dot, 'opacity', m.seen ? '1' : '0'); put(wrap, 'opacity', m.seen ? '1' : '0')
        if (m.seen) lastSeen = ts
        // Khi chưa trỏ vào nút, 4 góc xoay liên tục (đúng hiệu ứng). Đã khóa vào nút và đứng yên thì ngủ; chuột rời trang cũng ngủ.
        const settled = locked && Math.abs(b.x - goal.x) < SETTLE && Math.abs(b.y - goal.y) < SETTLE && Math.abs(b.w - goal.w) < SETTLE && Math.abs(b.h - goal.h) < SETTLE
        return m.seen ? !settled : ts - lastSeen < 400
      }
    }

    /* ---------- Con trỏ có chữ ---------- */
    if (effect === 'label') {
      const ease = 'cubic-bezier(.22,1,.36,1)'
      // Giữ nguyên kích thước 14px, phình to bằng scale; chấm trắng + viền tối mảnh thay cho mix-blend-mode
      const ball = el(`width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;background:#fff;box-shadow:0 0 0 1px rgba(10,12,20,.55);z-index:9999;will-change:translate,scale;transition:scale .35s ${ease},opacity .25s`)
      const big = el(`width:96px;height:96px;margin:-48px 0 0 -48px;border-radius:50%;background:linear-gradient(135deg,#e94b9e,#6650ff);z-index:9999;display:grid;place-items:center;font:800 12px/1 Inter,system-ui,sans-serif;letter-spacing:2.5px;color:#fff;box-shadow:0 12px 40px rgba(102,80,255,.45);scale:0;will-change:translate,scale;transition:scale .45s ${ease},opacity .3s`)
      const r = { x: m.x, y: m.y }
      let lastT, lab = null, text = ''
      tick = (ts, k) => {
        r.x = lerpK(r.x, m.x, 0.2, k); r.y = lerpK(r.y, m.y, 0.2, k)
        if (m.target !== lastT) { lastT = m.target; lab = m.target?.closest?.('[data-cursor-label]') || null } // closest chỉ chạy khi đổi phần tử
        const p = tr(r.x, r.y)
        put(ball, 'translate', p); put(big, 'translate', p)
        if (lab) {
          const txt = lab.dataset.cursorLabel; if (txt !== text) { text = txt; big.textContent = txt }
          put(big, 'scale', m.down ? '0.85' : '1'); put(ball, 'opacity', '0')
        } else {
          put(big, 'scale', '0'); put(ball, 'opacity', m.seen ? '1' : '0')
          put(ball, 'scale', String(m.hover ? 46 / 14 : m.down ? 10 / 14 : 1))
        }
        if (!m.seen) put(big, 'scale', '0')
        return Math.abs(r.x - m.x) > SETTLE || Math.abs(r.y - m.y) > SETTLE
      }
    }

    /* ---------- Giọt thạch ---------- */
    if (effect === 'blob') {
      // Trước đây: bộ lọc SVG (làm mờ + ngưỡng) phủ cả màn hình, rất nặng. Nay: tính trường "metaball" trên một canvas
      // độ phân giải thấp (1/2) và CHỈ ở vùng quanh các giọt; các giọt vẫn dính vào nhau như thạch.
      const S = 0.5
      const cv = makeCanvas('z-index:9998'); const { ctx, c } = cv
      let prevR = null
      // canvas thấp độ phân giải (phóng to bằng CSS); makeCanvas gọi lại hàm này mỗi khi đổi cỡ cửa sổ
      const lowSize = () => { c.width = Math.ceil(innerWidth * S); c.height = Math.ceil(innerHeight * S); c.style.width = innerWidth + 'px'; c.style.height = innerHeight + 'px'; ctx.setTransform(1, 0, 0, 1, 0, 0); prevR = null }
      cv.onSize = lowSize; lowSize()
      const specs = [[46, 0.32, [233, 75, 158]], [34, 0.17, [178, 87, 214]], [24, 0.1, [102, 80, 255]]]
      const blobs = specs.map(([size, k, col]) => ({ size, k, col, r: size / 2, x: m.x, y: m.y }))
      const dot = el('width:6px;height:6px;margin:-3px 0 0 -3px;border-radius:50%;background:#fff;box-shadow:0 0 0 1px rgba(10,12,20,.4);z-index:9999;will-change:translate')
      tick = capped((ts, k) => {
        let settled = true, sumR4 = 0
        blobs.forEach((b, i) => {
          b.x = lerpK(b.x, m.x, b.k, k); b.y = lerpK(b.y, m.y, b.k, k)
          const tr_ = i === 0 && m.hover ? 33 : i === 0 && m.down ? 18 : b.size / 2
          b.r = lerpK(b.r, tr_, 0.25, k)
          if (Math.abs(b.x - m.x) > 0.3 || Math.abs(b.y - m.y) > 0.3 || Math.abs(b.r - tr_) > 0.1) settled = false
          sumR4 += b.r ** 4
        })
        put(dot, 'translate', tr(m.x, m.y)); put(dot, 'opacity', m.seen ? '1' : '0'); put(c, 'opacity', m.seen ? '1' : '0')
        if (prevR) ctx.clearRect(prevR.x, prevR.y, prevR.w, prevR.h)
        prevR = null
        if (m.seen) {
          // Vùng có ảnh hưởng: ngoài khoảng này tổng trường luôn < ngưỡng ((Σr⁴ / 0.8)^¼) → không cần tính điểm ảnh
          // Trường dùng lũy thừa 4 (r/d)⁴: các giọt chồng lên nhau không phình to ra, chỉ nối cổ khi ở gần nhau như thạch
          const reach = Math.pow(sumR4 / 0.8, 0.25) + 2
          let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9
          for (const b of blobs) { x0 = Math.min(x0, b.x - reach); y0 = Math.min(y0, b.y - reach); x1 = Math.max(x1, b.x + reach); y1 = Math.max(y1, b.y + reach) }
          const ox = Math.max(0, Math.floor(x0 * S)), oy = Math.max(0, Math.floor(y0 * S))
          const w = Math.min(c.width - ox, Math.ceil(x1 * S) - ox), h = Math.min(c.height - oy, Math.ceil(y1 * S) - oy)
          if (w > 0 && h > 0) {
            const img = ctx.createImageData(w, h), d = img.data
            for (let yy = 0; yy < h; yy++) {
              const y = (oy + yy + 0.5) / S
              for (let xx = 0; xx < w; xx++) {
                const x = (ox + xx + 0.5) / S
                let f = 0, cr = 0, cg = 0, cb = 0
                for (let n = 0; n < 3; n++) { const b = blobs[n], dx = x - b.x, dy = y - b.y, q = (b.r * b.r) / (dx * dx + dy * dy + 1), v = q * q; f += v; cr += v * b.col[0]; cg += v * b.col[1]; cb += v * b.col[2] }
                if (f < 0.85) continue
                const a = Math.min(1, (f - 0.85) / 0.3), i = (yy * w + xx) * 4
                d[i] = cr / f; d[i + 1] = cg / f; d[i + 2] = cb / f; d[i + 3] = a > 0 ? a * 255 : 0
              }
            }
            ctx.putImageData(img, ox, oy); prevR = { x: ox, y: oy, w, h }
          }
        }
        return !settled
      })
    }

    /* ---------- Mực loang / Tia lửa khi bấm (canvas) ---------- */
    if (effect === 'splash' || effect === 'spark') {
      // Bỏ mix-blend-mode:screen cho cả lớp canvas (bên trong vẫn cộng sáng bằng 'lighter')
      const cv = makeCanvas('z-index:9990', null, effect === 'splash' ? 0.5 : 1); const { ctx } = cv
      const parts = []; let last = { x: m.x, y: m.y }, hue = 0
      let prevB = bounds(), nextB = bounds()
      cv.onSize = () => { prevB.reset() }
      // Mực loang: vẽ sẵn 16 "đốm" gradient theo dải màu rồi chỉ drawImage (trước đây tạo createRadialGradient cho TỪNG hạt mỗi khung hình)
      const SPR = 16, sprites = []
      if (effect === 'splash') for (let i = 0; i < SPR; i++) {
        const s = document.createElement('canvas'); s.width = s.height = 64
        const g = s.getContext('2d'), col = mix(i / (SPR - 1)).join(','), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32)
        gr.addColorStop(0, `rgba(${col},1)`); gr.addColorStop(1, `rgba(${col},0)`)
        g.fillStyle = gr; g.fillRect(0, 0, 64, 64); sprites.push(s)
      }
      const ink = (x, y, vx, vy, r, a) => { if (parts.length < 220 * quality.n) parts.push({ x, y, vx, vy, r, a, life: 1, t: (hue = (hue + 0.013) % 1) }) }
      if (effect === 'splash') on(window, 'pointerdown', e => { for (let i = 0; i < 14; i++) { const t = Math.random() * 6.28, sp = 2 + Math.random() * 5; ink(e.clientX, e.clientY, Math.cos(t) * sp, Math.sin(t) * sp, 18 + Math.random() * 22, 0.5) } wake() })
      if (effect === 'spark') on(window, 'pointerdown', e => {
        const n = 10
        for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2 + Math.random() * 0.2; parts.push({ x: e.clientX, y: e.clientY, t, life: 1, col: i % 3 === 2 ? '255,255,255' : mix(i % 2).join(',') }) }
        wake()
      })
      tick = capped((ts, k) => {
        clearBounds(ctx, prevB, 4); nextB.reset()
        if (effect === 'splash') {
          const vx = m.x - last.x, vy = m.y - last.y, sp = Math.hypot(vx, vy)
          if (m.seen && sp > 1) { const n = Math.min(Math.max(1, Math.round(4 * quality.n)), Math.ceil(sp / 12)); for (let i = 0; i < n; i++) { const kk = i / n; ink(lerp(last.x, m.x, kk), lerp(last.y, m.y, kk), vx * 0.18 + (Math.random() - 0.5), vy * 0.18 + (Math.random() - 0.5), 10 + Math.min(26, sp * 0.6), 0.32) } }
          last = { x: m.x, y: m.y }
          ctx.globalCompositeOperation = 'lighter'
          const fr = Math.pow(0.94, k)
          for (let i = parts.length - 1; i >= 0; i--) {
            const p = parts[i]; p.x += p.vx * k; p.y += p.vy * k; p.vx *= fr; p.vy *= fr; p.r += 0.9 * k; p.life -= 0.012 * k
            if (p.life <= 0) { parts.splice(i, 1); continue }
            ctx.globalAlpha = p.a * p.life
            ctx.drawImage(sprites[Math.round((0.5 + 0.5 * Math.sin(p.t * Math.PI * 2)) * (SPR - 1))], p.x - p.r, p.y - p.r, p.r * 2, p.r * 2)
            nextB.add(p.x, p.y, p.r + 1)
          }
          ctx.globalAlpha = 1
        } else {
          ctx.lineWidth = 2.2; ctx.lineCap = 'round'
          for (let i = parts.length - 1; i >= 0; i--) {
            const p = parts[i]; p.life -= 0.045 * k
            if (p.life <= 0) { parts.splice(i, 1); continue }
            const e = 1 - p.life, d1 = 6 + e * 34, d2 = d1 + 12 * p.life
            ctx.strokeStyle = `rgba(${p.col},${p.life})`
            ctx.beginPath(); ctx.moveTo(p.x + Math.cos(p.t) * d1, p.y + Math.sin(p.t) * d1); ctx.lineTo(p.x + Math.cos(p.t) * d2, p.y + Math.sin(p.t) * d2); ctx.stroke()
            nextB.add(p.x, p.y, d2 + 3)
          }
        }
        ;[prevB, nextB] = [nextB, prevB]
        // hết hạt mực / tia lửa thì nghỉ, chờ lần di / bấm chuột tiếp theo
        return parts.length > 0
      })
    }

    /* ---------- Soi bug (DevTools) ---------- */
    if (effect === 'inspector') {
      // Mọi thứ chỉ cập nhật khi chuột di chuyển / cuộn: không có vòng lặp chạy nền. Khung & nhãn dịch bằng translate,
      // chỉ đổi width/height khi chuyển sang phần tử khác (trước đây ghi left/top/width/height + textContent mỗi khung hình).
      const ez = 'cubic-bezier(.22,1,.36,1)'
      const box = el(`z-index:9997;border:1px dashed #e94b9e;background:rgba(233,75,158,.07);border-radius:3px;opacity:0;will-change:translate;transition:translate .18s ${ez},width .18s ${ez},height .18s ${ez},opacity .18s`)
      const tag = el(`z-index:9998;font:600 11px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;color:#fff;background:#e94b9e;padding:3px 6px;border-radius:4px;white-space:nowrap;opacity:0;will-change:translate;transition:translate .18s ${ez},opacity .18s`)
      const cross = el('width:30px;height:30px;margin:-15px 0 0 -15px;z-index:9999;will-change:translate;transition:rotate .2s')
      cross.innerHTML = '<svg viewBox="0 0 30 30" width="30" height="30" fill="none" stroke="#fff" stroke-width="1.5" style="filter:drop-shadow(0 0 3px rgba(102,80,255,.9))"><circle cx="15" cy="15" r="8" stroke="#6650ff"/><path d="M15 0v9M15 21v9M0 15h9M21 15h9"/><circle cx="15" cy="15" r="1.4" fill="#e94b9e" stroke="none"/></svg>'
      const coord = el('z-index:9999;font:500 10px/1 ui-monospace,SFMono-Regular,Menlo,monospace;color:#c9cbd8;background:rgba(10,12,20,.85);border:1px solid #2f3350;padding:4px 6px;border-radius:4px;white-space:nowrap;min-width:84px;contain:layout paint style;will-change:translate')
      let lastRaw, t = null, lastT = null, rect = null, rectEpoch = -1, coordTxt = ''
      tick = () => {
        put(cross, 'translate', tr(m.x, m.y)); put(cross, 'rotate', m.down ? '45deg' : '0deg')
        put(coord, 'translate', tr(m.x + 18, m.y + 18))
        const txt = `x ${Math.round(m.x)}  y ${Math.round(m.y + scrollY)}`
        if (txt !== coordTxt) { coordTxt = txt; coord.textContent = txt }
        const show = m.seen ? '1' : '0'; put(cross, 'opacity', show); put(coord, 'opacity', show)
        if (m.target !== lastRaw) { // chọn phần tử để soi: chỉ tính khi đổi phần tử dưới chuột
          lastRaw = m.target; rectEpoch = -1
          t = m.target && m.target !== document.documentElement && m.target !== document.body ? m.target : null
          if (t && t.closest('[data-cfx-ignore]')) t = null
        }
        if (t && rectEpoch !== m.epoch) { // khung đo chỉ lấy lại khi đổi phần tử hoặc sau khi cuộn / đổi cỡ cửa sổ
          rectEpoch = m.epoch
          rect = t.getBoundingClientRect()
          if (rect.width * rect.height > innerWidth * innerHeight * 0.6) rect = null
        }
        const b = t ? rect : null
        if (b) {
          put(box, 'translate', tr(b.left, b.top)); put(box, 'width', b.width + 'px'); put(box, 'height', b.height + 'px')
          if (t !== lastT) {
            const cls = typeof t.className === 'string' && t.className.trim() ? '.' + t.className.trim().split(/\s+/)[0].replace(/[^\w-]/g, '') : ''
            tag.textContent = `${t.tagName.toLowerCase()}${t.id ? '#' + t.id : cls.length > 1 && cls.length < 18 ? cls : ''}  ${Math.round(b.width)}×${Math.round(b.height)}`
            lastT = t
          } else if (!tag.textContent.endsWith(`${Math.round(b.width)}×${Math.round(b.height)}`)) {
            tag.textContent = tag.textContent.replace(/\s+\d+×\d+$/, `  ${Math.round(b.width)}×${Math.round(b.height)}`)
          }
          const ty = b.top > 26 ? b.top - 22 : b.bottom + 4
          put(tag, 'translate', tr(Math.max(4, Math.min(b.left, innerWidth - 220)), ty))
        }
        put(box, 'opacity', b && m.seen ? '1' : '0'); put(tag, 'opacity', b && m.seen ? '1' : '0')
        return false // không cần khung hình kế tiếp: lần di chuột / cuộn sau sẽ đánh thức lại
      }
    }

    wake()
    return () => { cleanups.forEach(f => f()); host.innerHTML = '' }
  }, [effect, hideNative])

  return <div ref={root} aria-hidden="true" data-cfx-ignore="" />
}

// Chạy cùng lúc 1 hiệu ứng con trỏ + 1 hiệu ứng di chuột
export default function CursorFX({ effect, hideNative = true }) {
  const { pointer, trail } = parseCursor(effect)
  return <>
    <CursorLayer key={`p-${pointer}`} effect={pointer} hideNative={hideNative} />
    <CursorLayer key={`t-${trail}`} effect={trail} hideNative={hideNative} />
  </>
}
