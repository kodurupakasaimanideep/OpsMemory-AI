# Runbook: Connection Pool & PgBouncer Sizing Formula

## Sizing Formula
To avoid exhausting database socket limits:
```
max_pool_size = ((cpu_core_count * 2) + effective_spindle_count)
max_app_connections = total_pods * max_pool_size <= pg_max_connections - 20 (reserved)
```

## Tuning Checklist
1. Never configure `maximumPoolSize` > 100 on individual microservice pods without PgBouncer.
2. Set `connectionTimeout` to 3000ms.
3. Enable `leakDetectionThreshold` at 5000ms.
