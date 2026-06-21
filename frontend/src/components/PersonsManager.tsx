import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Person {
  id: string; name: string; role: string;
  photo_b64: string | null; added_at: string;
}

const ROLE_COLORS: Record<string, string> = {
  owner: '#f59e0b',
  staff: '#22c55e',
  guest: '#60a5fa',
  unknown: '#9ca3af',
};

const ROLE_ICONS: Record<string, string> = {
  owner: '👑',
  staff: '🛡️',
  guest: '🧑',
  unknown: '❓',
};

export default function PersonsManager() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('guest');
  const [preview, setPreview] = useState<string | null>(null);
  
  // Webcam state
  const [useWebcam, setUseWebcam] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/persons');
      setPersons(await r.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Cleanup webcam on unmount
  useEffect(() => {
    return () => { stopWebcam(); };
  }, []);

  const startWebcam = async () => {
    try {
      setError('');
      setPreview(null);
      setCapturedFile(null);
      setUseWebcam(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error(err);
      setError('Could not access webcam. Please check permissions.');
      setUseWebcam(false);
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setUseWebcam(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw the video frame to the canvas
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setPreview(dataUrl);
        
        // Convert to File object for the form
        fetch(dataUrl)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], "webcam_capture.jpg", { type: "image/jpeg" });
            setCapturedFile(file);
          });
      }
      stopWebcam();
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    stopWebcam();
    const file = e.target.files?.[0];
    if (!file) return;
    setCapturedFile(file);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearPhoto = () => {
    setPreview(null);
    setCapturedFile(null);
    if (fileRef.current) fileRef.current.value = '';
    stopWebcam();
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fileToUpload = capturedFile;
    
    if (!fileToUpload) { setError('Please provide a photo.'); return; }
    if (!name.trim()) { setError('Please enter a name.'); return; }

    setUploading(true); setError(''); setSuccess('');
    const fd = new FormData();
    fd.append('name', name.trim());
    fd.append('role', role);
    fd.append('photo', fileToUpload);

    try {
      const r = await fetch('/api/persons', { method: 'POST', body: fd });
      const data = await r.json();
      if (!r.ok) { setError(data.error || 'Failed to register person.'); return; }
      setSuccess(`✅ ${data.name} registered successfully!`);
      setName(''); setRole('guest'); clearPhoto();
      await load();
    } catch { setError('Network error.'); }
    finally { setUploading(false); }
  };

  const onDelete = async (id: string, pName: string) => {
    if (!confirm(`Remove ${pName} from the registry?`)) return;
    await fetch(`/api/persons/${id}`, { method: 'DELETE' });
    await load();
  };

  return (
    <div style={{ padding: 16, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: '1rem' }}>👤</span>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
          Person Registry — {persons.length} registered
        </span>
      </div>

      {/* Registration Form */}
      <form onSubmit={onSubmit} style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 2 }}>Register New Person</p>

        {/* Photo Input Area */}
        <div style={{
          border: `2px dashed ${(preview || useWebcam) ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.12)'}`,
          borderRadius: 10, padding: 12, textAlign: 'center',
          background: (preview || useWebcam) ? 'rgba(0,229,255,0.04)' : 'transparent',
          position: 'relative', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 90,
        }}>
          {preview ? (
            <div style={{ position: 'relative' }}>
              <img src={preview} style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover' }} alt="preview" />
              <button type="button" onClick={clearPhoto} style={{
                position: 'absolute', top: -6, right: -6, background: '#ef4444', color: 'white',
                border: 'none', borderRadius: '50%', width: 20, height: 20, fontSize: '0.6rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
              }}>✕</button>
            </div>
          ) : useWebcam ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: '100%' }}>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                style={{ width: '100%', maxWidth: 200, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)' }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={capturePhoto} style={{
                  background: 'var(--accent-cyan)', color: '#000', border: 'none', borderRadius: 6,
                  padding: '4px 12px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer'
                }}>📸 Snap</button>
                <button type="button" onClick={stopWebcam} style={{
                  background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: 6,
                  padding: '4px 12px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer'
                }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10, width: '100%' }}>
              <button type="button" onClick={() => fileRef.current?.click()} style={{
                flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--text-primary)', borderRadius: 8, padding: '8px', fontSize: '0.7rem', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
              }}>
                <span style={{ fontSize: '1.2rem' }}>📁</span>
                Upload Image
              </button>
              <button type="button" onClick={startWebcam} style={{
                flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--text-primary)', borderRadius: 8, padding: '8px', fontSize: '0.7rem', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
              }}>
                <span style={{ fontSize: '1.2rem' }}>📷</span>
                Take Photo
              </button>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} style={{ display: 'none' }} />
        </div>

        {/* Name */}
        <input
          value={name} onChange={e => setName(e.target.value)} placeholder="Full name (e.g. Neel)"
          style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '8px 12px', color: 'var(--text-primary)',
            fontSize: '0.8rem', fontFamily: 'var(--font-sans)', outline: 'none',
          }}
        />

        {/* Role */}
        <select
          value={role} onChange={e => setRole(e.target.value)}
          style={{
            background: '#1e293b', /* Dark background to ensure light text is visible */
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '8px 12px', color: 'var(--text-primary)',
            fontSize: '0.8rem', fontFamily: 'var(--font-sans)', outline: 'none',
            appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none'
          }}
        >
          <option value="owner" style={{ background: '#1e293b', color: '#fff' }}>👑 Owner (Zero risk contribution)</option>
          <option value="staff" style={{ background: '#1e293b', color: '#fff' }}>🛡️ Staff (Reduced risk contribution)</option>
          <option value="guest" style={{ background: '#1e293b', color: '#fff' }}>🧑 Guest (Normal rules apply)</option>
        </select>

        {error && <p style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 600 }}>{error}</p>}
        {success && <p style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: 600 }}>{success}</p>}

        <button
          type="submit" disabled={uploading}
          style={{
            background: uploading ? 'rgba(0,229,255,0.2)' : 'var(--accent-cyan)',
            color: '#000', border: 'none', borderRadius: 8, padding: '9px 0',
            fontWeight: 700, fontSize: '0.78rem', cursor: uploading ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {uploading ? 'Registering…' : 'Register Person'}
        </button>
      </form>

      {/* Registered Persons List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? (
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>Loading…</p>
        ) : persons.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '0.8rem' }}>No persons registered yet.</p>
            <p style={{ fontSize: '0.65rem', marginTop: 4, opacity: 0.6 }}>Register the owner first to enable smart recognition.</p>
          </div>
        ) : (
          <AnimatePresence>
            {persons.map(p => {
              const color = ROLE_COLORS[p.role] || '#9ca3af';
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.02)',
                    border: `1px solid ${color}30`,
                  }}
                >
                  {/* Avatar */}
                  {p.photo_b64 ? (
                    <img
                      src={`data:image/jpeg;base64,${p.photo_b64}`}
                      style={{ width: 42, height: 42, borderRadius: 8, objectFit: 'cover', border: `2px solid ${color}60`, flexShrink: 0 }}
                      alt={p.name}
                    />
                  ) : (
                    <div style={{
                      width: 42, height: 42, borderRadius: 8, background: `${color}20`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.2rem', flexShrink: 0, border: `2px solid ${color}40`,
                    }}>
                      {ROLE_ICONS[p.role] || '👤'}
                    </div>
                  )}

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)' }}>{p.name}</span>
                      <span style={{
                        fontSize: '0.55rem', fontWeight: 700, padding: '1px 6px', borderRadius: 20,
                        background: `${color}20`, color, border: `1px solid ${color}40`, textTransform: 'uppercase',
                      }}>{p.role}</span>
                    </div>
                    <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      Added {new Date(p.added_at || '').toLocaleDateString('en-IN')}
                    </p>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => onDelete(p.id, p.name)}
                    style={{
                      background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                      color: '#ef4444', borderRadius: 6, padding: '4px 8px',
                      fontSize: '0.6rem', cursor: 'pointer', fontWeight: 600, flexShrink: 0,
                    }}
                  >
                    Remove
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
