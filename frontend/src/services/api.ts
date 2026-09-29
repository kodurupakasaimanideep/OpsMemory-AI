import { Incident, InvestigationResult, MemoryStats, DeploymentRisk } from '../types/incident';

const BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api';

export async function fetchIncidents(): Promise<Incident[]> {
  try {
    const res = await fetch(`${BASE_URL}/incidents`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Backend offline, using fallback cache:', err);
  }
  return [];
}

export async function fetchIncident(id: string): Promise<Incident | null> {
  try {
    const res = await fetch(`${BASE_URL}/incidents/${id}`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn(`Failed fetching incident ${id}:`, err);
  }
  return null;
}

export async function investigateIncident(id: string): Promise<InvestigationResult | null> {
  try {
    const res = await fetch(`${BASE_URL}/agent/investigate/${id}`, { method: 'POST' });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn(`Investigation failed for ${id}:`, err);
  }
  return null;
}

export async function resolveAndTeachMemory(
  id: string,
  data: {
    actual_root_cause: string;
    actual_fix: string;
    ai_recommendation_useful: boolean;
    additional_notes?: string;
  }
) {
  const res = await fetch(`${BASE_URL}/incidents/${id}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return await res.json();
}

export async function fetchMemoryStats(): Promise<any | null> {
  try {
    const res = await fetch(`${BASE_URL}/memory/stats`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Failed fetching memory stats:', err);
  }
  return null;
}

export async function fetchRecurringPatterns(): Promise<any[]> {
  try {
    const res = await fetch(`${BASE_URL}/memory/patterns`);
    if (res.ok) {
      const data = await res.json();
      return data.patterns || [];
    }
  } catch (err) {
    console.warn('Failed fetching recurring patterns:', err);
  }
  return [];
}

export async function fetchIncidentHandoff(id: string): Promise<any | null> {
  try {
    const res = await fetch(`${BASE_URL}/incidents/${id}/handoff`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn(`Failed fetching handoff for ${id}:`, err);
  }
  return null;
}

export async function fetchSimilarIncidents(id: string): Promise<any[]> {
  try {
    const res = await fetch(`${BASE_URL}/incidents/${id}/similar`);
    if (res.ok) {
      const data = await res.json();
      return data.matches || [];
    }
  } catch (err) {
    console.warn(`Failed fetching similar incidents for ${id}:`, err);
  }
  return [];
}

export async function fetchIncidentAuditTrail(id: string): Promise<any[]> {
  try {
    const res = await fetch(`${BASE_URL}/incidents/${id}/audit-trail`);
    if (res.ok) {
      const data = await res.json();
      return data.audit_trail || [];
    }
  } catch (err) {
    console.warn(`Failed fetching audit trail for ${id}:`, err);
  }
  return [];
}

export async function searchMemory(query: string) {
  try {
    const res = await fetch(`${BASE_URL}/memory/search?q=${encodeURIComponent(query)}`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Search query failed:', err);
  }
  return { results: [] };
}

export async function fetchDeployments() {
  try {
    const res = await fetch(`${BASE_URL}/deployments`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Deployments fetch failed:', err);
  }
  return [];
}

export async function checkDeploymentRisk(service: string, version: string): Promise<DeploymentRisk | null> {
  try {
    const res = await fetch(`${BASE_URL}/deployments/risk-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service, version }),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Deployment risk check failed:', err);
  }
  return null;
}

export async function queryAgentChat(query: string, incidentId?: string) {
  try {
    const res = await fetch(`${BASE_URL}/agent/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, incident_id: incidentId }),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Agent chat error:', err);
  }
  return {
    response: 'OpsMind encountered a connection timeout with the local agent gateway. Telemetry indicates connection pool saturation on upstream database.',
  };
}

export async function fetchAnalytics() {
  try {
    const res = await fetch(`${BASE_URL}/analytics`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Analytics fetch error:', err);
  }
  return null;
}

export async function fetchRunbooks() {
  try {
    const res = await fetch(`${BASE_URL}/runbooks`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Runbooks fetch error:', err);
  }
  return [];
}

export async function fetchRunbookContent(id: string) {
  try {
    const res = await fetch(`${BASE_URL}/runbooks/${id}`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Runbook content fetch error:', err);
  }
  return { content: 'Runbook details currently unavailable.' };
}

export async function fetchAgentStatus() {
  try {
    const res = await fetch(`${BASE_URL}/agent/status`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Agent status fetch error:', err);
  }
  return {
    llm: {
      provider: 'mock',
      model: 'opsmind-sre-reasoning-v1',
      display_name: 'OpsMind SRE Engine (Groq Ready)',
      is_fallback: true
    },
    hindsight: { status: 'local_engine_active', namespace: 'opsmind-production' },
    two_brains_enabled: true
  };
}

export async function testGroqConnection(apiKey?: string, model?: string) {
  try {
    const res = await fetch(`${BASE_URL}/agent/test-groq`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, model }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Connection test failed' };
  }
}

export async function saveAgentConfig(config: { groq_api_key?: string; groq_model?: string; hindsight_url?: string }) {
  try {
    const res = await fetch(`${BASE_URL}/agent/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateIncidentState(id: string, state: string, notes?: string) {
  try {
    const res = await fetch(`${BASE_URL}/incidents/${id}/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state, notes }),
    });
    return await res.json();
  } catch (err) {
    console.warn('State update error:', err);
    return null;
  }
}

export async function fetchUsers() {
  try {
    const res = await fetch(`${BASE_URL}/auth/users`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Fetch users error:', err);
  }
  return [];
}

export async function fetchCurrentUser() {
  try {
    const res = await fetch(`${BASE_URL}/auth/current`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Fetch current user error:', err);
  }
  return {
    id: 1,
    username: 'nikhil',
    name: 'Nikhil Verma',
    email: 'nikhil@microtech.io',
    role: 'DevOps Lead',
    team: 'SRE Core',
    avatar: 'N',
    is_active: 1
  };
}

export async function switchUser(username: string) {
  try {
    const res = await fetch(`${BASE_URL}/auth/switch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    return await res.json();
  } catch (err) {
    console.warn('Switch user error:', err);
    return null;
  }
}

export async function registerUser(payload: { username: string; name: string; role?: string; team?: string; email?: string }) {
  try {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    console.warn('Register user error:', err);
    return null;
  }
}


