from fastapi import APIRouter
from typing import Dict, Any, List

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("")
async def get_analytics():
    return {
        "metrics": {
            "incidents_this_month": 38,
            "average_resolution_time_min": 18,
            "repeat_incident_rate_percent": 21,
            "resolutions_from_memory_percent": 64
        },
        "root_cause_distribution": [
            {"category": "Database Connection / Pool", "count": 14, "percentage": 37},
            {"category": "Deployment / Config Mismatch", "count": 10, "percentage": 26},
            {"category": "Network & Gateway Timeouts", "count": 8, "percentage": 21},
            {"category": "Memory / OOM / Pod Crashes", "count": 6, "percentage": 16}
        ],
        "top_recurring_incidents": [
            {"title": "Database connection exhaustion", "occurrences": 7, "avg_mttr": "14 min", "resolved_by_memory": "100%"},
            {"title": "Deployment configuration mismatch", "occurrences": 5, "avg_mttr": "19 min", "resolved_by_memory": "80%"},
            {"title": "API Gateway 504 timeout", "occurrences": 4, "avg_mttr": "22 min", "resolved_by_memory": "75%"},
            {"title": "Memory pressure & OOMKilled", "occurrences": 3, "avg_mttr": "25 min", "resolved_by_memory": "66%"}
        ],
        "mttr_trend": [
            {"month": "May", "mttr": 42},
            {"month": "Jun", "mttr": 34},
            {"month": "Jul", "mttr": 28},
            {"month": "Aug", "mttr": 22},
            {"month": "Sep", "mttr": 18}
        ]
    }
