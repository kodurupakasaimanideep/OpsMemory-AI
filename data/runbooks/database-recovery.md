# Runbook: Database Recovery & Connection Pool Exhaustion

## Overview
This runbook provides emergency troubleshooting steps when services experience database connection timeouts, HikariCP socket saturation, or PostgreSQL connection limits.

---

## 🚨 Immediate Triage Steps

1. **Check Active Database Connections**
   ```sql
   SELECT count(*), state FROM pg_stat_activity WHERE datname = 'payment_db' GROUP BY state;
   ```
2. **Inspect Long Running Queries**
   ```sql
   SELECT pid, now() - query_start AS duration, query 
   FROM pg_stat_activity 
   WHERE state = 'active' AND (now() - query_start) > interval '5 seconds';
   ```
3. **Check Connection Pool Utilization via Metrics**
   - Metric: `hikaricp_connections_active`
   - Metric: `hikaricp_connections_pending`

---

## 🛠️ Recovery Actions

### Option A: Increase Connection Pool Limits (Fast Mitigation)
If sudden traffic surge exhausted the default pool limit (e.g., 50 sockets):
```bash
# Update Helm chart config or Kubernetes ConfigMap
kubectl set env deployment/payment-service SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE=100
kubectl rollout restart deployment/payment-service
```

### Option B: Terminate Stalled Backend Connections
```sql
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle in transaction' AND (now() - state_change) > interval '2 minutes';
```

### Option C: Rollback Suspect Deployment
If the connection exhaustion occurred immediately post-release:
```bash
kubectl rollout undo deployment/payment-service
```
