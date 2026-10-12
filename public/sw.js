// Service worker chỉ dùng cho thông báo đẩy của Admin (không lưu đệm trang, không đổi cách web chạy).
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

self.addEventListener('push', e => {
  let d = {}
  try { d = e.data ? e.data.json() : {} } catch { d = { body: e.data ? e.data.text() : '' } }
  e.waitUntil(self.registration.showNotification(d.title || 'Công Minh', {
    body: d.body || '', tag: d.tag || 'cm', renotify: true, icon: '/icon-192.png', badge: '/icon-192.png',
    data: { url: d.url || '/admin' },
  }))
})

// Bấm thông báo: mở đúng trang Admin (dùng lại tab Admin đang mở nếu có)
self.addEventListener('notificationclick', e => {
  e.notification.close()
  const url = new URL(e.notification.data?.url || '/admin', self.location.origin).href
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if (c.url.startsWith(self.location.origin + '/admin') && 'focus' in c) return c.navigate(url).then(w => (w || c).focus()).catch(() => c.focus())
    return self.clients.openWindow(url)
  }))
})
