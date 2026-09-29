import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { UserSwitcherModal } from './components/UserSwitcherModal';
import { Dashboard } from './pages/Dashboard';
import { Incidents } from './pages/Incidents';
import { IncidentDetailsPage } from './pages/IncidentDetailsPage';
import { Memory } from './pages/Memory';
import { Deployments } from './pages/Deployments';
import { Analytics } from './pages/Analytics';
import { Search } from './pages/Search';
import { Runbooks } from './pages/Runbooks';
import { Settings } from './pages/Settings';
import { useIncidents } from './hooks/useIncidents';
import { Incident, UserProfile } from './types/incident';
import { fetchCurrentUser } from './services/api';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [memoryCount, setMemoryCount] = useState<number>(2481);
  const [currentUser, setCurrentUser] = useState<UserProfile>({
    id: 1,
    username: 'nikhil',
    name: 'Nikhil Verma',
    email: 'nikhil@microtech.io',
    role: 'DevOps Lead',
    team: 'SRE Core',
    avatar: 'N',
    is_active: 1,
  });
  const [showUserModal, setShowUserModal] = useState<boolean>(false);

  const { incidents, loading, refresh, setIncidents } = useIncidents();

  useEffect(() => {
    async function loadUser() {
      const u = await fetchCurrentUser();
      if (u) setCurrentUser(u);
    }
    loadUser();
  }, []);

  const handleSelectIncident = (id: string) => {
    setSelectedIncidentId(id);
  };

  const handleBackToIncidents = () => {
    setSelectedIncidentId(null);
    refresh();
  };

  const handleSimulateIncident = () => {
    const newInc: Incident = {
      id: `INC-${Math.floor(Math.random() * 800 + 300)}`,
      title: 'Payment Webhook Callback Timeout Spike',
      service: 'Payment API',
      error_type: 'HTTP 503',
      severity: 'CRITICAL',
      status: 'INVESTIGATING',
      started_at: new Date().toISOString(),
      duration_min: 1,
      deployment: {
        service: 'payment-service',
        version: 'v2.4.2',
        deployed_at: new Date().toISOString(),
      },
      symptoms: [
        'Payment callback queue backlog reached 15,000 tasks',
        'Database connection pool saturated (50/50 sockets)',
        'Gateway timeouts on /api/v1/webhooks',
      ],
      telemetry: {
        cpu_percent: 52.1,
        memory_percent: 81.3,
        error_count: 1240,
        p99_latency_sec: 4.2,
      },
      timeline: [
        { time: 'Just now', event: 'Simulated HTTP 503 spike triggered', type: 'error' },
      ],
    };
    setIncidents([newInc, ...incidents]);
    setSelectedIncidentId(newInc.id);
  };

  const selectedIncident = incidents.find((i) => i.id === selectedIncidentId);

  return (
    <div className="app-container">
      <Sidebar
        activeTab={selectedIncidentId ? 'incidents' : activeTab}
        setActiveTab={(tab) => {
          setSelectedIncidentId(null);
          setActiveTab(tab);
        }}
        activeIncidentsCount={incidents.filter((i) => i.status === 'INVESTIGATING').length}
      />

      <div className="main-content">
        <Header
          currentUser={currentUser}
          onSimulateIncident={handleSimulateIncident}
          onOpenUserSwitcher={() => setShowUserModal(true)}
          onOpenQuickSearch={() => {
            setSelectedIncidentId(null);
            setActiveTab('search');
          }}
        />

        {selectedIncident ? (
          <IncidentDetailsPage
            incident={selectedIncident}
            onBack={handleBackToIncidents}
            onMemoryUpdated={(newCount) => setMemoryCount(newCount)}
          />
        ) : (
          <>
            {activeTab === 'overview' && (
              <Dashboard
                incidents={incidents}
                currentUser={currentUser}
                onSelectIncident={handleSelectIncident}
                onNavigateTab={setActiveTab}
                onOpenUserSwitcher={() => setShowUserModal(true)}
                memoryCount={memoryCount}
              />
            )}
            {activeTab === 'incidents' && (
              <Incidents
                incidents={incidents}
                onSelectIncident={handleSelectIncident}
                onSimulateIncident={handleSimulateIncident}
              />
            )}
            {activeTab === 'memory' && (
              <Memory
                memoryCount={memoryCount}
                onSelectIncident={handleSelectIncident}
              />
            )}
            {activeTab === 'deployments' && <Deployments />}
            {activeTab === 'analytics' && <Analytics />}
            {activeTab === 'search' && (
              <Search onSelectIncident={handleSelectIncident} />
            )}
            {activeTab === 'runbooks' && <Runbooks />}
            {activeTab === 'settings' && <Settings />}
          </>
        )}

        {showUserModal && (
          <UserSwitcherModal
            currentUser={currentUser}
            onClose={() => setShowUserModal(false)}
            onUserChanged={(user) => setCurrentUser(user)}
          />
        )}
      </div>
    </div>
  );
};

export default App;


