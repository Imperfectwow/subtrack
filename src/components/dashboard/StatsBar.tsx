interface StatsBarProps {
  stats: { total: number; open: number; confirmed: number; pending: number }
  assistantCount: number
}

export default function StatsBar({ stats, assistantCount }: StatsBarProps) {
  return (
    <div style={{ padding: '12px 24px', borderBottom: '1px solid #0a1f35', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
      {[
        { label: 'סה״כ היעדרויות', value: stats.total,     color: '#e2e8f0' },
        { label: 'פתוחות',         value: stats.open,       color: '#818cf8' },
        { label: 'ממתינות',        value: stats.pending,    color: '#fbbf24' },
        { label: 'מאושרות',        value: stats.confirmed,  color: '#10b981' },
        { label: 'מסייעות זמינות', value: assistantCount,   color: '#3b82f6' },
      ].map(stat => (
        <div key={stat.label} className="card" style={{ padding: '10px 14px' }}>
          <div style={{ fontSize: 10, color: '#475569', fontWeight: 600 }}>{stat.label}</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: stat.color, marginTop: 2 }}>{stat.value}</div>
        </div>
      ))}
    </div>
  )
}
