import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { links, GRADS, SECTION_OF } from './siteBase.js'
import { useContent } from './useContent.js'
// Admin (kèm trình soạn thảo) chỉ tải khi mở #admin, khách xem trang không phải tải phần này
const Admin = lazy(() => import('./Admin.jsx'))
// Hiệu ứng chuột / mùa: mã vẽ chỉ tải SAU khi trang đã hiện (lúc trình duyệt rảnh), và chỉ khi thật sự bật + thiết bị dùng được
const CursorFX = lazy(() => import('./CursorFX.jsx'))
const SeasonFX = lazy(() => import('./SeasonFX.jsx'))
import { PostDetail, ProjectDetail, BlogList, BlogCard, blogPages, NotFoundPage } from './Detail.jsx'
import { trackView } from './stats.js'
import { HASH, href, navigate, usePath, idFromSlug, postPath, projectPath, blogPath } from './router.js'
import { useSeo } from './seo.js'
import Contact from './Contact.jsx'
import { BrandLogo, brandOf, useFavicon } from './Brand.jsx'
import HeroVisual, { mergeHero, hexA, Highlight } from './HeroVisual.jsx'
import { activeSeason } from './seasonCfg.js'
import { coverOf } from './autoArt.js'
import { warmProject } from './prefetch.js'
import { LangCtx, LANGS, chooseLang, useSiteLang, useT, localizeList, localizeSettings, heroFor } from './i18n.js'

const grad = 'bg-gradient-to-r from-pink to-purple'
const label = 'text-[11px] font-bold tracking-[2px] text-pink'
const h2 = 'mt-2.5 max-w-[680px] text-[clamp(28px,4.4vw,46px)] font-bold leading-[1.12] tracking-tight'
const card = 'rounded-2xl border border-line bg-gradient-to-b from-[#171a2c] to-card transition duration-300 hover:-translate-y-1.5 hover:border-purple/60 hover:shadow-[0_20px_50px_#6650ff22]'

// Một IntersectionObserver dùng chung cho mọi khối hiện dần (thay vì mỗi khối một cái)
const revealCbs = new WeakMap()
let revealIO
const revealObserver = () => revealIO ||= new IntersectionObserver(es => {
  for (const e of es) if (e.isIntersecting) { revealIO.unobserve(e.target); revealCbs.get(e.target)?.() }
}, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' })

function Reveal({ children, className = '', delay = 0 }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current, io = revealObserver()
    revealCbs.set(el, () => setShown(true))
    io.observe(el)
    return () => { io.unobserve(el); revealCbs.delete(el) }
  }, [])
  return (
    <div ref={ref} style={{ transitionDelay: `${delay}ms` }}
      className={`transition-[opacity,transform] duration-[900ms] ease-[cubic-bezier(.22,1,.36,1)] ${shown ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-8 scale-[.98] opacity-40'} ${className}`}>
      {children}
    </div>
  )
}

/* ---------------- Cuộn mượt ---------------- */
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches
// Dùng cuộn mượt có sẵn của trình duyệt (chạy ngoài luồng chính, tự dừng khi khách lăn chuột / chạm màn hình)
export function smoothScrollTo(y) {
  window.scrollTo({ top: Math.max(0, y), behavior: reduceMotion() ? 'auto' : 'smooth' })
}
const sectionTop = el => (el.id === 'home' ? 0 : el.getBoundingClientRect().top + scrollY - 72)

// Trình duyệt hỗ trợ scroll-driven animation (Chrome, Edge, Cốc Cốc, Safari mới…): parallax, thanh tiến độ và đường vẽ
// chạy hoàn toàn bằng CSS (xem index.css), không còn mã JS nào chạy khi cuộn. Trình duyệt chưa hỗ trợ dùng bản JS bên dưới như trước.
const CSS_SCROLL = typeof CSS !== 'undefined' && !!CSS.supports && CSS.supports('animation-timeline: scroll()')

// data-scrolled (nền menu đậm lên khi cuộn khỏi đầu trang): IntersectionObserver canh một vạch 8px ở đầu trang,
// chỉ chạy đúng lúc vạch đi vào / ra khỏi màn hình, không nghe sự kiện scroll.
// Bản dự phòng JS (chỉ khi trình duyệt chưa hỗ trợ CSS ở trên): ghi --sy, --progress, --draw (không re-render React)
function useScrollVars(deps) {
  useEffect(() => {
    const root = document.documentElement
    const mark = document.createElement('div')
    mark.setAttribute('aria-hidden', 'true')
    mark.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:8px;pointer-events:none;visibility:hidden'
    document.body.prepend(mark)
    const io = new IntersectionObserver(([e]) => { e.isIntersecting ? root.removeAttribute('data-scrolled') : root.setAttribute('data-scrolled', '') })
    io.observe(mark)
    let raf = 0, onScroll = null
    if (!CSS_SCROLL) {
      let draws = []
      const update = () => {
        raf = 0
        // Đọc hết rồi mới ghi: không bắt trình duyệt tính lại bố cục giữa chừng như trước
        if (!draws.length || draws.some(el => !el.isConnected)) draws = [...document.querySelectorAll('[data-draw]')]
        const y = scrollY, vh = innerHeight, max = root.scrollHeight - vh
        const vals = draws.map(el => { const r = el.getBoundingClientRect(); return Math.min(1, Math.max(0, (vh * 0.75 - r.top) / r.height)) })
        root.style.setProperty('--sy', Math.min(y, 1400).toFixed(1))
        root.style.setProperty('--progress', max > 0 ? (y / max).toFixed(4) : 0)
        draws.forEach((el, i) => el.style.setProperty('--draw', vals[i].toFixed(3)))
      }
      onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
      addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll)
      update()
    }
    return () => {
      io.disconnect(); mark.remove(); cancelAnimationFrame(raf)
      if (onScroll) { removeEventListener('scroll', onScroll); removeEventListener('resize', onScroll) }
    }
  }, deps)
}

// Mục đang xem = mục cuối cùng có mép trên đã đi qua thanh menu.
// Khi bấm link trên menu: tô sáng ngay mục được bấm và giữ nguyên trong lúc trang đang cuộn tới,
// tránh việc tô nhầm các mục nằm giữa (VD bấm Experience khi đang ở Work).
// Trước đây đọc vị trí mọi mục ở MỖI sự kiện scroll; nay dùng IntersectionObserver: chỉ tính lại khi một mép mục đi qua thanh menu.
function useActive(ids) {
  const [active, setActive] = useState(ids[0])
  const lock = useRef(0)
  const recalc = useRef(null)
  const unlock = useRef(0)
  const key = ids.join()
  const pick = id => {
    setActive(id); lock.current = Date.now() + 1500
    // mở khóa khi trình duyệt báo cuộn xong (scrollend); không có sự kiện đó thì mở sau 1,6 giây
    clearTimeout(unlock.current)
    unlock.current = setTimeout(() => { lock.current = 0; recalc.current?.() }, 1600)
  }
  useEffect(() => {
    const calc = () => {
      if (Date.now() < lock.current) return
      let a = ids[0]
      for (const id of ids) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= 140) a = id
      }
      // Cuối trang: mục cuối có thể quá ngắn để chạm thanh menu
      if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) {
        for (const id of ids) {
          const el = document.getElementById(id)
          if (el && el.getBoundingClientRect().top < innerHeight * 0.5) a = id
        }
      }
      setActive(a)
    }
    recalc.current = calc
    // Dải ngang cao 1px nằm đúng mốc 140px tính từ đầu cửa sổ: mục nào cắt qua dải này sẽ kích hoạt tính lại
    let io, rt
    const watch = () => {
      io?.disconnect()
      io = new IntersectionObserver(calc, { rootMargin: `-140px 0px -${Math.max(0, innerHeight - 141)}px 0px` })
      for (const id of ids) { const el = document.getElementById(id); if (el) io.observe(el) }
    }
    watch()
    // Đáy trang: một vạch 4px không chiếm chỗ ở cuối trang báo khi khách cuộn tới sát đáy
    const end = document.createElement('div')
    end.setAttribute('aria-hidden', 'true')
    end.style.cssText = 'height:4px;margin-top:-4px;pointer-events:none;visibility:hidden'
    document.body.append(end)
    const ioEnd = new IntersectionObserver(calc); ioEnd.observe(end)
    const onScrollEnd = () => { clearTimeout(unlock.current); lock.current = 0; calc() }
    const onResize = () => { clearTimeout(rt); rt = setTimeout(() => { watch(); calc() }, 150) }
    const onHash = () => {
      const id = location.hash.slice(1)
      if (ids.includes(id)) pick(id)
    }
    addEventListener('scrollend', onScrollEnd)
    addEventListener('resize', onResize)
    addEventListener('hashchange', onHash)
    calc()
    return () => {
      io?.disconnect(); ioEnd.disconnect(); end.remove(); clearTimeout(rt); clearTimeout(unlock.current)
      removeEventListener('scrollend', onScrollEnd); removeEventListener('resize', onResize); removeEventListener('hashchange', onHash)
    }
  }, [key])
  return [active, pick]
}

// Nút đổi ngôn ngữ VI | EN trên menu
function LangSwitch() {
  const { t, lang } = useT()
  return (
    <div role="group" aria-label={t('nav.lang')} className="flex flex-none rounded-full border border-line bg-white/5 p-0.5 text-[12px] font-semibold">
      {LANGS.map(([k, name, short]) => (
        <button key={k} type="button" lang={k} title={name} aria-pressed={lang === k} onClick={() => chooseLang(k)}
          className={`rounded-full px-2.5 py-1 transition ${lang === k ? `${grad} text-white` : 'text-[#9a9db3] hover:text-white'}`}>{short}</button>
      ))}
    </div>
  )
}

function Navbar({ off, forced, langSwitch, brand }) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const shown = links.filter(([id]) => !off(SECTION_OF[id]))
  const [spy, pick] = useActive(shown.map(l => l[0]))
  const active = forced || spy
  return (
    <nav className="site-nav sticky top-[env(safe-area-inset-top,0px)] z-50 h-[72px] border-b border-line bg-[#0a0c14]/90">
      <i aria-hidden className={`scroll-progress pointer-events-none absolute inset-x-0 -bottom-px h-[2px] ${grad}`} />
      <div className="mx-auto flex h-full w-[min(1180px,100%-32px)] items-center justify-between sm:w-[min(1180px,100%-48px)]">
        <a href="#home" className="text-xl font-extrabold tracking-tight"><BrandLogo brand={brand} /></a>
        <div className="ml-auto mr-3 md:order-last md:ml-4 md:mr-0">{langSwitch && <LangSwitch />}</div>
        <button aria-label={t('nav.open')} aria-expanded={open} onClick={() => setOpen(!open)}
          className="flex size-11 flex-col items-center justify-center gap-[5px] rounded-xl border border-line md:hidden">
          <i className={`block h-0.5 w-[18px] rounded bg-white transition ${open ? 'translate-y-[7px] rotate-45' : ''}`} />
          <i className={`block h-0.5 w-[18px] rounded bg-white transition ${open ? 'opacity-0' : ''}`} />
          <i className={`block h-0.5 w-[18px] rounded bg-white transition ${open ? '-translate-y-[7px] -rotate-45' : ''}`} />
        </button>
        <div className={`absolute inset-x-0 top-[72px] flex flex-col gap-1 border-b border-line bg-[#0a0c14]/95 p-4 transition md:static md:ml-auto md:flex-row md:items-center md:border-0 md:bg-transparent md:p-0
          ${open ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-3 opacity-0 md:visible md:translate-y-0 md:opacity-100'}`}>
          {shown.map(([id]) => (
            <a key={id} href={`#${id}`} onClick={() => { pick(id); setOpen(false) }}
              className={`rounded-full px-4 py-3.5 text-[15px] transition hover:bg-white/10 hover:text-white md:py-2 md:text-[13px] ${active === id ? 'text-pink' : 'text-[#c9cbd8]'}`}>{t(`nav.${id}`)}</a>
          ))}
          {!off('sec_nav_cta') && !off('sec_contact') && <a href="#contact" onClick={() => setOpen(false)}
            className={`${grad} rounded-full px-4 py-3.5 text-center text-[15px] font-semibold text-white md:py-2 md:text-[13px]`}>{t('nav.contact')}</a>}
        </div>
      </div>
    </nav>
  )
}

function Hero({ off, hero: h, cv }) {
  const { t } = useT()
  return (
    <header id="home" className="mx-auto flex w-[min(1180px,100%-32px)] flex-col-reverse items-center justify-between gap-14 py-12 text-center sm:w-[min(1180px,100%-48px)] md:min-h-[calc(100svh-72px)] md:flex-row md:gap-16 md:py-[70px] md:text-left">
      <div className="parallax-slow max-w-[620px]">
        {!off('sec_hero_badge') && h.badge.text && <span style={{ animationDelay: '.05s', background: h.badge.bg, color: h.badge.color }} className="hero-in inline-flex items-center gap-2 rounded-md px-3 py-[7px] text-[11px] font-bold tracking-[2px]">
          <i className="ping-dot size-[7px] rounded-full" style={{ background: h.badge.dot }} /> {h.badge.text}
        </span>}
        <h1 style={{ animationDelay: '.15s' }} className="hero-in my-[22px] text-[clamp(38px,6.4vw,76px)] font-bold leading-[1.05] tracking-[-0.035em]">
          {h.title.before}<Highlight title={h.title} />{h.title.after}
        </h1>
        {!off('sec_hero_lead') && h.lead && <p style={{ animationDelay: '.28s' }} className="hero-in mx-auto max-w-[520px] text-[clamp(15px,1.6vw,18px)] leading-relaxed text-muted md:mx-0">
          {h.lead}
        </p>}
        {!off('sec_hero_buttons') && (!off('sec_work') || !off('sec_contact') || cv) && <div style={{ animationDelay: '.4s' }} className="hero-in mt-8 flex flex-wrap justify-center gap-3 md:justify-start">
          {!off('sec_work') && <a href="#work" className={`${grad} w-full rounded-xl px-6 py-3.5 text-sm font-semibold shadow-[0_10px_30px_#6650ff55] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_#e94b9e55] sm:w-auto`}>{h.buttons.primary || t('hero.primary')}</a>}
          {!off('sec_contact') && <a href="#contact" className="w-full rounded-xl border border-purple bg-purple/10 px-6 py-3.5 text-sm font-semibold transition hover:-translate-y-0.5 hover:bg-purple/30 sm:w-auto">{h.buttons.secondary || t('hero.secondary')}</a>}
          {cv && <a href={cv} target="_blank" rel="noopener" download="CongMinh-CV.pdf" className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-line px-6 py-3.5 text-sm font-semibold text-[#dfe0ea] transition hover:-translate-y-0.5 hover:border-purple/60 hover:text-white sm:w-auto">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden="true"><path d="M12 3v12 M7 10l5 5 5-5 M5 21h14" /></svg>{t('hero.cv')}
          </a>}
        </div>}
        {!off('sec_hero_stats') && h.stats.length > 0 && <div style={{ animationDelay: '.52s' }} className="hero-in mt-11 flex flex-wrap justify-center gap-6 md:justify-start md:gap-9">
          {h.stats.map((st, i) => <div key={i}><b className="block text-[28px] tracking-tight">{st.value}</b><small className="text-xs text-muted">{st.label}</small></div>)}
        </div>}
      </div>
      {!off('sec_hero_visual') && <div className="parallax-fast flex-none"><div style={{ animationDelay: '.2s' }} className="hero-pop"><HeroVisual cfg={h} /></div></div>}
    </header>
  )
}

export function Marquee({ hero }) {
  const m = hero.marquee
  const list = (m.items || []).filter(Boolean)
  if (!list.length) return null
  // lặp đủ dài để dải chữ luôn phủ kín màn hình rồi nhân đôi cho vòng chạy liền mạch
  const base = Array.from({ length: Math.max(1, Math.ceil(8 / list.length)) }, () => list).flat()
  const items = [...base, ...base]
  const box = useRef(null), track = useRef(null)
  // Dải chữ ra khỏi màn hình thì tạm dừng animation
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { track.current.style.animationPlayState = e.isIntersecting ? 'running' : 'paused' })
    io.observe(box.current)
    return () => io.disconnect()
  }, [list.length])
  return (
    <div ref={box} aria-hidden className="overflow-hidden border-y border-line py-[18px]" style={{ background: m.bg }}>
      <div ref={track} className="flex w-max animate-marquee gap-12" style={{ animationDuration: `${Math.max(6, Number(m.speed) || 28)}s` }}>
        {items.map((t, i) => <span key={i} className="flex items-center gap-12 whitespace-nowrap text-lg font-bold tracking-wider" style={{ color: m.text_color }}>{t}{m.separator && <b style={{ color: m.sep_color }}>{m.separator}</b>}</span>)}
      </div>
    </div>
  )
}

// Các mục phía dưới: trình duyệt bỏ qua dàn trang/vẽ cho tới khi cuộn gần tới (xem .cv-lazy trong index.css)
const LAZY = new Set(['experience', 'work', 'blog'])

const Section = ({ id, lab, title, intro, children }) => (
  <section id={id} className={`py-[clamp(64px,10vw,110px)] ${LAZY.has(id) ? 'cv-lazy' : ''}`}>
    <div className="mx-auto w-[min(1180px,100%-32px)] sm:w-[min(1180px,100%-48px)]">
      <Reveal><div className={label}>{lab}</div><h2 className={h2}>{title}</h2>{intro && <p className="mt-3.5 max-w-[560px] text-muted">{intro}</p>}</Reveal>
      {children}
    </div>
  </section>
)

const FCol = ({ title, children }) => (
  <div><h4 className="mb-4 text-[11px] font-bold tracking-[2px] text-white">{title}</h4>{children}</div>
)

function Footer({ settings: s, links, socials, off, cv }) {
  const { t } = useT()
  if (off('sec_footer')) return null
  const hasContact = s.email || s.phone || s.address || s.working_hours
  const tel = (s.phone || '').replace(/[^\d+]/g, '')
  const isExt = u => /^https?:/i.test(u)
  return (
    <footer className="cv-lazy cv-foot border-t border-line bg-[#06070d]">
      <div className="mx-auto w-[min(1180px,100%-32px)] sm:w-[min(1180px,100%-48px)]">
        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:flex lg:justify-between lg:gap-12 [&:empty]:hidden">
          {!off('sec_footer_about') && <div className="lg:max-w-[300px]">
            <a href="#home" className="block w-fit text-xl font-extrabold tracking-tight"><BrandLogo brand={brandOf(s)} /></a>
            {s.footer_tagline && <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">{s.footer_tagline}</p>}
            {s.availability && (
              <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-line bg-white/5 px-3 py-1.5 text-xs text-[#c9cbd8]">
                <i className="ping-dot size-[7px] rounded-full bg-[#3ddc97]" />{s.availability}
              </span>
            )}
            {cv && <a href={cv} target="_blank" rel="noreferrer" download="CongMinh-CV.pdf" className={`${grad} mt-5 block w-fit rounded-xl px-5 py-2.5 text-sm font-semibold`}>{t('foot.cv')}</a>}
          </div>}

          {!off('sec_footer_menu') && links.length > 0 && (
            <FCol title={t('foot.menu')}>
              <ul className="space-y-2.5 text-sm text-muted">
                {links.map(l => <li key={l.id}><a href={l.href} {...(isExt(l.href) ? { target: '_blank', rel: 'noreferrer' } : {})} className="transition hover:text-pink">{l.label}</a></li>)}
              </ul>
            </FCol>
          )}

          {!off('sec_footer_contact') && hasContact && <FCol title={t('foot.contact')}>
            <ul className="space-y-2.5 text-sm text-muted">
              {s.email && <li>✉️ <a href={`mailto:${s.email}`} className="break-all transition hover:text-pink">{s.email}</a></li>}
              {s.phone && <li>📞 <a href={`tel:${tel}`} className="transition hover:text-pink">{s.phone}</a></li>}
              {s.address && <li>📍 {s.address}</li>}
              {s.working_hours && <li>🕘 {s.working_hours}</li>}
            </ul>
          </FCol>}

          {!off('sec_footer_socials') && socials.length > 0 && (
            <FCol title={t('foot.socials')}>
              <div className="flex flex-wrap gap-2">
                {socials.map(x => (
                  <a key={x.id} href={x.url} target="_blank" rel="noreferrer"
                    className="rounded-full border border-line px-3.5 py-1.5 text-[13px] text-[#c9cbd8] transition hover:border-purple hover:bg-purple/15 hover:text-white">{x.label} ↗</a>
                ))}
              </div>
            </FCol>
          )}
        </div>

        {!off('sec_footer_bottom') && (s.copyright || s.footer_note) && <div className="flex flex-col items-center justify-center gap-x-6 gap-y-2 border-t border-line py-6 text-center text-xs text-muted sm:flex-row">
          <span>{s.copyright}</span>
          {s.footer_note && <span className="text-center">{s.footer_note}</span>}
        </div>}
      </div>
    </footer>
  )
}

function Late({ children }) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (!('requestIdleCallback' in window)) { const id = setTimeout(() => setOn(true), 800); return () => clearTimeout(id) }
    const id = requestIdleCallback(() => setOn(true), { timeout: 2500 })
    return () => cancelIdleCallback(id)
  }, [])
  return on ? <Suspense fallback={null}>{children}</Suspense> : null
}
// Điện thoại / máy cảm ứng và máy bật "giảm chuyển động" không chạy hiệu ứng → khỏi tải mã của chúng
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const cursorOn = v => !!v && v !== 'none' && v !== 'none+none' && !matchMedia('(pointer: coarse)').matches && !calm()

function Site({ path }) {
  const raw = useContent()
  const lang = useSiteLang(raw.settings)
  useFavicon(brandOf(raw.settings))
  useEffect(() => { document.documentElement.lang = lang }, [lang])
  // Chưa tải xong dữ liệu: chỉ vẽ nền, không hiện nội dung mẫu
  if (!raw.ready) return <div className="min-h-screen" aria-busy="true" />
  return <LangCtx.Provider value={lang}><SiteBody path={path} raw={raw} lang={lang} /></LangCtx.Provider>
}

function SiteBody({ path, raw, lang }) {
  const { t } = useT()
  const { socials } = raw
  const posts = localizeList(raw.posts, 'posts', lang)
  const skills = localizeList(raw.skills, 'skills', lang), jobs = localizeList(raw.jobs, 'jobs', lang)
  const projects = localizeList(raw.projects, 'projects', lang), footer_links = localizeList(raw.footer_links, 'footer_links', lang)
  const settings = localizeSettings(raw.settings, lang)
  const hidden = new Set(settings.hidden || [])
  const off = k => !!k && hidden.has(k)
  // link footer trỏ tới mục đang ẩn (VD #skills) cũng ẩn theo
  const fLinks = footer_links.filter(l => !off(SECTION_OF[(l.href || '').replace(/^\/?#/, '')]))
  const hero = heroFor(settings.hero, lang)
  // File CV: tải lên ở Admin → Đầu trang (bản English nếu có); link cũ ở Thông tin chung vẫn dùng được
  const cvUrl = (lang === 'en' && hero.cv?.file_en) || hero.cv?.file || settings.cv_url || ''

  // Trang hiện tại: / (trang chủ), /blog, /blog/ten-bai-12, /du-an/ten-du-an-3
  const [pathname, query = ''] = path.split('?')
  let page = 'home', id = null, mm
  if (/^\/blog\/?$/.test(pathname)) page = 'blog'
  else if ((mm = pathname.match(/^\/blog\/(.+)$/))) { page = 'post'; id = idFromSlug(mm[1]) }
  else if ((mm = pathname.match(/^\/du-an\/(.+)$/))) { page = 'project'; id = idFromSlug(mm[1]) }
  else if (!['/', '', '/index.html'].includes(pathname)) page = 'notfound'
  const tag = new URLSearchParams(query).get('the') || ''
  const pageNo = Math.max(1, parseInt(new URLSearchParams(query).get('trang'), 10) || 1)
  const blogPosts = off('sec_blog') ? [] : posts
  const post = page === 'post' ? blogPosts.find(p => p.id === id) : null
  // SEO trang Blog: mỗi trang có link riêng, tiêu đề + mô tả có số trang, liên kết trang trước/sau
  const { total: blogTotal } = blogPages(blogPosts, tag)
  const pgLabel = pageNo > 1 ? ` — ${t('pg.page')} ${pageNo}` : ''
  const blogSeo = {
    title: `${tag ? `Blog #${tag}` : 'Blog'}${pgLabel}`, description: t('seo.blog') + pgLabel.replace(' — ', ' '), path: blogPath(tag, pageNo),
    prev: pageNo > 1 && pageNo <= blogTotal ? blogPath(tag, pageNo - 1) : '', next: pageNo < blogTotal ? blogPath(tag, pageNo + 1) : '', noindex: pageNo > blogTotal,
  }
  const proj = page === 'project' ? (off('sec_work') ? [] : projects).find(p => p.id === id) : null
  // Link sai / bài, dự án đã ẩn hoặc xóa → trang 404 (không cho Google lập chỉ mục)
  const missing = page === 'notfound' || (page === 'post' && !post) || (page === 'project' && !proj)
  const viewKind = missing ? 'notfound' : page
  // Đếm lượt xem (Admin → Tổng quan). Đổi ngôn ngữ không tính thêm lượt.
  useEffect(() => { trackView({ kind: viewKind, ref_id: viewKind === 'post' || viewKind === 'project' ? id : null, path: pathname, lang }) }, [viewKind, id, pathname])

  // Link đẹp: đổi đường dẫn về đúng tên bài (VD bài đổi tiêu đề) mà không tải lại
  useEffect(() => {
    const want = post ? postPath(post) : proj ? projectPath(proj) : null
    if (want && pathname !== want) navigate(want, { replace: true })
  }, [post?.id, post?.slug, post?.title, proj?.id, proj?.title])

  useSeo(missing ? { title: t('nf.title'), description: t('nf.lead'), path: pathname, noindex: true }
    : page === 'post' && post ? { title: post.title, description: post.excerpt, image: post.image, type: 'article', published: post.published_at, path: postPath(post), canonical: post.canonical_source && /^https?:\/\//i.test(post.url || '') ? post.url : '' }
    : page === 'project' && proj ? { title: proj.title, description: proj.description, image: proj.image, path: projectPath(proj) }
    : page === 'blog' ? blogSeo

    : { description: hero.lead, image: hero.avatar.image, path: '/' })

  // Đổi trang thì lên đầu; về trang chủ kèm #muc thì nhảy tới đúng mục
  useEffect(() => {
    if (page !== 'home') { window.scrollTo(0, 0); return }
    const sec = location.hash.startsWith('#/') ? '' : location.hash.slice(1)
    const el = sec && document.getElementById(sec)
    if (el) requestAnimationFrame(() => window.scrollTo(0, sectionTop(el)))
    else if (!sec) window.scrollTo(0, 0)
  }, [path])

  // Bấm link: trang nội bộ đổi trang không tải lại; #muc trên cùng trang thì cuộn mượt
  useEffect(() => {
    const onClick = e => {
      const a = e.target.closest?.('a[href]')
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return
      const h = a.getAttribute('href')
      if (h.startsWith('#') && !h.startsWith('#/')) {
        const el = document.getElementById(h.slice(1))
        if (el) {
          e.preventDefault()
          if (page === 'home') try { history.replaceState(null, '', HASH ? h : `/${h}`) } catch {}
          smoothScrollTo(sectionTop(el))
        } else if (!HASH) { e.preventDefault(); navigate(`/${h}`) }
        return
      }
      if (!HASH && h.startsWith('/') && !h.startsWith('//')) {
        e.preventDefault()
        const [pth, sec] = h.split('#')
        if (sec && (pth === '/' || pth === '') && page === 'home') { const el = document.getElementById(sec); if (el) { history.replaceState(null, '', h); smoothScrollTo(sectionTop(el)); return } }
        navigate(h)
      }
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [page])
  useScrollVars([path, lang])

  return (
    <>
      <a href="#noi-dung" className="sr-only z-[60] rounded-lg bg-white px-4 py-2 font-semibold text-[#161525] focus:not-sr-only focus:fixed focus:left-4 focus:top-4">{t('skip')}</a>
      <Navbar key={page} brand={brandOf(settings)} langSwitch={settings.lang_switch !== false} off={off} forced={missing ? 'none' : page === 'post' || page === 'blog' ? 'blog' : page === 'project' ? 'work' : null} />
      {page !== 'home' ? (
        <main id="noi-dung">
          {missing && <NotFoundPage what={page === 'post' ? t('post.notfound') : page === 'project' ? t('proj.notfound') : ''} path={pathname} posts={blogPosts} />}
          {page === 'blog' && <BlogList posts={blogPosts} tag={tag} pageNo={pageNo} />}
          {page === 'post' && post && <PostDetail id={id} posts={blogPosts} cta={hero.post_cta} />}
          {page === 'project' && proj && <ProjectDetail id={id} projects={off('sec_work') ? [] : projects} />}
        </main>
      ) : (
      <main id="noi-dung" className="overflow-x-clip">
        <Hero off={off} hero={hero} cv={cvUrl} />
        {!off('sec_marquee') && <Marquee hero={hero} />}

        {!off('sec_skills') && <Section id="skills" lab={t('skills.label')} title={t('skills.title')} intro={t('skills.intro')}>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {skills.map((s, i) => (
              <Reveal key={s.id ?? s.title} delay={i * 80}>
                <div className={`${card} h-full p-7`}>
                  <div className={`${grad} mb-[18px] grid size-12 place-items-center rounded-2xl text-[22px]`}>{s.icon}</div>
                  <h3 className="mb-2 text-[19px] font-semibold">{s.title}</h3>
                  <p className="text-[14.5px] text-muted">{s.description}</p>
                  <div className="mt-[18px] flex flex-wrap gap-2">
                    {(s.tags || []).map(t => <i key={t} className="rounded-full border border-line bg-white/5 px-2.5 py-1 text-[11px] not-italic text-[#c9cbd8]">{t}</i>)}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Section>}

        {!off('sec_experience') && <Section id="experience" lab={t('exp.label')} title={t('exp.title')}>
          <div data-draw className="relative mt-10">
            <i aria-hidden className="absolute inset-y-0 left-0 w-px bg-line" />
            <i aria-hidden className={`draw-line absolute inset-y-0 left-0 w-px bg-gradient-to-b from-pink to-purple`} />
            {jobs.map(({ id, period: time, role, description: text }) => (
              <Reveal key={id}>
                <div className="relative grid gap-1.5 border-b border-line py-[26px] pl-[22px] sm:grid-cols-[200px_1fr] sm:gap-5 sm:pl-7">
                  <i className={`${grad} absolute -left-1.5 top-[34px] size-[11px] rounded-full shadow-[0_0_0_4px_#07080f]`} />
                  <span className="text-sm font-semibold text-pink">{time}</span>
                  <div><h3 className="mb-1 text-lg font-semibold">{role}</h3><p className="text-[14.5px] text-muted">{text}</p></div>
                </div>
              </Reveal>
            ))}
          </div>
        </Section>}

        {!off('sec_work') && <Section id="work" lab={t('work.label')} title={t('work.title')}>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {projects.map((p, i) => { const cover = coverOf(p, 'project'); return (
              <Reveal key={p.id} delay={(i % 2) * 80}>
                <article data-cursor-label={t('cursor.view')} {...warmProject(cover)} className={`${card} group h-full p-5`}>
                  <a href={href(projectPath(p))} className="relative mb-[22px] block aspect-[1200/630] overflow-hidden rounded-xl bg-[#0b0d16]" tabIndex={-1} aria-hidden>
                    <img src={cover} alt="" width="1200" height="630" loading="lazy" decoding="async" className="size-full object-cover transition duration-700 group-hover:scale-[1.06]" />
                  </a>
                  <div className={label}>{p.category}</div>
                  <h3 className="mb-2 mt-1.5 text-[22px] font-semibold"><a href={href(projectPath(p))} className="block transition hover:text-pink">{p.title}</a></h3>
                  <p className="mb-3.5 text-[14.5px] text-muted">{p.description}</p>
                  <a href={href(projectPath(p))} className="inline-flex items-center gap-1.5 text-[13px] font-semibold">{t('work.more')} <span className="transition group-hover:translate-x-1.5">→</span></a>
                </article>
              </Reveal>
            )})}
          </div>
        </Section>}

        {!off('sec_blog') && <Section id="blog" lab={t('blog.label')} title={t('blog.title')}>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {posts.slice(0, 3).map((po, i) => (
              <Reveal key={po.id} delay={i * 80}><BlogCard po={po} /></Reveal>
            ))}
          </div>
          {posts.length > 0 && (
            <div className="mt-10 text-center">
              <a href={href('/blog')} className="inline-flex items-center gap-2 rounded-xl border border-line px-6 py-3 text-sm font-semibold transition hover:border-purple hover:bg-purple/10">{t('blog.all', { n: posts.length })} <span>→</span></a>
            </div>
          )}
        </Section>}

        {!off('sec_contact') && <section id="contact" className="pb-[clamp(64px,10vw,110px)]">
          <div className="mx-auto w-[min(1180px,100%-32px)] sm:w-[min(1180px,100%-48px)]">
            <Reveal><Contact settings={settings} socials={socials} /></Reveal>
          </div>
        </section>}
      </main>
      )}
      <Footer settings={settings} links={fLinks} socials={socials} off={off} cv={cvUrl} />
      {(cursorOn(settings.cursor_effect) || (activeSeason(hero.season) && !calm())) && <Late>
        {cursorOn(settings.cursor_effect) && <CursorFX effect={settings.cursor_effect} />}
        {activeSeason(hero.season) && <SeasonFX effect={activeSeason(hero.season)} amount={hero.season.amount} />}
      </Late>}
    </>
  )
}

export default function App() {
  const path = usePath()
  // Link cũ dạng #post-5 / #project-2 → chuyển sang link mới
  useEffect(() => {
    const m = location.hash.match(/^#(post|project)-(\d+)$/)
    if (m) navigate(m[1] === 'post' ? `/blog/bai-viet-${m[2]}` : `/du-an/du-an-${m[2]}`, { replace: true })
  }, [path])
  const admin = location.hash === '#admin' || location.hash.startsWith('#/admin') || path.startsWith('/admin')
  return admin
    ? <Suspense fallback={<p className="mt-24 text-center text-muted">Đang tải trang quản trị…</p>}><Admin /></Suspense>
    : <Site path={path} />
}
