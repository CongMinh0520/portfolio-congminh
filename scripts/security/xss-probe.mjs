// Probe XSS cho các hàm render thuần phía server (render/).
// Nạp payload vào từng bề mặt render, kiểm output có tạo được THẺ THẬT (literal '<')
// mang handler / javascript: hay không. Payload đã escape -> '&lt;' nên không phải thẻ thật.
// Lưu ý: hàm Markdown phía client (src/Detail.jsx) là bản sao của mdToHtml nên cùng tính chất.
// Chạy: node scripts/security/xss-probe.mjs   (exit 0 = tất cả PASS)

import { mdToHtml, esc } from '../../render/shared.js'
import { renderPage, postMeta } from '../../render/page.js'
import { renderRss } from '../../render/feeds.js'

const PAYLOADS = [
  '<script>alert(1)</script>', '"><img src=x onerror=alert(1)>', '</script><script>alert(1)</script>',
  '[x](javascript:alert(1))', '![x](javascript:alert(1))', ']]><script>alert(1)</script>',
  '<!--</title><svg onload=alert(1)>', "');alert(1)//", '<iframe src=javascript:alert(1)>',
  '![x](/local.png)', '![x](https://a) trailing',   // dòng "![" không hợp lệ: từng gây lặp vô hạn (DoS)
]
const SAFE_SCRIPT = /^(application\/(ld\+json|json))/i
function liveTag(html) {
  const re = /<([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g
  let m
  while ((m = re.exec(html))) {
    const tag = m[1].toLowerCase(), attrs = m[2]
    const bare = attrs.replace(/"[^"]*"|'[^']*'/g, '=""') // bỏ giá trị trong ngoặc (payload escape nằm trong đó)
    if (tag === 'script') {
      const type = (attrs.match(/type\s*=\s*["']?([^"'\s>]+)/i) || [])[1] || ''
      if (SAFE_SCRIPT.test(type)) continue // thẻ ld+json / cm-data an toàn của app
      return `<script ${attrs.trim()}>`
    }
    if (['svg', 'iframe', 'object', 'embed', 'base', 'form'].includes(tag)) return `<${tag}>`
    if (/\son\w+\s*=/i.test(bare)) return `<${tag}${attrs}> (on*)`
    if (/\b(href|src|xlink:href)\s*=\s*["']?\s*javascript:/i.test(bare)) return `<${tag}${attrs}> (js:)`
  }
  return null
}

const origin = 'https://example.com'
let pass = 0, fail = 0; const rows = []
const check = (surface, field, payload, html) => {
  const live = liveTag(html), ok = !live
  rows.push({ surface, field, payload: payload.slice(0, 30), result: ok ? 'PASS' : 'FAIL ' + live.slice(0, 36) })
  ok ? pass++ : fail++
}
const shell = '<!doctype html><html><head><title>x</title></head><body><div id=root></div></body></html>'
for (const p of PAYLOADS) {
  check('mdToHtml', 'content', p, mdToHtml(p, origin))
  check('esc', 'meta-attr', p, `<meta content="${esc(p)}">`)
  const meta = postMeta({ id: 1, title: p, excerpt: p, content: p, slug: 'a', image: p, published_at: '2026-01-01' }, origin)
  check('renderPage', 'post-meta', p, renderPage(shell, { meta, status: 200, data: null }))
  check('renderPage', 'cm-data', p, renderPage(shell, { meta: null, status: 200, data: { settings: { x: p }, socials: [], posts: [{ title: p, content: p }] } }))
  check('renderRss', 'item', p, renderRss({ posts: [{ id: 1, title: p, excerpt: p, content: p, slug: 'a', published_at: '2026-01-01', tags: [p] }], bugs: [], origin }))
}
console.log('SURFACE'.padEnd(11), 'FIELD'.padEnd(11), 'PAYLOAD'.padEnd(31), 'RESULT')
for (const r of rows) console.log(r.surface.padEnd(11), r.field.padEnd(11), r.payload.padEnd(31), r.result)
console.log('\nTOTAL:', pass, 'PASS /', fail, 'FAIL  (', PAYLOADS.length, 'payloads x 5 surfaces =', PAYLOADS.length * 5, 'checks )')
process.exit(fail ? 1 : 0)
