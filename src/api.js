// Lớp truy cập nhẹ cho TRANG CÔNG KHAI: chỉ dùng fetch thường tới Supabase REST, không kéo thư viện supabase-js
// (thư viện đó chỉ tải khi mở Admin, xem supabase.js). Chưa có .env → chế độ demo, dùng backend giả trong trình duyệt.
const URL_ = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '')
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
export const configured = Boolean(URL_ && KEY)
export const demoMode = !configured

const headers = (extra) => ({ apikey: KEY, Authorization: `Bearer ${KEY}`, ...extra })
const fail = async (r) => { const d = await r.json().catch(() => ({})); throw new Error(d.message || `HTTP ${r.status}`) }

/** Toàn bộ dữ liệu trang chủ trong 1 request (hàm SQL public.get_home, xem supabase/migration-get-home.sql) */
export async function rpcHome() {
  const r = await fetch(`${URL_}/rest/v1/rpc/get_home`, { method: 'POST', headers: headers({ 'Content-Type': 'application/json' }), body: '{}' })
  if (!r.ok) await fail(r)
  return r.json()
}

/** Cách cũ (mỗi bảng 1 request) — chỉ dùng khi chưa chạy migration get_home */
export async function selectTable(t) {
  const r = await fetch(`${URL_}/rest/v1/${t}?select=*&order=sort.asc,id.asc`, { headers: headers() })
  if (!r.ok) await fail(r)
  return r.json()
}
export async function selectSettings() {
  const r = await fetch(`${URL_}/rest/v1/settings?select=*&id=eq.1`, { headers: headers() })
  if (!r.ok) await fail(r)
  return (await r.json())[0] || null
}

/** Ghi 1 dòng (khách chỉ được ghi page_views). Trả { error } giống supabase-js */
export async function insertRow(table, row) {
  if (demoMode) { const { supabase } = await import('./supabase.js'); return supabase.from(table).insert(row) }
  try {
    const r = await fetch(`${URL_}/rest/v1/${table}`, { method: 'POST', headers: headers({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }), body: JSON.stringify(row), keepalive: true })
    return { error: r.ok ? null : new Error(`HTTP ${r.status}`) }
  } catch (error) { return { error } }
}

