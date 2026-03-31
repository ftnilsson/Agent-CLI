# AWS Architecture & Well-Architected

## Well-Architected Pillars

- Evaluate every architecture decision against all six pillars: Operational Excellence, Security, Reliability, Performance Efficiency, Cost Optimisation, Sustainability
- Never optimise a single pillar at the expense of others — architecture is trade-offs
- Run AWS Well-Architected Reviews before launch and after major changes

## Design for Failure

- Deploy stateful services (RDS, ElastiCache) Multi-AZ by default — no exceptions in production
- Place stateless services across at least 2 AZs behind a load balancer
- Implement retry with exponential backoff on every service call
- Add circuit breakers to prevent cascading failures from unhealthy dependencies
- Serve stale cache, partial results, or queue requests rather than returning errors
- Test failure scenarios with AWS Fault Injection Simulator

## Architecture Patterns

| Pattern | Services | Use when |
|---------|----------|----------|
| Monolith | EC2, Elastic Beanstalk, ECS single service | Early stage, small team, unclear domain boundaries |
| Microservices | ECS, EKS, Lambda, API Gateway, SQS | Clear boundaries, independent scaling/deployment |
| Serverless-first | Lambda, API Gateway, DynamoDB, S3, EventBridge | Event-driven, variable traffic, minimal ops |
| Event-driven | EventBridge, SQS, SNS, Step Functions, Kinesis | Decoupled workflows, async, eventual consistency |

- Start with a well-structured monolith — extract services only when boundaries are clear and team structure supports them
- Never start with microservices as the default pattern

## Multi-Account Strategy

```
Management Account (billing, org policies)
├── Security Account (GuardDuty, Security Hub, CloudTrail)
├── Shared Services (CI/CD, container registries, DNS)
├── Dev Account
├── Staging Account
└── Production Account
```

- Isolate each workload in its own account for blast-radius containment
- Apply Service Control Policies (SCPs) to enforce guardrails organisation-wide
- Use AWS IAM Identity Center for all human access — no per-account IAM users
- Use cross-account IAM roles for programmatic access between accounts

## Observability Design

- Emit CloudWatch metrics for every service; add custom metrics for business KPIs
- Write structured JSON logs, centralised in CloudWatch Logs or OpenSearch
- Enable X-Ray for distributed tracing across all services
- Create CloudWatch Alarms for SLO breaches and anomaly detection
- Build operational and business dashboards per service from day one

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Lift-and-shift without rearchitecting | Redesign for managed services — avoid replicating on-premises patterns on EC2 |
| Single-AZ deployment | Multi-AZ is a baseline requirement, not optional |
| Tight synchronous coupling between services | Decouple with SQS, EventBridge, or SNS |
| No disaster recovery plan | Define RTO and RPO; design and test accordingly |
| Over-engineering for early-stage products | Match complexity to actual scale requirements |
| Ignoring data gravity | Co-locate compute and data in the same region |

## Best Practices

- Prefer managed services — let AWS handle patching, scaling, and HA
- Decouple components with queues and events; avoid direct synchronous service-to-service calls
- Automate all infrastructure changes — no manual console changes in production
- Design to handle 10x current load without rearchitecting
- Tag every resource with `Environment`, `Team`, `Service`, and `CostCentre`
- Treat one-way-door decisions (DB engine, primary region, account structure, partition key) with extra scrutiny
- Move fast on two-way-door decisions (instance size, Lambda runtime, cache TTL, feature flags)
- Capture architecture decisions in ADRs — record the why, not just the what
