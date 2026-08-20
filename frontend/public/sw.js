// Web Push service worker — must live at the site root so its scope covers
// the whole app, and must stay outside src/ since Vite doesn't bundle it
// (the browser fetches this file directly, unprocessed).

self.addEventListener('push', (event) => {
  let payload = { title: 'New order received', body: '', url: '/admin/orders' }
  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() }
    } catch {
      payload.body = event.data.text()
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/trust/crackersCRM_icon.jpg',
      badge: '/trust/crackersCRM_icon.jpg',
      data: { url: payload.url },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/admin/orders'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl)
    })
  )
})
