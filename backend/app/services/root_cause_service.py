from typing import Dict, Any, List
from ..agent.incident_agent import incident_agent
from ..models.investigation import InvestigationResult

class RootCauseService:
    async def analyze(self, incident: Dict[str, Any]) -> InvestigationResult:
        return await incident_agent.investigate_incident(incident)

root_cause_service = RootCauseService()
