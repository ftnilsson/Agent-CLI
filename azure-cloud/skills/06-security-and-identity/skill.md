# Security & Identity

## Managed Identities — Eliminate Secrets

- Use managed identities for **every** Azure-to-Azure connection: App Service, ACA, Functions, AKS workloads
- Never use connection strings with passwords, storage account keys, or SAS tokens for Azure service access
- Use **system-assigned** identity when the identity should be deleted with the resource
- Use **user-assigned** identity when multiple resources share permissions or identity must survive resource recreation

```bicep
resource appService 'Microsoft.Web/sites@2023-12-01' = {
  identity: { type: 'SystemAssigned' }
  properties: {
    siteConfig: {
      connectionStrings: [{
        name: 'SqlConnection'
        // No password — Entra ID managed identity authentication
        connectionString: 'Server=tcp:${sqlServer.properties.fullyQualifiedDomainName};Database=mydb;Authentication=Active Directory Managed Identity;'
        type: 'SQLAzure'
      }]
    }
  }
}
```

## RBAC Rules

- Assign roles at the **narrowest scope**: Resource > Resource Group > Subscription
- Assign roles to **Entra ID groups**, not individual users
- Use **built-in roles** before creating custom roles:
  - `Key Vault Secrets User` — read secrets
  - `Storage Blob Data Contributor` — read/write blobs
  - `Azure Service Bus Data Receiver` / `Data Sender` — messaging
  - `Contributor` — full resource management (not RBAC or Policy)
- Never assign `Owner` or `Contributor` at subscription scope without documented justification
- Use **Privileged Identity Management (PIM)** for just-in-time, time-limited elevated access

## Key Vault Configuration

```bicep
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: 'kv-myapp-prod'
  properties: {
    enableRbacAuthorization: true    // Use RBAC, not legacy access policies
    enableSoftDelete: true           // 90-day recovery window
    enablePurgeProtection: true      // Prevent permanent deletion
    networkAcls: {
      defaultAction: 'Deny'
      bypass: 'AzureServices'
    }
  }
}
```

- Use **RBAC authorization** on Key Vault — not access policies
- Enable **soft delete and purge protection** on every Key Vault — this cannot be undone after creation
- Use **Private Endpoints** — Key Vault must not be accessible over the public internet in production
- Use **separate Key Vaults per environment** — dev secrets must never be in the production vault
- Enable **diagnostic logging** to detect unusual access patterns

## Encryption

- Enforce **TLS 1.2 minimum** on all services: Storage Accounts, App Service, Azure SQL, Service Bus
- Disable HTTP on Storage Accounts (`supportsHttpsTrafficOnly: true`)
- Disable shared key access on Storage Accounts (`allowSharedKeyAccess: false`)
- Use **Azure Front Door or Application Gateway** for TLS termination with managed certificates
- Use **customer-managed keys (CMK)** for encryption at rest when compliance requires it (SOC 2, ISO 27001)
- Azure SQL Transparent Data Encryption (TDE) is always-on by default — verify CMK for compliance

## Security Monitoring — Enable in Every Subscription

| Service | Enable for |
|---------|-----------|
| **Defender for Cloud** (CSPM) | All subscriptions — security posture and compliance |
| **Defender for Servers** | All IaaS VM workloads |
| **Defender for Containers** | All AKS and ACA workloads |
| **Defender for Key Vault** | All production Key Vaults |
| **Defender for Storage** | All production Storage Accounts |
| **Microsoft Sentinel** | Enterprise — SIEM/SOAR, threat detection |
| **Activity Log → Log Analytics** | All subscriptions — control plane audit trail |

## Subscription Security Baseline

- Enable Defender for Cloud with appropriate plans on every subscription
- Block public access on Storage Accounts at the subscription level via Azure Policy
- Enforce Private Endpoints for PaaS services via Azure Policy (`deny` effect)
- Enable Entra ID Conditional Access: MFA required, block legacy authentication, require compliant devices
- Configure **delete locks** on production databases and Key Vaults
- Forward Activity Log to a central Log Analytics workspace

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Connection strings with passwords in app config | Use managed identity + Entra ID authentication |
| Storage account keys in application code | Set `allowSharedKeyAccess: false`; use Entra ID RBAC |
| `Contributor` at subscription scope for CI/CD | Scope to specific resource group and required actions only |
| Key Vault without purge protection | Enable `enablePurgeProtection: true` at creation time |
| No MFA for admin accounts | Enforce MFA via Conditional Access for all users |
| Public endpoints on PaaS services | Use Private Endpoints; disable public access |

## Best Practices

- Automate security scanning in CI/CD: PSRule for Azure, Checkov, or Defender for DevOps
- Centralise security monitoring in a dedicated security subscription with Microsoft Sentinel
- Rotate any existing secrets immediately; use managed identities to avoid future rotation
- Assume breach — limit blast radius with scoped RBAC, subscription isolation, and network segmentation
- Review Defender for Cloud Secure Score monthly and remediate high-severity findings
