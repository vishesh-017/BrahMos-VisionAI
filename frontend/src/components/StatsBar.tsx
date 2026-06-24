import { motion } from 'framer-motion';
import { BarChart3, Shield, AlertTriangle, Activity } from 'lucide-react';
import type { EventStats } from '../api';

interface StatsBarProps {
  stats: EventStats | null;
}

export default function StatsBar({ stats }: StatsBarProps) {
  const cards = [
    {
      label: 'Total Events',
      value: stats?.total_today ?? 0,
      icon: <BarChart3 size={18} />,
      accent: 'var(--accent-cyan)',
      bg: 'rgba(0, 212, 255, 0.06)',
      desc: 'Today',
    },
    {
      label: 'High Risk',
      value: stats?.high_risk ?? 0,
      icon: <AlertTriangle size={18} />,
      accent: 'var(--risk-high)',
      bg: 'rgba(239, 68, 68, 0.06)',
      desc: 'Critical',
    },
    {
      label: 'Medium Risk',
      value: stats?.medium_risk ?? 0,
      icon: <Activity size={18} />,
      accent: 'var(--risk-medium)',
      bg: 'rgba(245, 158, 11, 0.06)',
      desc: 'Elevated',
    },
    {
      label: 'Low Risk',
      value: stats?.low_risk ?? 0,
      icon: <Shield size={18} />,
      accent: 'var(--risk-low)',
      bg: 'rgba(0, 255, 169, 0.06)',
      desc: 'Clear',
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08, duration: 0.4 }}
          className="kpi-card"
          style={{
            padding: '14px 18px',
            display: 'flex', alignItems: 'center', gap: 14,
            // Each card's bottom glow uses the card accent colour
            ['--kpi-accent' as string]: card.accent,
          }}
        >
          {/* Icon container */}
          <div style={{
            width: 42, height: 42, borderRadius: 10, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: card.bg,
            border: `1px solid ${card.accent}22`,
            color: card.accent,
            boxShadow: `0 0 14px ${card.accent}18`,
          }}>
            {card.icon}
          </div>

          {/* Text */}
          <div>
            <motion.p
              key={card.value}
              initial={{ scale: 0.75, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              style={{
                fontSize: '1.6rem', fontWeight: 800, lineHeight: 1,
                fontFamily: 'var(--font-mono)',
                color: card.accent,
                textShadow: `0 0 16px ${card.accent}50`,
              }}
            >
              {String(card.value).padStart(2, '0')}
            </motion.p>
            <p style={{
              fontSize: '0.58rem', color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 3,
            }}>
              {card.label}
            </p>
          </div>

          {/* Small descriptor badge top-right */}
          <span style={{
            marginLeft: 'auto', alignSelf: 'flex-start',
            fontSize: '0.48rem', fontWeight: 700,
            padding: '2px 6px', borderRadius: 4,
            textTransform: 'uppercase', letterSpacing: '0.1em',
            background: card.bg,
            color: card.accent,
            border: `1px solid ${card.accent}22`,
          }}>
            {card.desc}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
