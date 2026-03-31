# Observability & Debugging

## Structured Logging

- Emit JSON logs on every invocation — no plain-text string concatenation in production
- Include in every log entry: `level`, `message`, `timestamp`, `service`, `functionName`, `correlationId`, and relevant entity IDs (`orderId`, `tenantId`)
- Log function entry and exit with a summary of inputs and result status — not the full payload
- Mark cold-start invocations explicitly in the first log entry of each new instance
- Never log secrets, tokens, `Authorization` headers, or personally identifiable information
- Set log level via environment variable: `DEBUG` in development, `INFO` in production
- Apply sampling (1–10%) for `DEBUG` logs on high-throughput functions to control log volume and cost

```json
{
  "level": "ERROR",
  "message": "Failed to process order",
  "timestamp": "2026-03-29T10:30:00.000Z",
  "service": "order-processor",
  "correlationId": "abc-123",
  "coldStart": false,
  "orderId": "ORD-001",
  "error": { "type": "PaymentDeclinedError", "message": "Insufficient funds" },
  "durationMs": 245
}
```

## Distributed Tracing

- Propagate trace context (`traceId`, `spanId`, `correlationId`) through all event message attributes when publishing to queues or topics
- Extract and continue the trace in every consumer function — create a child span under the parent trace
- Use OpenTelemetry for vendor-neutral instrumentation; it works across all cloud providers and observability backends
- Ensure every log entry includes the current `traceId` and `correlationId` so logs and traces can be correlated

## Metrics

- Monitor platform-provided metrics for every function: invocation count, error count, P99 duration, throttle count, concurrent executions
- Alert on: error rate above 1%, P99 duration above 80% of the configured timeout, any throttle count above zero, any DLQ message count above zero
- Track cold start rate separately; investigate when it exceeds 10% of invocations on synchronous user-facing functions
- Emit custom business metrics (order count, payment value, items per order) with relevant dimensions (region, payment method)
- Alert on stream consumer iterator age exceeding 60 seconds — it indicates the consumer is falling behind

## Cold Start Monitoring

- Detect cold starts with a module-scope boolean flag set to `false` after the first invocation
- Log cold start duration and memory allocation on each cold-start invocation
- Track cold start rate, P50/P95 duration, and which functions have the highest rates
- Correlate cold start spikes with traffic patterns to distinguish traffic-driven scaling from configuration issues

## Debugging Workflow

- Start with the alerting metric to identify which function and time window is affected
- Filter logs by function name, time window, and `ERROR` level to find the first failing log entry
- Extract the `correlationId` from that entry and trace the full request across all downstream functions and services
- Check distributed traces to identify where in the call chain the failure originated
- Investigate downstream dependencies: database latency, external API errors, throttling
- Verify the fix is effective by monitoring error rate and latency in real time after deployment

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| `console.log` with string interpolation in production | Use a structured JSON logger with consistent fields |
| No correlation ID flowing through HTTP → queue → function chain | Generate a correlation ID at the entry point and propagate it through all event attributes |
| Logging full request and response bodies | Log a summary with entity IDs only; redact PII and credential fields |
| Debug-level logging always enabled in production | Control log level via environment variable; apply sampling for verbose logs |
| Ignoring log ingestion cost on high-throughput functions | Apply debug log sampling; audit log volume regularly |
| No DLQ alert | Alert immediately on any DLQ message count above zero |

## Best Practices

- Use structured JSON logging from the first line of code — retrofitting it is costly
- Use OpenTelemetry for distributed tracing across all functions and services
- Propagate `correlationId` and trace context through every queue message and event
- Alert on DLQ messages immediately — they indicate data loss or stuck processing
- Monitor cold start rate continuously; target below 5% for synchronous user-facing functions
- Include business entity IDs (`orderId`, `customerId`, `tenantId`) in every log entry
- Apply debug log sampling on high-throughput functions to control cost
- Build a debugging runbook: alert → logs → trace → downstream check → fix → verify
