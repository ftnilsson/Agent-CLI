# Backend Skills

Stack-agnostic backend development skills that apply across Node.js, .NET, Python, Go, Java, and any server-side platform. These cover the domain-specific knowledge that sits between universal development fundamentals and framework/language-specific tooling.

## Skills

| # | Skill | Summary |
|---|-------|---------|
| 01 | [API Design](skills/01-api-design/skill.md) | Design consistent, versioned APIs with proper error handling and pagination |
| 02 | [Database Modelling](skills/02-database-modelling/skill.md) | Schema design, normalisation, indexing, and safe migrations |
| 03 | [Authentication & Authorisation](skills/03-authentication-and-authorization/skill.md) | Token-based auth, OAuth/OIDC, RBAC, and secure session management |
| 04 | [Messaging & Async Patterns](skills/04-messaging-and-async/skill.md) | Queues, pub/sub, event-driven architecture, and reliable delivery |
| 05 | [Observability](skills/05-observability/skill.md) | Structured logging, metrics, distributed tracing, health checks, and alerting |

## How These Skills Relate

```
                ┌──────────────────────┐
                │   01 API Design      │  ← The contract with consumers
                └──────────┬───────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                  ▼
┌─────────────────┐ ┌──────────────┐ ┌───────────────────┐
│ 02 Database     │ │ 03 Auth      │ │ 04 Messaging &    │
│ Modelling       │ │ & Authz      │ │ Async Patterns    │
└────────┬────────┘ └──────┬───────┘ └────────┬──────────┘
         │                 │                   │
         └─────────────────┼───────────────────┘
                           ▼
              ┌──────────────────────┐
              │ 05 Observability     │  ← See everything in production
              └──────────────────────┘
```

API design defines the boundary. Database modelling stores the state. Auth controls who can do what. Messaging decouples operations. Observability ties it all together by making the runtime behaviour visible, diagnosable, and measurable.
