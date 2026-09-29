import urllib.request
import json
import time
import sys

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
    with urllib.request.urlopen(req, timeout=15) as res:
        raw = res.read().decode("utf-8")
        return res.status, json.loads(raw) if raw else {}


def main():
    print("======================================================================")
    print(" OPSMIND RESTART PERSISTENCE VERIFICATION")
    print("======================================================================")

    # 1. Create incident INC-995 via API / create prompt
    prompt = """Create a new incident in OpsMind memory.

Incident ID: INC-995
Service: persistence-audit-service
Symptom: Disk write durability audit test.

Observations:
- Verifying SQLite database persistence across process restarts
- Verifying JSON organizational memory survival

Status: unresolved investigation
Root cause: unknown / not determined
Resolution: none yet"""

    status, res = make_req("/agent/chat", data={"query": prompt}, method="POST")
    print(f"[1] Incident INC-995 created. Response status: {status}")

    # 2. Resolve incident INC-995
    resolve_data = {
        "actual_root_cause": "Disk journal flush synchronization verified in SQLite WAL mode",
        "actual_fix": "Applied WAL mode persistence to opsmind.db and verified on restart",
        "ai_recommendation_useful": True
    }
    status, res_resolve = make_req("/incidents/INC-995/resolve", data=resolve_data, method="POST")
    print(f"[2] Incident INC-995 resolved. Memory ID: {res_resolve.get('stored_memory_id')}")

    # 3. Query memory before restart
    status, before = make_req("/memory/search?q=WAL+mode+persistence")
    print(f"[3] Search results before restart: {len(before.get('results', []))} items found")
    assert len(before.get("results", [])) > 0

    print("\n[OK] Pre-restart test completed successfully!")

if __name__ == "__main__":
    main()
