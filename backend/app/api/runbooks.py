from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from ..utils.helpers import get_data_dir

router = APIRouter(prefix="/runbooks", tags=["Runbooks"])

@router.get("")
async def get_runbooks():
    return [
        {
            "id": "database-recovery",
            "title": "Database Recovery & Connection Pool Sizing",
            "category": "Database",
            "estimated_time": "5-10 min",
            "usage_count": 84,
            "last_updated": "2 days ago"
        },
        {
            "id": "api-recovery",
            "title": "API 500 / 503 Gateway & Upstream Recovery",
            "category": "Networking & API",
            "estimated_time": "3-7 min",
            "usage_count": 52,
            "last_updated": "1 week ago"
        },
        {
            "id": "service-restart",
            "title": "Safe Graceful Service Rolling Restart",
            "category": "Kubernetes",
            "estimated_time": "2-4 min",
            "usage_count": 129,
            "last_updated": "3 days ago"
        },
        {
            "id": "connection-pool-tuning",
            "title": "Connection Pool & PgBouncer Sizing Formula",
            "category": "Database",
            "estimated_time": "10-15 min",
            "usage_count": 41,
            "last_updated": "2 weeks ago"
        }
    ]

@router.get("/{runbook_id}")
async def get_runbook_content(runbook_id: str):
    data_dir = get_data_dir()
    file_path = data_dir / "runbooks" / f"{runbook_id}.md"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Runbook not found")
    with open(file_path, "r", encoding="utf-8") as f:
        return {"id": runbook_id, "content": f.read()}
