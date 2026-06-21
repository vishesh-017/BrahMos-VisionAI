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

  // Load existing zones
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
    if (currentPolygon.length > 2) {
      setZones([...zones, currentPolygon]);
    }
    setCurrentPolygon([]);
    setIsDrawingMode(false);
  };

  const clearAllZones = async () => {
    setZones([]);
    setCurrentPolygon([]);
    // Also clear on backend so detection stops
    try {
      await fetch('/api/zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zones: [] })
      });
    } catch (e) {
      console.error("Failed to clear zones on backend", e);
    }
  };

  const saveZones = async () => {
    setSaving(true);
    try {
      await fetch('/api/zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zones })
      });
    } catch (e) {
      console.error("Failed to save zones", e);
    }
    setSaving(false);
  };

  // Convert normalized coords to SVG pixel coords
  const toSvgPoints = (zone: [number, number][]) => {
    return zone.map(([x, y]) => `${x * 100},${y * 100}`).join(' ');
  };

  return (
    <div className="glass-card" style={{ padding: 0, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      {/* Header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(5, 8, 15, 0.5)',
      }}>
        <div className="section-title" style={{ margin: 0 }}>
          <Video size={13} />
          Live Camera Feed
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Smart Zone Controls */}
          {isDrawingMode ? (
            <>
              <button onClick={() => setCurrentPolygon([])} style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', borderRadius: 6, padding: '4px 8px', fontSize: '0.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Trash2 size={10} /> Clear
              </button>
              <button onClick={finishPolygon} style={{ background: 'var(--accent-cyan)', border: 'none', color: '#000', borderRadius: 6, padding: '4px 8px', fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Check size={10} /> Finish Zone
              </button>
            </>
          ) : (
            <>
              {zones.length > 0 && (
                <>
                  <button onClick={clearAllZones} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--text-muted)', borderRadius: 6, padding: '4px 8px', fontSize: '0.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Trash2 size={10} /> Clear All
                  </button>
                  <button onClick={saveZones} disabled={saving} style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)', color: '#22c55e', borderRadius: 6, padding: '4px 8px', fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Save size={10} /> {saving ? 'Saving...' : 'Deploy Zones'}
                  </button>
                </>
              )}
              <button onClick={() => setIsDrawingMode(true)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: 6, padding: '4px 8px', fontSize: '0.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <PenTool size={10} /> Draw Zone
              </button>
            </>
          )}

          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#ff3d5a',
            }}
          />
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
            color: 'var(--risk-high)', fontWeight: 600,
          }}>
            REC
          </span>
        </div>
      </div>

      {/* Video stream container */}
      <div 
        ref={containerRef}
        onClick={handleCanvasClick}
        style={{ position: 'relative', aspectRatio: '4/3', background: '#000', cursor: isDrawingMode ? 'crosshair' : 'default' }}
      >
        <img
          id="live-feed"
          src={API.stream}
          alt="Live camera feed with YOLO detections"
          style={{
            width: '100%', height: '100%',
            objectFit: 'contain',
            display: 'block',
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />

        {/* Drawn Zones Overlay — uses viewBox for correct percentage coords */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          {zones.map((zone, i) => (
            <polygon 
              key={i}
              points={toSvgPoints(zone)}
              fill="rgba(239, 68, 68, 0.15)"
              stroke="rgba(239, 68, 68, 0.8)"
              strokeWidth="0.4"
              strokeDasharray="1 1"
            />
          ))}
          
          {/* Current drawing polygon */}
          {currentPolygon.length > 0 && (
            <polyline 
              points={toSvgPoints(currentPolygon)}
              fill="none"
              stroke="rgba(0, 229, 255, 0.8)"
              strokeWidth="0.4"
            />
          )}
          {currentPolygon.map((p, i) => (
            <circle key={i} cx={p[0] * 100} cy={p[1] * 100} r="0.8" fill="#00e5ff" />
          ))}
        </svg>

        {/* Instructions Overlay */}
        {isDrawingMode && (
          <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.7)', padding: '6px 12px', borderRadius: 20, fontSize: '0.7rem', color: '#fff', border: '1px solid rgba(0,229,255,0.3)' }}>
            Click on the video to draw a restricted zone. Add at least 3 points.
          </div>
        )}

        {/* Scanline overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          overflow: 'hidden', pointerEvents: 'none',
        }}>
          <motion.div
            animate={{ y: ['-100%', '100%'] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute', left: 0, right: 0,
              height: '30%',
              background: 'linear-gradient(180deg, transparent, rgba(0,229,255,0.04), transparent)',
            }}
          />
        </div>

        {/* Corner brackets */}
        {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((pos) => {
          const isTop = pos.includes('top');
          const isLeft = pos.includes('left');
          return (
            <div
              key={pos}
              style={{
                position: 'absolute',
                [isTop ? 'top' : 'bottom']: 8,
                [isLeft ? 'left' : 'right']: 8,
                width: 20, height: 20,
                borderColor: 'var(--accent-cyan)',
                borderStyle: 'solid',
                borderWidth: 0,
                [isTop ? 'borderTopWidth' : 'borderBottomWidth']: '2px',
                [isLeft ? 'borderLeftWidth' : 'borderRightWidth']: '2px',
                opacity: 0.6,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
