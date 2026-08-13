import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { CheckCircle2, XCircle, X } from 'lucide-react'

const ToastContext = createContext(null)
let idSeq = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id))
    clearTimeout(timers.current[id])
    delete timers.current[id]
  }, [])

  const push = useCallback((message, type) => {
    const id = ++idSeq
    setToasts((t) => [...t, { id, message, type }])
    timers.current[id] = setTimeout(() => dismiss(id), 4000)
  }, [dismiss])

  const api = useRef({
    success: (message) => push(message, 'success'),
    error: (message) => push(message, 'error'),
  }).current

  useEffect(() => {
    setGlobalToast(api)
    return () => setGlobalToast(null)
  }, [api])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            className={`flex items-start gap-2.5 rounded-lg shadow-elevated border px-4 py-3 animate-fade-in-up ${
              t.type === 'success' ? 'bg-white border-green-200' : 'bg-white border-red-200'
            }`}
          >
            {t.type === 'success' ? (
              <CheckCircle2 size={18} className="text-green-600 shrink-0 mt-0.5" />
            ) : (
              <XCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
            )}
            <p className="text-sm text-ink-800 flex-1">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="text-ink-300 hover:text-ink-600 shrink-0">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

// Non-hook accessor so the axios interceptor (a plain module, not a component)
// can push toasts too — set once by ToastProvider's nearest render.
let globalToast = null
export function setGlobalToast(api) {
  globalToast = api
}
export function getGlobalToast() {
  return globalToast
}
