# 03 — Debugging & Problem Solving

## Description

Systematically find, isolate, and fix defects in software by applying the **scientific method** to code. This skill covers the debugging mindset, reproducibility, binary search techniques, reading error messages, using debuggers effectively, and building mental models of program state.

Debugging is not a talent — it is a **learnable, repeatable process**. Developers who debug systematically solve problems in minutes that others spend hours on.

## When To Use

- Something behaves differently from what you expect.
- A test fails and the reason isn't immediately obvious.
- A production incident occurs and you need to find the root cause.
- You're reading unfamiliar code and need to understand what it actually does (vs. what you think it does).
- Performance is worse than expected and you need to find the bottleneck.

## Prerequisites

| Skill | Why |
|-------|-----|
| Proficiency in the language you're debugging | You need to understand the runtime model and error semantics |
| Basic understanding of program execution | Call stacks, memory, threads, I/O |

## Instructions

### 1 — The Debugging Mindset

Before touching any tool, adopt these mental principles:

#### 1.1 — The Bug Is in Your Code (Almost Always)

When something doesn't work, the cause is almost always in your code, your configuration, or your assumptions — not in the language, framework, or OS. Start there.

The probability hierarchy:

```
99%  — Your code has a bug
 0.9% — You're using the library wrong
 0.09% — The library has a bug
 0.01% — The compiler/runtime has a bug
```

#### 1.2 — Read the Error Message. All of It.

The single most common debugging failure is **not reading the error message carefully**. Error messages contain:

1. **What** went wrong (exception type / error code).
2. **Where** it went wrong (file, line, column).
3. **Why** it went wrong (message text — often surprisingly precise).
4. **The path** that led there (stack trace).

```
TypeError: Cannot read properties of undefined (reading 'map')
    at renderItems (Dashboard.tsx:42:18)
    at Dashboard (Dashboard.tsx:28:12)
    at renderWithHooks (react-dom.development.js:14985:18)
```

This tells you: `renderItems` at line 42 of `Dashboard.tsx` tried to call `.map()` on something that was `undefined`. The variable before `.map()` on that line is your suspect.

#### 1.3 — Explain the Problem Out Loud

**Rubber duck debugging** works because articulating the problem forces you to confront your assumptions. If you can't explain what should happen at each step, you've found the gap in your understanding — and likely the location of the bug.

### 2 — The Scientific Method for Debugging

Debugging is experimentation. Follow the same loop scientists use:

```
┌──────────────┐
│ 1. Observe   │  What is the actual behaviour?
├──────────────┤
│ 2. Hypothesise│  What could cause this behaviour?
├──────────────┤
│ 3. Predict   │  If my hypothesis is correct, what should I see when I do X?
├──────────────┤
│ 4. Test      │  Do X and observe the result.
├──────────────┤
│ 5. Conclude  │  Was the prediction correct?
│              │  → Yes: hypothesis strengthened. Fix the cause.
│              │  → No: eliminate this hypothesis. Return to step 2.
└──────────────┘
```

**Critical rule:** Only change **one variable at a time**. If you change three things and the bug disappears, you don't know which change fixed it — and you've learned nothing.

### 3 — Reproducing the Bug

A bug you can't reproduce is a bug you can't fix with confidence. The first step is always to find the **minimal, reliable reproduction**.

#### Steps to Reproduce

1. **Capture the exact conditions** — inputs, environment, timing, user actions.
2. **Reduce to the minimum** — remove everything that isn't needed to trigger the bug.
3. **Make it deterministic** — eliminate randomness, timing, and external dependencies where possible.
4. **Write the reproduction as a test case** — this becomes your regression test.

```python
# The reproduction IS the test
def test_discount_calculation_overflows_on_100_percent():
    """
    Bug: 100% discount causes negative total due to floating-point error.
    Reproduction: Apply a 100% coupon to any order.
    """
    order = Order(items=[Item(price=29.99)])
    order.apply_discount(percentage=100)
    assert order.total == 0.0  # Was returning -0.0000000001
```

#### When You Can't Reproduce

- **Add logging** at the boundaries of the suspected area.
- **Check for environmental differences** — OS, timezone, locale, permissions, config.
- **Look for race conditions** — does it only happen under load or on slower hardware?
- **Check data-dependent paths** — does it only happen with specific input values?

### 4 — Isolation Techniques

#### 4.1 — Binary Search (The Most Powerful Technique)

When you don't know *where* the bug is, **divide and conquer**:

1. Find a point in the code/data/commits where things are correct.
2. Find a point where things are broken.
3. Check the midpoint.
4. Narrow the search space by half.
5. Repeat until isolated.

This applies to:
- **Code:** Comment out half the logic. Still broken? Bug is in the remaining half. Works? Bug is in what you commented out.
- **Commits:** Use `git bisect` to find the exact commit that introduced the bug.
- **Data:** Feed half the input. Does it break? Narrow down to the problematic record.
- **Dependencies:** Remove half the libraries/services. Still broken?

You can find any bug in `log₂(n)` steps. 1000 lines of code? ~10 steps. 1024 commits? 10 bisect rounds.

#### 4.2 — Minimal Reproduction

Strip away everything until only the bug remains:

```
Full app → Single page → Single component → Single function → Single line
```

At each stage, if the bug persists, strip further. If it disappears, the last thing you removed was involved.

#### 4.3 — The Tracer Bullet

If you're lost in unfamiliar code, **trace the data flow** end to end:

1. Where does the data enter the system? (API request, user input, file read)
2. Where does it get transformed? (parsing, validation, business logic)
3. Where does it get stored or output? (database, response, UI render)

Add a log/breakpoint at each boundary and verify the data is correct at every step. The bug is at the step where the data first becomes wrong.

### 5 — Using Debuggers Effectively

#### Breakpoint Types

| Type | What It Does | When to Use |
|------|-------------|-------------|
| **Line breakpoint** | Pauses at a specific line | You know roughly where the bug is |
| **Conditional breakpoint** | Pauses only when a condition is true | Bug only happens for id=42; break when `id == 42` |
| **Logpoint** | Logs a message without pausing | Add instrumentation without modifying code |
| **Exception breakpoint** | Pauses when a specific exception is thrown | "Something throws a NullReferenceException somewhere" |
| **Data breakpoint / Watchpoint** | Pauses when a variable's value changes | "Something is modifying `user.balance` and I don't know what" |
| **Hit count breakpoint** | Pauses after N hits | Bug happens on the 500th iteration of a loop |

#### Debugger Workflow

```
1. Set a breakpoint BEFORE the suspected bug location.
2. Run in debug mode.
3. When paused, inspect:
   - Local variables and their values
   - The call stack (how you got here)
   - Watch expressions (computed values)
4. Step through:
   - Step Over (F10) — execute the current line, stay in this function
   - Step Into (F11) — enter the function being called
   - Step Out (Shift+F11) — finish this function, return to caller
5. At each step: Is the state what you expected?
   - Yes → step forward
   - No → you've found the divergence point
```

#### The Call Stack

The call stack tells you **the full chain of function calls** that led to the current point. Read it **bottom to top**:

```
#0  calculateTax(order)              ← Current position
#1  calculateTotal(order)            ← Called calculateTax
#2  checkout(cart)                    ← Called calculateTotal
#3  handleCheckoutClick(event)       ← Called checkout
#4  onClick(event)                   ← UI framework handler
```

If a variable has the wrong value in `calculateTax`, check whether it was already wrong when `calculateTotal` called it. Walk up the stack to find where the data first went wrong.

### 6 — Strategic Logging

When a debugger isn't practical (production, distributed systems, intermittent bugs), logging is your primary tool.

#### Log Levels

| Level | When to Use | Example |
|-------|------------|---------|
| **ERROR** | Something failed that shouldn't have | `Failed to charge payment: timeout after 30s` |
| **WARN** | Something unexpected that the system handled | `Retry 2 of 3 for database connection` |
| **INFO** | Significant business events | `Order #1234 placed by user 567` |
| **DEBUG** | Detailed technical state (disabled in production) | `Cache miss for key user:567:profile` |
| **TRACE** | Extremely verbose (function entry/exit, iterations) | `Evaluating discount rule 3 of 7` |

#### Effective Log Messages

```
BAD:  "Error occurred"
BAD:  "Processing failed"
BAD:  "Value is wrong"

GOOD: "Payment processing failed: Stripe returned 402 for charge_id=ch_abc123, amount=2999, currency=usd"
GOOD: "Order total mismatch: calculated=29.99, stored=30.00, order_id=1234, discount_applied=true"
GOOD: "User authentication failed: email=user@example.com, reason=invalid_password, attempts=3"
```

Every log message should answer: **What happened? To what entity? With what relevant context?**

#### Structured Logging

```json
{
  "timestamp": "2026-02-14T10:30:00Z",
  "level": "ERROR",
  "message": "Payment processing failed",
  "service": "checkout",
  "order_id": "1234",
  "user_id": "567",
  "provider": "stripe",
  "error_code": "card_declined",
  "amount_cents": 2999,
  "duration_ms": 1250,
  "trace_id": "abc-def-123"
}
```

Structured logs (JSON) are searchable, filterable, and parseable by log aggregation tools (ELK, Datadog, Grafana Loki).

### 7 — Common Bug Categories and How to Find Them

#### Off-By-One Errors

```python
# Bug: skips the last element
for i in range(len(items) - 1):  # Should be range(len(items))
    process(items[i])
```

**How to find:** Check boundary conditions — first element, last element, empty collection, single element.

#### Null / Undefined Reference

**How to find:** Trace the variable backward from the crash point. Where was it supposed to be assigned? What path skipped the assignment?

#### Race Conditions

**Symptoms:** Works usually, fails under load, not reproducible on demand, different behaviour on different machines.

**How to find:**
- Add `Thread.currentThread().getName()` or equivalent to logs.
- Look for shared mutable state accessed without synchronisation.
- Use race-condition detectors (ThreadSanitizer, Go race detector).

#### State Mutation Bugs

**Symptoms:** Function works the first time, fails the second. Order of operations matters when it shouldn't.

**How to find:**
- Check if the function modifies its input (instead of returning a new value).
- Look for global/shared state being modified as a side effect.
- Verify that "setup" happens before "use" in all code paths.

#### Integration Mismatches

**Symptoms:** Each component works in isolation, fails when connected.

**How to find:**
- Compare the actual request/response with what each side expects (content type, field names, encoding).
- Check API contracts — are you sending `userId` when the API expects `user_id`?
- Inspect the wire protocol (network tab, packet capture, proxy).

### 8 — Production Debugging

When you can't attach a debugger:

| Technique | How |
|-----------|-----|
| **Correlate logs with timestamps** | Find the exact moment the error occurred, then read the log context around it |
| **Distributed tracing** | Follow a request ID across services (OpenTelemetry, Jaeger) |
| **Feature flags** | Disable the suspected feature and see if the problem stops |
| **Canary deployment** | Roll out to 1% of traffic; compare error rates |
| **Core dumps / heap snapshots** | Capture the full state at the moment of crash for post-mortem analysis |
| **Reproduction in staging** | Replay production traffic or data in a safe environment |

### 9 — Writing a Bug Report / Post-Mortem

After finding and fixing the bug, document it:

```markdown
## Bug Report

**Summary:** Users see "NaN" in the cart total when applying a percentage coupon to a free item.

**Steps to Reproduce:**
1. Add a free ($0.00) item to the cart.
2. Apply coupon "SAVE10" (10% off).
3. Observe the total shows "NaN".

**Expected:** Total should be $0.00 (10% of $0.00 is $0.00).

**Actual:** Total shows "NaN" because `discount = price * (percentage / 100)` operates on `undefined` when the item price field is missing (free items have no price property).

**Root Cause:** Free items were stored without a `price` field instead of `price: 0`. The discount calculation didn't handle `undefined` gracefully.

**Fix:** Default missing price to `0` at the data layer + add a guard in the discount calculation.

**Prevention:** Added unit test for discount calculation with zero-price items. Added schema validation requiring the `price` field on all items.
```

### 10 — Building Debugging Intuition

Intuition comes from **pattern recognition**, which comes from **deliberate practice**:

1. **Keep a bug journal** — write down each non-trivial bug, its root cause, and how you found it. Review it periodically. You'll start seeing patterns.
2. **Read other people's post-mortems** — Google's SRE book, GitHub incident reports, and company engineering blogs are goldmines.
3. **Time-box your approach** — if you haven't made progress in 30 minutes, change your approach. Step back, re-read the error, try a different hypothesis.
4. **Pair debug with someone** — explaining your reasoning to another person often reveals the flawed assumption.
5. **Study the runtime** — understanding how your language allocates memory, resolves names, schedules threads, and handles exceptions makes bugs predictable.

## Best Practices

1. **Read the error message completely** before doing anything else.
2. **Reproduce first, fix second** — a fix without a reproduction is a guess.
3. **Change one thing at a time** — otherwise you learn nothing from the experiment.
4. **Use `git bisect`** when you know it used to work — let binary search find the guilty commit.
5. **Write the reproduction as a test** — it becomes your regression test for free.
6. **Don't debug by guess-and-check** — form a hypothesis, predict what you'll see, then verify.
7. **Take breaks** — fresh eyes catch what tired eyes miss. Walk away and come back.
8. **Check your assumptions** — print the value you "know" is correct. It often isn't.
9. **Simplify, then add complexity** — get it working in the simplest case first, then add edge cases.
10. **Document the bug and the fix** — especially if it took more than 30 minutes to find. Someone will hit it again.

## Common Pitfalls

| Pitfall | Why It Happens | Fix |
|---------|---------------|-----|
| **Fixing the symptom, not the cause** | Pressure to ship quickly | Ask "why" five times (5 Whys technique). Fix the root cause |
| **Shotgun debugging** | Changing random things hoping something works | Stop. Form a hypothesis. Test it deliberately |
| **Debugging the wrong version** | Edited code but ran/deployed the old version | Verify your change is actually running (add a log, rebuild, clear cache) |
| **Assuming the bug is somewhere else** | "My code is fine, it must be the library" | Prove it. Write a minimal test that isolates your code from the library |
| **Print statement overload** | Adding 50 print statements without a plan | Add prints at the boundaries of suspect areas, not everywhere |
| **Not reading the stack trace** | Scrolling past it because it looks intimidating | Read top to bottom. Find the first frame that mentions YOUR code |
| **Debugging in production first** | Skipping local reproduction | Reproduce locally first. Production debugging should be the last resort |
| **Giving up too soon** | "It's impossible" | Every bug has a cause. Step back, change approach, ask for help |

## Reference

- **Debugging: The 9 Indispensable Rules** — David J. Agans (the definitive book on systematic debugging)
- **Why Programs Fail** — Andreas Zeller (scientific approach to debugging, delta debugging)
- [Julia Evans — Debugging Zines](https://wizardzines.com/) — Visual, memorable guides to profiling, strace, networking
- [Google SRE Book — Effective Troubleshooting](https://sre.google/sre-book/effective-troubleshooting/) — Production debugging methodology
- [How to Report Bugs Effectively](https://www.chiark.greenend.org.uk/~sgtatham/bugs.html) — Simon Tatham's classic guide
- [git bisect documentation](https://git-scm.com/docs/git-bisect) — Binary search through commit history
