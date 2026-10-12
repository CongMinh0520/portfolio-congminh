// Theo dõi thay đổi một bảng theo thời gian thực (Supabase Realtime).
// Gộp nhiều thay đổi liên tiếp thành một lần gọi (mặc định 600ms) để trang không bị giật.
import { supabase } from './supabase.js'

export function subscribeTable(table, onChange, delay = 600) {
  if (!supabase.channel) return () => {}
  let timer, batch = []
  const ch = supabase
    .channel(`${table}-live-${Math.random().toString(36).slice(2, 8)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, evt => {
      batch.push(evt); clearTimeout(timer)
      timer = setTimeout(() => { const b = batch; batch = []; onChange(b) }, delay)
    })
    .subscribe()
  return () => { clearTimeout(timer); supabase.removeChannel(ch) }
}
export const subscribePosts = (onChange, delay) => subscribeTable('posts', onChange, delay)
