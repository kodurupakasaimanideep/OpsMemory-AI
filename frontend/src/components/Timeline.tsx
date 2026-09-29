import React from 'react';
import { Rocket, AlertCircle, Brain, CheckCircle2 } from 'lucide-react';
import { TimelineEvent } from '../types/incident';

interface TimelineProps {
  events?: TimelineEvent[];
}

export const Timeline: React.FC<TimelineProps> = ({ events }) => {
  const defaultEvents = events && events.length > 0 ? events : [
    { time: '10:25 AM', event: 'Deploy v2.4.1 rolled out to payment-service', type: 'deploy' },
    { time: '10:32 AM', event: 'Error spike: HTTP 503 threshold breached (>2% error rate)', type: 'error' },
    { time: '10:33 AM', event: 'Memory match: INC-104 (92%) & INC-117 (87%) correlated', type: 'agent' },
    { time: '10:46 AM', event: 'Resolution in progress: Increasing connection pool 50 -> 100', type: 'warning' },
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'deploy':
        return <Rocket size={16} color="var(--accent-cyan)" />;
      case 'error':
        return <AlertCircle size={16} color="var(--accent-rose)" />;
      case 'agent':
        return <Brain size={16} color="var(--accent-purple)" />;
      default:
        return <CheckCircle2 size={16} color="var(--accent-emerald)" />;
    }
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'deploy':
        return 'var(--accent-cyan)';
      case 'error':
        return 'var(--accent-rose)';
      case 'agent':
        return 'var(--accent-purple)';
      default:
        return 'var(--accent-emerald)';
    }
  };

  return (
    <div className="glass-card" style={{ marginTop: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            INCIDENT TIMELINE & EVOLUTION
          </span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', background: 'rgba(6, 182, 212, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
          Live Tracking
        </div>
      </div>

      <div style={{ position: 'relative', padding: '10px 0 20px 0' }}>
        {/* Horizontal connecting line */}
        <div
          style={{
            position: 'absolute',
            top: '24px',
            left: '5%',
            right: '5%',
            height: '2px',
            background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-rose), var(--accent-purple), var(--accent-emerald))',
            zIndex: 1,
            opacity: 0.5,
          }}
        />

        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${defaultEvents.length}, 1fr)`, position: 'relative', zIndex: 2, gap: '12px' }}>
          {defaultEvents.map((ev, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--bg-secondary)',
                  border: `2px solid ${getNodeColor(ev.type)}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 0 12px ${getNodeColor(ev.type)}40`,
                  marginBottom: '10px',
                }}
              >
                {getIcon(ev.type)}
              </div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: getNodeColor(ev.type) }}>
                {ev.time}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '180px', lineHeight: 1.3 }}>
                {ev.event}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
