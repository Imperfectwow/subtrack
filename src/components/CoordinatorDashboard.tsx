'use client'

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const FONT = `@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@300;400;500&display=swap');`;

const statusColors: Record<string, { bg: string; text: string; border: string; label: string }> = {
  open:      { bg: "#1e1b4b", text: "#818cf8", border: "#3730a3", label: "פתוח" },
  matching:  { bg: "#1c1917", text: "#fb923c", border: "#9a3412", label: "מחפש" },
  pending:   { bg: "#1c1917", text: "#fbbf24", border: "#78350f", label: "ממתין" },
  confirmed: { bg: "#052e16", text: "#4ade80", border: "#166534", label: "מאושר" },
  cancelled: { bg: "#1f1f1f", text: "#6b7280", border: "#374151", label: "בוטל" },
  no_show:   { bg: "#2d0a0a", text: "#fca5a5", border: "#7f1d1d", label: "לא הגיע" },
};

const PulsingDot = ({ color = "#10b981" }: { color?: string }) => (
  <span style={{ position: "relative", display: "inline-flex", width: 10, height: 10 }}>
    <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: color, opacity: 0.4, animation: "ping 1.5s cubic-bezier(0,0,0.2,1) infinite" }} />
    <span style={{ borderRadius: "50%", width: 10, height: 10, background: color, display: "block" }} />
  </span>
);

export default function CoordinatorDashboard() {
  const supabase = createClient();

  const [absences, setAbsences]     = useState<any[]>([]);
  const [schools, setSchools]       = useState<any[]>([]);
  const [assistants, setAssistants] = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [showNotifs, setShowNotifs] = useState(false);
  const [newEvents, setNewEvents]   = useState<string[]>([]);

  // טען נתונים ראשוניים
  useEffect(() => {
    fetchAll();
  }, []);

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "absences" }, (payload) => {
        fetchAbsences();
        const msg = payload.eventType === "INSERT"
          ? `היעדרות חדשה: ${(payload.new as any).teacher_name}`
          : `עדכון היעדרות: ${(payload.new as any).teacher_name}`;
        setNewEvents(prev => [msg, ...prev.slice(0, 4)]);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "assistants" }, () => {
        fetchAssistants();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchAbsences(), fetchSchools(), fetchAssistants()]);
    setLoading(false);
    setLastUpdate(new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }));
  };

  const fetchAbsences = async () => {
    const { data } = await supabase
      .from("absences")
      .select(`*, school:schools(name)`)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) {
      setAbsences(data);
      setLastUpdate(new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }));
    }
  };

  const fetchSchools = async () => {
    const { data } = await supabase.from("schools").select("*").eq("is_active", true);
    if (data) setSchools(data);
  };

  const fetchAssistants = async () => {
    const { data } = await supabase
      .from("assistants")
      .select(`*, profile:profiles(full_name, phone, whatsapp_phone)`)
      .eq("is_available", true);
    if (data) setAssistants(data);
  };

  // סטטיסטיקות
  const stats = {
    total:     absences.length,
    open:      absences.filter(a => a.status === "open" || a.status === "matching").length,
    confirmed: absences.filter(a => a.status === "confirmed").length,
    pending:   absences.filter(a => a.status === "pending").length,
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#030b15", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Heebo, sans-serif", color: "#475569" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, border: "3px solid #1e3a5f", borderTop: "3px solid #3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        טוען נתונים...
      </div>
    </div>
  );

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: "#030b15", fontFamily: "'Heebo', sans-serif", color: "#e2e8f0" }}>
      <style>{`
        ${FONT}
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #0a1628; } ::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 2px; }
        @keyframes ping { 75%,100% { transform: scale(2); opacity: 0; } }
        @keyframes fadeSlideIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes glow { 0%,100% { box-shadow:0 0 10px #10b98140; } 50% { box-shadow:0 0 24px #10b98190; } }
        .card { background: #07111f; border: 1px solid #0f2240; border-radius: 12px; }
        .btn { cursor: pointer; border: none; border-radius: 8px; font-family: 'Heebo', sans-serif; font-weight: 700; transition: all 0.15s; }
        .row-hover:hover { background: #0a1f35 !important; }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: "1px solid #0f2240", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #1d4ed8, #0ea5e9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 900, color: "#f1f5f9" }}>SubTrack</div>
            <div style={{ fontSize: 10, color: "#475569", marginTop: -2 }}>מרכז פיקוד רכז</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* שעת עדכון אחרון */}
          <div style={{ background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: 8, padding: "5px 12px", display: "flex", alignItems: "center", gap: 6 }}>
            <PulsingDot color="#10b981" />
            <span style={{ fontFamily: "JetBrains Mono", fontSize: 13, color: "#4ade80", fontWeight: 500 }}>{lastUpdate}</span>
            <span style={{ fontSize: 10, color: "#475569" }}>עדכון אחרון</span>
          </div>

          {/* התראות */}
          <div style={{ position: "relative" }}>
            <button className="btn" onClick={() => setShowNotifs(!showNotifs)} style={{ background: "#0a1628", border: "1px solid #1e3a5f", color: "#94a3b8", padding: "7px 10px", position: "relative" }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>
              {newEvents.length > 0 && <span style={{ position: "absolute", top: 4, left: 4, width: 8, height: 8, borderRadius: "50%", background: "#ef4444", border: "1px solid #030b15" }} />}
            </button>
            {showNotifs && (
              <div style={{ position: "absolute", left: 0, top: "110%", width: 300, background: "#07111f", border: "1px solid #0f2240", borderRadius: 10, zIndex: 100, overflow: "hidden", animation: "fadeSlideIn 0.15s ease" }}>
                <div style={{ padding: "10px 14px", borderBottom: "1px solid #0f2240", fontSize: 12, fontWeight: 700, color: "#94a3b8" }}>עדכונים בזמן אמת</div>
                {newEvents.length === 0
                  ? <div style={{ padding: "14px", fontSize: 12, color: "#475569", textAlign: "center" }}>אין עדכונים חדשים</div>
                  : newEvents.map((e, i) => (
                    <div key={i} style={{ padding: "10px 14px", borderBottom: "1px solid #0a1628", fontSize: 12, color: "#cbd5e1" }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#3b82f6", display: "inline-block", marginLeft: 6 }} />
                      {e}
                    </div>
                  ))
                }
              </div>
            )}
          </div>

          <button className="btn" onClick={fetchAll} style={{ background: "#0a1628", border: "1px solid #1e3a5f", color: "#94a3b8", padding: "7px 12px", fontSize: 12 }}>
            ↻ רענן
          </button>
        </div>
      </div>

      {/* סטטיסטיקות */}
      <div style={{ padding: "12px 24px", borderBottom: "1px solid #0a1f35", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        {[
          { label: "סה״כ היעדרויות", value: stats.total, color: "#e2e8f0" },
          { label: "פתוחות", value: stats.open, color: "#818cf8" },
          { label: "ממתינות", value: stats.pending, color: "#fbbf24" },
          { label: "מאושרות", value: stats.confirmed, color: "#10b981" },
          { label: "מסייעות זמינות", value: assistants.length, color: "#3b82f6" },
        ].map(stat => (
          <div key={stat.label} className="card" style={{ padding: "10px 14px" }}>
            <div style={{ fontSize: 10, color: "#475569", fontWeight: 600 }}>{stat.label}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: stat.color, marginTop: 2 }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* תוכן ראשי */}
      <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 320px", gap: 14 }}>

        {/* טבלת היעדרויות */}
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              היעדרויות — {absences.length} סה״כ
            </div>
            <button className="btn" style={{ background: "#1d4ed8", color: "#fff", padding: "7px 14px", fontSize: 12 }}>
              + הוסף היעדרות
            </button>
          </div>

          {/* כותרות */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 0.8fr 0.6fr 1fr 0.8fr", gap: 8, padding: "6px 10px", borderBottom: "1px solid #0a1f35", marginBottom: 4 }}>
            {["מורה", "בית ספר", "מקצוע", "כיתה", "זמן", "סטטוס"].map(h => (
              <span key={h} style={{ fontSize: 10, fontWeight: 700, color: "#334155" }}>{h}</span>
            ))}
          </div>

          {/* שורות */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {absences.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "#334155", fontSize: 14 }}>
                אין היעדרויות כרגע ✅
              </div>
            ) : absences.map((absence, i) => {
              const sc = statusColors[absence.status] || statusColors.open;
              const time = new Date(absence.created_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
              return (
                <div key={absence.id} className="row-hover" style={{
                  display: "grid", gridTemplateColumns: "1.2fr 1fr 0.8fr 0.6fr 1fr 0.8fr", gap: 8,
                  padding: "10px 10px", borderRadius: 8, cursor: "pointer",
                  animation: `fadeSlideIn 0.25s ${i * 0.04}s both`,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>{absence.teacher_name}</div>
                  <div style={{ fontSize: 12, color: "#64748b", display: "flex", alignItems: "center" }}>{absence.school?.name?.split(" ")[0] || "—"}</div>
                  <div style={{ fontSize: 12, color: "#7dd3fc", display: "flex", alignItems: "center" }}>{absence.subject}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", display: "flex", alignItems: "center" }}>{absence.grade}</div>
                  <div style={{ fontSize: 11, color: "#475569", fontFamily: "JetBrains Mono", display: "flex", alignItems: "center" }}>{time}</div>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                      {sc.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* מסייעות זמינות */}
        <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
            מסייעות זמינות ({assistants.length})
          </div>

          {assistants.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#334155", fontSize: 14 }}>
              אין מסייעות זמינות כרגע
            </div>
          ) : assistants.map((asst, i) => (
            <div key={asst.id} className="row-hover" style={{ padding: "10px", borderRadius: 10, border: "1px solid #0a1f35", cursor: "pointer", animation: `fadeSlideIn 0.25s ${i * 0.06}s both` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#0a1f35", border: "2px solid #166534", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#4ade80", flexShrink: 0 }}>
                  {asst.profile?.full_name?.slice(0, 2) || "מס"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#cbd5e1" }}>{asst.profile?.full_name || "מסייעת"}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 1 }}>
                    <span style={{ fontSize: 10, color: "#fbbf24" }}>★</span>
                    <span style={{ fontSize: 10, fontFamily: "JetBrains Mono", color: "#64748b" }}>{Number(asst.rating).toFixed(1)}</span>
                  </div>
                </div>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981" }} />
              </div>
              {asst.subjects?.length > 0 && (
                <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
                  {asst.subjects.slice(0, 3).map((s: string) => (
                    <span key={s} style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "#0a1f35", color: "#7dd3fc" }}>{s}</span>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* כפתור וואטסאפ */}
          <button className="btn" style={{
            width: "100%", padding: "9px 0", fontSize: 12, marginTop: "auto",
            background: "linear-gradient(135deg, #065f46, #047857)",
            color: "#6ee7b7", border: "1px solid #065f46",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            animation: "glow 2.5s ease-in-out infinite",
          }}>
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            שלח התראת וואטסאפ
          </button>
        </div>
      </div>
    </div>
  );
}
