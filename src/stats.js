// Đếm lượt xem trang chủ (bảng page_views) và đọc số liệu cho Admin → Tổng quan.
// - Không lưu IP, không cookie quảng cáo. "Người xem" = một mã ngẫu nhiên lưu trong trình duyệt khách.
// - Không đếm: trình duyệt đã đăng nhập Admin, bot, trình duyệt tự động; tải lại cùng trang trong 30 phút chỉ tính 1 lần.
// - Gửi sau khi trang đã hiện (lúc trình duyệt rảnh) để không làm chậm trang.
import { supabase, demoMode } from './supabase.js'

const NO_TRACK = 'cm-no-track', VID = 'cm-vid', SEEN = 'cm-seen', ENTRY = 'cm-entry'
const ls = { get: k => { try { return localStorage.getItem(k) } catch { return null } }, set: (k, v) => { try { localStorage.setItem(k, v) } catch {} } }
const ss = { get: k => { try { return sessionStorage.getItem(k) } catch { return null } }, set: (k, v) => { try { sessionStorage.setItem(k, v) } catch {} } }

/** Trình duyệt này không được đếm (gọi khi đăng nhập Admin) */
export const markOwner = () => ls.set(NO_TRACK, '1')

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|lighthouse|headless|bingpreview|embedly|whatsapp|zalo.*(bot|crawler)/i
function deviceOf() {
  const ua = navigator.userAgent || ''
  if (/iPad|Tablet|Nexus (7|9|10)|SM-T|Kindle|Silk/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'tablet'
  if (/Mobi|Android|iPhone|iPod/i.test(ua) || window.innerWidth < 640) return 'mobile'
  return 'desktop'
}
const NAMES = [[/(^|\.)google\./, 'Google'], [/(^|\.)bing\.com$/, 'Bing'], [/(^|\.)(facebook\.com|fb\.com|fb\.me|messenger\.com)$/, 'Facebook'], [/(^|\.)(linkedin\.com|lnkd\.in)$/, 'LinkedIn'],
  [/(^|\.)zalo\.(me|vn)$|(^|\.)zaloapp\.com$/, 'Zalo'], [/(^|\.)(t\.co|twitter\.com|x\.com)$/, 'X'], [/(^|\.)youtube\.com$|(^|\.)youtu\.be$/, 'YouTube'], [/(^|\.)instagram\.com$/, 'Instagram'], [/(^|\.)tiktok\.com$/, 'TikTok'], [/(^|\.)coccoc\.com$/, 'Cốc Cốc']] // vi-only: tên trình duyệt
/** Khách đến từ đâu: ?utm_source=… hoặc trang trước đó (chỉ lấy tên miền) */
function sourceOf() {
  try {
    const utm = new URLSearchParams(location.search).get('utm_source')
    if (utm) return utm.trim().slice(0, 40)
    if (!document.referrer) return 'direct'
    const host = new URL(document.referrer).hostname.replace(/^www\./, '')
    if (!host || host === location.hostname.replace(/^www\./, '')) return 'direct'
    for (const [re, name] of NAMES) if (re.test(host)) return name
    return host.slice(0, 60)
  } catch { return 'direct' }
}

/** Ghi một lượt xem. kind: home | blog | post | project | notfound */
export function trackView({ kind, ref_id = null, path = '/', lang = 'vi' }) {
  try {
    if (ls.get(NO_TRACK) === '1' || navigator.webdriver || BOT.test(navigator.userAgent || '')) return
    // Bài / dự án: tính theo id (link đổi tên không bị đếm 2 lần); trang khác: theo đường dẫn
    const key = ref_id != null ? `${kind}|${ref_id}` : `${kind}|${path}`
    const seen = JSON.parse(ss.get(SEEN) || '{}')
    if (seen[key] && Date.now() - seen[key] < 30 * 60e3) return
    seen[key] = Date.now(); ss.set(SEEN, JSON.stringify(seen))
    let vid = ls.get(VID)
    if (!vid) { vid = (crypto.randomUUID?.() || String(Math.random()).slice(2) + Date.now()).replace(/-/g, '').slice(0, 24); ls.set(VID, vid) }
    // Nguồn khách chỉ ghi ở trang đầu tiên của lượt ghé thăm
    const first = !ss.get(ENTRY); if (first) ss.set(ENTRY, '1')
    const row = { kind, ref_id, path: String(path).slice(0, 300), source: first ? sourceOf() : null, device: deviceOf(), lang: lang === 'en' ? 'en' : 'vi', visitor: vid }
    const send = () => supabase.from('page_views').insert(row).then(() => {}, () => {})
    if ('requestIdleCallback' in window) requestIdleCallback(send, { timeout: 4000 }); else setTimeout(send, 1500)
  } catch { /* đếm lỗi thì bỏ qua, không ảnh hưởng trang */ }
}

/** Số liệu cho dashboard (Admin). Bản demo trả thêm sample: true */
export async function loadStats(days) {
  const { data, error } = await supabase.rpc('view_stats', { days })
  if (error) throw error
  return { sample: demoMode, ...data }
}
