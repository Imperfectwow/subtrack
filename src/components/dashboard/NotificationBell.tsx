'use client'

interface NotificationBellProps {
  events: string[]
  show: boolean
  onToggle: () => void
}

export default function NotificationBell({ events, show, onToggle }: NotificationBellProps) {
  return (
    <div style={{ position: 'relative' }}>
      <button className="btn" onClick={onToggle} style={{ background: '#0a1628', border: '1px solid #1e3a5f', color: '#94a3b8', padding: '7px 10px', position: 'relative' }}>
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        {events.length > 0 && (
          <span style={{ position: 'absolute', top: 4, left: 4, width: 8, height: 8, borderRadius: '50%', background: '#ef4444', border: '1px solid #030b15' }} />
        )}
      </button>
      {show && (
        <div style={{ position: 'absolute', left: 0, top: '110%', width: 300, background: '#07111f', border: '1px solid #0f2240', borderRadius: 10, zIndex: 100, overflow: 'hidden', animation: 'fadeSlideIn 0.15s ease' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #0f2240', fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>עדכונים בזמן אמת</div>
          {events.length === 0
            ? <div style={{ padding: '14px', fontSize: 12, color: '#475569', textAlign: 'center' }}>אין עדכונים חדשים</div>
            : events.map((e, i) => (
              <div key={i} style={{ padding: '10px 14px', borderBottom: '1px solid #0a1628', fontSize: 12, color: '#cbd5e1' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', display: 'inline-block', marginLeft: 6 }} />
                {e}
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}
