// Trang /cv: CV dựng tự động từ nội dung web (giới thiệu, kỹ năng, kinh nghiệm, dự án, liên hệ).
// Nền trắng, khổ A4; bấm "In / Lưu PDF" là ra file PDF gọn. Tải riêng (lazy) nên trang chủ không phải tải phần này.
import { href, safeUrl, projectPath, bugPath } from './router.js'
import { useT } from './i18n.js'
import { SITE } from './seo.js'

const Sec = ({ title, children }) => (
  <section className="cv-sec mt-6">
    <h2 className="mb-2.5 border-b-2 border-[#6650ff] pb-1 text-[13px] font-bold uppercase tracking-[1.5px] text-[#3a2fb0]">{title}</h2>
    {children}
  </section>
)

export default function CvPage({ hero, settings: s, socials, skills, jobs, projects, bugs, cv }) {
  const { t } = useT()
  const origin = typeof location !== 'undefined' ? location.origin : ''
  const site = origin.replace(/^https?:\/\//, '')
  const avatar = /^(https?:|data:)/.test(hero.avatar?.image || '') ? hero.avatar.image : ''
  const contact = [
    s.email && <a href={`mailto:${s.email}`}>{s.email}</a>,
    s.phone && <a href={`tel:${s.phone.replace(/[^\d+]/g, '')}`}>{s.phone}</a>,
    s.address,
    site && <a href={origin}>{site}</a>,
  ].filter(Boolean)
  const link = 'text-[#3a2fb0] underline decoration-[#3a2fb0]/30 underline-offset-2'
  const ctl = 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition'
  return (
    <main id="noi-dung" className="cv-page min-h-screen py-6 sm:py-10">
      <div className="no-print mx-auto mb-5 flex w-[min(820px,100%-32px)] flex-wrap items-center gap-3">
        <a href={href('/')} className="mr-auto text-sm text-muted transition hover:text-white">{t('post.home')}</a>
        {cv && <a href={cv} target="_blank" rel="noopener" download="CongMinh-CV.pdf" className={`${ctl} border border-line text-[#dfe0ea] hover:border-purple/60 hover:text-white`}>{t('cv.pdf')}</a>}
        <button type="button" onClick={() => window.print()} className={`${ctl} bg-gradient-to-r from-pink to-purple text-white`}>{t('cv.print')}</button>
        <p className="w-full text-xs text-muted">{t('cv.tip')}</p>
      </div>

      <div className="cv-paper mx-auto w-[min(820px,100%-32px)] rounded-lg bg-white px-6 py-8 text-[13.5px] leading-relaxed text-[#1d1f2b] shadow-[0_30px_80px_#00000080] sm:px-12 sm:py-11">
        <header className="flex items-center gap-5">
          {avatar && <img src={avatar} alt="" className="size-20 flex-none rounded-full object-cover sm:size-24" />}
          <div className="min-w-0">
            <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-[#11121a] sm:text-[32px]">{SITE}</h1>
            <p className="text-[15px] font-semibold text-[#6650ff]">{t('cv.role')}</p>
            {contact.length > 0 && <p className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-0.5 text-[12.5px] text-[#4a4d5e]">{contact.map((c, i) => <span key={i} className="whitespace-nowrap">{i > 0 && <span aria-hidden className="mr-2.5 text-[#b8bacb]">·</span>}{c}</span>)}</p>}
            {socials.length > 0 && <p className="mt-0.5 flex flex-wrap gap-x-3 text-[12.5px]">{socials.map(x => <a key={x.id} href={safeUrl(x.url)} className={link}>{x.label}</a>)}</p>}
          </div>
        </header>

        {hero.lead && <Sec title={t('cv.about')}><p>{hero.lead}</p>{s.availability && <p className="mt-1.5 font-semibold text-[#2c8a5e]">● {s.availability}</p>}</Sec>}

        {skills.length > 0 && (
          <Sec title={t('cv.skills')}>
            <ul className="space-y-2">
              {skills.map(k => (
                <li key={k.id ?? k.title} className="cv-item">
                  <b className="text-[#11121a]">{k.title}</b>{k.description && <> — {k.description}</>}
                  {(k.tags || []).length > 0 && <span className="block text-[12.5px] text-[#5b5e70]">{k.tags.join(' · ')}</span>}
                </li>
              ))}
            </ul>
          </Sec>
        )}

        {jobs.length > 0 && (
          <Sec title={t('cv.exp')}>
            <ul className="space-y-3">
              {jobs.map(j => (
                <li key={j.id} className="cv-item grid gap-x-4 sm:grid-cols-[130px_1fr]">
                  <span className="text-[12.5px] font-semibold text-[#6650ff]">{j.period}</span>
                  <div><b className="text-[#11121a]">{j.role}</b>{j.description && <p>{j.description}</p>}</div>
                </li>
              ))}
            </ul>
          </Sec>
        )}

        {projects.length > 0 && (
          <Sec title={t('cv.projects')}>
            <ul className="space-y-3">
              {projects.map(p => (
                <li key={p.id} className="cv-item">
                  <a href={origin + projectPath(p)} className="font-bold text-[#11121a] hover:underline">{p.title}</a>
                  {[p.role, p.duration].filter(Boolean).length > 0 && <span className="text-[12.5px] text-[#5b5e70]"> · {[p.role, p.duration].filter(Boolean).join(' · ')}</span>}
                  {p.description && <p>{p.description}</p>}
                  {(p.tools || []).length > 0 && <p className="text-[12.5px] text-[#5b5e70]">{p.tools.join(' · ')}</p>}
                </li>
              ))}
            </ul>
          </Sec>
        )}

        {bugs.length > 0 && (
          <Sec title={t('cv.bugs')}>
            <ul className="list-disc space-y-1 pl-5 marker:text-[#6650ff]">
              {bugs.map(b => <li key={b.id}><a href={origin + bugPath(b)} className={link}>{b.title}</a></li>)}
            </ul>
          </Sec>
        )}

        {site && <p className="mt-7 border-t border-[#e3e4ec] pt-3 text-[12px] text-[#6b6e80]">{t('cv.web')}: <a href={origin} className={link}>{site}</a></p>}
      </div>
    </main>
  )
}
