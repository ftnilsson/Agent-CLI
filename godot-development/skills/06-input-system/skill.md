# Input System

## Input Map Configuration

- Define all input actions in Project Settings → Input Map before writing any gameplay code
- Assign both keyboard and gamepad bindings to every action from the start
- Configure dead zones per-action in the Input Map for analog sticks
- Use descriptive action names: `move_left`, `move_right`, `jump`, `attack`, `interact`, `pause`
- Never check raw key codes like `KEY_SPACE` or `JOY_BUTTON_0` — always use action names

## Input Method Selection

```gdscript
func _physics_process(delta: float) -> void:
    var direction := Input.get_axis("move_left", "move_right")
    var move := Input.get_vector("move_left", "move_right", "move_up", "move_down")
    if Input.is_action_pressed("sprint"):
        speed = sprint_speed

func _unhandled_input(event: InputEvent) -> void:
    if event.is_action_pressed("jump"):
        _jump()
    if event.is_action_pressed("pause"):
        _toggle_pause()
```

## Input Processing Order

```
_input()               — intercept all input before anything else
  ↓
Control nodes          — UI buttons, sliders, text fields consume input here
  ↓
_shortcut_input()      — shortcut key processing
  ↓
_unhandled_key_input() — key events not consumed above
  ↓
_unhandled_input()     — gameplay input (use this for all game actions)
```

- Use `_unhandled_input()` for all gameplay input — UI consumes first, preventing UI/game bleed
- Use `_input()` only when intercepting input before the UI has a chance to consume it
- Mark events as handled with `get_viewport().set_input_as_handled()` when explicitly consumed

## Mouse and Touch

- Check `event is InputEventMouseButton` for click detection in `_unhandled_input()`
- Check `event is InputEventMouseMotion` for aim direction updates
- Check `event is InputEventScreenTouch` for mobile touch input
- Use `get_global_mouse_position()` for world-space mouse coordinates

## Input Remapping

- Clear existing bindings with `InputMap.action_erase_events(action)` before adding new ones
- Add new bindings with `InputMap.action_add_event(action, new_event)`
- Retrieve current binding text with `event.as_text()` for display in settings UI
- Persist remapped bindings to a save file and restore them in `_ready()` of an autoload

## Input Buffering

- Store buffered action names with a float timer value in a `Dictionary`
- Decrement all timers each `_process()` tick with `maxf(0.0, timer - delta)`
- Use a buffer duration of 0.1–0.15 seconds for jump and attack actions
- Check and consume the buffer inside `_physics_process()` when the action is executable

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| `Input.is_key_pressed(KEY_SPACE)` | Use `Input.is_action_pressed("jump")` |
| `_input()` used for all gameplay | Use `_unhandled_input()` so UI consumes first |
| Polling `is_action_just_pressed()` in `_process()` for discrete actions | Use `_unhandled_input(event)` event callbacks |
| No gamepad dead zones configured | Set dead zones per-action in the Input Map |
| No input buffering for jump | Add a buffer timer to queue jump before landing |
| Hardcoded gamepad button indices | Define named actions with gamepad bindings in Input Map |

## Best Practices

- Define every action in the Input Map — never check raw device inputs in game scripts
- Use `Input.get_vector()` for directional movement — normalizes diagonal input and handles analog sticks
- Use `Input.get_axis()` for single-axis movement (horizontal-only platformer)
- Support keyboard and gamepad simultaneously by assigning both to every action
- Buffer time-sensitive inputs (jump, dodge, attack) with a 0.1–0.15 s window
- Implement input remapping from the start — retrofitting it is expensive
- Test with both keyboard/mouse and gamepad before each milestone
