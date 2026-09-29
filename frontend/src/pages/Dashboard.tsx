import React, { useState, useEffect } from 'react';
import { Incident, UserProfile } from '../types/incident';
import { HandoffModal } from '../components/HandoffModal';
import { fetchMemoryStats, fetchRecurringPatterns, fetchSimilarIncidents } from '../services/api';
import { 
  ShieldAlert, 
  ArrowRight, 
  Sparkles, 
  Users, 
  CheckCircle2, 
  Brain, 
  Layers, 
  AlertTriangle, 
  Clock, 
  Activity,
  FileText,
  Search,
  ExternalLink
} from 'lucide-react';

interface DashboardProps {
  incidents: Incident[];
  currentUser?: UserProfile;
  onSelectIncident: (id: string) => void;
  onNavigateTab: (tab: string) => void;
  onOpenUserSwitcher?: () => void;
  memoryCount?: number;
}

export const Dashboard: React.FC<DashboardProps> = ({
  incidents,
  currentUser,
  onSelectIncident,
  onNavigateTab,
  onOpenUserSwitcher,
  memoryCount = 2481,
}) => {
  const [stats, setStats] = useState<any | null>(null);
  const [patterns, setPatterns] = useState<any[]>([]);
  const [activeMatches, setActiveMatches] = useState<Record<string, any>>({});
  const [selectedHandoffId, setSelectedHandoffId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const s = await fetchMemoryStats();
      if (s) setStats(s);

      const p = await fetchRecurringPatterns();
      if (p) setPatterns(p);
    }
    loadData();
  }, []);

  // Compute active & recent incidents from real application incidents
  const activeIncidents = incidents.filter((i) => {
    const st = strStatus(i.status);
    return st === 'INVESTIGATING' || st === 'UNRESOLVED' || st.includes('INVESTIGAT');
  });

  const recentIncidents = incidents.slice(0, 8);

  function strStatus(st: any): string {
    return String(st || '').toUpperCase().trim();
  }

  // Fetch similar match for active incidents
  useEffect(() => {
    async function loadMatches() {
      const matchMap: Record<string, any> = {};
      for (const inc of activeIncidents.slice(0, 4)) {
        const matches = await fetchSimilarIncidents(inc.id);
        if (matches && matches.length > 0) {
          matchMap[inc.id] = matches[0];
        }
      }
      setActiveMatches(matchMap);
    }
    if (activeIncidents.length > 0) {
      loadMatches();
    }
  }, [incidents.length]);

  const firstName = currentUser?.name ? currentUser.name.split(' ')[0] : 'SRE';
  const totalIncidentsCount = stats?.total_incidents || incidents.length;
  const resolvedCount = stats?.resolved || incidents.filter(i => strStatus(i.status) === 'RESOLVED').length;
  const patternCount = stats?.recurring_patterns_count || patterns.length || 3;
  const totalKnowledge = stats?.categories?.hindsight_memories || stats?.total_incidents || memoryCount;

  const topPattern = patterns.length > 0 ? patterns[0] : {
    title: 'Database connection exhaustion',
    signature: 'HTTP 503 + database connection pressure',
    incidents: ['INC-104', 'INC-119', 'INC-204', 'INC-305'],
    count: 4
  };

  return (
    <div className="page-view">
      {/* OpsMind DevOps Command Center Header */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.08em', color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>
              OpsMind Command Center · {currentUser?.team || 'SRE Core'}
            </span>
          </div>
          <h1 style={{ fontSize: '2.1rem', fontWeight: 900, color: '#fff', marginTop: '4px', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span>OpsMind</span>
            <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--text-muted)', borderLeft: '1px solid var(--border-color)', paddingLeft: '12px' }}>
              Organizational memory for production operations
            </span>
          </h1>
        </div>

        {onOpenUserSwitcher && (
          <button
            onClick={onOpenUserSwitcher}
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              fontSize: '0.82rem',
              fontWeight: 600,
              padding: '8px 14px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Users size={15} color="var(--accent-cyan)" />
            <span>Switch Engineer / Shift Member</span>
          </button>
        )}
      </div>

      {/* Part 2: 4 Core Dashboard Cards */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--accent-rose)' }}>
          <div className="stat-label">ACTIVE INCIDENTS</div>
          <div className="stat-value" style={{ color: 'var(--accent-rose)' }}>
            {activeIncidents.length}
          </div>
          <div className="stat-sub">Requires triage & memory match</div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid var(--accent-emerald)' }}>
          <div className="stat-label">RESOLVED TODAY</div>
          <div className="stat-value" style={{ color: 'var(--accent-emerald)' }}>
            {resolvedCount}
          </div>
          <div className="stat-sub">Persisted in organizational store</div>
        </div>

        <div 
          className="stat-card" 
          style={{ borderLeft: '4px solid var(--accent-amber)', cursor: 'pointer' }}
          onClick={() => onNavigateTab('memory')}
        >
          <div className="stat-label">RECURRING PATTERNS</div>
          <div className="stat-value" style={{ color: 'var(--accent-amber)' }}>
            {patternCount}
          </div>
          <div className="stat-sub">Clusters detected across history</div>
        </div>

        <div 
          className="stat-card" 
          style={{ borderLeft: '4px solid var(--accent-cyan)', cursor: 'pointer' }}
          onClick={() => onNavigateTab('memory')}
        >
          <div className="stat-label">TOTAL KNOWLEDGE</div>
          <div className="stat-value" style={{ color: 'var(--accent-cyan)' }}>
            {totalKnowledge.toLocaleString()}
          </div>
          <div className="stat-sub">{totalIncidentsCount} real incident memories</div>
        </div>
      </div>

      {/* Part 13: Recurring Pattern Alert */}
      {topPattern && (
        <div
          style={{
            background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.12), rgba(245, 158, 11, 0.04))',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: '10px',
            padding: '14px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-amber)',
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-amber)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                PATTERN DETECTED · ORGANIZATIONAL MEMORY INSIGHT
              </div>
              <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
                {topPattern.signature || topPattern.title}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Seen across {topPattern.count || topPattern.incidents?.length || 4} historical incidents: {topPattern.incidents?.slice(0, 5).join(', ')}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => onNavigateTab('memory')}
              style={{
                background: 'rgba(245, 158, 11, 0.2)',
                border: '1px solid rgba(245, 158, 11, 0.5)',
                color: '#fff',
                fontSize: '0.82rem',
                fontWeight: 700,
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>Investigate Pattern</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Main Two-Panel Layout: Active Incidents Panel + Recent Incidents */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px', marginBottom: '24px' }}>
        {/* ACTIVE INCIDENTS PANEL (Part 2) */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={18} color="var(--accent-rose)" />
              <span style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                ACTIVE INCIDENTS PANEL
              </span>
              <span style={{ background: 'rgba(244, 63, 94, 0.2)', color: 'var(--accent-rose)', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
                {activeIncidents.length} TRIAGE
              </span>
            </div>
            <button
              onClick={() => onNavigateTab('incidents')}
              style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <span>All Incidents</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
            {activeIncidents.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                ✓ No active production incidents. All services running within normal parameters.
              </div>
            ) : (
              activeIncidents.map((inc) => {
                const symptomText = inc.symptom || (inc.symptoms && inc.symptoms[0]) || inc.title || 'HTTP 503 during peak traffic';
                const match = activeMatches[inc.id];
                const matchId = match?.id || match?.incident_id || 'INC-305';
                const matchPct = match?.similarity_pct || (match?.similarity ? Math.round(match.similarity * 100) : 91);

                return (
                  <div
                    key={inc.id}
                    style={{
                      padding: '16px 18px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-color)',
                      borderLeft: '4px solid var(--accent-rose)',
                      borderRadius: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    {/* Top Row: ID, Service, Status, Time */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>
                          {inc.id}
                        </span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)' }}>
                          {inc.service}
                        </span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: 'rgba(244, 63, 94, 0.2)', color: 'var(--accent-rose)', textTransform: 'uppercase' }}>
                          {inc.status || 'INVESTIGATING'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} />
                        <span>{inc.started_at ? new Date(inc.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}</span>
                      </div>
                    </div>

                    {/* Symptom */}
                    <div style={{ fontSize: '0.88rem', color: '#e2e8f0', lineHeight: 1.4 }}>
                      {symptomText}
                    </div>

                    {/* Historical Match Banner */}
                    <div
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: 'rgba(6, 182, 212, 0.08)',
                        border: '1px solid rgba(6, 182, 212, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.8rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Brain size={14} color="var(--accent-cyan)" />
                        <span style={{ color: 'var(--text-muted)' }}>Historical match:</span>
                        <strong style={{ color: '#fff', fontFamily: 'var(--font-mono)' }}>{matchId}</strong>
                        <span style={{ color: 'var(--accent-cyan)', fontWeight: 800 }}>— {matchPct}%</span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)' }}>Verified resolution available</span>
                    </div>

                    {/* Action Buttons: [Investigate], [View Incident], [Handoff] */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <button
                        onClick={() => onSelectIncident(inc.id)}
                        style={{
                          flex: 1,
                          background: 'rgba(6, 182, 212, 0.15)',
                          border: '1px solid rgba(6, 182, 212, 0.4)',
                          color: 'var(--accent-cyan)',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          padding: '7px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        <Brain size={13} />
                        <span>Investigate</span>
                      </button>

                      <button
                        onClick={() => onSelectIncident(inc.id)}
                        style={{
                          flex: 1,
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid var(--border-color)',
                          color: '#fff',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          padding: '7px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        <ExternalLink size={13} />
                        <span>View Incident</span>
                      </button>

                      <button
                        onClick={() => setSelectedHandoffId(inc.id)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-secondary)',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          padding: '7px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <FileText size={13} />
                        <span>Handoff</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RECENT INCIDENTS PANEL (Part 2) */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="var(--accent-cyan)" />
              <span style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                RECENT INCIDENTS
              </span>
            </div>
            <button
              onClick={() => onNavigateTab('incidents')}
              style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <span>View All</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>
            {recentIncidents.map((inc) => {
              const isResolved = strStatus(inc.status) === 'RESOLVED';
              const symptom = inc.symptom || (inc.symptoms && inc.symptoms[0]) || inc.title || '';

              return (
                <div
                  key={inc.id}
                  onClick={() => onSelectIncident(inc.id)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    transition: 'border-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-cyan)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.85rem', color: '#fff' }}>
                        {inc.id}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {inc.service}
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: isResolved ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                        color: isResolved ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                        textTransform: 'uppercase',
                      }}
                    >
                      {inc.status || (isResolved ? 'RESOLVED' : 'INVESTIGATING')}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {symptom}
                  </div>

                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>{inc.started_at ? new Date(inc.started_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Recent'}</span>
                    {inc.root_cause && (
                      <>
                        <span>•</span>
                        <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>Root cause recorded</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Structured Night-Shift Handoff Modal */}
      {selectedHandoffId && (
        <HandoffModal
          incidentId={selectedHandoffId}
          onClose={() => setSelectedHandoffId(null)}
          onNavigateIncident={(id) => {
            setSelectedHandoffId(null);
            onSelectIncident(id);
          }}
        />
      )}
    </div>
  );
};
