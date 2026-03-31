# Networking & Content Delivery

## VNet Design

```
VNet: 10.0.0.0/16
├── GatewaySubnet              10.0.0.0/27   (VPN / ExpressRoute)
├── AzureFirewallSubnet        10.0.1.0/26
├── App Service VNet integration 10.0.10.0/24
├── Container Apps environment 10.0.11.0/24
├── AKS node pool              10.0.12.0/22  (/22 minimum — Azure CNI uses 1 IP per pod)
├── Private Endpoint subnet    10.0.20.0/24
├── Data subnet                10.0.30.0/24
└── AzureBastionSubnet         10.0.255.0/26 (exact name required)
```

- Use hub-spoke topology for multi-workload environments; centralise egress through Azure Firewall
- Size AKS subnets at `/22` or larger — Azure CNI allocates one IP per pod
- Size delegated subnets (App Service, ACA) generously — they consume IPs at scale
- Use Private Endpoints for all PaaS services in production: SQL, Storage, Key Vault, Cosmos DB, Redis
- Use Private DNS Zones linked to VNets for automatic Private Endpoint DNS resolution

## NSG Rules

- Apply NSGs at the **subnet level** for consistent enforcement
- Never open RDP (3389) or SSH (22) to source `*` — use Azure Bastion for management access
- Use **Service Tags** (`AzureCloud`, `Storage`, `Sql`, `AzureKeyVault`) instead of hard-coded IP ranges
- Use **Application Security Groups (ASGs)** to group NICs logically in NSG rules
- Enable **NSG Flow Logs** and send to Log Analytics for security monitoring

## Load Balancing

| Service | Layer | Scope | Use case |
|---------|-------|-------|----------|
| **Azure Front Door** | L7 | Global | Global LB, WAF, CDN, SSL offload, DDoS |
| **Application Gateway** | L7 | Regional | Regional HTTP/S LB, WAF v2, path-based routing |
| **Azure Load Balancer** | L4 | Regional | TCP/UDP, high-throughput, internal or public |
| **Traffic Manager** | DNS | Global | DNS-based routing, multi-region failover |

- Use **Azure Front Door Premium** for global workloads with WAF and Private Link origins
- Use **Application Gateway WAF v2** for regional HTTP/S workloads — always WAF v2, not Standard
- Use **Standard SKU** Azure Load Balancer for L4 — Basic SKU is deprecated
- Configure zone-redundant Application Gateway in production — never single-zone

## Private DNS Zones for Private Endpoints

| Service | Private DNS Zone |
|---------|-----------------|
| Blob Storage | `privatelink.blob.core.windows.net` |
| Azure SQL | `privatelink.database.windows.net` |
| Key Vault | `privatelink.vaultcore.azure.net` |
| Cosmos DB | `privatelink.documents.azure.com` |
| Azure Cache for Redis | `privatelink.redis.cache.windows.net` |

- Link every Private DNS Zone to all VNets that need resolution
- Automate Private DNS Zone record creation in IaC — never manually manage DNS records

## API Management (APIM)

| Tier | Use case | VNet support |
|------|----------|-------------|
| Consumption | Serverless, low-traffic APIs | None |
| Standard v2 | Production APIs, moderate traffic | VNet integration |
| Premium | Enterprise, multi-region, full VNet injection | Full injection |

- Use **Standard v2** for most production workloads
- Reference secrets in APIM policies via Key Vault named values — never inline secrets
- Enable **Application Insights integration** for API analytics
- Use **Products and Subscriptions** for access control and usage tracking

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| No Private Endpoints on PaaS in production | Add Private Endpoints; disable public access on SQL, Storage, Key Vault |
| RDP/SSH open to internet in NSG | Remove rule; use Azure Bastion |
| Insufficient AKS subnet size | Use `/22` minimum for Azure CNI node pools |
| Missing Private DNS Zones for Private Endpoints | Create and link zone per Private Endpoint service |
| Single-zone Application Gateway in production | Enable zone redundancy on App Gateway WAF v2 |
| Hard-coded IP ranges in NSG rules | Replace with Service Tags |

## Best Practices

- Enable **Network Watcher** in every region for flow logs and connection troubleshooting
- Use **VNet peering** (not VPN Gateway) for VNet-to-VNet connectivity within Azure
- Use **Azure CDN or Front Door** to cache static assets at the edge and reduce origin egress
- Co-locate compute and data in the same region and VNet to avoid cross-region egress charges
- Deploy all network resources via IaC — no portal DNS or NSG changes
- Use **Azure DDoS Protection Standard** for internet-facing production workloads
