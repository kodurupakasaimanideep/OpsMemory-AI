from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any, List
from ..services.deployment_risk_service import deployment_risk_service

router = APIRouter(prefix="/deployments", tags=["Deployments"])

class RiskCheckRequest(BaseModel):
    service: str
    version: str

@router.get("")
async def get_deployments():
    return deployment_risk_service.get_deployments()

@router.post("/risk-check")
async def evaluate_risk(payload: RiskCheckRequest):
    return await deployment_risk_service.evaluate_risk(payload.service, payload.version)
