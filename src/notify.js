// Cấu hình và phát thông báo trong Admin (Admin → Cài đặt → Thông báo). Lưu ở admin_settings.notify.
import { playSound } from './sounds.js'
import { supabase } from './supabase.js'

// Cài đặt riêng của Admin (bảng admin_settings, khách không đọc được)
export const loadAdminSettings = () => supabase.from('admin_settings').select('*').eq('id', 1).maybeSingle().then(({ data, error }) => { if (error) throw error; return data })

export const EVENTS = [
  ['message', 'Tin nhắn mới', 'Khi khách gửi form Liên hệ trên trang chủ.'],
  ['post', 'Bài mới từ Easy AI', 'Khi Easy AI gửi bài sang Blog.'],
]
export const SYSTEM_MODES = [['off', 'Tắt'], ['hidden', 'Khi đang ở tab khác'], ['always', 'Luôn luôn']]

export const DEFAULT_NOTIFY = {
  email_to: '',
  volume: 70,
  events: {
    message: { toast: true, sound: 'chime', system: 'hidden', tab: true, email: true, push: true },
    post: { toast: true, sound: 'pop', system: 'hidden', tab: true, email: false, push: true },
  },
}
export function notifyOf(settings) {
  const n = settings?.notify && typeof settings.notify === 'object' ? settings.notify : {}
  return {
    ...DEFAULT_NOTIFY, ...n,
    events: Object.fromEntries(EVENTS.map(([k]) => [k, { ...DEFAULT_NOTIFY.events[k], ...(n.events?.[k] || {}) }])),
  }
}

export const canSystem = () => typeof window !== 'undefined' && 'Notification' in window
export const systemPermission = () => (canSystem() ? Notification.permission : 'unsupported')
export const askPermission = async () => (canSystem() ? Notification.requestPermission() : 'unsupported')

/**
 * Phát thông báo cho một sự kiện theo cấu hình: âm thanh, thông báo hệ thống, thông báo trong trang.
 * opts: { title, body, onOpen, toast(text) } — onOpen chạy khi bấm vào thông báo hệ thống.
 */
export function fire(cfg, event, { title, body, onOpen, toast }) {
  const e = cfg.events[event]; if (!e) return
  playSound(e.sound, cfg.volume)
  if (e.toast && toast) toast(title)
  const wantSystem = e.system === 'always' || (e.system === 'hidden' && document.hidden)
  if (wantSystem && systemPermission() === 'granted') {
    try {
      const n = new Notification(title, { body: String(body || '').slice(0, 180), tag: `cm-${event}`, renotify: true, icon: document.querySelector('link[rel="icon"]')?.href })
      n.onclick = () => { window.focus(); onOpen?.(); n.close() }
    } catch { /* một số trình duyệt điện thoại không cho tạo thông báo trực tiếp */ }
  }
}

/** Số chưa xử lý hiện trên tab trình duyệt, VD "(3) Tin nhắn — Admin" */
export function setTabCount(n, base) {
  document.title = n > 0 ? `(${n}) ${base}` : base
}
