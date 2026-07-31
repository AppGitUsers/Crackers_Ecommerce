export default function StatCard({ label, value, icon, accent = 'brand' }) {
  const accentClasses = {
    brand: 'bg-brand-50 text-brand-600',
    ink: 'bg-ink-100 text-ink-700',
    green: 'bg-green-50 text-green-700',
    red: 'bg-brand-50 text-brand-600',
    gold: 'bg-gold-500/10 text-gold-600',
    sandal: 'bg-sandal-100 text-ink-700',
  }
  return (
    <div className="card p-4 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${accentClasses[accent]}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold text-ink-400 uppercase tracking-wide">{label}</p>
        <p className="text-xl font-extrabold text-ink-900">{value}</p>
      </div>
    </div>
  )
}
