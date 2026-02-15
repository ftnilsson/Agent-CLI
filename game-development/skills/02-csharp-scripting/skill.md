# C# Scripting Fundamentals

## Description

This skill covers writing correct, performant, and idiomatic C# code for Unity. It spans the MonoBehaviour lifecycle, coroutines, events and delegates, ScriptableObjects, and essential design patterns used in game development. Mastering these fundamentals is the foundation for every other Unity skill.

## When To Use

- Writing any new C# script for a Unity project
- Implementing game logic, systems, or utilities
- Choosing between MonoBehaviour, ScriptableObject, or plain C# classes
- Setting up event-driven communication between systems
- Applying design patterns (Singleton, Observer, State, Command, Object Pool)
- Debugging lifecycle or execution-order issues

## Prerequisites

- Unity 6 (6000.x) project with assembly definitions configured
- Intermediate C# knowledge (generics, interfaces, LINQ basics)
- Familiarity with the Unity Editor (Inspector, Console, Hierarchy)

## Instructions

### 1. MonoBehaviour Lifecycle

Understanding the execution order is critical. Callbacks fire in this order:

```
Initialization
  ├── Awake()           — Called once when the script instance is loaded (even if disabled)
  ├── OnEnable()        — Called each time the object becomes active
  └── Start()           — Called once before the first Update (only if enabled)

Physics Loop (FixedUpdate may run 0-N times per frame)
  └── FixedUpdate()     — Fixed timestep (default 0.02s). Use for physics.

Game Loop (once per frame)
  ├── Update()          — Called every frame. Main game logic goes here.
  ├── LateUpdate()      — Called after all Update()s. Camera follow goes here.
  └── OnGUI()           — Legacy immediate-mode GUI. Avoid in new projects.

Rendering
  ├── OnBecameVisible() / OnBecameInvisible()
  ├── OnPreRender() / OnPostRender()
  └── OnRenderObject()

Destruction
  ├── OnDisable()       — Called when the object becomes inactive
  └── OnDestroy()       — Called when the object is destroyed
```

**Rules:**
- Use `Awake()` for self-initialization (setting references to own components).
- Use `Start()` for cross-references (finding other objects).
- Use `OnEnable()`/`OnDisable()` to subscribe/unsubscribe from events.
- Never use `Find()` in `Update()`. Cache references in `Awake()` or `Start()`.

```csharp
public class Enemy : MonoBehaviour
{
    [SerializeField] private float _speed = 5f;
    
    private Rigidbody _rb;
    private Transform _target;
    
    private void Awake()
    {
        // Self-initialization — guaranteed to run before Start
        _rb = GetComponent<Rigidbody>();
    }
    
    private void Start()
    {
        // Cross-references — other objects are initialized by now
        _target = GameObject.FindWithTag("Player").transform;
    }
    
    private void FixedUpdate()
    {
        // Physics-based movement
        Vector3 direction = (_target.position - transform.position).normalized;
        _rb.MovePosition(transform.position + direction * _speed * Time.fixedDeltaTime);
    }
}
```

### 2. Coroutines

Coroutines spread work across frames. They are NOT multithreaded — they run on the main thread.

```csharp
using System.Collections;
using UnityEngine;

public class SpawnManager : MonoBehaviour
{
    [SerializeField] private GameObject _enemyPrefab;
    [SerializeField] private float _spawnInterval = 2f;
    [SerializeField] private int _maxEnemies = 10;
    
    private int _currentCount;
    private Coroutine _spawnRoutine;
    
    private void OnEnable()
    {
        _spawnRoutine = StartCoroutine(SpawnLoop());
    }
    
    private void OnDisable()
    {
        if (_spawnRoutine != null)
        {
            StopCoroutine(_spawnRoutine);
            _spawnRoutine = null;
        }
    }
    
    private IEnumerator SpawnLoop()
    {
        // Cache the WaitForSeconds to avoid allocation every iteration
        var wait = new WaitForSeconds(_spawnInterval);
        
        while (_currentCount < _maxEnemies)
        {
            SpawnEnemy();
            _currentCount++;
            yield return wait;
        }
    }
    
    private void SpawnEnemy()
    {
        Vector3 spawnPos = Random.insideUnitSphere * 10f;
        spawnPos.y = 0f;
        Instantiate(_enemyPrefab, spawnPos, Quaternion.identity);
    }
}
```

**Useful yield instructions:**
| Yield | When It Resumes |
|-------|----------------|
| `yield return null` | Next frame (after Update) |
| `yield return new WaitForSeconds(t)` | After `t` scaled seconds |
| `yield return new WaitForSecondsRealtime(t)` | After `t` unscaled seconds |
| `yield return new WaitForFixedUpdate()` | Next FixedUpdate |
| `yield return new WaitForEndOfFrame()` | After rendering completes |
| `yield return new WaitUntil(() => cond)` | When condition becomes true |
| `yield return StartCoroutine(Other())` | When the other coroutine finishes |
| `yield return asyncOperation` | When async operation completes |

> **Modern alternative:** For complex async work, consider `async`/`await` with `Awaitable` (Unity 6+). It supports `Awaitable.WaitForSecondsAsync()`, `Awaitable.NextFrameAsync()`, etc.

### 3. Events and Delegates

Use events for decoupled communication. This is the **Observer pattern** — objects react to changes without direct references.

#### C# Events (Preferred)

```csharp
using System;
using UnityEngine;

public class GameManager : MonoBehaviour
{
    // Define events
    public static event Action OnGameStarted;
    public static event Action OnGamePaused;
    public static event Action<int> OnScoreChanged;
    
    private int _score;
    
    public void StartGame()
    {
        _score = 0;
        OnGameStarted?.Invoke();
    }
    
    public void AddScore(int points)
    {
        _score += points;
        OnScoreChanged?.Invoke(_score);
    }
    
    public void PauseGame()
    {
        Time.timeScale = 0f;
        OnGamePaused?.Invoke();
    }
}

// Subscriber — no direct reference to GameManager needed
public class ScoreUI : MonoBehaviour
{
    [SerializeField] private TMPro.TMP_Text _scoreText;
    
    private void OnEnable()
    {
        GameManager.OnScoreChanged += UpdateScore;
        GameManager.OnGameStarted += ResetDisplay;
    }
    
    private void OnDisable()
    {
        GameManager.OnScoreChanged -= UpdateScore;
        GameManager.OnGameStarted -= ResetDisplay;
    }
    
    private void UpdateScore(int score)
    {
        _scoreText.text = $"Score: {score}";
    }
    
    private void ResetDisplay()
    {
        _scoreText.text = "Score: 0";
    }
}
```

#### ScriptableObject Event Channels (Recommended for larger projects)

```csharp
using System;
using UnityEngine;

[CreateAssetMenu(fileName = "New Void Event", menuName = "Events/Void Event Channel")]
public class VoidEventChannel : ScriptableObject
{
    public event Action OnEventRaised;
    
    public void RaiseEvent()
    {
        OnEventRaised?.Invoke();
    }
}

[CreateAssetMenu(fileName = "New Int Event", menuName = "Events/Int Event Channel")]
public class IntEventChannel : ScriptableObject
{
    public event Action<int> OnEventRaised;
    
    public void RaiseEvent(int value)
    {
        OnEventRaised?.Invoke(value);
    }
}
```

Usage: Create instances in the project, assign them in the Inspector, and subscribe/raise through the asset. This eliminates static references and makes systems fully modular.

### 4. ScriptableObjects

ScriptableObjects are data containers that live as assets. They do NOT exist in scenes.

#### Data Containers

```csharp
using UnityEngine;

[CreateAssetMenu(fileName = "New Weapon", menuName = "Data/Weapon Data")]
public class WeaponData : ScriptableObject
{
    [Header("Identity")]
    public string weaponName;
    public Sprite icon;
    [TextArea] public string description;
    
    [Header("Stats")]
    public int damage = 10;
    public float attackSpeed = 1f;
    public float range = 2f;
    
    [Header("Effects")]
    public GameObject hitVfxPrefab;
    public AudioClip hitSfx;
}
```

#### Runtime Data (Shared State)

```csharp
[CreateAssetMenu(fileName = "New Player Runtime Data", menuName = "Data/Player Runtime Data")]
public class PlayerRuntimeData : ScriptableObject
{
    [System.NonSerialized] public int currentHealth;
    [System.NonSerialized] public int currentAmmo;
    [System.NonSerialized] public Vector3 lastCheckpoint;
    
    public void Reset()
    {
        currentHealth = 100;
        currentAmmo = 30;
        lastCheckpoint = Vector3.zero;
    }
}
```

#### Enum-like Pattern (Extensible enums)

```csharp
[CreateAssetMenu(fileName = "New Damage Type", menuName = "Data/Damage Type")]
public class DamageType : ScriptableObject
{
    public Color displayColor = Color.white;
    public float resistanceMultiplier = 1f;
}
// Create assets: Fire, Ice, Lightning, Poison — add new types without changing code
```

### 5. Essential Design Patterns

#### Singleton (Use Sparingly)

```csharp
public class AudioManager : MonoBehaviour
{
    public static AudioManager Instance { get; private set; }
    
    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
        DontDestroyOnLoad(gameObject);
    }
    
    private void OnDestroy()
    {
        if (Instance == this) Instance = null;
    }
}
```

> **Warning:** Singletons introduce hidden dependencies and make testing hard. Prefer ScriptableObject event channels or dependency injection for new systems.

#### Service Locator (Better than Singleton)

```csharp
public static class ServiceLocator
{
    private static readonly Dictionary<Type, object> _services = new();
    
    public static void Register<T>(T service) where T : class
    {
        _services[typeof(T)] = service;
    }
    
    public static T Get<T>() where T : class
    {
        if (_services.TryGetValue(typeof(T), out var service))
            return service as T;
        throw new InvalidOperationException($"Service {typeof(T).Name} not registered.");
    }
    
    public static void Clear() => _services.Clear();
}
```

#### Object Pool

```csharp
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Pool;

public class ProjectilePool : MonoBehaviour
{
    [SerializeField] private Projectile _prefab;
    [SerializeField] private int _defaultCapacity = 20;
    [SerializeField] private int _maxSize = 100;
    
    private ObjectPool<Projectile> _pool;
    
    private void Awake()
    {
        _pool = new ObjectPool<Projectile>(
            createFunc: () =>
            {
                var p = Instantiate(_prefab);
                p.SetPool(_pool);
                return p;
            },
            actionOnGet: p => p.gameObject.SetActive(true),
            actionOnRelease: p => p.gameObject.SetActive(false),
            actionOnDestroy: p => Destroy(p.gameObject),
            collectionCheck: false,
            defaultCapacity: _defaultCapacity,
            maxSize: _maxSize
        );
    }
    
    public Projectile Get() => _pool.Get();
}

public class Projectile : MonoBehaviour
{
    private ObjectPool<Projectile> _pool;
    
    public void SetPool(ObjectPool<Projectile> pool) => _pool = pool;
    
    public void ReturnToPool() => _pool.Release(this);
}
```

#### State Machine

```csharp
public interface IState
{
    void Enter();
    void Update();
    void Exit();
}

public class StateMachine
{
    private IState _currentState;
    
    public void ChangeState(IState newState)
    {
        _currentState?.Exit();
        _currentState = newState;
        _currentState.Enter();
    }
    
    public void Update() => _currentState?.Update();
}

// Example usage:
public class IdleState : IState
{
    private readonly EnemyAI _enemy;
    
    public IdleState(EnemyAI enemy) => _enemy = enemy;
    
    public void Enter() => _enemy.Animator.Play("Idle");
    
    public void Update()
    {
        if (_enemy.CanSeePlayer())
            _enemy.StateMachine.ChangeState(new ChaseState(_enemy));
    }
    
    public void Exit() { }
}
```

### 6. Interfaces for Modularity

```csharp
public interface IDamageable
{
    void TakeDamage(float amount, DamageType type = null);
    bool IsAlive { get; }
}

public interface IInteractable
{
    string InteractionPrompt { get; }
    bool CanInteract(GameObject interactor);
    void Interact(GameObject interactor);
}

public interface ISaveable
{
    string SaveId { get; }
    object CaptureState();
    void RestoreState(object state);
}
```

Use these with `TryGetComponent`:

```csharp
if (collision.gameObject.TryGetComponent<IDamageable>(out var damageable))
{
    damageable.TakeDamage(25f);
}
```

### 7. Awaitable (Unity 6+)

Unity 6 introduced `Awaitable` as a modern alternative to coroutines:

```csharp
using UnityEngine;

public class ModernAsync : MonoBehaviour
{
    private async void Start()
    {
        await LoadGameAsync();
    }
    
    private async Awaitable LoadGameAsync()
    {
        // Wait a frame
        await Awaitable.NextFrameAsync();
        
        // Wait for seconds (respects Time.timeScale)
        await Awaitable.WaitForSecondsAsync(2f);
        
        // Load scene async
        await SceneManager.LoadSceneAsync("GameScene");
        
        // Run heavy work on background thread
        var result = await Awaitable.BackgroundThreadAsync();
        // ... expensive computation ...
        
        // Return to main thread
        await Awaitable.MainThreadAsync();
        // ... use result to update GameObjects ...
    }
}
```

## Best Practices

1. **Cache component references** in `Awake()` — never call `GetComponent<T>()` in `Update()`.
2. **Avoid `Find*()` methods at runtime** — use serialized references, events, or a service locator.
3. **Prefer `TryGetComponent<T>()`** over `GetComponent<T>()` — it doesn't allocate on failure.
4. **Use `CompareTag("Tag")`** instead of `gameObject.tag == "Tag"` — it avoids string allocation.
5. **Pool frequently instantiated objects** (projectiles, particles, UI popups).
6. **Avoid allocations in Update** — no `new`, `string` concatenation, LINQ, or boxing in hot paths.
7. **Use `[System.Serializable]`** on nested data classes so they appear in the Inspector.
8. **Prefer composition** — small, focused components combined on a GameObject.
9. **Always unsubscribe from events** in `OnDisable()` or `OnDestroy()` to prevent memory leaks.
10. **Use `#if UNITY_EDITOR`** guards for editor-only debug code.

## Common Pitfalls

| Pitfall | Why It Hurts | Fix |
|---------|-------------|-----|
| Calling `GetComponent` every frame | CPU overhead from repeated lookups | Cache in `Awake()` |
| Forgetting to unsubscribe events | Memory leaks and null reference errors | Unsubscribe in `OnDisable()` |
| Using `Update()` for physics | Inconsistent behavior at different frame rates | Use `FixedUpdate()` for physics |
| `async void` without try/catch | Exceptions are silently swallowed | Wrap in try/catch or use `Awaitable` return type |
| String comparison with `==` on tags | Allocates garbage every frame | Use `CompareTag()` |
| Using `Destroy()` on pooled objects | Defeats the purpose of pooling | Call `Release()` or `ReturnToPool()` |
| Accessing destroyed objects | `MissingReferenceException` | Null-check or use `if (obj != null)` (Unity overloads `==`) |
| Heavy LINQ in Update | Allocations cause GC spikes | Use loops or cached collections |

## Reference

- [Unity Manual — Order of Execution](https://docs.unity3d.com/Manual/ExecutionOrder.html)
- [Unity Manual — Coroutines](https://docs.unity3d.com/Manual/Coroutines.html)
- [Unity Manual — ScriptableObject](https://docs.unity3d.com/Manual/class-ScriptableObject.html)
- [Unity Scripting API — ObjectPool](https://docs.unity3d.com/ScriptReference/Pool.ObjectPool-1.html)
- [Unity Manual — Awaitable](https://docs.unity3d.com/6000.0/Documentation/Manual/async-await.html)
