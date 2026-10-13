// Bug mẫu: thẻ trên trang chủ và trang chi tiết /bug/ten-bug-3 trình bày như một bug report thật.
import { href, bugPath, bugCode } from './router.js'
import { useT } from './i18n.js'
import { Markdown, fmtDate } from './Detail.jsx'

const grad = 'bg-gradient-to-r from-pink to-purple'
const wrap = 'mx-auto w-[min(860px,100%-32px)] sm:w-[min(860px,100%-48px)]'

// Màu theo mức độ / ưu tiên / trạng thái (Tailwind cần thấy class đầy đủ)
const SEV = { critical: 'bg-[#ff4d6d]/15 text-[#ff8fa3]', major: 'bg-[#ff9a54]/15 text-[#ffb27f]', minor: 'bg-[#f8d27c]/15 text-[#f8d27c]', trivial: 'bg-white/8 text-[#c9cbd8]' }
const PRI = { high: 'border-[#ff8fa3]/40 text-[#ff8fa3]', medium: 'border-[#f8d27c]/40 text-[#f8d27c]', low: 'border-line text-[#c9cbd8]' }
const STATUS = { reported: 'bg-purple/15 text-[#b5aaff]', fixed: 'bg-[#3ddc97]/12 text-[#5fe3a9]', wontfix: 'bg-white/8 text-muted' }
export const SEVERITIES = ['critical', 'major', 'minor', 'trivial']
export const PRIORITIES = ['high', 'medium', 'low']
export const STATUSES = ['reported', 'fixed', 'wontfix']

const tagsOf = b => (Array.isArray(b?.tags) ? b.tags : String(b?.tags || '').split(',')).map(s => String(s).trim()).filter(Boolean)
const chip = 'inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold'

export function BugBadges({ b }) {
  const { t } = useT()
  const sev = SEV[b.severity] ? b.severity : 'major', pri = PRI[b.priority] ? b.priority : 'medium'
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="rounded-md bg-pink/15 px-2 py-1 font-mono text-xs font-semibold text-pink">{bugCode(b)}</span>
      <span className={`${chip} ${SEV[sev]}`}>{t('bug.sev')}: {t(`sev.${sev}`)}</span>
      <span className={`${chip} border ${PRI[pri]}`}>{t('bug.pri')}: {t(`pri.${pri}`)}</span>
    </span>
  )
}

/** Thẻ bug trên trang chủ */
export function BugCard({ b }) {
  const { t } = useT()
  const link = href(bugPath(b))
  return (
    <article data-cursor-label={t('cursor.view')} className="group flex h-full flex-col rounded-2xl border border-line bg-gradient-to-b from-[#171a2c] to-card p-6 transition duration-300 hover:-translate-y-1.5 hover:border-purple/60 hover:shadow-[0_20px_50px_#6650ff22]">
      <BugBadges b={b} />
      <h3 className="mb-2 mt-4 text-[19px] font-semibold leading-snug"><a href={link} className="block transition hover:text-pink">{b.title}</a></h3>
      {b.product && <p className="text-[14px] text-muted">{b.product}</p>}
      <a href={link} className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[13px] font-semibold">{t('bugs.open')} <span className="transition group-hover:translate-x-1.5">→</span></a>
    </article>
  )
}

/** Phần thân bug report (dùng cả ở trang chi tiết và khung xem trước trong Admin) */
export function BugReport({ b }) {
  const { t, lang } = useT()
  const sev = SEV[b.severity] ? b.severity : 'major', st = STATUS[b.status] ? b.status : 'reported'
  const facts = [
    [t('bug.status'), <span className={`${chip} ${STATUS[st]}`}>{t(`st.${st}`)}</span>],
    [t('bug.found'), b.found_at && fmtDate(b.found_at, lang)],
    [t('bug.product'), b.product],
    [t('bug.env'), b.environment],
  ].filter(([, v]) => v)
  const ext = /^https?:\/\//i.test(b.product_url || '')
  return (
    <div className="space-y-8">
      <dl className="grid gap-x-8 gap-y-5 rounded-2xl border border-line bg-card p-6 sm:grid-cols-2">
        {facts.map(([k, v]) => <div key={k}><dt className="text-xs text-muted">{k}</dt><dd className="mt-1 font-semibold">{v}</dd></div>)}
      </dl>
      {b.steps && <section><h2 className="mb-4 text-xl font-bold">{t('bug.steps')}</h2><Markdown text={b.steps} /></section>}
      {(b.expected || b.actual) && (
        <div className="grid gap-4 md:grid-cols-2">
          {b.expected && <section className="rounded-2xl border border-[#3ddc97]/30 bg-[#3ddc97]/[0.05] p-5"><h2 className="mb-3 text-sm font-bold tracking-wide text-[#5fe3a9]">✓ {t('bug.expected')}</h2><Markdown text={b.expected} /></section>}
          {b.actual && <section className={`rounded-2xl border p-5 ${sev === 'trivial' ? 'border-line bg-white/[0.03]' : 'border-pink/35 bg-pink/[0.05]'}`}><h2 className="mb-3 text-sm font-bold tracking-wide text-pink">✗ {t('bug.actual')}</h2><Markdown text={b.actual} /></section>}
        </div>
      )}
      {b.image && <section><h2 className="mb-4 text-xl font-bold">{t('bug.evidence')}</h2><img src={b.image} alt={t('bug.evidence')} loading="lazy" decoding="async" className="w-full rounded-xl border border-line bg-[#0b0d16]" /></section>}
      {b.content && <section><Markdown text={b.content} /></section>}
      {(tagsOf(b).length > 0 || ext) && (
        <div className="flex flex-wrap items-center gap-3">
          {tagsOf(b).map(x => <span key={x} className="rounded-full border border-line bg-white/5 px-3 py-1 text-xs text-[#c9cbd8]">#{x}</span>)}
          {ext && <a href={b.product_url} target="_blank" rel="noreferrer nofollow" className="ml-auto inline-flex items-center gap-2 rounded-xl border border-purple bg-purple/10 px-4 py-2.5 text-sm font-semibold transition hover:bg-purple/25">{t('bug.visit')}</a>}
        </div>
      )}
    </div>
  )
}

export function BugDetail({ id, bugs, selfTest = true }) {
  const { t } = useT()
  const index = bugs.findIndex(b => String(b.id) === String(id)), b = bugs[index]
  if (!b) return null
  const prev = bugs[index - 1], next = bugs[index + 1]
  const card = 'group flex min-w-0 flex-1 flex-col gap-1 rounded-xl border border-line bg-card p-4 transition hover:border-purple/60'
  return (
    <article className="py-12 sm:py-16">
      <div className={wrap}>
        <a href={href('/#bugs')} className="text-sm text-muted transition hover:text-white">{t('bugs.back')}</a>
        <p className="mt-8 text-[11px] font-bold tracking-[2px] text-pink">{t('bugs.label')}</p>
        <h1 className="mb-5 mt-3 text-[clamp(28px,4.6vw,44px)] font-bold leading-[1.15] tracking-tight [text-wrap:balance]">{b.title}</h1>
        <BugBadges b={b} />
        <div className="mt-8"><BugReport b={b} /></div>
        {(prev || next) && (
          <nav className="mt-12 flex flex-col gap-3 sm:flex-row">
            {prev ? <a href={href(bugPath(prev))} className={card}><span className="text-xs text-muted">{t('pager.prev', { x: t('bugs.unit') })}</span><span className="truncate font-semibold group-hover:text-pink">{prev.title}</span></a> : <span className="hidden flex-1 sm:block" />}
            {next ? <a href={href(bugPath(next))} className={`${card} sm:text-right`}><span className="text-xs text-muted">{t('pager.next', { x: t('bugs.unit') })}</span><span className="truncate font-semibold group-hover:text-pink">{next.title}</span></a> : <span className="hidden flex-1 sm:block" />}
          </nav>
        )}
        {selfTest && <a href={href('/kiem-thu')} className={`${grad} mt-10 block rounded-2xl p-[1px]`}>
          <span className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card px-6 py-5 text-sm">
            <span className="text-[#dfe0ea]">{t('bugs.self')}</span><span className="font-semibold text-white">{t('bugs.selfLink')}</span>
          </span>
        </a>}
      </div>
    </article>
  )
}
