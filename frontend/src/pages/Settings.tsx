import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Key, Cpu, ShieldCheck, Database, Zap, CheckCircle2, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';
import { fetchAgentStatus, testGroqConnection, saveAgentConfig } from '../services/api';

export const Settings: React.FC = () => {
  const [provider, setProvider] = useState('groq');
  const [groqKey, setGroqKey] = useState('');
  const [groqModel, setGroqModel] = useState('llama-3.3-70b-versatile');
  const [hindsightUrl, setHindsightUrl] = useState('http://localhost:8888');
  const [confidenceThreshold, setConfidenceThreshold] = useState('0.75');
  
  const [testingGroq, setTestingGroq] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string; error?: string; latency_ms?: number; model?: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const [activeStatus, setActiveStatus] = useState<any>(null);

  useEffect(() => {
    async function loadStatus() {
      const data = await fetchAgentStatus();
      setActiveStatus(data);
    }
    loadStatus();
  }, []);

  const handleTestGroq = async () => {
    setTestingGroq(true);
    setTestResult(null);
    const res = await testGroqConnection(groqKey, groqModel);
    setTestingGroq(false);
    setTestResult(res);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveAgentConfig({
      groq_api_key: groqKey,
      groq_model: groqModel,
      hindsight_url: hindsightUrl,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    const updated = await fetchAgentStatus();
    setActiveStatus(updated);
  };

  return (
    <div className="page-view" style={{ maxWidth: '850px' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="logo-badge">
            <SettingsIcon size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>Engine Settings & Groq LLM</h1>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Configure Groq high-speed LLM reasoning, Hindsight memory cluster, and threshold gates
            </div>
          </div>
        </div>
      </div>

      {saved && (
        <div style={{ padding: '12px 18px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', color: 'var(--accent-emerald)', fontSize: '0.88rem', fontWeight: 600, marginBottom: '20px' }}>
          ✓ Engine configuration updated successfully.
        </div>
      )}

      {/* Active Engine Card */}
      {activeStatus && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-amber)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Active Inference Provider</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
                  {activeStatus.llm?.display_name || 'OpsMind SRE Engine'}
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '999px', background: activeStatus.llm?.is_fallback ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: activeStatus.llm?.is_fallback ? 'var(--accent-amber)' : 'var(--accent-emerald)', fontWeight: 700 }}>
                {activeStatus.llm?.is_fallback ? 'Local Deterministic Mode' : '⚡ Groq Accelerated'}
              </span>
            </div>
          </div>

          <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-cyan)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Active Memory Backend</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
                  {activeStatus.hindsight?.external_connected ? 'External Hindsight Microservice' : 'Local Persistent Storage Engine'}
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '999px', background: activeStatus.hindsight?.external_connected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(6, 182, 212, 0.15)', color: activeStatus.hindsight?.external_connected ? 'var(--accent-emerald)' : 'var(--accent-cyan)', fontWeight: 700 }}>
                {activeStatus.hindsight?.external_connected ? '🟢 Remote Connected' : '💾 SQLite + JSON (No Docker Required)'}
              </span>
            </div>
          </div>
        </div>
      )}


      <form onSubmit={handleSave} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Provider Selector */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
            LLM Reasoning Provider
          </label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              color: '#fff',
              padding: '10px 14px',
              fontSize: '0.9rem',
              outline: 'none',
            }}
          >
            <option value="groq">Groq (Ultra-Fast Llama 3.3 70B / Llama 3.1 8B) — Recommended</option>
            <option value="mock">Local DevOps SRE Deterministic Engine (Built-in)</option>
            <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
            <option value="gemini">Google Gemini 1.5 Pro</option>
          </select>
        </div>

        {/* Groq Configuration Section */}
        {provider === 'groq' && (
          <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={18} color="var(--accent-amber)" />
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff' }}>Groq API Setup</span>
              </div>
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
              >
                <span>Get Free Groq API Key</span>
                <ExternalLink size={12} />
              </a>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Groq API Key (Stored in .env)
              </label>
              <input
                type="password"
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
                placeholder="gsk_..."
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: '#fff',
                  padding: '10px 14px',
                  fontSize: '0.9rem',
                  outline: 'none',
                  fontFamily: 'var(--font-mono)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Model Selection
              </label>
              <select
                value={groqModel}
                onChange={(e) => setGroqModel(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: '#fff',
                  padding: '10px 14px',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              >
                <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Highest Reasoning Quality)</option>
                <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (Fastest ~150ms)</option>
                <option value="mixtral-8x7b-32768">mixtral-8x7b-32768 (High Context)</option>
              </select>
            </div>

            {/* Test Connection Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={handleTestGroq}
                disabled={testingGroq}
                style={{
                  background: 'rgba(245, 158, 11, 0.2)',
                  border: '1px solid var(--accent-amber)',
                  color: 'var(--accent-amber)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  padding: '8px 14px',
                  borderRadius: '6px',
                  cursor: testingGroq ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {testingGroq ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                <span>{testingGroq ? 'Pinging Groq...' : 'Test Groq Connection'}</span>
              </button>
            </div>

            {/* Test Feedback */}
            {testResult && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  background: testResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                  border: `1px solid ${testResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
                  color: testResult.success ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                }}
              >
                {testResult.success ? (
                  <div>
                    ✓ <strong>Connected!</strong> Groq latency: {testResult.latency_ms}ms ({testResult.model})
                    <div style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>{testResult.message}</div>
                  </div>
                ) : (
                  <div>
                    ❌ <strong>Connection Failed:</strong> {testResult.error}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Hindsight Configuration */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
            Hindsight Memory API URL
          </label>
          <input
            type="text"
            value={hindsightUrl}
            onChange={(e) => setHindsightUrl(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              color: '#fff',
              padding: '10px 14px',
              fontSize: '0.9rem',
              outline: 'none',
              fontFamily: 'var(--font-mono)',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
            Memory Match Similarity Threshold
          </label>
          <input
            type="text"
            value={confidenceThreshold}
            onChange={(e) => setConfidenceThreshold(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              color: '#fff',
              padding: '10px 14px',
              fontSize: '0.9rem',
              outline: 'none',
            }}
          />
        </div>

        <button
          type="submit"
          className="btn-primary"
          style={{
            marginTop: '10px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            padding: '12px',
            fontSize: '0.95rem',
            fontWeight: 700,
          }}
        >
          <Save size={18} />
          <span>Save Engine Configuration</span>
        </button>
      </form>
    </div>
  );
};
