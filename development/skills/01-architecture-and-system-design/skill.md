# 01 — Architecture & System Design

## Description

Decompose complex problems into manageable parts, choose the right structural patterns, and design software systems that are understandable, changeable, and resilient. This skill is language-agnostic — it is about **thinking in systems** rather than thinking in syntax.

Architecture is the set of decisions that are **expensive to change later**. Getting them right early — or at least making them reversible — is what separates codebases that thrive from codebases that calcify.

## When To Use

- Starting a new project or major feature and deciding how to organise code.
- A system is growing beyond what a single file or module can sustain.
- You need to separate concerns so that teams can work independently.
- Choosing between libraries, frameworks, or infrastructure approaches.
- Refactoring a tangled codebase into something maintainable.
- Making decisions that will be hard or costly to reverse later.

## Prerequisites

| Skill | Why |
|-------|-----|
| Proficiency in at least one programming language | You need to be able to think in abstractions beyond syntax |
| Basic understanding of data structures | Choosing the right data model is half the architecture |

## Instructions

### 1 — The Core Principle: Manage Complexity

Software architecture exists for one reason: **to manage complexity so that humans can reason about the system**.

Every technique below — from SOLID to hexagonal architecture — is a strategy for keeping the mental model small enough to hold in your head at any given time.

The two enemies of comprehension are:
1. **Coupling** — when changing A forces you to change B, C, and D.
2. **Cognitive load** — when understanding A requires understanding B, C, and D.

Good architecture minimises both.

### 2 — Foundational Principles

#### 2.1 — Separation of Concerns

Every module, class, or function should have one **reason to exist**. When you read a piece of code, you should be able to answer: *"What concern does this handle?"* in one sentence.

```
BAD:  UserService handles authentication, profile CRUD, email sending, and billing.
GOOD: AuthService, ProfileService, EmailService, BillingService — each owns one concern.
```

#### 2.2 — SOLID Principles

| Principle | One-Sentence Summary | Practical Test |
|-----------|---------------------|----------------|
| **S** — Single Responsibility | A class has one reason to change | Can you describe what it does without using "and"? |
| **O** — Open/Closed | Extend behaviour without modifying existing code | Can you add a new variant without editing the switch/if-chain? |
| **L** — Liskov Substitution | Subtypes must be usable wherever the base type is expected | Does swapping the implementation break the caller's assumptions? |
| **I** — Interface Segregation | Clients shouldn't depend on methods they don't use | Does any implementor have a method that throws `NotImplemented`? |
| **D** — Dependency Inversion | Depend on abstractions, not concretions | Can you swap the database/API/filesystem without touching business logic? |

#### 2.3 — Composition Over Inheritance

Inheritance creates tight coupling (the fragile base class problem). Prefer composing behaviour from small, focused pieces:

```python
# Inheritance approach (fragile)
class FlyingSwimmingAnimal(FlyingAnimal, SwimmingAnimal):  # Diamond problem
    pass

# Composition approach (flexible)
class Duck:
    def __init__(self):
        self.fly_behaviour = StandardFlight()
        self.swim_behaviour = FloatSwim()

    def fly(self):
        self.fly_behaviour.execute(self)

    def swim(self):
        self.swim_behaviour.execute(self)
```

**Rule of thumb:** Use inheritance for *"is-a"* relationships that are genuinely stable (they almost never are). Use composition for everything else.

#### 2.4 — The Dependency Rule

Dependencies should always point **inward** — from less stable (UI, frameworks, I/O) toward more stable (business logic, domain model):

```
    ┌─────────────────────────────────────────┐
    │           Frameworks & Drivers           │  ← Most volatile
    │  ┌─────────────────────────────────────┐ │
    │  │        Interface Adapters           │ │
    │  │  ┌─────────────────────────────────┐│ │
    │  │  │        Application Logic        ││ │
    │  │  │  ┌─────────────────────────────┐││ │
    │  │  │  │      Domain / Entities      │││ │  ← Most stable
    │  │  │  └─────────────────────────────┘││ │
    │  │  └─────────────────────────────────┘│ │
    │  └─────────────────────────────────────┘ │
    └─────────────────────────────────────────┘
```

Inner layers **never** import from outer layers. Outer layers depend on inner layers through abstractions (interfaces/protocols).

### 3 — Common Architectural Patterns

#### 3.1 — Layered Architecture

The most common starting point. Organise code into horizontal layers:

```
┌──────────────────┐
│   Presentation   │   UI, CLI, API controllers
├──────────────────┤
│    Application   │   Use cases, orchestration, DTOs
├──────────────────┤
│      Domain      │   Business rules, entities, value objects
├──────────────────┤
│  Infrastructure  │   Database, file system, external APIs, messaging
└──────────────────┘
```

**Each layer only calls the layer directly below it.** The domain layer has zero dependencies on infrastructure.

#### 3.2 — Hexagonal Architecture (Ports & Adapters)

The domain sits at the centre. All external concerns connect through **ports** (interfaces defined by the domain) and **adapters** (implementations of those interfaces):

```
                    ┌────────────┐
        ┌──────────►│  REST API  │ (Driving adapter)
        │           └────────────┘
        │
   ┌────┴────┐      ┌──────────────────┐      ┌──────────────┐
   │  Port   │◄────►│   Domain Core    │◄────►│     Port     │
   │ (in)    │      │  (pure logic)    │      │    (out)     │
   └────┬────┘      └──────────────────┘      └──────┬───────┘
        │                                            │
        │           ┌────────────┐                   │
        └──────────►│    CLI     │    ┌──────────────┘
                    └────────────┘    │
                                ┌────┴──────────┐
                                │   PostgreSQL  │ (Driven adapter)
                                └───────────────┘
```

**Why this matters:** You can swap PostgreSQL for MongoDB, or a REST API for a CLI, without changing a single line of domain code. Testing also becomes trivial — inject in-memory adapters.

```typescript
// Port (interface defined by the domain)
interface OrderRepository {
  save(order: Order): Promise<void>;
  findById(id: string): Promise<Order | null>;
}

// Adapter (infrastructure implements the port)
class PostgresOrderRepository implements OrderRepository {
  async save(order: Order): Promise<void> { /* SQL insert */ }
  async findById(id: string): Promise<Order | null> { /* SQL select */ }
}

// Test adapter
class InMemoryOrderRepository implements OrderRepository {
  private orders: Map<string, Order> = new Map();
  async save(order: Order) { this.orders.set(order.id, order); }
  async findById(id: string) { return this.orders.get(id) ?? null; }
}
```

#### 3.3 — Event-Driven Architecture

Systems communicate by publishing and subscribing to events rather than calling each other directly. This decouples producers from consumers:

```
OrderService                          InventoryService
    │                                       │
    │── publishes ──► OrderPlaced ──────────►│ (subscribes)
    │                     │                  │── reduces stock
    │                     │
    │                     ▼
    │              NotificationService
    │                     │── sends confirmation email
```

**When to reach for events:**
- Multiple systems need to react to the same thing.
- You don't want the publisher to know about (or wait for) all consumers.
- Operations can be eventually consistent rather than immediately consistent.

#### 3.4 — CQRS (Command Query Responsibility Segregation)

Separate the **write model** (commands that change state) from the **read model** (queries that return data). Each can be optimised independently:

```
Commands (writes)                    Queries (reads)
┌──────────────┐                    ┌──────────────────┐
│ CreateOrder   │──► Write DB ──►  │ OrderSummaryView  │──► Read DB/Cache
│ CancelOrder   │   (normalised)   │ OrderDetailView   │   (denormalised)
│ UpdateAddress  │                  │ DashboardView     │
└──────────────┘                    └──────────────────┘
```

**Use CQRS when:** read and write loads differ dramatically, or the read shape doesn't match the write shape.

### 4 — Design Patterns That Matter Most

Out of the original 23 GoF patterns, these are the ones you'll use constantly:

| Pattern | Problem It Solves | Example |
|---------|-------------------|---------|
| **Strategy** | Swap algorithms at runtime without conditionals | Payment processing: CreditCard, PayPal, Crypto — each implements `PaymentStrategy` |
| **Observer/Pub-Sub** | Notify multiple objects of state changes without coupling | UI reacting to model changes; event buses |
| **Factory** | Create objects without specifying the exact class | `NotificationFactory.create("email")` returns `EmailNotification` |
| **Repository** | Abstract data access behind a collection-like interface | `userRepository.findByEmail(email)` — caller doesn't know if it's SQL, Mongo, or an API |
| **Decorator** | Add behaviour to an object without modifying its class | `LoggingRepository(CachingRepository(SqlRepository()))` — each wraps the next |
| **Adapter** | Make incompatible interfaces work together | Wrapping a third-party API to fit your port interface |
| **Mediator** | Reduce many-to-many dependencies to many-to-one | A message bus / command dispatcher that routes requests |

### 5 — Domain-Driven Design (DDD) Essentials

DDD is a set of techniques for modelling complex business domains. You don't need all of it, but these concepts are universally valuable:

| Concept | What It Is |
|---------|-----------|
| **Ubiquitous Language** | The whole team (devs, designers, stakeholders) uses the same terms in code and conversation. If the business says "Policy", the class is `Policy` — not `InsuranceDocument`. |
| **Bounded Context** | A boundary within which a term has a specific meaning. "Account" means different things in Billing vs. Authentication — they are separate bounded contexts. |
| **Entity** | An object with a unique identity that persists over time (`User`, `Order`). |
| **Value Object** | An object defined by its attributes, not identity. Two `Money(100, "USD")` are the same. Immutable. |
| **Aggregate** | A cluster of entities treated as a single unit for data changes. The **aggregate root** is the entry point (e.g., `Order` is the root; `OrderLine` is accessed through it). |
| **Domain Event** | Something that happened in the domain: `OrderPlaced`, `PaymentReceived`. Past tense. Immutable. |

### 6 — Making Architectural Decisions

#### Architecture Decision Records (ADRs)

Document significant decisions in a lightweight format:

```markdown
# ADR-003: Use PostgreSQL for primary data store

## Status
Accepted

## Context
We need a relational database that supports JSONB for flexible
schema extensions, has strong community support, and runs well
on our cloud provider.

## Decision
Use PostgreSQL 16+ as the primary data store, accessed through
the repository pattern so the domain has no direct SQL dependency.

## Consequences
- Team needs PostgreSQL expertise (mitigated: 3 of 5 devs have experience).
- We accept the operational cost of managing a relational DB.
- JSONB columns allow us to store semi-structured data without a separate document store.
- Switching to another DB later requires only rewriting the repository adapters.
```

Store ADRs in `docs/decisions/` and number them sequentially. They are **immutable** — when you reverse a decision, write a new ADR that supersedes the old one.

#### Decision Criteria Checklist

Before committing to an architectural choice, ask:

1. **Reversibility** — How expensive is it to change this decision later?
2. **Complexity budget** — Does the added complexity pay for itself?
3. **Team capability** — Can the team operate and debug this in production?
4. **Failure modes** — What happens when this component fails?
5. **Scale trajectory** — Will this hold for 10× users/data/traffic?

### 7 — System Design Thinking

#### Decomposition Strategies

| Strategy | Question It Answers | Example |
|----------|-------------------|---------|
| **By domain** | What business capabilities exist? | Payments, Inventory, Shipping, Notifications |
| **By volatility** | What changes frequently vs. rarely? | UI (fast) vs. core business rules (slow) |
| **By team** | What can a team own end-to-end? | Team A owns search; Team B owns checkout |
| **By data** | What data belongs together? | User profile data vs. analytics data |
| **By risk** | What is safety-critical? | Payment processing isolated from recommendations |

#### Drawing System Diagrams

Use the **C4 Model** (Context, Containers, Components, Code) to communicate at the right level of abstraction:

| Level | Audience | Shows |
|-------|----------|-------|
| **1 — Context** | Everyone | System boundary, users, external systems |
| **2 — Container** | Developers + Ops | Applications, databases, message queues |
| **3 — Component** | Developers | Major structural blocks within a container |
| **4 — Code** | Developer working on it | Classes, interfaces, relationships |

Start at Level 1 and only zoom in when the audience needs it.

### 8 — API Design Principles

APIs are the **contracts** between components. A bad API is an architectural trap.

| Principle | Explanation |
|-----------|-------------|
| **Consistency** | If `getUser()` returns a `User`, then `getOrder()` should return an `Order` — not a dictionary, not a tuple |
| **Least surprise** | The API should behave as a reasonable person would expect from its name |
| **Small surface area** | Expose the minimum needed. You can always add; removing is a breaking change |
| **Fail explicitly** | Return typed errors or exceptions — never silently return null/empty when something went wrong |
| **Versioning** | Plan for change from day one (URL versioning, header versioning, or semantic versioning for libraries) |
| **Idempotency** | Operations that can be safely retried (PUT, DELETE) should produce the same result on repeated calls |

### 9 — When to Invest in Architecture

Not every project needs hexagonal architecture and DDD. The investment should match the project's **lifespan and complexity**:

| Project Type | Architectural Investment |
|-------------|------------------------|
| **Prototype / hackathon** | Minimal. Single file. Move fast. Throw it away. |
| **Small tool (< 3 months)** | Layered separation. Tests for critical logic. Simple patterns. |
| **Product (6+ months)** | Bounded contexts. Repository pattern. CI/CD. ADRs. |
| **Platform (years, multiple teams)** | DDD. Hexagonal. Event-driven. API contracts. Formal documentation. |

**The biggest architectural mistake is premature complexity.** The second biggest is no architecture at all. Both create systems that resist change.

## Best Practices

1. **Defer decisions until the last responsible moment** — the more you know, the better the decision. Use abstractions (interfaces) to keep options open.
2. **Optimise for changeability, not perfection** — you will be wrong about some decisions. Make them cheap to reverse.
3. **Draw before you code** — a 15-minute whiteboard session prevents weeks of rework. Use C4 diagrams.
4. **Make the implicit explicit** — if a rule exists in the domain, it should exist as code in the domain layer, not as an IF statement scattered across the codebase.
5. **Write ADRs for every significant decision** — future you (and your team) will thank you.
6. **Design for failure** — every external dependency will fail. Plan for timeouts, retries, circuit breakers, and fallbacks.
7. **Limit the blast radius** — isolate components so a failure in one doesn't cascading through the system.
8. **Apply YAGNI ruthlessly** — don't build for hypothetical future requirements. Build what's needed now, but structure it so change is possible.
9. **Separate policy from mechanism** — business rules (what to do) should be separate from infrastructure (how to do it).
10. **Review architecture in code review** — structural decisions are more impactful than style choices. Prioritise review effort accordingly.

## Common Pitfalls

| Pitfall | How It Manifests | Fix |
|---------|-----------------|-----|
| **Big Ball of Mud** | Everything depends on everything; no clear boundaries | Introduce boundaries gradually; start with the most volatile seam |
| **Resume-Driven Architecture** | Microservices, event sourcing, and Kubernetes for a CRUD app | Match complexity to the problem. Start simple, evolve as needed |
| **Premature abstraction** | Interfaces with a single implementation "just in case" | Wait for the second use case before abstracting. Three uses = pattern |
| **God class / God module** | One class/file that does everything | Extract responsibilities. Apply Single Responsibility Principle |
| **Leaky abstractions** | Database errors surfacing in the UI; HTTP concepts in the domain | Enforce the dependency rule. Inner layers never know about outer layers |
| **Distributed monolith** | Microservices that must be deployed together | If services can't be deployed independently, they should be one service |
| **Analysis paralysis** | Spending weeks choosing between patterns before writing code | Set a timebox. Make the decision reversible. Start with the simplest approach |
| **Ignoring the domain** | Technical organisation (controllers, services, models) instead of domain organisation (orders, payments, users) | Group by feature / domain, not by technical role |

## Reference

- **Clean Architecture** — Robert C. Martin (the dependency rule, use cases, boundaries)
- **A Philosophy of Software Design** — John Ousterhout (complexity management, deep vs. shallow modules)
- **Domain-Driven Design** — Eric Evans (bounded contexts, ubiquitous language, aggregates)
- **Designing Data-Intensive Applications** — Martin Kleppmann (data architecture, event sourcing, CQRS)
- [C4 Model](https://c4model.com/) — Simon Brown (system diagramming)
- [ADR GitHub Org](https://adr.github.io/) — Architecture Decision Record templates and tooling
- [The Twelve-Factor App](https://12factor.net/) — Methodology for building modern, deployable applications
