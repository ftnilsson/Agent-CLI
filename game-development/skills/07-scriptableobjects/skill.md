# ScriptableObject Architecture

## Description

This skill covers ScriptableObjects as an architectural tool — going far beyond simple data containers. ScriptableObjects are Unity's most underused power feature: they enable data-driven design, decoupled event systems, runtime sets, pluggable behaviors, and modular architecture that eliminates hard dependencies between systems. Mastering ScriptableObject patterns transforms how you structure entire games.

## When To Use

- Defining game data that designers can tune without code changes (weapons, enemies, items, abilities)
- Building event systems that don't require direct references between objects
- Creating shared runtime state accessible across scenes without singletons
- Implementing pluggable/swappable behaviors (AI strategies, abilities, status effects)
- Building enum-like systems that are extensible without code changes
- Creating editor tooling and custom inspectors for content creation
- Designing inventory, crafting, dialogue, or quest systems

## Prerequisites

- Unity 6 (6000.x)
- [02 — C# Scripting](../02-CSharp-Scripting/skill.md) fundamentals
- Understanding of C# generics, interfaces, and events

## Instructions

### 1. What ScriptableObjects Are (and Are Not)

ScriptableObjects are **asset files** that live in the Project (not in scenes). They inherit from `UnityEngine.ScriptableObject` instead of `MonoBehaviour`.

| ScriptableObject | MonoBehaviour |
|-----------------|---------------|
| Lives as an asset in the Project folder | Lives on a GameObject in a Scene |
| One instance shared by all references | One instance per GameObject |
| **No** `Update()`, `Start()`, `Awake()` (has `OnEnable`, `OnDisable`, `OnDestroy`) | Full lifecycle callbacks |
| Cannot use `GetComponent`, `transform`, `Coroutines` | Full component access |
| Survives scene loads (it's an asset) | Destroyed when scene unloads (unless `DontDestroyOnLoad`) |
| Changes **persist in Editor**, reset on build | Changes reset on scene reload |

> **Critical:** In the Editor, changes to ScriptableObject fields at runtime persist after stopping Play Mode. In builds, runtime changes are lost. Use `[System.NonSerialized]` for runtime-only state.

### 2. Data Containers (The Basics)

The most common use: externalizing game data into tunable assets.

```csharp
using UnityEngine;

[CreateAssetMenu(fileName = "New Weapon", menuName = "Game Data/Weapon")]
public class WeaponData : ScriptableObject
{
    [Header("Identity")]
    public string displayName;
    public Sprite icon;
    [TextArea(2, 5)] public string description;
    
    [Header("Combat Stats")]
    [Range(1, 100)] public int baseDamage = 10;
    [Range(0.1f, 5f)] public float attackSpeed = 1f;
    [Range(0.5f, 20f)] public float range = 2f;
    public DamageType damageType;
    
    [Header("Scaling")]
    public AnimationCurve damageScaling = AnimationCurve.Linear(0, 1, 1, 2);
    
    [Header("VFX & Audio")]
    public GameObject hitEffectPrefab;
    public AudioClip[] attackSounds;
    public AudioClip[] hitSounds;
    
    /// <summary>
    /// Calculate damage at a given character level.
    /// </summary>
    public int GetDamageAtLevel(int level)
    {
        float multiplier = damageScaling.Evaluate((float)level / 100f);
        return Mathf.RoundToInt(baseDamage * multiplier);
    }
    
    /// <summary>
    /// Get a random attack sound (avoids repetition patterns).
    /// </summary>
    public AudioClip GetRandomAttackSound()
    {
        if (attackSounds == null || attackSounds.Length == 0) return null;
        return attackSounds[Random.Range(0, attackSounds.Length)];
    }
}
```

**Usage in a MonoBehaviour:**

```csharp
public class Weapon : MonoBehaviour
{
    [SerializeField] private WeaponData _data;  // Drag the asset in Inspector
    
    public void Attack(IDamageable target)
    {
        int damage = _data.GetDamageAtLevel(PlayerLevel);
        target.TakeDamage(damage, _data.damageType);
        
        AudioSource.PlayClipAtPoint(_data.GetRandomAttackSound(), transform.position);
    }
}
```

> **Benefits:** Designers create weapon variants by duplicating the asset and tweaking values — zero code changes. 50 weapons? 50 assets, one script.

### 3. Event Channels (Decoupled Communication)

This is the **most powerful** ScriptableObject pattern. Event channels replace static events and singletons for system communication.

#### Generic Event Channel Base

```csharp
using UnityEngine;

/// <summary>
/// Base class for ScriptableObject-based event channels.
/// Event channels are assets that act as a middleman for raising and listening to events.
/// Neither the sender nor the receiver needs to know about each other.
/// </summary>
public abstract class EventChannel<T> : ScriptableObject
{
    private readonly HashSet<EventListener<T>> _listeners = new();
    
    // Code-based subscription (for MonoBehaviours)
    public event System.Action<T> OnEventRaised;
    
    public void RaiseEvent(T value)
    {
        OnEventRaised?.Invoke(value);
        
        // Notify Inspector-wired listeners
        foreach (var listener in _listeners)
        {
            listener.OnEventRaised(value);
        }
    }
    
    public void Register(EventListener<T> listener) => _listeners.Add(listener);
    public void Unregister(EventListener<T> listener) => _listeners.Remove(listener);
}
```

#### Concrete Event Channel Types

```csharp
[CreateAssetMenu(fileName = "New Void Event", menuName = "Events/Void Event Channel")]
public class VoidEventChannel : ScriptableObject
{
    private readonly HashSet<VoidEventListener> _listeners = new();
    public event System.Action OnEventRaised;
    
    public void RaiseEvent()
    {
        OnEventRaised?.Invoke();
        foreach (var listener in _listeners)
            listener.OnEventRaised();
    }
    
    public void Register(VoidEventListener listener) => _listeners.Add(listener);
    public void Unregister(VoidEventListener listener) => _listeners.Remove(listener);
}

[CreateAssetMenu(fileName = "New Int Event", menuName = "Events/Int Event Channel")]
public class IntEventChannel : EventChannel<int> { }

[CreateAssetMenu(fileName = "New Float Event", menuName = "Events/Float Event Channel")]
public class FloatEventChannel : EventChannel<float> { }

[CreateAssetMenu(fileName = "New String Event", menuName = "Events/String Event Channel")]
public class StringEventChannel : EventChannel<string> { }

[CreateAssetMenu(fileName = "New Vector3 Event", menuName = "Events/Vector3 Event Channel")]
public class Vector3EventChannel : EventChannel<Vector3> { }
```

#### Event Listener Component (Inspector-driven wiring)

```csharp
using UnityEngine;
using UnityEngine.Events;

/// <summary>
/// Place on any GameObject. Wire the event channel and response in the Inspector.
/// No code needed — designers can wire up game logic visually.
/// </summary>
public class VoidEventListener : MonoBehaviour
{
    [SerializeField] private VoidEventChannel _channel;
    [SerializeField] private UnityEvent _response;
    
    private void OnEnable() => _channel.Register(this);
    private void OnDisable() => _channel.Unregister(this);
    
    public void OnEventRaised() => _response.Invoke();
}

public abstract class EventListener<T> : MonoBehaviour
{
    [SerializeField] private EventChannel<T> _channel;
    [SerializeField] private UnityEvent<T> _response;
    
    private void OnEnable() => _channel.Register(this);
    private void OnDisable() => _channel.Unregister(this);
    
    public void OnEventRaised(T value) => _response.Invoke(value);
}

public class IntEventListener : EventListener<int> { }
public class FloatEventListener : EventListener<float> { }
public class StringEventListener : EventListener<string> { }
```

#### Example Usage

```
Project Assets:
├── Events/
│   ├── OnPlayerDied.asset          (VoidEventChannel)
│   ├── OnScoreChanged.asset        (IntEventChannel)
│   ├── OnPlayerHealthChanged.asset (FloatEventChannel)
│   └── OnEnemySpawned.asset        (Vector3EventChannel)
```

**Raising events (code):**

```csharp
public class PlayerHealth : MonoBehaviour
{
    [SerializeField] private FloatEventChannel _onHealthChanged;
    [SerializeField] private VoidEventChannel _onPlayerDied;
    
    private float _health = 100f;
    
    public void TakeDamage(float amount)
    {
        _health -= amount;
        _onHealthChanged.RaiseEvent(_health);
        
        if (_health <= 0f)
            _onPlayerDied.RaiseEvent();
    }
}
```

**Listening (code-based):**

```csharp
public class HealthUI : MonoBehaviour
{
    [SerializeField] private FloatEventChannel _onHealthChanged;
    [SerializeField] private UnityEngine.UI.Slider _healthBar;
    
    private void OnEnable() => _onHealthChanged.OnEventRaised += UpdateHealthBar;
    private void OnDisable() => _onHealthChanged.OnEventRaised -= UpdateHealthBar;
    
    private void UpdateHealthBar(float health) => _healthBar.value = health / 100f;
}
```

**Listening (Inspector-driven):** Add a `VoidEventListener` component, drag `OnPlayerDied` into the channel slot, and wire up a `UnityEvent` response to restart the level — zero code.

### 4. Runtime Sets (Track Active Objects)

A Runtime Set is a ScriptableObject that maintains a list of active objects. Any object can register/unregister itself, and any system can query the set.

```csharp
using System.Collections.Generic;
using UnityEngine;

[CreateAssetMenu(fileName = "New Runtime Set", menuName = "Runtime/Runtime Set")]
public class RuntimeSet<T> : ScriptableObject
{
    [System.NonSerialized] private readonly List<T> _items = new();
    
    public IReadOnlyList<T> Items => _items;
    public int Count => _items.Count;
    
    public void Add(T item)
    {
        if (!_items.Contains(item))
            _items.Add(item);
    }
    
    public void Remove(T item) => _items.Remove(item);
    
    public T GetRandom()
    {
        if (_items.Count == 0) return default;
        return _items[Random.Range(0, _items.Count)];
    }
    
    private void OnDisable() => _items.Clear(); // Clean up on play mode exit
}

// Concrete types (Unity can't serialize generic ScriptableObjects directly)
[CreateAssetMenu(fileName = "Enemy Runtime Set", menuName = "Runtime/Enemy Set")]
public class EnemyRuntimeSet : RuntimeSet<EnemyAI> { }

[CreateAssetMenu(fileName = "Pickup Runtime Set", menuName = "Runtime/Pickup Set")]
public class PickupRuntimeSet : RuntimeSet<Pickup> { }
```

**Registration:**

```csharp
public class EnemyAI : MonoBehaviour
{
    [SerializeField] private EnemyRuntimeSet _enemySet;
    
    private void OnEnable() => _enemySet.Add(this);
    private void OnDisable() => _enemySet.Remove(this);
}
```

**Query by any system (no Find/singleton needed):**

```csharp
public class EnemyRadar : MonoBehaviour
{
    [SerializeField] private EnemyRuntimeSet _enemySet;
    
    public EnemyAI FindNearestEnemy(Vector3 position)
    {
        EnemyAI nearest = null;
        float minDist = float.MaxValue;
        
        foreach (var enemy in _enemySet.Items)
        {
            float dist = Vector3.Distance(position, enemy.transform.position);
            if (dist < minDist)
            {
                minDist = dist;
                nearest = enemy;
            }
        }
        return nearest;
    }
    
    public int AliveEnemyCount => _enemySet.Count;
}
```

### 5. Variables (Shared State Without Singletons)

ScriptableObject variables provide shared, observable state accessible from anywhere.

```csharp
using UnityEngine;

[CreateAssetMenu(fileName = "New Int Variable", menuName = "Variables/Int Variable")]
public class IntVariable : ScriptableObject
{
    [SerializeField] private int _initialValue;
    [System.NonSerialized] private int _runtimeValue;
    
    public event System.Action<int> OnChanged;
    
    public int Value
    {
        get => _runtimeValue;
        set
        {
            if (_runtimeValue != value)
            {
                _runtimeValue = value;
                OnChanged?.Invoke(_runtimeValue);
            }
        }
    }
    
    private void OnEnable()
    {
        _runtimeValue = _initialValue;
    }
    
    // Operator overloads for convenience
    public static implicit operator int(IntVariable variable) => variable.Value;
}

[CreateAssetMenu(fileName = "New Float Variable", menuName = "Variables/Float Variable")]
public class FloatVariable : ScriptableObject
{
    [SerializeField] private float _initialValue;
    [System.NonSerialized] private float _runtimeValue;
    
    public event System.Action<float> OnChanged;
    
    public float Value
    {
        get => _runtimeValue;
        set
        {
            if (!Mathf.Approximately(_runtimeValue, value))
            {
                _runtimeValue = value;
                OnChanged?.Invoke(_runtimeValue);
            }
        }
    }
    
    private void OnEnable() => _runtimeValue = _initialValue;
    public static implicit operator float(FloatVariable v) => v.Value;
}

[CreateAssetMenu(fileName = "New Bool Variable", menuName = "Variables/Bool Variable")]
public class BoolVariable : ScriptableObject
{
    [SerializeField] private bool _initialValue;
    [System.NonSerialized] private bool _runtimeValue;
    
    public event System.Action<bool> OnChanged;
    
    public bool Value
    {
        get => _runtimeValue;
        set
        {
            if (_runtimeValue != value)
            {
                _runtimeValue = value;
                OnChanged?.Invoke(_runtimeValue);
            }
        }
    }
    
    private void OnEnable() => _runtimeValue = _initialValue;
}
```

**Usage:**

```csharp
// Writer — PlayerHealth modifies the variable
public class PlayerHealth : MonoBehaviour
{
    [SerializeField] private FloatVariable _playerHealth;
    
    public void TakeDamage(float amount)
    {
        _playerHealth.Value -= amount; // Automatically triggers OnChanged
    }
}

// Reader — HealthBar binds to the variable
public class HealthBar : MonoBehaviour
{
    [SerializeField] private FloatVariable _playerHealth;
    [SerializeField] private UnityEngine.UI.Slider _slider;
    
    private void OnEnable() => _playerHealth.OnChanged += UpdateBar;
    private void OnDisable() => _playerHealth.OnChanged -= UpdateBar;
    
    private void Start() => UpdateBar(_playerHealth.Value);
    private void UpdateBar(float health) => _slider.value = health / 100f;
}
```

> No singleton. No static. No `Find`. The health bar and player never reference each other — they both reference the same ScriptableObject asset.

### 6. Extensible Enums (Type Objects)

Replace rigid C# enums with ScriptableObject assets that can be extended without code changes.

```csharp
[CreateAssetMenu(fileName = "New Damage Type", menuName = "Game Data/Damage Type")]
public class DamageType : ScriptableObject
{
    public Color displayColor = Color.white;
    public string displayName;
    public Sprite icon;
    
    [Range(0f, 2f)] public float environmentalMultiplier = 1f;
}

[CreateAssetMenu(fileName = "New Item Rarity", menuName = "Game Data/Item Rarity")]
public class ItemRarity : ScriptableObject
{
    public string displayName;
    public Color color = Color.white;
    public float dropWeightMultiplier = 1f;
    [Range(0f, 1f)] public float baseDropChance = 0.5f;
}
```

```
Assets/ScriptableObjects/DamageTypes/
├── Physical.asset    (white, 1.0x)
├── Fire.asset        (red, 1.5x outdoors)
├── Ice.asset         (blue, 0.8x indoors)
├── Lightning.asset   (yellow, 2.0x in water)
├── Poison.asset      (green, 1.0x)
└── Holy.asset        (gold, 1.0x)   ← Added by DLC, zero code change
```

### 7. Strategy Pattern (Pluggable Behaviors)

ScriptableObjects can encapsulate behavior, making it swappable via the Inspector.

```csharp
/// <summary>
/// Abstract attack strategy. Concrete implementations define how an attack works.
/// </summary>
public abstract class AttackStrategy : ScriptableObject
{
    public abstract void Execute(Transform attacker, Transform target, WeaponData weapon);
}

[CreateAssetMenu(menuName = "Strategies/Melee Attack")]
public class MeleeAttackStrategy : AttackStrategy
{
    [SerializeField] private float _hitboxRadius = 1.5f;
    
    public override void Execute(Transform attacker, Transform target, WeaponData weapon)
    {
        float dist = Vector3.Distance(attacker.position, target.position);
        if (dist <= _hitboxRadius)
        {
            if (target.TryGetComponent<IDamageable>(out var damageable))
                damageable.TakeDamage(weapon.baseDamage, weapon.damageType);
        }
    }
}

[CreateAssetMenu(menuName = "Strategies/Ranged Attack")]
public class RangedAttackStrategy : AttackStrategy
{
    [SerializeField] private GameObject _projectilePrefab;
    [SerializeField] private float _projectileSpeed = 20f;
    
    public override void Execute(Transform attacker, Transform target, WeaponData weapon)
    {
        var projectile = Instantiate(_projectilePrefab, attacker.position, attacker.rotation);
        var rb = projectile.GetComponent<Rigidbody>();
        rb.linearVelocity = attacker.forward * _projectileSpeed;
        
        projectile.GetComponent<Projectile>().Initialize(weapon.baseDamage, weapon.damageType);
    }
}

[CreateAssetMenu(menuName = "Strategies/Area Attack")]
public class AreaAttackStrategy : AttackStrategy
{
    [SerializeField] private float _radius = 5f;
    [SerializeField] private GameObject _aoeVfx;
    [SerializeField] private LayerMask _targetLayers;
    
    public override void Execute(Transform attacker, Transform target, WeaponData weapon)
    {
        Instantiate(_aoeVfx, attacker.position, Quaternion.identity);
        
        var hits = Physics.OverlapSphere(attacker.position, _radius, _targetLayers);
        foreach (var hit in hits)
        {
            if (hit.TryGetComponent<IDamageable>(out var damageable))
                damageable.TakeDamage(weapon.baseDamage, weapon.damageType);
        }
    }
}
```

**Usage — swap attack behavior via Inspector:**

```csharp
public class CombatUnit : MonoBehaviour
{
    [SerializeField] private WeaponData _weapon;
    [SerializeField] private AttackStrategy _attackStrategy; // Drag any strategy asset
    
    public void Attack(Transform target)
    {
        _attackStrategy.Execute(transform, target, _weapon);
    }
}
```

### 8. Item Database / Registry

```csharp
[CreateAssetMenu(fileName = "Item Database", menuName = "Game Data/Item Database")]
public class ItemDatabase : ScriptableObject
{
    [SerializeField] private ItemData[] _items;
    
    private Dictionary<string, ItemData> _lookupById;
    
    private void OnEnable()
    {
        _lookupById = new Dictionary<string, ItemData>();
        foreach (var item in _items)
        {
            if (!string.IsNullOrEmpty(item.id))
                _lookupById[item.id] = item;
        }
    }
    
    public ItemData GetById(string id)
    {
        return _lookupById.TryGetValue(id, out var item) ? item : null;
    }
    
    public IEnumerable<ItemData> GetByRarity(ItemRarity rarity)
    {
        return _items.Where(i => i.rarity == rarity);
    }
    
    public ItemData GetRandomWeighted()
    {
        float totalWeight = _items.Sum(i => i.rarity.baseDropChance);
        float roll = Random.Range(0f, totalWeight);
        float cumulative = 0f;
        
        foreach (var item in _items)
        {
            cumulative += item.rarity.baseDropChance;
            if (roll <= cumulative) return item;
        }
        return _items[^1];
    }
}

[CreateAssetMenu(fileName = "New Item", menuName = "Game Data/Item")]
public class ItemData : ScriptableObject
{
    [Header("Identity")]
    public string id;
    public string displayName;
    [TextArea] public string description;
    public Sprite icon;
    
    [Header("Properties")]
    public ItemRarity rarity;
    public int maxStackSize = 99;
    public int buyPrice;
    public int sellPrice;
    
    [Header("Behavior")]
    public bool isConsumable;
    public bool isQuestItem;
}
```

### 9. Custom Editor / Inspector Enhancement

Create custom editors for complex ScriptableObjects:

```csharp
#if UNITY_EDITOR
using UnityEditor;
using UnityEngine;

[CustomEditor(typeof(WeaponData))]
public class WeaponDataEditor : Editor
{
    public override void OnInspectorGUI()
    {
        var weapon = (WeaponData)target;
        
        // Draw default inspector
        DrawDefaultInspector();
        
        // Add preview section
        EditorGUILayout.Space(10);
        EditorGUILayout.LabelField("Preview", EditorStyles.boldLabel);
        
        EditorGUILayout.BeginVertical("box");
        {
            EditorGUILayout.LabelField("DPS", 
                $"{weapon.baseDamage * weapon.attackSpeed:F1}");
            
            // Show damage curve preview at various levels
            EditorGUILayout.LabelField("Damage at Level 1", 
                weapon.GetDamageAtLevel(1).ToString());
            EditorGUILayout.LabelField("Damage at Level 50", 
                weapon.GetDamageAtLevel(50).ToString());
            EditorGUILayout.LabelField("Damage at Level 100", 
                weapon.GetDamageAtLevel(100).ToString());
        }
        EditorGUILayout.EndVertical();
        
        // Quick test button
        if (GUILayout.Button("Log Stats"))
        {
            Debug.Log($"[{weapon.displayName}] Base DMG: {weapon.baseDamage}, " +
                      $"Speed: {weapon.attackSpeed}, Range: {weapon.range}");
        }
    }
}
#endif
```

### 10. Initialization and Lifecycle

```csharp
[CreateAssetMenu(menuName = "Config/Game Config")]
public class GameConfig : ScriptableObject
{
    [Header("Difficulty")]
    public float enemyHealthMultiplier = 1f;
    public float enemyDamageMultiplier = 1f;
    public int maxEnemiesPerWave = 10;
    
    // --- Runtime state (not serialized, resets each play session) ---
    [System.NonSerialized] public int currentWave;
    [System.NonSerialized] public float playTime;
    
    /// <summary>
    /// Called when the asset is loaded (Editor: domain reload, Build: first access).
    /// </summary>
    private void OnEnable()
    {
        // Reset runtime state
        currentWave = 0;
        playTime = 0f;
    }
    
    /// <summary>
    /// OnValidate runs in the Editor when any field is changed in the Inspector.
    /// Great for validation and auto-calculation.
    /// </summary>
    private void OnValidate()
    {
        enemyHealthMultiplier = Mathf.Max(0.1f, enemyHealthMultiplier);
        maxEnemiesPerWave = Mathf.Max(1, maxEnemiesPerWave);
    }
}
```

### 11. Organizing ScriptableObject Assets

```
Assets/_Project/ScriptableObjects/
├── Config/
│   ├── GameConfig.asset
│   ├── DifficultyEasy.asset
│   ├── DifficultyHard.asset
│   └── AudioConfig.asset
├── Data/
│   ├── Weapons/
│   │   ├── Sword_Iron.asset
│   │   ├── Sword_Fire.asset
│   │   └── Bow_Longbow.asset
│   ├── Enemies/
│   │   ├── Goblin.asset
│   │   └── Dragon.asset
│   └── Items/
│       ├── HealthPotion.asset
│       └── ManaPotion.asset
├── Events/
│   ├── OnPlayerDied.asset
│   ├── OnScoreChanged.asset
│   ├── OnLevelCompleted.asset
│   └── OnEnemyKilled.asset
├── Variables/
│   ├── PlayerHealth.asset
│   ├── PlayerScore.asset
│   └── IsGamePaused.asset
├── RuntimeSets/
│   ├── ActiveEnemies.asset
│   └── ActivePickups.asset
└── Types/
    ├── DamageTypes/
    │   ├── Physical.asset
    │   ├── Fire.asset
    │   └── Ice.asset
    └── Rarities/
        ├── Common.asset
        ├── Rare.asset
        └── Legendary.asset
```

## Best Practices

1. **Use `[System.NonSerialized]` for runtime state** — prevents Editor persistence issues and keeps assets clean.
2. **Reset runtime state in `OnEnable()`** — this fires on domain reload in Editor and on asset load in builds.
3. **Use `OnValidate()` for data validation** — enforce constraints automatically when designers change values.
4. **Keep ScriptableObjects immutable where possible** — treat them as read-only configuration. Use separate runtime copies if modification is needed.
5. **Name assets descriptively** — `Weapon_Sword_Fire.asset` not `Data1.asset`.
6. **Use `[CreateAssetMenu]` with organized menu paths** — `"Game Data/Weapons/Melee"` keeps the Create menu navigable.
7. **Prefer ScriptableObject events over C# static events** — they're visible in the Inspector and testable.
8. **Use ScriptableObject variables over singletons** — they achieve shared state without the coupling.
9. **Create custom editors for complex data** — previews, validation buttons, and calculated fields improve designer workflow.
10. **Use abstract base classes** for strategy/behavior patterns — keeps the concrete implementations focused.

## Common Pitfalls

| Pitfall | Why It Hurts | Fix |
|---------|-------------|-----|
| Runtime changes persisting in Editor | Data corruption — values drift from design intent | Use `[System.NonSerialized]` for runtime fields |
| Forgetting to reset runtime state | Stale data from previous play sessions | Reset in `OnEnable()` |
| Direct modification of shared data | All references see changed values unexpectedly | Clone with `Instantiate()` if modification is needed |
| Using ScriptableObjects for per-instance data | All instances share the same values | Use MonoBehaviour fields or instantiate copies |
| Not organizing assets in folders | Impossible to find assets as project grows | Use consistent folder structure and naming |
| Circular references between ScriptableObjects | Confusing dependencies, load-order bugs | Keep dependency direction clear (data → types, never reverse) |
| Using `Resources.Load` to find ScriptableObjects | Requires `Resources/` folder, bad for build size | Use serialized references in Inspector or Addressables |
| Not using `[CreateAssetMenu]` | Designers can't create new instances easily | Always add the attribute with a clear menu path |
| Storing MonoBehaviour references in ScriptableObjects | References become null across scenes | Use Runtime Sets or events instead |

## Reference

- [Unity Manual — ScriptableObject](https://docs.unity3d.com/Manual/class-ScriptableObject.html)
- [Unity Scripting API — ScriptableObject](https://docs.unity3d.com/ScriptReference/ScriptableObject.html)
- [Unite Talk — Game Architecture with ScriptableObjects (Ryan Hipple)](https://www.youtube.com/watch?v=raQ3iHhE_Kk)
- [Unity Manual — CreateAssetMenu](https://docs.unity3d.com/ScriptReference/CreateAssetMenuAttribute.html)
- [Unity Manual — Custom Editors](https://docs.unity3d.com/Manual/editor-CustomEditors.html)
