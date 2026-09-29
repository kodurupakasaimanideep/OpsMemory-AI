import React, { useState } from 'react';
import { ChatPanel } from '../components/ChatPanel';
import { Search as SearchIcon, Brain, Sparkles, Filter, Database, ArrowRight, ExternalLink, FileText } from 'lucide-react';
import { searchMemory } from '../services/api';
import { HandoffModal } from '../components/HandoffModal';

interface SearchProps {
  onSelectIncident?: (id: string) => void;
}

export const Search: React.FC<SearchProps> = ({ onSelectIncident }) => {
  const [activeMode, setActiveMode] = useState<'CHAT' | 'MEMORY_SEARCH'>('MEMORY_SEARCH');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedHandoffId, setSelectedHandoffId] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    setIsSearching(true);
    setSearched(true);
    const res = await searchMemory(query);
    setResults(res.results || []);
    setIsSearching(false);
  };

  const sampleQueries = [
    'connection pool exhaustion',
    'authentication-service',
    'HTTP 503',
    'INC-305',
    'unreleased database connections',
    'Kafka consumer lag',
  ];

  return (
    <div className="page-view">
      {/* Header and Mode Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>OpsMind Intelligence Gateway</h1>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Natural-language SRE assistant & multi-field organizational memory search
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.04)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <button
            onClick={() => setActiveMode('MEMORY_SEARCH')}
            style={{
              background: activeMode === 'MEMORY_SEARCH' ? 'var(--accent-cyan)' : 'transparent',
              color: activeMode === 'MEMORY_SEARCH' ? '#000' : 'var(--text-secondary)',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <SearchIcon size={14} />
            <span>GLOBAL MEMORY SEARCH</span>
          </button>

          <button
            onClick={() => setActiveMode('CHAT')}
            style={{
              background: activeMode === 'CHAT' ? 'var(--accent-cyan)' : 'transparent',
              color: activeMode === 'CHAT' ? '#000' : 'var(--text-secondary)',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Brain size={14} />
            <span>OPSMIND CHATBOT</span>
          </button>
        </div>
      </div>

      {/* Mode 1: Global Memory Search (Part 12) */}
      {activeMode === 'MEMORY_SEARCH' && (
        <div style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <SearchIcon size={18} color="var(--accent-cyan)" />
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff', textTransform: 'uppercase' }}>
                SEARCH OPSMIND MEMORY
              </span>
            </div>

            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Search across: <strong>Incident ID, Service, Symptom, Error code, Root cause, Resolution, Keywords</strong>
            </div>

            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'var(--bg-input)',
                  padding: '12px 18px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                }}
              >
                <SearchIcon size={18} color="var(--accent-cyan)" />
                <input
                  type="text"
                  placeholder="e.g. connection pool exhaustion, INC-305, HTTP 503, authentication-service..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#fff',
                    fontSize: '0.92rem',
                    width: '100%',
                    outline: 'none',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isSearching || !query.trim()}
                style={{
                  background: 'var(--accent-cyan)',
                  color: '#000',
                  border: 'none',
                  padding: '0 24px',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                {isSearching ? 'Searching...' : 'Search Memory'}
              </button>
            </form>

            {/* Quick suggested search chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quick queries:</span>
              {sampleQueries.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setQuery(q);
                    setTimeout(() => {
                      searchMemory(q).then((res) => {
                        setResults(res.results || []);
                        setSearched(true);
                      });
                    }, 50);
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.75rem',
                    padding: '4px 10px',
                    borderRadius: '999px',
                    cursor: 'pointer',
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Results List */}
          {searched && (
            <div className="glass-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  SEARCH RESULTS ({results.length} MATCHES)
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                  Ranked by multi-field relevance score
                </span>
              </div>

              {results.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  No stored incidents match query "{query}".
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {results.map((res: any, idx: number) => {
                    const incId = res.incident_id || res.id;
                    const isRes = String(res.status || '').toUpperCase() === 'RESOLVED';

                    return (
                      <div
                        key={idx}
                        style={{
                          padding: '16px',
                          background: 'rgba(255, 255, 255, 0.02)',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
                        {/* Row 1: ID, Service, Status, Match Score */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1rem', color: '#fff' }}>
                              {incId}
                            </span>
                            <span style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: 'rgba(6, 182, 212, 0.15)' }}>
                              {res.service}
                            </span>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: isRes ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)', color: isRes ? 'var(--accent-emerald)' : 'var(--accent-rose)', textTransform: 'uppercase' }}>
                              {res.status}
                            </span>
                          </div>

                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                            {res.relevance_pct}% relevance
                          </span>
                        </div>

                        {/* Symptom */}
                        <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                          <strong>Symptom:</strong> {res.symptom}
                        </div>

                        {/* Root Cause */}
                        {res.root_cause && res.root_cause !== 'Not recorded' && (
                          <div style={{ fontSize: '0.85rem', color: 'var(--accent-emerald)' }}>
                            <strong>Root Cause:</strong> {res.root_cause}
                          </div>
                        )}

                        {/* Resolution */}
                        {res.resolution && res.resolution !== 'Not recorded' && (
                          <div style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)' }}>
                            <strong>Resolution:</strong> {res.resolution}
                          </div>
                        )}

                        {/* Action buttons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                          {onSelectIncident && (
                            <button
                              onClick={() => onSelectIncident(incId)}
                              style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid var(--border-color)',
                                color: '#fff',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              <ExternalLink size={13} />
                              <span>View Incident Details</span>
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedHandoffId(incId)}
                            style={{
                              background: 'rgba(6, 182, 212, 0.1)',
                              border: '1px solid rgba(6, 182, 212, 0.3)',
                              color: 'var(--accent-cyan)',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <FileText size={13} />
                            <span>View Handoff</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Chatbot Integration (Part 18) */}
      {activeMode === 'CHAT' && (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <ChatPanel
            onSelectIncident={onSelectIncident}
            onOpenHandoff={(id) => setSelectedHandoffId(id)}
          />
        </div>
      )}

      {/* Night Shift Handoff Modal */}
      {selectedHandoffId && (
        <HandoffModal
          incidentId={selectedHandoffId}
          onClose={() => setSelectedHandoffId(null)}
          onNavigateIncident={(id) => {
            setSelectedHandoffId(null);
            if (onSelectIncident) onSelectIncident(id);
          }}
        />
      )}
    </div>
  );
};
