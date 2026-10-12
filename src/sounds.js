// Âm thanh thông báo, tự tạo bằng Web Audio (không cần file âm thanh, không tải thêm gì).
export const SOUNDS = [
  ['none', 'Tắt'],
  ['chime', 'Chuông gió'],
  ['ping', 'Ping'],
  ['pop', 'Bong bóng'],
  ['dingdong', 'Đinh đoong'],
  ['marimba', 'Mộc cầm'],
  ['bell', 'Chuông ngân'],
  ['alert', 'Báo gấp'],
]

let ctx
const audio = () => {
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  ctx ||= new AC()
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

// Một nốt: sóng, tần số, thời điểm bắt đầu, độ dài, độ lớn
function tone(c, out, { type = 'sine', f, t = 0, d = 0.25, v = 1, f2 }) {
  const o = c.createOscillator(), g = c.createGain(), s = c.currentTime + t
  o.type = type; o.frequency.setValueAtTime(f, s)
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, s + d)
  g.gain.setValueAtTime(0.0001, s)
  g.gain.exponentialRampToValueAtTime(v, s + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, s + d)
  o.connect(g).connect(out); o.start(s); o.stop(s + d + 0.05)
}

const PATTERNS = {
  chime: [{ f: 1046.5, d: 0.5, v: 0.6 }, { f: 1318.5, t: 0.12, d: 0.6, v: 0.5 }, { f: 1568, t: 0.24, d: 0.8, v: 0.4 }],
  ping: [{ f: 1760, d: 0.35, v: 0.7 }, { f: 3520, d: 0.2, v: 0.15 }],
  pop: [{ type: 'triangle', f: 380, f2: 900, d: 0.12, v: 0.9 }],
  dingdong: [{ f: 880, d: 0.6, v: 0.6 }, { f: 698.5, t: 0.32, d: 0.8, v: 0.6 }],
  marimba: [{ type: 'triangle', f: 784, d: 0.25, v: 0.8 }, { type: 'triangle', f: 1046.5, t: 0.1, d: 0.3, v: 0.7 }],
  bell: [{ f: 659.3, d: 1.4, v: 0.5 }, { f: 1318.5, d: 1, v: 0.18 }, { f: 1977, d: 0.6, v: 0.08 }],
  alert: [{ type: 'square', f: 988, d: 0.12, v: 0.25 }, { type: 'square', f: 988, t: 0.18, d: 0.12, v: 0.25 }, { type: 'square', f: 1319, t: 0.36, d: 0.2, v: 0.25 }],
}

/** Phát âm thanh theo tên; volume 0–100 */
export function playSound(name, volume = 70) {
  if (!name || name === 'none' || !PATTERNS[name]) return
  try {
    const c = audio(); if (!c) return
    const out = c.createGain(); out.gain.value = Math.max(0, Math.min(1, volume / 100)) * 0.6; out.connect(c.destination)
    PATTERNS[name].forEach(n => tone(c, out, n))
  } catch { /* trình duyệt chặn âm thanh: bỏ qua */ }
}
