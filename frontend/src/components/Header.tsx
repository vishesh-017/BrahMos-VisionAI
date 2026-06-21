import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, Wifi, WifiOff, Activity, Eye, Cpu, Camera, CameraOff
} from 'lucide-react';
import { API, fetchJSON } from '../api';

interface HeaderProps {
  connected: boolean;
  fps: number;
  frameCount?: number;
}

export default function Header({ connected, fps }: HeaderProps) {
  const [cameraActive, setCameraActive] = useState(true);

  const toggleCamera = async () => {
    try {
      if (cameraActive) {
        await fetchJSON(API.cameraStop, { method: 'POST' });
        setCameraActive(false);
      } else {
        await fetchJSON(API.cameraStart, { method: 'POST' });
        setCameraActive(true);
      }
    } catch (e) {
      console.error("Failed to toggle camera:", e);
    }
  };

  return (
    <motion.header
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 24px',
        background: 'rgba(10, 15, 28, 0.9)',
        borderBottom: '1px solid var(--border-subtle)',
        backdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Logo / Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #00e5ff 0%, #00ffa9 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 20px rgba(0,229,255,0.3)',
        }}>
          <Shield size={22} color="#05080f" strokeWidth={2.5} />
        </div>
        <div>
          <h1 style={{
            fontSize: '1.1rem', fontWeight: 800,
            letterSpacing: '-0.02em',
            background: 'linear-gradient(135deg, #00e5ff, #00ffa9)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            lineHeight: 1.2,
          }}>
            BrahMos VisionAI
          </h1>
          <p style={{
            fontSize: '0.6rem', color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.15em',
            fontWeight: 600,
          }}>
            Agentic AI Surveillance System
          </p>
        </div>
      </div>

      {/* Status indicators */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {/* Camera Toggle */}
        <button
          onClick={toggleCamera}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 999,
            background: cameraActive ? 'rgba(0,229,255,0.1)' : 'rgba(255,61,90,0.1)',
            border: `1px solid ${cameraActive ? 'rgba(0,229,255,0.3)' : 'rgba(255,61,90,0.3)'}`,
            color: cameraActive ? 'var(--accent-cyan)' : 'var(--risk-high)',
            fontSize: '0.65rem', fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {cameraActive ? <Camera size={14} /> : <CameraOff size={14} />}
          {cameraActive ? 'CAMERA ON' : 'CAMERA OFF'}
        </button>

        {/* FPS */}
        <motion.div
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Cpu size={14} color="var(--accent-cyan)" />
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.75rem',
            color: 'var(--text-secondary)',
          }}>
            {fps.toFixed(1)} FPS
          </span>
        </motion.div>

        {/* AI Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Eye size={14} color="var(--accent-green)" />
          <span style={{
            fontSize: '0.7rem', color: 'var(--text-secondary)',
            fontWeight: 500,
          }}>
            AI Active
          </span>
        </div>

        {/* Connection */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 12px', borderRadius: 999,
          background: connected
            ? 'rgba(0,255,169,0.1)'
            : 'rgba(255,61,90,0.1)',
          border: `1px solid ${connected
            ? 'rgba(0,255,169,0.3)'
            : 'rgba(255,61,90,0.3)'}`,
        }}>
          {connected
            ? <Wifi size={13} color="var(--risk-low)" />
            : <WifiOff size={13} color="var(--risk-high)" />}
          <span style={{
            fontSize: '0.65rem', fontWeight: 600,
            color: connected ? 'var(--risk-low)' : 'var(--risk-high)',
            textTransform: 'uppercase',
          }}>
            {connected ? 'Live' : 'Offline'}
          </span>
          {connected && (
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--risk-low)',
              }}
            />
          )}
        </div>

        {/* Activity sparkle */}
        <Activity size={16} color="var(--accent-purple)" />
      </div>
    </motion.header>
  );
}
