# Accessibility Audit

Audit the following component or page for accessibility (a11y) compliance.

## Check Against

1. **Semantic HTML** — Are the correct elements used (`<button>` not `<div onClick>`, `<nav>`, `<main>`, headings in order)?
2. **Keyboard navigation** — Can all interactive elements be reached and activated with keyboard alone?
3. **ARIA attributes** — Are `aria-label`, `aria-describedby`, `role`, `aria-live` used correctly? Are they missing where needed?
4. **Focus management** — Is focus trapped in modals? Does focus move logically after actions?
5. **Colour contrast** — Are text and interactive elements meeting WCAG AA contrast ratios (4.5:1 for text, 3:1 for large text)?
6. **Screen reader** — Will the content make sense when read linearly? Are decorative images hidden (`aria-hidden`, empty `alt`)?
7. **Form labels** — Do all inputs have visible, associated `<label>` elements?
8. **Motion** — Is `prefers-reduced-motion` respected for animations?

## Output Format

For each issue:

- **Element**: Which component or element
- **WCAG Criterion**: e.g. 1.1.1 Non-text Content
- **Severity**: 🔴 Violation / 🟡 Warning / 🟢 Best Practice
- **Issue**: What's wrong
- **Fix**: Code example showing the corrected markup
