# Security Audit

Audit the following backend code for security vulnerabilities and best practices.

## Check For

1. **Injection** — SQL injection, NoSQL injection, command injection, template injection. Are queries parameterised?
2. **Authentication** — Are credentials hashed with bcrypt/argon2? Are JWTs validated correctly (algorithm, expiry, issuer)?
3. **Authorisation** — Is access control enforced at the right layer? Are there IDOR vulnerabilities (can user A access user B's data)?
4. **Input validation** — Are all inputs validated on the server side? Are file uploads restricted by type and size?
5. **Secrets management** — Are secrets hardcoded or logged? Are they loaded from environment variables or a vault?
6. **CORS** — Is the CORS policy restrictive enough? Are credentials allowed from wildcard origins?
7. **Rate limiting** — Are sensitive endpoints (login, password reset) rate-limited?
8. **Error exposure** — Do error responses leak stack traces, database details, or internal paths?
9. **Dependencies** — Are there known vulnerabilities in dependencies?
10. **HTTPS** — Is all communication over TLS? Are secure cookie flags set (HttpOnly, Secure, SameSite)?

## Output Format

For each finding:

- **Location**: File/function
- **Severity**: 🔴 Critical / 🟡 Medium / 🟢 Low
- **CWE**: If applicable (e.g., CWE-89 SQL Injection)
- **Issue**: Description
- **Fix**: Code example showing the secure approach
