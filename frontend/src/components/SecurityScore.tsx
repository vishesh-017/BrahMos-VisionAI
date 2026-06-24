import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Info, AlertTriangle, ArrowRight } from 'lucide-react';

interface ScoreData {
  score: number; grade: string; status: string; color: string;
  issues: string[]; recommendations: string[];
  high_events_today: number; medium_events_today: number; total_events_today: number;
  computed_at: string;
}

const COLOR_MAP: Record<string, string> = {
  green: 'var(--risk-low)',    // #00ffa9
  teal: '#00d4ff',             // cyan
  amber: 'var(--risk-medium)', // #f59e0b
  orange: '#fb923c',           // bright orange
  red: 'var(--risk-high)',     // #ef4444
};

export default function SecurityScore() {
  const [data, setData] = useState<ScoreData | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch('/api/security-score');
        setData(await r.json());
      } catch {}
    };
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!data) return (
    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }}>
        Calculating Threat Score…
      </motion.div>
    </div>
  );

  const color = COLOR_MAP[data.color] || 'var(--risk-low)';
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (data.score / 100) * circumference;

  return (
    <div className="glass-card" style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Top Section: Score Ring & Status ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        
        {/* Glow Ring */}
        <div style={{ position: 'relative', width: 130, height: 130, flexShrink: 0 }}>
          <svg width="130" height="130" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="65" cy="65" r={radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="6" />
            <motion.circle
              cx="65" cy="65" r={radius} fill="none"
              stroke={color} strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 1.5, ease: 'easeOut', type: 'spring' }}
              style={{ filter: `drop-shadow(0 0 12px ${color}80)` }}
            />
          </svg>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <motion.span
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              style={{
                fontSize: '2.2rem', fontWeight: 900, lineHeight: 1,
                fontFamily: 'var(--font-mono)', color,
                textShadow: `0 0 20px ${color}90`,
              }}
            >
              {data.score}
            </motion.span>
            <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.14em', marginTop: 2 }}>
              / 100
            </span>
          </div>
        </div>

        {/* Status Text & Mini Stats */}
        <div style={{ flex: 1 }}>
          <motion.div initial={{ x: 10, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
            <div style={{
              fontSize: '1.4rem', fontWeight: 800, color, textTransform: 'uppercase',
              letterSpacing: '0.05em', textShadow: `0 0 10px ${color}50`
            }}>
              {data.status}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Threat Grade: <strong style={{ color: '#fff' }}>{data.grade}</strong>
            </div>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 14 }}>
            {[
              { label: 'CRITICAL', val: data.high_events_today, c: 'var(--risk-high)', bg: 'rgba(239,68,68,0.08)' },
              { label: 'ELEVATED', val: data.medium_events_today, c: 'var(--risk-medium)', bg: 'rgba(245,158,11,0.08)' },
              { label: 'TOTAL', val: data.total_events_today, c: 'var(--text-secondary)', bg: 'rgba(255,255,255,0.05)' },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.1 }}
                style={{
                  background: s.bg, border: `1px solid ${s.c}20`,
                  borderRadius: 8, padding: '6px 4px', textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '1rem', fontWeight: 800, color: s.c, fontFamily: 'var(--font-mono)' }}>
                  {s.val}
                </div>
                <div style={{ fontSize: '0.45rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 1 }}>
                  {s.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.1), transparent)' }} />

      {/* ── Issues Detected ── */}
      <div>
        <div className="section-title">
          <AlertTriangle size={12} color="var(--risk-high)" /> Active Threats
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {data.issues.map((issue, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.05 }}
              style={{
                display: 'flex', gap: 8, alignItems: 'flex-start',
                fontSize: '0.68rem', color: 'var(--text-primary)',
                background: 'rgba(239,68,68,0.04)', padding: '6px 10px', borderRadius: 6,
                borderLeft: `2px solid ${issue.includes('No security') ? 'var(--risk-low)' : 'var(--risk-high)'}`
              }}
            >
              <span>{issue}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Recommendations ── */}
      <div>
        <div className="section-title">
          <ShieldAlert size={12} color="var(--accent-cyan)" /> Tactical Recommendations
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {data.recommendations.map((rec, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.05 }}
              style={{
                display: 'flex', gap: 8, alignItems: 'center',
                fontSize: '0.68rem', color: 'var(--text-secondary)',
                background: 'rgba(0,212,255,0.03)', padding: '6px 10px', borderRadius: 6,
                border: '1px solid rgba(0,212,255,0.08)'
              }}
            >
              <ArrowRight size={10} color="var(--accent-cyan)" />
              <span>{rec}</span>
            </motion.div>
          ))}
        </div>
      </div>

      <p style={{
        fontSize: '0.52rem', color: 'var(--text-muted)', textAlign: 'center',
        marginTop: 'auto', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em'
      }}>
        LATEST SCAN: {data.computed_at.toUpperCase()}
      </p>
    </div>
  );
}
