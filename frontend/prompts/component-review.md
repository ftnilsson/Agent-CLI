# Component Architecture Review

Review the following component(s) for architecture, composition, and reusability.

## Check For

1. **Single responsibility** — Does the component do one thing well, or is it a "god component"?
2. **Props design** — Are props minimal, well-typed, and easy to understand? Are there too many boolean props that should be a union/enum?
3. **Composition** — Should this be split into smaller components? Is the `children` pattern used where appropriate?
4. **State placement** — Is state lifted too high or too low? Should any state be co-located with its consumer?
5. **Side effects** — Are effects minimal and correctly dependent? Are they doing work that belongs elsewhere (e.g., in a hook or service)?
6. **Styling** — Is the styling approach consistent with the project? Are magic numbers extracted to tokens/variables?
7. **Testability** — Can this component be tested in isolation? Are dependencies injectable?
8. **API consistency** — Does this component follow the same patterns as similar components in the project?

## Output Format

1. Rate the overall component quality: ⭐ out of 5
2. List strengths (what's done well)
3. List issues with severity and suggested fixes
4. If applicable, show a refactored version
