# AI & Navigation

## Navigation Setup

- Add `NavigationRegion2D` (2D) or `NavigationRegion3D` (3D) to every level scene
- Bake the `NavigationPolygon` (2D) or `NavigationMesh` (3D) in the editor — not at runtime
- Add `NavigationAgent2D` or `NavigationAgent3D` as a child of every moving AI character
- Rebake navigation only when level geometry changes at runtime (destructible environments)

## NavigationAgent Movement

```gdscript
class_name EnemyAI
extends CharacterBody2D

@export var speed: float = 100.0
@onready var _nav_agent: NavigationAgent2D = $NavigationAgent2D

func _ready() -> void:
    _nav_agent.path_desired_distance = 4.0
    _nav_agent.target_desired_distance = 4.0

func _physics_process(_delta: float) -> void:
    if _nav_agent.is_navigation_finished():
        velocity = Vector2.ZERO
        move_and_slide()
        return
    var next := _nav_agent.get_next_path_position()
    velocity = global_position.direction_to(next) * speed
    move_and_slide()

func set_target(target: Node2D) -> void:
    _nav_agent.target_position = target.global_position
```

- Call `get_next_path_position()` every physics frame to follow the path
- Set `path_desired_distance` and `target_desired_distance` to avoid jitter at waypoints
- Only update `target_position` when the target has moved a meaningful distance — not every frame for static targets
- Enable `avoidance_enabled` on `NavigationAgent` and connect `velocity_computed` for multi-agent collision avoidance

## AI State Machine

- Use an enum-based state machine for simple AI: `IDLE`, `PATROL`, `CHASE`, `ATTACK`
- Drive state transitions from `_physics_process()` with a `_detect_player()` check
- Use a "lose interest" range of `detection_range * 1.5` to prevent state jitter at the boundary
- Add a reaction delay before transitioning to CHASE — instant detection feels frustrating
- Use `Marker2D`/`Marker3D` nodes as patrol waypoints; export them as `Array[Marker2D]`

## Line of Sight

- Use a `RayCast2D`/`RayCast3D` node pointed at the target for line-of-sight checks
- Call `force_raycast_update()` before reading results when checking outside `_physics_process()`
- Only chase if `ray.get_collider() == target` — walls and other bodies block the ray
- Set the raycast's collision mask to only hit environment and player layers

## Avoidance

- Enable `NavigationAgent.avoidance_enabled = true` for multi-agent scenes
- Connect `velocity_computed` signal and set `velocity = safe_velocity` then call `move_and_slide()`
- Set `avoidance_priority` to differentiate which agents yield to others

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| NavigationMesh never baked | Bake in editor; rebake at runtime only on geometry change |
| `get_tree().get_nodes_in_group("player")` called every frame | Cache player reference; use `Area` for detection instead |
| `target_position` updated every frame for a static target | Only update when target has moved significantly |
| Multiple agents without avoidance enabled | Enable `avoidance_enabled` on `NavigationAgent` |
| Enemy detects player instantly, no reaction time | Add a 0.1–0.3 s reaction delay before entering chase state |
| Chase disengages exactly at detection range | Use `detection_range * 1.5` as the disengage threshold |

## Best Practices

- Use `NavigationAgent2D`/`3D` for all pathfinding — never implement custom A* unless required
- Bake navigation meshes at edit time; cache the player reference rather than querying every frame
- Use state machines for AI with 3–5 states; consider behaviour tree addons for more complex AI
- Use `Area2D`/`Area3D` detection zones instead of `get_nodes_in_group()` for player detection
- Add line-of-sight checks before transitioning to CHASE to prevent enemies seeing through walls
- Put all enemies in the `"enemies"` group for efficient batch lookups
- Use `distance_squared_to()` for range comparisons to avoid square root overhead
