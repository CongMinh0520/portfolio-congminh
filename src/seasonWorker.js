// Worker vẽ hiệu ứng mùa. Luồng chính gửi canvas (OffscreenCanvas) + cấu hình, sau đó chỉ gửi kích thước mới khi đổi cỡ cửa sổ.
import { startSeason } from './seasonEngine.js'

let eng = null
self.onmessage = ({ data: m }) => {
  if (m.type === 'init') {
    // Worker của một số trình duyệt chưa có requestAnimationFrame → báo để luồng chính tự vẽ như cũ
    if (typeof requestAnimationFrame !== 'function') { self.postMessage({ type: 'fallback' }); return }
    try { eng = startSeason(m); self.postMessage({ type: 'ready' }) } catch (e) { self.postMessage({ type: 'fallback', error: String(e) }) }
  } else if (m.type === 'size') eng?.resize(m.W, m.H)
  else if (m.type === 'stop') { eng?.stop(); eng = null }
}
