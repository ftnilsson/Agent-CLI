# C# Scripting

## MonoBehaviour Lifecycle

- Use `Awake()` for self-initialization — cache own component references here
- Use `Start()` for cross-references — other objects are guaranteed initialized by `Start()`
- Subscribe to events in `OnEnable()`, unsubscribe in `OnDisable()` — never in `Start()`/`OnDestroy()`
- Put physics forces and velocity changes in `FixedUpdate()`, never `Update()`
- Put camera follow and post-update logic in `LateUpdate()`
- Never call `Find*()`, `GetComponent<T>()`, or `FindObjectOfType<T>()` in `Update()`

```csharp
public class Enemy : MonoBehaviour
{
    [SerializeField] private float _speed = 5f;
    private Rigidbody _rb;
    private Transform _target;

    private void Awake() => _rb = GetComponent<Rigidbody>();
    private void Start() => _target = GameObject.FindWithTag("Player").transform;

    private void FixedUpdate()
    {
        Vector3 dir = (_target.position - transform.position).normalized;
        _rb.MovePosition(transform.position + dir * _speed * Time.fixedDeltaTime);
    }
}
```

## Component Access

- Cache all `GetComponent<T>()` results in `Awake()` as private fields
- Use `TryGetComponent<T>()` instead of `GetComponent<T>()` — it does not allocate on failure
- Use `CompareTag("Tag")` instead of `gameObject.tag == "Tag"` — avoids string allocation
- Use `[RequireComponent(typeof(Rigidbody))]` to enforce component dependencies on the class

## Events and Delegates

- Use `System.Action` / `System.Action<T>` for events — not `UnityEvent` in code
- Raise events with null-conditional: `OnHealthChanged?.Invoke(current, max)`
- Always unsubscribe in `OnDisable()` to prevent memory leaks and null-reference errors after destroy
- Prefer ScriptableObject event channels over `static` C# events for cross-system communication

## Coroutines and Async

- Cache `new WaitForSeconds(t)` outside the loop body — do not allocate it on every iteration
- Store coroutine references: `_routine = StartCoroutine(...)` so they can be stopped explicitly
- Stop coroutines in `OnDisable()` to prevent execution on inactive objects
- Use `Awaitable` (Unity 6) for modern async: `await Awaitable.NextFrameAsync()`, `await Awaitable.WaitForSecondsAsync(t)`, `await Awaitable.BackgroundThreadAsync()`
- Return to main thread with `await Awaitable.MainThreadAsync()` before touching `GameObject` APIs
- Wrap `async void` methods in try/catch — unhandled exceptions are swallowed silently

## Object Pooling

- Use `UnityEngine.Pool.ObjectPool<T>` for any object spawned and destroyed repeatedly
- Set `collectionCheck: false` in release builds for pool performance
- Call `pool.Release(obj)` instead of `Destroy(obj)` on pooled objects
- Pre-warm pools during loading screens, not during gameplay

## Design Patterns

- Implement `IState` / `StateMachine` for AI and player state — avoid deep if/else chains in `Update()`
- Use interfaces (`IDamageable`, `IInteractable`, `ISaveable`) for cross-system contracts
- When singletons are necessary, null the static reference in `OnDestroy()`
- Keep `MonoBehaviour` classes thin — delegate logic to plain C# classes for testability

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| `GetComponent<T>()` in `Update()` | Cache in `Awake()` |
| `static` events without unsubscribe | Unsubscribe in `OnDisable()` |
| Physics in `Update()` | Use `FixedUpdate()` |
| `async void` without try/catch | Wrap or use `Awaitable` return type |
| `gameObject.tag == "Tag"` | Use `CompareTag()` |
| `Destroy()` on pooled objects | Call `pool.Release()` |
| LINQ in hot paths | Use manual loops or pre-cached collections |
| `new List<T>()` every frame | Pre-allocate and call `.Clear()` |

## Best Practices

- Use `[System.Serializable]` on nested data classes so they appear in the Inspector
- Use `#if UNITY_EDITOR` guards for editor-only debug code — strips from builds
- Keep `MonoBehaviour` classes thin — delegate logic to plain C# classes for testability
- Use `Mathf.Approximately()` for float comparisons, never `==`
- Prefer composition over inheritance — small, focused components combined on a `GameObject`
- Name boolean fields and properties to read as statements: `IsGrounded`, `CanAttack`, `IsAlive`
- Use `string.Format` or `StringBuilder` for repeated string operations — never `+` in loops
