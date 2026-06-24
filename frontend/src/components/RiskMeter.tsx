import { motion } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';
import type { RiskLevel } from '../api';

interface RiskMeterProps {
  level: RiskLevel;
  score: number;
  agentMode?: 'gemini' | 'fallback';
}

const RISK_CONFIG = {
  LOW:    { color: 'var(--risk-low)',    label: 'LOW RISK',    segments: 2, hex: '#00ffa9' },
  MEDIUM: { color: 'var(--risk-medium)', label: 'MEDIUM RISK', segments: 5, hex: '#f59e0b' },
  HIGH:   { color: 'var(--risk-high)',   label: 'HIGH RISK',   segments: 9, hex: '#ef4444' },
};

const TOTAL_SEGMENTS = 10;

export default function RiskMeter({ level, score, agentMode }: RiskMeterProps) {
  const config = RISK_CONFIG[level] || RISK_CONFIG.LOW;
  const pct = Math.round(score * 100);
  const filledSegments = Math.max(1, Math.round(score * TOTAL_SEGMENTS));

  return (
    <div className="glass-card" style={{
      padding: 18, textAlign: 'center', position: 'relative',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
      border: `1px solid ${config.hex}18`,
      boxShadow: `0 0 30px ${config.hex}10`,
      transition: 'border-color 0.6s ease, box-shadow 0.6s ease',
    }}>
      {/* Agent mode badge */}
      {agentMode && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          fontSize: '0.48rem', padding: '2px 7px', borderRadius: 4,
          textTransform: 'uppercase', letterSpacing: '0.1em',
          background: agentMode === 'gemini' ? 'rgba(0,212,255,0.08)' : 'rgba(245,158,11,0.08)',
          color: agentMode === 'gemini' ? 'var(--accent-cyan)' : 'var(--risk-medium)',
          border: `1px solid ${agentMode === 'gemini' ? 'rgba(0,212,255,0.18)' : 'rgba(245,158,11,0.18)'}`,
          fontFamily: 'var(--font-mono)',
        }}>
          {agentMode === 'gemini' ? '⚡ Gemini' : 'Rule-Based'}
        </div>
      )}

      {/* Title */}
      <div className="section-title" style={{ margin: 0, justifyContent: 'center' }}>
        <ShieldAlert size={12} />
        Threat Level
      </div>

      {/* Large score number */}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <motion.span
          key={pct}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          style={{
            fontFamily: 'var(--font-mono)', fontWeight: 800, lineHeight: 1,
            fontSize: '3rem',
            color: config.color,
            textShadow: `0 0 30px ${config.hex}70`,
          }}
        >
          {pct}
        </motion.span>
        <span style={{
          fontSize: '0.52rem', color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.16em', marginTop: 2,
        }}>
          Risk Score
        </span>
      </div>

      {/* Segmented horizontal bar */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', gap: 3, width: '100%' }}>
          {Array.from({ length: TOTAL_SEGMENTS }).map((_, i) => {
            const filled = i < filledSegments;
            // Colour transitions: 0-3=cyan, 4-6=amber, 7-9=red
            const segColor = i < 3 ? '#00ffa9' : i < 7 ? '#f59e0b' : '#ef4444';
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scaleY: 0.4 }}
                animate={{ opacity: filled ? 1 : 0.12, scaleY: filled ? 1 : 0.5 }}
                transition={{ delay: i * 0.04, duration: 0.35 }}
                style={{
                  flex: 1, height: 14, borderRadius: 3,
                  background: filled ? segColor : 'rgba(255,255,255,0.04)',
                  boxShadow: filled ? `0 0 10px ${segColor}70` : 'none',
                  transformOrigin: 'center',
                }}
              />
            );
          })}
        </div>
        {/* Labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 1px' }}>
          {['Low', 'Med', 'High'].map((l) => (
            <span key={l} style={{
              fontSize: '0.45rem', color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              {l}
            </span>
          ))}
        </div>
      </div>

      {/* Risk level badge */}
      <motion.div
        key={level}
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '7px 18px', borderRadius: 8, width: '100%', justifyContent: 'center',
          background: `${config.hex}10`,
          border: `1px solid ${config.hex}35`,
        }}
      >
        {level === 'HIGH' && (
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [1, 0.4, 1] }}
            transition={{ duration: 0.75, repeat: Infinity }}
            style={{
              width: 9, height: 9, borderRadius: '50%',
              background: config.color, boxShadow: `0 0 10px ${config.hex}`,
            }}
          />
        )}
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.75rem',
          fontWeight: 700, color: config.color,
          letterSpacing: '0.1em',
          textShadow: `0 0 12px ${config.hex}60`,
        }}>
          {config.label}
        </span>
      </motion.div>
    </div>
  );
}
