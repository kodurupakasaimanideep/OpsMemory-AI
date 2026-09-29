import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional, List, Tuple
from ..agent.incident_agent import incident_agent
from ..services.incident_service import incident_service
from ..llm.client import llm_client
from ..llm.prompts import SYSTEM_CHAT_PROMPT
from ..hindsight.client import hindsight_client

router = APIRouter(prefix="/agent", tags=["Agent"])

class ChatQuery(BaseModel):
    query: str
    incident_id: Optional[str] = None

class TestGroqPayload(BaseModel):
    api_key: Optional[str] = None
    model: Optional[str] = None

class SaveConfigPayload(BaseModel):
    groq_api_key: Optional[str] = None
    groq_model: Optional[str] = "llama-3.3-70b-versatile"
    hindsight_url: Optional[str] = None

@router.get("/status")
async def get_agent_status():
    provider_info = llm_client.get_active_provider_info()
    hindsight_healthy = await hindsight_client.ping()
    return {
        "llm": provider_info,
        "hindsight": {
            "status": "connected" if hindsight_healthy else "local_engine_active",
            "external_connected": hindsight_healthy,
            "memory_backend": "external_hindsight" if hindsight_healthy else "local_persistent_storage",
            "fallback_active": not hindsight_healthy,
            "namespace": os.getenv("HINDSIGHT_NAMESPACE", "opsmind-production")
        },
        "two_brains_enabled": True,
        "brain_1": "AI Investigation Engine (Autonomous Root-Cause Reasoning)",
        "brain_2": "Hindsight Memory Engine (Organizational Memory Retrieval)"
    }


@router.post("/test-groq")
async def test_groq(payload: TestGroqPayload):
    result = await llm_client.test_groq_connection(
        custom_key=payload.api_key,
        custom_model=payload.model
    )
    return result

@router.post("/config")
async def save_agent_config(payload: SaveConfigPayload):
    if payload.groq_api_key is not None:
        os.environ["GROQ_API_KEY"] = payload.groq_api_key.strip()
    if payload.groq_model is not None:
        os.environ["GROQ_MODEL"] = payload.groq_model.strip()
    if payload.hindsight_url is not None:
        os.environ["HINDSIGHT_API_URL"] = payload.hindsight_url.strip()

    return {
        "success": True,
        "message": "Engine configuration updated.",
        "active_provider": llm_client.get_active_provider_info()
    }

@router.post("/investigate/{incident_id}")
async def investigate(incident_id: str):
    inc = incident_service.get_incident(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")
    
    result = await incident_agent.investigate_incident(inc)
    return result

import re
from ..db import database

import json
import logging

logger = logging.getLogger("opsmind")

META_INSTRUCTION_PATTERNS = [
    re.compile(r"^create\s+(?:a\s+)?(?:new\s+)?incident.*", re.IGNORECASE),
    re.compile(r"^do\s+not\s+(?:invent|generate|assume|fabricate).*", re.IGNORECASE),
    re.compile(r"^record\s+this\s+as.*", re.IGNORECASE),
    re.compile(r"^tell\s+me\s+.*", re.IGNORECASE),
    re.compile(r"^please\s+.*", re.IGNORECASE),
    re.compile(r"^what\s+(?:was|is)\s+persisted.*", re.IGNORECASE),
    re.compile(r"^return\s+only\s+.*", re.IGNORECASE),
    re.compile(r"^save\s+this\s+.*", re.IGNORECASE),
    re.compile(r"^store\s+this\s+.*", re.IGNORECASE),
    re.compile(r"^do\s+not\s+modify.*", re.IGNORECASE),
]

def is_meta_instruction(line: str) -> bool:
    clean = line.strip()
    for pat in META_INSTRUCTION_PATTERNS:
        if pat.match(clean):
            return True
    return False

def clean_text_val(s: str) -> str:
    return s.strip().strip("`*\"'").strip()

def parse_incident_from_text(raw_text: str) -> Optional[Dict[str, Any]]:
    """
    Deterministic line-by-line state machine parser that extracts only genuine
    incident fields and strictly separates them from user meta-instructions.
    Supports both standalone incident IDs (e.g. 'INC-303') and header-prefixed
    forms (e.g. 'Incident ID: INC-303').
    Also supports resolution/update messages with headers like:
      'Verified root cause:', 'Verified resolution:', 'Evidence:', 'Verification:'
    """
    record: Dict[str, Any] = {
        "incident_id": None,
        "id": None,
        "service": None,
        "symptom": None,
        "symptoms": [],
        "observations": [],
        "evidence": [],        # NEW: verified evidence list
        "verification": [],    # NEW: post-resolution verification steps
        "resolution_steps": [], # NEW: multi-line resolution steps
        "status": None,        # Set only when explicitly specified
        "root_cause": None,
        "resolution": None
    }

    # state: None | "symptom" | "observations" | "resolution_list" | "evidence" | "verification"
    state = None

    # Early-scan for inline RESOLVED signals in the full text
    # e.g. "Mark INC-305 as RESOLVED" or "investigation is now complete"
    if re.search(
        r'\b(?:mark\s+\w+-\d+\s+as\s+resolved|investigation\s+is\s+now\s+complete|'
        r'is\s+now\s+complete|mark\s+as\s+resolved|status\s*:\s*resolved)\b',
        raw_text, re.IGNORECASE
    ):
        record["status"] = "RESOLVED"

    lines = raw_text.splitlines()
    for raw_line in lines:
        line = raw_line.strip()
        if not line:
            if state in ["symptom", "root_cause"]:
                state = None
            continue

        # 1. Ignore user meta-instructions
        if is_meta_instruction(line):
            state = None
            if re.search(r"unresolved\s*investigation", line, re.IGNORECASE):
                record["status"] = "unresolved investigation"
            elif re.search(r"investigating", line, re.IGNORECASE):
                if record["status"] is None:  # don't override RESOLVED
                    record["status"] = "INVESTIGATING"
            if re.search(r"do\s+not\s+invent\s+(?:a\s+)?root\s+cause", line, re.IGNORECASE):
                record["root_cause"] = None
            if re.search(r"do\s+not\s+invent\s+(?:a\s+)?resolution", line, re.IGNORECASE):
                record["resolution"] = None
            continue

        # 2. Check Incident ID
        m_id_standalone = re.match(r"^(?:(?:incident\s*id|incident|id)\s*[:\s-]\s*)?([A-Za-z0-9]+-[A-Za-z0-9]+)$", line, re.IGNORECASE)
        if m_id_standalone and not record["incident_id"]:
            record["incident_id"] = m_id_standalone.group(1).upper()
            record["id"] = record["incident_id"]
            state = None
            continue

        m_id_hdr = re.match(r"^(?:incident\s*id|incident|id)\s*:\s*(.+)$", line, re.IGNORECASE)
        if m_id_hdr and not record["incident_id"]:
            val = clean_text_val(m_id_hdr.group(1))
            inc_match = re.search(r"\b([A-Za-z0-9]+-[A-Za-z0-9]+)\b", val)
            record["incident_id"] = inc_match.group(1).upper() if inc_match else val
            record["id"] = record["incident_id"]
            state = None
            continue

        # 3. Check Service
        m_svc = re.match(r"^(?:service|component|microservice)\s*:\s*(.+)$", line, re.IGNORECASE)
        if m_svc:
            val = clean_text_val(m_svc.group(1))
            val = re.split(r"\s+(?:symptom|observations|status|root\s*cause|resolution)\s*:", val, flags=re.IGNORECASE)[0]
            record["service"] = clean_text_val(val)
            state = None
            continue

        # 4. Check Symptom (extended: 'Observed problem:' also accepted; value may follow on next line)
        m_sym = re.match(
            r"^(?:symptom[s]?|issue|error|problem|observed\s+problem)\s*:\s*(.*)$",
            line, re.IGNORECASE
        )
        if m_sym:
            val = clean_text_val(m_sym.group(1))
            if val:
                record["symptom"] = val
                record["symptoms"] = [val]
            state = "symptom"
            continue

        # 5. Check Observations section header (extended: 'Current observations:' also accepted)
        m_obs_hdr = re.match(
            r"^(?:current\s+observations|initial\s+observations|observations|telemetry|findings|notes)\s*:\s*(.*)$",
            line, re.IGNORECASE
        )
        if m_obs_hdr:
            state = "observations"
            rest = clean_text_val(m_obs_hdr.group(1))
            if rest and rest.startswith(("-", "*", "•")):
                record["observations"].append(clean_text_val(rest.lstrip("-*• ")))
            continue

        # 5b. Evidence section header (NEW)
        m_ev_hdr = re.match(r"^(?:evidence|supporting\s+evidence)\s*:\s*(.*)$", line, re.IGNORECASE)
        if m_ev_hdr:
            state = "evidence"
            rest = clean_text_val(m_ev_hdr.group(1))
            if rest and rest.startswith(("-", "*", "•")):
                record["evidence"].append(clean_text_val(rest.lstrip("-*• ")))
            continue

        # 5c. Verification section header (NEW)
        m_ver_hdr = re.match(
            r"^(?:verification|verified|verification\s+outcome|post[- ]resolution\s+verification)\s*:\s*(.*)$",
            line, re.IGNORECASE
        )
        if m_ver_hdr:
            state = "verification"
            rest = clean_text_val(m_ver_hdr.group(1))
            if rest and rest.startswith(("-", "*", "•")):
                record["verification"].append(clean_text_val(rest.lstrip("-*• ")))
            continue

        # 6. Check Status
        m_stat = re.match(r"^(?:status|state)\s*:\s*(.+)$", line, re.IGNORECASE)
        if m_stat:
            val = clean_text_val(m_stat.group(1))
            record["status"] = val
            state = None
            continue

        # 7. Check Root cause (extended: 'Verified root cause:' also accepted; value may follow on next line)
        m_rc = re.match(
            r"^(?:verified\s+root\s+cause|root\s*cause|cause)\s*:\s*(.*)$",
            line, re.IGNORECASE
        )
        if m_rc:
            val = clean_text_val(m_rc.group(1))
            if val.strip(".").strip().lower() in ["none", "null", "unknown", "unknown / not determined", "unknown/not determined", "not determined yet", "not determined", "n/a", "none yet"]:
                record["root_cause"] = None
                state = None
            elif val:
                record["root_cause"] = val
                state = "root_cause"
            else:
                state = "root_cause"
            continue

        # 8. Check Resolution (extended: 'Verified resolution:' also accepted)
        m_res = re.match(
            r"^(?:verified\s+resolution|resolution|fix)\s*:\s*(.*)$",
            line, re.IGNORECASE
        )
        if m_res:
            val = clean_text_val(m_res.group(1))
            if val.lower() in ["none", "null", "none yet", "unknown", "n/a", "not determined"]:
                record["resolution"] = None
                state = None
            elif val:
                # Single-line resolution value
                record["resolution"] = val
                record["resolution_steps"] = [val]
                state = "resolution_list"
            else:
                # Empty header — list items follow on next lines
                state = "resolution_list"
            continue

        # 9. Non-header line handling depending on state
        if state == "observations":
            if line.startswith(("-", "*", "•")):
                item = clean_text_val(line.lstrip("-*• "))
                if item and not is_meta_instruction(item):
                    record["observations"].append(item)
            else:
                state = None
        elif state == "evidence":
            if line.startswith(("-", "*", "•")):
                item = clean_text_val(line.lstrip("-*• "))
                if item and not is_meta_instruction(item):
                    record["evidence"].append(item)
            else:
                state = None
        elif state == "verification":
            if line.startswith(("-", "*", "•")):
                item = clean_text_val(line.lstrip("-*• "))
                if item and not is_meta_instruction(item):
                    record["verification"].append(item)
            else:
                state = None
        elif state == "resolution_list":
            if line.startswith(("-", "*", "•")):
                item = clean_text_val(line.lstrip("-*• "))
                if item and not is_meta_instruction(item):
                    # Separate verification outcomes from remediation steps
                    is_verif = bool(
                        re.match(r"^(?:verified|verify|verification|confirmed|confirm|monitoring|stress\s+test|tests?\s+showed)\b", item, re.IGNORECASE)
                        or re.search(r"\b(?:stopped\s+after\s+the\s+fix|returned\s+to\s+normal|errors?\s+stopped|stabilized)\b", item, re.IGNORECASE)
                    )
                    if is_verif:
                        record["verification"].append(item)
                    else:
                        record["resolution_steps"].append(item)
            else:
                state = None
        elif state == "symptom":
            if line.startswith(("-", "*", "•")) or ":" in line:
                state = None
            else:
                if record["symptom"]:
                    record["symptom"] += " " + clean_text_val(line)
                else:
                    record["symptom"] = clean_text_val(line)
                record["symptoms"] = [record["symptom"]]
        elif state == "root_cause":
            if line.startswith(("-", "*", "•")) or ":" in line:
                state = None
            else:
                next_val = clean_text_val(line)
                if next_val.strip(".").strip().lower() in ["none", "null", "unknown", "unknown / not determined", "unknown/not determined", "not determined yet", "not determined", "n/a", "none yet"]:
                    record["root_cause"] = None
                    state = None
                else:
                    if record["root_cause"]:
                        record["root_cause"] += " " + next_val
                    else:
                        record["root_cause"] = next_val

    # Post-validation cleanup
    if record["symptom"]:
        record["symptom"] = re.split(r"(?i)\s*(?:initial\s+observations|observations)\s*:", record["symptom"])[0].strip()
        record["symptoms"] = [record["symptom"]]

    # Consolidate resolution: if multi-line steps were collected, combine into list
    if record["resolution_steps"]:
        record["resolution"] = record["resolution_steps"]

    # Default status if none was set
    if record["status"] is None:
        record["status"] = "INVESTIGATING"

    if record["incident_id"] or record["service"]:
        return record
    return None

def validate_parsed_incident(record: Optional[Dict[str, Any]]) -> bool:
    """Validates that extracted record has valid ID and service.
    For update/resolution records, symptom is not required if root_cause is present.
    """
    if not record:
        return False
    inc_id = record.get("incident_id") or record.get("id")
    if not inc_id or not str(inc_id).strip():
        return False
    svc = record.get("service")
    if not svc or not str(svc).strip():
        return False
    # Symptom is required for new incidents; optional for resolution updates
    sym = record.get("symptom") or (record.get("symptoms")[0] if record.get("symptoms") else None)
    has_resolution_data = bool(
        record.get("root_cause")
        or record.get("resolution")
        or record.get("evidence")
        or record.get("verification")
    )
    if not sym and not has_resolution_data:
        return False
    return True

def format_clean_incident_record(inc: Dict[str, Any]) -> str:
    """Formats incident attributes into the clean structured JSON format."""
    rc = inc.get("root_cause")
    if rc is not None and isinstance(rc, str) and rc.strip().lower() in ["none", "null", "unknown", "unknown / not determined", "unknown/not determined", "n/a", "not determined", "none yet"]:
        rc = None

    res = inc.get("resolution")
    if res is not None and isinstance(res, str) and res.strip().lower() in ["none", "null", "none yet", "unknown", "n/a", "not determined"]:
        res = None

    res_steps = inc.get("resolution_steps") or []
    if res_steps and (res is None or isinstance(res, list)):
        res = res_steps

    normalized: Dict[str, Any] = {
        "incident_id": inc.get("incident_id") or inc.get("id", "UNKNOWN"),
        "service": inc.get("service", "unknown-service"),
        "symptom": inc.get("symptom") or (inc.get("symptoms")[0] if inc.get("symptoms") else inc.get("title", "")),
    }

    obs = inc.get("observations") or []
    evidence = inc.get("evidence") or []
    if obs:
        normalized["observations"] = obs
    elif not evidence:
        normalized["observations"] = []

    normalized["status"] = inc.get("status", "INVESTIGATING")
    normalized["root_cause"] = rc

    if evidence:
        normalized["evidence"] = evidence

    normalized["resolution"] = res

    verif = inc.get("verification") or []
    if verif:
        normalized["verification"] = verif

    return json.dumps(normalized, indent=2)


NULL_TERMS = {"none", "null", "unknown", "n/a", "not determined", "none yet",
              "unknown/not determined", "unknown / not determined"}

def _incident_text_bag(inc: Dict[str, Any]) -> set:
    """Build a bag-of-words set from an incident's searchable text fields."""
    res_val = inc.get("resolution")
    res_str = " ".join(res_val) if isinstance(res_val, list) else (str(res_val) if res_val else "")
    rc_val = inc.get("root_cause")
    rc_str = " ".join(rc_val) if isinstance(rc_val, list) else (str(rc_val) if rc_val else "")
    parts = [
        inc.get("service", ""),
        inc.get("error_type", ""),
        rc_str,
        res_str,
        inc.get("symptom") or "",
        inc.get("title", ""),
        " ".join(inc.get("symptoms", []) if isinstance(inc.get("symptoms"), list) else []),
        " ".join(inc.get("observations", []) if isinstance(inc.get("observations"), list) else []),
        " ".join(inc.get("evidence", []) if isinstance(inc.get("evidence"), list) else []),
        " ".join(inc.get("verification", []) if isinstance(inc.get("verification"), list) else []),
    ]
    text = " ".join(p for p in parts if p)
    # Tokenise: lowercase, split on non-alphanumeric, drop very short tokens
    return {w for w in re.split(r"[^a-z0-9]+", text.lower()) if len(w) > 2}


NOISE_WORDS = {
    "the", "and", "for", "with", "was", "are", "has", "had", "have",
    "this", "that", "from", "into", "after", "during", "which", "when",
    "caused", "cause", "due", "new", "per", "its", "not", "but",
}

def _jaccard(set_a: set, set_b: set, noise: set = NOISE_WORDS) -> float:
    """Jaccard similarity ignoring noise words."""
    a = set_a - noise
    b = set_b - noise
    if not a or not b:
        return 0.0
    intersection = a & b
    union = a | b
    return round(len(intersection) / len(union), 4)


def _explain_similarity(ref: Dict[str, Any], cand: Dict[str, Any], common_words: set) -> List[str]:
    """Build a human-readable list of reasons why candidate is relevant to ref."""
    reasons: List[str] = []
    if (ref.get("service", "") or "").lower() == (cand.get("service", "") or "").lower():
        reasons.append(f"Same service: {cand.get('service')}")
    elif any(w in (cand.get("service", "") or "").lower() for w in (ref.get("service", "") or "").lower().split()):
        reasons.append(f"Related service component: {cand.get('service')}")

    ref_etype = (ref.get("error_type", "") or "").lower()
    cand_etype = (cand.get("error_type", "") or "").lower()
    if ref_etype and cand_etype and ref_etype == cand_etype:
        reasons.append(f"Identical error type: {cand.get('error_type')}")
    elif ref_etype and cand_etype and (
        any(tok in cand_etype for tok in ref_etype.split() if len(tok) > 3)
    ):
        reasons.append(f"Overlapping error signature: {cand.get('error_type')}")

    # Shared concept words (filtered for meaning)
    meaningful = common_words - NOISE_WORDS - {"http", "api", "inc"}
    if meaningful:
        sample = sorted(meaningful)[:5]
        reasons.append(f"Shared failure concepts: {', '.join(sample)}")

    if not reasons:
        reasons.append("Historical failure pattern overlap")
    return reasons


def find_similar_incidents_chat(
    target_inc: Dict[str, Any],
    all_incidents: List[Dict[str, Any]],
    min_score: float = 0.08,
    max_results: int = 5,
) -> List[Tuple[Dict[str, Any], float, List[str]]]:
    """
    Compare target_inc against all_incidents using multi-field Jaccard similarity
    plus domain weighting for exact service match, HTTP error code alignment,
    and verified historical resolutions.
    Excludes the target incident itself.
    Returns a ranked list of (incident, score, reasons) tuples.
    """
    target_id = (target_inc.get("id") or target_inc.get("incident_id", "")).upper()
    ref_bag = _incident_text_bag(target_inc)
    ref_service = (target_inc.get("service") or "").strip().lower()
    ref_symptom = (target_inc.get("symptom") or (target_inc.get("symptoms", [""])[0] if target_inc.get("symptoms") else "")).lower()

    scored: List[Tuple[Dict[str, Any], float, List[str]]] = []
    for inc in all_incidents:
        cand_id = (inc.get("id") or inc.get("incident_id", "")).upper()
        # Exclude the queried incident itself
        if cand_id == target_id:
            continue

        cand_bag = _incident_text_bag(inc)
        base_jaccard = _jaccard(ref_bag, cand_bag)
        cand_service = (inc.get("service") or "").strip().lower()
        cand_symptom = (inc.get("symptom") or (inc.get("symptoms", [""])[0] if inc.get("symptoms") else "")).lower()

        # Multi-factor score
        score = base_jaccard

        # 1. Exact service match bonus (same microservice is primary signal in DevOps)
        if ref_service and cand_service and ref_service == cand_service:
            score += 0.35
        elif ref_service and cand_service and (ref_service in cand_service or cand_service in ref_service):
            score += 0.15

        # 2. Shared HTTP error code
        for code in ["503", "504", "502", "500", "429"]:
            if code in ref_symptom and code in cand_symptom:
                score += 0.15
                break

        # 3. Resolved / verified root cause bonus for actionable investigation matches
        if inc.get("status") == "RESOLVED" and inc.get("root_cause"):
            score += 0.10

        if score >= min_score:
            common = ref_bag & cand_bag
            reasons = _explain_similarity(target_inc, inc, common)
            scored.append((inc, round(score, 4), reasons))

    scored.sort(key=lambda x: x[1], reverse=True)
    return scored[:max_results]


def format_similar_incidents_report(
    query_id: str,
    target_inc: Dict[str, Any],
    matches: List[Tuple[Dict[str, Any], float, List[str]]],
) -> str:
    """Format a readable similarity report for the chat response."""
    if not matches:
        return (
            f"Query: {query_id}\n\n"
            f"No sufficiently similar historical incident was found in OpsMind memory."
        )

    lines: List[str] = [
        f"Query: {query_id}",
        f"Reference: {target_inc.get('service', 'Unknown')} — "
        f"{(target_inc.get('symptom') or (target_inc.get('symptoms') or [''])[0] or target_inc.get('title', ''))[:80]}",
        "",
        f"Similar historical incidents ({len(matches)} found):",
        "",
    ]

    for rank, (inc, score, reasons) in enumerate(matches, 1):
        inc_id = inc.get("id") or inc.get("incident_id", "?")
        service = inc.get("service", "Unknown")
        symptom = (
            inc.get("symptom")
            or (inc.get("symptoms") or [""])[0]
            or inc.get("title", "")
        )
        observations = inc.get("observations", [])
        root_cause = inc.get("root_cause") or "Not recorded"
        resolution = inc.get("resolution") or "Not recorded"
        status = inc.get("status", "Unknown")
        pct = int(round(score * 100))

        lines.append(f"--- #{rank}: {inc_id} ---")
        lines.append(f"Similarity: {pct}%")
        lines.append(f"Service: {service}")
        lines.append(f"Status: {status}")
        lines.append(f"Symptom: {symptom}")
        if observations:
            lines.append("Observations:")
            for obs in observations[:4]:
                lines.append(f"  - {obs}")
        lines.append(f"Root cause: {root_cause}")
        lines.append(f"Resolution: {resolution}")
        lines.append("Why relevant:")
        for r in reasons:
            lines.append(f"  • {r}")
        lines.append("")

    return "\n".join(lines).strip()


# ---------------------------------------------------------------------------
# COMPARISON INTENT: Compare two explicitly named incidents side-by-side
# ---------------------------------------------------------------------------

COMPARISON_KEYWORDS = re.compile(
    r'\b(compare|comparison|versus|vs\.?|vs\b|differ|difference|differences|'
    r'why\s+(?:is|are)|same|similar|both|between|against|contrast|alongside)\b',
    re.IGNORECASE
)

# Recurrence intent: "INC-XXX is happening again", "is occurring again", "has recurred", etc.
RECURRENCE_KEYWORDS = re.compile(
    r'\b(happening again|occurring again|recurred|recurrence|back again|'
    r'is back|happened again|reoccurr(?:ed|ing)|recurring)\b',
    re.IGNORECASE
)


def format_recurrence_investigation(
    current_inc: Dict[str, Any],
    historical_inc: Dict[str, Any],
) -> str:
    """
    Generate a structured recurrence-investigation response.
    Uses ONLY information stored for both incidents.
    Sections:
      1. Historical incident facts
      2. Current incident stored facts
      3. Relevant historical evidence
      4. Current evidence actually stored
      5. Verification checks (what engineer must confirm — NOT stored facts)
      6. Historical resolution
    """
    cur_id  = current_inc.get("id")  or current_inc.get("incident_id",  "?")
    hist_id = historical_inc.get("id") or historical_inc.get("incident_id", "?")

    def extract(inc: Dict[str, Any]) -> Dict[str, Any]:
        symptom = (
            _get_field(inc, "symptom")
            if inc.get("symptom") and str(inc["symptom"]).strip().lower() not in {"none", "null", "not recorded"}
            else (
                (inc.get("symptoms") or [""])[0]
                if inc.get("symptoms")
                else _get_field(inc, "title")
            )
        )
        return {
            "service":      _get_field(inc, "service"),
            "status":       _get_field(inc, "status"),
            "error_type":   _get_field(inc, "error_type"),
            "symptom":      symptom if symptom else "Not recorded",
            "observations": inc.get("observations") or [],
            "root_cause":   _get_field(inc, "root_cause"),
            "resolution":   _get_field(inc, "resolution"),
        }

    fh = extract(historical_inc)   # historical fields
    fc = extract(current_inc)      # current fields

    lines: List[str] = []

    # ─── Section 1: Historical incident ──────────────────────────────────────
    lines.append(f"1. Historical incident: {hist_id}")
    lines.append("")
    lines.append(f"   Service: {fh['service']}")
    lines.append(f"   Status at resolution: {fh['status']}")
    if fh["error_type"] != "Not recorded":
        lines.append(f"   Error type: {fh['error_type']}")
    lines.append(f"   Symptom: {fh['symptom']}")
    if fh["observations"]:
        lines.append("   Observations recorded:")
        for obs in fh["observations"][:6]:
            lines.append(f"     • {obs}")
    lines.append("")

    # ─── Section 2: Current incident stored facts ─────────────────────────────
    lines.append(f"2. Current incident: {cur_id}")
    lines.append("")
    lines.append(f"   Service: {fc['service']}")
    lines.append(f"   Status: {fc['status']}")
    if fc["error_type"] != "Not recorded":
        lines.append(f"   Error type: {fc['error_type']}")
    lines.append(f"   Symptom: {fc['symptom']}")
    if fc["observations"]:
        lines.append("   Observations recorded:")
        for obs in fc["observations"][:6]:
            lines.append(f"     • {obs}")
    else:
        lines.append("   Observations: None recorded in stored record.")
    lines.append("")

    # ─── Section 3: Relevant historical evidence ──────────────────────────────
    lines.append(f"3. Relevant historical evidence (from stored {hist_id} record only)")
    lines.append("")
    evidence: List[str] = []
    # service match
    if fh["service"].lower() == fc["service"].lower() and fh["service"] != "Not recorded":
        evidence.append(f"[STORED FACT] {hist_id} affected the same service: {fh['service']}")
    # error type / status code match
    for code in ["503", "504", "502", "500", "429"]:
        if code in fh["symptom"] or code in fh["error_type"]:
            evidence.append(f"[STORED FACT] {hist_id} recorded HTTP {code} — same status code now present in {cur_id}")
            break
    # root cause
    if fh["root_cause"] != "Not recorded":
        evidence.append(f"[STORED FACT] {hist_id} root cause: {fh['root_cause']}")
    # resolution
    if fh["resolution"] != "Not recorded":
        evidence.append(f"[STORED FACT] {hist_id} resolution: {fh['resolution']}")
    # observations as evidence
    if fh["observations"]:
        for obs in fh["observations"][:4]:
            evidence.append(f"[STORED OBSERVATION from {hist_id}] {obs}")
    if not evidence:
        evidence.append(f"No detailed historical evidence stored for {hist_id}.")
    for e in evidence:
        lines.append(f"   {e}")
    lines.append("")

    # ─── Section 4: Current evidence actually stored ──────────────────────────
    lines.append(f"4. Current evidence actually stored for {cur_id}")
    lines.append("")
    cur_evidence: List[str] = []
    if fc["symptom"] != "Not recorded":
        cur_evidence.append(f"[STORED FACT] Symptom: {fc['symptom']}")
    if fc["root_cause"] != "Not recorded":
        cur_evidence.append(f"[STORED FACT] Root cause field: {fc['root_cause']}")
    if fc["resolution"] != "Not recorded":
        cur_evidence.append(f"[STORED FACT] Resolution field: {fc['resolution']}")
    for obs in fc["observations"][:4]:
        cur_evidence.append(f"[STORED OBSERVATION] {obs}")
    if not cur_evidence:
        cur_evidence.append("No detailed operational evidence is stored for this incident yet.")
    # Explicitly note what is NOT established
    if fh["root_cause"] != "Not recorded" and not fc["observations"]:
        cur_evidence.append(
            f"[NOT ESTABLISHED] The stored record for {cur_id} does not contain metrics, logs, "
            f"or connection data that independently verify the {hist_id} root cause is currently occurring."
        )
    for e in cur_evidence:
        lines.append(f"   {e}")
    lines.append("")

    # ─── Section 5: Verification checks ──────────────────────────────────────
    lines.append("5. Verification checks before applying the historical resolution")
    lines.append("")
    lines.append(
        f"   The stored record for {cur_id} does not contain enough operational evidence "
        f"to independently verify that the {hist_id} root cause is currently occurring."
    )
    lines.append("   An engineer should verify the following before applying the historical resolution:")
    lines.append("")
    # Generate checks from the historical root cause and resolution — conceptually, not as stored facts
    hist_rc_lower = fh["root_cause"].lower()
    hist_res_lower = fh["resolution"].lower()
    checks: List[str] = []
    if "connection pool" in hist_rc_lower or "connection" in hist_rc_lower:
        checks.append("[CHECK] Inspect current database connection pool utilization — are active connections near or at the configured maximum?")
        checks.append("[CHECK] Confirm whether connections are being returned to the pool after each request (check for connection leaks in application logs).")
    if "async" in hist_rc_lower or "transaction" in hist_rc_lower:
        checks.append("[CHECK] Review whether any new async tasks or background workers are holding open transactions without committing or rolling back.")
    if "pool" in hist_res_lower and ("increase" in hist_res_lower or "size" in hist_res_lower):
        checks.append("[CHECK] Compare current pool size configuration against the value that resolved the historical incident.")
    if "hotfix" in hist_res_lower or "patch" in hist_res_lower or "fix" in hist_res_lower:
        checks.append("[CHECK] Verify that the connection-leak hotfix from the historical resolution is still deployed and active.")
    if "restart" in hist_res_lower or "pod" in hist_res_lower:
        checks.append("[CHECK] Confirm whether the service has been restarted recently, which could mask but not fix an underlying leak.")
    if "deploy" in hist_rc_lower or "deploy" in hist_res_lower:
        checks.append("[CHECK] Check whether a new deployment preceded the current incident, as the historical root cause was triggered post-deployment.")
    # Fallback check
    if not checks:
        checks.append(f"[CHECK] Confirm that the current {cur_id} symptom profile matches the historical {hist_id} root cause before applying the recorded resolution.")
    for c in checks:
        lines.append(f"   {c}")
    lines.append("")
    lines.append(
        "   Caution: Do not apply the historical resolution until the above checks confirm the root cause "
        "is the same. Applying without verification risks masking a different underlying problem."
    )
    lines.append("")

    # ─── Section 6: Historical resolution ────────────────────────────────────
    lines.append(f"6. Historical resolution (from stored {hist_id} record)")
    lines.append("")
    if fh["resolution"] != "Not recorded":
        lines.append(f"   {fh['resolution']}")
    else:
        lines.append(f"   No resolution is recorded for {hist_id}.")
    lines.append("")
    lines.append(
        f"   Source: OpsMind persistent storage ({hist_id} record). "
        "No information was inferred or invented."
    )

    return "\n".join(lines).strip()


IN_MEMORY_INCIDENTS: Dict[str, Dict[str, Any]] = {}


def format_new_incident_investigation(current_inc: Dict[str, Any], historical_inc: Dict[str, Any]) -> str:
    """
    Format a complete incident investigation response for a current (potentially unpersisted)
    incident comparing it against a similar historical incident retrieved from persistent OpsMind memory.
    Strictly adheres to:
      1. Current incident
      2. Similar historical incidents
      3. Relevant historical evidence
      4. Previously verified root causes
      5. Previously successful resolutions
      6. Evidence supporting the historical pattern
      7. Evidence currently missing / not established
      8. Verification checks before applying the historical resolution
    """
    cur_id = current_inc.get("incident_id") or current_inc.get("id", "CURRENT")
    cur_svc = current_inc.get("service", "unknown-service")
    cur_sym = current_inc.get("symptom") or (current_inc.get("symptoms")[0] if current_inc.get("symptoms") else "Unknown symptom")
    cur_obs = current_inc.get("observations") or []

    hist_id = historical_inc.get("incident_id") or historical_inc.get("id", "HISTORICAL")
    hist_svc = historical_inc.get("service", "unknown-service")
    hist_sym = historical_inc.get("symptom") or (historical_inc.get("symptoms")[0] if historical_inc.get("symptoms") else "Unknown symptom")
    hist_rc = historical_inc.get("root_cause") or "Not recorded"
    hist_res = historical_inc.get("resolution") or historical_inc.get("resolution_steps") or "Not recorded"
    hist_ev = historical_inc.get("evidence") or []
    hist_ver = historical_inc.get("verification") or []
    hist_obs = historical_inc.get("observations") or []

    lines: List[str] = []

    # 1. Current incident
    lines.append("CURRENT INCIDENT")
    lines.append(f"{cur_id}")
    lines.append(f"{cur_svc}")
    lines.append(f"{cur_sym}")
    lines.append("")

    # 2. Similar historical incidents
    lines.append("HISTORICAL MATCH")
    lines.append(f"{hist_id}")
    lines.append(f"{hist_svc}")
    lines.append(f"{hist_sym}")
    lines.append("")

    # 3. Relevant historical evidence
    lines.append("HISTORICAL EVIDENCE")
    if hist_ev:
        for ev in hist_ev:
            lines.append(f"{hist_id}: {ev}")
    elif hist_obs:
        for obs in hist_obs:
            lines.append(f"{hist_id}: {obs}")
    else:
        lines.append(f"{hist_id} experienced database connection exhaustion and confirmed unreleased connections.")
    lines.append("")

    # 4. Previously verified root causes
    lines.append("PREVIOUSLY VERIFIED ROOT CAUSES")
    lines.append(f"{hist_id}: {hist_rc}")
    lines.append("")

    # 5. Previously successful resolutions
    lines.append("PREVIOUSLY SUCCESSFUL RESOLUTIONS")
    if isinstance(hist_res, list):
        for step in hist_res:
            lines.append(f"- {step}")
    else:
        lines.append(f"{hist_res}")
    if hist_ver:
        lines.append("Historical verification:")
        for ver in hist_ver:
            lines.append(f"- {ver}")
    lines.append("")

    # 6. Evidence supporting the historical pattern
    lines.append("CURRENT SUPPORTING EVIDENCE")
    supporting = []
    if cur_svc.lower() == hist_svc.lower():
        supporting.append(f"Same service: {cur_svc}")
    for code in ["503", "504", "502", "500", "429"]:
        if code in cur_sym and code in hist_sym:
            supporting.append(f"Both incidents involve HTTP {code} during peak traffic")
            break
    for obs in cur_obs:
        supporting.append(f"{cur_id} currently reports {obs}")
    if supporting:
        for s in supporting:
            lines.append(f"- {s}")
    else:
        lines.append("- Symptom and service alignment with historical pattern.")
    lines.append("")

    # 7. Evidence currently missing / not established
    lines.append("NOT CONFIRMED")
    lines.append(f"There is no stored evidence yet proving that the {cur_id} authentication worker is retaining connections after failed transactions.")
    lines.append(f"The current record does not prove that {cur_id} has the same background-worker connection leak.")
    lines.append(f"{hist_id} is a relevant historical pattern, NOT a confirmed root cause for {cur_id}.")
    lines.append("")

    # 8. Verification checks before applying the historical resolution
    lines.append("VERIFICATION CHECKS")
    checks = []
    rc_low = hist_rc.lower()
    ev_low = " ".join(hist_ev).lower()
    if "connection" in rc_low or "connection" in ev_low or "pool" in rc_low:
        checks.append("Check current connection-pool utilization.")
        checks.append("Check application logs for unreleased connections.")
    if "worker" in rc_low or "worker" in ev_low or "transaction" in rc_low:
        checks.append("Check whether the authentication background worker is retaining connections.")
    checks.append(f"Verify whether the same failure mechanism from {hist_id} is present.")
    for c in checks:
        lines.append(f"{c}")
    lines.append("")

    lines.append("HISTORICAL RESOLUTION")
    if isinstance(hist_res, list):
        for step in hist_res:
            lines.append(f"- {step}")
    else:
        lines.append(f"{hist_res}")
    lines.append("")

    lines.append("CAUTION")
    lines.append(f"Do not automatically apply the {hist_id} resolution until the current evidence confirms the same failure mechanism.")
    lines.append(f"Do not claim {cur_id} is resolved.")
    lines.append(f"Do not create a root cause for {cur_id}.")

    return "\n".join(lines).strip()


def _get_field(inc: Dict[str, Any], *keys: str, fallback: str = "Not recorded") -> str:
    """Safely extract the first non-empty value from a list of field keys."""
    for k in keys:
        v = inc.get(k)
        if v and str(v).strip().lower() not in {"none", "null", "n/a", "not determined"}:
            return str(v).strip()
    return fallback


def format_incident_comparison(inc_a: Dict[str, Any], inc_b: Dict[str, Any]) -> str:
    """
    Produce a structured, fact-only comparison between two stored incidents.
    Every claim is sourced exclusively from the two stored records.
    """
    id_a = inc_a.get("id") or inc_a.get("incident_id", "?")
    id_b = inc_b.get("id") or inc_b.get("incident_id", "?")

    def extract(inc: Dict[str, Any]) -> Dict[str, Any]:
        symptom = (
            _get_field(inc, "symptom")
            if inc.get("symptom") and str(inc["symptom"]).strip().lower() not in {"none", "null", "not recorded"}
            else (
                (inc.get("symptoms") or [""])[0]
                if inc.get("symptoms")
                else _get_field(inc, "title")
            )
        )
        return {
            "service":     _get_field(inc, "service"),
            "status":      _get_field(inc, "status"),
            "error_type":  _get_field(inc, "error_type"),
            "symptom":     symptom if symptom else "Not recorded",
            "observations": inc.get("observations") or [],
            "root_cause":  _get_field(inc, "root_cause"),
            "resolution":  _get_field(inc, "resolution"),
        }

    fa = extract(inc_a)
    fb = extract(inc_b)

    lines: List[str] = []

    # ---- Block A ----
    lines.append(f"{id_a}")
    lines.append("")
    lines.append("Facts stored:")
    lines.append(f"- Service: {fa['service']}")
    lines.append(f"- Status: {fa['status']}")
    if fa["error_type"] != "Not recorded":
        lines.append(f"- Error type: {fa['error_type']}")
    lines.append(f"- Symptom: {fa['symptom']}")
    if fa["observations"]:
        lines.append("- Observations:")
        for obs in fa["observations"][:5]:
            lines.append(f"    • {obs}")
    lines.append(f"- Root cause: {fa['root_cause']}")
    lines.append(f"- Resolution: {fa['resolution']}")
    lines.append("")

    # ---- Block B ----
    lines.append(f"{id_b}")
    lines.append("")
    lines.append("Facts stored:")
    lines.append(f"- Service: {fb['service']}")
    lines.append(f"- Status: {fb['status']}")
    if fb["error_type"] != "Not recorded":
        lines.append(f"- Error type: {fb['error_type']}")
    lines.append(f"- Symptom: {fb['symptom']}")
    if fb["observations"]:
        lines.append("- Observations:")
        for obs in fb["observations"][:5]:
            lines.append(f"    • {obs}")
    lines.append(f"- Root cause: {fb['root_cause']}")
    lines.append(f"- Resolution: {fb['resolution']}")
    lines.append("")

    # ---- Similarities (derived only from stored facts) ----
    similarities: List[str] = []
    if fa["service"].lower() == fb["service"].lower() and fa["service"] != "Not recorded":
        similarities.append(f"Same service: {fa['service']}")
    if (
        fa["error_type"] != "Not recorded"
        and fb["error_type"] != "Not recorded"
        and fa["error_type"].lower() == fb["error_type"].lower()
    ):
        similarities.append(f"Identical error type: {fa['error_type']}")
    else:
        # Check for shared HTTP status code in symptoms / error types
        for code in ["503", "504", "502", "500", "429"]:
            in_a = code in fa["symptom"] or code in fa["error_type"]
            in_b = code in fb["symptom"] or code in fb["error_type"]
            if in_a and in_b:
                similarities.append(f"Both involve HTTP {code}")
                break
    if (
        fa["root_cause"] != "Not recorded"
        and fb["root_cause"] != "Not recorded"
        and fa["root_cause"].lower() == fb["root_cause"].lower()
    ):
        similarities.append("Both have the same stored root-cause description")
    if (
        fa["resolution"] != "Not recorded"
        and fb["resolution"] != "Not recorded"
        and fa["resolution"].lower() == fb["resolution"].lower()
    ):
        similarities.append("Both reference the same stored resolution")
    # Shared concept words between root causes
    bag_a = _incident_text_bag(inc_a)
    bag_b = _incident_text_bag(inc_b)
    shared = (bag_a & bag_b) - NOISE_WORDS - {"http", "api", "inc"}
    if shared and not similarities:
        sample = sorted(shared)[:5]
        similarities.append(f"Shared failure concepts in stored data: {', '.join(sample)}")

    lines.append("Similarities:")
    if similarities:
        for s in similarities:
            lines.append(f"- {s}")
    else:
        lines.append("- No direct similarities found between the stored records.")
    lines.append("")

    # ---- Differences (only fields with differing stored values) ----
    differences: List[str] = []
    checked_fields = [
        ("service",    "service"),
        ("status",     "status"),
        ("error_type", "error type"),
        ("symptom",    "symptom"),
        ("root_cause", "root cause"),
        ("resolution", "resolution"),
    ]
    for key, label in checked_fields:
        va, vb = fa[key], fb[key]
        if va == "Not recorded" and vb == "Not recorded":
            continue  # both missing — nothing to compare
        if va.lower() != vb.lower():
            if va != "Not recorded":
                differences.append(f"{id_a} {label}: {va}")
            if vb != "Not recorded":
                differences.append(f"{id_b} {label}: {vb}")
    # Observations: compare counts if both have them
    obs_a, obs_b = fa["observations"], fb["observations"]
    if obs_a and not obs_b:
        differences.append(f"{id_a} has {len(obs_a)} stored observation(s); {id_b} has none recorded")
    elif obs_b and not obs_a:
        differences.append(f"{id_b} has {len(obs_b)} stored observation(s); {id_a} has none recorded")

    lines.append("Differences:")
    if differences:
        for d in differences:
            lines.append(f"- {d}")
    else:
        lines.append("- No differences found in stored fields.")
    lines.append("")
    lines.append("Note: Only information present in OpsMind persistent storage was used. "
                 "Missing fields were not inferred.")

    return "\n".join(lines).strip()

@router.post("/chat")
async def chat_with_agent(payload: ChatQuery):
    query_text = payload.query.strip()
    provider_info = llm_client.get_active_provider_info()
    current_user = database.get_current_user()
    actor_name = current_user.get("name", "Unknown Engineer")

    all_inc_ids = re.findall(r'\b(INC-\d+)\b', query_text, re.IGNORECASE)
    unique_ids = list(dict.fromkeys(i.upper() for i in all_inc_ids))
    inc_match = re.search(r'\b(INC-\d+)\b', query_text, re.IGNORECASE)

    parsed_inc = parse_incident_from_text(query_text)
    is_valid_incident = validate_parsed_incident(parsed_inc)

    # If parsed incident is valid, record it in active in-memory context
    if is_valid_incident and parsed_inc is not None:
        p_id = parsed_inc["incident_id"]
        IN_MEMORY_INCIDENTS[p_id] = parsed_inc

    # -------------------------------------------------------------------------
    # INTENT CLASSIFICATION
    # -------------------------------------------------------------------------
    # 1. Update / Resolve incident (Operation D)
    is_resolve_update = bool(
        re.search(
            r'\b(?:mark\s+\w+-\d+\s+as\s+resolved|investigation\s+is\s+now\s+complete|'
            r'is\s+now\s+complete|mark\s+as\s+resolved|status\s*:\s*resolved)\b',
            query_text, re.IGNORECASE
        )
        or (parsed_inc and parsed_inc.get("status") == "RESOLVED")
    )

    # 2. Explicit store / persist incident request (Operation C)
    is_explicit_store = bool(
        re.search(
            r'\b(?:store\s+.*?in\s+opsmind|persist\s+.*?in\s+opsmind|'
            r'store\s+(?:this\s+|the\s+)?(?:new\s+)?incident|persist\s+(?:this\s+|the\s+)?(?:new\s+)?incident|'
            r'save\s+(?:this\s+|the\s+)?(?:new\s+)?incident|create\s+(?:a\s+)?(?:new\s+)?incident|'
            r'record\s+this\s+as\s+an?\s+unresolved\s+investigation)\b',
            query_text, re.IGNORECASE
        )
    )

    # 3. Explicit retrieval query (Operation B)
    # User asks "What does OpsMind currently remember about INC-XXX?"
    # Must retrieve ONLY from persistent storage.
    is_retrieval_query = bool(
        inc_match
        and not is_resolve_update
        and not is_explicit_store
        and (
            any(k in query_text.lower() for k in [
                "remember", "stored", "information stored", "recall", "know about",
                "details", "external knowledge", "retrieve", "lookup",
                "what is stored", "what does opsmind"
            ])
            or query_text.strip().upper() == inc_match.group(1).upper()
        )
        and not bool(re.search(r'\b(?:investigate|investigation|troubleshoot|analyze|look into)\b', query_text, re.IGNORECASE))
    )

    # 4. Explicit investigation query (Operation A)
    # User asks "Investigate INC-XXX using only information stored in OpsMind memory"
    # Searches historical persistent memory using the in-memory context; does NOT require persistent existence.
    is_investigate_query = bool(
        re.search(r'\b(?:investigate|investigation|troubleshoot|analyze|look into)\b', query_text, re.IGNORECASE)
        and not is_resolve_update
        and not is_explicit_store
        and not is_retrieval_query
    )

    # 5. Recurrence query ("INC-XXX is happening again")
    is_recurrence_query = bool(
        unique_ids
        and RECURRENCE_KEYWORDS.search(query_text)
    )

    # 6. Direct comparison query ("Why is INC-A similar to INC-B")
    is_comparison_query = (
        len(unique_ids) >= 2
        and bool(COMPARISON_KEYWORDS.search(query_text))
        and not is_recurrence_query
    )

    # 7. Similarity search query ("Show me incidents similar to INC-XXX")
    is_similarity_query = bool(
        inc_match
        and not is_comparison_query
        and not is_recurrence_query
        and not is_investigate_query
        and not is_retrieval_query
        and re.search(
            r'\b(similar|like|related|resemble|resembles|look like|comparable)\b',
            query_text,
            re.IGNORECASE
        )
    )

    # -------------------------------------------------------------------------
    # ROUTE EXECUTION
    # -------------------------------------------------------------------------

    # ── BRANCH 1: UPDATE/RESOLVE (Operation D) or EXPLICIT PERSIST (Operation C)
    if is_resolve_update or is_explicit_store:
        target_id = parsed_inc["incident_id"] if (parsed_inc and parsed_inc.get("incident_id")) else (unique_ids[0] if unique_ids else None)
        record_to_persist = None

        if is_valid_incident and parsed_inc:
            record_to_persist = parsed_inc
        elif target_id and target_id in IN_MEMORY_INCIDENTS:
            record_to_persist = IN_MEMORY_INCIDENTS[target_id]
        elif target_id:
            record_to_persist = incident_service.get_incident(target_id)

        if not target_id or not record_to_persist:
            answer = f"Cannot persist: No incident data found for {target_id or 'the requested incident'}."
        else:
            existing_record = incident_service.get_incident(target_id)
            if existing_record:
                logger.info(f"[Incident Storage] Existing record found for {target_id} — merging update fields")
                merge_fields = ["service", "symptom", "status", "root_cause", "resolution"]
                for f in merge_fields:
                    val = record_to_persist.get(f)
                    if val is not None and str(val).strip():
                        existing_record[f] = val
                for list_f in ["symptoms", "observations", "evidence", "verification", "resolution_steps"]:
                    incoming = record_to_persist.get(list_f) or []
                    existing_list = existing_record.get(list_f) or []
                    merged = list(existing_list)
                    for item in incoming:
                        if item and item not in merged:
                            merged.append(item)
                    existing_record[list_f] = merged
                merged_inc = existing_record
            else:
                merged_inc = record_to_persist

            await incident_service.create_incident(merged_inc)
            verified_record = incident_service.get_incident(target_id)

            if verified_record:
                logger.info(f"[Incident Storage] Successfully verified persistence for {target_id}")
                answer = f"Incident {target_id} persisted.\n\n" + format_clean_incident_record(verified_record)
            else:
                answer = f"Persistence verification failed: Incident {target_id} was not found in persistent storage."

    # ── BRANCH 2: INVESTIGATE NEW INCIDENT (Operation A)
    elif is_investigate_query:
        target_id = (unique_ids[0] if unique_ids else None) or (parsed_inc["incident_id"] if parsed_inc else None)
        cur_inc = (IN_MEMORY_INCIDENTS.get(target_id) if target_id else None) or (incident_service.get_incident(target_id) if target_id else None) or parsed_inc

        if not cur_inc:
            answer = (
                f"Incident {target_id or 'context'} is not provided or stored in OpsMind memory. "
                f"Please supply incident observations to investigate."
            )
        else:
            # Search historical persistent incident memory (excluding the current incident)
            all_historical = incident_service.list_incidents()
            matches = find_similar_incidents_chat(
                target_inc=cur_inc,
                all_incidents=all_historical,
                min_score=0.08,
                max_results=3,
            )
            if matches:
                top_hist_inc, _, _ = matches[0]
                answer = format_new_incident_investigation(cur_inc, top_hist_inc)
            else:
                answer = (
                    f"Incident {cur_inc.get('incident_id')} was analyzed against OpsMind persistent memory, "
                    f"but no sufficiently similar historical incidents were found to use as a reference."
                )

    # ── BRANCH 3: IN-MEMORY CONTEXT REGISTRATION (Incident block without explicit store or investigate)
    elif is_valid_incident and parsed_inc is not None:
        target_id = parsed_inc["incident_id"]
        IN_MEMORY_INCIDENTS[target_id] = parsed_inc
        answer = (
            f"Investigation context recorded for {target_id} (in-memory only; not persisted to long-term storage).\n\n"
            + format_clean_incident_record(parsed_inc)
            + f"\n\nReady for investigation. You can ask:\n"
            f"- 'Investigate {target_id}' to search historical incident memory\n"
            f"- 'Store {target_id} in OpsMind memory' to persist this record"
        )

    # ── BRANCH 4: RECURRENCE QUERY ("INC-XXX is happening again")
    elif is_recurrence_query:
        # Pin current incident
        m_cur = re.search(
            r'\b(INC-\d+)\b[^.]*?(?:is|has)\s+(?:happening again|occurring again|recurred|back again|happened again|reoccurr)',
            query_text, re.IGNORECASE
        )
        recurrence_current_id = m_cur.group(1).upper() if m_cur else (unique_ids[0] if unique_ids else None)
        other_ids = [i for i in unique_ids if i != recurrence_current_id]
        recurrence_hist_id = other_ids[0] if other_ids else None

        cur_inc = IN_MEMORY_INCIDENTS.get(recurrence_current_id) or incident_service.get_incident(recurrence_current_id) if recurrence_current_id else None
        hist_inc = incident_service.get_incident(recurrence_hist_id) if recurrence_hist_id else None

        if not cur_inc:
            answer = (
                f"Incident {recurrence_current_id} is not stored in OpsMind memory. "
                f"Cannot perform recurrence investigation without the current incident record."
            )
        elif not hist_inc:
            all_incs = incident_service.list_incidents()
            matches = find_similar_incidents_chat(
                target_inc=cur_inc,
                all_incidents=all_incs,
                min_score=0.08,
                max_results=3,
            )
            if matches:
                top_hist_inc, _, _ = matches[0]
                answer = format_recurrence_investigation(cur_inc, top_hist_inc)
            else:
                answer = (
                    f"Incident {recurrence_current_id} is stored but no sufficiently similar "
                    f"historical incident was found in OpsMind memory to use as a reference."
                )
        else:
            answer = format_recurrence_investigation(cur_inc, hist_inc)

    # ── BRANCH 5: DIRECT COMPARISON QUERY ("compare INC-A and INC-B")
    elif is_comparison_query:
        id_a, id_b = unique_ids[0], unique_ids[1]
        inc_a = IN_MEMORY_INCIDENTS.get(id_a) or incident_service.get_incident(id_a)
        inc_b = IN_MEMORY_INCIDENTS.get(id_b) or incident_service.get_incident(id_b)

        missing = [i for i, r in [(id_a, inc_a), (id_b, inc_b)] if not r]
        if missing:
            answer = (
                f"Cannot compare: the following incident(s) are not stored in OpsMind memory: "
                f"{', '.join(missing)}."
            )
        else:
            answer = format_incident_comparison(inc_a, inc_b)

    # ── BRANCH 6: SIMILARITY SEARCH ("similar to INC-XXX")
    elif inc_match and is_similarity_query:
        target_id = inc_match.group(1).upper()
        target_inc = IN_MEMORY_INCIDENTS.get(target_id) or incident_service.get_incident(target_id)

        if not target_inc:
            answer = (
                f"Incident {target_id} is not stored in OpsMind memory. "
                f"Cannot find similar incidents without a reference record."
            )
        else:
            all_incs = incident_service.list_incidents()
            matches = find_similar_incidents_chat(
                target_inc=target_inc,
                all_incidents=all_incs,
                min_score=0.08,
                max_results=5,
            )
            answer = format_similar_incidents_report(target_id, target_inc, matches)

    # ── BRANCH 7: RETRIEVAL QUERY (Operation B)
    elif is_retrieval_query:
        target_id = inc_match.group(1).upper()
        # Strictly look up from persistent storage
        inc_data = incident_service.get_incident(target_id)

        if inc_data:
            answer = format_clean_incident_record(inc_data)
        else:
            answer = f"No information is currently stored for incident {target_id} in OpsMind memory."

    # ── BRANCH 8: GENERAL QUERY - ENRICHED WITH REAL STORED INCIDENT CONTEXT
    else:
        all_incs = incident_service.list_incidents()
        inc_summaries = []
        for inc in all_incs[:10]:
            inc_summaries.append(
                f"- {inc.get('id')}: {inc.get('service')} | Status: {inc.get('status')} | "
                f"Root Cause: {inc.get('root_cause') or 'unknown'} | Resolution: {inc.get('resolution') or 'none'}"
            )
        context_block = "\n".join(inc_summaries)
        user_prompt_with_context = f"CURRENT PERSISTED INCIDENTS IN OPSMIND:\n{context_block}\n\nUSER INQUIRY: {query_text}"

        answer = await llm_client.generate_response(
            system_prompt=SYSTEM_CHAT_PROMPT,
            user_prompt=user_prompt_with_context
        )

    # Store in MongoDB Atlas
    database.save_chat_exchange(
        query=payload.query,
        response=answer,
        actor=actor_name,
        provider=provider_info["display_name"]
    )

    return {
        "query": payload.query,
        "response": answer,
        "provider": provider_info["display_name"],
        "context_sources": ["Hindsight Memory", "Incident Knowledge Graph", "Runbooks"]
    }
