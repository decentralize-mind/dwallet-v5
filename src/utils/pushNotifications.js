/**
 * Push Notification Service
 * Registers service worker and handles browser push notifications
 * for price alerts, staking rewards, and transaction updates
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

/**
 * Register the service worker
 */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('[Push] Service Worker not supported')
    return false
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js')
    console.log('[Push] Service Worker registered:', registration.scope)
    return registration
  } catch (error) {
    console.error('[Push] Service Worker registration failed:', error)
    return false
  }
}

/**
 * Request notification permission and subscribe to push
 */
export async function subscribeToPushNotifications() {
  if (!('Notification' in window)) {
    console.warn('[Push] Notifications not supported')
    return null
  }

  try {
    // Request permission
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.warn('[Push] Notification permission denied')
      return null
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready
    
    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: VAPID_PUBLIC_KEY ? urlBase64ToUint8Array(VAPID_PUBLIC_KEY) : undefined
    })

    console.log('[Push] Subscribed to push notifications')
    return subscription
  } catch (error) {
    console.error('[Push] Subscription failed:', error)
    return null
  }
}

/**
 * Send a test notification
 */
export function sendTestNotification() {
  if (Notification.permission !== 'granted') {
    console.warn('[Push] Cannot send notification - permission not granted')
    return false
  }

  try {
    new Notification('dWallet Test', {
      body: 'Push notifications are working! You will receive price alerts here.',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: 'test-notification'
    })
    return true
  } catch (error) {
    console.error('[Push] Failed to send notification:', error)
    return false
  }
}

/**
 * Send a price alert notification
 */
export function sendPriceAlertNotification({ symbol, price, targetPrice, direction }) {
  if (Notification.permission !== 'granted') return false

  const arrow = direction === 'above' ? '📈' : '📉'
  const title = `${symbol} Price Alert ${arrow}`
  const body = `${symbol} is now $${price.toLocaleString()} (${direction} your target of $${targetPrice.toLocaleString()})`

  try {
    new Notification(title, {
      body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: `price-alert-${symbol}-${Date.now()}`,
      requireInteraction: true,
      actions: [
        { action: 'view', title: 'Open dWallet' },
        { action: 'dismiss', title: 'Dismiss' }
      ],
      data: {
        type: 'price-alert',
        symbol,
        price,
        targetPrice,
        direction
      }
    })
    return true
  } catch (error) {
    console.error('[Push] Failed to send price alert:', error)
    return false
  }
}

/**
 * Send a staking reward notification
 */
export function sendStakingRewardNotification({ amount, token = 'ETH' }) {
  if (Notification.permission !== 'granted') return false

  const title = 'Staking Reward Available'
  const body = `You have ${amount.toFixed(6)} ${token} ready to claim from your DWT staking rewards`

  try {
    new Notification(title, {
      body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: 'staking-reward',
      requireInteraction: false,
      actions: [
        { action: 'claim', title: 'Claim Now' },
        { action: 'dismiss', title: 'Later' }
      ],
      data: {
        type: 'staking-reward',
        amount,
        token
      }
    })
    return true
  } catch (error) {
    console.error('[Push] Failed to send staking notification:', error)
    return false
  }
}

/**
 * Send a transaction notification
 */
export function sendTransactionNotification({ type, amount, token, status }) {
  if (Notification.permission !== 'granted') return false

  const icons = { send: '↑', receive: '↓', swap: '⇄' }
  const title = `Transaction ${status === 'confirmed' ? 'Confirmed' : 'Pending'}`
  const body = `${icons[type] || '•'} ${amount} ${token} ${type} - ${status}`

  try {
    new Notification(title, {
      body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: `transaction-${Date.now()}`,
      requireInteraction: false
    })
    return true
  } catch (error) {
    console.error('[Push] Failed to send transaction notification:', error)
    return false
  }
}

/**
 * Check if notifications are enabled
 */
export function areNotificationsEnabled() {
  return 'Notification' in window && Notification.permission === 'granted'
}

/**
 * Get notification permission status
 */
export function getNotificationStatus() {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

/**
 * Helper: Convert VAPID key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush() {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    
    if (subscription) {
      await subscription.unsubscribe()
      console.log('[Push] Unsubscribed from push notifications')
      return true
    }
    return false
  } catch (error) {
    console.error('[Push] Unsubscribe failed:', error)
    return false
  }
}
