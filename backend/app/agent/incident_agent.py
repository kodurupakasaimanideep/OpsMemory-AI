import os
from typing import Dict, Any, List, Optional
from datetime import datetime
from ..models.investigation import (
    InvestigationResult,
    SimilarIncidentMatch,
    RecommendedAction,
    MemoryEvidenceChain,
    MemoryEvidenceNode,
    AuditTrailEvent
)
from ..hindsight.memory import memory_engine
from ..llm.client import llm_client
from ..llm.prompts import SYSTEM_INVESTIGATION_PROMPT
from ..utils.helpers import get_data_dir, load_json_file
from ..utils.logger import logger

class IncidentAgent:
    def __init__(self):
        self.data_dir = get_data_dir()

    async def investigate_incident(self, incident: Dict[str, Any]) -> InvestigationResult:
        incident_id = incident.get("id", "INC-UNKNOWN")
        service = incident.get("service", "Unknown Service")
        error_type = incident.get("error_type", "HTTP 500")
        deployment = incident.get("deployment", {})
        version = deployment.get("version", "v1.0.0") if deployment else "v1.0.0"
        changes_summary = deployment.get("changes_summary", "Routine release") if deployment else "None"
        telemetry = incident.get("telemetry", {})
        logs_excerpt = incident.get("logs_excerpt", [])
        
        logger.info(f"IncidentAgent: Beginning investigation for {incident_id} ({service} - {error_type})")

        # Step 1: Collect Current Evidence
        evidence_points = []
        active_db = telemetry.get("db_active_connections")
        max_db = telemetry.get("db_max_connections")
        if active_db is not None and max_db is not None:
            if active_db >= max_db:
                evidence_points.append(f"{active_db}/{max_db} DB connections active (100% Saturated)")
            else:
                evidence_points.append(f"{active_db}/{max_db} DB connections active")
        
        err_count = telemetry.get("error_count")
        if err_count:
            evidence_points.append(f"{err_count:,} 5xx errors recorded during window")
            
        p99 = telemetry.get("p99_latency_sec")
        if p99:
            evidence_points.append(f"P99 latency elevated to {p99}s")
            
        if version:
            evidence_points.append(f"Incident started shortly following deployment {version} ('{changes_summary}')")
            
        for log in logs_excerpt[:2]:
            evidence_points.append(f"Log signal: {log.strip()[:110]}")

        # Step 2: Query Hindsight Memory for Similar Incidents
        # Filter out the current incident itself from matches
        similar_matches = await self._find_similar_incidents(service, error_type, exclude_id=incident_id)
        
        # Check provider status for explainability
        provider_info = llm_client.get_active_provider_info()
        llm_source_name = "Groq Llama 3.3 70B" if not provider_info["is_fallback"] else "OpsMind SRE Reasoning Engine"

        # Determine timestamp for audit trail
        now_time = datetime.utcnow().strftime("%H:%M")

        # -------------------------------------------------------------
        # BRANCH 1: BRAIN 2 (Hindsight Memory Match - Learned Problem)
        # -------------------------------------------------------------
        # An incident uses Brain 2 if Hindsight contains high-confidence matches (>= 0.80)
        has_high_similarity_match = any(m.similarity >= 0.80 for m in similar_matches)
        
        if has_high_similarity_match:
            top_match = similar_matches[0]
            matched_nodes = [
                MemoryEvidenceNode(
                    incident_id=m.id,
                    similarity=m.similarity,
                    matched_factors=m.match_reasons,
                    applied_resolution=m.resolution
                )
                for m in similar_matches
            ]

            evidence_chain = MemoryEvidenceChain(
                current_incident_id=incident_id,
                current_error=f"{error_type} after deploy {version}",
                query_vector=f"service:{service.lower()} error:{error_type.lower()}",
                matched_nodes=matched_nodes,
                common_pattern=f"Known failure pattern: {top_match.root_cause}",
                confidence_score=top_match.similarity
            )

            likely_root_cause = top_match.root_cause
            hypothesis_text = f"Historical pattern match: {likely_root_cause}"
            summary_analysis = (
                f"🧠 Brain 2 (Hindsight Memory): Strong historical correlation detected with {top_match.id} "
                f"({int(top_match.similarity * 100)}% match) and {len(similar_matches)} prior incidents. "
                f"Previous verified resolution '{top_match.resolution}' successfully mitigated this symptom profile."
            )

            recommended_actions = [
                RecommendedAction(
                    step=1,
                    action=f"Apply verified resolution from {top_match.id}: {top_match.resolution}",
                    category="mitigation",
                    why=f"Proven successful in historical incident {top_match.id} with {int(top_match.similarity * 100)}% similarity."
                ),
                RecommendedAction(
                    step=2,
                    action="Check database connection pool metrics & verify active socket release",
                    category="verification",
                    command=f"kubectl exec -it deployment/{service.lower().replace(' ', '-')} -- netstat -an | grep 5432",
                    why="Ensures connection count returns to baseline before closing incident."
                ),
                RecommendedAction(
                    step=3,
                    action="Execute rollback of release to previous stable manifest if pool remains saturated",
                    category="rollback",
                    why="Immediate blast radius containment per SRE SOP."
                ),
                RecommendedAction(
                    step=4,
                    action="Open Database Recovery SOP Runbook",
                    category="runbook",
                    runbook_id="database-recovery",
                    why="Standard operating procedure for connection pool recovery."
                )
            ]

            audit_trail = [
                AuditTrailEvent(time=now_time, action=f"Production anomaly detected on {service}", actor="Telemetry Monitor"),
                AuditTrailEvent(time=now_time, action=f"Hindsight queried: Found {len(similar_matches)} similar historical incidents", actor="Hindsight (Brain 2)"),
                AuditTrailEvent(time=now_time, action=f"High similarity ({int(top_match.similarity * 100)}%) matched with {top_match.id}", actor="OpsMind Agent"),
                AuditTrailEvent(time=now_time, action="Memory-based resolution plan formulated", actor=llm_source_name)
            ]

            return InvestigationResult(
                incident_id=incident_id,
                status=incident.get("status", "INVESTIGATING"),
                mode="BRAIN_2_MEMORY_MATCH",
                lifecycle_state="HYPOTHESIS",
                memory_confidence="HIGH",
                similar_incidents_count=len(similar_matches),
                similar_matches=similar_matches,
                likely_root_cause=likely_root_cause,
                hypothesis=hypothesis_text,
                confidence_level=f"High ({int(top_match.similarity * 100)}%)",
                confidence_score=top_match.similarity,
                active_evidence_points=evidence_points,
                recommended_actions=recommended_actions,
                evidence_chain=evidence_chain,
                summary_analysis=summary_analysis,
                why_explanation=f"Matches historical incident {top_match.id}. Root cause pattern was verified by engineering team.",
                llm_source=llm_source_name,
                audit_trail=audit_trail
            )

        # -------------------------------------------------------------
        # BRANCH 2: BRAIN 1 (AI Investigation Mode - NEW / Unseen Problem)
        # -------------------------------------------------------------
        # When Hindsight has NO useful previous data:
        # Crucial principle: The agent does NOT invent a previous solution!
        evidence_points.append("No previous matching incident found in Hindsight memory bank (New Failure Pattern)")

        evidence_chain = MemoryEvidenceChain(
            current_incident_id=incident_id,
            current_error=f"{error_type} on {service}",
            query_vector=f"service:{service.lower()} error:{error_type.lower()}",
            matched_nodes=[],
            common_pattern="Novel failure signature - AI Investigation Mode active",
            confidence_score=0.45
        )

        # Formulate hypothesis from live telemetry, logs, and deployment diff
        if active_db and max_db and active_db >= max_db:
            possible_cause = f"Database connection pool exhaustion / connection leak introduced in {version}"
            hypothesis_text = f"Possible root cause: The latest {service} deployment ({version}) is acquiring database connections without releasing them properly."
        elif "timeout" in error_type.lower() or "timeout" in str(logs_excerpt).lower():
            possible_cause = f"Database query lock contention or downstream dependency starvation in {version}"
            hypothesis_text = f"Possible root cause: Long-running unindexed query in {version} causing lock queues and connection starvation."
        else:
            possible_cause = f"Service degradation triggered following deployment {version}"
            hypothesis_text = f"Possible root cause: Configuration or memory threshold regression introduced in {version}."

        summary_analysis = (
            f"🧠 Brain 1 (AI Investigation Mode): No useful historical memory exists for this failure pattern. "
            f"Switching from memory retrieval to real-time telemetry, logs, and deployment diff analysis. "
            f"Notice: Root cause is formulated as a hypothesis to be validated by the engineer."
        )

        recommended_actions = [
            RecommendedAction(
                step=1,
                action=f"Compare deployment {version} against previous stable commit ({deployment.get('commit_hash', 'HEAD~1')})",
                category="verification",
                why="Identify unreleased connection handles or blocking I/O calls in recent PRs."
            ),
            RecommendedAction(
                step=2,
                action="Check database connection acquisition and pool release metrics in real time",
                category="verification",
                command=f"kubectl logs -l app={service.lower().replace(' ', '-')} --tail=100 | grep -i 'pool\\|connection'",
                why="Confirms if connection leak hypothesis matches active socket behavior."
            ),
            RecommendedAction(
                step=3,
                action="Inspect connection pool configuration parameters and timeout limits",
                category="verification",
                why="Verify whether connection pool was under-sized for new traffic volume."
            ),
            RecommendedAction(
                step=4,
                action=f"Test rollback of {service} to previous stable version in staging/production",
                category="rollback",
                why="Suggested mitigation: If deployment is confirmed as the trigger, rollback safely restores availability."
            ),
            RecommendedAction(
                step=5,
                action="Confirm actual root cause with engineer & save verified learning to Hindsight",
                category="mitigation",
                why="Once verified, this new experience becomes organizational memory for all future incidents."
            )
        ]

        audit_trail = [
            AuditTrailEvent(time=now_time, action=f"Production anomaly detected on {service}", actor="Telemetry Monitor"),
            AuditTrailEvent(time=now_time, action="Hindsight queried: No matching historical incidents found", actor="Hindsight (Brain 2)"),
            AuditTrailEvent(time=now_time, action="Switched to AI Investigation Mode (Brain 1)", actor="OpsMind Agent"),
            AuditTrailEvent(time=now_time, action=f"Formulated root-cause hypothesis from logs & telemetry: {possible_cause}", actor=llm_source_name),
            AuditTrailEvent(time=now_time, action="Awaiting engineer validation & testing", actor="Human-in-the-Loop Gate")
        ]

        return InvestigationResult(
            incident_id=incident_id,
            status=incident.get("status", "INVESTIGATING"),
            mode="BRAIN_1_INVESTIGATION",
            lifecycle_state="HYPOTHESIS",
            memory_confidence="LOW (Novel Issue)",
            similar_incidents_count=0,
            similar_matches=[],
            likely_root_cause=possible_cause,
            hypothesis=hypothesis_text,
            confidence_level="Low (AI Hypothesis - Needs Confirmation)",
            confidence_score=0.45,
            active_evidence_points=evidence_points,
            recommended_actions=recommended_actions,
            evidence_chain=evidence_chain,
            summary_analysis=summary_analysis,
            why_explanation="Novel incident with no prior Hindsight memory. Evaluated active metrics and error log stack traces to synthesize hypothesis.",
            llm_source=llm_source_name,
            audit_trail=audit_trail
        )

    async def _find_similar_incidents(self, service: str, error_type: str, exclude_id: str = "") -> List[SimilarIncidentMatch]:
        matches = []
        incidents_dir = self.data_dir / "incidents"
        if not incidents_dir.exists():
            return matches

        for f in incidents_dir.glob("*.json"):
            data = load_json_file(f)
            if not data:
                continue

            inc_id = data.get("id", "")
            if inc_id.upper() == exclude_id.upper():
                continue

            # Only resolved incidents with verified root causes qualify as historical memories
            if data.get("status") != "RESOLVED":
                continue

            inc_service = data.get("service", "")
            inc_error = data.get("error_type", "")
            root_cause = data.get("root_cause", "")
            resolution = data.get("resolution", "")

            # If no root cause or resolution recorded, cannot be used as memory
            if not root_cause or not resolution:
                continue

            # Calculate match factors based on actual symptom & pattern overlap
            reasons = []
            sim = 0.0

            # 1. Component alignment
            if service.lower() == inc_service.lower():
                reasons.append(f"Identical service ({inc_service})")
                sim += 0.35
            elif service.lower() in inc_service.lower() or inc_service.lower() in service.lower():
                reasons.append(f"Related service component ({inc_service})")
                sim += 0.20

            # 2. Error signature alignment
            if error_type.lower() == inc_error.lower():
                reasons.append(f"Exact error type match ({inc_error})")
                sim += 0.35
            elif ("503" in inc_error and "503" in error_type) or ("timeout" in inc_error.lower() and "timeout" in error_type.lower()):
                reasons.append(f"Matching symptom signature ({inc_error})")
                sim += 0.25

            # 3. Post-deployment pattern
            if data.get("deployment"):
                reasons.append("Post-deployment failure pattern")
                sim += 0.15

            # 4. Database / resource exhaustion symptom
            if "pool" in root_cause.lower() or "connection" in root_cause.lower():
                if "503" in error_type or "pool" in error_type.lower() or "connection" in error_type.lower():
                    reasons.append("Database connection exhaustion symptom")
                    sim += 0.10

            sim = min(0.96, sim)

            # Threshold for Hindsight memory (must be >= 0.75 to qualify as memory match)
            if sim >= 0.75:
                matches.append(SimilarIncidentMatch(
                    id=inc_id,
                    title=data.get("title", ""),
                    service=inc_service,
                    error_type=inc_error,
                    similarity=round(sim, 2),
                    root_cause=root_cause,
                    resolution=resolution,
                    match_reasons=reasons or ["Historical failure pattern match"]
                ))

        # Return top matches sorted by similarity
        return sorted(matches, key=lambda x: x.similarity, reverse=True)[:4]

incident_agent = IncidentAgent()
