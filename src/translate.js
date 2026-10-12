// Gợi ý bản dịch Việt → Anh bằng MyMemory (miễn phí, không cần đăng ký).
// Hạn mức: ~5.000 ký tự/ngày; điền email ở Admin → Ngôn ngữ để tăng lên ~50.000 ký tự/ngày.
// Mỗi lần gọi tối đa 500 byte nên văn bản dài được cắt theo câu; Markdown dịch từng dòng, giữ nguyên ký hiệu.
import { at } from './adminLang.js'

const API = 'https://api.mymemory.translated.net/get'
const EMAIL_KEY = 'cm-mymemory-email'
export const getMmEmail = () => { try { return localStorage.getItem(EMAIL_KEY) || '' } catch { return '' } }
export const setMmEmail = v => { try { localStorage.setItem(EMAIL_KEY, v.trim()) } catch {} }

const bytes = s => new TextEncoder().encode(s).length
const MAX = 450
// Cắt thành các đoạn ≤ 450 byte, ưu tiên cắt ở cuối câu, rồi dấu phẩy, rồi khoảng trắng
function chunks(text) {
  if (bytes(text) <= MAX) return [text]
  const out = []; let rest = text
  while (bytes(rest) > MAX) {
    let cut = 0
    for (const re of [/[.!?…]\s/g, /[,;:]\s/g, /\s/g]) {
      let m, best = 0; re.lastIndex = 0
      while ((m = re.exec(rest))) { const end = m.index + m[0].length; if (bytes(rest.slice(0, end)) <= MAX) best = end; else break }
      if (best) { cut = best; break }
    }
    if (!cut) { cut = 1; while (bytes(rest.slice(0, cut + 1)) <= MAX) cut++ }
    out.push(rest.slice(0, cut)); rest = rest.slice(cut)
  }
  if (rest.trim()) out.push(rest)
  return out
}

const cache = new Map()
async function callApi(q) {
  if (cache.has(q)) return cache.get(q)
  const email = getMmEmail()
  const url = `${API}?q=${encodeURIComponent(q)}&langpair=vi|en${email ? `&de=${encodeURIComponent(email)}` : ''}`
  let r
  try { r = await fetch(url) } catch { throw new Error(at('Không kết nối được dịch vụ dịch MyMemory. Kiểm tra mạng rồi thử lại.')) }
  const d = await r.json().catch(() => null)
  const status = Number(d?.responseStatus)
  if (!r.ok || !d || (status && status !== 200)) {
    const detail = String(d?.responseDetails || '')
    if (r.status === 429 || status === 429 || /QUOTA|USED ALL AVAILABLE/i.test(detail)) throw new Error(at('Đã hết lượt dịch miễn phí hôm nay. Thử lại ngày mai, hoặc điền email ở Admin → Ngôn ngữ để tăng hạn mức.'))
    throw new Error(detail ? at('Dịch chưa được: {detail}', { detail }) : at('Dịch chưa được: lỗi {status}', { status: r.status }))
  }
  let out = String(d.responseData?.translatedText ?? '')
  // MyMemory đôi khi trả ký tự dạng mã HTML (&#39; …): đổi về ký tự thường
  out = out.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&')
  cache.set(q, out)
  return out
}

async function translateText(text) {
  const s = String(text ?? '')
  if (!s.trim()) return s
  const lead = s.match(/^\s*/)[0], tail = s.match(/\s*$/)[0]
  const parts = await Promise.all(chunks(s.trim()).map(callApi))
  return lead + parts.join(' ').replace(/\s+/g, ' ').trim() + tail
}

// Markdown: dịch phần chữ của từng dòng, giữ ký hiệu đầu dòng; bỏ qua khối code, ảnh, dòng trống
async function translateMarkdown(md) {
  const lines = String(md ?? '').replace(/\r/g, '').split('\n')
  let inCode = false
  const jobs = lines.map(l => {
    if (l.startsWith('```')) { inCode = !inCode; return null }
    if (inCode || !l.trim() || /^\s*!\[[^\]]*\]\([^)]*\)\s*$/.test(l)) return null
    const m = l.match(/^(\s*(?:#{1,6} |[-*+] |\d+\. |> ?)?)(.*)$/)
    return { prefix: m[1], body: m[2] }
  })
  const out = [...lines]
  // chạy 3 dòng một lúc cho nhanh mà không dồn dịch vụ
  for (let i = 0; i < jobs.length; i += 3) {
    await Promise.all(jobs.slice(i, i + 3).map(async (j, k) => {
      if (!j || !j.body.trim()) return
      out[i + k] = j.prefix + await translateText(j.body)
    }))
  }
  return out.join('\n')
}

/** Dịch một giá trị theo kiểu ô: text / textarea / markdown / tags (mảng hoặc chuỗi cách nhau dấu phẩy) */
export async function suggest(value, type = 'text') {
  if (type === 'markdown') return translateMarkdown(value)
  if (type === 'tags') {
    const list = (Array.isArray(value) ? value : String(value ?? '').split(',')).map(s => s.trim()).filter(Boolean)
    return Promise.all(list.map(translateText))
  }
  return translateText(value)
}
