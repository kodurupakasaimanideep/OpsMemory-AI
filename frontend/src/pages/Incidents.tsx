import React, { useState } from 'react';
import { Incident } from '../types/incident';
import { IncidentCard } from '../components/IncidentCard';
import { ShieldAlert, CheckCircle2, Filter, Search, Plus } from 'lucide-react';

interface IncidentsProps {
  incidents: Incident[];
  onSelectIncident: (id: string) => void;
  onSimulateIncident?: () => void;
}

export const Incidents: React.FC<IncidentsProps> = ({
  incidents,
  onSelectIncident,
  onSimulateIncident,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredIncidents = incidents.filter((inc) => {
    const matchesStatus =
      filterStatus === 'ALL' ||
      (filterStatus === 'ACTIVE' && inc.status === 'INVESTIGATING') ||
      (filterStatus === 'RESOLVED' && inc.status === 'RESOLVED');

    const matchesSearch =
      inc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.error_type.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="page-view">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>Production Incidents</h1>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Real-time telemetry triage & historical resolution records
          </div>
        </div>

        {onSimulateIncident && (
          <button className="btn-primary" onClick={onSimulateIncident}>
            <Plus size={16} />
            <span>Simulate New Incident</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['ALL', 'ACTIVE', 'RESOLVED'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: `1px solid ${filterStatus === status ? 'var(--accent-cyan)' : 'var(--border-color)'}`,
                background: filterStatus === status ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                color: filterStatus === status ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {status}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-input)', padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', minWidth: '280px' }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search by ID, service, error..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ background: 'none', border: 'none', color: '#fff', fontSize: '0.85rem', outline: 'none', width: '100%' }}
          />
        </div>
      </div>

      {/* Incidents List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredIncidents.map((incident) => (
          <IncidentCard
            key={incident.id}
            incident={incident}
            onClick={() => onSelectIncident(incident.id)}
          />
        ))}

        {filteredIncidents.length === 0 && (
          <div className="glass-card" style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
            No incidents match your current filter criteria.
          </div>
        )}
      </div>
    </div>
  );
};
