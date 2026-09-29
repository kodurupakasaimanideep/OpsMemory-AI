from typing import Dict, Any, List, Optional
import httpx
from datetime import datetime
from .config import hindsight_config
from ..utils.logger import logger

class HindsightClient:
    """Client for Hindsight Memory Service API supporting official Vectorize bank-scoped endpoints with resilient fallback."""
    
    def __init__(self):
        self.base_url = (hindsight_config.api_url or "http://localhost:8888").rstrip("/")
        self.api_key = hindsight_config.api_key
        self.namespace = hindsight_config.namespace or "opsmind-production"

    def _get_headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key and self.api_key.strip():
            headers["Authorization"] = f"Bearer {self.api_key.strip()}"
        return headers

    async def ping(self) -> bool:
        """Probes official Hindsight health endpoints (/health/live, /health/ready, /health)."""
        timeout_config = httpx.Timeout(1.0, connect=0.6)
        try:
            async with httpx.AsyncClient(timeout=timeout_config) as client:
                res = await client.get(f"{self.base_url}/health/live", headers=self._get_headers())
                if res.status_code == 200:
                    return True
                # Try fallback readiness
                res_ready = await client.get(f"{self.base_url}/health", headers=self._get_headers())
                return res_ready.status_code == 200
        except Exception:
            return False


    async def store_memory(self, memory_type: str, content: Dict[str, Any], metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Stores memory into external Hindsight if reachable, otherwise returns local fallback metadata."""
        logger.info(f"HindsightClient: Preparing memory storage ({memory_type}) for incident {metadata.get('incident_id', 'unknown')}")
        
        # 1. Try official bank-scoped endpoint: POST /v1/default/banks/{bank_id}/memories
        bank_endpoint = f"{self.base_url}/v1/default/banks/{self.namespace}/memories"
        official_payload = {
            "type": memory_type,
            "content": content,
            "metadata": metadata,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        
        try:
            async with httpx.AsyncClient(timeout=2.5) as client:
                res = await client.post(bank_endpoint, json=official_payload, headers=self._get_headers())
                if res.status_code in (200, 201):
                    logger.info(f"HindsightClient: Successfully stored memory to external bank {self.namespace}")
                    data = res.json()
                    return {
                        "id": data.get("id") or f"mem_{metadata.get('incident_id', 'unknown')}",
                        "status": "stored_external_hindsight",
                        "namespace": self.namespace,
                        "backend": "external_hindsight"
                    }
        except Exception as e:
            logger.debug(f"Hindsight bank-scoped endpoint unavailable: {type(e).__name__}")

        # 2. Try generic route: POST /v1/memories
        generic_endpoint = f"{self.base_url}/v1/memories"
        generic_payload = {
            "namespace": self.namespace,
            "type": memory_type,
            "content": content,
            "metadata": metadata
        }
        try:
            async with httpx.AsyncClient(timeout=2.5) as client:
                res = await client.post(generic_endpoint, json=generic_payload, headers=self._get_headers())
                if res.status_code in (200, 201):
                    logger.info(f"HindsightClient: Successfully stored memory to external generic endpoint")
                    data = res.json()
                    return {
                        "id": data.get("id") or f"mem_{metadata.get('incident_id', 'unknown')}",
                        "status": "stored_external_hindsight",
                        "namespace": self.namespace,
                        "backend": "external_hindsight"
                    }
        except Exception as e:
            logger.debug(f"Hindsight generic endpoint unavailable: {type(e).__name__}")

        logger.info(f"External Hindsight server offline/unreachable at {self.base_url} — local persistent memory active")
        return {
            "id": f"mem_{metadata.get('incident_id', 'unknown')}_{memory_type}",
            "status": "stored_local_fallback",
            "namespace": self.namespace,
            "backend": "local"
        }

    async def query_memory(self, query: str, filters: Optional[Dict[str, Any]] = None, top_k: int = 5) -> List[Dict[str, Any]]:
        """Queries external Hindsight if reachable, otherwise returns empty list to allow local memory engine to serve query."""
        # 1. Try official bank-scoped recall: POST /v1/default/banks/{bank_id}/memories/recall
        bank_recall = f"{self.base_url}/v1/default/banks/{self.namespace}/memories/recall"
        try:
            async with httpx.AsyncClient(timeout=2.5) as client:
                res = await client.post(
                    bank_recall,
                    json={"query": query, "filters": filters or {}, "top_k": top_k},
                    headers=self._get_headers()
                )
                if res.status_code == 200:
                    results = res.json().get("results") or res.json().get("memories") or []
                    if isinstance(results, list):
                        return results
        except Exception as e:
            logger.debug(f"Hindsight bank recall unavailable: {type(e).__name__}")

        # 2. Try generic recall: POST /v1/memories/query
        generic_query = f"{self.base_url}/v1/memories/query"
        try:
            async with httpx.AsyncClient(timeout=2.5) as client:
                res = await client.post(
                    generic_query,
                    json={"query": query, "filters": filters or {}, "top_k": top_k},
                    headers=self._get_headers()
                )
                if res.status_code == 200:
                    results = res.json().get("results") or []
                    if isinstance(results, list):
                        return results
        except Exception as e:
            logger.debug(f"Hindsight generic query unavailable: {type(e).__name__}")

        return []

    async def get_connection_status(self) -> Dict[str, Any]:
        """Returns connection and configuration status without leaking credentials."""
        connected = await self.ping()
        return {
            "configured_url": self.base_url,
            "namespace": self.namespace,
            "connected": connected,
            "status": "connected" if connected else "unavailable",
            "active_mode": "external_hindsight" if connected else "local_fallback",
            "auth_configured": bool(self.api_key and self.api_key.strip())
        }

hindsight_client = HindsightClient()

