// Admin → Tìm kiếm mọi thứ (Ctrl+K / ⌘K hoặc phím /): trang, phần bên trong trang (VD "Thông báo đẩy"), thao tác nhanh,
// ô cài đặt, công tắc bố cục, toàn bộ nội dung (cả bản English) và tin nhắn. Kiểu bảng lệnh như cmdk / kbar nhưng tự viết.
// - Gõ không dấu vẫn ra: "bai viet" khớp "Bài viết" (bỏ dấu cả câu gõ lẫn dữ liệu, giữ nguyên độ dài để tô đậm đúng chỗ)
// - Mỗi từ gõ phải xuất hiện ở đâu đó trong mục; khớp ở tiêu đề được xếp trên khớp trong nội dung
// - Hàng nút lọc (Tab để đổi) và gõ tắt "blog: …", "bug: …", "tin: …" để chỉ tìm một loại
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
  // Gõ nhiều từ: mục chứa nguyên cụm (VD "thong bao day") xếp trên mục chỉ có từng từ rải rác
  const phrase = toks.length > 1 && toks.join(' ')
  if (phrase) s += item._t.includes(phrase) ? 5 : item._s.includes(phrase) || item._x.includes(phrase) ? 2 : 0
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
  // Chỉ nội dung và tin nhắn mới có đoạn trích; trang/cài đặt giữ dòng phụ (chữ ẩn của chúng là từ khóa đồng nghĩa)
  if (item.kind !== 'content' && item.kind !== 'msg') return ''
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

// Bộ lọc dưới ô tìm: mỗi mục có kind = page | set | content | msg | act
const FILTERS = [['all', 'Tất cả'], ['set', 'Trang & cài đặt'], ['content', 'Nội dung'], ['msg', 'Tin nhắn'], ['act', 'Thao tác']]
const inFilter = (x, f) => f === 'all' || (f === 'set' ? x.kind === 'set' || x.kind === 'page' : x.kind === f)
// Gõ tắt ở đầu câu để chỉ tìm một loại nội dung: "blog: playwright", "bug: 007", "tin: an"
const PREFIXES = [[['blog', 'bai', 'post'], 'posts'], [['bug'], 'bugs'], [['du an', 'project'], 'projects'], [['ky nang', 'skill'], 'skills'],
  [['kinh nghiem', 'job'], 'jobs'], [['tin', 'tin nhan', 'msg', 'message'], 'messages']]
function parsePrefix(q) {
  const m = fold(q).match(/^\s*([a-z ]+?)\s*:\s*/)
  const hit = m && PREFIXES.find(([keys]) => keys.includes(m[1].trim()))
  return hit ? { table: hit[1], label: q.slice(0, m[0].length).replace(/\s*:\s*$/, '').trim(), rest: q.slice(m[0].length) } : { rest: q }
}

/**
 * items: [{ id, kind, table?, group, icon, title, sub, text, run, boost, quick }] — group/title/sub đã dịch sẵn
 * loading: đang tải nội dung (vẫn tìm được trang, cài đặt)
 */
export default function AdminSearch({ open, onClose, items, loading, Icon }) {
  const a = useA()
  const [q, setQ] = useState(''); const [act, setAct] = useState(0); const [filter, setFilter] = useState('all')
  const listRef = useRef(null)
  // Mỗi lần mở: ô trống, bộ lọc về "Tất cả" (đỡ quên là đang lọc)
  useEffect(() => { if (open) { setQ(''); setAct(0); setFilter('all') } }, [open])

  const indexed = useMemo(() => items.map(it => ({ ...it, _t: fold(it.title), _s: fold(it.sub), _x: fold(it.text), text: it.text || '' })), [items])
  const pre = useMemo(() => parsePrefix(q), [q])
  const toks = useMemo(() => tokensOf(pre.rest), [pre])
  const typing = toks.length > 0 || !!pre.table
  // Kết quả khớp chữ gõ, chưa áp bộ lọc (để đếm số trên từng nút lọc). Chưa gõ mà đang lọc → cả loại đó.
  const hits = useMemo(() => {
    const pool = pre.table ? indexed.filter(x => x.table === pre.table) : indexed
    if (!toks.length) return pre.table || filter !== 'all' ? pool.map(x => ({ ...x, _sc: 1 })) : []
    return pool.map(x => ({ ...x, _sc: score(x, toks) })).filter(x => x._sc > 0)
  }, [indexed, toks, pre, filter])
  // Danh sách phẳng (để di chuyển bằng phím) kèm tên nhóm
  const flat = useMemo(() => {
    if (!typing && filter === 'all') {
      const byId = new Map(indexed.map(x => [x.id, x]))
      const rec = recent.get().map(id => byId.get(id)).filter(Boolean).map(x => ({ ...x, group: a('Mở gần đây') }))
      return [...rec, ...indexed.filter(x => x.quick)]
    }
    const groups = new Map()
    hits.filter(x => inFilter(x, filter)).forEach(x => { const g = groups.get(x.group) || []; g.push(x); groups.set(x.group, g) })
    // Đang lọc một loại thì hiện nhiều hơn mỗi nhóm
    const per = filter === 'all' && !pre.table ? 8 : 50
    return [...groups.values()]
      .map(g => g.sort((x, y) => y._sc - x._sc).slice(0, per))
      .sort((x, y) => y[0]._sc - x[0]._sc)
      .flat()
  }, [indexed, hits, typing, pre, filter, a])
  useEffect(() => setAct(0), [q, filter])
  useEffect(() => { listRef.current?.querySelector(`[data-i="${act}"]`)?.scrollIntoView({ block: 'nearest' }) }, [act])

  const pick = x => { if (!x) return; recent.add(x.id); onClose(); x.run() }
  const cycle = dir => setFilter(f => FILTERS[(FILTERS.findIndex(([k]) => k === f) + dir + FILTERS.length) % FILTERS.length][0])
  const onKey = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setAct(i => (flat.length ? (i + 1) % flat.length : 0)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAct(i => (flat.length ? (i - 1 + flat.length) % flat.length : 0)) }
    else if (e.key === 'Tab') { e.preventDefault(); cycle(e.shiftKey ? -1 : 1) }
    else if (e.key === 'Enter') { e.preventDefault(); pick(flat[act]) }
    else if (e.key === 'Escape') { e.preventDefault(); onClose() }
  }
  if (!open) return null
  const kbd = 'rounded border border-line px-1'
  const empty = typing ? (loading ? a('Đang tải nội dung…') : a('Không tìm thấy kết quả cho “{q}”.', { q: q.trim() }))
    : filter === 'all' ? a('Gõ để tìm kiếm.') : loading ? a('Đang tải nội dung…') : a('Chưa có mục nào.')

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

        {/* Bộ lọc: số bên cạnh = số kết quả của chữ đang gõ */}
        <div role="tablist" aria-label={a('Lọc kết quả')} className="flex flex-wrap items-center gap-1.5 border-b border-line px-4 py-2.5">
          {FILTERS.map(([k, l]) => {
            const n = hits.filter(x => inFilter(x, k)).length
            return (
              <button key={k} type="button" role="tab" tabIndex={-1} aria-selected={filter === k} onClick={() => setFilter(k)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition ${filter === k ? 'border-purple bg-purple/15 text-white' : 'border-line text-muted hover:text-white'}`}>
                {a(l)}{typing && <span className={`rounded-full px-1.5 text-[10px] tabular-nums ${n ? 'bg-white/10' : 'opacity-50'}`}>{n}</span>}
              </button>
            )
          })}
          {pre.table && (
            <span className="inline-flex items-center gap-1 rounded-full bg-pink/15 px-2.5 py-1 text-xs text-pink" title={a('Đang chỉ tìm trong một loại nội dung')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className="size-3" aria-hidden="true"><path d="M4 5h16l-6 7v6l-4 2v-8z" /></svg>{pre.label}:
            </span>
          )}
        </div>

        <ul id="admin-search-list" ref={listRef} role="listbox" className="min-h-0 flex-1 overflow-y-auto p-2">
          {!flat.length && <li className="px-4 py-10 text-center text-sm text-muted">{empty}</li>}
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
          <span><kbd className={kbd}>↑</kbd> <kbd className={kbd}>↓</kbd> {a('di chuyển')}</span>
          <span><kbd className={kbd}>Tab</kbd> {a('đổi bộ lọc')}</span>
          <span><kbd className={kbd}>↵</kbd> {a('mở')}</span>
          <span className="ml-auto">{a('Gõ tắt:')} <kbd className={kbd}>blog:</kbd> <kbd className={kbd}>bug:</kbd> <kbd className={kbd}>tin:</kbd></span>
        </div>
      </div>
    </div>
  )
}

const flash = el => el.animate?.([{ boxShadow: '0 0 0 3px #6650ffcc' }, { boxShadow: '0 0 0 3px #6650ff00' }], { duration: 1800, easing: 'ease-out' })

/** Chờ phần tử xuất hiện (trang đang tải) rồi cuộn tới, nhấn mạnh và đặt con trỏ vào */
export function focusWhenReady(selector, tries = 40) {
  const el = document.querySelector(selector)
  if (!el) { if (tries > 0) setTimeout(() => focusWhenReady(selector, tries - 1), 100); return }
  el.scrollIntoView({ block: 'center' })
  const target = el.matches('input, textarea, button, [tabindex]') ? el : el.querySelector('input, textarea, button, [contenteditable="true"]')
  target?.focus({ preventScroll: true })
  flash(el)
}

/**
 * Tìm một phần trên trang theo chữ tiêu đề đang hiện (đã dịch), rồi cuộn tới và nhấn mạnh.
 * Tiêu đề h2/h3 → cả khối section; dòng cài đặt (chữ in đậm) → dòng đó, đặt con trỏ vào nút/ô của dòng.
 * Chờ một nhịp trước lần tìm đầu để trang mới kịp thay trang cũ (tránh khớp nhầm chữ trùng ở trang cũ).
 */
export function jumpToText(text, tries = 40, first = true) {
  if (first) { setTimeout(() => jumpToText(text, tries, false), 120); return }
  const want = String(text).trim()
  // Tiêu đề có thể kèm nhãn/nút phía sau (VD "Lượt xem trang  Bản demo") → khớp phần đầu
  const el = [...document.querySelectorAll('main h2, main h3')].find(h => h.textContent.trim() === want)
    || [...document.querySelectorAll('main h2, main h3')].find(h => h.textContent.trim().startsWith(want))
    || [...document.querySelectorAll('main p, main b, main label')].find(h => h.textContent.trim() === want)
  if (!el) { if (tries > 0) setTimeout(() => jumpToText(text, tries - 1, false), 100); return }
  const heading = /^H[23]$/.test(el.tagName)
  const box = heading ? el.closest('section') || el : el.closest('.border-b, li, section') || el
  box.style.scrollMarginTop = '88px' // chừa chỗ cho thanh đầu trang dính trên cùng
  box.scrollIntoView({ block: heading ? 'start' : 'center' })
  if (!heading) box.querySelector('input, textarea, select, button')?.focus({ preventScroll: true })
  flash(box)
}
