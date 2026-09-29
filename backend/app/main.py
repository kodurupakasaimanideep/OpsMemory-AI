import os
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from .api import health, incidents, agent, memory, deployments, analytics, runbooks, auth
from .utils.logger import logger

app = FastAPI(
    title="OpsMind AI DevOps Incident Memory API",
    description="Intelligent DevOps Incident Memory & Root-Cause Agent powered by Hindsight",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(incidents.router, prefix="/api")
app.include_router(agent.router, prefix="/api")
app.include_router(memory.router, prefix="/api")
app.include_router(deployments.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(runbooks.router, prefix="/api")

@app.get("/api/info")
def get_service_info():
    return {
        "status": "online",
        "service": "OpsMind AI DevOps Incident Memory API",
        "version": "1.0.0",
        "docs_url": "/docs",
        "health_check": "/api/health",
        "endpoints": {
            "incidents": "/api/incidents",
            "agent": "/api/agent/investigate/{id}",
            "memory": "/api/memory/stats",
            "deployments": "/api/deployments",
            "analytics": "/api/analytics/metrics",
            "runbooks": "/api/runbooks"
        }
    }

# Dist Directory Path for Integrated Frontend
dist_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
assets_path = os.path.join(dist_path, "assets")
index_path = os.path.join(dist_path, "index.html")

if os.path.exists(assets_path):
    app.mount("/assets", StaticFiles(directory=assets_path), name="assets")

@app.get("/")
def serve_root():
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return get_service_info()

@app.get("/{full_path:path}")
async def serve_spa_fallback(full_path: str):
    # Guard against API, docs and openapi routes
    if full_path.startswith("api") or full_path.startswith("docs") or full_path == "openapi.json":
        return JSONResponse(status_code=404, content={"detail": f"Path /{full_path} not found"})
    
    # Check if a static file directly in dist matches (e.g. icons, manifests)
    candidate_file = os.path.join(dist_path, full_path)
    if os.path.isfile(candidate_file):
        return FileResponse(candidate_file)
        
    # Fallback to SPA index.html
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return JSONResponse(status_code=404, content={"detail": "Frontend build not found"})

@app.on_event("startup")
async def startup_event():
    logger.info("OpsMind Backend Service Started successfully. Serving unified frontend & backend.")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("app.main:app", host=host, port=port, reload=True)

