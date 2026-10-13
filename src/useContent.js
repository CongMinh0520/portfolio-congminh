import { useEffect, useState } from 'react'
import { configured, rpcHome, selectTable, selectSettings } from './api.js'
import { DEMO_SETTINGS } from './siteBase.js'
import { sortPosts } from './postStatus.js'

export const LIST_TABLES = ['skills', 'jobs', 'projects', 'posts', 'bugs', 'footer_links', 'socials']

// Admin (và chế độ demo) dùng client supabase-js; nạp muộn để trang công khai không phải tải thư viện này
const client = () => import('./supabase.js').then(m => m.supabase)
export async function loadTable(t) {
  const { data, error } = await (await client()).from(t).select('*').order('sort', { ascending: true }).order('id', { ascending: true })
  if (error) throw error
  return data
}
export async function loadSettings() {
  const { data, error } = await (await client()).from('settings').select('*').eq('id', 1).maybeSingle()
  if (error) throw error
  return data
}

// Dữ liệu trang chủ: 1 request (hàm SQL get_home). Chưa chạy migration thì tự rơi về cách cũ (mỗi bảng 1 request, vẫn bằng fetch thường).
async function fetchAll() {
  if (!configured) {
    const res = await Promise.allSettled([...LIST_TABLES.map(t => loadTable(t).then(rows => [t, rows])), loadSettings().then(row => ['settings', row])])
    return res.map(r => r.status === 'fulfilled' ? r.value : (console.warn('Supabase:', r.reason?.message), null))
  }
  try {
    const d = await rpcHome()
    return [...LIST_TABLES.map(t => [t, d[t] || []]), ['settings', d.settings]]
  } catch (e) {
    console.warn('get_home chưa dùng được, tải từng bảng:', e.message)
    const res = await Promise.allSettled([...LIST_TABLES.map(t => selectTable(t).then(rows => [t, rows])), selectSettings().then(row => ['settings', row])])
    return res.map(r => r.status === 'fulfilled' ? r.value : (console.warn('Supabase:', r.reason?.message), null))
  }
}

// Lưu bản tải gần nhất trong trình duyệt: lần ghé sau hiện ngay, đồng thời tải bản mới ở nền (stale-while-revalidate)
const CACHE = 'cm-home-v1'
const cache = {
  get() { try { return JSON.parse(localStorage.getItem(CACHE)) } catch { return null } },
  set(v) { try { localStorage.setItem(CACHE, JSON.stringify(v)) } catch { /* đầy bộ nhớ / chế độ riêng tư: bỏ qua */ } },
}

// Áp dụng ẩn/hiện: bỏ mục visible=false; trường trong settings.hidden coi như để trống (footer tự ẩn)
function shape(pairs, demo = {}) {
  const next = { ...Object.fromEntries(LIST_TABLES.map(t => [t, demo[t] || []])), settings: DEMO_SETTINGS }
  pairs.forEach(r => {
    if (!r) return
    const [k, v] = r
    // Đã có dữ liệu thật thì không lấy bản English của dữ liệu mẫu
    next[k] = k === 'settings' ? (v ? { ...DEMO_SETTINGS, en: {}, hero: {}, ...v } : DEMO_SETTINGS) : (v || [])
  })
  LIST_TABLES.forEach(t => { next[t] = (next[t] || []).filter(r => r.visible !== false) })
  next.posts = sortPosts(next.posts) // Blog: mới nhất lên trên
  next.settings = { ...next.settings }
  ;(next.settings.hidden || []).forEach(k => { next.settings[k] = '' })
  return next
}

// Trang chủ: đọc từ Supabase (hoặc backend demo); bảng nào lỗi thì dùng dữ liệu mẫu.
// Từng bảng được tải riêng nên bảng nào chưa tạo (VD chưa chạy migration footer) chỉ rơi về dữ liệu mẫu của bảng đó.
export function useContent() {
  // ready = đã có dữ liệu thật; trước đó trang chưa vẽ nội dung để khách (và Google) không thấy dữ liệu mẫu chớp qua
  const [content, setContent] = useState(() => {
    const c = configured && cache.get()
    return c ? { ...shape(c), ready: true, raw: JSON.stringify(c) } : { ...Object.fromEntries(LIST_TABLES.map(t => [t, []])), settings: DEMO_SETTINGS, ready: false }
  })
  useEffect(() => {
    let live = true
    fetchAll().then(async pairs => {
      if (!live) return
      // Nội dung mẫu dài chỉ tải khi có bảng lỗi (VD chưa chạy SQL) — trang thật bình thường không phải tải
      const failed = pairs.some(r => !r)
      const demo = failed ? (await import('./data.js')).demo : {}
      if (!live) return
      const raw = JSON.stringify(pairs)
      // Không đổi gì so với bản đang hiện (lấy từ bộ nhớ) thì khỏi vẽ lại
      setContent(c => c.ready && c.raw === raw ? c : { ...shape(pairs, demo), ready: true, raw })
      if (configured && !failed) cache.set(pairs)
    })
    return () => { live = false }
  }, [])
  return content
}
