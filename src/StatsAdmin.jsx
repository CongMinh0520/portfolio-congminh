// Admin → Tổng quan: dashboard lượt xem (bảng page_views, hàm view_stats). Xem src/stats.js.
import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase.js'
import { loadStats } from './stats.js'
import { loadMessages } from './MessagesAdmin.jsx'
import { useA, adminLocale } from './adminLang.js'

const btn = 'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple disabled:opacity-50'
const ghost = `${btn} border border-line text-[#c9cbd8] hover:border-[#3a3f5a] hover:bg-white/5 hover:text-white`
// Màu dữ liệu (đã kiểm tra tương phản và mù màu trên nền thẻ #141728): tím → hồng → xanh, luôn theo thứ tự này
const C1 = '#7c6cff', C2 = '#e94b9e', C3 = '#1c9fd0', C1_HOVER = '#a99cff'
const RANGES = [7, 30, 90]
const KEY = 'cm-stats-days'
const readDays = () => { try { const v = Number(localStorage.getItem(KEY)); return RANGES.includes(v) ? v : 30 } catch { return 30 } }

const num = v => Number(v || 0).toLocaleString(adminLocale())
const pct = (v, total) => (total ? Math.round((v / total) * 100) : 0)
const dayDate = d => new Date(`${d}T00:00:00`)
// Mốc trục dọc tròn số: 0 / nửa / đỉnh
function niceMax(v) {
  if (v <= 4) return 4
  const p = 10 ** Math.floor(Math.log10(v)), f = v / p
  return (f <= 2 ? 2 : f <= 4 ? 4 : f <= 5 ? 5 : f <= 8 ? 8 : 10) * p
}
// Đầu ngày (giờ Việt Nam) của n-1 ngày trước — khớp cách tính trong view_stats
const sinceOf = (n, back = 0) => { const DAY = 864e5, TZ = 7 * 36e5; const today = Math.floor((Date.now() + TZ) / DAY) * DAY - TZ; return today - (n * (back + 1) - 1) * DAY }

function Delta({ cur, prev, days }) {
  const a = useA()
  if (!prev) return <span className="text-xs text-muted">{cur ? a('Chưa có số kỳ trước để so') : ' '}</span>
  const d = Math.round(((cur - prev) / prev) * 100)
  return (
    <span className="text-xs text-muted">
      <b className="font-semibold text-[#dfe0ea]">{d > 0 ? '▲' : d < 0 ? '▼' : '='} {Math.abs(d)}%</b> {a('so với {n} ngày trước đó', { n: days })}
    </span>
  )
}

function Kpi({ label, value, children, onClick }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick} className={`flex min-w-0 flex-col gap-1 rounded-xl border border-line bg-card p-4 text-left ${onClick ? 'transition hover:border-purple/60' : ''}`}>
      <span className="text-sm text-muted">{label}</span>
      <span className="text-[28px] font-bold leading-tight tabular-nums">{value}</span>
      {children}
    </Tag>
  )
}

/** Cột lượt xem theo ngày: rê chuột / Tab vào từng cột để xem số */
function DailyChart({ daily }) {
  const a = useA()
  const [hi, setHi] = useState(null)
  const max = niceMax(Math.max(0, ...daily.map(d => d.views)))
  const n = daily.length
  const fmt = (d, o) => dayDate(d).toLocaleDateString(adminLocale(), o)
  const cur = hi != null ? daily[hi] : null
  const left = hi != null ? Math.min(88, Math.max(12, ((hi + 0.5) / n) * 100)) : 0
  return (
    <div>
      <div className="relative flex h-[190px]">
        {/* trục dọc */}
        <div className="flex w-9 flex-none flex-col justify-between pb-px text-right text-[11px] tabular-nums text-muted" aria-hidden="true">
          <span className="-translate-y-1/2">{num(max)}</span><span>{num(max / 2)}</span><span className="translate-y-1/2">0</span>
        </div>
        <div className="relative ml-2 flex-1" onMouseLeave={() => setHi(null)}>
          {[0, 50, 100].map(y => <i key={y} aria-hidden="true" className="absolute inset-x-0 h-px bg-[#252941]" style={{ top: `${y}%` }} />)}
          <div className={`absolute inset-0 flex items-end ${n > 40 ? 'gap-px' : 'gap-0.5'}`}>
            {daily.map((d, i) => (
              <button key={d.day} type="button" tabIndex={0}
                aria-label={a('{date}: {views} lượt xem, {visitors} người xem', { date: fmt(d.day, { day: 'numeric', month: 'long' }), views: d.views, visitors: d.visitors })}
                onMouseEnter={() => setHi(i)} onFocus={() => setHi(i)} onBlur={() => setHi(null)}
                className="flex h-full min-w-0 flex-1 items-end justify-center outline-none focus-visible:bg-white/5">
                <span className="block w-full max-w-[24px] transition-colors"
                  style={{ height: d.views ? `max(2px, ${(d.views / max) * 100}%)` : 0, background: hi === i ? C1_HOVER : C1, borderRadius: n > 40 ? '2px 2px 0 0' : '4px 4px 0 0' }} />
              </button>
            ))}
          </div>
          {cur && (
            <div role="status" className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-line bg-[#0d0f1a] px-3 py-2 text-xs shadow-[0_10px_30px_#00000080]" style={{ left: `${left}%` }}>
              <p className="text-muted">{fmt(cur.day, { weekday: 'long', day: 'numeric', month: 'numeric' })}</p>
              <p className="mt-0.5"><b className="text-sm tabular-nums text-white">{num(cur.views)}</b> <span className="text-muted">{a('lượt xem')}</span></p>
              <p><b className="tabular-nums text-[#dfe0ea]">{num(cur.visitors)}</b> <span className="text-muted">{a('người xem')}</span></p>
            </div>
          )}
        </div>
      </div>
      <div className="ml-11 mt-2 flex justify-between text-[11px] text-muted" aria-hidden="true">
        <span>{fmt(daily[0].day, { day: 'numeric', month: 'numeric' })}</span>
        {n > 2 && <span>{fmt(daily[Math.floor((n - 1) / 2)].day, { day: 'numeric', month: 'numeric' })}</span>}
        <span>{a('Hôm nay')}</span>
      </div>
      <table className="sr-only">
        <caption>{a('Lượt xem theo ngày')}</caption>
        <thead><tr><th>{a('Ngày')}</th><th>{a('Lượt xem')}</th><th>{a('Người xem')}</th></tr></thead>
        <tbody>{daily.map(d => <tr key={d.day}><td>{d.day}</td><td>{d.views}</td><td>{d.visitors}</td></tr>)}</tbody>
      </table>
    </div>
  )
}

/** Danh sách có thanh ngang (một màu): trang xem nhiều, nguồn khách */
function BarList({ rows, empty }) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-muted">{empty}</p>
  const max = Math.max(...rows.map(r => r.value))
  return (
    <ol className="space-y-3">
      {rows.map(r => (
        <li key={r.key} className="min-w-0">
          <div className="flex items-baseline gap-3 text-sm">
            <span className="min-w-0 flex-1 truncate text-[#dfe0ea]" title={r.title || r.label}>{r.label}{r.tag && <span className="ml-2 rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">{r.tag}</span>}</span>
            <span className="flex-none tabular-nums text-white">{num(r.value)}{r.share != null && <span className="ml-1.5 text-xs text-muted">{r.share}%</span>}</span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-white/[0.04]"><div className="h-full rounded-full" style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, background: C1 }} /></div>
        </li>
      ))}
    </ol>
  )
}

/** Thanh chia phần trăm (thiết bị, ngôn ngữ) + chú thích có số */
function Split({ parts, empty }) {
  const total = parts.reduce((s, p) => s + p.value, 0)
  if (!total) return <p className="py-3 text-sm text-muted">{empty}</p>
  const shown = parts.filter(p => p.value)
  return (
    <div>
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={shown.map(p => `${p.label} ${pct(p.value, total)}%`).join(', ')}>
        {shown.map(p => <span key={p.key} title={`${p.label}: ${num(p.value)} (${pct(p.value, total)}%)`} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} className="min-w-[3px]" />)}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
        {parts.map(p => (
          <li key={p.key} className="flex items-center gap-2">
            <i aria-hidden="true" className="size-2.5 rounded-full" style={{ background: p.color }} />
            <span className="text-[#c9cbd8]">{p.label}</span>
            <b className="tabular-nums text-white">{pct(p.value, total)}%</b>
            <span className="text-xs tabular-nums text-muted">({num(p.value)})</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const Card = ({ title, hint, children, className = '' }) => (
  <section className={`min-w-0 rounded-xl border border-line bg-card p-5 ${className}`}>
    <header className="mb-4"><h3 className="font-semibold">{title}</h3>{hint && <p className="text-xs text-muted">{hint}</p>}</header>
    {children}
  </section>
)

export default function StatsPanel({ go }) {
  const a = useA()
  const [days, setDays] = useState(readDays)
  const [data, setData] = useState(null); const [err, setErr] = useState(null); const [busy, setBusy] = useState(true)
  const [names, setNames] = useState({ post: {}, project: {}, bug: {} })
  const [msgs, setMsgs] = useState(null)

  const load = () => {
    setBusy(true); setErr(null)
    loadStats(days).then(d => { setData(d); setBusy(false) }).catch(e => { setErr(e); setBusy(false) })
  }
  useEffect(load, [days])
  useEffect(() => {
    const titles = t => supabase.from(t).select('id, title').then(({ data }) => Object.fromEntries((data || []).map(r => [r.id, r.title])), () => ({}))
    Promise.all([titles('posts'), titles('projects'), titles('bugs')]).then(([post, project, bug]) => setNames({ post, project, bug }))
    loadMessages().then(({ data }) => setMsgs(data || []), () => setMsgs([]))
  }, [])
  const pick = d => { setDays(d); try { localStorage.setItem(KEY, String(d)) } catch {} }

  // Tin nhắn mới trong kỳ và kỳ trước
  const msgCount = useMemo(() => {
    if (!msgs) return null
    const s = sinceOf(days), p = sinceOf(days, 1)
    const t = m => Date.parse(m.created_at)
    return { cur: msgs.filter(m => t(m) >= s).length, prev: msgs.filter(m => t(m) >= p && t(m) < s).length }
  }, [msgs, days])

  const missing = err && /view_stats|page_views|PGRST202|42883|42P01|schema cache/i.test(`${err.code || ''} ${err.message || ''}`)
  const pageLabel = r => r.kind === 'home' ? { label: a('Trang chủ') }
    : r.kind === 'blog' ? { label: a('Danh sách Blog') }
    : r.kind === 'post' ? { label: names.post[r.ref_id] || a('Bài #{id} (đã xóa)', { id: r.ref_id }), tag: a('Bài') }
    : r.kind === 'bug' ? { label: names.bug[r.ref_id] || a('Bug #{id} (đã xóa)', { id: r.ref_id }), tag: 'Bug' }
    : r.kind === 'cv' ? { label: a('CV online') }
    : r.kind === 'selftest' ? { label: a('Trang Kiểm thử web') }
    : { label: names.project[r.ref_id] || a('Dự án #{id} (đã xóa)', { id: r.ref_id }), tag: a('Dự án') }
  const srcLabel = s => (s === 'direct' ? a('Vào thẳng (gõ link, bookmark)') : s)

  const visits = data ? data.sources.reduce((s, x) => s + x.visits, 0) : 0
  return (
    <section aria-labelledby="stats-title" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id="stats-title" className="flex flex-wrap items-center gap-2 text-lg font-semibold">
            {a('Lượt xem trang')}
            {data?.sample && <span title={a('Bản demo: số liệu sinh ngẫu nhiên để xem giao diện. Web thật chỉ hiện lượt xem thật.')} className="rounded-full border border-[#f8d27c]/40 bg-[#f8d27c]/10 px-2 py-0.5 text-[11px] font-semibold text-[#f8d27c]">{a('Dữ liệu mẫu')}</span>}
          </h2>
          <p className="text-xs text-muted">{a('Không tính bot và trình duyệt đã đăng nhập Admin. Không lưu IP của khách.')}</p>
        </div>
        <div role="radiogroup" aria-label={a('Khoảng thời gian')} className="flex rounded-lg border border-line p-0.5">
          {RANGES.map(d => (
            <button key={d} type="button" role="radio" aria-checked={days === d} onClick={() => pick(d)}
              className={`rounded-md px-3 py-1.5 text-sm transition ${days === d ? 'bg-purple/20 font-semibold text-white' : 'text-muted hover:text-white'}`}>{a('{n} ngày', { n: d })}</button>
          ))}
        </div>
      </div>

      {err ? (
        <div className="rounded-xl border border-[#f8d27c]/40 bg-[#f8d27c]/10 p-4 text-sm text-[#f8d27c]">
          {missing
            ? <p>{a('Chưa bật thống kê. Vào Supabase → SQL Editor, chạy file')} <code className="rounded bg-black/30 px-1">supabase/migration-thong-ke.sql</code> {a('(cài mới bằng schema.sql thì đã có).')}</p>
            : <p>{a('Chưa tải được số liệu: {msg}', { msg: err.message || String(err) })}</p>}
          <button onClick={load} className={`${ghost} mt-3`}>{a('Thử lại')}</button>
        </div>
      ) : (
        <div className={`space-y-4 transition-opacity ${busy && data ? 'opacity-60' : ''}`} aria-busy={busy}>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <Kpi label={a('Lượt xem')} value={data ? num(data.views) : '–'}>{data && <Delta cur={data.views} prev={data.prev_views} days={days} />}</Kpi>
            <Kpi label={a('Người xem')} value={data ? num(data.visitors) : '–'}>{data && <Delta cur={data.visitors} prev={data.prev_visitors} days={days} />}</Kpi>
            <Kpi label={a('Lượt đọc bài blog')} value={data ? num(data.post_views) : '–'}>{data && <Delta cur={data.post_views} prev={data.prev_post_views} days={days} />}</Kpi>
            <Kpi label={a('Tin nhắn mới')} value={msgCount ? num(msgCount.cur) : '–'} onClick={() => go('messages')}>{msgCount && <Delta cur={msgCount.cur} prev={msgCount.prev} days={days} />}</Kpi>
          </div>

          <Card title={a('Lượt xem theo ngày')} hint={a('Rê chuột vào từng cột để xem số. Tính theo giờ Việt Nam.')}>
            {!data ? <div className="h-[214px] animate-pulse rounded-lg bg-white/[0.03]" />
              : data.views ? <DailyChart daily={data.daily} />
              : <p className="grid h-[214px] place-items-center text-center text-sm text-muted">{a('Chưa có lượt xem nào trong {n} ngày qua. Số liệu sẽ có khi web chạy thật và có khách ghé.', { n: days })}</p>}
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title={a('Xem nhiều nhất')} hint={a('Trang, bài viết và dự án được mở nhiều nhất.')}>
              {data ? <BarList rows={data.pages.map(r => ({ key: `${r.kind}-${r.ref_id}`, value: r.views, ...pageLabel(r) }))} empty={a('Chưa có số liệu.')} /> : <div className="h-40 animate-pulse rounded-lg bg-white/[0.03]" />}
              {data?.broken > 0 && <p className="mt-4 border-t border-line pt-3 text-xs text-muted">{a('Có {n} lượt mở link không tồn tại (trang 404). Kiểm tra lại link cũ đã chia sẻ.', { n: data.broken })}</p>}
            </Card>
            <Card title={a('Khách đến từ đâu')} hint={a('Tính theo trang đầu tiên của mỗi lượt ghé thăm.')}>
              {data ? <BarList rows={data.sources.map(s => ({ key: s.source, label: srcLabel(s.source), value: s.visits, share: pct(s.visits, visits) }))} empty={a('Chưa có số liệu.')} /> : <div className="h-40 animate-pulse rounded-lg bg-white/[0.03]" />}
            </Card>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card title={a('Thiết bị')}>
              <Split empty={a('Chưa có số liệu.')} parts={[
                { key: 'mobile', label: a('Điện thoại'), value: data?.devices?.mobile || 0, color: C1 },
                { key: 'desktop', label: a('Máy tính'), value: data?.devices?.desktop || 0, color: C2 },
                { key: 'tablet', label: a('Máy tính bảng'), value: data?.devices?.tablet || 0, color: C3 },
              ]} />
            </Card>
            <Card title={a('Ngôn ngữ khách xem')}>
              <Split empty={a('Chưa có số liệu.')} parts={[
                { key: 'vi', label: a('Tiếng Việt'), value: data?.langs?.vi || 0, color: C1 },
                { key: 'en', label: 'English', value: data?.langs?.en || 0, color: C2 },
              ]} />
            </Card>
          </div>
        </div>
      )}
    </section>
  )
}
