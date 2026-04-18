// Service Worker for Push Notifications
// This enables background price alerts even when dWallet is closed

const CACHE_NAME = 'dwallet-notifications-v1'

// Install event - cache resources
self.addEventListener('install', event => {
  console.log('[SW] Service Worker installed')
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Service Worker activated')
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    })
  )
})

// Handle push notifications
self.addEventListener('push', event => {
  console.log('[SW] Push notification received', event)
  
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (e) {
    data = { title: 'dWallet Alert', body: event.data?.text() || 'Price alert triggered!' }
  }

  const title = data.title || 'dWallet Price Alert'
  const options = {
    body: data.body || 'A price alert has been triggered',
    icon: data.icon || '/favicon.svg',
    badge: data.badge || '/favicon.svg',
    tag: data.tag || 'price-alert',
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [
      { action: 'view', title: 'View in dWallet' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    data: data.data || {}
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification clicked', event)
  
  event.notification.close()

  if (event.action === 'dismiss') {
    return
  }

  // Open or focus the dWallet app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // If dWallet is already open, focus it
      for (const client of clientList) {
        if (client.url.includes('localhost') || client.url.includes('dwallet')) {
          return client.focus()
        }
      }
      // Otherwise, open a new window
      return clients.openWindow('/')
    })
  )
})

// Handle notification close
self.addEventListener('notificationclose', event => {
  console.log('[SW] Notification closed', event)
})

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request)
    })
  )
})
