# Storage & Databases

## Database Selection

| Service | Use when | Avoid when |
|---------|----------|------------|
| Aurora PostgreSQL | Transactional workloads, complex queries, relational data | Simple key-value access, extreme write scale |
| RDS | SQL Server, Oracle, or when Aurora is not suitable | New apps where Aurora PostgreSQL fits |
| DynamoDB | Known access patterns, single-digit-ms latency at any scale | Ad-hoc queries, complex joins, many-to-many |
| ElastiCache (Redis) | Session storage, caching, leaderboards, pub/sub | Persistent primary data store |
| OpenSearch | Full-text search, log analytics, dashboards | Primary transactional data |
| Timestream | IoT metrics, time-series telemetry | General-purpose queries |

- Prefer Aurora PostgreSQL over RDS PostgreSQL for new relational workloads — Aurora offers better performance and availability
- Use Aurora Serverless v2 for variable or unpredictable workloads
- Choose DynamoDB only when access patterns are well-defined upfront

## DynamoDB Table Design

- Design for access patterns first — never model entities like a relational database
- Use single-table design to collocate related entities and enable efficient queries
- Use composite sort keys for hierarchical data and range queries
- Add GSIs only when needed — each GSI is a full copy of projected attributes with separate cost
- Use on-demand capacity for unpredictable workloads; switch to provisioned auto-scaling when patterns stabilise
- Enable Point-in-Time Recovery (PITR) on all production tables
- Enable DynamoDB Streams only when downstream consumers require change data capture

## Aurora / RDS Production Checklist

- Enable Multi-AZ on all production instances — automatic failover is required
- Deploy instances in private subnets with no public access
- Restrict security group access to the application tier only
- Enable automated backups with 7–35 day retention
- Enable encryption at rest with a KMS customer-managed key
- Enable Performance Insights for query analysis
- Enable Enhanced Monitoring for OS-level metrics
- Configure read replicas for read-heavy workloads
- Use RDS Proxy for Lambda-to-RDS connections to prevent connection exhaustion

## S3 Configuration

```yaml
MyBucket:
  Type: AWS::S3::Bucket
  Properties:
    BucketEncryption:
      ServerSideEncryptionConfiguration:
        - ServerSideEncryptionByDefault:
            SSEAlgorithm: aws:kms
    PublicAccessBlockConfiguration:
      BlockPublicAcls: true
      BlockPublicPolicy: true
      IgnorePublicAcls: true
      RestrictPublicBuckets: true
    VersioningConfiguration:
      Status: Enabled
    LifecycleConfiguration:
      Rules:
        - Id: TransitionToIA
          Status: Enabled
          Transitions:
            - StorageClass: STANDARD_IA
              TransitionInDays: 30
            - StorageClass: GLACIER
              TransitionInDays: 90
```

- Block all public access at the account level unless explicitly required
- Enable versioning on all buckets containing important or user-generated data
- Set lifecycle rules on every bucket — log and upload buckets grow unbounded without them
- Use S3 Intelligent-Tiering when access patterns are unpredictable
- Use SSE-KMS for sensitive data buckets — it provides an audit trail via CloudTrail

## Caching with ElastiCache

- Use Redis (ElastiCache for Redis) in all cases — choose Memcached only for simple caching with pure multi-threaded access
- Enable Multi-AZ with automatic failover for production Redis clusters
- Always set TTLs — infinite TTLs cause stale data and memory exhaustion
- Use cache-aside (lazy loading) as the default caching strategy
- Monitor cache hit rate; below 80% indicates under-utilisation or a key design problem

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| DynamoDB modelled like a relational DB | Define access patterns first; redesign schema around query needs |
| Lambda + RDS without connection pooling | Use RDS Proxy to manage connection limits |
| S3 buckets without lifecycle rules | Add lifecycle transitions to Standard-IA and Glacier |
| DynamoDB provisioned mode for sporadic tables | Switch to on-demand mode |
| No read replicas for read-heavy RDS | Add read replicas; route reads explicitly |
| Cache without invalidation strategy | Define TTLs and invalidation logic before deployment |

## Best Practices

- Assign one database per service in microservices architectures — never share a database across services
- Enable encryption at rest on every data store — S3, RDS, DynamoDB, ElastiCache, EBS
- Enable automated backups and PITR on all production data stores
- Use Aurora Global Database for cross-region DR and low-latency global reads
- Monitor storage growth with CloudWatch and set billing alarms for unexpected increases
- Use gp3 EBS volumes instead of gp2 — 20% cheaper with better baseline performance
