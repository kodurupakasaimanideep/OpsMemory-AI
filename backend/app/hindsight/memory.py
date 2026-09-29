import json
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime
from .client import hindsight_client
from ..utils.logger import logger
from ..utils.helpers import get_data_dir, load_json_file, save_json_file

class MemoryEngine:
    def __init__(self):
        self.data_dir = get_data_dir()
        self.memory_store_file = self.data_dir / "memory_store.json"
        self._initialize_store()

    def _initialize_store(self):
        if not self.memory_store_file.exists():
            default_store = {
                "categories": {
                    "incidents": 2481,
                    "root_causes": 736,
                    "resolutions": 914,
                    "runbooks": 182,
                    "deployment_patterns": 421
                },
                "recently_learned": [
                    {
                        "id": "learn_001",
                        "title": "Database connection exhaustion",
                        "learned_from": "INC-204",
                        "related_incidents_count": 7,
                        "related_incidents": ["INC-104", "INC-117", "INC-121", "INC-119", "INC-101", "INC-204"],
                        "resolution_stats": [
                            {"action": "Increasing pool", "resolved_count": 4},
                            {"action": "Rollback", "resolved_count": 3}
                        ],
                        "confidence": 0.94,
                        "last_updated": "Just now",
                        "service": "Payment API",
                        "error_type": "HTTP 503"
                    },
                    {
                        "id": "learn_002",
                        "title": "Redis Cache Invalidation Desync",
                        "learned_from": "INC-206",
                        "related_incidents_count": 3,
                        "related_incidents": ["INC-206", "INC-002"],
                        "resolution_stats": [
                            {"action": "Cache warmup script", "resolved_count": 2},
                            {"action": "Key TTL reset", "resolved_count": 1}
                        ],
                        "confidence": 0.88,
                        "last_updated": "1 hour ago",
                        "service": "Auth Service",
                        "error_type": "High latency"
                    }
                ],
                "learned_patterns": {
                    "payment-service:HTTP 503": {
                        "root_cause": "Database connection pool was exhausted",
                        "resolution": "Rollback deployment + increase connection pool + restart affected service",
                        "incidents": ["INC-104", "INC-117", "INC-121", "INC-119"],
                        "reinforcements": 5
                    },
                    "order-service:DB timeout": {
                        "root_cause": "Unindexed queries combined with tight connection pool limits",
                        "resolution": "Rollback deployment and tune PgBouncer connection pool size",
                        "incidents": ["INC-117", "INC-101"],
                        "reinforcements": 3
                    }
                }
            }
            save_json_file(self.memory_store_file, default_store)

    def get_store(self) -> Dict[str, Any]:
        data = load_json_file(self.memory_store_file)
        if not data:
            self._initialize_store()
            data = load_json_file(self.memory_store_file)
        return data or {}

    def get_stats(self) -> Dict[str, Any]:
        store = self.get_store()
        return {
            "categories": store.get("categories", {}),
            "recently_learned": store.get("recently_learned", []),
            "total_memories": sum(store.get("categories", {}).values())
        }

    async def search_memories(self, query: str) -> List[Dict[str, Any]]:
        query_lower = query.lower()
        store = self.get_store()
        results = []
        
        # Search recently learned patterns
        for item in store.get("recently_learned", []):
            score = 0.0
            if query_lower in item["title"].lower():
                score += 0.5
            if query_lower in item.get("service", "").lower():
                score += 0.3
            if query_lower in item.get("error_type", "").lower():
                score += 0.3
            if any(query_lower in inc.lower() for inc in item.get("related_incidents", [])):
                score += 0.4
            
            if score > 0 or not query.strip():
                results.append({
                    "id": item["id"],
                    "type": "Root Cause Pattern",
                    "title": item["title"],
                    "summary": f"Learned from {item['learned_from']} across {item['related_incidents_count']} incidents.",
                    "confidence": item["confidence"],
                    "relevance": min(round(max(score, 0.75), 2), 0.98),
                    "details": item
                })
        
        # Also search stored incident memories
        incidents_dir = self.data_dir / "incidents"
        if incidents_dir.exists():
            for f in incidents_dir.glob("*.json"):
                inc = load_json_file(f)
                if inc:
                    score = 0.0
                    content = f"{inc.get('id')} {inc.get('title')} {inc.get('service')} {inc.get('error_type')} {inc.get('root_cause')} {inc.get('resolution')} {' '.join(inc.get('symptoms', []))} {' '.join(inc.get('observations', []))}".lower()
                    for word in query_lower.split():
                        if word in content:
                            score += 0.2
                    if score > 0.3 or not query.strip():
                        results.append({
                            "id": inc.get("id"),
                            "type": "Incident Memory",
                            "title": inc.get("title") or f"{inc.get('service')} Incident",
                            "summary": inc.get("root_cause") or inc.get("symptom") or "Active investigation record",
                            "confidence": inc.get("similarity_score", 0.85),
                            "relevance": min(round(max(score, 0.70), 2), 0.95),
                            "details": inc
                        })

        return sorted(results, key=lambda x: x["relevance"], reverse=True)

    def store_incident_memory(self, incident: Dict[str, Any]):
        """Persists an incident into the Hindsight memory store structure."""
        if not incident or "id" not in incident:
            return
        store = self.get_store()
        inc_id = incident["id"]
        incidents_mem = store.setdefault("incidents_memory", {})
        is_new = inc_id not in incidents_mem
        incidents_mem[inc_id] = incident

        if is_new:
            store["categories"]["incidents"] = store["categories"].get("incidents", 2481) + 1

        save_json_file(self.memory_store_file, store)

    def get_incident_memory(self, incident_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves an incident by exact ID from Hindsight memory store."""
        if not incident_id:
            return None
        store = self.get_store()
        incidents_mem = store.get("incidents_memory", {})
        # Case insensitive lookup
        for k, v in incidents_mem.items():
            if k.upper() == incident_id.strip().upper():
                return v
        return None

    async def store_incident_resolution(
        self,
        incident_id: str,
        service: str,
        error_type: str,
        root_cause: str,
        resolution: str,
        useful: bool,
        engineer_feedback: Optional[str] = None
    ) -> Dict[str, Any]:
        store = self.get_store()
        
        # Increment memory categories
        store["categories"]["incidents"] = store["categories"].get("incidents", 2481) + 1
        store["categories"]["root_causes"] = store["categories"].get("root_causes", 736) + 1
        store["categories"]["resolutions"] = store["categories"].get("resolutions", 914) + 1

        pattern_key = f"{service.lower()}:{error_type.lower()}"
        learned_patterns = store.setdefault("learned_patterns", {})
        
        if pattern_key in learned_patterns:
            pattern = learned_patterns[pattern_key]
            pattern["reinforcements"] = pattern.get("reinforcements", 1) + 1
            if incident_id not in pattern.get("incidents", []):
                pattern.setdefault("incidents", []).append(incident_id)
            pattern["root_cause"] = root_cause
            pattern["resolution"] = resolution
        else:
            learned_patterns[pattern_key] = {
                "root_cause": root_cause,
                "resolution": resolution,
                "incidents": [incident_id],
                "reinforcements": 1
            }

        # Update or prepend to recently learned
        new_learned_item = {
            "id": f"learn_{incident_id.lower()}",
            "title": root_cause,
            "learned_from": incident_id,
            "related_incidents_count": len(learned_patterns[pattern_key]["incidents"]),
            "related_incidents": learned_patterns[pattern_key]["incidents"],
            "resolution_stats": [
                {"action": resolution.split('+')[0].strip() if '+' in resolution else resolution, "resolved_count": 1}
            ],
            "confidence": 0.96 if useful else 0.82,
            "last_updated": "Just now",
            "service": service,
            "error_type": error_type
        }
        
        store["recently_learned"] = [new_learned_item] + [
            item for item in store.get("recently_learned", []) if item["id"] != new_learned_item["id"]
        ]

        save_json_file(self.memory_store_file, store)

        # Also push to Hindsight Client
        await hindsight_client.store_memory(
            memory_type="resolution",
            content={
                "root_cause": root_cause,
                "resolution": resolution,
                "feedback": engineer_feedback or "Confirmed by engineer"
            },
            metadata={
                "incident_id": incident_id,
                "service": service,
                "error_type": error_type,
                "reinforcements": learned_patterns[pattern_key]["reinforcements"]
            }
        )

        return {
            "memory_id": f"mem_{incident_id}",
            "total_memories": sum(store["categories"].values()),
            "pattern_reinforcements": learned_patterns[pattern_key]["reinforcements"]
        }

memory_engine = MemoryEngine()
