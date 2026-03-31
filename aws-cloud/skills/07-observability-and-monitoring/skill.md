# Observability & Monitoring

## Three Pillars

- Instrument every service with all three pillars: metrics (CloudWatch), logs (CloudWatch Logs), traces (X-Ray)
- Metrics detect that something is wrong; logs explain why; traces show where in the call chain
- Define SLIs and SLOs before launch — "99.9% of requests complete successfully within 500ms" is actionable; "it works" is not

## Metrics

Key metrics to monitor per service:

| Service | Required metrics |
|---------|----------------|
| Lambda | Errors, Duration (P99), Throttles, ConcurrentExecutions |
| API Gateway | 4XXError, 5XXError, Latency (P99), Count |
| ECS | CPUUtilization, MemoryUtilization, RunningTaskCount |
| ALB | HTTPCode_Target_5XX_Count, TargetResponseTime, HealthyHostCount |
| RDS | CPUUtilization, DatabaseConnections, ReadLatency, WriteLatency, FreeableMemory |
| DynamoDB | ThrottledRequests, ConsumedReadCapacityUnits, ConsumedWriteCapacityUnits |
| SQS | ApproximateNumberOfMessagesVisible, ApproximateAgeOfOldestMessage |

- Use EMF (Embedded Metric Format) for high-throughput custom metrics from Lambda — cheaper than `PutMetricData` API calls
- Emit custom metrics for business KPIs (orders per minute, revenue, sign-up conversion) alongside technical metrics
- Create composite alarms that require multiple conditions to fire — reduces alert noise

## Logs

Always write structured JSON logs:

```json
{
  "timestamp": "2025-02-14T10:30:00.000Z",
  "level": "ERROR",
  "service": "order-processor",
  "traceId": "1-65cf1234-abcdef0123456789",
  "orderId": "ORD-2024-001",
  "error": { "name": "PaymentDeclinedError", "code": "PAYMENT_DECLINED" },
  "duration_ms": 245
}
```

- Include correlation IDs (trace ID, request ID, order ID) in every log entry
- Use log levels correctly: ERROR = needs attention; WARN = unexpected but handled; INFO = significant events; DEBUG = off in production
- Set retention policies on all CloudWatch Logs groups — never leave at "never expire"
  - Dev: 7–14 days; Production: 90 days; Archive to S3 for compliance requirements
- Use CloudWatch Logs Insights for ad-hoc investigation queries

## Distributed Tracing with X-Ray

- Enable active tracing on all Lambda functions, API Gateway stages, and ECS services
- Add custom X-Ray subsegments for external API calls and database queries
- Add X-Ray annotations (indexed) for `orderId`, `customerId`, and other searchable attributes
- Add X-Ray metadata (not indexed) for request/response payloads and debug context
- Use the X-Ray service map to identify latency bottlenecks and unhealthy dependencies

## Alarms

- Alarm on symptoms, not causes — "error rate > 1%" is better than "CPU > 80%"
- Use anomaly detection for metrics with variable baselines (traffic patterns, daily seasonality)
- Set `DatapointsToAlarm` to 2/3 or 3/5 to reduce flapping on transient spikes
- Always set `TreatMissingData` — use `notBreaching` for most metrics; `breaching` for always-expected data
- Route alarms by severity: Critical to PagerDuty or Opsgenie; Warning to Slack; Informational to dashboards only
- Every alarm must have a runbook — if there is no action to take, the alarm should not exist

## Dashboards

Build two dashboards per service:

- Operational: request rate, error rate, latency (P50/P95/P99), resource utilisation, queue depth, health
- Business: orders per minute, revenue, conversion rate, feature adoption

- Use CloudWatch Dashboards for AWS-native views; use Amazon Managed Grafana for multi-source dashboards
- Emit metrics at the edge (API Gateway, ALB) to capture client-facing experience, not just backend internals

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Unstructured log strings (`console.log("Error: " + id)`) | Write structured JSON with correlation IDs |
| Alert fatigue from non-actionable alarms | Every alarm must map to a runbook and a clear action |
| No log retention policy | Set retention on creation; archive to S3 for compliance |
| Missing correlation IDs | Propagate trace ID through all services and include in every log line |
| Dashboard-only monitoring | Use alarms for detection; dashboards are for investigation only |

## Best Practices

- Centralise logs across accounts using a shared logging account or cross-account CloudWatch Logs delivery
- Automate incident response with Systems Manager Automation for common remediation actions
- Monitor CloudWatch costs — high-cardinality custom metrics are expensive; review metric namespaces regularly
- Review dashboards and alarms quarterly — remove stale widgets and validate that thresholds are still correct
- Use AWS Lambda Powertools for structured logging, metrics (EMF), and tracing in Lambda functions
