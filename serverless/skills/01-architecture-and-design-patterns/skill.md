# Architecture & Design Patterns

## Workload Fit

- Use serverless for spiky/unpredictable traffic, short executions (<15 min), and stateless request/response workloads
- Avoid serverless for constant high-throughput (>70% utilisation), sub-millisecond latency requirements, and stateful in-memory workloads
- Apply the serverless decision per-workload, not per-application — mix functions, containers, and managed services as needed

## Event-Driven Design

- Treat every function invocation as a reaction to an event — HTTP requests, queue messages, schedules, stream records, file uploads
- Name events in past tense to describe facts: `OrderPlaced`, `PaymentFailed`, `UserRegistered`
- Keep producers ignorant of consumers — connect them through event buses, queues, or topics, never direct calls
- Design for eventual consistency from the start; do not fight it

## Choreography vs Orchestration

- Use choreography (independent event reactions) for up to 3 loosely coupled steps
- Use orchestration (Step Functions, Durable Functions) for more than 3 ordered steps, error compensation, or human-in-the-loop workflows
- Never build a custom orchestrator inside a function — use a managed workflow engine

## Composition Patterns

- **Function chain**: connect sequential steps with queues for durability between each step
- **Fan-out/fan-in**: publish N messages from one function, process in parallel, aggregate results
- **Async HTTP**: accept request with 202, enqueue work, expose a status polling endpoint
- **Claim-check**: store large payloads in object storage and pass the reference in the event
- **Event fork**: publish to a topic and let multiple independent subscribers react

## Bounded Contexts

- Organise functions into bounded contexts (e.g. `orders/`, `payments/`, `notifications/`)
- Share code within a context via a local `shared/` module; never share across contexts through direct imports
- Communicate across bounded contexts only through events or APIs, never through shared databases
- Each context owns its own data store exclusively
- Version event schemas and publish them to a shared schema library

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Monolith function handling all routes/events | Split into single-responsibility functions |
| Lambda pinball — synchronous SDK calls between functions | Use queues or event buses between functions |
| Serverless for WebSockets or long-running constant-throughput workloads | Use containers or managed services |
| Multiple services sharing the same database tables | Each service owns its data; synchronise via events |
| No dead-letter queue on async event sources | Configure a DLQ on every async trigger |
| Synchronous fan-out — calling 10 APIs sequentially | Use parallel invocation or queue-based fan-out |

## Best Practices

- Design every handler for failure: apply retries, DLQs, and circuit breakers on all external calls
- Make every event handler idempotent — at-least-once delivery is the default on all platforms
- Keep functions small: single purpose, short execution time, minimal package size
- Use managed services (queues, event buses, object storage) as connective tissue — do not build messaging infrastructure inside functions
- Version event schemas from day one using a naming convention such as `com.myapp.OrderPlaced.v2`
- Attach a correlation ID to every event and propagate it across all function invocations
- Start with a small number of functions per bounded context; split only when there is a concrete scaling or deployment reason
- Plan for cold starts on user-facing synchronous paths before reaching production
