# 13 — Particle Systems & VFX

## Description

Create real-time visual effects in Unity 6 using the **Built-in Particle System** (Shuriken) and the GPU-accelerated **Visual Effect Graph** (VFX Graph). This skill covers common effect recipes (fire, explosions, magic, trails), performance budgeting, and integration with gameplay systems.

## When To Use

- Spawning explosions, hit impacts, muzzle flashes, or environmental ambiance (rain, dust, fireflies).
- Creating stylised magic spells, auras, or beam effects.
- Adding juice and feedback to gameplay actions (footsteps, UI sparkles, pickups).
- Building GPU-heavy effects that require millions of particles (VFX Graph).
- Attaching trail or ribbon effects to projectiles and characters.

## Prerequisites

| Skill | Why |
|-------|-----|
| [01 — Project Setup](../01-Project-Setup/skill.md) | Package installation (VFX Graph requires URP or HDRP) |
| [12 — Shaders & VFX](../12-Shaders-And-VFX/skill.md) | Custom shader knowledge helps with particle materials |

## Instructions

### 1 — Built-in Particle System (Shuriken)

Create via **GameObject ▸ Effects ▸ Particle System**. All settings live in expandable **Modules** on the Inspector.

#### Core Modules

| Module | Purpose | Key Properties |
|--------|---------|----------------|
| **Main** | Lifetime, speed, gravity, simulation space | `Duration`, `Start Lifetime`, `Start Speed`, `Max Particles` |
| **Emission** | How many particles per second / burst | `Rate over Time`, `Bursts` (count, cycles, interval) |
| **Shape** | Spawn volume/surface | Sphere, Hemisphere, Cone, Box, Mesh, Edge |
| **Velocity over Lifetime** | Animated movement | Curves per axis, Orbital velocity |
| **Color over Lifetime** | Gradient fade-in/out | Gradient with alpha ramp for soft appearance/disappearance |
| **Size over Lifetime** | Grow or shrink | Curve (e.g., start large → shrink for sparks) |
| **Rotation over Lifetime** | Spinning particles | Angular velocity curve |
| **Noise** | Turbulence | Strength, Frequency, Scroll Speed |
| **Collision** | Bounce off surfaces | World/Planes, Dampen, Bounce, Lifetime Loss |
| **Sub Emitters** | Spawn child particles | On Birth, Death, Collision, Trigger |
| **Texture Sheet Animation** | Flipbook sprites | Grid layout, Frame over Time curve |
| **Renderer** | How particles are drawn | Billboard, Stretched Billboard, Mesh, Trail |

### 2 — Common Effect Recipes

#### Fire

```
Main:            Start Lifetime 1-2, Start Size 0.3-0.8, Start Color warm orange
Emission:        Rate 30-50
Shape:           Cone, Angle 15, Radius 0.1
Velocity:        Y = 1-3 (curves upward)
Color Lifetime:  Yellow → Orange → Red → Black (alpha 0 at end)
Size Lifetime:   Slight growth then shrink
Noise:           Strength 0.5, Frequency 2
Renderer:        Additive particle material
+ Sub Emitter → Ember sparks (small, fast, short lifetime, gravity 0.5)
+ Sub Emitter → Smoke (separate system: large, slow, grey, alpha fade)
```

#### Explosion

```
Main:            Duration 0.5, Looping OFF, Start Lifetime 0.3-0.8
Emission:        Burst count 30-60 at time 0
Shape:           Sphere, Radius 0.1
Start Speed:     5-15 (random between two constants)
Color Lifetime:  White → Yellow → Orange → transparent
Size Lifetime:   Start large, shrink to 0
Gravity:         0.5 (debris falls)
+ Sub Emitter (Birth): Shockwave ring (mesh particle, torus, grows fast, fades)
+ Sub Emitter (Birth): Smoke cloud (slow, large, long lifetime)
```

#### Trail / Ribbon

Use the **Trails** module on the Particle System:
```
Trails:          Enabled, Ratio 1, Lifetime 0.5
                 Texture Mode: Stretch
                 Size affects Width: ON
                 Color affects Color: ON
Renderer:        Trail Material (Particles/Additive or custom)
```

### 3 — Particle System Scripting

```csharp
using UnityEngine;

public class ParticleEffectPlayer : MonoBehaviour
{
    [SerializeField] private ParticleSystem _hitEffect;
    [SerializeField] private ParticleSystem _trailEffect;

    // --- One-shot effect at a position ---
    public void PlayHitEffect(Vector3 position, Vector3 normal)
    {
        // Option A: Move and play
        _hitEffect.transform.SetPositionAndRotation(position, Quaternion.LookRotation(normal));
        _hitEffect.Play();

        // Option B: Instantiate a copy (auto-destroy)
        var instance = Instantiate(_hitEffect, position, Quaternion.LookRotation(normal));
        instance.Play();
        Destroy(instance.gameObject, instance.main.duration + instance.main.startLifetime.constantMax);
    }

    // --- Modify at runtime ---
    public void SetEmissionRate(float rate)
    {
        var emission = _trailEffect.emission;
        emission.rateOverTime = rate;
    }

    public void SetColor(Color color)
    {
        var main = _trailEffect.main;
        main.startColor = color;
    }

    // --- Emit particles manually ---
    public void EmitBurst(int count)
    {
        _hitEffect.Emit(count);
    }
}
```

### 4 — Object-Pooled Particle Effects

Avoid `Instantiate`/`Destroy` overhead for frequent effects:

```csharp
using UnityEngine;
using UnityEngine.Pool;

public class ParticlePool : MonoBehaviour
{
    [SerializeField] private ParticleSystem _prefab;

    private ObjectPool<ParticleSystem> _pool;

    private void Awake()
    {
        _pool = new ObjectPool<ParticleSystem>(
            createFunc: () =>
            {
                var ps = Instantiate(_prefab, transform);
                var main = ps.main;
                main.stopAction = ParticleSystemStopAction.Callback;

                var callback = ps.gameObject.AddComponent<ParticleReturnToPool>();
                callback.Initialize(_pool, ps);

                return ps;
            },
            actionOnGet: ps =>
            {
                ps.gameObject.SetActive(true);
            },
            actionOnRelease: ps =>
            {
                ps.gameObject.SetActive(false);
            },
            defaultCapacity: 10,
            maxSize: 50
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

public class ParticleReturnToPool : MonoBehaviour
{
    private ObjectPool<ParticleSystem> _pool;
    private ParticleSystem _ps;

    public void Initialize(ObjectPool<ParticleSystem> pool, ParticleSystem ps)
    {
        _pool = pool;
        _ps = ps;
    }

    // Called by Particle System when Stop Action = Callback
    private void OnParticleSystemStopped()
    {
        _pool.Release(_ps);
    }
}
```

### 5 — Visual Effect Graph (VFX Graph)

VFX Graph is a **node-based GPU particle system** for high-fidelity, high-count effects. Install via **com.unity.visualeffectgraph**.

#### When to Use VFX Graph vs Built-in Particle System

| Feature | Built-in Particle System | VFX Graph |
|---------|--------------------------|-----------|
| Simulation | CPU | GPU (compute shaders) |
| Particle count | Thousands | Millions |
| Best for | Gameplay-integrated, physics-aware | Large-scale ambient, cinematic |
| Collision | Built-in world collision | Limited (depth buffer, SDF) |
| Sub Emitters | Yes | Spawn from GPU events |
| Scripting access | Full (read/write particles) | Exposed properties + events |
| Performance cost | CPU-bound | GPU-bound |
| Platform support | All | Requires compute shader support |

#### Creating a VFX Graph

1. **Assets ▸ Create ▸ Visual Effects ▸ Visual Effect Graph**.
2. Add a **Visual Effect** component to a GameObject and assign the graph.
3. Open the graph editor to build the effect.

#### VFX Graph Contexts

```
┌─────────────┐
│   Spawn     │  How many particles to create (rate, burst)
├─────────────┤
│ Initialize  │  Set initial values (position, velocity, lifetime, colour, size)
├─────────────┤
│   Update    │  Per-frame logic (forces, noise, collisions, aging)
├─────────────┤
│   Output    │  Rendering (quad, mesh, line, lit/unlit, orientation)
└─────────────┘
```

#### Exposed Properties & Events via C#

```csharp
using UnityEngine;
using UnityEngine.VFX;

public class VFXController : MonoBehaviour
{
    [SerializeField] private VisualEffect _vfx;

    private static readonly int SpawnRate  = Shader.PropertyToID("SpawnRate");
    private static readonly int HitPos    = Shader.PropertyToID("HitPosition");
    private static readonly int BaseColor = Shader.PropertyToID("BaseColor");

    public void SetSpawnRate(float rate)
    {
        _vfx.SetFloat(SpawnRate, rate);
    }

    public void TriggerHitEffect(Vector3 position)
    {
        _vfx.SetVector3(HitPos, position);
        _vfx.SendEvent("OnHit");  // Matches a GPU Event context in the graph
    }

    public void SetColor(Color color)
    {
        _vfx.SetVector4(BaseColor, color);
    }

    public void StopEffect()
    {
        _vfx.Stop();
    }
}
```

### 6 — Signed Distance Fields (SDF) in VFX Graph

SDFs allow particles to **collide with** or **conform to** complex shapes on the GPU.

1. Generate an SDF from a mesh: **Assets ▸ Create ▸ Visual Effects ▸ Signed Distance Field**.
2. Bake the mesh into a 3D texture.
3. In VFX Graph, use `Conform to Signed Distance Field` or `Collide with Signed Distance Field` blocks.

### 7 — Trail Renderer & Line Renderer

For non-particle trails:

```csharp
using UnityEngine;

[RequireComponent(typeof(TrailRenderer))]
public class ProjectileTrail : MonoBehaviour
{
    private TrailRenderer _trail;

    private void Awake()
    {
        _trail = GetComponent<TrailRenderer>();
    }

    // Clear trail when recycling from pool
    public void ResetTrail()
    {
        _trail.Clear();
    }

    // Fade trail over time
    public void FadeOut(float duration)
    {
        StartCoroutine(FadeRoutine(duration));
    }

    private System.Collections.IEnumerator FadeRoutine(float duration)
    {
        float start = _trail.startColor.a;
        float elapsed = 0f;

        while (elapsed < duration)
        {
            elapsed += Time.deltaTime;
            float alpha = Mathf.Lerp(start, 0f, elapsed / duration);

            var startColor = _trail.startColor;
            startColor.a = alpha;
            _trail.startColor = startColor;

            var endColor = _trail.endColor;
            endColor.a = alpha;
            _trail.endColor = endColor;

            yield return null;
        }
    }
}
```

### 8 — Particle Material Setup

| Material Type | Shader | Blend Mode | Use Case |
|---------------|--------|------------|----------|
| **Additive glow** | Particles/Unlit | Additive | Fire, sparks, magic, lasers |
| **Alpha blended** | Particles/Unlit | Alpha | Smoke, dust, clouds |
| **Lit particles** | Particles/Lit | Alpha/Additive | Particles that should receive lighting |
| **Distortion** | Custom Shader Graph | Grab pass / screen UV offset | Heat haze, shockwave |

## Best Practices

1. **Set `Max Particles`** to the absolute minimum needed — 1000 is often enough for gameplay effects.
2. **Use pooling** for frequently spawned one-shot effects (`OnParticleSystemStopped` + `ObjectPool<T>`).
3. **Avoid `Instantiate/Destroy`** per effect instance in gameplay-critical paths.
4. **Use `Simulation Space: World`** for effects that should persist after the emitter moves (smoke trails, footprints).
5. **Prefer VFX Graph** for large ambient effects (rain, snow, swarm) and **Built-in Particle System** for gameplay-reactive effects.
6. **Bake particle textures** as flipbook sprite sheets with alpha. Keep textures small (64×64 to 256×256 per frame).
7. **Limit overdraw** — many large, overlapping, transparent particles are the #1 GPU cost of particle effects. Use fewer, smaller particles.
8. **Disable modules you don't use** — each enabled module has overhead even if values are default.
9. **Use `Play On Awake = false`** for pooled effects to prevent them firing when instantiated.

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Particles invisible | Check Renderer module material; ensure the material's shader matches the pipeline (URP particles) |
| Particles flicker or sort incorrectly | Set **Sorting Fudge** in the Renderer module; use consistent render queues |
| Trail disappears when object is pooled | Call `TrailRenderer.Clear()` when recycling |
| VFX Graph not working on mobile | VFX Graph requires compute shader support — use Built-in Particle System for unsupported platforms |
| Particle System lags | Reduce `Max Particles`, lower emission rate, simplify collision or noise modules |
| Sub emitters creating too many particles | Set sub emitter probability < 1 and limit inherit properties |
| `OnParticleSystemStopped` not firing | Set `Main ▸ Stop Action = Callback` |

## Reference

- [Particle System Manual](https://docs.unity3d.com/6000.0/Documentation/Manual/ParticleSystems.html)
- [Visual Effect Graph Documentation](https://docs.unity3d.com/Packages/com.unity.visualeffectgraph@17.0/manual/index.html)
- [TrailRenderer API](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/TrailRenderer.html)
- [Particle System Scripting API](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/ParticleSystem.html)
- [VFX Graph Best Practices](https://docs.unity3d.com/Packages/com.unity.visualeffectgraph@17.0/manual/VFXGraph-BestPractices.html)
