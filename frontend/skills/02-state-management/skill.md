# State Management

## State Classification

Classify every piece of state before choosing where it lives:

| Type | Lifetime | Examples | Home |
|------|----------|----------|------|
| **Local / UI** | Single component | Toggle open/closed, hover, input value | Component state |
| **Shared / App** | Multiple components | Current user, theme, feature flags | Context / store |
| **Server / Remote** | Backend-owned, cached | API responses, paginated lists | Cache layer (React Query, SWR, Apollo) |
| **URL** | Persisted in address bar | Filters, pagination, selected tab | Router / query params |
| **Form** | Duration of a form session | Field values, validation errors, dirty flags | Form library or local state |

Start with the narrowest scope that works. Promote state upward only when two or more unrelated components need it.

## Server State

- Never put API data in a global store. Use a dedicated server-state cache instead.
- A cache layer provides automatic background refetching, deduplication, built-in loading/error states, and cache invalidation tied to mutations.
- Mixing server state and UI state in the same store creates manual, error-prone synchronisation logic.

## Store Shape

Normalise global stores like a database — one source of truth per entity:

```
// Normalised (correct)
{
  orders:    { byId: { 1: { id: 1, customerId: 5 } } },
  customers: { byId: { 5: { id: 5, name: "Alice" } } }
}

// Denormalised (avoid)
{ orders: [{ id: 1, customer: { id: 5, name: "Alice" } }] }
```

## Derived State

Never store a value that can be computed from existing state:

```
// Correct — derived, never out of sync
const itemCount = computed(() => state.items.length)

// Wrong — must be kept in sync manually
state.itemCount = 3
```

## URL as State

Treat the URL as the source of truth for navigational state. Store filters, search queries, pagination, selected tabs, and modal-open flags in query params so users can bookmark and share the exact view and browser back/forward works as expected.

## Before Adding State

Ask in order:
1. Can I derive it from existing state?
2. Can I get it from the URL?
3. Can I re-fetch it from the server when needed?
4. Does more than one component actually need it?

If all answers are no, it belongs in local component state.

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Everything in a global store by default | Collocate state; promote only when sharing is required |
| API data stored alongside UI toggles | Separate server state into a cache layer |
| State shape mirrors API shape | Transform at the boundary; isolate from backend schema changes |
| Storing computed values (`itemCount`) | Derive with computed/selector |
| Components subscribe to entire store | Subscribe to the narrowest slice needed |
| Waiting for server confirmation before updating UI | Apply optimistic update; roll back on failure |

## Best Practices

- Collocate state with the UI that uses it; lift only when sharing is required.
- Keep store actions coarse-grained: one action per user intent (`checkout`), not per field (`setCity`, `setZip`).
- Make state updates immutable, or use a library that enforces immutability.
- Name state by what it represents, not how it is used: `currentUser` not `headerData`.
- Use selectors or getters to encapsulate store access — components must not depend on internal store shape.
- Model all async states explicitly: idle, loading, error, success.
- Understand your framework's reactivity model to avoid stale-closure bugs in callbacks.
- Treat form state separately from application state — form libraries handle field lifecycle better than general stores.
