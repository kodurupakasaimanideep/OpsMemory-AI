from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

class IncidentResolutionRequest(BaseModel):
    actual_root_cause: str
    actual_fix: str
    ai_recommendation_useful: bool
    additional_notes: Optional[str] = None
    engineer_name: Optional[str] = "Nikhil (DevOps Engineer)"

class IncidentResolutionResponse(BaseModel):
    success: bool
    incident_id: str
    status: str
    message: str
    stored_memory_id: str
    new_memory_count: int
    updated_at: str
