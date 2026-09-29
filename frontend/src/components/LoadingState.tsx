import React from 'react';
import { Loader2, Brain } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  subtext?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Searching Hindsight Memory...',
  subtext = 'Correlating symptoms against 2,481 historical incidents...',
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
        gap: '16px',
      }}
    >
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(6, 182, 212, 0.1)',
          border: '1px solid rgba(6, 182, 212, 0.25)',
        }}
      >
        <Brain size={28} color="var(--accent-cyan)" />
        <Loader2
          size={56}
          color="var(--accent-cyan)"
          style={{
            position: 'absolute',
            animation: 'spin 1.5s linear infinite',
            opacity: 0.8,
          }}
        />
      </div>
      <div>
        <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{message}</div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>{subtext}</div>
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
