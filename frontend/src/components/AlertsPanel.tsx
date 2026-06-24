import { motion, AnimatePresence } from 'framer-motion';
import { Bell, AlertTriangle, Info, CheckCircle, Brain } from 'lucide-react';
import type { AnalysisData } from '../api';

interface AlertsPanelProps {
  analysis: AnalysisData | null;
  alerts: AlertItem[];
}

export interface AlertItem {
  id: string;
  time: string;
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  message: string;
  action: string;
}

const LEVEL_CONFIG = {
  LOW: {
    icon: <CheckCircle size={13} color="var(--risk-low)" />,
    cardClass: 'alert-card-low',
    labelColor: 'var(--risk-low)',
  },
  MEDIUM: {
    icon: <Info size={13} color="var(--risk-medium)" />,
    cardClass: 'alert-card-medium',
    labelColor: 'var(--risk-medium)',
  },
  HIGH: {
    icon: <AlertTriangle size={13} color="var(--risk-high)" />,
    cardClass: 'alert-card-high',
    labelColor: 'var(--risk-high)',
  },
};

export default function AlertsPanel({ analysis, alerts }: AlertsPanelProps) {
  const highCount = alerts.filter(a => a.level === 'HIGH').length;

  return (
    <div className="glass-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Bell size={12} color="var(--accent-cyan)" />
          <span style={{
            fontSize: '0.62rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.14em',
            color: 'var(--text-muted)',
          }}>
            Alerts & Decisions
          </span>
        </div>
        {highCount > 0 && (
          <motion.span
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 0.9, repeat: Infinity }}
            style={{
              fontSize: '0.55rem', fontWeight: 700,
              padding: '2px 8px', borderRadius: 4,
              background: 'rgba(239,68,68,0.15)',
              color: 'var(--risk-high)',
              border: '1px solid rgba(239,68,68,0.3)',
              letterSpacing: '0.08em', textTransform: 'uppercase',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {highCount} CRITICAL
          </motion.span>
        )}
      </div>

      {/* AI Reasoning block */}
      {analysis?.reasons && analysis.reasons.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: '10px 12px', borderRadius: 8,
            background: 'rgba(168,85,247,0.05)',
            border: '1px solid rgba(168,85,247,0.18)',
            boxShadow: '0 0 16px rgba(168,85,247,0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
            <Brain size={11} color="var(--accent-purple)" />
            <span style={{
              fontSize: '0.55rem', fontWeight: 700,
              color: 'var(--accent-purple)', textTransform: 'uppercase',
              letterSpacing: '0.12em',
            }}>
              AI Reasoning
            </span>
          </div>
          {analysis.reasons.map((r, i) => (
            <p key={i} style={{
              fontSize: '0.7rem', color: 'var(--text-secondary)',
              lineHeight: 1.55, marginBottom: 2,
            }}>
              · {r}
            </p>
          ))}
          {analysis.suggested_action && (
            <p style={{
              fontSize: '0.68rem', color: 'var(--accent-green)',
              marginTop: 6, fontWeight: 500, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 6,
            }}>
              ➜ {analysis.suggested_action}
            </p>
          )}
        </motion.div>
      )}

      {/* Alert list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 260, overflowY: 'auto' }}>
        <AnimatePresence>
          {alerts.length === 0 ? (
            <div style={{
              padding: '20px 0', textAlign: 'center',
              color: 'var(--text-muted)', fontSize: '0.75rem',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            }}>
              <CheckCircle size={20} color="var(--risk-low)" style={{ opacity: 0.4 }} />
              <span>No alerts — system nominal</span>
            </div>
          ) : (
            alerts.slice(0, 20).map((alert) => {
              const cfg = LEVEL_CONFIG[alert.level];
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.25 }}
                  className={cfg.cardClass}
                  style={{ padding: '9px 11px', display: 'flex', gap: 9 }}
                >
                  <div style={{ paddingTop: 1, flexShrink: 0 }}>
                    {cfg.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', marginBottom: 3,
                    }}>
                      <span className={`badge badge-${alert.level.toLowerCase() as 'low' | 'medium' | 'high'}`}
                        style={{ fontSize: '0.5rem' }}>
                        {alert.level}
                      </span>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: '0.55rem',
                        color: 'var(--text-muted)',
                      }}>
                        {alert.time}
                      </span>
                    </div>
                    <p style={{
                      fontSize: '0.7rem', color: 'var(--text-primary)',
                      lineHeight: 1.4, whiteSpace: 'nowrap',
                      overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {alert.message}
                    </p>
                    <p style={{
                      fontSize: '0.62rem', color: cfg.labelColor,
                      marginTop: 3, opacity: 0.7,
                    }}>
                      ➜ {alert.action}
                    </p>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
