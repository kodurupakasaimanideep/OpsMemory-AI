import React, { useState, useEffect } from 'react';
import { BookOpen, Search, ArrowRight, X, Clock, FileText } from 'lucide-react';
import { fetchRunbooks, fetchRunbookContent } from '../services/api';

export const Runbooks: React.FC = () => {
  const [runbooks, setRunbooks] = useState<any[]>([]);
  const [selectedRunbook, setSelectedRunbook] = useState<{ id: string; content: string } | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      const data = await fetchRunbooks();
      setRunbooks(data);
    }
    load();
  }, []);

  const openRunbook = async (id: string) => {
    const res = await fetchRunbookContent(id);
    setSelectedRunbook({ id, content: res.content });
  };

  const filtered = runbooks.filter((rb) =>
    rb.title.toLowerCase().includes(search.toLowerCase()) ||
    rb.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-view">
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="logo-badge">
            <BookOpen size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>Operational Runbooks</h1>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Standard operating procedures & verified triage checklists linked to incident memory
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Filter runbooks by topic..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            maxWidth: '400px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            color: '#fff',
            padding: '10px 14px',
            fontSize: '0.88rem',
            outline: 'none',
          }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        {filtered.map((rb) => (
          <div
            key={rb.id}
            onClick={() => openRunbook(rb.id)}
            className="glass-card incident-item-hover"
            style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-cyan)', background: 'rgba(6, 182, 212, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                {rb.category}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{rb.estimated_time}</span>
            </div>

            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
              {rb.title}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Used in {rb.usage_count} incident resolutions</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-cyan)', fontSize: '0.82rem', fontWeight: 600 }}>
                <span>Read SOP</span>
                <ArrowRight size={14} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedRunbook && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '24px',
          }}
        >
          <div className="glass-card" style={{ width: '100%', maxWidth: '760px', maxHeight: '85vh', overflowY: 'auto', background: 'var(--bg-secondary)', position: 'relative' }}>
            <button
              onClick={() => setSelectedRunbook(null)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <FileText size={20} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>Runbook: {selectedRunbook.id}</h3>
            </div>
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, background: '#000', padding: '16px', borderRadius: '8px' }}>
              {selectedRunbook.content}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
