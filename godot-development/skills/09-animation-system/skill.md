# Animation System

## AnimationPlayer Rules

- Cache `AnimationPlayer` with `@onready` — never call `$AnimationPlayer` in `_process()`
- Connect `animation_finished` signal in `_ready()` to trigger gameplay events after animations complete
- Use `await _anim.animation_finished` for sequential animations — never call `play()` twice immediately
- Never animate the same property in both code and `AnimationPlayer` simultaneously — they conflict
- Use animation libraries to organize animations by category (locomotion, combat, death)
- Define animation names as constants to prevent typo bugs

## AnimationTree & State Machine

```gdscript
@onready var _anim_tree: AnimationTree = $AnimationTree
@onready var _state_machine: AnimationNodeStateMachinePlayback = \
    _anim_tree["parameters/playback"]

func _ready() -> void:
    _anim_tree.active = true

func _physics_process(delta: float) -> void:
    _anim_tree["parameters/run/blend_position"] = velocity.length() / max_speed
    if is_on_floor():
        _state_machine.travel("run" if absf(velocity.x) > 10.0 else "idle")
    else:
        _state_machine.travel("jump" if velocity.y < 0 else "fall")
```

- Use `AnimationTree` with `AnimationNodeStateMachine` for characters with 4+ animations
- Always set `AnimationTree.active = true` in `_ready()` — it does not process when inactive
- Cache `AnimationNodeStateMachinePlayback` in an `@onready` variable — it is retrieved every frame otherwise
- Use `travel()` to transition states — it respects transition conditions and blend times

## Blend Trees

- Use `AnimationNodeBlendSpace1D` to blend animations by a single scalar (speed, health)
- Use `AnimationNodeBlendSpace2D` to blend by a 2D vector (top-down directional movement)
- Update blend positions every physics frame: `_anim_tree["parameters/movement/blend_position"] = velocity.normalized()`
- Use `AnimationNodeBlend2` for simple 0–1 blends between two animations

## Tweens (Procedural Animation)

- Use `create_tween()` for procedural and UI animations — bounce, fade, slide, shake
- Chain sequential steps with `tween.tween_property()` calls
- Use `tween.parallel()` to animate multiple properties simultaneously
- Set easing with `tween.set_ease(Tween.EASE_OUT)` and `tween.set_trans(Tween.TRANS_BACK)`
- Check `is_inside_tree()` before tweening a node that may have been freed

## Animation-Driven Gameplay Events

- Add Call Method tracks in `AnimationPlayer` to enable/disable hitboxes at exact animation frames
- Add Call Method tracks to trigger SFX and particle effects synchronized to animation
- Never use `Timer` nodes to guess when an animation reaches a specific frame — use method call tracks

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| `_anim.play("run")` then `_anim.play("idle")` immediately | Use `await _anim.animation_finished` between calls |
| Code sets `position` while AnimationPlayer also animates it | Animate only in AnimationPlayer or only in code — not both |
| `AnimationTree.active` left false | Set `active = true` in `_ready()` |
| `$AnimationTree["parameters/playback"]` accessed every frame | Cache as `@onready var _state_machine` |
| Timer used to trigger hitbox mid-attack | Use Call Method track in AnimationPlayer timeline |
| Hardcoded animation name strings scattered in scripts | Define animation names as constants |

## Best Practices

- Use `AnimationPlayer` directly for simple objects (doors, coins, environmental effects)
- Use `AnimationTree` with state machine for characters with locomotion, combat, and death states
- Use `Tween` for all procedural and UI animations — lightweight and no timeline editing required
- Trigger hitbox activation, SFX, and VFX from animation method call tracks for frame-perfect sync
- Separate animation state from movement state — drive the animation tree from movement data, not the reverse
- Keep `AnimationPlayer` nodes focused: one player per logical animation set
