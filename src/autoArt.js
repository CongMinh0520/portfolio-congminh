// Tự tạo ảnh bìa / avatar dạng hình học (SVG), không cần dịch vụ bên ngoài.
// Cùng "seed" luôn ra cùng một ảnh; đổi seed để ra mẫu khác.

export const PALETTES = {
  neon: ['#e94b9e', '#6650ff', '#a58bff'],
  sunset: ['#f2ce6a', '#ef765c', '#6345db'],
  orange: ['#ff9a54', '#633dff', '#ffc38a'],
  gold: ['#f8d27c', '#5c48dd', '#fff1c9'],
  mint: ['#3ddc97', '#2b6cff', '#b8ffe0'],
  berry: ['#ff5d8f', '#7b2ff7', '#ffc2d6'],
}
const PAL_KEYS = Object.keys(PALETTES)

const hash = str => { let h = 2166136261; for (const c of String(str)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619) } return h >>> 0 }
const rng = seed => { let a = hash(seed); return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
const esc = s => String(s ?? '').replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]))
const toUrl = svg => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
const f = n => Math.round(n * 10) / 10

export const newSeed = () => Math.random().toString(36).slice(2, 10)
export const paletteFor = (key, seed) => PALETTES[key] || PALETTES[PAL_KEYS[hash(seed) % PAL_KEYS.length]]

/* ---------- Các họa tiết (khung 1200×630) ---------- */
const MOTIFS = {
  orbits(r, [a, b, c]) {
    const cx = 760 + r() * 260, cy = 120 + r() * 360
    let s = ''
    for (let i = 1; i <= 7; i++) s += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${i * 62}" fill="none" stroke="#fff" stroke-opacity="${f(0.05 + i * 0.012)}" stroke-width="1.5"/>`
    for (let i = 0; i < 14; i++) { const rr = 62 * (1 + Math.floor(r() * 7)), t = r() * Math.PI * 2, R = 4 + r() * 10; s += `<circle cx="${f(cx + Math.cos(t) * rr)}" cy="${f(cy + Math.sin(t) * rr)}" r="${f(R)}" fill="${[a, b, c][i % 3]}" opacity="${f(0.6 + r() * 0.4)}"/>` }
    return s + `<circle cx="${f(cx)}" cy="${f(cy)}" r="40" fill="url(#g)"/>`
  },
  grid(r, [a, b]) {
    let s = ''
    const bugs = new Set(Array.from({ length: 6 }, () => `${Math.floor(r() * 22)}-${Math.floor(r() * 11)}`))
    for (let x = 0; x < 22; x++) for (let y = 0; y < 11; y++) {
      const X = 60 + x * 52, Y = 50 + y * 52
      s += bugs.has(`${x}-${y}`)
        ? `<rect x="${X - 15}" y="${Y - 15}" width="30" height="30" rx="7" fill="${a}"/><rect x="${X - 24}" y="${Y - 24}" width="48" height="48" rx="11" fill="none" stroke="${a}" stroke-opacity=".5" stroke-dasharray="4 4"/>`
        : `<circle cx="${X}" cy="${Y}" r="${f(2 + r() * 1.5)}" fill="#fff" opacity="${f(0.12 + r() * 0.18)}"/>`
    }
    const [bx, by] = [...bugs][0].split('-').map(Number)
    const X = 60 + bx * 52, Y = 50 + by * 52
    return s + `<path d="M${X} 0V630M0 ${Y}H1200" stroke="${b}" stroke-opacity=".55" stroke-width="1.5"/><circle cx="${X}" cy="${Y}" r="44" fill="none" stroke="#fff" stroke-width="2"/>`
  },
  waves(r, [a, b, c]) {
    let s = ''
    for (let i = 0; i < 9; i++) {
      const y0 = 140 + i * 50, amp = 30 + r() * 60, k = 0.004 + r() * 0.006, ph = r() * 6
      let d = `M0 ${f(y0)}`
      for (let x = 0; x <= 1200; x += 30) d += ` L${x} ${f(y0 + Math.sin(x * k + ph) * amp)}`
      s += `<path d="${d}" fill="none" stroke="${[a, b, c][i % 3]}" stroke-width="${f(2 + r() * 3)}" stroke-opacity="${f(0.35 + r() * 0.5)}" stroke-linecap="round"/>`
    }
    return s
  },
  bars(r, [a, b, c]) {
    let s = '', pts = []
    const n = 14
    for (let i = 0; i < n; i++) {
      const h = 80 + r() * 330, x = 110 + i * 72
      s += `<rect x="${x}" y="${f(560 - h)}" width="42" height="${f(h)}" rx="8" fill="${i % 4 === 0 ? a : '#ffffff'}" opacity="${i % 4 === 0 ? 0.9 : 0.1}"/>`
      pts.push([x + 21, 560 - h - 30])
    }
    s += `<path d="M${pts.map(p => p.map(f).join(' ')).join(' L')}" fill="none" stroke="${b}" stroke-width="4" stroke-linejoin="round"/>`
    pts.forEach(([x, y], i) => { if (i % 3 === 0) s += `<circle cx="${f(x)}" cy="${f(y)}" r="7" fill="${c}"/>` })
    return s
  },
  terminal(r, [a, b, c]) {
    const x = 520, y = 90, w = 600, h = 420
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="22" fill="#0b0d16" fill-opacity=".85" stroke="#fff" stroke-opacity=".12"/>`
    ;[a, '#f8d27c', '#3ddc97'].forEach((col, i) => { s += `<circle cx="${x + 32 + i * 24}" cy="${y + 30}" r="7" fill="${col}"/>` })
    for (let i = 0; i < 9; i++) {
      const ly = y + 82 + i * 36, pass = r() > 0.25
      s += `<path d="M${x + 36} ${ly}l7 7 13-14" fill="none" stroke="${pass ? '#3ddc97' : a}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" ${pass ? '' : 'transform="rotate(0)"'}/>`
      s += `<rect x="${x + 72}" y="${ly - 5}" width="${f(120 + r() * 330)}" height="12" rx="6" fill="${i % 3 === 0 ? b : '#fff'}" opacity="${i % 3 === 0 ? 0.85 : 0.18}"/>`
    }
    return s + `<circle cx="260" cy="320" r="170" fill="url(#g)" opacity=".85"/>`
  },
  blobs(r, [a, b, c]) {
    let s = ''
    for (let i = 0; i < 6; i++) s += `<circle cx="${f(r() * 1200)}" cy="${f(r() * 630)}" r="${f(120 + r() * 220)}" fill="${[a, b, c][i % 3]}" opacity="${f(0.35 + r() * 0.35)}" filter="url(#blur)"/>`
    for (let i = 0; i < 40; i++) s += `<circle cx="${f(r() * 1200)}" cy="${f(r() * 630)}" r="${f(1 + r() * 2.5)}" fill="#fff" opacity="${f(0.3 + r() * 0.6)}"/>`
    return s
  },
}
const MOTIF_KEYS = Object.keys(MOTIFS)

/** Ảnh bìa 1200×630 cho dự án / bài blog */
export function autoCover({ seed = 'x', palette, label = '' } = {}) {
  const r = rng(seed)
  const pal = Array.isArray(palette) ? palette : paletteFor(palette, seed)
  const motif = MOTIF_KEYS[Math.floor(r() * MOTIF_KEYS.length)]
  const [a, b, c] = pal
  const body = MOTIFS[motif](r, pal)
  const chip = label ? (() => { const t = esc(label.toUpperCase()).slice(0, 34), w = 40 + t.length * 13.5; return `<g transform="translate(48 548)"><rect width="${f(w)}" height="40" rx="20" fill="#0b0d16" fill-opacity=".7" stroke="#fff" stroke-opacity=".18"/><text x="20" y="26" font-family="ui-monospace,Menlo,Consolas,monospace" font-size="17" font-weight="700" letter-spacing="2" fill="#fff">${t}</text></g>` })() : ''
  return toUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${b}" stop-opacity=".95"/><stop offset=".55" stop-color="#120f2a"/><stop offset="1" stop-color="#07080f"/></linearGradient>
<radialGradient id="g"><stop offset="0" stop-color="${c}"/><stop offset="1" stop-color="${a}" stop-opacity="0"/></radialGradient>
<radialGradient id="spot" cx=".85" cy=".1" r=".7"><stop offset="0" stop-color="${a}" stop-opacity=".55"/><stop offset="1" stop-color="${a}" stop-opacity="0"/></radialGradient>
<filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="60"/></filter></defs>
<rect width="1200" height="630" fill="url(#bg)"/><rect width="1200" height="630" fill="url(#spot)"/>${body}${chip}</svg>`)
}

/** Avatar tròn 600×600: chữ viết tắt trên nền hình học */
export function autoAvatar({ seed = 'x', text = 'CM', palette } = {}) {
  const r = rng(seed)
  const pal = Array.isArray(palette) ? palette : paletteFor(palette, seed)
  const [a, b, c] = pal
  let deco = ''
  const style = Math.floor(r() * 3)
  if (style === 0) for (let i = 1; i <= 6; i++) deco += `<circle cx="300" cy="300" r="${i * 45}" fill="none" stroke="#fff" stroke-opacity="${f(0.04 + i * 0.015)}" stroke-width="2"/>`
  if (style === 1) for (let i = 0; i < 24; i++) { const t = (i / 24) * Math.PI * 2; deco += `<line x1="${f(300 + Math.cos(t) * 150)}" y1="${f(300 + Math.sin(t) * 150)}" x2="${f(300 + Math.cos(t) * (230 + r() * 60))}" y2="${f(300 + Math.sin(t) * (230 + r() * 60))}" stroke="#fff" stroke-opacity=".18" stroke-width="3" stroke-linecap="round"/>` }
  if (style === 2) for (let i = 0; i < 5; i++) deco += `<circle cx="${f(100 + r() * 400)}" cy="${f(100 + r() * 400)}" r="${f(60 + r() * 120)}" fill="${[a, b, c][i % 3]}" opacity=".45" filter="url(#bl)"/>`
  for (let i = 0; i < 18; i++) deco += `<circle cx="${f(60 + r() * 480)}" cy="${f(60 + r() * 480)}" r="${f(2 + r() * 4)}" fill="#fff" opacity="${f(0.25 + r() * 0.5)}"/>`
  const t = esc(String(text || '').slice(0, 3).toUpperCase())
  return toUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
<defs><radialGradient id="av" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="${c}"/><stop offset=".5" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>
<filter id="bl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="40"/></filter></defs>
<rect width="600" height="600" fill="url(#av)"/>${deco}
<text x="300" y="300" dy=".35em" text-anchor="middle" font-family="Inter,system-ui,Arial,sans-serif" font-size="${t.length > 2 ? 170 : 210}" font-weight="900" letter-spacing="-8" fill="#fff" fill-opacity=".9">${t}</text></svg>`)
}

/** Ảnh hiển thị cho một mục: ảnh đã chọn, nếu không có thì ảnh tự tạo */
export const coverOf = (item, kind) => item?.image || autoCover({
  seed: `${kind}-${item?.id}`,
  palette: kind === 'project' ? (item?.grad || 'neon') : undefined,
  label: kind === 'project' ? (item?.category || '').split('·')[0].trim() : 'BLOG',
})
