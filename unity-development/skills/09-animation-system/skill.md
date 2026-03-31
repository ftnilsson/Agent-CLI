# Animation System

## Import Pipeline

- Set Animation Type to **Humanoid** for player and NPC characters — enables animation retargeting between models
- Set Animation Type to **Generic** for animals, creatures, and non-humanoid objects
- Enable **Loop Time** on locomotion clips; disable on attack, death, and one-shot clips
- Set Root Transform Position (XZ), (Y), and Rotation to **Bake Into Pose** for in-place animations
- Set Anim. Compression to **Optimal** on all imported clips
- Create Avatar Masks for body regions: `UpperBodyMask` (spine, arms, head) for layered combat animation

## Animator Controller

- Cache all Animator parameter IDs as `static readonly int` — string hashing is slow when called every frame
- Use `SetFloat(hash, value, dampTime, deltaTime)` for smooth parameter transitions (dampTime 0.1–0.15)
- Set `Has Exit Time = false` on all gameplay-driven transitions (input, jump, attack) for immediate response
- Set `Has Exit Time = true` only for animation-driven sequences (combos, recovery windows)
- Set `Can Transition To Self = false` on Any State transitions to prevent re-triggering

```csharp
[RequireComponent(typeof(Animator))]
public class PlayerAnimationController : MonoBehaviour
{
    private Animator _animator;

    private static readonly int SpeedHash      = Animator.StringToHash("Speed");
    private static readonly int IsGroundedHash = Animator.StringToHash("IsGrounded");
    private static readonly int JumpHash       = Animator.StringToHash("Jump");
    private static readonly int AttackHash     = Animator.StringToHash("Attack");

    private void Awake() => _animator = GetComponent<Animator>();

    public void UpdateLocomotion(float speed, bool isGrounded)
    {
        _animator.SetFloat(SpeedHash, speed, 0.1f, Time.deltaTime);
        _animator.SetBool(IsGroundedHash, isGrounded);
    }

    public void TriggerJump()   => _animator.SetTrigger(JumpHash);
    public void TriggerAttack() => _animator.SetTrigger(AttackHash);
    public void ResetAttack()   => _animator.ResetTrigger(AttackHash);
}
```

## Blend Trees

- Use 1D Blend Tree for speed-based locomotion: Idle (0.0) → Walk (0.5) → Run (1.0)
- Use 2D Freeform Directional Blend Tree for strafe movement: MoveX / MoveY parameters, 8-directional clips
- Ensure blend tree thresholds have no gaps — gaps cause snapping between animations

## Animation Layers

- Add an Upper Body layer with `UpperBodyMask` and **Override** blending for attack animations that play over locomotion
- Use **Additive** blending layers for breathing cycles and hit reactions
- Control layer weights with `_animator.SetLayerWeight(layerIndex, weight)` — use `GetLayerIndex("Upper Body")` to look up by name
- Blend layer weight smoothly (0.2–0.3s) when entering/leaving combat

## Animation Events

- Add Animation Events at specific frames in the Animation window — never use fixed timers for hit frames
- Name event methods clearly: `OnAttackHitFrame()`, `OnAttackEndFrame()`, `OnFootstep()`, `OnSpawnVFX()`
- Animation Events fire on the `GameObject` that has the `Animator` component — place receiver methods there

## Root Motion

- Enable `_animator.applyRootMotion = true` for realistic movement driven by animation translation
- Override `OnAnimatorMove()` to apply root motion through `CharacterController` for collision support
- Disable root motion for responsive platformers, FPS games, and networked characters

## Inverse Kinematics

- Override `OnAnimatorIK(int layerIndex)` — fires during the IK pass, not during Update
- Set `SetIKPositionWeight` and `SetIKRotationWeight` before setting position/rotation
- Use `SetLookAtWeight(weight, bodyWeight, headWeight)` + `SetLookAtPosition()` for head-tracking
- Raycast downward from the foot IK position to conform feet to uneven terrain

## Timeline Cinematics

- Use Timeline for cutscenes — create a `PlayableDirector` on a manager GameObject and assign a Timeline asset
- Use Signal Track + `SignalReceiver` component to trigger gameplay events from Timeline (disable input, show UI)
- Use Cinemachine Track for camera cuts and blends within Timeline sequences
- Disable player input via `playerInput.DeactivateInput()` at the start of cutscenes; restore at the end

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| String parameters in `SetFloat`/`SetTrigger` | Cache `Animator.StringToHash()` as `static readonly int` |
| `Has Exit Time = true` on input-driven transitions | Delayed, unresponsive feel — set to false |
| Not calling `ResetTrigger()` | Triggers queue and fire unexpectedly |
| Root motion and code movement simultaneously | Choose one — they conflict |
| No Avatar Mask on upper body layer | Entire body overridden instead of just upper body |
| Animation Events on wrong GameObject | Events fire on the Animator's GameObject only |
| No compression on animation clips | Bloated build size |

## Best Practices

- Use `AnimatorOverrideController` to swap animation sets without duplicating the state machine
- Prefer Humanoid rig for characters to share animations across models
- Keep transition durations short (0.05–0.15s) for action games; longer (0.2–0.4s) for cinematic feel
- Name clips consistently: `Idle`, `Walk`, `Run`, `Attack_01`, `Attack_02`, `Death`, `Hit_Front`
- Test animations at both 30 and 60 FPS — ensure feel is consistent
