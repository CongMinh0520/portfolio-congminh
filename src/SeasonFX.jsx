// Hiệu ứng theo mùa / dịp lễ: tuyết rơi, hoa mai rơi, hoa đào rơi, pháo hoa.
// Chỉnh trong Admin → Hiệu ứng theo mùa. Tự tắt khi máy bật "giảm chuyển động".
import { useEffect, useRef } from 'react'

export const SEASON_EFFECTS = [
  ['snow', 'Tuyết rơi', 'Bông tuyết trắng rơi chậm, đung đưa nhẹ. Hợp Giáng sinh, mùa đông.'],
  ['mai', 'Hoa mai rơi', 'Hoa mai vàng 5 cánh và cánh hoa lẻ xoay tròn rơi xuống. Hợp Tết Nguyên đán.'],
  ['dao', 'Hoa đào rơi', 'Cánh đào hồng bay nhẹ theo gió. Hợp Tết miền Bắc, mùa xuân.'],
  ['fireworks', 'Pháo hoa', 'Pháo hoa bắn lên và nổ tung nhiều màu. Hợp Giao thừa, Năm mới, ngày lễ lớn.'],
]
export const SEASON_NAME = Object.fromEntries(SEASON_EFFECTS.map(([k, n]) => [k, n]))
export const AMOUNTS = [['low', 'Ít', 0.5], ['medium', 'Vừa', 1], ['high', 'Nhiều', 1.8]]

// Ngày dạng "MM-DD", lặp lại hằng năm. Khoảng có thể vắt qua năm mới (VD 12-31 → 01-01).
const md = d => `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const inRange = (today, from, to) => (from <= to ? today >= from && today <= to : today >= from || today <= to)

/** Hiệu ứng đang áp dụng hôm nay (hoặc null) */
export function activeSeason(cfg, date = new Date()) {
  if (!cfg || cfg.mode === 'off') return null
  if (cfg.mode === 'manual') return cfg.effect || null
  const today = md(date)
  const rule = (cfg.rules || []).find(r => r.effect && r.from && r.to && inRange(today, r.from, r.to))
  return rule ? rule.effect : null
}

const rand = (a, b) => a + Math.random() * (b - a)

export default function SeasonFX({ effect, amount = 'medium' }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!effect || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const c = ref.current, ctx = c.getContext('2d')
    const mult = (AMOUNTS.find(a => a[0] === amount)?.[2] ?? 1) * (innerWidth < 640 ? 0.55 : 1)
    let W = 0, H = 0, dpr = 1, raf = 0, items = [], sparks = [], rockets = [], nextLaunch = 0
    const size = () => { dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; c.width = W * dpr; c.height = H * dpr; c.style.width = W + 'px'; c.style.height = H + 'px' }
    size(); addEventListener('resize', size)

    const fall = effect === 'snow' || effect === 'mai' || effect === 'dao'
    const count = Math.round((effect === 'snow' ? 110 : 38) * mult)
    const spawn = (top = false) => {
      const base = { x: rand(0, W), y: top ? rand(-60, -10) : rand(0, H), t: rand(0, 6.28), sw: rand(0.4, 1.4) }
      if (effect === 'snow') return { ...base, r: rand(1, 3.4), vy: rand(0.35, 1.2), a: rand(0.45, 0.95) }
      const flower = effect === 'mai' && Math.random() < 0.45
      return { ...base, flower, s: flower ? rand(7, 12) : rand(4, 7.5), vy: rand(0.5, 1.25), rot: rand(0, 6.28), vr: rand(-0.025, 0.025), flip: rand(0, 6.28), a: rand(0.75, 1) }
    }
    if (fall) items = Array.from({ length: count }, () => spawn())

    const petal = (p, col, edge) => {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, 0.55 + 0.45 * Math.abs(Math.sin(p.flip)))
      ctx.globalAlpha = p.a; ctx.fillStyle = col
      ctx.beginPath(); ctx.moveTo(0, -p.s); ctx.bezierCurveTo(p.s * 0.9, -p.s * 0.6, p.s * 0.7, p.s * 0.7, 0, p.s); ctx.bezierCurveTo(-p.s * 0.7, p.s * 0.7, -p.s * 0.9, -p.s * 0.6, 0, -p.s); ctx.fill()
      if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = 0.8; ctx.stroke() }
      ctx.restore()
    }
    const maiFlower = p => {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = p.a
      for (let i = 0; i < 5; i++) {
        ctx.rotate((Math.PI * 2) / 5)
        ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.ellipse(0, -p.s * 0.55, p.s * 0.42, p.s * 0.55, 0, 0, Math.PI * 2); ctx.fill()
      }
      ctx.fillStyle = '#f29e0c'; ctx.beginPath(); ctx.arc(0, 0, p.s * 0.28, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#b5520a'; for (let i = 0; i < 6; i++) { const a = i * 1.047; ctx.beginPath(); ctx.arc(Math.cos(a) * p.s * 0.3, Math.sin(a) * p.s * 0.3, 0.9, 0, 7); ctx.fill() }
      ctx.restore()
    }

    const PALETTE = ['#e94b9e', '#6650ff', '#ffd23f', '#3ddc97', '#00c2ff', '#ff7a45', '#ffffff']
    const launch = () => {
      const x = rand(W * 0.12, W * 0.88)
      rockets.push({ x, y: H + 10, vx: rand(-0.6, 0.6), vy: -rand(H * 0.0105, H * 0.014) - 6, ty: rand(H * 0.12, H * 0.42), col: PALETTE[Math.floor(rand(0, PALETTE.length))] })
    }
    const burst = r => {
      const n = Math.round(rand(55, 85) * Math.min(1.3, mult + 0.2)), col2 = PALETTE[Math.floor(rand(0, PALETTE.length))]
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rand(-0.05, 0.05), sp = rand(1.6, 4.6)
        sparks.push({ x: r.x, y: r.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, decay: rand(0.011, 0.018), col: Math.random() < 0.7 ? r.col : col2, trail: [] })
      }
    }

    const loop = ts => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H)
      if (fall) {
        for (const p of items) {
          p.t += 0.012; p.y += p.vy; p.x += Math.sin(p.t) * p.sw * 0.6 + (effect === 'snow' ? 0 : 0.25)
          if (p.rot !== undefined) { p.rot += p.vr; p.flip += 0.03 }
          if (p.y > H + 20 || p.x > W + 30 || p.x < -30) Object.assign(p, spawn(true))
          if (effect === 'snow') { ctx.globalAlpha = p.a; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill() }
          else if (p.flower) maiFlower(p)
          else if (effect === 'mai') petal(p, '#ffd23f', '#f2b50c')
          else petal(p, '#ffb7c9', '#ff8fae')
        }
        ctx.globalAlpha = 1
      } else {
        if (ts > nextLaunch) { launch(); if (Math.random() < 0.35 * mult) launch(); nextLaunch = ts + rand(700, 1500) / Math.max(0.6, mult) }
        ctx.globalCompositeOperation = 'lighter'
        for (let i = rockets.length - 1; i >= 0; i--) {
          const r = rockets[i]; r.x += r.vx; r.y += r.vy; r.vy *= 0.985
          ctx.fillStyle = r.col; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(r.x, r.y, 2, 0, 7); ctx.fill()
          ctx.globalAlpha = 0.35; ctx.fillRect(r.x - 0.75, r.y, 1.5, 14)
          if (r.y <= r.ty || r.vy > -1.2) { burst(r); rockets.splice(i, 1) }
        }
        for (let i = sparks.length - 1; i >= 0; i--) {
          const s = sparks[i]; s.trail.push([s.x, s.y]); if (s.trail.length > 5) s.trail.shift()
          s.vx *= 0.975; s.vy = s.vy * 0.975 + 0.045; s.x += s.vx; s.y += s.vy; s.life -= s.decay
          if (s.life <= 0) { sparks.splice(i, 1); continue }
          ctx.globalAlpha = s.life; ctx.strokeStyle = s.col; ctx.lineWidth = 1.6; ctx.lineCap = 'round'
          ctx.beginPath(); ctx.moveTo(s.trail[0][0], s.trail[0][1]); ctx.lineTo(s.x, s.y); ctx.stroke()
        }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', size); ctx.clearRect(0, 0, c.width, c.height) }
  }, [effect, amount])
  if (!effect) return null
  return <canvas ref={ref} aria-hidden="true" data-cfx-ignore="" className="pointer-events-none fixed inset-0 z-40" />
}
