# Physics & Collision

## Description

This skill covers Unity's physics engines (PhysX for 3D, Box2D for 2D), including rigidbodies, colliders, triggers, raycasting, physics materials, joints, and collision layers. Proper physics setup is essential for responsive gameplay — from basic collision detection to complex ragdolls and destruction systems.

## When To Use

- Adding physics-based movement or interactions to objects
- Setting up collision detection between game objects
- Implementing raycasting for shooting, selection, or line-of-sight
- Creating trigger zones (checkpoints, damage areas, pickups)
- Building joints and constraints (doors, chains, bridges)
- Configuring physics layers to control what collides with what
- Optimizing physics performance

## Prerequisites

- Unity 6 (6000.x)
- [02 — C# Scripting](../02-CSharp-Scripting/skill.md) fundamentals
- Understanding of Unity's component model

## Instructions

### 1. Rigidbody Fundamentals

#### 3D Rigidbody

```csharp
// Rigidbody setup via code (usually configured in Inspector)
var rb = gameObject.AddComponent<Rigidbody>();
rb.mass = 1f;                                    // kilograms
rb.linearDamping = 0.5f;                         // air resistance (was "drag")
rb.angularDamping = 0.05f;                       // rotational resistance
rb.useGravity = true;
rb.interpolation = RigidbodyInterpolation.Interpolate; // smooth visual movement
rb.collisionDetectionMode = CollisionDetectionMode.ContinuousDynamic; // fast objects
rb.constraints = RigidbodyConstraints.FreezeRotationX | RigidbodyConstraints.FreezeRotationZ;
```

#### Body Types

| Type | Use Case | Behavior |
|------|----------|----------|
| **Dynamic** | Players, projectiles, physics objects | Fully simulated — gravity, forces, collisions |
| **Kinematic** | Moving platforms, elevators, animated objects | Moved via code, unaffected by forces, still triggers collisions |
| **Static** (no Rigidbody) | Walls, floors, environment | Never moves — adding a collider without Rigidbody makes it static |

> **Rule:** Every moving object with a collider MUST have a Rigidbody. Moving a static collider forces PhysX to rebuild spatial data structures — extremely expensive.

#### Applying Forces

```csharp
// All force application must happen in FixedUpdate()
private void FixedUpdate()
{
    // Continuous force (acceleration) — good for movement
    _rb.AddForce(Vector3.forward * _thrust, ForceMode.Force);
    
    // Instant impulse — good for jumps, explosions
    _rb.AddForce(Vector3.up * _jumpForce, ForceMode.Impulse);
    
    // Direct velocity change — good for knockback
    _rb.AddForce(_knockbackDir * _knockbackPower, ForceMode.VelocityChange);
    
    // Torque (rotation)
    _rb.AddTorque(Vector3.up * _turnSpeed, ForceMode.Force);
    
    // Move to position (kinematic-style, respects physics)
    _rb.MovePosition(transform.position + _velocity * Time.fixedDeltaTime);
    _rb.MoveRotation(Quaternion.Euler(0f, _targetAngle, 0f));
}
```

| ForceMode | Description | Use Case |
|-----------|-------------|----------|
| `Force` | Continuous, mass-dependent (N) | Movement, thrust |
| `Impulse` | Instant, mass-dependent (N·s) | Jump, explosion |
| `Acceleration` | Continuous, mass-independent (m/s²) | Consistent movement regardless of mass |
| `VelocityChange` | Instant, mass-independent (m/s) | Knockback, teleport-velocity |

### 2. Colliders

#### Collider Types

| Collider | Cost | Use Case |
|----------|------|----------|
| **BoxCollider** | Cheapest | Crates, walls, floors, rough shapes |
| **SphereCollider** | Cheapest | Pickups, trigger zones, rough characters |
| **CapsuleCollider** | Cheap | Characters, bullets, cylinders |
| **MeshCollider (Convex)** | Medium | Complex props (max 255 triangles) |
| **MeshCollider (Non-Convex)** | Expensive | Static environment only — cannot be dynamic |

> **Performance rule:** Prefer primitives (box, sphere, capsule). Use compound colliders (multiple primitives on child objects) instead of mesh colliders when possible.

#### Compound Colliders

```
Character GameObject (Rigidbody)
├── Body (CapsuleCollider)
├── Head (SphereCollider)
├── Shield (BoxCollider)
└── Weapon (BoxCollider, IsTrigger = true)
```

Place colliders on child GameObjects. They all register as part of the parent's Rigidbody.

#### Trigger Colliders

Set `isTrigger = true` to create pass-through detection zones:

```csharp
public class DamageZone : MonoBehaviour
{
    [SerializeField] private float _damagePerSecond = 10f;
    [SerializeField] private DamageType _damageType;
    
    private void OnTriggerStay(Collider other)
    {
        if (other.TryGetComponent<IDamageable>(out var target))
        {
            target.TakeDamage(_damagePerSecond * Time.fixedDeltaTime, _damageType);
        }
    }
}
```

### 3. Collision Callbacks

#### Collision Matrix

| | Static Collider | Rigidbody Collider | Kinematic Rigidbody | Trigger (Static) | Trigger (Rigidbody) | Trigger (Kinematic) |
|-|-|-|-|-|-|-|
| **Static Collider** | — | Collision | — | — | — | — |
| **Rigidbody Collider** | Collision | Collision | Collision | Trigger | Trigger | Trigger |
| **Kinematic Rigidbody** | — | Collision | — | Trigger | Trigger | Trigger |

#### Collision Events

```csharp
// For non-trigger colliders (physical contact)
private void OnCollisionEnter(Collision collision)
{
    // Access contact points
    ContactPoint contact = collision.GetContact(0);
    Vector3 hitPoint = contact.point;
    Vector3 hitNormal = contact.normal;
    float impactForce = collision.impulse.magnitude;
    
    // Check what we hit
    if (collision.gameObject.CompareTag("Enemy"))
    {
        // Handle enemy collision
    }
    
    // Spawn impact VFX at contact point
    Instantiate(_impactVfx, hitPoint, Quaternion.LookRotation(hitNormal));
}

private void OnCollisionStay(Collision collision) { /* Ongoing contact */ }
private void OnCollisionExit(Collision collision) { /* Contact ended */ }

// For trigger colliders (pass-through detection)
private void OnTriggerEnter(Collider other) { /* Object entered trigger */ }
private void OnTriggerStay(Collider other)  { /* Object inside trigger */ }
private void OnTriggerExit(Collider other)  { /* Object left trigger */ }
```

### 4. Raycasting

Raycasting is essential for shooting, line-of-sight, ground detection, and UI interaction.

#### Basic Raycasts

```csharp
public class WeaponRaycast : MonoBehaviour
{
    [SerializeField] private float _range = 100f;
    [SerializeField] private float _damage = 25f;
    [SerializeField] private LayerMask _hitLayers;
    [SerializeField] private Transform _muzzle;
    
    public void Shoot()
    {
        if (Physics.Raycast(_muzzle.position, _muzzle.forward, out RaycastHit hit, 
            _range, _hitLayers, QueryTriggerInteraction.Ignore))
        {
            Debug.Log($"Hit: {hit.collider.name} at {hit.point}");
            Debug.DrawLine(_muzzle.position, hit.point, Color.red, 1f);
            
            // Apply damage
            if (hit.collider.TryGetComponent<IDamageable>(out var target))
            {
                target.TakeDamage(_damage);
            }
            
            // Spawn decal at hit point
            SpawnDecal(hit.point, hit.normal);
        }
    }
}
```

#### SphereCast (Thicker raycast — more forgiving aim)

```csharp
// Great for aim assist or melee detection
if (Physics.SphereCast(origin, radius: 0.3f, direction, out RaycastHit hit, 
    maxDistance, layerMask))
{
    // Hit something within a 0.3m radius tube
}
```

#### RaycastAll and RaycastNonAlloc

```csharp
// RaycastAll — allocates array (use sparingly)
RaycastHit[] hits = Physics.RaycastAll(origin, direction, maxDistance, layerMask);

// RaycastNonAlloc — zero allocation (preferred in Update loops)
private readonly RaycastHit[] _hitBuffer = new RaycastHit[10];

private void DetectObjects()
{
    int hitCount = Physics.RaycastNonAlloc(
        transform.position, transform.forward, _hitBuffer, 50f, _detectionMask);
    
    for (int i = 0; i < hitCount; i++)
    {
        ProcessHit(_hitBuffer[i]);
    }
}
```

#### Overlap Queries (Area detection)

```csharp
// Sphere overlap — find all colliders in a sphere
Collider[] results = new Collider[20];
int count = Physics.OverlapSphereNonAlloc(
    transform.position, explosionRadius, results, affectedLayers);

for (int i = 0; i < count; i++)
{
    // Apply explosion force
    if (results[i].TryGetComponent<Rigidbody>(out var rb))
    {
        rb.AddExplosionForce(explosionForce, transform.position, explosionRadius, 
            upwardsModifier: 1f, ForceMode.Impulse);
    }
}

// Box overlap
Physics.OverlapBoxNonAlloc(center, halfExtents, results, orientation, layerMask);

// Capsule overlap
Physics.OverlapCapsuleNonAlloc(point0, point1, radius, results, layerMask);
```

### 5. Physics Materials

Physics Materials control surface friction and bounciness.

```
Create: Assets → Create → Physic Material

Common presets:
├── Ice.physicMaterial       — Dynamic Friction: 0.05, Static Friction: 0.05, Bounciness: 0
├── Rubber.physicMaterial    — Dynamic Friction: 0.8,  Static Friction: 0.9,  Bounciness: 0.8
├── Metal.physicMaterial     — Dynamic Friction: 0.3,  Static Friction: 0.4,  Bounciness: 0.2
├── Wood.physicMaterial      — Dynamic Friction: 0.5,  Static Friction: 0.6,  Bounciness: 0.1
└── Bouncy.physicMaterial    — Dynamic Friction: 0.2,  Static Friction: 0.2,  Bounciness: 1.0
                               Bounce Combine: Maximum
```

| Property | Description |
|----------|-------------|
| Dynamic Friction | Friction when sliding (0 = ice, 1 = sandpaper) |
| Static Friction | Friction when stationary (resists initial movement) |
| Bounciness | How much velocity is retained on bounce (0 = none, 1 = full) |
| Friction Combine | How two surfaces combine: Average, Minimum, Maximum, Multiply |
| Bounce Combine | How two surfaces combine bounce values |

### 6. Joints

Joints constrain how rigidbodies relate to each other.

| Joint | Use Case | Example |
|-------|----------|---------|
| **FixedJoint** | Weld two objects together | Sticky projectiles, object attachment |
| **HingeJoint** | Rotation around one axis | Doors, flippers, pendulums |
| **SpringJoint** | Elastic connection | Bungee cords, suspension |
| **ConfigurableJoint** | Full control over all axes | Custom constraints, ragdolls |
| **CharacterJoint** | Humanoid ragdoll joints | Ragdoll limbs |

#### Hinge Joint Example (Door)

```csharp
public class PhysicsDoor : MonoBehaviour
{
    [SerializeField] private float _openAngle = 90f;
    [SerializeField] private float _springForce = 50f;
    [SerializeField] private float _damping = 5f;
    
    private HingeJoint _hinge;
    private bool _isOpen;
    
    private void Awake()
    {
        _hinge = GetComponent<HingeJoint>();
    }
    
    public void ToggleDoor()
    {
        _isOpen = !_isOpen;
        
        var spring = _hinge.spring;
        spring.spring = _springForce;
        spring.damper = _damping;
        spring.targetPosition = _isOpen ? _openAngle : 0f;
        _hinge.spring = spring;
        _hinge.useSpring = true;
    }
}
```

### 7. Layer Collision Matrix

Configure which layers collide in **Edit → Project Settings → Physics**:

```
Layer Setup:
  Default (0)     — General objects
  Player (9)      — Player character
  Enemy (10)      — Enemy characters
  Projectile (11) — Bullets, arrows
  Pickup (12)     — Collectibles
  Trigger (13)    — Trigger zones
  
Collision Matrix:
                Default  Player  Enemy  Projectile  Pickup  Trigger
  Default         ✓        ✓       ✓       ✓         —        —
  Player          ✓        —       ✓       —         ✓        ✓
  Enemy           ✓        ✓       —       ✓         —        ✓
  Projectile      ✓        —       ✓       —         —        —
  Pickup          —        ✓       —       —         —        —
  Trigger         —        ✓       ✓       —         —        —
```

> Disabling unnecessary collisions is one of the cheapest physics optimizations.

### 8. 2D Physics

Unity uses Box2D for 2D physics. The API mirrors 3D but uses `2D` suffix.

```csharp
// 2D equivalents
Rigidbody2D rb2d;
BoxCollider2D boxCollider;
CircleCollider2D circleCollider;

// 2D raycasting
RaycastHit2D hit = Physics2D.Raycast(origin, direction, distance, layerMask);
if (hit.collider != null)
{
    Debug.Log($"Hit: {hit.collider.name}");
}

// 2D overlap
Collider2D[] results = Physics2D.OverlapCircleAll(center, radius, layerMask);

// 2D callbacks
private void OnCollisionEnter2D(Collision2D collision) { }
private void OnTriggerEnter2D(Collider2D other) { }
```

> **Important:** 3D and 2D physics are completely separate systems. A 3D Raycast will never hit a 2D Collider and vice versa.

## Best Practices

1. **All physics operations in `FixedUpdate()`** — forces, movement, velocity changes.
2. **Use `NonAlloc` variants** for queries in hot paths — `RaycastNonAlloc`, `OverlapSphereNonAlloc`.
3. **Use the Layer Collision Matrix** — disable unnecessary collisions for free performance.
4. **Never move static colliders** — always add a Rigidbody (set kinematic if needed).
5. **Use `Rigidbody.interpolation = Interpolate`** for player-visible objects to prevent jitter.
6. **Set `ContinuousDynamic` collision detection** on fast-moving objects (bullets, vehicles).
7. **Use `QueryTriggerInteraction.Ignore`** on raycasts that shouldn't hit triggers.
8. **Prefer primitive colliders** — compound several primitives instead of using MeshColliders.
9. **Cache raycast results** in buffers — pre-allocate arrays and reuse them.
10. **Use Physics.Simulate() for prediction** — simulate physics ahead for AI trajectory planning.

## Common Pitfalls

| Pitfall | Why It Hurts | Fix |
|---------|-------------|-----|
| Moving colliders without Rigidbody | Forces PhysX spatial tree rebuild every frame | Add Rigidbody (kinematic if needed) |
| Physics in `Update()` | Inconsistent results, frame-rate dependent | Use `FixedUpdate()` |
| Using `RaycastAll` in `Update()` | Allocates new array every frame | Use `RaycastNonAlloc` |
| Not using layers | Everything collides with everything | Set up Layer Collision Matrix |
| `Discrete` collision detection on fast objects | Bullets pass through walls (tunneling) | Use `ContinuousDynamic` |
| Mixing 2D and 3D physics | They don't interact at all | Choose one per game, or use separate layers |
| Scaling colliders via transform | Can cause physics instability | Scale the collider component, not the transform |
| Too many mesh colliders | Physics performance tanks | Use compound primitive colliders |

## Reference

- [Unity Manual — Physics](https://docs.unity3d.com/Manual/PhysicsOverview.html)
- [Unity Manual — Rigidbody](https://docs.unity3d.com/Manual/class-Rigidbody.html)
- [Unity Manual — Colliders](https://docs.unity3d.com/Manual/CollidersOverview.html)
- [Unity Scripting API — Physics](https://docs.unity3d.com/ScriptReference/Physics.html)
- [Unity Manual — 2D Physics](https://docs.unity3d.com/Manual/Physics2DReference.html)
