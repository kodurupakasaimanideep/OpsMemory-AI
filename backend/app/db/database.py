import os
import json
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime
from dotenv import load_dotenv

# Try to load credentials from atlas-credentials.env or .env
_atlas_env_path = Path(__file__).resolve().parent.parent.parent.parent / "atlas-credentials.env"
if _atlas_env_path.exists():
    load_dotenv(_atlas_env_path)

_backend_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if _backend_env_path.exists():
    load_dotenv(_backend_env_path)

MONGODB_URI = os.getenv(
    "MONGODB_URI",
    "mongodb+srv://kodurupakamanideep71_db_user:gnCwFvNL2Zhpqd27@cluster0.vb68lk5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
)
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "opsmind")

# Database state
_mongo_client = None
_mongo_db = None
_use_mongo = False
_last_mongo_attempt = 0

import importlib
import time

def get_mongo_db():
    global _mongo_client, _mongo_db, _use_mongo, _last_mongo_attempt
    if _mongo_db is not None:
        return _mongo_db

    now = time.time()
    if now - _last_mongo_attempt < 30:
        return None
    _last_mongo_attempt = now

    try:
        pymongo = importlib.import_module("pymongo")
        _mongo_client = pymongo.MongoClient(MONGODB_URI, serverSelectionTimeoutMS=2000)
        # Test connection
        _mongo_client.admin.command("ping")
        _mongo_db = _mongo_client[MONGODB_DB_NAME]
        _use_mongo = True
        print(f"[Database] Successfully connected to MongoDB Atlas (DB: {MONGODB_DB_NAME})")
        return _mongo_db
    except Exception as e:
        print(f"[Database] MongoDB Atlas connection warning: {e}. Falling back to SQLite.")
        _use_mongo = False
        return None

# SQLite fallback support
import sqlite3
SQLITE_PATH = Path(__file__).parent.parent.parent / "opsmind.db"

def get_sqlite_conn():
    conn = sqlite3.connect(str(SQLITE_PATH), timeout=15)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes MongoDB collections and indexes, plus SQLite tables as fallback."""
    db = get_mongo_db()
    
    default_users = [
        {"username": "nikhil", "name": "Nikhil Verma", "email": "nikhil@microtech.io", "role": "DevOps Lead", "team": "SRE Core", "avatar": "N", "is_active": 1, "created_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")},
        {"username": "priya", "name": "Priya Sharma", "email": "priya@microtech.io", "role": "Senior SRE", "team": "Platform Engineering", "avatar": "P", "is_active": 0, "created_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")},
        {"username": "alex", "name": "Alex Chen", "email": "alex@microtech.io", "role": "Cloud Architect", "team": "Infrastructure Ops", "avatar": "A", "is_active": 0, "created_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")},
        {"username": "sarah", "name": "Sarah Jenkins", "email": "sarah@microtech.io", "role": "Incident Commander", "team": "Production Reliability", "avatar": "S", "is_active": 0, "created_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")},
    ]

    if db is not None:
        try:
            # Users collection
            users_col = db["users"]
            users_col.create_index("username", unique=True)
            if users_col.count_documents({}) == 0:
                users_col.insert_many(default_users)
                print(f"[MongoDB] Initialized 'users' collection with {len(default_users)} default team members.")

            # Incidents collection
            inc_col = db["incidents"]
            inc_col.create_index("id", unique=True)

            # Audit events collection
            audit_col = db["audit_events"]
            audit_col.create_index("incident_id")

            # Chat history collection
            chat_col = db["chat_history"]
            chat_col.create_index("timestamp")

            print("[MongoDB] Collections and indexes initialized successfully.")
        except Exception as e:
            print(f"[MongoDB] Index creation note: {e}")

    # Initialize SQLite tables as persistent local replica
    try:
        conn = get_sqlite_conn()
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                role TEXT NOT NULL,
                team TEXT NOT NULL,
                avatar TEXT NOT NULL,
                is_active INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS audit_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                incident_id TEXT NOT NULL,
                time TEXT NOT NULL,
                action TEXT NOT NULL,
                actor TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS incidents (
                id TEXT PRIMARY KEY,
                title TEXT,
                service TEXT,
                error_type TEXT,
                severity TEXT,
                status TEXT,
                root_cause TEXT,
                resolution TEXT,
                data_json TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("SELECT COUNT(*) as count FROM users")
        if cur.fetchone()["count"] == 0:
            cur.executemany("""
                INSERT INTO users (username, name, email, role, team, avatar, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, [(u["username"], u["name"], u["email"], u["role"], u["team"], u["avatar"], u["is_active"]) for u in default_users])
            conn.commit()
        conn.close()
    except Exception as e:
        print(f"[SQLite] Fallback init note: {e}")

def get_all_users() -> List[Dict[str, Any]]:
    db = get_mongo_db()
    if db is not None:
        try:
            users = list(db["users"].find({}, {"_id": 0}))
            if users:
                return users
        except Exception as e:
            print(f"[MongoDB] Error fetching users: {e}")

    # Fallback to SQLite
    conn = get_sqlite_conn()
    cur = conn.cursor()
    cur.execute("SELECT username, name, email, role, team, avatar, is_active, created_at FROM users ORDER BY id ASC")
    rows = cur.fetchall()
    users = [dict(r) for r in rows]
    conn.close()
    return users

def get_current_user() -> Dict[str, Any]:
    db = get_mongo_db()
    if db is not None:
        try:
            user = db["users"].find_one({"is_active": 1}, {"_id": 0})
            if user:
                return user
            first_user = db["users"].find_one({}, {"_id": 0})
            if first_user:
                return first_user
        except Exception as e:
            print(f"[MongoDB] Error getting current user: {e}")

    # Fallback to SQLite
    conn = get_sqlite_conn()
    cur = conn.cursor()
    cur.execute("SELECT username, name, email, role, team, avatar, is_active FROM users WHERE is_active = 1 LIMIT 1")
    row = cur.fetchone()
    if not row:
        cur.execute("SELECT username, name, email, role, team, avatar, is_active FROM users LIMIT 1")
        row = cur.fetchone()
    conn.close()
    if row:
        return dict(row)
    
    return {
        "username": "nikhil",
        "name": "Nikhil Verma",
        "email": "nikhil@microtech.io",
        "role": "DevOps Lead",
        "team": "SRE Core",
        "avatar": "N",
        "is_active": 1
    }

def set_current_user(username: str) -> Optional[Dict[str, Any]]:
    clean_username = username.strip().lower()
    db = get_mongo_db()
    if db is not None:
        try:
            target = db["users"].find_one({"username": clean_username})
            if target:
                db["users"].update_many({}, {"$set": {"is_active": 0}})
                db["users"].update_one({"username": clean_username}, {"$set": {"is_active": 1}})
                # Mirror in SQLite
                _mirror_sqlite_active(clean_username)
                return get_current_user()
        except Exception as e:
            print(f"[MongoDB] Error switching user: {e}")

    # SQLite
    _mirror_sqlite_active(clean_username)
    return get_current_user()

def _mirror_sqlite_active(clean_username: str):
    try:
        conn = get_sqlite_conn()
        cur = conn.cursor()
        cur.execute("UPDATE users SET is_active = 0")
        cur.execute("UPDATE users SET is_active = 1 WHERE username = ?", (clean_username,))
        conn.commit()
        conn.close()
    except Exception:
        pass

def create_user(username: str, name: str, email: str, role: str, team: str) -> Dict[str, Any]:
    clean_username = username.strip().lower()
    avatar = name.strip()[0].upper() if name.strip() else clean_username[0].upper()
    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    user_doc = {
        "username": clean_username,
        "name": name,
        "email": email,
        "role": role,
        "team": team,
        "avatar": avatar,
        "is_active": 1,
        "created_at": now_str
    }

    db = get_mongo_db()
    if db is not None:
        try:
            # Set all others inactive
            db["users"].update_many({}, {"$set": {"is_active": 0}})
            # Upsert new user
            db["users"].update_one(
                {"username": clean_username},
                {"$set": user_doc},
                upsert=True
            )
            print(f"[MongoDB] Saved user '{clean_username}' to MongoDB Atlas.")
        except Exception as e:
            print(f"[MongoDB] Error creating user: {e}")

    # Also mirror in SQLite
    try:
        conn = get_sqlite_conn()
        cur = conn.cursor()
        cur.execute("UPDATE users SET is_active = 0")
        cur.execute("SELECT id FROM users WHERE username = ?", (clean_username,))
        if cur.fetchone():
            cur.execute("""
                UPDATE users SET name = ?, email = ?, role = ?, team = ?, avatar = ?, is_active = 1 WHERE username = ?
            """, (name, email, role, team, avatar, clean_username))
        else:
            cur.execute("""
                INSERT INTO users (username, name, email, role, team, avatar, is_active)
                VALUES (?, ?, ?, ?, ?, ?, 1)
            """, (clean_username, name, email, role, team, avatar))
        conn.commit()
        conn.close()
    except Exception:
        pass

    return get_current_user()

def record_audit_event(incident_id: str, action: str, actor: str):
    now_time = datetime.utcnow().strftime("%H:%M")
    event_doc = {
        "incident_id": incident_id,
        "time": now_time,
        "action": action,
        "actor": actor,
        "created_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    }

    db = get_mongo_db()
    if db is not None:
        try:
            db["audit_events"].insert_one(event_doc)
        except Exception as e:
            print(f"[MongoDB] Error recording audit event: {e}")

    # Fallback to SQLite
    try:
        conn = get_sqlite_conn()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO audit_events (incident_id, time, action, actor)
            VALUES (?, ?, ?, ?)
        """, (incident_id, now_time, action, actor))
        conn.commit()
        conn.close()
    except Exception:
        pass

def get_audit_events_for_incident(incident_id: str) -> List[Dict[str, Any]]:
    db = get_mongo_db()
    if db is not None:
        try:
            events = list(db["audit_events"].find({"incident_id": incident_id}, {"_id": 0}))
            if events:
                return events
        except Exception as e:
            print(f"[MongoDB] Error fetching audit events: {e}")

    # Fallback to SQLite
    conn = get_sqlite_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT time, action, actor FROM audit_events 
        WHERE incident_id = ? ORDER BY id ASC
    """, (incident_id,))
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def save_chat_exchange(query: str, response: str, actor: str, provider: str):
    """Persists chat interactions to MongoDB Atlas for historical auditing."""
    db = get_mongo_db()
    if db is not None:
        try:
            db["chat_history"].insert_one({
                "query": query,
                "response": response,
                "actor": actor,
                "provider": provider,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            })
        except Exception as e:
            print(f"[MongoDB] Error saving chat history: {e}")

import re

def save_incident_to_db(incident_data: Dict[str, Any]):
    """Saves or updates an incident document in MongoDB Atlas and SQLite replica."""
    if not incident_data or "id" not in incident_data:
        return

    clean_data = {k: v for k, v in incident_data.items() if k != "_id"}
    clean_data["last_synced_at"] = datetime.utcnow().isoformat() + "Z"
    inc_id = clean_data["id"]

    # 1. MongoDB Atlas
    db = get_mongo_db()
    if db is not None:
        try:
            db["incidents"].update_one(
                {"id": inc_id},
                {"$set": clean_data},
                upsert=True
            )
        except Exception as e:
            print(f"[MongoDB] Error saving incident {inc_id}: {e}")

    # 2. SQLite replica
    try:
        conn = get_sqlite_conn()
        cur = conn.cursor()
        title = clean_data.get("title", "")
        service = clean_data.get("service", "")
        error_type = clean_data.get("error_type", "")
        severity = clean_data.get("severity", "HIGH")
        status = clean_data.get("status", "INVESTIGATING")
        root_cause = clean_data.get("root_cause")
        root_cause_str = str(root_cause) if root_cause is not None else None
        resolution = clean_data.get("resolution")
        resolution_str = "\n".join(resolution) if isinstance(resolution, list) else (str(resolution) if resolution is not None else None)
        started_at = clean_data.get("started_at") or datetime.utcnow().isoformat() + "Z"
        data_json = json.dumps(clean_data)

        cur.execute("""
            INSERT INTO incidents (id, title, service, error_type, severity, status, root_cause, resolution, started_at, data_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                title=excluded.title,
                service=excluded.service,
                error_type=excluded.error_type,
                severity=excluded.severity,
                status=excluded.status,
                root_cause=excluded.root_cause,
                resolution=excluded.resolution,
                started_at=excluded.started_at,
                data_json=excluded.data_json,
                updated_at=CURRENT_TIMESTAMP
        """, (inc_id, title, service, error_type, severity, status, root_cause_str, resolution_str, started_at, data_json))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[SQLite] Error saving incident {inc_id}: {e}")

def save_incident_to_mongo(incident_data: Dict[str, Any]):
    """Alias for save_incident_to_db for backwards compatibility."""
    save_incident_to_db(incident_data)

def get_incident_from_db(incident_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves an incident by exact ID from MongoDB Atlas or SQLite."""
    if not incident_id:
        return None
    clean_id = incident_id.strip()

    # 1. Try MongoDB Atlas
    db = get_mongo_db()
    if db is not None:
        try:
            # Case-insensitive match on ID
            pattern = re.compile(f"^{re.escape(clean_id)}$", re.IGNORECASE)
            inc = db["incidents"].find_one({"id": pattern}, {"_id": 0})
            if inc:
                return inc
        except Exception as e:
            print(f"[MongoDB] Error fetching incident {clean_id}: {e}")

    # 2. Try SQLite replica
    try:
        conn = get_sqlite_conn()
        cur = conn.cursor()
        cur.execute("SELECT data_json FROM incidents WHERE UPPER(id) = UPPER(?)", (clean_id,))
        row = cur.fetchone()
        conn.close()
        if row and row["data_json"]:
            return json.loads(row["data_json"])
    except Exception as e:
        print(f"[SQLite] Error fetching incident {clean_id}: {e}")

    return None

def incident_exists_in_db(incident_id: str) -> bool:
    """Checks whether an incident exists in MongoDB Atlas or SQLite."""
    return get_incident_from_db(incident_id) is not None

def get_all_incidents_from_db() -> List[Dict[str, Any]]:
    """Retrieves all incidents from MongoDB Atlas (or SQLite fallback)."""
    db = get_mongo_db()
    if db is not None:
        try:
            incidents = list(db["incidents"].find({}, {"_id": 0}))
            if incidents:
                return incidents
        except Exception as e:
            print(f"[MongoDB] Error listing incidents: {e}")

    # SQLite fallback
    try:
        conn = get_sqlite_conn()
        cur = conn.cursor()
        cur.execute("SELECT data_json FROM incidents ORDER BY id ASC")
        rows = cur.fetchall()
        conn.close()
        return [json.loads(r["data_json"]) for r in rows if r["data_json"]]
    except Exception as e:
        print(f"[SQLite] Error listing incidents: {e}")
        return []

# Initialize on import
init_db()
