# Component Architecture

## Description

Design, compose, and organise UI components into maintainable, reusable hierarchies — regardless of the framework you use. This skill covers the universal principles that make component-based UIs scale: single-responsibility decomposition, prop/event contracts, composition over inheritance, and the separation of presentational logic from business logic.

## When To Use

- Starting a new feature or page and deciding how to break it into components
- Reviewing a component that has grown beyond a single responsibility
- Building a shared component library or design system
- Refactoring a "god component" that renders the whole page
- Deciding whether state and logic live inside a component or outside it

## Prerequisites

- Basic understanding of any component framework (React, Vue, Svelte, Angular, Web Components, etc.)
- Familiarity with HTML/CSS fundamentals

## Instructions

### 1. Decompose by Responsibility

Every component should answer one question: *"What does this render and why?"* If the answer contains "and", split it.

**Practical heuristic — the three-bucket rule:**

| Bucket | Purpose | Examples |
|--------|---------|----------|
| **Layout** | Structural containers that arrange children | `PageShell`, `Sidebar`, `Grid` |
| **Feature** | Orchestrate data and behaviour for a use-case | `UserProfile`, `InvoiceTable` |
| **UI / Presentational** | Stateless, reusable visual building blocks | `Button`, `Avatar`, `Badge` |

Start top-down: sketch the page as boxes, label each box, then assign a bucket.

### 2. Define Clear Contracts

A component's public API is its **props in** and **events out** (or slots/children). Treat them like a function signature:

- **Props should be the minimum data needed to render.** Pass a `userId` and let the component fetch, or pass the full `user` object — pick one pattern and be consistent.
- **Events should describe what happened, not what to do.** Emit `onItemSelected(item)` not `setParentState(item)`. The parent decides the reaction.
- **Avoid prop drilling beyond two levels.** If data passes through components that don't use it, introduce context/provide-inject/stores.

### 3. Favour Composition Over Configuration

Instead of a single `<Card type="product" | "user" | "article">` with branching internals, compose smaller pieces:

```
<Card>
  <CardHeader>
    <Avatar />
    <Title />
  </CardHeader>
  <CardBody>
    {children}
  </CardBody>
</Card>
```

**Why:** Every `if` inside a component is a maintenance path. Composition makes each piece testable and swappable without touching the others.

### 4. Separate Presentation from Logic

Keep rendering pure and side-effect-free. Extract logic into:

- **Hooks / composables / services** — data fetching, timers, subscriptions
- **Utility functions** — formatting, validation, calculations

The component becomes a thin shell: receive data → render UI → emit events. This makes it trivially testable and portable between frameworks.

### 5. Manage Component Size

**Rule of thumb:** If a component file exceeds ~200 lines (template + logic + styles), it likely has multiple responsibilities.

Signs a component needs splitting:
- Multiple unrelated state variables
- Conditional rendering for entirely different UIs
- Deeply nested template/JSX (more than 3–4 levels)
- The component name requires "And" (e.g. `HeaderAndNavigation`)

### 6. Establish Naming and File Conventions

Pick a convention and enforce it project-wide:

```
components/
  ui/              ← presentational (Button, Input, Modal)
  layout/          ← structural (PageShell, Sidebar)
  features/        ← domain-specific (InvoiceTable, UserProfile)
```

- **Name by what it is**, not where it's used: `SearchInput` not `HeaderInput`
- **One component per file** in most cases
- **Co-locate** styles, tests, and stories with the component they belong to

## Best Practices

- **Start big, split later.** It's easier to extract a component from working code than to pre-engineer abstractions you don't need yet.
- **Limit a component's dependency surface.** A presentational `Button` should not import your API client or global store.
- **Use slots/children for flexibility.** A `Modal` that accepts children is infinitely more reusable than one that accepts twelve configuration props.
- **Document the contract.** Type your props (TypeScript, PropTypes, or framework equivalent). Future-you and your teammates will thank you.
- **Keep the component tree shallow.** Deep nesting makes debugging harder and often signals over-abstraction.
- **Co-locate related files.** Tests, styles, and stories next to the component — not in mirrored directory trees.

## Common Pitfalls

- **Premature abstraction.** Creating a `<GenericList>` before you have two concrete lists to compare leads to awkward APIs. Wait for the pattern to emerge.
- **Prop explosion.** When a component takes 15+ props, it's doing too much. Split it or use composition.
- **Leaking internal state.** Exposing component internals (refs, internal handlers) couples the parent to implementation details. Keep internals private.
- **Framework lock-in in logic.** Business rules written inside framework lifecycle hooks can't be reused or unit-tested easily. Extract them into plain functions.
- **Styling by override.** If consumers need to override half the styles, the component's abstraction boundary is wrong. Provide design tokens or variant props instead.
- **Ignoring render performance.** Passing new object/array literals as props on every render causes unnecessary re-renders. Stabilise references.

## Reference

- [Component-Driven Development](https://www.componentdriven.org/)
- [Atomic Design Methodology — Brad Frost](https://atomicdesign.bradfrost.com/)
- [Patterns.dev — Component Patterns](https://www.patterns.dev/)
