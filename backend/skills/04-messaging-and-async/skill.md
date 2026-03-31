# Messaging & Async Patterns

## Pattern Selection

| Pattern | How it works | Use when |
|---------|-------------|----------|
| **Work Queue** | One producer → queue → one consumer (competing consumers for scale) | Background jobs: email, image resize, payment processing |
| **Publish/Subscribe** | One publisher → topic → many subscribers (each gets a copy) | Domain events: order placed, user registered |
| **Request/Reply** | Requester sends message + reply address; responder answers on reply queue | Async RPC for long-running operations that need a result |
| **Event Sourcing** | State derived from an append-only event log | Audit trails, temporal queries, complex domain state |

Start with Work Queue or Pub/Sub — they solve 90% of async needs. Event sourcing adds significant complexity; use it only when required.

## Event Design

Publish events (facts), not commands (instructions):

```json
// ✅ Event — describes what happened
{
  "type": "order.placed",
  "data": { "orderId": "ord_abc123", "customerId": "cust_xyz", "total": 149.99 },
  "metadata": { "eventId": "evt_001", "timestamp": "2026-02-14T10:30:00Z", "source": "order-service", "version": 1 }
}

// ❌ Command — couples producer to consumer's implementation
{ "action": "sendOrderConfirmationEmail", "to": "user@example.com", "template": "order-confirm-v2" }
```

Include `eventId`, `timestamp`, `source`, and `version` in every message. These fields enable deduplication, debugging, and schema evolution.

## Reliable Delivery

**At the producer — use the Outbox Pattern:**
Write the event to an `outbox` table in the same database transaction as the business data. A separate process publishes from the outbox. This prevents "database committed but message not sent" on crash or network failure.

**At the broker:**
Use durable queues/topics with persistence. Use acknowledgements — don't remove messages until the consumer confirms processing.

**At the consumer — design for idempotency:**
At-least-once delivery is the norm. The same message will be delivered more than once. Design handlers so processing the same message twice produces the same result:

```
async function processOrderFulfillment({ orderId }) {
  const order = await db.orders.findById(orderId)
  if (order.status === 'fulfilled') return  // already done — safe to re-run
  await fulfillOrder(order)
  await db.orders.update(order.id, { status: 'fulfilled' })
}
```

## Failure Handling

Route failed messages to a Dead-Letter Queue (DLQ) after exhausting retries:

```
Main Queue → Consumer (fails) → Retry Queue (exponential backoff) → Consumer (fails again) → DLQ → Alert
```

Retry strategy: exponential backoff (1s → 5s → 30s → 5min), maximum 3–5 attempts before dead-lettering. Monitor DLQ depth and alert — these represent unprocessed work.

## Message Ordering

Not all messages need ordering. When ordering matters:
- Partition by entity ID — all events for `order_123` go to the same partition
- Use sequence numbers per entity to detect out-of-order delivery
- Accept eventual consistency where possible — it dramatically simplifies the system

Stateless operations (notifications, image processing, report generation) rarely need ordering.

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Publishing event after DB commit without Outbox | Use transactional Outbox pattern |
| Assuming exactly-once delivery | Design for at-least-once via idempotent handlers |
| Distributed 2-phase commit (2PC) | Use sagas or choreography instead |
| Chatty events (`userEmailUpdated`, `userNameUpdated`) | Publish meaningful domain events (`userProfileUpdated`) |
| No DLQ or retry strategy | Configure retries + DLQ from the start |
| No queue depth monitoring | Alert on queue depth thresholds from day one |
| Fat event payloads with all entity data | Send IDs and let consumers fetch; embed data only if it may change |

## Best Practices

- Make every handler idempotent — at-least-once delivery is the norm, not the exception
- Version all message schemas with a `version` field; consumers must handle unknown versions gracefully
- Use correlation IDs threaded through the entire flow (HTTP request → event → downstream event) for end-to-end tracing
- Monitor queue depth — a growing queue means consumers are falling behind
- Keep messages small — send references (IDs), not full payloads, unless the data may change before consumption
- Use a job queue (Sidekiq, BullMQ, Hangfire, Celery) for internal background processing; reserve a message broker for cross-service events
- Test failure paths: broker unavailability, consumer crash, duplicate delivery, and poison messages
