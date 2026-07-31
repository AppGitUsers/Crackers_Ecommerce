export default function CategoryFilter({ categories, selected, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <button
        onClick={() => onSelect(null)}
        className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
          selected === null
            ? 'bg-brand-500 text-white border-brand-500'
            : 'bg-white text-ink-700 border-sandal-300 hover:bg-sandal-100'
        }`}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
            selected === cat.id
              ? 'bg-brand-500 text-white border-brand-500'
              : 'bg-white text-ink-700 border-sandal-300 hover:bg-sandal-100'
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  )
}
