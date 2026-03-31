# Particle Systems

## Node Selection

| Node | Use Case |
|------|----------|
| `GPUParticles2D` | 2D effects — high count, GPU-processed |
| `GPUParticles3D` | 3D effects — high count, GPU-processed |
| `CPUParticles2D` | 2D effects — deterministic, low-end hardware, networking |
| `CPUParticles3D` | 3D effects — deterministic, low-end hardware, networking |

- Use `GPUParticles` by default; switch to `CPUParticles` for deterministic replays or when targeting low-end mobile
- Right-click a `GPUParticles` node → "Convert to CPUParticles" for quick conversion

## One-Shot Effects

```gdscript
func spawn_hit_effect(pos: Vector2) -> void:
    var fx := preload("res://effects/hit.tscn").instantiate() as GPUParticles2D
    fx.global_position = pos
    fx.emitting = true
    fx.one_shot = true
    fx.finished.connect(fx.queue_free)
    get_tree().current_scene.add_child(fx)
```

- Always set `one_shot = true` on transient effects and connect `finished` to `queue_free()`
- Call `fx.emitting = true` or `fx.restart()` after adding to the tree — `emitting` is not set automatically
- Preload particle scenes at startup — never load during gameplay with `load()`
- Expand `visibility_rect` (2D) or `visibility_aabb` (3D) to cover the full effect area to prevent early culling

## ParticleProcessMaterial Key Properties

| Property | Purpose |
|----------|---------|
| `direction` + `spread` | Initial emission cone |
| `initial_velocity_min/max` | Starting speed range |
| `gravity` | Gravity vector — set to zero for space/floating effects |
| `scale_min/max` + `scale_curve` | Particle size and size-over-lifetime |
| `color_ramp` | Color gradient over lifetime |
| `emission_shape` | Point, sphere, box, ring, or mesh surface |
| `damping_min/max` | Speed decay over lifetime |
| `explosiveness` | 0 = continuous stream, 1 = all particles at once |

## Common Effect Configuration

- Fire: direction `(0,-1,0)`, spread 15°, scale 1→0, color ramp white→yellow→orange→transparent
- Explosion one-shot: `explosiveness = 1.0`, emission shape Sphere, velocity 100–300, damping 50–80
- Trail: `use_as_trail = true`, zero initial velocity, zero gravity, scale 1→0, short lifetime

## Sub-Emitters

- Set `Sub Emitter` on `ParticleProcessMaterial` to a child `GPUParticles` node
- Choose trigger: `at_end` (spawn on particle death), `at_collision`, or `constant`
- Use sub-emitters for multi-stage effects: firework burst → sparks, bullet impact → smoke

## Effects Manager

- Centralize particle spawning in an `EffectsManager` autoload
- Store preloaded scenes in a `const Dictionary` keyed by effect name
- Validate effect names with `push_warning()` for unknown keys
- Pool frequently used effects instead of instantiating and freeing each use

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| `emitting = true` not set after `add_child()` | Always set `emitting = true` or call `restart()` after adding |
| `one_shot` effect not connected to `queue_free` | Connect `finished` signal to `queue_free()` |
| Particle scenes loaded with `load()` during gameplay | Use `preload()` at startup |
| `visibility_rect` too small causing clipping | Expand to cover the full particle spread area |
| Hundreds of concurrent particle systems | Pool effects; limit concurrent systems |
| `GPUParticles` used in deterministic replay/networking context | Use `CPUParticles` for deterministic behavior |

## Best Practices

- Preload all particle scenes in an EffectsManager autoload — never load on demand during gameplay
- Connect `finished` to `queue_free()` on every one-shot effect
- Pool high-frequency effects (footstep dust, hit sparks) — avoid instantiating every frame
- Keep particle counts low on mobile: test on target device and reduce `amount` if needed
- Use `explosiveness = 1.0` for burst effects; `0.0` for continuous emitters
- Set `visibility_rect`/`visibility_aabb` generously — default is too small for many effects
- Use sub-emitters to compose multi-stage effects rather than manually chaining spawns
