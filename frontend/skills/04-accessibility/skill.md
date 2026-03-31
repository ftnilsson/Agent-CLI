# Accessibility

## Semantic HTML First

Use the right element before reaching for ARIA:

| Instead of | Use | What you get for free |
|-----------|-----|-----------------------|
| `<div onclick>` | `<button>` | Keyboard support, focus, screen reader announcement |
| `<div class="link">` | `<a href>` | Navigable, right-click, open-in-new-tab |
| `<div class="input">` | `<input>` / `<select>` | Form submission, autofill, validation |
| `<div class="heading">` | `<h1>`–`<h6>` | Document outline for screen readers |
| `<div class="list">` | `<ul>` / `<ol>` | "List of N items" announcement |

Every custom replacement of a native element is a liability you must maintain.

## ARIA Rules

Apply ARIA only when native HTML semantics are insufficient (primarily custom widgets):

1. Never use ARIA if native HTML works. `<button>` beats `<div role="button">` every time.
2. Never change native semantics — `<h2 role="tab">` confuses assistive technology.
3. Every interactive ARIA control must be keyboard accessible.
4. Never apply `role="presentation"` or `aria-hidden="true"` to focusable elements.
5. Every interactive element must have an accessible name.

```html
<!-- Icon-only button -->
<button aria-label="Close dialog"><svg>...</svg></button>

<!-- Live region for dynamic content -->
<div aria-live="polite" role="status">3 results found</div>

<!-- Decorative image -->
<img src="divider.svg" alt="" role="presentation" />
```

## Focus Management

- Modals and dialogs: trap focus inside; return focus to the trigger on close. Prefer native `<dialog>`.
- SPA route changes: move focus to the new page's main heading or content area.
- Dynamic content (toasts, inline errors, expanded sections): move focus or use `aria-live` to announce.
- Deleted list items: move focus to the next item or a logical fallback.
- Never remove the focus indicator. Customise it, but always provide a visible replacement:

```css
:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}
```

## Keyboard Navigation

All interactive elements must be operable with keyboard alone:

| Key | Expected behaviour |
|-----|--------------------|
| `Tab` / `Shift+Tab` | Move between interactive elements |
| `Enter` / `Space` | Activate buttons, links, checkboxes |
| `Arrow keys` | Navigate within composite widgets (tabs, menus, radio groups) |
| `Escape` | Close modals, dropdowns, popovers |
| `Home` / `End` | Jump to first/last item in a list |

- Tab order must match visual order.
- Never use `tabindex` values greater than 0.
- Use `tabindex="0"` to add an element to natural tab flow; `tabindex="-1"` for programmatic focus only.

## Form Labels and Controls

Every form control needs a visible, associated label:

```html
<label for="email">Email address</label>
<input id="email" type="email" />
```

- Placeholder is not a label — it disappears on input and has poor contrast.
- Groups of controls (radio buttons, checkboxes) require `<fieldset>` with `<legend>`.
- Icon buttons require `aria-label` or visually hidden text.

## Colour Contrast (WCAG 2.1 AA)

- Normal text: 4.5:1 contrast ratio against background.
- Large text (≥18pt or ≥14pt bold): 3:1 ratio.
- UI components and graphics: 3:1 ratio.
- Never use colour alone to convey information — add icons, patterns, or labels.
- Support high-contrast mode with `@media (forced-colors: active)`.

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| `<div>` with click handler | Use `<button>` or `<a>` |
| `outline: none` with no replacement | Use `:focus-visible` with a custom visible indicator |
| ARIA attributes on semantically wrong elements | Fix the HTML first; ARIA augments, does not replace |
| SPA navigation without focus management | Move focus to main heading or content area on route change |
| Modal without focus trapping | Use `<dialog>`, `inert` attribute, or a focus-trap library |
| Auto-playing audio or video | Require explicit user action to start media |
| Disabled button with no explanation | Surface the reason inline or via `aria-describedby` |

## Best Practices

- Test with a screen reader regularly — even 10 minutes with VoiceOver or NVDA reveals issues no automated tool catches.
- Use automated tools (axe-core, Lighthouse, eslint-plugin-jsx-a11y) as a baseline — they catch roughly 30% of issues.
- Include accessibility in the definition of done — retrofitting is far more costly than building it in.
- Apply `prefers-reduced-motion` to disable or simplify animations for motion-sensitive users.
- Provide a "Skip to main content" link so keyboard users can bypass repetitive navigation.
- Test at 200% text zoom — content must remain usable without horizontal scrolling.
