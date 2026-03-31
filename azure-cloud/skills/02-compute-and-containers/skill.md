# Compute & Containers

## Service Selection

| Model | Use when | Cold start | Cost model |
|-------|---------|------------|------------|
| **Azure Functions (Consumption)** | Event-driven, short tasks (<10 min), sporadic traffic | 1–10 s | Per-execution |
| **Azure Functions (Flex Consumption)** | Functions needing VNet, faster cold starts | <1 s (pre-provisioned) | Per-execution + baseline |
| **Azure Functions (Premium EP)** | Always-warm, latency-sensitive, 30-min timeout | None | Always-warm baseline |
| **App Service** | Web apps/APIs, WebSockets, predictable load | None (Always On) | Per-plan (fixed) |
| **Azure Container Apps (ACA)** | Containerised microservices, scale-to-zero, Dapr | Seconds | Per vCPU/memory/s |
| **AKS** | Kubernetes-native teams, full cluster control | None | VM node pricing |
| **VMs** | Full OS control, specialised hardware, legacy apps | None | VM pricing |

- Default to ACA or Azure Functions — reach for AKS only if the team is Kubernetes-native
- Use Spot VMs for AKS node pools running fault-tolerant workloads (batch, CI/CD agents, dev/test)
- Never use VMs for new workloads unless no managed service covers the requirement

## Azure Functions Configuration

```json
{
  "version": "2.0",
  "logging": {
    "applicationInsights": {
      "samplingSettings": { "isEnabled": true, "maxTelemetryItemsPerSecond": 20 }
    },
    "logLevel": { "default": "Information", "Host.Results": "Error" }
  },
  "extensions": {
    "serviceBus": { "maxConcurrentCalls": 16, "autoCompleteMessages": false }
  },
  "functionTimeout": "00:05:00"
}
```

- Use Consumption for sporadic workloads; Flex Consumption for production with VNet requirements
- Use Premium (EP) only for always-warm, latency-sensitive functions or 30-minute timeout needs
- Minimise cold starts: keep deployment packages small, use Flex Consumption pre-provisioned instances
- Use input/output bindings for Blob Storage, Cosmos DB, Service Bus, and Queue Storage
- Store state externally in Cosmos DB, Table Storage, or Redis — functions are stateless
- Use Durable Functions for stateful multi-step workflows, not regular functions with shared state

## Azure Container Apps (ACA)

- Set `minReplicas: 0` for non-production and off-hours workloads (scale-to-zero eliminates idle cost)
- Set `minReplicas: 2` across Availability Zones for production workloads
- Configure liveness probes (restart on deadlock) and readiness probes (traffic gating) on every container
- Use KEDA scalers for event-driven scaling: Service Bus queue depth, Event Hub lag, HTTP concurrency
- Use Dapr for service-to-service invocation, pub/sub, and state management in microservice environments
- Use revisions and traffic splitting for blue/green and canary deployments
- Pin container images to specific digests or semantic versions — never use `latest`

## App Service Production Checklist

- Use **Premium v3** (P1v3+) for production — required for zone redundancy and VNet integration
- Enable **Always On** to prevent application cold starts
- Configure **auto-scale rules** on CPU > 70% or HTTP queue > 100
- Use **deployment slots** for zero-downtime deployments with instant swap rollback
- Set a **health check endpoint** at `/health` — App Service will restart unhealthy instances
- Enable **managed identity** for all downstream Azure resource access
- Configure **VNet integration** for private backend access
- Set minimum TLS version to **TLS 1.2**
- Disable **FTP** and **remote debugging** in production

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| VMs for new workloads | Migrate to App Service, ACA, or Azure Functions |
| Consumption Functions for latency-sensitive APIs | Use Flex Consumption with pre-provisioned instances or Premium plan |
| `latest` container image tag | Pin to image digest or semantic version |
| AKS without managed node pools | Use system and user managed node pools |
| No health probes on containers | Add liveness and readiness probes to every container spec |
| Over-provisioned App Service plan | Enable auto-scale, review CPU/memory utilisation with Azure Advisor |

## Best Practices

- Use Azure Container Registry (ACR) with Defender for Containers enabled for all image storage
- Build multi-stage Docker images based on Alpine or distroless — minimise image size
- Deploy all compute configuration via IaC — no portal changes in production
- Tag all resources with `Service`, `Team`, `Environment`, `CostCentre`
- Use managed identities for all Azure-to-Azure authentication — no connection strings with passwords
- Apply minimum 2 instances across Availability Zones for all production compute
- Use Azure Advisor to identify over-provisioned VM and App Service SKUs
