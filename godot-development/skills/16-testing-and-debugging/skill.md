# Testing & Debugging

## GdUnit4 Setup

- Install GdUnit4 via AssetLib — search "GdUnit4" and enable the plugin
- Enable in Project Settings → Plugins → GdUnit4
- Place all test files under `tests/` at the project root
- Name test files `test_<system>.gd` and test methods `test_<what>_<condition>_<expected>`

## Writing Unit Tests

```gdscript
class_name TestHealthSystem
extends GdUnitTestSuite

var _health: HealthComponent

func before_test() -> void:
    _health = HealthComponent.new()
    _health.max_health = 100
    _health.current_health = 100

func after_test() -> void:
    _health.free()

func test_take_damage_reduces_health() -> void:
    _health.take_damage(30)
    assert_int(_health.current_health).is_equal(70)

func test_damage_signal_emitted() -> void:
    var monitor := monitor_signals(_health)
    _health.take_damage(10)
    await assert_signal(monitor).is_emitted("health_changed")
```

- Free all created nodes in `after_test()` — leaked nodes cause false failures and memory warnings
- Test game systems (health, inventory, scoring) as pure logic — they should not require a full scene tree
- Use `monitor_signals()` + `await assert_signal()` for signal assertion — `await` is required
- Test `RefCounted` and plain `Object` classes without a scene runner for fastest execution

## Scene Testing with GdUnit4

- Use `scene_runner("res://path/to/scene.tscn")` to run scene-level tests
- Call `_runner.simulate_key_pressed(KEY_D)` to inject input
- Call `await _runner.simulate_frames(n)` to advance physics frames
- Free the runner in `after_test()` to prevent scene leaks

## Godot Debugger

- Set breakpoints by clicking the gutter in the script editor — execution pauses and shows local variables
- Use Step Into, Step Over, Continue in the debugger toolbar
- Use the Remote tab in the Scene panel to inspect the live scene tree and edit properties at runtime
- Use `OS.is_debug_build()` to gate debug-only print statements and visual overlays

## Debug Draw

- Override `_draw()` on a `Node2D` to visualize detection ranges, velocities, and paths
- Guard with `if not OS.is_debug_build(): return` to exclude from release builds
- Use `draw_circle()`, `draw_line()`, `draw_rect()` for quick visualization of invisible gameplay values

## Debug Settings

| Setting | Location | Purpose |
|---------|----------|---------|
| Visible Collision Shapes | Debug menu | See all collision shapes at runtime |
| Visible Navigation | Debug menu | See navigation mesh and paths |
| Print Orphan Nodes | Project Settings → Debug | Find memory leaks |
| FPS Monitor | Debugger → Monitors | Frame rate display |

## CI/CD Testing

Run GdUnit4 headlessly:
```bash
godot --headless --script addons/gdUnit4/bin/GdUnitCmdTool.gd --add tests/
```

Use `barichello/godot-ci` Docker image in GitHub Actions for automated test runs on every push.

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Nodes created in tests never freed | Call `node.free()` in `after_test()` |
| Testing visual output instead of data | Assert on values, signals, and state — not pixels |
| Signal test without `await` | Use `await assert_signal(monitor).is_emitted(...)` |
| Tests that depend on scene lifecycle order | Make tests self-contained with `before_test()` setup |
| Debug prints left in release builds | Wrap with `if OS.is_debug_build()` |
| Running tests with display in CI | Use `--headless` flag in all CI test commands |

## Best Practices

- Test pure logic classes (health, inventory, AI state) without scene runners — faster and more reliable
- Use descriptive test names: `test_heal_cannot_exceed_max_health()`
- Run tests in CI on every push using `--headless` mode
- Use the Remote Inspector to debug unexpected scene tree state at runtime
- Use `push_error()` for unrecoverable errors and `push_warning()` for recoverable issues
- Add `assert` statements liberally in debug builds to catch invalid states early
- Profile alongside testing — add performance regression checks for critical systems
