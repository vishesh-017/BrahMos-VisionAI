import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface ScoreData {
  score: number; grade: string; status: string; color: string;
  issues: string[]; recommendations: string[];
  high_events_today: number; medium_events_today: number; total_events_today: number;
  computed_at: string;
}

const COLOR_MAP: Record<string, string> = {
  green: '#22c55e',
  teal: '#14b8a6',
  amber: '#f59e0b',
  orange: '#f97316',
  red: '#ef4444',
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
    <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
      Loading security score…
    </div>
  );

  const color = COLOR_MAP[data.color] || '#22c55e';
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (data.score / 100) * circumference;

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Score Ring */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
          <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
            <motion.circle
              cx="60" cy="60" r={radius} fill="none"
              stroke={color} strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              style={{ filter: `drop-shadow(0 0 6px ${color})` }}
            />
          </svg>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              fontSize: '1.8rem', fontWeight: 900,
              fontFamily: 'var(--font-mono)', color,
              textShadow: `0 0 12px ${color}80`,
            }}>{data.score}</span>
            <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>/100</span>
          </div>
        </div>

        <div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color }}>{data.status}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>Grade: {data.grade}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {[
              { label: 'HIGH', val: data.high_events_today, c: '#ef4444' },
              { label: 'MED', val: data.medium_events_today, c: '#f59e0b' },
              { label: 'TOTAL', val: data.total_events_today, c: 'var(--text-muted)' },
            ].map(s => (
              <div key={s.label} style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 6, padding: '3px 8px', textAlign: 'center',
              }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: s.c, fontFamily: 'var(--font-mono)' }}>{s.val}</div>
                <div style={{ fontSize: '0.5rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Issues */}
      <div>
        <p style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 6 }}>Issues Detected</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {data.issues.map((issue, i) => (
            <div key={i} style={{
              display: 'flex', gap: 8, alignItems: 'flex-start',
              fontSize: '0.7rem', color: 'var(--text-secondary)',
            }}>
              <span style={{ color, marginTop: 2, flexShrink: 0 }}>•</span>
              <span>{issue}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div>
        <p style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 6 }}>Recommendations</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {data.recommendations.map((rec, i) => (
            <div key={i} style={{
              display: 'flex', gap: 8, alignItems: 'flex-start',
              fontSize: '0.7rem', color: 'var(--text-secondary)',
            }}>
              <span style={{ color: '#60a5fa', marginTop: 2, flexShrink: 0 }}>→</span>
              <span>{rec}</span>
            </div>
          ))}
        </div>
      </div>

      <p style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 'auto' }}>
        Updated: {data.computed_at}
      </p>
    </div>
  );
}
