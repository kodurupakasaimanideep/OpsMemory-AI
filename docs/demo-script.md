# OpsMind Demonstration Script: Day-Shift to Night-Shift Incident Memory

## 🎯 The Problem Statement
In 24/7 engineering teams, engineers work in shifts. An incident occurs during the day shift. Engineer A investigates, identifies the root cause, applies a fix, and resolves it. When the night-shift Engineer B takes over, they should not start from zero. OpsMind preserves institutional incident memory and provides full context and guidance to the next engineer.

---

## 📋 Complete Day-to-Night Shift Demo Walkthrough

### ☀️ Phase 1: Day Shift — Incident Investigation & Memory Storage

#### 1. Incident Occurs
- **Incident**: `INC-001` — **Payment API Database Connection Timeout**
- **Engineer**: Alex Rivera (Day Shift SRE)
- **Symptoms**:
  - `Database connection pool saturated (50/50 sockets)`
  - `HTTP 503 Service Unavailable on /api/v1/payments`
  - `Payment callback queue backlog exceeded 15,000 tasks`

#### 2. Investigation
- Alex inspects Postgres telemetry and worker process sockets.
- **Finding**: Database CPU/IOPS are normal (34%), but worker processes are failing to return socket handles to the connection pool on client disconnect.
- **Root Cause**: `Worker process had a connection leak in async webhook callback handler (sockets unreleased on client disconnect).`

#### 3. Resolution & Verification
- **Action**: Restarted affected worker pods and deployed hotfix `v2.4.2` wrapping database sessions in a try-finally context manager.
- **Verification**: Error rate dropped to 0.01%, active DB connections stabilized at 12/50.
- **Memory Commitment**: Alex clicks **[Resolve & Save to Memory]**. OpsMind commits `INC-001` to the Hindsight Organizational Memory Bank.

---

### 🌙 Phase 2: Shift Handoff Generation

#### 1. Automated Shift Handoff
- When Alex ends the shift, OpsMind generates the structured handoff:
  ```markdown
  # 📋 SRE INCIDENT HANDOFF: INC-001
  - Service: Payment API
  - Status: RESOLVED
  - Root Cause: Worker process had a connection leak in async webhook callback handler.
  - Fix Applied: Restarted worker processes + deployed connection-pool fix v2.4.2.
  - Verification: DB connections normal (12/50), error rate 0.01%.
  - Night Shift Guidance: Monitor connection pool during scheduled 22:00 batch.
  ```

---

### 🌃 Phase 3: Night Shift — Repeated Symptom & Memory Retrieval

#### 1. Night Shift Alert
- **Engineer**: Night Shift SRE
- At 23:15, a new alert fires: `Payment API experiencing database connection timeouts`.

#### 2. Querying OpsMind Memory
- The Night Shift engineer asks OpsMind:
  > *"What happened with payments-api database connection timeouts earlier today?"*

#### 3. Intelligent Memory Response (No Blind Copying)
OpsMind retrieves `INC-001` from persistent memory and responds with structured evidence:
- **Previous Investigation**: Alex found a worker connection leak in webhook handlers earlier today (Fix: v2.4.2).
- **Distinction & Caution**: OpsMind cautions the engineer that identical symptoms can have different causes:
  - **Possibility A (Connection Leak)**: Check if workers are running `v2.4.2` and if socket counts equal 50 while DB CPU is low.
  - **Possibility B (Database Overload - `INC-002`)**: Check if DB CPU is pegged >90% due to an unindexed batch query (as seen in `INC-002`).
- **Recommended Next Steps**:
  1. Check `pg_stat_activity` for query runtimes.
  2. If DB CPU is < 40%, verify worker pool handles.
  3. If DB CPU is > 90%, inspect for long-running reporting queries.

---

## ⚡ Key Takeaways
1. **Zero Knowledge Loss**: Context travels seamlessly across shifts.
2. **Contextual Reasoning**: Distinguishes between connection leaks (`INC-001`) and database overload (`INC-002`).
3. **Continuous Learning**: Every resolved incident strengthens the team's shared intelligence.
