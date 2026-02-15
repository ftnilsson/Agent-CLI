# Frontend Performance

## Description

Measure, diagnose, and improve frontend loading speed and runtime responsiveness — the work that directly affects user experience, engagement, and search ranking. This skill covers the framework-agnostic performance fundamentals: Core Web Vitals, critical rendering path, bundle optimisation, lazy loading, rendering strategies, and the diagnostic tools that guide decisions with data instead of intuition.

## When To Use

- A page takes more than 2–3 seconds to become interactive
- Core Web Vital scores are below targets (Lighthouse, CrUX, PageSpeed Insights)
- Users report sluggish interactions, jank, or layout shifts
- Adding a new dependency and evaluating its cost
- Choosing a rendering strategy (SSR, SSG, CSR, streaming, islands)
- Preparing for a performance budget or audit

## Prerequisites

- Understanding of the browser rendering pipeline (HTML parse → DOM → CSSOM → Layout → Paint → Composite)
- Familiarity with browser DevTools (Network, Performance, Lighthouse tabs)
- Basic knowledge of HTTP caching and CDNs

## Instructions

### 1. Know the Core Web Vitals

These are Google's user-centric performance metrics — the numbers that matter most:

| Metric | What it measures | Good | Poor |
|--------|------------------|------|------|
| **LCP** (Largest Contentful Paint) | Loading — when the main content is visible | ≤ 2.5s | > 4.0s |
| **INP** (Interaction to Next Paint) | Responsiveness — delay between user input and visual update | ≤ 200ms | > 500ms |
| **CLS** (Cumulative Layout Shift) | Visual stability — unexpected layout movement | ≤ 0.1 | > 0.25 |

**Always measure before optimising.** Use Lighthouse (lab data) and Chrome UX Report / web-vitals library (field data) together.

### 2. Optimise the Critical Rendering Path

The browser can't paint until it has the DOM and CSSOM. Minimise what's needed for the first render:

- **Inline critical CSS** (above-the-fold styles) and load the rest asynchronously
- **Defer non-essential JavaScript** with `defer` or `async` attributes
- **Preload key resources** (LCP image, web font, critical data):

```html
<link rel="preload" href="/hero.webp" as="image" />
<link rel="preload" href="/fonts/Inter.woff2" as="font" type="font/woff2" crossorigin />
```

- **Remove render-blocking resources.** Every synchronous `<script>` and `<link rel="stylesheet">` in `<head>` delays first paint.

### 3. Reduce and Split JavaScript

JavaScript is the most expensive resource per byte (parse + compile + execute):

- **Code-split by route.** Only send the code needed for the current page.
- **Lazy-load below-the-fold components.** Dynamic `import()` triggers loading when the component is needed.
- **Audit your dependencies.** Use `bundlephobia.com` or `source-map-explorer` to see what's actually in your bundle. A single large dependency can dwarf your application code.
- **Tree-shake unused exports.** Use ES modules and ensure your bundler eliminates dead code.

**Set a performance budget:**
- Total JS: < 200KB compressed (initial load)
- Total page weight: < 500KB compressed
- Review any dependency > 20KB

### 4. Optimise Images and Media

Images are typically the largest payload. Address them systematically:

```html
<img
  src="hero.webp"
  srcset="hero-400.webp 400w, hero-800.webp 800w, hero-1200.webp 1200w"
  sizes="(max-width: 600px) 100vw, 50vw"
  alt="Product showcase"
  width="1200"
  height="800"
  loading="lazy"
  decoding="async"
/>
```

- **Use modern formats:** WebP or AVIF (30-50% smaller than JPEG/PNG)
- **Serve responsive sizes:** `srcset` + `sizes` let the browser pick the right resolution
- **Set explicit dimensions:** `width` and `height` attributes prevent CLS
- **Lazy-load off-screen images:** `loading="lazy"` (but eagerly load the LCP image)
- **Use `fetchpriority="high"` on the LCP image** to prioritise its download

### 5. Minimise Layout Shifts (CLS)

Layout shifts frustrate users and hurt CLS scores:

- **Always specify image/video dimensions** (or use `aspect-ratio`)
- **Reserve space for dynamic content** (ads, embeds, lazy-loaded sections)
- **Avoid inserting content above existing content** (e.g., a banner that pushes the page down after load)
- **Use `font-display: swap` or `optional`** to handle web font loading without text shifts
- **Prefer CSS transforms for animations** over properties that trigger layout (top, left, width, height)

### 6. Improve Runtime Responsiveness (INP)

Long tasks (>50ms) on the main thread block user interaction:

- **Break up long tasks.** Use `requestIdleCallback`, `scheduler.yield()`, or chunk processing across frames.
- **Debounce expensive handlers.** Search inputs, scroll handlers, and resize observers don't need to fire on every event.
- **Move heavy computation off the main thread** with Web Workers.
- **Virtualise long lists.** Don't render 10,000 DOM nodes — render only what's visible in the viewport.
- **Avoid forced synchronous layout** (read-then-write cycles that trigger layout thrashing).

### 7. Cache Aggressively

- **Static assets:** Immutable hashed filenames with `Cache-Control: max-age=31536000, immutable`
- **HTML:** Short cache or `no-cache` with ETag/Last-Modified for revalidation
- **API responses:** `stale-while-revalidate` pattern via service worker or CDN
- **Use a service worker** for offline support and instant repeat visits

## Best Practices

- **Measure in the field, not just the lab.** Lighthouse on a developer machine doesn't reflect real user conditions. Use the `web-vitals` library or CrUX data.
- **Test on low-end devices.** A budget Android phone on 3G reveals problems your MacBook Pro hides.
- **Set a performance budget and enforce it in CI.** Lighthouse CI, bundlesize, or size-limit can fail the build when thresholds are exceeded.
- **Prefer progressive enhancement.** Core functionality should work before JS loads. Enhance with JS after.
- **Use `103 Early Hints`** for preloading critical resources before the server finishes processing.
- **Compress everything.** Brotli > Gzip. Ensure your CDN/server is configured for both.

## Common Pitfalls

- **Optimising without measuring.** Intuition about what's slow is usually wrong. Profile first, act on data.
- **Over-bundling.** A single `vendor.js` file that contains every library forces users to re-download everything when any dependency changes.
- **Third-party script abuse.** Analytics, A/B testing, chat widgets, and social embeds can easily add 500KB+ and block the main thread. Audit relentlessly.
- **Premature lazy loading.** Lazy loading above-the-fold content (including the LCP element) makes performance worse, not better.
- **Font loading without fallback.** Loading multiple font weights without `font-display` causes invisible text (FOIT) or layout shifts (FOUT).
- **Ignoring HTTP/2.** Still concatenating files or using sprite sheets? HTTP/2 multiplexing makes per-request overhead negligible. Ship smaller, targeted files.

## Reference

- [web.dev — Performance](https://web.dev/performance/)
- [Core Web Vitals — web.dev](https://web.dev/vitals/)
- [Lighthouse Performance Scoring](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring/)
- [web-vitals Library](https://github.com/GoogleChrome/web-vitals)
- [Bundlephobia — Package Size Analysis](https://bundlephobia.com/)
