import React, { useState, useEffect } from 'react';
import { X, Save, RefreshCw, Settings2 } from 'lucide-react';
import { API } from '../api';
import type { SystemSettings } from '../api';

interface SettingsPanelProps {
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<SystemSettings>({
    TWILIO_ACCOUNT_SID: '',
    TWILIO_AUTH_TOKEN: '',
    TWILIO_WHATSAPP_NUMBER: '',
    SECURITY_WHATSAPP_NUMBER: '',
    SMTP_EMAIL: '',
    SMTP_PASSWORD: '',
    ALERT_RECIPIENT_EMAIL: '',
    GEMINI_API_KEY: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch(API.settings)
      .then(res => res.json())
      .then(data => {
        setSettings(data);
        setLoading(false);
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(API.settings, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-slate-900/90 border border-slate-700/50 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between bg-slate-800/50">
          <div className="flex items-center gap-3">
            <Settings2 className="w-6 h-6 text-cyan-400" />
            <h2 className="text-xl font-bold text-white tracking-wide">System Settings</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-8 flex-1 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
          ) : (
            <>
              {/* WhatsApp / Twilio */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-cyan-400 border-b border-slate-700/50 pb-2">Twilio WhatsApp API</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Account SID</label>
                    <input type="text" name="TWILIO_ACCOUNT_SID" value={settings.TWILIO_ACCOUNT_SID} onChange={handleChange} className="w-full bg-slate-950/50 border border-slate-700 rounded p-2.5 text-sm text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all outline-none" placeholder="AC..." />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Auth Token</label>
                    <input type="password" name="TWILIO_AUTH_TOKEN" value={settings.TWILIO_AUTH_TOKEN} onChange={handleChange} className="w-full bg-slate-950/50 border border-slate-700 rounded p-2.5 text-sm text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Twilio Number (From)</label>
                    <input type="text" name="TWILIO_WHATSAPP_NUMBER" value={settings.TWILIO_WHATSAPP_NUMBER} onChange={handleChange} className="w-full bg-slate-950/50 border border-slate-700 rounded p-2.5 text-sm text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all outline-none" placeholder="whatsapp:+14155238886" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Security Number (To)</label>
                    <input type="text" name="SECURITY_WHATSAPP_NUMBER" value={settings.SECURITY_WHATSAPP_NUMBER} onChange={handleChange} className="w-full bg-slate-950/50 border border-slate-700 rounded p-2.5 text-sm text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all outline-none" placeholder="whatsapp:+1234567890" />
                  </div>
                </div>
              </div>

              {/* Email / SMTP */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-emerald-400 border-b border-slate-700/50 pb-2">SMTP Email Dispatcher</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Sender Email</label>
                    <input type="email" name="SMTP_EMAIL" value={settings.SMTP_EMAIL} onChange={handleChange} className="w-full bg-slate-950/50 border border-slate-700 rounded p-2.5 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">App Password</label>
                    <input type="password" name="SMTP_PASSWORD" value={settings.SMTP_PASSWORD} onChange={handleChange} className="w-full bg-slate-950/50 border border-slate-700 rounded p-2.5 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none" />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Admin Alert Email (To)</label>
                    <input type="email" name="ALERT_RECIPIENT_EMAIL" value={settings.ALERT_RECIPIENT_EMAIL} onChange={handleChange} className="w-full bg-slate-950/50 border border-slate-700 rounded p-2.5 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none" />
                  </div>
                </div>
              </div>

              {/* Gemini */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-purple-400 border-b border-slate-700/50 pb-2">Google Gemini Vision AI</h3>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">API Key</label>
                  <input type="password" name="GEMINI_API_KEY" value={settings.GEMINI_API_KEY} onChange={handleChange} className="w-full bg-slate-950/50 border border-slate-700 rounded p-2.5 text-sm text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all outline-none" />
                  <p className="text-xs text-slate-500 mt-1">Required for semantic threat reasoning and chat.</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700/50 bg-slate-800/50 flex justify-between items-center">
          <div>
            {success && <span className="text-emerald-400 text-sm font-medium flex items-center gap-2">✓ Settings saved successfully</span>}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-lg font-medium text-sm text-slate-300 hover:bg-slate-700/50 transition-colors">
              Cancel
            </button>
            <button 
              onClick={handleSave} 
              disabled={loading || saving}
              className="flex items-center gap-2 px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
