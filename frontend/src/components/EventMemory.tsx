import { motion, AnimatePresence } from 'framer-motion';
import { Database, Clock, Eye, ShieldCheck } from 'lucide-react';
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
      return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return ts;
    }
  };

  return (
    <div className="glass-card" style={{ padding: 16 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 12,
      }}>
        <div className="section-title" style={{ margin: 0 }}>
          <Database size={13} />
          Event Memory
        </div>
        <span style={{
          fontSize: '0.6rem', fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
        }}>
          {events.length} records
        </span>
      </div>

      {/* Predictive Risk Heatmap */}
      {insights.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 8 }}>Predictive Risk Heatmap (24h)</p>
          <div style={{ display: 'flex', gap: 2, height: 24, alignItems: 'flex-end' }}>
            {Array.from({ length: 24 }).map((_, i) => {
              const h = (new Date().getHours() - 23 + i + 24) % 24;
              const data = insights.find(ins => ins.hour === h);
              const height = data ? Math.max(10, Math.min(100, data.avg_risk * 100)) : 4;
              const color = data && data.avg_risk > 0.4 ? '#ef4444' : data && data.avg_risk > 0.15 ? '#f97316' : data ? '#22c55e' : 'rgba(255,255,255,0.05)';
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{
                    width: '100%', height: `${height}%`, background: color, borderRadius: 2,
                    opacity: data ? 1 : 0.5,
                  }} title={data ? `Hour: ${h}:00, Avg Risk: ${data.avg_risk}, Events: ${data.count}` : `Hour: ${h}:00`} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{
        display: 'flex', flexDirection: 'column', gap: 6,
        maxHeight: 280, overflowY: 'auto',
      }}>
        {loading ? (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            Loading events…
          </div>
        ) : events.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            No events recorded yet
          </div>
        ) : (
          <AnimatePresence>
            {events.slice(0, 25).map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  display: 'flex', gap: 10, padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}
                whileHover={{ borderColor: 'var(--border-glow)' }}
              >
                {/* Snapshot thumbnail */}
                {event.snapshot_path ? (
                  <img
                    src={`${API.snapshots}/${event.snapshot_path}`}
                    alt="snapshot"
                    style={{
                      width: 52, height: 40, objectFit: 'cover',
                      borderRadius: 4, flexShrink: 0,
                      border: '1px solid var(--border-subtle)',
                    }}
                  />
                ) : (
                  <div style={{
                    width: 52, height: 40, borderRadius: 4,
                    background: 'rgba(255,255,255,0.03)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Eye size={14} color="var(--text-muted)" />
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', marginBottom: 3,
                  }}>
                    <span className={`badge badge-${event.risk_level.toLowerCase()}`}>
                      {event.risk_level}
                    </span>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      fontSize: '0.55rem', color: 'var(--text-muted)',
                    }}>
                      <Clock size={10} />
                      {formatTime(event.timestamp)}
                    </div>
                  </div>
                  <p style={{
                    fontSize: '0.72rem', color: 'var(--text-secondary)',
                    lineHeight: 1.4,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {event.scene_description || 'Detection event'}
                  </p>
                  {event.person_count > 0 && (
                    <span style={{
                      fontSize: '0.6rem', color: 'var(--text-muted)',
                      display: 'block', marginTop: 2,
                    }}>
                      {event.person_count} person(s) • {event.object_summary || 'no objects'}
                    </span>
                  )}
                  {event.snapshot_hash && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 4, marginTop: 4,
                      fontSize: '0.55rem', color: 'var(--accent-green)', fontFamily: 'var(--font-mono)',
                      background: 'rgba(34, 197, 94, 0.1)', padding: '2px 6px', borderRadius: 4, width: 'fit-content'
                    }}>
                      <ShieldCheck size={10} />
                      SHA-256: {event.snapshot_hash.substring(0, 16)}...
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
