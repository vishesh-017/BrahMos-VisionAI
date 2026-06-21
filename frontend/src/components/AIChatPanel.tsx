import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Send, Bot, User, Loader2 } from 'lucide-react';
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
      text: 'Hello! I\'m BrahMos VisionAI Assistant. Ask me about today\'s security events, risk analysis, or system status.',
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
          text: 'Unable to connect to the server. Please ensure the backend is running.',
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
      height: '100%', minHeight: 350,
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div className="section-title" style={{ margin: 0 }}>
          <MessageSquare size={13} />
          AI Assistant
        </div>
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            fontSize: '0.55rem', color: 'var(--accent-green)',
            fontWeight: 600, textTransform: 'uppercase',
          }}
        >
          ● Online
        </motion.div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        style={{
          flex: 1, overflowY: 'auto', padding: '12px 14px',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}
      >
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              display: 'flex', gap: 8,
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
            }}
          >
            <div style={{
              width: 26, height: 26, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: msg.role === 'ai'
                ? 'linear-gradient(135deg, #00e5ff, #00ffa9)'
                : 'rgba(168,85,247,0.2)',
              flexShrink: 0,
            }}>
              {msg.role === 'ai'
                ? <Bot size={13} color="#05080f" />
                : <User size={13} color="var(--accent-purple)" />}
            </div>
            <div style={{
              maxWidth: '80%',
              padding: '8px 12px', borderRadius: 10,
              background: msg.role === 'ai'
                ? 'rgba(0,229,255,0.06)'
                : 'rgba(168,85,247,0.1)',
              border: `1px solid ${msg.role === 'ai'
                ? 'rgba(0,229,255,0.12)'
                : 'rgba(168,85,247,0.15)'}`,
            }}>
              <p style={{
                fontSize: '0.78rem', color: 'var(--text-primary)',
                lineHeight: 1.5, whiteSpace: 'pre-wrap',
              }}>
                {msg.text}
              </p>
              <span style={{
                fontSize: '0.55rem', color: 'var(--text-muted)',
                display: 'block', marginTop: 4,
                textAlign: msg.role === 'user' ? 'right' : 'left',
              }}>
                {msg.time}
              </span>
            </div>
          </motion.div>
        ))}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
            <Loader2 size={14} color="var(--accent-cyan)" className="spin" style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Analysing…</span>
          </div>
        )}
      </div>

      {/* Quick questions */}
      <div style={{
        padding: '6px 14px',
        display: 'flex', gap: 6, flexWrap: 'wrap',
      }}>
        {quickQuestions.map((q) => (
          <button
            key={q}
            onClick={() => { setInput(q); }}
            style={{
              padding: '3px 10px', borderRadius: 999,
              background: 'rgba(56,189,248,0.08)',
              border: '1px solid rgba(56,189,248,0.15)',
              color: 'var(--accent-blue)', fontSize: '0.6rem',
              fontWeight: 500, cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              (e.target as HTMLButtonElement).style.background = 'rgba(56,189,248,0.15)';
            }}
            onMouseOut={(e) => {
              (e.target as HTMLButtonElement).style.background = 'rgba(56,189,248,0.08)';
            }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{
        padding: '10px 14px',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex', gap: 8,
      }}>
        <input
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask about security events…"
          style={{
            flex: 1, padding: '8px 14px', borderRadius: 8,
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            fontSize: '0.8rem',
            fontFamily: 'var(--font-sans)',
            outline: 'none',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--border-glow)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--border-subtle)'; }}
        />
        <button
          id="chat-send"
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{
            width: 38, height: 38, borderRadius: 8,
            background: 'linear-gradient(135deg, #00e5ff, #00ffa9)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: loading || !input.trim() ? 0.4 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          <Send size={16} color="#05080f" />
        </button>
      </div>
    </div>
  );
}
