// Admin → Trang Kiểm thử web: sửa nội dung trang /kiem-thu (lưu ở cột settings.selftest, xem supabase/migration-qa.sql).
import { useState } from 'react'
import { useSettingsRow, LoadError } from './settingsRow.jsx'
import { DEFAULT_SELFTEST, selftestOf } from './selftestData.js'
import { href } from './router.js'
import { useA } from './adminLang.js'

const grad = 'bg-gradient-to-r from-pink to-purple'
const input = 'w-full rounded-lg border border-line bg-[#0b0d16] px-3 py-2 text-sm outline-none transition focus:border-purple focus:ring-2 focus:ring-purple/25'
const btn = 'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple disabled:opacity-50'
const ghost = `${btn} border border-line text-[#c9cbd8] hover:border-[#3a3f5a] hover:bg-white/5 hover:text-white`
const small = 'rounded-md px-2 py-1 text-xs text-muted transition hover:bg-white/10 hover:text-white disabled:opacity-30'

const Card = ({ title, hint, children, right }) => (
  <section className="rounded-xl border border-line bg-card">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
      <div><h2 className="font-semibold">{title}</h2>{hint && <p className="text-xs text-muted">{hint}</p>}</div>{right}
    </header>
    <div className="space-y-4 p-5">{children}</div>
  </section>
)
const Lab = ({ id, children }) => <label htmlFor={id} className="mb-1 block text-xs font-medium text-muted">{children}</label>

// Ô chữ có bản Tiếng Việt và English đặt cạnh nhau
function Pair({ id, label, row, k, onChange, area }) {
  const a = useA()
  const El = area ? 'textarea' : 'input'
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div><Lab id={`${id}-vi`}>{label} · {a('Tiếng Việt')}</Lab><El id={`${id}-vi`} rows={area ? 3 : undefined} className={input} value={row[k] ?? ''} onChange={e => onChange({ [k]: e.target.value })} /></div>
      <div><Lab id={`${id}-en`}>{label} · English</Lab><El id={`${id}-en`} rows={area ? 3 : undefined} className={input} value={row[`${k}_en`] ?? ''} onChange={e => onChange({ [`${k}_en`]: e.target.value })} /></div>
    </div>
  )
}

// Danh sách dòng (thêm, xóa, đổi thứ tự)
function Rows({ list, onChange, blank, addLabel, render }) {
  const a = useA()
  const set = (i, patch) => onChange(list.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const move = (i, d) => { const n = [...list]; [n[i], n[i + d]] = [n[i + d], n[i]]; onChange(n) }
  return (
    <>
      {list.map((r, i) => (
        <div key={i} className="space-y-3 rounded-lg border border-line p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">#{i + 1}</span>
            <span className="flex gap-1">
              <button type="button" className={small} disabled={i === 0} onClick={() => move(i, -1)} aria-label={a('Lên')}>↑</button>
              <button type="button" className={small} disabled={i === list.length - 1} onClick={() => move(i, 1)} aria-label={a('Xuống')}>↓</button>
              <button type="button" className={`${small} hover:!bg-red-500/15 hover:!text-red-300`} onClick={() => onChange(list.filter((_, j) => j !== i))}>{a('Xóa')}</button>
            </span>
          </div>
          {render(r, p => set(i, p), i)}
        </div>
      ))}
      <button type="button" onClick={() => onChange([...list, { ...blank }])} className={ghost}>+ {addLabel}</button>
    </>
  )
}

function Choice({ value, options, onChange, label }) {
  const a = useA()
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map(([k, l]) => (
        <button key={k} type="button" role="radio" aria-checked={value === k} onClick={() => onChange(k)}
          className={`rounded-full border px-3 py-1 text-xs transition ${value === k ? 'border-purple bg-purple/15 font-semibold text-white' : 'border-line text-muted hover:text-white'}`}>{a(l)}</button>
      ))}
    </div>
  )
}

const CATS = [['performance', 'Hiệu năng'], ['accessibility', 'Trợ năng'], ['best', 'Thực hành tốt'], ['seo', 'SEO']]
const RESULTS = [['pass', 'Đạt'], ['issue', 'Có lỗi'], ['todo', 'Chưa test']]
const FOUND = [['fixed', 'Đã sửa'], ['open', 'Đang theo dõi'], ['note', 'Ghi nhận']]

export default function SelfTestAdmin({ toast }) {
  const a = useA()
  const [st, setSt] = useState(null)
  const [dirty, setDirty] = useState(false); const [busy, setBusy] = useState(false)
  const { err, retry, save: saveRow } = useSettingsRow(toast, full => setSt(selftestOf(full.selftest)))
  const set = patch => { setDirty(true); setSt(s => ({ ...s, ...patch })) }
  const setScore = (dev, k, v) => set({ scores: { ...st.scores, [dev]: { ...st.scores[dev], [k]: v === '' ? '' : Math.max(0, Math.min(100, Math.round(Number(v) || 0))) } } })
  const save = async () => {
    setBusy(true)
    const { error } = await saveRow({ selftest: st })
    setBusy(false)
    if (error) return toast(/selftest/i.test(error.message) ? a('Chưa có chỗ lưu: chạy file supabase/migration-qa.sql trong Supabase → SQL Editor.') : error.message, 'error')
    setDirty(false); toast(a('Đã lưu trang Kiểm thử'))
  }
  if (err) return <LoadError err={err} onRetry={retry} />
  if (!st) return <p className="text-muted">{a('Đang tải…')}</p>
  return (
    <div className="space-y-5 pb-24">
      <p className="text-sm text-muted">{a('Nội dung trang “Mình đã test chính web này”. Đo điểm mới tại pagespeed.web.dev (hoặc Lighthouse trong Chrome DevTools) rồi điền vào đây.')} <a href={href('/kiem-thu')} target="_blank" rel="noreferrer" className="font-semibold text-pink hover:underline">{a('Xem trang')} ↗</a></p>

      <Card title={a('Giới thiệu')}>
        <Pair id="st-intro" label={a('Đoạn mở đầu')} row={st} k="intro" onChange={set} area />
      </Card>

      <Card title={a('Điểm Lighthouse')} hint={a('Từ 0 đến 100. Xanh từ 90, cam từ 50, dưới 50 màu đỏ.')}>
        {[['mobile', 'Điện thoại'], ['desktop', 'Máy tính']].map(([dev, name]) => (
          <div key={dev}>
            <p className="mb-2 text-sm font-medium">{a(name)}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {CATS.map(([k, l]) => (
                <div key={k}><Lab id={`st-${dev}-${k}`}>{a(l)}</Lab>
                  <input id={`st-${dev}-${k}`} type="number" min="0" max="100" inputMode="numeric" className={input} value={st.scores[dev][k] ?? ''} onChange={e => setScore(dev, k, e.target.value)} /></div>
              ))}
            </div>
          </div>
        ))}
        <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
          <div><Lab id="st-measured">{a('Ngày đo')}</Lab><input id="st-measured" type="date" className={input} value={st.measured || ''} onChange={e => set({ measured: e.target.value })} /></div>
          <Pair id="st-tool" label={a('Công cụ đo')} row={st} k="tool" onChange={set} />
        </div>
      </Card>

      <Card title={a('Trình duyệt và thiết bị đã test')}>
        <Rows list={st.envs} onChange={envs => set({ envs })} addLabel={a('Thêm trình duyệt / thiết bị')} blank={{ name: '', name_en: '', result: 'todo', note: '', note_en: '' }}
          render={(r, upd, i) => <>
            <Pair id={`st-env-${i}-name`} label={a('Tên')} row={r} k="name" onChange={upd} />
            <Choice label={a('Kết quả')} value={r.result || 'todo'} options={RESULTS} onChange={v => upd({ result: v })} />
            <Pair id={`st-env-${i}-note`} label={a('Ghi chú')} row={r} k="note" onChange={upd} />
          </>} />
      </Card>

      <Card title={a('Checklist trợ năng và chất lượng')}>
        <Rows list={st.checks} onChange={checks => set({ checks })} addLabel={a('Thêm mục kiểm tra')} blank={{ text: '', text_en: '', ok: false }}
          render={(r, upd, i) => <>
            <Pair id={`st-check-${i}`} label={a('Nội dung')} row={r} k="text" onChange={upd} />
            <Choice label={a('Kết quả')} value={r.ok ? 'ok' : 'no'} options={[['ok', 'Đạt'], ['no', 'Chưa đạt']]} onChange={v => upd({ ok: v === 'ok' })} />
          </>} />
      </Card>

      <Card title={a('Bug tự tìm ra trên web này')} hint={a('Ghi cả lỗi chưa sửa xong: nhà tuyển dụng đánh giá cao sự trung thực.')}>
        <Rows list={st.found} onChange={found => set({ found })} addLabel={a('Thêm bug')} blank={{ title: '', title_en: '', status: 'open', detail: '', detail_en: '' }}
          render={(r, upd, i) => <>
            <Pair id={`st-found-${i}-title`} label={a('Tiêu đề')} row={r} k="title" onChange={upd} />
            <Choice label={a('Trạng thái')} value={r.status || 'note'} options={FOUND} onChange={v => upd({ status: v })} />
            <Pair id={`st-found-${i}-detail`} label={a('Mô tả: lỗi gì, vì sao, sửa thế nào')} row={r} k="detail" onChange={upd} area />
          </>} />
      </Card>

      <button type="button" onClick={() => { setSt(selftestOf(DEFAULT_SELFTEST)); setDirty(true) }} className="text-xs text-muted hover:text-white">{a('Về nội dung mặc định')}</button>

      <div className={`sticky bottom-4 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-[0_10px_40px_#00000080] backdrop-blur transition ${dirty ? 'border-purple/50 bg-[#141728]/95' : 'border-line bg-card/90'}`}>
        <span className="text-sm text-muted">{dirty ? a('Có thay đổi chưa lưu') : a('Mọi thay đổi đã được lưu')}</span>
        <button onClick={save} disabled={busy || !dirty} className={`${btn} ${grad}`}>{busy ? a('Đang lưu…') : a('Lưu thay đổi')}</button>
      </div>
    </div>
  )
}
