import React from 'react';
import { Brain, ExternalLink, GitCommit } from 'lucide-react';
import { SimilarIncidentMatch } from '../types/incident';
import { formatPercent } from '../utils/formatters';

interface MemoryCardProps {
  similarMatches: SimilarIncidentMatch[];
  onSelectMatch?: (match: SimilarIncidentMatch) => void;
  onViewEvidence?: () => void;
}

export const MemoryCard: React.FC<MemoryCardProps> = ({
  similarMatches,
  onSelectMatch,
  onViewEvidence,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Brain size={18} color="var(--accent-cyan)" />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            HINDSIGHT MEMORY INSIGHTS
          </span>
        </div>
        <span style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
          {similarMatches.length} Similar Found
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {similarMatches.map((match) => (
          <div
            key={match.id}
            onClick={() => onSelectMatch && onSelectMatch(match)}
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            className="incident-item-hover"
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {match.id}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  • {match.service}
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Fix: {match.resolution.slice(0, 50)}...
              </div>
            </div>

            <div
              style={{
                fontSize: '0.85rem',
                fontWeight: 800,
                color: match.similarity >= 0.9 ? 'var(--accent-cyan)' : 'var(--accent-purple)',
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '4px 8px',
                borderRadius: '6px',
              }}
            >
              {formatPercent(match.similarity)}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          padding: '12px 14px',
          borderRadius: '8px',
          background: 'rgba(6, 182, 212, 0.06)',
          border: '1px dashed rgba(6, 182, 212, 0.25)',
          fontSize: '0.82rem',
          color: 'var(--text-secondary)',
        }}
      >
        <span style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>Root Cause Pattern: </span>
        DB connection pool saturation post-deployment across 4 historical incidents.
      </div>
    </div>
  );
};
