# Responsive Design & Layouts

## Description

Build UIs that work across screen sizes, input methods, and device capabilities — without maintaining separate codebases. This skill covers the universal layout and responsive design principles that apply regardless of your CSS framework or component library: fluid grids, container-aware components, breakpoint strategy, and the techniques that eliminate the need for most media queries.

## When To Use

- Starting a new page or feature layout
- A design is provided for desktop and you need to make it work on mobile
- Choosing between CSS Grid, Flexbox, or a layout framework
- Components break or look wrong at certain screen sizes
- Evaluating whether a UI needs a dedicated mobile experience vs a responsive one

## Prerequisites

- Solid understanding of CSS box model, display types, and positioning
- Basic familiarity with media queries and viewport units

## Instructions

### 1. Start Mobile-First

Write base styles for the smallest viewport, then layer on complexity for larger screens with `min-width` media queries:

```css
/* Base: mobile (single column) */
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

/* Tablet and up */
@media (min-width: 48rem) {
  .grid { grid-template-columns: repeat(2, 1fr); }
}

/* Desktop */
@media (min-width: 64rem) {
  .grid { grid-template-columns: repeat(3, 1fr); }
}
```

**Why mobile-first:**
- Forces you to prioritise content — what matters most gets designed first
- Progressive enhancement is more robust than graceful degradation
- Mobile styles are simpler; adding complexity is easier than removing it

### 2. Use Intrinsic Sizing Over Fixed Breakpoints

Many layouts don't need media queries at all. Modern CSS can respond to available space:

```css
/* Cards that auto-wrap: minimum 280px, fill remaining space */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr));
  gap: 1rem;
}
```

**Key intrinsic techniques:**
- `auto-fill` / `auto-fit` with `minmax()` for self-wrapping grids
- `flex-wrap: wrap` with `flex-basis` for flowing layouts
- `clamp()` for fluid typography and spacing: `font-size: clamp(1rem, 0.5rem + 1.5vw, 1.5rem)`
- `min()`, `max()` for capping dimensions without media queries

### 3. Choose the Right Layout Tool

| Tool | Best for | Avoid when |
|------|----------|------------|
| **Flexbox** | Single-axis layouts: nav bars, button groups, card rows | You need explicit row+column control |
| **CSS Grid** | Two-dimensional layouts: page shells, dashboards, galleries | Single-row content that just wraps |
| **Container Queries** | Component-level responsiveness based on parent width | You need viewport-level breakpoints |

Use them together — Grid for the page skeleton, Flexbox for component internals.

### 4. Design with a Spacing and Sizing Scale

Use a consistent scale (e.g., 4px base: 4, 8, 12, 16, 24, 32, 48, 64) via CSS custom properties:

```css
:root {
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;
  --space-2xl: 3rem;
}
```

- Every margin, padding, and gap should reference the scale
- Fluid scaling with `clamp()` keeps proportions right across viewports
- A consistent scale creates visual rhythm without effort

### 5. Handle Typography Responsively

Don't set fixed `font-size` values at every breakpoint. Use fluid type:

```css
:root {
  --text-base: clamp(1rem, 0.875rem + 0.5vw, 1.125rem);
  --text-lg: clamp(1.25rem, 1rem + 0.75vw, 1.5rem);
  --text-xl: clamp(1.5rem, 1.125rem + 1.25vw, 2rem);
}
```

- Set `font-size` on `<html>` for global scaling
- Use `rem` for font sizes and `em` for component-relative spacing
- Ensure line-height adjusts with size (tighter for headings, looser for body)

### 6. Consider Touch and Input Method

Responsive isn't just about size — input method matters:

- **Touch targets:** Minimum 44×44px (Apple HIG) / 48×48dp (Material)
- **Hover states:** Never hide critical functionality behind hover. Use `@media (hover: hover)` to add hover enhancements only when supported
- **Focus indicators:** Visible keyboard focus styles are non-negotiable for accessibility

## Best Practices

- **Set a max-width on content containers.** Lines wider than ~75 characters hurt readability. Use `max-width: 70ch` for text blocks.
- **Use container queries for reusable components.** A card component should respond to its container width, not the viewport. This makes it work in sidebars, modals, and full-width layouts without modification.
- **Test at arbitrary widths, not just device presets.** Bugs live between breakpoints. Drag the browser edge continuously.
- **Use logical properties** (`margin-inline`, `padding-block`) for RTL/LTR compatibility.
- **Avoid fixed heights on content containers.** Content length varies — let it flow naturally.
- **Use `aspect-ratio` for media.** Replace the `padding-top` hack: `aspect-ratio: 16 / 9`.

## Common Pitfalls

- **Breakpoint-driven thinking.** Designing for "mobile, tablet, desktop" as three fixed layouts instead of a fluid continuum. Breakpoints should adjust layout, not define it.
- **Pixel-based everything.** Using `px` for font sizes disables the user's browser font-size preference, which is an accessibility issue.
- **Hiding content on mobile.** If content isn't important enough for mobile, question whether it's important at all. Hiding is not a layout strategy.
- **Viewport units for typography without clamp.** `font-size: 5vw` alone becomes unreadably large on wide screens and tiny on narrow ones. Always clamp.
- **z-index wars.** Stacking context issues often come from not understanding containing blocks. Avoid arbitrary high values; establish a z-index scale.
- **Overflow hiding.** `overflow: hidden` masks layout bugs. Find and fix the actual overflow source.

## Reference

- [Every Layout — Reusable CSS Layout Primitives](https://every-layout.dev/)
- [CSS Grid — MDN Guide](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout)
- [Container Queries — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries)
- [Utopia — Fluid Type and Space Calculator](https://utopia.fyi/)
