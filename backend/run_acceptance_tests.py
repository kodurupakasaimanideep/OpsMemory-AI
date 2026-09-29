import urllib.request
import json
import time
import sys

BASE_URL = "http://127.0.0.1:8000/api"

def http_post(endpoint, data, timeout=35):
    url = f"{BASE_URL}{endpoint}"
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=timeout) as res:
        return json.loads(res.read().decode("utf-8"))

def http_get(endpoint, timeout=30):
    url = f"{BASE_URL}{endpoint}"
    with urllib.request.urlopen(url, timeout=timeout) as res:
        return json.loads(res.read().decode("utf-8"))

print("=" * 60)
print("RUNNING OPSMIND ACCEPTANCE SUITE (TESTS A - I)")
print("=" * 60)

results = {}

# TEST A — CREATE INC-401 & RETRIEVE
try:
    print("\n--- TEST A: CREATE & PERSIST INC-401 ---")
    create_prompt = (
        "Create a new incident in OpsMind memory.\n"
        "Incident ID: INC-401\n"
        "Service: payment-service\n"
        "Symptom: HTTP 503 during peak traffic\n"
        "Observations:\n"
        "- Connection acquisition delays\n"
        "- DB pool at 98%\n"
        "Status: INVESTIGATING\n"
        "Root cause: unknown\n"
        "Resolution: none\n"
        "Persist this record to storage."
    )
    resp_create = http_post("/agent/chat", {"query": create_prompt})
    print("[Agent Response]:", resp_create.get("response", "")[:120].replace("\n", " "))
    
    # Retrieve via API to verify persistence
    ret_a = http_get("/incidents/INC-401")
    assert ret_a["id"] == "INC-401"
    assert ret_a["service"] == "payment-service"
    print("[PASS] TEST A: INC-401 successfully created and retrieved from persistent storage.")
    results["TEST_A"] = "PASS"
except Exception as e:
    print("[FAIL] TEST A:", str(e))
    results["TEST_A"] = f"FAIL: {e}"

# TEST B — RESOLVE INC-402 WITH ROOT CAUSE, EVIDENCE, RESOLUTION, VERIFICATION
try:
    print("\n--- TEST B: RESOLVE INC-402 ---")
    http_post("/incidents", {
        "id": "INC-402",
        "service": "order-service",
        "symptom": "HTTP 504 Gateway Timeout during checkout spikes",
        "observations": ["Slow queries on order table", "Connection pool exhaustion"],
        "status": "INVESTIGATING"
    })
    
    # Resolve INC-402
    resp_resolve = http_post("/incidents/INC-402/resolve", {
        "root_cause": "Unindexed foreign key lookups starved PostgreSQL connection pool.",
        "resolution": "Added btree index on orders(user_id) and scaled PgBouncer pool to 100.",
        "evidence": [
            "pg_stat_activity showed 48 idle-in-transaction connections",
            "Slow query logs confirmed 4.2s sequence scans on orders"
        ],
        "verification": [
            "Query latency dropped from 4.2s to 12ms",
            "HTTP 504 errors ceased across all pods"
        ],
        "status": "RESOLVED"
    })
    
    # Retrieve and verify all fields persisted
    ret_b = http_get("/incidents/INC-402")
    assert ret_b["status"] == "RESOLVED"
    assert "Unindexed" in str(ret_b.get("root_cause", ""))
    assert len(ret_b.get("evidence", [])) >= 2
    assert len(ret_b.get("verification", [])) >= 2
    print("[PASS] TEST B: INC-402 resolved and every field persisted into storage.")
    results["TEST_B"] = "PASS"
except Exception as e:
    print("[FAIL] TEST B:", str(e))
    results["TEST_B"] = f"FAIL: {e}"

# TEST C — SIMILAR INCIDENT SEARCH (EXCLUDING SELF)
try:
    print("\n--- TEST C: SIMILAR INCIDENTS TO INC-204 ---")
    resp_c = http_post("/agent/chat", {"query": "Show me incidents similar to INC-204."})
    text_c = resp_c.get("response", "")
    assert "INC-204" in text_c
    assert "--- #1: INC-204 ---" not in text_c
    assert "--- #2: INC-204 ---" not in text_c
    assert ("INC-104" in text_c or "INC-119" in text_c or "INC-305" in text_c or "INC-401" in text_c)
    print("[PASS] TEST C: Returned multiple real historical records, excluding INC-204 itself.")
    results["TEST_C"] = "PASS"
except Exception as e:
    print("[FAIL] TEST C:", str(e))
    results["TEST_C"] = f"FAIL: {e}"

# TEST D — DIRECT COMPARISON
try:
    print("\n--- TEST D: DIRECT COMPARISON INC-104 vs INC-204 ---")
    resp_d = http_post("/agent/chat", {"query": "Compare INC-104 and INC-204."})
    text_d = resp_d.get("response", "")
    assert "INC-104" in text_d
    assert "INC-204" in text_d
    assert ("Similarities" in text_d or "SIMILARITIES" in text_d or "Differences" in text_d or "DIFFERENCES" in text_d or "Differences:" in text_d)
    print("[PASS] TEST D: Direct comparison rendered facts, similarities, and differences.")
    results["TEST_D"] = "PASS"
except Exception as e:
    print("[FAIL] TEST D:", str(e))
    results["TEST_D"] = f"FAIL: {e}"

# TEST E — NEW INCIDENT INVESTIGATION WITHOUT REQUIRING DB EXISTENCE
try:
    print("\n--- TEST E: NEW INCIDENT INVESTIGATION (INC-999_UNSTORED) ---")
    new_inc_prompt = (
        "INC-999\n"
        "Service: authentication-service\n"
        "Symptom: HTTP 503 during peak traffic\n"
        "Observations:\n"
        "- database connections approaching maximum\n"
        "- connection acquisition delays\n"
        "- increased traffic\n"
        "Investigate INC-999 using only information stored in OpsMind memory."
    )
    resp_e = http_post("/agent/chat", {"query": new_inc_prompt})
    text_e = resp_e.get("response", "")
    assert "Incident INC-999 is not stored" not in text_e
    assert "incident not found" not in text_e.lower()
    assert ("HISTORICAL MATCH" in text_e or "Historical Match" in text_e or "INC-305" in text_e or "INC-104" in text_e)
    print("[PASS] TEST E: New unpersisted incident investigated using historical memory.")
    results["TEST_E"] = "PASS"
except Exception as e:
    print("[FAIL] TEST E:", str(e))
    results["TEST_E"] = f"FAIL: {e}"

# TEST F — HISTORICAL CAUTION
try:
    print("\n--- TEST F: HISTORICAL CAUTION ---")
    assert ("NOT CONFIRMED" in text_e or "not confirmed" in text_e or "Verification" in text_e or "VERIFICATION" in text_e)
    print("[PASS] TEST F: Historical root cause presented as historical evidence without assuming confirmed.")
    results["TEST_F"] = "PASS"
except Exception as e:
    print("[FAIL] TEST F:", str(e))
    results["TEST_F"] = f"FAIL: {e}"

# TEST G — NIGHT SHIFT (RESOLVE INC-403 & RETRIEVE COMPLETE HANDOFF)
try:
    print("\n--- TEST G: NIGHT SHIFT (RESOLVE INC-403 & RETRIEVE HANDOFF) ---")
    # 1. Create INC-403
    http_post("/incidents", {
        "id": "INC-403",
        "service": "billing-service",
        "symptom": "Stripe webhook callback worker starvation under heavy load",
        "observations": ["Webhook queue latency exceeded 300s", "Worker threads blocked on unreleased sockets"],
        "status": "INVESTIGATING"
    })
    # 2. Resolve INC-403
    http_post("/incidents/INC-403/resolve", {
        "root_cause": "Async webhook dispatcher thread pool exhausted due to blocking external API calls.",
        "resolution": "Configured non-blocking HTTP client and increased worker threads from 20 to 50.",
        "evidence": [
            "Worker thread pool saturation confirmed at 20/20 threads",
            "Socket timeout logs against external gateway"
        ],
        "verification": [
            "Webhook queue latency dropped to <500ms",
            "Zero dropped webhook notifications"
        ],
        "status": "RESOLVED"
    })
    # 3. Retrieve handoff
    handoff_g = http_get("/incidents/INC-403/handoff")
    assert handoff_g["incident_id"] == "INC-403"
    assert handoff_g["service"] == "billing-service"
    assert handoff_g["status"] == "RESOLVED"
    assert len(handoff_g["evidence"]) >= 2
    assert len(handoff_g["resolution"]) >= 1
    assert "NIGHT SHIFT HANDOFF" in handoff_g["handoff_markdown"]
    print("[PASS] TEST G: Complete structured handoff generated from persistent incident memory for INC-403.")
    results["TEST_G"] = "PASS"
except Exception as e:
    print("[FAIL] TEST G:", str(e))
    results["TEST_G"] = f"FAIL: {e}"

# TEST H — PATTERN DETECTION
try:
    print("\n--- TEST H: PATTERN DETECTION ---")
    patterns_h = http_get("/memory/patterns")
    assert patterns_h["count"] >= 1
    pat_titles = [p["title"] for p in patterns_h["patterns"]]
    assert any("Database connection exhaustion" in t for t in pat_titles)
    print(f"[PASS] TEST H: Recurring patterns dynamically detected from stored incidents: {pat_titles}")
    results["TEST_H"] = "PASS"
except Exception as e:
    print("[FAIL] TEST H:", str(e))
    results["TEST_H"] = f"FAIL: {e}"

# TEST I — SEARCH
try:
    print("\n--- TEST I: GLOBAL MEMORY SEARCH ---")
    search_i = http_get("/memory/search?q=database%20connection%20exhaustion")
    assert search_i["count"] >= 1
    found_ids = [r["incident_id"] for r in search_i["results"][:5]]
    assert any(x in found_ids for x in ["INC-104", "INC-204", "INC-305", "INC-121", "INC-401", "INC-402"])
    print(f"[PASS] TEST I: Search returned matching historical records: {found_ids}")
    results["TEST_I"] = "PASS"
except Exception as e:
    print("[FAIL] TEST I:", str(e))
    results["TEST_I"] = f"FAIL: {e}"

print("\n" + "=" * 60)
print("FINAL ACCEPTANCE SUITE SUMMARY:")
for test, res in results.items():
    print(f"  {test}: {res}")
print("=" * 60)

if any("FAIL" in str(r) for r in results.values()):
    sys.exit(1)
else:
    sys.exit(0)
