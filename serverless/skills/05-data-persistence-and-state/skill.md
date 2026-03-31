# Data Persistence & State

## Stateless Constraint

- Never store application state in function memory between invocations — the instance may be destroyed or a different instance may handle the next request
- Never write to the local file system for data that must outlive a single invocation; local storage is ephemeral and not shared across instances
- Use module-scope variables only for reusable infrastructure: SDK clients, connection pools, and cached configuration — not application state

## Database Selection

- Use serverless-native key-value or document stores (DynamoDB, Cosmos DB) for high-throughput access patterns, flexible schemas, and per-request pricing
- Use serverless-compatible relational databases (Aurora Serverless, Neon, PlanetScale, Azure SQL Serverless) when complex queries, joins, or transactions are required
- Use an HTTP-based database proxy or connection pooler (RDS Proxy, PgBouncer, Prisma Data Proxy) whenever connecting to a traditional relational database
- Use object storage (S3, Blob Storage) for large files — it is not a database and does not support queries or transactions

## Connection Pooling

- Create database connections in module scope so they are reused across warm invocations
- Set `max: 1` on connection pools inside functions — each instance should hold one connection, not the default pool size of 10–20
- Use a connection proxy (RDS Proxy, PgBouncer) for traditional relational databases to prevent connection exhaustion when concurrency scales
- Prefer HTTP-based database clients (Neon serverless driver, PlanetScale fetch driver) to eliminate persistent connection management entirely

```typescript
// Module scope — one connection per function instance, reused across warm invocations
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  idleTimeoutMillis: 120_000,
});
```

## Access Pattern Design

- Design keys and indexes around access patterns, not entity relationships
- Use composite keys (partition key + sort key) to support multiple query patterns from a single table
- Avoid full-table scans; every query must target a specific partition key
- Use `begins_with`, `between`, and sort key range queries for efficient list operations

## Caching

- Cache frequently read, rarely changing data in module scope (in-memory) for near-zero latency within a warm instance
- Use a shared external cache (Redis, Elasticache, Azure Cache) for data that must be consistent across all function instances
- Always set a TTL on every cache entry — cache entries without expiry become permanently stale
- Use event-driven cache invalidation when data freshness matters; use TTL-based invalidation when some staleness is acceptable
- Use API gateway or CDN caching for GET responses that do not change per-user

## Workflow State

- Use a managed orchestrator (Step Functions, Durable Functions) to persist state across multi-step workflows
- Update a status field on the entity for simple 2–3 step flows with no compensation logic
- Use an event chain (each step publishes a result that triggers the next) for loosely coupled choreography
- Never persist workflow state in function memory — the instance may be recycled between steps

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Opening a new database connection on every invocation | Move connection initialisation to module scope |
| Default pool size (10–20) in function connection pools | Set `max: 1` per function instance; use a proxy for pooling |
| Writing persistent data to `/tmp` or local file system | Use object storage or a database |
| Full-table scan queries without a partition key | Design indexes around access patterns; always provide a partition key |
| Cache entries with no TTL | Always set a TTL; use event-driven invalidation when needed |
| Storing workflow state in memory between async steps | Use Step Functions, Durable Functions, or a database status field |

## Best Practices

- Prefer serverless-native databases (DynamoDB, Cosmos DB) to eliminate connection management entirely
- Use a connection proxy for all traditional relational databases
- Always initialise connections in module scope with `max: 1`
- Design all database access patterns before choosing key structures
- Set TTLs on all cache entries; alert on cache miss rates that indicate ineffective caching
- Design for eventual consistency in event-driven data flows; do not require read-after-write guarantees across services
- Use object storage for any payload larger than a few KB that does not require querying
- Test connection behaviour under high concurrency before production deployment
