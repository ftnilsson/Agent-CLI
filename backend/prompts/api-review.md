# API Design Review

Review the following API endpoint(s) for design quality, consistency, and best practices.

## Check For

1. **RESTful conventions** — Are HTTP methods, status codes, and URL patterns used correctly?
2. **Naming** — Are resource names plural nouns? Are URL segments kebab-case?
3. **Request validation** — Are inputs validated and sanitised before processing? Are validation errors returned as 400 with details?
4. **Response shape** — Is the response structure consistent? Are envelope patterns used correctly (data, error, pagination)?
5. **Error handling** — Are errors returned with appropriate status codes and machine-readable error codes?
6. **Pagination** — Are list endpoints paginated? Is the pagination approach consistent (cursor vs offset)?
7. **Idempotency** — Are POST/PUT operations idempotent where they should be? Is there idempotency key support?
8. **Versioning** — Is the API versioned? Will changes break existing clients?
9. **Documentation** — Are endpoints documented with request/response examples?

## Output Format

For each finding:

- **Endpoint**: `METHOD /path`
- **Severity**: 🔴 Breaking / 🟡 Improvement / 🟢 Suggestion
- **Issue**: Description
- **Fix**: Recommended change with example
