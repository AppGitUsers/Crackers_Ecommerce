import { useEffect, useState } from 'react'
import { CategoriesAPI, ProductsAPI } from '../../api/endpoints'
import CategoryFilter from '../../components/storefront/CategoryFilter.jsx'
import ProductCard from '../../components/storefront/ProductCard.jsx'

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

  return (
    <div>
      <div className="rounded-2xl bg-ink-900 text-white px-6 py-8 sm:px-10 sm:py-10 mb-8 relative overflow-hidden">
        <div className="absolute -right-6 -top-6 text-8xl opacity-10 select-none">🎆</div>
        <p className="text-brand-400 font-bold uppercase tracking-widest text-xs mb-2">Sivakasi Crackers</p>
        <h1 className="text-2xl sm:text-3xl font-extrabold">Crackers for every celebration</h1>
        <p className="text-sandal-200 text-sm mt-2 max-w-md">
          Pick your favourites and check out — we'll call you to confirm your order.
        </p>
      </div>

      <CategoryFilter categories={categories} selected={selectedCategory} onSelect={setSelectedCategory} />

      {loading ? (
        <div className="text-center py-16 text-ink-400">Loading products…</div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 text-ink-400">No products found in this category.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}
