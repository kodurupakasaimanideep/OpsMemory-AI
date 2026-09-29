from typing import Dict, Any, List
from ..models.investigation import RecommendedAction

class RecommendationService:
    def get_standard_remediations(self, service: str, error_type: str) -> List[RecommendedAction]:
        if "payment" in service.lower():
            return [
                RecommendedAction(step=1, action="Check database connection pool utilization", category="verification"),
                RecommendedAction(step=2, action="Compare deployment commit diff", category="rollback"),
                RecommendedAction(step=3, action="Check DB connection timeout in PostgreSQL", category="runbook", runbook_id="database-recovery"),
                RecommendedAction(step=4, action="Review INC-104 resolution", category="mitigation")
            ]
        return [
            RecommendedAction(step=1, action="Inspect container stdout/stderr logs", category="verification"),
            RecommendedAction(step=2, action="Perform health check probe verification", category="verification")
        ]

recommendation_service = RecommendationService()
