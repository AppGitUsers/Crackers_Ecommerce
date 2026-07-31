export default function StatCard({ label, value, icon, accent = 'brand' }) {
  const accentClasses = {
    brand: 'bg-brand-100 text-brand-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    sandal: 'bg-sandal-200 text-brand-800',
  }
  return (
    <div className="card p-4 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${accentClasses[accent]}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold text-brand-400 uppercase tracking-wide">{label}</p>
        <p className="text-xl font-extrabold text-brand-900">{value}</p>
      </div>
    </div>
  )
}
