# Performance & Cold Starts

## Cold Start Phases

- A cold start adds: package download (50–500ms) + runtime start (50–200ms) + module-scope initialisation (50–2000ms) before handler execution begins
- A warm start skips all phases and executes only handler code
- Minimise module-scope initialisation time — it directly extends every cold start duration
- Use lazy initialisation for non-critical dependencies that are not needed on every invocation

## Package Size Optimisation

- Bundle each function individually with a tree-shaking bundler (esbuild, webpack) to produce the smallest possible deployment package
- Target package size below 5 MB; packages above 10 MB add measurable cold start latency
- Import only the specific SDK clients needed — do not import the entire SDK
- Mark cloud-provider SDK packages as external in the bundler when they are available pre-installed in the runtime environment
- Exclude all test dependencies, type definitions, and source maps from production packages

```bash
# Bundle a single handler with tree-shaking; mark runtime-provided SDK as external
esbuild src/handlers/create-order.ts \
  --bundle --platform=node --target=node20 \
  --outfile=dist/create-order.js \
  --minify --external:@aws-sdk/*
```

## Memory & CPU Tuning

- Memory allocation controls CPU allocation on most serverless platforms — higher memory means proportionally more CPU
- Run power tuning benchmarks across memory settings (128, 256, 512, 1024, 1536, 2048 MB) and measure both duration and total cost
- For I/O-bound functions (database queries, HTTP calls), 256–512 MB is typically sufficient — waiting on I/O is not accelerated by more CPU
- For CPU-bound functions (data processing, encryption, image manipulation), higher memory reduces duration enough to lower total cost
- Use ARM64 architecture where available — typically 10–20% faster cold starts and 20% lower cost

## Cold Start Mitigation

- Avoid placing functions in a VPC/VNet unless they access private network resources — VPC network interface creation adds 200–1000ms to cold starts
- Use provisioned concurrency (AWS) or Always Ready instances (Azure) only for latency-critical synchronous endpoints — they incur continuous idle cost
- Do not use keep-alive ping workarounds in production — they are unreliable and waste invocation budget
- Reduce cold start frequency by right-sizing reserved concurrency to match expected traffic patterns

## Connection Reuse

- Enable HTTP keep-alive on all SDK and HTTP clients by setting `keepAlive: true` on the underlying agent
- Initialise all clients in module scope so TCP connections survive across warm invocations
- Set `max: 1` on database connection pools within function instances; use a proxy for higher concurrency
- Disable Nagle's algorithm (`setNoDelay: true`) on TCP sockets for latency-sensitive operations

## Concurrency Management

- Set reserved concurrency on critical functions (payment processing, authentication) to guarantee capacity during traffic spikes
- Set throttled (maximum) concurrency on database-connected functions to prevent connection exhaustion at the database
- Account-level concurrency limits are shared across all functions — a runaway function can starve other critical functions
- Use a queue between high-concurrency triggers and database write operations to absorb traffic spikes

## Payload Optimisation

- Apply the claim-check pattern for any payload exceeding 256 KB — store in object storage and pass a reference
- Enable response compression for API responses larger than 1 KB
- Return only requested fields; avoid returning full entity graphs when a summary is sufficient
- Use cursor-based pagination to bound response sizes on collection endpoints

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Default 128 MB memory on all functions without tuning | Run power tuning benchmarks per function; choose the cost-optimal setting |
| Importing the entire SDK (`aws-sdk` v2, 70 MB) | Import only the specific v3 client package needed |
| All functions placed in a VPC regardless of need | Use VPC only for functions that access private network resources |
| Creating SDK clients inside the handler on every invocation | Move all client initialisation to module scope |
| Provisioned concurrency on all functions as a default | Use it only on latency-critical synchronous endpoints |
| No concurrency limit on database-connected functions | Set a maximum concurrency limit; use a connection proxy |

## Best Practices

- Measure before optimising — profile to find the actual bottleneck (cold start vs. database latency vs. CPU)
- Bundle and tree-shake every function individually; this is the highest-impact cold start optimisation
- Run memory power tuning benchmarks; the cheapest setting is rarely the lowest or highest memory value
- Reserve concurrency for critical synchronous paths; throttle concurrency for database-connected functions
- Use ARM64 where available for better price-performance ratio
- Target cold start rate below 5% for synchronous user-facing functions; monitor continuously
- Enable HTTP keep-alive on all SDK and HTTP clients in module scope
- Avoid VPC placement unless the function genuinely requires access to private network resources
