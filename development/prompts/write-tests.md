# Write Tests

Generate comprehensive tests for the following code.

## Guidelines

1. **Happy path** — Test the expected behaviour with valid inputs.
2. **Edge cases** — Test boundaries, empty inputs, nulls, and maximum values.
3. **Error cases** — Test that errors are thrown/returned correctly for invalid inputs.
4. **Describe blocks** — Group tests logically using `describe` / `context` blocks.
5. **Clear names** — Each test name should read as a sentence: "it should return X when Y".
6. **Arrange-Act-Assert** — Structure each test with setup, execution, and assertion phases.
7. **No implementation details** — Test behaviour, not internal implementation.

## Output Format

1. Provide the full test file, ready to run.
2. Use the project's existing test framework and conventions if visible.
3. Add a brief comment above each test group explaining what aspect is being tested.
