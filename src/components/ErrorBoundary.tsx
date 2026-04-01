'use client'

import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : 'שגיאה לא צפויה'
    return { hasError: true, message }
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div style={{
          minHeight: '100vh', background: '#030b15', display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: 24,
          fontFamily: 'sans-serif', direction: 'rtl',
        }}>
          <div style={{
            background: '#2d0a0a', border: '1px solid #7f1d1d',
            borderRadius: 16, padding: 32, maxWidth: 480, width: '100%',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
            <h2 style={{ color: '#fca5a5', fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>
              אירעה שגיאה
            </h2>
            <p style={{ color: '#f87171', fontSize: 13, margin: '0 0 20px' }}>
              {this.state.message}
            </p>
            <button
              onClick={() => { this.setState({ hasError: false, message: '' }); window.location.reload() }}
              style={{
                background: '#7f1d1d', border: 'none', borderRadius: 8,
                color: '#fca5a5', padding: '10px 20px', fontSize: 14,
                fontWeight: 700, cursor: 'pointer',
              }}
            >
              רענן דף
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
