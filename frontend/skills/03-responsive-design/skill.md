# Responsive Design & Layouts

## Layout Tool Selection

| Tool | Best for | Avoid when |
|------|----------|------------|
| **Flexbox** | Single-axis layouts: nav bars, button groups, card rows | You need explicit row and column control |
| **CSS Grid** | Two-dimensional layouts: page shells, dashboards, galleries | Single-row content that simply wraps |
| **Container Queries** | Component-level responsiveness based on parent width | You need viewport-level breakpoints |

Use Grid for the page skeleton and Flexbox for component internals. Combine them freely.

## Mobile-First Approach

Write base styles for the smallest viewport, then layer complexity upward with `min-width` queries:

```css
.grid { display: grid; grid-template-columns: 1fr; gap: 1rem; }

@media (min-width: 48rem) {
  .grid { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 64rem) {
  .grid { grid-template-columns: repeat(3, 1fr); }
}
```

- Design for the smallest viewport first — it forces content prioritisation.
- Adding complexity is safer than removing it after the fact.

## Intrinsic Sizing — Reduce Media Queries

Prefer layouts that respond to available space without explicit breakpoints:

- `repeat(auto-fill, minmax(min(280px, 100%), 1fr))` — self-wrapping card grids
- `flex-wrap: wrap` with `flex-basis` — flowing layouts
- `clamp(min, preferred, max)` — fluid typography and spacing
- `min()`, `max()` — cap dimensions without media queries

## Spacing and Sizing Scale

Define a consistent scale via CSS custom properties and reference it everywhere:

```css
:root {
  --space-xs: 0.25rem;  --space-sm: 0.5rem;
  --space-md: 1rem;     --space-lg: 1.5rem;
  --space-xl: 2rem;     --space-2xl: 3rem;
}
```

Every margin, padding, and gap must reference the scale. Never use arbitrary pixel values for spacing.

## Fluid Typography

Never set fixed `font-size` values at individual breakpoints. Use `clamp()`:

```css
:root {
  --text-base: clamp(1rem, 0.875rem + 0.5vw, 1.125rem);
  --text-lg:   clamp(1.25rem, 1rem + 0.75vw, 1.5rem);
  --text-xl:   clamp(1.5rem, 1.125rem + 1.25vw, 2rem);
}
```

- Use `rem` for font sizes and `em` for component-relative spacing.
- Never use `px` for font sizes — it disables the user's browser font-size preference.
- Always clamp viewport-unit font sizes; `font-size: 5vw` alone is unreadable at extremes.

## Touch and Input

- Touch targets: minimum 44×44px (Apple HIG) / 48×48dp (Material).
- Never hide critical functionality behind hover. Use `@media (hover: hover)` to add hover enhancements only where supported.
- Visible keyboard focus indicators are non-negotiable.

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Three fixed layouts (mobile / tablet / desktop) | Design a fluid continuum; breakpoints adjust layout, not define it |
| `px` for font sizes | Use `rem`; respect user font preferences |
| Hiding content on mobile with `display: none` | Remove content that isn't important enough for mobile, or rethink the priority |
| `font-size: 5vw` without `clamp()` | Always clamp viewport-unit values |
| `overflow: hidden` to mask layout bugs | Find and fix the actual overflow source |
| Arbitrary high `z-index` values | Define a z-index scale; understand stacking contexts |

## Best Practices

- Set `max-width: 70ch` on text containers — lines wider than ~75 characters hurt readability.
- Use container queries for reusable components so they respond to parent width, not viewport width.
- Test at arbitrary widths by dragging the browser edge continuously, not just at device presets — bugs live between breakpoints.
- Use logical properties (`margin-inline`, `padding-block`) for automatic RTL/LTR compatibility.
- Never set fixed heights on content containers; let content flow naturally.
- Use `aspect-ratio` for media — replace the `padding-top` percentage hack.
- Use `aspect-ratio` on image containers to reserve space before images load, preventing layout shift.
- Apply `@media (prefers-reduced-motion: reduce)` to disable or simplify animations.
