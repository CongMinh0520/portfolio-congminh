import { useEffect, useMemo, useState } from 'react'
import { coverOf } from './autoArt.js'
import { href, safeUrl, postPath, projectPath, tagPath, blogPath, slugify } from './router.js'
import { useT } from './i18n.js'
import { warmPost } from './prefetch.js'

const grad = 'bg-gradient-to-r from-pink to-purple'
const wrap = 'mx-auto w-[min(760px,100%-32px)] sm:w-[min(760px,100%-48px)]'

/* ---- Markdown tối giản, an toàn (không dùng innerHTML) ----
   Hỗ trợ: ## / ### tiêu đề, - danh sách, 1. danh sách số, > trích dẫn, **đậm**, *nghiêng*, `code`, [chữ](link), ![ảnh](url), ``` khối code */
const unesc = t => t.replace(/\\([\\`*_{}\[\]()#+\-.!>|~])/g, '$1')
const plainText = t => unesc(String(t).replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*`]/g, '')).trim()

function inline(text, key = 0) {
  const out = []; const re = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g
  let last = 0, m, i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(unesc(text.slice(last, m.index)))
    const t = m[0], k = `${key}-${i++}`
    if (t.startsWith('**')) out.push(<strong key={k} className="font-semibold text-white">{unesc(t.slice(2, -2))}</strong>)
    else if (t.startsWith('*')) out.push(<em key={k} className="italic">{unesc(t.slice(1, -1))}</em>)
    else if (t.startsWith('`')) out.push(<code key={k} className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.9em] text-[#f3b6d6]">{t.slice(1, -1)}</code>)
    else {
      const [, rawLabel, link] = t.match(/\[([^\]]+)\]\(([^)]+)\)/); const label = unesc(rawLabel)
      const ext = /^https?:/i.test(link)
      const safe = ext || /^mailto:/i.test(link) ? link : /^[#/]/.test(link) ? href(link) : '#'
      out.push(<a key={k} href={safe} {...(ext ? { target: '_blank', rel: 'noreferrer' } : {})} className="text-pink underline decoration-pink/40 underline-offset-4 hover:decoration-pink">{label}</a>)
    }
    last = re.lastIndex
  }
  out.push(unesc(text.slice(last)))
  return out
}

/** Danh sách tiêu đề trong bài (dùng cho mục lục). id phải khớp với id Markdown gắn cho thẻ h2/h3 */
export function headingsOf(md = '') {
  const used = {}, out = []
  let inCode = false
  for (const l of String(md).replace(/\r/g, '').split('\n')) {
    if (l.startsWith('```')) { inCode = !inCode; continue }
    if (inCode) continue
    const m = l.match(/^(#{1,3}) (.+)/)
    if (!m) continue
    const text = plainText(m[2]); let id = `muc-${slugify(text)}`
    used[id] = (used[id] || 0) + 1; if (used[id] > 1) id += `-${used[id]}`
    out.push({ id, text, level: m[1].length === 3 ? 3 : 2 })
  }
  return out
}

export function Markdown({ text = '' }) {
  const heads = useMemo(() => headingsOf(text), [text])
  let h = 0
  const lines = String(text).replace(/\r/g, '').split('\n')
  const blocks = []; let i = 0
  while (i < lines.length) {
    const l = lines[i]
    if (!l.trim()) { i++; continue }
    if (l.startsWith('```')) {
      const code = []; i++
      while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++])
      i++; blocks.push(<pre key={i} className="overflow-x-auto rounded-xl border border-line bg-[#0b0d16] p-4 font-mono text-sm leading-relaxed text-[#d7d9e6]">{code.join('\n')}</pre>); continue
    }
    const hm = l.match(/^(#{1,3}) (.+)/)
    if (hm) {
      const id = heads[h++]?.id
      blocks.push(hm[1].length === 3
        ? <h3 key={i} id={id} className="scroll-mt-24 pt-2 text-xl font-semibold">{inline(hm[2], i)}</h3>
        : <h2 key={i} id={id} className="scroll-mt-24 pt-4 text-2xl font-bold tracking-tight">{inline(hm[2], i)}</h2>)
      i++; continue
    }
    if (/^\s*[-*+] /.test(l)) {
      const items = []; while (i < lines.length && /^\s*[-*+] /.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*+] /, ''))
      blocks.push(<ul key={i} className="space-y-2 pl-1">{items.map((t, k) => <li key={k} className="flex gap-3"><i className={`${grad} mt-[0.6em] size-1.5 flex-none rounded-full`} /><span>{inline(t, `${i}-${k}`)}</span></li>)}</ul>); continue
    }
    if (/^\s*\d+\. /.test(l)) {
      const items = []; while (i < lines.length && /^\s*\d+\. /.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+\. /, ''))
      blocks.push(<ol key={i} className="list-decimal space-y-2 pl-6 marker:text-pink">{items.map((t, k) => <li key={k}>{inline(t, `${i}-${k}`)}</li>)}</ol>); continue
    }
    if (/^>\s?/.test(l)) {
      const q = []; while (i < lines.length && /^>\s?/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, ''))
      blocks.push(<blockquote key={i} className="rounded-r-xl border-l-2 border-pink bg-white/[0.03] px-5 py-3 text-muted">{inline(q.join(' '), i)}</blockquote>); continue
    }
    const img = l.trim().match(/^!\[([^\]]*)\]\((https?:[^)\s]+)\)$/)
    if (img) { blocks.push(<img key={i} src={img[2]} alt={unesc(img[1])} loading="lazy" decoding="async" className="w-full rounded-xl border border-line bg-[#0b0d16]" />); i++; continue }
    const para = []; while (i < lines.length && lines[i].trim() && !/^(#{1,3} |\s*[-*+] |\s*\d+\. |>|```|!\[)/.test(lines[i])) para.push(lines[i++])
    blocks.push(<p key={i}>{inline(para.join(' '), i)}</p>)
  }
  return <div className="space-y-5 text-[16.5px] leading-[1.8] text-[#c9cbd8]">{blocks}</div>
}

export const fmtDate = (d, lang = 'vi') => { if (!d) return ''; const t = new Date(d); return isNaN(t) ? d : t.toLocaleDateString(lang === 'en' ? 'en-US' : 'vi-VN', { day: 'numeric', month: 'long', year: 'numeric' }) }
export const readMins = t => Math.max(1, Math.round(String(t || '').split(/\s+/).length / 200))
const tagsOf = p => (Array.isArray(p?.tags) ? p.tags : String(p?.tags || '').split(',')).map(s => String(s).trim()).filter(Boolean)

export const Tag = ({ t, small }) => (
  <a href={href(tagPath(t))} className={`inline-flex min-h-6 items-center rounded-full border border-line bg-white/5 text-[#c9cbd8] transition hover:border-purple hover:text-white ${small ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'}`}>#{t}</a>
)

/** Thẻ bài viết dùng chung: trang chủ, trang Blog, bài liên quan */
export function BlogCard({ po, compact }) {
  const { t, lang } = useT()
  const link = href(postPath(po)), tags = tagsOf(po), cover = coverOf(po, 'post')
  return (
    <div data-cursor-label={t('cursor.read')} {...warmPost(po, cover)} className="group h-full overflow-hidden rounded-2xl border border-line bg-gradient-to-b from-[#171a2c] to-card transition duration-300 hover:-translate-y-1.5 hover:border-purple/60 hover:shadow-[0_20px_50px_#6650ff22]">
      <a href={link} className="block aspect-[1200/630] overflow-hidden bg-[#0b0d16]" tabIndex={-1} aria-hidden>
        <img src={cover} alt="" width="1200" height="630" loading="lazy" decoding="async" className="size-full object-cover transition duration-700 group-hover:scale-[1.06]" />
      </a>
      <div className={compact ? 'p-5' : 'p-7'}>
        <p className="mb-2 flex flex-wrap gap-x-2 text-xs text-muted">
          {po.published_at && <span>{fmtDate(po.published_at, lang)}</span>}{po.published_at && <span aria-hidden>·</span>}<span>{t('post.mins', { n: readMins(po.content || po.excerpt) })}</span>
        </p>
        <h3 className={`mb-2 font-semibold ${compact ? 'text-[17px]' : 'text-[19px]'}`}><a href={link} className="block transition hover:text-pink">{po.title}</a></h3>
        {!compact && po.excerpt && <p className="text-[14.5px] text-muted">{po.excerpt}</p>}
        {tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{tags.slice(0, 3).map(t => <Tag key={t} t={t} small />)}</div>}
        {!compact && <a href={link} className="mt-3.5 inline-flex min-h-6 items-center gap-1.5 text-[13px] font-semibold">{t('post.read')} <span className="transition group-hover:translate-x-1.5">→</span></a>}
      </div>
    </div>
  )
}

/* ---------------- Trang danh sách Blog ---------------- */
const PAGE = 9
// Các số trang cần hiện: luôn có trang đầu, trang cuối, trang hiện tại ±1; chỗ bị bỏ thay bằng "…"
const pageList = (cur, total) => {
  const keep = new Set([1, total, cur - 1, cur, cur + 1].filter(n => n >= 1 && n <= total))
  const out = []; let prev = 0
  ;[...keep].sort((a, b) => a - b).forEach(n => { if (n - prev === 2) out.push(n - 1); else if (n - prev > 2) out.push('…'); out.push(n); prev = n })
  return out
}

function Pagination({ cur, total, tag }) {
  const { t } = useT()
  if (total <= 1) return null
  const box = 'inline-flex h-10 min-w-10 items-center justify-center whitespace-nowrap rounded-xl border px-3 text-sm font-semibold transition'
  const link = (n, label, extra = '') => <a href={href(blogPath(tag, n))} className={`${box} border-line text-[#c9cbd8] hover:border-purple hover:bg-purple/10 hover:text-white ${extra}`}>{label}</a>
  const off = label => <span aria-disabled="true" className={`${box} cursor-not-allowed border-line/60 text-[#4a4e68]`}>{label}</span>
  return (
    <nav aria-label={t('pg.nav')} className="mt-12 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
      {cur > 1 ? link(cur - 1, <><span aria-hidden>‹</span><span className="hidden sm:inline">&nbsp;{t('pg.prev')}</span></>, '') : off(<><span aria-hidden>‹</span><span className="hidden sm:inline">&nbsp;{t('pg.prev')}</span></>)}
      {pageList(cur, total).map((n, i) => n === '…'
        ? <span key={`e${i}`} className="px-1 text-muted">…</span>
        : n === cur
          ? <span key={n} aria-current="page" className={`${box} border-transparent bg-gradient-to-r from-pink to-purple text-white`}>{n}</span>
          // Điện thoại: ẩn 2 số sát bên trang hiện tại để thanh phân trang nằm gọn một hàng
          : <span key={n} className={Math.abs(n - cur) === 1 && n !== 1 && n !== total && total > 5 ? 'hidden sm:inline' : ''}>{link(n, n, '')}</span>)}
      {cur < total ? link(cur + 1, <><span className="hidden sm:inline">{t('pg.next')}&nbsp;</span><span aria-hidden>›</span></>) : off(<><span className="hidden sm:inline">{t('pg.next')}&nbsp;</span><span aria-hidden>›</span></>)}
    </nav>
  )
}

/** Danh sách bài sau khi lọc thẻ + tổng số trang (dùng chung cho trang Blog và thẻ SEO) */
export function blogPages(posts, tag) {
  const list = tag ? posts.filter(p => tagsOf(p).some(t => t.toLowerCase() === tag.toLowerCase())) : posts
  return { list, total: Math.max(1, Math.ceil(list.length / PAGE)) }
}

export function BlogList({ posts, tag, pageNo = 1, rss = true }) {
  const { t, lang } = useT()
  const allTags = useMemo(() => {
    const c = {}; posts.forEach(p => tagsOf(p).forEach(t => { c[t] = (c[t] || 0) + 1 }))
    return Object.entries(c).sort((a, b) => b[1] - a[1])
  }, [posts])
  const { list, total } = blogPages(posts, tag)
  const cur = pageNo, beyond = pageNo > total
  const shown = beyond ? [] : list.slice((cur - 1) * PAGE, cur * PAGE)
  const chip = active => `rounded-full border px-3.5 py-1.5 text-sm transition ${active ? 'border-purple bg-purple/15 text-white' : 'border-line text-muted hover:text-white'}`
  return (
    <section className="mx-auto w-[min(1180px,100%-32px)] py-12 sm:w-[min(1180px,100%-48px)] sm:py-16">
      <a href={href('/#blog')} className="text-sm text-muted transition hover:text-white">{t('post.home')}</a>
      <p className="mt-8 text-[11px] font-bold tracking-[2px] text-pink">BLOG</p>
      <h1 className="mt-3 text-[clamp(32px,5vw,52px)] font-bold leading-[1.1] tracking-tight">{t('post.allTitle')}</h1>
      <p className="mt-3 text-muted">{t('post.count', { n: posts.length })} {rss && <a href={lang === 'en' ? '/rss-en.xml' : '/rss.xml'} className="whitespace-nowrap text-sm font-semibold text-[#ffb27f] underline decoration-[#ffb27f]/40 underline-offset-4 transition hover:decoration-[#ffb27f]">{t('rss.follow')}</a>}</p>
      {allTags.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2">
          <a href={href('/blog')} className={chip(!tag)}>{t('post.allTag')} <span className="text-xs text-muted">{posts.length}</span></a>
          {allTags.map(([tg, c]) => <a key={tg} href={href(tagPath(tg))} className={chip(tag?.toLowerCase() === tg.toLowerCase())}>#{tg} <span className="text-xs text-muted">{c}</span></a>)}
        </div>
      )}
      {beyond
        ? <div className="mt-12 rounded-2xl border border-dashed border-line p-10 text-center text-muted">{t('pg.none', { n: pageNo })} <a href={href(blogPath(tag, total))} className="font-semibold text-pink hover:underline">{t('pg.last', { n: total })}</a></div>
        : list.length === 0
        ? <p className="mt-12 rounded-2xl border border-dashed border-line p-10 text-center text-muted">{t('post.none')} {tag ? <>{t('post.noneTag')} <b className="text-white">#{tag}</b></> : ''}.</p>
        : <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{shown.map(po => <BlogCard key={po.id} po={po} />)}</div>}
      {!beyond && <Pagination cur={cur} total={total} tag={tag} />}
      {total > 1 && !beyond && <p className="mt-4 text-center text-xs text-muted">{t('pg.range', { a: (cur - 1) * PAGE + 1, b: (cur - 1) * PAGE + shown.length, n: list.length })}</p>}
    </section>
  )
}

/* ---------------- Chi tiết ---------------- */
function Pager({ list, index, path, label }) {
  const { t } = useT()
  const prev = list[index - 1], next = list[index + 1]
  if (!prev && !next) return null
  const card = 'group flex min-w-0 flex-1 flex-col gap-1 rounded-xl border border-line bg-card p-4 transition hover:border-purple/60'
  return (
    <nav className="mt-10 flex flex-col gap-3 sm:flex-row">
      {prev ? <a href={href(path(prev))} className={card}><span className="text-xs text-muted">{t('pager.prev', { x: label })}</span><span className="truncate font-semibold group-hover:text-pink">{prev.title}</span></a> : <span className="hidden flex-1 sm:block" />}
      {next ? <a href={href(path(next))} className={`${card} sm:text-right`}><span className="text-xs text-muted">{t('pager.next', { x: label })}</span><span className="truncate font-semibold group-hover:text-pink">{next.title}</span></a> : <span className="hidden flex-1 sm:block" />}
    </nav>
  )
}

function NotFound({ label }) { return <NotFoundPage what={label} /> }

/** Trang 404: link sai, bài / dự án đã ẩn hoặc xóa. Có "bug report" vui và gợi ý bài để đọc tiếp. */
export function NotFoundPage({ what, path, posts = [] }) {
  const { t } = useT()
  const shown = (() => { try { return decodeURIComponent(path || location.pathname + location.hash) } catch { return path || '' } })().slice(0, 70)
  const row = (k, v) => <div className="grid grid-cols-[110px_1fr] gap-3 border-t border-line/70 py-2.5 sm:grid-cols-[130px_1fr]"><dt className="text-muted">{k}</dt><dd className="min-w-0 break-words text-[#dfe0ea]">{v}</dd></div>
  return (
    <div className="mx-auto w-[min(1100px,100%-32px)] py-20 sm:w-[min(1100px,100%-48px)] sm:py-28">
      <div className="grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,400px)] md:gap-14">
        <div>
          <p className="bg-gradient-to-r from-pink to-purple bg-clip-text text-[88px] font-extrabold leading-none tracking-tight text-transparent sm:text-[120px]" aria-hidden="true">404</p>
          <h1 className="mt-4 text-3xl font-bold sm:text-4xl">{t('nf.title')}</h1>
          <p className="mt-3 max-w-[46ch] text-muted">{what ? t('nf.text', { x: what }) : t('nf.lead')}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={href('/')} className={`${grad} inline-flex rounded-xl px-5 py-3 text-sm font-semibold`}>{t('nf.home')}</a>
            <a href={href('/blog')} className="inline-flex rounded-xl border border-line px-5 py-3 text-sm font-semibold text-[#dfe0ea] transition hover:border-purple/60 hover:text-white">{t('nf.blog')}</a>
          </div>
        </div>
        <article aria-label={t('nf.bug.title')} className="rounded-2xl border border-line bg-gradient-to-b from-[#171a2c] to-card p-5 text-sm shadow-[0_20px_60px_-30px_#6650ff80] sm:p-6">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-md bg-pink/15 px-2 py-1 font-mono font-semibold text-pink">BUG-404</span>
            <span className="rounded-md border border-line px-2 py-1 text-muted">{t('nf.bug.sev')}</span>
          </div>
          <h2 className="mb-2 text-base font-semibold">{t('nf.bug.title')}</h2>
          <dl>
            {row(t('nf.bug.steps'), <>{t('nf.bug.open')} <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-[12.5px] text-[#c9bfff]">{shown || '/'}</code></>)}
            {row(t('nf.bug.expected'), t('nf.bug.expectedv'))}
            {row(t('nf.bug.actual'), t('nf.bug.actualv'))}
            {row(t('nf.bug.status'), t('nf.bug.statusv'))}
          </dl>
        </article>
      </div>
      {posts.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-6 text-xl font-semibold">{t('nf.read')}</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{posts.slice(0, 3).map(po => <BlogCard key={po.id} po={po} compact />)}</div>
        </section>
      )}
    </div>
  )
}

/** Mục lục: cột bên phải trên máy tính, khung gập ở đầu bài trên điện thoại. Tô sáng mục đang đọc. */
function Toc({ heads, mobile }) {
  const { t } = useT()
  const [active, setActive] = useState(heads[0]?.id)
  useEffect(() => {
    if (mobile || !heads.length) return
    const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && setActive(e.target.id)), { rootMargin: '-90px 0px -70% 0px' })
    heads.forEach(h => { const el = document.getElementById(h.id); el && io.observe(el) })
    return () => io.disconnect()
  }, [heads, mobile])
  const list = (
    <ul className="space-y-1 text-sm">
      {heads.map(h => (
        <li key={h.id}>
          <a href={`#${h.id}`} data-toc
            className={`block rounded-md py-1.5 leading-snug transition hover:text-white ${h.level === 3 ? 'pl-5 text-[13px]' : 'pl-2'} ${!mobile && active === h.id ? 'bg-purple/10 text-white shadow-[inset_2px_0_0_#e94b9e]' : 'text-muted'}`}>{h.text}</a>
        </li>
      ))}
    </ul>
  )
  if (mobile) return (
    <details className="mt-8 rounded-xl border border-line bg-card p-4 lg:hidden">
      <summary className="cursor-pointer text-sm font-semibold">{t('toc.title')} ({heads.length})</summary>
      <div className="mt-3">{list}</div>
    </details>
  )
  return (
    <nav aria-label={t('toc.title')} className="sticky top-24 hidden max-h-[calc(100vh-8rem)] overflow-y-auto lg:block">
      <p className="mb-3 text-[11px] font-bold tracking-[2px] text-muted">{t('toc.side')}</p>{list}
    </nav>
  )
}

function Cta({ cta }) {
  if (!cta?.show || !(cta.title || cta.button)) return null
  const link = cta.link || '/#contact', ext = /^https?:/i.test(link)
  return (
    <div className="mt-12 rounded-2xl border border-line bg-[radial-gradient(500px_220px_at_50%_0,#6650ff38,transparent_70%)] bg-card p-7 text-center sm:p-9">
      {cta.title && <h2 className="text-[clamp(20px,3vw,26px)] font-bold leading-snug [text-wrap:balance]">{cta.title}</h2>}
      {cta.text && <p className="mx-auto mt-2 max-w-[520px] text-muted">{cta.text}</p>}
      {cta.button && <a href={href(link)} {...(ext ? { target: '_blank', rel: 'noreferrer' } : {})} className={`${grad} mt-6 inline-block rounded-xl px-6 py-3 text-sm font-semibold shadow-[0_10px_30px_#6650ff55] transition hover:-translate-y-0.5`}>{cta.button}</a>}
    </div>
  )
}

export function PostDetail({ id, posts, cta }) {
  const { t, lang } = useT()
  const index = posts.findIndex(p => String(p.id) === String(id)), po = posts[index]
  const heads = useMemo(() => headingsOf(po?.content || ''), [po?.content])
  const related = useMemo(() => {
    if (!po) return []
    const mine = new Set(tagsOf(po).map(t => t.toLowerCase()))
    return posts.filter(p => p.id !== po.id)
      .map((p, i) => ({ p, score: tagsOf(p).filter(t => mine.has(t.toLowerCase())).length * 100 - i }))
      .sort((a, b) => b.score - a.score).slice(0, 3).map(x => x.p)
  }, [po, posts])
  if (!po) return <NotFound label={t('post.notfound')} />
  const tags = tagsOf(po), showToc = heads.length >= 2
  return (
    <article className="mx-auto w-[min(1120px,100%-32px)] py-12 sm:w-[min(1120px,100%-48px)] sm:py-16">
      <div className={`grid gap-12 ${showToc ? 'lg:grid-cols-[minmax(0,1fr)_240px]' : ''}`}>
        <div className={`min-w-0 ${showToc ? '' : 'mx-auto w-full max-w-[760px]'}`}>
          <a href={href('/blog')} className="text-sm text-muted transition hover:text-white">{t('post.back')}</a>
          <p className="mt-8 text-[11px] font-bold tracking-[2px] text-pink">BLOG</p>
          <h1 className="mt-3 text-[clamp(30px,5vw,48px)] font-bold leading-[1.12] tracking-tight [text-wrap:balance]">{po.title}</h1>
          <p className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
            {po.published_at && <span>{fmtDate(po.published_at, lang)}</span>}
            {po.published_at && <span aria-hidden>·</span>}
            <span>{t('post.mins', { n: readMins(po.content || po.excerpt) })}</span>
          </p>
          {tags.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{tags.map(t => <Tag key={t} t={t} />)}</div>}
          <img src={coverOf(po, 'post')} alt={po.title} width="1200" height="630" decoding="async" fetchPriority="high" className="mt-8 aspect-[1200/630] w-full rounded-2xl border border-line bg-[#0b0d16] object-cover" />
          {po.excerpt && (
            <div className="mt-8 rounded-xl border border-purple/30 bg-purple/[0.07] px-5 py-4 text-[15.5px] leading-relaxed text-[#dfe0ea]">
              <b className="mr-1.5 text-white">{t('post.summary')}</b>{po.excerpt}
            </div>
          )}
          {showToc && <Toc heads={heads} mobile />}
          <div className="mt-8">{po.content ? <Markdown text={po.content} /> : <p className="text-muted">{t('post.empty')}</p>}</div>
          {po.url && <a href={safeUrl(po.url)} target="_blank" rel="noreferrer" className="mt-10 inline-flex items-center gap-2 rounded-xl border border-purple bg-purple/10 px-5 py-3 text-sm font-semibold transition hover:bg-purple/25">{t('post.source')}</a>}
          <Cta cta={cta} />
        </div>
        {showToc && <aside className="min-w-0"><Toc heads={heads} /></aside>}
      </div>
      {related.length > 0 && (
        <section className="mt-16 border-t border-line pt-10">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-2xl font-bold tracking-tight">{t('post.related')}</h2>
            <a href={href('/blog')} className="text-sm font-semibold text-muted transition hover:text-white">{t('post.allLink')}</a>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{related.map(p => <BlogCard key={p.id} po={p} compact />)}</div>
        </section>
      )}
      <div className={showToc ? '' : 'mx-auto max-w-[760px]'}><Pager list={posts} index={index} path={postPath} label={t('post.unit')} /></div>
    </article>
  )
}

export function ProjectDetail({ id, projects }) {
  const { t } = useT()
  const index = projects.findIndex(p => String(p.id) === String(id)), p = projects[index]
  if (!p) return <NotFound label={t('proj.notfound')} />
  const tools = Array.isArray(p.tools) ? p.tools : []
  const facts = [[t('proj.role'), p.role], [t('proj.time'), p.duration], [t('proj.cat'), p.category]].filter(([, v]) => v)
  return (
    <article className="py-12 sm:py-16">
      <div className={wrap}>
        <a href={href('/#work')} className="text-sm text-muted transition hover:text-white">{t('proj.back')}</a>
        <p className="mt-8 text-[11px] font-bold tracking-[2px] text-pink">{p.category || t('proj.label')}</p>
        <h1 className="mt-3 text-[clamp(30px,5vw,48px)] font-bold leading-[1.12] tracking-tight [text-wrap:balance]">{p.title}</h1>
        {p.description && <p className="mt-5 text-lg leading-relaxed text-[#dfe0ea]">{p.description}</p>}
      </div>
      <div className="mx-auto mt-10 w-[min(1000px,100%-32px)] sm:w-[min(1000px,100%-48px)]">
        <img src={coverOf(p, 'project')} alt={p.title} width="1200" height="630" decoding="async" fetchPriority="high" className="aspect-[1200/630] w-full rounded-2xl border border-line bg-[#0b0d16] object-cover" />
      </div>
      <div className={`${wrap} mt-10`}>
        {(facts.length > 0 || tools.length > 0) && (
          <dl className="grid gap-x-8 gap-y-5 rounded-2xl border border-line bg-card p-6 sm:grid-cols-2">
            {facts.map(([k, v]) => <div key={k}><dt className="text-xs text-muted">{k}</dt><dd className="mt-1 font-semibold">{v}</dd></div>)}
            {tools.length > 0 && (
              <div className="sm:col-span-2"><dt className="text-xs text-muted">{t('proj.tools')}</dt>
                <dd className="mt-2 flex flex-wrap gap-2">{tools.map(t => <span key={t} className="rounded-full border border-line bg-white/5 px-3 py-1 text-xs text-[#c9cbd8]">{t}</span>)}</dd>
              </div>
            )}
          </dl>
        )}
        <div className="mt-10">{p.content ? <Markdown text={p.content} /> : <p className="text-muted">{t('proj.empty')}</p>}</div>
        {p.link && <a href={safeUrl(p.link)} target="_blank" rel="noreferrer" className={`${grad} mt-10 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold`}>{t('proj.link')}</a>}
        <Pager list={projects} index={index} path={projectPath} label={t('proj.unit')} />
      </div>
    </article>
  )
}
