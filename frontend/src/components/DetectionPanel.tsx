import { motion, AnimatePresence } from 'framer-motion';
import { Box, User, Tag, AlertTriangle } from 'lucide-react';
import type { Detection } from '../api';

interface DetectionPanelProps {
  detections: Detection[];
  sceneDescription: string;
}

const BEHAVIOR_COLORS: Record<string, string> = {
  ENTERING: '#60a5fa',
  MOVING: '#22c55e',
  WAITING: '#f59e0b',
  LOITERING: '#ef4444',
  RUNNING: '#f97316',
};

export default function DetectionPanel({ detections, sceneDescription }: DetectionPanelProps) {
  const persons = detections.filter(d => d.label === 'person');
  const others = detections.filter(d => d.label !== 'person');

  const grouped: Record<string, { count: number; maxConf: number }> = {};
  others.forEach((d) => {
    if (!grouped[d.label]) grouped[d.label] = { count: 0, maxConf: 0 };
    grouped[d.label].count++;
    grouped[d.label].maxConf = Math.max(grouped[d.label].maxConf, d.confidence);
  });
  const entries = Object.entries(grouped).sort((a, b) => b[1].count - a[1].count);

  return (
    <div className="glass-card" style={{ padding: 16 }}>
      <div className="section-title">
        <Box size={13} />
        Detected Objects
      </div>

      {sceneDescription && (
        <motion.div
          key={sceneDescription}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: '10px 14px', borderRadius: 'var(--radius-md)',
            background: 'rgba(0, 229, 255, 0.06)',
            border: '1px solid rgba(0, 229, 255, 0.12)',
            fontSize: '0.78rem', color: 'var(--text-secondary)',
            lineHeight: 1.5, marginBottom: 14,
            fontStyle: 'italic',
          }}
        >
          {sceneDescription}
        </motion.div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
        <AnimatePresence mode="popLayout">
          {persons.map((person, idx) => {
            const behavior = (person as any).behavior || 'MOVING';
            const bColor = BEHAVIOR_COLORS[behavior] || '#60a5fa';
            const isLoitering = (person as any).loitering;
            const faceVisible = (person as any).face_visible !== false;
            const trackerId = (person as any).tracker_id ?? idx;

            return (
              <motion.div
                key={`person-${trackerId}`}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                style={{
                  padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                  background: isLoitering ? 'rgba(239,68,68,0.07)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isLoitering ? 'rgba(239,68,68,0.3)' : 'var(--border-subtle)'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <User size={13} color={isLoitering ? '#ef4444' : 'var(--accent-cyan)'} />
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {person.identified_name ? (
                        <>
                          {person.identified_name}
                          {person.identified_role && <span style={{ opacity: 0.6, fontSize: '0.6rem', marginLeft: 4 }}>[{person.identified_role.toUpperCase()}]</span>}
                        </>
                      ) : (
                        `Person #${trackerId + 1}`
                      )}
                    </span>
                    <span style={{
                      fontSize: '0.55rem', fontWeight: 700, padding: '1px 6px',
                      borderRadius: 20, background: `${bColor}22`, color: bColor,
                      border: `1px solid ${bColor}44`, textTransform: 'uppercase',
                    }}>
                      {behavior}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {!faceVisible && (
                      <span style={{
                        fontSize: '0.55rem', fontWeight: 700, padding: '1px 6px',
                        borderRadius: 20, background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                        border: '1px solid rgba(239,68,68,0.3)',
                      }}>NO FACE</span>
                    )}
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      {(person.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                {isLoitering && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <AlertTriangle size={10} color="#ef4444" />
                    <span style={{ fontSize: '0.6rem', color: '#ef4444', fontWeight: 600 }}>Loitering Alert</span>
                  </div>
                )}
              </motion.div>
            );
          })}

          {entries.map(([label, { count, maxConf }]) => (
            <motion.div
              key={label}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Tag size={14} color="var(--accent-purple)" />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                  {label}
                </span>
                {count > 1 && (
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '1px 6px', borderRadius: 999, background: 'rgba(0,229,255,0.15)', color: 'var(--accent-cyan)' }}>×{count}</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 50, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${maxConf * 100}%` }} transition={{ duration: 0.5 }}
                    style={{ height: '100%', borderRadius: 2, background: maxConf > 0.7 ? 'var(--accent-green)' : maxConf > 0.5 ? 'var(--accent-amber)' : 'var(--accent-red)' }}
                  />
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', minWidth: 35, textAlign: 'right' }}>
                  {(maxConf * 100).toFixed(0)}%
                </span>
              </div>
            </motion.div>
          ))}

          {persons.length === 0 && entries.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              No objects detected
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{
        marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-subtle)',
        display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)',
      }}>
        <span>Total detections</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-cyan)' }}>
          {detections.length}
        </span>
      </div>
    </div>
  );
}
