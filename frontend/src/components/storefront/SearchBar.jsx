import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, X, ImageOff } from 'lucide-react'
import { ProductsAPI } from '../../api/endpoints'

const DEBOUNCE_MS = 450

export default function SearchBar() {
  const navigate = useNavigate()
  const [urlParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const wrapRef = useRef(null)
  const debounceRef = useRef(null)
  const seqRef = useRef(0)
  const skipNextFetchRef = useRef(false)

  useEffect(() => {
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
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

  // Rolling debounce: every keystroke resets the timer, so a fetch only
  // fires once typing actually pauses — not once per character.
  useEffect(() => {
    // Picking a suggestion sets `query` (to show the picked name in the box)
    // right before navigating away — without this guard, that state update
    // would still re-trigger the debounce and pop the dropdown back open
    // moments after the user already made their choice.
    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false
      return
    }
    clearTimeout(debounceRef.current)
    const q = query.trim()
    if (!q) {
      setSuggestions([])
      setOpen(false)
      return
    }
    debounceRef.current = setTimeout(() => {
      const seq = ++seqRef.current
      setLoading(true)
      ProductsAPI.list({ search: q })
        .then(({ data }) => {
          if (seq !== seqRef.current) return // a newer keystroke already superseded this response
          setSuggestions((data.results || data).slice(0, 8))
          setOpen(true)
        })
        .finally(() => { if (seq === seqRef.current) setLoading(false) })
    }, DEBOUNCE_MS)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  function goToSearch(q) {
    setOpen(false)
    navigate(`/?q=${encodeURIComponent(q)}`)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (query.trim()) goToSearch(query.trim())
  }

  function handlePick(product) {
    skipNextFetchRef.current = true
    setSuggestions([])
    setQuery(product.name)
    goToSearch(product.name)
  }

  function clear() {
    skipNextFetchRef.current = true
    setQuery('')
    setSuggestions([])
    setOpen(false)
    // The typed text and the active ?q= filter are two different things —
    // clearing the box should also drop an already-applied search, not just
    // reset what's currently typed.
    if (urlParams.get('q')) navigate('/')
  }

  return (
    <div className="relative flex-1 min-w-0 max-w-md" ref={wrapRef}>
      <form onSubmit={handleSubmit} className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="Search crackers…"
          className="w-full bg-white/10 focus:bg-white/15 text-white placeholder-white/40 text-sm rounded-full pl-9 pr-8 py-2 outline-none transition-colors"
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </form>

      {open && (
        <div className="absolute z-50 top-full mt-2 w-full bg-white rounded-xl shadow-elevated border border-sandal-200 overflow-hidden">
          {loading ? (
            <p className="px-4 py-3 text-sm text-ink-400">Searching…</p>
          ) : suggestions.length === 0 ? (
            <p className="px-4 py-3 text-sm text-ink-400">No products found for "{query}"</p>
          ) : (
            <>
              {suggestions.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePick(p)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-sandal-50 text-left transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg overflow-hidden bg-sandal-100 shrink-0 flex items-center justify-center">
                    {p.primary_image ? (
                      <img src={p.primary_image} className="w-full h-full object-cover" />
                    ) : (
                      <ImageOff size={14} className="text-sandal-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink-900 truncate">{p.name}</p>
                    <p className="text-xs text-ink-400 truncate">{p.category_name}</p>
                  </div>
                </button>
              ))}
              <button
                type="button"
                onClick={() => goToSearch(query)}
                className="w-full text-center px-4 py-2.5 text-xs font-semibold text-brand-600 hover:bg-sandal-50 border-t border-sandal-100 transition-colors"
              >
                See all results for "{query}"
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
