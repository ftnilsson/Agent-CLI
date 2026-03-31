# Testing & Debugging

## Unity Test Framework Setup

- Install `com.unity.test-framework` (usually pre-installed)
- Create separate `asmdef` files for test assemblies: `Game.Tests.EditMode` and `Game.Tests.PlayMode`
- Set `Define Constraints: UNITY_INCLUDE_TESTS` on both test `asmdef` files
- Reference `UnityEngine.TestRunner` and `UnityEditor.TestRunner` from test assemblies
- Set `includePlatforms: ["Editor"]` on EditMode test assemblies only
- Run tests via Window → General → Test Runner; run in CI via `-runTests -batchmode -testPlatform EditMode`

## Edit Mode Tests

- Use Edit Mode for pure C# logic, ScriptableObject data validation, and Editor tooling — no scene required
- Use `[SetUp]` / `[TearDown]` to create and destroy ScriptableObject instances: `ScriptableObject.CreateInstance<T>()` / `Object.DestroyImmediate()`
- Use `[TestCase(value, ExpectedResult = x)]` for data-driven parameterized tests
- Name tests: `MethodUnderTest_Scenario_ExpectedBehavior`

```csharp
[TestFixture]
public class HealthSystemTests
{
    private HealthSystem _health;

    [SetUp] public void SetUp() => _health = new HealthSystem(maxHealth: 100);

    [Test] public void TakeDamage_ReducesHealth()
    {
        _health.TakeDamage(30);
        Assert.AreEqual(70, _health.CurrentHealth);
    }

    [Test] public void TakeDamage_CannotGoBelowZero()
    {
        _health.TakeDamage(200);
        Assert.AreEqual(0, _health.CurrentHealth);
    }
}
```

## Play Mode Tests

- Use Play Mode tests for MonoBehaviour lifecycle, physics, coroutines, and multi-frame behavior
- Use `[UnitySetUp]` and `[UnityTearDown]` returning `IEnumerator`; `yield return null` to wait for `Awake()`/`Start()`
- Use `[UnityTest]` returning `IEnumerator` for tests that need multiple frames
- Add `[Timeout(10000)]` on tests that could hang — prevents CI lockups
- Destroy all created GameObjects in `[UnityTearDown]`

## Mocking

- Extract interfaces (`IDamageable`, `IDamageDealer`) to decouple production code from concrete implementations
- Implement lightweight test doubles as plain C# classes with call count and return value fields
- Inject mocks via constructor — keep `MonoBehaviour` thin; delegate to plain C# classes

## Conditional Logging

- Use `[System.Diagnostics.Conditional("UNITY_EDITOR")]` and `[Conditional("DEVELOPMENT_BUILD")]` on debug log methods
- Always log errors unconditionally — errors indicate real failures that ship code should report
- Use category-prefixed messages: `Debug.Log("[AI] Target acquired")` for easy filtering

## Profiler Markers

- Add `ProfilerMarker` to expensive systems as `static readonly` fields
- Wrap the measured code in `using (s_Marker.Auto()) { ... }`

```csharp
private static readonly ProfilerMarker s_PathfindMarker = new("AIManager.Pathfinding");

private void UpdatePathfinding()
{
    using (s_PathfindMarker.Auto())
    {
        // visible by name in Profiler timeline
    }
}
```

## Gizmos

- Use `OnDrawGizmos()` for always-visible debug shapes; `OnDrawGizmosSelected()` for selection-only detail
- Draw spawn zones, detection radii, patrol paths, and ground-check spheres with Gizmos
- Use semi-transparent fill: `new Color(r, g, b, 0.2f)` for `DrawSphere`; opaque for `DrawWireSphere`

## Debug Drawing

- Use `Debug.DrawLine(start, end, color, duration)` and `Debug.DrawRay(origin, dir, color, duration)` for raycast visualization
- These are only visible in the Scene view with Gizmos enabled — not in the Game view
- Wrap in `#if UNITY_EDITOR` or `[Conditional("UNITY_EDITOR")]` to strip from builds

## CI Integration

- Run tests headless: `Unity -runTests -batchmode -projectPath /path -testPlatform EditMode -testResults results.xml`
- Output is NUnit XML — compatible with GitHub Actions, Jenkins, and GitLab CI
- Run Edit Mode tests on every push; Play Mode tests on PR or nightly builds
- Use `game-ci/unity-test-runner` GitHub Action for containerized Unity test runs

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Tests not appearing in Test Runner | Add `UNITY_INCLUDE_TESTS` define constraint to `asmdef` |
| Play Mode test hangs | Add `[Timeout(10000)]` attribute |
| `NullReferenceException` in test setup | Use `[UnitySetUp]` with `yield return null` to wait for Unity lifecycle |
| Tests affecting each other | Use `[SetUp]`/`[TearDown]` to fully reset state; destroy all GameObjects |
| `Debug.Log` noisy in test output | Use `LogAssert.Expect()` or a conditional logging wrapper |

## Best Practices

- Separate logic from `MonoBehaviour` — plain C# classes are faster to test in Edit Mode
- Test all boundary conditions: zero, max, negative, empty collections
- Use `Assert.That(value, Is.EqualTo(expected).Within(tolerance))` for floating-point comparisons
- Build a debug console early with cheat commands (god mode, spawn, teleport, timescale) for QA
- Strip all debug code from release builds — use `[Conditional]` attributes, not `#if` blocks in method bodies
