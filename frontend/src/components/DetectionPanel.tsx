import { motion, AnimatePresence } from 'framer-motion';
import { Box, User, Tag, AlertTriangle, ShieldAlert } from 'lucide-react';
import type { Detection } from '../api';

interface DetectionPanelProps {
  detections: Detection[];
  sceneDescription: string;
}

const BEHAVIOR_COLORS: Record<string, string> = {
  ENTERING: '#00d4ff',
  MOVING: '#00ffa9',
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
    <div className="glass-card" style={{ padding: '16px 20px', minHeight: 400, display: 'flex', flexDirection: 'column' }}>
      <div className="section-title">
        <Box size={14} color="var(--accent-cyan)" />
        LIVE DETECTIONS
      </div>

      {sceneDescription && (
        <motion.div
          key={sceneDescription}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: '12px 16px', borderRadius: 4,
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(0, 212, 255, 0.2)',
            borderLeft: '3px solid var(--accent-cyan)',
            fontSize: '0.75rem', color: 'var(--text-secondary)',
            lineHeight: 1.6, marginBottom: 18, fontFamily: 'var(--font-mono)',
            boxShadow: 'inset 0 0 10px rgba(0,212,255,0.05)'
          }}
        >
          <span style={{ color: 'var(--accent-cyan)', marginRight: 6 }}>&gt;</span>
          {sceneDescription}
        </motion.div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflowY: 'auto', paddingRight: 4 }}>
        <AnimatePresence mode="popLayout">
          {persons.map((person, idx) => {
            const behavior = (person as any).behavior || 'MOVING';
            const bColor = BEHAVIOR_COLORS[behavior] || 'var(--accent-cyan)';
            const isLoitering = (person as any).loitering;
            const inZone = (person as any).in_zone;
            const faceVisible = (person as any).face_visible !== false;
            const trackerId = (person as any).tracker_id ?? idx;
            
            const isThreat = isLoitering || inZone || !faceVisible;
            const cardColor = isThreat ? 'var(--accent-red)' : bColor;

            return (
              <motion.div
                key={`person-${trackerId}`}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                style={{
                  padding: '12px 14px', borderRadius: 6,
                  background: isThreat ? 'rgba(239,68,68,0.05)' : 'rgba(0,0,0,0.3)',
                  border: `1px solid ${isThreat ? 'rgba(239,68,68,0.3)' : 'var(--border-subtle)'}`,
                  borderLeft: `3px solid ${cardColor}`,
                  boxShadow: isThreat ? '0 0 10px rgba(239,68,68,0.1)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ 
                      padding: 6, borderRadius: 4, 
                      background: isThreat ? 'rgba(239,68,68,0.1)' : 'rgba(0,212,255,0.1)',
                      border: `1px solid ${isThreat ? 'rgba(239,68,68,0.2)' : 'rgba(0,212,255,0.2)'}`
                    }}>
                      <User size={14} color={cardColor} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                        {person.identified_name ? (
                          <>
                            {person.identified_name.toUpperCase()}
                            {person.identified_role && <span style={{ opacity: 0.5, fontSize: '0.6rem', marginLeft: 6 }}>[{person.identified_role.toUpperCase()}]</span>}
                          </>
                        ) : (
                          `TARGET_${trackerId + 1}`
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                        <span style={{
                          fontSize: '0.55rem', fontWeight: 700, padding: '2px 6px',
                          borderRadius: 2, background: `rgba(${bColor === '#ef4444' ? '239,68,68' : '0,212,255'},0.1)`, 
                          color: bColor, border: `1px solid ${bColor}40`, textTransform: 'uppercase', letterSpacing: '0.05em'
                        }}>
                          {behavior}
                        </span>
                        {!faceVisible && (
                          <span style={{
                            fontSize: '0.55rem', fontWeight: 700, padding: '2px 6px',
                            borderRadius: 2, background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                            border: '1px solid rgba(239,68,68,0.4)', letterSpacing: '0.05em'
                          }}>MASKED</span>
                        )}
                        {inZone && (
                          <span style={{
                            fontSize: '0.55rem', fontWeight: 700, padding: '2px 6px',
                            borderRadius: 2, background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                            border: '1px solid rgba(239,68,68,0.4)', letterSpacing: '0.05em'
                          }}>RESTRICTED ZONE</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {entries.map(([label, { count, maxConf }]) => (
            <motion.div
              key={label}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: 6,
                background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Tag size={13} color="var(--accent-purple)" />
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
                  {label}
                </span>
                {count > 1 && (
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: 'rgba(168,85,247,0.15)', color: 'var(--accent-purple)', border: '1px solid rgba(168,85,247,0.3)' }}>×{count}</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 60, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${maxConf * 100}%` }} transition={{ duration: 0.8, type: 'spring' }}
                    style={{ height: '100%', borderRadius: 2, background: maxConf > 0.7 ? 'var(--accent-cyan)' : 'var(--accent-purple)', boxShadow: '0 0 8px currentColor' }}
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
              style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              <Box size={24} style={{ opacity: 0.2, margin: '0 auto 10px' }} />
              Awaiting Detections...
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{
        marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border-subtle)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>Active Targets</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: detections.length > 0 ? 'var(--accent-cyan)' : 'var(--text-muted)', boxShadow: detections.length > 0 ? '0 0 8px var(--accent-cyan)' : 'none' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#fff', fontSize: '1rem' }}>
            {detections.length}
          </span>
        </div>
      </div>
    </div>
  );
}
