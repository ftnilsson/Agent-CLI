# State Management

## Description

Choose, structure, and maintain application state in frontend applications — from local component state to global stores, URL state, and server-cache state. This skill covers the universal patterns that work across React, Vue, Svelte, Angular, and similar frameworks: when to use which type of state, how to keep it normalised, and how to avoid the most common state-related bugs.

## When To Use

- Deciding where a piece of data should live (component, context, store, URL, server)
- Implementing a feature that requires shared state across distant components
- Debugging stale, duplicated, or inconsistent UI state
- Evaluating whether to introduce a state management library
- Refactoring an application where "everything is global"

## Prerequisites

- Understanding of component architecture and data flow (props down, events up)
- Familiarity with at least one component framework

## Instructions

### 1. Classify Your State

Not all state is equal. Before choosing a tool, classify what you're storing:

| Type | Lifetime | Examples | Typical home |
|------|----------|----------|--------------|
| **Local / UI** | Single component | Open/closed toggle, input value, hover | Component state |
| **Shared / App** | Multiple components | Current user, theme, feature flags | Context / store |
| **Server / Remote** | Backend-owned, cached | API responses, paginated lists | Cache layer (React Query, SWR, Apollo) |
| **URL** | Persisted in address bar | Filters, pagination, selected tab | Router / query params |
| **Form** | Duration of a form session | Field values, validation errors, dirty flags | Form library or local state |

**Rule of thumb:** Start with the narrowest scope that works. Promote state to a wider scope only when two or more unrelated components need it.

### 2. Keep Server State in a Cache Layer

The single biggest improvement most apps can make: **stop putting API data in global stores.** Use a dedicated server-state cache instead.

Benefits:
- Automatic background refetching and stale-while-revalidate
- Deduplication of identical requests
- Built-in loading/error states
- Cache invalidation tied to mutations

This eliminates an entire class of bugs: stale data, missing loading states, and manual cache synchronisation.

### 3. Normalise Shared State

When you do need a global store, normalise it like a database:

```
// ❌ Nested / denormalised
{ orders: [{ id: 1, customer: { id: 5, name: "Alice" } }] }

// ✅ Normalised
{
  orders: { byId: { 1: { id: 1, customerId: 5 } } },
  customers: { byId: { 5: { id: 5, name: "Alice" } } }
}
```

**Why:** A single source of truth per entity prevents inconsistency when the same data appears in multiple views.

### 4. Derive, Don't Duplicate

If a value can be computed from existing state, compute it — don't store it separately.

```
// ❌ Stored redundantly
state.items = [...]
state.itemCount = 3        // must be kept in sync manually

// ✅ Derived
const itemCount = computed(() => state.items.length)
```

Derived state can never be out of sync because it has no independent storage.

### 5. Use the URL as State

Filters, search queries, pagination, selected tabs, and modal-open flags often belong in the URL:

- Users can bookmark and share the exact view
- Browser back/forward works as expected
- Deep linking works out of the box

Sync URL ↔ component state, and treat the URL as the source of truth for navigational state.

### 6. Minimise State Surface Area

Before adding state, ask:
1. Can I derive it from existing state?
2. Can I get it from the URL?
3. Can I re-fetch it from the server when needed?
4. Does more than one component actually need it?

If all answers are no, it's local component state. Don't promote it.

## Best Practices

- **Collocate state with the UI that uses it.** Move it up only when sharing is required.
- **Keep store actions/mutations coarse-grained.** One action per user intent (e.g., `checkout`) not per field (`setAddress`, `setCity`, `setZip`).
- **Make state updates immutable** (or use libraries that handle immutability for you). Mutation-based bugs are among the hardest to trace.
- **Name state by what it represents, not how it's used.** `currentUser` not `headerData`.
- **Use selectors/getters to encapsulate access.** Components should not know the internal shape of the store.
- **Treat loading and error as first-class states.** Every piece of async state has at least three states: idle, loading, error, success. Model all of them.

## Common Pitfalls

- **Global by default.** Putting everything in a store "just in case" creates a monolith of coupled state that's hard to reason about and test.
- **Mixing server and client state.** Storing fetched API data in the same store as UI toggles leads to manual (and buggy) synchronisation logic.
- **Stale closures.** In frameworks with hooks/closures, referencing state inside callbacks without proper dependency tracking returns outdated values. Understand your framework's reactivity model.
- **State shape coupled to API shape.** Transform API responses into the shape your UI needs at the boundary. Don't let backend schema changes cascade through your components.
- **Over-rendering.** Subscribing an entire component tree to a large store causes unnecessary re-renders. Subscribe to the narrowest slice needed.
- **Missing optimistic updates.** Waiting for server confirmation before updating the UI makes interactions feel sluggish. Apply the change immediately and roll back on failure.

## Reference

- [Patterns.dev — State Management](https://www.patterns.dev/)
- [TkDodo's Blog — Practical React Query](https://tkdodo.eu/blog/practical-react-query)
- [XState — State Machines for UI](https://stately.ai/docs)
