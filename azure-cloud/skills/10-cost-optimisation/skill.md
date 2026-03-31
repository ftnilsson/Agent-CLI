# Cost Optimisation

## Pricing Models

| Model | Discount | Commitment | Use when |
|-------|----------|------------|---------|
| **Pay-as-you-go** | 0% | None | Variable workloads, new projects, dev/test |
| **Savings Plans** | Up to 65% | 1 or 3 year (hourly spend) | Steady-state compute across VMs, App Service, Functions Premium |
| **Reserved Instances** | Up to 72% | 1 or 3 year (specific SKU + region) | Known VM types and regions, Azure SQL, Cosmos DB |
| **Spot VMs** | Up to 90% | None (eviction risk) | Fault-tolerant: batch jobs, CI/CD runners, AKS user node pools |
| **Dev/Test Pricing** | ~55% on VMs | EA or MCA required | All non-production environments under EA/MCA |

- Buy Savings Plans before Reserved Instances — more flexible, covers multiple compute services
- Wait 3–6 months before committing to reservations — buy only after workload patterns stabilise
- Use Spot VMs or Spot AKS node pools for all fault-tolerant batch and CI/CD workloads

## Right-Sizing Rules

- Run **Azure Advisor** weekly — it analyses utilisation and recommends optimal SKUs automatically
- Downsize or remove resources where average CPU utilisation is consistently below 20%
- Use **B-series VMs** for dev/test — burstable, significantly cheaper than D-series
- Use **Azure SQL Serverless** for intermittent or dev/test databases — auto-pauses on idle
- Use **Cosmos DB serverless tier** for dev/test and low-traffic containers
- Use **Elastic Pools** for multiple Azure SQL databases with variable usage patterns
- Use **Azure Functions Consumption plan** for sporadic workloads — no idle cost

## Eliminate Waste

| Resource | Waste signal | Action |
|----------|-------------|--------|
| Managed Disks | Unattached to any VM | Delete or snapshot then delete |
| Public IPs | Not associated to any resource | Delete ($3.65/month each) |
| App Service plans | No apps deployed | Delete |
| Stopped VMs | Still incurring disk and IP costs | Deallocate or delete |
| Old snapshots | Snapshots older than 90 days | Automate cleanup |
| Log Analytics | Verbose ingestion raising cost | Apply sampling, set retention, filter noisy logs |
| Dev/test environments | Running 24/7 | Schedule auto-shutdown at 18:00 |

- Automate dev/test VM shutdown at 18:00 using `Microsoft.DevTestLab/schedules`
- Use Azure Automation or Logic Apps to stop/start App Service and Container Apps on schedule
- Review unattached disks and unassociated Public IPs in Azure Advisor monthly

## Storage Cost Rules

- Apply **lifecycle management policies** to all blob containers: Hot → Cool at 30 days → Cold at 90 days → Archive at 180 days
- Use `Standard_ZRS` for production; use `Standard_LRS` for dev/test — do not pay for GRS in non-production
- Use `Standard SSD` for dev/test disks; reserve `Premium SSD` for production workloads with IOPS requirements

## Data Transfer Cost Rules

- Co-locate compute and data in the **same region and VNet** to avoid cross-region ($0.02/GB) and cross-AZ ($0.01/GB) charges
- Use **Azure CDN or Front Door** to cache static content at the edge and reduce origin egress
- Use **Private Endpoints** — traffic stays on the Azure backbone, avoiding public egress charges
- Use **VNet peering** instead of VPN Gateway for VNet-to-VNet connectivity — cheaper and lower latency

## Cost Governance

Apply these tags to every resource and enforce with Azure Policy (`deny` effect):

| Tag | Example values |
|-----|---------------|
| `Environment` | `dev`, `staging`, `prod` |
| `Service` | `order-api`, `payment-service` |
| `Team` | `platform`, `checkout` |
| `CostCentre` | `CC-1234` |

- Set a budget with alerts at **80% actual** and **100% forecasted** for every subscription and resource group
- Review Azure Cost Management weekly — do not wait for end-of-month bills
- Use **Cost Analysis** grouped by `Service` and `Team` tags to attribute spend accurately

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Buying reservations immediately | Wait 3–6 months; validate stable workload patterns first |
| Ignoring cross-AZ / egress data transfer costs | Co-locate compute and data; use CDN; use Private Endpoints |
| No tagging enforcement | Apply Azure Policy `deny` for missing required tags |
| Dev/test running 24/7 | Schedule auto-shutdown; use serverless/auto-pause tiers |
| Premium SKUs in dev/test | Use Standard/Basic tiers; use B-series VMs |
| Over-provisioning for peak | Use auto-scale and right-sizing instead of fixed peak capacity |

## Best Practices

- Architect for cost from day one — serverless, scale-to-zero, and right-sizing are design decisions
- Use serverless-first patterns (Azure Functions Consumption, ACA scale-to-zero) to eliminate idle cost
- Enable **Microsoft Cost Management** budgets before launching any new workload
- Use Azure Advisor's cost recommendations as a standing operational checklist
- Review and act on Advisor recommendations monthly — treat low-utilisation alerts as incidents
- Use Dev/Test subscription pricing under EA/MCA for all non-production environments
