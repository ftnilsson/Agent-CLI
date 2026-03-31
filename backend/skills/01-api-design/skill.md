# API Design

## Resource and URL Design

Model resources as nouns, not verbs. The HTTP method provides the verb.

```
# ❌ Procedure-oriented
POST /createUser
POST /getOrders

# ✅ Resource-oriented
POST   /users
GET    /users/:id
PATCH  /users/:id
DELETE /users/:id
GET    /users
```

For operations that don't map to CRUD, use action sub-resources:

```
POST /orders/:id/cancel
POST /users/:id/verify-email
```

URL conventions:
- Use **plural nouns** for collections: `/users`, `/orders`
- Use **kebab-case** for multi-word segments: `/order-items`
- Reflect ownership in hierarchy: `/users/:userId/orders/:orderId`
- Limit nesting to 2 levels — flatten deeper paths to `/order-items/:id/reviews`
- Use query parameters for filtering, sorting, pagination: `GET /products?category=electronics&sort=-price&limit=20`

## HTTP Methods and Status Codes

| Method | Semantics | Idempotent |
|--------|-----------|------------|
| `GET` | Read | Yes |
| `POST` | Create / trigger action | No |
| `PUT` | Full replace | Yes |
| `PATCH` | Partial update | Yes* |
| `DELETE` | Remove | Yes |

| Code | When to use |
|------|-------------|
| `200 OK` | Successful read, update, or action |
| `201 Created` | Resource created — include `Location` header |
| `204 No Content` | Successful delete or update with no body |
| `400 Bad Request` | Validation failure, malformed input |
| `401 Unauthorized` | Missing or invalid authentication |
| `403 Forbidden` | Authenticated but not authorised |
| `404 Not Found` | Resource doesn't exist |
| `409 Conflict` | State conflict (duplicate, version mismatch) |
| `422 Unprocessable Entity` | Semantically invalid input |
| `429 Too Many Requests` | Rate-limited — include `Retry-After` header |
| `500 Internal Server Error` | Unhandled server failure |

## Error Response Format

Use a consistent structure for every error:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      { "field": "email", "message": "Must be a valid email address" },
      { "field": "age", "message": "Must be at least 18" }
    ]
  }
}
```

- `code` — machine-readable, for client-side branching
- `message` — human-readable, for debugging
- `details` — field-level validation errors
- Never return `200` with an error body
- Never expose stack traces or internal IDs in production

## Pagination

Paginate every collection endpoint from day one.

**Cursor-based (preferred for large/real-time datasets):**
```json
{ "data": [...], "pagination": { "nextCursor": "eyJpZCI6MTAwfQ==", "hasMore": true } }
```

**Offset-based (simpler, fine for smaller datasets):**
```json
{ "data": [...], "pagination": { "page": 2, "limit": 20, "total": 142 } }
```

Set a default and maximum `limit` (e.g., default 20, max 100). Always return pagination metadata. Prefer cursor-based to avoid offset drift on live data.

## Versioning

| Strategy | Example | Trade-off |
|----------|---------|-----------|
| **URL prefix** | `/v1/users` | Simple, explicit, easy to route |
| **Header** | `Accept: application/vnd.api+json;version=2` | Cleaner URLs, harder to test in browser |
| **Query param** | `/users?version=2` | Feels wrong for non-optional state |

Prefer URL prefix. Increment the version only for breaking changes (field removal, type changes, behavioural changes). Additive changes (new optional fields, new endpoints) don't require a new version.

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Nested resources beyond 2 levels | Flatten to `/order-items/:id/reviews` |
| `200 OK` with error body | Use `400`/`422` status codes |
| Mixing `camelCase` and `snake_case` | Pick one convention and enforce it everywhere |
| No pagination on list endpoints | Add cursor or offset pagination from day one |
| Exposing DB column names or auto-increment IDs | Use UUIDs and a stable response DTO |
| `PUT` to update a single field | Use `PATCH` for partial updates |
| Removing fields without deprecation | Deprecate first, remove after a migration window |

## Best Practices

- Be consistent above all — a consistently "wrong" API is easier to use than an inconsistently "right" one
- Return the created/updated resource in the response body — saves clients a follow-up `GET`
- Use `ETag` and `If-Match` for optimistic concurrency on concurrent updates
- Accept and return UTC timestamps in ISO 8601: `2025-02-14T10:30:00Z`
- Rate-limit all endpoints and return `429` with `Retry-After`
- Accept an idempotency key header for non-idempotent `POST` operations
- Use standard HTTP headers (`Content-Type`, `Authorization`, `Cache-Control`) — don't invent custom ones
- Document with OpenAPI/Swagger — include request/response examples, auth requirements, and rate limit details
