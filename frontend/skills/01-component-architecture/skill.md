# Component Architecture

## Component Classification

Assign every component to one of three buckets before writing any code:

| Bucket | Purpose | Examples |
|--------|---------|----------|
| **Layout** | Structural containers that arrange children | `PageShell`, `Sidebar`, `Grid` |
| **Feature** | Orchestrate data and behaviour for a use-case | `UserProfile`, `InvoiceTable` |
| **UI / Presentational** | Stateless, reusable visual building blocks | `Button`, `Avatar`, `Badge` |

## Decomposition Rules

- Give every component a single responsibility. If the answer to "what does this render?" contains "and", split it.
- Split a component when it exceeds ~200 lines, contains multiple unrelated state variables, or requires "And" in its name (`HeaderAndNavigation`).
- Prefer extracting components from working code over pre-engineering abstractions.

## Prop and Event Contracts

- Pass the minimum data needed to render — either a raw ID or a full object, never both patterns mixed.
- Emit events that describe what happened (`onItemSelected(item)`), not what the parent should do (`setParentState`).
- Avoid prop drilling beyond two levels. Use context, provide/inject, or a store instead.
- Type all props (TypeScript, PropTypes, or framework equivalent).

## Composition Over Configuration

Prefer composable slots/children over a single component with a `type` prop and branching internals:

```
<!-- Prefer this -->
<Card>
  <CardHeader><Avatar /><Title /></CardHeader>
  <CardBody>{children}</CardBody>
</Card>

<!-- Over this -->
<Card type="user | product | article" />
```

Every conditional branch inside a component is a maintenance path. Composition makes each piece independently testable.

## Logic Separation

- Extract data fetching, timers, and subscriptions into hooks, composables, or services.
- Extract formatting, validation, and calculations into plain utility functions.
- Keep components as thin shells: receive data → render UI → emit events.
- Never write business logic inside framework lifecycle hooks — it cannot be reused or unit-tested independently.

## File and Naming Conventions

```
components/
  ui/          ← presentational (Button, Input, Modal)
  layout/      ← structural (PageShell, Sidebar)
  features/    ← domain-specific (InvoiceTable, UserProfile)
```

- Name by what a component is, not where it is used: `SearchInput` not `HeaderInput`.
- One component per file in most cases.
- Co-locate styles, tests, and stories with the component they belong to.

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| 15+ props on one component | Split the component or use composition |
| `<GenericList>` before two concrete lists exist | Wait for the pattern; extract then |
| Business logic in lifecycle hooks | Extract to plain functions or services |
| New object/array literals passed as props on every render | Stabilise references outside render |
| Consumers must override half the component's styles | Provide variant props or design tokens instead |
| Exposing refs or internal handlers to parents | Keep internals private; emit events |

## Best Practices

- Start big, split later — premature abstraction produces awkward APIs.
- Keep the component tree shallow; deep nesting signals over-abstraction.
- A presentational `Button` must not import your API client or global store.
- Use slots/children for flexibility; a `Modal` accepting children beats one with twelve config props.
- Document the public contract with types — props in, events out.
- Co-locate related files; avoid mirrored directory trees.
- Stabilise prop references (memoisation, stable callbacks) to prevent unnecessary re-renders.
- Prefer native HTML elements over custom replacements — they carry semantics and behaviour for free.
