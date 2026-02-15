# Messaging & Async Patterns

## Description

Design and implement asynchronous communication between services and components using message queues, event buses, and background job systems. This skill covers the universal async patterns — publish/subscribe, work queues, event-driven architecture, and background processing — that apply regardless of whether you use RabbitMQ, Kafka, Azure Service Bus, AWS SQS, or any other messaging system.

## When To Use

- An operation takes too long for a synchronous HTTP response (email, PDF generation, video processing)
- Two or more services need to react to the same event without coupling
- You need reliable delivery — the work must happen even if a service is temporarily down
- Designing a microservices architecture and deciding how services communicate
- Implementing retry logic, dead-letter queues, or exactly-once processing
- Decoupling a monolith by replacing direct database reads between modules with events

## Prerequisites

- Understanding of client-server architecture and HTTP-based APIs
- Familiarity with the concept of eventual consistency
- Basic understanding of distributed systems trade-offs (CAP theorem at a high level)

## Instructions

### 1. Understand the Core Patterns

| Pattern | How it works | Use when |
|---------|-------------|----------|
| **Point-to-Point (Work Queue)** | One producer → queue → one consumer (competing consumers for scale) | Background jobs: send email, resize image, process payment |
| **Publish/Subscribe** | One publisher → topic → many subscribers (each gets a copy) | Events: order placed, user registered, inventory changed |
| **Request/Reply** | Requester sends message + reply address → responder answers on the reply queue | Async RPC: long-running operations that need a result |
| **Event Sourcing** | State is derived from an append-only log of events | Audit trails, temporal queries, complex domain state |

**Start with Work Queue or Pub/Sub.** They solve 90% of async needs. Event sourcing is powerful but adds significant complexity.

### 2. Design Events (Not Commands)

Events describe **what happened**. Commands describe **what to do**. Prefer events for inter-service communication:

```json
// ✅ Event — describes a fact
{
  "type": "order.placed",
  "data": {
    "orderId": "ord_abc123",
    "customerId": "cust_xyz",
    "total": 149.99,
    "items": [...]
  },
  "metadata": {
    "eventId": "evt_001",
    "timestamp": "2026-02-14T10:30:00Z",
    "source": "order-service",
    "version": 1
  }
}

// ❌ Command — couples producer to consumer's implementation
{
  "action": "sendOrderConfirmationEmail",
  "to": "user@example.com",
  "template": "order-confirm-v2"
}
```

**Why events:**
- The producer doesn't need to know who's listening or what they do with it
- New subscribers can be added without changing the producer
- Events are facts — they can be replayed and reprocessed

### 3. Guarantee Reliable Delivery

Messages can be lost at multiple points. Handle each:

**At the producer:**
- **Use the Outbox Pattern** for transactional consistency: write the event to an `outbox` table in the same database transaction as the business data, then a separate process publishes from the outbox.
- This prevents the "database committed but message not sent" problem.

**At the broker:**
- Ensure messages are **persisted** (durable queues/topics)
- Use **acknowledgements** — don't remove from queue until consumer confirms processing

**At the consumer:**
- **Process idempotently.** Messages may be delivered more than once (at-least-once delivery). Design handlers so that processing the same message twice produces the same result.
- Use a `processed_events` table or check natural idempotency keys.

### 4. Handle Failures with Dead-Letter Queues

When processing fails after retries, don't lose the message:

```
Main Queue → Consumer (fails) → Retry Queue (with backoff) → Consumer (fails again)
                                                              ↓
                                                        Dead-Letter Queue
                                                              ↓
                                                    Alert + Manual review
```

**Retry strategy:**
- **Exponential backoff:** 1s → 5s → 30s → 5min
- **Maximum retries:** 3–5 attempts before dead-lettering
- **Separate retry queues** with TTL for delayed reprocessing
- **Dead-letter queue monitoring** with alerting — these represent unprocessed work

### 5. Design for Ordering (When It Matters)

Not all messages need ordering. When they do:

- **Partition by entity ID.** All events for `order_123` go to the same partition/queue. Events for different orders can be parallel.
- **Use sequence numbers** per entity to detect and handle out-of-order delivery.
- **Accept eventual consistency** where possible — it dramatically simplifies the system.

**When ordering doesn't matter:** Stateless operations like sending notifications, generating reports, or processing images independently.

### 6. Implement Background Jobs

Not every async operation needs a message broker. For internal task scheduling:

- **Transactional outbox** for critical work (payments, emails)
- **Job queue** (Sidekiq, BullMQ, Hangfire, Celery) for internal background processing
- **Scheduled/cron jobs** for periodic tasks (cleanup, reports, sync)

Design job handlers as **idempotent, stateless functions** with clear inputs:

```
// Pseudocode
async function processOrderFulfillment(jobData: { orderId: string }) {
  const order = await db.orders.findById(jobData.orderId)
  if (order.status === 'fulfilled') return  // idempotent: already done
  
  await fulfillOrder(order)
  await db.orders.update(order.id, { status: 'fulfilled' })
}
```

## Best Practices

- **Make every handler idempotent.** At-least-once delivery is the norm. Design for it.
- **Include metadata in every message.** Event ID, timestamp, source service, and schema version enable debugging, deduplication, and evolution.
- **Version your message schemas.** Add a `version` field. Consumers should handle unknown versions gracefully (skip or dead-letter, never crash).
- **Monitor queue depth.** A growing queue means consumers can't keep up. Alert on depth thresholds.
- **Keep messages small.** Send references (IDs), not full payloads. Let consumers fetch what they need. Exception: if the data might change between event and consumption, include it.
- **Use correlation IDs.** Thread a single ID through the entire flow (HTTP request → event → downstream event) for end-to-end tracing.
- **Test failure paths.** Simulate broker unavailability, consumer crashes, duplicate delivery, and poison messages. These will happen in production.

## Common Pitfalls

- **Fire-and-forget without outbox.** Publishing an event after a database commit, without a transactional outbox, means lost events on process crash or network failure.
- **Assuming exactly-once delivery.** Most message systems provide at-least-once or at-most-once. Exactly-once is typically an application-level concern (via idempotency).
- **Distributed transactions (2PC).** Two-phase commit across services and message brokers is fragile, slow, and operationally painful. Use sagas or choreography instead.
- **Chatty events.** Publishing an event for every field change (`userEmailUpdated`, `userNameUpdated`, `userPhoneUpdated`) creates noise. Publish meaningful domain events (`userProfileUpdated`).
- **Invisible backlogs.** Without queue depth monitoring, you won't know processing is falling behind until users complain. Instrument from day one.
- **Tight coupling via event payloads.** If consumer B needs a field added to producer A's event, you've coupled them. Consumers should fetch additional data they need from the source.

## Reference

- [Enterprise Integration Patterns](https://www.enterpriseintegrationpatterns.com/)
- [CloudEvents Specification](https://cloudevents.io/)
- [Martin Fowler — Event-Driven Architecture](https://martinfowler.com/articles/201701-event-driven.html)
- [Transactional Outbox Pattern](https://microservices.io/patterns/data/transactional-outbox.html)
- [Saga Pattern — Microservices.io](https://microservices.io/patterns/data/saga.html)
