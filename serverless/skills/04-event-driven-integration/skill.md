# Event-Driven Integration

## Trigger Selection

- Use synchronous (HTTP) triggers only when the caller needs an immediate response
- Use queue/topic (async) triggers for all work that can be processed independently of the caller
- Use stream triggers (Kinesis, Event Hub) when per-entity ordering or replay capability is required
- Use schedule triggers for polling, cleanup, and periodic aggregation jobs
- Use resource event triggers (blob uploaded, DB change) to react to infrastructure events

## Event Schema Design

- Name events in past tense: `OrderPlaced`, `PaymentFailed`, `InventoryReserved`
- Use the CloudEvents specification for the event envelope: `id`, `source`, `type`, `specversion`, `time`, `data`
- Keep event payloads small — include entity IDs and essential fields only; let consumers query full details if needed
- Never put large binary data or full document bodies in events; use the claim-check pattern instead
- Version event types from day one: `com.myapp.order.placed.v1`

## Event Routing

- Use a queue for point-to-point delivery (one producer, one consumer)
- Use a topic/pub-sub for fan-out (one producer, multiple independent consumers)
- Apply subscription filters at the source — do not invoke a function only to discard the event inside it
- Use a centralised event bus with routing rules for complex topologies with many producers and consumers

## Schema Evolution

- Add optional fields freely — existing consumers ignore unknown fields
- Never remove, rename, or change the type of an existing field
- For breaking changes: publish both old and new event types simultaneously during a transition window; retire the old type only after all consumers have migrated
- Store shared event schemas in a versioned library accessible to both producer and consumer codebases

```typescript
// Dual-publish during a breaking schema migration
async function publishOrderPlaced(order: Order): Promise<void> {
  await eventBus.publish({ type: 'com.myapp.order.placed.v1', data: { orderId: order.id, total: order.total } });
  await eventBus.publish({ type: 'com.myapp.order.placed.v2', data: { orderId: order.id, amount: { value: order.total, currency: order.currency } } });
}
```

## Dead-Letter Queues

- Configure a DLQ on every async event source without exception
- Set max retry count: 3–5 for queues, 2–3 for event subscriptions
- Alert immediately when any message lands in a DLQ — it indicates data loss or processing failure
- Retain DLQ messages longer than the source queue (e.g. 14 days vs 7 days)
- Build and test a replay mechanism to reprocess DLQ messages after the underlying issue is fixed

## Event Ordering

- Design for unordered processing with idempotency by default
- Use message groups or session IDs to guarantee per-entity ordering when state machine transitions require it
- Never rely on ordering across different partitions or sessions

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| No DLQ on async triggers | Configure a DLQ on every queue and topic subscription |
| Events containing full entity payloads (entire customer records, large documents) | Include IDs only; consumers query details on demand |
| Circular event flows (A triggers B triggers A) | Break cycles with idempotency checks or event metadata guards |
| Filtering events inside functions after invocation | Apply subscription filters at the event source |
| Breaking schema change deployed to all consumers simultaneously | Dual-publish old and new versions during migration |
| Relying on cross-partition ordering | Use per-entity keys (partition/session) for ordering guarantees |

## Best Practices

- Use CloudEvents format for all event envelopes — standardised, tooling-supported, cloud-agnostic
- Filter subscriptions at the source to avoid invoking functions for events they will discard
- Configure a DLQ on every async trigger, alert on any DLQ message count above zero
- Version all event schemas from day one
- Keep event payloads small; use claim-check for data larger than ~64 KB
- Propagate correlation IDs and actor identity through all event metadata
- Maintain an event flow diagram showing producers, topics/queues, and consumers
- Design every consumer for idempotency — at-least-once delivery is the default
