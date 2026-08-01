export default function StatCard({ label, value, icon: Icon, accent = 'brand' }) {
  const accentClasses = {
    brand: 'bg-brand-50 text-brand-600',
    ink: 'bg-ink-100 text-ink-700',
    green: 'bg-green-50 text-green-700',
    red: 'bg-brand-50 text-brand-600',
    gold: 'bg-gold-500/10 text-gold-600',
    sandal: 'bg-sandal-100 text-ink-700',
  }
  return (
    <div className="kpi-card">
      <div className={`kpi-icon ${accentClasses[accent]}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-ink-400 uppercase tracking-wide">{label}</p>
        <p className="text-xl font-extrabold text-ink-900 truncate">{value}</p>
      </div>
    </div>
  )
}
