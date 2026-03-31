# Observability

## Structured Logging

Always log in JSON. Text logs cannot be queried or aggregated at scale.

```json
{
  "timestamp": "2026-02-14T10:30:00.123Z",
  "level": "error",
  "message": "Failed to process payment",
  "service": "payment-service",
  "traceId": "abc-123-def",
  "requestId": "req-456",
  "userId": "usr-789",
  "orderId": "ord-012",
  "error": { "type": "PaymentGatewayTimeout", "message": "Gateway timeout after 30s" },
  "duration_ms": 30012
}
```

| Level | Use for | Example |
|-------|---------|---------|
| `error` | Failures requiring attention | Payment failed, DB connection lost |
| `warn` | Degraded but functional | Retry succeeded, cache miss, fallback used |
| `info` | Significant business events | Order placed, user registered |
| `debug` | Diagnostic detail (disabled in prod by default) | SQL query, parsed request body |

Rules:
- Inject `traceId`, `requestId`, and `userId` automatically via middleware on every log line
- Log at boundaries: request received, request completed (with duration), external call made and returned
- Never log secrets, passwords, tokens, PII, or card numbers

## Metrics

Instrument with the RED method for request-driven services and USE for infrastructure:

**RED:**
| Metric | What it tells you |
|--------|------------------|
| Rate | Requests per second |
| Errors | Error rate (4xx and 5xx) |
| Duration | Response time distribution (p50, p95, p99) |

**USE:**
| Metric | What it tells you |
|--------|------------------|
| Utilisation | CPU %, memory %, disk I/O |
| Saturation | Queue depth, thread pool exhaustion |
| Errors | Disk failures, connection resets |

Essential metrics to instrument:
```
http_request_duration_seconds{method, path, status}    — histogram
http_requests_total{method, path, status}               — counter
db_query_duration_seconds{operation, table}              — histogram
external_service_requests_total{service, status}         — counter
queue_depth{queue_name}                                  — gauge
active_connections{pool_name}                            — gauge
```

Never use high-cardinality labels (e.g., `userId`, raw `requestUrl` with path params) — they explode storage and query costs.

## Distributed Tracing

Use OpenTelemetry. Propagate trace context across HTTP (`traceparent` header), message queues (message metadata), and async jobs.

Auto-instrument HTTP clients, database drivers, and message consumers where available. Add manual spans for business-critical operations. In high-traffic systems: sample 100% of errors, ~10% of successes.

## Health Checks

Expose two health endpoints on every service:

```
GET /health/live   → Is the process running?
  200 { "status": "ok" }

GET /health/ready  → Can the service handle requests?
  200 { "status": "ok",       "checks": { "database": "ok", "cache": "ok" } }
  503 { "status": "degraded", "checks": { "database": "ok", "cache": "timeout" } }
```

- **Liveness**: process check only — do not include dependency checks (a sick DB should not trigger a restart loop)
- **Readiness**: check all critical dependencies; return `503` if any are unhealthy so the load balancer stops routing traffic
- **Startup probe**: for services with long initialisation, a separate startup probe prevents premature restarts

## SLIs, SLOs, and Error Budgets

| Concept | Definition | Example |
|---------|-----------|---------|
| **SLI** | A measurable metric of user experience | p99 latency, error rate, availability |
| **SLO** | Target value for an SLI | p99 latency < 500ms, availability ≥ 99.9% |
| **Error Budget** | Acceptable amount of failure | 0.1% downtime ≈ 43 min/month |

Pick 2–4 SLIs that reflect user experience (not server CPU). Alert when the error budget burn rate is too high — not on every individual error.

## Alerting Rules

Alert only when someone needs to act now:

```
✅ "Payment error rate > 5% for 5 minutes"        → investigate payment service
✅ "Error budget burn rate exceeds 10x for 1 hour" → roll back or fix

❌ "CPU > 80%"      → ambiguous, often harmless
❌ "1 error occurred" → noise
```

- Alert on symptoms (latency, error rate), not causes (CPU, memory)
- Use duration windows: `error_rate > 5% for 5 minutes`, not `error_rate > 0%`
- Assign severity: P1 (page immediately), P2 (next business hours), P3 (next sprint)
- Every alert must link to a runbook — what to check, how to mitigate, who to escalate to
- Prune alerts quarterly — ignored alerts erode trust

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Unstructured text logs | Use structured JSON with consistent fields |
| Logging every function call | Log at boundaries and on meaningful events only |
| High-cardinality metric labels | Use bounded label sets; never use `userId` or raw URLs |
| Health endpoint that always returns 200 | Check actual dependencies in `/health/ready` |
| Alerting on individual errors | Alert on rates and burn rates over time windows |
| No correlation between signals | Include `traceId` in logs; link metrics exemplars to traces |

## Best Practices

- Use OpenTelemetry as your instrumentation standard — it covers logs, metrics, and traces and is vendor-neutral
- Correlate all three signals: include `traceId` in logs and link trace spans to metric exemplars
- Tag metrics with `version` or `commit` to correlate performance changes with deployments
- Structure dashboards hierarchically: SLO overview → service RED metrics → individual endpoint/query debug
- Test observability in staging: inject failures and verify you can diagnose them using only dashboards and alerts
