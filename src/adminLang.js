// Ngôn ngữ giao diện Admin (Tiếng Việt / English). Chọn ở Admin → Tài khoản của tôi.
// - Chữ trong code Admin viết bằng tiếng Việt và bọc trong a('...') (trong component: const a = useA()).
// - Bản English nằm trong src/admin-en/*.js, khóa là đúng câu tiếng Việt. Thiếu bản English thì hiện tiếng Việt.
// - Có số/tên thay vào thì viết {n}, {name}… rồi truyền a('Xóa {n} mục?', { n }).
// - Lựa chọn lưu theo tài khoản (user_metadata.admin_lang) và trong trình duyệt để mở trang là đúng ngôn ngữ ngay.
import { useSyncExternalStore } from 'react'

const KEY = 'cm-admin-lang'
let lang = (() => { try { return localStorage.getItem(KEY) === 'en' ? 'en' : 'vi' } catch { return 'vi' } })()
const subs = new Set()
// Bảng English chỉ tải khi cần (Admin để English) để trang chủ không phải tải phần này
let EN = {}, dict = null, ver = 0
export const adminDictReady = () => lang !== 'en' || dict === 'done'
export function loadAdminDict() {
  if (lang !== 'en' || dict) return dict === 'done' ? Promise.resolve() : dict || Promise.resolve()
  dict = import('./admin-en/index.js').then(m => { EN = m.default; dict = 'done'; ver++; subs.forEach(f => f()) }, () => { dict = null })
  return dict
}

export const ADMIN_LANGS = [['vi', 'Tiếng Việt'], ['en', 'English']]
export const getAdminLang = () => lang
export function setAdminLang(l) {
  const v = l === 'en' ? 'en' : 'vi'
  try { localStorage.setItem(KEY, v) } catch { /* trình duyệt chặn lưu: vẫn đổi trong phiên này */ }
  if (v === lang) return
  lang = v; ver++; loadAdminDict(); subs.forEach(f => f())
}
export const useAdminLang = () => useSyncExternalStore(cb => { subs.add(cb); return () => subs.delete(cb) }, () => lang)

/** Dịch một câu giao diện Admin; dùng được cả ngoài component (toast, thông báo…) */
export function at(vi, vars) {
  let s = vi == null ? '' : String(vi)
  if (lang === 'en' && Object.prototype.hasOwnProperty.call(EN, s)) s = EN[s]
  // Thay tất cả {biến} một lượt (không để chữ người dùng có '{…}' hay '$&' bị thay nhầm)
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m))
  return s
}
/** Trong component: const a = useA() — component tự vẽ lại khi đổi ngôn ngữ */
export function useA() { useSyncExternalStore(cb => { subs.add(cb); return () => subs.delete(cb) }, () => ver); return at }
/** Mã vùng cho ngày giờ trong Admin */
export const adminLocale = () => (lang === 'en' ? 'en-US' : 'vi-VN')
