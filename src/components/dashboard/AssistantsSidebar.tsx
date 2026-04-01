'use client'

import type { Assistant } from '@/lib/types'

interface AssistantsSidebarProps {
  assistants: Assistant[]
}

export default function AssistantsSidebar({ assistants }: AssistantsSidebarProps) {
  return (
    <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
        מסייעות זמינות ({assistants.length})
      </div>

      {assistants.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#334155', fontSize: 14 }}>
          אין מסייעות זמינות כרגע
        </div>
      ) : assistants.map((asst, i) => (
        <div key={asst.id} className="row-hover" style={{ padding: '10px', borderRadius: 10, border: '1px solid #0a1f35', cursor: 'pointer', animation: `fadeSlideIn 0.25s ${i * 0.06}s both` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#0a1f35', border: '2px solid #166534', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#4ade80', flexShrink: 0 }}>
              {asst.profile?.full_name?.slice(0, 2) ?? 'מס'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#cbd5e1' }}>{asst.profile?.full_name ?? 'מסייעת'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                <span style={{ fontSize: 10, color: '#fbbf24' }}>★</span>
                <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: '#64748b' }}>{Number(asst.rating).toFixed(1)}</span>
              </div>
            </div>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
          </div>
          {asst.subjects.length > 0 && (
            <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
              {asst.subjects.slice(0, 3).map((s) => (
                <span key={s} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: '#0a1f35', color: '#7dd3fc' }}>{s}</span>
              ))}
            </div>
          )}
        </div>
      ))}

      <button className="btn" style={{
        width: '100%', padding: '9px 0', fontSize: 12, marginTop: 'auto',
        background: 'linear-gradient(135deg, #065f46, #047857)',
        color: '#6ee7b7', border: '1px solid #065f46',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        animation: 'glow 2.5s ease-in-out infinite',
      }}>
        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        שלח התראת וואטסאפ
      </button>
    </div>
  )
}
