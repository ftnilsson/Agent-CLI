# Code Review

Review the following code for quality, maintainability, and correctness.

## Focus Areas

1. **Correctness** — Does the code do what it claims? Are there edge cases or off-by-one errors?
2. **Naming** — Are variables, functions, and classes named clearly and consistently?
3. **Complexity** — Can any function be simplified or broken into smaller pieces?
4. **Error handling** — Are errors handled gracefully? Are there unhandled promise rejections or uncaught exceptions?
5. **DRY** — Is there duplicated logic that should be extracted?
6. **Security** — Are there any obvious security issues (injection, leaking secrets, etc.)?
7. **Performance** — Are there unnecessary allocations, N+1 queries, or blocking operations?

## Output Format

For each finding, provide:

- **Location**: file and line (or function name)
- **Severity**: 🔴 Critical / 🟡 Suggestion / 🟢 Nitpick
- **Issue**: What's wrong
- **Fix**: How to fix it, with a code example if helpful

End with a brief summary: what's good about the code and what the top priorities are.
