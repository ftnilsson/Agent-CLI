# Testing & Local Development

## Testing Strategy

- Write the majority of tests as unit tests against extracted business logic modules — no cloud SDK, no network, sub-second execution
- Write handler tests using crafted event payloads and mocked service dependencies to verify routing, validation, and error mapping
- Write integration tests against local emulators (DynamoDB Local, Azurite, LocalStack) to verify real data access behaviour
- Write contract tests to verify that event producers and consumers agree on the event schema
- Reserve deployed E2E tests for smoke-testing critical paths after deployment; do not rely on them for rapid feedback

## Event Factories

- Create helper functions (`makeSQSEvent`, `makeApiGatewayEvent`, `makeStorageBlobEvent`) that produce platform-accurate event payloads
- Reuse event factories across all handler tests — do not inline raw event JSON in individual test cases
- Include all required envelope fields even when the test only exercises a subset of them

```typescript
// Reusable event factory for API Gateway tests
function makeApiGatewayEvent(opts: { method: string; path: string; body?: object; authorizer?: object }): APIGatewayProxyEvent {
  return {
    httpMethod: opts.method,
    path: opts.path,
    body: opts.body ? JSON.stringify(opts.body) : null,
    headers: { 'Content-Type': 'application/json' },
    pathParameters: null,
    queryStringParameters: null,
    requestContext: { requestId: 'test-request-id', authorizer: opts.authorizer ?? null },
  } as APIGatewayProxyEvent;
}
```

## Local Emulators

- Run DynamoDB Local or LocalStack for AWS data store tests; run Azurite for Azure Storage and Azure Service Bus Emulator for Service Bus tests
- Define all local services in a `docker-compose.yml` so every developer and CI pipeline uses the same configuration
- Use emulators for all data store integration tests — mock only external third-party APIs that have no local emulator
- Seed emulator state in `beforeAll` hooks; clean up in `afterEach` or `afterAll` to prevent test cross-contamination

## Contract Testing

- Define shared event schemas in a versioned contracts library accessible to both producer and consumer test suites
- In producer tests: capture the published event and assert it parses successfully against the schema
- In consumer tests: generate a valid event from the schema and assert the handler processes it without error
- Run contract tests in CI for both the producer and consumer on every schema change

## Async Handler Testing

- Test queue-triggered handlers by constructing realistic batch event payloads with multiple records
- Test partial batch failure: verify that retryable errors return the failing record ID in `batchItemFailures` and do not fail the entire batch
- Test permanent failures: verify the message is not returned to the queue and an appropriate error log or alert is produced
- Always test error paths: invalid input, missing required fields, downstream service failures, duplicate event IDs

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Asserting that `SDK.send()` was called with specific parameters | Test observable outcomes (data saved, event published) not SDK call arguments |
| Every code change requires a cloud deployment to verify | Set up local emulators and handler unit tests for rapid local feedback |
| Mocking all data stores with in-memory fakes | Use real emulators for data stores; mocking hides real query and schema issues |
| Testing only the happy path | Add tests for invalid input, missing data, downstream failures, and duplicate events |
| No contract tests between event producers and consumers | Add schema contract tests to catch breaking changes in CI before production |

## Best Practices

- Test business logic in pure unit tests with no cloud SDK involvement — thin handlers make this straightforward
- Use event factories to produce realistic platform event payloads for all handler tests
- Run local emulators in CI via Docker Compose for integration test coverage without cloud deployments
- Add contract tests for every event type crossing a service boundary
- Keep unit tests under 1 second and integration tests under 10 seconds; slow tests get skipped
- Always test partial batch failure reporting for queue and stream triggered handlers
- Mock only third-party external APIs; use emulators for all cloud-provider data services
- Test both retryable and permanent error classification in every async handler
