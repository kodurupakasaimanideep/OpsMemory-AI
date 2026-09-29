import React from 'react';
import { 
  LayoutDashboard, 
  AlertTriangle, 
  Brain, 
  Rocket, 
  BarChart3, 
  Search, 
  BookOpen, 
  Settings,
  Cpu
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeIncidentsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, activeIncidentsCount = 3 }) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'incidents', label: 'Incidents', icon: AlertTriangle, badge: activeIncidentsCount > 0 ? activeIncidentsCount : undefined },
    { id: 'memory', label: 'Memory', icon: Brain },
    { id: 'deployments', label: 'Deployments', icon: Rocket },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'runbooks', label: 'Runbooks', icon: BookOpen },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-badge">
          <Brain size={22} color="#ffffff" />
        </div>
        <div>
          <div className="logo-text">OpsMemory AI</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hindsight Incident Agent</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
              style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left' }}
            >
              <Icon size={18} />
              <span>{item.label}</span>
              {item.badge !== undefined && (
                <span className="nav-badge">{item.badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <Cpu size={14} color="var(--accent-cyan)" />
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Hindsight Engine v2.4</span>
        </div>
        <div>Memory Bank: 2,481 records</div>
      </div>
    </aside>
  );
};


