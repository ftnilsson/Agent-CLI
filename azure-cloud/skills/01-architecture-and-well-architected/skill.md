# Azure Architecture & Well-Architected

## Well-Architected Framework Pillars

Evaluate every architecture decision against all five pillars — never optimise one at the expense of others:

- **Reliability** — deploy zone-redundant, retry with exponential backoff, define RTO and RPO
- **Security** — enforce Private Endpoints, managed identities, Entra ID RBAC, no public PaaS endpoints
- **Cost Optimisation** — use PaaS/serverless, right-size, apply Reserved Instances for steady-state
- **Operational Excellence** — automate all deployments, centralise logs in Log Analytics, use IaC only
- **Performance Efficiency** — choose the right service tier, cache aggressively, scale horizontally

## Service Selection

| Pattern | Azure Services |
|---------|---------------|
| Monolith (early stage) | App Service, single container in ACA |
| Microservices | ACA, AKS, Azure Functions, Service Bus |
| Serverless-first | Azure Functions (Consumption/Flex), Event Grid, Cosmos DB |
| Event-driven | Event Grid, Service Bus, Event Hubs, Durable Functions |

- Default to PaaS and managed services — never IaaS unless you have a specific requirement
- Start with a well-structured monolith; extract microservices only at clear domain boundaries
- Use Azure Container Apps over AKS unless the team is Kubernetes-native or needs full cluster control

## Subscription & Landing Zone Structure

```
Root Management Group
├── Platform
│   ├── Identity        (Entra ID Connect, domain controllers)
│   ├── Management      (Log Analytics, Automation, Monitor)
│   └── Connectivity    (Hub VNet, ExpressRoute, Azure Firewall)
├── Landing Zones
│   ├── Corp            (internal apps, Private Endpoints)
│   └── Online          (internet-facing workloads)
├── Sandbox             (dev/experimentation — no production data)
└── Decommissioned
```

- Use separate subscriptions per environment for blast-radius isolation and billing clarity
- Apply Azure Policy at management group level: enforce allowed regions, required tags, denied resource types
- Use hub-spoke networking with Azure Firewall for centralised egress and inspection
- Enable Privileged Identity Management (PIM) for just-in-time admin access

## Reliability Rules

- Deploy all stateful services (Azure SQL, Redis, Cosmos DB) zone-redundant by default
- Spread stateless services across Availability Zones behind a load balancer
- Implement retry with exponential backoff on every service call (Polly for .NET)
- Add circuit breakers to prevent cascading failures to unhealthy downstream services
- Never deploy to a single Availability Zone in production
- Use Azure Chaos Studio to test failure scenarios proactively

## Naming & Tagging Conventions

Apply tags to every resource: `Environment`, `Team`, `Service`, `CostCentre`

Enforce tags with Azure Policy using `deny` effect on resources missing required tags.

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Lift-and-shift to VMs | Rearchitect to App Service, ACA, or Azure Functions |
| Single Availability Zone deployment | Enable zone redundancy on all production resources |
| Public endpoints on PaaS services | Use Private Endpoints for SQL, Storage, Key Vault, Cosmos DB |
| Synchronous HTTP chains between microservices | Decouple with Service Bus or Event Grid |
| Multi-region active-active for low-traffic apps | Match architecture complexity to actual scale requirements |
| No disaster recovery plan | Define RTO and RPO; implement and test failover procedures |

## Best Practices

- Automate everything — no portal click-ops for production resources
- Store architecture decisions in ADRs (Architecture Decision Records)
- Design to handle 10x current load without rearchitecting
- Design for observability from day one: metrics, logs, and distributed traces
- Treat one-way doors (partition key, primary region, Cosmos DB schema) with extra scrutiny
- Use Azure Front Door for global multi-region load balancing with WAF
- Use Private Endpoints for all PaaS services in production — no exceptions
- Deploy infrastructure and applications via IaC pipelines only
