// Backend giả lập chạy hoàn toàn trong trình duyệt (dùng khi chưa cấu hình Supabase).
// Mô phỏng đúng phần API Supabase mà app dùng, dữ liệu lưu localStorage của trình duyệt.
import { demo } from './data.js'
import { at } from './adminLang.js'
import { computeStats, sampleViews } from './statsCalc.js'

const KEY = 'cm-demo-db-v11', AUTH = 'cm-demo-auth-v1'
export const DEMO_EMAIL = 'admin@demo.com', DEMO_PASSWORD = 'demo123'

const clone = o => JSON.parse(JSON.stringify(o))
const seed = () => {
  const db = {}
  Object.entries(demo).forEach(([t, v]) => { db[t] = Array.isArray(v) ? clone(v).map(r => ({ visible: true, ...r })) : [{ id: 1, ...clone(v) }] })
  return db
}
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)) } catch { return null } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* trình duyệt chặn storage: vẫn chạy trong bộ nhớ */ } },
  del(k) { try { localStorage.removeItem(k) } catch {} },
}
let mem = store.get(KEY) || seed()
const save = () => store.set(KEY, mem)


// Realtime giả lập: báo thay đổi cho các trang đang mở (cùng tab và tab khác)
const subs = new Set()
const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('cm-demo-live') : null
// Tab khác báo thay đổi: áp thẳng thay đổi vào bộ nhớ của tab này
// (không đọc lại localStorage vì giữa các tab nó có thể chưa kịp đồng bộ)
if (bc) bc.onmessage = e => {
  const { table, eventType, new: row, old } = e.data || {}
  const rows = mem[table] || (mem[table] = [])
  if (eventType === 'DELETE') mem[table] = rows.filter(r => r.id !== old?.id)
  else { const i = rows.findIndex(r => r.id === row?.id); i >= 0 ? (rows[i] = row) : rows.push(row) }
  subs.forEach(fn => fn(e.data))
}
const emitChange = evt => { subs.forEach(fn => fn(evt)); try { bc?.postMessage(evt) } catch {} }

function run(st) {
  const rows = mem[st.table] || (mem[st.table] = [])
  const match = r => st.filters.every(([c, v, op]) => (op === 'in' ? v.includes(r[c]) : r[c] === v))
  if (st.op === 'select') {
    let out = rows.filter(match)
    ;[...st.orders].reverse().forEach(([c, asc]) => out = [...out].sort((a, b) => ((a[c] ?? 0) > (b[c] ?? 0) ? 1 : (a[c] ?? 0) < (b[c] ?? 0) ? -1 : 0) * (asc ? 1 : -1)))
    out = clone(out)
    return { data: st.single ? out[0] ?? null : out, error: null }
  }
  const changed = []
  if (st.op === 'insert') { const row = { created_at: new Date().toISOString(), ...clone(st.payload), id: Math.max(0, ...rows.map(r => r.id)) + 1 }; rows.push(row); changed.push(['INSERT', row]) }
  if (st.op === 'update') rows.forEach((r, i) => { if (match(r)) { rows[i] = { ...r, ...clone(st.payload) }; changed.push(['UPDATE', rows[i]]) } })
  if (st.op === 'delete') { rows.filter(match).forEach(r => changed.push(['DELETE', r])); mem[st.table] = rows.filter(r => !match(r)) }
  if (st.op === 'upsert') {
    const i = rows.findIndex(r => r.id === st.payload.id)
    i >= 0 ? rows[i] = { ...rows[i], ...clone(st.payload) } : rows.push(clone(st.payload))
  }
  save()
  changed.forEach(([eventType, row]) => emitChange({ table: st.table, eventType, new: eventType === 'DELETE' ? {} : clone(row), old: eventType === 'DELETE' ? clone(row) : {} }))
  return { data: null, error: null }
}

function from(table) {
  const st = { table, op: 'select', filters: [], orders: [], single: false, payload: null }
  const q = {
    select() { return q },
    order(c, { ascending = true } = {}) { st.orders.push([c, ascending]); return q },
    eq(c, v) { st.filters.push([c, v]); return q },
    in(c, list) { st.filters.push([c, list, 'in']); return q },
    maybeSingle() { st.single = true; return q },
    range() { return q },
    insert(p) { st.op = 'insert'; st.payload = p; return q },
    update(p) { st.op = 'update'; st.payload = p; return q },
    upsert(p) { st.op = 'upsert'; st.payload = p; return q },
    delete() { st.op = 'delete'; return q },
    then(ok, fail) { return new Promise(r => setTimeout(() => r(run(st)), 120)).then(ok, fail) },
  }
  return q
}

const listeners = new Set()
// Tài khoản demo (email, mật khẩu, hồ sơ) lưu trong trình duyệt để thử chức năng Tài khoản của tôi
const ACCOUNT = 'cm-demo-account-v1'
export const demoAccount = () => ({ email: DEMO_EMAIL, password: DEMO_PASSWORD, meta: {}, ...(store.get(ACCOUNT) || {}) })
const userOf = acc => ({ id: 'demo-user', email: acc.email, user_metadata: { ...acc.meta } })
let session = store.get(AUTH)
const emit = evt => listeners.forEach(cb => cb(evt || (session ? 'SIGNED_IN' : 'SIGNED_OUT'), session))

function channel() {
  const handlers = []; let fn = null
  const ch = {
    on(_type, filter, cb) { handlers.push([filter, cb]); return ch },
    subscribe() { fn = evt => handlers.forEach(([f, cb]) => { if (!f.table || f.table === evt.table) if (f.event === '*' || f.event === evt.eventType) cb(evt) }); subs.add(fn); return ch },
    unsubscribe() { if (fn) subs.delete(fn) },
  }
  return ch
}

// Hàm SQL giả lập. view_stats: số liệu MẪU (sinh theo ngày) + lượt xem thật ghi trong bản demo
async function rpc(name, args = {}) {
  await new Promise(r => setTimeout(r, 150))
  if (!session) return { data: null, error: { message: at('Chưa đăng nhập.') } }
  if (name === 'restore_backup') {
    const { tbl, rows = [], overwrite = false } = args
    const list = mem[tbl] || (mem[tbl] = [])
    let n = 0
    for (const r of rows) {
      if (!r || r.id == null) continue
      const i = list.findIndex(x => x.id === r.id)
      if (i < 0) { list.push(clone(r)); n++ } else if (overwrite) { list[i] = { ...list[i], ...clone(r) }; n++ }
    }
    save()
    return { data: n, error: null }
  }
  if (name !== 'view_stats') return { data: null, error: { message: `Unknown function ${name}` } }
  const ids = t => (mem[t] || []).filter(r => r.visible !== false).map(r => r.id)
  const rows = [...sampleViews({ posts: ids('posts'), projects: ids('projects') }), ...(mem.page_views || [])]
  return { data: computeStats(rows, args.days), error: null }
}

export const demoClient = {
  from,
  rpc,
  channel,
  removeChannel: ch => ch.unsubscribe(),
  auth: {
    getSession: async () => ({ data: { session } }),
    onAuthStateChange(cb) { listeners.add(cb); return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } } },
    getUser: async () => ({ data: { user: session?.user ?? null }, error: null }),
    async signInWithPassword({ email, password }) {
      await new Promise(r => setTimeout(r, 300))
      const acc = demoAccount()
      if (email.trim().toLowerCase() !== acc.email || password !== acc.password)
        return { error: { message: at('Sai email hoặc mật khẩu. Tài khoản demo: {email} / {password}', { email: acc.email, password: acc.password }) } }
      session = { user: userOf(acc) }; store.set(AUTH, session); emit()
      return { data: { session }, error: null }
    },
    // Bản demo: đổi email/mật khẩu/hồ sơ có hiệu lực ngay (bản thật đổi email cần bấm link xác nhận trong thư)
    async updateUser({ email, password, data } = {}) {
      await new Promise(r => setTimeout(r, 300))
      if (!session) return { data: { user: null }, error: { message: at('Chưa đăng nhập.') } }
      const acc = demoAccount()
      if (email) acc.email = email.trim().toLowerCase()
      if (password) acc.password = password
      if (data) acc.meta = { ...acc.meta, ...data }
      store.set(ACCOUNT, acc)
      session = { user: userOf(acc) }; store.set(AUTH, session); emit('USER_UPDATED')
      return { data: { user: session.user }, error: null }
    },
    async signOut() { session = null; store.del(AUTH); emit(); return { error: null } },
  },
}
