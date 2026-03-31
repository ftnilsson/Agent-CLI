# Cost Optimisation

## Pricing Model Selection

| Model | Discount | Use when |
|-------|----------|----------|
| On-Demand | 0% | New projects, variable workloads, dev/test |
| Compute Savings Plans | Up to 66% | Steady-state EC2, Fargate, Lambda — most flexible |
| EC2 Instance Savings Plans | Up to 72% | Committed to specific instance family and region |
| Reserved Instances | Up to 72% | Known instance type and region — use Savings Plans instead where possible |
| Spot / Fargate Spot | Up to 90% | Fault-tolerant: batch, CI/CD, dev/test, background processing |

- Purchase Savings Plans before Reserved Instances — Compute Savings Plans cover EC2, Fargate, and Lambda with no instance-family commitment
- Wait 3–6 months before committing to Savings Plans — understand your steady-state baseline first
- Use Spot Instances or Fargate Spot for all fault-tolerant workloads — CI/CD, batch jobs, dev/test

## Right-Sizing

- Run AWS Compute Optimizer on all accounts — act on its recommendations quarterly
- Investigate any EC2 or RDS instance with average CPU below 20% for downsizing or termination
- Profile Lambda memory with AWS Lambda Power Tuning before setting production memory allocation
- Use `arm64` (Graviton) for Lambda and Fargate — up to 40% better price-performance with no code changes
- Use `m7g`/`c7g`/`r7g` EC2 families instead of `m7i`/`c7i`/`r7i`
- Use Aurora Serverless v2 for variable database workloads — pay per ACU instead of fixed instance
- Use DynamoDB on-demand mode for unpredictable workloads; switch to provisioned when patterns stabilise
- Use gp3 EBS volumes instead of gp2 — 20% cheaper with configurable IOPS

## Waste Elimination

| Resource | Waste indicator | Fix |
|----------|----------------|-----|
| EBS volumes | Unattached to any instance | Snapshot and delete |
| Elastic IPs | Not associated with a resource | Release immediately |
| NAT Gateways | High GB processed to S3/DynamoDB | Replace with VPC gateway endpoints |
| Load balancers | No healthy registered targets | Remove or consolidate |
| EBS snapshots | Older than 90 days with no retention policy | Implement lifecycle automation |
| CloudWatch Logs | No retention policy | Set to 7, 14, 30, or 90 days |
| Dev/test environments | Running nights and weekends | Schedule stop/start with EventBridge rules |

- Schedule dev and test environments to stop at 18:00 and start at 08:00 on weekdays — saves ~60% of runtime cost
- Use AWS Trusted Advisor and Cost Explorer's resource recommendations weekly

## Data Transfer Costs

| Transfer type | Cost |
|---------------|------|
| Inbound to AWS | Free |
| Same AZ | Free |
| Cross-AZ | $0.01/GB each direction |
| To internet (first 10 TB) | $0.09/GB |
| Cross-region | $0.02/GB |
| Origin to CloudFront | Free |
| Through NAT Gateway | $0.045/GB |
| Through VPC gateway endpoint | $0.01/GB |

- Use VPC gateway endpoints for S3 and DynamoDB — they are free and bypass the NAT Gateway entirely
- Serve all user-facing content through CloudFront — reduces direct ALB egress costs
- Co-locate compute and data in the same AZ to avoid cross-AZ transfer charges
- Compress payloads before transfer — gzip API responses and S3 objects

## Cost Governance

- Tag every resource with `Environment`, `Service`, `Team`, and `CostCentre`
- Enforce tagging via SCPs — deny `ec2:RunInstances` and `rds:CreateDBInstance` without required tags
- Set AWS Budgets with alerts at 80% (actual) and 100% (forecasted) for every account and project
- Review Cost Explorer weekly — do not wait for the end-of-month bill
- Use S3 Intelligent-Tiering for buckets with unpredictable access patterns
- Set S3 lifecycle rules on every bucket to transition objects to Standard-IA after 30 days and Glacier after 90 days

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Buying Reserved Instances before workload is stable | Wait 3–6 months; use On-Demand then Savings Plans |
| Ignoring data transfer costs | Audit NAT Gateway and cross-AZ costs in Cost Explorer monthly |
| No tagging enforcement | Deny resource creation without required tags via SCP |
| Dev/test running 24/7 | Schedule stop/start; non-production should not run nights and weekends |
| Over-provisioning "just in case" | Use auto-scaling and right-sizing instead |
| Optimising low-spend services first | Focus on the top 3 cost drivers — ignore services under $50/month |

## Best Practices

- Architect for cost from day one — serverless-first, event-driven, and right-sized containers are cheaper by design
- Use serverless (Lambda, Fargate, DynamoDB) to eliminate idle compute costs
- Apply Graviton across all new Lambda functions, Fargate tasks, and EC2 instances
- Monitor CloudWatch costs separately — high-cardinality custom metrics are a hidden spend
- Review unused resources with AWS Trusted Advisor and Cost Explorer resource optimisation recommendations monthly
- Set a budget before launching any new environment — never allow unbounded spend
