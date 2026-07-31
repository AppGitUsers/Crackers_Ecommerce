import { useState } from 'react'
import { useCart } from '../../context/CartContext'

export default function ProductCard({ product }) {
  const { items, addItem, setQuantity } = useCart()
  const cartLine = items.find((i) => i.product_id === product.id)
  const [pendingQty, setPendingQty] = useState(1)

  const inCartQty = cartLine?.quantity || 0

  return (
    <div className="card p-4 flex flex-col">
      <div className="aspect-square bg-sandal-100 rounded-lg overflow-hidden mb-3 flex items-center justify-center">
        {product.primary_image ? (
          <img src={product.primary_image} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-4xl">🎇</span>
        )}
      </div>
      <h3 className="font-semibold text-brand-900 leading-snug">{product.name}</h3>
      <p className="text-xs text-brand-500 mb-1">{product.category_name}</p>
      <div className="mt-auto flex items-center justify-between pt-2">
        <span className="font-bold text-brand-700">
          ₹{product.price} <span className="text-xs font-normal text-brand-400">/ {product.unit_label}</span>
        </span>
      </div>

      {!product.in_stock ? (
        <span className="badge bg-red-100 text-red-600 mt-2 text-center">Out of stock</span>
      ) : inCartQty > 0 ? (
        <div className="flex items-center justify-between mt-3 border border-sandal-300 rounded-lg overflow-hidden">
          <button
            className="w-9 h-9 font-bold text-brand-600 hover:bg-sandal-100"
            onClick={() => setQuantity(product.id, inCartQty - 1)}
          >
            −
          </button>
          <span className="font-semibold">{inCartQty}</span>
          <button
            className="w-9 h-9 font-bold text-brand-600 hover:bg-sandal-100"
            onClick={() => setQuantity(product.id, inCartQty + 1)}
          >
            +
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 mt-3">
          <div className="flex items-center border border-sandal-300 rounded-lg overflow-hidden">
            <button
              className="w-8 h-8 font-bold text-brand-600 hover:bg-sandal-100"
              onClick={() => setPendingQty((q) => Math.max(1, q - 1))}
            >
              −
            </button>
            <span className="w-8 text-center font-semibold">{pendingQty}</span>
            <button
              className="w-8 h-8 font-bold text-brand-600 hover:bg-sandal-100"
              onClick={() => setPendingQty((q) => q + 1)}
            >
              +
            </button>
          </div>
          <button className="btn-primary flex-1 text-sm" onClick={() => addItem(product, pendingQty)}>
            Add
          </button>
        </div>
      )}
    </div>
  )
}
