# Frontend Performance Review

Review the following frontend code for performance issues, focusing on Core Web Vitals and rendering efficiency.

## Check For

1. **Unnecessary re-renders** — Are components re-rendering when props/state haven't changed? Should `memo`, `useMemo`, or `useCallback` be used?
2. **Bundle size** — Are heavy dependencies imported where lighter alternatives exist? Is tree-shaking working?
3. **Lazy loading** — Are large components, routes, or images lazy-loaded?
4. **Layout shifts (CLS)** — Do images/embeds have explicit dimensions? Are fonts causing layout shifts?
5. **Largest Contentful Paint (LCP)** — Is the main content blocking on JavaScript? Could it be server-rendered or streamed?
6. **Interaction to Next Paint (INP)** — Are event handlers fast? Is expensive work deferred to `requestIdleCallback` or web workers?
7. **Network waterfalls** — Are requests chained when they could be parallel? Is data being fetched too early or too late?
8. **Memory leaks** — Are subscriptions, timers, and event listeners cleaned up in effects?

## Output Format

For each finding:

- **Location**: Component or file
- **Impact**: 🔴 High / 🟡 Medium / 🟢 Low
- **Issue**: Description
- **Fix**: Code example or approach
