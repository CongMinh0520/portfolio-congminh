// Bộ vẽ hiệu ứng theo mùa: tuyết, hoa mai, hoa đào, pháo hoa. Chạy trong Web Worker (vẽ ngoài luồng chính — cuộn trang,
// bấm chuột không bị khựng vì hiệu ứng) hoặc ngay trên luồng chính nếu trình duyệt không hỗ trợ Worker + OffscreenCanvas.
import { quality } from './quality.js'

const rand = (a, b) => a + Math.random() * (b - a)

// Tốc độ vẽ tối đa. Tuyết / cánh hoa rơi chậm nên 30 khung/giây là đủ mượt (nhẹ bằng một nửa);
// pháo hoa chuyển động nhanh hơn nên để 45. Mọi chuyển động tính theo THỜI GIAN thực (dt), không theo số khung hình,
// nên màn 120/144 Hz không còn rơi nhanh gấp đôi và tốc độ không đổi dù có bị giới hạn khung hình.
const FPS = { snow: 30, mai: 30, dao: 30, fireworks: 45 }
const FRAME = 1000 / 60 // 1 "đơn vị khung hình" của các hằng số chuyển động gốc (viết cho 60 Hz)

// Vẽ sẵn một hình lên canvas phụ (2x để thu nhỏ vẫn nét) rồi chỉ việc drawImage mỗi khung hình
const sprite = (w, h, draw) => {
  // OffscreenCanvas dùng được cả trong Worker (không có document); trình duyệt cũ thì dùng canvas thường
  const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h })
  const g = c.getContext('2d'); g.translate(w / 2, h / 2); draw(g); return c
}
const PETAL = 16, FLOWER = 24 // kích thước gốc của sprite (sau đó thu theo p.s)
const petalSprite = (fill, edge) => sprite(PETAL * 2 + 6, PETAL * 2 + 6, g => {
  const s = PETAL
  g.fillStyle = fill; g.beginPath(); g.moveTo(0, -s)
  g.bezierCurveTo(s * 0.9, -s * 0.6, s * 0.7, s * 0.7, 0, s); g.bezierCurveTo(-s * 0.7, s * 0.7, -s * 0.9, -s * 0.6, 0, -s); g.fill()
  g.strokeStyle = edge; g.lineWidth = 1.6; g.stroke()
})
const flowerSprite = () => sprite(FLOWER * 2 + 8, FLOWER * 2 + 8, g => {
  const s = FLOWER
  for (let i = 0; i < 5; i++) {
    g.rotate((Math.PI * 2) / 5)
    g.fillStyle = '#ffd23f'; g.beginPath(); g.ellipse(0, -s * 0.55, s * 0.42, s * 0.55, 0, 0, Math.PI * 2); g.fill()
  }
  g.fillStyle = '#f29e0c'; g.beginPath(); g.arc(0, 0, s * 0.28, 0, Math.PI * 2); g.fill()
  g.fillStyle = '#b5520a'
  for (let i = 0; i < 6; i++) { const a = i * 1.047; g.beginPath(); g.arc(Math.cos(a) * s * 0.3, Math.sin(a) * s * 0.3, 1.8, 0, 7); g.fill() }
})

const PALETTE = ['#e94b9e', '#6650ff', '#ffd23f', '#3ddc97', '#00c2ff', '#ff7a45', '#ffffff']
const SNOW_ALPHA = [0.525, 0.65, 0.775, 0.9] // gộp độ trong suốt của tuyết thành 4 mức → chỉ 4 lần fill thay vì mỗi hạt một lần
const SPARK_LEVELS = 5 // pháo hoa: 5 mức mờ dần × 7 màu = tối đa 35 nét vẽ mỗi khung hình

/** Chạy hiệu ứng mùa trên `canvas` (canvas thường hoặc OffscreenCanvas trong Worker). Trả về { resize(W, H), stop() }.
 *  Không đụng tới DOM / window nên dùng được ở cả hai nơi; kích thước màn hình do bên gọi truyền vào. */
export function startSeason({ canvas: c, effect, mult, W: W0, H: H0 }) {
  const ctx = c.getContext('2d')
  let W = W0, H = H0, dpr = 1, raf = 0, items = [], sparks = [], rockets = [], nextLaunch = 0
  // Hạt nhỏ, mềm: vẽ ở 1x là đủ nét (và hạ thấp hơn khi máy yếu — xem quality.js); CSS của canvas do bên gọi đặt
  const size = () => { dpr = quality.res; c.width = Math.round(W * dpr); c.height = Math.round(H * dpr) }
  size()
  // Máy yếu bị khựng → bộ điều tiết hạ độ phân giải (số hạt / tốc độ đọc trực tiếp ở mỗi khung hình)
  let lastRes = quality.res
  const offQ = quality.subscribe(() => { if (quality.res !== lastRes) { lastRes = quality.res; size() } })

  const fall = effect === 'snow' || effect === 'mai' || effect === 'dao'
  const count = Math.round((effect === 'snow' ? 110 : 38) * mult)
  const spawn = (top = false) => {
    const base = { x: rand(0, W), y: top ? rand(-60, -10) : rand(0, H), t: rand(0, 6.28), sw: rand(0.4, 1.4) }
    if (effect === 'snow') { const a = rand(0.45, 0.95); return { ...base, r: rand(1, 3.4), vy: rand(0.35, 1.2), a, b: Math.min(3, Math.floor((a - 0.45) / 0.125)) } }
    const flower = effect === 'mai' && Math.random() < 0.45
    return { ...base, flower, s: flower ? rand(7, 12) : rand(4, 7.5), vy: rand(0.5, 1.25), rot: rand(0, 6.28), vr: rand(-0.025, 0.025), flip: rand(0, 6.28), a: rand(0.75, 1) }
  }
  if (fall) items = Array.from({ length: count }, () => spawn())

  const petalImg = effect === 'mai' ? petalSprite('#ffd23f', '#f2b50c') : effect === 'dao' ? petalSprite('#ffb7c9', '#ff8fae') : null
  const flowerImg = effect === 'mai' ? flowerSprite() : null
  // Vẽ một sprite: xoay theo p.rot, lật theo sy (giống translate → rotate → scale của bản cũ), thu theo sc
  const blit = (img, p, sc, sy) => {
    const cs = Math.cos(p.rot) * sc, sn = Math.sin(p.rot) * sc
    ctx.setTransform(cs, sn, -sn * sy, cs * sy, p.x * dpr, p.y * dpr)
    ctx.globalAlpha = p.a
    ctx.drawImage(img, -img.width / 2, -img.height / 2)
  }

  const launch = () => {
    const x = rand(W * 0.12, W * 0.88)
    rockets.push({ x, y: H + 10, vx: rand(-0.6, 0.6), vy: -rand(H * 0.0105, H * 0.014) - 6, ty: rand(H * 0.12, H * 0.42), col: PALETTE[Math.floor(rand(0, PALETTE.length))] })
  }
  const burst = r => {
    const n = Math.round(rand(55, 85) * Math.min(1.3, mult + 0.2) * quality.n), ci2 = Math.floor(rand(0, PALETTE.length))
    const ci1 = PALETTE.indexOf(r.col)
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand(-0.05, 0.05), sp = rand(1.6, 4.6)
      sparks.push({ x: r.x, y: r.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, decay: rand(0.011, 0.018), ci: Math.random() < 0.7 ? ci1 : ci2, age: 0 })
    }
  }
  // Bộ nhóm tia pháo hoa theo (màu, mức mờ) — dùng lại mảng giữa các khung hình để không sinh rác
  const groups = Array.from({ length: PALETTE.length * SPARK_LEVELS }, () => [])

  // k = số "đơn vị 60 Hz" đã trôi qua kể từ khung hình trước (1 ở 60 Hz, 2 nếu chỉ vẽ 30 khung/giây)
  const step = (k, ts) => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H)
    if (fall) {
      const act = Math.max(1, Math.round(items.length * quality.n)) // chỉ cập nhật + vẽ phần đầu danh sách khi đang giảm chất lượng
      if (effect === 'snow') {
        for (let i = 0; i < act; i++) {
          const p = items[i]
          p.t += 0.012 * k; p.y += p.vy * k; p.x += Math.sin(p.t) * p.sw * 0.6 * k
          if (p.y > H + 20 || p.x > W + 30 || p.x < -30) Object.assign(p, spawn(true))
        }
        ctx.fillStyle = '#ffffff'
        for (let b = 0; b < 4; b++) {
          ctx.globalAlpha = SNOW_ALPHA[b]; ctx.beginPath()
          for (let i = 0; i < act; i++) { const p = items[i]; if (p.b === b) { ctx.moveTo(p.x + p.r, p.y); ctx.arc(p.x, p.y, p.r, 0, 7) } }
          ctx.fill()
        }
      } else {
        for (let i = 0; i < act; i++) {
          const p = items[i]
          p.t += 0.012 * k; p.y += p.vy * k; p.x += (Math.sin(p.t) * p.sw * 0.6 + 0.25) * k
          p.rot += p.vr * k; p.flip += 0.03 * k
          if (p.y > H + 20 || p.x > W + 30 || p.x < -30) Object.assign(p, spawn(true))
          if (p.flower) blit(flowerImg, p, p.s / FLOWER, 1)
          else blit(petalImg, p, p.s / PETAL, 0.55 + 0.45 * Math.abs(Math.sin(p.flip)))
        }
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalAlpha = 1
    } else {
      if (ts > nextLaunch) { launch(); if (Math.random() < 0.35 * mult * quality.n) launch(); nextLaunch = ts + rand(700, 1500) / Math.max(0.6, mult) / quality.n }
      ctx.globalCompositeOperation = 'lighter'
      const dragR = Math.pow(0.985, k), drag = Math.pow(0.975, k)
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i]; r.x += r.vx * k; r.y += r.vy * k; r.vy *= dragR
        ctx.fillStyle = r.col; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(r.x, r.y, 2, 0, 7); ctx.fill()
        ctx.globalAlpha = 0.35; ctx.fillRect(r.x - 0.75, r.y, 1.5, 14)
        if (r.y <= r.ty || r.vy > -1.2) { burst(r); rockets.splice(i, 1) }
      }
      for (const g of groups) g.length = 0
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]
        s.vx *= drag; s.vy = s.vy * drag + 0.045 * k; s.x += s.vx * k; s.y += s.vy * k; s.life -= s.decay * k; s.age += k
        if (s.life <= 0) { sparks.splice(i, 1); continue }
        groups[s.ci * SPARK_LEVELS + Math.min(SPARK_LEVELS - 1, Math.floor(s.life * SPARK_LEVELS))].push(s)
      }
      ctx.lineWidth = 1.6; ctx.lineCap = 'round'
      for (let gi = 0; gi < groups.length; gi++) {
        const g = groups[gi]; if (!g.length) continue
        ctx.strokeStyle = PALETTE[Math.floor(gi / SPARK_LEVELS)]
        ctx.globalAlpha = ((gi % SPARK_LEVELS) + 0.5) / SPARK_LEVELS
        ctx.beginPath()
        for (const s of g) {
          const tail = Math.min(4, s.age) // đuôi dài tối đa ~4 khung hình, tính theo vận tốc nên không cần lưu lịch sử vị trí
          ctx.moveTo(s.x - s.vx * tail, s.y - s.vy * tail); ctx.lineTo(s.x, s.y)
        }
        ctx.stroke()
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'
    }
  }

  // Vòng lặp: giới hạn số khung hình/giây, bù sai số nhịp để màn 144 Hz vẫn ra đúng ~FPS mục tiêu
  let nextTs = 0, prevTs = 0
  const loop = ts => {
    raf = requestAnimationFrame(loop)
    quality.frame(ts)
    const interval = 1000 / (FPS[effect] * quality.fps)
    if (ts + 1 < nextTs) return
    const late = ts - nextTs
    nextTs = late > interval ? ts + interval : ts + interval - Math.max(0, late)
    // dt kẹp tối đa 50 ms: quay lại từ tab ẩn / máy khựng thì hạt không "nhảy" một đoạn dài
    const dt = prevTs ? Math.min(50, ts - prevTs) : FRAME
    prevTs = ts
    step(dt / FRAME, ts)
  }
  raf = requestAnimationFrame(loop)
  return {
    resize(w, h) { W = w; H = h; size() },
    stop() { offQ(); cancelAnimationFrame(raf); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height) },
  }
}
