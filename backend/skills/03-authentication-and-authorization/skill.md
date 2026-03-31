# Authentication & Authorisation

## Choosing an Auth Strategy

| Strategy | Best for | Notes |
|----------|----------|-------|
| **OAuth 2.0 + OIDC** | Most apps, external IdP | Delegate to identity provider; receive ID + access tokens |
| **Session cookies** | Server-rendered apps | Server stores session state; client holds a cookie |
| **API keys** | Service-to-service, CLIs | Static secret per request; not for end-users |
| **mTLS** | Infrastructure, service mesh | Both sides present certificates |

Use OAuth 2.0 with Authorization Code + PKCE via an established identity provider (Entra ID, Auth0, Cognito) for most applications. Do not build your own identity system.

Keep authentication (who are you?) and authorisation (what can you do?) separate — they are distinct concerns enforced at different layers.

## JWT Validation

Validate every inbound token on every request:

1. Verify the signature against the IdP's public key (JWKS endpoint)
2. Check `exp` — reject expired tokens
3. Check `iss` — must match your expected issuer
4. Check `aud` — must match your API's identifier
5. Check `nbf` — reject tokens not yet valid

Critical rules:
- Never trust JWT claims without signature verification — a JWT is just base64 until the signature is checked
- Use asymmetric signing (RS256 / ES256) so API servers verify with a public key and never hold the private key
- Use short-lived access tokens (5–15 min) with longer-lived refresh tokens
- Store refresh tokens in `httpOnly`, `secure`, `sameSite=strict` cookies in browsers — never in `localStorage`

## Token Storage by Context

| Context | Access token | Refresh token |
|---------|-------------|---------------|
| Browser (SPA) | Memory only | `httpOnly` `secure` `sameSite=strict` cookie |
| Browser (SSR) | `httpOnly` `secure` cookie | `httpOnly` `secure` cookie |
| Mobile app | Secure enclave / Keychain | Secure enclave / Keychain |
| Server-to-server | Environment variable or secret manager | N/A — use client credentials flow |

## Authorisation with RBAC

Define permissions as granular actions (`orders:read`, `orders:write`, `users:admin`), group them into roles, assign roles to users. Check permissions in code — not roles:

```
// ❌ Fragile — roles change
if (user.role === 'admin') { ... }

// ✅ Stable — permissions are explicit
if (user.permissions.includes('orders:delete')) { ... }
```

Middleware pattern:

```
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({ error: "Forbidden" })
    }
    next()
  }
}

app.delete("/orders/:id", requirePermission("orders:delete"), handleDelete)
```

For fine-grained rules use attribute-based policies: `user.role == "editor" AND resource.author_id == user.id`.

## Auth Error Responses

| Situation | Status | Message |
|-----------|--------|---------|
| No token provided | `401` | `"Authentication required"` |
| Token expired | `401` | `"Token expired"` |
| Token invalid / tampered | `401` | `"Invalid token"` |
| Valid token, wrong permissions | `403` | `"Insufficient permissions"` |
| Resource exists but user can't see it | `404` | `"Not found"` — don't leak existence |

Do not distinguish between "user not found" and "wrong password" on login — it enables user enumeration.

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Rolling your own JWT signing or password hashing | Use `bcrypt`/`argon2` for passwords, `jose`/`jsonwebtoken` for JWTs |
| Checking `user.role === 'admin'` in code | Check granular permissions instead |
| Token in URL query parameters | Use the `Authorization: Bearer <token>` header |
| `localStorage` for tokens | Use `httpOnly` cookies or in-memory storage |
| `Access-Control-Allow-Origin: *` with credentials | Allowlist specific trusted origins |
| No token revocation strategy | Use a token blocklist or very short token lifetimes |
| No rate limiting on login/register endpoints | Add rate limiting and lockout policies |

## Best Practices

- Enforce HTTPS everywhere — tokens over HTTP are plaintext credentials
- Log all auth events: login, logout, failed attempts, token refresh, and permission denials
- Apply least privilege — users and services get the minimum permissions required; start with none and add explicitly
- Verify ownership at every endpoint — `GET /orders/:id/invoices` must check the order belongs to the requesting user
- Rate-limit authentication endpoints (login, register, password reset) — they are brute-force targets
- Implement transparent token refresh — access tokens should renew automatically without user interaction
- Rotate signing keys regularly — use JWKS key IDs so rotation is possible without downtime
