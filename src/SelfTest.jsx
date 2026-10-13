// Trang /kiem-thu: "Mình đã test chính web này" — điểm Lighthouse, môi trường đã test, checklist, bug tự tìm.
// Nội dung sửa trong Admin → Trang Kiểm thử web. Tải riêng (lazy) nên trang chủ không phải tải phần này.
import { href } from './router.js'
import { useT } from './i18n.js'
import { fmtDate } from './Detail.jsx'
import { selftestOf, pickLang } from './selftestData.js'

const wrap = 'mx-auto w-[min(960px,100%-32px)] sm:w-[min(960px,100%-48px)]'
const h2 = 'mb-5 text-2xl font-bold tracking-tight'

// Màu điểm giống Lighthouse: 90+ xanh, 50–89 cam, dưới 50 đỏ
const tone = n => (n >= 90 ? '#3ddc97' : n >= 50 ? '#ffa94d' : '#ff5c7a')
function Gauge({ value, label }) {
  const n = Math.max(0, Math.min(100, Number(value) || 0)), r = 34, c = 2 * Math.PI * r
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <svg viewBox="0 0 80 80" className="size-20" role="img" aria-label={`${label}: ${n}/100`}>
        <circle cx="40" cy="40" r={r} fill="none" stroke="#262a3f" strokeWidth="6" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={tone(n)} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(c * n) / 100} ${c}`} transform="rotate(-90 40 40)" />
        <text x="40" y="47" textAnchor="middle" fontSize="22" fontWeight="700" fill={tone(n)}>{n}</text>
      </svg>
      <span className="text-xs text-muted">{label}</span>
    </div>
  )
}

const RESULT = { pass: 'bg-[#3ddc97]/12 text-[#5fe3a9]', issue: 'bg-pink/15 text-pink', todo: 'bg-white/8 text-muted' }
const FOUND = { fixed: 'bg-[#3ddc97]/12 text-[#5fe3a9]', open: 'bg-[#ffa94d]/15 text-[#ffc38a]', note: 'bg-purple/15 text-[#b5aaff]' }
const pill = 'inline-flex flex-none items-center rounded-full px-2.5 py-1 text-xs font-semibold'

export default function SelfTestPage({ settings }) {
  const { t, lang } = useT()
  const st = selftestOf(settings.selftest)
  const cats = [['performance', t('qa.perf')], ['accessibility', t('qa.a11y')], ['best', t('qa.best')], ['seo', t('qa.seo')]]
  return (
    <article className="py-12 sm:py-16">
      <div className={wrap}>
        <a href={href('/')} className="text-sm text-muted transition hover:text-white">{t('post.home')}</a>
        <p className="mt-8 text-[11px] font-bold tracking-[2px] text-pink">{t('qa.label')}</p>
        <h1 className="mt-3 text-[clamp(30px,5vw,48px)] font-bold leading-[1.12] tracking-tight [text-wrap:balance]">{t('qa.title')}</h1>
        {pickLang(st, 'intro', lang) && <p className="mt-5 max-w-[680px] text-lg leading-relaxed text-[#dfe0ea]">{pickLang(st, 'intro', lang)}</p>}

        <section className="mt-12">
          <h2 className={h2}>{t('qa.scores')}</h2>
          <div className="grid gap-5 md:grid-cols-2">
            {[['mobile', t('qa.mobile')], ['desktop', t('qa.desktop')]].map(([k, name]) => (
              <div key={k} className="rounded-2xl border border-line bg-card p-6">
                <p className="mb-5 text-sm font-semibold">{name}</p>
                <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">{cats.map(([c, l]) => <Gauge key={c} value={st.scores[k][c]} label={l} />)}</div>
              </div>
            ))}
          </div>
          {(st.measured || st.tool) && <p className="mt-3 text-xs text-muted">{t('qa.measured', { d: st.measured ? fmtDate(st.measured, lang) : '—', tool: pickLang(st, 'tool', lang) || 'Lighthouse' })}</p>}
        </section>

        {st.envs.length > 0 && (
          <section className="mt-14">
            <h2 className={h2}>{t('qa.envs')}</h2>
            <ul className="overflow-hidden rounded-2xl border border-line bg-card">
              {st.envs.map((e, i) => (
                <li key={i} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1.5 border-b border-line px-5 py-4 last:border-0">
                  <div className="min-w-0"><p className="font-semibold">{pickLang(e, 'name', lang)}</p>{pickLang(e, 'note', lang) && <p className="mt-0.5 text-sm text-muted">{pickLang(e, 'note', lang)}</p>}</div>
                  <span className={`${pill} ${RESULT[e.result] || RESULT.todo}`}>{t(`qa.r.${RESULT[e.result] ? e.result : 'todo'}`)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {st.checks.length > 0 && (
          <section className="mt-14">
            <h2 className={h2}>{t('qa.checks')}</h2>
            <ul className="grid gap-3 md:grid-cols-2">
              {st.checks.map((c, i) => (
                <li key={i} className="flex items-start gap-3 rounded-xl border border-line bg-card px-4 py-3.5 text-[15px]">
                  <span aria-hidden className={`mt-0.5 grid size-5 flex-none place-items-center rounded-full text-xs font-bold ${c.ok ? 'bg-[#3ddc97]/15 text-[#5fe3a9]' : 'bg-[#ffa94d]/15 text-[#ffc38a]'}`}>{c.ok ? '✓' : '!'}</span>
                  <span className="min-w-0"><span className="sr-only">{c.ok ? t('qa.ok') : t('qa.no')}: </span>{pickLang(c, 'text', lang)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {st.found.length > 0 && (
          <section className="mt-14">
            <h2 className={h2}>{t('qa.found')}</h2>
            <ol className="space-y-4">
              {st.found.map((f, i) => (
                <li key={i} className="rounded-2xl border border-line bg-gradient-to-b from-[#171a2c] to-card p-5 sm:p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-pink/15 px-2 py-1 font-mono text-xs font-semibold text-pink">SELF-{String(i + 1).padStart(2, '0')}</span>
                    <span className={`${pill} ${FOUND[f.status] || FOUND.note}`}>{t(`qa.f.${FOUND[f.status] ? f.status : 'note'}`)}</span>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold">{pickLang(f, 'title', lang)}</h3>
                  {pickLang(f, 'detail', lang) && <p className="mt-1.5 text-[15px] leading-relaxed text-[#c9cbd8]">{pickLang(f, 'detail', lang)}</p>}
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </article>
  )
}
