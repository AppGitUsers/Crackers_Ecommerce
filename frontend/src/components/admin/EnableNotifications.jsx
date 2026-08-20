import { useEffect, useState } from 'react'
import { Bell, BellOff, BellRing, Smartphone } from 'lucide-react'
import { useToast } from '../../context/ToastContext.jsx'
import {
  isPushSupported,
  needsIOSInstallFirst,
  getExistingSubscription,
  enableNotifications,
  disableNotifications,
} from '../../utils/pushNotifications.js'

// 'checking' | 'unsupported' | 'ios-needs-install' | 'default' | 'denied' | 'enabled'
export default function EnableNotificationsCard() {
  const toast = useToast()
  const [status, setStatus] = useState('checking')
  const [busy, setBusy] = useState(false)

  useEffect(() => { refreshStatus() }, [])

  async function refreshStatus() {
    if (!isPushSupported()) {
      setStatus('unsupported')
      return
    }
    if (needsIOSInstallFirst()) {
      setStatus('ios-needs-install')
      return
    }
    if (Notification.permission === 'denied') {
      setStatus('denied')
      return
    }
    const existing = await getExistingSubscription()
    setStatus(existing ? 'enabled' : 'default')
  }

  async function handleEnable() {
    setBusy(true)
    try {
      const result = await enableNotifications()
      if (result.ok) {
        toast.success('Notifications enabled on this device.')
        setStatus('enabled')
      } else if (result.permission === 'denied') {
        toast.error('Notifications blocked.')
        setStatus('denied')
      }
    } catch (err) {
      console.error('[push] enable failed:', err)
      toast.error('Could not enable notifications on this device.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDisable() {
    setBusy(true)
    try {
      await disableNotifications()
      toast.success('Notifications disabled on this device.')
      setStatus('default')
    } catch {
      toast.error('Could not disable notifications.')
    } finally {
      setBusy(false)
    }
  }

  if (status === 'checking' || status === 'unsupported') return null

  return (
    <div className="card p-4 mb-6 flex items-center justify-between gap-3 flex-wrap">
      {status === 'ios-needs-install' && (
        <>
          <div className="flex items-center gap-2.5 min-w-0">
            <Smartphone size={18} className="text-ink-400 shrink-0" />
            <p className="text-sm text-ink-600">
              To get order alerts on iPhone: open this site in Safari, tap <span className="font-semibold">Share → Add to Home Screen</span>, then open it from there to enable notifications.
            </p>
          </div>
        </>
      )}

      {status === 'default' && (
        <>
          <div className="flex items-center gap-2.5 min-w-0">
            <Bell size={18} className="text-brand-600 shrink-0" />
            <p className="text-sm text-ink-600">Get notified on this device the moment a new order comes in.</p>
          </div>
          <button className="btn-primary btn-sm shrink-0" disabled={busy} onClick={handleEnable}>
            {busy ? 'Enabling…' : 'Enable Notifications'}
          </button>
        </>
      )}

      {status === 'denied' && (
        <div className="flex items-center gap-2.5 min-w-0">
          <BellOff size={18} className="text-ink-400 shrink-0" />
          <p className="text-sm text-ink-500">
            Notifications are blocked for this site. To enable them, allow notifications for this site in your browser's settings, then reload this page.
          </p>
        </div>
      )}

      {status === 'enabled' && (
        <>
          <div className="flex items-center gap-2.5 min-w-0">
            <BellRing size={18} className="text-green-600 shrink-0" />
            <p className="text-sm text-ink-600">Notifications are enabled on this device.</p>
          </div>
          <button className="btn-secondary btn-sm shrink-0" disabled={busy} onClick={handleDisable}>
            {busy ? 'Disabling…' : 'Disable'}
          </button>
        </>
      )}
    </div>
  )
}
