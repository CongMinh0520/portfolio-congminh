// /api/og?title=…&kind=…&date=…: ảnh chia sẻ 1200×630 tự tạo cho bài chưa có ảnh bìa (Facebook, Zalo, LinkedIn).
import { ImageResponse } from '@vercel/og'
import { SITE_NAME, rest, homeInfo } from './_lib.js'

const h = (type, style, ...children) => ({ type, props: { style, children: children.length === 1 ? children[0] : children } })

// Font hỗ trợ tiếng Việt, tải từ Google Fonts đúng các chữ cần dùng (nhẹ, nhanh)
async function font(text, weight) {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@${weight}&text=${encodeURIComponent(text)}`)).text()
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1]
    if (url) { const r = await fetch(url); if (r.ok) return r.arrayBuffer() }
  } catch { /* không tải được font: dùng font mặc định */ }
  return null
}

// Ảnh chia sẻ trang chủ (/api/og?home=1): huy hiệu, câu tiêu đề (chữ nổi bật màu hồng), ảnh đại diện
async function homeImage() {
  const [st] = (await rest('settings?select=hero,lang_default,en&id=eq.1')) || []
  const hm = homeInfo(st)
  const all = hm.badge + hm.title + SITE_NAME + 'Manual QA Tester' + hm.initials
  const [bold, regular] = await Promise.all([font(all, 800), font(all, 500)])
  const fonts = [bold && { name: 'BVP', data: bold, weight: 800, style: 'normal' }, regular && { name: 'BVP', data: regular, weight: 500, style: 'normal' }].filter(Boolean)
  const size = hm.title.length > 60 ? 58 : hm.title.length > 40 ? 66 : 76
  // Từng chữ là một khối để xuống dòng tự nhiên; chữ nổi bật tô hồng
  const words = [...hm.before.split(/\s+/).filter(Boolean).map(w => [w, false]), ...hm.highlight.split(/\s+/).filter(Boolean).map(w => [w, true]), ...hm.after.split(/\s+/).filter(Boolean).map(w => [w, false])]
  const avatar = /^https?:\/\//i.test(hm.avatar)
    ? { type: 'img', props: { src: hm.avatar, width: 300, height: 300, style: { width: 300, height: 300, borderRadius: 150, objectFit: 'cover', border: '6px solid rgba(255,255,255,0.12)' } } }
    : h('div', { display: 'flex', width: 300, height: 300, borderRadius: 150, alignItems: 'center', justifyContent: 'center', backgroundImage: 'radial-gradient(circle at 30% 30%, #a58bff, #8a227d 60%, #17274d)', color: 'rgba(255,255,255,0.45)', fontSize: 110, fontWeight: 800 }, hm.initials.slice(0, 3))
  return new ImageResponse(
    h('div', { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 48, padding: '64px 72px', background: '#07080f', backgroundImage: 'radial-gradient(900px 520px at 100% 0%, rgba(102,80,255,0.42), transparent 70%), radial-gradient(700px 420px at 0% 100%, rgba(233,75,158,0.32), transparent 70%)', color: '#f7f6fb', fontFamily: fonts.length ? 'BVP' : undefined },
      h('div', { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', flex: 1 },
        h('div', { display: 'flex', alignSelf: 'flex-start', alignItems: 'center', gap: 12, padding: '10px 18px', borderRadius: 10, background: '#25293c', fontSize: 20, fontWeight: 800, letterSpacing: 3 },
          h('div', { display: 'flex', width: 12, height: 12, borderRadius: 6, background: '#3ddc97' }), hm.badge.slice(0, 40)),
        h('div', { display: 'flex', flexWrap: 'wrap', fontSize: size, fontWeight: 800, lineHeight: 1.12, letterSpacing: -1.5 },
          ...words.map(([w, hi]) => h('div', { display: 'flex', marginRight: size * 0.26, color: hi ? '#e94b9e' : '#f7f6fb' }, w))),
        h('div', { display: 'flex', alignItems: 'center', gap: 18, fontSize: 26, color: '#9a9db3' },
          h('div', { display: 'flex', width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundImage: 'linear-gradient(90deg, #e94b9e, #6650ff)', color: '#fff', fontSize: 20, fontWeight: 800 }, 'CM'),
          h('div', { display: 'flex', flexDirection: 'column' }, h('div', { display: 'flex', color: '#fff', fontWeight: 800 }, SITE_NAME), h('div', { display: 'flex', fontSize: 20, fontWeight: 500 }, 'Manual QA Tester')))),
      avatar),
    { width: 1200, height: 630, fonts, headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } },
  )
}

export async function GET(request) {
  const q = new URL(request.url).searchParams
  if (q.get('home')) return homeImage()
  const title = (q.get('title') || SITE_NAME).slice(0, 140)
  const kind = (q.get('kind') || 'Blog').slice(0, 40).toUpperCase()
  const date = q.get('date') || ''
  const dateText = /^\d{4}-\d{2}-\d{2}/.test(date) ? date.slice(0, 10).split('-').reverse().join('/') : ''
  const size = title.length > 90 ? 50 : title.length > 55 ? 60 : 72
  const all = title + kind + dateText + SITE_NAME + 'Manual QA Tester·'
  const [bold, regular] = await Promise.all([font(all, 800), font(all, 500)])
  const fonts = [bold && { name: 'BVP', data: bold, weight: 800, style: 'normal' }, regular && { name: 'BVP', data: regular, weight: 500, style: 'normal' }].filter(Boolean)

  return new ImageResponse(
    h('div', { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '64px 72px', background: '#07080f', backgroundImage: 'radial-gradient(900px 500px at 100% 0%, rgba(102,80,255,0.45), transparent 70%), radial-gradient(700px 420px at 0% 100%, rgba(233,75,158,0.35), transparent 70%)', color: '#f7f6fb', fontFamily: fonts.length ? 'BVP' : undefined },
      h('div', { display: 'flex', alignItems: 'center', gap: 16 },
        h('div', { display: 'flex', width: 14, height: 14, borderRadius: 7, background: '#e94b9e' }),
        h('div', { display: 'flex', fontSize: 26, fontWeight: 800, letterSpacing: 4, color: '#e94b9e' }, kind)),
      h('div', { display: 'flex', fontSize: size, fontWeight: 800, lineHeight: 1.15, letterSpacing: -1 }, title),
      h('div', { display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 28, fontWeight: 500, color: '#9a9db3' },
        h('div', { display: 'flex', alignItems: 'center', gap: 18 },
          h('div', { display: 'flex', width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundImage: 'linear-gradient(90deg, #e94b9e, #6650ff)', color: '#fff', fontSize: 22, fontWeight: 800 }, 'CM'),
          h('div', { display: 'flex', flexDirection: 'column' }, h('div', { display: 'flex', color: '#fff', fontWeight: 800 }, SITE_NAME), h('div', { display: 'flex', fontSize: 22 }, 'Manual QA Tester'))),
        h('div', { display: 'flex' }, dateText))),
    { width: 1200, height: 630, fonts, headers: { 'Cache-Control': 'public, s-maxage=86400, immutable' } },
  )
}
