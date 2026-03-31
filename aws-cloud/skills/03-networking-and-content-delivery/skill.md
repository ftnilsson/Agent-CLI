# Networking & Content Delivery

## VPC Design

```
VPC: 10.0.0.0/16
├── Public Subnets  (one per AZ) — ALB, NAT Gateway only
│   ├── 10.0.1.0/24 (AZ-a)
│   ├── 10.0.2.0/24 (AZ-b)
│   └── 10.0.3.0/24 (AZ-c)
├── Private Subnets (one per AZ) — ECS tasks, Lambda, EC2
│   ├── 10.0.11.0/24 (AZ-a)
│   ├── 10.0.12.0/24 (AZ-b)
│   └── 10.0.13.0/24 (AZ-c)
└── Data Subnets    (one per AZ) — RDS, ElastiCache, no internet route
    ├── 10.0.21.0/24 (AZ-a)
    ├── 10.0.22.0/24 (AZ-b)
    └── 10.0.23.0/24 (AZ-c)
```

- Never use the default VPC in production — always create a custom VPC
- Use 3 AZs for production VPCs; minimum 2 AZs for all environments
- Size subnets with `/20` or larger — Fargate tasks and Lambda ENIs consume IPs aggressively
- Place only ALBs, NAT Gateways, and bastion hosts in public subnets
- Data subnets must have no internet route — databases are never internet-accessible
- Deploy one NAT Gateway per AZ in production — a single NAT Gateway is a single point of failure

## Security Groups

- Reference security groups, not CIDR blocks, when restricting inbound traffic between tiers
- Never open port 22 (SSH) or 3389 (RDP) to `0.0.0.0/0` — use Systems Manager Session Manager instead
- Restrict inbound on the app tier to only the ALB security group
- Restrict inbound on the DB tier to only the app tier security group
- Use VPC endpoints to access S3, DynamoDB, and other AWS services without traversing the internet

## Load Balancers

| Type | Use when |
|------|----------|
| ALB (Layer 7) | Web apps, REST APIs, path/host-based routing, WebSocket |
| NLB (Layer 4) | High performance, static IPs, gRPC, non-HTTP protocols |
| GWLB (Layer 3) | Third-party firewalls, IDS/IPS appliances |

- Use ALB not CLB — Classic Load Balancer is deprecated
- Enable ALB access logging to S3 for all production load balancers
- Use a dedicated `/health` endpoint for health checks — not `/`; check downstream dependencies
- Attach WAF to ALB for all internet-facing applications
- Set deregistration delay to 30–60 seconds — default 300 seconds holds connections too long

## CloudFront

- Use Origin Access Control (OAC), not legacy Origin Access Identity (OAI), for S3 origins
- Block public S3 bucket access and serve all content through CloudFront
- Set long TTLs with versioned filenames for static assets; disable caching for API routes
- Use CloudFront Functions for lightweight edge logic (auth, redirects, header rewriting)
- Use Lambda@Edge only when CloudFront Functions lack required capability — it is slower and more expensive
- Front APIs with CloudFront for DDoS protection and latency reduction even without caching

## Route 53

- Use alias records for all AWS resources (ALB, CloudFront, S3 websites) — no charge for alias queries
- Configure health checks with failover routing for active-passive multi-region setups
- Use weighted routing for gradual traffic shifting during deployments
- Use private hosted zones for internal service discovery within VPCs

## API Gateway

- Use HTTP API by default — it is cheaper and lower latency than REST API
- Use REST API only when you need request validation, usage plans, caching, or API keys
- Set throttling limits on all APIs to protect backend services
- Enable request validation to reject malformed inputs before they reach Lambda or ECS

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Default VPC in production | Create a custom VPC with defined subnet tiers |
| Over-broad security groups (`0-65535` from `0.0.0.0/0`) | Restrict to specific ports and source security groups |
| Single NAT Gateway | One NAT Gateway per AZ for production availability |
| Not enforcing HTTPS end-to-end | Enforce HTTPS on CloudFront-to-ALB, not just client-to-CloudFront |
| Insufficient IP space | Use `/19` or larger subnets to accommodate ENI allocation |
| NAT Gateway for S3/DynamoDB traffic | Use VPC gateway endpoints — they are free |

## Best Practices

- Enable VPC Flow Logs on all production VPCs for security monitoring and troubleshooting
- Use AWS Transit Gateway for hub-and-spoke connectivity across multiple VPCs and accounts
- Use AWS Network Firewall or WAF for perimeter security beyond security groups
- Centralise internet egress through a shared networking account for inspection and cost control
- Use VPC interface endpoints for services accessed at high volume to reduce NAT Gateway data costs
