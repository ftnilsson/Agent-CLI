# Observability & Monitoring

## Core Stack

- **Azure Monitor** — platform metrics for every Azure resource
- **Log Analytics workspace** — centralised log store; use one workspace per environment
- **Application Insights** — APM: request traces, dependency tracking, exceptions, custom metrics
- **Azure Monitor Alerts** — metric and log-based alerts with action groups
- **Azure Workbooks / Azure Managed Grafana** — interactive dashboards

Enable Application Insights on every service — it is the fastest path to observability on Azure.

## Application Insights Setup

```bicep
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: 'log-myapp-prod'
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 90
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'appi-myapp-prod'
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
    IngestionMode: 'LogAnalytics'
    RetentionInDays: 90
  }
}
```

- Always use **workspace-based** Application Insights (`IngestionMode: 'LogAnalytics'`) — classic mode is deprecated
- Set Log Analytics retention to 30 days for dev, 90 days for production; export to Storage Account for compliance
- Enable **adaptive sampling** in .NET to control ingestion cost on high-traffic services
- Use the `APPLICATIONINSIGHTS_CONNECTION_STRING` environment variable — not the instrumentation key

## Structured Logging Rules

- Use structured logs — never unformatted strings like `Console.WriteLine($"Error: {orderId}")`
- Include `operationId` (Application Insights propagates this automatically) in every log entry for cross-service correlation
- Log at the correct level: `Error` = needs attention, `Warning` = unexpected but handled, `Information` = significant events; disable `Debug`/`Trace` in production
- Use `ILogger` (.NET), `winston`/`pino` (Node.js), or `structlog` (Python) — avoid raw console output

## Key Metrics to Monitor

| Service | Critical metrics |
|---------|----------------|
| Azure Functions | FunctionExecutionCount, Errors, FunctionExecutionUnits |
| App Service | Http5xx, HttpResponseTime, CpuPercentage, MemoryPercentage |
| Container Apps | Requests, RestartCount, CpuUsage, Replicas |
| Azure SQL | cpu_percent, deadlock, connection_failed, dtu_consumption_percent |
| Cosmos DB | TotalRequestUnits, NormalizedRUConsumption, TotalRequests |
| Service Bus | ActiveMessages, DeadletteredMessages |
| Storage | Transactions, E2ELatency, Availability |

## Alerting Rules

- Alert on **symptoms**, not causes — "error rate > 1%" over "CPU > 80%"
- Use **dynamic thresholds** for metrics with variable baselines (traffic patterns vary by time of day)
- Route alerts by severity: Critical → PagerDuty/Opsgenie, Warning → Teams/Slack, Informational → dashboard only
- Every alert must have a **runbook** with a clear remediation action — no unactionable alerts
- Use **alert processing rules** for maintenance windows
- Set `evaluationFrequency: PT1M` and `windowSize: PT5M` to avoid flapping on transient spikes

## KQL Queries for Incident Investigation

```kusto
// Error rate for a service in the last hour
requests
| where timestamp > ago(1h)
| summarize
    errors = countif(resultCode >= 500),
    total = count(),
    errorRate = round(100.0 * countif(resultCode >= 500) / count(), 2)
  by bin(timestamp, 5m)
| render timechart

// P50/P95/P99 latency
requests
| where timestamp > ago(1h)
| summarize p50 = percentile(duration, 50), p95 = percentile(duration, 95), p99 = percentile(duration, 99)
  by bin(timestamp, 5m)
| render timechart
```

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Unstructured log strings | Use structured logging with ILogger or equivalent |
| Alert fatigue (too many low-signal alerts) | Remove non-actionable alerts; require every alert to have a runbook |
| No distributed trace correlation | Ensure operationId propagates across all service calls |
| No log retention policy | Set Log Analytics retention; export old data to cool/archive Storage |
| Dashboard-only monitoring (no alerts) | Add metric/log alerts for detection; dashboards are for investigation |
| Classic (non-workspace) Application Insights | Migrate to workspace-based Application Insights |

## Best Practices

- Define SLIs and SLOs — "99.9% of requests succeed within 500 ms" is measurable and alertable
- Build two dashboards per domain: operational (error rate, latency, resource utilisation) and business (orders/min, conversion)
- Use Azure Workbooks for interactive KQL-powered dashboards; use Azure Managed Grafana for Grafana-familiar teams
- Monitor the cost of monitoring — Application Insights ingestion and Log Analytics can become expensive with verbose logging
- Review and prune alerts weekly — remove stale alerts, validate thresholds, add new services
- Use action groups with both email and webhook (PagerDuty/Teams) on all production critical alerts
