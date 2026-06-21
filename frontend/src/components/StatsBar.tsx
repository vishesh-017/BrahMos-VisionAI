import { motion } from 'framer-motion';
import { BarChart3, Shield, AlertTriangle, TrendingUp } from 'lucide-react';
import type { EventStats } from '../api';

interface StatsBarProps {
  stats: EventStats | null;
}

export default function StatsBar({ stats }: StatsBarProps) {
  const cards = [
    {
      label: 'Total Events',
      value: stats?.total_today ?? 0,
      icon: <BarChart3 size={16} color="var(--accent-cyan)" />,
      color: 'var(--accent-cyan)',
      bg: 'rgba(0,229,255,0.06)',
    },
    {
      label: 'High Risk',
      value: stats?.high_risk ?? 0,
      icon: <AlertTriangle size={16} color="var(--risk-high)" />,
      color: 'var(--risk-high)',
      bg: 'rgba(255,61,90,0.06)',
    },
    {
      label: 'Medium Risk',
      value: stats?.medium_risk ?? 0,
      icon: <TrendingUp size={16} color="var(--risk-medium)" />,
      color: 'var(--risk-medium)',
      bg: 'rgba(255,184,0,0.06)',
    },
    {
      label: 'Low Risk',
      value: stats?.low_risk ?? 0,
      icon: <Shield size={16} color="var(--risk-low)" />,
      color: 'var(--risk-low)',
      bg: 'rgba(0,255,169,0.06)',
    },
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 12,
    }}>
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1, duration: 0.4 }}
          className="glass-card"
          style={{
            padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 14,
          }}
        >
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: card.bg,
            border: `1px solid ${card.color}20`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {card.icon}
          </div>
          <div>
            <motion.p
              key={card.value}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              style={{
                fontSize: '1.3rem', fontWeight: 800,
                fontFamily: 'var(--font-mono)',
                color: card.color, lineHeight: 1,
              }}
            >
              {card.value}
            </motion.p>
            <p style={{
              fontSize: '0.6rem', color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.08em',
              marginTop: 2,
            }}>
              {card.label}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
