# API Gateway & HTTP APIs

## Route Design

- Map one function per HTTP route for independent scaling, deployment, and permissions
- Consolidate into a single router function only when per-route scaling is unnecessary and function count becomes a maintenance burden
- Use cursor-based pagination for all collection endpoints — offset pagination is expensive on serverless-native databases
- Include a request ID in every response for tracing and support

## Request Validation

- Validate at the gateway level to reject malformed requests before invoking a function (saves cost and compute)
- Always re-validate inside the function regardless of gateway validation — treat gateway validation as an optimisation, not a guarantee
- Use a schema validation library (zod, joi, JSON Schema) inside the handler
- Return 400 with structured field-level error details on validation failure, never a generic message

## Response Format

- Use a consistent envelope across all endpoints: `{ "data": ... }` for success, `{ "error": { "code", "message", "requestId" } }` for errors
- Never return raw objects, arrays without a wrapper, or plain strings as top-level response bodies
- Return correct HTTP status codes: 200 OK, 201 Created, 400 Validation, 401 Unauthenticated, 403 Forbidden, 404 Not Found, 409 Conflict, 429 Throttled, 500 Internal

```typescript
function withErrorHandling(handler: ApiHandler): ApiHandler {
  return async (event) => {
    const requestId = event.requestContext.requestId;
    try {
      return await handler(event);
    } catch (error) {
      if (error instanceof ValidationError)
        return response(400, { error: { code: 'VALIDATION_ERROR', message: error.message, requestId } });
      if (error instanceof NotFoundError)
        return response(404, { error: { code: 'NOT_FOUND', message: error.message, requestId } });
      console.error('Unhandled error', { requestId, error });
      return response(500, { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred', requestId } });
    }
  };
}
```

## Rate Limiting & Throttling

- Set a global API-level throttle to protect all downstream functions and databases
- Apply per-client throttling using API keys and usage plans for fair multi-tenant usage
- Apply per-route throttling for expensive operations (writes, payment endpoints)
- Return `429 Too Many Requests` with `Retry-After`, `X-RateLimit-Limit`, and `X-RateLimit-Reset` headers
- Set reserved concurrency on downstream functions to prevent a traffic spike from exhausting account-level limits

## CORS

- Configure CORS at the gateway level — do not add CORS headers inside individual functions
- Never use `allowOrigins: *` in production; list specific allowed origins explicitly
- Handle OPTIONS preflight requests at the gateway without invoking a function
- Set `maxAge` on preflight cache (e.g. 86400 seconds) to reduce redundant OPTIONS requests

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| No request validation — trusting client input directly | Validate at gateway and again inside the function |
| Returning stack traces or raw exception messages to clients | Log full details server-side; return a generic message with a request ID |
| `allowOrigins: *` in production CORS config | List specific allowed origins |
| No rate limiting on any route | Configure global and per-route throttling at the gateway |
| Offset-based pagination (`LIMIT x OFFSET y`) | Use cursor/token-based pagination |
| CORS headers added in every function handler | Configure CORS once at the gateway |

## Best Practices

- Validate requests at the gateway to save cost, and validate again in the function for correctness
- Use a consistent `{ data }` / `{ error }` response envelope on every endpoint
- Handle CORS and OPTIONS preflight entirely at the gateway
- Use cursor-based pagination for all collection endpoints
- Include a request ID in every response body for end-to-end tracing
- Configure global, per-client, and per-route throttling
- Wrap all handlers in error-handling middleware that maps domain exceptions to HTTP status codes
- Never expose stack traces, internal error details, or database error messages to clients
