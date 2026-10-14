// Admin → Tìm kiếm mọi thứ (Ctrl+K / ⌘K hoặc phím /): trang, thao tác nhanh, ô cài đặt, công tắc bố cục,
// toàn bộ nội dung (cả bản English) và tin nhắn. Kiểu bảng lệnh như cmdk / kbar nhưng tự viết, không thêm thư viện.
// - Gõ không dấu vẫn ra: "bai viet" khớp "Bài viết" (bỏ dấu cả câu gõ lẫn dữ liệu, giữ nguyên độ dài để tô đậm đúng chỗ)
// - Mỗi từ gõ phải xuất hiện ở đâu đó trong mục; khớp ở tiêu đề được xếp trên khớp trong nội dung
import { useEffect, useMemo, useRef, useState } from 'react'
import { useA } from './adminLang.js'

/** Bỏ dấu + chữ thường, giữ nguyên độ dài chuỗi (mỗi ký tự gốc ↔ một ký tự) */
const foldChar = c => {
  const f = c.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()
  return f.length === 1 ? f : f[0] || ' '
}
export const fold = s => { const t = String(s ?? ''); let o = ''; for (let i = 0; i < t.length; i++) o += foldChar(t[i]); return o }

// Bỏ cú pháp markdown/HTML cho đoạn trích dễ đọc
const plain = s => String(s ?? '').replace(/<[^>]+>/g, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\]\([^)]*\)/g, ']')
  .replace(/data:[^\s)]+/g, ' ').replace(/[#*_`>|[\]~]+/g, ' ').replace(/\s+/g, ' ').trim()
/** Gom mọi chữ trong một giá trị (chuỗi, mảng, object như bản English) */
export const textOf = v => (v == null ? '' : Array.isArray(v) ? v.map(textOf).join(' ') : typeof v === 'object' ? Object.values(v).map(textOf).join(' ') : plain(v))

const tokensOf = q => fold(q).split(/\s+/).filter(Boolean)

/** Điểm khớp; 0 = không khớp (thiếu ít nhất một từ) */
function score(item, toks) {
  let s = 0
  for (const t of toks) {
    const i = item._t.indexOf(t)
    if (i === 0) s += 6
    else if (i > 0) s += /[\s\-·/(]/.test(item._t[i - 1]) ? 4 : 2.5
    else if (item._s.includes(t)) s += 1.5
    else if (item._x.includes(t)) s += 1
    else return 0
  }
  return s + (item.boost || 0)
}

// Tô đậm các đoạn khớp trong một chuỗi gốc
function Hi({ text, toks }) {
  const s = String(text ?? ''); const f = fold(s)
  const marks = new Array(s.length).fill(false)
  toks.forEach(t => { let i = f.indexOf(t); while (t && i >= 0) { for (let k = i; k < i + t.length; k++) marks[k] = true; i = f.indexOf(t, i + t.length) } })
  const out = []; let i = 0
  while (i < s.length) { let j = i; while (j < s.length && marks[j] === marks[i]) j++; out.push(marks[i] ? <mark key={i} className="rounded-sm bg-purple/35 text-white">{s.slice(i, j)}</mark> : s.slice(i, j)); i = j }
  return out
}
// Đoạn trích quanh chỗ khớp đầu tiên trong nội dung (khi tiêu đề/mô tả không chứa từ đó)
function snippet(item, toks) {
  const t = toks.find(x => !item._t.includes(x) && !item._s.includes(x) && item._x.includes(x))
  if (!t) return ''
  const i = item._x.indexOf(t), a = Math.max(0, i - 40)
  return (a ? '…' : '') + item.text.slice(a, i + t.length + 70).trim() + (i + t.length + 70 < item.text.length ? '…' : '')
}

const RECENT = 'cm-admin-search-recent'
const recent = {
  get() { try { return JSON.parse(localStorage.getItem(RECENT)) || [] } catch { return [] } },
  add(id) { try { localStorage.setItem(RECENT, JSON.stringify([id, ...recent.get().filter(x => x !== id)].slice(0, 5))) } catch { /* bỏ qua */ } },
}
export const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)

/**
 * items: [{ id, group, icon, title, sub, text, run, boost }] — group/title/sub đã dịch sẵn
 * loading: đang tải nội dung (vẫn tìm được trang, cài đặt)
 */
export default function AdminSearch({ open, onClose, items, loading, Icon }) {
  const a = useA()
  const [q, setQ] = useState(''); const [act, setAct] = useState(0)
  const listRef = useRef(null)
  useEffect(() => { if (open) { setQ(''); setAct(0) } }, [open])

  const indexed = useMemo(() => items.map(it => ({ ...it, _t: fold(it.title), _s: fold(it.sub), _x: fold(it.text), text: it.text || '' })), [items])
  const toks = useMemo(() => tokensOf(q), [q])
  // Danh sách phẳng (để di chuyển bằng phím) kèm tên nhóm
  const flat = useMemo(() => {
    if (!toks.length) {
      const byId = new Map(indexed.map(x => [x.id, x]))
      const rec = recent.get().map(id => byId.get(id)).filter(Boolean).map(x => ({ ...x, group: a('Mở gần đây') }))
      return [...rec, ...indexed.filter(x => x.quick)]
    }
    const hits = indexed.map(x => ({ ...x, _sc: score(x, toks) })).filter(x => x._sc > 0)
    const groups = new Map()
    hits.forEach(x => { const g = groups.get(x.group) || []; g.push(x); groups.set(x.group, g) })
    return [...groups.values()]
      .map(g => g.sort((x, y) => y._sc - x._sc).slice(0, 8))
      .sort((x, y) => y[0]._sc - x[0]._sc)
      .flat()
  }, [indexed, toks, a])
  useEffect(() => setAct(0), [q])
  useEffect(() => { listRef.current?.querySelector(`[data-i="${act}"]`)?.scrollIntoView({ block: 'nearest' }) }, [act])

  const pick = x => { if (!x) return; recent.add(x.id); onClose(); x.run() }
  const onKey = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setAct(i => (flat.length ? (i + 1) % flat.length : 0)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAct(i => (flat.length ? (i - 1 + flat.length) % flat.length : 0)) }
    else if (e.key === 'Home' && flat.length) { e.preventDefault(); setAct(0) }
    else if (e.key === 'End' && flat.length) { e.preventDefault(); setAct(flat.length - 1) }
    else if (e.key === 'Enter') { e.preventDefault(); pick(flat[act]) }
    else if (e.key === 'Escape') { e.preventDefault(); onClose() }
  }
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/60 px-4 pt-[min(12vh,120px)] backdrop-blur-sm" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={a('Tìm kiếm trong Admin')} onMouseDown={e => e.stopPropagation()}
        className="flex max-h-[min(640px,76vh)] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl border border-line bg-[#0d0f1a] shadow-[0_30px_80px_#000000a0]">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <span className="text-muted"><Icon name="search" className="size-[18px]" /></span>
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKey}
            role="combobox" aria-expanded="true" aria-controls="admin-search-list" aria-autocomplete="list"
            aria-activedescendant={flat[act] ? `as-${act}` : undefined} aria-label={a('Tìm kiếm trong Admin')}
            placeholder={a('Tìm trang, cài đặt, bài viết, dự án, tin nhắn…')}
            className="min-w-0 flex-1 bg-transparent py-4 text-[15px] text-white outline-none placeholder:text-[#5d6180]" />
          {loading && <span className="size-4 flex-none animate-spin rounded-full border-2 border-purple/30 border-t-purple" title={a('Đang tải nội dung…')} />}
          <kbd onClick={onClose} className="hidden cursor-pointer rounded border border-line px-1.5 py-0.5 text-[10px] text-muted sm:block">Esc</kbd>
        </div>

        <ul id="admin-search-list" ref={listRef} role="listbox" className="min-h-0 flex-1 overflow-y-auto p-2">
          {!flat.length && (
            <li className="px-4 py-10 text-center text-sm text-muted">
              {toks.length ? (loading ? a('Đang tải nội dung…') : a('Không tìm thấy kết quả cho “{q}”.', { q: q.trim() })) : a('Gõ để tìm kiếm.')}
            </li>
          )}
          {flat.map((x, i) => {
            const head = i === 0 || flat[i - 1].group !== x.group
            const snip = toks.length ? snippet(x, toks) : ''
            return (
              <li key={`${x.group}-${x.id}`} role="presentation">
                {head && <p className="px-3 pb-1.5 pt-3 text-[10px] font-bold tracking-[1.5px] text-[#5d6180] first:pt-1">{x.group.toUpperCase()}</p>}
                <div id={`as-${i}`} data-i={i} role="option" aria-selected={i === act} onMouseMove={() => i !== act && setAct(i)} onClick={() => pick(x)}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 ${i === act ? 'bg-purple/15' : ''}`}>
                  <span className={`grid size-8 flex-none place-items-center rounded-md ${i === act ? 'bg-purple/25 text-[#c9bfff]' : 'bg-white/5 text-muted'}`}>
                    {x.emoji ? <i className="not-italic">{x.emoji}</i> : <Icon name={x.icon || 'doc'} className="size-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm font-medium text-white"><Hi text={x.title} toks={toks} /></span>
                      {x.badge && <span className="flex-none rounded bg-white/8 px-1.5 py-0.5 text-[10px] text-muted">{x.badge}</span>}
                    </span>
                    {(snip || x.sub) && <span className="block truncate text-xs text-muted"><Hi text={snip || x.sub} toks={toks} /></span>}
                  </span>
                  {i === act && <span className="flex-none text-xs text-muted">↵</span>}
                </div>
              </li>
            )
          })}
        </ul>

        <div className="hidden items-center gap-4 border-t border-line px-4 py-2.5 text-[11px] text-muted sm:flex">
          <span><kbd className="rounded border border-line px-1">↑</kbd> <kbd className="rounded border border-line px-1">↓</kbd> {a('di chuyển')}</span>
          <span><kbd className="rounded border border-line px-1">↵</kbd> {a('mở')}</span>
          <span><kbd className="rounded border border-line px-1">Esc</kbd> {a('đóng')}</span>
          <span className="ml-auto">{a('Gõ không dấu cũng được')}</span>
        </div>
      </div>
    </div>
  )
}

/** Chờ phần tử xuất hiện (trang đang tải) rồi cuộn tới, nhấn mạnh và đặt con trỏ vào */
export function focusWhenReady(selector, tries = 40) {
  const el = document.querySelector(selector)
  if (!el) { if (tries > 0) setTimeout(() => focusWhenReady(selector, tries - 1), 100); return }
  el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  const target = el.matches('input, textarea, button, [tabindex]') ? el : el.querySelector('input, textarea, button, [contenteditable="true"]')
  target?.focus({ preventScroll: true })
  el.animate?.([{ boxShadow: '0 0 0 3px #6650ffcc' }, { boxShadow: '0 0 0 3px #6650ff00' }], { duration: 1800, easing: 'ease-out' })
}
