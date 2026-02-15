# Observability

## Description

Instrument backend systems with structured logging, metrics, and distributed tracing so you can understand what's happening in production, diagnose issues quickly, and detect problems before users report them. This skill covers the universal observability principles — the three pillars (logs, metrics, traces), health checks, alerting strategy, and SLI/SLO-driven monitoring — that apply regardless of your stack or cloud provider.

## When To Use

- Setting up monitoring and logging for a new service
- Debugging a production issue with insufficient visibility
- A service is slow or failing and you need to trace the root cause across services
- Defining SLIs/SLOs for reliability targets
- Choosing between observability tools or platforms
- Reviewing code that lacks logging, metrics, or error reporting

## Prerequisites

- Understanding of HTTP request lifecycle and server-side architecture
- Familiarity with JSON and structured data formats
- Basic knowledge of what metrics, logs, and traces are conceptually

## Instructions

### 1. Implement Structured Logging

Logs are the narrative record of your system. Make them machine-parseable:

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
  "error": {
    "type": "PaymentGatewayTimeout",
    "message": "Gateway response timeout after 30s",
    "stack": "..."
  },
  "duration_ms": 30012
}
```

**Logging rules:**

| Level | Use for | Example |
|-------|---------|---------|
| `error` | Failures requiring attention | Payment failed, database connection lost |
| `warn` | Degraded but functional | Retry succeeded, cache miss, fallback used |
| `info` | Significant business events | Order placed, user registered, deployment started |
| `debug` | Diagnostic detail (disabled in prod by default) | SQL query, cache key, parsed request body |

- **Always use structured (JSON) logs.** Text logs are impossible to query at scale.
- **Include contextual fields** — traceId, requestId, userId — on every log line. Use middleware to inject them automatically.
- **Log at boundaries.** Request received, request completed (with duration), external service called, external service responded.
- **Never log secrets.** Passwords, tokens, API keys, PII, and credit card numbers must be redacted or excluded.

### 2. Collect the Right Metrics

Metrics are numerical measurements over time. Focus on the **RED** and **USE** methods:

**RED — for request-driven services:**
| Metric | What it tells you |
|--------|------------------|
| **Rate** | Requests per second | 
| **Errors** | Error rate (4xx and 5xx) |
| **Duration** | Response time distribution (p50, p95, p99) |

**USE — for infrastructure resources:**
| Metric | What it tells you |
|--------|------------------|
| **Utilisation** | How busy is the resource? (CPU %, memory %, disk I/O) |
| **Saturation** | Is work queuing up? (queue depth, thread pool exhaustion) |
| **Errors** | Resource-level errors (disk failures, connection resets) |

**Essential application metrics to instrument:**
```
http_request_duration_seconds{method, path, status}     — histogram
http_requests_total{method, path, status}                — counter
db_query_duration_seconds{operation, table}               — histogram
external_service_requests_total{service, status}          — counter
queue_depth{queue_name}                                   — gauge
active_connections{pool_name}                             — gauge
```

Use a metrics library (Prometheus client, OpenTelemetry SDK, StatsD) to instrument at the application level. Don't rely solely on infrastructure metrics.

### 3. Implement Distributed Tracing

In a multi-service system, a single user request may touch 5+ services. Tracing connects the dots:

```
[Frontend] → [API Gateway] → [Order Service] → [Payment Service]
                                              → [Inventory Service]
                                              → [Notification Service]

Trace ID: abc-123
  ├─ Span: API Gateway (12ms)
  ├─ Span: Order Service (145ms)
  │   ├─ Span: DB query (8ms)
  │   ├─ Span: Payment Service call (95ms)
  │   │   └─ Span: Payment gateway HTTP (82ms)  ← bottleneck
  │   └─ Span: Inventory Service call (23ms)
  └─ Span: Notification Service (async, 5ms)
```

**Implementation:**
- Use **OpenTelemetry** — it's the industry standard for instrumentation (traces, metrics, and logs).
- **Propagate trace context** across HTTP (via `traceparent` header), message queues (via message metadata), and async jobs.
- **Auto-instrument** HTTP clients, database drivers, and message consumers where possible. Add manual spans for business-critical operations.
- **Sample** in high-traffic systems — trace 100% of errors, 10% of successes.

### 4. Build Health Checks

Every service needs at least two health endpoints:

```
GET /health/live    → "Is the process running?"
  200 { "status": "ok" }                    ← used by container orchestrator for restart decisions

GET /health/ready   → "Can the service handle requests?"
  200 { "status": "ok", "checks": {
    "database": "ok",
    "cache": "ok",
    "payment-gateway": "ok"
  }}
  503 { "status": "degraded", "checks": {  ← used by load balancer to stop sending traffic
    "database": "ok",
    "cache": "timeout",
    "payment-gateway": "ok"
  }}
```

- **Liveness:** Simple process check. Don't include dependency checks (a sick database shouldn't trigger a restart loop).
- **Readiness:** Check all critical dependencies. Return 503 if any are unhealthy.
- **Startup:** For services with long initialisation, a separate startup probe prevents premature restarts.

### 5. Define SLIs, SLOs, and Error Budgets

Move from "is the server up?" to "are users experiencing a good service?"

| Concept | Definition | Example |
|---------|-----------|---------|
| **SLI** (Service Level Indicator) | A measurable metric of user experience | p99 latency, error rate, availability |
| **SLO** (Service Level Objective) | The target for an SLI | p99 latency < 500ms, availability ≥ 99.9% |
| **Error Budget** | The acceptable amount of failure | 0.1% downtime ≈ 43 min/month |

**Practical approach:**
1. Pick 2–4 SLIs that reflect user experience (not server CPU)
2. Set achievable SLO targets based on current baseline + business needs
3. Alert when the error budget burn rate is too high (not on every single error)

### 6. Design Alerts That Are Actionable

**Good alert = someone needs to do something now.**

```
✅ Good: "Payment error rate > 5% for 5 minutes" → action: investigate payment service
✅ Good: "Error budget burn rate exceeds 10x for 1 hour" → action: roll back or fix

❌ Bad: "CPU > 80%" → what should I do? Maybe it's fine.
❌ Bad: "1 error occurred" → noise. Single errors happen constantly.
```

**Alert design rules:**
- **Alert on symptoms, not causes.** Users experience latency, not CPU spikes.
- **Set meaningful thresholds** with duration windows. `error_rate > 5% for 5 minutes` not `error_rate > 0%`.
- **Use severity levels:** P1 (page, wake someone up), P2 (investigate within business hours), P3 (review in next sprint).
- **Every alert must have a runbook** — what to check, how to mitigate, who to escalate to.
- **Review and prune alerts quarterly.** Ignored alerts erode trust in the system.

## Best Practices

- **Use OpenTelemetry as your instrumentation standard.** It supports all three pillars (logs, metrics, traces) and is vendor-neutral.
- **Correlate logs, metrics, and traces.** Include `traceId` in logs, link trace spans to metric exemplars. This lets you jump from a metric spike → trace → logs in seconds.
- **Log at the correct level.** If every request generates 20 log lines, you'll drown in noise. Log meaningful events, not every function call.
- **Dashboard hierarchically.** Overview dashboard (SLOs, error budget) → Service dashboard (RED metrics, dependencies) → Debug dashboard (individual endpoints, queries).
- **Test your observability in staging.** Inject failures and verify you can diagnose them using only your dashboards and alerts — without access to the code or ssh.
- **Include build/deploy info in metrics.** Tag metrics with `version` or `commit` so you can correlate performance changes with deployments.

## Common Pitfalls

- **Logging without structure.** `console.log("Error processing order")` is useless at scale. You can't search, filter, or aggregate unstructured text.
- **Too many metrics, too few that matter.** Collecting 500 metrics where no one looks at 490 of them wastes resources and attention. Start with RED + USE.
- **Alerting on every error.** Errors are normal in distributed systems. Alert on *rates and trends*, not individual occurrences.
- **No correlation between signals.** If you can't get from "this metric spiked" to "here's the trace showing why" in under 2 minutes, your observability has gaps.
- **Ignoring cardinality.** Metrics with high-cardinality labels (e.g., `userId`, `requestUrl` with path params) explode storage costs and query times. Use bounded labels.
- **Health checks that lie.** A `/health` endpoint that always returns 200 without checking dependencies gives false confidence.

## Reference

- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Google SRE Book — Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)
- [RED Method — Tom Wilkie](https://grafana.com/blog/2018/08/02/the-red-method-how-to-instrument-your-services/)
- [USE Method — Brendan Gregg](https://www.brendangregg.com/usemethod.html)
- [The Three Pillars of Observability](https://www.oreilly.com/library/view/distributed-systems-observability/9781492033431/)
