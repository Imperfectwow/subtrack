'use client'

interface NavItem {
  key: string
  label: string
  icon: string
}

interface NavSidebarProps {
  items: NavItem[]
  active: string
  onChange: (key: string) => void
}

export default function NavSidebar({ items, active, onChange }: NavSidebarProps) {
  return (
    <div style={{
      width: 64, flexShrink: 0,
      background: '#020810',
      borderLeft: '1px solid #0a1f35',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      paddingTop: 12, gap: 2,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: 'linear-gradient(135deg, #1d4ed8, #0ea5e9)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 20, flexShrink: 0,
      }}>
        <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      </div>

      {items.map(item => (
        <button
          key={item.key}
          onClick={() => onChange(item.key)}
          title={item.label}
          style={{
            width: 48, height: 52, borderRadius: 10,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
            background: active === item.key ? '#0a1f35' : 'transparent',
            border: `1px solid ${active === item.key ? '#1e3a5f' : 'transparent'}`,
            color: active === item.key ? '#7dd3fc' : '#475569',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
        >
          <span style={{ fontSize: 20, lineHeight: 1 }}>{item.icon}</span>
          <span style={{ fontSize: 9, fontFamily: 'Heebo, sans-serif', fontWeight: 600 }}>{item.label}</span>
        </button>
      ))}
    </div>
  )
}
