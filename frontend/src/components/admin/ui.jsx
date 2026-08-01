import { X } from 'lucide-react'

export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  if (!open) return null
  const sizeMap = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal-box ${sizeMap[size]}`}>
        <div className="modal-header">
          <h2 className="font-bold text-lg text-ink-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-sandal-100 text-ink-400 hover:text-ink-700 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, danger = true }) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card p-6 max-w-sm w-full">
        <h3 className="font-bold text-ink-900 mb-2">{title}</h3>
        <p className="text-sm text-ink-500 mb-5">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className={danger ? 'btn-danger' : 'btn-primary'}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

export function Empty({ message = 'No data found', icon }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-ink-400">
      {icon && <div className="mb-3 opacity-40">{icon}</div>}
      <p className="text-sm">{message}</p>
    </div>
  )
}

export function PageLoader() {
  return <p className="text-ink-500 py-8 text-center">Loading…</p>
}
