# Physics & Collision

## Physics Body Selection

| Node | Use Case | Moved By |
|------|----------|----------|
| `StaticBody2D/3D` | Walls, floors, immovable terrain | Never |
| `CharacterBody2D/3D` | Player, NPCs — game-controlled movement | `move_and_slide()` in `_physics_process()` |
| `RigidBody2D/3D` | Crates, balls, ragdolls — physics-driven | Physics engine |
| `Area2D/3D` | Triggers, detection zones, pickups | Not a physics body — detects overlaps only |

## Collision Layers & Masks

- Name all layers in Project Settings → Layer Names → 2D/3D Physics before building levels
- Layer = "I am on this layer"; Mask = "I collide with / detect these layers"
- Set masks precisely — a body should only detect layers it needs to interact with
- Use `1 << (layer_index - 1)` in code for bit-flag assignments

Recommended layer layout:
```
Layer 1: Environment   Layer 2: Player    Layer 3: Enemy
Layer 4: Projectile    Layer 5: Pickup    Layer 6: Trigger
```

## Hitbox / Hurtbox Pattern

```gdscript
class_name Hitbox
extends Area2D

@export var damage: int = 10

func _ready() -> void:
    area_entered.connect(_on_area_entered)

func _on_area_entered(area: Area2D) -> void:
    if area is Hurtbox:
        area.take_hit(damage, global_position)
```

- Use `Area2D`/`Area3D` for all combat hit detection — not `CharacterBody` or `RigidBody`
- Keep `Hitbox` (deals damage) and `Hurtbox` (receives damage) as separate `Area` nodes
- Emit a signal from `Hurtbox.take_hit()` so health components remain decoupled from combat

## Raycasting

- Use `RayCast2D`/`RayCast3D` nodes for persistent per-frame checks (ground detection, wall probes)
- Use `PhysicsRayQueryParameters2D.create()` + `direct_space_state.intersect_ray()` for one-shot queries
- Always set `query.exclude = [self]` to prevent self-hits
- Use `PhysicsShapeQueryParameters2D` + `intersect_shape()` for overlap checks (explosion radius, AoE)

## RigidBody Rules

- Never set `position` or `global_position` directly on a `RigidBody` — use forces and impulses
- Apply custom physics forces inside `_integrate_forces(state: PhysicsDirectBodyState2D/3D)`
- Use `apply_central_impulse()` for instant velocity changes (launch, knockback)
- Use `apply_central_force()` for continuous forces applied over time

## Deferred Scene Tree Modifications

- Never call `queue_free()`, `add_child()`, or `remove_child()` directly inside physics callbacks
- Use `call_deferred("queue_free")` when freeing nodes from `body_entered`, `area_entered`, or `_integrate_forces`

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| `CharacterBody` used as a trigger zone | Use `Area2D`/`Area3D` for detection and triggers |
| Collision layer and mask set to same value carelessly | Layer = what I am; Mask = what I scan for |
| `rigid_body.position = target` | Use `apply_central_impulse()` or `_integrate_forces()` |
| `queue_free()` called inside `body_entered` signal | Use `call_deferred("queue_free")` |
| Self not excluded from raycast | Set `query.exclude = [self]` on all ray queries |
| Every body on every layer | Set minimal masks — fewer checks = better physics performance |

## Best Practices

- Define and name all collision layers before placing any physics nodes in the scene
- Use the Hitbox/Hurtbox `Area` pattern for all combat detection
- Prefer `RayCast` nodes for ground/wall detection; use direct space queries for one-shot checks
- Use `distance_squared_to()` instead of `distance_to()` for range comparisons in `_physics_process()`
- Disable collision shapes on inactive enemies or off-screen objects to reduce physics overhead
- Limit `RigidBody` count — prefer `CharacterBody` for game-critical entities
- Use simplified collision shapes (capsule, sphere, box) over polygon/mesh shapes for performance
