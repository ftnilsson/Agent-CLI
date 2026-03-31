# AI & Navigation

## NavMesh Setup

- Install `com.unity.ai.navigation` via Package Manager
- Add `NavMeshSurface` to an empty "Navigation" GameObject; configure Agent Type, Include Layers, and Use Geometry (Physics Colliders preferred)
- Bake NavMesh after every significant geometry change — stale bakes cause path failures
- Create custom Agent Types for different character sizes (small enemies, large bosses)
- Use `NavMeshModifier` to assign area costs: `Walkable (1)`, `Jump (2)`, `Water (5)` — agents prefer cheaper areas
- Use `NavMeshLink` for jump points, ledges, and gaps between disconnected surfaces

## NavMeshAgent Configuration

- Set `agent.stoppingDistance` to match the character's interaction reach
- Do not call `agent.SetDestination()` every frame — recalculate only when the target moves significantly or on a 0.5–1s interval
- Check destination reached: `!agent.pathPending && agent.remainingDistance <= agent.stoppingDistance && (!agent.hasPath || agent.velocity.sqrMagnitude < 0.01f)`
- Validate paths before setting: call `agent.CalculatePath()` and check `path.status == NavMeshPathStatus.PathComplete`
- Use `NavMesh.SamplePosition()` to snap destinations to the NavMesh surface

## Finite State Machine

```csharp
public class ChaseState : AIState
{
    private float _lostSightTimer;
    private const float LostSightTimeout = 5f;

    public ChaseState(EnemyAI owner) : base(owner) { }

    public override void Enter() => Owner.Agent.speed = Owner.RunSpeed;

    public override void Update()
    {
        if (Owner.IsTargetInAttackRange())
        { Owner.StateMachine.ChangeState(new AttackState(Owner)); return; }

        if (Owner.CanSeeTarget()) { _lostSightTimer = 0f; Owner.Agent.SetDestination(Owner.Target.position); }
        else if ((_lostSightTimer += Time.deltaTime) > LostSightTimeout)
        { Owner.Target = null; Owner.StateMachine.ChangeState(new PatrolState(Owner)); }
    }

    public override void Exit() { }
}
```

- Implement a base `AIState` class with `Enter()`, `Update()`, `Exit()`, and optional `OnDrawGizmos()`
- Keep `AIStateMachine` minimal: `ChangeState(newState)` calls `Exit()` on old state then `Enter()` on new
- Each state owns its own transition logic in `Update()` — states decide when to switch themselves

## Behavior Tree

- Use `Sequence` (AND — all children must succeed) and `Selector` (OR — first successful child wins) composites
- Use `Inverter` decorator to negate a child node's result
- Pass a shared `AIBlackboard` object through all nodes — stores `LastKnownTargetPosition`, `AlertLevel`, agent reference
- Evaluate every frame for reactive AI; throttle to every 0.1–0.2s for large crowds

## Perception System

- Combine FOV cone check with `Physics.Linecast` for line-of-sight (obstacles block the ray)
- Add a close-range 360° detection radius to simulate hearing
- Implement gradual detection level: `DetectionLevel` builds at `_buildRate * dt` when target visible, decays when not
- Use `Physics.OverlapSphereNonAlloc()` with a pre-allocated array for target scanning — never allocate in Update

## Dynamic NavMesh

- Use `NavMeshObstacle` with `Carve = true` on moving blockers (barricades, crates) — cheaper than full surface rebuild
- Set `Carve Threshold` on `NavMeshObstacle` to only carve when the object moves significantly
- Call `navMeshSurface.BuildNavMesh()` for full rebuilds only at level load or after major destructible changes

## Detection Visualization

- Draw FOV cone in `OnDrawGizmosSelected()` using `Gizmos.DrawRay()` for left and right angle bounds
- Draw detection radius as `Gizmos.DrawWireSphere()` with transparent fill
- Draw attack range as a separate colored sphere

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| `SetDestination()` every frame | Recalculate on interval or when target moves significantly |
| Not validating paths | Agents freeze trying to reach unreachable positions |
| Moving NavMeshAgent via `Transform` | Use `SetDestination()` or `agent.Warp()` |
| Detection without line-of-sight | Enemies see through walls |
| FSM with 10+ states | Refactor to behavior tree for complex AI |
| Full NavMesh rebuild every frame | Use `NavMeshObstacle` with Carve for dynamic blockers |
| No `PathInvalid` / `PathPartial` handling | AI freezes or gets stuck at level edges |

## Best Practices

- Cache patrol point positions in a ScriptableObject for reuse across enemy variants
- Limit AI update frequency for crowds — stagger updates across frames using `Time.frameCount % updateInterval`
- Use `NavMesh.SamplePosition()` to validate all programmatically generated destinations
- Store `LastKnownTargetPosition` in the blackboard when LOS breaks — move to last known before giving up
- Use area costs to make enemies prefer cover routes over open ground
