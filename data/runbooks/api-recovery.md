# Runbook: API 500 / 503 Gateway & Upstream Recovery

## Symptoms
- Ingress controller logging HTTP 503 / 504 status codes.
- Upstream service pods failing readiness probe.

## Triage
1. Check pod status: `kubectl get pods -n production -l app=payment-service`
2. Check pod events: `kubectl describe pod -n production <pod-name>`
3. Check container logs: `kubectl logs -n production -l app=payment-service --tail=100`

## Mitigation
1. **Traffic Shedding / Rate Limiting**: Enable Cloudflare Under Attack mode if DDoS is suspected.
2. **Horizontal Scale-Out**:
   ```bash
   kubectl scale deployment/payment-service --replicas=12 -n production
   ```
3. **Emergency Rollback**:
   ```bash
   kubectl rollout undo deployment/payment-service -n production
   ```
