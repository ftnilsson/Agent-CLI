# Authentication & Authorisation

## Authentication Method Selection

- Use JWT via OAuth 2.0 / OIDC for end-user-facing APIs (browser, mobile)
- Use IAM roles or managed identities for internal service-to-service calls within the same cloud account — no secrets required
- Use OAuth 2.0 Client Credentials for machine-to-machine calls across organisational boundaries
- Use API keys for rate limiting and client identification only — never as the sole authentication mechanism
- Use webhook signature verification (HMAC) to authenticate inbound webhook payloads from external systems

## JWT Validation

- Validate the JWT signature using the issuer's public key fetched from the JWKS endpoint
- Always verify all of: signature, `exp` (expiration), `aud` (audience matches this API), `iss` (issuer matches your identity provider), and `alg` (must be RS256 or ES256 — never accept `none`)
- Cache JWKS signing keys in module scope with a TTL of 5–10 minutes — do not fetch on every invocation
- Extract authorisation claims (`sub`, `roles`, `permissions`, `tenantId`) from validated tokens only

```typescript
// Module scope — JWKS client cached across warm invocations
const jwksClient = jwksRsa({
  jwksUri: `https://${process.env.AUTH_DOMAIN}/.well-known/jwks.json`,
  cache: true,
  cacheMaxAge: 600_000,
});
```

## Gateway Authorisers

- Run JWT validation in a dedicated authoriser function at the gateway — handler functions receive pre-validated user context and skip re-validation
- Cache authoriser results at the gateway for 300 seconds to avoid re-validating the same token on every request
- Pass user context (userId, tenantId, roles) from the authoriser to handler functions via request context, not via re-parsing the token
- Enforce authorisation (permissions, ownership) inside the handler function — the authoriser only establishes identity

## Authorisation Patterns

- Apply role-based access control (RBAC) by mapping roles to permission sets and checking permissions inside handlers
- Perform resource ownership checks: verify the requesting user owns or has rights to the specific resource, not just the resource type
- In multi-tenant systems, always extract `tenantId` from the validated JWT — never from the request path, query string, or body
- Scope every database query to the authenticated tenant ID

## Identity in Event-Driven Systems

- Propagate actor identity (userId, tenantId, roles) in event message attributes when publishing to queues or topics
- Apply authorisation checks in async handlers — queue processors are not exempt because they are "internal"
- Use propagated identity for audit logging and downstream authorisation decisions in processor functions

## API Key Management

- Rotate API keys without downtime: generate the new key, update clients to use it, verify traffic, then revoke the old key
- Support multiple active API keys during rotation windows
- Never treat API keys as user authentication — always pair with a JWT or other user identity mechanism

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| API key as sole authentication | API keys identify applications; pair with JWT for user identity |
| Verifying JWT signature but not `aud` or `iss` claims | Validate all mandatory claims — signature alone is insufficient |
| Hardcoded secrets, signing keys, or client credentials in source code | Use a secrets manager; load at runtime from environment or vault |
| `tenantId` accepted from the request path or body | Always extract `tenantId` from the validated JWT |
| No authorisation checks in async queue or event handlers | Apply the same permission and ownership checks in all handlers |
| Fetching JWKS on every function invocation | Cache JWKS keys in module scope with a TTL |

## Best Practices

- Validate identity at the gateway; enforce authorisation (permissions, ownership) inside handler functions
- Use managed identities and IAM roles for all internal cloud service-to-service calls — zero secrets
- Cache JWKS keys in module scope to avoid per-invocation network calls to the identity provider
- Never log `Authorization` headers, tokens, or any credential values
- Issue short-lived access tokens (5–60 minutes); use refresh tokens for longevity
- Propagate actor identity through event metadata for audit trails and downstream authorisation
- Scope every database query to the authenticated tenantId in multi-tenant systems
- Test authorisation paths explicitly: missing token, expired token, wrong audience, wrong tenant
