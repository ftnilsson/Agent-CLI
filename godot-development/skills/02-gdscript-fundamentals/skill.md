# GDScript Fundamentals

## Node Lifecycle

- Use `_ready()` to cache node references with `@onready` and connect signals
- Use `_physics_process(delta)` for all movement, velocity, and physics logic — fixed timestep
- Use `_process(delta)` for visual updates, UI polling, and non-physics logic
- Use `_unhandled_input(event)` for gameplay input — respects UI consumption order
- Use `_exit_tree()` to disconnect signals connected to external nodes
- Never call `get_node()` inside `_process()` or `_physics_process()` — cache with `@onready`
- Never use `yield()` — Godot 4 uses `await`

## Signals

```gdscript
extends CharacterBody2D

signal health_changed(current: int, maximum: int)
signal died

@onready var _sprite: Sprite2D = $Sprite2D

func _ready() -> void:
    EventBus.game_paused.connect(_on_game_paused)

func _physics_process(delta: float) -> void:
    velocity.x = Input.get_axis("move_left", "move_right") * 200.0
    velocity.y += 980.0 * delta
    move_and_slide()

func _exit_tree() -> void:
    EventBus.game_paused.disconnect(_on_game_paused)
```

- Name signals in past tense: `died`, `health_changed`, `item_collected`
- Always use typed signal parameters
- Use `CONNECT_ONE_SHOT` flag for single-fire events
- Use an `EventBus` autoload for signals that cross scene boundaries
- Disconnect in `_exit_tree()` when connected to external nodes

## Type Hints

- Always declare types on variables, parameters, and return values
- Use `:=` for type inference: `var speed := 200.0`
- Use typed arrays: `var enemies: Array[Enemy] = []`
- Use `as` for safe downcasts: `var label := $Label as Label`

## Await and Coroutines

- Use `await signal_name` to pause a function until a signal fires
- Guard nodes that may be freed during an `await`: check `is_inside_tree()` after resuming
- Never use `await` inside `_physics_process()` — it breaks the fixed timestep
- Use `await get_tree().create_timer(t).timeout` for simple delays
- Use `ResourceLoader.load_threaded_request()` with `await` for async scene loading

## Script Structure Order

Follow this order within every script: signals → enums → constants → `@export` vars → regular vars → `@onready` vars → lifecycle methods → public methods → private methods → signal callbacks

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| `get_node("Sprite2D")` inside `_process()` | Cache with `@onready var _sprite: Sprite2D = $Sprite2D` |
| `yield(timer, "timeout")` | Use `await timer.timeout` |
| Untyped variables and function returns | Add explicit type hints everywhere |
| Monolithic 500-line script | Break into composable child nodes with focused responsibilities |
| Connecting signals without disconnecting | Disconnect in `_exit_tree()` for external nodes |
| No `is_inside_tree()` check after `await` | Always guard: `if not is_inside_tree(): return` |

## Best Practices

- Use `@onready` for all node references that use `$` — assign in-declaration, not in `_ready()`
- Use `class_name` on reusable types so they appear in type pickers and `is` checks
- Prefer composition (child scenes/nodes) over deep inheritance hierarchies
- Use signals for decoupled communication; use `EventBus` for cross-scene events
- Prefix private members and methods with `_`: `_health`, `_on_pressed()`
- Use `StateMachine` pattern for entities with more than 3 distinct states
- Use `ObjectPool` pattern for frequently spawned/destroyed objects (bullets, particles)
- Never use `get_node()` in hot paths — always cache references in `_ready()`
