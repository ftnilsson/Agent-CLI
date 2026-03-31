# Compute & Containers

## Compute Model Selection

| Model | Use when | Avoid when |
|-------|----------|------------|
| Lambda | Event-driven, tasks under 15 min, variable traffic | Long-running jobs, persistent connections, GPU |
| ECS + Fargate | Containerised services, no server management needed | GPU workloads, very high throughput at cost scale |
| ECS on EC2 | GPU workloads, high throughput, cost-sensitive at scale | Teams without capacity to manage instances |
| EKS | Kubernetes-native teams, existing K8s tooling | Teams without Kubernetes expertise |
| EC2 | Full OS control, specialised hardware, legacy apps | Any workload that fits a higher-level abstraction |

- Default to Lambda for event-driven and short-lived tasks
- Default to ECS + Fargate for containerised services when Kubernetes is not required
- Choose EKS only when Kubernetes expertise and tooling already exist in the team

## Lambda Configuration

```yaml
MyFunction:
  Type: AWS::Serverless::Function
  Properties:
    Runtime: nodejs20.x
    Architectures: [arm64]          # Use Graviton for ~20% cost saving
    MemorySize: 1024                 # Profile with Lambda Power Tuning
    Timeout: 30                      # Set realistic timeout, not max 900
    ReservedConcurrentExecutions: 100
    Policies:
      - DynamoDBCrudPolicy:
          TableName: !Ref MyTable
```

- Profile memory with AWS Lambda Power Tuning — never guess at memory allocation
- Set `Architectures: [arm64]` for all new functions; most runtimes support it natively
- Set realistic timeouts — never default to 900 seconds
- Use `ReservedConcurrentExecutions` to protect downstream services from Lambda fan-out
- Use Provisioned Concurrency only for latency-sensitive functions with known traffic patterns
- Keep deployment packages small — use Lambda Layers for shared dependencies
- Store all state externally (DynamoDB, S3, ElastiCache) — Lambda is stateless

## ECS + Fargate Configuration

- Use `awsvpc` network mode for all Fargate tasks — each task gets its own ENI and security group
- Never use the `latest` container image tag — pin to a specific digest or semantic version
- Configure health checks in both the task definition and the ALB target group
- Enable ECS Service Connect or AWS Cloud Map for service-to-service discovery
- Use Fargate Spot capacity providers for fault-tolerant workloads to cut costs 40–70%
- Set minimum 2 tasks across 2 AZs for every production service

## Auto-Scaling

- Scale ECS services on Application Auto Scaling using target tracking
- Set CPU target at 70% for most services — adjust based on observed behaviour
- Set scale-out cooldown shorter than scale-in (e.g., 60s out / 300s in) to handle spikes without flapping
- Scale on the metric closest to the user — request count or latency, not just CPU
- Use Lambda reserved concurrency to cap scaling when needed, not just for protection

## Graviton (ARM) Adoption

- Use `arm64` for all new Lambda functions
- Build multi-arch container images and set `ARM64` in Fargate task definitions
- Use `m7g`, `c7g`, `r7g` EC2 families instead of `m7i`, `c7i`, `r7i` — up to 40% better price-performance
- Validate workload compatibility before migrating — Node.js, Python, Java, and Go work without changes

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Running everything on EC2 | Evaluate Fargate or Lambda to eliminate instance management |
| Over-provisioned Lambda memory | Profile with AWS Lambda Power Tuning |
| No health checks on ECS tasks | Configure health checks on task definition and ALB target group |
| `latest` container image tag | Pin to image digest or semantic version |
| Lambda with `AdministratorAccess` role | Scope IAM policies to exact resources and actions needed |
| Single monolithic container | Separate processes into containers for independent scaling |

## Best Practices

- Use infrastructure as code for all compute configuration — no manual console changes
- Tag all resources with `Service`, `Team`, `Environment`, and `CostCentre`
- Use Spot Instances for CI/CD, batch processing, and dev/test — 60–90% cost savings
- Use distroless or `alpine`-based base images — smaller images pull faster and scale faster
- Enable ECR image scanning on push for all repositories
- Use ECR lifecycle policies to remove untagged and old images automatically
- One IAM role per Lambda function or ECS task — never share roles across services
