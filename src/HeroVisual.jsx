// Cấu hình phần đầu trang (huy hiệu, tiêu đề, số liệu, hình tròn + 2 thẻ, dải chữ chạy). Chỉnh trong Admin → Đầu trang.

export const DEFAULT_HERO = {
  badge: { text: 'OPEN TO QA OPPORTUNITIES', dot: '#3ddc97', bg: '#25293c', color: '#f7f6fb' },
  title: { before: 'Mình tìm ra ', highlight: 'lỗi', after: ' trước khi người dùng thấy', color1: '#e94b9e', color2: '#6650ff', effect: 'gradient', rgb_speed: 6, rgb_colors: ['#e94b9e', '#a58bff', '#6650ff', '#22c3ff'] }, // vi-only: public-site default content
  lead: 'Công Minh — Manual QA Tester với gần 2 năm kinh nghiệm test website thương mại điện tử, ứng dụng di động, phần mềm quản lý và ví blockchain. Mình viết test case kỹ, báo bug rõ ràng và đang học thêm automation.', // vi-only: public-site default content
  buttons: { primary: 'Xem dự án', secondary: 'Liên hệ' }, // vi-only: public-site default content
  stats: [
    { value: '2', label: 'Năm kinh nghiệm QA' }, // vi-only: public-site default content
    { value: '4', label: 'Lĩnh vực sản phẩm' }, // vi-only: public-site default content
    { value: 'Web · App', label: 'Nền tảng đã test' }, // vi-only: public-site default content
  ],
  avatar: {
    image: '', position: 'center', text: 'CM', text_color: '#ffffff', text_opacity: 35,
    color1: '#a58bff', color2: '#8a227d', color3: '#17274d', glow: '#754fff', ring: true,
  },
  // File CV (PDF) cho nút "Tải CV" ở đầu trang; file_en dùng khi khách xem bản English (để trống = dùng file tiếng Việt)
  cv: { file: '', name: '', file_en: '', name_en: '' },
  card1: { show: true, image: '', value: 'Manual', label: 'QA Tester', bg: '#ffffff', value_color: '#161525', label_color: '#555555' },
  card2: { show: true, image: '', value: 'Mobile', label: 'iOS · Android', bg: '#ffffff', value_color: '#161525', label_color: '#555555' },
  marquee: {
    items: ['MANUAL TESTING', 'TEST CASE', 'API TESTING', 'MOBILE APP', 'BLOCKCHAIN WALLET', 'REGRESSION', 'BUG TRACKING'],
    separator: '✦', text_color: '#7a7e9e', sep_color: '#e94b9e', bg: '#0b0d16', speed: 28,
  },
  // Khối kêu gọi liên hệ ở cuối mỗi bài viết (Admin → Thông tin chung)
  post_cta: {
    show: true, title: 'Cần một tester cẩn thận cho sản phẩm của bạn?', // vi-only: public-site default content
    text: 'Mình sẵn sàng trao đổi về kiểm thử thủ công cho website, ứng dụng di động hoặc sản phẩm blockchain của bạn.', // vi-only: public-site default content
    button: 'Trao đổi về dự án', link: '/#contact', // vi-only: public-site default content
  },
  // Hiệu ứng theo mùa (Admin → Hiệu ứng theo mùa). Ngày dạng MM-DD, lặp lại hằng năm.
  season: {
    mode: 'off', effect: 'snow', amount: 'medium',
    rules: [
      { effect: 'fireworks', from: '12-31', to: '01-01' },
      { effect: 'mai', from: '01-20', to: '02-25' },
      { effect: 'snow', from: '12-01', to: '12-30' },
    ],
  },
}

// Bảng màu có sẵn cho kiểu "RGB chạy"
export const RGB_PRESETS = [
  ['brand', 'Thương hiệu', ['#e94b9e', '#a58bff', '#6650ff', '#22c3ff']],
  ['neon', 'Neon', ['#ff2bd6', '#7a5cff', '#00e5ff', '#39ff88']],
  ['sunset', 'Hoàng hôn', ['#ff5f6d', '#ff8a5b', '#ffc371', '#e94b9e']],
  ['ocean', 'Đại dương', ['#00c6ff', '#0072ff', '#7a5cff', '#00e5c7']],
  ['gold', 'Vàng kim', ['#f7d774', '#ffb347', '#fff1b8', '#e8a33d']],
  ['pastel', 'Kẹo ngọt', ['#ffafcc', '#cdb4db', '#a2d2ff', '#bde0fe']],
  ['rainbow', 'Cầu vồng', ['#ff2d6f', '#ff9a1f', '#ffe14d', '#3ddc97', '#22c3ff', '#6650ff', '#c04bff']],
]
// Dải màu lặp liền mạch (màu đầu được nhắc lại ở cuối)
export const rgbGradient = colors => {
  const c = (Array.isArray(colors) ? colors : []).filter(x => /^#[0-9a-f]{6}$/i.test(x))
  const list = c.length >= 2 ? c : RGB_PRESETS[0][2]
  return `linear-gradient(90deg, ${[...list, list[0]].join(', ')})`
}

/** Chữ tô màu trong tiêu đề: gradient 2 màu hoặc RGB chạy */
export function Highlight({ title }) {
  if (!title.highlight) return null
  if (title.effect === 'rgb') return <span className="rgb-text" style={{ backgroundImage: rgbGradient(title.rgb_colors), animationDuration: `${Math.max(1, Number(title.rgb_speed) || 6)}s` }}>{title.highlight}</span>
  return <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(90deg, ${title.color1}, ${title.color2})` }}>{title.highlight}</span>
}

// Gộp cấu hình đã lưu với mặc định: object gộp từng trường, mảng thay nguyên
export const mergeHero = (v = {}) => {
  const src = v && typeof v === 'object' ? v : {}
  const out = Object.fromEntries(Object.entries(DEFAULT_HERO).map(([k, d]) => {
    const x = src[k]
    if (Array.isArray(d) || typeof d !== 'object') return [k, x ?? d]
    return [k, { ...d, ...(x && typeof x === 'object' ? x : {}) }]
  }))
  // Bản English của các chữ trên (Admin → Đầu trang → tab English)
  out.en = src.en && typeof src.en === 'object' ? src.en : {}
  return out
}

export const hexA = (hex, a) => {
  const h = String(hex || '#000000').replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h.padEnd(6, '0').slice(0, 6)
  return `#${full}${Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0')}`
}

function StatCard({ c, className, anim }) {
  if (!c.show) return null
  return (
    <div className={`absolute min-w-24 max-w-[170px] rounded-2xl p-4 text-center shadow-[0_14px_40px_#00000066] ${anim} ${className}`}
      style={{ background: c.bg }}>
      {c.image && <img src={c.image} alt="" className="mx-auto mb-2 size-10 rounded-xl object-cover" />}
      {c.value && <strong className="block text-[22px] leading-tight" style={{ color: c.value_color }}>{c.value}</strong>}
      {c.label && <span className="block text-[11px] leading-snug" style={{ color: c.label_color }}>{c.label}</span>}
    </div>
  )
}

export default function HeroVisual({ cfg, className = 'w-[clamp(260px,32vw,400px)]', still = false }) {
  const v = mergeHero(cfg)
  const a = v.avatar
  const float = still ? '' : 'animate-float'
  return (
    <div className={`relative grid aspect-square max-w-full flex-none place-items-center rounded-full ${float} ${className}`}
      style={{
        background: `radial-gradient(circle at 35% 30%, ${a.color1}, ${a.color2} 55%, ${a.color3})`,
        boxShadow: `0 0 90px ${hexA(a.glow, 0.4)}, inset 0 0 60px #00000055`,
      }}>
      {a.ring && <div className={`absolute -inset-[18px] rounded-full border border-dashed border-white/20 ${still ? '' : 'animate-spin-slow'}`} />}
      {a.image
        ? <img src={a.image} alt="" decoding="async" fetchPriority="high" className="absolute inset-[6px] size-[calc(100%-12px)] rounded-full object-cover" style={{ objectPosition: a.position }} />
        : a.text && <span className="text-[clamp(64px,9vw,110px)] font-black tracking-tighter" style={{ color: a.text_color, opacity: a.text_opacity / 100 }}>{a.text}</span>}
      <StatCard c={v.card1} anim={still ? '' : 'animate-float-rev'} className="right-[-2%] top-[6%] sm:right-[-8%]" />
      <StatCard c={v.card2} anim={still ? '' : 'animate-float'} className="bottom-[8%] left-[-2%] sm:left-[-8%]" />
    </div>
  )
}
