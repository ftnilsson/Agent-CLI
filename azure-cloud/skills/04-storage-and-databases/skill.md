# Storage & Databases

## Database Selection

| Service | Type | Use when |
|---------|------|---------|
| **Azure SQL Database** | Relational (managed) | Transactional workloads, complex queries, .NET ecosystem |
| **Azure Database for PostgreSQL Flexible Server** | Relational (managed) | PostgreSQL workloads, PostGIS, JSONB, open-source stack |
| **Cosmos DB** | Multi-model NoSQL | Global distribution, single-digit-ms latency, event-driven, high write scale |
| **Azure Cache for Redis** | In-memory | Session storage, caching, leaderboards, pub/sub |
| **Azure AI Search** | Search | Full-text search, faceted navigation, AI-enriched search |
| **Azure Table Storage** | Key-value | Simple key-value at very low cost — not for complex queries |

- Use one database per service in microservices architectures — never share a database across services
- Use managed identities for all database authentication — no connection strings with passwords

## Cosmos DB: Partition Key Design

- Choose a partition key with **high cardinality** — many distinct values (e.g., `userId`, `tenantId`)
- Choose a partition key that distributes **requests and storage evenly** across logical partitions
- Include the partition key in **every query** — cross-partition queries are expensive
- Never use low-cardinality keys like `status`, `country`, or `type` as partition keys
- Use serverless tier for dev/test and low-traffic workloads; use autoscale provisioned for production
- Enable **continuous backups** with point-in-time restore (PITR) on production containers
- Use the **change feed** for event-driven patterns: materialise views, trigger functions, replicate data
- Set custom **indexing policies** — exclude paths never queried to reduce RU cost and write latency

## Azure SQL Database

| Tier | Use case |
|------|----------|
| General Purpose (vCore) | Most production workloads |
| Business Critical (vCore) | Low-latency, high IOPS, in-memory OLTP, read replicas |
| Hyperscale | Large databases (up to 100 TB), fast backups, named replicas |
| Serverless | Variable/intermittent workloads — auto-pauses when idle |

- Enable **zone redundancy** on General Purpose and Business Critical tiers for production
- Enable **Entra ID authentication** — disable SQL authentication only mode in production
- Use **Private Endpoints** — no public access on production databases
- Enable **Advanced Threat Protection** and audit logging to Log Analytics
- Configure automated backups with appropriate PITR retention (7–35 days)
- Use **Elastic Pools** for multiple databases with variable usage patterns

## Azure Blob Storage — Security Baseline

```bicep
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  sku: { name: 'Standard_ZRS' }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false
    networkAcls: { defaultAction: 'Deny', bypass: 'AzureServices' }
  }
}
```

- Use `Standard_ZRS` for production; `Standard_GRS` or `Standard_GZRS` for DR-critical data
- Disable shared key access (`allowSharedKeyAccess: false`) — use Entra ID RBAC (`Storage Blob Data Contributor`)
- Set `allowBlobPublicAccess: false` — never allow anonymous public blob access
- Configure **lifecycle management policies** to transition blobs: Hot → Cool (30 d) → Cold (90 d) → Archive (180 d)
- Enable **soft delete** (14+ days) and **versioning** on containers with important data
- Use **immutability policies** for compliance (legal hold, time-based retention)

## Azure Cache for Redis

- Use **Premium tier** for production — supports zone redundancy, clustering, and data persistence
- Use **Enterprise tier** for Redis modules (RediSearch, RedisJSON, RedisTimeSeries)
- Use Private Endpoints — never expose Redis to the public internet
- Enable **data persistence** (RDB/AOF) on Premium if cache warmup time is a concern
- Set a **TTL on every key** — unlimited TTLs cause memory exhaustion and stale data
- Use cache-aside (lazy loading) as the default caching pattern

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Cosmos DB used for relational queries with JOINs | Use Azure SQL or PostgreSQL instead |
| Azure Functions + SQL without connection pooling | Use short-lived connections; leverage SQL's built-in pooling |
| Storage Account without lifecycle rules | Add lifecycle policy to auto-tier aging blobs |
| Bad Cosmos DB partition key (low cardinality) | Redesign partition key before data grows; choose high-cardinality field |
| Public endpoints on databases in production | Enable Private Endpoints; disable public network access |
| Redis with no TTLs | Set TTL on every key at write time |

## Best Practices

- Enable Private Endpoints on every data store in production: SQL, Storage, Cosmos DB, Redis, Key Vault
- Back up everything — enable automated backups, PITR, and geo-redundant copies for critical data
- Use managed identities for all storage and database access
- Monitor storage and Log Analytics ingestion costs — data grows silently without lifecycle rules
- Set cost alerts on Cosmos DB RU consumption and SQL DTU/vCore utilisation
- Use Azure Defender for SQL and Defender for Storage on all production data stores
