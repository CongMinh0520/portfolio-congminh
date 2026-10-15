// Nạp & lưu dòng settings (id = 1) cho các trang Admin.
// - Nạp lỗi: chỉ bản demo mới dùng nội dung mẫu. Web thật hiện lỗi + nút “Thử lại” và KHÔNG cho lưu,
//   tránh bấm Lưu làm nội dung mẫu ghi đè dữ liệu thật.
// - Lưu: chỉ gửi những cột đã đổi so với bản đã nạp (upsert chỉ ghi các cột được gửi),
//   nên trang này không ghi đè cột do trang khác (hoặc tab khác) vừa sửa.
import { useEffect, useRef, useState } from 'react'
import { supabase, demoMode } from './supabase.js'
import { DEMO_SETTINGS } from './siteBase.js'
import { loadSettings } from './useContent.js'
import { useA } from './adminLang.js'

const btn = 'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition disabled:opacity-50'
const ghost = `${btn} border border-line text-[#c9cbd8] hover:border-[#3a3f5a] hover:bg-white/5 hover:text-white`
const same = (x, y) => JSON.stringify(x ?? null) === JSON.stringify(y ?? null)

/** onLoad(full) nhận dòng settings (đã bù mặc định). Trả về { err, retry, save } — save(next) gửi các cột khác bản đã nạp. */
export function useSettingsRow(toast, onLoad) {
  const [err, setErr] = useState(null); const [tick, setTick] = useState(0)
  const base = useRef(undefined) // dòng thật vừa nạp; null = chưa có dòng nào trong bảng
  useEffect(() => {
    let live = true; setErr(null)
    loadSettings().then(r => { if (!live) return; base.current = r; onLoad({ ...DEMO_SETTINGS, ...(r || {}) }) })
      .catch(e => {
        if (!live) return
        toast(e.message, 'error')
        if (demoMode) { base.current = null; onLoad({ ...DEMO_SETTINGS }) } else setErr(e)
      })
    return () => { live = false }
  }, [tick])
  const save = async next => {
    const r = base.current
    if (r === undefined) return { error: new Error('settings not loaded') } // chưa nạp được dữ liệu thật: không bao giờ ghi
    const patch = r ? Object.fromEntries(Object.entries(next).filter(([k, v]) => k !== 'id' && !same(v, r[k]))) : { ...next }
    delete patch.id
    if (!Object.keys(patch).length) return { error: null }
    const { error } = await supabase.from('settings').upsert({ ...patch, id: 1 })
    if (!error) base.current = { ...(r || {}), ...patch }
    return { error }
  }
  return { err, retry: () => setTick(t => t + 1), save }
}

/** Khung báo nạp lỗi + nút Thử lại (thay cho form, để không thể bấm Lưu) */
export function LoadError({ err, onRetry }) {
  const a = useA()
  return (
    <div role="alert" className="rounded-xl border border-[#f8d27c]/40 bg-[#f8d27c]/10 p-4 text-sm text-[#f8d27c]">
      <p>{a('Chưa tải được dữ liệu: {msg}', { msg: err?.message || String(err) })}</p>
      <p className="mt-1 text-xs opacity-80">{a('Để tránh ghi đè dữ liệu thật, trang này chưa cho lưu cho tới khi tải được.')}</p>
      <button onClick={onRetry} className={`${ghost} mt-3`}>{a('Thử lại')}</button>
    </div>
  )
}
