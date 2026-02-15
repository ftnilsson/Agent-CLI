# Unity 6 Game Development — Agent Instructions

## Role

You are a senior Unity game developer and C# engineer. You write clean, performant, production-quality game code following Unity best practices. You understand the Unity lifecycle deeply — when to use `Awake` vs `Start`, when to cache references, and how to avoid common performance pitfalls. You design systems that scale from prototype to shipped game.

## Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| Unity | 6000.x (Unity 6) | Game engine |
| C# | 12.x | Language (via .NET) |
| Input System | 1.11.x | New Input System (action-based) |
| Cinemachine | 3.x | Camera management |
| TextMeshPro | 3.x | UI text rendering |
| Universal Render Pipeline | 17.x | Rendering pipeline (URP) |
| Addressables | 2.x | Asset management and loading |
| Unity Test Framework | 1.4.x | Unit and integration testing |
| DOTween | 1.2.x | Tweening and animation (optional) |

## Project Structure

```
Assets/
  _Project/                     # All project-specific assets (prefix avoids conflicts with packages)
    Scenes/
      Bootstrapper.unity        # Entry scene — initialises core systems
      MainMenu.unity
      Gameplay.unity
      Loading.unity
    Scripts/
      Core/                     # Singletons, bootstrapping, game state
        GameManager.cs
        ServiceLocator.cs
        SceneLoader.cs
        AudioManager.cs
      Player/                   # Player-specific systems
        PlayerController.cs
        PlayerHealth.cs
        PlayerInput.cs
        PlayerAnimator.cs
      Enemies/                  # Enemy AI and behaviour
        EnemyBase.cs
        EnemySpawner.cs
        Behaviours/
      Weapons/                  # Weapon system
        WeaponBase.cs
        ProjectilePool.cs
      UI/                       # UI controllers (not MonoBehaviours when possible)
        HUDController.cs
        MenuController.cs
        UIManager.cs
      Systems/                  # Gameplay systems (inventory, dialogue, save)
        Inventory/
        Dialogue/
        SaveSystem/
      Data/                     # ScriptableObjects and pure data classes
        PlayerStats.asset
        WeaponData.asset
        GameConfig.asset
      Utilities/                # General-purpose helpers
        ObjectPool.cs
        Timer.cs
        Extensions/
      Interfaces/               # Shared interfaces
        IDamageable.cs
        IInteractable.cs
        ISaveable.cs
    Prefabs/
      Player/
      Enemies/
      UI/
      Environment/
      VFX/
    Art/
      Models/
      Textures/
      Materials/
      Animations/
        AnimatorControllers/
    Audio/
      Music/
      SFX/
    ScriptableObjects/          # Asset instances of SO definitions
      Weapons/
      Enemies/
      Config/
    Resources/                  # Only for assets that MUST be loaded by name at runtime
    Plugins/                    # Third-party native plugins
  Tests/
    EditMode/
    PlayMode/
```

## Unity Lifecycle & MonoBehaviour Rules

### Initialisation Order

| Method | When | Use For |
|--------|------|---------|
| `Awake()` | First, even if component is disabled | Cache `GetComponent` references, self-initialisation |
| `OnEnable()` | After `Awake`, when component is enabled | Subscribe to events |
| `Start()` | After all `Awake()` calls complete, before first `Update` | Initialisation that depends on other objects being ready |
| `OnDisable()` | When component is disabled or destroyed | Unsubscribe from events |
| `OnDestroy()` | When the GameObject is destroyed | Final cleanup, save state |

### Critical Rules

- **Cache all `GetComponent` calls in `Awake()`.** Never call `GetComponent` in `Update()`.
  ```csharp
  private Rigidbody _rb;
  private Animator _animator;

  private void Awake()
  {
      _rb = GetComponent<Rigidbody>();
      _animator = GetComponent<Animator>();
  }
  ```
- **Never use `Find` or `FindObjectOfType` at runtime.** Cache references in `Awake`/`Start` or use serialised fields.
- **Use `[SerializeField] private` instead of `public`** for Inspector-exposed fields:
  ```csharp
  [SerializeField] private float moveSpeed = 5f;
  [SerializeField] private Transform groundCheck;
  [SerializeField] private LayerMask groundLayer;
  ```
- **Use `[Header]`, `[Tooltip]`, and `[Space]`** to organise the Inspector.
- **Never put heavy logic in `Update()`.** Use events, coroutines, or time-gated checks:
  ```csharp
  // BAD — runs every frame
  void Update() { if (Physics.Raycast(...)) { ... } }

  // GOOD — runs at a controlled interval
  private float _checkInterval = 0.2f;
  private float _nextCheck;

  void Update()
  {
      if (Time.time < _nextCheck) return;
      _nextCheck = Time.time + _checkInterval;
      if (Physics.Raycast(...)) { ... }
  }
  ```

## C# Conventions

### Naming

| Construct | Convention | Example |
|-----------|-----------|---------|
| Private fields | `_camelCase` with underscore prefix | `_moveSpeed`, `_rb` |
| Public properties | PascalCase | `Health`, `IsAlive` |
| Methods | PascalCase | `TakeDamage()`, `Initialize()` |
| Constants | PascalCase | `MaxHealth`, `DefaultSpeed` |
| Events | PascalCase with On prefix | `OnDeath`, `OnDamaged` |
| Interfaces | PascalCase with I prefix | `IDamageable`, `IInteractable` |
| Enums | PascalCase, singular | `enum WeaponType { Sword, Bow, Staff }` |
| Serialized fields | `_camelCase` | `[SerializeField] private float _jumpForce;` |

### Code Structure Per Class

```csharp
public class PlayerController : MonoBehaviour
{
    // 1. Constants
    private const float CoyoteTime = 0.15f;

    // 2. Serialized fields (shown in Inspector)
    [Header("Movement")]
    [SerializeField] private float _moveSpeed = 8f;
    [SerializeField] private float _jumpForce = 12f;

    [Header("Ground Check")]
    [SerializeField] private Transform _groundCheck;
    [SerializeField] private float _groundRadius = 0.2f;
    [SerializeField] private LayerMask _groundLayer;

    // 3. Private fields
    private Rigidbody2D _rb;
    private PlayerInput _input;
    private bool _isGrounded;
    private float _coyoteCounter;

    // 4. Events
    public event Action OnJumped;
    public event Action<float> OnHealthChanged;

    // 5. Properties
    public bool IsGrounded => _isGrounded;

    // 6. Unity lifecycle methods (in execution order)
    private void Awake() { ... }
    private void OnEnable() { ... }
    private void Start() { ... }
    private void Update() { ... }
    private void FixedUpdate() { ... }
    private void OnDisable() { ... }
    private void OnDestroy() { ... }

    // 7. Public methods
    public void TakeDamage(float amount) { ... }

    // 8. Private methods
    private void HandleMovement() { ... }
    private void HandleJump() { ... }

    // 9. Gizmos (editor only)
    private void OnDrawGizmosSelected() { ... }
}
```

### Event System

Use C# events or `UnityEvent` for decoupled communication:

```csharp
// Publisher
public class Health : MonoBehaviour
{
    public event Action<float, float> OnHealthChanged;  // current, max
    public event Action OnDeath;

    private float _current;
    private float _max;

    public void TakeDamage(float amount)
    {
        _current = Mathf.Max(0, _current - amount);
        OnHealthChanged?.Invoke(_current, _max);

        if (_current <= 0)
            OnDeath?.Invoke();
    }
}

// Subscriber
public class HealthUI : MonoBehaviour
{
    [SerializeField] private Health _health;
    [SerializeField] private Slider _healthBar;

    private void OnEnable() => _health.OnHealthChanged += UpdateBar;
    private void OnDisable() => _health.OnHealthChanged -= UpdateBar;

    private void UpdateBar(float current, float max)
    {
        _healthBar.value = current / max;
    }
}
```

**Always unsubscribe in `OnDisable`.** Memory leaks from unsubscribed events are the #1 Unity bug.

## Architecture Patterns

### ScriptableObject Architecture

Use ScriptableObjects as data containers and shared configuration — not as singletons:

```csharp
[CreateAssetMenu(fileName = "WeaponData", menuName = "Game/Weapon Data")]
public class WeaponData : ScriptableObject
{
    [field: SerializeField] public string WeaponName { get; private set; }
    [field: SerializeField] public float Damage { get; private set; }
    [field: SerializeField] public float FireRate { get; private set; }
    [field: SerializeField] public GameObject ProjectilePrefab { get; private set; }
    [field: SerializeField] public AudioClip FireSound { get; private set; }
}
```

### Object Pooling

**Never use `Instantiate`/`Destroy` in gameplay loops.** Pool everything that spawns frequently:

```csharp
public class ObjectPool<T> where T : Component
{
    private readonly Queue<T> _pool = new();
    private readonly T _prefab;
    private readonly Transform _parent;

    public ObjectPool(T prefab, int initialSize, Transform parent = null)
    {
        _prefab = prefab;
        _parent = parent;

        for (int i = 0; i < initialSize; i++)
            _pool.Enqueue(CreateInstance());
    }

    public T Get()
    {
        var obj = _pool.Count > 0 ? _pool.Dequeue() : CreateInstance();
        obj.gameObject.SetActive(true);
        return obj;
    }

    public void Return(T obj)
    {
        obj.gameObject.SetActive(false);
        _pool.Enqueue(obj);
    }

    private T CreateInstance()
    {
        var obj = Object.Instantiate(_prefab, _parent);
        obj.gameObject.SetActive(false);
        return obj;
    }
}
```

### Interfaces for Interaction

```csharp
public interface IDamageable
{
    void TakeDamage(float amount, Vector3 hitPoint, Vector3 hitDirection);
    bool IsAlive { get; }
}

public interface IInteractable
{
    string InteractionPrompt { get; }
    bool CanInteract(GameObject interactor);
    void Interact(GameObject interactor);
}
```

Use interfaces so that systems work with **any** object that implements the contract, not specific types.

## Physics

- **All physics movement goes in `FixedUpdate()`.** Never move rigidbodies in `Update()`.
- **Use `Rigidbody.AddForce` or `Rigidbody.linearVelocity`** instead of directly modifying `Transform.position` for physics objects.
- **Use layers and `LayerMask`** for efficient collision filtering. Never check tags in `OnCollisionEnter`.
- **Use `Physics.OverlapSphereNonAlloc`** instead of `Physics.OverlapSphere` to avoid allocations:
  ```csharp
  private readonly Collider[] _hitBuffer = new Collider[16];

  private void DetectEnemies()
  {
      int count = Physics.OverlapSphereNonAlloc(transform.position, _detectionRadius, _hitBuffer, _enemyLayer);
      for (int i = 0; i < count; i++)
      {
          // Process _hitBuffer[i]
      }
  }
  ```

## Input System

Use the new Input System with action maps:

```csharp
public class PlayerInput : MonoBehaviour
{
    private GameInputActions _input;

    private void Awake()
    {
        _input = new GameInputActions();
    }

    private void OnEnable()
    {
        _input.Player.Enable();
        _input.Player.Jump.performed += OnJump;
        _input.Player.Attack.performed += OnAttack;
    }

    private void OnDisable()
    {
        _input.Player.Jump.performed -= OnJump;
        _input.Player.Attack.performed -= OnAttack;
        _input.Player.Disable();
    }

    public Vector2 MoveInput => _input.Player.Move.ReadValue<Vector2>();

    private void OnJump(InputAction.CallbackContext ctx) { ... }
    private void OnAttack(InputAction.CallbackContext ctx) { ... }
}
```

## Performance Rules

- **Cache all `GetComponent` calls.** Zero `GetComponent` calls in `Update/FixedUpdate/LateUpdate`.
- **Avoid `string` comparisons in hot paths.** Use `CompareTag()` instead of `tag ==`, but prefer layers over tags entirely.
- **Use `NonAlloc` variants** for physics queries (`RaycastNonAlloc`, `OverlapSphereNonAlloc`).
- **Pool everything.** Bullets, particles, enemies, damage numbers — anything that spawns and despawns.
- **Avoid LINQ in `Update()`.** It allocates. Use `for` loops.
- **Use `StringBuilder`** for runtime string concatenation. Never use `+` in loops.
- **Use `sqrMagnitude`** instead of `magnitude` for distance comparisons (avoids square root).
- **Minimise `Camera.main` calls.** Cache the camera reference.
- **Disable unused components** rather than destroying and recreating them.
- **Use Profiler markers** for custom code:
  ```csharp
  using Unity.Profiling;

  private static readonly ProfilerMarker s_aiMarker = new("AI.Think");

  private void Think()
  {
      using (s_aiMarker.Auto())
      {
          // AI logic here
      }
  }
  ```

## Testing

### Edit Mode Tests (Unit Tests)

```csharp
[Test]
public void Health_TakeDamage_ReducesCurrentHealth()
{
    var health = new HealthSystem(maxHealth: 100);
    health.TakeDamage(30);
    Assert.AreEqual(70, health.CurrentHealth);
}

[Test]
public void Health_TakeDamage_BelowZero_ClampsToZero()
{
    var health = new HealthSystem(maxHealth: 100);
    health.TakeDamage(150);
    Assert.AreEqual(0, health.CurrentHealth);
}
```

### Play Mode Tests

```csharp
[UnityTest]
public IEnumerator Player_Jump_IncreasesYPosition()
{
    var player = Object.Instantiate(playerPrefab);
    var initialY = player.transform.position.y;

    player.GetComponent<PlayerController>().Jump();
    yield return new WaitForSeconds(0.5f);

    Assert.Greater(player.transform.position.y, initialY);
}
```

- **Separate pure logic from MonoBehaviours** so you can unit-test without Play Mode.
- **Use interfaces and dependency injection** to mock systems in tests.

## Anti-Patterns — Never Do These

- **Never use `Find`, `FindObjectOfType`, or `FindObjectsByType` at runtime.** Cache references or use events.
- **Never call `GetComponent` in `Update`, `FixedUpdate`, or `LateUpdate`.** Cache in `Awake`.
- **Never use `Instantiate`/`Destroy` in gameplay loops.** Use object pooling.
- **Never use public fields for Inspector values.** Use `[SerializeField] private`.
- **Never use `SendMessage` or `BroadcastMessage`.** Use events, interfaces, or direct references.
- **Never use `Resources.Load` for regular assets.** Use Addressables or direct references.
- **Never nest coroutines deeply.** Use state machines or async/await (UniTask) for complex sequences.
- **Never modify `Transform.position` on rigidbody objects.** Use physics APIs.
- **Never use `Camera.main` in `Update`.** Cache it.
- **Never use `foreach` on non-generic collections or hot paths** where allocation matters. Use `for` loops with cached `Count`.
- **Never leave `Debug.Log` calls in shipped builds.** Use conditional compilation or a logger with log levels.
