# 05 — Testing Strategies

## Description

Design and implement automated tests that **give you confidence to ship and change code**. This skill covers the testing pyramid, unit/integration/end-to-end tests, test design principles, test doubles (mocks, stubs, fakes), TDD workflow, property-based testing, and what to test vs. what not to test.

Tests are not a chore — they are the **fastest feedback loop** you have. A well-tested codebase is a codebase where you can refactor fearlessly, onboard new developers quickly, and deploy on Friday afternoon.

## When To Use

- Writing any code that will exist longer than a day.
- Before refactoring (tests are the safety net).
- When you're not sure how a function should behave in edge cases — writing the test forces you to decide.
- When a bug is found — write a test that reproduces it before fixing it.
- When designing an API — writing the test first shows you what the API feels like as a consumer.

## Prerequisites

| Skill | Why |
|-------|-----|
| [01 — Architecture & System Design](../01-Architecture-And-System-Design/skill.md) | Testable code requires good boundaries and dependency inversion |
| [04 — Code Quality & Refactoring](../04-Code-Quality-And-Refactoring/skill.md) | Testing and refactoring are inseparable |

## Instructions

### 1 — Why Tests Exist

Tests serve three purposes, in order of importance:

1. **Confidence to change** — the test suite tells you within seconds whether your change broke something.
2. **Documentation** — a well-named test describes what the system does better than comments or wiki pages.
3. **Design feedback** — if code is hard to test, it's usually hard to use. Tests reveal design problems early.

Tests are **not** about proving correctness. They are about **detecting regressions** and **communicating intent**.

### 2 — The Testing Pyramid

```
                  ╱╲
                 ╱  ╲          E2E / UI Tests
                ╱    ╲         Slow, brittle, expensive
               ╱──────╲       Few (5-10% of all tests)
              ╱        ╲
             ╱          ╲      Integration Tests
            ╱            ╲     Medium speed, test boundaries
           ╱──────────────╲    Some (15-25% of all tests)
          ╱                ╲
         ╱                  ╲   Unit Tests
        ╱                    ╲  Fast, focused, cheap
       ╱──────────────────────╲ Many (70-80% of all tests)
```

| Layer | Speed | Scope | Confidence | Maintenance Cost |
|-------|-------|-------|------------|-----------------|
| **Unit** | Milliseconds | Single function/class | Logic correctness | Low |
| **Integration** | Seconds | Multiple components, real dependencies | Boundaries work together | Medium |
| **E2E** | Minutes | Full application, real browsers/devices | The whole system works | High |

**Strategy:** Maximise unit tests for fast, cheap coverage. Use integration tests to verify boundaries. Use E2E tests sparingly for critical user paths.

### 3 — Anatomy of a Good Test

Every test follows the **Arrange-Act-Assert** (or Given-When-Then) pattern:

```python
def test_applying_percentage_discount_reduces_total():
    # Arrange (Given)
    cart = Cart()
    cart.add_item(Item("Widget", price=100.00))
    cart.add_item(Item("Gadget", price=50.00))

    # Act (When)
    cart.apply_discount(percentage=10)

    # Assert (Then)
    assert cart.total == 135.00  # 150 - 15 = 135
```

#### Test Naming Convention

A test name should describe **what is being tested**, **under what conditions**, and **what is expected**:

```
test_<unit>_<scenario>_<expected_result>

test_cart_total_with_10_percent_discount_is_reduced_by_10_percent
test_user_login_with_wrong_password_returns_401
test_transfer_between_accounts_with_insufficient_funds_raises_error
```

Reading the test name alone should tell you what will break if the test fails.

### 4 — Unit Tests

Unit tests verify **a single unit of behaviour** in isolation. "Unit" means a single behaviour — not necessarily a single function or class.

```typescript
// Testing pure logic — no dependencies, no setup
describe("PasswordValidator", () => {
  it("rejects passwords shorter than 8 characters", () => {
    expect(validatePassword("abc")).toEqual({
      valid: false,
      reason: "Password must be at least 8 characters",
    });
  });

  it("rejects passwords without uppercase letters", () => {
    expect(validatePassword("abcdefgh")).toEqual({
      valid: false,
      reason: "Password must contain at least one uppercase letter",
    });
  });

  it("accepts valid passwords", () => {
    expect(validatePassword("Abcdefgh1!")).toEqual({
      valid: true,
      reason: null,
    });
  });
});
```

#### What Makes a Good Unit Test

| Quality | Description |
|---------|-------------|
| **Fast** | Runs in milliseconds; no I/O, no network, no disk |
| **Isolated** | Doesn't depend on or affect other tests |
| **Repeatable** | Same result every time, regardless of order or environment |
| **Self-validating** | Pass or fail — no manual inspection needed |
| **Focused** | Tests one behaviour; if it fails, the reason is immediately obvious |

### 5 — Test Doubles (Mocks, Stubs, Fakes)

When the unit under test has dependencies, replace them with test doubles:

| Type | Purpose | Example |
|------|---------|---------|
| **Stub** | Returns canned data; no verification | A `StubWeatherAPI` that always returns 72°F |
| **Mock** | Verifies that specific calls were made | Assert that `emailService.send()` was called with the right arguments |
| **Fake** | A working but simplified implementation | An `InMemoryDatabase` that uses a dictionary instead of SQL |
| **Spy** | Records calls for later assertion | Wraps a real object and logs method calls |

```python
# Stub — provides canned data
class StubPaymentGateway:
    def charge(self, amount, card):
        return PaymentResult(success=True, transaction_id="stub-123")

# Fake — simplified but functional
class FakeUserRepository:
    def __init__(self):
        self._users = {}

    def save(self, user):
        self._users[user.id] = user

    def find_by_id(self, user_id):
        return self._users.get(user_id)

# Using a fake in a test
def test_registration_saves_user():
    repo = FakeUserRepository()
    service = RegistrationService(repo)

    service.register("alice", "alice@example.com")

    saved = repo.find_by_id("alice")
    assert saved is not None
    assert saved.email == "alice@example.com"
```

#### When to Mock vs. When Not To

| Mock This | Don't Mock This |
|-----------|----------------|
| External APIs | The class under test |
| Databases (in unit tests) | Pure functions with no dependencies |
| Email/SMS services | Data structures and value objects |
| File system | Simple collaborators that are fast and deterministic |
| System clock / randomness | Everything in an integration test (use real dependencies) |

**Anti-pattern: Mocking everything.** If your test mocks all collaborators, it tests nothing but the wiring. It won't catch bugs in how components interact.

### 6 — Integration Tests

Integration tests verify that **components work together correctly** — they test the boundaries between your code and real dependencies.

```python
# Integration test — uses a real database
class TestOrderRepository:
    def setup_method(self):
        self.db = create_test_database()  # Real DB, clean schema
        self.repo = PostgresOrderRepository(self.db)

    def teardown_method(self):
        self.db.rollback()  # Clean up after each test

    def test_save_and_retrieve_order(self):
        order = Order(id="123", items=[Item("Widget", 10.00)], total=10.00)
        self.repo.save(order)

        retrieved = self.repo.find_by_id("123")

        assert retrieved is not None
        assert retrieved.total == 10.00
        assert len(retrieved.items) == 1

    def test_find_by_id_returns_none_for_missing_order(self):
        result = self.repo.find_by_id("nonexistent")
        assert result is None
```

#### What Integration Tests Should Cover

- Database queries return the right data (including edge cases like empty results).
- API clients handle success responses, error responses, and timeouts.
- Message queue consumers correctly deserialise and process messages.
- File I/O reads and writes the expected format.
- Configuration is correctly loaded from environment variables or files.

### 7 — End-to-End (E2E) Tests

E2E tests verify **critical user journeys** through the entire running application:

```javascript
// Playwright E2E test
test("user can sign up, log in, and place an order", async ({ page }) => {
  // Sign up
  await page.goto("/signup");
  await page.fill('[name="email"]', "test@example.com");
  await page.fill('[name="password"]', "SecurePass123!");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL("/dashboard");

  // Add item to cart
  await page.goto("/products");
  await page.click('[data-testid="add-to-cart-widget"]');
  await expect(page.locator('[data-testid="cart-count"]')).toHaveText("1");

  // Checkout
  await page.click('[data-testid="checkout"]');
  await page.fill('[name="card"]', "4242424242424242");
  await page.click('[data-testid="place-order"]');
  await expect(page.locator('[data-testid="order-confirmation"]')).toBeVisible();
});
```

**Rule of thumb:** Write E2E tests only for the 5-10 most critical paths. Everything else should be caught by unit and integration tests.

### 8 — Test-Driven Development (TDD)

TDD is a **design technique** that uses tests to drive the implementation:

```
┌──────────────────┐
│ 1. RED           │  Write a failing test for the next piece of behaviour
├──────────────────┤
│ 2. GREEN         │  Write the simplest code that makes the test pass
├──────────────────┤
│ 3. REFACTOR      │  Clean up the code while keeping tests green
└──────────────────┘
       ↑___________________________________|
```

#### TDD Example: Building a Stack

```python
# RED: First behaviour — new stack is empty
def test_new_stack_is_empty():
    stack = Stack()
    assert stack.is_empty()

# GREEN: Simplest implementation
class Stack:
    def is_empty(self):
        return True

# RED: Push makes it non-empty
def test_stack_with_item_is_not_empty():
    stack = Stack()
    stack.push("a")
    assert not stack.is_empty()

# GREEN: Track items
class Stack:
    def __init__(self):
        self._items = []

    def push(self, item):
        self._items.append(item)

    def is_empty(self):
        return len(self._items) == 0

# RED: Pop returns last pushed item
def test_pop_returns_last_pushed_item():
    stack = Stack()
    stack.push("a")
    stack.push("b")
    assert stack.pop() == "b"

# GREEN
def pop(self):
    return self._items.pop()

# RED: Pop on empty stack raises
def test_pop_on_empty_stack_raises():
    stack = Stack()
    with pytest.raises(IndexError, match="pop from empty stack"):
        stack.pop()

# GREEN
def pop(self):
    if self.is_empty():
        raise IndexError("pop from empty stack")
    return self._items.pop()
```

Each cycle takes 1-5 minutes. The key discipline: **do not write production code without a failing test**.

### 9 — Property-Based Testing

Instead of writing specific examples, describe **properties** that should hold for all inputs, and let the framework generate test cases:

```python
from hypothesis import given
from hypothesis import strategies as st

@given(st.lists(st.integers()))
def test_sorting_preserves_length(xs):
    assert len(sorted(xs)) == len(xs)

@given(st.lists(st.integers()))
def test_sorting_produces_ordered_result(xs):
    result = sorted(xs)
    for i in range(len(result) - 1):
        assert result[i] <= result[i + 1]

@given(st.lists(st.integers()))
def test_sorting_preserves_elements(xs):
    assert sorted(sorted(xs)) == sorted(xs)

@given(st.text(), st.text())
def test_string_concatenation_length(a, b):
    assert len(a + b) == len(a) + len(b)
```

Property-based testing excels at finding edge cases you'd never think to write manually (empty inputs, very large numbers, unicode characters, etc.).

### 10 — What to Test (and What Not To)

#### High Value — Always Test

| What | Why |
|------|-----|
| **Business logic / domain rules** | Core value of the software; bugs here cost money |
| **Edge cases** | Empty collections, zero, negative, null, max values, unicode |
| **Error handling paths** | What happens when things go wrong? |
| **State transitions** | Order: Pending → Confirmed → Shipped → Delivered |
| **Data transformations** | Parsing, serialisation, calculations |
| **Security-sensitive code** | Authentication, authorisation, input validation |

#### Low Value — Skip or Minimise

| What | Why |
|------|-----|
| **Trivial getters/setters** | No logic to test |
| **Framework wiring** | Test your code, not the framework's |
| **UI layout details** | Brittle; changes constantly; use visual regression tools instead |
| **Private methods** | Test them through the public interface |
| **Third-party library internals** | They have their own tests |

### 11 — Test Maintenance

Tests are code. They need the same care as production code.

#### Signs of Bad Tests

| Smell | Problem | Fix |
|-------|---------|-----|
| **Test passes when it shouldn't** | Test doesn't actually verify anything (missing assert) | Review each test: does it fail when the behaviour is wrong? |
| **Test fails randomly (flaky)** | Depends on timing, order, or external state | Make deterministic; stub the clock; isolate data |
| **Test is 100+ lines** | Doing too much; hard to understand | Split into focused tests with clear names |
| **Changing production code breaks 50 tests** | Tests coupled to implementation, not behaviour | Test through public interfaces; avoid mocking internals |
| **Duplicate setup across many tests** | DRY violation | Use shared fixtures/helpers, but keep arrange visible |
| **Test name: `test_1`, `test_2`** | No communication of intent | Name describes scenario and expected result |

#### The Test Ratio

There's no universal "right" number, but these guidelines help:

```
Library/Framework:  >90% unit coverage, few integration tests
Backend API:        70-80% unit, 15-20% integration, 5-10% E2E
Frontend:           50-70% unit/component, 10-20% integration, 5-10% E2E
Data Pipeline:      Focus on data quality checks, input/output validation
```

**Coverage is a tool, not a target.** 100% coverage with bad tests is worse than 70% coverage with excellent tests.

### 12 — Continuous Testing in CI

Tests should run automatically on every commit:

```yaml
# Example CI configuration (GitHub Actions)
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: 20 }
    - run: npm ci
    - run: npm run test:unit        # Fast — runs every commit
    - run: npm run test:integration  # Medium — runs every commit
    - run: npm run test:e2e          # Slow — runs on PRs to main only
      if: github.event_name == 'pull_request'
```

**Speed matters.** If the test suite takes 30 minutes, developers stop running it. Target:
- Unit tests: < 30 seconds
- Integration tests: < 5 minutes
- Full suite: < 15 minutes

### 13 — Testing in Different Paradigms

| Paradigm | Testing Strategy |
|----------|-----------------|
| **Functional** | Pure functions are trivially testable — input → output. Focus on property-based testing |
| **Object-Oriented** | Test through public methods on objects. Use dependency injection for test doubles |
| **Event-Driven** | Publish an event, assert that the correct side effects occurred |
| **Microservices** | Contract testing (Pact) to verify API compatibility between services |
| **Data/ML** | Data validation tests, model performance benchmarks, snapshot tests for outputs |

## Best Practices

1. **Test behaviour, not implementation** — test *what* the code does, not *how* it does it. Tests should survive refactoring.
2. **One assertion per test (conceptually)** — a test should verify one behaviour. Multiple asserts are fine if they all verify the same thing.
3. **Make tests deterministic** — no random data, no sleep(), no dependency on system time (inject the clock).
4. **Run tests before every commit** — if this isn't happening, the tests are too slow or too flaky. Fix that first.
5. **Write the test first when fixing a bug** — the test reproduces the bug, the fix makes it pass, and it can never regress.
6. **Treat test code with the same quality standards as production code** — naming, DRY (within reason), readability.
7. **Delete tests that don't earn their keep** — a continuously flaky test or a test that never fails is worse than no test.
8. **Keep unit tests away from I/O** — no database, no network, no filesystem. That's what integration tests are for.
9. **Use factories / builders for test data** — avoid copying and pasting setup across tests.
10. **Don't chase coverage numbers** — chase confidence. If you're scared to deploy on Friday, you need better tests, not more tests.

## Common Pitfalls

| Pitfall | Why It Happens | Fix |
|---------|---------------|-----|
| **Testing implementation details** | Mocking internal methods; breaking on refactoring | Test through the public API; assert on outputs and side effects |
| **Flaky tests** | Time-dependent, order-dependent, or environment-dependent | Isolate state; stub external systems; use deterministic data |
| **Slow test suite** | Too many E2E tests; integration tests where unit tests suffice | Rebalance toward the pyramid; parallelise; mock I/O in unit tests |
| **No tests for error paths** | Only testing the happy path | Explicitly test: what happens with bad input, timeout, null, empty? |
| **Copy-paste test setup** | Each test has 30 lines of identical setup | Extract shared setup into fixtures/factories; keep intent visible |
| **Testing the framework** | Asserting that React renders a `<div>` when you return `<div>` | Test your logic, not the framework's behaviour |
| **Ignoring failing tests** | "It's been red for weeks" | Fix or delete. A red test that everyone ignores destroys trust in the suite |
| **Mocking everything** | 90% of the test is mock setup | Use fakes or real implementations where practical; mock only the boundary |
| **No tests for the fix** | Bug fixed without a regression test | Always write the test first, then fix. The test proves the fix works |

## Reference

- **Working Effectively with Legacy Code** — Michael Feathers (testing untestable code, characterisation tests)
- **Unit Testing: Principles, Practices, and Patterns** — Vladimir Khorikov (the definitive modern unit testing book)
- **Test-Driven Development by Example** — Kent Beck (the original TDD book)
- **Growing Object-Oriented Software, Guided by Tests** — Freeman & Pryce (TDD in practice, mocking, design)
- [Hypothesis (Python)](https://hypothesis.readthedocs.io/) — Property-based testing framework
- [fast-check (JS/TS)](https://github.com/dubzzz/fast-check) — Property-based testing for JavaScript
- [Testing Trophy](https://kentcdodds.com/blog/write-tests) — Kent C. Dodds' alternative to the testing pyramid
- [Pact](https://docs.pact.io/) — Contract testing for microservices
