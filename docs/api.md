# OpsMind REST API Specification

## Endpoints

### 1. Incidents
- `GET /api/incidents`: List all active and historical incidents.
- `GET /api/incidents/{incident_id}`: Retrieve full incident telemetry, logs, and investigation.
- `POST /api/incidents`: Ingest new incident.
- `POST /api/incidents/{incident_id}/resolve`: Resolve incident and teach the AI memory engine.

### 2. Agent & Investigation
- `POST /api/agent/investigate/{incident_id}`: Trigger automated multi-hop root cause analysis with Hindsight retrieval.
- `POST /api/agent/chat`: Query natural language DevOps memory agent.

### 3. Hindsight Memory
- `GET /api/memory/stats`: Get memory categories and stats count.
- `GET /api/memory/search`: Semantic search through Hindsight knowledge bank.
- `GET /api/memory/chain/{incident_id}`: Get visual reasoning evidence chain graph.

### 4. Deployments
- `GET /api/deployments`: List recent and upcoming deployments.
- `POST /api/deployments/risk-check`: Evaluate pre-deployment risk score against historical failure memories.

### 5. Analytics & Runbooks
- `GET /api/analytics`: Overview metrics, MTTR, repeat rates, root cause distribution.
- `GET /api/runbooks`: List available troubleshooting runbooks.
- `GET /api/runbooks/{runbook_id}`: Get runbook markdown content.
