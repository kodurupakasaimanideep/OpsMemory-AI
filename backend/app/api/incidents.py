from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from ..models.incident import IncidentBase, IncidentCreate
from ..models.resolution import IncidentResolutionRequest, IncidentResolutionResponse
from ..services.incident_service import incident_service
from ..db import database
from .agent import find_similar_incidents_chat

router = APIRouter(prefix="/incidents", tags=["Incidents"])

@router.get("", response_model=List[Dict[str, Any]])
async def get_all_incidents():
    return incident_service.list_incidents()

@router.get("/{incident_id}", response_model=Dict[str, Any])
async def get_incident(incident_id: str):
    inc = incident_service.get_incident(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")
    return inc

@router.get("/{incident_id}/exists")
async def check_incident_exists(incident_id: str):
    exists = incident_service.incident_exists(incident_id)
    return {
        "incident_id": incident_id,
        "exists": exists
    }

@router.post("", response_model=Dict[str, Any])
async def create_incident(payload: IncidentCreate):
    return await incident_service.create_incident(payload)

class StateUpdateRequest(BaseModel):
    state: str # 'HYPOTHESIS' | 'INVESTIGATION' | 'CONFIRMED'
    notes: Optional[str] = None

@router.post("/{incident_id}/state")
async def update_state(incident_id: str, payload: StateUpdateRequest):
    try:
        updated = incident_service.update_lifecycle_state(incident_id, payload.state, payload.notes)
        return {
            "success": True,
            "incident_id": incident_id,
            "lifecycle_state": payload.state,
            "incident": updated
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class ExtendedResolutionRequest(BaseModel):
    actual_root_cause: Optional[str] = None
    actual_fix: Optional[str] = None
    root_cause: Optional[str] = None
    resolution: Optional[Any] = None
    evidence: Optional[List[str]] = None
    verification: Optional[List[str]] = None
    ai_recommendation_useful: Optional[bool] = True
    additional_notes: Optional[str] = None
    status: Optional[str] = "RESOLVED"

@router.post("/{incident_id}/resolve")
async def resolve_incident(incident_id: str, payload: ExtendedResolutionRequest):
    try:
        root_cause_str = payload.root_cause or payload.actual_root_cause or "Root cause verified and resolved."
        resolution_val = payload.resolution or payload.actual_fix or "Resolution applied and verified."
        if isinstance(resolution_val, list):
            clean_res = [str(r).strip() for r in resolution_val if str(r).strip()]
            res_str = "\n".join(clean_res)
        else:
            res_str = str(resolution_val)

        res = await incident_service.resolve_incident(
            incident_id=incident_id,
            root_cause=root_cause_str,
            resolution=res_str,
            useful=payload.ai_recommendation_useful or True,
            engineer_feedback=payload.additional_notes,
            evidence=payload.evidence,
            verification=payload.verification
        )
        return {
            "success": True,
            "incident_id": incident_id,
            "status": "RESOLVED",
            "message": "Incident resolved and new experience saved into Hindsight organizational memory.",
            "stored_memory_id": res["memory_result"]["memory_id"],
            "new_memory_count": res["memory_result"]["total_memories"],
            "updated_at": res["incident"].get("resolved_at", ""),
            "incident": res["incident"]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{incident_id}/similar")
async def get_similar_incidents(incident_id: str):
    target_inc = incident_service.get_incident(incident_id)
    if not target_inc:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")
    all_stored = incident_service.list_incidents()
    matches = find_similar_incidents_chat(target_inc, all_stored, min_score=0.08, max_results=5)
    
    results = []
    for inc, score, reasons in matches:
        cand_id = inc.get("id") or inc.get("incident_id")
        pct = int(round(score * 100))
        results.append({
            "incident_id": cand_id,
            "id": cand_id,
            "service": inc.get("service", "Unknown"),
            "status": inc.get("status", "Unknown"),
            "symptom": inc.get("symptom") or (inc.get("symptoms", [""])[0] if inc.get("symptoms") else "") or inc.get("title", ""),
            "root_cause": inc.get("root_cause") or "Not recorded",
            "resolution": inc.get("resolution") or "Not recorded",
            "similarity": score,
            "similarity_pct": pct,
            "why_relevant": reasons,
            "breakdown": {
                "same_service": (inc.get("service") or "").strip().lower() == (target_inc.get("service") or "").strip().lower(),
                "same_error": any(code in (target_inc.get("symptom", "") + " " + target_inc.get("error_type", "")) and code in (inc.get("symptom", "") + " " + inc.get("error_type", "")) for code in ["503", "504", "502", "500"]),
                "database_pressure": "connection" in str(inc).lower() and "connection" in str(target_inc).lower(),
                "historical_resolution_available": bool(inc.get("resolution"))
            }
        })
    return {"incident_id": incident_id, "matches": results}

@router.get("/{incident_id}/handoff")
async def get_incident_handoff(incident_id: str):
    inc = incident_service.get_incident(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")

    service = inc.get("service", "unknown-service")
    status = inc.get("status", "INVESTIGATING")
    symptom = inc.get("symptom") or (inc.get("symptoms", [""])[0] if inc.get("symptoms") else "") or inc.get("title", "Service incident")
    root_cause = inc.get("root_cause") or "NOT YET CONFIRMED"
    
    # Evidence
    raw_evidence = inc.get("evidence") or []
    if not raw_evidence and inc.get("observations"):
        raw_evidence = inc.get("observations")
    if isinstance(raw_evidence, str):
        raw_evidence = [l.strip().lstrip("-*• ") for l in raw_evidence.splitlines() if l.strip()]

    # Resolution
    raw_resolution = inc.get("resolution") or []
    if isinstance(raw_resolution, str):
        raw_resolution = [l.strip().lstrip("-*• ") for l in raw_resolution.splitlines() if l.strip()]

    # Verification
    raw_verification = inc.get("verification") or []
    if isinstance(raw_verification, str):
        raw_verification = [l.strip().lstrip("-*• ") for l in raw_verification.splitlines() if l.strip()]

    # Find similar historical incidents
    all_stored = incident_service.list_incidents()
    matches = find_similar_incidents_chat(inc, all_stored, min_score=0.08, max_results=3)
    hist_list = []
    for m_inc, m_score, m_reasons in matches:
        hist_list.append({
            "incident_id": m_inc.get("id"),
            "service": m_inc.get("service"),
            "similarity": f"{int(round(m_score * 100))}%",
            "root_cause": m_inc.get("root_cause"),
            "resolution": m_inc.get("resolution")
        })

    unknown_unresolved = "None. All verification checks completed successfully." if status.upper() == "RESOLVED" else "Investigation actively in progress. Root cause hypothesis unconfirmed."

    # Format Markdown
    md_lines = [
        "--------------------------------",
        "NIGHT SHIFT HANDOFF",
        inc.get("id", incident_id),
        "--------------------------------",
        "",
        "Service",
        service,
        "",
        "Status",
        status,
        "",
        "Problem",
        symptom,
        "",
        "Verified root cause",
        root_cause,
        "",
        "Evidence"
    ]
    if raw_evidence:
        for ev in raw_evidence:
            md_lines.append(f"✓ {ev}")
    else:
        md_lines.append("No specific evidence records captured.")

    md_lines.append("")
    md_lines.append("Resolution")
    if raw_resolution:
        for res in raw_resolution:
            md_lines.append(f"✓ {res}")
    else:
        md_lines.append("Pending resolution." if status != "RESOLVED" else "Resolution steps applied.")

    md_lines.append("")
    md_lines.append("Verification")
    if raw_verification:
        for ver in raw_verification:
            md_lines.append(f"✓ {ver}")
    else:
        md_lines.append("Verification completed upon recovery." if status == "RESOLVED" else "Verification pending.")

    md_lines.append("")
    md_lines.append("Unknown / unresolved")
    md_lines.append(unknown_unresolved)

    md_lines.append("")
    md_lines.append("Historical incidents")
    if hist_list:
        for h in hist_list:
            md_lines.append(f"• {h['incident_id']} ({h['similarity']}) — {h['service']}: {h.get('root_cause') or 'Similar pattern'}")
    else:
        md_lines.append("No previous similar incidents recorded.")

    markdown_text = "\n".join(md_lines)

    return {
        "incident_id": inc.get("id", incident_id),
        "service": service,
        "status": status,
        "problem": symptom,
        "root_cause": root_cause,
        "evidence": raw_evidence,
        "resolution": raw_resolution,
        "verification": raw_verification,
        "unknown_unresolved": unknown_unresolved,
        "historical_incidents": hist_list,
        "handoff_markdown": markdown_text
    }

@router.get("/{incident_id}/audit-trail")
async def get_incident_audit_trail(incident_id: str):
    events = database.get_audit_events_for_incident(incident_id)
    inc = incident_service.get_incident(incident_id)
    timeline_events = []
    if inc and inc.get("timeline"):
        for item in inc["timeline"]:
            timeline_events.append({
                "time": item.get("time", "N/A"),
                "action": item.get("event", "Event occurred"),
                "actor": "OpsMind Memory Engine" if item.get("type") in ["agent", "resolved"] else "Telemetry Monitor"
            })
    combined = events + [e for e in timeline_events if e not in events]
    return {
        "incident_id": incident_id,
        "audit_trail": combined if combined else [
            {"time": "Initial", "action": f"Incident {incident_id} registered into memory", "actor": "DevOps Engineer"}
        ]
    }


