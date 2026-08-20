import { NotificationsAPI } from '../api/endpoints'

// PushManager.subscribe() needs the VAPID public key as raw bytes, not the
// base64url string the backend hands us.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

// iOS Safari only supports Web Push once the site has been added to the
// Home Screen (iOS 16.4+) — a plain browser tab can never receive it, no
// matter how many times someone taps "Allow".
export function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

export function needsIOSInstallFirst() {
  return isIOS() && !isStandalone()
}

export async function getExistingSubscription() {
  if (!isPushSupported()) return null
  // getRegistration() takes a client (page) URL to match against a
  // registration's scope, not the worker script's own path — omitting it
  // defaults to the current page, which is what we want here.
  const registration = await navigator.serviceWorker.getRegistration()
  if (!registration) return null
  return registration.pushManager.getSubscription()
}

export async function enableNotifications() {
  await navigator.serviceWorker.register('/sw.js')
  // register() resolves as soon as the registration exists, not once the
  // worker is actually active — on a brand new profile with no prior
  // registration at this origin, subscribing before activation completes
  // can hang indefinitely. `.ready` resolves only once it's active.
  const registration = await navigator.serviceWorker.ready

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return { ok: false, permission }
  }

  const { data } = await NotificationsAPI.vapidKey()
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(data.public_key),
  })

  const json = subscription.toJSON()
  await NotificationsAPI.subscribe({ endpoint: json.endpoint, keys: json.keys })

  return { ok: true, permission }
}

export async function disableNotifications() {
  const subscription = await getExistingSubscription()
  if (!subscription) return
  await NotificationsAPI.unsubscribe({ endpoint: subscription.endpoint })
  await subscription.unsubscribe()
}
