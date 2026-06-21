import { motion, AnimatePresence } from 'framer-motion';
import { Bell, AlertTriangle, Info, CheckCircle } from 'lucide-react';
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

const LEVEL_ICON = {
  LOW: <CheckCircle size={14} color="var(--risk-low)" />,
  MEDIUM: <Info size={14} color="var(--risk-medium)" />,
  HIGH: <AlertTriangle size={14} color="var(--risk-high)" />,
};

const LEVEL_BADGE_CLASS = {
  LOW: 'badge badge-low',
  MEDIUM: 'badge badge-medium',
  HIGH: 'badge badge-high',
};

export default function AlertsPanel({ analysis, alerts }: AlertsPanelProps) {
  return (
    <div className="glass-card" style={{ padding: 16 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 12,
      }}>
        <div className="section-title" style={{ margin: 0 }}>
          <Bell size={13} />
          Alerts &amp; Decisions
        </div>
        {alerts.filter(a => a.level === 'HIGH').length > 0 && (
          <motion.span
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            style={{
              fontSize: '0.6rem', fontWeight: 700,
              padding: '2px 8px', borderRadius: 999,
              background: 'rgba(255,61,90,0.2)',
              color: 'var(--risk-high)',
              border: '1px solid rgba(255,61,90,0.3)',
            }}
          >
            {alerts.filter(a => a.level === 'HIGH').length} CRITICAL
          </motion.span>
        )}
      </div>

      {/* Current AI reasoning */}
      {analysis && analysis.reasons && analysis.reasons.length > 0 && (
        <div style={{
          padding: '10px 14px', borderRadius: 'var(--radius-md)',
          background: 'rgba(168, 85, 247, 0.06)',
          border: '1px solid rgba(168, 85, 247, 0.15)',
          marginBottom: 12,
        }}>
          <div style={{
            fontSize: '0.6rem', fontWeight: 700,
            color: 'var(--accent-purple)', textTransform: 'uppercase',
            letterSpacing: '0.1em', marginBottom: 6,
          }}>
            🤖 AI Reasoning
          </div>
          {analysis.reasons.map((r, i) => (
            <p key={i} style={{
              fontSize: '0.75rem', color: 'var(--text-secondary)',
              lineHeight: 1.5, marginBottom: 2,
            }}>
              • {r}
            </p>
          ))}
          {analysis.suggested_action && (
            <p style={{
              fontSize: '0.72rem', color: 'var(--accent-green)',
              marginTop: 6, fontWeight: 500,
            }}>
              ➜ {analysis.suggested_action}
            </p>
          )}
        </div>
      )}

      {/* Alert list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
        <AnimatePresence>
          {alerts.length === 0 ? (
            <div style={{
              padding: 20, textAlign: 'center',
              color: 'var(--text-muted)', fontSize: '0.8rem',
            }}>
              No alerts yet — system monitoring
            </div>
          ) : (
            alerts.slice(0, 20).map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                style={{
                  padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex', gap: 10,
                }}
              >
                <div style={{ paddingTop: 2 }}>
                  {LEVEL_ICON[alert.level]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', marginBottom: 4,
                  }}>
                    <span className={LEVEL_BADGE_CLASS[alert.level]}>
                      {alert.level}
                    </span>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.6rem', color: 'var(--text-muted)',
                    }}>
                      {alert.time}
                    </span>
                  </div>
                  <p style={{
                    fontSize: '0.75rem', color: 'var(--text-primary)',
                    lineHeight: 1.4,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {alert.message}
                  </p>
                  <p style={{
                    fontSize: '0.65rem', color: 'var(--text-muted)',
                    marginTop: 2,
                  }}>
                    ➜ {alert.action}
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
