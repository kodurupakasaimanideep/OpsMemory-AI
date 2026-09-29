export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type IncidentStatus = 'INVESTIGATING' | 'IDENTIFIED' | 'MITIGATING' | 'RESOLVED';

export interface UserProfile {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
  team: string;
  avatar: string;
  is_active: number;
}

export interface DeploymentInfo {
  service: string;
  version: string;
  deployed_at?: string;
  author?: string;
  commit_hash?: string;
  changes_summary?: string;
}

export interface TelemetryData {
  cpu_percent: number;
  memory_percent: number;
  error_count: number;
  p99_latency_sec: number;
  db_active_connections?: number;
  db_max_connections?: number;
}

export interface TimelineEvent {
  time: string;
  event: string;
  type: 'deploy' | 'warning' | 'error' | 'agent' | 'resolved';
}

export interface Incident {
  id: string;
  incident_id?: string;
  title: string;
  service: string;
  error_type: string;
  severity: Severity;
  status: IncidentStatus | string;
  started_at: string;
  resolved_at?: string;
  duration_min?: number;
  deployment?: DeploymentInfo;
  symptom?: string;
  symptoms: string[];
  observations?: string[];
  evidence?: string[];
  verification?: string[];
  root_cause?: string;
  resolution?: string;
  engineer_feedback?: string;
  similarity_score?: number;
  telemetry?: TelemetryData;
  logs_excerpt?: string[];
  timeline?: TimelineEvent[];
}

export interface SimilarIncidentMatch {
  id: string;
  title: string;
  service: string;
  error_type: string;
  similarity: number;
  root_cause: string;
  resolution: string;
  match_reasons: string[];
}

export interface MemoryEvidenceNode {
  incident_id: string;
  similarity: number;
  matched_factors: string[];
  applied_resolution: string;
}

export interface MemoryEvidenceChain {
  current_incident_id: string;
  current_error: string;
  query_vector: string;
  matched_nodes: MemoryEvidenceNode[];
  common_pattern: string;
  confidence_score: number;
}

export interface RecommendedAction {
  step: number;
  action: string;
  category: 'verification' | 'mitigation' | 'rollback' | 'runbook';
  runbook_id?: string;
  command?: string;
  why?: string;
}

export interface AuditTrailEvent {
  time: string;
  action: string;
  actor: string;
}

export interface InvestigationResult {
  incident_id: string;
  status: string;
  mode?: 'BRAIN_1_INVESTIGATION' | 'BRAIN_2_MEMORY_MATCH';
  lifecycle_state?: 'HYPOTHESIS' | 'INVESTIGATION' | 'CONFIRMED';
  memory_confidence?: string;
  similar_incidents_count: number;
  similar_matches: SimilarIncidentMatch[];
  likely_root_cause: string;
  hypothesis?: string;
  confidence_level: string;
  confidence_score: number;
  active_evidence_points?: string[];
  recommended_actions: RecommendedAction[];
  evidence_chain: MemoryEvidenceChain;
  summary_analysis: string;
  why_explanation?: string;
  llm_source?: string;
  audit_trail?: AuditTrailEvent[];
}

export interface MemoryStats {
  categories: {
    incidents: number;
    root_causes: number;
    resolutions: number;
    runbooks: number;
    deployment_patterns: number;
  };
  recently_learned: Array<{
    id: string;
    title: string;
    learned_from: string;
    related_incidents_count: number;
    related_incidents: string[];
    resolution_stats: Array<{ action: string; resolved_count: number }>;
    confidence: number;
    last_updated: string;
    service?: string;
    error_type?: string;
  }>;
  total_memories: number;
}

export interface DeploymentRisk {
  service: string;
  version: string;
  risk_level: 'HIGH' | 'MEDIUM' | 'LOW';
  risk_score: number;
  warning_message: string;
  related_incidents: string[];
  common_pattern: string;
  checks: Array<{ title: string; status: 'passed' | 'warning' | 'failed'; icon: string }>;
  recommendation: string;
}
