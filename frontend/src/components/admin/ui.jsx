import { useEffect, useRef, useState } from 'react'
import { X, ChevronLeft, ChevronRight, ChevronDown, Check, Calendar as CalendarIcon, Upload } from 'lucide-react'

const DATE_PICKER_DAY_HEADERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
function pad2(n) { return String(n).padStart(2, '0') }
function toDateStr(y, m, d) { return `${y}-${pad2(m)}-${pad2(d)}` }
function parseDateStr(s) {
  if (!s) return null
  const [y, m, d] = s.split('-').map(Number)
  if (!y || !m || !d) return null
  return { y, m, d }
}

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
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      <div className="skeleton h-16 w-full" />
      <div className="skeleton h-16 w-full" />
      <div className="skeleton h-16 w-3/4" />
    </div>
  )
}

/** Sliding switch — the professional-looking alternative to a clickable badge for boolean state. */
export function Toggle({ checked, onChange, disabled = false, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? 'bg-brand-500' : 'bg-sandal-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

/** Segmented single-select filter (status, date range, etc.) — replaces plain <select> filters. */
export function FilterPills({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`filter-pill ${value === opt.value ? 'active' : ''}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

/**
 * Custom dropdown — replaces native <select>. A native select's closed state
 * can be styled with CSS, but the open options list is rendered by the OS
 * and can't be — this renders both states ourselves so they actually match
 * the rest of the app instead of looking like a stock OS control.
 * options: [{ value, label }]. value/onChange work like a native select.
 */
export function Select({ value, onChange, options, placeholder = 'Select…', disabled = false, className = '' }) {
  const [open, setOpen] = useState(false)
  const [dropUp, setDropUp] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  function toggleOpen() {
    if (disabled) return
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setDropUp(window.innerHeight - rect.bottom < 260 && rect.top > 260)
    }
    setOpen((o) => !o)
  }

  const selected = options.find((o) => String(o.value) === String(value ?? ''))

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggleOpen}
        disabled={disabled}
        className={`select flex items-center justify-between gap-2 text-left ${className}`}
      >
        <span className={`truncate ${selected ? '' : 'text-ink-400'}`}>{selected ? selected.label : placeholder}</span>
        <ChevronDown size={16} className={`text-ink-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          className={`absolute z-50 w-full min-w-max bg-white border border-sandal-200 rounded-lg shadow-elevated py-1 max-h-64 overflow-y-auto ${
            dropUp ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          {options.length === 0 && <p className="px-3 py-2 text-sm text-ink-400">No options</p>}
          {options.map((o) => {
            const isSelected = String(o.value) === String(value ?? '')
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false) }}
                className={`w-full flex items-center justify-between gap-2 text-left px-3 py-2 text-sm transition-colors ${
                  isSelected ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-ink-700 hover:bg-sandal-100'
                }`}
              >
                <span className="truncate">{o.label}</span>
                {isSelected && <Check size={14} className="shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/**
 * Custom calendar popup — replaces native <input type="date">. Same reasoning
 * as Select: the native picker is an OS-rendered widget CSS can't touch.
 * value/onChange are a plain 'YYYY-MM-DD' string, same contract as a date input.
 */
export function DatePicker({ value, onChange, disabled = false, className = '', placeholder = 'Select date' }) {
  const [open, setOpen] = useState(false)
  const parsed = parseDateStr(value)
  const today = new Date()
  const [viewY, setViewY] = useState(parsed?.y || today.getFullYear())
  const [viewM, setViewM] = useState(parsed?.m || today.getMonth() + 1)
  const ref = useRef(null)

  useEffect(() => {
    const p = parseDateStr(value)
    if (p) { setViewY(p.y); setViewM(p.m) }
  }, [value])

  useEffect(() => {
    function onDocClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    function onKey(e) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  function shiftMonth(delta) {
    let m = viewM + delta, y = viewY
    if (m < 1) { m = 12; y -= 1 }
    if (m > 12) { m = 1; y += 1 }
    setViewM(m)
    setViewY(y)
  }

  const daysInMonth = new Date(viewY, viewM, 0).getDate()
  const firstWeekday = (new Date(viewY, viewM - 1, 1).getDay() + 6) % 7
  const monthLabel = new Date(viewY, viewM - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const displayLabel = parsed
    ? new Date(parsed.y, parsed.m - 1, parsed.d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : placeholder
  const todayStr = toDateStr(today.getFullYear(), today.getMonth() + 1, today.getDate())

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`input flex items-center justify-between gap-2 text-left ${className}`}
      >
        <span className={parsed ? '' : 'text-ink-400'}>{displayLabel}</span>
        <CalendarIcon size={15} className="text-ink-400 shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 bg-white border border-sandal-200 rounded-lg shadow-elevated p-3 w-64">
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => shiftMonth(-1)} className="p-1 rounded hover:bg-sandal-100 text-ink-600">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-ink-900">{monthLabel}</span>
            <button type="button" onClick={() => shiftMonth(1)} className="p-1 rounded hover:bg-sandal-100 text-ink-600">
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {DATE_PICKER_DAY_HEADERS.map((d, i) => (
              <div key={i} className="text-center text-[10px] font-bold text-ink-400 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {Array.from({ length: firstWeekday }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateStr = toDateStr(viewY, viewM, day)
              const isSelected = dateStr === value
              const isToday = dateStr === todayStr
              return (
                <div key={day} className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => { onChange(dateStr); setOpen(false) }}
                    className={`h-8 w-8 rounded-lg text-xs font-semibold transition-colors ${
                      isSelected ? 'bg-brand-500 text-white' : isToday ? 'bg-brand-50 text-brand-700' : 'text-ink-700 hover:bg-sandal-100'
                    }`}
                  >
                    {day}
                  </button>
                </div>
              )
            })}
          </div>
          <button
            type="button"
            onClick={() => { onChange(todayStr); setOpen(false) }}
            className="w-full mt-2 pt-2 border-t border-sandal-200 text-xs font-semibold text-brand-600 hover:text-brand-700"
          >
            Today
          </button>
        </div>
      )}
    </div>
  )
}

/** Styled trigger for a native file input — the raw "Choose File" button is
 * OS-rendered and clashes with everything else. Caller still owns the picked
 * File in its own state (pass its .name back in as `fileName`). */
export function FileInput({ onChange, accept = 'image/*', capture, label = 'Choose File', fileName, className = '' }) {
  const inputRef = useRef(null)
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <button type="button" className="btn-secondary btn-sm" onClick={() => inputRef.current?.click()}>
        <Upload size={14} />
        {label}
      </button>
      <span className="text-xs text-ink-500 truncate">{fileName || 'No file chosen'}</span>
      <input ref={inputRef} type="file" accept={accept} capture={capture} className="hidden" onChange={onChange} />
    </div>
  )
}

/** Shared Prev/Next pager — pass 1-indexed page, total row count, and page size. */
export function Pagination({ page, count, pageSize, onChange, itemLabel = 'item' }) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize))
  if (totalPages <= 1) return null
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
      <p className="text-sm text-ink-400">
        Page {page} of {totalPages} · {count} {itemLabel}{count === 1 ? '' : 's'}
      </p>
      <div className="flex items-center gap-2">
        <button
          className="btn-secondary btn-sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft size={14} />
          Prev
        </button>
        <button
          className="btn-secondary btn-sm"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Next
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
