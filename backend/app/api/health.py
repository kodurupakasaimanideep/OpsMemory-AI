from fastapi import APIRouter
from datetime import datetime
from ..hindsight.client import hindsight_client

router = APIRouter(prefix="/health", tags=["Health"])

@router.get("")
async def health_check():
    hindsight_connected = await hindsight_client.ping()
    return {
        "status": "healthy",
        "service": "OpsMind AI DevOps Incident Memory API",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "memory_backend": "external_hindsight" if hindsight_connected else "local",
        "hindsight_external": "connected" if hindsight_connected else "unavailable",
        "fallback_active": not hindsight_connected,
        "hindsight_layer": "external_connected" if hindsight_connected else "local_engine_active"
    }

