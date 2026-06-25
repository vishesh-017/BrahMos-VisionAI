import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, Wifi, WifiOff, Cpu, Camera, CameraOff, Activity, Zap, Settings, Video
} from 'lucide-react';
import { API, fetchJSON } from '../api';

interface HeaderProps {
  connected: boolean;
  fps: number;
  frameCount?: number;
  onOpenSettings: () => void;
  onOpenCameras: () => void;
}

function useDigitalClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
}

export default function Header({ 
  connected, 
  fps, 
  onOpenSettings, 
  onOpenCameras,
  cameraActive,
  toggleCamera 
}: HeaderProps & { cameraActive: boolean; toggleCamera: () => void }) {
  const clock = useDigitalClock();

  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        height: 58,
        background: 'rgba(2, 8, 18, 0.92)',
        borderBottom: '1px solid rgba(0, 212, 255, 0.1)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        boxShadow: '0 1px 0 rgba(0,212,255,0.06), 0 4px 24px rgba(0,0,0,0.6)',
      }}
    >
      {/* ── LEFT: Brand ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Logo glow ring */}
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(168,85,247,0.15))',
          border: '1px solid rgba(0,212,255,0.2)',
          boxShadow: '0 0 18px rgba(0,212,255,0.2)',
        }}>
          <img src="/logo.png" alt="BrahMos Logo"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).parentElement!.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" stroke-width="1.5" width="20" height="20"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
            }}
          />
        </div>

        <div>
          <h1 style={{
            fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.02em',
            background: 'linear-gradient(135deg, #00d4ff 0%, #a855f7 60%, #00ffa9 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            lineHeight: 1.2,
          }}>
            BrahMos VisionAI
          </h1>
          <p style={{
            fontSize: '0.52rem', color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 600,
          }}>
            Agentic AI Surveillance System
          </p>
        </div>

        {/* Vertical divider */}
        <div style={{ width: 1, height: 28, background: 'rgba(0,212,255,0.12)', margin: '0 4px' }} />

        {/* System Online pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '4px 12px', borderRadius: 999,
          background: 'rgba(0,255,169,0.06)',
          border: '1px solid rgba(0,255,169,0.18)',
        }}>
          <motion.div
            animate={{ scale: [1, 1.6, 1], opacity: [1, 0.35, 1] }}
            transition={{ duration: 1.6, repeat: Infinity }}
            style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--risk-low)', boxShadow: '0 0 8px var(--risk-low)' }}
          />
          <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--risk-low)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            System Online
          </span>
        </div>
      </div>

      {/* ── CENTER: Clock ── */}
      <div style={{
        position: 'absolute', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '1.15rem', fontWeight: 700,
          color: 'var(--accent-cyan)', letterSpacing: '0.08em',
          textShadow: '0 0 20px rgba(0,212,255,0.5)',
        }}>
          {clock}
        </span>
        <span style={{ fontSize: '0.48rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          IST — Live
        </span>
      </div>

      {/* ── RIGHT: Controls & Status ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

        {/* FPS counter */}
        <motion.div
          animate={{ opacity: [0.65, 1, 0.65] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          style={{ display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <Cpu size={12} color="var(--accent-cyan)" style={{ opacity: 0.8 }} />
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.7rem',
            color: 'var(--text-secondary)',
          }}>
            {fps.toFixed(1)}<span style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}> fps</span>
          </span>
        </motion.div>

        {/* Activity wave */}
        <Activity size={14} color="var(--accent-purple)" style={{ opacity: 0.7 }} />

        {/* Vertical divider */}
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.06)' }} />

        {/* Camera Manager Button */}
        <button
          onClick={onOpenCameras}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 6,
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            color: '#34d399',
            fontSize: '0.6rem', fontWeight: 700, cursor: 'pointer',
            transition: 'all 0.2s',
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}
        >
          <Video size={12} /> Cameras
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 6,
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            color: '#38bdf8',
            fontSize: '0.6rem', fontWeight: 700, cursor: 'pointer',
            transition: 'all 0.2s',
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}
        >
          <Settings size={12} /> Settings
        </button>

        {/* Camera Toggle */}
        <button
          onClick={toggleCamera}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 6,
            background: cameraActive ? 'rgba(0,212,255,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${cameraActive ? 'rgba(0,212,255,0.25)' : 'rgba(239,68,68,0.25)'}`,
            color: cameraActive ? 'var(--accent-cyan)' : 'var(--risk-high)',
            fontSize: '0.6rem', fontWeight: 700, cursor: 'pointer',
            transition: 'all 0.2s',
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}
        >
          {cameraActive ? <Camera size={12} /> : <CameraOff size={12} />}
          {cameraActive ? 'Cam On' : 'Cam Off'}
        </button>

        {/* Vertical divider */}
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.06)' }} />

        {/* WS Connection pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 12px', borderRadius: 6,
          background: connected ? 'rgba(0,255,169,0.07)' : 'rgba(239,68,68,0.07)',
          border: `1px solid ${connected ? 'rgba(0,255,169,0.2)' : 'rgba(239,68,68,0.2)'}`,
        }}>
          {connected
            ? <Wifi size={12} color="var(--risk-low)" />
            : <WifiOff size={12} color="var(--risk-high)" />}
          <span style={{
            fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em',
            color: connected ? 'var(--risk-low)' : 'var(--risk-high)',
            textTransform: 'uppercase',
          }}>
            {connected ? 'Live' : 'Offline'}
          </span>
          {connected && (
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--risk-low)' }}
            />
          )}
        </div>

        {/* Lightning bolt AI indicator */}
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        >
          <Zap size={16} color="var(--accent-purple)" style={{ filter: 'drop-shadow(0 0 6px rgba(168,85,247,0.7))' }} />
        </motion.div>
      </div>
    </motion.header>
  );
}
