// Admin → Tin nhắn: ô soạn trả lời ở đáy hội thoại. Gửi email cho khách (Resend), mở trong Gmail, hoặc lưu ghi chú nội bộ.
// Có mẫu trả lời nhanh (gõ "/"), AI viết nháp, đính kèm file, định dạng **đậm** _nghiêng_ và chữ ký.
import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase, demoMode, uploadAttachment } from './supabase.js'
import { useA, at, adminLocale } from './adminLang.js'

const grad = 'bg-gradient-to-r from-pink to-purple'
const btn = 'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition disabled:opacity-50'
const ghost = `${btn} border border-line text-[#c9cbd8] hover:border-[#3a3f5a] hover:bg-white/5 hover:text-white`
const input = 'w-full rounded-lg border border-line bg-[#0b0d16] px-3 py-2 text-sm outline-none transition focus:border-purple focus:ring-2 focus:ring-purple/25'
const pop = 'absolute bottom-full z-40 mb-2 rounded-xl border border-line bg-[#0d0f1a] p-2 shadow-[0_20px_60px_#000000b0]'

const ICONS = {
  clip: 'M21 11.5l-8.6 8.6a5 5 0 0 1-7.1-7.1l8.6-8.6a3.3 3.3 0 0 1 4.7 4.7l-8.6 8.6a1.7 1.7 0 0 1-2.4-2.4l7.9-7.9',
  tpl: 'M4 5h16v11H8l-4 4z M8 10h.01 M12 10h.01 M16 10h.01',
  ai: 'M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2-2.2-.8 2.2-.8z',
  smile: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M8.5 14.5s1.3 2 3.5 2 3.5-2 3.5-2 M9 9.5h.01 M15 9.5h.01',
  send: 'M22 2L11 13 M22 2l-7 20-4-9-9-4z',
  mail: 'M3 6h18v12H3z M3 7l9 6 9-6',
  note: 'M5 3h10l4 4v14H5z M15 3v4h4 M8 12h8 M8 16h5',
  file: 'M6 2h8l6 6v14H6z M14 2v6h6',
  x: 'M18 6L6 18 M6 6l12 12',
  down: 'M6 9l6 6 6-6',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  pen: 'M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
}
export const Icon = ({ d, className = 'size-4' }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d={ICONS[d] || d} /></svg>
const EMOJIS = '😀 😊 😄 😉 🙂 😍 🥰 🤗 🙏 👍 👏 🙌 💪 👋 🤝 ✌️ 👌 🎉 🎊 ✨ 🔥 💯 ❤️ 💜 💙 💚 ⭐ 🌟 ✅ ☑️ 📎 📄 📅 ⏰ 📞 💬 📧 🚀 💡 😅'.split(' ')
export const fmtSize = n => (!n ? '' : n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`)
const fill = (s, t) => String(s || '').replace(/\{(name|email)\}/g, (_, k) => (k === 'name' ? t.name : t.email) || '')

/* Mẫu trả lời có sẵn khi chưa tự tạo (lưu ở admin_settings.reply.templates) */
export const defaultTemplates = cvFile => [
  { id: 't-camon', key: 'camon', title: at('Cảm ơn đã liên hệ'), body: at('Chào {name},\n\nCảm ơn bạn đã liên hệ. Mình đã đọc tin nhắn và sẽ phản hồi chi tiết sớm nhất có thể.'), files: [] },
  { id: 't-cv', key: 'cv', title: at('Gửi CV'), body: at('Chào {name},\n\nMình gửi kèm CV trong thư này. Nếu cần thêm thông tin gì, bạn cứ trả lời thư này nhé.'), files: cvFile ? [cvFile] : [] },
  { id: 't-hen', key: 'hen', title: at('Hẹn lịch trao đổi'), body: at('Chào {name},\n\nMình rất sẵn lòng trao đổi thêm. Bạn có tiện gọi ngắn vào **[thời gian]** không? Nếu không, bạn gợi ý giúp mình một khung giờ khác nhé.'), files: [] },
]

/* Đóng popover khi bấm ra ngoài hoặc Esc */
function useDismiss(ref, open, close) {
  useEffect(() => {
    if (!open) return
    const h = e => { if (e.key === 'Escape' || (e.type === 'mousedown' && !ref.current?.contains(e.target))) close() }
    document.addEventListener('mousedown', h); document.addEventListener('keydown', h)
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', h) }
  }, [open])
}

/* Nút tròn có chữ gợi ý khi rê chuột */
function RoundBtn({ icon, label, onClick, active, disabled, children }) {
  return (
    <span className="group relative">
      <button type="button" onClick={onClick} disabled={disabled} aria-label={label} aria-expanded={active}
        className={`grid size-9 place-items-center rounded-full border transition disabled:opacity-40 ${active ? 'border-purple bg-purple/20 text-white' : 'border-line text-[#c9cbd8] hover:border-[#3a3f5a] hover:bg-white/5 hover:text-white'}`}>
        {children || <Icon d={icon} />}
      </button>
      {!active && <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-[#1d2033] px-2.5 py-1 text-xs font-medium text-[#dfe0ea] shadow-lg group-hover:block">{label}</span>}
    </span>
  )
}

export function FileChip({ f, onRemove, href }) {
  const a = useA()
  const Tag = href ? 'a' : 'span'
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-line bg-[#0b0d16] py-1 pl-2 pr-1.5 text-xs text-[#dfe0ea]">
      <Icon d="file" className="size-3.5 flex-none text-[#b5aaff]" />
      <Tag {...(href ? { href, target: '_blank', rel: 'noreferrer', download: f.name } : {})} className={`min-w-0 truncate ${href ? 'hover:underline' : ''}`}>{f.name}</Tag>
      {f.uploading ? <span className="text-muted">{a('đang tải…')}</span> : f.size ? <span className="flex-none text-muted">{fmtSize(f.size)}</span> : null}
      {onRemove && <button type="button" onClick={onRemove} aria-label={a('Bỏ file {name}', { name: f.name })} className="grid size-5 flex-none place-items-center rounded text-muted hover:bg-white/10 hover:text-white"><Icon d="x" className="size-3" /></button>}
    </span>
  )
}

/* ---------- Bản nháp theo từng hội thoại (lưu trong trình duyệt) ---------- */
const DRAFTS = 'cm-reply-drafts'
const readDrafts = () => { try { return JSON.parse(localStorage.getItem(DRAFTS)) || {} } catch { return {} } }
const writeDrafts = d => { try { localStorage.setItem(DRAFTS, JSON.stringify(d)) } catch { /* trình duyệt chặn lưu: nháp chỉ còn trong phiên */ } }

/** Gửi một thư trả lời (cũng dùng cho nút "Gửi lại" ở bong bóng lỗi). Trả { ok, code, error } */
export async function sendReplyMail(payload) {
  if (demoMode) {
    await new Promise(r => setTimeout(r, 500))
    const row = { name: payload.from_name, email: payload.to, message: payload.text, subject: payload.subject, attachments: payload.attachments, direction: 'out', status: 'sent', read: true }
    const { error } = payload.retryId ? await supabase.from('messages').update(row).eq('id', payload.retryId) : await supabase.from('messages').insert(row)
    return error ? { ok: false, error: error.message } : { ok: true }
  }
  const { data, error } = await supabase.functions.invoke('gui-tin-nhan', { body: { action: 'reply', ...payload } })
  if (error) return { ok: false, code: 'fn', error: error.message }
  return data || { ok: false, error: '?' }
}
export function replyErrorText(r) {
  if (r.code === 'domain') return at('Resend chưa cho gửi tới email này: cần verify tên miền trên Resend (onboarding@resend.dev chỉ gửi được tới email chủ tài khoản). Tạm thời dùng "Mở trong Gmail".')
  if (r.code === 'no-key') return at('Máy chủ chưa có RESEND_API_KEY. Bấm nút "?" cạnh chữ Tin nhắn để xem cách bật.')
  if (r.code === 'fn') return at('Hàm gui-tin-nhan chưa có bản mới hoặc lỗi ({msg}). Deploy lại hàm theo nút "?".', { msg: r.error })
  return at('Chưa gửi được: {msg}', { msg: r.error })
}

export default function ReplyComposer({ thread, quoteMsg, cfg, library, fromName, owner, toast, onSaved, onClose, onManage, onLibraryAdd, onCfgSaved }) {
  const a = useA()
  const key = thread.key
  const defSubject = a('Re: Liên hệ từ portfolio Công Minh')
  const [drafts, setDrafts] = useState(readDrafts)
  const d = drafts[key] || {}
  const text = d.text || '', files = d.files || [], subject = d.subject ?? defSubject
  const [mode, setMode] = useState('email')
  const [editSubject, setEditSubject] = useState(false)
  const [quote, setQuote] = useState(true)
  const [sign, setSign] = useState(cfg.signature_on !== false)
  const [open, setOpen] = useState('') // tpl | lib | ai | emoji | more
  const [fmt, setFmt] = useState(false) // hàng nút định dạng
  const [quoteOpen, setQuoteOpen] = useState(false) // trích dẫn đang mở ra xem
  const [editSig, setEditSig] = useState(false) // đang sửa chữ ký ngay trong thư
  const [slash, setSlash] = useState(null) // chữ sau dấu "/" khi gõ mẫu nhanh
  const [hi, setHi] = useState(0)
  const [busy, setBusy] = useState('')
  const [ai, setAi] = useState({ intent: 'thanks', lang: 'auto', hint: '' })
  const ta = useRef(null), box = useRef(null), fileIn = useRef(null)
  useDismiss(box, !!open, () => { setOpen(''); setSlash(null) })
  useEffect(() => { setSign(cfg.signature_on !== false) }, [cfg.signature_on])
  // Đổi hội thoại: về chế độ Email, đóng popover
  useEffect(() => { setMode('email'); setOpen(''); setSlash(null); setEditSubject(false); setQuoteOpen(false); setEditSig(false) }, [key])

  const patch = p => setDrafts(all => {
    const next = { ...all, [key]: { ...all[key], ...p } }
    const n = next[key]
    if (!n.text && !(n.files || []).length && (n.subject == null || n.subject === defSubject) && n.sig == null) delete next[key]
    // file đang tải dở không lưu lại (tải lại trang là mất)
    writeDrafts(Object.fromEntries(Object.entries(next).map(([k, v]) => [k, { ...v, files: (v.files || []).filter(f => !f.uploading) }])))
    return next
  })
  const setText = v => patch({ text: v })
  // Textarea tự giãn theo nội dung
  useEffect(() => { const el = ta.current; if (!el) return; el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 288)}px` }, [text, key, mode])

  const templates = cfg.templates || defaultTemplates(library.find(f => f.cv))
  const tplShown = useMemo(() => {
    const q = (slash ?? '').toLowerCase()
    return templates.filter(t => !q || t.key.toLowerCase().includes(q) || t.title.toLowerCase().includes(q))
  }, [templates, slash])

  const insertAt = (str, replaceBack = 0) => {
    const el = ta.current; const s = el ? el.selectionStart : text.length; const e = el ? el.selectionEnd : text.length
    const next = text.slice(0, s - replaceBack) + str + text.slice(e)
    setText(next)
    requestAnimationFrame(() => { if (!el) return; el.focus(); const p = s - replaceBack + str.length; el.setSelectionRange(p, p) })
  }
  const addFiles = list => {
    const have = new Set(files.map(f => f.url))
    const add = list.filter(f => !have.has(f.url)).slice(0, Math.max(0, 5 - files.length))
    if (add.length < list.filter(f => !have.has(f.url)).length) toast(a('Tối đa 5 file mỗi thư.'), 'error')
    if (add.length) patch({ files: [...files, ...add.map(({ name, url, size, type }) => ({ name, url, size, type }))] })
  }
  const applyTemplate = t => {
    const body = fill(t.body, thread)
    if (slash != null) insertAt(body, slash.length + 1)
    else if (!text.trim()) setText(body)
    else insertAt(body)
    if (t.files?.length) addFiles(t.files)
    setOpen(''); setSlash(null); setHi(0)
  }

  // Chọn file từ máy → tải lên kho, hiện chip "đang tải…"
  const pickFiles = async e => {
    const list = [...(e.target.files || [])]; e.target.value = ''
    if (!list.length) return
    if (files.length + list.length > 5) return toast(a('Tối đa 5 file mỗi thư.'), 'error')
    const temp = list.map((f, i) => ({ name: f.name, size: f.size, type: f.type, url: `uploading:${Date.now()}:${i}`, uploading: true }))
    let cur = [...files, ...temp]; patch({ files: cur })
    for (const [i, f] of list.entries()) {
      try {
        const url = await uploadAttachment(f)
        const done = { name: f.name, size: f.size, type: f.type, url }
        cur = cur.map(x => (x.url === temp[i].url ? done : x)); onLibraryAdd?.(done)
      } catch (err) { cur = cur.filter(x => x.url !== temp[i].url); toast(err.message, 'error') }
      patch({ files: cur })
    }
  }

  const wrap = mark => {
    const el = ta.current; if (!el) return
    const s = el.selectionStart, e = el.selectionEnd, sel = text.slice(s, e) || a('chữ')
    setText(text.slice(0, s) + mark + sel + mark + text.slice(e))
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + mark.length, s + mark.length + sel.length) })
  }
  // Link: thư tự nhận link dạng https://…, nên chèn "chữ (link)" hoặc chỉ link
  const addLink = () => {
    const el = ta.current; if (!el) return
    const s = el.selectionStart, e = el.selectionEnd, sel = text.slice(s, e)
    let url = window.prompt(a('Dán đường link (https://…)'), 'https://')?.trim()
    if (!url || url === 'https://') return
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`
    const str = sel ? `${sel} (${url})` : url
    setText(text.slice(0, s) + str + text.slice(e))
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + str.length, s + str.length) })
  }
  // Danh sách: thêm "- " vào đầu các dòng đang chọn (hoặc dòng đang đứng)
  const addList = () => {
    const el = ta.current; if (!el) return
    const s = text.lastIndexOf('\n', el.selectionStart - 1) + 1
    const eIdx = text.indexOf('\n', el.selectionEnd); const e = eIdx < 0 ? text.length : eIdx
    const block = text.slice(s, e).split('\n').map(l => (/^\s*[-*•]\s/.test(l) ? l : `- ${l}`)).join('\n')
    setText(text.slice(0, s) + block + text.slice(e))
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + block.length, s + block.length) })
  }
  const onKey = e => {
    if (slash != null && open === 'tpl' && tplShown.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); return setHi(h => (h + 1) % tplShown.length) }
      if (e.key === 'ArrowUp') { e.preventDefault(); return setHi(h => (h - 1 + tplShown.length) % tplShown.length) }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); return applyTemplate(tplShown[Math.min(hi, tplShown.length - 1)]) }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); return submit(false) }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'i')) { e.preventDefault(); wrap(e.key === 'b' ? '**' : '_') }
  }
  const onChange = e => {
    const v = e.target.value; setText(v)
    // Gõ "/" ở đầu dòng → mở danh sách mẫu, lọc theo chữ gõ tiếp
    const m = v.slice(0, e.target.selectionStart).match(/(?:^|\n)\/([\w-]*)$/)
    if (m) { setSlash(m[1]); setOpen('tpl'); setHi(0) } else if (slash != null) { setSlash(null); if (open === 'tpl') setOpen('') }
  }

  // Chữ ký của thư này: bản đã sửa riêng (lưu trong nháp) hoặc chữ ký mặc định
  const sigDefault = cfg.signature || ''
  const sigText = (d.sig ?? sigDefault).trim()
  const [sigBusy, setSigBusy] = useState(false)
  const saveSigDefault = async () => {
    setSigBusy(true)
    const reply = { ...cfg, signature: (d.sig ?? sigDefault).slice(0, 1000), signature_on: cfg.signature_on !== false }
    const { error } = await supabase.from('admin_settings').upsert({ id: 1, reply })
    setSigBusy(false)
    if (error) return toast(a('{msg}. Đã chạy lại supabase/migration-messages.sql chưa?', { msg: error.message }), 'error')
    onCfgSaved?.(reply); patch({ sig: undefined }); setEditSig(false); toast(a('Đã lưu chữ ký mặc định'))
  }
  const quoteBody = quote && quoteMsg ? { name: quoteMsg.name, message: quoteMsg.message, when: new Date(quoteMsg.created_at).toLocaleString(adminLocale(), { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'numeric', year: 'numeric' }) } : null
  // Xoá nháp trong trình duyệt ngay (không đợi state): "Gửi và đóng" gỡ ô soạn luôn nên hàm cập nhật state có thể không kịp chạy
  const clear = () => {
    const saved = readDrafts(); delete saved[key]; writeDrafts(saved)
    setDrafts(all => { const next = { ...all }; delete next[key]; return next })
  }
  const uploading = files.some(f => f.uploading)

  const submit = async closeAfter => {
    if (busy) return
    if (!text.trim()) { ta.current?.focus(); return toast(mode === 'note' ? a('Chưa có nội dung ghi chú.') : a('Chưa có nội dung thư.'), 'error') }
    if (uploading) return toast(a('Đợi file tải lên xong đã.'), 'error')
    setBusy('send')
    if (mode === 'note') {
      const { error } = await supabase.from('messages').insert({ name: fromName, email: thread.email, message: text.trim(), direction: 'note', read: true, attachments: files })
      setBusy('')
      if (error) return toast(a('{msg}. Đã chạy lại supabase/migration-messages.sql chưa?', { msg: error.message }), 'error')
      clear(); toast(a('Đã lưu ghi chú')); onSaved(); if (closeAfter) onClose()
      return
    }
    const r = await sendReplyMail({ to: thread.email, subject: subject.trim() || defSubject, text: text.trim(), from_name: fromName, attachments: files, signature: sign ? sigText : '', quote: quoteBody })
    setBusy('')
    onSaved()
    if (!r.ok) return toast(replyErrorText(r), 'error')
    clear(); toast(demoMode ? a('Bản demo: đã lưu thư trả lời (không gửi email thật)') : a('Đã gửi email tới {email}', { email: thread.email }), 'mail')
    if (closeAfter) onClose()
  }

  // Dự phòng khi Resend chưa gửi được cho khách: mở thư soạn sẵn trong Gmail / app email, lưu lại vào hội thoại
  const openExternal = async kind => {
    setOpen('')
    if (!text.trim()) { ta.current?.focus(); return toast(a('Chưa có nội dung thư.'), 'error') }
    const parts = [text.trim()]
    if (sign && sigText) parts.push(`--\n${sigText}`)
    const real = files.filter(f => /^https?:/.test(f.url))
    if (real.length) parts.push(`${a('File đính kèm:')}\n${real.map(f => `${f.name}: ${f.url}`).join('\n')}`)
    if (quoteBody) parts.push(`${quoteBody.when}, ${quoteBody.name}:\n> ${quoteBody.message.replace(/\n/g, '\n> ')}`)
    const body = parts.join('\n\n'), su = subject.trim() || defSubject
    const url = kind === 'gmail'
      ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(thread.email)}&su=${encodeURIComponent(su)}&body=${encodeURIComponent(body)}`
      : `mailto:${thread.email}?subject=${encodeURIComponent(su)}&body=${encodeURIComponent(body)}`
    window.open(url, kind === 'gmail' ? '_blank' : '_self', 'noopener')
    const { error } = await supabase.from('messages').insert({ name: fromName, email: thread.email, message: text.trim(), subject: su, attachments: real, direction: 'out', status: 'external', read: true })
    if (error) return toast(error.message, 'error')
    clear(); onSaved()
  }

  const draftAi = async () => {
    if (text.trim() && !window.confirm(a('Thay nội dung đang soạn bằng bản nháp của AI?'))) return
    setBusy('ai')
    let r
    if (demoMode) {
      await new Promise(res => setTimeout(res, 900))
      r = { ok: true, text: a('Chào {name},\n\nCảm ơn bạn đã nhắn cho mình qua portfolio. Mình đã đọc kỹ tin nhắn của bạn và rất vui được trao đổi thêm.\n\nBạn có tiện gọi ngắn vào **[thời gian]** không? Nếu chưa tiện, bạn cứ gợi ý một khung giờ khác nhé.', { name: thread.name }) }
    } else {
      const { data, error } = await supabase.functions.invoke('gui-tin-nhan', { body: { action: 'draft', email: thread.email, intent: ai.intent, lang: ai.lang, hint: ai.hint, owner } })
      r = error ? { ok: false, code: 'fn', error: error.message } : data || {}
    }
    setBusy('')
    if (!r.ok) return toast(r.code === 'no-ai' ? a('Chưa bật AI: đặt secret ANTHROPIC_API_KEY cho hàm gui-tin-nhan (xem nút "?").') : a('AI chưa viết được: {msg}', { msg: r.error || '?' }), 'error')
    setText(r.text); setOpen('')
    requestAnimationFrame(() => ta.current?.focus())
  }

  const note = mode === 'note'
  const toggle = k => setOpen(o => (o === k ? '' : k))
  return (
    <div className="border-t border-line p-3 sm:px-4">
      <div ref={box} className={`relative rounded-2xl border transition focus-within:ring-2 ${note ? 'border-[#f8d27c]/40 bg-[#f8d27c]/[0.06] focus-within:ring-[#f8d27c]/20' : 'border-line bg-[#0b0d16] focus-within:border-purple/70 focus-within:ring-purple/20'}`}>
        {/* Hàng trên: Email / Ghi chú + người nhận, tiêu đề */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 pt-3">
          <div role="tablist" aria-label={a('Kiểu trả lời')} className="inline-flex rounded-full bg-white/[0.06] p-0.5 text-[13px]">
            {[['email', 'mail', a('Email')], ['note', 'note', a('Ghi chú')]].map(([k, ic, l]) => (
              <button key={k} role="tab" type="button" aria-selected={mode === k} onClick={() => { setMode(k); ta.current?.focus() }}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium transition ${mode === k ? (k === 'note' ? 'bg-[#f8d27c]/20 text-[#f8d27c]' : 'bg-white/10 text-white') : 'text-muted hover:text-white'}`}>
                <Icon d={ic} className="size-3.5" />{l}
              </button>
            ))}
          </div>
          {note ? <span className="text-xs text-[#f8d27c]/80">{a('Chỉ Admin thấy, không gửi cho khách.')}</span> : (
            // Email người nhận luôn hiện đủ (gửi CV phải chắc đúng người); tiêu đề cắt gọn 1 dòng, màn hẹp thì xuống dòng riêng
            <div className="flex min-w-0 flex-1 basis-full flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted sm:basis-0">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="flex-none">{a('Tới')}</span>
                <span className="min-w-0 break-all rounded-md bg-white/[0.06] px-2 py-0.5 text-[#dfe0ea]">{thread.email}</span>
              </span>
              <span className="flex min-w-0 basis-full items-center gap-1.5 sm:basis-0 sm:flex-1">
                <span className="hidden flex-none sm:inline">·</span>
                {editSubject
                  ? <input autoFocus aria-label={a('Tiêu đề')} maxLength={200} value={subject} onChange={e => patch({ subject: e.target.value })} onBlur={() => setEditSubject(false)} onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); setEditSubject(false); ta.current?.focus() } }}
                      className="min-w-0 flex-1 rounded-md border border-line bg-transparent px-2 py-0.5 text-xs text-white outline-none focus:border-purple" />
                  : <button type="button" onClick={() => setEditSubject(true)} title={`${a('Sửa tiêu đề')}: ${subject || defSubject}`} className="group/s flex min-w-0 items-center gap-1 rounded-md px-1 py-0.5 text-left hover:bg-white/5 hover:text-white">
                      <span className="truncate">{subject || defSubject}</span><Icon d="pen" className="size-3 flex-none opacity-60 group-hover/s:opacity-100" />
                    </button>}
              </span>
            </div>
          )}
        </div>

        {fmt && (
          <div className="mx-3 mt-2 flex items-center gap-1 border-y border-line py-1">
            {[['M7 5h6a3.5 3.5 0 0 1 0 7H7z M7 12h7a3.5 3.5 0 0 1 0 7H7z', a('Đậm (Ctrl + B)'), () => wrap('**')],
              ['M10 5h8 M6 19h8 M14 5l-4 14', a('Nghiêng (Ctrl + I)'), () => wrap('_')],
              ['M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1', a('Chèn link'), addLink],
              ['M9 6h11 M9 12h11 M9 18h11 M4.5 6h.01 M4.5 12h.01 M4.5 18h.01', a('Danh sách'), addList]].map(([d, l, fn]) => (
              <button key={l} type="button" onMouseDown={e => e.preventDefault()} onClick={fn} title={l} aria-label={l}
                className="grid size-8 place-items-center rounded-md text-[#c9cbd8] transition hover:bg-white/10 hover:text-white"><Icon d={d} /></button>
            ))}
          </div>
        )}
        <textarea ref={ta} rows={3} value={text} onChange={onChange} onKeyDown={onKey} aria-label={note ? a('Nội dung ghi chú') : a('Nội dung thư trả lời')}
          placeholder={note ? a('Ghi chú cho riêng mình về hội thoại này…') : a('Viết trả lời cho {name}… (gõ / để chèn mẫu)', { name: thread.name })}
          className="block max-h-72 min-h-[76px] w-full resize-none bg-transparent px-3 py-2.5 text-[15px] leading-relaxed text-[#e6e7f0] outline-none placeholder:text-[#7d81a0]" />

        {/* Như Gmail: chữ ký hiện mờ cuối thư (× để bỏ), trích dẫn thu gọn thành "···" (bấm để xem / bỏ) */}
        {!note && sign && editSig && (
          <div className="mx-3 mb-1.5 border-t border-dashed border-[#3a3f5a] pt-2">
            <textarea autoFocus rows={Math.min(5, Math.max(2, (d.sig ?? sigDefault).split('\n').length))} maxLength={1000} value={d.sig ?? sigDefault} aria-label={a('Chữ ký')}
              onChange={e => patch({ sig: e.target.value })} onKeyDown={e => { if (e.key === 'Escape' || ((e.ctrlKey || e.metaKey) && e.key === 'Enter')) { e.preventDefault(); setEditSig(false); ta.current?.focus() } }}
              placeholder={'Công Minh\nManual QA Tester · portfolio.vn'}
              className="block w-full resize-y rounded-lg border border-line bg-white/[0.03] px-2.5 py-1.5 text-[13px] leading-relaxed text-[#dfe0ea] outline-none focus:border-purple" />
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <button type="button" onClick={() => { setEditSig(false); if (!(d.sig ?? sigDefault).trim()) setSign(false) }} className="rounded-md bg-white/10 px-2.5 py-1 font-medium text-white hover:bg-white/15">{a('Xong')}</button>
              {d.sig != null && d.sig !== sigDefault && <>
                <button type="button" onClick={saveSigDefault} disabled={sigBusy} className="font-medium text-[#b5aaff] hover:text-white disabled:opacity-50">{sigBusy ? a('Đang lưu…') : a('Lưu làm chữ ký mặc định')}</button>
                {sigDefault && <button type="button" onClick={() => patch({ sig: undefined })} className="text-muted hover:text-white">{a('Dùng lại chữ ký mặc định')}</button>}
              </>}
              <span className="text-muted">{d.sig != null && d.sig !== sigDefault ? a('Chỉ áp dụng cho thư này') : ''}</span>
            </div>
          </div>
        )}
        {!note && sign && !editSig && sigText && (
          <div className="group/sig mx-3 mb-1.5 flex items-start gap-1 border-t border-dashed border-[#3a3f5a] pt-2">
            <button type="button" onClick={() => setEditSig(true)} title={a('Bấm để sửa chữ ký')} className="min-w-0 flex-1 whitespace-pre-line break-words rounded-md text-left text-[13px] leading-relaxed text-muted transition hover:text-[#dfe0ea]">{sigText}</button>
            <span className="flex flex-none gap-0.5 sm:opacity-0 sm:group-hover/sig:opacity-100 sm:focus-within:opacity-100">
              <button type="button" onClick={() => setEditSig(true)} title={a('Sửa chữ ký')} aria-label={a('Sửa chữ ký')} className="grid size-6 place-items-center rounded text-muted transition hover:bg-white/10 hover:text-white"><Icon d="pen" className="size-3.5" /></button>
              <button type="button" onClick={() => setSign(false)} title={a('Bỏ chữ ký khỏi thư này')} aria-label={a('Bỏ chữ ký khỏi thư này')} className="grid size-6 place-items-center rounded text-muted transition hover:bg-white/10 hover:text-white"><Icon d="x" className="size-3.5" /></button>
            </span>
          </div>
        )}
        {!note && quote && quoteMsg && quoteOpen && (
          <div className="mx-3 mb-1.5 rounded-lg border-l-2 border-[#3a3f5a] bg-white/[0.03] py-1.5 pl-3 pr-2 text-[13px] text-muted">
            <div className="flex items-center gap-2 text-xs"><span className="min-w-0 flex-1 truncate">{quoteBody.when}, {quoteMsg.name}:</span>
              <button type="button" onClick={() => { setQuote(false); setQuoteOpen(false) }} className="flex-none font-medium text-[#b5aaff] hover:text-white">{a('Bỏ trích dẫn')}</button></div>
            <p className="mt-1 line-clamp-4 whitespace-pre-wrap break-words">{quoteMsg.message}</p>
          </div>
        )}
        {!note && ((quoteMsg && (!quote || !quoteOpen)) || ((!sign || !sigText) && !editSig)) && (
          <div className="flex flex-wrap items-center gap-1.5 px-3 pb-1.5">
            {quoteMsg && quote && !quoteOpen && <button type="button" onClick={() => setQuoteOpen(true)} title={a('Hiện tin được trích dẫn')} aria-label={a('Hiện tin được trích dẫn')}
              className="rounded-full border border-line px-2.5 text-sm leading-5 tracking-[2px] text-muted transition hover:border-[#3a3f5a] hover:text-white">···</button>}
            {quoteMsg && !quote && <button type="button" onClick={() => setQuote(true)} className="rounded-full border border-dashed border-line px-2.5 py-0.5 text-xs text-muted transition hover:text-white">+ {a('Trích dẫn')}</button>}
            {(!sign || !sigText) && !editSig && <button type="button" onClick={() => { setSign(true); if (!sigText) setEditSig(true) }} className="rounded-full border border-dashed border-line px-2.5 py-0.5 text-xs text-muted transition hover:text-white">+ {a('Chữ ký')}</button>}
          </div>
        )}
        {files.length > 0 && <div className="flex flex-wrap gap-1.5 px-3 pb-1 pt-1">{files.map(f => <FileChip key={f.url} f={f} onRemove={f.uploading ? null : () => patch({ files: files.filter(x => x.url !== f.url) })} />)}</div>}

        {/* Hàng nút */}
        <div className="flex flex-wrap items-center gap-1.5 px-2.5 pb-2.5 pt-1.5">
          <input ref={fileIn} type="file" multiple hidden onChange={pickFiles} />
          <span className="relative">
            <RoundBtn icon="clip" label={a('Đính kèm file')} active={open === 'lib'} onClick={() => toggle('lib')} />
            {open === 'lib' && (
              <div className={`${pop} left-0 w-[min(340px,calc(100vw-3rem))]`}>
                <button type="button" onClick={() => { setOpen(''); fileIn.current?.click() }} disabled={files.length >= 5}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-medium text-white transition hover:bg-white/5 disabled:opacity-50"><Icon d="M12 16V4 M7 9l5-5 5 5 M4 20h16" />{a('Tải file từ máy…')}</button>
                {library.length > 0 && <p className="mt-1 border-t border-line px-2 pb-1.5 pt-2 text-[11px] font-medium text-muted">{a('File đã dùng trước đây')}</p>}
                <ul className="max-h-60 overflow-y-auto">
                  {!library.length && <li className="px-2 pb-1 text-xs text-muted">{a('Các file đã gửi và CV ở Trang chủ sẽ hiện ở đây để chọn lại.')}</li>}
                  {library.map(f => {
                    const on = files.some(x => x.url === f.url)
                    return (
                      <li key={f.url}><button type="button" onClick={() => (on ? patch({ files: files.filter(x => x.url !== f.url) }) : addFiles([f]))}
                        className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-white/5 ${on ? 'text-white' : 'text-[#c9cbd8]'}`}>
                        <span className={`grid size-4 flex-none place-items-center rounded border text-[10px] ${on ? 'border-purple bg-purple text-white' : 'border-line'}`}>{on && '✓'}</span>
                        <span className="min-w-0 flex-1 truncate">{f.name}</span>
                        {f.cv && <span className="flex-none rounded bg-purple/20 px-1.5 text-[10px] font-semibold text-[#c9bfff]">CV</span>}
                        <span className="flex-none text-[11px] text-muted">{fmtSize(f.size)}</span>
                      </button></li>
                    )
                  })}
                </ul>
              </div>
            )}
          </span>
          <span className="relative">
            <RoundBtn icon="tpl" label={a('Mẫu trả lời nhanh')} active={open === 'tpl'} onClick={() => { setSlash(null); toggle('tpl') }} />
            {open === 'tpl' && (
              <div className={`${pop} left-0 w-[min(360px,calc(100vw-3rem))]`}>
                <p className="px-2 pb-1.5 pt-1 text-[11px] font-medium text-muted">{slash != null ? a('Mẫu khớp "/{q}" — ↑↓ chọn, Enter chèn', { q: slash }) : a('Mẫu trả lời nhanh — gõ / trong ô soạn')}</p>
                <ul className="max-h-64 overflow-y-auto">
                  {!tplShown.length && <li className="px-2 py-3 text-center text-xs text-muted">{a('Không có mẫu nào khớp.')}</li>}
                  {tplShown.map((t, i) => (
                    <li key={t.id}><button type="button" onMouseDown={e => e.preventDefault()} onClick={() => applyTemplate(t)} onMouseEnter={() => setHi(i)}
                      className={`w-full rounded-lg px-2 py-1.5 text-left transition ${i === hi ? 'bg-white/[0.07]' : ''}`}>
                      <span className="flex items-baseline gap-2"><b className="font-semibold text-white">/{t.key}</b><span className="truncate text-sm text-[#c9cbd8]">{t.title}</span>{t.files?.length > 0 && <Icon d="clip" className="size-3 flex-none text-muted" />}</span>
                      <span className="block truncate text-xs text-muted">{fill(t.body, thread).replace(/\n+/g, ' ')}</span>
                    </button></li>
                  ))}
                </ul>
                <button type="button" onClick={() => { setOpen(''); onManage() }} className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-line px-2 pb-1 pt-2 text-left text-xs font-medium text-[#b5aaff] hover:text-white"><Icon d="gear" className="size-3.5" />{a('Quản lý mẫu và chữ ký')}</button>
              </div>
            )}
          </span>
          {!note && (
            <span className="relative">
              <RoundBtn icon="ai" label={a('AI viết nháp')} active={open === 'ai'} onClick={() => toggle('ai')} disabled={busy === 'ai'}>
                {busy === 'ai' ? <span className="size-4 animate-spin rounded-full border-2 border-purple border-t-transparent" /> : null}
              </RoundBtn>
              {open === 'ai' && (
                <div className={`${pop} left-0 w-[min(340px,calc(100vw-3rem))] space-y-3 p-3`}>
                  <div><p className="text-sm font-semibold">{a('AI viết nháp')}</p><p className="text-xs text-muted">{a('Đọc cả hội thoại rồi soạn sẵn, bạn sửa lại trước khi gửi.')}</p></div>
                  <div className="flex flex-wrap gap-1.5">
                    {[['thanks', 'Cảm ơn'], ['meet', 'Hẹn lịch'], ['cv', 'Gửi CV'], ['decline', 'Từ chối khéo'], ['free', 'Tự do']].map(([k, l]) => (
                      <button key={k} type="button" onClick={() => setAi(s => ({ ...s, intent: k }))} aria-pressed={ai.intent === k}
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${ai.intent === k ? 'border-purple bg-purple/20 text-white' : 'border-line text-[#c9cbd8] hover:text-white'}`}>{a(l)}</button>
                    ))}
                  </div>
                  <input className={input} value={ai.hint} maxLength={500} onChange={e => setAi(s => ({ ...s, hint: e.target.value }))} placeholder={a('Ý muốn nói thêm (không bắt buộc)')} aria-label={a('Ý muốn nói thêm')} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); draftAi() } }} />
                  <div className="flex items-center gap-2">
                    <select value={ai.lang} onChange={e => setAi(s => ({ ...s, lang: e.target.value }))} aria-label={a('Ngôn ngữ thư')} className={`${input} w-auto py-1.5`}>
                      <option value="auto">{a('Theo ngôn ngữ khách')}</option><option value="vi">Tiếng Việt</option><option value="en">English</option>
                    </select>
                    <button type="button" onClick={draftAi} disabled={busy === 'ai'} className={`${btn} ${grad} ml-auto`}><Icon d="ai" />{busy === 'ai' ? a('Đang viết…') : a('Viết nháp')}</button>
                  </div>
                </div>
              )}
            </span>
          )}
          <RoundBtn label={fmt ? a('Ẩn thanh định dạng') : a('Định dạng chữ')} active={fmt} onClick={() => setFmt(v => !v)}>
            <span className="text-[13px] font-semibold">Aa</span>
          </RoundBtn>

          <span className="flex-1" />
          <span className="relative">
            <RoundBtn icon="smile" label={a('Chèn emoji')} active={open === 'emoji'} onClick={() => toggle('emoji')} />
            {open === 'emoji' && (
              <div className={`${pop} right-0 grid w-[264px] grid-cols-8 gap-0.5`}>
                {EMOJIS.map(em => <button key={em} type="button" onMouseDown={e => e.preventDefault()} onClick={() => { insertAt(em); setOpen('') }} className="grid size-8 place-items-center rounded-md text-lg hover:bg-white/10" aria-label={em}>{em}</button>)}
              </div>
            )}
          </span>
          {/* Nút Gửi + menu các cách gửi khác (Gửi và đóng, Gmail, app email) */}
          <span className="relative inline-flex">
            <button type="button" onClick={() => submit(false)} disabled={!!busy} title="Ctrl + Enter"
              className={`${btn} h-9 rounded-r-none pr-2.5 ${note ? 'bg-[#f8d27c] text-[#2a2208] hover:brightness-110' : grad}`}>
              {busy === 'send' ? <span className={`size-4 animate-spin rounded-full border-2 border-t-transparent ${note ? 'border-[#2a2208]' : 'border-white'}`} /> : <Icon d={note ? 'note' : 'send'} />}
              {note ? a('Lưu ghi chú') : a('Gửi')}
            </button>
            <button type="button" onClick={() => toggle('more')} disabled={!!busy} aria-label={note ? a('Cách lưu khác') : a('Cách gửi khác')} aria-expanded={open === 'more'}
              className={`${btn} h-9 rounded-l-none border-l px-1.5 ${note ? 'border-[#2a2208]/25 bg-[#f8d27c] text-[#2a2208] hover:brightness-110' : `${grad} border-white/25`}`}><Icon d="down" className="size-3.5" /></button>
            {open === 'more' && (
              <div className={`${pop} right-0 w-64 p-1.5`}>
                {[[note ? a('Lưu ghi chú') : a('Gửi'), 'Ctrl + Enter', () => { setOpen(''); submit(false) }],
                  [note ? a('Lưu ghi chú và đóng hội thoại') : a('Gửi và đóng hội thoại'), '', () => { setOpen(''); submit(true) }]].map(([l, k, fn]) => (
                  <button key={l} type="button" onClick={fn} className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-sm font-medium hover:bg-white/5">{l}{k && <span className="text-xs font-normal text-muted">{k}</span>}</button>
                ))}
                {!note && <div className="mt-1 border-t border-line pt-1">
                  <button type="button" onClick={() => openExternal('gmail')} className="w-full rounded-lg px-2.5 py-2 text-left text-sm hover:bg-white/5"><span className="block font-medium">{a('Mở trong Gmail')}</span><span className="block text-xs text-muted">{a('Soạn sẵn, bạn bấm Gửi trong Gmail')}</span></button>
                  <button type="button" onClick={() => openExternal('mailto')} className="w-full rounded-lg px-2.5 py-2 text-left text-sm hover:bg-white/5"><span className="block font-medium">{a('Mở app email mặc định')}</span><span className="block text-xs text-muted">{a('Outlook, Mail… (file gửi dạng link)')}</span></button>
                </div>}
              </div>
            )}
          </span>
        </div>
      </div>
      <p className="mt-1.5 hidden px-1 text-[11px] text-muted sm:block">{a('Ctrl + Enter để gửi · Ctrl + B đậm · Ctrl + I nghiêng · khách trả lời thư sẽ về email của bạn')}</p>
    </div>
  )
}

/* ---------- Dialog quản lý mẫu trả lời + chữ ký ---------- */
export function TemplatesDialog({ cfg, library, toast, onClose, onSaved }) {
  const a = useA()
  const [list, setList] = useState(() => (cfg.templates || defaultTemplates(library.find(f => f.cv))).map(t => ({ ...t, files: t.files || [] })))
  const [sig, setSig] = useState(cfg.signature || '')
  const [sigOn, setSigOn] = useState(cfg.signature_on !== false)
  const [sel, setSel] = useState(list[0]?.id || null)
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  useEffect(() => { const h = e => e.key === 'Escape' && onClose(); document.addEventListener('keydown', h); return () => document.removeEventListener('keydown', h) }, [])
  const cur = list.find(t => t.id === sel)
  const upd = p => setList(l => l.map(t => (t.id === sel ? { ...t, ...p } : t)))
  const add = () => { const t = { id: `t-${Date.now()}`, key: `mau${list.length + 1}`, title: a('Mẫu mới'), body: a('Chào {name},\n\n'), files: [] }; setList(l => [...l, t]); setSel(t.id) }
  const remove = () => { const i = list.findIndex(t => t.id === sel); const next = list.filter(t => t.id !== sel); setList(next); setSel(next[Math.max(0, i - 1)]?.id || null) }
  const save = async () => {
    const keys = list.map(t => t.key.trim().toLowerCase())
    if (keys.some(k => !/^[\w-]{1,20}$/.test(k))) return setErr(a('Phím tắt chỉ gồm chữ không dấu, số, - hoặc _ (tối đa 20 ký tự).'))
    if (new Set(keys).size !== keys.length) return setErr(a('Có hai mẫu trùng phím tắt.'))
    setErr(''); setBusy(true)
    const reply = { templates: list.map(t => ({ id: t.id, key: t.key.trim().toLowerCase(), title: t.title.trim().slice(0, 80) || t.key, body: t.body.slice(0, 5000), files: t.files.slice(0, 5) })), signature: sig.slice(0, 1000), signature_on: sigOn }
    const { error } = await supabase.from('admin_settings').upsert({ id: 1, reply })
    setBusy(false)
    if (error) return toast(a('{msg}. Đã chạy lại supabase/migration-messages.sql chưa?', { msg: error.message }), 'error')
    onSaved(reply); toast(a('Đã lưu mẫu trả lời')); onClose()
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-3" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={a('Mẫu trả lời và chữ ký')} className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-line bg-[#0d0f1a] shadow-[0_20px_60px_#000000b0]">
        <header className="flex items-center gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1"><p className="font-semibold">{a('Mẫu trả lời và chữ ký')}</p><p className="text-xs text-muted">{a('Gõ /phím-tắt trong ô soạn để chèn mẫu. Dùng {name}, {email} để tự điền theo khách.')}</p></div>
          <button type="button" onClick={onClose} className="text-muted hover:text-white" aria-label={a('Đóng')}>✕</button>
        </header>
        <div className="grid min-h-0 flex-1 overflow-y-auto sm:grid-cols-[200px_minmax(0,1fr)]">
          <div className="border-b border-line p-2 sm:border-b-0 sm:border-r">
            <ul className="flex gap-1 overflow-x-auto sm:flex-col">
              {list.map(t => <li key={t.id} className="flex-none"><button type="button" onClick={() => setSel(t.id)} className={`w-full rounded-lg px-2.5 py-1.5 text-left text-sm transition ${t.id === sel ? 'bg-purple/15 text-white' : 'text-[#c9cbd8] hover:bg-white/5'}`}><b className="font-semibold">/{t.key}</b><span className="block truncate text-xs text-muted">{t.title}</span></button></li>)}
            </ul>
            <button type="button" onClick={add} className={`${ghost} mt-2 w-full text-xs`}>+ {a('Thêm mẫu')}</button>
          </div>
          <div className="space-y-4 p-5">
            {cur ? <>
              <div className="grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
                <label className="text-xs text-muted">{a('Phím tắt')}<div className="mt-1 flex items-center rounded-lg border border-line bg-[#0b0d16] pl-3 focus-within:border-purple"><span className="text-muted">/</span><input value={cur.key} maxLength={20} onChange={e => upd({ key: e.target.value.replace(/\s/g, '') })} className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm text-white outline-none" /></div></label>
                <label className="text-xs text-muted">{a('Tên mẫu')}<input value={cur.title} maxLength={80} onChange={e => upd({ title: e.target.value })} className={`${input} mt-1`} /></label>
              </div>
              <label className="block text-xs text-muted">{a('Nội dung')}<textarea value={cur.body} rows={7} onChange={e => upd({ body: e.target.value })} className={`${input} mt-1 resize-y leading-relaxed`} /></label>
              <div>
                <p className="mb-1.5 text-xs text-muted">{a('Tự đính kèm khi dùng mẫu')}</p>
                {!library.length ? <p className="text-xs text-[#5d6180]">{a('Chưa có file nào trong thư viện. Gửi một thư có đính kèm (hoặc tải CV ở Trang chủ → Giới thiệu) là file hiện ở đây.')}</p> : (
                  <div className="flex flex-wrap gap-1.5">{library.map(f => {
                    const on = cur.files.some(x => x.url === f.url)
                    return <button key={f.url} type="button" aria-pressed={on} onClick={() => upd({ files: on ? cur.files.filter(x => x.url !== f.url) : [...cur.files, { name: f.name, url: f.url, size: f.size, type: f.type }] })}
                      className={`max-w-full truncate rounded-lg border px-2 py-1 text-xs transition ${on ? 'border-purple bg-purple/15 text-white' : 'border-line text-[#c9cbd8] hover:text-white'}`}>{on ? '✓ ' : ''}{f.name}</button>
                  })}</div>
                )}
              </div>
              <button type="button" onClick={remove} className="text-xs font-medium text-red-300 hover:text-red-200">{a('Xóa mẫu này')}</button>
            </> : <p className="text-sm text-muted">{a('Chưa có mẫu nào.')}</p>}
            <div className="space-y-2 border-t border-line pt-4">
              <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">{a('Chữ ký')}</p>
                <label className="inline-flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={sigOn} onChange={e => setSigOn(e.target.checked)} className="accent-[#6650ff]" />{a('Mặc định thêm vào cuối thư')}</label></div>
              <textarea value={sig} rows={3} maxLength={1000} onChange={e => setSig(e.target.value)} placeholder={'Công Minh\nFrontend Developer · portfolio.vn'} aria-label={a('Chữ ký')} className={`${input} resize-y`} />
            </div>
          </div>
        </div>
        <footer className="flex items-center gap-3 border-t border-line px-5 py-3">
          {err && <p className="min-w-0 flex-1 text-xs text-red-300">{err}</p>}
          <span className="flex-1" />
          <button type="button" onClick={onClose} className={ghost}>{a('Hủy')}</button>
          <button type="button" onClick={save} disabled={busy} className={`${btn} ${grad}`}>{busy ? a('Đang lưu…') : a('Lưu')}</button>
        </footer>
      </div>
    </div>
  )
}
