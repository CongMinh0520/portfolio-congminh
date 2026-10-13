// Admin: nhập bản English cho nội dung + trang Ngôn ngữ (mặc định, nút đổi, tiến độ dịch).
import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { DEMO_SETTINGS } from './siteBase.js'
import { loadTable, loadSettings } from './useContent.js'
import RichEditor from './RichEditor.jsx'
import { mergeHero } from './HeroVisual.jsx'
import { TR_FIELDS, SETTINGS_TR, HERO_TR, CTA_TR, getPath, setPath, hasEn, LANGS } from './i18n.js'
import { suggest, getMmEmail, setMmEmail } from './translate.js'
import { useA, at } from './adminLang.js'

const grad = 'bg-gradient-to-r from-pink to-purple'
const input = 'w-full rounded-lg border border-line bg-[#0b0d16] px-3 py-2.5 text-sm outline-none transition focus:border-purple focus:ring-2 focus:ring-purple/25'
const btn = 'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition disabled:opacity-50'
const ghost = `${btn} border border-line text-[#c9cbd8] hover:border-[#3a3f5a] hover:bg-white/5 hover:text-white`

const filled = v => (Array.isArray(v) ? v.length > 0 : String(v ?? '').trim() !== '')
const asText = v => (Array.isArray(v) ? v.join(', ') : v ?? '')

/** Đếm ô có bản Tiếng Việt mà chưa có bản English */
export const missingOf = (fields, base, en) => fields.filter(([p]) => filled(getPath(base, p)) && !filled(getPath(en, p))).length

/** Tab Tiếng Việt | English ở đầu form */
export function LangTabs({ value, onChange, missing = 0 }) {
  const a = useA()
  return (
    <div className="flex w-fit rounded-lg border border-line bg-[#0b0d16] p-1 text-sm" role="tablist" aria-label={a('Ngôn ngữ nội dung')}>
      {LANGS.map(([k, name]) => (
        <button key={k} type="button" role="tab" aria-selected={value === k} onClick={() => onChange(k)}
          className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 transition ${value === k ? 'bg-purple/20 font-semibold text-white' : 'text-muted hover:text-white'}`}>
          {a(name)}{k === 'en' && missing > 0 && <span title={a('{n} ô chưa có bản English', { n: missing })} className="rounded bg-[#f8d27c] px-1.5 text-[11px] font-bold tabular-nums text-[#161525]">{missing}</span>}
        </button>
      ))}
    </div>
  )
}

/**
 * Ô nhập bản English: mỗi ô có bản Tiếng Việt bên trên để đối chiếu và nút gợi ý bản dịch.
 * fields: [đường dẫn, nhãn, kiểu]; base: bản Tiếng Việt; en: bản English; onChange(enMới)
 */
export function EnEditor({ fields, base, en = {}, onChange, toast, idPrefix = 'en' }) {
  const a = useA()
  const [busy, setBusy] = useState(null) // đường dẫn ô đang dịch, hoặc 'all'
  const [ver, setVer] = useState(0)      // đổi để ô soạn Markdown nạp lại nội dung vừa dịch
  const list = fields.filter(([p]) => filled(getPath(base, p)))
  const empty = list.filter(([p]) => !filled(getPath(en, p)))
  const fill = async ([p, , type], cur) => {
    const v = await suggest(getPath(base, p), type)
    return setPath(cur, p, v)
  }
  const one = async f => {
    setBusy(f[0])
    try { onChange(await fill(f, en)); setVer(v => v + 1) } catch (e) { toast?.(e.message, 'error') }
    setBusy(null)
  }
  const all = async () => {
    setBusy('all'); let cur = en, done = 0
    try { for (const f of empty) { cur = await fill(f, cur); done++; onChange(cur) } toast?.(a('Đã gợi ý {n} ô. Đọc lại và sửa cho tự nhiên trước khi lưu.', { n: done })) }
    catch (e) { toast?.(done ? a('Đã gợi ý {n} ô. {msg}', { n: done, msg: e.message }) : e.message, 'error') }
    setVer(v => v + 1); setBusy(null)
  }
  if (!list.length) return <p className="text-sm text-muted">{a('Chưa có nội dung Tiếng Việt để dịch. Nhập ở tab Tiếng Việt trước.')}</p>
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-purple/30 bg-purple/[0.07] px-4 py-3">
        <p className="min-w-0 flex-1 text-xs leading-relaxed text-[#c9cbd8]">{a('Ô để trống sẽ hiện bản Tiếng Việt trên trang.')} {empty.length ? <b className="text-white">{a('{n} ô chưa dịch.', { n: empty.length })}</b> : <b className="text-[#5fe3a9]">{a('Đã dịch đủ.')}</b>}</p>
        {empty.length > 0 && <button type="button" disabled={!!busy} onClick={all} className={`${btn} ${grad} px-3 py-1.5 text-xs`}>{busy === 'all' ? a('Đang dịch…') : a('✨ Gợi ý bản dịch cho {n} ô trống', { n: empty.length })}</button>}
      </div>
      {list.map(f => {
        const [p, label, type] = f, id = `${idPrefix}-${p.replace(/\./g, '-')}`, vi = getPath(base, p), v = getPath(en, p)
        const set = val => onChange(setPath(en, p, val))
        return (
          <div key={p} className="min-w-0">
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <label htmlFor={id} className="text-xs font-medium text-muted">{a(label)} <span className="text-[#5d6180]">· English</span></label>
              <button type="button" disabled={!!busy} onClick={() => one(f)} className="flex-none rounded-md px-2 py-0.5 text-[11px] font-medium text-[#b5aaff] transition hover:bg-purple/15 disabled:opacity-40">
                {busy === p ? a('Đang dịch…') : filled(v) ? a('↻ Dịch lại') : a('✨ Gợi ý')}</button>
            </div>
            <p className={`mb-2 rounded-md border border-line/60 bg-white/[0.02] px-3 py-2 text-xs leading-relaxed text-[#8e91a8] ${type === 'markdown' ? 'line-clamp-3 whitespace-pre-line' : ''}`} title={type === 'markdown' ? asText(vi) : undefined}>
              <span className="mr-1.5 font-semibold text-[#5d6180]">VI</span>{asText(vi)}</p>
            {type === 'markdown' ? <RichEditor key={`${id}-${ver}`} id={id} value={v || ''} onChange={set} />
              : type === 'textarea' ? <textarea id={id} rows={3} className={input} value={v ?? ''} onChange={e => set(e.target.value)} />
              : <input id={id} className={input} value={asText(v)} onChange={e => set(type === 'tags' ? e.target.value.split(',').map(s => s.trimStart()) : e.target.value)} />}
          </div>
        )
      })}
    </div>
  )
}

/** Danh sách ô English của phần Đầu trang (theo số số liệu và cụm chữ chạy hiện có) */
export function heroEnFields(h) {
  return [
    ['badge.text', 'Huy hiệu'],
    ['title.before', 'Tiêu đề: đoạn trước'], ['title.highlight', 'Tiêu đề: chữ tô màu'], ['title.after', 'Tiêu đề: đoạn sau'],
    ...HERO_TR.slice(1),
    ...h.stats.flatMap((s, i) => [[`stats.${i}.value`, at('Số liệu {n}: số', { n: i + 1 })], [`stats.${i}.label`, at('Số liệu {n}: chữ', { n: i + 1 })]]),
    ...(h.marquee.items || []).map((x, i) => [`marquee.items.${i}`, at('Dải chữ chạy: cụm {n}', { n: i + 1 })]),
  ]
}

/* ---------------- Trang Admin → Ngôn ngữ ---------------- */
export default function LangPage({ toast, go }) {
  const a = useA()
  const [row, setRow] = useState(null); const [stats, setStats] = useState(null)
  const [busy, setBusy] = useState(false); const [email, setEmail] = useState(getMmEmail())
  useEffect(() => {
    loadSettings().then(r => setRow({ ...DEMO_SETTINGS, ...(r || {}) })).catch(e => { toast(e.message, 'error'); setRow({ ...DEMO_SETTINGS }) })
    Promise.all(Object.keys(TR_FIELDS).map(t => loadTable(t).then(rows => [t, rows]).catch(() => [t, []])))
      .then(list => setStats(Object.fromEntries(list.map(([t, rows]) => [t, { total: rows.length, done: rows.filter(r => TR_FIELDS[t].every(([k]) => hasEn(r, k))).length }]))))
  }, [])
  const save = async patch => {
    setBusy(true)
    const next = { ...row, ...patch }
    const { error } = await supabase.from('settings').upsert({ ...next, id: 1 })
    setBusy(false); if (error) return toast(a('{msg}. Đã chạy supabase/migration-i18n.sql chưa?', { msg: error.message }), 'error')
    setRow(next); toast(a('Đã lưu cài đặt ngôn ngữ'))
  }
  if (!row) return <p className="text-muted">{a('Đang tải…')}</p>
  const h = mergeHero(row.hero)
  const heroMiss = missingOf(heroEnFields(h), h, h.en), heroAll = heroEnFields(h).filter(([p]) => filled(getPath(h, p))).length
  const setMiss = missingOf(SETTINGS_TR, row, row.en || {}) + missingOf(CTA_TR, h, h.en), setAll = [...SETTINGS_TR.filter(([p]) => filled(row[p])), ...CTA_TR.filter(([p]) => filled(getPath(h, p)))].length
  const areas = [
    ['hero', 'Đầu trang', heroAll - heroMiss, heroAll, '{done}/{total} ô đã dịch'],
    ['skills', 'Kỹ năng', stats?.skills?.done, stats?.skills?.total, '{done}/{total} mục đã dịch'],
    ['jobs', 'Kinh nghiệm', stats?.jobs?.done, stats?.jobs?.total, '{done}/{total} mục đã dịch'],
    ['projects', 'Dự án', stats?.projects?.done, stats?.projects?.total, '{done}/{total} mục đã dịch'],
    ['footer_links', 'Menu footer', stats?.footer_links?.done, stats?.footer_links?.total, '{done}/{total} mục đã dịch'],
    ['posts', 'Blog', stats?.posts?.done, stats?.posts?.total, '{done}/{total} bài đã dịch'],
    ['bugs', 'Bug mẫu', stats?.bugs?.done, stats?.bugs?.total, '{done}/{total} mục đã dịch'],
    ['settings', 'Thông tin chung + khối cuối bài', setAll - setMiss, setAll, '{done}/{total} ô đã dịch'],
  ]
  const def = row.lang_default === 'en' ? 'en' : 'vi', sw = row.lang_switch !== false
  return (
    <div className="space-y-6 pb-16">
      <section className="rounded-xl border border-line bg-card">
        <header className="border-b border-line px-5 py-4"><h2 className="font-semibold">{a('Hiển thị trên trang chủ')}</h2><p className="text-xs text-muted">{a('Thay đổi có hiệu lực ngay khi bấm.')}</p></header>
        <div className="space-y-5 p-5">
          <div>
            <p className="mb-2 text-xs font-medium text-muted">{a('Ngôn ngữ mặc định (khách mở trang lần đầu thấy ngôn ngữ này)')}</p>
            <div className="flex flex-wrap gap-2">
              {LANGS.map(([k, name]) => (
                <button key={k} disabled={busy} onClick={() => k !== def && save({ lang_default: k })} aria-pressed={def === k}
                  className={`rounded-lg border px-4 py-2.5 text-sm transition ${def === k ? 'border-purple bg-purple/15 font-semibold text-white' : 'border-line text-muted hover:text-white'}`}>{a(name)}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-line px-4 py-3">
            <div><p className="text-sm font-medium">{a('Nút đổi ngôn ngữ VI | EN trên menu')}</p><p className="text-xs text-muted">{a('Bật để khách tự chọn; trang nhớ lựa chọn của họ. Tắt thì cả trang chỉ hiện ngôn ngữ mặc định.')}</p></div>
            <button type="button" role="switch" aria-checked={sw} aria-label={a('Nút đổi ngôn ngữ')} disabled={busy} onClick={() => save({ lang_switch: !sw })}
              className={`relative h-6 w-11 flex-none rounded-full transition ${sw ? grad : 'bg-[#2a2e45]'}`}>
              <i className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${sw ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-card">
        <header className="border-b border-line px-5 py-4"><h2 className="font-semibold">{a('Tiến độ bản English')}</h2>
          <p className="text-xs text-muted">{a('Chữ giao diện (menu, nút, tiêu đề mục, form liên hệ, footer) đã có sẵn 2 ngôn ngữ. Phần dưới là nội dung bạn tự nhập; mở mục rồi chọn tab')} <b>English</b> {a('trong form.')}</p></header>
        <ul>
          {areas.map(([k, name, done, total, unit]) => {
            const ok = total !== undefined && done === total
            return (
              <li key={k} className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3.5 last:border-0">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{a(name)}</span>
                  <span className="mt-1.5 block h-1.5 max-w-[260px] overflow-hidden rounded-full bg-white/5"><i className={`block h-full rounded-full ${ok ? 'bg-[#3ddc97]' : grad}`} style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></span>
                </span>
                <span className={`text-xs tabular-nums ${ok ? 'text-[#5fe3a9]' : 'text-muted'}`}>{total === undefined ? a('Đang đếm…') : a(unit, { done, total })}</span>
                <button onClick={() => go(k)} className={`${ghost} px-3 py-1.5 text-xs`}>{a('Mở')}</button>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="rounded-xl border border-line bg-card">
        <header className="border-b border-line px-5 py-4"><h2 className="font-semibold">{a('Gợi ý bản dịch tự động')}</h2>
          <p className="text-xs text-muted">{a('Dùng MyMemory, miễn phí, không cần đăng ký. Gợi ý chỉ điền vào ô, bạn đọc lại rồi mới bấm Lưu.')}</p></header>
        <div className="space-y-2 p-5">
          <label htmlFor="mm-email" className="block text-xs font-medium text-muted">{a('Email của bạn (không bắt buộc): tăng hạn mức từ khoảng 5.000 lên 50.000 ký tự mỗi ngày')}</label>
          <div className="flex flex-wrap gap-2">
            <input id="mm-email" type="email" className={`${input} min-w-0 flex-1`} value={email} placeholder="ban@gmail.com" onChange={e => setEmail(e.target.value)} />
            <button onClick={() => { setMmEmail(email); toast(email.trim() ? a('Đã lưu email cho dịch tự động') : a('Đã bỏ email')) }} className={ghost}>{a('Lưu')}</button>
          </div>
          <p className="text-xs text-muted">{a('Email chỉ lưu trong trình duyệt này và chỉ gửi cho MyMemory khi bạn bấm gợi ý, không hiện trên trang.')}</p>
        </div>
      </section>
    </div>
  )
}
