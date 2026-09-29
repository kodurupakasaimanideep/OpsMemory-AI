import os
import sys
import json
from pathlib import Path

# Add backend to Python path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.db import database
from app.hindsight.memory import memory_engine
from app.utils.helpers import load_json_file

def seed_all_incidents():
    base_dir = Path(__file__).resolve().parent.parent
    incidents_dir = base_dir / "data" / "incidents"
    
    print("=" * 60)
    print("OpsMind Seeding: Loading Incident Knowledge Base")
    print("=" * 60)
    
    if not incidents_dir.exists():
        print(f"Error: Incidents directory not found at {incidents_dir}")
        return
        
    incident_files = sorted(list(incidents_dir.glob("*.json")))
    loaded_count = 0
    
    for f in incident_files:
        data = load_json_file(f)
        if data and "id" in data:
            inc_id = data["id"]
            database.save_incident_to_db(data)
            memory_engine.store_incident_memory(data)
            loaded_count += 1
            print(f"  [+] Loaded {inc_id.ljust(10)} | {data.get('service', 'Service').ljust(22)} | {data.get('title', '')[:35]}")
            
    print("-" * 60)
    print(f"Successfully seeded {loaded_count} incident records into OpsMind database & memory.")
    print("=" * 60)

if __name__ == "__main__":
    seed_all_incidents()
