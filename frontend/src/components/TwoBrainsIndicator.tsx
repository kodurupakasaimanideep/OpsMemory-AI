import React from 'react';
import { Brain, Cpu, Database, Sparkles, CheckCircle2, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';

interface TwoBrainsIndicatorProps {
  mode: 'BRAIN_1_INVESTIGATION' | 'BRAIN_2_MEMORY_MATCH';
  confidenceLevel: string;
  similarCount: number;
}

export const TwoBrainsIndicator: React.FC<TwoBrainsIndicatorProps> = ({
  mode,
  confidenceLevel,
  similarCount,
}) => {
  const isBrain1 = mode === 'BRAIN_1_INVESTIGATION';
  const isBrain2 = mode === 'BRAIN_2_MEMORY_MATCH';

  return (
    <div
      style={{
        padding: '16px 20px',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.7))',
        border: '1px solid var(--border-color)',
        marginBottom: '20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Brain size={18} color="var(--accent-purple)" />
          <span style={{ fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#fff' }}>
            DUAL-BRAIN REASONING ARCHITECTURE
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <HelpCircle size={14} />
          <span>Learns automatically after engineer confirmation</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
        {/* Brain 1: Investigation Engine */}
        <div
          style={{
            padding: '14px 16px',
            borderRadius: '10px',
            background: isBrain1
              ? 'rgba(245, 158, 11, 0.12)'
              : 'rgba(255, 255, 255, 0.02)',
            border: isBrain1
              ? '1.5px solid var(--accent-amber)'
              : '1px solid rgba(255, 255, 255, 0.06)',
            boxShadow: isBrain1 ? '0 0 20px rgba(245, 158, 11, 0.15)' : 'none',
            transition: 'all 0.3s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu size={16} color={isBrain1 ? 'var(--accent-amber)' : 'var(--text-muted)'} />
              <span style={{ fontWeight: 800, fontSize: '0.88rem', color: isBrain1 ? '#fff' : 'var(--text-secondary)' }}>
                Brain 1 — AI Investigation Engine
              </span>
            </div>
            {isBrain1 && (
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: 'var(--accent-amber)',
                  color: '#000',
                }}
              >
                ACTIVE NOW
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            <strong>Handles novel / unseen incidents:</strong> Ingests live telemetry, error logs, and deployment diffs to synthesize an evidence-backed hypothesis. Does not invent previous history.
          </div>
        </div>

        {/* Brain 2: Hindsight Memory Engine */}
        <div
          style={{
            padding: '14px 16px',
            borderRadius: '10px',
            background: isBrain2
              ? 'rgba(6, 182, 212, 0.12)'
              : 'rgba(255, 255, 255, 0.02)',
            border: isBrain2
              ? '1.5px solid var(--accent-cyan)'
              : '1px solid rgba(255, 255, 255, 0.06)',
            boxShadow: isBrain2 ? '0 0 20px rgba(6, 182, 212, 0.15)' : 'none',
            transition: 'all 0.3s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={16} color={isBrain2 ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
              <span style={{ fontWeight: 800, fontSize: '0.88rem', color: isBrain2 ? '#fff' : 'var(--text-secondary)' }}>
                Brain 2 — Hindsight Memory Bank
              </span>
            </div>
            {isBrain2 && (
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: 'var(--accent-cyan)',
                  color: '#000',
                }}
              >
                ACTIVE NOW ({similarCount} MATCHES)
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            <strong>Handles learned incidents:</strong> Matches active symptoms with historical organizational memory, surfacing proven root causes and verified resolutions.
          </div>
        </div>
      </div>
    </div>
  );
};
