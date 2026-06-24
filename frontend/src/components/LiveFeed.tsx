import { motion } from 'framer-motion';
import { Video, PenTool, Save, Trash2, Check } from 'lucide-react';
import { API } from '../api';
import { useState, useRef, useEffect } from 'react';

export default function LiveFeed() {
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [currentPolygon, setCurrentPolygon] = useState<[number, number][]>([]);
  const [zones, setZones] = useState<[number, number][][]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/zones').then(r => r.json()).then(data => {
      if (data.zones) setZones(data.zones);
    }).catch(console.error);
  }, []);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawingMode || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setCurrentPolygon([...currentPolygon, [x, y]]);
  };

  const finishPolygon = () => {
    if (currentPolygon.length > 2) setZones([...zones, currentPolygon]);
    setCurrentPolygon([]);
    setIsDrawingMode(false);
  };

  const clearAllZones = async () => {
    setZones([]); setCurrentPolygon([]);
    try {
      await fetch('/api/zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zones: [] }),
      });
    } catch (e) { console.error(e); }
  };

  const saveZones = async () => {
    setSaving(true);
    try {
      await fetch('/api/zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zones }),
      });
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const toSvgPoints = (zone: [number, number][]) =>
    zone.map(([x, y]) => `${x * 100},${y * 100}`).join(' ');

  return (
    <div className="glass-card" style={{
      padding: 0, overflow: 'hidden',
      position: 'relative', display: 'flex', flexDirection: 'column',
      border: '1px solid rgba(0,212,255,0.12)',
      boxShadow: '0 0 40px rgba(0,212,255,0.06), 0 8px 32px rgba(0,0,0,0.5)',
    }}>
      {/* ── Header bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '9px 14px',
        borderBottom: '1px solid rgba(0,212,255,0.08)',
        background: 'rgba(0,5,15,0.6)',
        flexShrink: 0,
      }}>
        {/* Left: title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Video size={12} color="var(--accent-cyan)" />
          <span style={{
            fontSize: '0.62rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.14em',
            color: 'var(--text-muted)',
          }}>
            Live Camera Feed
          </span>
          {/* CAM-01 chip */}
          <span style={{
            fontSize: '0.5rem', padding: '1px 6px', borderRadius: 3,
            background: 'rgba(0,212,255,0.08)',
            border: '1px solid rgba(0,212,255,0.2)',
            color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)',
            fontWeight: 600, letterSpacing: '0.06em',
          }}>
            CAM-01
          </span>
        </div>

        {/* Right: zone controls + REC */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isDrawingMode ? (
            <>
              <button onClick={() => setCurrentPolygon([])} style={{
                background: 'transparent', border: '1px solid rgba(239,68,68,0.4)',
                color: 'var(--risk-high)', borderRadius: 5,
                padding: '3px 8px', fontSize: '0.58rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 3,
              }}>
                <Trash2 size={9} /> Clear
              </button>
              <button onClick={finishPolygon} style={{
                background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.3)',
                color: 'var(--accent-cyan)', borderRadius: 5,
                padding: '3px 8px', fontSize: '0.58rem', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 3,
              }}>
                <Check size={9} /> Finish Zone
              </button>
            </>
          ) : (
            <>
              {zones.length > 0 && (
                <>
                  <button onClick={clearAllZones} style={{
                    background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                    color: 'var(--text-muted)', borderRadius: 5,
                    padding: '3px 8px', fontSize: '0.58rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 3,
                  }}>
                    <Trash2 size={9} /> Clear All
                  </button>
                  <button onClick={saveZones} disabled={saving} style={{
                    background: 'rgba(0,255,169,0.08)', border: '1px solid rgba(0,255,169,0.3)',
                    color: 'var(--risk-low)', borderRadius: 5,
                    padding: '3px 8px', fontSize: '0.58rem', fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 3,
                  }}>
                    <Save size={9} /> {saving ? 'Saving…' : 'Deploy Zones'}
                  </button>
                </>
              )}
              <button onClick={() => setIsDrawingMode(true)} style={{
                background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)',
                color: 'var(--accent-purple)', borderRadius: 5,
                padding: '3px 8px', fontSize: '0.58rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 3,
              }}>
                <PenTool size={9} /> Draw Zone
              </button>
            </>
          )}

          <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.08)' }} />

          {/* REC indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <motion.div
              animate={{ opacity: [1, 0.05, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              style={{
                width: 7, height: 7, borderRadius: '50%',
                background: '#ef4444',
                boxShadow: '0 0 8px rgba(239,68,68,0.8)',
              }}
            />
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
              color: 'var(--risk-high)', fontWeight: 700, letterSpacing: '0.08em',
            }}>
              REC
            </span>
          </div>
        </div>
      </div>

      {/* ── Video container ── */}
      <div
        ref={containerRef}
        onClick={handleCanvasClick}
        style={{
          position: 'relative',
          aspectRatio: '4/3',
          background: '#000',
          cursor: isDrawingMode ? 'crosshair' : 'default',
          overflow: 'hidden',
        }}
      >
        {/* MJPEG feed */}
        <img
          id="live-feed"
          src={API.stream}
          alt="Live camera feed with YOLO detections"
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />

        {/* Zone SVG overlay */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          {zones.map((zone, i) => (
            <polygon key={i} points={toSvgPoints(zone)}
              fill="rgba(239,68,68,0.12)" stroke="rgba(239,68,68,0.7)"
              strokeWidth="0.35" strokeDasharray="1.5 1" />
          ))}
          {currentPolygon.length > 0 && (
            <polyline points={toSvgPoints(currentPolygon)}
              fill="none" stroke="rgba(0,212,255,0.8)" strokeWidth="0.35" />
          )}
          {currentPolygon.map((p, i) => (
            <circle key={i} cx={p[0] * 100} cy={p[1] * 100} r="0.9" fill="#00d4ff" />
          ))}
        </svg>

        {/* Zone drawing instructions */}
        {isDrawingMode && (
          <div style={{
            position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.75)', padding: '5px 14px', borderRadius: 20,
            fontSize: '0.65rem', color: '#fff',
            border: '1px solid rgba(0,212,255,0.3)',
            backdropFilter: 'blur(8px)',
          }}>
            Click to draw a restricted zone — min. 3 points
          </div>
        )}

        {/* Animated scanline */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          <motion.div
            animate={{ y: ['-100%', '350%'] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute', left: 0, right: 0, height: '25%',
              background: 'linear-gradient(180deg, transparent 0%, rgba(0,212,255,0.035) 50%, transparent 100%)',
            }}
          />
        </div>

        {/* Fine horizontal scanlines (static CRT effect) */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)',
        }} />

        {/* Corner targeting reticles */}
        <div className="reticle-tl" />
        <div className="reticle-tr" />
        <div className="reticle-bl" />
        <div className="reticle-br" />

        {/* Top-right overlay: coordinates watermark */}
        <div style={{
          position: 'absolute', top: 10, right: 36,
          fontFamily: 'var(--font-mono)', fontSize: '0.55rem',
          color: 'rgba(0,212,255,0.4)', letterSpacing: '0.06em',
          pointerEvents: 'none',
        }}>
          28.6139°N 77.2090°E
        </div>

        {/* Bottom-left: status watermark */}
        <div style={{
          position: 'absolute', bottom: 10, left: 14,
          fontFamily: 'var(--font-mono)', fontSize: '0.52rem',
          color: 'rgba(0,212,255,0.35)', letterSpacing: '0.05em',
          pointerEvents: 'none',
        }}>
          BRAHMOS // AI-VISION // SECURE-FEED
        </div>
      </div>
    </div>
  );
}
