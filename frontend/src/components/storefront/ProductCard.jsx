import { useCart } from '../../context/CartContext'

export default function ProductCard({ product }) {
  const { items, addItem, setQuantity } = useCart()
  const cartLine = items.find((i) => i.product_id === product.id)

  const inCartQty = cartLine?.quantity || 0

  return (
    <div className="card p-4 flex flex-col hover:shadow-lg transition-shadow">
      <div className="aspect-square bg-sandal-100 rounded-lg overflow-hidden mb-3 flex items-center justify-center">
        {product.primary_image ? (
          <img src={product.primary_image} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-4xl">🎇</span>
        )}
      </div>
      <h3 className="font-semibold text-ink-900 leading-snug">{product.name}</h3>
      <p className="text-xs text-ink-500 mb-1">{product.category_name}</p>
      <div className="mt-auto flex items-center justify-between pt-2">
        <span className="font-bold text-brand-600">
          ₹{product.price} <span className="text-xs font-normal text-ink-400">/ {product.unit_label}</span>
        </span>
      </div>

      {!product.in_stock ? (
        <span className="badge bg-ink-100 text-ink-500 mt-2 text-center">Out of stock</span>
      ) : inCartQty > 0 ? (
        <div className="flex items-center justify-between mt-3 border border-sandal-300 rounded-lg overflow-hidden">
          <button
            className="w-9 h-9 font-bold text-brand-600 hover:bg-sandal-100"
            onClick={() => setQuantity(product.id, inCartQty - 1)}
          >
            −
          </button>
          <span className="font-semibold text-ink-900">{inCartQty}</span>
          <button
            className="w-9 h-9 font-bold text-brand-600 hover:bg-sandal-100"
            onClick={() => setQuantity(product.id, inCartQty + 1)}
          >
            +
          </button>
        </div>
      ) : (
        <button className="btn-primary w-full mt-3 text-sm" onClick={() => addItem(product, 1)}>
          Add
        </button>
      )}
    </div>
  )
}
