import os
import sys
import asyncio
from pathlib import Path

# Add backend to Python path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.hindsight.memory import memory_engine
from app.hindsight.client import hindsight_client
from app.utils.helpers import load_json_file, get_data_dir

async def seed_hindsight_knowledge():
    data_dir = get_data_dir()
    incidents_dir = data_dir / "incidents"
    
    print("=" * 60)
    print("OpsMind Seeding: Initializing Hindsight Organizational Memory")
    print("=" * 60)
    
    # Ensure memory store base structure exists
    stats = memory_engine.get_stats()
    print(f"Base Memory Categories: {stats.get('categories')}")
    print(f"Total Base Memories: {stats.get('total_memories', 2481)}")
    
    # Store resolutions for key historical incidents
    canonical_patterns = [
        {
            "incident_id": "INC-001",
            "service": "Payment API",
            "error_type": "Database Connection Timeout",
            "root_cause": "Worker process had a connection leak in async webhook callback handler (database sockets unreleased on client disconnect).",
            "resolution": "Restarted affected worker processes and deployed connection-pool context manager fix in v2.4.2.",
            "useful": True,
            "feedback": "Connection leak hotfix verified in Day Shift. Pool stabilized at 12/50."
        },
        {
            "incident_id": "INC-002",
            "service": "Payment API",
            "error_type": "Database Connection Timeout",
            "root_cause": "Database CPU and I/O overload caused by unindexed analytical reporting query executing against primary database replica.",
            "resolution": "Terminated blocking query, added index on ledger_transactions, and redirected analytical traffic to read replica.",
            "useful": True,
            "feedback": "Symptom identical to INC-001 but root cause is DB overload from analytical query."
        },
        {
            "incident_id": "INC-003",
            "service": "Checkout Gateway",
            "error_type": "HTTP 504 Gateway Timeout",
            "root_cause": "Downstream payment processing provider experienced regional latency degradation, exhausting local connection threads.",
            "resolution": "Engaged circuit breaker fallback to secondary payment rail and tightened upstream timeout thresholds.",
            "useful": True,
            "feedback": "Multi-rail fallback restored payment SLA within 22 minutes."
        },
        {
            "incident_id": "INC-004",
            "service": "Notification Service",
            "error_type": "Kubernetes OOMKilled",
            "root_cause": "Memory leak caused by unmanaged byte buffer retention in PDF invoice rendering library during high-volume batch dispatch.",
            "resolution": "Updated PDF rendering buffer context disposal, enforced garbage collection, and increased pod limit to 1Gi.",
            "useful": True,
            "feedback": "Memory consumption stabilized at 190Mi under 10k messages/min load."
        }
    ]
    
    for pat in canonical_patterns:
        res = await memory_engine.store_incident_resolution(
            incident_id=pat["incident_id"],
            service=pat["service"],
            error_type=pat["error_type"],
            root_cause=pat["root_cause"],
            resolution=pat["resolution"],
            useful=pat["useful"],
            engineer_feedback=pat["feedback"]
        )
        print(f"  [+] Seeded Pattern: {pat['incident_id']} -> {pat['service']} ({pat['error_type']}) [Total Bank: {res['total_memories']}]")
        
    print("-" * 60)
    print("Hindsight Organizational Memory Knowledge Base successfully seeded.")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(seed_hindsight_knowledge())
