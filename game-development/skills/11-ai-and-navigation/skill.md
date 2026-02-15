# AI & Navigation

## Description

This skill covers implementing game AI in Unity — from NavMesh-based pathfinding to decision-making systems like state machines, behavior trees, and utility AI. It spans enemy patrol patterns, player detection, combat behavior, and the NavMesh system for dynamic obstacle avoidance.

## When To Use

- Creating enemy AI that patrols, chases, attacks, and retreats
- Setting up NavMesh for pathfinding on walkable surfaces
- Implementing stealth systems with line-of-sight and detection
- Building AI decision-making systems (FSM, behavior trees, utility AI)
- Creating companion/NPC AI with goal-driven behavior
- Handling dynamic obstacles and runtime NavMesh updates

## Prerequisites

- Unity 6 (6000.x)
- Package: `com.unity.ai.navigation` (install via Package Manager)
- [02 — C# Scripting](../02-CSharp-Scripting/skill.md) fundamentals
- [05 — Physics & Collision](../05-Physics-And-Collision/skill.md) for raycasting and detection

## Instructions

### 1. NavMesh Setup

#### Baking a NavMesh

1. Add a **NavMeshSurface** component to a GameObject (usually an empty "Navigation" object).
2. Configure:
   - **Agent Type:** Humanoid (or create custom agent types for different sized characters)
   - **Include Layers:** Select which layers are walkable
   - **Use Geometry:** Render Meshes or Physics Colliders
3. Click **Bake** to generate the NavMesh.

```
NavMeshSurface Configuration:
  Agent Type: Humanoid
    Radius: 0.5        (agent width / 2)
    Height: 2.0         (agent height)
    Step Height: 0.4    (max stair step)
    Max Slope: 45°      (walkable slope angle)
  Collect Objects: All
  Include Layers: Default, Ground, Walkable
  Use Geometry: Physics Colliders (more accurate)
```

#### NavMesh Modifiers

```
NavMeshModifier (on specific objects):
  Override Area: true
  Area Type:
    ├── Walkable (cost: 1)     — Normal ground
    ├── Not Walkable            — Blocked areas
    ├── Jump (cost: 2)          — Expensive paths (avoided if possible)
    └── Custom areas...         — Water (cost: 5), Lava (cost: 100)
```

#### NavMesh Links (Jumping, Climbing)

```csharp
// NavMeshLink component bridges disconnected NavMesh areas
// Place on gaps, ledges, or jump points
NavMeshLink:
  Start Point: (0, 0, 0)
  End Point: (0, -3, 5)
  Width: 1
  Bidirectional: true/false
  Area Type: Jump
```

### 2. NavMeshAgent

```csharp
using UnityEngine;
using UnityEngine.AI;

[RequireComponent(typeof(NavMeshAgent))]
public class AIMovement : MonoBehaviour
{
    [SerializeField] private float _walkSpeed = 3.5f;
    [SerializeField] private float _runSpeed = 6f;
    [SerializeField] private float _stoppingDistance = 1.5f;
    [SerializeField] private float _rotationSpeed = 120f;
    
    private NavMeshAgent _agent;
    
    private void Awake()
    {
        _agent = GetComponent<NavMeshAgent>();
        _agent.speed = _walkSpeed;
        _agent.stoppingDistance = _stoppingDistance;
        _agent.angularSpeed = _rotationSpeed;
        _agent.acceleration = 8f;
    }
    
    public void MoveTo(Vector3 destination, bool run = false)
    {
        _agent.speed = run ? _runSpeed : _walkSpeed;
        _agent.SetDestination(destination);
    }
    
    public void Stop()
    {
        _agent.ResetPath();
        _agent.velocity = Vector3.zero;
    }
    
    public bool HasReachedDestination()
    {
        if (_agent.pathPending) return false;
        if (_agent.remainingDistance > _agent.stoppingDistance) return false;
        return !_agent.hasPath || _agent.velocity.sqrMagnitude < 0.01f;
    }
    
    public bool IsPathValid(Vector3 destination)
    {
        NavMeshPath path = new NavMeshPath();
        _agent.CalculatePath(destination, path);
        return path.status == NavMeshPathStatus.PathComplete;
    }
    
    // Sync animator with agent movement
    public float NormalizedSpeed => _agent.velocity.magnitude / _runSpeed;
}
```

### 3. Finite State Machine (FSM)

The most common AI architecture. Simple, debuggable, works for most enemy types.

```csharp
using UnityEngine;

public abstract class AIState
{
    protected EnemyAI Owner;
    
    public AIState(EnemyAI owner) => Owner = owner;
    
    public abstract void Enter();
    public abstract void Update();
    public abstract void Exit();
    public virtual void OnDrawGizmos() { }
}

public class AIStateMachine
{
    public AIState CurrentState { get; private set; }
    public AIState PreviousState { get; private set; }
    
    public void ChangeState(AIState newState)
    {
        PreviousState = CurrentState;
        CurrentState?.Exit();
        CurrentState = newState;
        CurrentState.Enter();
    }
    
    public void Update() => CurrentState?.Update();
    public void OnDrawGizmos() => CurrentState?.OnDrawGizmos();
}
```

#### Enemy AI with FSM

```csharp
using UnityEngine;
using UnityEngine.AI;

public class EnemyAI : MonoBehaviour
{
    [Header("Detection")]
    [SerializeField] private float _detectionRange = 15f;
    [SerializeField] private float _attackRange = 2f;
    [SerializeField] private float _fieldOfView = 120f;
    [SerializeField] private LayerMask _obstacleMask;
    
    [Header("Patrol")]
    [SerializeField] private Transform[] _patrolPoints;
    [SerializeField] private float _patrolWaitTime = 2f;
    
    [Header("Combat")]
    [SerializeField] private float _attackCooldown = 1.5f;
    [SerializeField] private int _damage = 10;
    
    // Components
    public NavMeshAgent Agent { get; private set; }
    public Animator Animator { get; private set; }
    public AIStateMachine StateMachine { get; private set; }
    
    // State
    public Transform Target { get; set; }
    public Transform[] PatrolPoints => _patrolPoints;
    public float PatrolWaitTime => _patrolWaitTime;
    public float AttackRange => _attackRange;
    public float AttackCooldown => _attackCooldown;
    
    private void Awake()
    {
        Agent = GetComponent<NavMeshAgent>();
        Animator = GetComponent<Animator>();
        StateMachine = new AIStateMachine();
    }
    
    private void Start()
    {
        StateMachine.ChangeState(new PatrolState(this));
    }
    
    private void Update()
    {
        DetectPlayer();
        StateMachine.Update();
    }
    
    // --- Detection ---
    
    public bool CanSeeTarget()
    {
        if (Target == null) return false;
        
        Vector3 dirToTarget = (Target.position - transform.position).normalized;
        float distance = Vector3.Distance(transform.position, Target.position);
        
        // Range check
        if (distance > _detectionRange) return false;
        
        // FOV check
        float angle = Vector3.Angle(transform.forward, dirToTarget);
        if (angle > _fieldOfView * 0.5f) return false;
        
        // Line of sight check (raycast for obstacles)
        Vector3 eyePos = transform.position + Vector3.up * 1.5f;
        Vector3 targetPos = Target.position + Vector3.up * 1f;
        if (Physics.Linecast(eyePos, targetPos, _obstacleMask))
            return false;
        
        return true;
    }
    
    public bool IsTargetInAttackRange()
    {
        if (Target == null) return false;
        return Vector3.Distance(transform.position, Target.position) <= _attackRange;
    }
    
    private void DetectPlayer()
    {
        if (Target != null) return; // Already tracking
        
        var player = GameObject.FindWithTag("Player");
        if (player != null)
        {
            Target = player.transform;
        }
    }
    
    private void OnDrawGizmosSelected()
    {
        // Detection range
        Gizmos.color = new Color(1, 1, 0, 0.2f);
        Gizmos.DrawWireSphere(transform.position, _detectionRange);
        
        // FOV
        Vector3 leftBound = Quaternion.Euler(0, -_fieldOfView * 0.5f, 0) * transform.forward;
        Vector3 rightBound = Quaternion.Euler(0, _fieldOfView * 0.5f, 0) * transform.forward;
        Gizmos.color = Color.yellow;
        Gizmos.DrawRay(transform.position, leftBound * _detectionRange);
        Gizmos.DrawRay(transform.position, rightBound * _detectionRange);
        
        // Attack range
        Gizmos.color = new Color(1, 0, 0, 0.2f);
        Gizmos.DrawWireSphere(transform.position, _attackRange);
        
        StateMachine?.OnDrawGizmos();
    }
}
```

#### Concrete States

```csharp
// --- Patrol State ---
public class PatrolState : AIState
{
    private int _currentPointIndex;
    private float _waitTimer;
    private bool _isWaiting;
    
    public PatrolState(EnemyAI owner) : base(owner) { }
    
    public override void Enter()
    {
        Owner.Agent.speed = 3.5f;
        GoToNextPoint();
    }
    
    public override void Update()
    {
        // Transition: detected player → chase
        if (Owner.CanSeeTarget())
        {
            Owner.StateMachine.ChangeState(new ChaseState(Owner));
            return;
        }
        
        if (_isWaiting)
        {
            _waitTimer -= Time.deltaTime;
            if (_waitTimer <= 0f)
            {
                _isWaiting = false;
                GoToNextPoint();
            }
        }
        else if (Owner.Agent.remainingDistance < 0.5f && !Owner.Agent.pathPending)
        {
            _isWaiting = true;
            _waitTimer = Owner.PatrolWaitTime;
        }
    }
    
    public override void Exit() { }
    
    private void GoToNextPoint()
    {
        if (Owner.PatrolPoints.Length == 0) return;
        
        Owner.Agent.SetDestination(Owner.PatrolPoints[_currentPointIndex].position);
        _currentPointIndex = (_currentPointIndex + 1) % Owner.PatrolPoints.Length;
    }
}

// --- Chase State ---
public class ChaseState : AIState
{
    private float _lostSightTimer;
    private const float LostSightTimeout = 5f;
    
    public ChaseState(EnemyAI owner) : base(owner) { }
    
    public override void Enter()
    {
        Owner.Agent.speed = 6f;
    }
    
    public override void Update()
    {
        // Transition: in attack range → attack
        if (Owner.IsTargetInAttackRange())
        {
            Owner.StateMachine.ChangeState(new AttackState(Owner));
            return;
        }
        
        // Track target
        if (Owner.CanSeeTarget())
        {
            _lostSightTimer = 0f;
            Owner.Agent.SetDestination(Owner.Target.position);
        }
        else
        {
            _lostSightTimer += Time.deltaTime;
            
            // Transition: lost target for too long → patrol
            if (_lostSightTimer > LostSightTimeout)
            {
                Owner.Target = null;
                Owner.StateMachine.ChangeState(new PatrolState(Owner));
                return;
            }
        }
    }
    
    public override void Exit() { }
}

// --- Attack State ---
public class AttackState : AIState
{
    private float _attackTimer;
    
    public AttackState(EnemyAI owner) : base(owner) { }
    
    public override void Enter()
    {
        Owner.Agent.ResetPath();
        _attackTimer = 0f;
    }
    
    public override void Update()
    {
        // Face target
        if (Owner.Target != null)
        {
            Vector3 dir = (Owner.Target.position - Owner.transform.position).normalized;
            dir.y = 0f;
            Owner.transform.rotation = Quaternion.Slerp(
                Owner.transform.rotation, Quaternion.LookRotation(dir), 5f * Time.deltaTime);
        }
        
        // Transition: target out of range → chase
        if (!Owner.IsTargetInAttackRange())
        {
            Owner.StateMachine.ChangeState(new ChaseState(Owner));
            return;
        }
        
        // Attack on cooldown
        _attackTimer -= Time.deltaTime;
        if (_attackTimer <= 0f)
        {
            PerformAttack();
            _attackTimer = Owner.AttackCooldown;
        }
    }
    
    public override void Exit() { }
    
    private void PerformAttack()
    {
        Owner.Animator?.SetTrigger("Attack");
        // Actual damage is dealt via animation event
    }
}
```

### 4. Behavior Tree (Scalable Alternative)

For complex AI, behavior trees offer better organization than FSMs.

```csharp
// --- Node Base ---
public enum NodeStatus { Running, Success, Failure }

public abstract class BTNode
{
    public abstract NodeStatus Evaluate(AIBlackboard blackboard);
}

// --- Composite Nodes ---
public class Sequence : BTNode // AND — all children must succeed
{
    private readonly BTNode[] _children;
    public Sequence(params BTNode[] children) => _children = children;
    
    public override NodeStatus Evaluate(AIBlackboard bb)
    {
        foreach (var child in _children)
        {
            var status = child.Evaluate(bb);
            if (status != NodeStatus.Success) return status;
        }
        return NodeStatus.Success;
    }
}

public class Selector : BTNode // OR — first child that succeeds
{
    private readonly BTNode[] _children;
    public Selector(params BTNode[] children) => _children = children;
    
    public override NodeStatus Evaluate(AIBlackboard bb)
    {
        foreach (var child in _children)
        {
            var status = child.Evaluate(bb);
            if (status != NodeStatus.Failure) return status;
        }
        return NodeStatus.Failure;
    }
}

// --- Decorator Nodes ---
public class Inverter : BTNode
{
    private readonly BTNode _child;
    public Inverter(BTNode child) => _child = child;
    
    public override NodeStatus Evaluate(AIBlackboard bb)
    {
        var status = _child.Evaluate(bb);
        return status switch
        {
            NodeStatus.Success => NodeStatus.Failure,
            NodeStatus.Failure => NodeStatus.Success,
            _ => status
        };
    }
}

// --- Leaf Nodes (Conditions & Actions) ---
public class CheckCanSeeTarget : BTNode
{
    public override NodeStatus Evaluate(AIBlackboard bb)
    {
        return bb.Enemy.CanSeeTarget() ? NodeStatus.Success : NodeStatus.Failure;
    }
}

public class MoveToTarget : BTNode
{
    public override NodeStatus Evaluate(AIBlackboard bb)
    {
        if (bb.Enemy.Target == null) return NodeStatus.Failure;
        
        bb.Enemy.Agent.SetDestination(bb.Enemy.Target.position);
        
        return bb.Enemy.IsTargetInAttackRange() 
            ? NodeStatus.Success 
            : NodeStatus.Running;
    }
}

public class AttackTarget : BTNode
{
    private float _lastAttackTime;
    
    public override NodeStatus Evaluate(AIBlackboard bb)
    {
        if (!bb.Enemy.IsTargetInAttackRange()) return NodeStatus.Failure;
        
        if (Time.time - _lastAttackTime > bb.Enemy.AttackCooldown)
        {
            bb.Enemy.Animator?.SetTrigger("Attack");
            _lastAttackTime = Time.time;
        }
        return NodeStatus.Success;
    }
}

// --- Blackboard (Shared AI State) ---
public class AIBlackboard
{
    public EnemyAI Enemy;
    public Vector3 LastKnownTargetPosition;
    public float AlertLevel;
}
```

**Tree Construction:**

```csharp
public class BehaviorTreeAI : MonoBehaviour
{
    private BTNode _root;
    private AIBlackboard _blackboard;
    
    private void Start()
    {
        _blackboard = new AIBlackboard { Enemy = GetComponent<EnemyAI>() };
        
        // Build tree
        _root = new Selector(
            // Priority 1: Combat
            new Sequence(
                new CheckCanSeeTarget(),
                new Selector(
                    new Sequence(
                        new CheckInAttackRange(),
                        new AttackTarget()
                    ),
                    new MoveToTarget()
                )
            ),
            // Priority 2: Investigate last known position
            new Sequence(
                new CheckHasLastKnownPosition(),
                new MoveToLastKnownPosition()
            ),
            // Priority 3: Patrol (always succeeds)
            new PatrolAction()
        );
    }
    
    private void Update()
    {
        _root.Evaluate(_blackboard);
    }
}
```

### 5. Perception System

```csharp
public class AIPerception : MonoBehaviour
{
    [Header("Vision")]
    [SerializeField] private float _sightRange = 20f;
    [SerializeField] private float _sightAngle = 110f;
    [SerializeField] private float _closeRange = 3f; // Can detect behind (hearing)
    [SerializeField] private LayerMask _targetMask;
    [SerializeField] private LayerMask _obstacleMask;
    
    [Header("Detection")]
    [SerializeField] private float _detectionBuildRate = 1f;  // Per second
    [SerializeField] private float _detectionDecayRate = 0.5f;
    [SerializeField] private float _alertThreshold = 0.5f;
    [SerializeField] private float _fullDetectionThreshold = 1f;
    
    public float DetectionLevel { get; private set; }
    public bool IsAlert => DetectionLevel >= _alertThreshold;
    public bool IsFullyDetected => DetectionLevel >= _fullDetectionThreshold;
    
    private readonly Collider[] _overlapResults = new Collider[10];
    
    public Transform DetectedTarget { get; private set; }
    
    private void Update()
    {
        bool canSee = CheckVision();
        
        if (canSee)
        {
            DetectionLevel = Mathf.Min(_fullDetectionThreshold, 
                DetectionLevel + _detectionBuildRate * Time.deltaTime);
        }
        else
        {
            DetectionLevel = Mathf.Max(0f, 
                DetectionLevel - _detectionDecayRate * Time.deltaTime);
            
            if (DetectionLevel <= 0f)
                DetectedTarget = null;
        }
    }
    
    private bool CheckVision()
    {
        int count = Physics.OverlapSphereNonAlloc(
            transform.position, _sightRange, _overlapResults, _targetMask);
        
        for (int i = 0; i < count; i++)
        {
            Transform target = _overlapResults[i].transform;
            Vector3 dirToTarget = (target.position - transform.position).normalized;
            float dist = Vector3.Distance(transform.position, target.position);
            
            // Close range detection (360°) — simulates hearing
            if (dist <= _closeRange)
            {
                DetectedTarget = target;
                return true;
            }
            
            // Vision cone check
            float angle = Vector3.Angle(transform.forward, dirToTarget);
            if (angle > _sightAngle * 0.5f) continue;
            
            // Line of sight
            if (!Physics.Linecast(
                transform.position + Vector3.up * 1.5f,
                target.position + Vector3.up * 1f,
                _obstacleMask))
            {
                DetectedTarget = target;
                return true;
            }
        }
        
        return false;
    }
}
```

### 6. Dynamic NavMesh

For runtime-generated or destructible environments:

```csharp
using UnityEngine;
using UnityEngine.AI;
using Unity.AI.Navigation;

public class DynamicNavMeshUpdater : MonoBehaviour
{
    [SerializeField] private NavMeshSurface _surface;
    [SerializeField] private float _updateInterval = 1f;
    
    private float _timer;
    
    private void Update()
    {
        _timer += Time.deltaTime;
        if (_timer >= _updateInterval)
        {
            _timer = 0f;
            _surface.BuildNavMesh(); // Rebuilds the entire surface
        }
    }
}

// For localized updates, use NavMeshObstacle on dynamic objects
// NavMeshObstacle carves holes in the NavMesh at runtime
```

> **NavMeshObstacle** is cheaper than rebuilding. Use it on moving objects (barricades, vehicles) with **Carve** enabled and an appropriate **Carve Threshold**.

## Best Practices

1. **Use NavMeshObstacle for dynamic blockers** — cheaper than rebuilding NavMesh.
2. **Cache path calculations** — don't call `SetDestination` every frame. Recalculate every 0.5–1s or on target position change.
3. **Use OverlapSphereNonAlloc** for detection — pre-allocate the results array.
4. **Implement detection levels** — gradual awareness feels more realistic than instant detection.
5. **Draw Gizmos for AI debug visualization** — FOV cones, detection ranges, patrol paths.
6. **Use the Blackboard pattern** to share data between behavior tree nodes.
7. **Index patrol points** in ScriptableObjects for reuse across enemy types.
8. **Use NavMesh area costs** for terrain preferences — enemies avoid water, prefer roads.
9. **Limit AI update frequency** — not every enemy needs to run pathfinding every frame.
10. **Use `NavMesh.SamplePosition`** to validate destinations before setting them.

## Common Pitfalls

| Pitfall | Why It Hurts | Fix |
|---------|-------------|-----|
| `SetDestination` every frame | Wasted CPU on redundant pathfinding | Only recalculate when needed |
| Not baking NavMesh after level changes | Agents can't find paths | Rebake after geometry changes |
| FSM with too many states | Spaghetti transitions, unmaintainable | Switch to behavior tree for complex AI |
| Not validating NavMesh paths | Agents try to reach unreachable positions | Use `CalculatePath()` and check `PathStatus` |
| Moving NavMeshAgent via Transform | Conflicts with NavMesh pathfinding | Use `SetDestination()` or `Warp()` |
| Detection without line-of-sight check | Enemies see through walls | Always raycast for obstacles |
| No graceful fallback when path fails | AI freezes or gets stuck | Handle `PathInvalid` and `PathPartial` |
| Overlapping NavMesh surfaces | Pathfinding errors and agent teleporting | Ensure one surface per area |

## Reference

- [Unity Manual — Navigation System](https://docs.unity3d.com/Manual/nav-NavigationSystem.html)
- [Unity Manual — NavMeshAgent](https://docs.unity3d.com/ScriptReference/AI.NavMeshAgent.html)
- [Unity AI Navigation Package](https://docs.unity3d.com/Packages/com.unity.ai.navigation@latest)
- [Unity Manual — NavMeshObstacle](https://docs.unity3d.com/Manual/class-NavMeshObstacle.html)
