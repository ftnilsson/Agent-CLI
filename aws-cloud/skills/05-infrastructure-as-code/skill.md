# Infrastructure as Code

## Tool Selection

| Tool | Use when |
|------|----------|
| AWS CDK (TypeScript) | AWS-native projects; prefer for new workloads |
| CloudFormation (YAML) | Simple stacks, compliance scenarios, CDK is overkill |
| Terraform (HCL) | Multi-cloud, large existing Terraform codebase |

- Default to CDK for all new AWS-only projects — it provides type safety, reuse, and tight AWS integration
- Never manage production resources with manual console changes — everything must be in code

## CDK Project Structure

```
infra/
├── bin/app.ts                    # Entry point — instantiates stacks
├── lib/
│   ├── stacks/
│   │   ├── networking-stack.ts   # VPC, subnets, security groups
│   │   ├── data-stack.ts         # DynamoDB, RDS, S3
│   │   ├── compute-stack.ts      # Lambda, ECS, API Gateway
│   │   └── monitoring-stack.ts   # CloudWatch, alarms, dashboards
│   ├── constructs/               # Reusable L3 constructs
│   └── config/
│       ├── dev.ts
│       └── prod.ts
└── test/
```

- One concern per stack: networking, data, compute, and monitoring are separate stacks
- Never hard-code account IDs, ARNs, or region strings — use `Stack.of(this).account`, `Aws.REGION`
- Externalise environment config into typed config objects — not hard-coded values in stacks
- Extract reusable patterns (secure S3 bucket, Lambda + API GW, ECS service) into L3 constructs
- Write CDK assertion tests for all stacks — test that security properties and resource counts are correct

## CDK Patterns

- Use CDK `grant*` methods (`grantRead`, `grantReadWriteData`, `grantPublish`) for IAM — they generate correctly scoped policies automatically
- Never attach `AdministratorAccess` or `PowerUserAccess` managed policies to Lambda or ECS roles
- Set `removalPolicy: RemovalPolicy.RETAIN` on production databases and S3 buckets
- Enable `enforceSSL: true` and `blockPublicAccess: BlockPublicAccess.BLOCK_ALL` on all S3 buckets
- Run `cdk diff` before every deployment and review the changeset
- Run CDK Nag in synthesis to enforce security rules as part of CI

## Terraform Structure

```
terraform/
├── modules/
│   ├── networking/
│   ├── compute/
│   └── data/
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   ├── backend.tf       # S3 state backend + DynamoDB lock
│   │   └── terraform.tfvars
│   ├── staging/
│   └── prod/
└── shared/state-backend/    # Bootstrap: S3 bucket + DynamoDB table
```

- Store Terraform state in S3 with DynamoDB locking — never use local state for team projects
- Pin provider versions in `required_providers` blocks — avoid breaking changes from automatic upgrades
- Run `terraform plan` in CI on every pull request and post the plan as a PR comment
- Run `tflint` and `checkov` in pre-commit hooks for all Terraform repositories
- Use `terraform fmt` to enforce consistent formatting

## Secrets in IaC

- Never commit secrets, API keys, or passwords in IaC code or template files
- Use AWS Secrets Manager for credentials that require rotation
- Use SSM Parameter Store (SecureString) for configuration values
- Reference secrets dynamically at deploy time — never bake them into Lambda packages or container images

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Giant monolithic stacks (200+ resources) | Split into focused stacks by concern |
| Hard-coded account IDs and ARNs | Use `Aws.ACCOUNT_ID`, `Aws.REGION`, or data sources |
| No Terraform state locking | Configure DynamoDB lock table in the remote backend |
| IaC drift from manual console changes | Detect with `cdk diff` or `terraform plan`; reconcile immediately |
| No IaC tests | Add CDK assertion tests and `checkov` security scanning |
| Over-abstracting early | Write straightforward stacks first; extract constructs when patterns repeat |

## Best Practices

- Review `cdk diff` or `terraform plan` output on every PR — never deploy blind
- Apply standard tags (`Environment`, `Service`, `Team`, `CostCentre`) to all resources via stack-level tag propagation
- Enable termination protection on production RDS, Aurora, and stateful resources
- Use CDK Nag or Checkov in CI to catch security issues before deployment
- Keep stacks small and focused — large stacks are slow to deploy and risky to update
- Test IaC in a staging account before deploying to production
