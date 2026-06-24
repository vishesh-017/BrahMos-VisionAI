import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, UploadCloud, Camera, X, PlusCircle, UserX, Shield } from 'lucide-react';

interface Person {
  id: string; name: string; role: string;
  photo_b64: string | null; added_at: string;
}

const ROLE_COLORS: Record<string, string> = {
  owner: 'var(--accent-amber)',
  staff: 'var(--accent-green)',
  guest: 'var(--accent-cyan)',
  unknown: 'var(--text-muted)',
};

const ROLE_ICONS: Record<string, any> = {
  owner: <Shield size={16} color="var(--accent-amber)" />,
  staff: <Shield size={16} color="var(--accent-green)" />,
  guest: <Users size={16} color="var(--accent-cyan)" />,
  unknown: <Users size={16} color="var(--text-muted)" />,
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
      setError('CAMERA ACCESS DENIED. CHECK PERMISSIONS.');
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
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setPreview(dataUrl);
        
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
    
    if (!fileToUpload) { setError('UPLOAD OR CAPTURE AN IDENTITY IMAGE.'); return; }
    if (!name.trim()) { setError('SUBJECT NAME REQUIRED.'); return; }

    setUploading(true); setError(''); setSuccess('');
    const fd = new FormData();
    fd.append('name', name.trim());
    fd.append('role', role);
    fd.append('photo', fileToUpload);

    try {
      const r = await fetch('/api/persons', { method: 'POST', body: fd });
      const data = await r.json();
      if (!r.ok) { setError(data.error?.toUpperCase() || 'REGISTRATION FAILED.'); return; }
      setSuccess(`IDENTITY ACCEPTED: ${data.name.toUpperCase()}`);
      setName(''); setRole('guest'); clearPhoto();
      await load();
    } catch { setError('UPLINK SEVERED. CHECK NETWORK.'); }
    finally { setUploading(false); }
  };

  const onDelete = async (id: string, pName: string) => {
    if (!confirm(`REVOKE CLEARANCE FOR [${pName.toUpperCase()}]?`)) return;
    await fetch(`/api/persons/${id}`, { method: 'DELETE' });
    await load();
  };

  return (
    <div className="glass-card" style={{ padding: '16px 20px', minHeight: 400, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10 }}>
        <div className="section-title" style={{ margin: 0 }}>
          <Users size={15} color="var(--accent-cyan)" />
          IDENTITY REGISTRY
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: '0.1em' }}>
            {persons.length} ENTITIES REGISTERED
          </span>
        </div>
      </div>

      {/* Registration Form */}
      <form onSubmit={onSubmit} style={{
        background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', borderLeft: '3px solid var(--accent-cyan)',
        borderRadius: 6, padding: '16px', display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <PlusCircle size={14} color="var(--accent-cyan)" />
          <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-cyan)', margin: 0, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            ADD NEW ENTITY
          </p>
        </div>

        {/* Photo Input Area */}
        <div style={{
          border: `1px dashed ${(preview || useWebcam) ? 'var(--accent-cyan)' : 'var(--text-muted)'}`,
          borderRadius: 4, padding: 16, textAlign: 'center',
          background: (preview || useWebcam) ? 'rgba(0,212,255,0.05)' : 'rgba(0,0,0,0.5)',
          position: 'relative', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 100,
        }}>
          {preview ? (
            <div style={{ position: 'relative' }}>
              <img src={preview} style={{ width: 100, height: 100, borderRadius: 4, objectFit: 'cover', border: '1px solid var(--accent-cyan)', boxShadow: '0 0 15px rgba(0,212,255,0.2)' }} alt="preview" />
              <button type="button" onClick={clearPhoto} style={{
                position: 'absolute', top: -8, right: -8, background: 'var(--accent-red)', color: 'black',
                border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 10px var(--accent-red)'
              }}><X size={14} /></button>
            </div>
          ) : useWebcam ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%' }}>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                style={{ width: '100%', maxWidth: 220, borderRadius: 4, border: '1px solid var(--accent-cyan)' }}
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={capturePhoto} style={{
                  background: 'rgba(0,212,255,0.1)', color: 'var(--accent-cyan)', border: '1px solid var(--accent-cyan)', borderRadius: 4,
                  padding: '6px 14px', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', cursor: 'pointer', textTransform: 'uppercase',
                  boxShadow: '0 0 10px rgba(0,212,255,0.2)'
                }}>Capture</button>
                <button type="button" onClick={stopWebcam} style={{
                  background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', borderRadius: 4,
                  padding: '6px 14px', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', cursor: 'pointer', textTransform: 'uppercase'
                }}>Abort</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 12, width: '100%' }}>
              <button type="button" onClick={() => fileRef.current?.click()} style={{
                flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)', borderRadius: 4, padding: '12px', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.2s'
              }} onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--text-muted)'} onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}>
                <UploadCloud size={20} color="var(--text-muted)" />
                <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>UPLOAD IMAGE</span>
              </button>
              <button type="button" onClick={startWebcam} style={{
                flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)', borderRadius: 4, padding: '12px', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.2s'
              }} onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--text-muted)'} onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}>
                <Camera size={20} color="var(--text-muted)" />
                <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>INIT CAMERA</span>
              </button>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} style={{ display: 'none' }} />
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          {/* Name */}
          <input
            value={name} onChange={e => setName(e.target.value)} placeholder="SUBJECT DESIGNATION"
            style={{
              flex: 2, background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-subtle)',
              borderRadius: 4, padding: '10px 14px', color: 'var(--text-primary)',
              fontSize: '0.75rem', fontFamily: 'var(--font-mono)', outline: 'none', letterSpacing: '0.05em'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--accent-cyan)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
          />

          {/* Role */}
          <select
            value={role} onChange={e => setRole(e.target.value)}
            style={{
              flex: 1, background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-subtle)',
              borderRadius: 4, padding: '10px 14px', color: 'var(--text-primary)',
              fontSize: '0.75rem', fontFamily: 'var(--font-mono)', outline: 'none',
              appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', cursor: 'pointer',
              letterSpacing: '0.05em', textTransform: 'uppercase'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--accent-cyan)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
          >
            <option value="owner" style={{ background: '#020812' }}>OWNER</option>
            <option value="staff" style={{ background: '#020812' }}>STAFF</option>
            <option value="guest" style={{ background: '#020812' }}>GUEST</option>
          </select>
        </div>

        {error && <p style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-red)', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}><UserX size={12} /> {error}</p>}
        {success && <p style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-green)', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}><Shield size={12} /> {success}</p>}

        <button
          type="submit" disabled={uploading}
          style={{
            background: uploading ? 'rgba(0,212,255,0.1)' : 'rgba(0,212,255,0.15)',
            color: 'var(--accent-cyan)', border: '1px solid var(--accent-cyan)', borderRadius: 4, padding: '10px 0',
            fontFamily: 'var(--font-mono)', fontSize: '0.75rem', cursor: uploading ? 'not-allowed' : 'pointer',
            textTransform: 'uppercase', letterSpacing: '0.1em', transition: 'all 0.2s',
            boxShadow: uploading ? 'none' : '0 0 10px rgba(0,212,255,0.15)'
          }}
          onMouseOver={(e) => { if (!uploading) e.currentTarget.style.background = 'rgba(0,212,255,0.25)' }}
          onMouseOut={(e) => { if (!uploading) e.currentTarget.style.background = 'rgba(0,212,255,0.15)' }}
        >
          {uploading ? 'PROCESSING...' : 'AUTHORIZE ENTITY'}
        </button>
      </form>

      {/* Registered Persons List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflowY: 'auto', paddingRight: 4 }}>
        {loading ? (
          <p style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', textAlign: 'center', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginTop: 20 }}>ACCESSING DATABASE...</p>
        ) : persons.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
            <Users size={24} style={{ opacity: 0.3, marginBottom: 10 }} />
            <p style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>DATABASE EMPTY</p>
            <p style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', marginTop: 4, opacity: 0.5, letterSpacing: '0.05em' }}>REGISTER OWNER TO INITIALIZE.</p>
          </div>
        ) : (
          <AnimatePresence>
            {persons.map((p, idx) => {
              const color = ROLE_COLORS[p.role] || 'var(--text-muted)';
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', borderRadius: 6,
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid var(--border-subtle)',
                    borderLeft: `3px solid ${color}`,
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = color; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.4)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
                >
                  {/* Avatar */}
                  {p.photo_b64 ? (
                    <div style={{ position: 'relative', width: 44, height: 44 }}>
                      <img
                        src={`data:image/jpeg;base64,${p.photo_b64}`}
                        style={{ width: '100%', height: '100%', borderRadius: 4, objectFit: 'cover', border: `1px solid ${color}60` }}
                        alt={p.name}
                      />
                      <div style={{ position: 'absolute', inset: 0, boxShadow: `inset 0 0 10px ${color}40`, borderRadius: 4, pointerEvents: 'none' }} />
                    </div>
                  ) : (
                    <div style={{
                      width: 44, height: 44, borderRadius: 4, background: `${color}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, border: `1px solid ${color}40`,
                    }}>
                      {ROLE_ICONS[p.role]}
                    </div>
                  )}

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{p.name}</span>
                      <span style={{
                        fontSize: '0.55rem', fontFamily: 'var(--font-mono)', fontWeight: 800, padding: '2px 6px', borderRadius: 2,
                        background: `${color}15`, color, border: `1px solid ${color}40`, textTransform: 'uppercase', letterSpacing: '0.1em'
                      }}>{p.role}</span>
                    </div>
                    <p style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: 4, letterSpacing: '0.05em' }}>
                      AUTH DATE: {new Date(p.added_at || '').toLocaleDateString('en-IN').replace(/\//g, '.')}
                    </p>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => onDelete(p.id, p.name)}
                    style={{
                      background: 'transparent', border: '1px solid var(--border-subtle)',
                      color: 'var(--text-muted)', borderRadius: 4, padding: '6px 10px',
                      fontSize: '0.65rem', fontFamily: 'var(--font-mono)', cursor: 'pointer', letterSpacing: '0.05em', transition: 'all 0.2s',
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = 'var(--accent-red)'; e.currentTarget.style.borderColor = 'var(--accent-red)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
                  >
                    REVOKE
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
