import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import Header from './components/Header';
import LiveFeed from './components/LiveFeed';
import RiskMeter from './components/RiskMeter';
import DetectionPanel from './components/DetectionPanel';
import AlertsPanel from './components/AlertsPanel';
import type { AlertItem } from './components/AlertsPanel';
import AIChatPanel from './components/AIChatPanel';
import EventMemory from './components/EventMemory';
import StatsBar from './components/StatsBar';
import ReportGenerator from './components/ReportGenerator';
import IncidentInvestigator from './components/IncidentInvestigator';
import SecurityScore from './components/SecurityScore';
import PersonsManager from './components/PersonsManager';
import { useDetections, useStats, useEvents } from './hooks';
import { MessageSquare, Search, Medal, Users, Brain, BarChart3 } from 'lucide-react';

type TabKey = 'chat' | 'incidents' | 'score' | 'persons' | 'memory' | 'report';

const TABS: { key: TabKey; label: string; Icon: React.FC<{ size?: number }> }[] = [
  { key: 'chat',      label: 'Chat',     Icon: MessageSquare },
  { key: 'incidents', label: 'Cases',    Icon: Search },
  { key: 'score',     label: 'Score',    Icon: Medal },
  { key: 'persons',   label: 'Persons',  Icon: Users },
  { key: 'memory',    label: 'Memory',   Icon: Brain },
  { key: 'report',    label: 'Stats',    Icon: BarChart3 },
];

function App() {
  const { analysis, connected } = useDetections();
  const stats = useStats(5000);
  const { events, loading: eventsLoading } = useEvents(30);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('chat');

  const addAlert = useCallback((a: typeof analysis) => {
    if (!a || a.risk_level === 'LOW') return;
    const alert: AlertItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      time: a.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      level: a.risk_level,
      message: a.scene_description || 'Activity detected',
      action: a.suggested_action || 'Continue monitoring',
    };
    setAlerts((prev) => [alert, ...prev].slice(0, 50));
  }, []);

  useEffect(() => {
    addAlert(analysis);
  }, [analysis, addAlert]);

  const riskLevel = analysis?.risk_level ?? 'LOW';
  const riskScore = analysis?.risk_score ?? 0;
  const fps = analysis?.fps ?? 0;

  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (riskLevel === 'HIGH') {
      document.body.classList.add('lockdown-mode');
      audioRef.current?.play().catch(() => {});
    } else {
      document.body.classList.remove('lockdown-mode');
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  }, [riskLevel]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)', backgroundAttachment: 'fixed' }}>
      <audio ref={audioRef} loop src="data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq" />
      <Header connected={connected} fps={fps} />

      <main style={{
        flex: 1, padding: '14px 18px 18px',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <StatsBar stats={stats} />

        {/* ── Main two-column grid ─────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 370px',
          gap: 14,
          flex: 1,
          minHeight: 0,
        }}>

          {/* ── LEFT COLUMN ─────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>

            {/* Row 1: Live feed + Risk meter */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 190px',
              gap: 14,
            }}>
              <LiveFeed />
              <RiskMeter
                level={riskLevel}
                score={riskScore}
                agentMode={analysis?.agent_mode}
              />
            </div>

            {/* Row 2: Detection + Alerts */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 14,
            }}>
              <DetectionPanel
                detections={analysis?.detections ?? []}
                sceneDescription={analysis?.scene_description ?? ''}
              />
              <AlertsPanel analysis={analysis} alerts={alerts} />
            </div>

            {/* Row 3: Report Generator — full width */}
            <div className="glass-card" style={{ padding: 16 }}>
              <ReportGenerator />
            </div>
          </div>

          {/* ── RIGHT COLUMN — 6-tab panel ──────────────────────── */}
          <div style={{
            display: 'flex', flexDirection: 'column',
            background: 'rgba(4, 10, 28, 0.72)',
            border: '1px solid rgba(0,212,255,0.1)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            minHeight: 0,
            backdropFilter: 'blur(20px)',
            boxShadow: '0 0 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)',
          }}>

            {/* Tab bar */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              borderBottom: '1px solid rgba(0,212,255,0.08)',
              flexShrink: 0,
              background: 'rgba(0,5,18,0.5)',
            }}>
              {TABS.map(({ key, label, Icon }) => {
                const active = activeTab === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`tab-btn${active ? ' active' : ''}`}
                  >
                    <Icon size={14} />
                    <span style={{ fontSize: '0.52rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Tab content area */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

              {activeTab === 'chat' && <AIChatPanel />}

              {activeTab === 'incidents' && (
                <div style={{ flex: 1, overflow: 'auto' }}>
                  <IncidentInvestigator />
                </div>
              )}

              {activeTab === 'score' && (
                <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
                  <SecurityScore />
                </div>
              )}

              {activeTab === 'persons' && (
                <div style={{ flex: 1, overflow: 'auto' }}>
                  <PersonsManager />
                </div>
              )}

              {activeTab === 'memory' && (
                <div style={{ flex: 1, overflow: 'auto' }}>
                  <EventMemory events={events} loading={eventsLoading} />
                </div>
              )}

              {activeTab === 'report' && (
                <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
                  {/* Header */}
                  <p style={{
                    fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 12px 0',
                  }}>
                    Today's Statistics
                  </p>

                  {stats ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {/* Big total number */}
                      <div style={{ textAlign: 'center', padding: '16px 0' }}>
                        <p style={{
                          fontSize: '3.5rem', fontWeight: 900,
                          fontFamily: 'var(--font-mono)',
                          background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-green))',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          lineHeight: 1, margin: 0,
                        }}>
                          {stats.total_today}
                        </p>
                        <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: 4 }}>
                          Total Events Today
                        </p>
                      </div>

                      {/* Risk breakdown bars */}
                      {[
                        { label: 'High Risk', value: stats.high_risk, color: 'var(--risk-high)' },
                        { label: 'Medium Risk', value: stats.medium_risk, color: 'var(--risk-medium)' },
                        { label: 'Low Risk', value: stats.low_risk, color: 'var(--risk-low)' },
                      ].map((bar) => (
                        <div key={bar.label}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: 4 }}>
                            <span style={{ color: 'var(--text-secondary)' }}>{bar.label}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', color: bar.color, fontWeight: 600 }}>{bar.value}</span>
                          </div>
                          <div style={{ width: '100%', height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${((bar.value / (stats.total_today || 1)) * 100).toFixed(1)}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                              style={{ height: '100%', borderRadius: 3, background: bar.color, boxShadow: `0 0 8px ${bar.color}40` }}
                            />
                          </div>
                        </div>
                      ))}

                      {/* Security score below bars */}
                      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16, marginTop: 4 }}>
                        <SecurityScore />
                      </div>
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Loading statistics…</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          style={{
            textAlign: 'center', padding: '10px 0',
            fontSize: '0.54rem', color: 'var(--text-muted)',
            borderTop: '1px solid rgba(0,212,255,0.07)',
            letterSpacing: '0.1em',
            fontFamily: 'var(--font-mono)',
          }}
        >
          BRAHMOS-VISIONAI v1.0 &nbsp;·&nbsp; DETECT &nbsp;·&nbsp; UNDERSTAND &nbsp;·&nbsp; THINK &nbsp;·&nbsp; DECIDE &nbsp;·&nbsp; ACT
        </motion.footer>
      </main>
    </div>
  );
}

export default App;
