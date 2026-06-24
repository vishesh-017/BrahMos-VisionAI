import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, Loader2, CheckCircle, AlertTriangle, RefreshCw, Terminal } from 'lucide-react';
import { API, fetchJSON } from '../api';

interface EventEvidence {
  timestamp: string;
  scene_description: string;
  snapshot_path: string | null;
  risk_level: string;
  risk_score: number;
  ai_reasoning: string;
  person_count: number;
  object_summary: string;
}

interface ReportData {
  title: string;
  generated_at: string;
  summary: {
    total_events: number;
    high_risk: number;
    medium_risk: number;
    low_risk: number;
  };
  high_risk_events: EventEvidence[];
  medium_risk_events: EventEvidence[];
  observations: string[];
  recommendations: string[];
}

export default function ReportGenerator() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setGenerated(false);
    setReport(null);
    setDownloadError(null);
    try {
      const data = await fetchJSON<ReportData>(API.report, { method: 'POST' });
      setReport(data);
      setGenerated(true);
    } catch {
      setDownloadError('UPLINK FAILED. UNABLE TO COMPILE REPORT.');
    }
    setLoading(false);
  };

  return (
    <div className="glass-card" style={{ padding: '16px 20px', minHeight: 400, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10 }}>
        <div className="section-title" style={{ margin: 0 }}>
          <Terminal size={15} color="var(--accent-cyan)" />
          FORENSIC REPORT GENERATOR
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {generated && (
            <motion.button
              onClick={generate}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Regenerate"
              style={{
                padding: '6px 10px', borderRadius: 4,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)', cursor: 'pointer',
                display: 'flex', alignItems: 'center',
              }}
            >
              <RefreshCw size={14} />
            </motion.button>
          )}
          <motion.button
            onClick={generate}
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              padding: '8px 16px', borderRadius: 4,
              background: loading ? 'rgba(0,212,255,0.05)' : 'rgba(0,212,255,0.15)',
              border: '1px solid var(--accent-cyan)',
              color: 'var(--accent-cyan)', fontSize: '0.7rem', fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase', letterSpacing: '0.1em',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: loading ? 'none' : '0 0 10px rgba(0,212,255,0.15)',
              transition: 'all 0.2s'
            }}
          >
            {loading ? (
              <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> PROCESSING…</>
            ) : generated ? (
              <><CheckCircle size={14} /> COMPILE NEW</>
            ) : (
              <><FileText size={14} /> COMPILE REPORT</>
            )}
          </motion.button>
        </div>
      </div>

      {downloadError && (
        <div style={{
          padding: '10px 14px', borderRadius: 4,
          background: 'rgba(239,68,68,0.1)', border: '1px solid var(--accent-red)',
          color: 'var(--accent-red)', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em'
        }}>
          {downloadError}
        </div>
      )}

      {!report && !loading && !downloadError && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          <FileText size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>AWAITING COMPILATION COMMAND</p>
        </div>
      )}

      {loading && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-cyan)' }}>
          <Loader2 size={32} style={{ opacity: 0.8, marginBottom: 16, animation: 'spin 2s linear infinite' }} />
          <p style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>AGGREGATING SECURE LOGS...</p>
        </div>
      )}

      <AnimatePresence>
        {report && !loading && (
          <motion.div
            key="report"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, overflowY: 'auto', paddingRight: 4 }}
          >
            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {[
                { label: 'TOTAL', value: report.summary.total_events, color: 'var(--text-primary)', bg: 'rgba(255,255,255,0.05)', border: 'var(--border-subtle)' },
                { label: 'CRITICAL', value: report.summary.high_risk, color: 'var(--accent-red)', bg: 'rgba(239,68,68,0.05)', border: 'rgba(239,68,68,0.3)' },
                { label: 'WARNING', value: report.summary.medium_risk, color: 'var(--accent-amber)', bg: 'rgba(245,158,11,0.05)', border: 'rgba(245,158,11,0.3)' },
                { label: 'NOMINAL', value: report.summary.low_risk, color: 'var(--accent-green)', bg: 'rgba(34,197,94,0.05)', border: 'rgba(34,197,94,0.3)' },
              ].map((s) => (
                <div key={s.label} className="kpi-card" style={{
                  padding: '12px 10px', borderRadius: 4,
                  background: s.bg, textAlign: 'center',
                  border: `1px solid ${s.border}`,
                }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, fontFamily: 'var(--font-mono)' }}>{s.value}</div>
                  <div style={{ fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: s.color, opacity: 0.8, marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Observations & Recommendations */}
            {(report.observations.length > 0 || report.recommendations.length > 0) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {report.observations.length > 0 && (
                  <div style={{
                    padding: '14px 16px', borderRadius: 4,
                    background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderLeft: '3px solid var(--accent-amber)'
                  }}>
                    <p style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px 0' }}>// SYSTEM OBSERVATIONS</p>
                    {report.observations.slice(0, 3).map((o, i) => (
                      <p key={i} style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '0 0 6px 0', lineHeight: 1.5 }}>
                        <span style={{ color: 'var(--accent-amber)', marginRight: 6 }}>&gt;</span>{o}
                      </p>
                    ))}
                  </div>
                )}
                {report.recommendations.length > 0 && (
                  <div style={{
                    padding: '14px 16px', borderRadius: 4,
                    background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.2)', borderLeft: '3px solid var(--accent-cyan)'
                  }}>
                    <p style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px 0' }}>// ACTION PROTOCOLS</p>
                    {report.recommendations.slice(0, 3).map((r, i) => (
                      <p key={i} style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '0 0 6px 0', lineHeight: 1.5 }}>
                        <span style={{ color: 'var(--accent-cyan)', marginRight: 6 }}>&gt;</span>{r}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* High risk events preview */}
            {report.high_risk_events.length > 0 && (
              <div style={{
                padding: '14px 16px', borderRadius: 4,
                background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderLeft: '3px solid var(--accent-red)'
              }}>
                <p style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-red)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={12} /> CRITICAL EVIDENCE LOG ({report.high_risk_events.length})
                </p>
                {report.high_risk_events.slice(0, 2).map((e, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8, background: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 4 }}>
                    <span style={{ fontSize: '0.6rem', color: 'var(--accent-red)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', marginTop: 2, padding: '2px 4px', background: 'rgba(239,68,68,0.1)', borderRadius: 2 }}>
                      [{new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#fff', lineHeight: 1.4 }}>{e.scene_description}</span>
                  </div>
                ))}
                {report.high_risk_events.length > 2 && (
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', margin: '4px 0 0 0', fontFamily: 'var(--font-mono)' }}>+ {report.high_risk_events.length - 2} ADDITIONAL RECORDS IN EXPORT</p>
                )}
              </div>
            )}

            <div style={{ flex: 1 }} />

            {/* Download button */}
            <motion.a
              href={API.reportPdf}
              target="_blank"
              download={`BrahMos_Forensic_Report_${new Date().toISOString().slice(0, 10)}.pdf`}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              style={{
                width: '100%', padding: '14px 16px', borderRadius: 4,
                background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(168,85,247,0.1))',
                border: '1px solid var(--accent-purple)',
                color: 'var(--accent-purple)',
                fontSize: '0.8rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em',
                cursor: 'pointer', textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                transition: 'all 0.2s', textDecoration: 'none', boxSizing: 'border-box',
                boxShadow: '0 0 15px rgba(168,85,247,0.15)'
              }}
            >
              <Download size={16} /> EXPORT SECURE PDF DOSSIER
            </motion.a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
