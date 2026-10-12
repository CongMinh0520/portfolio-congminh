// Admin → Đầu trang: chỉnh huy hiệu, tiêu đề, số liệu, hình tròn + 2 thẻ, dải chữ chạy. Có xem trước trực tiếp.
import { useEffect, useRef, useState } from 'react'
import { supabase, uploadImage, uploadPdf } from './supabase.js'
import { DEMO_SETTINGS } from './siteBase.js'
import { loadSettings } from './useContent.js'
import HeroVisual, { DEFAULT_HERO, mergeHero, Highlight, RGB_PRESETS, rgbGradient } from './HeroVisual.jsx'
import { autoAvatar, newSeed } from './autoArt.js'
import { LangTabs, EnEditor, heroEnFields, missingOf } from './LangAdmin.jsx'
import { heroFor } from './i18n.js'
import { useA } from './adminLang.js'

const grad = 'bg-gradient-to-r from-pink to-purple'
const input = 'w-full rounded-lg border border-line bg-[#0b0d16] px-3 py-2.5 text-sm outline-none transition focus:border-purple focus:ring-2 focus:ring-purple/25'
const btn = 'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition disabled:opacity-50'
const ghost = `${btn} border border-line text-[#c9cbd8] hover:border-[#3a3f5a] hover:bg-white/5 hover:text-white`
const PRESETS = ['#ffffff', '#161525', '#e94b9e', '#6650ff', '#a58bff', '#3ddc97', '#f8d27c', '#ff9a54', '#25293c', '#0b0d16']

function Card({ title, hint, onReset, children }) {
  const a = useA()
  return (
    <section className="rounded-xl border border-line bg-card">
      <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div><h2 className="font-semibold">{title}</h2>{hint && <p className="text-xs text-muted">{hint}</p>}</div>
        {onReset && <button type="button" onClick={onReset} className="flex-none text-xs text-muted hover:text-white">{a('Về mặc định')}</button>}
      </header>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 p-5 sm:grid-cols-2">{children}</div>
    </section>
  )
}
const F = ({ label, id, full, children }) => (
  <div className={`min-w-0 ${full ? 'sm:col-span-2' : ''}`}>
    <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-muted">{label}</label>{children}
  </div>
)
const Text = ({ id, value, onChange, placeholder }) => <input id={id} className={input} value={value ?? ''} placeholder={placeholder} onChange={e => onChange(e.target.value)} />

function Color({ id, value, onChange }) {
  const a = useA()
  const [hex, setHex] = useState(value)
  useEffect(() => setHex(value), [value])
  return (
    <div>
      <div className="flex items-center gap-2">
        <input type="color" aria-label={a('Chọn màu')} value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'} onChange={e => onChange(e.target.value)}
          className="h-10 w-12 flex-none cursor-pointer rounded-lg border border-line bg-transparent p-1" />
        <input id={id} className={`${input} font-mono uppercase`} value={hex} maxLength={7}
          onChange={e => { setHex(e.target.value); if (/^#[0-9a-f]{6}$/i.test(e.target.value)) onChange(e.target.value) }} />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {PRESETS.map(c => (
          <button type="button" key={c} onClick={() => onChange(c)} title={c} aria-label={a('Màu {c}', { c })}
            className={`size-5 rounded-full border transition hover:scale-110 ${value?.toLowerCase() === c ? 'border-white ring-2 ring-purple' : 'border-white/20'}`} style={{ background: c }} />
        ))}
      </div>
    </div>
  )
}

function Toggle({ on, onClick, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onClick}
      className={`relative h-6 w-11 flex-none rounded-full transition ${on ? grad : 'bg-[#2a2e45]'}`}>
      <i className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

/** Ô tải file PDF (CV): tải lên, xem, đổi, bỏ */
function PdfField({ id, label, value, name, onChange, toast }) {
  const a = useA()
  const file = useRef(null); const [busy, setBusy] = useState(false); const [linkMode, setLinkMode] = useState(false)
  const take = async f => {
    if (!f) return
    setBusy(true)
    try { onChange(await uploadPdf(f), f.name); toast(a('Đã tải file lên, bấm Lưu để áp dụng')) } catch (e) { toast(e.message, 'error') }
    setBusy(false); if (file.current) file.current.value = ''
  }
  return (
    <div className="min-w-0">
      <p id={`${id}-l`} className="mb-1.5 text-xs font-medium text-muted">{label}</p>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-line p-3" aria-labelledby={`${id}-l`}
        onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); take(e.dataTransfer.files?.[0]) }}>
        <span className="grid size-10 flex-none place-items-center rounded-lg bg-pink/15 text-[10px] font-bold text-pink">PDF</span>
        <span className="min-w-0 flex-1 truncate text-sm" title={name || value || ''}>{value ? (name || (value.startsWith('data:') ? a('Đã có file') : value)) : <span className="text-muted">{a('Chưa có file')}</span>}</span>
        <input ref={file} id={id} type="file" accept="application/pdf,.pdf" className="hidden" onChange={e => take(e.target.files?.[0])} />
        <button type="button" onClick={() => file.current?.click()} disabled={busy} className={`${btn} ${grad} px-3 py-1.5 text-xs`}>{busy ? a('Đang tải…') : value ? a('Đổi file') : a('Tải file lên')}</button>
        <button type="button" onClick={() => setLinkMode(m => !m)} className={`${ghost} px-3 py-1.5 text-xs`}>{a('Dùng link')}</button>
        {value && <a href={value} target="_blank" rel="noopener" className={`${ghost} px-3 py-1.5 text-xs`}>{a('Xem')}</a>}
        {value && <button type="button" onClick={() => onChange('', '')} className={`${ghost} px-3 py-1.5 text-xs hover:border-red-500/50 hover:text-red-300`}>{a('Bỏ file')}</button>}
      </div>
      {linkMode && <input aria-label={a('Link file CV')} className={`${input} mt-2`} placeholder="https://drive.google.com/…" value={value && !value.startsWith('data:') ? value : ''} onChange={e => onChange(e.target.value.trim(), '')} />}
    </div>
  )
}

export function ImageField({ id, value, onChange, toast, round, fallback, extra, wide }) {
  const file = useRef(null)
  const a = useA()
  const [busy, setBusy] = useState(false); const [drag, setDrag] = useState(false); const [urlMode, setUrlMode] = useState(false)
  const take = async f => {
    if (!f) return
    setBusy(true)
    try { onChange(await uploadImage(f)); toast(a('Đã tải ảnh lên')) } catch (e) { toast(e.message, 'error') }
    setBusy(false)
  }
  return (
    <div onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); take(e.dataTransfer.files?.[0]) }}
      className={`flex flex-wrap items-center gap-3 rounded-lg border border-dashed p-3 transition ${drag ? 'border-purple bg-purple/10' : 'border-line'}`}>
      <div className={`relative grid flex-none place-items-center overflow-hidden bg-[#0b0d16] text-[10px] text-muted ${round ? 'size-16 rounded-full' : wide ? 'aspect-[1200/630] w-40 rounded-lg' : 'size-16 rounded-lg'}`}>
        {value || fallback ? <img src={value || fallback} alt="" className="size-full object-cover" /> : a('Chưa có ảnh')}
        {!value && fallback && <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] text-white">{a('Tự tạo')}</span>}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => file.current.click()} disabled={busy} className={`${btn} ${grad} px-3 py-1.5 text-xs`}>{busy ? a('Đang tải…') : value ? a('Đổi ảnh') : a('Tải ảnh lên')}</button>
          <button type="button" onClick={() => setUrlMode(m => !m)} className={`${ghost} px-3 py-1.5 text-xs`}>{a('Dùng link ảnh')}</button>
          {extra}
          {value && <button type="button" onClick={() => onChange('')} className={`${ghost} px-3 py-1.5 text-xs hover:!text-red-300`}>{fallback ? a('Dùng ảnh tự tạo') : a('Xóa ảnh')}</button>}
        </div>
        {urlMode && <input id={id} className={`${input} py-1.5 text-xs`} placeholder="https://…/anh.jpg" value={value?.startsWith('data:') ? '' : value}
          onChange={e => onChange(e.target.value.trim())} />}
        <p className="text-[11px] text-muted">{a('Hoặc kéo thả ảnh vào khung này. Ảnh tự thu nhỏ cho nhẹ.')}</p>
      </div>
      <input ref={file} type="file" accept="image/*" hidden onChange={e => { take(e.target.files?.[0]); e.target.value = '' }} />
    </div>
  )
}

function StatCardEditor({ k, c, set, toast, reset }) {
  const a = useA()
  return (
    <Card title={k === 'card1' ? a('Thẻ số liệu phía trên') : a('Thẻ số liệu phía dưới')} hint={a('Thẻ trắng bay quanh hình tròn')} onReset={reset}>
      <div className="flex items-center justify-between gap-3 rounded-lg border border-line px-4 py-3 sm:col-span-2">
        <span className="text-sm">{a('Hiện thẻ này')}</span><Toggle on={c.show} label={a('Hiện thẻ')} onClick={() => set({ show: !c.show })} />
      </div>
      <F label={a('Hình nhỏ trên thẻ (không bắt buộc)')} full><ImageField id={`${k}-img`} value={c.image} onChange={v => set({ image: v })} toast={toast}
        extra={<button type="button" onClick={() => set({ image: autoAvatar({ seed: newSeed(), text: (c.value || '').slice(0, 3) }) })} className={`${ghost} px-3 py-1.5 text-xs`}>✨ {a('Tạo hình tự động')}</button>} /></F>
      <F label={a('Số / chữ lớn')} id={`${k}-v`}><Text id={`${k}-v`} value={c.value} onChange={v => set({ value: v })} /></F>
      <F label={a('Dòng mô tả')} id={`${k}-l`}><Text id={`${k}-l`} value={c.label} onChange={v => set({ label: v })} /></F>
      <F label={a('Màu nền thẻ')} id={`${k}-bg`}><Color id={`${k}-bg`} value={c.bg} onChange={v => set({ bg: v })} /></F>
      <F label={a('Màu số')} id={`${k}-vc`}><Color id={`${k}-vc`} value={c.value_color} onChange={v => set({ value_color: v })} /></F>
      <F label={a('Màu dòng mô tả')} id={`${k}-lc`}><Color id={`${k}-lc`} value={c.label_color} onChange={v => set({ label_color: v })} /></F>
    </Card>
  )
}

function Preview({ h }) {
  const a = useA()
  const items = (h.marquee.items || []).filter(Boolean)
  return (
    <div className="space-y-4 overflow-hidden rounded-xl border border-line bg-[#07080f] p-5">
      <p className="text-[11px] font-semibold tracking-wider text-muted">{a('XEM TRƯỚC')}</p>
      {h.badge.text && (
        <span className="inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[9px] font-bold tracking-[1.6px]" style={{ background: h.badge.bg, color: h.badge.color }}>
          <i className="size-[6px] rounded-full" style={{ background: h.badge.dot }} />{h.badge.text}
        </span>
      )}
      <p className="text-[26px] font-bold leading-[1.08] tracking-tight [text-wrap:balance]">
        {h.title.before}<Highlight title={h.title} />{h.title.after}
      </p>
      {h.lead && <p className="line-clamp-3 text-xs leading-relaxed text-muted">{h.lead}</p>}
      <div className="flex gap-2">
        <span className={`${grad} rounded-lg px-3 py-1.5 text-[11px] font-semibold`}>{h.buttons.primary}</span>
        <span className="rounded-lg border border-purple px-3 py-1.5 text-[11px] font-semibold">{h.buttons.secondary}</span>
      </div>
      {h.stats.length > 0 && <div className="flex flex-wrap gap-5">{h.stats.map((s, i) => <div key={i}><b className="block text-base">{s.value}</b><small className="text-[10px] text-muted">{s.label}</small></div>)}</div>}
      <div className="grid place-items-center px-10 py-5"><HeroVisual cfg={h} still className="w-[min(190px,100%)] [&_strong]:!text-[15px] [&>div]:!min-w-0 [&>div]:!p-2.5" /></div>
      {items.length > 0 && (
        <div className="-mx-5 -mb-5 overflow-hidden rounded-b-xl border-t border-line py-2.5" style={{ background: h.marquee.bg }}>
          <div className="flex w-max gap-5 px-4" style={{ animation: `marquee ${Math.max(6, Number(h.marquee.speed) || 28)}s linear infinite` }}>
            {[...items, ...items, ...items, ...items].map((t, i) => <span key={i} className="flex items-center gap-5 whitespace-nowrap text-[11px] font-bold tracking-wider" style={{ color: h.marquee.text_color }}>{t}{h.marquee.separator && <b style={{ color: h.marquee.sep_color }}>{h.marquee.separator}</b>}</span>)}
          </div>
        </div>
      )}
    </div>
  )
}

export default function HeroAdmin({ toast }) {
  const [row, setRow] = useState(null); const [h, setH] = useState(null)
  const [dirty, setDirty] = useState(false); const [busy, setBusy] = useState(false)
  const [lang, setLang] = useState('vi')
  const a = useA()
  useEffect(() => {
    loadSettings().then(r => { const full = { ...DEMO_SETTINGS, ...(r || {}) }; setRow(full); setH(mergeHero(full.hero)) })
      .catch(e => { toast(e.message, 'error'); setRow({ ...DEMO_SETTINGS }); setH(mergeHero()) })
  }, [])
  if (!h) return <p className="text-muted">{a('Đang tải…')}</p>

  const patch = (k, v) => { setDirty(true); setH(x => ({ ...x, [k]: typeof v === 'function' ? v(x[k]) : { ...x[k], ...v } })) }
  const reset = k => { setDirty(true); setH(x => ({ ...x, [k]: structuredClone(DEFAULT_HERO[k]) })) }
  const save = async () => {
    setBusy(true)
    const { error } = await supabase.from('settings').upsert({ ...row, id: 1, hero: h })
    setBusy(false); if (error) return toast(a('{msg}. Đã chạy supabase/migration-hero.sql chưa?', { msg: error.message }), 'error')
    setDirty(false); toast(a('Đã lưu phần đầu trang'))
  }
  const av = h.avatar, m = h.marquee

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 pb-24 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-5">
        <LangTabs value={lang} onChange={setLang} missing={missingOf(heroEnFields(h), h, h.en)} />
        {lang === 'en' ? (
          <section className="rounded-xl border border-line bg-card">
            <header className="border-b border-line px-5 py-4"><h2 className="font-semibold">{a('Chữ đầu trang · English')}</h2><p className="text-xs text-muted">{a('Màu, ảnh và hiệu ứng dùng chung với bản Tiếng Việt. Khung xem trước đang hiện bản English.')}</p></header>
            <div className="p-5"><EnEditor idPrefix="en-hero" fields={heroEnFields(h)} base={h} en={h.en} toast={toast} onChange={en => { setDirty(true); setH(x => ({ ...x, en })) }} /></div>
          </section>
        ) : <>
        <Card title={a('Huy hiệu')} hint={a('Dòng nhỏ có chấm sáng phía trên tiêu đề')} onReset={() => reset('badge')}>
          <F label={a('Chữ trên huy hiệu')} id="b-text" full><Text id="b-text" value={h.badge.text} onChange={v => patch('badge', { text: v })} /></F>
          <F label={a('Màu chấm sáng')} id="b-dot"><Color id="b-dot" value={h.badge.dot} onChange={v => patch('badge', { dot: v })} /></F>
          <F label={a('Màu nền')} id="b-bg"><Color id="b-bg" value={h.badge.bg} onChange={v => patch('badge', { bg: v })} /></F>
          <F label={a('Màu chữ')} id="b-color"><Color id="b-color" value={h.badge.color} onChange={v => patch('badge', { color: v })} /></F>
        </Card>

        <Card title={a('Tiêu đề & giới thiệu')} hint={a('Phần chữ tô màu nằm giữa hai đoạn trước và sau')} onReset={() => { reset('title'); setH(x => ({ ...x, lead: DEFAULT_HERO.lead })) }}>
          <F label={a('Đoạn trước')} id="t-before"><Text id="t-before" value={h.title.before} onChange={v => patch('title', { before: v })} /></F>
          <F label={a('Chữ tô màu')} id="t-hl"><Text id="t-hl" value={h.title.highlight} onChange={v => patch('title', { highlight: v })} /></F>
          <F label={a('Đoạn sau')} id="t-after" full><Text id="t-after" value={h.title.after} onChange={v => patch('title', { after: v })} /></F>
          <F label={a('Kiểu tô màu')} id="t-eff" full>
            <div className="flex flex-wrap gap-2">
              {[['gradient', 'Gradient 2 màu'], ['rgb', 'RGB chạy']].map(([v, l]) => (
                <button type="button" key={v} onClick={() => patch('title', { effect: v })} aria-pressed={h.title.effect === v}
                  className={h.title.effect === v ? `${btn} ${grad} px-3 py-1.5 text-xs` : `${ghost} px-3 py-1.5 text-xs`}>{a(l)}</button>
              ))}
            </div>
          </F>
          {h.title.effect === 'rgb' ? <>
            <F label={a('Bảng màu có sẵn')} id="t-pal" full>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {RGB_PRESETS.map(([k, n, cols]) => {
                  const on = JSON.stringify(cols) === JSON.stringify(h.title.rgb_colors)
                  return (
                    <button type="button" key={k} onClick={() => patch('title', { rgb_colors: [...cols] })} aria-pressed={on}
                      className={`rounded-lg border p-2 text-left text-xs transition ${on ? 'border-purple bg-purple/10 text-white' : 'border-line text-[#c9cbd8] hover:border-[#3a3f5a]'}`}>
                      <span className="mb-1.5 block h-3 rounded-full" style={{ backgroundImage: rgbGradient(cols) }} />{a(n)}
                    </button>
                  )
                })}
              </div>
            </F>
            <div className="space-y-2 sm:col-span-2">
              <p className="text-xs font-medium text-muted">{a('Hoặc tự chọn màu ({n} màu, chạy theo thứ tự từ trên xuống)', { n: h.title.rgb_colors.length })}</p>
              {h.title.rgb_colors.map((c, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="min-w-0 flex-1"><Color id={`t-rgb-${i}`} value={c} onChange={v => patch('title', { rgb_colors: h.title.rgb_colors.map((x, j) => (j === i ? v : x)) })} /></div>
                  <button type="button" disabled={h.title.rgb_colors.length <= 2} onClick={() => patch('title', { rgb_colors: h.title.rgb_colors.filter((_, j) => j !== i) })} className={`${ghost} mt-1 px-3`} aria-label={a('Xóa màu {n}', { n: i + 1 })}>✕</button>
                </div>
              ))}
              {h.title.rgb_colors.length < 7 && <button type="button" onClick={() => patch('title', { rgb_colors: [...h.title.rgb_colors, '#ffffff'] })} className={`${ghost} text-xs`}>+ {a('Thêm màu')}</button>}
            </div>
            <F label={a('Tốc độ chạy: một vòng {n} giây (số nhỏ = nhanh)', { n: h.title.rgb_speed })} id="t-rgb" full>
              <input id="t-rgb" type="range" min="1" max="15" value={h.title.rgb_speed} onChange={e => patch('title', { rgb_speed: Number(e.target.value) })} className="mt-3 w-full accent-[#6650ff]" />
            </F>
          </> : <>
            <F label={a('Màu tô (đầu)')} id="t-c1"><Color id="t-c1" value={h.title.color1} onChange={v => patch('title', { color1: v })} /></F>
            <F label={a('Màu tô (cuối)')} id="t-c2"><Color id="t-c2" value={h.title.color2} onChange={v => patch('title', { color2: v })} /></F>
          </>}
          <F label={a('Đoạn giới thiệu')} id="t-lead" full>
            <textarea id="t-lead" rows={3} className={input} value={h.lead} onChange={e => { setDirty(true); setH(x => ({ ...x, lead: e.target.value })) }} />
          </F>
        </Card>

        <Card title={a('Nút & số liệu')} onReset={() => { reset('buttons'); setH(x => ({ ...x, stats: structuredClone(DEFAULT_HERO.stats) })) }}>
          <F label={a('Nút chính (tới mục Dự án)')} id="bt-1"><Text id="bt-1" value={h.buttons.primary} onChange={v => patch('buttons', { primary: v })} /></F>
          <F label={a('Nút phụ (tới mục Liên hệ)')} id="bt-2"><Text id="bt-2" value={h.buttons.secondary} onChange={v => patch('buttons', { secondary: v })} /></F>
          <div className="space-y-2 sm:col-span-2">
            <p className="text-xs font-medium text-muted">{a('Dãy số liệu')}</p>
            {h.stats.map((st, i) => (
              <div key={i} className="flex gap-2">
                <input aria-label={a('Số liệu {n}', { n: i + 1 })} className={`${input.replace('w-full ', '')} w-28 flex-none`} value={st.value} onChange={e => { setDirty(true); setH(x => ({ ...x, stats: x.stats.map((y, j) => j === i ? { ...y, value: e.target.value } : y) })) }} />
                <input aria-label={a('Mô tả số liệu {n}', { n: i + 1 })} className={`${input.replace('w-full ', '')} min-w-0 flex-1`} value={st.label} onChange={e => { setDirty(true); setH(x => ({ ...x, stats: x.stats.map((y, j) => j === i ? { ...y, label: e.target.value } : y) })) }} />
                <button type="button" onClick={() => { setDirty(true); setH(x => ({ ...x, stats: x.stats.filter((_, j) => j !== i) })) }} className={`${ghost} flex-none px-3`} aria-label={a('Xóa số liệu')}>✕</button>
              </div>
            ))}
            {h.stats.length < 4 && <button type="button" onClick={() => { setDirty(true); setH(x => ({ ...x, stats: [...x.stats, { value: '10+', label: 'Mô tả' /* vi-only */ }] })) }} className={`${ghost} text-xs`}>+ {a('Thêm số liệu')}</button>}
          </div>
        </Card>

        <Card title={a('File CV (PDF)')} hint={a('Có file thì đầu trang và footer hiện nút "Tải CV". Tải PDF lên hoặc dán link (VD Google Drive). Bản English dùng CV tiếng Anh nếu có, không thì dùng CV tiếng Việt.')}>
          <PdfField id="cv-vi" label={a('CV tiếng Việt')} value={h.cv.file} name={h.cv.name} toast={toast} onChange={(file, name) => patch('cv', { file, name })} />
          <PdfField id="cv-en" label={a('CV tiếng Anh (không bắt buộc)')} value={h.cv.file_en} name={h.cv.name_en} toast={toast} onChange={(file, name) => patch('cv', { file_en: file, name_en: name })} />
        </Card>

        <Card title={a('Hình tròn đại diện')} hint={a('Có ảnh thì ảnh phủ kín hình tròn; không có ảnh thì hiện chữ viết tắt trên nền màu')} onReset={() => reset('avatar')}>
          <F label={a('Ảnh đại diện')} full><ImageField id="a-img" value={av.image} round onChange={v => patch('avatar', { image: v })} toast={toast}
            extra={<button type="button" onClick={() => patch('avatar', { image: autoAvatar({ seed: newSeed(), text: av.text || 'CM', palette: [av.color1 === '#a58bff' ? '#e94b9e' : av.color1, '#6650ff', '#a58bff'] }) })} className={`${ghost} px-3 py-1.5 text-xs`}>✨ {a('Tạo avatar tự động')}</button>} /></F>
          {av.image && (
            <F label={a('Căn ảnh')} id="a-pos" full>
              <div className="flex flex-wrap gap-2">
                {[['center', 'Giữa'], ['top', 'Phía trên'], ['bottom', 'Phía dưới'], ['left', 'Trái'], ['right', 'Phải']].map(([v, l]) => (
                  <button type="button" key={v} onClick={() => patch('avatar', { position: v })} className={av.position === v ? `${btn} ${grad} px-3 py-1.5 text-xs` : `${ghost} px-3 py-1.5 text-xs`}>{a(l)}</button>
                ))}
              </div>
            </F>
          )}
          <F label={a('Chữ viết tắt (khi không có ảnh)')} id="a-text"><Text id="a-text" value={av.text} onChange={v => patch('avatar', { text: v.slice(0, 4) })} /></F>
          <F label={a('Độ rõ của chữ: {n}%', { n: av.text_opacity })} id="a-op">
            <input id="a-op" type="range" min="10" max="100" value={av.text_opacity} onChange={e => patch('avatar', { text_opacity: Number(e.target.value) })} className="mt-3 w-full accent-[#6650ff]" />
          </F>
          <F label={a('Màu chữ')} id="a-tc"><Color id="a-tc" value={av.text_color} onChange={v => patch('avatar', { text_color: v })} /></F>
          <F label={a('Màu sáng (góc trên)')} id="a-c1"><Color id="a-c1" value={av.color1} onChange={v => patch('avatar', { color1: v })} /></F>
          <F label={a('Màu giữa')} id="a-c2"><Color id="a-c2" value={av.color2} onChange={v => patch('avatar', { color2: v })} /></F>
          <F label={a('Màu viền ngoài')} id="a-c3"><Color id="a-c3" value={av.color3} onChange={v => patch('avatar', { color3: v })} /></F>
          <F label={a('Màu quầng sáng')} id="a-glow"><Color id="a-glow" value={av.glow} onChange={v => patch('avatar', { glow: v })} /></F>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-line px-4 py-3 sm:col-span-2">
            <span className="text-sm">{a('Vòng nét đứt xoay quanh')}</span><Toggle on={av.ring} label={a('Vòng nét đứt')} onClick={() => patch('avatar', { ring: !av.ring })} />
          </div>
        </Card>

        <StatCardEditor k="card1" c={h.card1} set={v => patch('card1', v)} toast={toast} reset={() => reset('card1')} />
        <StatCardEditor k="card2" c={h.card2} set={v => patch('card2', v)} toast={toast} reset={() => reset('card2')} />

        <Card title={a('Dải chữ chạy')} hint={a('Dải chữ chạy ngang ngay dưới phần đầu trang')} onReset={() => reset('marquee')}>
          <F label={a('Các cụm chữ (mỗi dòng một cụm)')} id="m-items" full>
            <textarea id="m-items" rows={6} className={input} value={(m.items || []).join('\n')}
              onChange={e => patch('marquee', { items: e.target.value.split('\n') })} />
          </F>
          <F label={a('Ký hiệu ngăn cách')} id="m-sep">
            <div className="flex flex-wrap items-center gap-2">
              <input id="m-sep" className={`${input} w-20`} value={m.separator} maxLength={3} onChange={e => patch('marquee', { separator: e.target.value })} />
              {['✦', '•', '★', '✱', '/', '◆', '—'].map(c => <button type="button" key={c} onClick={() => patch('marquee', { separator: c })} className={`${ghost} size-9 px-0`}>{c}</button>)}
            </div>
          </F>
          <F label={a('Tốc độ: một vòng {n} giây (số nhỏ = chạy nhanh)', { n: m.speed })} id="m-speed">
            <input id="m-speed" type="range" min="8" max="60" value={m.speed} onChange={e => patch('marquee', { speed: Number(e.target.value) })} className="mt-3 w-full accent-[#6650ff]" />
          </F>
          <F label={a('Màu chữ')} id="m-tc"><Color id="m-tc" value={m.text_color} onChange={v => patch('marquee', { text_color: v })} /></F>
          <F label={a('Màu ký hiệu')} id="m-sc"><Color id="m-sc" value={m.sep_color} onChange={v => patch('marquee', { sep_color: v })} /></F>
          <F label={a('Màu nền dải')} id="m-bg"><Color id="m-bg" value={m.bg} onChange={v => patch('marquee', { bg: v })} /></F>
        </Card>
        </>}
      </div>

      <aside className="min-w-0 xl:sticky xl:top-24 xl:self-start xl:max-h-[calc(100vh-12.5rem)] xl:overflow-y-auto xl:rounded-xl xl:[scrollbar-width:thin]"><Preview h={lang === 'en' ? heroFor(h, 'en') : h} /></aside>

      <div className={`sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-[0_10px_40px_#00000080] transition xl:col-span-2 ${dirty ? 'border-purple/50 bg-[#141728]/95' : 'border-line bg-card'}`}>
        <span className="text-sm text-muted">{dirty ? a('Có thay đổi chưa lưu') : a('Mọi thay đổi đã được lưu')}</span>
        <button onClick={save} disabled={busy || !dirty} className={`${btn} ${grad}`}>{busy ? a('Đang lưu…') : a('Lưu phần đầu trang')}</button>
      </div>
    </div>
  )
}
