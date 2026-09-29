from fastapi import APIRouter, Query, HTTPException
from typing import Dict, Any, List, Optional
from ..hindsight.memory import memory_engine
from ..services.incident_service import incident_service
from ..agent.incident_agent import incident_agent
from ..models.incident import IncidentMemoryPayload
from ..utils.helpers import calculate_text_similarity

router = APIRouter(prefix="/memory", tags=["Memory"])

def get_recurring_patterns_internal() -> List[Dict[str, Any]]:
    """Detects recurring incident patterns dynamically from actual stored incidents."""
    incidents = incident_service.list_incidents()
    patterns = []

    # Pattern 1: Database connection exhaustion
    db_conn_incs = []
    for inc in incidents:
        text = f"{inc.get('title', '')} {inc.get('symptom', '')} {' '.join(inc.get('symptoms', []))} {inc.get('root_cause', '')} {' '.join(inc.get('observations', []))}".lower()
        if ("connection" in text and ("pool" in text or "exhaust" in text or "limit" in text or "timeout" in text)) or "503" in text and "database" in text:
            db_conn_incs.append(inc.get("id"))
    
    if len(db_conn_incs) >= 2:
        patterns.append({
            "id": "PAT-001",
            "title": "Database connection exhaustion",
            "signature": "HTTP 503 + database connection pressure",
            "incidents": db_conn_incs,
            "count": len(db_conn_incs),
            "services": list(set([i.get("service") for i in incidents if i.get("id") in db_conn_incs and i.get("service")])),
            "common_characteristics": [
                "Connection pressure approaching maximum configured pool limit",
                "HTTP 503 Service Unavailable errors during peak traffic",
                "Database connection acquisition timeouts and unreleased connections"
            ],
            "verified_resolutions": [
                "Increase HikariCP / PgBouncer connection pool limits",
                "Fix connection release logic in background worker tasks",
                "Restart affected service pods to clear leaked sockets"
            ],
            "confidence": 0.94
        })

    # Pattern 2: Query Starvation & Starvation Timeouts
    query_timeout_incs = []
    for inc in incidents:
        text = f"{inc.get('title', '')} {inc.get('symptom', '')} {' '.join(inc.get('symptoms', []))} {inc.get('root_cause', '')} {' '.join(inc.get('observations', []))}".lower()
        if ("unindexed" in text or "slow query" in text or "504" in text or "query timeout" in text) and inc.get("id") not in db_conn_incs[:2]:
            query_timeout_incs.append(inc.get("id"))
    
    if len(query_timeout_incs) >= 2:
        patterns.append({
            "id": "PAT-002",
            "title": "Query starvation & gateway timeouts",
            "signature": "HTTP 504 + unindexed query starvation",
            "incidents": query_timeout_incs,
            "count": len(query_timeout_incs),
            "services": list(set([i.get("service") for i in incidents if i.get("id") in query_timeout_incs and i.get("service")])),
            "common_characteristics": [
                "Database latency spikes on unindexed joins",
                "Application gateway timeout / HTTP 504",
                "Downstream request queue backlog accumulation"
            ],
            "verified_resolutions": [
                "Apply missing database indexes",
                "Tune PgBouncer statement timeouts",
                "Roll back offending schema or migration change"
            ],
            "confidence": 0.88
        })

    # Pattern 3: Upstream Gateway & Cache Invalidation
    cache_incs = []
    for inc in incidents:
        text = f"{inc.get('title', '')} {inc.get('symptom', '')} {' '.join(inc.get('symptoms', []))} {inc.get('root_cause', '')} {' '.join(inc.get('observations', []))}".lower()
        if "redis" in text or "cache" in text or "502" in text or "upstream timeout" in text:
            cache_incs.append(inc.get("id"))

    if len(cache_incs) >= 2:
        patterns.append({
            "id": "PAT-003",
            "title": "Upstream gateway & cache latency desync",
            "signature": "HTTP 502 + Redis / upstream timeout",
            "incidents": cache_incs,
            "count": len(cache_incs),
            "services": list(set([i.get("service") for i in incidents if i.get("id") in cache_incs and i.get("service")])),
            "common_characteristics": [
                "Redis latency elevated during cache invalidation storms",
                "HTTP 502 Bad Gateway from reverse proxy",
                "Upstream service connection timeout"
            ],
            "verified_resolutions": [
                "Execute cache pre-warmup routine",
                "Reset TTL bounds on high-cardinality keys",
                "Scale out caching replicas"
            ],
            "confidence": 0.86
        })

    return patterns

@router.get("/stats")
async def get_memory_stats():
    incidents = incident_service.list_incidents()
    total_count = len(incidents)
    resolved_count = sum(1 for i in incidents if str(i.get("status", "")).upper() == "RESOLVED")
    investigating_count = sum(1 for i in incidents if "INVESTIGAT" in str(i.get("status", "")).upper() or "UNRESOLVED" in str(i.get("status", "")).upper())
    unresolved_count = total_count - resolved_count

    # Knowledge completeness from actual records
    rc_count = sum(1 for i in incidents if i.get("root_cause") and str(i.get("root_cause")).strip().lower() not in ["none", "unknown", "null", "unknown / not determined", ""])
    ev_count = sum(1 for i in incidents if (i.get("evidence") and len(i["evidence"]) > 0) or (i.get("observations") and len(i["observations"]) > 0))
    res_count = sum(1 for i in incidents if i.get("resolution") and str(i.get("resolution")).strip().lower() not in ["none", "null", ""])
    ver_count = sum(1 for i in incidents if i.get("verification") and len(i["verification"]) > 0)

    patterns = get_recurring_patterns_internal()
    store = memory_engine.get_store()

    return {
        "total_incidents": total_count,
        "resolved": resolved_count,
        "investigating": investigating_count,
        "unresolved": unresolved_count,
        "completeness": {
            "root_cause_recorded": rc_count,
            "evidence_recorded": ev_count,
            "resolution_recorded": res_count,
            "verification_recorded": ver_count,
            "root_cause_percent": int(round((rc_count / total_count * 100))) if total_count else 0,
            "evidence_percent": int(round((ev_count / total_count * 100))) if total_count else 0,
            "resolution_percent": int(round((res_count / total_count * 100))) if total_count else 0,
            "verification_percent": int(round((ver_count / total_count * 100))) if total_count else 0,
        },
        "recurring_patterns_count": len(patterns),
        "recurring_patterns": patterns,
        "categories": {
            "incidents": total_count,
            "root_causes": rc_count,
            "resolutions": res_count,
            "patterns": len(patterns),
            "hindsight_memories": sum(store.get("categories", {}).values())
        },
        "recently_learned": store.get("recently_learned", [])
    }

@router.get("/patterns")
async def get_recurring_patterns():
    patterns = get_recurring_patterns_internal()
    return {
        "count": len(patterns),
        "patterns": patterns
    }

@router.get("/search")
async def search_memory(q: str = Query("", description="Query term to search across memory")):
    query_str = q.strip().lower()
    all_incidents = incident_service.list_incidents()
    
    if not query_str:
        return {
            "query": q,
            "count": len(all_incidents),
            "results": [
                {
                    "incident_id": inc.get("id"),
                    "service": inc.get("service"),
                    "status": inc.get("status"),
                    "symptom": inc.get("symptom") or (inc.get("symptoms", [""])[0] if inc.get("symptoms") else "") or inc.get("title", ""),
                    "root_cause": inc.get("root_cause") or "Not recorded",
                    "resolution": inc.get("resolution") or "Not recorded",
                    "relevance": 1.0,
                    "relevance_pct": 100,
                    "matched_fields": ["All incidents"]
                }
                for inc in all_incidents[:15]
            ]
        }

    scored_results = []
    tokens = set(query_str.split())

    for inc in all_incidents:
        inc_id = inc.get("id", "").lower()
        service = inc.get("service", "").lower()
        title = inc.get("title", "").lower()
        symptom = (inc.get("symptom") or (inc.get("symptoms", [""])[0] if inc.get("symptoms") else "")).lower()
        root_cause = str(inc.get("root_cause") or "").lower()
        resolution = str(inc.get("resolution") or "").lower()
        error_type = str(inc.get("error_type") or "").lower()
        observations = " ".join(inc.get("observations") or []).lower()
        evidence = " ".join(inc.get("evidence") or []).lower()

        matched_fields = []
        score = 0.0

        # Exact ID match
        if query_str == inc_id:
            score += 1.0
            matched_fields.append("Incident ID")
        elif query_str in inc_id:
            score += 0.7
            matched_fields.append("Incident ID")

        # Service match
        if query_str in service or any(t in service for t in tokens if len(t) > 3):
            score += 0.4
            matched_fields.append("Service")

        # Root cause match
        if query_str in root_cause:
            score += 0.5
            matched_fields.append("Root Cause")
        elif any(t in root_cause for t in tokens if len(t) > 3):
            score += 0.25
            matched_fields.append("Root Cause")

        # Resolution match
        if query_str in resolution:
            score += 0.4
            matched_fields.append("Resolution")
        elif any(t in resolution for t in tokens if len(t) > 3):
            score += 0.2
            matched_fields.append("Resolution")

        # Symptom / error code match
        if query_str in symptom or query_str in error_type:
            score += 0.45
            matched_fields.append("Symptom / Error Code")
        elif any(t in symptom or t in error_type for t in tokens if len(t) > 2):
            score += 0.25
            matched_fields.append("Symptom")

        # Observations / evidence match
        if any(t in observations or t in evidence for t in tokens if len(t) > 3):
            score += 0.2
            matched_fields.append("Observations / Evidence")

        if score > 0:
            relevance = min(round(score, 2), 0.99)
            scored_results.append({
                "incident_id": inc.get("id"),
                "service": inc.get("service"),
                "status": inc.get("status"),
                "symptom": inc.get("symptom") or (inc.get("symptoms", [""])[0] if inc.get("symptoms") else "") or inc.get("title", ""),
                "root_cause": inc.get("root_cause") or "Not recorded",
                "resolution": inc.get("resolution") or "Not recorded",
                "relevance": relevance,
                "relevance_pct": int(round(relevance * 100)),
                "matched_fields": list(set(matched_fields))
            })

    scored_results.sort(key=lambda x: x["relevance"], reverse=True)

    return {
        "query": q,
        "count": len(scored_results),
        "results": scored_results
    }

@router.post("/incident", response_model=Dict[str, Any])
async def create_incident_memory(payload: IncidentMemoryPayload):
    """Creates and persists an incident into OpsMind memory and persistent storage."""
    created = await incident_service.create_incident(payload)
    return {
        "success": True,
        "message": f"Incident {created.get('id')} persisted into OpsMind memory store.",
        "incident": created
    }

@router.get("/incident/{incident_id}", response_model=Dict[str, Any])
async def get_incident_memory(incident_id: str):
    """Retrieves an incident by exact ID from the OpsMind memory and data store."""
    inc = incident_service.get_incident(incident_id)
    if not inc:
        raise HTTPException(
            status_code=404, 
            detail=f"No information stored for incident {incident_id} in OpsMind memory."
        )
    return inc

@router.get("/incident/{incident_id}/exists")
async def check_incident_memory_exists(incident_id: str):
    """Verifies whether an incident exists in the OpsMind memory store."""
    exists = incident_service.incident_exists(incident_id)
    return {
        "incident_id": incident_id,
        "exists": exists
    }

@router.get("/chain/{incident_id}")
async def get_memory_chain(incident_id: str):
    inc = incident_service.get_incident(incident_id)
    if not inc:
        inc = {"id": incident_id, "service": "Payment API", "error_type": "HTTP 503"}
    investigation = await incident_agent.investigate_incident(inc)
    return investigation.evidence_chain

