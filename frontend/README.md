# Frontend Skills

Stack-agnostic frontend development skills that apply across React, Vue, Svelte, Angular, and any component-based UI framework. These cover the domain-specific knowledge that sits between universal development fundamentals and framework-specific tooling.

## Skills

| # | Skill | Summary |
|---|-------|---------|
| 01 | [Component Architecture](skills/01-component-architecture/skill.md) | Decompose, compose, and organise UI components into maintainable hierarchies |
| 02 | [State Management](skills/02-state-management/skill.md) | Choose, structure, and maintain application state — local, global, server, and URL |
| 03 | [Responsive Design](skills/03-responsive-design/skill.md) | Build layouts that work across screen sizes with fluid, intrinsic techniques |
| 04 | [Accessibility](skills/04-accessibility/skill.md) | Build UIs usable by everyone — semantic HTML, ARIA, keyboard, focus management |
| 05 | [Performance & Core Web Vitals](skills/05-performance-and-core-web-vitals/skill.md) | Measure and improve loading speed, responsiveness, and visual stability |

## How These Skills Relate

```
        ┌───────────────────────────┐
        │ 01 Component Architecture │  ← How you structure everything
        └─────────────┬─────────────┘
                      │
       ┌──────────────┼──────────────┐
       ▼              ▼              ▼
┌────────────┐ ┌─────────────┐ ┌────────────────┐
│ 02 State   │ │ 03 Layouts  │ │ 04 Accessibility│
│ Management │ │ & Responsive│ │                 │
└──────┬─────┘ └──────┬──────┘ └────────┬────────┘
       │              │                 │
       └──────────────┼─────────────────┘
                      ▼
           ┌──────────────────────┐
           │ 05 Performance &     │  ← The constraint on all decisions
           │ Core Web Vitals      │
           └──────────────────────┘
```

Component architecture determines how state flows and how layouts compose. Accessibility is a cross-cutting concern that touches every component. Performance is the constraint that validates all other decisions — a perfectly architected, accessible app that takes 10 seconds to load still fails users.
