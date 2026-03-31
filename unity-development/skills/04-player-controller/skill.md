# Player Controller

## Movement Approach Selection

- Use `CharacterController` for platformers, FPS, and games requiring precise ground/step/slope handling
- Use `Rigidbody` (dynamic) for physics-heavy games where object interactions and forces matter
- Use `Rigidbody` (kinematic) for networked movement or custom physics
- Never move a `CharacterController` with `Transform.Translate` — use `controller.Move()`
- Never move a `Rigidbody` with `Transform.position =` — use `rb.MovePosition()` or `AddForce()`

## CharacterController Rules

- Implement coyote time (0.1–0.15s window after leaving a ledge where jumping is still allowed)
- Implement jump buffering (0.1s window where a jump press is remembered before landing)
- Apply a small negative Y velocity (`-2f`) when grounded to keep the controller pressed to slopes
- Use `Physics.CheckSphere()` for ground detection with a configurable `LayerMask` — never rely on `controller.isGrounded` alone
- Calculate jump velocity from desired height: `v = sqrt(2 * |gravity| * height)`

```csharp
[RequireComponent(typeof(CharacterController))]
public class ThirdPersonController : MonoBehaviour
{
    [SerializeField] private float _walkSpeed = 4f;
    [SerializeField] private float _jumpHeight = 1.2f;
    [SerializeField] private float _gravity = -20f;
    [SerializeField] private LayerMask _groundLayers;

    private CharacterController _controller;
    private Transform _mainCamera;
    private Vector3 _velocity;

    private void Awake()
    {
        _controller = GetComponent<CharacterController>();
        _mainCamera = Camera.main.transform; // Cache — Camera.main calls FindWithTag internally
    }

    private void Update()
    {
        bool grounded = Physics.CheckSphere(
            transform.position + Vector3.up * -0.1f, 0.3f, _groundLayers,
            QueryTriggerInteraction.Ignore);

        if (grounded) _velocity.y = -2f;
        else _velocity.y += _gravity * Time.deltaTime;

        _controller.Move(_velocity * Time.deltaTime);
    }
}
```

## Rigidbody Rules

- Set `rb.freezeRotation = true` — physics must not rotate the player capsule
- Set `rb.interpolation = RigidbodyInterpolation.Interpolate` — prevents jitter on moving Rigidbodies
- Apply all forces in `FixedUpdate()`, read input in `Update()`
- Set `rb.linearDamping` (Unity 6 API, formerly `drag`) higher on ground, lower in air for responsive deceleration
- Use `ForceMode.Impulse` for jumps/knockback; `ForceMode.Acceleration` for mass-independent movement

## Input Integration

- Use the Input System package (`com.unity.inputsystem`) — never `Input.GetKey()` in new code
- Implement input callbacks via `PlayerInput` component with Send Messages or Invoke C# Events behavior
- Name callback methods `On` + action name: `OnMove(InputValue value)`, `OnJump(InputAction.CallbackContext ctx)`
- Store input values as fields; apply them in `Update()` or `FixedUpdate()` — never process movement inside the callback

## Camera

- Use Cinemachine for all camera management — never write raw camera follow code
- Cache `Camera.main` in `Awake()` — it performs a `FindWithTag` call internally on every access
- Use `CinemachineCamera` with Third Person Follow body for third-person cameras
- Enable `CinemachineDeoccluder` to prevent camera clipping through geometry
- Rotate input to camera-relative movement: `Quaternion.Euler(0, cameraY, 0) * inputDirection`

## First-Person Specifics

- Lock and hide cursor in `Awake()`: `Cursor.lockState = CursorLockMode.Locked; Cursor.visible = false`
- Clamp vertical look angle with `Mathf.Clamp(_xRotation, -85f, 85f)`
- Rotate the camera holder (child) for vertical look; rotate the player body for horizontal look

## 2D Platformer Specifics

- Use `Rigidbody2D` with `gravityScale` override — increase gravity multiplier when falling for snappier feel
- Cut vertical velocity on jump release: `rb.linearVelocity = new Vector2(vx, vy * _jumpCutMultiplier)`
- Use `Physics2D.OverlapBox()` at the feet transform for ground detection

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Physics movement in `Update()` | Use `FixedUpdate()` for `Rigidbody` operations |
| `Transform.Translate` with `Rigidbody` | Use `rb.MovePosition()` or `AddForce()` |
| Unfrozen `Rigidbody` rotation | Set `rb.freezeRotation = true` |
| `Camera.main` in `Update()` | Cache reference in `Awake()` |
| No Rigidbody interpolation | Set `interpolation = Interpolate` |
| Hardcoded input (`Input.GetKey`) | Use Input System package |
| No coyote time | Missed jumps at ledge edges feel unfair |

## Best Practices

- Always multiply movement by `Time.deltaTime` (Update) or `Time.fixedDeltaTime` (FixedUpdate)
- Use `[RequireComponent]` to enforce `CharacterController` or `Rigidbody` dependency
- Draw ground-check sphere with `OnDrawGizmosSelected()` for visual debugging
- Separate acceleration from target speed — use `Mathf.MoveTowards` for smooth start/stop
- Use layers for ground detection — never use tags for physics layer checks
- Implement sprint as a speed multiplier, not a separate movement path
