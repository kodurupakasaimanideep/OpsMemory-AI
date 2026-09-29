from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from ..db.database import get_all_users, get_current_user, set_current_user, create_user

router = APIRouter(prefix="/auth", tags=["Authentication & User Management"])

class SwitchUserPayload(BaseModel):
    username: str

class RegisterUserPayload(BaseModel):
    username: str
    name: str
    email: Optional[str] = None
    role: Optional[str] = "DevOps Engineer"
    team: Optional[str] = "SRE Core"

@router.get("/users")
async def list_users():
    return get_all_users()

@router.get("/current")
async def current_user():
    return get_current_user()

@router.post("/switch")
async def switch_user(payload: SwitchUserPayload):
    user = set_current_user(payload.username)
    if not user:
        raise HTTPException(status_code=404, detail=f"User {payload.username} not found")
    return {"success": True, "user": user}

@router.post("/register")
async def register_user(payload: RegisterUserPayload):
    if not payload.username or not payload.name:
        raise HTTPException(status_code=400, detail="Username and name are required")
    
    email = payload.email or f"{payload.username.lower()}@microtech.io"
    user = create_user(
        username=payload.username,
        name=payload.name,
        email=email,
        role=payload.role or "DevOps Engineer",
        team=payload.team or "SRE Core"
    )
    return {"success": True, "user": user}

@router.post("/login")
async def login_user(payload: SwitchUserPayload):
    user = set_current_user(payload.username)
    if not user:
        # Create user on the fly if new
        clean_name = payload.username.replace(".", " ").replace("-", " ").title()
        user = create_user(
            username=payload.username,
            name=clean_name,
            email=f"{payload.username.lower()}@microtech.io",
            role="DevOps Engineer",
            team="SRE Core"
        )
    return {"success": True, "user": user}
