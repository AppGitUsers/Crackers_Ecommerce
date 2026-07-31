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
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-brand-800">Crackers for every celebration</h1>
        <p className="text-brand-500 text-sm mt-1">Pick your favourites and check out — we'll call you to confirm.</p>
      </div>

      <CategoryFilter categories={categories} selected={selectedCategory} onSelect={setSelectedCategory} />

      {loading ? (
        <div className="text-center py-16 text-brand-500">Loading products…</div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 text-brand-500">No products found in this category.</div>
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
