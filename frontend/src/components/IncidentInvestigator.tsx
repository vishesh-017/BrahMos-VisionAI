import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, AlertCircle, Crosshair, ChevronDown, ChevronUp, CheckCircle, ShieldAlert } from 'lucide-react';

interface TimelineEvent { time: string; event: string; }
interface Incident {
  id: string; timestamp: string; pattern: string;
  confidence: string; description: string;
  timeline: TimelineEvent[]; recommendation: string;
  snapshot_path?: string | null;
  resolved?: boolean;
}

const CONFIDENCE_COLORS: Record<string, string> = {
  CRITICAL: 'var(--accent-red)',
  HIGH: 'var(--accent-amber)',
  MEDIUM: 'var(--accent-amber)',
  LOW: 'var(--accent-green)',
};

export default function IncidentInvestigator() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    try {
      const r = await fetch('/api/incidents?limit=20');
      const data = await r.json();
      setIncidents(Array.isArray(data) ? data : []);
    } catch {}
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  const resolveIncident = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/incidents/${id}/resolve`, { method: 'POST' });
      setIncidents(prev => prev.filter(inc => inc.id !== id));
    } catch (err) {
      console.error("Failed to resolve incident:", err);
    }
  };

  const escalateIncident = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/incidents/${id}/escalate`, { method: 'POST' });
      setIncidents(prev => prev.map(inc =>
        inc.id === id ? { ...inc, confidence: 'CRITICAL' } : inc
      ));
    } catch (err) {
      console.error("Failed to escalate incident:", err);
    }
  };

  const openCount = incidents.filter(i => !i.resolved).length;

  return (
    <div className="glass-card" style={{ padding: '16px 20px', minHeight: 400, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10 }}>
        <div className="section-title" style={{ margin: 0 }}>
          <Search size={15} color="var(--accent-cyan)" />
          THREAT INVESTIGATOR
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: openCount > 0 ? 'var(--accent-red)' : 'var(--accent-green)',
              boxShadow: `0 0 8px ${openCount > 0 ? 'var(--accent-red)' : 'var(--accent-green)'}`,
              animation: openCount > 0 ? 'pulse 1s infinite' : 'none',
            }} />
            <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: openCount > 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
              {openCount} OPEN DOSSIERS
            </span>
          </div>
          <button
            onClick={load}
            style={{
              background: 'rgba(0,212,255,0.1)', border: '1px solid var(--accent-cyan)',
              color: 'var(--accent-cyan)', borderRadius: 4, padding: '4px 8px',
              fontSize: '0.6rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', cursor: 'pointer',
              transition: 'all 0.2s', textTransform: 'uppercase', boxShadow: '0 0 5px rgba(0,212,255,0.2)'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(0,212,255,0.2)' }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(0,212,255,0.1)' }}
          >
            REFRESH
          </button>
        </div>
      </div>

      {incidents.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          <ShieldAlert size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>No active threats detected.</p>
          <p style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', marginTop: 4, opacity: 0.5, letterSpacing: '0.05em' }}>System is actively investigating patterns...</p>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 4 }}>
          <AnimatePresence>
            {incidents.map((inc) => {
              const color = CONFIDENCE_COLORS[inc.confidence] || 'var(--text-muted)';
              const isOpen = expanded === inc.id;
              
              return (
                <motion.div
                  key={inc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  style={{
                    border: `1px solid ${isOpen ? color : 'var(--border-subtle)'}`,
                    borderLeft: `3px solid ${color}`,
                    borderRadius: 6,
                    background: isOpen ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: isOpen ? `0 0 15px ${color}22` : 'none'
                  }}
                  onClick={() => setExpanded(isOpen ? null : inc.id)}
                  onMouseOver={(e) => { if (!isOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                  onMouseOut={(e) => { if (!isOpen) e.currentTarget.style.background = 'rgba(0,0,0,0.3)' }}
                >
                  {/* Header */}
                  <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                          fontSize: '0.6rem', fontFamily: 'var(--font-mono)', fontWeight: 800, padding: '2px 6px', borderRadius: 2,
                          background: `${color}15`, color: color, border: `1px solid ${color}40`, textTransform: 'uppercase', letterSpacing: '0.05em'
                        }}>{inc.confidence}</span>
                        <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fff', textTransform: 'uppercase' }}>
                          {inc.pattern}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <Crosshair size={10} color={color} />
                        <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                          INCIDENT ID: {inc.id.split('-')[0].toUpperCase()}
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>|</span>
                        <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                          T-{new Date(inc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    {isOpen ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
                  </div>

                  {/* Expanded body */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ borderTop: `1px solid var(--border-subtle)`, padding: '16px' }}
                      >
                        <div style={{ marginBottom: 16 }}>
                          <p style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--accent-cyan)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ color: 'var(--accent-cyan)' }}>&gt;</span> AI REASONING
                          </p>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, background: 'rgba(0,212,255,0.05)', padding: 10, borderRadius: 4, border: '1px solid rgba(0,212,255,0.1)' }}>
                            {inc.description}
                          </p>
                        </div>

                        {/* Snapshot Evidence */}
                        {inc.snapshot_path && (
                          <div style={{ marginBottom: 16 }}>
                            <p style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: 8 }}>EVIDENCE SNAPSHOT</p>
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                              <img
                                src={`/snapshots/${inc.snapshot_path}`}
                                alt="Incident Evidence"
                                style={{ width: '100%', maxWidth: 300, borderRadius: 4, border: `1px solid ${color}40`, display: 'block' }}
                              />
                              <div style={{ position: 'absolute', inset: 0, boxShadow: `inset 0 0 15px ${color}33`, borderRadius: 4, pointerEvents: 'none' }} />
                              <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.7)', padding: '2px 6px', borderRadius: 2, border: `1px solid ${color}66`, fontSize: '0.5rem', fontFamily: 'var(--font-mono)', color: color, letterSpacing: '0.1em' }}>
                                FORENSIC EXPORT
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Timeline */}
                        <div style={{ marginBottom: 16 }}>
                          <p style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: 10 }}>
                            EVENT TIMELINE
                          </p>
                          <div style={{ position: 'relative', paddingLeft: 12 }}>
                            <div style={{ position: 'absolute', left: 3, top: 4, bottom: 4, width: 1, background: `${color}40` }} />
                            {inc.timeline.map((t, i) => (
                              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 10, position: 'relative' }}>
                                <div style={{
                                  position: 'absolute', left: -12, top: 4,
                                  width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}`
                                }} />
                                <span style={{ fontSize: '0.65rem', color: color, minWidth: 60, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>[{t.time}]</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-primary)' }}>{t.event}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Recommendation */}
                        <div style={{
                          background: `${color}15`, border: `1px solid ${color}30`,
                          borderRadius: 4, padding: '10px 14px', marginBottom: 16, borderLeft: `3px solid ${color}`
                        }}>
                          <p style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.15em', color: color, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <AlertCircle size={12} /> RECOMMENDED PROTOCOL
                          </p>
                          <p style={{ fontSize: '0.75rem', color: '#fff', margin: 0 }}>{inc.recommendation}</p>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button
                            onClick={(e) => resolveIncident(inc.id, e)}
                            style={{
                              flex: 1, padding: '10px', borderRadius: 4,
                              background: 'rgba(34,197,94,0.1)', border: '1px solid var(--accent-green)',
                              color: 'var(--accent-green)', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em',
                              cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(34,197,94,0.2)'; e.currentTarget.style.boxShadow = '0 0 10px rgba(34,197,94,0.2)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(34,197,94,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
                          >
                            <CheckCircle size={14} /> MARK RESOLVED
                          </button>
                          <button
                            onClick={(e) => escalateIncident(inc.id, e)}
                            style={{
                              flex: 1, padding: '10px', borderRadius: 4,
                              background: 'rgba(239,68,68,0.1)', border: '1px solid var(--accent-red)',
                              color: 'var(--accent-red)', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em',
                              cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; e.currentTarget.style.boxShadow = '0 0 10px rgba(239,68,68,0.2)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
                          >
                            <AlertCircle size={14} /> ESCALATE THREAT
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
