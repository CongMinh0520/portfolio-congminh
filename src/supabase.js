import { createClient } from '@supabase/supabase-js'
import { at } from './adminLang.js'
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
export const configured = Boolean(url && key)
export const demoMode = !configured
// Chưa có .env → dùng backend demo trong trình duyệt để thử đầy đủ tính năng.
// Backend demo (kèm nội dung mẫu) chỉ tải khi chạy demo, web thật không phải tải phần này.
const demoMod = configured ? null : await import('./demoBackend.js')
export const supabase = configured ? createClient(url, key) : demoMod.demoClient
/** Tài khoản demo (email, mật khẩu) để điền sẵn ở trang đăng nhập bản demo */
export const demoAccount = () => (demoMod ? demoMod.demoAccount() : { email: '', password: '' })

// Thu nhỏ ảnh trước khi lưu (cạnh dài tối đa `max` px) để trang tải nhanh
async function shrink(file, max) {
  const bmp = await createImageBitmap(file)
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s)
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height)
  return new Promise(r => c.toBlob(r, 'image/webp', 0.86))
}

// Tải ảnh lên: Supabase Storage (bucket "media") hoặc, ở chế độ demo, lưu thẳng dạng data URL
export async function uploadImage(file, max = 900) {
  if (!file?.type?.startsWith('image/') && !/\.ico$/i.test(file?.name || '')) throw new Error(at('File này không phải ảnh. Hãy chọn ảnh JPG, PNG hoặc WebP.'))
  // SVG, GIF, ICO giữ nguyên; max = 0 nghĩa là không thu nhỏ (VD favicon)
  const keep = !max || ['image/svg+xml', 'image/gif', 'image/x-icon', 'image/vnd.microsoft.icon'].includes(file.type) || /\.ico$/i.test(file.name)
  const blob = keep ? file : await shrink(file, max)
  if (demoMode) return new Promise((ok, fail) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = fail; r.readAsDataURL(blob) })
  const ext = blob.type === 'image/webp' ? 'webp' : (file.name.split('.').pop() || 'img')
  // Tên file có giờ + mã ngẫu nhiên nên không bao giờ bị ghi đè → cho trình duyệt giữ 1 năm
  const path = `hero/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from('media').upload(path, blob, { contentType: blob.type || 'image/x-icon', upsert: false, cacheControl: '31536000' })
  if (error) throw new Error(at('Không tải được ảnh: {msg}. Đã chạy supabase/migration-hero.sql chưa?', { msg: error.message }))
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl
}

// Tải file PDF (CV) lên kho "media". Bản demo lưu dạng data URL nên giới hạn nhỏ hơn.
export async function uploadPdf(file) {
  if (!file || (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name || ''))) throw new Error(at('Chỉ nhận file PDF.'))
  const limit = demoMode ? 2 : 10
  if (file.size > limit * 1024 * 1024) throw new Error(at('File lớn quá (tối đa {n} MB).', { n: limit }))
  if (demoMode) return new Promise((ok, fail) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = fail; r.readAsDataURL(file) })
  const path = `cv/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.pdf`
  const { error } = await supabase.storage.from('media').upload(path, file, { contentType: 'application/pdf', upsert: false, cacheControl: '31536000' })
  if (error) throw new Error(at('Không tải được file: {msg}', { msg: error.message }))
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl
}
