# Infrastructure as Code

## Tool Selection

| Tool | Language | State | Use when |
|------|----------|-------|---------|
| **Bicep** | Bicep DSL | Managed by Azure | Azure-only projects — first-party support, best tooling |
| **Terraform (AzureRM)** | HCL | Azure Storage + lease lock | Multi-cloud or large existing Terraform codebase |
| **ARM Templates** | JSON | Managed by Azure | Legacy; generate from Bicep, do not hand-author |
| **Pulumi** | TypeScript, Python, Go, C# | Self-managed or Pulumi Cloud | Teams requiring full programming language expressiveness |

Use **Bicep** for all new Azure-only projects — cleaner syntax than ARM, first-party support, excellent VS Code tooling.

## Bicep Project Structure

```
infra/
├── main.bicep                  # Orchestrator — wires modules together
├── parameters/
│   ├── dev.bicepparam
│   ├── staging.bicepparam
│   └── prod.bicepparam
└── modules/
    ├── networking/main.bicep   # VNet, subnets, NSGs, Private DNS
    ├── compute/main.bicep      # App Service, ACA, Functions
    ├── data/main.bicep         # SQL, Cosmos DB, Storage, Redis
    ├── monitoring/main.bicep   # Log Analytics, App Insights, alerts
    └── shared/
        ├── key-vault.bicep
        └── private-endpoint.bicep
```

- One concern per module: networking, data, compute, and monitoring are separate modules
- Put all environment-specific values in parameter files — never hard-code in modules
- Use `main.bicep` as the orchestrator that wires modules together and passes outputs between them
- Extract reusable patterns (Private Endpoint, diagnostic settings) into shared modules

## Bicep: Key Patterns

```bicep
// main.bicep — orchestrator pattern
targetScope = 'resourceGroup'

@allowed(['dev', 'staging', 'prod'])
param environment string
param location string = resourceGroup().location
param baseName string

module networking 'modules/networking/main.bicep' = {
  name: 'networking-${environment}'
  params: { location: location, baseName: baseName, environment: environment }
}

module data 'modules/data/main.bicep' = {
  name: 'data-${environment}'
  params: {
    location: location
    subnetId: networking.outputs.dataSubnetId
    privateDnsZoneId: networking.outputs.sqlPrivateDnsZoneId
  }
}
```

- Use `@allowed([...])` decorators on environment and region parameters
- Use `existing` resource references instead of hard-coding resource IDs
- Reference Key Vault secrets via `keyVault.getSecret('secret-name')` — never copy secret values
- Apply resource tags in every module using a `tags` parameter passed from the orchestrator

## Terraform: Azure Essentials

- Store state in Azure Storage with blob lease locking — never use local state for team projects
- Use **OIDC authentication** (`use_oidc = true`) in CI/CD — no client secrets
- Pin provider versions in `required_providers` to avoid breaking changes
- Run `terraform plan` on every PR; run `terraform apply` only on merge to main

## Secrets in IaC

- Never commit secrets, passwords, or SAS tokens to IaC code
- Reference secrets from Key Vault using `.getSecret()` in Bicep or `azurerm_key_vault_secret` data source in Terraform
- Use managed identities wherever possible to eliminate secrets entirely
- Encrypt Terraform state — Azure Storage with customer-managed keys for compliance

## Validation and Testing

```bash
# Bicep
az bicep lint --file infra/main.bicep
az deployment group what-if \
  --resource-group rg-myapp-dev \
  --template-file infra/main.bicep \
  --parameters infra/parameters/dev.bicepparam

# Terraform
terraform validate && terraform plan
tflint                    # Azure-specific lint rules
checkov --directory .     # Security scanning
```

- Run `what-if` / `terraform plan` on every PR — review the changeset before merge
- Add `az bicep lint` and PSRule for Azure to CI pipelines
- Deploy to staging before production — never test IaC changes directly in production

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Portal click-ops for production resources | Replace with IaC; import existing resources with `az bicep decompile` or `terraform import` |
| Hard-coded subscription/resource IDs | Use `subscription().subscriptionId`, `resourceGroup().id`, module outputs |
| Giant monolithic templates (200+ resources) | Split into focused modules by concern |
| No state locking (Terraform) | Enable blob lease locking on the Azure Storage backend |
| Secrets in parameter files or environment variables | Use Key Vault references |
| Over-abstracting too early | Write straightforward modules first; extract reusable patterns when they repeat |

## Best Practices

- Apply delete locks to production databases, Key Vaults, and Storage Accounts
- Tag every resource with `Environment`, `Service`, `Team`, `CostCentre` via a shared `tags` parameter
- Use `@description()` decorators on all module parameters
- Use PSRule for Azure in CI to enforce naming conventions and security baselines
- Keep modules small and focused — large templates are slow to deploy and risky to update
- Never skip `what-if` / `plan` for production deployments
