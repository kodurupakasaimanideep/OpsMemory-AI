import React from 'react';
import { Incident } from '../types/incident';
import { IncidentCard } from './IncidentCard';
import { AlertCircle } from 'lucide-react';

interface IncidentListProps {
  incidents: Incident[];
  onSelectIncident: (id: string) => void;
  selectedId?: string;
}

export const IncidentList: React.FC<IncidentListProps> = ({
  incidents,
  onSelectIncident,
  selectedId,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {incidents.map((incident) => (
        <IncidentCard
          key={incident.id}
          incident={incident}
          onClick={() => onSelectIncident(incident.id)}
          isSelected={selectedId === incident.id}
        />
      ))}
      {incidents.length === 0 && (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No active incidents in this queue.
        </div>
      )}
    </div>
  );
};
