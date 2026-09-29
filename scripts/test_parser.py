import re
import json

prompt_inc303 = """INC-303
Service: inventory-service
Symptom: inventory requests are intermittently returning HTTP 502 during peak traffic.
Observations:
- CPU is normal
- Redis latency is elevated
- application logs show upstream timeout
- issue started after a recent deployment
Status: INVESTIGATING
Root cause: unknown
Resolution: none"""

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
    return s.strip().strip("`*\"' ").strip()

def parse_incident_universal(raw_text: str) -> dict:
    record = {
        "incident_id": None,
        "service": None,
        "symptom": None,
        "observations": [],
        "status": "INVESTIGATING",
        "root_cause": None,
        "resolution": None
    }

    state = None
    lines = raw_text.splitlines()
    for raw_line in lines:
        line = raw_line.strip()
        if not line:
            if state == "symptom":
                state = None
            continue

        # 1. Ignore meta-instructions
        if is_meta_instruction(line):
            state = None
            if re.search(r"unresolved\s*investigation", line, re.IGNORECASE):
                record["status"] = "unresolved investigation"
            elif re.search(r"investigating", line, re.IGNORECASE):
                record["status"] = "INVESTIGATING"
            if re.search(r"do\s+not\s+invent\s+(?:a\s+)?root\s+cause", line, re.IGNORECASE):
                record["root_cause"] = None
            if re.search(r"do\s+not\s+invent\s+(?:a\s+)?resolution", line, re.IGNORECASE):
                record["resolution"] = None
            continue

        # 2. Check Incident ID
        # Matches standalone "INC-303" OR "Incident ID: INC-303" OR "Incident: INC-303"
        m_id_standalone = re.match(r"^(?:(?:incident\s*id|incident|id)\s*[:\s]\s*)?([A-Za-z0-9]+-[A-Za-z0-9]+)$", line, re.IGNORECASE)
        if m_id_standalone and not record["incident_id"]:
            record["incident_id"] = m_id_standalone.group(1).upper()
            state = None
            continue

        m_id_hdr = re.match(r"^(?:incident\s*id|incident|id)\s*:\s*(.+)$", line, re.IGNORECASE)
        if m_id_hdr and not record["incident_id"]:
            val = clean_text_val(m_id_hdr.group(1))
            inc_match = re.search(r"\b([A-Za-z0-9]+-[A-Za-z0-9]+)\b", val)
            record["incident_id"] = inc_match.group(1).upper() if inc_match else val
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

        # 4. Check Symptom
        m_sym = re.match(r"^(?:symptom[s]?|issue|error|problem)\s*:\s*(.+)$", line, re.IGNORECASE)
        if m_sym:
            record["symptom"] = clean_text_val(m_sym.group(1))
            state = "symptom"
            continue

        # 5. Check Observations section header
        m_obs = re.match(r"^(?:initial\s+observations|observations|telemetry|findings|notes)\s*:\s*(.*)$", line, re.IGNORECASE)
        if m_obs:
            state = "observations"
            rest = clean_text_val(m_obs.group(1))
            if rest and rest.startswith(("-", "*", "•")):
                record["observations"].append(clean_text_val(rest.lstrip("-*• ")))
            continue

        # 6. Check Status
        m_stat = re.match(r"^(?:status|state)\s*:\s*(.+)$", line, re.IGNORECASE)
        if m_stat:
            record["status"] = clean_text_val(m_stat.group(1))
            state = None
            continue

        # 7. Check Root cause
        m_rc = re.match(r"^(?:root\s*cause|cause)\s*:\s*(.+)$", line, re.IGNORECASE)
        if m_rc:
            val = clean_text_val(m_rc.group(1))
            if val.lower() in ["none", "null", "unknown", "unknown / not determined", "unknown/not determined", "n/a", "not determined"]:
                record["root_cause"] = None
            else:
                record["root_cause"] = val
            state = None
            continue

        # 8. Check Resolution
        m_res = re.match(r"^(?:resolution|fix)\s*:\s*(.+)$", line, re.IGNORECASE)
        if m_res:
            val = clean_text_val(m_res.group(1))
            if val.lower() in ["none", "null", "none yet", "unknown", "n/a"]:
                record["resolution"] = None
            else:
                record["resolution"] = val
            state = None
            continue

        # 9. Handle non-header lines based on active state
        if state == "observations":
            if line.startswith(("-", "*", "•")):
                item = clean_text_val(line.lstrip("-*• "))
                if item and not is_meta_instruction(item):
                    record["observations"].append(item)
            else:
                state = None
        elif state == "symptom":
            if line.startswith(("-", "*", "•")) or ":" in line:
                state = None
            else:
                record["symptom"] += " " + clean_text_val(line)

    return record

parsed = parse_incident_universal(prompt_inc303)
print("PARSED INC-303:")
print(json.dumps(parsed, indent=2))
