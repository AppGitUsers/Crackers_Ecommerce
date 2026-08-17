import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Sparkles, BadgeCheck, Phone, LayoutGrid, ShieldCheck,
  ShoppingBag, ClipboardCheck, PhoneCall, Award, MapPin, Star, ImageOff, X, ArrowRight,
  FileSpreadsheet, Download,
} from 'lucide-react'
import { CategoriesAPI, ProductsAPI, CatalogueAPI } from '../../api/endpoints'
import ProductCard from '../../components/storefront/ProductCard.jsx'
import { useReveal } from '../../hooks/useReveal'

// How many products to show per category on the "browse everything" preview —
// a bounded, one-shot fetch, not the infinite-scroll feed. Picking a single
// category (or searching) is what switches into the real infinite-scroll grid.
const PREVIEW_SIZE = 8
const PAGE_SIZE = 20

// Evergreen, always-true value props (no fabricated stats like "127 sold
// today") — shown as arch-shaped cards anchored over the hero's wave edge.
const VALUE_PROPS = [
  { title: 'Genuine Sivakasi Crackers', icon: BadgeCheck },
  { title: 'Confirmed By Phone Call', icon: Phone },
  { title: 'Wide Range of Categories', icon: LayoutGrid },
  { title: 'Simple & Secure Checkout', icon: ShieldCheck },
]

const HOW_IT_WORKS = [
  { title: 'Browse & Add to Cart', desc: 'Pick your favourites across every category.', icon: ShoppingBag },
  { title: 'Checkout With Your Details', desc: 'Enter your name, phone, and delivery address.', icon: ClipboardCheck },
  { title: 'We Call to Confirm', desc: "We'll call to confirm your order and payment.", icon: PhoneCall },
]

// PLACEHOLDER copy — real numbers/coverage area/rating to be filled in later.
// `image` is left null on purpose — drop the generated file into
// frontend/public/trust/ and set image: '/trust/<filename>' to activate it.
const TRUST_HIGHLIGHTS = [
  { stat: '15+ Years', label: 'Of Trusted Experience', icon: Award, image: '/trust/experience.png' },
  { stat: 'Tamil Nadu', label: 'Wide Delivery Network', icon: MapPin, image: '/trust/delivery.png' },
  { stat: '4.8 ★', label: 'Customer Rating', icon: Star, image: '/trust/rating.png' },
  { stat: '100% Genuine', label: 'Sivakasi-Made Crackers', icon: BadgeCheck, image: '/trust/genuine.png' },
]

// Each theme is one hue at two depths — a dark band paired with its own
// light tint — cycled across the row so cards contrast against each other too.
const DUO_THEMES = [
  { dark: 'bg-brand-800', iconBg: 'bg-brand-600', light: 'bg-brand-50', lightText: 'text-brand-700' },
  { dark: 'bg-sky-800', iconBg: 'bg-sky-600', light: 'bg-sky-50', lightText: 'text-sky-700' },
  { dark: 'bg-black', iconBg: 'bg-ink-700', light: 'bg-sandal-100', lightText: 'text-ink-700' },
  { dark: 'bg-gold-600', iconBg: 'bg-gold-400', light: 'bg-gold-500/10', lightText: 'text-gold-600' },
]

const GRID_CLASSES = 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4'

function ProductCardSkeleton() {
  return (
    <div className="card p-4 flex flex-col">
      <div className="aspect-square skeleton mb-3" />
      <div className="skeleton h-4 w-3/4 mb-2" />
      <div className="skeleton h-3 w-1/2 mb-3" />
      <div className="skeleton h-9 w-full mt-auto" />
    </div>
  )
}

function SkeletonGrid({ count = 8 }) {
  return (
    <div className={GRID_CLASSES}>
      {Array.from({ length: count }).map((_, i) => <ProductCardSkeleton key={i} />)}
    </div>
  )
}

// Fades/slides a section up the first time it scrolls into view — gives
// scrolling further down the page a payoff instead of everything just
// being visible at once.
function Reveal({ children, className = '' }) {
  const [ref, visible] = useReveal()
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
    >
      {children}
    </div>
  )
}

export default function HomePage() {
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const [catalogueFile, setCatalogueFile] = useState(null)

  // "Flat mode" = a single category picked, or a search in progress — both
  // are a single growing feed of results, infinite-scrolled. The default
  // "everything, grouped by category" browse view is a separate, bounded
  // fetch (see below) — the two don't share fetch/pagination state because
  // they're fundamentally different shapes of data.
  const flatMode = !!selectedCategory || !!query

  // ---- Mode A: browse-everything preview (bounded, no infinite scroll) ----
  const [previewSections, setPreviewSections] = useState([])
  const [previewLoading, setPreviewLoading] = useState(true)

  // ---- Mode B: flat infinite-scroll feed (single category or search) ----
  const [flatProducts, setFlatProducts] = useState([])
  const [flatPage, setFlatPage] = useState(1)
  const [flatHasMore, setFlatHasMore] = useState(true)
  const [flatLoading, setFlatLoading] = useState(true)
  const [flatLoadingMore, setFlatLoadingMore] = useState(false)
  const sentinelRef = useRef(null)

  useEffect(() => {
    CategoriesAPI.list().then(({ data }) => setCategories(data.results || data))
  }, [])

  useEffect(() => {
    CatalogueAPI.get().then(({ data }) => setCatalogueFile(data)).catch(() => {})
  }, [])

  // Mode A fetch: one small request per category, run in parallel.
  useEffect(() => {
    if (flatMode || categories.length === 0) return
    let cancelled = false
    setPreviewLoading(true)
    Promise.all(
      categories.map((cat) =>
        ProductsAPI.list({ category: cat.id, page_size: PREVIEW_SIZE }).then(({ data }) => ({
          category: cat,
          products: data.results || data,
        }))
      )
    )
      .then((results) => { if (!cancelled) setPreviewSections(results.filter((r) => r.products.length > 0)) })
      .finally(() => { if (!cancelled) setPreviewLoading(false) })
    return () => { cancelled = true }
  }, [flatMode, categories])

  // Mode B fetch: page 1, resets whenever the category or search changes.
  useEffect(() => {
    if (!flatMode) return
    let cancelled = false
    setFlatProducts([])
    setFlatPage(1)
    setFlatHasMore(true)
    setFlatLoading(true)
    const params = query
      ? { search: query, page_size: PAGE_SIZE }
      : { category: selectedCategory, page_size: PAGE_SIZE }
    ProductsAPI.list(params)
      .then(({ data }) => {
        if (cancelled) return
        setFlatProducts(data.results || data)
        setFlatHasMore(!!data.next)
      })
      .finally(() => { if (!cancelled) setFlatLoading(false) })
    return () => { cancelled = true }
  }, [flatMode, selectedCategory, query])

  function loadMoreFlat() {
    if (flatLoadingMore || !flatHasMore) return
    setFlatLoadingMore(true)
    const nextPage = flatPage + 1
    const params = query
      ? { search: query, page_size: PAGE_SIZE, page: nextPage }
      : { category: selectedCategory, page_size: PAGE_SIZE, page: nextPage }
    ProductsAPI.list(params)
      .then(({ data }) => {
        setFlatProducts((prev) => [...prev, ...(data.results || data)])
        setFlatHasMore(!!data.next)
        setFlatPage(nextPage)
      })
      .finally(() => setFlatLoadingMore(false))
  }

  // Watches a sentinel element below the grid — once it's within 400px of
  // the viewport, fetch the next page. rootMargin means this fires a beat
  // before the user actually hits bottom, so the next batch is usually
  // already loading by the time they'd notice a gap.
  useEffect(() => {
    if (!flatMode || flatLoading) return
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMoreFlat() },
      { rootMargin: '400px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flatMode, flatLoading, flatHasMore, flatLoadingMore, flatPage, query, selectedCategory])

  function clearSearch() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('q')
      return next
    })
  }

  const selectedCategoryObj = useMemo(
    () => categories.find((c) => c.id === selectedCategory) || null,
    [categories, selectedCategory]
  )

  return (
    <div className="pb-20 xl:pb-0">
      <section className="relative mb-14 sm:mb-16">
        <div className="relative bg-gradient-to-br from-black via-brand-700 to-sky-600 rounded-b-[2.5rem] sm:rounded-b-[3rem] px-6 pt-10 pb-20 sm:pt-14 sm:pb-24 overflow-hidden">
          {/* Diagonal motion-streak accents — the "swinging through the sky" energy */}
          <div className="absolute -top-10 -left-16 w-[140%] h-16 bg-sky-300/20 blur-2xl -rotate-12 pointer-events-none" />
          <div className="absolute top-16 -right-24 w-[120%] h-10 bg-white/10 blur-2xl -rotate-12 pointer-events-none" />
          <div className="absolute bottom-16 -left-24 w-[120%] h-10 bg-brand-300/20 blur-2xl -rotate-12 pointer-events-none" />
          <Sparkles className="absolute top-7 left-8 text-sky-300/50 hidden sm:block" size={20} />
          <Sparkles className="absolute top-14 right-16 text-white/40 hidden sm:block" size={14} />
          <Sparkles className="absolute bottom-24 left-1/4 text-sky-300/40 hidden sm:block" size={12} />

          <div className="relative max-w-2xl mx-auto text-center">
            <p className="inline-flex items-center gap-1.5 text-sky-200 font-bold uppercase tracking-widest text-xs mb-3 bg-white/10 px-3 py-1.5 rounded-full">
              <Sparkles size={12} className="text-sky-300" />
              Sivakasi Crackers
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
              Crackers for every celebration
            </h1>
            <p className="text-sandal-100/90 text-sm sm:text-base mt-3 max-w-md mx-auto">
              Pick your favourites and check out — we'll call you to confirm your order.
            </p>
          </div>

          {/* Wave divider blending the blob into the white page background */}
          <svg className="absolute bottom-0 left-0 w-full h-10 sm:h-14" viewBox="0 0 1440 100" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0,40 C240,100 480,0 720,40 C960,80 1200,20 1440,50 L1440,100 L0,100 Z" fill="white" />
          </svg>
        </div>

        {/* Arch-shaped value-prop cards overlapping the blob's wave edge */}
        <div className="relative -mt-10 sm:-mt-14 px-1 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl mx-auto">
          {VALUE_PROPS.map((v) => (
            <div key={v.title} className="bg-black rounded-t-[999px] rounded-b-2xl pt-7 pb-4 px-3 text-center shadow-elevated">
              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-2">
                <v.icon size={16} className="text-sky-400" />
              </div>
              <p className="text-white text-[11px] sm:text-xs font-bold leading-snug">{v.title}</p>
            </div>
          ))}
        </div>
      </section>

      {catalogueFile && (
        <Reveal className="mb-8">
          <a
            href={catalogueFile.download_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-wrap items-center justify-between gap-3 bg-brand-50 border border-brand-200 rounded-xl px-4 py-3.5 hover:bg-brand-100 transition-colors"
          >
            <span className="flex items-center gap-3 min-w-0">
              <span className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center shrink-0">
                <FileSpreadsheet size={16} className="text-white" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-ink-900">Download our full product catalogue</span>
                <span className="block text-xs text-ink-500 truncate">{catalogueFile.original_filename}</span>
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 shrink-0">
              <Download size={14} />
              Download
            </span>
          </a>
        </Reveal>
      )}

      {query && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-sandal-50 border border-sandal-200 rounded-xl px-4 py-3">
          <p className="text-sm text-ink-700">
            Search results for <span className="font-bold text-ink-900">"{query}"</span>
            {!flatLoading && <span className="text-ink-400"> · {flatProducts.length}{flatHasMore ? '+' : ''} found</span>}
          </p>
          <button onClick={clearSearch} className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700">
            <X size={13} />
            Clear search
          </button>
        </div>
      )}

      {!query && categories.length > 0 && (
        <Reveal className="mb-10">
          <div className="flex items-center gap-3 pb-2 mb-4 border-b border-sandal-200">
            <span className="w-1 h-5 rounded-full bg-gradient-to-b from-brand-500 to-sky-500 shrink-0" />
            <h2 className="text-lg font-extrabold text-ink-900">Shop by Category</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:-mx-1 sm:px-1 snap-x snap-mandatory scrollbar-hide">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`snap-start shrink-0 w-36 sm:w-44 rounded-2xl overflow-hidden shadow-elevated transition-all active:scale-95 text-left ${
                selectedCategory === null ? 'ring-2 ring-brand-500' : ''
              }`}
            >
              <div className="aspect-square bg-gradient-to-br from-ink-800 to-black flex items-center justify-center">
                <LayoutGrid size={26} className="text-sky-400" strokeWidth={1.5} />
              </div>
              <div className={`px-3 py-2.5 transition-colors ${selectedCategory === null ? 'bg-brand-500' : 'bg-white'}`}>
                <p className={`font-bold text-sm truncate ${selectedCategory === null ? 'text-white' : 'text-ink-900'}`}>All</p>
                <p className={`text-xs ${selectedCategory === null ? 'text-brand-100' : 'text-ink-400'}`}>
                  {categories.reduce((sum, c) => sum + (c.product_count ?? 0), 0)} items
                </p>
              </div>
            </button>
            {categories.map((cat) => {
              const active = selectedCategory === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(active ? null : cat.id)}
                  className={`snap-start shrink-0 w-36 sm:w-44 rounded-2xl overflow-hidden shadow-elevated transition-all active:scale-95 text-left ${
                    active ? 'ring-2 ring-brand-500' : ''
                  }`}
                >
                  <div className="aspect-square bg-gradient-to-br from-sandal-50 to-sandal-100 flex items-center justify-center">
                    {cat.image ? (
                      <img src={cat.image} alt={cat.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    ) : (
                      <ImageOff size={24} className="text-sandal-400" strokeWidth={1.5} />
                    )}
                  </div>
                  <div className={`px-3 py-2.5 transition-colors ${active ? 'bg-brand-500' : 'bg-white'}`}>
                    <p className={`font-bold text-sm truncate ${active ? 'text-white' : 'text-ink-900'}`}>{cat.name}</p>
                    <p className={`text-xs ${active ? 'text-brand-100' : 'text-ink-400'}`}>
                      {cat.product_count ?? 0} item{cat.product_count === 1 ? '' : 's'}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </Reveal>
      )}

      {flatMode ? (
        // ---- Mode B: single category or search — one flat, infinite-scroll grid ----
        flatLoading ? (
          <SkeletonGrid />
        ) : flatProducts.length === 0 ? (
          <div className="text-center py-16 text-ink-400">
            {query ? `No products found for "${query}".` : 'No products found in this category.'}
          </div>
        ) : (
          <div>
            {!query && selectedCategoryObj && (
              <div className="flex items-center gap-3 pb-2 mb-4 border-b border-sandal-200">
                <span className="w-1 h-5 rounded-full bg-gradient-to-b from-brand-500 to-sky-500 shrink-0" />
                <h2 className="text-lg font-extrabold text-ink-900">{selectedCategoryObj.name}</h2>
              </div>
            )}
            <div className={GRID_CLASSES}>
              {flatProducts.map((product, i) => (
                <ProductCard key={product.id} product={product} priority={i < 6} />
              ))}
            </div>
            {flatLoadingMore && (
              <div className={`${GRID_CLASSES} mt-4`}>
                {Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}
              </div>
            )}
            {/* Invisible trigger — IntersectionObserver watches this, not the page's scroll position directly. */}
            <div ref={sentinelRef} className="h-1" />
          </div>
        )
      ) : (
        // ---- Mode A: everything, grouped by category, capped preview per section ----
        previewLoading ? (
          <div className="space-y-10">
            <SkeletonGrid count={6} />
          </div>
        ) : previewSections.length === 0 ? (
          <div className="text-center py-16 text-ink-400">No products found.</div>
        ) : (
          <div className="space-y-10">
            {previewSections.map(({ category, products: categoryProducts }) => (
              <Reveal key={category.id}>
                <section>
                  <div className="flex items-center justify-between gap-3 pb-2 mb-4 border-b border-sandal-200">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-1 h-5 rounded-full bg-gradient-to-b from-brand-500 to-sky-500 shrink-0" />
                      <h2 className="text-lg font-extrabold text-ink-900 truncate">{category.name}</h2>
                    </div>
                    {(category.product_count ?? categoryProducts.length) > categoryProducts.length && (
                      <button
                        onClick={() => setSelectedCategory(category.id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 shrink-0"
                      >
                        View all
                        <ArrowRight size={13} />
                      </button>
                    )}
                  </div>
                  <div className={GRID_CLASSES}>
                    {categoryProducts.map((product, i) => (
                      <ProductCard key={product.id} product={product} priority={i < 6} />
                    ))}
                  </div>
                </section>
              </Reveal>
            ))}
          </div>
        )
      )}

      <Reveal className="mt-16">
        <div
          className="relative rounded-3xl bg-gradient-to-b from-sandal-50 to-white px-6 py-14 sm:px-12 overflow-hidden"
          style={{ backgroundImage: 'radial-gradient(rgba(26,26,26,0.06) 1px, transparent 1px)', backgroundSize: '18px 18px' }}
        >
          <h2 className="text-2xl font-extrabold text-ink-900 text-center mb-2">How It Works</h2>
          <p className="text-ink-500 text-sm text-center mb-12">Simple, phone-confirmed ordering — no surprises.</p>
          <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6 max-w-4xl mx-auto">
            {/* Connecting flow line between the three steps, desktop only */}
            <div className="hidden sm:block absolute top-7 left-[16.6%] right-[16.6%] border-t-2 border-dashed border-brand-200" />
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.title} className="relative bg-white rounded-2xl shadow-elevated p-6 pt-8 text-center">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-sky-600 text-white text-xs font-extrabold flex items-center justify-center shadow-sm ring-4 ring-white">
                  {i + 1}
                </span>
                <div className="w-14 h-14 rounded-2xl bg-black flex items-center justify-center mx-auto mb-4 mt-2">
                  <step.icon size={22} className="text-sky-400" />
                </div>
                <p className="font-bold text-ink-900 mb-1">{step.title}</p>
                <p className="text-sm text-ink-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal className="mt-14">
        <div className="flex items-center gap-3 pb-2 mb-4 border-b border-sandal-200">
          <span className="w-1 h-5 rounded-full bg-gradient-to-b from-brand-500 to-sky-500 shrink-0" />
          <h2 className="text-lg font-extrabold text-ink-900">Why Sivakasi Crackers</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {TRUST_HIGHLIGHTS.map((item, i) => {
            const theme = DUO_THEMES[i % DUO_THEMES.length]
            return (
              <div key={item.label} className="flex flex-col rounded-2xl overflow-hidden shadow-elevated transition-transform hover:-translate-y-0.5">
                {/* Plain placeholder box — swap item.image for a real path/URL later.
                    Fixed aspect ratio keeps this boundary level across every card. */}
                <div className="aspect-[4/3] shrink-0 bg-sandal-100 flex items-center justify-center border-b border-sandal-200">
                  {item.image ? (
                    <img src={item.image} alt={item.label} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  ) : (
                    <ImageOff size={22} className="text-sandal-400" strokeWidth={1.5} />
                  )}
                </div>
                {/* min-height keeps this boundary level too, regardless of stat text length */}
                <div className={`${theme.dark} p-5 shrink-0 min-h-[112px]`}>
                  <div className={`w-10 h-10 rounded-xl ${theme.iconBg} flex items-center justify-center mb-4`}>
                    <item.icon size={18} className="text-white" />
                  </div>
                  <p className="text-lg sm:text-xl font-extrabold text-white leading-snug">{item.stat}</p>
                </div>
                {/* flex-1 absorbs any leftover row height instead of the boundaries above shifting */}
                <div className={`${theme.light} px-5 py-3 flex-1 flex items-center`}>
                  <p className={`text-xs sm:text-sm font-semibold ${theme.lightText}`}>{item.label}</p>
                </div>
              </div>
            )
          })}
        </div>
      </Reveal>
    </div>
  )
}
