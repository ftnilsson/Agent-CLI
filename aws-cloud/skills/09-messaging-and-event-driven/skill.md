# Messaging & Event-Driven Architecture

## Service Selection

| Service | Pattern | Use when |
|---------|---------|----------|
| SQS | Point-to-point queue | Decouple producer/consumer; buffer workloads; async processing |
| SNS + SQS | Fan-out pub/sub | Same event delivered to multiple independent consumers |
| EventBridge | Content-based routing | Event-driven architecture; cross-service and SaaS integration |
| Step Functions | Workflow orchestration | Multi-step processes with branching, error handling, human approval |
| Kinesis Data Streams | Ordered stream processing | High-throughput real-time data; per-shard ordering required |

- Default to SQS for simple async decoupling between two services
- Use EventBridge (not SNS directly) when content-based routing or schema registry is needed
- Use SNS only for fan-out to multiple SQS queues — not for direct Lambda invocation at scale
- Use Step Functions when a workflow has more than two steps or requires retry/error handling per step

## SQS Configuration

```typescript
const dlq = new sqs.Queue(this, 'DLQ', {
  retentionPeriod: Duration.days(14),
});

const queue = new sqs.Queue(this, 'OrderQueue', {
  visibilityTimeout: Duration.seconds(60),  // Set to 6x Lambda timeout
  deadLetterQueue: { maxReceiveCount: 3, queue: dlq },
  encryption: sqs.QueueEncryption.SQS_MANAGED,
});
```

- Always configure a Dead Letter Queue (DLQ) — failed messages must not silently disappear
- Set visibility timeout to at least 6x the consumer's maximum execution time
- Use SQS FIFO queues only when strict ordering or exactly-once processing is required — they have lower throughput limits
- Enable long polling (`receiveMessageWaitTimeSeconds: 20`) to reduce empty receives and cost
- Use batch processing (`batchSize` + `maxBatchingWindow`) for Lambda consumers
- Monitor `ApproximateAgeOfOldestMessage` — a growing value indicates consumer issues

## EventBridge

- Use a custom event bus (not the default) for all application events
- Use a consistent event schema with `source`, `detail-type`, and structured `detail`:

```json
{
  "source": "com.myapp.orders",
  "detail-type": "OrderPlaced",
  "detail": {
    "orderId": "ORD-2024-001",
    "customerId": "CUST-123",
    "total": 149.99,
    "timestamp": "2025-02-14T10:30:00Z"
  }
}
```

- Register all event schemas in the EventBridge Schema Registry
- Use archive and replay to reprocess historical events after bug fixes
- Design events as past-tense facts ("OrderPlaced", "PaymentFailed") not commands ("ProcessOrder")

## Step Functions

- Use Express Workflows for high-volume, short-duration (<5 min) workflows — cheaper than Standard
- Use Standard Workflows for long-running processes or when audit history is required
- Use direct SDK integrations (DynamoDB, SQS, SNS) instead of wrapping simple operations in Lambda
- Add `Retry` and `Catch` blocks at each state — never assume a step will always succeed
- Use `Map` state for parallel processing of arrays

## Idempotency

- Design all message consumers to be idempotent — SQS standard delivers at-least-once
- Use DynamoDB conditional writes to prevent duplicate processing:
  `ConditionExpression: 'attribute_not_exists(orderId)'`
- Use AWS Lambda Powertools idempotency utility for Lambda-based consumers
- Use SQS FIFO with message deduplication IDs for exactly-once delivery at the queue level

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| No DLQ on SQS queues | Always configure a DLQ with `maxReceiveCount: 3–5` |
| Visibility timeout shorter than consumer runtime | Set to 6x the maximum consumer execution time |
| No DLQ monitoring | Alarm on DLQ message count > 0 |
| Large payloads in SQS/SNS/EventBridge (>10 KB) | Use claim-check pattern: store in S3, pass the S3 reference |
| Synchronous chains disguised as microservices | Decouple with queues; synchronous HTTP between every service is a distributed monolith |
| Over-orchestrating simple flows with Step Functions | Simple queue → Lambda is sufficient for basic async processing |

## Best Practices

- Default to async — if the caller does not need an immediate response, use a queue or event
- Keep message payloads small — store large objects in S3 and reference them in the message
- Monitor queue depth and age; set alarms on both for every production queue
- Use AWS Lambda Powertools for batch processing, idempotency, and event parsing utilities
- Alarm on DLQ depth > 0 — messages in a DLQ always require investigation
- Each SNS subscriber gets its own SQS queue — consumer failure must not block other consumers
