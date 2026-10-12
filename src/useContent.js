import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { DEMO_SETTINGS } from './siteBase.js'
import { subscribePosts } from './live.js'
import { sortPosts } from './postStatus.js'

export const LIST_TABLES = ['skills', 'jobs', 'projects', 'posts', 'footer_links', 'socials']

export async function loadTable(t) {
  const { data, error } = await supabase.from(t).select('*').order('sort', { ascending: true }).order('id', { ascending: true })
  if (error) throw error
  return data
}
export async function loadSettings() {
  const { data, error } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle()
  if (error) throw error
  return data
}

// Trang chủ: đọc từ Supabase (hoặc backend demo); bảng nào lỗi thì dùng dữ liệu mẫu.
// Từng bảng được tải riêng nên bảng nào chưa tạo (VD chưa chạy migration footer) chỉ rơi về dữ liệu mẫu của bảng đó.
export function useContent() {
  // ready = đã tải xong dữ liệu thật; trước đó trang chưa vẽ nội dung để khách (và Google) không thấy dữ liệu mẫu chớp qua
  const [content, setContent] = useState({ ...Object.fromEntries(LIST_TABLES.map(t => [t, []])), settings: DEMO_SETTINGS, ready: false })
  useEffect(() => {
    const jobs = [
      ...LIST_TABLES.map(t => loadTable(t).then(rows => [t, rows])),
      // Đã có dữ liệu thật thì không lấy bản English của dữ liệu mẫu
      loadSettings().then(row => ['settings', row ? { ...DEMO_SETTINGS, en: {}, hero: {}, ...row } : DEMO_SETTINGS]),
    ]
    Promise.allSettled(jobs).then(async res => {
      // Nội dung mẫu dài chỉ tải khi có bảng lỗi (VD chưa chạy SQL) — trang thật bình thường không phải tải
      const failed = res.some(r => r.status !== 'fulfilled')
      const demo = failed ? (await import('./data.js')).demo : {}
      const next = { ...Object.fromEntries(LIST_TABLES.map(t => [t, demo[t] || []])), settings: DEMO_SETTINGS }
      res.forEach(r => {
        if (r.status === 'fulfilled') next[r.value[0]] = r.value[1]
        else console.warn('Supabase:', r.reason?.message)
      })
      // Áp dụng ẩn/hiện: bỏ mục visible=false; trường trong settings.hidden coi như để trống (footer tự ẩn)
      LIST_TABLES.forEach(t => { next[t] = (next[t] || []).filter(r => r.visible !== false) })
      next.posts = sortPosts(next.posts) // Blog: mới nhất lên trên
      next.settings = { ...next.settings }
      ;(next.settings.hidden || []).forEach(k => { next.settings[k] = '' })
      setContent({ ...next, ready: true })
    })
    // Realtime: bài mới / vừa duyệt hiện ngay, chỉ tải lại riêng bảng posts
    return subscribePosts(() => {
      loadTable('posts').then(rows => setContent(c => ({ ...c, posts: sortPosts(rows.filter(r => r.visible !== false)) }))).catch(() => {})
    }, 800)
  }, [])
  return content
}
