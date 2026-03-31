# Deployment & Versioning

## Infrastructure as Code

- Define all functions, triggers, permissions, and dependent resources (queues, databases, event buses) in IaC templates
- Use the platform's serverless-focused IaC tool: SAM or CDK for AWS, Bicep or Terraform for Azure, Pulumi for multi-cloud
- Never deploy functions manually — all deployments must go through an automated pipeline
- Store IaC templates in the same repository as the function code; deploy both together

## Project Structure

- Place one handler file per function trigger under `src/handlers/`
- Keep shared business logic in `src/services/`, `src/validators/`, and `src/repositories/`
- Store IaC templates under `infra/` with environment-specific parameter files (`dev.json`, `staging.json`, `prod.json`)
- Keep build and deploy scripts under `scripts/`; commit them alongside the code

## Environment Management

- Build the artifact once; deploy the same artifact to all environments using environment-specific parameter files
- Use separate cloud accounts or subscriptions per environment; at minimum, isolate production from all non-production environments
- Never hardcode environment-specific values in application code — use environment variables or a configuration service
- Require a manual approval gate or automated validation before promoting to production

## Deployment Strategies

- Use all-at-once only for development environments where instant rollback is acceptable
- Use canary (10% traffic for 5 minutes, then 100%) for all production deployments
- Use linear (incremental percentage increase over time) for high-risk changes affecting critical paths
- Configure automated rollback triggered by error rate or latency alarms during the deployment window

```yaml
# SAM canary deployment with automated alarm-triggered rollback
DeploymentPreference:
  Type: Canary10Percent5Minutes
  Alarms:
    - !Ref ErrorRateAlarm
    - !Ref LatencyAlarm
  Hooks:
    PreTraffic: !Ref PreTrafficSmokeTestFunction
```

## Versioning & Aliases

- Publish an immutable version on every production deployment
- Use named aliases (`live`, `staging`) as stable pointers to specific versions
- Perform traffic shifting through the alias — never by updating the function code directly on a live alias
- Roll back instantly by pointing the alias back to the previous version number

## Build & Package

- Bundle each function separately with tree-shaking to produce one minimal package per handler
- Exclude all dev dependencies, test files, type definitions, and source maps from production packages
- Verify package sizes after every build — alert if any package exceeds 10 MB
- Run unit and integration tests as part of the build step; block deployment on test failure

## Rollback

- Every deployment must have a tested, instant rollback path before it goes to production
- Use alias traffic shifting for instant rollback on function platforms
- Use deployment slot swaps for instant rollback on Azure Functions
- Test rollback explicitly in staging: deploy a deliberately broken version, verify the alarm fires, verify rollback restores the previous version
- Automate rollback — do not rely on a human to notice and react during a canary window

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| All-at-once deployment directly to production | Use canary or linear deployment with automated rollback |
| No rollback plan or untested rollback procedure | Test rollback in staging before every production release pattern |
| Environment-specific `if (env === 'prod')` branches in application code | Use configuration files and environment variables; no environment conditionals in code |
| All functions bundled into a single monolithic deployment package | Bundle each function individually with only its required dependencies |
| Deploying directly from a developer machine to production | All deployments go through the CI/CD pipeline |
| Skipping staging — going directly from dev to production | Always promote through a staging environment with production-like configuration |

## Best Practices

- Build once, deploy the same artifact to all environments with per-environment parameters
- Use canary deployments with alarm-triggered automated rollback for all production releases
- Define all infrastructure in IaC alongside the application code
- Bundle each function separately; verify package sizes after every build
- Require automated test passage before any deployment proceeds
- Use separate cloud accounts per environment to prevent blast radius from non-production issues
- Test rollback procedures explicitly in staging before relying on them in production
- Automate every deployment step — any manual step will eventually cause an outage
