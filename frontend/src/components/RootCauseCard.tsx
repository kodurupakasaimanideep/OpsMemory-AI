import React from 'react';
import { Sparkles, CheckCircle, ShieldCheck, AlertCircle, Search, CheckCircle2 } from 'lucide-react';
import { InvestigationResult } from '../types/incident';

interface RootCauseCardProps {
  investigation: InvestigationResult;
  currentState?: 'HYPOTHESIS' | 'INVESTIGATION' | 'CONFIRMED';
  onStateChange?: (state: 'HYPOTHESIS' | 'INVESTIGATION' | 'CONFIRMED') => void;
}

export const RootCauseCard: React.FC<RootCauseCardProps> = ({
  investigation,
  currentState = 'HYPOTHESIS',
  onStateChange,
}) => {
  const isBrain1 = investigation.mode === 'BRAIN_1_INVESTIGATION';

  return (
    <div
      style={{
        padding: '20px',
        borderRadius: '12px',
        background: isBrain1
          ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(15, 23, 42, 0.9))'
          : 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(6, 182, 212, 0.08))',
        border: isBrain1
          ? '1px solid rgba(245, 158, 11, 0.3)'
          : '1px solid rgba(139, 92, 246, 0.25)',
      }}
    >
      {/* 3-State Lifecycle Bar */}
      <div style={{ marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            ENGINEER VALIDATION STATE
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Only confirmed findings enter Hindsight memory
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          <button
            type="button"
            onClick={() => onStateChange && onStateChange('HYPOTHESIS')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 10px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: currentState === 'HYPOTHESIS' ? '1.5px solid var(--accent-amber)' : '1px solid var(--border-color)',
              background: currentState === 'HYPOTHESIS' ? 'rgba(245, 158, 11, 0.18)' : 'rgba(255, 255, 255, 0.03)',
              color: currentState === 'HYPOTHESIS' ? 'var(--accent-amber)' : 'var(--text-muted)',
              transition: 'all 0.2s',
            }}
          >
            <span>🟡</span>
            <span>1. Hypothesis</span>
          </button>

          <button
            type="button"
            onClick={() => onStateChange && onStateChange('INVESTIGATION')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 10px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: currentState === 'INVESTIGATION' ? '1.5px solid var(--accent-blue)' : '1px solid var(--border-color)',
              background: currentState === 'INVESTIGATION' ? 'rgba(59, 130, 246, 0.18)' : 'rgba(255, 255, 255, 0.03)',
              color: currentState === 'INVESTIGATION' ? 'var(--accent-blue)' : 'var(--text-muted)',
              transition: 'all 0.2s',
            }}
          >
            <span>🔵</span>
            <span>2. Investigation</span>
          </button>

          <button
            type="button"
            onClick={() => onStateChange && onStateChange('CONFIRMED')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 10px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: currentState === 'CONFIRMED' ? '1.5px solid var(--accent-emerald)' : '1px solid var(--border-color)',
              background: currentState === 'CONFIRMED' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255, 255, 255, 0.03)',
              color: currentState === 'CONFIRMED' ? 'var(--accent-emerald)' : 'var(--text-muted)',
              transition: 'all 0.2s',
            }}
          >
            <span>🟢</span>
            <span>3. Confirmed</span>
          </button>
        </div>
      </div>

      {/* Header with Brain badge and confidence */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} color={isBrain1 ? 'var(--accent-amber)' : 'var(--accent-purple)'} />
          <span
            style={{
              fontSize: '0.85rem',
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: isBrain1 ? 'var(--accent-amber)' : 'var(--accent-purple)',
            }}
          >
            {isBrain1 ? 'AI INVESTIGATION HYPOTHESIS' : 'HISTORICAL MEMORY MATCH'}
          </span>
        </div>
        <div
          style={{
            fontSize: '0.75rem',
            padding: '3px 10px',
            borderRadius: '999px',
            background: isBrain1 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            color: isBrain1 ? 'var(--accent-amber)' : 'var(--accent-emerald)',
            fontWeight: 700,
            border: isBrain1 ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
          }}
        >
          {investigation.confidence_level}
        </div>
      </div>

      {/* Root cause title */}
      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
        {investigation.likely_root_cause}
      </div>

      {/* Summary analysis */}
      <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '14px' }}>
        {investigation.summary_analysis}
      </div>

      {/* Active evidence points list */}
      {investigation.active_evidence_points && investigation.active_evidence_points.length > 0 && (
        <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Current Correlated Evidence
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {investigation.active_evidence_points.map((point, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                <span style={{ color: isBrain1 ? 'var(--accent-amber)' : 'var(--accent-cyan)', fontWeight: 800 }}>✓</span>
                <span>{point}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
