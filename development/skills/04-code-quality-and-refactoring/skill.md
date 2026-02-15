# 04 — Code Quality & Refactoring

## Description

Write code that is **readable, maintainable, and changeable** — then systematically improve existing code without changing its behaviour. This skill covers naming, functions, modules, code smells, refactoring recipes, and the discipline of continuous improvement.

Code is read **10× more often than it is written**. Optimising for readability — not cleverness — is the highest-leverage investment you can make.

## When To Use

- Writing any new code (quality is built in, not bolted on).
- Reviewing a pull request and evaluating code clarity.
- Touching existing code that is hard to understand or change.
- Before adding a feature that requires modifying tangled code ("make the change easy, then make the easy change").
- After getting a feature working — the first draft is rarely the cleanest.

## Prerequisites

| Skill | Why |
|-------|-----|
| [01 — Architecture & System Design](../01-Architecture-And-System-Design/skill.md) | Refactoring at the class/module level requires understanding structural patterns |
| [05 — Testing Strategies](../05-Testing-Strategies/skill.md) | Tests are the safety net that makes refactoring safe |

## Instructions

### 1 — The Standard of Good Code

Good code has one defining characteristic: **it can be understood quickly by someone who didn't write it** (including your future self).

This isn't subjective. You can measure it:
- **Time to understand** — how long does it take a new reader to correctly predict what a function does?
- **Time to change** — how long does it take to add a new feature or fix a bug in this area?
- **Blast radius of change** — how many other files do you need to modify when changing this function?

If understanding takes too long, the code needs improvement.

### 2 — Naming

Naming is the most important readability tool. A good name eliminates the need to read the implementation.

#### Rules for Good Names

| Rule | Bad | Good |
|------|-----|------|
| **Reveal intent** | `d` | `elapsedDays` |
| **Be specific** | `data`, `info`, `item`, `temp` | `userProfile`, `orderSummary`, `cartItem` |
| **Be pronounceable** | `genymdhms` | `generationTimestamp` |
| **Be searchable** | `7` | `MAX_RETRIES = 7` |
| **Don't encode types** | `nameString`, `userList` | `name`, `users` |
| **Use domain language** | `processData()` | `calculateShippingCost()` |
| **Verbs for functions, nouns for variables** | `total()`, `active` | `calculateTotal()`, `isActive` |
| **Booleans read as questions** | `flag`, `status` | `isVisible`, `hasPermission`, `canEdit` |

#### Naming Conventions by Scope

| Scope | Length | Why |
|-------|--------|-----|
| **Loop variable** | 1-3 chars (`i`, `x`, `ch`) | Scope is tiny; meaning is obvious from context |
| **Local variable** | Short, descriptive | Lives within one function |
| **Function/method** | Medium, verb-phrase | Describes the action |
| **Class/type** | Medium-long, noun-phrase | Describes the concept |
| **Module/package** | Short, one word if possible | Appears in every import statement |

### 3 — Functions

#### The Ideal Function

A function should:
1. **Do one thing** — expressible in a single sentence without "and" or "or".
2. **Be short** — 5-15 lines is a healthy range; 30+ lines is a warning sign.
3. **Operate at one level of abstraction** — don't mix high-level orchestration with low-level details.
4. **Have few parameters** — 0-3 is ideal; 4+ suggests the function does too much or needs a parameter object.

```python
# BAD: Does multiple things at different levels of abstraction
def process_order(order):
    # Validate
    if order.total < 0:
        raise ValueError("Negative total")
    if not order.items:
        raise ValueError("Empty order")
    # Calculate shipping
    weight = sum(item.weight for item in order.items)
    if weight < 1:
        shipping = 5.99
    elif weight < 5:
        shipping = 12.99
    else:
        shipping = 24.99
    # Apply tax
    tax = order.subtotal * 0.08
    # Charge payment
    stripe.charges.create(amount=int((order.subtotal + shipping + tax) * 100), ...)
    # Send confirmation
    send_email(order.customer.email, "Order confirmed", ...)
    # Update inventory
    for item in order.items:
        db.execute("UPDATE products SET stock = stock - ? WHERE id = ?", item.qty, item.id)

# GOOD: One function per concern, one level of abstraction
def process_order(order):
    validate_order(order)
    shipping = calculate_shipping(order)
    tax = calculate_tax(order)
    charge_payment(order, shipping, tax)
    send_confirmation(order)
    update_inventory(order)
```

#### Pure Functions

Prefer **pure functions** wherever possible — given the same inputs, they always return the same output and have no side effects:

```javascript
// Pure — easy to test, easy to reason about
function calculateDiscount(price, percentage) {
  return price * (percentage / 100);
}

// Impure — depends on external state, has side effects
function applyDiscount(order) {
  const rate = getDiscountRate();     // External state
  order.total -= order.total * rate;  // Mutation
  logDiscount(order);                 // Side effect
}
```

Isolate impure code (I/O, state mutation) at the edges. Keep the core logic pure.

### 4 — Code Smells

A "smell" is a surface-level indicator that something deeper may be wrong. Not every smell is a bug — but every smell is worth investigating.

#### The Most Important Smells

| Smell | Description | Refactoring |
|-------|-------------|-------------|
| **Long method** | Function exceeds ~30 lines | Extract Method |
| **Long parameter list** | Function takes 5+ parameters | Introduce Parameter Object |
| **Feature envy** | Method uses another class's data more than its own | Move Method to the class that owns the data |
| **God class** | One class that knows and does everything | Extract classes by responsibility |
| **Primitive obsession** | Using strings/ints where a domain type is needed | Replace Primitive with Value Object (`Email` instead of `string`) |
| **Shotgun surgery** | One change requires editing many files | Move related code into a single module |
| **Divergent change** | One class is modified for many unrelated reasons | Split into classes, each with one reason to change |
| **Data clumps** | Same group of variables always appears together | Extract into a class/struct (`x, y, z` → `Vector3`) |
| **Switch/if-else chains** | Long conditional on type/category | Replace with Polymorphism or Strategy pattern |
| **Comments explaining what** | `// Increment counter by 1` → `counter++` | Rename or restructure so the code is self-evident |
| **Dead code** | Unreachable or unused code | Delete it. It's in version control if you need it back. |
| **Duplicated code** | Same logic in multiple places | Extract into a shared function or module |

### 5 — Refactoring Recipes

Refactoring = **behaviour-preserving transformation**. The golden rule: **never refactor and change behaviour in the same commit.**

#### 5.1 — Extract Method

The most common refactoring. Take a block of code and give it a name:

```typescript
// Before
function printReport(order: Order) {
  // Print header
  console.log("===== Order Report =====");
  console.log(`Order #${order.id}`);
  console.log(`Date: ${order.date.toLocaleDateString()}`);
  console.log("");

  // Print items
  for (const item of order.items) {
    console.log(`  ${item.name}  x${item.qty}  $${(item.price * item.qty).toFixed(2)}`);
  }

  // Print totals
  const subtotal = order.items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const tax = subtotal * 0.08;
  console.log("");
  console.log(`  Subtotal: $${subtotal.toFixed(2)}`);
  console.log(`  Tax:      $${tax.toFixed(2)}`);
  console.log(`  Total:    $${(subtotal + tax).toFixed(2)}`);
}

// After
function printReport(order: Order) {
  printHeader(order);
  printLineItems(order.items);
  printTotals(order.items);
}
```

#### 5.2 — Replace Conditional with Polymorphism

```python
# Before — adding a new shape requires modifying this function
def calculate_area(shape):
    if shape.type == "circle":
        return math.pi * shape.radius ** 2
    elif shape.type == "rectangle":
        return shape.width * shape.height
    elif shape.type == "triangle":
        return 0.5 * shape.base * shape.height
    else:
        raise ValueError(f"Unknown shape: {shape.type}")

# After — adding a new shape requires only a new class
class Circle:
    def __init__(self, radius): self.radius = radius
    def area(self): return math.pi * self.radius ** 2

class Rectangle:
    def __init__(self, width, height): self.width, self.height = width, height
    def area(self): return self.width * self.height

class Triangle:
    def __init__(self, base, height): self.base, self.height = base, height
    def area(self): return 0.5 * self.base * self.height
```

#### 5.3 — Introduce Parameter Object

```csharp
// Before — 6 parameters, hard to remember order
public Report Generate(DateTime start, DateTime end, string department,
                        bool includeArchived, string format, int maxResults)

// After — intention-revealing parameter object
public Report Generate(ReportCriteria criteria)

public record ReportCriteria(
    DateTime StartDate,
    DateTime EndDate,
    string Department,
    bool IncludeArchived = false,
    string Format = "pdf",
    int MaxResults = 100
);
```

#### 5.4 — Replace Magic Values with Named Constants

```javascript
// Before
if (password.length < 8) { ... }
if (retries > 3) { ... }
if (role === "admin") { ... }
setTimeout(callback, 86400000);

// After
const MIN_PASSWORD_LENGTH = 8;
const MAX_RETRIES = 3;
const ROLE_ADMIN = "admin";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

if (password.length < MIN_PASSWORD_LENGTH) { ... }
if (retries > MAX_RETRIES) { ... }
if (role === ROLE_ADMIN) { ... }
setTimeout(callback, ONE_DAY_MS);
```

#### 5.5 — Guard Clauses (Replace Nested Conditionals with Early Returns)

```python
# Before — deeply nested, hard to follow
def get_payment_amount(order):
    if order is not None:
        if order.is_confirmed:
            if not order.is_paid:
                if order.total > 0:
                    return order.total
                else:
                    return 0
            else:
                raise AlreadyPaidError()
        else:
            raise NotConfirmedError()
    else:
        raise ValueError("Order is None")

# After — flat, easy to scan
def get_payment_amount(order):
    if order is None:
        raise ValueError("Order is None")
    if not order.is_confirmed:
        raise NotConfirmedError()
    if order.is_paid:
        raise AlreadyPaidError()
    if order.total <= 0:
        return 0
    return order.total
```

### 6 — The Refactoring Workflow

```
1. Ensure tests pass                ← Green baseline
2. Identify the smell               ← What's wrong?
3. Choose a refactoring             ← Which recipe fits?
4. Apply in small steps             ← One change at a time
5. Run tests after each step        ← Still green?
6. Commit when green                ← Save your progress
7. Repeat until the smell is gone
```

**Never refactor without tests.** If there are no tests, write characterisation tests first (tests that lock in current behaviour, even if you're not sure it's correct).

### 7 — Comments: When and How

#### Comments That Are Valuable

```python
# WHY — explains a non-obvious business rule or trade-off
# We round to the nearest cent AFTER summing all items to avoid
# accumulated floating-point drift. The old approach (rounding each
# item) caused $0.01 discrepancies on orders with 50+ items.
total = round(sum(item.price * item.qty for item in items), 2)

# WARNING — alerts future developers to a non-obvious constraint
# DO NOT reorder these initialization steps. The renderer must be
# initialized before the input system because it registers event
# handlers that depend on the rendering context.

# TODO / FIXME — tracked, actionable, with ticket reference
# TODO(#234): Replace this linear scan with a spatial index once
# the entity count exceeds 1000 in typical gameplay.
```

#### Comments That Are Harmful

```python
# BAD: Restates the code (just noise)
i += 1  # Increment i by 1

# BAD: Outdated — the code has changed, the comment hasn't
# Returns the user's full name
def get_display_name(user):
    return user.username  # Changed from full_name in v2.3

# BAD: Apology for bad code — refactor instead
# Sorry this is messy, will clean up later (added 2 years ago)
```

**Rule:** If you feel the need to write a comment explaining *what* the code does, the code should be rewritten to be self-explanatory. Reserve comments for *why* and *warnings*.

### 8 — Consistency

Consistency reduces cognitive load more than any individual style choice. It doesn't matter whether you use tabs or spaces, camelCase or snake_case — what matters is that the codebase uses **one convention** throughout.

Enforce consistency with:

| Tool Type | Examples | What It Enforces |
|-----------|---------|------------------|
| **Formatter** | Prettier, Black, gofmt, clang-format | Whitespace, line length, brace placement |
| **Linter** | ESLint, Pylint, RuboCop, Clippy | Code patterns, potential bugs, naming |
| **Type checker** | TypeScript, mypy, Flow | Type safety, interface compliance |
| **Editor config** | `.editorconfig` | Indent style, charset, line endings across editors |

Configure these once, run on save, enforce in CI. Style debates end immediately.

### 9 — Managing Technical Debt

Technical debt is a **conscious trade-off** — you take a shortcut now to ship faster, with the intention of paying it back later. The problem is that compounding interest makes it exponentially more expensive over time.

#### The Debt Quadrant

| | Deliberate | Inadvertent |
|---|-----------|-------------|
| **Reckless** | "We don't have time for design" | "What's a design pattern?" |
| **Prudent** | "Ship now, refactor next sprint" | "Now we know how we should have done it" |

Only **prudent deliberate** debt is acceptable. Track it explicitly (tickets, TODO comments with issue numbers).

#### The Boy Scout Rule

> "Leave the code cleaner than you found it."

Every time you touch a file, make one small improvement: rename a variable, extract a function, delete dead code. Over time, the codebase improves incrementally without dedicated "cleanup sprints" (which rarely happen).

### 10 — Code Review for Quality

When reviewing code for quality, focus on:

| Priority | What to Look For |
|----------|-----------------|
| **1 — Correctness** | Does it do what it should? Are edge cases handled? |
| **2 — Design** | Is the abstraction level right? Does it belong in this module? |
| **3 — Readability** | Can I understand it without asking the author? |
| **4 — Maintainability** | Will this be easy to change in 6 months? |
| **5 — Performance** | Only if there's a concrete concern (don't prematurely optimise in review) |
| **6 — Style** | Automate this with formatters/linters so humans don't need to discuss it |

## Best Practices

1. **Optimise for reading, not writing** — you write code once; it's read hundreds of times.
2. **Name things as if the reader has never seen the codebase** — because eventually they haven't.
3. **Functions should do one thing** — if you can't name it without "and", split it.
4. **Make illegal states unrepresentable** — use types to prevent invalid data from existing.
5. **Delete dead code** — it's in version control if you ever need it. Dead code misleads readers.
6. **Refactor in small, tested steps** — never refactor and add features in the same commit.
7. **Enforce style with automated tools** — never debate formatting in code review.
8. **Apply the Boy Scout Rule** — every touch = one small improvement.
9. **Treat TODOs as debt** — attach an issue number and pay them down regularly.
10. **Read code you admire** — study well-maintained open-source projects to develop taste.

## Common Pitfalls

| Pitfall | Why It Happens | Fix |
|---------|---------------|-----|
| **Refactoring without tests** | No safety net → introduced bugs go unnoticed | Write characterisation tests first, then refactor |
| **Big-bang refactoring** | "Let me rewrite the whole module" → fails halfway | Small, incremental changes. Commit after each step |
| **Premature abstraction** | Abstracting before you have two use cases | Wait for the pattern to emerge. Copy-paste is fine until you see the duplication |
| **Over-engineering** | Adding layers, factories, and abstractions "for flexibility" | YAGNI. Build what's needed now. Refactor when complexity demands it |
| **Inconsistent naming** | `user`, `currentUser`, `usr`, `u` in the same codebase | Agree on conventions. Enforce with linters. Rename aggressively |
| **Leaving dead code "just in case"** | Fear of losing code | Delete it. Git remembers. Dead code is actively harmful |
| **Ignoring the formatter** | "My style is better" | Configure once, apply everywhere. Zero human negotiation |
| **Refactoring under pressure** | Sprint deadline looming | Refactor before or after the sprint, not during. Or scope it as a dedicated task |

## Reference

- **Clean Code** — Robert C. Martin (naming, functions, comments, formatting)
- **Refactoring** — Martin Fowler (catalog of refactoring recipes with mechanics)
- **A Philosophy of Software Design** — John Ousterhout (deep modules, complexity management)
- **The Pragmatic Programmer** — Hunt & Thomas (DRY, orthogonality, tracer bullets)
- [Refactoring Guru](https://refactoring.guru/) — Visual catalog of code smells and refactoring patterns
- [Google Style Guides](https://google.github.io/styleguide/) — Language-specific style guides used at Google
- [Conventional Comments](https://conventionalcomments.org/) — Labelled code review feedback format
