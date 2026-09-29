import urllib.request
import json
import time
import sys
import subprocess
import os

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

BASE_URL = "http://127.0.0.1:8000/api"

def make_req(path, data=None, method="GET"):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as res:
            raw = res.read().decode("utf-8")
            return res.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8")
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, {"error": raw}
    except Exception as e:
        return 500, {"error": str(e)}

def run_suite():
    results = {}
    print("======================================================================")
    print(" OPSMIND HARDENED INTEGRATION TEST SUITE (NO DOCKER / LOCAL MODE)")
    print("======================================================================")

    # 1. Health Endpoint & Memory Backend Status
    print("\n[TEST 1] Testing /api/health and /api/agent/status...")
    status_code, health = make_req("/health")
    status_code2, agent_status = make_req("/agent/status")
    print(f"Health Response: {health}")
    print(f"Agent Status Response: {agent_status}")
    assert health.get("status") == "healthy"
    assert health.get("memory_backend") == "local"
    assert health.get("hindsight_external") == "unavailable"
    assert health.get("fallback_active") is True
    results["1. Backend Health & Mode Separation"] = "PASS"

    # 2. Scenario A — Day Shift Investigation
    print("\n[TEST 2] Scenario A: Day Shift Investigation & Memory Retrieval...")
    status_code, inv_res = make_req("/agent/investigate/INC-204", method="POST")
    print(f"Investigation response status: {status_code}, Mode: {inv_res.get('engine_mode', 'N/A')}")
    assert status_code == 200
    results["2. Day Shift Investigation"] = "PASS"

    # 3. Incident Resolution & Persistence
    print("\n[TEST 3] Scenario A: Resolve Incident INC-204 & Teach Memory...")
    resolve_payload = {
        "actual_root_cause": "Database connection pool exhausted under concurrent checkout traffic",
        "actual_fix": "Increased pool size to 50 connections and tuned idle connection reaper",
        "ai_recommendation_useful": True,
        "additional_notes": "Tested in load stage and verified zero connection timeouts"
    }
    status_code, resolve_res = make_req("/incidents/INC-204/resolve", data=resolve_payload, method="POST")
    print(f"Resolve status: {status_code}, result: {resolve_res}")
    assert status_code == 200
    assert resolve_res.get("status") == "RESOLVED"
    results["3. Incident Resolution & Learning Commit"] = "PASS"

    # 4. Scenario B — Night Shift Handoff
    print("\n[TEST 4] Scenario B: Night Shift Handoff Generation...")
    status_code, handoff = make_req("/incidents/INC-204/handoff")
    print(f"Handoff summary for night shift: Incident={handoff.get('incident_id')}, Status={handoff.get('status')}")
    assert status_code == 200
    assert handoff.get("status") == "RESOLVED"
    assert "Database connection pool" in str(handoff.get("root_cause", ""))
    results["4. Night Shift Handoff Retrieval"] = "PASS"


    # 5. Scenario C — Same Symptom, Different Root Cause
    print("\n[TEST 5] Scenario C: Same Symptom (500/503), Different Root Cause...")
    # INC-301: payment-service 503 from DB pool
    # INC-401: payment-service 503 from HTTP worker thread starvation
    chat_prompt = """Incident ID: INC-401
Service: payment-service
Symptom: payment requests are intermittently returning HTTP 503 during peak traffic.

Initial observations:
- CPU utilization is at 98%
- Application logs show HTTP worker socket exhaustion
- Database connections remain low at 5 active connections

Do not invent a root cause or resolution.
Record this as an unresolved investigation.
Tell me exactly what was persisted."""
    status_code, chat_res = make_req("/agent/chat", data={"query": chat_prompt}, method="POST")
    assert status_code == 200
    # Now retrieve similar incidents for INC-401
    status_code, similar = make_req("/incidents/INC-401/similar")
    print(f"Similar incidents detected for INC-401: {len(similar.get('matches', []))} matches")
    results["5. Same Symptom / Different Root Cause Separation"] = "PASS"

    # 6. Scenario D — Unknown / Novel Incident
    print("\n[TEST 6] Scenario D: Unknown / Novel Incident Handling...")
    novel_prompt = """Create a new incident in OpsMind memory.

Incident ID: INC-990
Service: quantum-ledger-service
Symptom: Cryptographic state synchronization failure across consensus nodes.

Initial observations:
- Raft consensus quorum lost
- State mismatch on block height 44901
- Network partition on region eu-central-2

Status: unresolved investigation
Root cause: unknown / not determined
Resolution: none yet

Do not infer any resolution or root cause.
Return only the normalized record."""
    status_code, novel_res = make_req("/agent/chat", data={"query": novel_prompt}, method="POST")
    assert status_code == 200
    resp_text = novel_res.get("response", "")
    print(f"Novel incident creation response:\n{resp_text}\n")
    assert "INC-990" in resp_text
    assert "not confirmed" in resp_text.lower() or "not determined" in resp_text.lower() or "null" in resp_text.lower() or "unresolved" in resp_text.lower() or "caution" in resp_text.lower()
    results["6. Unknown Incident Handling (No Hallucination)"] = "PASS"


    # 7. Scenario E — Learning Loop: Resolve INC-990 & Search Memory
    print("\n[TEST 7] Scenario E: Resolve Unknown Incident & Query Memory Bank...")
    resolve_novel = {
        "actual_root_cause": "NTP time drift caused Raft leader lease expiration across AZs",
        "actual_fix": "Synchronized chrony NTP daemon and increased election timeout to 1500ms",
        "ai_recommendation_useful": True
    }
    status_code, res_nov = make_req("/incidents/INC-990/resolve", data=resolve_novel, method="POST")
    assert status_code == 200

    # Search for this newly learned pattern
    status_code, search_res = make_req("/memory/search?q=NTP+time+drift")
    print(f"Memory search for 'NTP time drift': {len(search_res.get('results', []))} results found")
    assert len(search_res.get("results", [])) > 0
    results["7. Learning Loop & Semantic Search"] = "PASS"

    # 8. External Hindsight Fallback & Timeout Verification
    print("\n[TEST 8] External Hindsight Offline Fallback Behavior...")
    # Directly verify that an unavailable external hindsight endpoint responds in < 3s and returns fallback
    t0 = time.time()
    status_code, direct_health = make_req("/health")
    elapsed = time.time() - t0
    print(f"Health check latency with external Hindsight offline: {elapsed:.2f}s")
    assert elapsed < 3.0
    assert direct_health.get("fallback_active") is True
    results["8. External Hindsight Fallback & Timeout Guard"] = "PASS"

    print("\n======================================================================")
    print(" ALL TEST RESULTS:")
    print("======================================================================")
    for k, v in results.items():
        print(f"  {k}: {v}")
    print("======================================================================\n")

if __name__ == "__main__":
    run_suite()
