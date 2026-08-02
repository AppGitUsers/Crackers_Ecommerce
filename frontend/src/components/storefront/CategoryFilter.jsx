import { useState } from 'react'
import { LayoutGrid, X, Check } from 'lucide-react'

function pillClass(active) {
  return `px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
    active
      ? 'bg-brand-500 text-white border-brand-500'
      : 'bg-white text-ink-700 border-sandal-300 hover:bg-sandal-100'
  }`
}

function rowClass(active) {
  return `w-full flex items-center justify-between gap-3 px-3 py-3.5 text-sm font-semibold rounded-lg transition-colors ${
    active ? 'bg-brand-50 text-brand-700' : 'text-ink-700 hover:bg-sandal-50'
  }`
}

export default function CategoryFilter({ categories, selected, onSelect }) {
  const [sheetOpen, setSheetOpen] = useState(false)

  function selectAndClose(id) {
    onSelect(id)
    setSheetOpen(false)
  }

  const selectedLabel = selected === null ? 'Categories' : categories.find((c) => c.id === selected)?.name || 'Categories'
  const totalCount = categories.reduce((sum, c) => sum + (c.product_count || 0), 0)

  return (
    <>
      {/* Desktop only: inline pill row */}
      <div className="hidden xl:flex flex-wrap gap-2 mb-6">
        <button onClick={() => onSelect(null)} className={pillClass(selected === null)}>All</button>
        {categories.map((cat) => (
          <button key={cat.id} onClick={() => onSelect(cat.id)} className={pillClass(selected === cat.id)}>
            {cat.name}
          </button>
        ))}
      </div>

      {/* Phone & tablet: fixed floating button, always in the same spot regardless of scroll */}
      <button
        onClick={() => setSheetOpen(true)}
        className="xl:hidden fixed bottom-5 right-5 z-40 flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold pl-4 pr-5 py-3 rounded-full shadow-lg transition-colors"
      >
        <LayoutGrid size={18} />
        {selectedLabel}
      </button>

      {sheetOpen && (
        <div className="xl:hidden fixed inset-0 z-50 flex items-end" onClick={() => setSheetOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full bg-white rounded-t-2xl max-h-[70vh] overflow-y-auto p-5 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-lg text-ink-900">Categories</h2>
              <button
                onClick={() => setSheetOpen(false)}
                className="p-1.5 rounded-lg hover:bg-sandal-100 text-ink-500 transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-col divide-y divide-sandal-100">
              <button onClick={() => selectAndClose(null)} className={rowClass(selected === null)}>
                <span>All</span>
                <span className="flex items-center gap-2 text-xs font-normal text-ink-400">
                  {totalCount} item{totalCount === 1 ? '' : 's'}
                  {selected === null && <Check size={16} className="text-brand-600" />}
                </span>
              </button>
              {categories.map((cat) => (
                <button key={cat.id} onClick={() => selectAndClose(cat.id)} className={rowClass(selected === cat.id)}>
                  <span>{cat.name}</span>
                  <span className="flex items-center gap-2 text-xs font-normal text-ink-400">
                    {cat.product_count ?? 0} item{cat.product_count === 1 ? '' : 's'}
                    {selected === cat.id && <Check size={16} className="text-brand-600" />}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
