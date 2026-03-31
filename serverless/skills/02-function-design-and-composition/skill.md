# Function Design & Composition

## Handler Structure

- Initialise SDK clients, database connections, and configuration in module scope — this code runs once per cold start and is reused across warm invocations
- Keep the handler function itself to glue only: parse input, call business logic, return output or publish events
- Extract all domain validation, business calculations, database operations, and external API calls into separate service modules
- Target handler files under 50 lines; if the handler is longer, extract logic into services

```typescript
// Module scope — runs once per cold start
const db = new DynamoDBClient({});
const orderService = new OrderService(db);

// Handler — runs per invocation
export async function handler(event: SQSEvent): Promise<void> {
  for (const record of event.Records) {
    const input = validateOrderInput(JSON.parse(record.body));
    await orderService.processOrder(input);
  }
}
```

## Single Responsibility

- Assign each function exactly one trigger type and one job
- Never multiplex unrelated business operations inside one handler based on a flag or field in the payload
- Split functions when they have different scaling, timeout, or permission requirements

## Idempotency

- Design every async handler to be safe when executed more than once — at-least-once delivery is guaranteed on all platforms
- Prefer natural idempotency: upserts, conditional writes, and SET operations rather than INSERT or INCREMENT
- Use an idempotency store (keyed on event ID with a TTL) when natural idempotency is not achievable
- Use optimistic concurrency (version fields + conditional writes) for state machine transitions

## Batch Error Handling

- Report partial batch failures instead of failing the entire batch when one record errors
- Classify errors as retryable (network timeouts, throttling) or permanent (validation failures, bad data)
- Return retryable records to the queue via batch item failure reporting; log and discard permanent failures
- Never silently swallow exceptions — unhandled errors that acknowledge a message cause silent data loss

## Function Composition

- Connect sequential steps through queues, not direct synchronous SDK invocations
- Publish result events after each step so downstream consumers can react independently
- Use an orchestrator (Step Functions, Durable Functions) for workflows with more than 3 ordered steps or complex error compensation
- Never pass large payloads between functions — store in object storage and pass the reference (claim-check pattern)

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Creating SDK clients inside the handler on every invocation | Move all client initialisation to module scope |
| No input validation on event payloads | Validate and parse all inputs at the handler boundary |
| Catching all errors silently with an empty catch block | Classify errors and either retry or log-and-discard explicitly |
| 500-line handler with inline database queries and business logic | Extract into service and repository layers |
| INSERT operations in event handlers | Use upserts or conditional writes to ensure idempotency |
| Direct synchronous function-to-function SDK calls | Use queues or events for cross-function communication |

## Best Practices

- Place all SDK client and connection initialisation in module scope to benefit from warm invocation reuse
- Handle one event type per function; use separate functions for separate triggers
- Always implement idempotency using natural operations first, idempotency store second
- Use partial batch failure reporting on queue and stream triggers
- Keep handler files under 50 lines; business logic lives in `services/`, `validators/`, `repositories/`
- Validate all event payloads at the handler boundary before passing to business logic
- Distinguish retryable from permanent errors and respond accordingly
- Publish structured result events after completing work rather than calling the next function directly
