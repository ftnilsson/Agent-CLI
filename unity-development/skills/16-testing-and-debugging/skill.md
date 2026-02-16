# 16 — Testing & Debugging

## Description

Write automated tests and use debugging tools to find and fix issues in Unity 6 projects. This skill covers the **Unity Test Framework** (Edit Mode and Play Mode tests), assertion libraries, debug utilities, conditional logging, and in-game developer consoles.

## When To Use

- Validating game logic, data integrity, or system behaviour without manually playing the game.
- Catching regressions when refactoring gameplay code.
- Debugging runtime issues (null references, wrong state transitions, physics glitches).
- Building a CI pipeline that runs tests automatically on each commit.
- Adding in-game developer tools for QA and playtesting.

## Prerequisites

| Skill | Why |
|-------|-----|
| [01 — Project Setup](../01-Project-Setup/skill.md) | Assembly definitions required for test assemblies |
| [02 — C# Scripting](../02-CSharp-Scripting/skill.md) | C# fundamentals and MonoBehaviour lifecycle |

## Instructions

### 1 — Unity Test Framework Setup

Install via **Package Manager** (usually pre-installed): `com.unity.test-framework`.

#### Test Assembly Structure

```
Assets/
├── Scripts/
│   ├── Runtime/
│   │   ├── MyGame.Runtime.asmdef        ← Production code
│   │   └── ...
│   └── Tests/
│       ├── EditMode/
│       │   ├── MyGame.Tests.EditMode.asmdef
│       │   └── HealthSystemTests.cs
│       └── PlayMode/
│           ├── MyGame.Tests.PlayMode.asmdef
│           └── PlayerMovementTests.cs
```

**Edit Mode `.asmdef`** settings:
- Platforms: **Editor** only.
- References: `MyGame.Runtime`, `UnityEngine.TestRunner`, `UnityEditor.TestRunner`.
- Define constraints: `UNITY_INCLUDE_TESTS`.

**Play Mode `.asmdef`** settings:
- Platforms: **Any** (runs in player or editor).
- References: same as Edit Mode plus any runtime assemblies under test.
- Define constraints: `UNITY_INCLUDE_TESTS`.

### 2 — Edit Mode Tests (Pure Logic)

Edit Mode tests run **without entering Play Mode** — they're fast and ideal for testing pure C# logic, ScriptableObjects, and editor tools.

```csharp
using NUnit.Framework;
using UnityEngine;

namespace MyGame.Tests.EditMode
{
    [TestFixture]
    public class HealthSystemTests
    {
        private HealthData _healthData;

        [SetUp]
        public void SetUp()
        {
            // Create a fresh ScriptableObject for each test
            _healthData = ScriptableObject.CreateInstance<HealthData>();
            _healthData.MaxHealth = 100;
        }

        [TearDown]
        public void TearDown()
        {
            Object.DestroyImmediate(_healthData);
        }

        [Test]
        public void NewHealth_StartsAtMax()
        {
            var health = new HealthSystem(_healthData);
            Assert.AreEqual(100, health.CurrentHealth);
        }

        [Test]
        public void TakeDamage_ReducesHealth()
        {
            var health = new HealthSystem(_healthData);
            health.TakeDamage(30);
            Assert.AreEqual(70, health.CurrentHealth);
        }

        [Test]
        public void TakeDamage_CannotGoBelowZero()
        {
            var health = new HealthSystem(_healthData);
            health.TakeDamage(150);
            Assert.AreEqual(0, health.CurrentHealth);
        }

        [Test]
        public void Heal_CannotExceedMax()
        {
            var health = new HealthSystem(_healthData);
            health.TakeDamage(20);
            health.Heal(50);
            Assert.AreEqual(100, health.CurrentHealth);
        }

        [Test]
        public void IsDead_TrueWhenHealthZero()
        {
            var health = new HealthSystem(_healthData);
            health.TakeDamage(100);
            Assert.IsTrue(health.IsDead);
        }

        [TestCase(0, ExpectedResult = true)]
        [TestCase(1, ExpectedResult = false)]
        [TestCase(100, ExpectedResult = false)]
        public bool IsDead_VariousHealthValues(int damage)
        {
            var health = new HealthSystem(_healthData);
            health.TakeDamage(100 - damage); // Leave 'damage' amount of health
            // Wait, let's fix the logic: we want the remaining health to equal the parameter
            health.TakeDamage(100); // Kill
            health.Heal(damage);   // Heal back to the test value
            return health.IsDead;
        }
    }
}
```

### 3 — Play Mode Tests (Runtime Behaviour)

Play Mode tests run inside a scene and can test MonoBehaviours, physics, input, and coroutines.

```csharp
using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;

namespace MyGame.Tests.PlayMode
{
    [TestFixture]
    public class PlayerMovementTests
    {
        private GameObject _player;
        private PlayerController _controller;

        [UnitySetUp]
        public IEnumerator SetUp()
        {
            _player = new GameObject("TestPlayer");
            _player.AddComponent<CharacterController>();
            _controller = _player.AddComponent<PlayerController>();

            yield return null; // Wait one frame for Start() to run
        }

        [UnityTearDown]
        public IEnumerator TearDown()
        {
            Object.Destroy(_player);
            yield return null;
        }

        [UnityTest]
        public IEnumerator Player_FallsWithGravity_WhenNotGrounded()
        {
            _player.transform.position = new Vector3(0, 10, 0);
            float startY = _player.transform.position.y;

            // Wait several physics frames
            for (int i = 0; i < 30; i++)
                yield return new WaitForFixedUpdate();

            Assert.Less(_player.transform.position.y, startY,
                "Player should have fallen due to gravity.");
        }

        [UnityTest]
        public IEnumerator Player_SpeedNeverExceedsMax()
        {
            // Simulate movement for 2 seconds
            float elapsed = 0f;
            while (elapsed < 2f)
            {
                elapsed += Time.deltaTime;
                // Assume controller exposes current speed
                Assert.LessOrEqual(_controller.CurrentSpeed, _controller.MaxSpeed + 0.01f);
                yield return null;
            }
        }
    }
}
```

### 4 — Testing with Scenes

Load a pre-configured test scene:

```csharp
using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;

namespace MyGame.Tests.PlayMode
{
    [TestFixture]
    public class InventoryIntegrationTests
    {
        [UnitySetUp]
        public IEnumerator LoadTestScene()
        {
            yield return SceneManager.LoadSceneAsync("TestScenes/InventoryTestScene");
            yield return null; // Wait for Awake/Start
        }

        [UnityTest]
        public IEnumerator PickingUpItem_AddsToInventory()
        {
            var player = GameObject.FindWithTag("Player");
            var inventory = player.GetComponent<Inventory>();
            var pickup = GameObject.Find("TestPickup");

            Assert.AreEqual(0, inventory.ItemCount);

            // Move player to pickup
            player.transform.position = pickup.transform.position;
            yield return new WaitForSeconds(0.5f); // Wait for trigger

            Assert.AreEqual(1, inventory.ItemCount);
        }
    }
}
```

Add test scenes to **Build Settings** or use `[PrebuildSetup]` attribute to add them programmatically.

### 5 — Mocking & Test Doubles

Use interfaces to make systems testable without MonoBehaviour dependencies:

```csharp
// --- Interface ---
public interface IDamageDealer
{
    int GetDamage();
}

// --- Production implementation ---
public class WeaponDamageDealer : IDamageDealer
{
    private readonly WeaponData _data;
    public WeaponDamageDealer(WeaponData data) => _data = data;
    public int GetDamage() => _data.BaseDamage;
}

// --- Test mock ---
public class MockDamageDealer : IDamageDealer
{
    public int DamageToReturn;
    public int GetDamageCallCount;

    public int GetDamage()
    {
        GetDamageCallCount++;
        return DamageToReturn;
    }
}

// --- Test ---
[Test]
public void CombatSystem_AppliesDamage_FromDealer()
{
    var mock = new MockDamageDealer { DamageToReturn = 42 };
    var combat = new CombatSystem(mock);
    var target = new HealthSystem(maxHealth: 100);

    combat.Attack(target);

    Assert.AreEqual(58, target.CurrentHealth);
    Assert.AreEqual(1, mock.GetDamageCallCount);
}
```

### 6 — Custom Assertions

```csharp
using NUnit.Framework;
using UnityEngine;

public static class GameAssert
{
    public static void IsApproximately(float expected, float actual, float tolerance = 0.01f, string message = "")
    {
        Assert.That(actual, Is.EqualTo(expected).Within(tolerance),
            $"Expected ~{expected} but got {actual}. {message}");
    }

    public static void IsWithinRange(Vector3 position, Vector3 center, float radius, string message = "")
    {
        float distance = Vector3.Distance(position, center);
        Assert.LessOrEqual(distance, radius,
            $"Position {position} is {distance:F2}m from {center}, expected within {radius}m. {message}");
    }

    public static void HasComponent<T>(GameObject go) where T : Component
    {
        Assert.IsNotNull(go.GetComponent<T>(),
            $"GameObject '{go.name}' is missing component {typeof(T).Name}");
    }
}
```

### 7 — Debug Utilities

#### Conditional Compilation

```csharp
using UnityEngine;
using System.Diagnostics;
using Debug = UnityEngine.Debug;

public static class DebugLogger
{
    [Conditional("UNITY_EDITOR"), Conditional("DEVELOPMENT_BUILD")]
    public static void Log(string message, Object context = null)
    {
        Debug.Log($"[Game] {message}", context);
    }

    [Conditional("UNITY_EDITOR"), Conditional("DEVELOPMENT_BUILD")]
    public static void LogWarning(string message, Object context = null)
    {
        Debug.LogWarning($"[Game] {message}", context);
    }

    // Always log errors regardless of build type
    public static void LogError(string message, Object context = null)
    {
        Debug.LogError($"[Game] {message}", context);
    }
}
```

#### Debug Drawing

```csharp
using UnityEngine;

public static class DebugDraw
{
    public static void DrawBox(Vector3 center, Vector3 halfExtents, Quaternion rotation, Color color, float duration = 0f)
    {
        var m = Matrix4x4.TRS(center, rotation, halfExtents * 2f);

        Vector3[] corners = new Vector3[8];
        corners[0] = m.MultiplyPoint3x4(new Vector3(-0.5f, -0.5f, -0.5f));
        corners[1] = m.MultiplyPoint3x4(new Vector3( 0.5f, -0.5f, -0.5f));
        corners[2] = m.MultiplyPoint3x4(new Vector3( 0.5f, -0.5f,  0.5f));
        corners[3] = m.MultiplyPoint3x4(new Vector3(-0.5f, -0.5f,  0.5f));
        corners[4] = m.MultiplyPoint3x4(new Vector3(-0.5f,  0.5f, -0.5f));
        corners[5] = m.MultiplyPoint3x4(new Vector3( 0.5f,  0.5f, -0.5f));
        corners[6] = m.MultiplyPoint3x4(new Vector3( 0.5f,  0.5f,  0.5f));
        corners[7] = m.MultiplyPoint3x4(new Vector3(-0.5f,  0.5f,  0.5f));

        // Bottom
        for (int i = 0; i < 4; i++)
            Debug.DrawLine(corners[i], corners[(i + 1) % 4], color, duration);
        // Top
        for (int i = 4; i < 8; i++)
            Debug.DrawLine(corners[i], corners[4 + (i - 4 + 1) % 4], color, duration);
        // Verticals
        for (int i = 0; i < 4; i++)
            Debug.DrawLine(corners[i], corners[i + 4], color, duration);
    }

    public static void DrawCircle(Vector3 center, float radius, Vector3 up, Color color, int segments = 32, float duration = 0f)
    {
        var rotation = Quaternion.LookRotation(up == Vector3.forward ? Vector3.up : Vector3.forward, up);

        float step = 360f / segments;
        for (int i = 0; i < segments; i++)
        {
            float angle1 = Mathf.Deg2Rad * step * i;
            float angle2 = Mathf.Deg2Rad * step * (i + 1);

            var p1 = center + rotation * new Vector3(Mathf.Cos(angle1), 0, Mathf.Sin(angle1)) * radius;
            var p2 = center + rotation * new Vector3(Mathf.Cos(angle2), 0, Mathf.Sin(angle2)) * radius;

            Debug.DrawLine(p1, p2, color, duration);
        }
    }
}
```

### 8 — Gizmos for Editor Visualisation

```csharp
using UnityEngine;

public class SpawnZone : MonoBehaviour
{
    [SerializeField] private float _radius = 5f;
    [SerializeField] private Color _gizmoColor = new(0f, 1f, 0f, 0.3f);

    private void OnDrawGizmos()
    {
        Gizmos.color = _gizmoColor;
        Gizmos.DrawWireSphere(transform.position, _radius);
    }

    private void OnDrawGizmosSelected()
    {
        // Solid sphere only when selected
        Gizmos.color = _gizmoColor;
        Gizmos.DrawSphere(transform.position, _radius);

        // Draw spawn direction
        Gizmos.color = Color.blue;
        Gizmos.DrawRay(transform.position, transform.forward * _radius);
    }
}
```

### 9 — In-Game Debug Console

```csharp
using System;
using System.Collections.Generic;
using UnityEngine;

public class DebugConsole : MonoBehaviour
{
    private readonly Dictionary<string, Action<string[]>> _commands = new();
    private readonly List<string> _log = new();
    private string _input = "";
    private bool _isVisible;
    private Vector2 _scrollPos;

    private void Awake()
    {
        RegisterCommand("help", _ => ListCommands());
        RegisterCommand("god", _ => ToggleGodMode());
        RegisterCommand("spawn", args => SpawnEntity(args));
        RegisterCommand("tp", args => Teleport(args));
        RegisterCommand("timescale", args => SetTimeScale(args));
        RegisterCommand("fps", _ => AddLog($"FPS: {1f / Time.unscaledDeltaTime:F1}"));
    }

    public void RegisterCommand(string name, Action<string[]> action)
    {
        _commands[name.ToLower()] = action;
    }

    private void Update()
    {
        if (Input.GetKeyDown(KeyCode.BackQuote))
            _isVisible = !_isVisible;
    }

    private void OnGUI()
    {
        if (!_isVisible) return;

        GUILayout.BeginArea(new Rect(10, 10, 500, 350), GUI.skin.box);

        _scrollPos = GUILayout.BeginScrollView(_scrollPos);
        foreach (var line in _log)
            GUILayout.Label(line);
        GUILayout.EndScrollView();

        GUILayout.BeginHorizontal();
        _input = GUILayout.TextField(_input, GUILayout.ExpandWidth(true));
        if (GUILayout.Button("Run", GUILayout.Width(50)) || Event.current.isKey && Event.current.keyCode == KeyCode.Return)
        {
            ExecuteCommand(_input);
            _input = "";
        }
        GUILayout.EndHorizontal();

        GUILayout.EndArea();
    }

    private void ExecuteCommand(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return;

        AddLog($"> {raw}");
        var parts = raw.Trim().Split(' ');
        var cmd = parts[0].ToLower();
        var args = parts.Length > 1 ? parts[1..] : Array.Empty<string>();

        if (_commands.TryGetValue(cmd, out var action))
            action(args);
        else
            AddLog($"Unknown command: {cmd}");
    }

    private void AddLog(string message) => _log.Add(message);
    private void ListCommands() => AddLog("Commands: " + string.Join(", ", _commands.Keys));
    private void ToggleGodMode() => AddLog("God mode toggled");
    private void SpawnEntity(string[] args) => AddLog(args.Length > 0 ? $"Spawning {args[0]}" : "Usage: spawn <entity>");

    private void Teleport(string[] args)
    {
        if (args.Length >= 3 && float.TryParse(args[0], out float x) &&
            float.TryParse(args[1], out float y) && float.TryParse(args[2], out float z))
        {
            var player = GameObject.FindWithTag("Player");
            if (player != null) player.transform.position = new Vector3(x, y, z);
            AddLog($"Teleported to ({x}, {y}, {z})");
        }
        else AddLog("Usage: tp <x> <y> <z>");
    }

    private void SetTimeScale(string[] args)
    {
        if (args.Length > 0 && float.TryParse(args[0], out float scale))
        {
            Time.timeScale = scale;
            AddLog($"Time scale set to {scale}");
        }
        else AddLog("Usage: timescale <value>");
    }
}
```

### 10 — Profiler Markers for Custom Code

```csharp
using Unity.Profiling;
using UnityEngine;

public class AIManager : MonoBehaviour
{
    private static readonly ProfilerMarker s_AIUpdateMarker = new("AIManager.UpdateAI");
    private static readonly ProfilerMarker s_PathfindMarker = new("AIManager.Pathfinding");

    private void Update()
    {
        using (s_AIUpdateMarker.Auto())
        {
            // AI update logic — shows as a named block in the Profiler
            UpdateAllAgents();
        }
    }

    private void UpdateAllAgents()
    {
        using (s_PathfindMarker.Auto())
        {
            // Pathfinding work — nested marker
        }
    }
}
```

### 11 — Test Runner & CI Integration

Run tests from the command line for CI/CD:

```bash
# Edit Mode tests
Unity -runTests -batchmode -projectPath /path/to/project \
  -testPlatform EditMode \
  -testResults results-editmode.xml

# Play Mode tests
Unity -runTests -batchmode -projectPath /path/to/project \
  -testPlatform PlayMode \
  -testResults results-playmode.xml
```

Output is **NUnit XML** format, compatible with most CI dashboards (GitHub Actions, Jenkins, GitLab CI).

## Best Practices

1. **Separate logic from MonoBehaviour** — pure C# classes are easier to test in Edit Mode without scene setup.
2. **Use interfaces** for dependencies so you can inject mocks/stubs in tests.
3. **Name tests with the pattern** `MethodUnderTest_Scenario_ExpectedResult` for clarity.
4. **Keep tests independent** — each test should set up and tear down its own state.
5. **Run Edit Mode tests in CI** — they're fast (seconds) and catch logic regressions.
6. **Use `[UnityTest]`** only when you need to test behaviour across frames; prefer `[Test]` for synchronous logic.
7. **Strip debug code from release builds** — use `[Conditional]` attributes or `#if DEVELOPMENT_BUILD`.
8. **Add Profiler Markers** to expensive systems so they appear clearly in the Profiler timeline.
9. **Use Gizmos** for spatial debugging (spawn zones, patrol paths, detection ranges).
10. **Build a debug console early** — QA and designers will thank you.

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Tests not appearing in Test Runner | Ensure `.asmdef` has `Define Constraints: UNITY_INCLUDE_TESTS` and references `UnityEngine.TestRunner` |
| Play Mode test hangs | Add a timeout: `[Timeout(10000)]` (milliseconds) |
| `NullReferenceException` in test setup | Use `[UnitySetUp]` with `yield return null` to wait for `Awake()`/`Start()` |
| Tests affect each other | Use `[SetUp]`/`[TearDown]` to reset state; destroy GameObjects in teardown |
| `Debug.Log` noisy in test output | Use `LogAssert.Expect(LogType.Log, "message")` or suppress logs |
| Gizmos not visible | Ensure the Gizmos toggle is enabled in the Scene view toolbar |
| `Debug.DrawLine` not visible | Only visible in the Scene view with Gizmos enabled, not in Game view |
| Profiler Markers missing | Ensure the code runs on the main thread and the Profiler is recording |

## Reference

- [Unity Test Framework](https://docs.unity3d.com/Packages/com.unity.test-framework@1.4/manual/index.html)
- [NUnit Documentation](https://docs.nunit.org/)
- [Debug Class API](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Debug.html)
- [Gizmos API](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Gizmos.html)
- [ProfilerMarker API](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Unity.Profiling.ProfilerMarker.html)
- [Command-Line Arguments](https://docs.unity3d.com/6000.0/Documentation/Manual/EditorCommandLineArguments.html)
