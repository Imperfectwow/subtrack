export const FONT = `@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@300;400;500&display=swap');`

export type StatusColor = { bg: string; text: string; border: string; label: string }

export const statusColors: Record<string, StatusColor> = {
  open:      { bg: "#1e1b4b", text: "#818cf8", border: "#3730a3", label: "פתוח" },
  matching:  { bg: "#1c1917", text: "#fb923c", border: "#9a3412", label: "מחפש" },
  pending:   { bg: "#1c1917", text: "#fbbf24", border: "#78350f", label: "ממתין" },
  confirmed: { bg: "#052e16", text: "#4ade80", border: "#166534", label: "מאושר" },
  cancelled: { bg: "#1f1f1f", text: "#6b7280", border: "#374151", label: "בוטל" },
  no_show:   { bg: "#2d0a0a", text: "#fca5a5", border: "#7f1d1d", label: "לא הגיע" },
}

export const CSS_GLOBALS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: #0a1628; }
  ::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 2px; }
  @keyframes ping { 75%,100% { transform: scale(2); opacity: 0; } }
  @keyframes fadeSlideIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  @keyframes glow { 0%,100% { box-shadow:0 0 10px #10b98140; } 50% { box-shadow:0 0 24px #10b98190; } }
  .card { background: #07111f; border: 1px solid #0f2240; border-radius: 12px; }
  .btn { cursor: pointer; border: none; border-radius: 8px; font-family: 'Heebo', sans-serif; font-weight: 700; transition: all 0.15s; }
  .row-hover:hover { background: #0a1f35 !important; }
`
