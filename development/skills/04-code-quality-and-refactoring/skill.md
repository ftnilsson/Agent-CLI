# 04 — Code Quality & Refactoring

## Naming Rules

| Rule | Bad | Good |
|------|-----|------|
| Reveal intent | `d` | `elapsedDays` |
| Be specific | `data`, `info`, `temp` | `userProfile`, `orderSummary` |
| Be searchable | `7` | `MAX_RETRIES = 7` |
| Don't encode types | `nameString`, `userList` | `name`, `users` |
| Use domain language | `processData()` | `calculateShippingCost()` |
| Verbs for functions, nouns for variables | `total()`, `active` | `calculateTotal()`, `isActive` |
| Booleans read as questions | `flag`, `status` | `isVisible`, `hasPermission` |

## Functions

A function must do one thing — expressible in one sentence without "and". Keep functions 5-15 lines; 30+ lines is a warning sign. Limit parameters to 0-3; use a parameter object at 4+.

Operate at one level of abstraction: don't mix high-level orchestration with low-level details in the same function.

Prefer pure functions (same input → same output, no side effects). Isolate impure code (I/O, mutation) at the edges.

## Guard Clauses

Flatten nested conditionals with early returns:

```python
# Before — deeply nested
def get_payment_amount(order):
    if order is not None:
        if order.is_confirmed:
            if not order.is_paid:
                return order.total if order.total > 0 else 0

# After — flat, scannable
def get_payment_amount(order):
    if order is None:          raise ValueError("Order is None")
    if not order.is_confirmed: raise NotConfirmedError()
    if order.is_paid:          raise AlreadyPaidError()
    if order.total <= 0:       return 0
    return order.total
```

## Code Smells

| Smell | Refactoring |
|-------|-------------|
| Long method (30+ lines) | Extract Method |
| Long parameter list (5+) | Introduce Parameter Object |
| Feature envy (uses another class's data more than its own) | Move Method |
| God class | Extract classes by responsibility |
| Primitive obsession (`string` for email) | Replace Primitive with Value Object |
| Shotgun surgery (one change touches many files) | Move related code into one module |
| Switch/if-else chains on type | Replace with Polymorphism or Strategy |
| Comments explaining what the code does | Rename or restructure until code is self-evident |
| Dead code | Delete it — git remembers |
| Duplicated code | Extract into a shared function |

## Refactoring Recipes

**Extract Method** — give a block of code a name:
```typescript
// Before: printReport() is 40 lines mixing header, items, and totals
// After:
function printReport(order: Order) {
  printHeader(order);
  printLineItems(order.items);
  printTotals(order.items);
}
```

**Replace Conditional with Polymorphism** — each type owns its own behaviour instead of a shared if/switch.

**Replace Magic Values with Named Constants:**
```javascript
// Before: if (retries > 3) / setTimeout(cb, 86400000)
const MAX_RETRIES = 3;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
```

**Introduce Parameter Object** — replace 5+ parameters with a typed record/dataclass.

## Refactoring Workflow

```
1. Ensure tests pass              ← Green baseline
2. Identify the smell
3. Choose a recipe
4. Apply in small steps
5. Run tests after each step
6. Commit when green
7. Repeat
```

Never refactor without tests. If tests don't exist, write characterisation tests first (lock in current behaviour before changing anything). Never refactor and change behaviour in the same commit.

## Comments

Write comments for **why** and **warnings**, never for **what**:

```python
# GOOD — explains non-obvious business rule
# Round AFTER summing all items to avoid accumulated floating-point drift.
# Rounding per item caused $0.01 discrepancies on 50+ item orders.
total = round(sum(item.price * item.qty for item in items), 2)

# BAD — restates the code
i += 1  # Increment i by 1

# BAD — apology for bad code (refactor instead)
# Sorry this is messy, will clean up later
```

TODOs must include an issue reference: `# TODO(#234): Replace with spatial index`.

## Consistency & Tooling

| Tool | Purpose |
|------|---------|
| Formatter (Prettier, Black, gofmt) | Whitespace, line length, brace placement |
| Linter (ESLint, Pylint, Clippy) | Code patterns, naming, potential bugs |
| Type checker (TypeScript, mypy) | Type safety, interface compliance |
| `.editorconfig` | Indent style, charset, line endings across editors |

Configure once, run on save, enforce in CI. Style debates end immediately.

## Technical Debt

Only prudent deliberate debt is acceptable ("ship now, refactor next sprint"). Track it explicitly with issue numbers. Apply the Boy Scout Rule: every time you touch a file, make one small improvement.

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Refactoring without tests | Write characterisation tests first |
| Big-bang refactoring ("rewrite the whole module") | Small, incremental changes; commit after each step |
| Premature abstraction | Wait for the second use case; copy-paste is fine until you see the pattern |
| Over-engineering (layers and factories "for flexibility") | YAGNI — build what's needed now |
| Inconsistent naming (`user`, `currentUser`, `usr`, `u`) | Agree on conventions; enforce with linters; rename aggressively |
| Leaving dead code "just in case" | Delete it — git remembers |
| Refactoring under deadline pressure | Scope it as a dedicated task, before or after the sprint |

## Best Practices

- Optimise for reading, not writing — code is read 10× more than it is written.
- Name things as if the reader has never seen the codebase.
- Make illegal states unrepresentable — use types to prevent invalid data from existing.
- Delete dead code immediately.
- Enforce style with automated tools — never debate formatting in code review.
- In code review: correctness → design → readability → maintainability → performance → style (in that order).
- Treat TODOs as debt: attach an issue number, pay them down regularly.
