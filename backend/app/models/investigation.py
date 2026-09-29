from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class SimilarIncidentMatch(BaseModel):
    id: str
    title: str
    service: str
    error_type: str
    similarity: float
    root_cause: str
    resolution: str
    match_reasons: List[str] = Field(default_factory=list)

class MemoryEvidenceNode(BaseModel):
    incident_id: str
    similarity: float
    matched_factors: List[str]
    applied_resolution: str

class MemoryEvidenceChain(BaseModel):
    current_incident_id: str
    current_error: str
    query_vector: str
    matched_nodes: List[MemoryEvidenceNode]
    common_pattern: str
    confidence_score: float

class RecommendedAction(BaseModel):
    step: int
    action: str
    category: str # 'verification' | 'mitigation' | 'rollback' | 'runbook'
    runbook_id: Optional[str] = None
    command: Optional[str] = None
    why: Optional[str] = None # Explainability layer

class AuditTrailEvent(BaseModel):
    time: str
    action: str
    actor: str # e.g. 'OpsMind Agent (Brain 1)', 'Hindsight (Brain 2)', 'Nikhil (DevOps Lead)'

class InvestigationResult(BaseModel):
    incident_id: str
    status: str # 'INVESTIGATING' | 'IDENTIFIED' | 'MITIGATING' | 'RESOLVED'
    
    # Dual-Brain Architecture
    mode: str = "BRAIN_2_MEMORY_MATCH" # 'BRAIN_1_INVESTIGATION' | 'BRAIN_2_MEMORY_MATCH'
    lifecycle_state: str = "HYPOTHESIS" # 'HYPOTHESIS' (🟡) | 'INVESTIGATION' (🔵) | 'CONFIRMED' (🟢)
    memory_confidence: str = "HIGH" # 'HIGH' | 'MEDIUM' | 'LOW'
    
    similar_incidents_count: int
    similar_matches: List[SimilarIncidentMatch]
    likely_root_cause: str
    hypothesis: Optional[str] = None
    confidence_level: str # 'High (92%)' | 'Medium (75%)' | 'Low (No historical match)'
    confidence_score: float
    
    active_evidence_points: List[str] = Field(default_factory=list)
    recommended_actions: List[RecommendedAction]
    evidence_chain: MemoryEvidenceChain
    summary_analysis: str
    why_explanation: Optional[str] = None
    llm_source: str = "Groq Llama 3.3 70B"
    audit_trail: List[AuditTrailEvent] = Field(default_factory=list)
