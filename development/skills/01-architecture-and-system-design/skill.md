# 01 — Architecture & System Design

## Principles

- Design for changeability: every decision that is expensive to reverse deserves explicit thought.
- Dependencies must point inward — from volatile (UI, frameworks, I/O) toward stable (domain logic).
- Prefer composition over inheritance. Use inheritance only for genuine, stable "is-a" relationships.
- Group code by domain/feature, not by technical role (not `controllers/`, `services/`, `models/`).
- Make illegal states unrepresentable: encode invariants in the type system, not in scattered if-checks.
- Separate policy (business rules) from mechanism (infrastructure).

## SOLID Reference

| Principle | Practical Test |
|-----------|----------------|
| **S** — Single Responsibility | Can you describe what it does without using "and"? |
| **O** — Open/Closed | Can you add a new variant without editing an existing switch/if-chain? |
| **L** — Liskov Substitution | Does swapping the implementation break the caller's assumptions? |
| **I** — Interface Segregation | Does any implementor have a method that throws `NotImplemented`? |
| **D** — Dependency Inversion | Can you swap the DB/API/filesystem without touching business logic? |

## Dependency Rule

```
Frameworks & Drivers        ← Most volatile
  Interface Adapters
    Application Logic
      Domain / Entities     ← Most stable
```

Inner layers never import from outer layers. Outer layers depend on inner layers through interfaces/protocols.

## Common Patterns

| Pattern | Use When |
|---------|----------|
| **Layered** | Default starting point; clear separation of presentation, application, domain, infrastructure |
| **Hexagonal (Ports & Adapters)** | Domain must be testable in isolation; multiple delivery mechanisms (REST, CLI, queue) |
| **Event-Driven** | Multiple consumers react to the same event; eventual consistency is acceptable |
| **CQRS** | Read and write loads differ significantly; read shape doesn't match write shape |
| **Strategy** | Swap algorithms at runtime without conditionals |
| **Repository** | Abstract data access behind a collection-like interface |
| **Decorator** | Stack behaviours without modifying existing classes |

## DDD Essentials

| Concept | Rule |
|---------|------|
| **Ubiquitous Language** | Use the business's exact terms in code. If the business says "Policy", the class is `Policy`. |
| **Bounded Context** | "Account" in Billing and "Account" in Auth are different — keep them separate. |
| **Entity** | Has a unique identity that persists over time (`Order`, `User`). |
| **Value Object** | Defined by attributes, not identity. Immutable. (`Money(100, "USD")`) |
| **Aggregate** | Cluster of entities with one root as the single entry point. |
| **Domain Event** | Something that happened: `OrderPlaced`. Past tense. Immutable. |

## Architecture Decision Records (ADRs)

Store in `docs/decisions/`, numbered sequentially. Never mutate — supersede with a new ADR.

```markdown
# ADR-003: Use PostgreSQL for primary data store

## Status
Accepted

## Context
Need a relational DB with JSONB support and strong cloud provider support.

## Decision
Use PostgreSQL 16+, accessed through the repository pattern.

## Consequences
- Team needs PostgreSQL expertise.
- Switching DB later requires only rewriting repository adapters.
```

## Decision Checklist

Before committing to an architectural choice:
1. **Reversibility** — How expensive is it to change this later?
2. **Complexity budget** — Does the added complexity pay for itself?
3. **Team capability** — Can the team operate and debug this in production?
4. **Failure modes** — What happens when this component fails?
5. **Scale trajectory** — Will this hold for 10× the current load/data?

## Decomposition Strategies

| Strategy | Question |
|----------|----------|
| By domain | What business capabilities exist? |
| By volatility | What changes frequently vs. rarely? |
| By team | What can one team own end-to-end? |
| By risk | What is safety-critical and must be isolated? |

## Scale Guidance

| Project Type | Minimum Architecture |
|-------------|----------------------|
| Prototype / hackathon | Single file. Move fast. |
| Small tool (< 3 months) | Layered separation. Tests for critical logic. |
| Product (6+ months) | Bounded contexts. Repository pattern. ADRs. CI/CD. |
| Platform (years, multiple teams) | DDD. Hexagonal. Events. API contracts. |

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Big Ball of Mud (everything depends on everything) | Introduce bounded contexts; enforce the dependency rule |
| Resume-Driven Architecture (microservices for a CRUD app) | Match complexity to the problem; start simple |
| Premature abstraction (one-implementation interfaces) | Wait for the second use case before abstracting |
| God class / module | Extract by Single Responsibility |
| Leaky abstractions (DB errors in the UI) | Enforce the dependency rule; never let inner layers know about outer layers |
| Distributed monolith (services that must deploy together) | If they can't deploy independently, make them one service |
| Analysis paralysis | Timebox the decision; start with the simplest reversible approach |

## Best Practices

- Defer decisions until the last responsible moment; use interfaces to keep options open.
- Draw before you code — a 15-minute diagram prevents weeks of rework. Use C4 levels (Context → Container → Component).
- Write ADRs for every significant decision.
- Design for failure: every external dependency will fail — plan for timeouts, retries, and fallbacks.
- Apply YAGNI: build what's needed now, structured so change is possible.
- Review architecture in code review — structural decisions outweigh style choices.
- Make the implicit explicit: if a rule exists in the domain, encode it in the domain layer.
