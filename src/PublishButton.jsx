// Nút "Xuất bản" trên thanh trên cùng của Admin. Trang công khai được dựng sẵn lúc build (scripts/prerender.mjs),
// nên sửa nội dung xong bấm nút này để Vercel build lại (hàm gui-tin-nhan gọi Deploy Hook, xem supabase/migration-xuat-ban.sql).
// Bảng publish_state cho biết có thay đổi chưa xuất bản; theo dõi realtime nên bài Easy AI gửi tới cũng hiện ngay.
import { useEffect, useState } from 'react'
import { supabase, demoMode } from './supabase.js'
import { subscribeTable } from './live.js'
import { useA, at } from './adminLang.js'

const BUILD_MS = 90e3 // build + đưa lên CDN mất khoảng 1 phút

// Lỗi từ hàm (mã 4xx/5xx): supabase-js trả error.context là Response, đọc lại JSON để biết lý do
async function invokePublish() {
  const { data, error } = await supabase.functions.invoke('gui-tin-nhan', { body: { action: 'publish' } })
  if (!error) return data || { ok: false }
  try { return await error.context.json() } catch { return { ok: false, error: error.message } }
}
function errorText(r) {
  if (r.code === 'no-hook') return at('Máy chủ chưa có VERCEL_DEPLOY_HOOK cho hàm gui-tin-nhan.')
  if (r.code === 'too-soon') return at('Vừa xuất bản, thử lại sau {n} giây.', { n: r.wait })
  if (r.code === 'hook-failed') return at('Vercel chưa nhận lệnh build, thử lại sau.')
  return at('Chưa xuất bản được: {msg}', { msg: r.error || '?' })
}

export default function PublishButton({ toast }) {
  const a = useA()
  const [st, setSt] = useState(null) // null = chưa chạy migration-xuat-ban.sql / bản demo → ẩn nút
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (demoMode) return
    const load = () => supabase.from('publish_state').select('changed_at, published_at').eq('id', 1).maybeSingle()
      .then(({ data, error }) => { if (!error && data) setSt(data) })
    load()
    return subscribeTable('publish_state', load, 300)
  }, [])
  // Đang build: đếm lùi để nhãn tự đổi về bình thường
  const building = st?.published_at && now - Date.parse(st.published_at) < BUILD_MS
  useEffect(() => { if (!building) return; const t = setInterval(() => setNow(Date.now()), 5e3); return () => clearInterval(t) }, [building])

  if (!st) return null
  const pending = st.changed_at && (!st.published_at || Date.parse(st.changed_at) > Date.parse(st.published_at))

  const publish = async () => {
    setBusy(true)
    const r = await invokePublish()
    setBusy(false)
    if (!r.ok) return toast(errorText(r), 'error')
    setSt(s => ({ ...s, published_at: r.published_at })); setNow(Date.now())
    toast(a('Đang xuất bản, trang công khai cập nhật sau khoảng 1 phút'))
  }

  const label = busy ? a('Đang gửi…') : building ? a('Đang build…') : a('Xuất bản')
  const tip = pending ? a('Có thay đổi chưa xuất bản lên trang công khai') : a('Trang công khai đã có nội dung mới nhất')
  return (
    <button onClick={publish} disabled={busy || building} title={tip} aria-label={`${label} · ${tip}`}
      className={`flex flex-none items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition disabled:cursor-default disabled:opacity-70 ${pending && !building
        ? 'bg-gradient-to-r from-pink to-purple text-white hover:brightness-110'
        : 'border border-line text-muted hover:border-[#3a3f5a] hover:text-white'}`}>
      <span aria-hidden className={`size-2 rounded-full ${building ? 'animate-pulse bg-yellow-300' : pending ? 'bg-white' : 'bg-emerald-400'}`} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}
