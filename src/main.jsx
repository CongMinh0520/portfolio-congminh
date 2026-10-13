import { Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Mở trang từ bản deploy cũ (hoặc mạng chập chờn) → file JS của trang tải lười (Kiểm thử, CV, Admin…) bị 404.
// Tải lại trang một lần để lấy HTML mới với đúng tên file; trong 10 giây chỉ thử một lần để không bị lặp.
window.addEventListener('vite:preloadError', e => {
  try {
    const last = Number(sessionStorage.getItem('cm-reload')) || 0
    if (Date.now() - last < 10000) return
    sessionStorage.setItem('cm-reload', String(Date.now()))
  } catch { /* chế độ riêng tư: vẫn thử tải lại */ }
  e.preventDefault()
  location.reload()
})

// Lỗi khi vẽ trang: hiện nút tải lại thay vì để trống cả trang
class Boundary extends Component {
  state = { err: null }
  static getDerivedStateFromError(err) { return { err } }
  render() {
    if (!this.state.err) return this.props.children
    const en = document.documentElement.lang === 'en'
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <div>
          <p className="text-lg font-semibold">{en ? 'This page could not load.' : 'Trang chưa tải được.'}</p>
          <button type="button" onClick={() => location.reload()} className="mt-4 rounded-full bg-gradient-to-r from-pink to-purple px-5 py-2.5 font-semibold text-white">{en ? 'Reload' : 'Tải lại trang'}</button>
        </div>
      </div>
    )
  }
}

createRoot(document.getElementById('root')).render(<Boundary><App /></Boundary>)
