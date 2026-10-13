// Bộ điều tiết chất lượng hiệu ứng: đo nhịp khung hình THẬT của trang; máy yếu bị khựng thì tự giảm dần số hạt, tốc độ vẽ
// và độ phân giải của hiệu ứng (mùa + chuột); máy mạnh giữ nguyên 100%. Khi máy ổn lại thì tự tăng dần về mức cũ.
// Các hiệu ứng chỉ cần: gọi quality.frame(ts) mỗi lần rAF của mình, và đọc quality.n / .fps / .res khi vẽ.
//
//   mức 0: đầy đủ     mức 1: 75% hạt     mức 2: 50% hạt, 80% tốc độ, 75% độ phân giải     mức 3: 30% hạt, 65% tốc độ, 50% độ phân giải
const TABLE = [
  { n: 1, fps: 1, res: 1 },
  { n: 0.75, fps: 1, res: 1 },
  { n: 0.5, fps: 0.8, res: 0.75 },
  { n: 0.3, fps: 0.65, res: 0.5 },
]
export const cfg = {
  win: 2000,     // độ dài một lần đo (ms)
  minFrames: 10, // lần đo có ít hơn số khung này (trang gần như đứng) thì bỏ qua
  badMs: 26,     // trung bình > 26 ms/khung (dưới ~38 fps) = khựng
  goodMs: 19,    // trung bình < 19 ms/khung (trên ~52 fps) = ổn
  badWins: 2,    // khựng 2 lần đo liên tiếp (~4 giây) mới giảm
  goodWins: 5,   // ổn 5 lần đo liên tiếp (~10 giây) mới tăng lại; nếu vừa tăng đã khựng lại thì chờ lâu gấp đôi (tối đa 40)
}
const KEY = 'cm-fx-q'
const store = {
  get() { try { return Math.min(TABLE.length - 1, Math.max(0, Number(localStorage.getItem(KEY)) || 0)) } catch { return 0 } },
  set(v) { try { localStorage.setItem(KEY, String(v)) } catch { /* bỏ qua */ } },
}

let level = store.get()   // lần ghé trước máy yếu thì lần này bắt đầu ngay ở mức đã giảm, khỏi giật lại
let last = 0, acc = 0, cnt = 0, bad = 0, good = 0, need = cfg.goodWins, recoveredAt = 0
const subs = new Set()
const set = l => {
  l = Math.min(TABLE.length - 1, Math.max(0, l))
  if (l === level) return
  level = l; store.set(l); subs.forEach(f => f(l))
}

const judge = avg => {
  if (avg > cfg.badMs) {
    good = 0
    if (++bad >= cfg.badWins && level < TABLE.length - 1) {
      // vừa mới tăng lại mà đã khựng → lần sau chờ lâu hơn trước khi thử tăng nữa (tránh nhấp nháy lên xuống)
      if (recoveredAt && performance.now() - recoveredAt < 60000) need = Math.min(40, need * 2)
      bad = 0; set(level + 1)
    }
  } else if (avg < cfg.goodMs) {
    bad = 0
    if (++good >= need && level > 0) { good = 0; recoveredAt = performance.now(); set(level - 1) }
  } else { bad = 0; good = 0 }
}

if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { last = 0; acc = 0; cnt = 0 })

export const quality = {
  get level() { return level },
  get n() { return TABLE[level].n },     // nhân với số hạt
  get fps() { return TABLE[level].fps }, // nhân với tốc độ vẽ tối đa
  get res() { return TABLE[level].res }, // nhân với độ phân giải canvas
  /** Gọi từ mỗi lần requestAnimationFrame của hiệu ứng (nhiều nơi gọi cùng 1 khung thì chỉ tính 1 lần) */
  frame(ts) {
    if (ts === last) return
    const dt = last ? ts - last : 0; last = ts
    // khoảng trống lớn = trang ngủ / tab ẩn / hiệu ứng nghỉ: bỏ lần đo hiện tại
    if (dt <= 0 || dt > 200) { acc = 0; cnt = 0; return }
    acc += dt; cnt++
    if (acc >= cfg.win) { if (cnt >= cfg.minFrames) judge(acc / cnt); acc = 0; cnt = 0 }
  },
  subscribe(fn) { subs.add(fn); return () => subs.delete(fn) },
  /** Để thử nghiệm */
  force(l) { bad = good = 0; set(l) },
}
if (import.meta.env?.DEV && typeof window !== 'undefined') window.__cmQuality = { quality, cfg }
