// Admin → Thương hiệu: logo, biểu tượng, favicon. Đổi là có hiệu lực ngay trên trang chủ và Admin.
import { useEffect, useRef, useState } from 'react'
import { supabase, uploadImage } from './supabase.js'
import { loadSettings } from './useContent.js'
import { DEFAULT_BRAND, brandOf, BrandLogo, BrandIcon, faviconOf } from './Brand.jsx'
import { useA } from './adminLang.js'

const grad = 'bg-gradient-to-r from-pink to-purple'
const input = 'w-full rounded-lg border border-line bg-[#0b0d16] px-3 py-2 text-sm outline-none transition focus:border-purple focus:ring-2 focus:ring-purple/25'
const btn = 'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition disabled:opacity-50'
const ghost = `${btn} border border-line text-[#c9cbd8] hover:border-[#3a3f5a] hover:bg-white/5 hover:text-white`

const ROWS = [
  { k: 'logo', title: 'Logo', where: 'Góc trái menu trang chủ, chân trang và trang đăng nhập Admin. Chưa tải ảnh thì dùng logo chữ bên dưới.',
    types: ['image/png', 'image/svg+xml', 'image/webp', 'image/jpeg'], fmt: 'PNG, SVG, WEBP, JPG', maxKB: 2048, shrink: 600, text: ['logo_text', 'Logo chữ (dấu chấm tự tô hồng)', 30] },
  { k: 'icon', title: 'Biểu tượng', where: 'Hình vuông thu gọn: đầu thanh bên Admin, trang đăng nhập. Nên dùng ảnh vuông từ 512 px.',
    types: ['image/png', 'image/svg+xml', 'image/webp'], fmt: 'PNG, SVG, WEBP', maxKB: 1024, shrink: 512, text: ['icon_text', 'Chữ viết tắt (tối đa 3 ký tự)', 3] },
  { k: 'favicon', title: 'Favicon', where: 'Icon trên tab trình duyệt. Chưa tải ảnh thì tự dùng biểu tượng ở trên. Nên dùng ICO hoặc PNG vuông 32–64 px, hoặc SVG.',
    types: ['image/x-icon', 'image/vnd.microsoft.icon', 'image/png', 'image/svg+xml'], fmt: 'ICO, PNG, SVG', maxKB: 512, shrink: 0 },
]

function Row({ r, brand, save, toast }) {
  const a = useA()
  const file = useRef(null); const [busy, setBusy] = useState(false)
  const title = a(r.title), label = r.text ? a(r.text[1]) : ''
  const maxTxt = r.maxKB >= 1024 ? `${r.maxKB / 1024} MB` : `${r.maxKB} KB`
  const [txt, setTxt] = useState(r.text ? brand[r.text[0]] : '')
  useEffect(() => { if (r.text) setTxt(brand[r.text[0]]) }, [brand[r.text?.[0]]])
  const uploaded = !!brand[r.k]
  const take = async f => {
    if (!f) return
    const okType = r.types.includes(f.type) || (r.k === 'favicon' && /\.ico$/i.test(f.name))
    if (!okType) return toast(a('Định dạng chưa hỗ trợ. Dùng {fmt}.', { fmt: r.fmt }), 'error')
    if (f.size > r.maxKB * 1024) return toast(a('Ảnh quá lớn (tối đa {max}).', { max: maxTxt }), 'error')
    setBusy(true)
    try { await save({ [r.k]: await uploadImage(f, r.shrink || 0) }, a('Đã cập nhật {name}', { name: title.toLowerCase() })) } catch (e) { toast(e.message, 'error') }
    setBusy(false)
  }
  const preview = r.k === 'logo' ? <BrandLogo brand={brand} className="text-xl font-extrabold tracking-tight" imgClass="h-10" />
    : r.k === 'icon' ? <BrandIcon brand={brand} className="size-14 rounded-xl text-base" />
    : <span className="flex items-center gap-2 rounded-lg bg-[#1d2033] px-2.5 py-1.5 text-xs text-[#c9cbd8]"><img src={faviconOf(brand)} alt="" className="size-4 object-contain" />Công Minh</span> // vi-only: sample site name in the favicon preview
  return (
    <li className="grid gap-4 border-b border-line p-5 last:border-0 md:grid-cols-[200px_minmax(0,1fr)_auto] md:items-center">
      <div className="grid h-[84px] place-items-center rounded-lg border border-line bg-[#07080f] px-3">{preview}</div>
      <div className="min-w-0 space-y-1.5">
        <p className="flex flex-wrap items-center gap-2"><b>{title}</b>
          <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${uploaded ? 'bg-purple/25 text-[#c9bfff]' : 'border border-line text-muted'}`}>{uploaded ? a('Đang dùng ảnh đã tải lên') : r.k === 'favicon' ? a('Đang dùng biểu tượng') : a('Đang dùng mặc định')}</span></p>
        <p className="text-sm text-muted">{a(r.where)}</p>
        <p className="text-xs text-[#6d7090]">{a('Định dạng {fmt}, tối đa {max}.', { fmt: r.fmt, max: maxTxt })}</p>
        {r.text && !uploaded && (
          <form onSubmit={e => { e.preventDefault(); save({ [r.text[0]]: txt.trim() || DEFAULT_BRAND[r.text[0]] }, a('Đã lưu {name}', { name: label.split(' (')[0].toLowerCase() })) }} className="flex max-w-[420px] gap-2 pt-1">
            <label htmlFor={`brand-${r.text[0]}`} className="sr-only">{label}</label>
            <input id={`brand-${r.text[0]}`} className={input} maxLength={r.text[2]} value={txt} placeholder={label} title={label} onChange={e => setTxt(e.target.value)} />
            <button disabled={txt === brand[r.text[0]]} className={`${ghost} flex-none px-3 py-1.5 text-xs`}>{a('Lưu')}</button>
          </form>
        )}
      </div>
      <div className="flex flex-wrap gap-2 md:justify-end">
        <button type="button" disabled={busy} onClick={() => file.current.click()} className={uploaded ? ghost : `${btn} ${grad}`}>{busy ? a('Đang tải…') : uploaded ? a('Thay ảnh') : a('Tải ảnh lên')}</button>
        {uploaded && <button type="button" onClick={() => save({ [r.k]: '' }, a('Đã về {name} mặc định', { name: title.toLowerCase() }))} className={ghost}>↺ {a('Về mặc định')}</button>}
        <input ref={file} type="file" hidden accept={[...r.types, ...(r.k === 'favicon' ? ['.ico'] : [])].join(',')} onChange={e => { take(e.target.files?.[0]); e.target.value = '' }} />
      </div>
    </li>
  )
}

export default function BrandAdmin({ toast, onSaved }) {
  const a = useA()
  const [brand, setBrand] = useState(null)
  useEffect(() => { loadSettings().then(r => setBrand(brandOf(r))).catch(e => { toast(e.message, 'error'); setBrand(brandOf()) }) }, [])
  const save = async (patch, msg) => {
    const next = { ...brand, ...patch }
    const { error } = await supabase.from('settings').update({ brand: next }).eq('id', 1)
    if (error) return toast(a('{msg}. Đã chạy supabase/migration-brand.sql chưa?', { msg: error.message }), 'error')
    setBrand(next); onSaved?.(next); toast(msg)
  }
  if (!brand) return <p className="text-muted">{a('Đang tải…')}</p>
  return (
    <div className="space-y-5 pb-16">
      <p className="text-sm text-muted">{a('Logo, biểu tượng và favicon dùng trên trang chủ, trang blog, dự án và Admin. Đổi ở đây là có hiệu lực ngay, không cần làm gì thêm.')}</p>
      <ul className="overflow-hidden rounded-xl border border-line bg-card">
        {ROWS.map(r => <Row key={r.k} r={r} brand={brand} save={save} toast={toast} />)}
      </ul>
    </div>
  )
}
