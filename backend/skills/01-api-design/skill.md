# API Design# API Design










































































































































































- [JSON:API Specification](https://jsonapi.org/)- [OpenAPI Specification](https://spec.openapis.org/oas/latest.html)- [Zalando RESTful API Guidelines](https://opensource.zalando.com/restful-api-guidelines/)- [Google API Design Guide](https://cloud.google.com/apis/design)- [Microsoft REST API Guidelines](https://github.com/microsoft/api-guidelines)## Reference- **No request validation.** Accepting malformed input and failing deep in the business logic produces confusing errors. Validate at the API boundary and return clear 400/422 responses.- **Missing content negotiation.** Not handling `Accept` headers or always returning JSON even when the client asks for something else.- **Ignoring backwards compatibility.** Removing a response field that any consumer depends on is a production incident. Deprecate first, remove later.- **Chatty APIs.** Requiring 5 requests to render a single page is a design problem. Consider composite endpoints or GraphQL for read-heavy UIs.- **Exposing internal IDs and structure.** Database column names, internal enums, and auto-increment IDs leak implementation details. Use UUIDs and map to a stable external schema.- **Inconsistent naming.** `user_name` in one endpoint, `userName` in another, `UserName` in a third. Pick a convention and enforce it.## Common Pitfalls- **Support filtering and sorting on list endpoints.** `GET /orders?status=active&sort=-createdAt`- **Rate limit all endpoints** and return `429 Too Many Requests` with `Retry-After` header.- **Use `PATCH` for partial updates, `PUT` for full replacement.** Don't use `PUT` to update a single field.- **Return created resources.** `POST /orders` should return the created order with its ID, not just `201 Created` with an empty body.- **Make APIs idempotent.** `PUT` and `DELETE` should be safe to retry. For non-idempotent `POST`, accept an idempotency key.- **Use standard HTTP headers.** `Content-Type`, `Accept`, `Authorization`, `ETag`, `Cache-Control`, `Retry-After` — don't invent custom headers for things HTTP already handles.## Best Practices- **Changelog** (what changed in each version)- **Rate limiting policy** (limits, headers, retry guidance)- **Authentication instructions** (how to get a token, where to put it)- **Request/response examples** for every endpoint (happy path + key error cases)- **OpenAPI / Swagger spec** generated from code annotations or maintained alongsideAn undocumented API is an unusable API. Minimum viable documentation:### 6. Document as You BuildPick one strategy for the whole API. Maintain the old version for a documented deprecation period.| **Query param** | `?version=2` | Easy to test, but pollutes the URL || **Header** | `Accept: application/vnd.api+json; version=2` | Clean URLs, harder to test in browser || **URL path** | `/v2/orders` | Simple, visible, but hard to evolve individual endpoints ||----------|---------|------------|| Strategy | Example | Trade-offs |When a breaking change is unavoidable:- Changing field types ❌ (breaking)- Removing or renaming fields ❌ (breaking)- Adding new endpoints ✅ (non-breaking)- Adding new optional query parameters ✅ (non-breaking)- Adding new fields to responses ✅ (non-breaking)**Prefer evolution over versioning.** Most changes can be additive (non-breaking):### 5. Version Thoughtfully- **Set a default and maximum page size** (e.g., default 20, max 100)- **Always return the pagination metadata** in the response- **Cursor-based** is more performant (no `OFFSET` scan) and stable when data changes```→ { "data": [...], "pagination": { "total": 500, "limit": 20, "offset": 40 } }GET /orders?limit=20&offset=40```**Offset-based (simpler, but poor for large datasets):**```→ { "data": [...], "pagination": { "nextCursor": "eyJpZCI6MTIwfQ", "hasMore": true } }GET /orders?limit=20&cursor=eyJpZCI6MTAwfQ```**Cursor-based (recommended for most cases):**Any endpoint that returns a list will eventually return too many items. Design for it upfront:### 4. Implement Pagination from Day One- **Include a human-readable message** for debugging and logs.- **Include a machine-readable code** (not just the HTTP status) for client-side branching.- **Never return 200 with an error body.** Status codes exist for a reason.| 5xx | Server error | 500 Internal Server Error, 502 Bad Gateway, 503 Service Unavailable || 4xx | Client error | 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 422 Unprocessable Entity, 429 Too Many Requests || 2xx | Success | 200 OK, 201 Created, 204 No Content ||-------|---------|-------------|| Range | Meaning | Common codes |**HTTP status code rules:**```}  }    ]      }        "message": "Must be at least 18."        "field": "age",      {      },        "message": "Must be a valid email address."        "field": "email",      {    "details": [    "message": "The request body is invalid.",    "code": "VALIDATION_ERROR",  "error": {{```jsonErrors are part of the API contract. Use a consistent structure:### 3. Design Error Responses Carefully**Consistency beats any individual choice.** Document the convention and lint for it.| IDs in paths | Singular resource + ID | `/users/{userId}/orders/{orderId}` || Plurals for collections | Always | `/users`, not `/user` || JSON fields | camelCase (JS convention) or snake_case (many APIs) | `{ "createdAt": "..." }` || Query params | camelCase or snake_case (pick one) | `?pageSize=20` || URL paths | lowercase, kebab-case | `/order-items` ||--------|-----------|---------|| Aspect | Convention | Example |Pick conventions and apply them everywhere:### 2. Be Consistent with Naming```POST   /payments/{id}/capture      → capture a paymentPOST   /orders/{id}/refund         → issue a refundPOST   /orders/{id}/cancel         → cancel an order```For operations that don't map cleanly to CRUD, use a **sub-resource or action endpoint:**```POST   /updateOrderPOST   /createOrderPOST   /getOrders❌ Bad — RPC-styleDELETE /orders/{id}         → delete an orderPATCH  /orders/{id}         → update an orderGET    /orders/{id}         → get one orderPOST   /orders              → create an orderGET    /orders              → list orders✅ Good — resource-oriented```APIs should expose **nouns** (resources) not **verbs** (actions). The HTTP method provides the verb:### 1. Model Resources, Not Operations## Instructions- Basic understanding of client-server architecture- Familiarity with JSON serialisation and schema concepts- Understanding of HTTP methods, status codes, and headers## Prerequisites- Integrating with third-party APIs and wrapping them in a consistent internal contract- Consumers report confusion about how to use an endpoint- Handling breaking changes to an existing API- Choosing between REST, GraphQL, gRPC, or event-based contracts- Reviewing an API PR for consistency and consumer ergonomics- Designing a new service endpoint or microservice contract## When To UseDesign, version, and evolve APIs that are consistent, discoverable, and pleasant to consume — whether REST, GraphQL, gRPC, or event-driven. This skill covers the universal API design principles that apply regardless of protocol: resource modelling, naming conventions, error handling, pagination, versioning strategy, and the documentation practices that make an API self-explanatory.## Description
## Description

Design, structure, and evolve backend APIs that are consistent, intuitive, and resilient to change — whether you're building REST, GraphQL, gRPC, or event-driven interfaces. This skill covers the universal principles that make APIs a pleasure to consume: resource modelling, URL design, request/response contracts, pagination, error handling, versioning, and documentation.

## When To Use

- Designing a new API or set of endpoints
- Reviewing an API design for consistency and usability
- Adding pagination, filtering, or sorting to a collection endpoint
- Defining error response formats
- Planning how to evolve an API without breaking existing consumers
- Choosing between REST, GraphQL, gRPC, or a hybrid approach

## Prerequisites

- Understanding of HTTP methods, status codes, and headers
- Basic client-server architecture concepts
- Familiarity with JSON and/or Protocol Buffers

## Instructions

### 1. Model Resources, Not Procedures

Think in nouns (resources) rather than verbs (actions):

```
# ❌ Procedure-oriented
POST /createUser
POST /getUserById
POST /updateUserEmail
POST /deleteUser

# ✅ Resource-oriented
POST   /users          ← Create
GET    /users/:id      ← Read
PATCH  /users/:id      ← Update
DELETE /users/:id      ← Delete
GET    /users          ← List
```

**When an operation doesn't map to CRUD**, use a sub-resource or action resource:

```
POST /orders/:id/cancel       ← Action on a resource
POST /users/:id/verify-email  ← Trigger a process
```

### 2. Design Consistent URL Patterns

Rules that make your API predictable:

- **Plural nouns** for collections: `/users`, `/orders`, `/products`
- **Kebab-case** for multi-word segments: `/order-items`, `/payment-methods`
- **Hierarchy reflects ownership**: `/users/:userId/orders/:orderId`
- **Limit nesting to 2 levels.** Beyond that, promote the resource:
  ```
  # ❌ Too deep
  /users/:id/orders/:id/items/:id/reviews

  # ✅ Flattened
  /order-items/:id/reviews
  ```
- **Use query parameters for filtering, sorting, pagination** — not path segments:
  ```
  GET /products?category=electronics&sort=-price&page=2&limit=20
  ```

### 3. Use HTTP Methods and Status Codes Correctly

| Method | Semantics | Idempotent | Request body |
|--------|-----------|------------|--------------|
| `GET` | Read | Yes | No |
| `POST` | Create / trigger action | No | Yes |
| `PUT` | Full replace | Yes | Yes |
| `PATCH` | Partial update | Yes* | Yes |
| `DELETE` | Remove | Yes | Rarely |

**Status codes that matter:**

| Code | When to use |
|------|-------------|
| `200 OK` | Successful read, update, or action |
| `201 Created` | Resource successfully created (include `Location` header) |
| `204 No Content` | Successful delete or update with no response body |
| `400 Bad Request` | Validation failure, malformed input |
| `401 Unauthorized` | Missing or invalid authentication |
| `403 Forbidden` | Authenticated but not authorised |
| `404 Not Found` | Resource doesn't exist |
| `409 Conflict` | State conflict (duplicate, version mismatch) |
| `422 Unprocessable Entity` | Semantically invalid (valid JSON, wrong business rules) |
| `429 Too Many Requests` | Rate-limited (include `Retry-After` header) |
| `500 Internal Server Error` | Unhandled server failure |

### 4. Standardise Error Responses

Every error should return a consistent structure:

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

- **Machine-readable `code`** for client logic (switch/match on it)
- **Human-readable `message`** for debugging
- **`details` array** for field-level validation errors
- **Never expose stack traces or internal IDs in production**

### 5. Implement Pagination Properly

For any collection that can grow, paginate from day one:

**Cursor-based (preferred for large/real-time datasets):**
```json
{
  "data": [...],
  "pagination": {
    "nextCursor": "eyJpZCI6MTAwfQ==",
    "hasMore": true
  }
}
```

**Offset-based (simpler, fine for smaller datasets):**
```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 142
  }
}
```

- **Always set a default and maximum `limit`** (e.g., default 20, max 100)
- **Return pagination metadata** so clients know if there's more data
- **Cursor-based avoids offset drift** when items are inserted/deleted during pagination

### 6. Version Your API

Plan for breaking changes from the start:

| Strategy | Example | Trade-off |
|----------|---------|-----------|
| **URL prefix** | `/v1/users` | Simple, explicit, easy to route |
| **Header** | `Accept: application/vnd.api+json;version=2` | Cleaner URLs, harder to test in browser |
| **Query param** | `/users?version=2` | Simple, but feels wrong for non-optional state |

**Prefer URL prefix** for simplicity. Increment the version only for breaking changes (field removal, type changes, behavioural changes). Additive changes (new optional fields, new endpoints) don't require a new version.

### 7. Document as You Build

- **OpenAPI/Swagger** for REST APIs — generate documentation, client SDKs, and server stubs from a single spec
- **Include request/response examples** for every endpoint
- **Document authentication requirements** per endpoint
- **List rate limits and quota information**
- **Provide a changelog** for version history

## Best Practices

- **Be consistent above all.** A consistently "wrong" API is easier to use than an inconsistently "correct" one.
- **Use `PATCH` for partial updates, not `PUT`.** Requiring the full resource for every update is error-prone and wasteful.
- **Return the created/updated resource** in the response body. Saves clients a follow-up `GET`.
- **Use `ETag` and `If-Match` for optimistic concurrency.** Prevents lost-update problems in concurrent environments.
- **Accept and return UTC timestamps in ISO 8601.** `2025-02-14T10:30:00Z` — no ambiguity.
- **Rate-limit aggressively.** Protect your backend and return `429` with `Retry-After`.

## Common Pitfalls

- **Nested resources for everything.** `/users/:id/orders/:id/items/:id` creates tight coupling and long URLs. Flatten beyond two levels.
- **Using `200` for errors.** If validation fails, return `400`/`422`. A `200` with `{ "success": false }` breaks HTTP-aware clients, caches, and monitoring.
- **Inconsistent naming.** Mixing `camelCase` and `snake_case`, or using `user_id` in one endpoint and `userId` in another. Pick one convention.
- **No pagination on lists.** An endpoint that returns 50,000 rows will eventually bring down your server and the client.
- **Exposing internal models directly.** Database schemas change. API contracts should be stable. Use DTOs/response models at the boundary.
- **Ignoring backwards compatibility.** Removing a field, changing a type, or altering default behaviour is a breaking change. Treat your API as a public contract.

## Reference

- [Microsoft REST API Guidelines](https://github.com/microsoft/api-guidelines)
- [Google API Design Guide](https://cloud.google.com/apis/design)
- [OpenAPI Specification](https://swagger.io/specification/)
- [JSON:API Specification](https://jsonapi.org/)
- [RFC 7807 — Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc7807)
