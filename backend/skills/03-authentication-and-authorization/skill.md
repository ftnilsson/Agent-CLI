# Authentication & Authorisation

## Description

Implement secure identity verification (authentication — *who are you?*) and access control (authorisation — *what can you do?*) in backend systems. This skill covers the universal patterns and protocols that apply regardless of language or framework: token-based auth, OAuth 2.0 / OIDC, session management, role and policy-based access control, and the security practices that prevent the most common auth vulnerabilities.

## When To Use

- Adding login/signup to an application
- Integrating with an identity provider (Entra ID, Auth0, Cognito, Firebase Auth)
- Protecting API endpoints with token validation
- Implementing role-based or permission-based access control
- Reviewing auth-related code for security issues
- Choosing between session-based and token-based authentication

## Prerequisites

- Understanding of HTTP request/response lifecycle and headers
- Basic knowledge of cryptography concepts (hashing, signing, asymmetric keys)
- Familiarity with your server framework's middleware/filter model

## Instructions

### 1. Understand the Auth Flow

**Authentication** verifies identity. **Authorisation** controls access. They are separate concerns:

```
Client  →  Login (credentials)  →  Auth Server  →  Token issued
Client  →  Request + Token      →  API Server   →  1. Validate token (authn)
                                                     2. Check permissions (authz)
                                                     3. Return resource or 403
```

**Never mix them.** A user can be authenticated (valid token) but not authorised (lacks the required permission).

### 2. Choose an Authentication Strategy

| Strategy | Best for | How it works |
|----------|----------|-------------|
| **OAuth 2.0 + OIDC** | Most apps, especially with external IdP | Delegate auth to identity provider. Receive ID + access tokens. |
| **Session cookies** | Traditional server-rendered apps | Server stores session state, client holds a cookie. |
| **API keys** | Service-to-service, CLI tools | Static secret sent with each request. Not for end-users. |
| **mTLS** | Infrastructure, service mesh | Both client and server present certificates. |

**For most applications:** Use OAuth 2.0 with Authorization Code + PKCE flow via an established identity provider. Don't build your own identity system unless you have a strong reason.

### 3. Implement Token-Based Auth Correctly

If using JWTs (JSON Web Tokens):

**Token structure:**
```
Header.Payload.Signature
```

**Validation checklist (every request):**
1. Verify the signature using the IdP's public key (JWKS endpoint)
2. Check `exp` — reject expired tokens
3. Check `iss` — must match your expected issuer
4. Check `aud` — must match your API's identifier
5. Check `nbf` — not valid before this time

**Critical rules:**
- **Never trust claims without signature verification.** A JWT is just a base64 string; its value lies in the signature.
- **Use short-lived access tokens** (5–15 minutes) with longer-lived refresh tokens.
- **Store refresh tokens securely** — `httpOnly`, `secure`, `sameSite` cookies for browsers. Never in localStorage.
- **Use asymmetric signing** (RS256 / ES256) so API servers verify with a public key and never see the private key.

### 4. Implement Authorisation with RBAC or ABAC

**Role-Based Access Control (RBAC):**
```
User → Role(s) → Permission(s) → Resource action

admin    → [create, read, update, delete] on all resources
editor   → [create, read, update] on content
viewer   → [read] on published content
```

**Attribute-Based Access Control (ABAC) / Policy-Based:**
```
Allow if:
  user.role == "editor"
  AND resource.status == "draft"
  AND resource.author_id == user.id
```

**Practical approach:**
1. Define **permissions** as granular actions: `orders:read`, `orders:write`, `users:admin`
2. Group permissions into **roles**: `order-manager = [orders:read, orders:write]`
3. Assign roles to users
4. Check permissions (not roles) in your code — this lets you restructure roles without changing endpoints

```
// Middleware / guard pattern (pseudocode)
function requirePermission(permission) {
  return (request, response, next) => {
    if (!request.user.permissions.includes(permission)) {
      return response.status(403).json({ error: "Forbidden" })
    }
    next()
  }
}

// Usage
app.delete("/orders/:id", requirePermission("orders:delete"), handleDelete)
```

### 5. Secure Session and Token Storage

| Context | Store access token in | Store refresh token in |
|---------|----------------------|----------------------|
| **Browser (SPA)** | Memory (variable) | `httpOnly`, `secure`, `sameSite=strict` cookie |
| **Browser (SSR)** | `httpOnly`, `secure` cookie | `httpOnly`, `secure` cookie |
| **Mobile app** | Secure enclave / Keychain | Secure enclave / Keychain |
| **Server-to-server** | Environment variable or secret manager | N/A (use client credentials flow) |

**Never store tokens in localStorage or sessionStorage.** They're accessible to any JavaScript on the page, including XSS payloads.

### 6. Handle Auth Errors Properly

| Situation | Status code | Response |
|-----------|-------------|----------|
| No token provided | 401 Unauthorized | `{ "error": "Authentication required" }` |
| Token expired | 401 Unauthorized | `{ "error": "Token expired" }` |
| Token invalid | 401 Unauthorized | `{ "error": "Invalid token" }` |
| Valid token, insufficient permissions | 403 Forbidden | `{ "error": "Insufficient permissions" }` |
| Resource exists but user can't see it | 404 Not Found | `{ "error": "Not found" }` ← Don't leak existence |

**Important:** Don't distinguish between "user not found" and "wrong password" on login — it enables user enumeration.

## Best Practices

- **Use an established identity provider.** Building auth from scratch means building password storage, MFA, account recovery, brute-force protection, and session management. Use Entra ID, Auth0, Cognito, or similar.
- **Enforce HTTPS everywhere.** Tokens over HTTP are plaintext credentials. No exceptions.
- **Implement token refresh transparently.** The client should refresh expired access tokens automatically using the refresh token without user interaction.
- **Log authentication events.** Login, logout, failed attempts, token refresh, and permission denials should all be auditable.
- **Apply the principle of least privilege.** Users and services get the minimum permissions required. Start with none and add explicitly.
- **Rate-limit authentication endpoints.** Login, registration, and password reset are primary targets for brute-force attacks.
- **Rotate secrets and keys regularly.** Signing keys, API keys, and client secrets should be rotatable without downtime (JWKS supports this via key IDs).

## Common Pitfalls

- **Rolling your own crypto.** Don't implement JWT signing, password hashing, or encryption yourself. Use well-tested libraries (bcrypt/argon2 for passwords, jose/jsonwebtoken for JWTs).
- **Checking roles instead of permissions.** `if (user.role === 'admin')` is brittle. Roles change; permissions are stable. Check `user.can('orders:delete')`.
- **Missing authorisation on related resources.** User A is authorised to view their orders, but `GET /orders/{id}/invoices` doesn't check that the order belongs to User A. Always verify ownership at every endpoint.
- **Token in URL query parameters.** Tokens in URLs get logged by proxies, browsers, and analytics. Use the `Authorization` header.
- **No token revocation strategy.** If a user's account is compromised, you need a way to invalidate their tokens before expiry. Use a token blocklist or very short token lifetimes.
- **CORS misconfiguration.** `Access-Control-Allow-Origin: *` with `credentials: true` is a security hole. Allowlist specific origins.

## Reference

- [OAuth 2.0 Simplified](https://www.oauth.com/)
- [OpenID Connect Specification](https://openid.net/specs/openid-connect-core-1_0.html)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [JWT.io — Debugger and Libraries](https://jwt.io/)
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
