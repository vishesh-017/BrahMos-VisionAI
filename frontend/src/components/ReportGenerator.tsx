import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, Loader2, CheckCircle, AlertTriangle, ShieldAlert, RefreshCw } from 'lucide-react';
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
      setDownloadError('Failed to generate report. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, rgba(0,229,255,0.2), rgba(0,255,169,0.2))',
            border: '1px solid rgba(0,229,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <FileText size={14} color="var(--accent-cyan)" />
          </div>
          <div>
            <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Security Report</p>
            <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', margin: 0 }}>AI Forensic Analysis</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {generated && (
            <motion.button
              onClick={generate}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Regenerate"
              style={{
                padding: '6px 8px', borderRadius: 8,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)', cursor: 'pointer',
                display: 'flex', alignItems: 'center',
              }}
            >
              <RefreshCw size={13} />
            </motion.button>
          )}
          <motion.button
            onClick={generate}
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              padding: '6px 14px', borderRadius: 8,
              background: loading ? 'rgba(0,229,255,0.05)' : 'linear-gradient(135deg, rgba(0,229,255,0.15), rgba(0,255,169,0.1))',
              border: '1px solid rgba(0,229,255,0.3)',
              color: 'var(--accent-cyan)', fontSize: '0.72rem', fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: 'var(--font-sans)',
            }}
          >
            {loading ? (
              <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing…</>
            ) : generated ? (
              <><CheckCircle size={13} /> Regenerate</>
            ) : (
              <><FileText size={13} /> Generate</>
            )}
          </motion.button>
        </div>
      </div>

      {downloadError && (
        <div style={{
          padding: '8px 12px', borderRadius: 8,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          color: '#ef4444', fontSize: '0.72rem',
        }}>
          {downloadError}
        </div>
      )}

      <AnimatePresence>
        {report && (
          <motion.div
            key="report"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {[
                { label: 'Total', value: report.summary.total_events, color: 'var(--text-primary)', bg: 'rgba(255,255,255,0.05)' },
                { label: 'High', value: report.summary.high_risk, color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
                { label: 'Medium', value: report.summary.medium_risk, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
                { label: 'Low', value: report.summary.low_risk, color: '#22c55e', bg: 'rgba(34,197,94,0.08)' },
              ].map((s) => (
                <div key={s.label} style={{
                  padding: '10px 8px', borderRadius: 8,
                  background: s.bg, textAlign: 'center',
                  border: `1px solid ${s.color}20`,
                }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: s.color, fontFamily: 'var(--font-mono)' }}>{s.value}</div>
                  <div style={{ fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: s.color, opacity: 0.8, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Observations & Recommendations */}
            {(report.observations.length > 0 || report.recommendations.length > 0) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {report.observations.length > 0 && (
                  <div style={{
                    padding: '10px 12px', borderRadius: 8,
                    background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)',
                  }}>
                    <p style={{ fontSize: '0.65rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px 0' }}>Observations</p>
                    {report.observations.slice(0, 3).map((o, i) => (
                      <p key={i} style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', margin: '0 0 3px 0', lineHeight: 1.4 }}>• {o}</p>
                    ))}
                  </div>
                )}
                {report.recommendations.length > 0 && (
                  <div style={{
                    padding: '10px 12px', borderRadius: 8,
                    background: 'rgba(0,255,169,0.06)', border: '1px solid rgba(0,255,169,0.15)',
                  }}>
                    <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--accent-green)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px 0' }}>Actions</p>
                    {report.recommendations.slice(0, 3).map((r, i) => (
                      <p key={i} style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', margin: '0 0 3px 0', lineHeight: 1.4 }}>• {r}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* High risk events preview */}
            {report.high_risk_events.length > 0 && (
              <div style={{
                padding: '10px 12px', borderRadius: 8,
                background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)',
              }}>
                <p style={{ fontSize: '0.65rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <AlertTriangle size={11} /> Critical Events ({report.high_risk_events.length})
                </p>
                {report.high_risk_events.slice(0, 2).map((e, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: '0.6rem', color: '#ef4444', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', marginTop: 1 }}>
                      {new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{e.scene_description}</span>
                  </div>
                ))}
                {report.high_risk_events.length > 2 && (
                  <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', margin: 0 }}>+{report.high_risk_events.length - 2} more in PDF report</p>
                )}
              </div>
            )}

            {/* Download button */}
            <motion.a
              href={API.reportPdf}
              target="_blank"
              download={`BrahMos_Forensic_Report_${new Date().toISOString().slice(0, 10)}.pdf`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                width: '100%', padding: '10px 16px', borderRadius: 8,
                background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(168,85,247,0.08))',
                border: '1px solid rgba(168,85,247,0.3)',
                color: 'var(--accent-purple)',
                fontSize: '0.75rem', fontWeight: 700,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontFamily: 'var(--font-sans)',
                transition: 'all 0.2s',
                textDecoration: 'none',
                boxSizing: 'border-box'
              }}
            >
              <Download size={14} /> Download Full PDF Report
            </motion.a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden full-detail element that gets rendered to PDF */}
      {report && (
        <div
          id="report-content-pdf"
          style={{
            position: 'fixed', top: '-9999px', left: '-9999px',
            width: 794, background: '#ffffff', color: '#111827',
            fontFamily: 'Arial, sans-serif', fontSize: '12px', padding: 40,
            lineHeight: 1.6,
          }}
        >
          {/* PDF Header */}
          <div style={{ borderBottom: '3px solid #0ea5e9', paddingBottom: 16, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 40, height: 40, background: '#0ea5e9', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldAlert size={22} color="#fff" />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '20px', color: '#0f172a', fontWeight: 800 }}>{report.title}</h1>
                <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>BrahMos VisionAI — Agentic AI Surveillance System</p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
              <span>Generated: {new Date(report.generated_at).toLocaleString()}</span>
              <span>CONFIDENTIAL — Security Report</span>
            </div>
          </div>

          {/* Summary */}
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: '14px', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: 6, marginBottom: 14 }}>Executive Summary</h2>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'TOTAL EVENTS', value: report.summary.total_events, color: '#0f172a', border: '#94a3b8', bg: '#f8fafc' },
                { label: 'HIGH RISK', value: report.summary.high_risk, color: '#dc2626', border: '#fca5a5', bg: '#fef2f2' },
                { label: 'MEDIUM RISK', value: report.summary.medium_risk, color: '#d97706', border: '#fcd34d', bg: '#fffbeb' },
                { label: 'LOW RISK', value: report.summary.low_risk, color: '#16a34a', border: '#86efac', bg: '#f0fdf4' },
              ].map((s) => (
                <div key={s.label} style={{
                  flex: 1, textAlign: 'center', padding: '14px 10px',
                  background: s.bg, border: `2px solid ${s.border}`,
                  borderRadius: 8,
                }}>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '10px', color: s.color, fontWeight: 600 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 20 }}>
              {report.observations.length > 0 && (
                <div style={{ flex: 1, background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 6, padding: '12px 14px' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#92400e' }}>Key Observations</h3>
                  {report.observations.map((o, i) => <p key={i} style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#422006' }}>• {o}</p>)}
                </div>
              )}
              {report.recommendations.length > 0 && (
                <div style={{ flex: 1, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6, padding: '12px 14px' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#14532d' }}>Recommendations</h3>
                  {report.recommendations.map((r, i) => <p key={i} style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#052e16' }}>• {r}</p>)}
                </div>
              )}
            </div>
          </div>

          {/* High Risk Events */}
          {report.high_risk_events.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: '14px', color: '#dc2626', borderBottom: '2px solid #fca5a5', paddingBottom: 6, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                ⚠ Critical Evidence Log — High Risk Events
              </h2>
              {report.high_risk_events.map((e, i) => (
                <div key={i} style={{ marginBottom: 16, padding: 14, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', fontFamily: 'monospace' }}>{new Date(e.timestamp).toLocaleString()}</span>
                    <span style={{ background: '#dc2626', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: '10px', fontWeight: 700 }}>RISK SCORE: {e.risk_score}</span>
                  </div>
                  <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>{e.scene_description}</p>
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 4, padding: '8px 10px', marginBottom: 8 }}>
                    <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: 600 }}>AI Reasoning: </span>
                    <span style={{ fontSize: '11px', color: '#374151' }}>{e.ai_reasoning}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#6b7280', fontFamily: 'monospace' }}>Persons: {e.person_count} | Objects: {e.object_summary || 'none'}</div>
                </div>
              ))}
            </div>
          )}

          {/* Medium Risk Events table */}
          {report.medium_risk_events.length > 0 && (
            <div>
              <h2 style={{ fontSize: '14px', color: '#d97706', borderBottom: '1px solid #fcd34d', paddingBottom: 6, marginBottom: 12 }}>
                Medium Risk Events Summary
              </h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ background: '#fffbeb' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left', border: '1px solid #e2e8f0', color: '#92400e' }}>Time</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', border: '1px solid #e2e8f0', color: '#92400e' }}>Description</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', border: '1px solid #e2e8f0', color: '#92400e' }}>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {report.medium_risk_events.map((e, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fffbeb' }}>
                      <td style={{ padding: '7px 10px', border: '1px solid #e2e8f0', fontFamily: 'monospace', color: '#374151' }}>{new Date(e.timestamp).toLocaleTimeString()}</td>
                      <td style={{ padding: '7px 10px', border: '1px solid #e2e8f0', color: '#374151' }}>{e.scene_description}</td>
                      <td style={{ padding: '7px 10px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#d97706', fontWeight: 700 }}>{e.risk_score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop: 32, paddingTop: 12, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8' }}>
            <span>BrahMos VisionAI v1.0 — Detect • Understand • Think • Decide • Act</span>
            <span>CONFIDENTIAL</span>
          </div>
        </div>
      )}
    </div>
  );
}
