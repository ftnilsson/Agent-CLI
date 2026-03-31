# Player Controller

## CharacterBody Rules

- Always use `_physics_process(delta)` for movement — never `_process(delta)`
- Always call `move_and_slide()` at the end of `_physics_process()` — it handles slopes, walls, and collision response
- Apply gravity by incrementing `velocity.y` each physics tick when not on floor
- Multiply acceleration and friction by `delta` for frame-rate independence
- Never rotate the `CharacterBody3D` itself for visual rotation — rotate a child `Model` node

## 2D Platformer Controller

```gdscript
class_name PlayerController2D
extends CharacterBody2D

@export_group("Movement")
@export var move_speed: float = 200.0
@export var acceleration: float = 1500.0
@export var friction: float = 1200.0
@export_group("Jumping")
@export var jump_force: float = -350.0
@export var gravity: float = 980.0
@export var coyote_time: float = 0.12
@export var jump_buffer_time: float = 0.1

var _coyote_timer: float = 0.0
var _jump_buffer_timer: float = 0.0
var _was_on_floor: bool = false

func _physics_process(delta: float) -> void:
    if not is_on_floor():
        velocity.y += gravity * delta
    _coyote_timer = maxf(0.0, _coyote_timer - delta)
    _jump_buffer_timer = maxf(0.0, _jump_buffer_timer - delta)
    if _was_on_floor and not is_on_floor():
        _coyote_timer = coyote_time
    if Input.is_action_just_pressed("jump"):
        _jump_buffer_timer = jump_buffer_time
    if _jump_buffer_timer > 0.0 and (is_on_floor() or _coyote_timer > 0.0):
        velocity.y = jump_force
        _coyote_timer = 0.0
        _jump_buffer_timer = 0.0
    if Input.is_action_just_released("jump") and velocity.y < 0:
        velocity.y *= 0.5
    var direction := Input.get_axis("move_left", "move_right")
    velocity.x = move_toward(velocity.x,
        direction * move_speed if direction != 0.0 else 0.0,
        (acceleration if direction != 0.0 else friction) * delta)
    move_and_slide()
    _was_on_floor = is_on_floor()
```

## 3D Movement

- Get input with `Input.get_vector("move_left", "move_right", "move_forward", "move_back")`
- Project input through `camera_pivot.global_basis` to get camera-relative world direction
- Zero out the Y component of the direction vector before normalizing
- Rotate the child `Model` node toward the movement direction using `lerp_angle()`
- Use `lerpf()` for smooth acceleration toward target speed

## State Machine Integration

- Use a `StateMachine` node with `State` child nodes for players with 4+ distinct states
- Each `State` handles its own `enter()`, `exit()`, `update(delta)`, and `physics_update(delta)`
- States call `state_machine.transition_to(target_state)` — never modify `current_state` directly
- Keep movement, animation, and sound logic inside the relevant state node

## Input Rules

- Always use Input Map action names — never check raw key codes like `KEY_SPACE`
- Use `Input.get_axis()` for horizontal movement and `Input.get_vector()` for 2D directional movement
- Implement coyote time (grace window after leaving floor) for responsive platformer feel
- Implement jump buffering (queue jump slightly before landing) for responsive platformer feel

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Movement code in `_process(delta)` | Move all `CharacterBody` logic to `_physics_process(delta)` |
| Missing `delta` on gravity/acceleration | Always multiply by `delta`: `velocity.y += gravity * delta` |
| No coyote time in platformer | Add a `_coyote_timer` grace window after leaving the floor |
| `Input.is_key_pressed(KEY_SPACE)` for jump | Use `Input.is_action_just_pressed("jump")` |
| Rotating `CharacterBody3D` for visual direction | Rotate a child `Model` node instead |
| Inline movement + animation + sound in one method | Separate into focused private methods or state nodes |

## Best Practices

- Expose all movement parameters with `@export` so they can be tuned in the Inspector
- Use `@export_group()` to organize Inspector properties (Movement, Jumping, Camera)
- Use `move_toward()` for 2D horizontal movement with acceleration/friction
- Use `lerpf()` for 3D movement blending toward target velocity
- Separate animation logic from movement logic — update animations after `move_and_slide()`
- Use a state machine for complex players; use inline `match` for simple 2–3 state players
- Always handle variable jump height by reducing `velocity.y` on early button release
