# Messaging & Event-Driven Architecture

## Service Selection

| Service | Pattern | Use when |
|---------|---------|---------|
| **Service Bus Queues** | Point-to-point | Transactional messaging, decouple producer/consumer, DLQ, FIFO |
| **Service Bus Topics** | Pub/sub fan-out | Multi-subscriber distribution with SQL filter rules |
| **Event Grid** | Push routing | React to Azure resource events or application domain events |
| **Event Hubs** | Stream processing | High-throughput telemetry, IoT, clickstream, log aggregation |
| **Storage Queues** | Simple queue | Very high volume, basic queueing, lowest cost — no DLQ or ordering |

- Default to **Service Bus** for transactional inter-service messaging
- Use **Event Grid** for reactive patterns: "something happened, notify subscribers"
- Use **Event Hubs** for telemetry ingestion and stream processing — not for transactional patterns
- Never use Event Hubs as a replacement for Service Bus in request/response or order-critical flows

## Azure Service Bus: Production Configuration

```bicep
resource serviceBusNamespace 'Microsoft.ServiceBus/namespaces@2022-10-01-preview' = {
  name: 'sb-myapp-prod'
  sku: { name: 'Premium', tier: 'Premium', capacity: 1 }
  properties: {
    minimumTlsVersion: '1.2'
    publicNetworkAccess: 'Disabled'   // Private Endpoint only
  }
}

resource ordersQueue 'Microsoft.ServiceBus/namespaces/queues@2022-10-01-preview' = {
  parent: serviceBusNamespace
  name: 'orders'
  properties: {
    maxDeliveryCount: 5
    lockDuration: 'PT1M'                       // Must exceed consumer processing time
    defaultMessageTimeToLive: 'P7D'
    deadLetteringOnMessageExpiration: true
  }
}
```

- Use **Premium tier** for production — required for VNet integration, Private Endpoints, and large messages (up to 100 MB)
- Set `lockDuration` greater than consumer processing time — if lock expires, the message is redelivered and processed twice
- Set `maxDeliveryCount: 5` and configure **DLQ monitoring** — alert on any DLQ message count > 0
- Use **sessions** (`requiresSession: true`) for FIFO ordering per logical group (e.g., per orderId)
- Use **managed identities** for authentication (`Azure Service Bus Data Sender` / `Data Receiver` roles)
- Use **SQL filter rules** on topic subscriptions to route messages to the right consumers

## Event Grid: Key Rules

- Use **system topics** for Azure resource events (blob created, resource modified)
- Use **custom topics** or **Event Grid Namespaces** for application-to-application domain events
- Apply **event filters** (`includedEventTypes`, `subjectBeginsWith`) to route only relevant events
- Enable **dead-lettering** to a Storage Account for failed delivery attempts
- Use **CloudEvents schema** for interoperability

## Event Hubs: Configuration Rules

- Choose partition count based on required parallelism — each partition supports 1 MB/s ingress / 2 MB/s egress
- Use **consumer groups** to allow multiple independent consumers to read the same stream independently
- Use **Event Hubs Capture** to automatically archive events to Blob Storage or ADLS Gen2
- Use **Dedicated tier** for compliance scenarios requiring data isolation

## Durable Functions: Workflow Orchestration

Use Durable Functions for multi-step workflows with retry, compensation, and human interaction:

- **Function chaining** — sequential steps with built-in error handling and replay
- **Fan-out/fan-in** — parallel activity execution with `Task.WhenAll`
- **Human interaction** — wait for external events (approvals, callbacks) with `context.WaitForExternalEvent`
- **Monitor** — polling with configurable intervals and expiry
- Use Durable Functions only when a workflow needs state, retries, or coordination — simple Function + Service Bus is sufficient for basic async processing

## Idempotency

- Design all message consumers to be **idempotent** — Service Bus delivers at-least-once
- Use an **idempotency store** (Redis, Cosmos DB, Azure SQL) keyed on message ID or business key with TTL
- Enable **duplicate detection** on Service Bus queues (`requiresDuplicateDetection: true`) for built-in deduplication within the detection window
- Use sessions for **exactly-once processing** per session ID

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Synchronous HTTP chains between microservices | Replace with Service Bus or Event Grid for decoupling |
| No DLQ monitoring | Add Azure Monitor alert on DLQ message count > 0 |
| Lock duration shorter than consumer processing time | Set `lockDuration` > max consumer execution time |
| Event Hubs used for transactional messaging | Use Service Bus for transactions, ordering, and DLQ |
| Consumer without idempotency handling | Add idempotency check keyed on messageId |
| Durable Functions for simple async tasks | Use Azure Functions + Service Bus trigger instead |

## Best Practices

- Default to async — if the caller does not need an immediate response, use a queue or event
- Design **events** ("OrderPlaced"), not commands ("ProcessOrder") — events are more flexible for future consumers
- Keep message payloads small — store large data in Blob Storage, pass the blob URI in the message (claim-check pattern)
- Monitor **queue depth and message age** — growing queues or aging messages indicate consumer problems
- Use Private Endpoints on Service Bus and Event Hubs namespaces in production
- Emit domain events from aggregates for downstream services to consume independently
