from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class DeploymentInfo(BaseModel):
    service: str
    version: str
    deployed_at: Optional[str] = None
    author: Optional[str] = None
    commit_hash: Optional[str] = None
    changes_summary: Optional[str] = None

class TelemetryData(BaseModel):
    cpu_percent: float = 0.0
    memory_percent: float = 0.0
    error_count: int = 0
    p99_latency_sec: float = 0.0
    db_active_connections: Optional[int] = None
    db_max_connections: Optional[int] = None

class TimelineEvent(BaseModel):
    time: str
    event: str
    type: str # 'deploy' | 'warning' | 'error' | 'agent' | 'resolved'

class IncidentBase(BaseModel):
    id: str
    title: str
    service: str
    error_type: str
    severity: str # 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
    status: str # 'INVESTIGATING' | 'IDENTIFIED' | 'MITIGATING' | 'RESOLVED'
    started_at: str
    resolved_at: Optional[str] = None
    duration_min: Optional[int] = 0
    deployment: Optional[DeploymentInfo] = None
    symptoms: List[str] = Field(default_factory=list)
    root_cause: Optional[str] = None
    resolution: Optional[str] = None
    verification: Optional[str] = None
    engineer: Optional[str] = None
    shift: Optional[str] = None
    investigation_steps: Optional[List[str]] = Field(default_factory=list)
    findings: Optional[List[str]] = Field(default_factory=list)
    actions_taken: Optional[List[str]] = Field(default_factory=list)
    recommendations: Optional[List[str]] = Field(default_factory=list)
    engineer_feedback: Optional[str] = None
    similarity_score: Optional[float] = None
    telemetry: Optional[TelemetryData] = None
    logs_excerpt: Optional[List[str]] = Field(default_factory=list)
    timeline: Optional[List[TimelineEvent]] = Field(default_factory=list)


class IncidentCreate(BaseModel):
    id: Optional[str] = None
    title: Optional[str] = None
    service: str
    error_type: Optional[str] = None
    severity: str = "HIGH"
    symptoms: Optional[List[str]] = Field(default_factory=list)
    symptom: Optional[str] = None
    observations: Optional[List[str]] = Field(default_factory=list)
    status: Optional[str] = "INVESTIGATING"
    root_cause: Optional[str] = None
    resolution: Optional[str] = None
    deployment_version: Optional[str] = None
    logs: Optional[str] = None

class IncidentMemoryPayload(BaseModel):
    id: Optional[str] = None
    service: str
    title: Optional[str] = None
    symptom: Optional[str] = None
    symptoms: Optional[List[str]] = Field(default_factory=list)
    observations: Optional[List[str]] = Field(default_factory=list)
    status: Optional[str] = "unresolved investigation"
    root_cause: Optional[str] = None
    resolution: Optional[str] = None
    error_type: Optional[str] = None
    severity: Optional[str] = "HIGH"
