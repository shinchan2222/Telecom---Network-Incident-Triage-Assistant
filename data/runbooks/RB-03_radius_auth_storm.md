# Runbook ID: RB-03
## Title: AAA / RADIUS Authentication Storm & Subscriber Lockout
### Trigger Conditions
- RADIUS server authentication request rate spike exceeding 5,000 req/sec.
- Elevated 5G SA / VoLTE subscriber attachment timeout failures.
- Access-Reject or Access-Timeout burst on AAA gateway pool.

### Diagnostic Commands
1. Check AAA pool queue depth and active worker threads:
   `radius-admin status --pool auth-chicago`
2. Check database latency for subscriber profile lookup:
   `telecom-db status --cluster user-db`
3. Inspect rate-limiting rate-limiter stats:
   `show aaa rate-limit counters`

### Mitigation Steps
1. Section 3.1: Enable connection throttling on AAA ingress gateways to drop invalid retry spikes.
2. Section 3.2: Scale out RADIUS worker container pool: `kubectl scale deployment radius-auth --replicas=8`.
3. Section 3.3: Flush expired session tokens from redis cache: `redis-cli flushdb ASYNC`.

### Escalation Criteria
- If subscriber database lookup latency remains > 500ms for 10 minutes, escalate to Core AAA Engineering Team.
