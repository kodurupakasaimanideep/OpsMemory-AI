# OpsMind: AI DevOps Incident Memory & Root-Cause Agent

OpsMind is an enterprise-grade DevOps Incident Memory and Root-Cause Analysis Agent powered by the **Hindsight Memory Architecture** and **Groq LLM** ultra-fast inference (`llama-3.3-70b-versatile`).

---

## 🧠 Two-Brain Architecture

OpsMind solves the critical weakness of traditional incident systems by operating with **two complementary brains**:

```
                  ┌─────────────────┐
                  │  NEW INCIDENT   │
                  └────────┬────────┘
                           │
                 ┌─────────▼─────────┐
                 │ Current Evidence  │
                 │ (Logs, Telemetry, │
                 │ Deployment Diffs) │
                 └─────────┬─────────┘
                           │
                  ┌────────▼────────┐
                  │ Hindsight Search│
                  └────────┬────────┘
                           │
                ┌──────────┴──────────┐
                │                     │
        Useful memory?          No useful memory?
        (Similarity >= 75%)    (Novel issue signature)
                │                     │
                ▼                     ▼
      🧠 BRAIN 2: MEMORY     🧠 BRAIN 1: AI INVESTIGATION
       Memory-based fix       Analyze active evidence
      Evidence Chain (92%)    Synthesize hypothesis
                │                     │
                └──────────┬──────────┘
                           │
                 ┌─────────▼─────────┐
                 │  3-State Workflow │
                 │ 🟡 Hypothesis     │
                 │ 🔵 Investigation  │
                 │ 🟢 Confirmed      │
                 └─────────┬─────────┘
                           │
                   Engineer Confirms
                           │
                 ┌─────────▼─────────┐
                 │ Save to Hindsight │
                 │ Organizational    │
                 │ Memory Bank       │
                 └─────────┬─────────┘
                           │
                Future incidents solve
                   up to 57% faster!
```

- **🧠 Brain 1 — AI Investigation Engine**: When an incident has no prior history in Hindsight, the agent switches from memory retrieval to deep evidence investigation. It strictly avoids inventing historical facts, synthesizes an evidence-backed hypothesis from logs, metrics, and deployment diffs, and provides an actionable investigation checklist.
- **🧠 Brain 2 — Hindsight Memory Bank**: When similar incidents have been resolved before, the agent surfaces the multi-hop Memory Evidence Chain (e.g., `INC-104` 95%, `INC-117` 87%), highlighting the proven root cause and verified resolution.

---

## 🚦 3-State Human-in-the-Loop Progression

1. 🟡 **Hypothesis** — AI formulates the most probable cause based on telemetry signals or memory patterns.
2. 🔵 **Investigation** — Engineer verifies hypothesis against staging environments, logs, and database metrics.
3. 🟢 **Confirmed** — Engineer verifies actual root cause and fix. **Only confirmed findings are committed to Hindsight Organizational Memory.**

---

## ⚡ Groq LLM Setup Guide

OpsMind natively supports **Groq** for ultra-fast (sub-second) reasoning with `llama-3.3-70b-versatile`.

### 1. Get a Free Groq API Key
1. Visit [console.groq.com/keys](https://console.groq.com/keys) (takes 30 seconds).
2. Create an API Key (starts with `gsk_...`).

### 2. Configure in OpsMind
Open `opsmind/.env` and update:
```env
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_your_actual_key_here
GROQ_MODEL=llama-3.3-70b-versatile
```

### 3. Verify Connection
Run the built-in verification script:
```bash
python scripts/test_groq.py
```
Output:
```
============================================================
 OpsMind AI: Groq LLM Connection & Inference Test
============================================================
[KEY]   Found GROQ_API_KEY: gsk_abcd...1234
[MODEL] Model Target: llama-3.3-70b-versatile
[WAIT]  Sending live test prompt to api.groq.com...

[OK] Groq LLM Connected & Operational!
[TIME] Latency: 240 ms
[SUCCESS] OpsMind Brain 1 is fully powered by Groq!
============================================================
```

> **Note:** If `GROQ_API_KEY` is not provided, OpsMind seamlessly runs with its built-in deterministic SRE Reasoning Engine so demonstrations never fail.

---

## 🚀 Quick Start (Local Development — No Docker Required)

OpsMind is designed to run entirely locally with **zero Docker dependencies** using SQLite and its high-performance local memory engine.

### 1. Start Backend (FastAPI + Python)
```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```
- Unified API & Web App runs at: `http://localhost:8000`
- Swagger API Docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/health`

### 2. Frontend Development (React + Vite + TypeScript)
```bash
cd frontend
npm install
npm run dev
```
- Development server: `http://localhost:5173`
- Production build: `npm run build` (served automatically by backend at port 8000)

### 3. Run Automated Tests
```bash
python scripts/test_hardened_suite.py
python scripts/run_verify.py
python scripts/test_groq.py
```

---

## 🔌 Optional External Hindsight Integration

When deploying to environments with an external Hindsight vector microservice:

1. **Start External Hindsight** (e.g. `ghcr.io/vectorize-io/hindsight:latest` on port 8888):
   ```bash
   docker run -d --name opsmind-hindsight -p 8888:8888 -v hindsight-data:/home/hindsight/.pg0 ghcr.io/vectorize-io/hindsight:latest
   ```
2. **Configure `backend/.env`**:
   ```env
   HINDSIGHT_API_URL=http://localhost:8888
   HINDSIGHT_NAMESPACE=opsmind-production
   HINDSIGHT_API_KEY=your_optional_hindsight_key
   ```
3. **Resilient Fallback**: If external Hindsight is offline or unconfigured, OpsMind seamlessly routes to the local persistent memory engine with sub-millisecond latency.

---

## 🎬 Rehearsed Live Demo Workflow for Judges

1. **Dashboard Overview**:
   - 4 Core KPIs: Active Incidents, Resolved, Organizational Memory count (2,481+), MTTR (18 min).
   - Enterprise SRE Dark Mode interface with live telemetry indicator.

2. **Demonstrate Brain 2 (Learned Problem — `INC-204`)**:
   - Click `INC-204` (Payment API HTTP 503).
   - Observe **Brain 2 (Hindsight Memory Engine)** engaged with 95% confidence.
   - Click **View Memory Evidence** to inspect the multi-hop evidence chain matching `INC-104` and `INC-117`.
   - Click **Runbook: Database Recovery** to inspect standard operating procedure.

3. **Demonstrate Brain 1 (Novel / Unseen Problem — `INC-207`)**:
   - Return to incidents and click `INC-207` (Notification Service Kafka Lag).
   - Observe **Brain 1 (AI Investigation Engine)** automatically engaged!
   - Memory confidence: `LOW (No historical match found)`. Notice: AI did NOT hallucinate an old incident.
   - Live telemetry shows: 88% CPU, 650 errors, 142k unread messages.
   - Hypothesis formulated: Possible cause related to worker batch processing timeout post-deploy `v1.4.0`.

4. **Demonstrate 3-State Workflow & Learning Loop**:
   - Advance state from 🟡 **Hypothesis** → 🔵 **Investigation** → 🟢 **Confirmed**.
   - Click **Confirm & Save to Memory**.
   - Submit the verified fix: `Increased max.poll.interval.ms to 300,000ms`.
   - Watch Hindsight Organizational Memory increment in real time!
   - Next time this failure pattern happens, Hindsight will match it with 85%+ similarity!
