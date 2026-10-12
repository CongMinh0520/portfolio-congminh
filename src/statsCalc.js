// Tính số liệu thống kê lượt xem từ danh sách lượt xem — dùng cho bản demo.
// Kết quả giống hệt hàm SQL public.view_stats(days) trên Supabase (xem supabase/migration-thong-ke.sql).
const TZ_OFFSET = 7 * 3600e3 // giờ Việt Nam (UTC+7), không đổi giờ theo mùa
const DAY = 86400e3
const dayOf = ms => new Date(Math.floor((ms + TZ_OFFSET) / DAY) * DAY).toISOString().slice(0, 10)
const startOfDay = ms => Math.floor((ms + TZ_OFFSET) / DAY) * DAY - TZ_OFFSET

export function computeStats(rows, days = 30, now = Date.now()) {
  const n = Math.max(1, Math.min(366, Number(days) || 30))
  const today = startOfDay(now)
  const since = today - (n - 1) * DAY, prevSince = today - (2 * n - 1) * DAY
  const t = r => Date.parse(r.created_at)
  const cur = rows.filter(r => t(r) >= since), prev = rows.filter(r => t(r) >= prevSince && t(r) < since)
  const uniq = list => new Set(list.map(r => r.visitor).filter(Boolean)).size
  const group = (list, key) => list.reduce((m, r) => { const k = key(r); (m[k] ||= []).push(r); return m }, {})

  const byDay = group(cur, r => dayOf(t(r)))
  const daily = Array.from({ length: n }, (_, i) => { const d = dayOf(since + i * DAY); const l = byDay[d] || []; return { day: d, views: l.length, visitors: uniq(l) } })
  const pages = Object.values(group(cur.filter(r => r.kind !== 'notfound'), r => `${r.kind}|${r.ref_id ?? ''}`))
    .map(l => ({ kind: l[0].kind, ref_id: l[0].ref_id ?? null, path: l.map(r => r.path).sort()[0], views: l.length }))
    .sort((x, y) => y.views - x.views).slice(0, 8)
  const sources = Object.entries(group(cur.filter(r => r.source), r => r.source))
    .map(([source, l]) => ({ source, visits: l.length })).sort((x, y) => y.visits - x.visits).slice(0, 6)
  const count = key => Object.fromEntries(Object.entries(group(cur, r => r[key])).map(([k, l]) => [k, l.length]))
  return {
    days: n, views: cur.length, visitors: uniq(cur), prev_views: prev.length, prev_visitors: uniq(prev),
    post_views: cur.filter(r => r.kind === 'post').length, prev_post_views: prev.filter(r => r.kind === 'post').length,
    daily, pages, sources, devices: count('device'), langs: count('lang'), broken: cur.filter(r => r.kind === 'notfound').length,
  }
}

/**
 * Lượt xem MẪU cho bản demo (không phải số thật). Sinh cố định theo ngày nên tải lại vẫn giống nhau.
 * posts / projects: danh sách id để các trang mẫu trỏ đúng bài, dự án đang có.
 */
export function sampleViews({ posts = [], projects = [], now = Date.now(), days = 180 } = {}) {
  let seed = 20261012
  const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296 }
  const pick = list => { let x = rnd() * list.reduce((s, [, w]) => s + w, 0); for (const [v, w] of list) { if ((x -= w) < 0) return v } return list[0][0] }
  const out = []
  const today = startOfDay(now)
  for (let i = days - 1; i >= 0; i--) {
    const d0 = today - i * DAY
    const weekday = new Date(d0 + TZ_OFFSET).getUTCDay()
    const base = 6 + (days - i) * 0.06 + (weekday === 0 || weekday === 6 ? -3 : 2)
    const visitors = Math.max(1, Math.round(base + rnd() * 6))
    for (let v = 0; v < visitors; v++) {
      const visitor = `s${i}-${v}`
      const device = pick([['mobile', 58], ['desktop', 37], ['tablet', 5]])
      const lang = pick([['vi', 78], ['en', 22]])
      const source = pick([['direct', 30], ['Google', 28], ['LinkedIn', 18], ['Facebook', 14], ['Zalo', 6], ['github.com', 4]])
      const pages = 1 + Math.floor(rnd() * 3)
      for (let p = 0; p < pages; p++) {
        const kind = p === 0 ? pick([['home', 55], ['post', 35], ['project', 10]]) : pick([['post', 45], ['project', 25], ['blog', 20], ['home', 10]])
        const ref = kind === 'post' && posts.length ? posts[Math.floor(Math.pow(rnd(), 1.8) * posts.length)] : kind === 'project' && projects.length ? projects[Math.floor(rnd() * projects.length)] : null
        out.push({
          created_at: new Date(d0 + Math.floor(rnd() * (DAY - 1))).toISOString(),
          kind: ref || ['home', 'blog'].includes(kind) ? kind : 'home', ref_id: ref, path: kind === 'blog' ? '/blog' : '/',
          source: p === 0 ? source : null, device, lang, visitor,
        })
      }
    }
    if (rnd() < 0.08) out.push({ created_at: new Date(d0 + 3600e3 * 10).toISOString(), kind: 'notfound', ref_id: null, path: '/link-cu', source: 'direct', device: 'desktop', lang: 'vi', visitor: `s${i}-x` })
  }
  return out.filter(r => Date.parse(r.created_at) <= now)
}
