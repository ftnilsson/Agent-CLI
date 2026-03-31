# 05 — Testing Strategies

## Testing Pyramid

```
        ╱╲          E2E — few (5-10%), slow, test critical user paths
       ╱──╲
      ╱    ╲        Integration — some (15-25%), test component boundaries
     ╱──────╲
    ╱        ╲      Unit — many (70-80%), fast, test logic in isolation
   ╱──────────╲
```

| Layer | Speed | Scope | When to Use |
|-------|-------|-------|-------------|
| Unit | Milliseconds | Single behaviour/function | Business logic, calculations, validations |
| Integration | Seconds | Multiple components, real dependencies | DB queries, API clients, message consumers |
| E2E | Minutes | Full application | 5-10 critical user journeys only |

## Test Anatomy

Structure every test with Arrange-Act-Assert (Given-When-Then):

```python
def test_applying_percentage_discount_reduces_total():
    # Arrange
    cart = Cart()
    cart.add_item(Item("Widget", price=100.00))

    # Act
    cart.apply_discount(percentage=10)

    # Assert
    assert cart.total == 90.00
```

Name tests as `test_<unit>_<scenario>_<expected_result>`. The name alone must tell you what breaks when the test fails:
```
test_user_login_with_wrong_password_returns_401
test_transfer_with_insufficient_funds_raises_error
```

## Test Doubles

| Type | Purpose | Use When |
|------|---------|----------|
| **Stub** | Returns canned data; no verification | Isolating from external API/service |
| **Mock** | Verifies specific calls were made | Asserting a side-effecting call occurred |
| **Fake** | Simplified but working implementation | `InMemoryRepository` replacing a real DB |
| **Spy** | Records calls for later assertion | Wrapping a real object to observe interactions |

**Mock this:** external APIs, databases (in unit tests), email/SMS services, filesystem, clock/randomness.

**Don't mock:** the class under test, pure functions, data structures, simple fast collaborators, anything in an integration test (use real dependencies).

If your test mocks all collaborators it tests nothing but the wiring and won't catch integration bugs.

## TDD Workflow

```
RED   → Write a failing test for the next piece of behaviour
GREEN → Write the simplest code that makes it pass
REFACTOR → Clean up while keeping tests green
(repeat)
```

Do not write production code without a failing test. Each cycle should take 1-5 minutes.

## What to Test

**Always test:**
- Business logic and domain rules
- Edge cases: empty, zero, negative, null, max values, unicode
- Error handling paths
- State transitions (Pending → Confirmed → Shipped)
- Security-sensitive code: auth, authorisation, input validation

**Skip or minimise:**
- Trivial getters/setters
- Framework wiring
- UI layout details (use visual regression tools)
- Private methods (test through the public interface)
- Third-party library internals

## Test Smell Reference

| Smell | Fix |
|-------|-----|
| Test passes when it shouldn't (no assert) | Review every test: does it fail when behaviour is wrong? |
| Flaky test (random failures) | Stub the clock; isolate state; eliminate external dependencies |
| Test is 100+ lines | Split into focused tests with clear names |
| Changing production code breaks 50 tests | Test through public interfaces; avoid mocking internals |
| `test_1`, `test_2` names | Name describes scenario and expected result |
| Duplicate setup across tests | Use shared fixtures/factories; keep intent visible |

## CI Configuration

Run tests automatically on every commit. Target speeds:
- Unit tests: < 30 seconds
- Integration tests: < 5 minutes
- Full suite: < 15 minutes

If the suite takes longer, developers stop running it.

```yaml
- run: npm run test:unit          # Every commit
- run: npm run test:integration   # Every commit
- run: npm run test:e2e           # PRs to main only
  if: github.event_name == 'pull_request'
```

## Coverage Guidance

```
Library/Framework:  >90% unit, few integration
Backend API:        70-80% unit, 15-20% integration, 5-10% E2E
Frontend:           50-70% unit/component, 10-20% integration, 5-10% E2E
```

Coverage is a tool, not a target. 100% coverage with bad tests is worse than 70% with excellent tests.

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Testing implementation details | Test through the public API; assert outputs and observable side effects |
| Flaky tests (tolerated) | Fix or delete — a red test everyone ignores destroys trust in the suite |
| Inverted pyramid (too many E2E) | Rebalance: push tests down toward unit; mock I/O |
| No tests for error paths | Explicitly test: bad input, timeout, null, empty, max |
| Mocking everything | Use fakes or real implementations; mock only the boundary |
| Testing the framework | Test your logic, not that React renders a `<div>` when you return `<div>` |
| Bug fixed without a regression test | Always write the test first, then fix |

## Best Practices

- Test behaviour, not implementation — tests must survive refactoring.
- One conceptual assertion per test; if it fails, the reason must be immediately obvious.
- Make tests deterministic: no `sleep()`, no random data, inject the clock.
- Run tests before every commit — if this isn't happening, the suite is too slow or too flaky.
- Write the test first when fixing a bug: test reproduces it, fix makes it pass.
- Treat test code with the same quality standards as production code.
- Delete tests that don't earn their keep (flaky, never fails, tests the framework).
- Use factories/builders for test data — avoid copy-pasting setup across tests.
