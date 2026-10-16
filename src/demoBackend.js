// Backend giả lập chạy hoàn toàn trong trình duyệt (dùng khi chưa cấu hình Supabase).
// Mô phỏng đúng phần API Supabase mà app dùng, dữ liệu lưu localStorage của trình duyệt.
import { demo } from './data.js'
import { at } from './adminLang.js'
import { computeStats, sampleViews } from './statsCalc.js'

const KEY = 'cm-demo-db-v12', AUTH = 'cm-demo-auth-v1'
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
const userOf = acc => ({ id: 'demo-user', email: acc.email, user_metadata: { ...acc.meta }, factors: (acc.factors || []).map(({ secret, ...f }) => f) })
const saveAcc = acc => { store.set(ACCOUNT, acc); session = { ...session, user: userOf(acc) }; store.set(AUTH, session) }

// Xác thực 2 bước (TOTP) giả lập: mã 6 số tính đúng chuẩn RFC 6238 nên dùng được app xác thực thật
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const b32decode = s => { let bits = ''; for (const ch of s.replace(/=+$/, '')) bits += B32.indexOf(ch).toString(2).padStart(5, '0'); return Uint8Array.from(bits.match(/.{8}/g) || [], b => parseInt(b, 2)) }
async function totpAt(secret, step) {
  const key = await crypto.subtle.importKey('raw', b32decode(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])
  const msg = new DataView(new ArrayBuffer(8)); msg.setUint32(4, step)
  const h = new Uint8Array(await crypto.subtle.sign('HMAC', key, msg.buffer)), o = h[19] & 15
  return String((((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1e6).padStart(6, '0')
}
/** Mã TOTP hiện tại của khóa bí mật (bản demo dùng để thử, không có trong bản thật) */
export const demoTotp = secret => totpAt(secret, Math.floor(Date.now() / 30000))
const mfaErr = message => ({ data: null, error: { message } })
const mfa = {
  async enroll({ friendlyName } = {}) {
    if (!session) return mfaErr(at('Chưa đăng nhập.'))
    const acc = demoAccount(), secret = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => B32[b & 31]).join('')
    const f = { id: `demo-${Date.now().toString(36)}`, factor_type: 'totp', friendly_name: friendlyName || '', status: 'unverified', created_at: new Date().toISOString(), secret }
    acc.factors = [...(acc.factors || []), f]; saveAcc(acc)
    const uri = `otpauth://totp/Demo:${encodeURIComponent(acc.email)}?secret=${secret}&issuer=Demo`
    return { data: { id: f.id, type: 'totp', friendly_name: f.friendly_name, totp: { qr_code: '', secret, uri } }, error: null }
  },
  async challenge({ factorId }) { return { data: { id: `ch-${factorId}`, type: 'totp', expires_at: Date.now() / 1000 + 300 }, error: null } },
  async verify({ factorId, code }) {
    await new Promise(r => setTimeout(r, 250))
    const acc = demoAccount(), f = (acc.factors || []).find(x => x.id === factorId)
    if (!session || !f) return mfaErr(at('Không tìm thấy phương thức xác thực.'))
    const now = Math.floor(Date.now() / 30000), ok = await Promise.all([now - 1, now, now + 1].map(t => totpAt(f.secret, t)))
    if (!ok.includes(String(code).trim())) return mfaErr(at('Mã không đúng hoặc đã hết hạn.'))
    f.status = 'verified'; session = { ...session, aal: 'aal2' }; saveAcc(acc); emit('MFA_CHALLENGE_VERIFIED')
    return { data: { access_token: 'demo' }, error: null }
  },
  async challengeAndVerify({ factorId, code }) { return mfa.verify({ factorId, code }) },
  async unenroll({ factorId }) {
    const acc = demoAccount(), f = (acc.factors || []).find(x => x.id === factorId)
    if (!session || !f) return mfaErr(at('Không tìm thấy phương thức xác thực.'))
    if (f.status === 'verified' && session.aal !== 'aal2') return mfaErr(at('Cần nhập mã xác thực trước khi gỡ.'))
    acc.factors = acc.factors.filter(x => x.id !== factorId); saveAcc(acc); emit('USER_UPDATED')
    return { data: { id: factorId }, error: null }
  },
  async listFactors() {
    const all = session?.user?.factors || []
    return { data: { all, totp: all.filter(f => f.status === 'verified'), phone: [] }, error: null }
  },
  async getAuthenticatorAssuranceLevel() {
    if (!session) return { data: { currentLevel: null, nextLevel: null, currentAuthenticationMethods: [] }, error: null }
    const has = (session.user.factors || []).some(f => f.status === 'verified'), cur = session.aal || 'aal1'
    return { data: { currentLevel: cur, nextLevel: has ? 'aal2' : cur, currentAuthenticationMethods: [] }, error: null }
  },
}
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
      session = { user: userOf(acc), aal: 'aal1' }; store.set(AUTH, session); emit()
      return { data: { session }, error: null }
    },
    // Bản demo: đổi email/mật khẩu/hồ sơ có hiệu lực ngay (bản thật đổi email cần bấm link xác nhận trong thư)
    async updateUser({ email, password, data } = {}) {
      await new Promise(r => setTimeout(r, 300))
      if (!session) return { data: { user: null }, error: { message: at('Chưa đăng nhập.') } }
      const acc = demoAccount()
      if (email) acc.email = email.trim().toLowerCase()
      if (password) acc.password = password
      if (password && (acc.factors || []).some(f => f.status === 'verified') && session.aal !== 'aal2') return { data: { user: null }, error: { message: at('Cần nhập mã xác thực trước khi đổi mật khẩu.') } }
      if (data) acc.meta = { ...acc.meta, ...data }
      saveAcc(acc); emit('USER_UPDATED')
      return { data: { user: session.user }, error: null }
    },
    mfa,
    async signOut() { session = null; store.del(AUTH); emit(); return { error: null } },
  },
}
