// Admin → Cài đặt → Sao lưu: tải toàn bộ nội dung về 1 file JSON, khôi phục từ file đó.
// Khôi phục không bao giờ xóa gì: mặc định chỉ thêm lại mục đã mất (giữ nguyên id → link bài không đổi).
// Hàm SQL: supabase/migration-sao-luu.sql (restore_backup).
import { useRef, useState } from 'react'
import { supabase, demoMode } from './supabase.js'
import { useA, at, adminLocale } from './adminLang.js'

/* global __APP_INFO__ */
const VERSION = typeof __APP_INFO__ !== 'undefined' ? __APP_INFO__.version : ''
const APP = 'congminh-portfolio'
const LAST = 'cm-last-backup'
// Bảng được sao lưu, theo thứ tự hiện
const TABLES = [
  ['posts', 'Blog'], ['projects', 'Dự án'], ['bugs', 'Bug mẫu'], ['skills', 'Kỹ năng'], ['jobs', 'Kinh nghiệm'],
  ['footer_links', 'Menu footer'], ['socials', 'Mạng xã hội'], ['messages', 'Tin nhắn'],
  ['settings', 'Thông tin chung & giao diện'], ['admin_settings', 'Cài đặt thông báo'],
]
const SINGLE = new Set(['settings', 'admin_settings']) // bảng chỉ có 1 dòng: chỉ khôi phục khi chọn ghi đè

const btn = 'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple disabled:opacity-50'
const grad = 'bg-gradient-to-r from-pink to-purple'
const ghost = `${btn} border border-line text-[#c9cbd8] hover:border-[#3a3f5a] hover:bg-white/5 hover:text-white`

// Đọc hết một bảng (Supabase trả tối đa 1000 dòng mỗi lần nên đọc từng trang)
async function fetchAll(t) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(t).select('*').order('id', { ascending: true }).range(from, from + 999)
    if (error) throw new Error(`${t}: ${error.message}`)
    out.push(...(data || []))
    if (!data || data.length < 1000 || demoMode) return out
  }
}
// So sánh theo các cột có trong file (thứ tự khóa không quan trọng)
const stable = v => Array.isArray(v) ? `[${v.map(stable).join(',')}]` : v && typeof v === 'object' ? `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}` : JSON.stringify(v ?? null)
const same = (x, y) => Object.keys(x).every(k => stable(x[k]) === stable(y[k]))
const readLast = () => { try { return localStorage.getItem(LAST) || '' } catch { return '' } }

function Card({ title, hint, children }) {
  return (
    <section className="rounded-xl border border-line bg-card">
      <header className="border-b border-line px-5 py-4"><h2 className="font-semibold">{title}</h2>{hint && <p className="text-xs text-muted">{hint}</p>}</header>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  )
}

export default function BackupAdmin({ toast, onChanged }) {
  const a = useA()
  const [busy, setBusy] = useState(''); const [last, setLast] = useState(readLast)
  const [file, setFile] = useState(null) // { name, created_at, version, tables, plan }
  const [pick, setPick] = useState({}); const [overwrite, setOverwrite] = useState(false); const [confirm, setConfirm] = useState(false)
  const input = useRef(null)
  const when = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString(adminLocale(), { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }

  /* ---- Tải bản sao lưu ---- */
  const download = async () => {
    setBusy('down')
    try {
      const tables = {}
      for (const [t] of TABLES) tables[t] = await fetchAll(t).catch(e => { if (t === 'admin_settings' || t === 'bugs') return []; throw e }) // bảng chưa tạo (chưa chạy migration) thì bỏ qua
      const now = new Date().toISOString()
      const blob = new Blob([JSON.stringify({ app: APP, version: VERSION, created_at: now, tables }, null, 1)], { type: 'application/json' })
      const url = URL.createObjectURL(blob), link = document.createElement('a')
      link.href = url; link.download = `congminh-sao-luu-${now.slice(0, 10)}.json`; document.body.appendChild(link); link.click(); link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 2000)
      try { localStorage.setItem(LAST, now) } catch {}
      setLast(now); toast(a('Đã tải bản sao lưu'))
    } catch (e) { toast(a('Chưa sao lưu được: {msg}', { msg: e.message }), 'error') }
    setBusy('')
  }

  /* ---- Đọc file khôi phục: so với dữ liệu hiện tại ---- */
  const open = async f => {
    if (!f) return
    setBusy('read'); setFile(null); setConfirm(false)
    try {
      let json
      try { json = JSON.parse(await f.text()) } catch { throw new Error(at('File không đọc được (không phải JSON).')) }
      if (json?.app !== APP || typeof json.tables !== 'object') throw new Error(at('Đây không phải file sao lưu của web này.'))
      const plan = {}
      for (const [t] of TABLES) {
        const rows = Array.isArray(json.tables[t]) ? json.tables[t].filter(r => r && r.id != null) : []
        if (!rows.length) continue
        const now = await fetchAll(t).catch(() => [])
        const byId = new Map(now.map(r => [r.id, r]))
        plan[t] = { rows, total: rows.length, current: now.length, missing: rows.filter(r => !byId.has(r.id)).length, changed: rows.filter(r => byId.has(r.id) && !same(r, byId.get(r.id))).length }
      }
      setFile({ name: f.name, created_at: json.created_at, version: json.version, plan })
      setPick(Object.fromEntries(Object.entries(plan).map(([t, p]) => [t, p.missing > 0])))
      setOverwrite(false)
    } catch (e) { toast(e.message, 'error') }
    setBusy(''); if (input.current) input.current.value = ''
  }

  const count = t => { const p = file?.plan[t]; return !p ? 0 : (SINGLE.has(t) ? 0 : p.missing) + (overwrite ? p.changed : 0) }
  const chosen = file ? Object.keys(file.plan).filter(t => pick[t] && count(t) > 0) : []
  const totalRows = chosen.reduce((s, t) => s + count(t), 0)

  const restore = async () => {
    setBusy('restore'); let done = 0
    try {
      for (const t of chosen) {
        const { data, error } = await supabase.rpc('restore_backup', { tbl: t, rows: file.plan[t].rows, overwrite })
        if (error) throw new Error(`${a(TABLES.find(x => x[0] === t)[1])}: ${error.message}`)
        done += Number(data) || 0
      }
      toast(a('Đã khôi phục {n} mục', { n: done })); setFile(null); onChanged?.()
    } catch (e) {
      const missing = /restore_backup|PGRST202|schema cache/i.test(e.message)
      toast(missing ? a('Chưa bật khôi phục: chạy file supabase/migration-sao-luu.sql trong Supabase → SQL Editor.') : a('Khôi phục chưa xong: {msg}', { msg: e.message }), 'error')
    }
    setBusy(''); setConfirm(false)
  }

  return (
    <div className="mx-auto max-w-[860px] space-y-5 pb-16">
      <Card title={a('Tải bản sao lưu')} hint={a('Một file JSON chứa toàn bộ nội dung: bài viết, dự án, kỹ năng, kinh nghiệm, menu, mạng xã hội, tin nhắn, cài đặt.')}>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={download} disabled={!!busy} className={`${btn} ${grad}`}>{busy === 'down' ? a('Đang tạo file…') : a('Tải bản sao lưu')}</button>
          <span className="text-sm text-muted">{last ? a('Lần gần nhất trên trình duyệt này: {date}', { date: when(last) }) : a('Chưa sao lưu lần nào trên trình duyệt này.')}</span>
        </div>
        <ul className="list-disc space-y-1 pl-5 text-xs text-muted">
          <li>{a('Ảnh nằm trong kho ảnh Supabase; file sao lưu chỉ giữ link ảnh, không chứa file ảnh.')}</li>
          <li>{a('Không kèm thống kê lượt xem và tài khoản đăng nhập.')}</li>
          <li>{a('Nên sao lưu trước khi sửa nhiều hoặc mỗi tháng một lần, cất file ở Google Drive hoặc máy tính.')}</li>
        </ul>
      </Card>

      <Card title={a('Khôi phục từ file')} hint={a('Không có mục nào bị xóa. Mặc định chỉ thêm lại những mục đã mất, giữ nguyên link cũ.')}>
        <input ref={input} type="file" accept="application/json,.json" className="hidden" onChange={e => open(e.target.files?.[0])} />
        <button onClick={() => input.current?.click()} disabled={!!busy} className={ghost}>{busy === 'read' ? a('Đang đọc file…') : a('Chọn file sao lưu (.json)')}</button>

        {file && (
          <div className="space-y-4">
            <p className="text-sm text-[#c9cbd8]">{a('File {name}, tạo lúc {date}', { name: file.name, date: when(file.created_at) || '?' })}{file.version ? ` · v${file.version}` : ''}</p>
            {Object.keys(file.plan).length === 0 ? <p className="text-sm text-muted">{a('File không có dữ liệu nào để khôi phục.')}</p> : (
              <div className="overflow-x-auto rounded-lg border border-line">
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="bg-white/[0.03] text-left text-xs text-muted">
                    <tr><th className="px-3 py-2 font-medium">{a('Khôi phục')}</th><th className="px-3 py-2 font-medium">{a('Mục')}</th><th className="px-3 py-2 text-right font-medium">{a('Trong file')}</th><th className="px-3 py-2 text-right font-medium">{a('Hiện có')}</th><th className="px-3 py-2 text-right font-medium">{a('Đã mất')}</th><th className="px-3 py-2 text-right font-medium">{a('Khác bản hiện tại')}</th></tr>
                  </thead>
                  <tbody className="divide-y divide-line/70">
                    {TABLES.filter(([t]) => file.plan[t]).map(([t, label]) => {
                      const p = file.plan[t], n = count(t)
                      return (
                        <tr key={t} className={n ? '' : 'opacity-60'}>
                          <td className="px-3 py-2"><input type="checkbox" aria-label={a(label)} className="accent-[#6650ff]" checked={!!pick[t]} disabled={!n} onChange={e => setPick(x => ({ ...x, [t]: e.target.checked }))} /></td>
                          <td className="px-3 py-2">{a(label)}{SINGLE.has(t) && <span className="block text-[11px] text-muted">{a('Chỉ khôi phục khi chọn ghi đè')}</span>}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{p.total}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{p.current}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{SINGLE.has(t) ? '–' : p.missing}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{p.changed}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <fieldset className="space-y-2 text-sm">
              <legend className="sr-only">{a('Cách khôi phục')}</legend>
              <label className="flex cursor-pointer items-start gap-2"><input type="radio" name="bk-mode" className="mt-1 accent-[#6650ff]" checked={!overwrite} onChange={() => { setOverwrite(false); setConfirm(false) }} /><span><b>{a('Chỉ thêm lại mục đã mất')}</b> <span className="text-muted">{a('(an toàn, không đụng tới mục đang có)')}</span></span></label>
              <label className="flex cursor-pointer items-start gap-2"><input type="radio" name="bk-mode" className="mt-1 accent-[#6650ff]" checked={overwrite} onChange={() => { setOverwrite(true); setPick(x => Object.fromEntries(Object.keys(file.plan).map(t => [t, x[t] || file.plan[t].changed > 0]))); setConfirm(false) }} /><span><b>{a('Thêm lại và ghi đè mục đã sửa')}</b> <span className="text-muted">{a('(mục cùng id trở về như trong file; chỉnh sửa sau ngày sao lưu sẽ mất)')}</span></span></label>
            </fieldset>
            <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
              {!confirm
                ? <button onClick={() => setConfirm(true)} disabled={!totalRows || !!busy} className={`${btn} ${grad}`}>{a('Khôi phục {n} mục', { n: totalRows })}</button>
                : <span className="flex flex-wrap items-center gap-2 rounded-lg border border-[#f8d27c]/40 bg-[#f8d27c]/10 px-3 py-2 text-sm text-[#f8d27c]">
                    {overwrite ? a('Ghi đè và thêm lại {n} mục? Mục cùng id sẽ trở về như trong file.', { n: totalRows }) : a('Thêm lại {n} mục đã mất?', { n: totalRows })}
                    <button onClick={restore} disabled={!!busy} className={`${btn} ${grad} py-1`}>{busy === 'restore' ? a('Đang khôi phục…') : a('Khôi phục')}</button>
                    <button onClick={() => setConfirm(false)} className="rounded px-2 py-1 text-[#c9cbd8] hover:bg-white/10">{a('Hủy')}</button>
                  </span>}
              <button onClick={() => setFile(null)} className="text-sm text-muted hover:text-white">{a('Bỏ chọn file')}</button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
