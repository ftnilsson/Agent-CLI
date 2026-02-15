# Unity Performance Profiling

Review the following Unity/C# code for performance issues.

## Check For

1. **Allocations in Update** — Are there `new` allocations, string concatenations, LINQ queries, or `GetComponent` calls in `Update()`, `FixedUpdate()`, or `LateUpdate()`?
2. **Coroutine allocations** — Are `WaitForSeconds` objects cached instead of created every yield?
3. **Physics** — Are physics queries (raycasts, overlap) using non-alloc variants? Are layers used to filter?
4. **Object pooling** — Are frequently spawned/destroyed objects using an object pool?
5. **Camera.main** — Is `Camera.main` cached? (It does a `FindGameObjectWithTag` internally)
6. **String operations** — Are strings built with `StringBuilder` in hot paths?
7. **Collections** — Are `List<T>` capacities pre-allocated? Are `Dictionary` lookups preferred over `List.Find`?
8. **Transform access** — Are `transform.position` modifications batched? Is `SetPositionAndRotation` used where applicable?
9. **Draw calls** — Are materials shared where possible? Is batching enabled?
10. **Async patterns** — Are `UniTask` or `Awaitable` used instead of coroutines where appropriate?

## Output Format

For each finding:

- **Script/Method**: Where the issue is
- **Impact**: 🔴 Per-frame cost / 🟡 Spike risk / 🟢 Minor
- **Issue**: Description with estimated cost
- **Fix**: Optimised code example
