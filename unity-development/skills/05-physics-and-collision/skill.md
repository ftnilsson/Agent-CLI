# Physics & Collision

## Rigidbody Setup

- Every moving object with a collider must have a `Rigidbody` — moving a static collider forces PhysX to rebuild spatial data structures every frame
- Use **Dynamic** for fully simulated objects, **Kinematic** for script-driven movers (platforms, elevators)
- Set `rb.interpolation = RigidbodyInterpolation.Interpolate` on all player-visible moving objects
- Set `rb.collisionDetectionMode = CollisionDetectionMode.ContinuousDynamic` on fast-moving objects (bullets, thrown objects)
- Use Unity 6 API names: `rb.linearDamping` (not `drag`), `rb.angularDamping` (not `angularDrag`), `rb.linearVelocity` (not `velocity`)

## Applying Forces

- Apply all forces and velocity changes in `FixedUpdate()` — never in `Update()`
- Use `ForceMode.Force` for continuous thrust; `ForceMode.Impulse` for jumps and explosions (mass-dependent)
- Use `ForceMode.Acceleration` for consistent feel regardless of mass; `ForceMode.VelocityChange` for knockback
- Use `rb.MovePosition()` and `rb.MoveRotation()` for kinematic movement that respects physics collisions

## Collider Selection

- Prefer box, sphere, and capsule colliders — they are cheapest to simulate
- Use compound colliders (multiple primitives on child GameObjects) instead of mesh colliders on dynamic objects
- Non-convex `MeshCollider` is static-only — never set it on a dynamic or kinematic Rigidbody
- Keep `MeshCollider` triangle count under 255 when convex mode is required

## Collision Callbacks

```csharp
private void OnCollisionEnter(Collision collision)
{
    if (collision.gameObject.TryGetComponent<IDamageable>(out var target))
        target.TakeDamage(collision.impulse.magnitude * _damageMultiplier);
}

private void OnTriggerEnter(Collider other)
{
    if (other.TryGetComponent<IPickup>(out var pickup))
        pickup.Collect(this);
}
```

- A kinematic Rigidbody does not generate `OnCollisionEnter` with static colliders — use triggers or dynamic Rigidbody instead
- `OnTriggerStay` fires every fixed step while inside — use `Time.fixedDeltaTime` for per-second damage calculations

## Raycasting

- Always pass a `LayerMask` and `QueryTriggerInteraction.Ignore` to all raycasts — never query everything
- Use `Physics.RaycastNonAlloc()` with a pre-allocated `RaycastHit[]` buffer in hot paths — `RaycastAll` allocates every call
- Use `Physics.OverlapSphereNonAlloc()` / `OverlapBoxNonAlloc()` for area queries — pre-allocate result arrays as fields
- Use `Physics.SphereCast()` for aim assist and melee range checks — more forgiving than a thin ray
- Declare physics buffers as `private readonly` fields, never as locals inside `Update()`

## Physics Materials

- Create `PhysicsMaterial` assets for distinct surface types: Ice (friction 0.05), Rubber (bounciness 0.8), Metal (friction 0.3)
- Set `Bounce Combine = Maximum` on bouncy surfaces for reliable results
- Assign physics materials to collider components, not Rigidbodies

## Layer Collision Matrix

- Configure the Layer Collision Matrix in Project Settings → Physics from day one
- Disable all layer pairs that never need to interact — this is free performance
- Projectiles should not collide with the Player layer; Triggers should not collide with other Triggers

## 2D Physics

- 2D and 3D physics are completely separate — a 3D `Raycast` never hits a 2D `Collider`
- Use `Physics2D.RaycastNonAlloc()` and `Physics2D.OverlapCircleNonAlloc()` in 2D hot paths
- 2D callbacks use `Collision2D` and `Collider2D` parameter types

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Moving collider without Rigidbody | Add Rigidbody (kinematic if not physics-driven) |
| Physics calls in `Update()` | Use `FixedUpdate()` |
| `RaycastAll` in `Update()` | Use `RaycastNonAlloc` with pre-allocated buffer |
| `Discrete` detection on fast objects | Set `ContinuousDynamic` to prevent tunneling |
| Non-convex MeshCollider on dynamic object | Use compound primitives |
| No layer mask on raycasts | Always specify a `LayerMask` |

## Best Practices

- Use `rb.AddExplosionForce()` for explosion effects — correctly applies radial force with upward bias
- Enable `Reuse Collision Callbacks` in Physics Settings to reduce GC allocations per collision event
- Disable `Auto Sync Transforms` and call `Physics.SyncTransforms()` manually when needed
- Profile physics cost in the Unity Profiler → Physics section; target under 2ms per frame
- Use `Physics.Simulate()` for trajectory prediction in AI planning
