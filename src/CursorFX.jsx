// Hiệu ứng con trỏ chuột. Chọn trong Admin → Hiệu ứng chuột.
// Tự tắt trên màn hình cảm ứng và khi máy bật "giảm chuyển động".
import { useEffect, useRef } from 'react'

// Hiệu ứng CON TRỎ: thay đổi chính con trỏ (thường ẩn mũi tên mặc định)
export const POINTERS = [
  ['none', 'Mặc định', 'Giữ mũi tên mặc định của máy.'],
  ['target', 'Tâm ngắm khóa mục tiêu', '4 góc khung xoay chậm quanh con trỏ; trỏ vào nút hay link thì bung ra “khóa” đúng khung nút. (Cảm hứng từ Target Cursor của React Bits)'],
  ['label', 'Con trỏ có chữ', 'Chấm tròn đảo màu theo nền; trỏ vào thẻ dự án hay bài blog thì phình to, hiện chữ XEM / ĐỌC. Kiểu hay gặp ở portfolio Awwwards.'],
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
const INTERACTIVE = 'a, button, [role="button"], [role="switch"], input, textarea, select, label'

function CursorLayer({ effect = 'none', hideNative = true }) {
  const root = useRef(null)

  useEffect(() => {
    if (!effect || effect === 'none') return
    if (matchMedia('(pointer: coarse)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const host = root.current
    host.innerHTML = ''
    const el = (css, cls = '') => { const d = document.createElement('div'); d.className = cls; d.style.cssText = `position:fixed;left:0;top:0;pointer-events:none;${css}`; host.appendChild(d); return d }
    const m = { x: innerWidth / 2, y: innerHeight / 2, seen: false, down: false, hover: null }
    let raf = 0, cleanups = []
    const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); cleanups.push(() => t.removeEventListener(ev, fn, o)) }

    on(window, 'pointermove', e => { m.x = e.clientX; m.y = e.clientY; m.seen = true; m.hover = e.target.closest?.(INTERACTIVE) || null; m.target = e.target })
    on(window, 'pointerdown', () => { m.down = true })
    on(window, 'pointerup', () => { m.down = false })
    on(document.documentElement, 'pointerleave', () => { m.seen = false })

    if (hideNative && ['ring', 'magnetic', 'inspector', 'target', 'label', 'blob'].includes(effect)) {
      const st = document.createElement('style')
      st.textContent = 'html.cfx-hide, html.cfx-hide *{cursor:none!important} html.cfx-hide input, html.cfx-hide textarea, html.cfx-hide [contenteditable]{cursor:text!important}'
      host.appendChild(st); document.documentElement.classList.add('cfx-hide')
      cleanups.push(() => document.documentElement.classList.remove('cfx-hide'))
    }

    /* ---------- Vòng tròn / Nam châm ---------- */
    if (effect === 'ring' || effect === 'magnetic') {
      const dot = el('width:8px;height:8px;margin:-4px 0 0 -4px;border-radius:50%;background:#fff;z-index:9999;mix-blend-mode:difference;transition:opacity .2s,width .2s,height .2s,margin .2s')
      const ring = el('width:38px;height:38px;margin:-19px 0 0 -19px;border-radius:50%;border:1.5px solid rgba(233,75,158,.85);z-index:9998;transition:width .25s cubic-bezier(.22,1,.36,1),height .25s cubic-bezier(.22,1,.36,1),margin .25s cubic-bezier(.22,1,.36,1),background-color .25s,border-color .25s,opacity .2s')
      const r = { x: m.x, y: m.y }
      let pulled = null
      const release = () => { if (pulled) { pulled.style.transform = ''; pulled = null } }
      cleanups.push(release)
      const loop = () => {
        r.x = lerp(r.x, m.x, 0.18); r.y = lerp(r.y, m.y, 0.18)
        dot.style.transform = `translate3d(${m.x}px,${m.y}px,0)`
        ring.style.transform = `translate3d(${r.x}px,${r.y}px,0) scale(${m.down ? 0.8 : 1})`
        const big = !!m.hover
        const s = big ? 64 : 38
        ring.style.width = ring.style.height = s + 'px'; ring.style.margin = `${-s / 2}px 0 0 ${-s / 2}px`
        ring.style.backgroundColor = big ? 'rgba(102,80,255,.16)' : 'transparent'
        ring.style.borderColor = big ? 'rgba(102,80,255,.9)' : 'rgba(233,75,158,.85)'
        dot.style.opacity = ring.style.opacity = m.seen ? 1 : 0
        if (effect === 'magnetic') {
          const t = m.hover && m.hover.matches('a, button') && m.hover.offsetWidth < 360 ? m.hover : null
          if (t !== pulled) {
            release()
            if (t) {
              const b = t.getBoundingClientRect()
              pulled = t; pulled._c = { x: b.left + b.width / 2 + scrollX, y: b.top + b.height / 2 + scrollY }
              t.style.transition = 'transform .35s cubic-bezier(.22,1,.36,1)'
            }
          }
          if (pulled) {
            const cx = pulled._c.x - scrollX, cy = pulled._c.y - scrollY
            pulled.style.transform = `translate(${(m.x - cx) * 0.3}px, ${(m.y - cy) * 0.3}px)`
          }
        }
        raf = requestAnimationFrame(loop)
      }
      loop()
    }

    /* ---------- Đốm sáng ---------- */
    if (effect === 'glow') {
      const g = el('width:520px;height:520px;margin:-260px 0 0 -260px;border-radius:50%;z-index:9990;mix-blend-mode:screen;opacity:.0;transition:opacity .4s;background:radial-gradient(circle, rgba(233,75,158,.32), rgba(102,80,255,.18) 40%, transparent 68%)')
      const core = el('width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;z-index:9999;background:radial-gradient(circle,#fff,rgba(233,75,158,.6) 60%,transparent);mix-blend-mode:screen')
      const r = { x: m.x, y: m.y }
      const loop = () => {
        r.x = lerp(r.x, m.x, 0.08); r.y = lerp(r.y, m.y, 0.08)
        g.style.transform = `translate3d(${r.x}px,${r.y}px,0) scale(${m.hover ? 1.25 : 1})`
        g.style.opacity = m.seen ? 1 : 0
        core.style.transform = `translate3d(${m.x}px,${m.y}px,0)`; core.style.opacity = m.seen ? 1 : 0
        raf = requestAnimationFrame(loop)
      }
      loop()
    }

    /* ---------- Canvas: Bụi sao / Sao chổi ---------- */
    if (effect === 'sparkle' || effect === 'comet') {
      const c = document.createElement('canvas'); c.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999'
      host.appendChild(c)
      const ctx = c.getContext('2d'); let dpr = 1
      const size = () => { dpr = Math.min(2, devicePixelRatio || 1); c.width = innerWidth * dpr; c.height = innerHeight * dpr; c.style.width = innerWidth + 'px'; c.style.height = innerHeight + 'px' }
      size(); on(window, 'resize', size)
      const parts = [], pts = []; let last = { x: m.x, y: m.y }, head = { x: m.x, y: m.y }
      const star = (x, y, r, rot) => {
        ctx.beginPath()
        for (let i = 0; i < 8; i++) { const a = rot + i * Math.PI / 4, rr = i % 2 ? r * 0.35 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) }
        ctx.closePath(); ctx.fill()
      }
      const loop = () => {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, innerWidth, innerHeight)
        ctx.globalCompositeOperation = 'lighter'
        if (effect === 'sparkle') {
          const dist = Math.hypot(m.x - last.x, m.y - last.y)
          const n = Math.min(6, Math.floor(dist / 7))
          for (let i = 0; i < n; i++) {
            const t = i / Math.max(1, n)
            parts.push({ x: lerp(last.x, m.x, t), y: lerp(last.y, m.y, t), vx: (Math.random() - 0.5) * 1.2, vy: (Math.random() - 0.5) * 1.2 + 0.4,
              r: 1.5 + Math.random() * 3.5, life: 1, rot: Math.random() * 6, spin: (Math.random() - 0.5) * 0.2, col: mix(Math.random()), shape: Math.random() < 0.35 })
          }
          if (m.down && Math.random() < 0.6) parts.push({ x: m.x, y: m.y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, r: 2 + Math.random() * 3, life: 1, rot: 0, spin: 0.1, col: mix(Math.random()), shape: true })
          last = { x: m.x, y: m.y }
          for (let i = parts.length - 1; i >= 0; i--) {
            const p = parts[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.03; p.life -= 0.018; p.rot += p.spin
            if (p.life <= 0) { parts.splice(i, 1); continue }
            ctx.fillStyle = `rgba(${p.col},${p.life})`
            if (p.shape) star(p.x, p.y, p.r * 1.6 * p.life + 1, p.rot)
            else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2); ctx.fill() }
          }
        } else {
          head.x = lerp(head.x, m.x, 0.35); head.y = lerp(head.y, m.y, 0.35)
          pts.unshift({ x: head.x, y: head.y }); if (pts.length > 28) pts.pop()
          if (!m.seen) pts.splice(0, pts.length)
          for (let i = 1; i < pts.length; i++) {
            const t = i / pts.length
            ctx.strokeStyle = `rgba(${mix(t)},${(1 - t) * 0.9})`
            ctx.lineWidth = (1 - t) * (m.hover ? 14 : 9) + 0.5; ctx.lineCap = 'round'
            ctx.beginPath(); ctx.moveTo(pts[i - 1].x, pts[i - 1].y); ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke()
          }
          if (pts[0]) { ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.arc(pts[0].x, pts[0].y, 3, 0, Math.PI * 2); ctx.fill() }
        }
        raf = requestAnimationFrame(loop)
      }
      loop()
    }

    /* ---------- Lưới chấm phản ứng ---------- */
    if (effect === 'dots') {
      // Canvas nằm dưới nội dung: chèn đầu <body>, còn main/footer/aside được đặt position:relative để vẽ đè lên
      const c = document.createElement('canvas'); c.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:0'
      document.body.prepend(c); cleanups.push(() => c.remove())
      const st = document.createElement('style'); st.textContent = 'html.cfx-under main, html.cfx-under footer, html.cfx-under aside{position:relative}'
      host.appendChild(st); document.documentElement.classList.add('cfx-under'); cleanups.push(() => document.documentElement.classList.remove('cfx-under'))
      const ctx = c.getContext('2d'); const S = 26, R = 140, PUSH = 22
      let dpr = 1, grid = []
      const size = () => {
        dpr = Math.min(2, devicePixelRatio || 1); c.width = innerWidth * dpr; c.height = innerHeight * dpr
        c.style.width = innerWidth + 'px'; c.style.height = innerHeight + 'px'
        grid = []
        for (let x = S / 2; x < innerWidth + S; x += S) for (let y = S / 2; y < innerHeight + S; y += S) grid.push({ x, y, ox: 0, oy: 0, k: 0 })
      }
      size(); on(window, 'resize', size)
      const loop = () => {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, innerWidth, innerHeight)
        for (const d of grid) {
          const dx = d.x - m.x, dy = d.y - m.y, dist = Math.hypot(dx, dy) || 1
          const e = m.seen && dist < R ? (1 - dist / R) ** 2 : 0
          // dạt ra nhanh, trôi về chậm
          const t = e > d.k ? 0.35 : 0.06
          d.k = lerp(d.k, e, t)
          d.ox = lerp(d.ox, (dx / dist) * e * PUSH, t); d.oy = lerp(d.oy, (dy / dist) * e * PUSH, t)
          if (d.k < 0.01) { ctx.fillStyle = 'rgba(255,255,255,.10)'; ctx.fillRect(d.x - 1.1, d.y - 1.1, 2.2, 2.2); continue }
          const col = mix(Math.min(1, dist / R))
          ctx.fillStyle = `rgba(${col},${0.25 + d.k * 0.75})`
          ctx.beginPath(); ctx.arc(d.x + d.ox, d.y + d.oy, 1.3 + d.k * 2.6, 0, Math.PI * 2); ctx.fill()
        }
        raf = requestAnimationFrame(loop)
      }
      loop()
    }

    /* ---------- Tâm ngắm khóa mục tiêu ---------- */
    if (effect === 'target') {
      const ease = 'cubic-bezier(.22,1,.36,1)'
      const dot = el('width:6px;height:6px;margin:-3px 0 0 -3px;border-radius:50%;background:#fff;z-index:9999;box-shadow:0 0 10px #e94b9e')
      const wrap = el('z-index:9998;width:0;height:0')
      const L = 12
      const sides = ['border-right:0;border-bottom:0', 'border-left:0;border-bottom:0', 'border-right:0;border-top:0', 'border-left:0;border-top:0']
      const corners = sides.map(sd => { const c = document.createElement('div'); c.style.cssText = `position:absolute;left:0;top:0;width:${L}px;height:${L}px;border:2.5px solid #fff;${sd};border-radius:2px;transition:border-color .25s`; wrap.appendChild(c); return c })
      const tag = el(`z-index:9998;font:700 9px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:1.5px;color:#e94b9e;white-space:nowrap;opacity:0;transition:opacity .25s ${ease}`)
      tag.textContent = 'TARGET LOCKED'
      const b = { x: m.x, y: m.y, w: 34, h: 34 }; let ang = 0
      const loop = () => {
        const t = m.hover && m.hover.matches('a, button, [role="button"], [role="switch"]') ? m.hover.getBoundingClientRect() : null
        const pad = 7
        const goal = t ? { x: t.left + t.width / 2, y: t.top + t.height / 2, w: t.width + pad * 2, h: t.height + pad * 2 }
                       : { x: m.x, y: m.y, w: m.down ? 24 : 34, h: m.down ? 24 : 34 }
        const k = t ? 0.25 : 0.32
        b.x = lerp(b.x, goal.x, k); b.y = lerp(b.y, goal.y, k); b.w = lerp(b.w, goal.w, 0.22); b.h = lerp(b.h, goal.h, 0.22)
        if (t) { const near = Math.round(ang / 180) * 180; ang = lerp(ang, near, 0.25); if (Math.abs(ang - near) < 0.5) ang = near } else ang = (ang + 1.4) % 360
        wrap.style.transform = `translate3d(${b.x}px,${b.y}px,0) rotate(${ang}deg)`
        const hw = b.w / 2, hh = b.h / 2
        ;[[-hw, -hh], [hw - L, -hh], [-hw, hh - L], [hw - L, hh - L]].forEach(([cx, cy], i) => {
          corners[i].style.transform = `translate(${cx}px,${cy}px)`; corners[i].style.borderColor = t ? (i % 3 ? '#a58bff' : '#e94b9e') : 'rgba(255,255,255,.85)'
        })
        dot.style.transform = `translate3d(${m.x}px,${m.y}px,0)`
        tag.style.transform = `translate3d(${b.x - hw}px,${b.y - hh - 16}px,0)`; tag.style.opacity = t && m.seen ? 1 : 0
        dot.style.opacity = wrap.style.opacity = m.seen ? 1 : 0
        raf = requestAnimationFrame(loop)
      }
      loop()
    }

    /* ---------- Con trỏ có chữ ---------- */
    if (effect === 'label') {
      const ease = 'cubic-bezier(.22,1,.36,1)'
      const ball = el(`width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;background:#fff;mix-blend-mode:difference;z-index:9999;transition:width .35s ${ease},height .35s ${ease},margin .35s ${ease},opacity .25s`)
      const big = el(`width:96px;height:96px;margin:-48px 0 0 -48px;border-radius:50%;background:linear-gradient(135deg,#e94b9e,#6650ff);z-index:9999;display:grid;place-items:center;font:800 12px/1 Inter,system-ui,sans-serif;letter-spacing:2.5px;color:#fff;box-shadow:0 12px 40px rgba(102,80,255,.45);scale:0;transition:scale .45s ${ease},opacity .3s`)
      const r = { x: m.x, y: m.y }
      const loop = () => {
        r.x = lerp(r.x, m.x, 0.2); r.y = lerp(r.y, m.y, 0.2)
        const lab = m.target?.closest?.('[data-cursor-label]')
        const p = `translate3d(${r.x}px,${r.y}px,0)`
        ball.style.transform = p; big.style.transform = p
        if (lab) { big.textContent = lab.dataset.cursorLabel; big.style.scale = m.down ? 0.85 : 1; ball.style.opacity = 0 }
        else {
          big.style.scale = 0; ball.style.opacity = m.seen ? 1 : 0
          const s = m.hover ? 46 : m.down ? 10 : 14
          ball.style.width = ball.style.height = s + 'px'; ball.style.margin = `${-s / 2}px 0 0 ${-s / 2}px`
        }
        if (!m.seen) big.style.scale = 0
        raf = requestAnimationFrame(loop)
      }
      loop()
    }

    /* ---------- Giọt thạch ---------- */
    if (effect === 'blob') {
      const NS = 'http://www.w3.org/2000/svg'
      const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.style.position = 'absolute'
      svg.innerHTML = '<defs><filter id="cfx-goo"><feGaussianBlur in="SourceGraphic" stdDeviation="9" result="b"/><feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10"/></filter></defs>'
      host.appendChild(svg)
      const layer = el('z-index:9998;width:100vw;height:100vh;filter:url(#cfx-goo)')
      const specs = [[46, 0.32, '#e94b9e'], [34, 0.17, '#b257d6'], [24, 0.1, '#6650ff']]
      const blobs = specs.map(([size, k, col]) => {
        const d = document.createElement('div')
        d.style.cssText = `position:absolute;left:0;top:0;width:${size}px;height:${size}px;margin:${-size / 2}px 0 0 ${-size / 2}px;border-radius:50%;background:${col};transition:width .3s,height .3s,margin .3s`
        layer.appendChild(d); return { d, k, size, x: m.x, y: m.y }
      })
      const dot = el('width:6px;height:6px;margin:-3px 0 0 -3px;border-radius:50%;background:#fff;z-index:9999')
      const loop = () => {
        blobs.forEach((b, i) => {
          b.x = lerp(b.x, m.x, b.k); b.y = lerp(b.y, m.y, b.k)
          const s = i === 0 && m.hover ? 66 : i === 0 && m.down ? 36 : b.size
          b.d.style.width = b.d.style.height = s + 'px'; b.d.style.margin = `${-s / 2}px 0 0 ${-s / 2}px`
          b.d.style.transform = `translate3d(${b.x}px,${b.y}px,0)`
        })
        dot.style.transform = `translate3d(${m.x}px,${m.y}px,0)`
        layer.style.opacity = dot.style.opacity = m.seen ? 1 : 0
        raf = requestAnimationFrame(loop)
      }
      loop()
    }

    /* ---------- Mực loang / Tia lửa khi bấm (canvas) ---------- */
    if (effect === 'splash' || effect === 'spark') {
      const c = document.createElement('canvas')
      c.style.cssText = `position:fixed;inset:0;pointer-events:none;z-index:9990;${effect === 'splash' ? 'mix-blend-mode:screen' : ''}`
      host.appendChild(c)
      const ctx = c.getContext('2d'); let dpr = 1
      const size = () => { dpr = Math.min(2, devicePixelRatio || 1); c.width = innerWidth * dpr; c.height = innerHeight * dpr; c.style.width = innerWidth + 'px'; c.style.height = innerHeight + 'px' }
      size(); on(window, 'resize', size)
      const parts = []; let last = { x: m.x, y: m.y }, hue = 0
      const ink = (x, y, vx, vy, r, a) => { if (parts.length < 220) parts.push({ x, y, vx, vy, r, a, life: 1, t: (hue = (hue + 0.013) % 1) }) }
      if (effect === 'splash') on(window, 'pointerdown', e => { for (let i = 0; i < 14; i++) { const t = Math.random() * 6.28, sp = 2 + Math.random() * 5; ink(e.clientX, e.clientY, Math.cos(t) * sp, Math.sin(t) * sp, 18 + Math.random() * 22, 0.5) } })
      if (effect === 'spark') on(window, 'pointerdown', e => {
        const n = 10
        for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2 + Math.random() * 0.2; parts.push({ x: e.clientX, y: e.clientY, t, life: 1, col: i % 3 === 2 ? '255,255,255' : mix(i % 2).join(',') }) }
      })
      const loop = () => {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, innerWidth, innerHeight)
        if (effect === 'splash') {
          const vx = m.x - last.x, vy = m.y - last.y, sp = Math.hypot(vx, vy)
          if (m.seen && sp > 1) { const n = Math.min(4, Math.ceil(sp / 12)); for (let i = 0; i < n; i++) { const k = i / n; ink(lerp(last.x, m.x, k), lerp(last.y, m.y, k), vx * 0.18 + (Math.random() - 0.5), vy * 0.18 + (Math.random() - 0.5), 10 + Math.min(26, sp * 0.6), 0.32) } }
          last = { x: m.x, y: m.y }
          ctx.globalCompositeOperation = 'lighter'
          for (let i = parts.length - 1; i >= 0; i--) {
            const p = parts[i]; p.x += p.vx; p.y += p.vy; p.vx *= 0.94; p.vy *= 0.94; p.r += 0.9; p.life -= 0.012
            if (p.life <= 0) { parts.splice(i, 1); continue }
            const col = mix(0.5 + 0.5 * Math.sin(p.t * Math.PI * 2)).join(',')
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r)
            g.addColorStop(0, `rgba(${col},${p.a * p.life})`); g.addColorStop(1, `rgba(${col},0)`)
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill()
          }
        } else {
          for (let i = parts.length - 1; i >= 0; i--) {
            const p = parts[i]; p.life -= 0.045
            if (p.life <= 0) { parts.splice(i, 1); continue }
            const e = 1 - p.life, d1 = 6 + e * 34, d2 = d1 + 12 * p.life
            ctx.strokeStyle = `rgba(${p.col},${p.life})`; ctx.lineWidth = 2.2; ctx.lineCap = 'round'
            ctx.beginPath(); ctx.moveTo(p.x + Math.cos(p.t) * d1, p.y + Math.sin(p.t) * d1); ctx.lineTo(p.x + Math.cos(p.t) * d2, p.y + Math.sin(p.t) * d2); ctx.stroke()
          }
        }
        raf = requestAnimationFrame(loop)
      }
      loop()
    }

    /* ---------- Soi bug (DevTools) ---------- */
    if (effect === 'inspector') {
      const box = el('z-index:9997;border:1px dashed #e94b9e;background:rgba(233,75,158,.07);border-radius:3px;transition:all .18s cubic-bezier(.22,1,.36,1);opacity:0')
      const tag = el('z-index:9998;font:600 11px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;color:#fff;background:#e94b9e;padding:3px 6px;border-radius:4px;white-space:nowrap;transition:transform .18s cubic-bezier(.22,1,.36,1),opacity .18s;opacity:0')
      const cross = el('width:30px;height:30px;margin:-15px 0 0 -15px;z-index:9999')
      cross.innerHTML = '<svg viewBox="0 0 30 30" width="30" height="30" fill="none" stroke="#fff" stroke-width="1.5" style="filter:drop-shadow(0 0 3px rgba(102,80,255,.9))"><circle cx="15" cy="15" r="8" stroke="#6650ff"/><path d="M15 0v9M15 21v9M0 15h9M21 15h9"/><circle cx="15" cy="15" r="1.4" fill="#e94b9e" stroke="none"/></svg>'
      const coord = el('z-index:9999;font:500 10px/1 ui-monospace,SFMono-Regular,Menlo,monospace;color:#c9cbd8;background:rgba(10,12,20,.85);border:1px solid #2f3350;padding:4px 6px;border-radius:4px;white-space:nowrap')
      let lastT = null
      const loop = () => {
        cross.style.transform = `translate3d(${m.x}px,${m.y}px,0) rotate(${m.down ? 45 : 0}deg)`; cross.style.transition = 'rotate .2s'
        coord.style.transform = `translate3d(${m.x + 18}px,${m.y + 18}px,0)`
        coord.textContent = `x ${Math.round(m.x)}  y ${Math.round(m.y + scrollY)}`
        const show = m.seen ? 1 : 0; cross.style.opacity = coord.style.opacity = show
        let t = m.target && m.target !== document.documentElement && m.target !== document.body ? m.target : null
        if (t && t.closest('[data-cfx-ignore]')) t = null
        if (t) {
          const b = t.getBoundingClientRect()
          if (b.width * b.height > innerWidth * innerHeight * 0.6) t = null
          else {
            box.style.left = b.left + 'px'; box.style.top = b.top + 'px'; box.style.width = b.width + 'px'; box.style.height = b.height + 'px'
            if (t !== lastT) {
              const cls = typeof t.className === 'string' && t.className.trim() ? '.' + t.className.trim().split(/\s+/)[0].replace(/[^\w-]/g, '') : ''
              tag.textContent = `${t.tagName.toLowerCase()}${t.id ? '#' + t.id : cls.length > 1 && cls.length < 18 ? cls : ''}  ${Math.round(b.width)}×${Math.round(b.height)}`
              lastT = t
            }
            const ty = b.top > 26 ? b.top - 22 : b.bottom + 4
            tag.style.transform = `translate3d(${Math.max(4, Math.min(b.left, innerWidth - 220))}px,${ty}px,0)`
          }
        }
        box.style.opacity = tag.style.opacity = t && m.seen ? 1 : 0
        raf = requestAnimationFrame(loop)
      }
      loop()
    }

    return () => { cancelAnimationFrame(raf); cleanups.forEach(f => f()); host.innerHTML = '' }
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
