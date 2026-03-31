# Particle Systems & VFX

## Built-in Particle System (Shuriken)

- Set `Max Particles` to the minimum the effect needs — hard-caps memory and prevents runaway effects
- Disable unused modules — every enabled module has overhead even when values are default
- Set `Play On Awake = false` on all pooled particle prefabs to prevent them firing on instantiation
- Set `Simulation Space = World` for effects that should persist after the emitter moves (smoke, footprints)
- Set `Stop Action = Callback` on pooled effects to trigger `OnParticleSystemStopped()` for pool return

## Key Module Settings

- **Emission:** Use Bursts for one-shot effects (explosions); Rate over Time for continuous effects (fire, smoke)
- **Shape:** Use Cone for directed effects, Sphere for radial bursts, Box for area effects
- **Color over Lifetime:** Always include an alpha ramp — fade in at birth, fade out at death
- **Noise:** Add Gradient Noise with Strength 0.3–0.8 for organic turbulence on fire, smoke, magic
- **Trails:** Set `Ratio = 1` and `Texture Mode = Stretch` for ribbon trails on projectiles

## Common Effect Recipes

**Fire:** Cone emitter, Rate 30–50, Color gradient Yellow→Orange→Red→Alpha 0, additive renderer material, Noise Strength 0.5, Sub Emitter (Death) → smoke system

**Explosion:** Duration 0.5, Loop OFF, Burst count 40 at time 0, Sphere shape Radius 0.1, Start Speed 5–15 random, Size shrinks to 0, Sub Emitter (Birth) → shockwave ring + smoke cloud

**Hit Spark:** Burst 8–12 particles, Cone 30°, Short lifetime (0.15–0.3s), Additive material, Velocity over Lifetime outward, Size shrinks to zero

## Particle System Scripting

- Modify modules via the struct API: `var emission = ps.emission; emission.rateOverTime = rate;`
- Never modify module properties on a cached reference — the struct must be reassigned back
- Use `ps.Play()` / `ps.Stop()` / `ps.Clear()` for lifecycle control; call `ps.Emit(count)` for manual bursts
- Move and rotate particle systems with `transform.SetPositionAndRotation()` before calling `Play()`

## Object Pool for Particles

```csharp
public class ParticlePool : MonoBehaviour
{
    [SerializeField] private ParticleSystem _prefab;
    private ObjectPool<ParticleSystem> _pool;

    private void Awake()
    {
        _pool = new ObjectPool<ParticleSystem>(
            createFunc: () => Instantiate(_prefab, transform),
            actionOnGet: ps => ps.gameObject.SetActive(true),
            actionOnRelease: ps => ps.gameObject.SetActive(false),
            defaultCapacity: 10, maxSize: 50
        );
    }

    public ParticleSystem Get(Vector3 position, Quaternion rotation)
    {
        var ps = _pool.Get();
        ps.transform.SetPositionAndRotation(position, rotation);
        ps.Play();
        return ps;
    }
}
```

- Implement `OnParticleSystemStopped()` on a companion component to call `_pool.Release(ps)`

## Visual Effect Graph (VFX Graph)

- Install `com.unity.visualeffectgraph`; requires compute shader support — not available on all mobile GPUs
- Use VFX Graph for ambient large-scale effects (rain, snow, swarms, millions of particles)
- Use Built-in Particle System for gameplay-reactive effects that need collision, physics, and sub-emitters
- Set exposed properties via `_vfx.SetFloat(PropertyId, value)` and `_vfx.SetVector3(PropertyId, pos)`
- Send GPU events with `_vfx.SendEvent("OnHit")` — matches a GPU Event context node in the graph
- Cache `Shader.PropertyToID()` for all VFX property IDs — same rules as MaterialPropertyBlock

## Trail Renderer & Line Renderer

- Call `TrailRenderer.Clear()` when recycling a trail from a pool — stale trail geometry persists otherwise
- Set `TrailRenderer.emitting = false` before returning to pool; set `true` when retrieved
- Use `LineRenderer` for persistent beams, laser sights, and rope visuals — update positions each frame

## Particle Material Setup

- Use **Additive** blend mode for emissive effects: fire, sparks, magic, lasers
- Use **Alpha Blend** for opaque-looking effects: smoke, dust, clouds
- Use **Particles/Lit** shader for particles that should receive scene lighting
- Keep particle textures small (64×64 to 256×256 per frame); bake as flipbook sprite sheets

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| `Instantiate`/`Destroy` per effect | Use `ObjectPool<ParticleSystem>` |
| `Stop Action = None` on pooled effects | Set `Callback` and implement `OnParticleSystemStopped` |
| VFX Graph on unsupported mobile GPU | Use Built-in Particle System as fallback |
| Large overlapping transparent particles | Reduce particle size and count; overdraw is the primary GPU cost |
| Sub emitters creating unbounded particles | Cap sub-emitter `Max Particles` |
| Trail not clearing on pool recycle | Call `TrailRenderer.Clear()` |

## Best Practices

- Profile particle overdraw with the URP Rendering Debugger → Overdraw mode
- Use `ParticleSystem.IsAlive()` to check if an effect is still running before returning it
- Limit total particle count across all active systems — establish a per-scene budget
- Use flipbook texture animation (Texture Sheet Animation module) instead of many small meshes
- Prefer VFX Graph for GPU-bound ambient effects; Built-in Particle System for CPU-reactive gameplay effects
