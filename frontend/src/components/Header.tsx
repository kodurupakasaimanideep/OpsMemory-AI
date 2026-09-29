import React, { useState, useEffect } from 'react';
import { Bell, ShieldCheck, Zap, Sparkles, Cpu, Layers, Users, ChevronDown, FileCode2, Server, LayoutDashboard } from 'lucide-react';
import { fetchAgentStatus } from '../services/api';
import { UserProfile } from '../types/incident';

interface HeaderProps {
  currentUser?: UserProfile;
  activeTab?: string;
  onNavigateTab?: (tab: string) => void;
  onOpenQuickSearch?: () => void;
  onSimulateIncident?: () => void;
  onOpenUserSwitcher?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  currentUser,
  activeTab = 'overview',
  onNavigateTab,
  onOpenQuickSearch, 
  onSimulateIncident,
  onOpenUserSwitcher,
}) => {
  const [engineStatus, setEngineStatus] = useState<any>(null);

  useEffect(() => {
    async function checkStatus() {
      const data = await fetchAgentStatus();
      setEngineStatus(data);
    }
    checkStatus();
  }, []);

  const isGroq = engineStatus?.llm?.provider === 'groq';
  const userName = currentUser?.name || 'Nikhil Verma';
  const userRole = currentUser?.role || 'DevOps Lead';
  const userTeam = currentUser?.team || 'SRE Core';
  const userAvatar = currentUser?.avatar || userName[0];

  return (
    <header className="top-header">
      <div className="header-title-area">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.01em', color: '#fff' }}>
            OpsMemory AI
          </span>
          <span style={{ fontSize: '0.75rem', color: engineStatus?.hindsight?.external_connected ? 'var(--accent-emerald)' : 'var(--accent-cyan)', background: engineStatus?.hindsight?.external_connected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(6, 182, 212, 0.12)', border: `1px solid ${engineStatus?.hindsight?.external_connected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(6, 182, 212, 0.3)'}`, padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
            {engineStatus?.hindsight?.external_connected ? '🟢 External Hindsight Connected' : '💾 Local Persistent Memory'}
          </span>
          <span
            style={{
              fontSize: '0.72rem',
              color: isGroq ? 'var(--accent-amber)' : 'var(--accent-purple)',
              background: isGroq ? 'rgba(245, 158, 11, 0.12)' : 'rgba(139, 92, 246, 0.12)',
              border: `1px solid ${isGroq ? 'rgba(245, 158, 11, 0.3)' : 'rgba(139, 92, 246, 0.3)'}`,
              padding: '2px 8px',
              borderRadius: '4px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Zap size={11} />
            <span>{isGroq ? '⚡ Groq Accelerated' : '🧠 OpsMind Dual-Brain'}</span>
          </span>
        </div>
      </div>

      <div className="header-meta">
        <div className="live-pulse">
          <div className="pulse-dot"></div>
          <span>Live Telemetry</span>
        </div>

        {onSimulateIncident && (
          <button 
            className="btn-secondary" 
            onClick={onSimulateIncident}
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
            title="Simulate a new production spike"
          >
            <Zap size={14} color="var(--accent-amber)" />
            <span>Simulate Spike</span>
          </button>
        )}

        <button className="icon-btn" title="3 Unresolved Production Alerts">
          <Bell size={18} />
          <span className="icon-badge">3</span>
        </button>

        {/* Dynamic Database User Profile with Switcher */}
        <div 
          className="user-profile" 
          onClick={onOpenUserSwitcher}
          title="Click to switch person or add a new team member"
          style={{ cursor: 'pointer', padding: '6px 10px', borderRadius: '8px', transition: 'background 0.2s', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <div className="avatar" style={{ background: 'linear-gradient(135deg, var(--accent-cyan), #0284c7)', color: '#000', fontWeight: 800 }}>
            {userAvatar}
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>{userName}</span>
              <ChevronDown size={12} color="var(--text-muted)" />
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {userRole} · {userTeam}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

