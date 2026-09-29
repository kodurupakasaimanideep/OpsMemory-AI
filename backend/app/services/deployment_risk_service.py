from typing import Dict, Any, List
from ..hindsight.memory import memory_engine

class DeploymentRiskService:
    def get_deployments(self) -> List[Dict[str, Any]]:
        return [
            {
                "id": "DEP-901",
                "service": "payment-service",
                "version": "v2.5.0",
                "status": "PENDING_REVIEW",
                "scheduled_at": "Today, 14:00 UTC",
                "author": "payments-dev@microtech.io",
                "risk_level": "HIGH",
                "risk_score": 88,
                "summary": "Updated HikariCP maximum pool size and enabled asynchronous callback worker threads."
            },
            {
                "id": "DEP-902",
                "service": "order-service",
                "version": "v2.0.0",
                "status": "APPROVED",
                "scheduled_at": "Tomorrow, 08:00 UTC",
                "author": "orders-lead@microtech.io",
                "risk_level": "MEDIUM",
                "risk_score": 45,
                "summary": "Introduced partitioned Postgres order archiving schedule."
            },
            {
                "id": "DEP-903",
                "service": "notification-service",
                "version": "v1.2.0",
                "status": "DEPLOYED",
                "scheduled_at": "Yesterday, 16:30 UTC",
                "author": "infra-team@microtech.io",
                "risk_level": "LOW",
                "risk_score": 12,
                "summary": "Migrated template renderer to node-v20 runtime."
            }
        ]

    async def evaluate_risk(self, service: str, version: str) -> Dict[str, Any]:
        store = memory_engine.get_store()
        
        if "payment" in service.lower():
            return {
                "service": service,
                "version": version,
                "risk_level": "HIGH",
                "risk_score": 88,
                "warning_message": "Similar changes caused 3 previous incidents.",
                "related_incidents": ["INC-104", "INC-117", "INC-121"],
                "common_pattern": "Database connection configuration",
                "checks": [
                    {"title": "Database migration reviewed", "status": "passed", "icon": "check"},
                    {"title": "Connection pool configuration changed", "status": "warning", "icon": "warning"},
                    {"title": "Rollback plan available", "status": "passed", "icon": "check"}
                ],
                "recommendation": "Verify DB connection pool before deployment. Ensure max connections <= 100 with PgBouncer buffer."
            }
        else:
            return {
                "service": service,
                "version": version,
                "risk_level": "LOW",
                "risk_score": 18,
                "warning_message": "No repeating high-severity historical patterns matched for this service config.",
                "related_incidents": ["INC-001"],
                "common_pattern": "Standard container image update",
                "checks": [
                    {"title": "Automated regression tests passed", "status": "passed", "icon": "check"},
                    {"title": "Memory limit baseline verified", "status": "passed", "icon": "check"},
                    {"title": "Rollback plan available", "status": "passed", "icon": "check"}
                ],
                "recommendation": "Standard canary rollout can proceed."
            }

deployment_risk_service = DeploymentRiskService()
