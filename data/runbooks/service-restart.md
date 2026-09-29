# Runbook: Safe Graceful Service Restart

## Steps
1. Execute rolling restart with zero downtime:
   ```bash
   kubectl rollout restart deployment/<service-name> -n production
   ```
2. Monitor rolling progress:
   ```bash
   kubectl rollout status deployment/<service-name> -n production --watch
   ```
3. Verify error rates drop in Grafana / Datadog.
