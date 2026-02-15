# Accessibility

## Description

Build user interfaces that are usable by everyone — including people who use screen readers, keyboard-only navigation, voice control, magnification, and other assistive technologies. This skill covers the practical, framework-agnostic fundamentals of web accessibility (a11y): semantic HTML, ARIA, keyboard interaction, colour contrast, focus management, and how to test for compliance.

## When To Use

- Building any user-facing component or page
- Creating custom interactive widgets (dropdowns, modals, tabs, date pickers)
- Reviewing a PR that changes UI markup or interaction patterns
- An audit or automated test flags accessibility issues
- Choosing between a custom component and a native HTML element

## Prerequisites

- HTML and CSS fundamentals (especially form elements and document structure)
- Basic understanding of component architecture

## Instructions

### 1. Start with Semantic HTML

The most impactful accessibility improvement is using the right element:

| Instead of | Use | Why |
|-----------|-----|-----|
| `<div onclick>` | `<button>` | Free keyboard support, focus, screen reader announcement |
| `<div class="link">` | `<a href>` | Navigable, right-click, open-in-new-tab |
| `<div class="input">` | `<input>` / `<select>` | Form submission, autofill, validation |
| `<div class="heading">` | `<h1>`–`<h6>` | Document outline for screen readers |
| `<div class="list">` | `<ul>` / `<ol>` | "List of 5 items" announcement |
| `<div class="table">` | `<table>` | Row/column navigation, header association |

**Native elements provide behaviour for free:** focus management, keyboard interaction, screen reader semantics, form participation. Every custom replacement of a native element is a liability.

### 2. Use ARIA Correctly

ARIA (Accessible Rich Internet Applications) is for when HTML semantics aren't enough — primarily custom widgets.

**The five rules of ARIA:**
1. **Don't use ARIA if native HTML works.** `<button>` beats `<div role="button">` every time.
2. **Don't change native semantics.** `<h2 role="tab">` confuses everyone.
3. **All interactive ARIA controls must be keyboard accessible.**
4. **Don't use `role="presentation"` or `aria-hidden="true"` on focusable elements.**
5. **All interactive elements must have an accessible name.**

**Common ARIA patterns:**

```html
<!-- Label an icon-only button -->
<button aria-label="Close dialog">
  <svg>...</svg>
</button>

<!-- Associate a description -->
<input aria-describedby="password-hint" type="password" />
<p id="password-hint">Must be at least 8 characters</p>

<!-- Live region for dynamic updates -->
<div aria-live="polite" role="status">
  3 results found
</div>

<!-- Mark decorative content -->
<img src="divider.svg" alt="" role="presentation" />
```

### 3. Manage Focus Intentionally

Focus must follow the user's mental model:

- **Modals/dialogs:** Trap focus inside. Return focus to the trigger on close.
- **Route changes (SPA):** Move focus to the new page's main heading or content area.
- **Dynamic content:** When new content appears (toast, inline error, expanded section), either move focus there or use `aria-live` to announce it.
- **Delete operations:** When an item is removed from a list, move focus to the next item or a logical fallback.

```html
<!-- Focus trapping hint for dialogs -->
<dialog> <!-- native dialog handles focus trapping -->
  <h2>Confirm action</h2>
  <button>Cancel</button>
  <button>Confirm</button>
</dialog>
```

**Never remove the focus indicator.** Customise it, but don't hide it:

```css
/* Remove default only if you provide a visible custom indicator */
:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}
```

### 4. Ensure Sufficient Colour Contrast

WCAG 2.1 AA requirements:
- **Normal text:** 4.5:1 contrast ratio against background
- **Large text (≥18pt / ≥14pt bold):** 3:1 ratio
- **UI components and graphics:** 3:1 ratio

Practical rules:
- Never use colour alone to convey information (add icons, patterns, or labels)
- Test with a contrast checker during design, not after implementation
- Support forced-colours / high-contrast mode with `@media (forced-colors: active)`

### 5. Build Keyboard Navigation

All interactive elements must be operable with keyboard alone:

| Key | Expected behaviour |
|-----|--------------------|
| `Tab` / `Shift+Tab` | Move between interactive elements |
| `Enter` / `Space` | Activate buttons, links, checkboxes |
| `Arrow keys` | Navigate within composite widgets (tabs, menus, radio groups) |
| `Escape` | Close modals, dropdowns, popovers |
| `Home` / `End` | Jump to first/last item in a list |

**Tab order should match visual order.** Avoid `tabindex` values greater than 0. Use `tabindex="0"` to add an element to the natural flow, `tabindex="-1"` to make it programmatically focusable but not in the tab order.

### 6. Label Everything

Every form control needs a visible, associated label:

```html
<!-- Explicit association -->
<label for="email">Email address</label>
<input id="email" type="email" />

<!-- Implicit association -->
<label>
  Email address
  <input type="email" />
</label>
```

- **Placeholder is not a label.** It disappears on input and has poor contrast.
- **Groups of controls** (radio buttons, checkboxes) need a `<fieldset>` with `<legend>`.
- **Icon buttons** need `aria-label` or visually hidden text.

## Best Practices

- **Test with a screen reader regularly.** Even 10 minutes with VoiceOver (macOS) or NVDA (Windows) reveals issues no automated tool catches.
- **Use automated testing as a baseline.** axe-core, Lighthouse, and eslint-plugin-jsx-a11y catch ~30% of issues. Manual testing catches the rest.
- **Include accessibility in your Definition of Done.** It's far cheaper to build in than to retrofit.
- **Use the `prefers-reduced-motion` media query** to disable or simplify animations for users who are motion-sensitive.
- **Provide skip links** ("Skip to main content") for keyboard users to bypass repetitive navigation.
- **Test at 200% zoom.** WCAG requires content to be usable at 200% text zoom without horizontal scrolling.

## Common Pitfalls

- **div/span for everything.** A `<div>` with a click handler is invisible to assistive technology. Use semantic elements.
- **Removing focus outlines.** `outline: none` without a replacement makes keyboard navigation impossible. Use `:focus-visible` to show outlines only during keyboard interaction.
- **ARIA overuse.** Adding `role`, `aria-*` attributes to compensate for wrong elements creates more problems than it solves. Fix the HTML first.
- **Inaccessible client-side routing.** SPAs that change content without announcing the navigation leave screen reader users stranded. Manage focus on route change.
- **Modals without focus trapping.** Users tab behind the modal into invisible content. Use `<dialog>`, `inert`, or a focus-trap library.
- **Auto-playing media.** Audio or video that plays automatically is disorienting. Always require user action to start media.
- **Disabled buttons without context.** A greyed-out "Submit" with no explanation of what's missing frustrates everyone, especially screen reader users.

## Reference

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [The A11Y Project Checklist](https://www.a11yproject.com/checklist/)
- [axe-core — Accessibility Testing Engine](https://github.com/dequelabs/axe-core)
- [Inclusive Components — Heydon Pickering](https://inclusive-components.design/)
