import React from 'react';
import { Incident } from '../types/incident';
import { SeverityBadge } from './SeverityBadge';
import { ArrowRight, Clock, ShieldAlert } from 'lucide-react';

interface IncidentCardProps {
  incident: Incident;
  onClick: () => void;
  isSelected?: boolean;
}

export const IncidentCard: React.FC<IncidentCardProps> = ({ incident, onClick, isSelected }) => {
  const getDotColor = () => {
    if (incident.severity === 'CRITICAL') return 'var(--accent-rose)';
    if (incident.severity === 'HIGH') return 'var(--accent-amber)';
    return 'var(--accent-blue)';
  };

  return (
    <div
      onClick={onClick}
      style={{
        padding: '16px 20px',
        borderRadius: '10px',
        background: isSelected ? 'rgba(6, 182, 212, 0.08)' : 'rgba(255, 255, 255, 0.02)',
        border: `1px solid ${isSelected ? 'rgba(6, 182, 212, 0.3)' : 'var(--border-color)'}`,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
      }}
      className="incident-item-hover"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: getDotColor(),
            boxShadow: `0 0 8px ${getDotColor()}`,
            flexShrink: 0,
          }}
        />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              {incident.service}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {incident.id}
            </span>
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {incident.error_type} {incident.deployment?.version && `• Deploy ${incident.deployment.version}`}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <SeverityBadge severity={incident.severity} />
        <ArrowRight size={16} color="var(--text-muted)" />
      </div>
    </div>
  );
};
