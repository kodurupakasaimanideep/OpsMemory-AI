import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding="utf-8")

prompts = [
    ("INC-302", """Incident ID: INC-302
Service: order-service
Symptom: order requests are intermittently returning HTTP 504 during peak traffic.

Initial observations:
- CPU is normal
- database latency is elevated
- application logs show database query timeout
- issue started after traffic increased

Do not invent a root cause or resolution.
Record this as an unresolved investigation.
Tell me exactly what was persisted."""),

    ("INC-301", """Create a new incident in OpsMind memory.

Incident ID: INC-301
Service: payment-service
Symptom: payment requests are intermittently returning HTTP 503 during peak traffic.

Initial observations:
- CPU is normal
- database connections are near the configured limit
- application logs show connection acquisition timeout
- issue started after traffic increased

Do not invent a root cause or resolution.
Record this as an unresolved investigation.
Tell me exactly what was persisted."""),

    ("INC-709", """Please store a new incident report:

Incident ID: INC-709
Service: notification-worker
Symptom: Push notifications delayed by up to 45 minutes for EU users.

Observations:
* Apple APNS connection handshake timing out
* Worker thread starvation under queue spike
* Dead letter queue size reached 12,500 messages

Status: unresolved investigation
Root cause: unknown / not determined
Resolution: none yet

Do not infer any resolution or root cause.
Return only the normalized record.""")
]

for inc_id, text in prompts:
    print("======================================================================")
    print(f"TEST: PROMPT FOR {inc_id}")
    print("======================================================================")
    # 1. SEND TO CHAT (CREATE -> PARSE -> VALIDATE -> PERSIST)
    req = urllib.request.Request(
        "http://127.0.0.1:8000/api/agent/chat",
        data=json.dumps({"query": text}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    res = json.loads(urllib.request.urlopen(req).read().decode("utf-8"))
    print("-> NORMALIZED CREATION OUTPUT:")
    print(res.get("response"))

    # 2. RETRIEVE VIA API
    req_get = urllib.request.Request(f"http://127.0.0.1:8000/api/memory/incident/{inc_id}")
    res_get = json.loads(urllib.request.urlopen(req_get).read().decode("utf-8"))
    print("\n-> REST API RETRIEVAL CLEAN RECORD:")
    clean_extracted = {
        "incident_id": res_get.get("id"),
        "service": res_get.get("service"),
        "symptom": res_get.get("symptom"),
        "observations": res_get.get("observations"),
        "status": res_get.get("status"),
        "root_cause": res_get.get("root_cause"),
        "resolution": res_get.get("resolution")
    }
    print(json.dumps(clean_extracted, indent=2))

    # 3. RETRIEVE VIA CHAT EXACT RECALL
    recall_query = f"What does OpsMind currently remember about {inc_id}? Do not use external knowledge. Return only information stored for this incident."
    req_rec = urllib.request.Request(
        "http://127.0.0.1:8000/api/agent/chat",
        data=json.dumps({"query": recall_query}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    res_rec = json.loads(urllib.request.urlopen(req_rec).read().decode("utf-8"))
    print(f"\n-> CHAT EXACT RECALL FOR {inc_id}:")
    print(res_rec.get("response"))
    print()

print("======================================================================")
print("HISTORICAL INCIDENTS INTEGRITY CHECK:")
print("======================================================================")
for hist_id in ["INC-104", "INC-117", "INC-204"]:
    req_h = urllib.request.Request(f"http://127.0.0.1:8000/api/incidents/{hist_id}")
    h_data = json.loads(urllib.request.urlopen(req_h).read().decode("utf-8"))
    rc = h_data.get("root_cause", "")
    rc_snippet = rc[:40] if rc else "None"
    print(f"{hist_id}: Service={h_data.get('service')} | Status={h_data.get('status')} | Root Cause={rc_snippet}...")
