import { motion } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';
import type { RiskLevel } from '../api';

interface RiskMeterProps {
  level: RiskLevel;
  score: number;
  agentMode?: 'gemini' | 'fallback';
}

const RISK_CONFIG = {
  LOW: { color: 'var(--risk-low)', label: 'LOW RISK', bg: 'rgba(0,255,169,0.08)' },
  MEDIUM: { color: 'var(--risk-medium)', label: 'MEDIUM RISK', bg: 'rgba(255,184,0,0.08)' },
  HIGH: { color: 'var(--risk-high)', label: 'HIGH RISK', bg: 'rgba(255,61,90,0.08)' },
};

export default function RiskMeter({ level, score, agentMode }: RiskMeterProps) {
  const config = RISK_CONFIG[level] || RISK_CONFIG.LOW;
  const pct = Math.round(score * 100);
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score * circumference);

  return (
    <div className="glass-card" style={{ padding: 20, textAlign: 'center', position: 'relative' }}>
      <div className="section-title" style={{ justifyContent: 'center' }}>
        <ShieldAlert size={13} />
        Threat Level
      </div>

      {/* Agent Mode Indicator */}
      {agentMode && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          fontSize: '0.55rem', padding: '2px 6px',
          borderRadius: 4, textTransform: 'uppercase',
          background: agentMode === 'gemini' ? 'rgba(0,229,255,0.1)' : 'rgba(255,184,0,0.1)',
          color: agentMode === 'gemini' ? 'var(--accent-cyan)' : 'var(--risk-medium)',
          border: `1px solid ${agentMode === 'gemini' ? 'rgba(0,229,255,0.2)' : 'rgba(255,184,0,0.2)'}`,
        }}>
          {agentMode === 'gemini' ? 'Gemini AI' : 'Rule-Based'}
        </div>
      )}

      {/* Circular gauge */}
      <div style={{ position: 'relative', width: 140, height: 140, margin: '12px auto' }}>
        <svg width="140" height="140" viewBox="0 0 120 120">
          {/* Background ring */}
          <circle
            cx="60" cy="60" r="54"
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="8"
          />
          {/* Animated progress ring */}
          <motion.circle
            cx="60" cy="60" r="54"
            fill="none"
            stroke={config.color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: 'easeOut' }}
            transform="rotate(-90 60 60)"
            style={{
              filter: `drop-shadow(0 0 8px ${config.color})`,
            }}
          />
        </svg>

        {/* Centre text */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <motion.span
            key={pct}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              fontSize: '2rem', fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              color: config.color,
              lineHeight: 1,
            }}
          >
            {pct}
          </motion.span>
          <span style={{
            fontSize: '0.55rem', color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.1em',
          }}>
            Score
          </span>
        </div>
      </div>

      {/* Risk level badge */}
      <motion.div
        key={level}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '8px 20px', borderRadius: 10,
          background: config.bg,
          border: `1px solid ${config.color}40`,
        }}
      >
        {level === 'HIGH' && (
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            style={{
              width: 10, height: 10, borderRadius: '50%',
              background: config.color,
              boxShadow: `0 0 10px ${config.color}`,
            }}
          />
        )}
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.8rem',
          fontWeight: 700, color: config.color,
          letterSpacing: '0.1em',
        }}>
          {config.label}
        </span>
      </motion.div>
    </div>
  );
}
