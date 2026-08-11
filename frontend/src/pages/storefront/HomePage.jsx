import { useEffect, useMemo, useState } from 'react'
import { Sparkles, BadgeCheck, Phone, LayoutGrid, ShieldCheck } from 'lucide-react'
import { CategoriesAPI, ProductsAPI } from '../../api/endpoints'
import CategoryFilter from '../../components/storefront/CategoryFilter.jsx'
import ProductCard from '../../components/storefront/ProductCard.jsx'

// Evergreen, always-true value props (no fabricated stats like "127 sold
// today") — shown as arch-shaped cards anchored over the hero's wave edge.
const VALUE_PROPS = [
  { title: 'Genuine Sivakasi Crackers', icon: BadgeCheck },
  { title: 'Confirmed By Phone Call', icon: Phone },
  { title: 'Wide Range of Categories', icon: LayoutGrid },
  { title: 'Simple & Secure Checkout', icon: ShieldCheck },
]

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

export default function HomePage() {
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    CategoriesAPI.list().then(({ data }) => setCategories(data.results || data))
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = selectedCategory ? { category: selectedCategory } : {}
    ProductsAPI.list(params)
      .then(({ data }) => setProducts(data.results || data))
      .finally(() => setLoading(false))
  }, [selectedCategory])

  // Group the current product list by category (in the category's own
  // display order) instead of one flat grid — a category with no products
  // in the current view is simply skipped, so this works the same whether
  // "All" or a single category is selected.
  const sections = useMemo(() => {
    const byCategory = new Map()
    for (const product of products) {
      if (!byCategory.has(product.category)) byCategory.set(product.category, [])
      byCategory.get(product.category).push(product)
    }
    return categories
      .filter((cat) => byCategory.has(cat.id))
      .map((cat) => ({ category: cat, products: byCategory.get(cat.id) }))
  }, [products, categories])

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

      <CategoryFilter categories={categories} selected={selectedCategory} onSelect={setSelectedCategory} />

      {loading ? (
        <div className="space-y-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 text-ink-400">No products found in this category.</div>
      ) : (
        <div className="space-y-10">
          {sections.map(({ category, products: categoryProducts }) => (
            <section key={category.id}>
              <div className="flex items-center gap-3 pb-2 mb-4 border-b border-sandal-200">
                <span className="w-1 h-5 rounded-full bg-gradient-to-b from-brand-500 to-sky-500 shrink-0" />
                <h2 className="text-lg font-extrabold text-ink-900">{category.name}</h2>
                <span className="text-xs font-semibold text-ink-400">{categoryProducts.length} item{categoryProducts.length === 1 ? '' : 's'}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                {categoryProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
