# 03 — Debugging & Problem Solving

## Process

Apply the scientific method — one variable at a time:

1. **Observe** — What is the actual behaviour? What is expected?
2. **Hypothesise** — What could cause this specific behaviour?
3. **Predict** — If my hypothesis is correct, what will I see when I do X?
4. **Test** — Do X and observe.
5. **Conclude** — Correct? Fix the cause. Wrong? Eliminate hypothesis, return to step 2.

Never change more than one thing at a time. If you change three things and the bug disappears, you've learned nothing.

## First Actions

- Read the full error message — type, file, line, message text, and stack trace. Most bugs are diagnosed here.
- Check the probability hierarchy before blaming the framework: 99% your code, 0.9% misuse of the library, 0.09% library bug, 0.01% runtime bug.
- Reproduce the bug before attempting any fix. A fix without reproduction is a guess.
- Explain the problem out loud (rubber duck) — articulating forces you to confront your assumptions.

## Reproducing the Bug

1. Capture exact conditions: inputs, environment, timing, user actions.
2. Strip to the minimum needed to trigger it.
3. Make it deterministic — remove randomness and external dependencies where possible.
4. Write the reproduction as a test case — it becomes the regression test.

When you cannot reproduce: add logging at boundaries, check environmental differences (OS, timezone, locale, permissions), look for race conditions (load/concurrency), check data-dependent code paths.

## Isolation: Binary Search

Divide and conquer to find where the bug lives in O(log n) steps:

- **Code**: comment out half the logic. Still broken? Bug is in the remaining half.
- **Commits**: use `git bisect` to find the exact introducing commit.
- **Data**: feed half the input. Narrows to the problematic record.

Trace data flow end-to-end: entry point → transformation → output. Add a log or breakpoint at each boundary. The bug is at the first step where data becomes wrong.

## Debugger Usage

| Breakpoint Type | Use When |
|-----------------|----------|
| Line breakpoint | You know roughly where the bug is |
| Conditional breakpoint | Bug only occurs for a specific value (`id == 42`) |
| Exception breakpoint | Something throws an exception but you don't know where |
| Data breakpoint / Watchpoint | Something mutates a variable and you don't know what |
| Hit count breakpoint | Bug occurs on the Nth iteration |

Step through with Step Over → Step Into → Step Out. At each step ask: is the state what I expected? The first divergence is the bug location.

Read the call stack bottom-to-top: find the first frame in your own code, then walk up to find where data first went wrong.

## Logging

Every log message must answer: what happened, to what entity, with what context.

```
BAD:  "Error occurred"
GOOD: "Payment failed: Stripe 402 for charge_id=ch_abc123, amount=2999, user_id=567"
```

| Level | Use For |
|-------|---------|
| ERROR | Unexpected failure that the system cannot handle |
| WARN | Unexpected event the system handled (retry, fallback) |
| INFO | Significant business event (order placed, user registered) |
| DEBUG | Detailed technical state — disable in production |

Use structured (JSON) logs in production — they are searchable and parseable by aggregation tools.

## Common Bug Categories

| Category | Where to Look |
|----------|--------------|
| Off-by-one | First element, last element, empty collection, single element |
| Null/undefined | Trace the variable back to its assignment — what path skipped it? |
| Race condition | Shared mutable state without synchronisation; use ThreadSanitizer / Go race detector |
| State mutation | Does the function modify its input instead of returning a new value? Global state side effects? |
| Integration mismatch | Compare actual request/response with what each side expects: field names, encoding, content type |

## Production Debugging

| Technique | How |
|-----------|-----|
| Correlate logs with timestamps | Find the exact error moment; read context around it |
| Distributed tracing | Follow a trace/request ID across services (OpenTelemetry, Jaeger) |
| Feature flags | Disable the suspected feature; check if the problem stops |
| Canary deployment | Roll out to 1% of traffic; compare error rates |
| Reproduce in staging | Replay production traffic or data in a safe environment |

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Fixing the symptom | Ask "why" five times; fix the root cause |
| Shotgun debugging (changing things at random) | Stop. Form a hypothesis. Test it deliberately. |
| Debugging the wrong version | Verify your change is actually running — add a log, rebuild, clear cache |
| Blaming the library first | Prove it with a minimal isolated reproduction |
| Not reading the stack trace | Read top-to-bottom; find the first frame in your code |
| Debugging in production first | Reproduce locally; production debugging is the last resort |

## Best Practices

- Read the error message completely before touching anything.
- Reproduce first, fix second.
- Change one variable at a time.
- Use `git bisect` when you know it used to work.
- Write the reproduction as a test — it's your regression test for free.
- Check your assumptions: print the value you "know" is correct. It often isn't.
- Take a break after 30 minutes without progress — fresh eyes catch what tired eyes miss.
- Document non-trivial bugs: root cause, how you found it, and how you fixed it.
