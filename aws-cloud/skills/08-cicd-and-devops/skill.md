# CI/CD & DevOps

## Tool Selection

| Tool | Use when |
|------|----------|
| GitHub Actions | GitHub-hosted repos; flexible workflows; preferred default |
| CodePipeline + CodeBuild | AWS-native requirements, tight IAM integration, CodeDeploy for EC2/ECS |
| GitLab CI | GitLab-hosted repos |

- Default to GitHub Actions with AWS OIDC for new projects
- Use CodePipeline only when AWS-native tooling is a hard requirement

## GitHub Actions with AWS OIDC

```yaml
permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsDeployRole
          aws-region: eu-west-1
      - run: npx cdk deploy --all --require-approval never
```

- Use OIDC authentication — never store AWS access keys in GitHub secrets
- Scope the IAM trust policy to specific repository and branch (`token.actions.githubusercontent.com` conditions)
- Use GitHub Environments for production deployments — enforce required reviewers and branch restrictions
- Cache dependencies with `actions/cache` to reduce build times
- Use reusable workflows for shared pipeline logic across repositories

## Pipeline Stages

Every production pipeline must include:

1. Source — trigger on push to main or PR merge
2. Build — compile, build Docker image, run `cdk synth` or `terraform plan`
3. Test — unit tests, integration tests, security scanning (Trivy, CDK Nag, Checkov)
4. Staging — deploy to staging, run smoke tests, hold for approval if required
5. Production — deploy with a safe strategy, monitor error rate and latency, auto-rollback on breach

- Run `cdk diff` or `terraform plan` on pull requests and post output as a PR comment
- Never deploy to production without first deploying and validating in staging

## Deployment Strategies

| Strategy | Rollback | Use when |
|----------|----------|----------|
| All-at-once | Redeploy | Dev/test only |
| Rolling | Redeploy | ECS services, EC2 fleets |
| Blue/Green | Instant (switch target group) | ECS services, EC2 with CodeDeploy |
| Canary | Instant (shift traffic back) | Production APIs, high-traffic Lambda |

- Use Blue/Green for ECS services in production — configure via CodeDeploy deployment controller
- Use Lambda aliases with canary deployment preferences and automatic CloudWatch alarm rollback
- Never use all-at-once deployments in production

```yaml
# SAM canary deployment with auto-rollback
DeploymentPreference:
  Type: Canary10Percent5Minutes
  Alarms:
    - !Ref ErrorAlarm
    - !Ref LatencyAlarm
```

## Quality Gates

Include all of the following in every pipeline:

- Unit tests — fail the build on any failure
- Linting — ESLint, Ruff, Prettier, or equivalent for the language
- Security scanning — `trivy image`, `npm audit`, `checkov`, or `cdk-nag`
- IaC validation — `cdk diff`, `terraform plan`, or `cfn-lint`
- Integration tests — run against a deployed staging environment
- Smoke tests — hit critical endpoints immediately after deployment
- Auto-rollback — configure CloudWatch alarm-based rollback on canary and blue/green deployments

## Infrastructure Deployment in CI

- Run `cdk diff` on pull requests; run `cdk deploy` only on merge to main
- Run `terraform plan` on pull requests; run `terraform apply` only on merge to main
- Never use `--require-approval never` without gating on the `cdk diff` in the PR
- Use separate IAM roles for CI/CD with the minimum permissions required to deploy each stack

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| AWS access keys in GitHub secrets | Use OIDC with a scoped IAM role |
| No staging environment | Deploy to staging before every production deployment |
| Long-lived feature branches | Use trunk-based development with feature flags |
| Manual deployment steps | Automate every step — no SSH, no console clicks |
| No rollback plan | Use blue/green or canary — every deploy must have instant rollback |
| Pipelines with 20+ stages and 30-minute builds | Keep total pipeline time under 10 minutes |

## Best Practices

- Deploy small changes frequently — large infrequent deployments are higher risk
- Separate application and infrastructure pipeline triggers — they have different lifecycles
- Use feature flags to decouple deployment from release — deploy to production disabled, enable gradually
- Monitor error rates and latency during every deployment window — auto-rollback on SLO breach
- Protect CI/CD IAM roles as strictly as production infrastructure — audit, rotate, scope tightly
- Require pull request reviews and branch protection on main for all production-connected repositories
