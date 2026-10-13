// Hiệu ứng theo mùa / dịp lễ: tuyết rơi, hoa mai rơi, hoa đào rơi, pháo hoa.
// Chỉnh trong Admin → Hiệu ứng theo mùa. Tự tắt khi máy bật "giảm chuyển động".
import { useEffect, useRef } from 'react'
import { SEASON_EFFECTS, SEASON_NAME, AMOUNTS, activeSeason } from './seasonCfg.js'
export { SEASON_EFFECTS, SEASON_NAME, AMOUNTS, activeSeason } // giữ nguyên chỗ import cũ (Admin)

import SeasonWorker from './seasonWorker.js?worker&inline'
import { startSeason } from './seasonEngine.js'

// Vẽ trong Worker khi trình duyệt cho phép (Chrome, Edge, Firefox, Safari mới); không thì vẽ trên luồng chính như trước
const canWorker = () => typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined' && !!HTMLCanvasElement.prototype.transferControlToOffscreen

// z-[55]: nằm trên thanh menu (z-50)
export default function SeasonFX({ effect, amount = 'medium' }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!effect || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const host = ref.current
    const mult = (AMOUNTS.find(a => a[0] === amount)?.[2] ?? 1) * (innerWidth < 640 ? 0.55 : 1)
    let stopped = false, worker = null, eng = null, cv = null
    // transferControlToOffscreen chỉ gọi được 1 lần cho mỗi canvas → mỗi lần chạy / quay về cách cũ dùng canvas mới
    const mount = () => { cv = document.createElement('canvas'); cv.className = 'size-full'; host.appendChild(cv); return cv }
    const unmount = () => { cv?.remove(); cv = null }
    const runMain = () => { eng = startSeason({ canvas: mount(), effect, mult, W: innerWidth, H: innerHeight }) }
    const fallback = () => {
      if (stopped || eng) return
      worker?.terminate(); worker = null; unmount(); runMain()
    }
    if (canWorker()) {
      try {
        const off = mount().transferControlToOffscreen()
        worker = new SeasonWorker()
        worker.onmessage = e => { if (e.data?.type === 'fallback') fallback() }
        worker.onerror = fallback
        worker.postMessage({ type: 'init', canvas: off, effect, mult, W: innerWidth, H: innerHeight }, [off])
      } catch { fallback() }
    } else runMain()

    let resizing = 0
    const onResize = () => { if (!resizing) resizing = requestAnimationFrame(() => {
      resizing = 0
      if (eng) eng.resize(innerWidth, innerHeight); else worker?.postMessage({ type: 'size', W: innerWidth, H: innerHeight })
    }) }
    addEventListener('resize', onResize)
    return () => {
      stopped = true; cancelAnimationFrame(resizing); removeEventListener('resize', onResize)
      eng?.stop(); worker?.postMessage({ type: 'stop' }); worker?.terminate(); unmount()
    }
  }, [effect, amount])
  if (!effect) return null
  return <div ref={ref} aria-hidden="true" data-cfx-ignore="" className="pointer-events-none fixed inset-0 z-[55]" />
}
