import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TimelineEvent { time: string; event: string; }
interface Incident {
  id: string; timestamp: string; pattern: string;
  confidence: string; description: string;
  timeline: TimelineEvent[]; recommendation: string;
  snapshot_path?: string | null;
  resolved?: boolean;
}

const CONFIDENCE_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#f59e0b',
  LOW: '#22c55e',
};

const CONFIDENCE_BG: Record<string, string> = {
  CRITICAL: 'rgba(239,68,68,0.1)',
  HIGH: 'rgba(249,115,22,0.1)',
  MEDIUM: 'rgba(245,158,11,0.1)',
  LOW: 'rgba(34,197,94,0.1)',
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
      // Show visual feedback
      setIncidents(prev => prev.map(inc =>
        inc.id === id ? { ...inc, confidence: 'CRITICAL' } : inc
      ));
    } catch (err) {
      console.error("Failed to escalate incident:", err);
    }
  };

  const openCount = incidents.filter(i => !i.resolved).length;

  return (
    <div style={{ padding: 16, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: openCount > 0 ? '#ef4444' : '#22c55e',
            boxShadow: `0 0 8px ${openCount > 0 ? '#ef4444' : '#22c55e'}`,
            animation: openCount > 0 ? 'pulse 1s infinite' : 'none',
          }} />
          <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
            AI Incident Investigator — {openCount} Open
          </span>
        </div>
        <button
          onClick={load}
          style={{
            background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.2)',
            color: 'var(--accent-cyan)', borderRadius: 6, padding: '3px 8px',
            fontSize: '0.6rem', fontWeight: 600, cursor: 'pointer',
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {incidents.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 16px' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>🕵️</div>
          <p style={{ fontSize: '0.8rem' }}>No incidents detected.</p>
          <p style={{ fontSize: '0.7rem', marginTop: 4, opacity: 0.6 }}>System is actively investigating patterns…</p>
        </div>
      ) : (
        <AnimatePresence>
          {incidents.map((inc) => {
            const color = CONFIDENCE_COLORS[inc.confidence] || '#6b7280';
            const bg = CONFIDENCE_BG[inc.confidence] || 'rgba(107,114,128,0.1)';
            const isOpen = expanded === inc.id;
            return (
              <motion.div
                key={inc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                style={{
                  border: `1px solid ${color}40`,
                  borderRadius: 12,
                  background: bg,
                  overflow: 'hidden',
                  cursor: 'pointer',
                }}
                onClick={() => setExpanded(isOpen ? null : inc.id)}
              >
                {/* Header */}
                <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontSize: '0.6rem', fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                        background: color, color: '#000', textTransform: 'uppercase',
                      }}>{inc.confidence}</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color }}>{inc.pattern}</span>
                    </div>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 3 }}>
                      {new Date(inc.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      {' · '}
                      {new Date(inc.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{isOpen ? '▲' : '▼'}</span>
                </div>

                {/* Expanded body */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ borderTop: `1px solid ${color}30`, padding: '12px 14px' }}
                    >
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                        {inc.description}
                      </p>

                      {/* Snapshot Evidence */}
                      {inc.snapshot_path && (
                        <div style={{ marginBottom: 12 }}>
                          <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 6 }}>Evidence Snapshot</p>
                          <img
                            src={`/snapshots/${inc.snapshot_path}`}
                            alt="Incident Evidence"
                            style={{ width: '100%', maxWidth: 300, borderRadius: 8, border: `1px solid ${color}40` }}
                          />
                        </div>
                      )}

                      {/* Timeline */}
                      <div style={{ marginBottom: 12 }}>
                        <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 8 }}>
                          Event Timeline
                        </p>
                        <div style={{ position: 'relative', paddingLeft: 16 }}>
                          <div style={{ position: 'absolute', left: 6, top: 0, bottom: 0, width: 1, background: `${color}40` }} />
                          {inc.timeline.map((t, i) => (
                            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, position: 'relative' }}>
                              <div style={{
                                position: 'absolute', left: -10, top: 4,
                                width: 6, height: 6, borderRadius: '50%', background: color,
                              }} />
                              <span style={{ fontSize: '0.62rem', color, minWidth: 55, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{t.time}</span>
                              <span style={{ fontSize: '0.67rem', color: 'var(--text-secondary)' }}>{t.event}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Recommendation */}
                      <div style={{
                        background: `${color}15`, border: `1px solid ${color}30`,
                        borderRadius: 8, padding: '8px 10px', marginBottom: 12,
                      }}>
                        <p style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', color, marginBottom: 2 }}>Recommended Action</p>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{inc.recommendation}</p>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={(e) => resolveIncident(inc.id, e)}
                          style={{
                            flex: 1, padding: '8px 12px', borderRadius: 8,
                            background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
                            color: '#22c55e', fontSize: '0.7rem', fontWeight: 700,
                            cursor: 'pointer', transition: 'all 0.2s',
                          }}
                        >
                          ✓ Mark Resolved
                        </button>
                        <button
                          onClick={(e) => escalateIncident(inc.id, e)}
                          style={{
                            flex: 1, padding: '8px 12px', borderRadius: 8,
                            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                            color: '#ef4444', fontSize: '0.7rem', fontWeight: 700,
                            cursor: 'pointer', transition: 'all 0.2s',
                          }}
                        >
                          ⚠ Escalate
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}
    </div>
  );
}
