import React from 'react';
import { Brain, ArrowDown, Database, CheckCircle, ShieldAlert, X, GitBranch, Cpu } from 'lucide-react';
import { MemoryEvidenceChain } from '../types/incident';
import { formatPercent } from '../utils/formatters';

interface MemoryEvidenceGraphProps {
  evidenceChain: MemoryEvidenceChain;
  onClose?: () => void;
}

export const MemoryEvidenceGraph: React.FC<MemoryEvidenceGraphProps> = ({
  evidenceChain,
  onClose,
}) => {
  const evidenceList = [
    {
      id: 'INC-104',
      similarity: 0.92,
      subtitle: 'Same error + same service',
      resolution: 'Increased connection pool size (50 -> 100) & restarted payment-service pods.',
      outcome: 'Full recovery within 4 minutes.',
    },
    {
      id: 'INC-117',
      similarity: 0.87,
      subtitle: 'Similar post-deployment pattern',
      resolution: 'Immediate rollback of deployment v1.9.4 + database pool limit increase to 120.',
      outcome: 'Starvation mitigated with zero transaction loss.',
    },
    {
      id: 'INC-121',
      similarity: 0.81,
      subtitle: 'Database timeout & socket saturation',
      resolution: 'Adjusted connection limit per pod in Helm chart and scaled PgBouncer connection poolers.',
      outcome: 'Prevented TCP socket exhaustion.',
    },
  ];

  return (
    <div
      style={{
        background: 'rgba(11, 15, 25, 0.98)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(6, 182, 212, 0.3)',
        borderRadius: '16px',
        padding: '28px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(6, 182, 212, 0.15)',
        position: 'relative',
        animation: 'fadeIn 0.3s ease',
      }}
    >
      {onClose && (
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-muted)',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={18} />
        </button>
      )}

      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="logo-badge" style={{ width: '32px', height: '32px' }}>
            <Brain size={18} color="#fff" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
              Hindsight Memory Reasoning Chain
            </h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Transparent episodic retrieval graph & multi-hop evidence correlation
            </div>
          </div>
        </div>
      </div>

      {/* Visual Memory Chain Graph */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.6)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '28px',
        }}
      >
        {/* Node 1: Current Incident */}
        <div
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.4)',
            color: '#fb7185',
            fontWeight: 700,
            fontSize: '0.88rem',
            textAlign: 'center',
          }}
        >
          CURRENT INCIDENT: {evidenceChain.current_incident_id} (HTTP 503 Error)
        </div>

        <ArrowDown size={18} color="var(--text-muted)" />

        {/* Node 2: Hindsight Memory Search */}
        <div
          style={{
            padding: '8px 18px',
            borderRadius: '8px',
            background: 'rgba(6, 182, 212, 0.15)',
            border: '1px solid rgba(6, 182, 212, 0.4)',
            color: 'var(--accent-cyan)',
            fontWeight: 700,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Brain size={16} />
          Hindsight Vector Memory Search: [query: payment-service 503 pool]
        </div>

        <ArrowDown size={18} color="var(--text-muted)" />

        {/* Node 3: 3 Correlated Historical Incidents */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', width: '100%', maxWidth: '680px' }}>
          {evidenceList.map((ev) => (
            <div
              key={ev.id}
              style={{
                padding: '12px',
                borderRadius: '8px',
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.35)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff', fontFamily: 'var(--font-mono)' }}>
                {ev.id}
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-purple)', marginTop: '2px' }}>
                {formatPercent(ev.similarity)} Match
              </div>
            </div>
          ))}
        </div>

        <ArrowDown size={18} color="var(--text-muted)" />

        {/* Node 4: Common Root Cause Pattern */}
        <div
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.15))',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: 'var(--accent-emerald)',
            fontWeight: 700,
            fontSize: '0.95rem',
            textAlign: 'center',
          }}
        >
          Common Root Cause Pattern: Database Connection Pool Exhaustion
        </div>
      </div>

      {/* Detailed Evidence Cards */}
      <h4 style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '14px' }}>
        Why Did OpsMind Recommend This? (Memory Evidence)
      </h4>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {evidenceList.map((ev, index) => (
          <div
            key={ev.id}
            style={{
              padding: '16px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                Evidence {index + 1}
              </span>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-purple)', fontFamily: 'var(--font-mono)' }}>
                {ev.id}
              </span>
            </div>

            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>
              {ev.subtitle}
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              <strong style={{ color: 'var(--text-primary)' }}>Resolution: </strong>
              {ev.resolution}
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle size={12} />
              {ev.outcome}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
