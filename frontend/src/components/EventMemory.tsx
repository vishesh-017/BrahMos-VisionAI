import { motion, AnimatePresence } from 'framer-motion';
import { Database, Clock, Eye, ShieldCheck, Activity } from 'lucide-react';
import type { SecurityEvent } from '../api';
import { API } from '../api';
import { useState, useEffect } from 'react';

interface EventMemoryProps {
  events: SecurityEvent[];
  loading: boolean;
}

export default function EventMemory({ events, loading }: EventMemoryProps) {
  const [insights, setInsights] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/insights')
      .then(r => r.json())
      .then(data => setInsights(data))
      .catch(console.error);
  }, [events]);

  const formatTime = (ts: string) => {
    try {
      return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return ts;
    }
  };

  return (
    <div className="glass-card" style={{ padding: '16px 20px', minHeight: 400, display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10
      }}>
        <div className="section-title" style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-primary)' }}>
          <Database size={15} color="var(--accent-purple)" />
          EVENT MEMORY / SECURE LOG
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-purple)', boxShadow: '0 0 8px var(--accent-purple)' }} />
          <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-purple)', letterSpacing: '0.1em' }}>
            {events.length} RECORDS
          </span>
        </div>
      </div>

      {/* Predictive Risk Heatmap */}
      {insights.length > 0 && (
        <div style={{ marginBottom: 20, padding: 12, background: 'rgba(0,0,0,0.3)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Activity size={12} color="var(--accent-cyan)" />
            <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-cyan)', margin: 0, fontFamily: 'var(--font-mono)' }}>
              Risk Heatmap (24H)
            </p>
          </div>
          <div style={{ display: 'flex', gap: 3, height: 32, alignItems: 'flex-end' }}>
            {Array.from({ length: 24 }).map((_, i) => {
              const h = (new Date().getHours() - 23 + i + 24) % 24;
              const data = insights.find(ins => ins.hour === h);
              const height = data ? Math.max(15, Math.min(100, data.avg_risk * 100)) : 8;
              const color = data && data.avg_risk > 0.4 ? 'var(--accent-red)' : data && data.avg_risk > 0.15 ? 'var(--accent-amber)' : data ? 'var(--accent-green)' : 'rgba(255,255,255,0.05)';
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <motion.div 
                    initial={{ height: 0 }} animate={{ height: `${height}%` }} transition={{ duration: 1, delay: i * 0.02 }}
                    style={{
                      width: '100%', background: color, borderRadius: 2,
                      opacity: data ? 1 : 0.4, boxShadow: data ? `0 0 8px ${color}` : 'none'
                    }} title={data ? `Hour: ${h}:00, Avg Risk: ${data.avg_risk.toFixed(2)}, Events: ${data.count}` : `Hour: ${h}:00`} 
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{
        display: 'flex', flexDirection: 'column', gap: 10,
        flex: 1, overflowY: 'auto', paddingRight: 4
      }}>
        {loading ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--accent-cyan)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            <Activity size={24} style={{ animation: 'spin 2s linear infinite', margin: '0 auto 10px', opacity: 0.5 }} />
            Decrypting Records…
          </div>
        ) : events.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            No records found in local memory.
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {events.slice(0, 25).map((event, idx) => {
              const riskColor = event.risk_level === 'HIGH' ? 'var(--accent-red)' : event.risk_level === 'MEDIUM' ? 'var(--accent-amber)' : 'var(--accent-green)';
              
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2, delay: idx * 0.03 }}
                  style={{
                    display: 'flex', gap: 12, padding: '12px',
                    borderRadius: 6,
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid var(--border-subtle)',
                    borderLeft: `3px solid ${riskColor}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = riskColor; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.4)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
                >
                  <div style={{
                    position: 'absolute', top: 0, left: 0, bottom: 0, width: '30%',
                    background: `linear-gradient(90deg, ${riskColor}11 0%, transparent 100%)`, pointerEvents: 'none'
                  }} />

                  {/* Snapshot thumbnail */}
                  {event.snapshot_path ? (
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <img
                        src={`${API.snapshots}/${event.snapshot_path}`}
                        alt="snapshot"
                        style={{
                          width: 60, height: 45, objectFit: 'cover',
                          borderRadius: 4, border: `1px solid ${riskColor}44`,
                        }}
                      />
                      <div style={{ position: 'absolute', inset: 0, boxShadow: `inset 0 0 10px ${riskColor}33`, borderRadius: 4, pointerEvents: 'none' }} />
                    </div>
                  ) : (
                    <div style={{
                      width: 60, height: 45, borderRadius: 4,
                      background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Eye size={16} color="var(--text-muted)" opacity={0.5} />
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0, zIndex: 1 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', marginBottom: 6,
                    }}>
                      <span style={{
                        fontSize: '0.55rem', fontWeight: 800, padding: '2px 6px',
                        borderRadius: 2, background: `${riskColor}15`, color: riskColor,
                        border: `1px solid ${riskColor}40`, textTransform: 'uppercase', letterSpacing: '0.1em'
                      }}>
                        {event.risk_level}
                      </span>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)'
                      }}>
                        <Clock size={10} color={riskColor} />
                        {formatTime(event.timestamp)}
                      </div>
                    </div>
                    
                    <p style={{
                      fontSize: '0.75rem', color: '#fff',
                      lineHeight: 1.4, margin: 0,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {event.scene_description || 'SYSTEM DETECTION LOG'}
                    </p>
                    
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                      {event.person_count > 0 && (
                        <span style={{
                          fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)'
                        }}>
                          {event.person_count} PERSON(S) DETECTED
                        </span>
                      )}
                      {event.snapshot_hash && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          fontSize: '0.55rem', color: 'var(--accent-green)', fontFamily: 'var(--font-mono)',
                          background: 'rgba(34, 197, 94, 0.05)', padding: '2px 6px', borderRadius: 2, border: '1px solid rgba(34,197,94,0.2)'
                        }}>
                          <ShieldCheck size={10} />
                          {event.snapshot_hash.substring(0, 8).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
