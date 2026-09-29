from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime
from ..models.incident import IncidentBase, IncidentCreate
from ..utils.helpers import get_data_dir, load_json_file, save_json_file
from ..hindsight.memory import memory_engine
from ..db import database

class IncidentService:
    def __init__(self):
        self.data_dir = get_data_dir()
        self.incidents_dir = self.data_dir / "incidents"
        self.incidents_dir.mkdir(parents=True, exist_ok=True)

    def list_incidents(self) -> List[Dict[str, Any]]:
        incidents_by_id = {}
        
        # 1. Load from DB
        db_incidents = database.get_all_incidents_from_db()
        for inc in db_incidents:
            if inc and "id" in inc:
                incidents_by_id[inc["id"].upper()] = inc

        # 2. Load from JSON files
        for f in self.incidents_dir.glob("*.json"):
            data = load_json_file(f)
            if data and "id" in data:
                inc_id = data["id"].upper()
                if inc_id not in incidents_by_id:
                    incidents_by_id[inc_id] = data

        incidents = list(incidents_by_id.values())
        
        # Sort active/investigating first, then by ID / date
        def sort_key(x):
            status = str(x.get("status", "")).upper()
            is_active = 0 if "INVESTIGAT" in status or "UNRESOLVED" in status else 1
            return (is_active, x.get("started_at", ""))
            
        return sorted(incidents, key=sort_key)

    def get_incident(self, incident_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves incident by exact ID from Database, Local Filesystem, or Memory Engine."""
        if not incident_id:
            return None
        clean_id = incident_id.strip()

        # 1. Check Database (MongoDB Atlas / SQLite replica)
        inc = database.get_incident_from_db(clean_id)
        if inc:
            # Sync to local file & memory engine for fast disk cache
            try:
                save_json_file(self.incidents_dir / f"{clean_id.lower()}.json", inc)
                memory_engine.store_incident_memory(inc)
            except Exception:
                pass
            return inc

        # 2. Check local JSON file
        file_path = self.incidents_dir / f"{clean_id.lower()}.json"
        if file_path.exists():
            data = load_json_file(file_path)
            if data:
                database.save_incident_to_db(data)
                memory_engine.store_incident_memory(data)
                return data

        # 3. Search all local JSON files (case-insensitive ID match)
        for f in self.incidents_dir.glob("*.json"):
            data = load_json_file(f)
            if data and data.get("id", "").strip().upper() == clean_id.upper():
                database.save_incident_to_db(data)
                memory_engine.store_incident_memory(data)
                return data

        # 4. Check Hindsight memory store
        mem_inc = memory_engine.get_incident_memory(clean_id)
        if mem_inc:
            database.save_incident_to_db(mem_inc)
            save_json_file(self.incidents_dir / f"{clean_id.lower()}.json", mem_inc)
            return mem_inc

        return None

    def incident_exists(self, incident_id: str) -> bool:
        """Verifies whether an incident exists in the persistence layer."""
        return self.get_incident(incident_id) is not None

    async def create_incident(self, data: Any) -> Dict[str, Any]:
        """Persists an incident into MongoDB, local files, SQLite, and Hindsight Memory."""
        if hasattr(data, "model_dump"):
            data_dict = data.model_dump(exclude_unset=False)
        elif hasattr(data, "dict"):
            data_dict = data.dict()
        elif isinstance(data, dict):
            data_dict = data.copy()
        else:
            data_dict = dict(data)

        # 1. Determine Incident ID (preserve provided ID e.g. INC-301)
        inc_id = data_dict.get("incident_id") or data_dict.get("id")
        if not inc_id or not str(inc_id).strip():
            count = len(list(self.incidents_dir.glob("*.json"))) + 300
            inc_id = f"INC-{count}"
        inc_id = str(inc_id).strip()

        now_iso = datetime.utcnow().isoformat() + "Z"
        started_at = data_dict.get("started_at") or now_iso

        # 2. Format symptoms and observations
        symptoms_raw = data_dict.get("symptoms")
        symptom_single = data_dict.get("symptom")
        if isinstance(symptoms_raw, list):
            symptoms_list = [str(s).strip() for s in symptoms_raw if s]
        elif isinstance(symptoms_raw, str) and symptoms_raw.strip():
            symptoms_list = [symptoms_raw.strip()]
        elif symptom_single and str(symptom_single).strip():
            symptoms_list = [str(symptom_single).strip()]
        else:
            symptoms_list = []

        observations_raw = data_dict.get("observations")
        if isinstance(observations_raw, list):
            observations_list = [str(o).strip().lstrip("-*• ").strip() for o in observations_raw if o]
        elif isinstance(observations_raw, str) and observations_raw.strip():
            observations_list = [line.strip().lstrip("-*• ").strip() for line in observations_raw.splitlines() if line.strip()]
        else:
            observations_list = []

        service_name = str(data_dict.get("service", "unknown-service")).strip()
        title = data_dict.get("title")
        if not title:
            if symptoms_list:
                title = f"{service_name}: {symptoms_list[0][:60]}"
            else:
                title = f"{service_name} Incident"

        status_val = data_dict.get("status") or "INVESTIGATING"
        root_cause_val = data_dict.get("root_cause")
        if root_cause_val is not None:
            root_cause_val = str(root_cause_val).strip()
            if root_cause_val.lower() in ["none", "null", "unknown", "unknown / not determined", "unknown/not determined", "n/a", "not determined", "none yet"]:
                root_cause_val = None

        resolution_val = data_dict.get("resolution")
        if isinstance(resolution_val, list):
            clean_res_list = [str(x).strip() for x in resolution_val if str(x).strip()]
            resolution_val = clean_res_list if clean_res_list else None
        elif resolution_val is not None:
            resolution_val = str(resolution_val).strip()
            if resolution_val.lower() in ["none", "null", "none yet", "unknown", "n/a", "not determined"]:
                resolution_val = None
        if not resolution_val and data_dict.get("resolution_steps"):
            resolution_val = data_dict.get("resolution_steps")

        # Build clean persistent record without fabricating missing values
        incident_dict: Dict[str, Any] = {
            "id": inc_id,
            "incident_id": inc_id,
            "title": title,
            "service": service_name,
            "status": str(status_val).strip(),
            "started_at": started_at,
            "severity": data_dict.get("severity", "HIGH"),
            "error_type": data_dict.get("error_type") or (symptoms_list[0] if symptoms_list else "Unknown Error"),
            "symptoms": symptoms_list,
            "observations": observations_list,
            "evidence": data_dict.get("evidence") or [],
            "verification": data_dict.get("verification") or [],
            "resolution_steps": data_dict.get("resolution_steps") or [],
            "root_cause": root_cause_val,
            "resolution": resolution_val,
            "duration_min": data_dict.get("duration_min", 0),
            "telemetry": data_dict.get("telemetry", {}),
            "timeline": data_dict.get("timeline") or [
                {"time": "Initial", "event": f"Incident {inc_id} recorded for {service_name}", "type": "warning"}
            ]
        }

        # Include single symptom string if provided
        if symptom_single:
            incident_dict["symptom"] = str(symptom_single).strip()
        elif symptoms_list:
            incident_dict["symptom"] = symptoms_list[0]

        # 3. Persist to all storage layers
        # A. Local JSON file
        save_json_file(self.incidents_dir / f"{inc_id.lower()}.json", incident_dict)

        # B. Database (MongoDB Atlas + SQLite replica)
        database.save_incident_to_db(incident_dict)

        # C. Hindsight Memory Engine
        memory_engine.store_incident_memory(incident_dict)

        return incident_dict

    async def resolve_incident(
        self,
        incident_id: str,
        root_cause: str,
        resolution: str,
        useful: bool,
        engineer_feedback: Optional[str] = None,
        evidence: Optional[List[str]] = None,
        verification: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        inc = self.get_incident(incident_id)
        if not inc:
            raise ValueError(f"Incident {incident_id} not found")

        inc["status"] = "RESOLVED"
        inc["resolved_at"] = datetime.utcnow().isoformat() + "Z"
        inc["root_cause"] = root_cause
        inc["resolution"] = resolution
        if evidence is not None:
            inc["evidence"] = evidence
        if verification is not None:
            inc["verification"] = verification
        inc["engineer_feedback"] = engineer_feedback or ("Confirmed by engineer." if useful else "Alternative fix applied.")
        
        # Add to timeline
        if "timeline" not in inc or not inc["timeline"]:
            inc["timeline"] = []
        inc["timeline"].append({
            "time": "Just now",
            "event": f"Incident resolved: {root_cause}",
            "type": "resolved"
        })

        # Save back to file and MongoDB Atlas
        file_path = self.incidents_dir / f"{inc.get('id', incident_id).lower()}.json"
        save_json_file(file_path, inc)
        database.save_incident_to_db(inc)
        
        # Audit event
        current_user = database.get_current_user()
        database.record_audit_event(
            incident_id=inc.get("id", incident_id),
            action=f"Resolved incident: {root_cause[:40]}...",
            actor=current_user.get("name", "DevOps Engineer")
        )

        # Store in Hindsight Memory
        mem_res = await memory_engine.store_incident_resolution(
            incident_id=inc.get("id", incident_id),
            service=inc.get("service", "General"),
            error_type=inc.get("error_type", "Unknown"),
            root_cause=root_cause,
            resolution=resolution,
            useful=useful,
            engineer_feedback=inc["engineer_feedback"]
        )

        return {
            "incident": inc,
            "memory_result": mem_res
        }

    def update_lifecycle_state(self, incident_id: str, state: str, notes: Optional[str] = None) -> Dict[str, Any]:
        inc = self.get_incident(incident_id)
        if not inc:
            raise ValueError(f"Incident {incident_id} not found")

        inc["lifecycle_state"] = state
        now_time = datetime.utcnow().strftime("%H:%M")
        if "timeline" not in inc or not inc["timeline"]:
            inc["timeline"] = []

        action_map = {
            "HYPOTHESIS": "Hypothesis formulated by OpsMind",
            "INVESTIGATION": "Engineer actively testing hypothesis in staging/telemetry",
            "CONFIRMED": "Root cause confirmed by engineer"
        }
        inc["timeline"].append({
            "time": now_time,
            "event": f"State updated to {state}: {action_map.get(state, state)}",
            "type": "agent" if state == "HYPOTHESIS" else "resolved" if state == "CONFIRMED" else "warning"
        })
        file_path = self.incidents_dir / f"{inc.get('id', incident_id).lower()}.json"
        save_json_file(file_path, inc)
        database.save_incident_to_mongo(inc)
        return inc

incident_service = IncidentService()

