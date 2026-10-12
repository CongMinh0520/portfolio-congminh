// Admin → Hiệu ứng theo mùa: tuyết, hoa mai, hoa đào, pháo hoa; bật tay hoặc tự động theo ngày.
import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { DEMO_SETTINGS } from './siteBase.js'
import { loadSettings } from './useContent.js'
import { mergeHero, DEFAULT_HERO } from './HeroVisual.jsx'
import SeasonFX, { SEASON_EFFECTS, SEASON_NAME, AMOUNTS, activeSeason } from './SeasonFX.jsx'
import { useA, adminLocale } from './adminLang.js'

const grad = 'bg-gradient-to-r from-pink to-purple'
const btn = 'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition disabled:opacity-50'
const ghost = `${btn} border border-line text-[#c9cbd8] hover:border-[#3a3f5a] hover:bg-white/5 hover:text-white`
const sel = 'rounded-lg border border-line bg-[#0b0d16] px-2.5 py-2 text-sm outline-none focus:border-purple'
const MODES = [
  ['off', 'Tắt', 'Không hiện hiệu ứng nào.'],
  ['manual', 'Luôn bật', 'Luôn hiện một hiệu ứng bạn chọn bên dưới.'],
  ['auto', 'Tự động theo ngày', 'Tự bật/tắt theo các khoảng ngày bạn đặt, lặp lại mỗi năm.'],
]
const pad = n => String(n).padStart(2, '0')
const fmt = v => { const [m, d] = String(v || '01-01').split('-'); return adminLocale() === 'vi-VN' ? `${Number(d)}/${Number(m)}` : new Date(2000, Number(m) - 1, Number(d)).toLocaleDateString(adminLocale(), { day: 'numeric', month: 'short' }) }

function DayPick({ id, value, onChange }) {
  const a = useA()
  const [m, d] = String(value || '01-01').split('-').map(Number)
  return (
    <span className="inline-flex items-center gap-1">
      <select id={id} aria-label={a('Ngày')} className={sel} value={d} onChange={e => onChange(`${pad(m)}-${pad(e.target.value)}`)}>
        {Array.from({ length: 31 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
      </select>
      <span className="text-muted">/</span>
      <select aria-label={a('Tháng')} className={sel} value={m} onChange={e => onChange(`${pad(e.target.value)}-${pad(d)}`)}>
        {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{a('Th {n}', { n: i + 1 })}</option>)}
      </select>
    </span>
  )
}

export default function SeasonAdmin({ toast }) {
  const a = useA()
  const [row, setRow] = useState(null); const [cfg, setCfg] = useState(null)
  const [preview, setPreview] = useState(null); const [dirty, setDirty] = useState(false); const [busy, setBusy] = useState(false)
  useEffect(() => {
    loadSettings().then(r => { const full = { ...DEMO_SETTINGS, ...(r || {}) }; setRow(full); const c = mergeHero(full.hero).season; setCfg(c); setPreview(activeSeason(c)) })
      .catch(e => { toast(e.message, 'error'); setRow({ ...DEMO_SETTINGS }); setCfg(structuredClone(DEFAULT_HERO.season)) })
  }, [])
  if (!cfg) return <p className="text-muted">{a('Đang tải…')}</p>

  const set = patch => { setDirty(true); setCfg(c => ({ ...c, ...patch })) }
  const setRule = (i, patch) => set({ rules: cfg.rules.map((r, j) => (j === i ? { ...r, ...patch } : r)) })
  const save = async () => {
    setBusy(true)
    const hero = { ...mergeHero(row.hero), season: cfg }
    const { error } = await supabase.from('settings').upsert({ ...row, id: 1, hero })
    setBusy(false); if (error) return toast(a('{msg}. Đã chạy supabase/migration-hero.sql chưa?', { msg: error.message }), 'error')
    setRow(r => ({ ...r, hero })); setDirty(false); toast(a('Đã lưu hiệu ứng theo mùa'))
  }
  const now = new Date(), today = activeSeason(cfg, now)

  return (
    <div className="space-y-6 pb-24">
      <div className="rounded-xl border border-line bg-card px-5 py-4 text-sm">
        {a('Hôm nay')} <b>{fmt(`${now.getMonth() + 1}-${now.getDate()}`)}</b>{a(', trang chủ')} {today ? <>{a('đang hiện')} <b className="text-[#5fe3a9]">{a(SEASON_NAME[today])}</b></> : <b className="text-muted">{a('không có hiệu ứng')}</b>}
        {dirty && <span className="text-muted"> {a('(theo cài đặt chưa lưu)')}</span>}.
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{a('Chế độ')}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {MODES.map(([k, n, d]) => (
            <button key={k} onClick={() => { set({ mode: k }); setPreview(k === 'off' ? null : k === 'manual' ? cfg.effect : preview) }} aria-pressed={cfg.mode === k}
              className={`rounded-xl border p-4 text-left transition ${cfg.mode === k ? 'border-purple bg-purple/10 shadow-[0_0_0_3px_#6650ff33]' : 'border-line bg-card hover:border-[#3a3f5a]'}`}>
              <span className="block font-semibold">{a(n)}</span><span className="text-[13px] text-muted">{a(d)}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div><h2 className="text-lg font-semibold">{a('Hiệu ứng')}</h2>
          <p className="text-sm text-muted">{a(cfg.mode === 'manual' ? 'Chọn hiệu ứng luôn hiện trên trang chủ.' : 'Bấm vào một hiệu ứng để xem thử ngay trên trang này.')}</p></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {SEASON_EFFECTS.map(([k, n, d]) => {
            const chosen = cfg.mode === 'manual' && cfg.effect === k
            return (
              <button key={k} onClick={() => { setPreview(k); if (cfg.mode === 'manual') set({ effect: k }) }} aria-pressed={preview === k}
                className={`flex min-h-[118px] flex-col items-start gap-1.5 rounded-xl border p-4 text-left transition ${chosen || preview === k ? 'border-purple bg-purple/10' : 'border-line bg-card hover:border-[#3a3f5a]'}`}>
                <span className="flex w-full items-center justify-between gap-2"><span className="font-semibold">{a(n)}</span>
                  {chosen && <span className="rounded-full bg-[#3ddc97]/15 px-2 py-0.5 text-[10px] font-semibold text-[#5fe3a9]">{a('ĐANG CHỌN')}</span>}</span>
                <span className="text-[13px] leading-relaxed text-muted">{a(d)}</span>
                {preview === k && <span className="mt-auto pt-1 text-xs font-medium text-[#b5aaff]">{a('Đang xem thử')}</span>}
              </button>
            )
          })}
        </div>
        {preview && <button onClick={() => setPreview(null)} className={`${ghost} text-xs`}>{a('Dừng xem thử')}</button>}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{a('Mật độ')}</h2>
        <div className="flex flex-wrap gap-2">
          {AMOUNTS.map(([k, n]) => (
            <button key={k} onClick={() => set({ amount: k })} aria-pressed={cfg.amount === k}
              className={cfg.amount === k ? `${btn} ${grad}` : ghost}>{a(n)}</button>
          ))}
        </div>
      </section>

      <section className={`space-y-3 transition ${cfg.mode === 'auto' ? '' : 'opacity-50'}`}>
        <div><h2 className="text-lg font-semibold">{a('Lịch tự động')}</h2>
          <p className="text-sm text-muted">{a('Dùng khi chọn chế độ “Tự động theo ngày”. Lặp lại mỗi năm; khoảng ngày có thể vắt qua năm mới. Nếu các khoảng chồng nhau, dòng trên được ưu tiên. Tết âm lịch đổi ngày mỗi năm nên nhớ chỉnh lại dòng Hoa mai.')}</p></div>
        <div className="overflow-hidden rounded-xl border border-line bg-card">
          {cfg.rules.map((r, i) => {
            const on = cfg.mode === 'auto' && today === r.effect && activeSeason({ mode: 'auto', rules: [r] }, now)
            return (
              <div key={i} className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-0">
                <select aria-label={a('Hiệu ứng')} className={sel} value={r.effect} onChange={e => setRule(i, { effect: e.target.value })}>
                  {SEASON_EFFECTS.map(([k, n]) => <option key={k} value={k}>{a(n)}</option>)}
                </select>
                <span className="text-sm text-muted">{a('từ')}</span><DayPick id={`r${i}-from`} value={r.from} onChange={v => setRule(i, { from: v })} />
                <span className="text-sm text-muted">{a('đến')}</span><DayPick id={`r${i}-to`} value={r.to} onChange={v => setRule(i, { to: v })} />
                {on && <span className="rounded-full bg-[#3ddc97]/15 px-2 py-0.5 text-[10px] font-semibold text-[#5fe3a9]">{a('ĐANG HIỆN')}</span>}
                <span className="ml-auto flex gap-1">
                  <button onClick={() => i > 0 && set({ rules: cfg.rules.map((x, j) => (j === i - 1 ? cfg.rules[i] : j === i ? cfg.rules[i - 1] : x)) })} disabled={i === 0} className={`${ghost} px-2.5 py-1.5 text-xs`} aria-label={a('Ưu tiên cao hơn')}>↑</button>
                  <button onClick={() => set({ rules: cfg.rules.filter((_, j) => j !== i) })} className={`${ghost} px-2.5 py-1.5 text-xs hover:!text-red-300`}>{a('Xóa')}</button>
                </span>
                <span className="w-full text-xs text-muted sm:hidden">{a(SEASON_NAME[r.effect])}: {fmt(r.from)} → {fmt(r.to)}</span>
              </div>
            )
          })}
          {!cfg.rules.length && <p className="p-6 text-center text-sm text-muted">{a('Chưa có lịch nào.')}</p>}
        </div>
        <button onClick={() => set({ rules: [...cfg.rules, { effect: 'snow', from: '12-01', to: '12-31' }] })} className={`${ghost} text-xs`}>{a('+ Thêm khoảng ngày')}</button>
      </section>

      <div className={`sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-[0_10px_40px_#00000080] backdrop-blur transition ${dirty ? 'border-purple/50 bg-[#141728]/95' : 'border-line bg-card/90'}`}>
        <span className="text-sm text-muted">{a(dirty ? 'Có thay đổi chưa lưu' : 'Mọi thay đổi đã được lưu')}</span>
        <button onClick={save} disabled={busy || !dirty} className={`${btn} ${grad}`}>{a(busy ? 'Đang lưu…' : 'Lưu hiệu ứng theo mùa')}</button>
      </div>
      <SeasonFX effect={preview} amount={cfg.amount} />
    </div>
  )
}
