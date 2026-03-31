# Frontend Performance & Core Web Vitals

## Core Web Vitals Targets

| Metric | Measures | Good | Poor |
|--------|----------|------|------|
| **LCP** (Largest Contentful Paint) | When the main content is visible | ≤ 2.5s | > 4.0s |
| **INP** (Interaction to Next Paint) | Delay between user input and visual update | ≤ 200ms | > 500ms |
| **CLS** (Cumulative Layout Shift) | Unexpected layout movement | ≤ 0.1 | > 0.25 |

Always measure before optimising. Use Lighthouse for lab data and the `web-vitals` library or Chrome UX Report for real-user field data.

## Critical Rendering Path

Minimise what the browser needs for the first paint:

- Inline critical (above-the-fold) CSS; load the rest asynchronously.
- Defer non-essential JavaScript with `defer` or `async`.
- Remove render-blocking `<script>` and `<link rel="stylesheet">` from `<head>`.
- Preload the LCP image and critical fonts:

```html
<link rel="preload" href="/hero.webp" as="image" fetchpriority="high" />
<link rel="preload" href="/fonts/Inter.woff2" as="font" type="font/woff2" crossorigin />
```

## JavaScript Bundle

- Code-split by route — only send the code needed for the current page.
- Lazy-load below-the-fold components with dynamic `import()`.
- Audit dependencies with `bundlephobia.com` or `source-map-explorer` — a single large library can dwarf application code.
- Use ES modules and ensure your bundler tree-shakes unused exports.

Performance budget (initial load, compressed):
- Total JS: < 200 KB
- Total page weight: < 500 KB
- Review any dependency > 20 KB

## Images and Media

```html
<img
  src="hero.webp"
  srcset="hero-400.webp 400w, hero-800.webp 800w"
  sizes="(max-width: 600px) 100vw, 50vw"
  width="1200" height="800"
  alt="Product showcase"
  loading="lazy"
  decoding="async"
/>
```

- Use WebP or AVIF (30–50% smaller than JPEG/PNG).
- Always set explicit `width` and `height` attributes to prevent CLS.
- Use `loading="lazy"` on off-screen images, but eagerly load the LCP image.
- Add `fetchpriority="high"` on the LCP image.

## Layout Shift (CLS)

- Specify dimensions on all images and video, or use `aspect-ratio`.
- Reserve space for dynamic content (ads, embeds, lazy-loaded sections) before it loads.
- Never insert content above existing content after page load.
- Use `font-display: swap` or `optional` to prevent invisible text (FOIT) and text shifts (FOUT).
- Animate with CSS `transform` and `opacity` only — never properties that trigger layout (`top`, `left`, `width`, `height`).

## Runtime Responsiveness (INP)

- Break up long tasks (> 50ms) using `scheduler.yield()` or `requestIdleCallback`.
- Debounce expensive handlers on search inputs, scroll events, and resize observers.
- Move heavy computation off the main thread with Web Workers.
- Virtualise long lists — never render 10,000 DOM nodes; render only what is visible.
- Avoid forced synchronous layout (interleaved DOM reads and writes that cause layout thrashing).

## Caching

- Static assets: immutable hashed filenames with `Cache-Control: max-age=31536000, immutable`.
- HTML: short cache or `no-cache` with ETag/Last-Modified revalidation.
- API responses: `stale-while-revalidate` via service worker or CDN.
- Enable Brotli compression on the server/CDN — Brotli outperforms Gzip.

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Optimising without profiling | Measure with Lighthouse and field data first; act on numbers |
| One large `vendor.js` bundle | Split by route; users should not re-download unchanged code |
| Third-party scripts (analytics, chat, A/B) without auditing | Audit regularly; every script can add hundreds of KB and block the main thread |
| Lazy loading above-the-fold content or the LCP element | Eagerly load LCP; lazy-load only off-screen content |
| Multiple font weights without `font-display` | Set `font-display: swap` or `optional` on every `@font-face` |
| `px`-based font sizes that ignore user preferences | Use `rem` throughout |

## Best Practices

- Measure in the field, not just the lab — Lighthouse on a developer machine hides real-world conditions.
- Test on a budget Android device on a throttled network — problems invisible on a MacBook become obvious.
- Enforce a performance budget in CI using Lighthouse CI, `bundlesize`, or `size-limit`.
- Prefer progressive enhancement — core functionality must work before JavaScript loads.
- Use `103 Early Hints` to preload critical resources before the server finishes processing the request.
- Treat the LCP element as the most important asset on the page — remove everything that delays it.
- Prefer fewer, targeted files over large concatenated bundles — HTTP/2 multiplexing makes per-request overhead negligible.
