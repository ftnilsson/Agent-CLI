# ScriptableObject Architecture

## Fundamentals

- `ScriptableObject` assets live in the Project folder, not in scenes — they survive scene loads
- Use `[System.NonSerialized]` for runtime-only state — serialized fields persist in the Editor after stopping Play Mode
- Reset runtime state in `OnEnable()` — fires on domain reload in Editor and on asset load in builds
- Use `OnValidate()` to enforce data constraints when designers edit values in the Inspector
- Always add `[CreateAssetMenu(fileName = "...", menuName = "...")]` with an organized menu path

## Data Containers

- Store game configuration that designers tune without code changes: weapons, enemies, items, abilities
- Add helper methods on data ScriptableObjects (e.g., `GetDamageAtLevel(int level)`) — keeps logic co-located with data
- Use `[Range(min, max)]` and `[TextArea]` attributes to make Inspector editing self-documenting
- Reference other ScriptableObjects from within ScriptableObjects to build a data graph

## Event Channels

```csharp
[CreateAssetMenu(menuName = "Events/Void Event Channel")]
public class VoidEventChannel : ScriptableObject
{
    public event System.Action OnEventRaised;
    public void RaiseEvent() => OnEventRaised?.Invoke();
}

public class PlayerHealth : MonoBehaviour
{
    [SerializeField] private VoidEventChannel _onPlayerDied;
    public void Die() => _onPlayerDied.RaiseEvent();
}

public class GameOverUI : MonoBehaviour
{
    [SerializeField] private VoidEventChannel _onPlayerDied;
    private void OnEnable() => _onPlayerDied.OnEventRaised += Show;
    private void OnDisable() => _onPlayerDied.OnEventRaised -= Show;
    private void Show() => gameObject.SetActive(true);
}
```

- Create typed event channel ScriptableObjects: `VoidEventChannel`, `IntEventChannel`, `FloatEventChannel`
- Subscribe via `channel.OnEventRaised += handler` in `OnEnable()`; unsubscribe in `OnDisable()`

## Runtime Sets

- Implement `RuntimeSet<T> : ScriptableObject` with `Add(T)`, `Remove(T)`, and `IReadOnlyList<T> Items`
- Call `Add(this)` in `OnEnable()` and `Remove(this)` in `OnDisable()` on registered MonoBehaviours
- Clear the list in `OnEnable()` on the ScriptableObject itself to prevent stale references between play sessions
- Use Runtime Sets to query active enemies, pickups, or players without singletons or `FindObjectsOfType`

## ScriptableObject Variables

- Create `IntVariable`, `FloatVariable`, `BoolVariable` assets for shared observable state
- Store `_initialValue` as a serialized field and `_runtimeValue` as `[System.NonSerialized]`
- Reset `_runtimeValue = _initialValue` in `OnEnable()`
- Fire `OnChanged` event from the property setter for reactive UI updates

## Extensible Enums (Type Objects)

- Replace C# enums with ScriptableObject assets when enum values need associated data (color, multiplier, icon)
- Create new "enum values" by duplicating and renaming an asset — no code changes required
- Use this for: damage types, item rarities, status effects, audio categories

## Strategy Pattern

- Declare `abstract class AttackStrategy : ScriptableObject` with an abstract `Execute()` method
- Create concrete implementations (`MeleeAttack`, `RangedAttack`, `AreaAttack`) as separate assets
- Swap strategies via Inspector drag — no code changes to the using MonoBehaviour

## Asset Organization

```
ScriptableObjects/
├── Config/       (GameConfig, DifficultyEasy, DifficultyHard)
├── Data/         (Weapons/, Enemies/, Items/)
├── Events/       (OnPlayerDied, OnScoreChanged, OnLevelCompleted)
├── Variables/    (PlayerHealth, PlayerScore, IsGamePaused)
├── RuntimeSets/  (ActiveEnemies, ActivePickups)
└── Types/        (DamageTypes/, Rarities/)
```

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Runtime fields without `[NonSerialized]` | Values persist between play sessions in the Editor |
| Not resetting runtime state in `OnEnable()` | Stale data from previous sessions |
| Modifying shared SO data at runtime | Clone with `Instantiate()` if per-instance mutation needed |
| `Resources.Load` to access ScriptableObjects | Use serialized Inspector references or Addressables |
| MonoBehaviour references stored in SOs | Use Runtime Sets or event channels instead |
| No `[CreateAssetMenu]` attribute | Designers cannot create instances |

## Best Practices

- Keep ScriptableObjects immutable where possible — treat them as read-only configuration
- Use `[CreateAssetMenu]` with hierarchical menu paths: `"Game Data/Weapons/Melee"`
- Name assets descriptively: `Weapon_Sword_Fire.asset`, not `Data1.asset`
- Prefer ScriptableObject events over `static` C# events — visible in Inspector, easier to debug
- Add `OnValidate()` to clamp values: `enemyHealthMultiplier = Mathf.Max(0.1f, enemyHealthMultiplier)`
- Build a central `ItemDatabase` ScriptableObject with a `Dictionary` lookup built in `OnEnable()`
