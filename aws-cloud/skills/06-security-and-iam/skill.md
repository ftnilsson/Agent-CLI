# Security & IAM

## IAM Least Privilege

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "ScopedS3Read",
    "Effect": "Allow",
    "Action": ["s3:GetObject", "s3:ListBucket"],
    "Resource": [
      "arn:aws:s3:::my-app-data-prod",
      "arn:aws:s3:::my-app-data-prod/*"
    ],
    "Condition": {
      "StringEquals": { "aws:PrincipalTag/Environment": "prod" }
    }
  }]
}
```

- Never use `"Action": "*"` or `"Resource": "*"` without a documented, reviewed justification
- Scope all policies to specific resource ARNs — never `arn:aws:s3:::*`
- Use IAM roles for all services — EC2, Lambda, ECS, and CodeBuild must never use long-lived access keys
- Use one IAM role per Lambda function or ECS task — never share roles across services
- Apply permission boundaries to cap the maximum permissions a role can ever have
- Use conditions (source IP, MFA, VPC endpoint, resource tags) to further restrict sensitive policies
- Audit with IAM Access Analyzer regularly — it identifies unused permissions and unintended external access

## Service Role Patterns

- Use CDK `grant*` methods (`grantRead`, `grantReadWriteData`, `grantPublish`) — they scope policies correctly automatically
- Never attach `AdministratorAccess` or `PowerUserAccess` to Lambda or ECS task roles
- Review generated IAM policies with `cdk synth` or `terraform plan` before deploying
- Rotate access keys immediately when detected in code or logs — treat exposure as a breach

## Encryption

| Service | Minimum requirement | Production recommendation |
|---------|--------------------|-----------------------------|
| S3 | SSE-S3 (default) | SSE-KMS with customer-managed key for sensitive data |
| RDS/Aurora | Encrypt at rest | KMS customer-managed key |
| DynamoDB | AWS-owned key | Customer-managed KMS key for compliance workloads |
| EBS | Enable by default | Enforce at account level |
| SQS/SNS | SSE with SQS-managed key | KMS for cross-account or compliance use cases |

- Enforce HTTPS everywhere — S3 bucket policies must deny HTTP; ALB listeners must redirect 80 to 443
- Use ACM for all TLS certificates on ALB, CloudFront, and API Gateway — free and auto-renewing
- Enforce minimum TLS 1.2 on all endpoints
- Enable EBS encryption by default at the account level

## Secrets Management

- Use Secrets Manager for all credentials that require rotation (database passwords, API keys, tokens)
- Use SSM Parameter Store (SecureString) for configuration values that change infrequently
- Enable automatic rotation for RDS credentials via Secrets Manager
- Never store secrets in environment variables, source code, or configuration files
- Never bake secrets into container images or Lambda deployment packages
- Reference secrets at runtime via SDK calls, not at build or deploy time

## Security Monitoring

Enable all of the following in every AWS account:

| Service | Configuration |
|---------|--------------|
| CloudTrail | All regions enabled; log file validation on; deliver to central S3 |
| GuardDuty | All regions; aggregate findings to security account |
| Security Hub | Enabled with CIS and AWS Foundational Security standards; aggregate to security account |
| AWS Config | All regions; conformance packs for compliance frameworks |
| IAM Access Analyzer | All regions; review findings weekly |
| VPC Flow Logs | Enabled on all production VPCs |

## Account Security Baseline

- Block S3 public access at the account level
- Enable EBS encryption by default at the account level
- Require MFA for all IAM users — enforce on root account without exception
- Use SCPs to prevent disabling GuardDuty, CloudTrail, and Security Hub
- Remove all unused IAM users and access keys
- Use AWS IAM Identity Center for all human access — no long-lived per-account IAM users

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| `AdministratorAccess` on Lambda roles | Grant only the exact actions and resources required |
| `"Resource": "*"` in service policies | Scope to specific ARNs |
| Secrets in environment variables | Store in Secrets Manager; inject at runtime |
| No MFA on root account | Enable MFA immediately; lock the root account away |
| CloudTrail disabled | Enforce via SCP — it must be non-negotiable |
| Security groups as the only security layer | Layer WAF, NACLs, VPC endpoints, and IAM policies |

## Best Practices

- Assume breach — design with scoped policies and account isolation to limit blast radius
- Use temporary STS credentials everywhere — no long-lived access keys for any workload
- Automate security checks in CI/CD with CDK Nag, Checkov, or cfn-guard
- Centralise GuardDuty, Security Hub, and CloudTrail findings in a dedicated security account
- Tag sensitive resources to enable tag-based access control and compliance enforcement
