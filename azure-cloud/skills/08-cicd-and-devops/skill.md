# CI/CD & DevOps

## Tool Selection

| Tool | Use when |
|------|---------|
| **GitHub Actions** | GitHub-hosted repos — flexible, large marketplace, OIDC-native Azure auth |
| **Azure DevOps Pipelines** | Enterprise, existing ADO investment, Boards/Repos integration required |

Use **GitHub Actions** for new projects — better developer experience and simpler OIDC configuration.

## GitHub Actions: OIDC Authentication (No Secrets)

```yaml
# .github/workflows/deploy.yml
permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Azure Login (OIDC)
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Deploy Bicep
        uses: azure/arm-deploy@v2
        with:
          resourceGroupName: rg-myapp-prod
          template: infra/main.bicep
          parameters: infra/parameters/prod.bicepparam
```

- Use **OIDC (workload identity federation)** for all CI/CD Azure authentication — no long-lived client secrets
- Configure federated credentials scoped to specific branches (`refs/heads/main`) and environments
- Scope the service principal to the **minimum required resource group** and role — never subscription-level Contributor
- Use **GitHub Environments** with required reviewer approvals and branch restrictions for production deployments
- Use **reusable workflows** for shared pipeline logic across repositories

## Pipeline Stages

Every pipeline must progress through: Build → Test → Deploy Staging → Smoke Test → Deploy Production

- Run unit tests, linting, and IaC validation on every push and pull request
- Deploy to staging before production — never skip a staging environment
- Run smoke tests against staging after deployment; gate production deployment on staging success
- Keep total pipeline time under 10 minutes — long pipelines discourage frequent deployments

## Deployment Strategies

| Strategy | Rollback | Azure support |
|----------|----------|---------------|
| **Deployment slots (swap)** | Instant swap back | App Service, Azure Functions |
| **Revision traffic splitting** | Instant traffic shift | Azure Container Apps |
| **Blue/Green** | Instant swap | App Service, AKS |
| **Canary** | Instant traffic shift | Container Apps, AKS, Front Door |
| **All-at-once** | Redeploy | All services |

- Use **deployment slots** for App Service and Functions — deploy to `staging` slot, smoke test, then swap to `production`
- Use **revision traffic splitting** for Container Apps canary deployments: 90% old / 10% new, then shift 100% after validation
- Never deploy all-at-once to production without a tested rollback path

## Quality Gates

Add all of the following to every pipeline:

- Unit tests (`dotnet test`, `npm test`, `pytest`)
- Linting (`eslint`, `ruff`, `dotnet format`)
- Security scanning (`trivy image`, `checkov`, `PSRule for Azure`, Defender for DevOps)
- IaC validation (`az bicep lint`, `what-if` on PR, `terraform plan`)
- Integration tests against staging environment
- Smoke tests against deployed endpoint after every deployment

## Infrastructure Deployment in CI

```yaml
- name: Bicep what-if (PR)
  if: github.event_name == 'pull_request'
  run: |
    az deployment group what-if \
      --resource-group ${{ vars.RESOURCE_GROUP }} \
      --template-file infra/main.bicep \
      --parameters infra/parameters/${{ vars.ENVIRONMENT }}.bicepparam

- name: Bicep deploy (main branch)
  if: github.ref == 'refs/heads/main'
  run: |
    az deployment group create \
      --resource-group ${{ vars.RESOURCE_GROUP }} \
      --template-file infra/main.bicep \
      --parameters infra/parameters/${{ vars.ENVIRONMENT }}.bicepparam
```

- Run `what-if` on every IaC pull request — review the changeset before merging
- Never apply Terraform or Bicep changes without a preceding plan/what-if review

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Client secrets for CI/CD authentication | Replace with OIDC workload identity federation |
| No staging environment | Add staging; block production deployments on staging failure |
| Long-lived feature branches | Use trunk-based development; merge to main frequently |
| No rollback plan | Use deployment slots or revision traffic splitting for instant rollback |
| Over-complex pipelines (>10 min build) | Parallelise, cache dependencies, split large jobs |
| Subscription-level Contributor for CI/CD | Scope to specific resource group and required actions |

## Best Practices

- Deploy frequently — small, frequent deployments are safer than large, infrequent releases
- Use feature flags to decouple deployment from release — deploy disabled, enable gradually
- Monitor error rates and latency during and after every production deployment
- Protect CI/CD pipelines with branch protection, required reviews, and OIDC-only auth
- Cache build dependencies (npm, NuGet, pip) to speed up CI runs
- Tag Docker images with the Git commit SHA — never use `latest` in deployment pipelines
