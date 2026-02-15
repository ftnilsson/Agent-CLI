# Animation System

## Description

This skill covers Unity's animation pipeline — from importing and configuring clips, to building Animator Controllers with state machines, blend trees, animation layers, Inverse Kinematics (IK), root motion, and Timeline for cinematic sequences. Good animation integration makes the difference between a game that feels responsive and one that feels sluggish.

## When To Use

- Importing and configuring animation clips from 3D models (FBX)
- Building Animator Controllers with states, transitions, and parameters
- Creating Blend Trees for smooth locomotion (walk/run/strafe)
- Implementing animation layers (upper body combat + lower body movement)
- Setting up root motion vs. in-place animation
- Using Inverse Kinematics (IK) for foot placement, head look, hand positioning
- Implementing Animation Events for gameplay timing (deal damage on swing frame)
- Creating cutscenes and cinematic sequences with Timeline

## Prerequisites

- Unity 6 (6000.x) with URP
- Package: `com.unity.timeline` (for cinematics)
- Package: `com.unity.cinemachine` (for camera animation)
- A 3D character model with animations (or Unity's Starter Assets)
- [04 — Player Controller](../04-Player-Controller/skill.md) for movement integration

## Instructions

### 1. Animation Import Pipeline

#### FBX Import Settings

```
Model Tab:
  Scale Factor: 1 (match your project units)
  Import BlendShapes: true (if needed for facial)
  Import Cameras / Lights: false

Rig Tab:
  Animation Type:
    ├── Humanoid  — Characters (enables retargeting between models)
    ├── Generic   — Animals, creatures, non-human (animation-specific)
    └── Legacy    — Old system, avoid for new projects
  Avatar Definition: Create From This Model
  
Animation Tab:
  Loop Time: true (for locomotion) / false (for attacks, death)
  Root Transform Rotation: Bake Into Pose (for in-place anims)
  Root Transform Position (Y): Bake Into Pose (for in-place anims)
  Root Transform Position (XZ): Bake Into Pose (for in-place anims)
  Anim. Compression: Optimal
```

> **Humanoid vs Generic:** Use Humanoid for player/NPC characters — it enables animation retargeting (share animations between different models). Use Generic for everything else (animals, objects, unique creatures).

#### Avatar Masks

Avatar Masks define which bones are affected by an animation. Essential for layered animation.

```
UpperBodyMask (Avatar Mask asset):
  ✓ Head, Spine, Chest, Upper Chest
  ✓ Left/Right Shoulder, Upper Arm, Lower Arm, Hand
  ✗ Left/Right Upper Leg, Lower Leg, Foot, Toes
  ✗ Root, Hips
```

### 2. Animator Controller

The Animator Controller is a state machine that manages animation states and transitions.

#### Basic Locomotion Setup

```
Animator Controller: PlayerAnimator
├── Parameters:
│   ├── Speed (Float)        — Movement speed magnitude
│   ├── IsGrounded (Bool)    — On ground?
│   ├── Jump (Trigger)       — Jump initiated
│   ├── Attack (Trigger)     — Attack initiated
│   └── IsDead (Bool)        — Death state
│
├── Base Layer:
│   ├── Idle           ←→ Locomotion  (Speed > 0.1 / Speed < 0.1)
│   ├── Locomotion     (Blend Tree: Speed → Walk/Run)
│   ├── Jump           ← Any State (Jump trigger, IsGrounded = true)
│   ├── Fall           ← Jump (exit time) or (IsGrounded = false)
│   ├── Land           ← Fall (IsGrounded = true)
│   └── Death          ← Any State (IsDead = true, no exit)
│
└── Upper Body Layer: (Avatar Mask: UpperBody, Additive or Override)
    ├── Empty           — Default (pass through base layer)
    ├── Attack_1        ← (Attack trigger)
    ├── Attack_2        ← Attack_1 (Attack trigger during window)
    └── Block           ← (IsBlocking = true)
```

#### Transition Settings

```
Transition: Idle → Locomotion
  Has Exit Time: false          ← Respond immediately to input
  Transition Duration: 0.15s    ← Blend time between anims
  Conditions: Speed > 0.1

Transition: Any State → Jump
  Has Exit Time: false
  Transition Duration: 0.05s    ← Snappy response
  Conditions: Jump (Trigger), IsGrounded = true
  Can Transition To Self: false ← Prevent re-triggering
  
Transition: Attack_1 → Attack_2 (Combo)
  Has Exit Time: true
  Exit Time: 0.6               ← Can combo after 60% of attack
  Transition Duration: 0.1s
  Conditions: Attack (Trigger)
```

> **Key rule:** Set `Has Exit Time = false` for gameplay-driven transitions (movement, jump, attack) and `true` for animation-driven sequences (combos, recovery).

### 3. Blend Trees

Blend Trees smoothly interpolate between animations based on parameters.

#### 1D Blend Tree (Speed-based locomotion)

```
Blend Tree: Locomotion (1D)
  Parameter: Speed
  ├── Idle        — Threshold: 0.0
  ├── Walk        — Threshold: 0.5
  └── Run         — Threshold: 1.0
```

#### 2D Blend Tree (Directional movement — strafing)

```
Blend Tree: Strafe (2D Freeform Directional)
  Parameters: MoveX, MoveY
  ├── Idle           — (0, 0)
  ├── Walk Forward   — (0, 0.5)
  ├── Run Forward    — (0, 1)
  ├── Walk Backward  — (0, -0.5)
  ├── Strafe Left    — (-1, 0)
  ├── Strafe Right   — (1, 0)
  ├── Run Left       — (-1, 1)   (diagonal)
  └── Run Right      — (1, 1)    (diagonal)
```

### 4. Driving the Animator from Code

```csharp
using UnityEngine;

[RequireComponent(typeof(Animator))]
public class PlayerAnimationController : MonoBehaviour
{
    private Animator _animator;
    
    // Cache parameter IDs for performance (string hashing is slow)
    private static readonly int SpeedHash = Animator.StringToHash("Speed");
    private static readonly int IsGroundedHash = Animator.StringToHash("IsGrounded");
    private static readonly int JumpHash = Animator.StringToHash("Jump");
    private static readonly int AttackHash = Animator.StringToHash("Attack");
    private static readonly int IsDeadHash = Animator.StringToHash("IsDead");
    private static readonly int MoveXHash = Animator.StringToHash("MoveX");
    private static readonly int MoveYHash = Animator.StringToHash("MoveY");
    
    private void Awake()
    {
        _animator = GetComponent<Animator>();
    }
    
    public void UpdateLocomotion(float speed, bool isGrounded)
    {
        // Use dampening for smooth transitions
        _animator.SetFloat(SpeedHash, speed, 0.1f, Time.deltaTime);
        _animator.SetBool(IsGroundedHash, isGrounded);
    }
    
    public void UpdateStrafe(float moveX, float moveY)
    {
        _animator.SetFloat(MoveXHash, moveX, 0.1f, Time.deltaTime);
        _animator.SetFloat(MoveYHash, moveY, 0.1f, Time.deltaTime);
    }
    
    public void TriggerJump() => _animator.SetTrigger(JumpHash);
    public void TriggerAttack() => _animator.SetTrigger(AttackHash);
    public void SetDead(bool isDead) => _animator.SetBool(IsDeadHash, isDead);
    
    // Reset triggers to prevent queuing
    public void ResetAttackTrigger() => _animator.ResetTrigger(AttackHash);
}
```

### 5. Animation Events

Animation Events fire at specific frames during an animation clip. Use them for gameplay timing.

```csharp
public class MeleeWeapon : MonoBehaviour
{
    [SerializeField] private WeaponData _data;
    [SerializeField] private Collider _hitbox;
    [SerializeField] private Transform _vfxSpawnPoint;
    
    // Called from animation event at the moment the weapon should deal damage
    public void OnAttackHitFrame()
    {
        _hitbox.enabled = true;
    }
    
    // Called from animation event when the attack swing ends
    public void OnAttackEndFrame()
    {
        _hitbox.enabled = false;
    }
    
    // Called from animation event for step sounds, whoosh sounds, etc.
    public void OnPlaySound(AnimationEvent evt)
    {
        // evt.stringParameter contains the sound name
        // evt.floatParameter contains volume
        AudioManager.Instance.PlaySFX(evt.stringParameter, evt.floatParameter);
    }
    
    // Called from animation event to spawn VFX
    public void OnSpawnVFX()
    {
        Instantiate(_data.hitEffectPrefab, _vfxSpawnPoint.position, _vfxSpawnPoint.rotation);
    }
}
```

> **Adding events:** In the Animation window, scrub to the desired frame → right-click the event timeline → Add Animation Event → select the method.

### 6. Root Motion

Root motion drives the character's position/rotation from the animation itself rather than from code.

```csharp
[RequireComponent(typeof(Animator))]
public class RootMotionController : MonoBehaviour
{
    private Animator _animator;
    private CharacterController _controller;
    
    private void Awake()
    {
        _animator = GetComponent<Animator>();
        _controller = GetComponent<CharacterController>();
        
        // Enable root motion
        _animator.applyRootMotion = true;
    }
    
    // Called by Unity for each animation frame that has root motion
    private void OnAnimatorMove()
    {
        // Apply root motion through CharacterController (for collision)
        Vector3 rootMotion = _animator.deltaPosition;
        rootMotion.y = CalculateGravity(); // Override Y with custom gravity
        
        _controller.Move(rootMotion);
        transform.rotation *= _animator.deltaRotation;
    }
    
    private float CalculateGravity()
    {
        // Custom gravity logic
        return -9.81f * Time.deltaTime;
    }
}
```

**When to use root motion:**
- Realistic character movement with precise foot placement
- Combat animations where movement distance matters
- Climbing, vaulting, and context-sensitive animations

**When to avoid root motion:**
- Precise, responsive movement (platformers, FPS)
- Networked games (harder to sync)
- When animation doesn't include translation data

### 7. Inverse Kinematics (IK)

IK adjusts bone positions at runtime for procedural animation.

```csharp
[RequireComponent(typeof(Animator))]
public class IKController : MonoBehaviour
{
    [Header("Foot IK")]
    [SerializeField] private bool _enableFootIK = true;
    [SerializeField] private LayerMask _groundMask;
    [SerializeField] private float _footOffset = 0.05f;
    [SerializeField] private float _rayLength = 1.5f;
    
    [Header("Look IK")]
    [SerializeField] private bool _enableLookIK = true;
    [SerializeField] private Transform _lookTarget;
    [SerializeField, Range(0, 1)] private float _lookWeight = 0.7f;
    [SerializeField, Range(0, 1)] private float _bodyWeight = 0.3f;
    [SerializeField, Range(0, 1)] private float _headWeight = 0.8f;
    
    [Header("Hand IK")]
    [SerializeField] private Transform _leftHandTarget;
    [SerializeField] private Transform _rightHandTarget;
    
    private Animator _animator;
    
    private void Awake() => _animator = GetComponent<Animator>();
    
    // Called by Unity when IK pass is processed
    private void OnAnimatorIK(int layerIndex)
    {
        if (_enableFootIK)
            ApplyFootIK();
        
        if (_enableLookIK && _lookTarget != null)
            ApplyLookIK();
        
        if (_rightHandTarget != null)
            ApplyHandIK(AvatarIKGoal.RightHand, _rightHandTarget);
        
        if (_leftHandTarget != null)
            ApplyHandIK(AvatarIKGoal.LeftHand, _leftHandTarget);
    }
    
    private void ApplyFootIK()
    {
        // Left foot
        PlantFoot(AvatarIKGoal.LeftFoot);
        // Right foot
        PlantFoot(AvatarIKGoal.RightFoot);
    }
    
    private void PlantFoot(AvatarIKGoal foot)
    {
        _animator.SetIKPositionWeight(foot, 1f);
        _animator.SetIKRotationWeight(foot, 1f);
        
        Vector3 footPos = _animator.GetIKPosition(foot);
        if (Physics.Raycast(footPos + Vector3.up, Vector3.down, out RaycastHit hit, 
            _rayLength, _groundMask))
        {
            Vector3 targetPos = hit.point + Vector3.up * _footOffset;
            _animator.SetIKPosition(foot, targetPos);
            
            Quaternion footRotation = Quaternion.LookRotation(
                Vector3.ProjectOnPlane(transform.forward, hit.normal), hit.normal);
            _animator.SetIKRotation(foot, footRotation);
        }
    }
    
    private void ApplyLookIK()
    {
        _animator.SetLookAtWeight(_lookWeight, _bodyWeight, _headWeight);
        _animator.SetLookAtPosition(_lookTarget.position);
    }
    
    private void ApplyHandIK(AvatarIKGoal hand, Transform target)
    {
        _animator.SetIKPositionWeight(hand, 1f);
        _animator.SetIKRotationWeight(hand, 1f);
        _animator.SetIKPosition(hand, target.position);
        _animator.SetIKRotation(hand, target.rotation);
    }
}
```

### 8. Animation Layers

Layers allow different parts of the body to play different animations simultaneously.

```
Animator Layers:
├── Base Layer (Weight: 1.0, Mask: None)
│   └── Full body locomotion, jumping, falling
│
├── Upper Body Layer (Weight: 1.0, Mask: UpperBodyMask, Blending: Override)
│   └── Attacks, blocking, aiming — overrides base layer for upper body only
│
├── Additive Layer (Weight: 0.5, Mask: None, Blending: Additive)
│   └── Breathing, hit reactions — adds on top of current animation
│
└── Face Layer (Weight: 1.0, Mask: HeadMask, Blending: Override)
    └── Facial expressions, blinking
```

```csharp
// Control layer weights dynamically
public class LayerController : MonoBehaviour
{
    private Animator _animator;
    private int _upperBodyLayer;
    
    private void Awake()
    {
        _animator = GetComponent<Animator>();
        _upperBodyLayer = _animator.GetLayerIndex("Upper Body");
    }
    
    public void SetCombatMode(bool inCombat)
    {
        // Smoothly blend the upper body layer on/off
        float targetWeight = inCombat ? 1f : 0f;
        StartCoroutine(BlendLayerWeight(_upperBodyLayer, targetWeight, 0.3f));
    }
    
    private IEnumerator BlendLayerWeight(int layer, float target, float duration)
    {
        float start = _animator.GetLayerWeight(layer);
        float elapsed = 0f;
        
        while (elapsed < duration)
        {
            elapsed += Time.deltaTime;
            _animator.SetLayerWeight(layer, Mathf.Lerp(start, target, elapsed / duration));
            yield return null;
        }
        _animator.SetLayerWeight(layer, target);
    }
}
```

### 9. Timeline (Cinematic Sequences)

Timeline is a visual tool for creating cutscenes, in-game cinematics, and scripted sequences.

#### Timeline Structure

```
Timeline Asset: IntroCutscene
├── Animation Track (Player)
│   └── Clip: Player_IntroWalk, Player_IntroLookAround
├── Cinemachine Track
│   ├── Clip: VCam_Wide (0s - 3s)
│   └── Clip: VCam_CloseUp (3s - 8s, ease-in blend)
├── Audio Track
│   ├── Clip: ambient_wind.wav (0s, loop)
│   └── Clip: dramatic_sting.wav (5s)
├── Activation Track (Enemy Spawner)
│   └── Active: 6s - end
├── Signal Track
│   ├── Signal: DisablePlayerInput (0s)
│   ├── Signal: ShowObjectiveUI (8s)
│   └── Signal: EnablePlayerInput (10s)
└── Control Track (Particle System)
    └── Clip: DustExplosionVFX (5s)
```

#### Signal Receiver

```csharp
using UnityEngine;
using UnityEngine.Timeline;

public class CutsceneSignalReceiver : MonoBehaviour
{
    public void DisablePlayerInput()
    {
        // Called by Timeline signal
        FindFirstObjectByType<PlayerInput>()?.DeactivateInput();
    }
    
    public void EnablePlayerInput()
    {
        FindFirstObjectByType<PlayerInput>()?.ActivateInput();
    }
    
    public void ShowObjectiveUI()
    {
        // Trigger UI display
    }
}
```

### 10. Sprite Animation (2D)

```csharp
// For 2D games, use the Animator with sprite-based clips
// or this simple script for basic frame animation:

public class SpriteAnimator : MonoBehaviour
{
    [SerializeField] private SpriteRenderer _renderer;
    [SerializeField] private Sprite[] _frames;
    [SerializeField] private float _frameRate = 12f;
    [SerializeField] private bool _loop = true;
    
    private float _timer;
    private int _currentFrame;
    
    private void Update()
    {
        _timer += Time.deltaTime;
        if (_timer >= 1f / _frameRate)
        {
            _timer -= 1f / _frameRate;
            _currentFrame++;
            
            if (_currentFrame >= _frames.Length)
            {
                if (_loop)
                    _currentFrame = 0;
                else
                {
                    _currentFrame = _frames.Length - 1;
                    enabled = false;
                    return;
                }
            }
            
            _renderer.sprite = _frames[_currentFrame];
        }
    }
}
```

## Best Practices

1. **Cache `Animator.StringToHash()` results** as `static readonly int` — string lookups are slow every frame.
2. **Use `SetFloat` with damping** for smooth parameter transitions: `SetFloat(hash, value, dampTime, deltaTime)`.
3. **Set `Has Exit Time = false`** on gameplay-driven transitions for responsive controls.
4. **Keep transition durations short** (0.05–0.15s) for action games, longer (0.2–0.4s) for cinematic feel.
5. **Use Avatar Masks** on upper body layers to allow attack animations while running.
6. **Use Animation Events** for gameplay timing — never use fixed timers for "when the sword hits."
7. **Organize clips by action**: `Idle`, `Walk`, `Run`, `Attack_01`, `Attack_02`, `Death`, `Hit_Front`.
8. **Use Animator Override Controllers** to swap animation sets without duplicating the state machine (e.g., different weapon hold styles).
9. **Prefer Humanoid rig** for characters to enable animation retargeting and sharing.
10. **Test animations at different frame rates** — ensure they feel correct at both 30 and 60 FPS.

## Common Pitfalls

| Pitfall | Why It Hurts | Fix |
|---------|-------------|-----|
| Using strings instead of hashed IDs | Performance overhead every frame | Use `Animator.StringToHash()` cached as static |
| `Has Exit Time = true` on gameplay transitions | Input feels delayed and unresponsive | Set `Has Exit Time = false` for input-driven transitions |
| Not resetting triggers | Triggers queue and fire unexpectedly later | Call `ResetTrigger()` when appropriate |
| Root motion fighting code movement | Character jitters or moves wrong | Choose one: root motion OR code movement, not both |
| Missing Avatar Mask on layers | Entire body overridden instead of just upper body | Create and assign proper Avatar Masks |
| Animation Events on wrong GameObject | Events never fire | Events fire on the GameObject with the Animator |
| Not compressing animation clips | Bloated build size | Enable Optimal compression in import settings |
| Blend Tree threshold gaps | Snapping between animations | Ensure smooth, continuous threshold ranges |

## Reference

- [Unity Manual — Animation System](https://docs.unity3d.com/Manual/AnimationSection.html)
- [Unity Manual — Animator Controller](https://docs.unity3d.com/Manual/class-AnimatorController.html)
- [Unity Manual — Blend Trees](https://docs.unity3d.com/Manual/class-BlendTree.html)
- [Unity Manual — Inverse Kinematics](https://docs.unity3d.com/Manual/InverseKinematics.html)
- [Unity Manual — Timeline](https://docs.unity3d.com/Packages/com.unity.timeline@latest)
- [Unity Manual — Animation Layers](https://docs.unity3d.com/Manual/AnimationLayers.html)
