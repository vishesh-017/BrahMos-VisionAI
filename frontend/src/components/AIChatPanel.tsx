import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, Bot, User, Loader2, Terminal } from 'lucide-react';
import { API, fetchJSON } from '../api';

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  time: string;
}

export default function AIChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'ai',
      text: 'SYSTEM ONLINE. BRAHMOS AI ASSISTANT READY.\nAwaiting queries on security events, risk analysis, or system status.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const q = input.trim();
    if (!q || loading) return;

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [...prev, { role: 'user', text: q, time: now }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetchJSON<{ answer: string }>(API.chat, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: res.answer,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: '[ERROR] UNABLE TO CONNECT TO MAINFRAME. CHECK BACKEND SERVER.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
    setLoading(false);
  };

  const quickQuestions = [
    'Summarize today\'s events',
    'Any high-risk events?',
    'System status',
  ];

  return (
    <div className="glass-card" style={{
      padding: 0, display: 'flex', flexDirection: 'column',
      height: '100%', minHeight: 400, border: '1px solid var(--border-subtle)'
    }}>
      {/* ── Header ── */}
      <div style={{
        padding: '12px 18px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div className="section-title" style={{ margin: 0, fontSize: '0.75rem' }}>
          <Terminal size={14} color="var(--accent-cyan)" />
          TACTICAL AI INTERFACE
        </div>
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          style={{
            fontSize: '0.55rem', color: 'var(--accent-cyan)',
            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em',
            display: 'flex', alignItems: 'center', gap: 6
          }}
        >
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-cyan)', boxShadow: '0 0 8px var(--accent-cyan)' }} />
          UPLINK ACTIVE
        </motion.div>
      </div>

      {/* ── Messages ── */}
      <div
        ref={scrollRef}
        style={{
          flex: 1, overflowY: 'auto', padding: '16px 18px',
          display: 'flex', flexDirection: 'column', gap: 16,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, transparent 100%)'
        }}
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, type: 'spring', stiffness: 200, damping: 20 }}
              style={{
                display: 'flex', gap: 12,
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: msg.role === 'ai'
                  ? 'rgba(0, 212, 255, 0.1)'
                  : 'rgba(168, 85, 247, 0.1)',
                border: `1px solid ${msg.role === 'ai' ? 'rgba(0, 212, 255, 0.3)' : 'rgba(168, 85, 247, 0.3)'}`,
                boxShadow: `0 0 10px ${msg.role === 'ai' ? 'rgba(0, 212, 255, 0.2)' : 'rgba(168, 85, 247, 0.2)'}`,
                flexShrink: 0,
              }}>
                {msg.role === 'ai'
                  ? <Bot size={16} color="var(--accent-cyan)" />
                  : <User size={16} color="var(--accent-purple)" />}
              </div>
              
              <div style={{
                maxWidth: '85%',
                padding: '10px 14px', borderRadius: 8,
                background: msg.role === 'ai'
                  ? 'rgba(0,0,0,0.5)'
                  : 'rgba(168,85,247,0.05)',
                border: `1px solid ${msg.role === 'ai'
                  ? 'rgba(0,212,255,0.15)'
                  : 'rgba(168,85,247,0.15)'}`,
                borderLeft: msg.role === 'ai' ? '3px solid var(--accent-cyan)' : undefined,
                borderRight: msg.role === 'user' ? '3px solid var(--accent-purple)' : undefined,
              }}>
                <p style={{
                  fontSize: '0.75rem', color: msg.role === 'ai' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  lineHeight: 1.6, whiteSpace: 'pre-wrap', fontFamily: msg.role === 'ai' ? 'var(--font-mono)' : 'var(--font-sans)',
                  letterSpacing: msg.role === 'ai' ? '0.02em' : 'normal',
                }}>
                  {msg.text}
                </p>
                <span style={{
                  fontSize: '0.55rem', color: 'var(--text-muted)',
                  display: 'block', marginTop: 8, fontFamily: 'var(--font-mono)',
                  textAlign: msg.role === 'user' ? 'right' : 'left', letterSpacing: '0.1em'
                }}>
                  {msg.time} {msg.role === 'ai' ? '// AI_CORE' : '// OPERATOR'}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
            <Loader2 size={16} color="var(--accent-cyan)" style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '0.65rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Querying database...
            </span>
          </motion.div>
        )}
      </div>

      {/* ── Quick questions ── */}
      <div style={{
        padding: '10px 18px', background: 'rgba(0,0,0,0.3)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex', gap: 8, flexWrap: 'wrap',
      }}>
        {quickQuestions.map((q) => (
          <button
            key={q}
            onClick={() => { setInput(q); }}
            style={{
              padding: '6px 12px', borderRadius: 4,
              background: 'rgba(0,212,255,0.05)',
              border: '1px solid rgba(0,212,255,0.2)',
              color: 'var(--accent-cyan)', fontSize: '0.6rem',
              fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em',
              cursor: 'pointer', transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              (e.target as HTMLButtonElement).style.background = 'rgba(0,212,255,0.15)';
              (e.target as HTMLButtonElement).style.boxShadow = '0 0 10px rgba(0,212,255,0.2)';
            }}
            onMouseOut={(e) => {
              (e.target as HTMLButtonElement).style.background = 'rgba(0,212,255,0.05)';
              (e.target as HTMLButtonElement).style.boxShadow = 'none';
            }}
          >
            &gt; {q}
          </button>
        ))}
      </div>

      {/* ── Input ── */}
      <div style={{
        padding: '14px 18px',
        background: 'var(--bg-base)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex', gap: 12, alignItems: 'center'
      }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>&gt;</span>
          <input
            id="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="ENTER COMMAND OR QUERY..."
            style={{
              width: '100%', padding: '12px 14px 12px 30px', borderRadius: 4,
              background: 'rgba(0,0,0,0.5)',
              border: '1px solid var(--border-subtle)',
              color: '#fff', fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)', letterSpacing: '0.05em',
              outline: 'none', transition: 'all 0.2s ease',
            }}
            onFocus={(e) => { 
              e.target.style.borderColor = 'var(--accent-cyan)'; 
              e.target.style.boxShadow = '0 0 15px rgba(0,212,255,0.15)'; 
            }}
            onBlur={(e) => { 
              e.target.style.borderColor = 'var(--border-subtle)'; 
              e.target.style.boxShadow = 'none'; 
            }}
          />
        </div>
        
        <button
          id="chat-send"
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{
            width: 44, height: 44, borderRadius: 4,
            background: 'rgba(0,212,255,0.1)',
            border: '1px solid var(--accent-cyan)',
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: loading || !input.trim() ? 0.3 : 1,
            transition: 'all 0.2s',
            boxShadow: loading || !input.trim() ? 'none' : '0 0 15px rgba(0,212,255,0.2)',
          }}
          onMouseOver={(e) => { if (!loading && input.trim()) e.currentTarget.style.background = 'rgba(0,212,255,0.2)' }}
          onMouseOut={(e) => { if (!loading && input.trim()) e.currentTarget.style.background = 'rgba(0,212,255,0.1)' }}
        >
          <Send size={18} color="var(--accent-cyan)" style={{ transform: 'translateX(-1px)' }} />
        </button>
      </div>
    </div>
  );
}
