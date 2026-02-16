# Player Controller

## Description

This skill covers implementing player character controllers in Unity — from basic movement and jumping to full first-person and third-person camera systems. It addresses both CharacterController-based and Rigidbody-based approaches, covering ground detection, slope handling, gravity, and integration with the new Input System and Cinemachine.

## When To Use

- Creating a player character that moves in 2D or 3D space
- Implementing jumping, sprinting, crouching, or dashing mechanics
- Building first-person or third-person camera systems
- Choosing between CharacterController and Rigidbody for movement
- Integrating player movement with the new Input System
- Setting up Cinemachine camera follow and look-at behavior

## Prerequisites

- Unity 6 (6000.x) with URP
- Packages: `com.unity.inputsystem`, `com.unity.cinemachine`
- [02 — C# Scripting](../02-CSharp-Scripting/skill.md) fundamentals
- [06 — Input System](../06-Input-System/skill.md) recommended

## Instructions

### 1. Choosing a Movement Approach

| Approach | Best For | Pros | Cons |
|----------|----------|------|------|
| **CharacterController** | Platformers, FPS, precise control | Precise, no physics jitter, built-in slopes/steps | No physics interactions, must implement gravity manually |
| **Rigidbody (Dynamic)** | Physics-heavy games, vehicles | Full physics interactions, forces, collisions | Can feel floaty, requires tuning, physics-driven |
| **Rigidbody (Kinematic)** | Custom physics, networking | Full control with collision detection | Must handle all movement manually |
| **Transform-based** | 2D top-down, simple prototypes | Simplest to implement | No collision, no physics |

### 2. CharacterController — Third-Person Controller

```csharp
using UnityEngine;
using UnityEngine.InputSystem;

[RequireComponent(typeof(CharacterController))]
public class ThirdPersonController : MonoBehaviour
{
    [Header("Movement")]
    [SerializeField] private float _walkSpeed = 4f;
    [SerializeField] private float _sprintSpeed = 7f;
    [SerializeField] private float _rotationSpeed = 10f;
    [SerializeField] private float _acceleration = 10f;
    
    [Header("Jumping")]
    [SerializeField] private float _jumpHeight = 1.2f;
    [SerializeField] private float _gravity = -20f;
    [SerializeField] private float _coyoteTime = 0.15f;
    [SerializeField] private float _jumpBufferTime = 0.1f;
    
    [Header("Ground Check")]
    [SerializeField] private float _groundCheckRadius = 0.3f;
    [SerializeField] private float _groundCheckOffset = -0.1f;
    [SerializeField] private LayerMask _groundLayers;
    
    [Header("Slopes")]
    [SerializeField] private float _slopeSlideSpeed = 5f;
    
    [Header("Camera")]
    [SerializeField] private Transform _cameraTarget;
    
    // Components
    private CharacterController _controller;
    private Transform _mainCamera;
    
    // State
    private Vector3 _velocity;
    private Vector2 _moveInput;
    private float _currentSpeed;
    private float _targetSpeed;
    private bool _isGrounded;
    private bool _isSprinting;
    private float _lastGroundedTime;
    private float _lastJumpPressedTime;
    private bool _jumpConsumed;
    
    private void Awake()
    {
        _controller = GetComponent<CharacterController>();
        _mainCamera = Camera.main.transform;
    }
    
    private void Update()
    {
        GroundCheck();
        ApplyGravity();
        HandleJump();
        HandleMovement();
    }
    
    // --- Input Callbacks (called by PlayerInput component) ---
    
    public void OnMove(InputAction.CallbackContext context)
    {
        _moveInput = context.ReadValue<Vector2>();
    }
    
    public void OnJump(InputAction.CallbackContext context)
    {
        if (context.started)
        {
            _lastJumpPressedTime = Time.time;
            _jumpConsumed = false;
        }
    }
    
    public void OnSprint(InputAction.CallbackContext context)
    {
        _isSprinting = context.ReadValueAsButton();
    }
    
    // --- Core Logic ---
    
    private void GroundCheck()
    {
        Vector3 spherePos = transform.position + Vector3.up * _groundCheckOffset;
        _isGrounded = Physics.CheckSphere(spherePos, _groundCheckRadius, _groundLayers, 
            QueryTriggerInteraction.Ignore);
        
        if (_isGrounded)
        {
            _lastGroundedTime = Time.time;
        }
    }
    
    private void ApplyGravity()
    {
        if (_isGrounded && _velocity.y < 0f)
        {
            // Small negative value keeps the controller grounded on slopes
            _velocity.y = -2f;
        }
        else
        {
            _velocity.y += _gravity * Time.deltaTime;
        }
    }
    
    private void HandleJump()
    {
        // Coyote time: allow jumping shortly after leaving ground
        bool canCoyoteJump = (Time.time - _lastGroundedTime) < _coyoteTime;
        // Jump buffer: remember jump press for a short window
        bool hasBufferedJump = (Time.time - _lastJumpPressedTime) < _jumpBufferTime;
        
        if (hasBufferedJump && canCoyoteJump && !_jumpConsumed)
        {
            // v = sqrt(2 * |gravity| * height)
            _velocity.y = Mathf.Sqrt(2f * Mathf.Abs(_gravity) * _jumpHeight);
            _jumpConsumed = true;
            _lastGroundedTime = -1f; // Prevent double jump via coyote
        }
    }
    
    private void HandleMovement()
    {
        // Calculate camera-relative direction
        Vector3 inputDirection = new Vector3(_moveInput.x, 0f, _moveInput.y).normalized;
        
        if (inputDirection.sqrMagnitude > 0.01f)
        {
            // Rotate input to be relative to camera
            float targetAngle = Mathf.Atan2(inputDirection.x, inputDirection.z) * Mathf.Rad2Deg
                                + _mainCamera.eulerAngles.y;
            
            // Smooth rotation
            float angle = Mathf.LerpAngle(transform.eulerAngles.y, targetAngle, 
                _rotationSpeed * Time.deltaTime);
            transform.rotation = Quaternion.Euler(0f, angle, 0f);
            
            // Movement direction after rotation
            Vector3 moveDir = Quaternion.Euler(0f, targetAngle, 0f) * Vector3.forward;
            
            // Speed with acceleration
            _targetSpeed = _isSprinting ? _sprintSpeed : _walkSpeed;
            _currentSpeed = Mathf.MoveTowards(_currentSpeed, _targetSpeed, 
                _acceleration * Time.deltaTime);
            
            _controller.Move(moveDir * _currentSpeed * Time.deltaTime 
                             + Vector3.up * _velocity.y * Time.deltaTime);
        }
        else
        {
            // Decelerate
            _currentSpeed = Mathf.MoveTowards(_currentSpeed, 0f, _acceleration * Time.deltaTime);
            _controller.Move(Vector3.up * _velocity.y * Time.deltaTime);
        }
    }
    
    // --- Debug ---
    
    private void OnDrawGizmosSelected()
    {
        Gizmos.color = _isGrounded ? Color.green : Color.red;
        Vector3 spherePos = transform.position + Vector3.up * _groundCheckOffset;
        Gizmos.DrawWireSphere(spherePos, _groundCheckRadius);
    }
}
```

### 3. Rigidbody-Based Controller (Physics interactions)

```csharp
using UnityEngine;
using UnityEngine.InputSystem;

[RequireComponent(typeof(Rigidbody))]
[RequireComponent(typeof(CapsuleCollider))]
public class RigidbodyPlayerController : MonoBehaviour
{
    [Header("Movement")]
    [SerializeField] private float _moveSpeed = 6f;
    [SerializeField] private float _sprintMultiplier = 1.5f;
    [SerializeField] private float _movementSharpness = 15f;
    
    [Header("Jumping")]
    [SerializeField] private float _jumpForce = 8f;
    [SerializeField] private float _coyoteTime = 0.12f;
    
    [Header("Ground Detection")]
    [SerializeField] private float _groundCheckDistance = 0.15f;
    [SerializeField] private LayerMask _groundMask;
    
    [Header("Drag")]
    [SerializeField] private float _groundDrag = 6f;
    [SerializeField] private float _airDrag = 1f;
    [SerializeField] private float _airControlMultiplier = 0.4f;
    
    private Rigidbody _rb;
    private CapsuleCollider _capsule;
    private Transform _cameraTransform;
    
    private Vector2 _moveInput;
    private bool _jumpRequested;
    private bool _isSprinting;
    private bool _isGrounded;
    private float _lastGroundedTime;
    
    private void Awake()
    {
        _rb = GetComponent<Rigidbody>();
        _capsule = GetComponent<CapsuleCollider>();
        _cameraTransform = Camera.main.transform;
        
        _rb.freezeRotation = true; // Prevent physics from rotating the player
        _rb.interpolation = RigidbodyInterpolation.Interpolate;
    }
    
    private void Update()
    {
        CheckGround();
        _rb.linearDamping = _isGrounded ? _groundDrag : _airDrag;
    }
    
    private void FixedUpdate()
    {
        MovePlayer();
        
        if (_jumpRequested && (Time.time - _lastGroundedTime) < _coyoteTime)
        {
            _rb.linearVelocity = new Vector3(_rb.linearVelocity.x, 0f, _rb.linearVelocity.z);
            _rb.AddForce(Vector3.up * _jumpForce, ForceMode.Impulse);
            _jumpRequested = false;
            _lastGroundedTime = -1f;
        }
    }
    
    // --- Input ---
    
    public void OnMove(InputAction.CallbackContext ctx) => _moveInput = ctx.ReadValue<Vector2>();
    public void OnJump(InputAction.CallbackContext ctx)
    {
        if (ctx.started) _jumpRequested = true;
    }
    public void OnSprint(InputAction.CallbackContext ctx) => _isSprinting = ctx.ReadValueAsButton();
    
    // --- Core ---
    
    private void CheckGround()
    {
        Vector3 origin = transform.position + Vector3.up * (_capsule.radius);
        _isGrounded = Physics.SphereCast(origin, _capsule.radius * 0.9f, Vector3.down, 
            out _, _groundCheckDistance + _capsule.radius, _groundMask, 
            QueryTriggerInteraction.Ignore);
        
        if (_isGrounded)
            _lastGroundedTime = Time.time;
    }
    
    private void MovePlayer()
    {
        // Camera-relative movement
        Vector3 forward = _cameraTransform.forward;
        Vector3 right = _cameraTransform.right;
        forward.y = 0f;
        right.y = 0f;
        forward.Normalize();
        right.Normalize();
        
        Vector3 desiredDirection = (forward * _moveInput.y + right * _moveInput.x).normalized;
        float speed = _moveSpeed * (_isSprinting ? _sprintMultiplier : 1f);
        Vector3 targetVelocity = desiredDirection * speed;
        
        // Apply air control reduction
        float control = _isGrounded ? 1f : _airControlMultiplier;
        
        // Smoothly interpolate toward target velocity (horizontal only)
        Vector3 currentHorizontal = new Vector3(_rb.linearVelocity.x, 0f, _rb.linearVelocity.z);
        Vector3 velocityChange = (targetVelocity - currentHorizontal) * _movementSharpness * control;
        
        _rb.AddForce(velocityChange, ForceMode.Acceleration);
    }
}
```

### 4. First-Person Controller

```csharp
using UnityEngine;
using UnityEngine.InputSystem;

[RequireComponent(typeof(CharacterController))]
public class FirstPersonController : MonoBehaviour
{
    [Header("Movement")]
    [SerializeField] private float _walkSpeed = 5f;
    [SerializeField] private float _sprintSpeed = 8f;
    
    [Header("Look")]
    [SerializeField] private float _mouseSensitivity = 2f;
    [SerializeField] private float _maxLookUp = 85f;
    [SerializeField] private float _maxLookDown = -85f;
    [SerializeField] private Transform _cameraHolder;
    
    [Header("Jump & Gravity")]
    [SerializeField] private float _jumpHeight = 1.2f;
    [SerializeField] private float _gravity = -20f;
    
    [Header("Head Bob")]
    [SerializeField] private bool _enableHeadBob = true;
    [SerializeField] private float _bobFrequency = 8f;
    [SerializeField] private float _bobAmplitude = 0.05f;
    
    private CharacterController _controller;
    private Vector2 _moveInput;
    private Vector2 _lookInput;
    private float _verticalVelocity;
    private float _xRotation;
    private float _bobTimer;
    private Vector3 _cameraDefaultPos;
    
    private void Awake()
    {
        _controller = GetComponent<CharacterController>();
        _cameraDefaultPos = _cameraHolder.localPosition;
        
        Cursor.lockState = CursorLockMode.Locked;
        Cursor.visible = false;
    }
    
    private void Update()
    {
        HandleLook();
        HandleMovement();
        
        if (_enableHeadBob)
            HandleHeadBob();
    }
    
    public void OnMove(InputAction.CallbackContext ctx) => _moveInput = ctx.ReadValue<Vector2>();
    public void OnLook(InputAction.CallbackContext ctx) => _lookInput = ctx.ReadValue<Vector2>();
    public void OnJump(InputAction.CallbackContext ctx)
    {
        if (ctx.started && _controller.isGrounded)
            _verticalVelocity = Mathf.Sqrt(2f * Mathf.Abs(_gravity) * _jumpHeight);
    }
    
    private void HandleLook()
    {
        float mouseX = _lookInput.x * _mouseSensitivity;
        float mouseY = _lookInput.y * _mouseSensitivity;
        
        _xRotation -= mouseY;
        _xRotation = Mathf.Clamp(_xRotation, _maxLookDown, _maxLookUp);
        
        _cameraHolder.localRotation = Quaternion.Euler(_xRotation, 0f, 0f);
        transform.Rotate(Vector3.up * mouseX);
    }
    
    private void HandleMovement()
    {
        if (_controller.isGrounded && _verticalVelocity < 0f)
            _verticalVelocity = -2f;
        
        _verticalVelocity += _gravity * Time.deltaTime;
        
        Vector3 move = transform.right * _moveInput.x + transform.forward * _moveInput.y;
        float speed = _walkSpeed; // Add sprint check here
        
        _controller.Move((move * speed + Vector3.up * _verticalVelocity) * Time.deltaTime);
    }
    
    private void HandleHeadBob()
    {
        if (!_controller.isGrounded || _moveInput.sqrMagnitude < 0.01f)
        {
            _bobTimer = 0f;
            _cameraHolder.localPosition = Vector3.Lerp(
                _cameraHolder.localPosition, _cameraDefaultPos, Time.deltaTime * 5f);
            return;
        }
        
        _bobTimer += Time.deltaTime * _bobFrequency;
        float bobOffsetY = Mathf.Sin(_bobTimer) * _bobAmplitude;
        float bobOffsetX = Mathf.Sin(_bobTimer * 0.5f) * _bobAmplitude * 0.5f;
        
        _cameraHolder.localPosition = _cameraDefaultPos 
            + new Vector3(bobOffsetX, bobOffsetY, 0f);
    }
}
```

### 5. 2D Platformer Controller

```csharp
using UnityEngine;
using UnityEngine.InputSystem;

[RequireComponent(typeof(Rigidbody2D))]
public class PlatformerController2D : MonoBehaviour
{
    [Header("Movement")]
    [SerializeField] private float _moveSpeed = 8f;
    [SerializeField] private float _acceleration = 50f;
    [SerializeField] private float _deceleration = 50f;
    [SerializeField] private float _airAcceleration = 30f;
    
    [Header("Jumping")]
    [SerializeField] private float _jumpForce = 14f;
    [SerializeField] private float _coyoteTime = 0.1f;
    [SerializeField] private float _jumpBufferTime = 0.1f;
    [SerializeField] private float _jumpCutMultiplier = 0.5f;
    [SerializeField] private float _fallGravityMultiplier = 1.5f;
    
    [Header("Ground Check")]
    [SerializeField] private Transform _groundCheckPoint;
    [SerializeField] private Vector2 _groundCheckSize = new(0.5f, 0.05f);
    [SerializeField] private LayerMask _groundLayer;
    
    private Rigidbody2D _rb;
    private float _moveInput;
    private bool _isGrounded;
    private float _lastGroundedTime;
    private float _lastJumpPressedTime;
    private bool _isJumping;
    private float _defaultGravity;
    
    private void Awake()
    {
        _rb = GetComponent<Rigidbody2D>();
        _defaultGravity = _rb.gravityScale;
    }
    
    private void Update()
    {
        // Ground check
        _isGrounded = Physics2D.OverlapBox(
            _groundCheckPoint.position, _groundCheckSize, 0f, _groundLayer);
        
        if (_isGrounded)
        {
            _lastGroundedTime = Time.time;
            _isJumping = false;
        }
        
        // Jump buffer
        bool canJump = (Time.time - _lastGroundedTime) < _coyoteTime;
        bool hasBufferedJump = (Time.time - _lastJumpPressedTime) < _jumpBufferTime;
        
        if (hasBufferedJump && canJump && !_isJumping)
        {
            _rb.linearVelocity = new Vector2(_rb.linearVelocity.x, _jumpForce);
            _isJumping = true;
            _lastGroundedTime = -1f;
            _lastJumpPressedTime = -1f;
        }
        
        // Variable jump height — heavier gravity when falling or when jump released early
        if (_rb.linearVelocity.y < 0f)
        {
            _rb.gravityScale = _defaultGravity * _fallGravityMultiplier;
        }
        else
        {
            _rb.gravityScale = _defaultGravity;
        }
    }
    
    private void FixedUpdate()
    {
        float accel = _isGrounded ? _acceleration : _airAcceleration;
        float targetSpeed = _moveInput * _moveSpeed;
        float speedDiff = targetSpeed - _rb.linearVelocity.x;
        float rate = (Mathf.Abs(targetSpeed) > 0.01f) ? accel : _deceleration;
        float force = speedDiff * rate;
        
        _rb.AddForce(Vector2.right * force);
        
        // Flip sprite
        if (Mathf.Abs(_moveInput) > 0.01f)
        {
            transform.localScale = new Vector3(Mathf.Sign(_moveInput), 1f, 1f);
        }
    }
    
    // --- Input ---
    
    public void OnMove(InputAction.CallbackContext ctx) => _moveInput = ctx.ReadValue<Vector2>().x;
    
    public void OnJump(InputAction.CallbackContext ctx)
    {
        if (ctx.started)
            _lastJumpPressedTime = Time.time;
        
        // Variable jump height: cut velocity on release
        if (ctx.canceled && _rb.linearVelocity.y > 0f)
            _rb.linearVelocity = new Vector2(_rb.linearVelocity.x, 
                _rb.linearVelocity.y * _jumpCutMultiplier);
    }
    
    private void OnDrawGizmosSelected()
    {
        if (_groundCheckPoint == null) return;
        Gizmos.color = Color.red;
        Gizmos.DrawWireCube(_groundCheckPoint.position, _groundCheckSize);
    }
}
```

### 6. Cinemachine Camera Setup

#### Third-Person Follow Camera

Set up in the scene:

1. **Create → Cinemachine → Third Person Follow Camera** (or `CinemachineCamera` in Unity 6).
2. Set **Follow** to the player's `CameraTarget` transform (child of the character above the head).
3. Set **Look At** to the player's `CameraTarget` transform.
4. Configure the **Third Person Follow** body component:
   - Shoulder Offset: `(0.5, 0, 0)` for over-the-shoulder, `(0, 0, 0)` for centered
   - Camera Distance: `4`
   - Camera Side: `0.5`
   - Damping: `(0.1, 0.25, 0.3)`

#### Cinemachine Input Provider (Unity 6+)

Cinemachine reads input automatically via `CinemachineInputAxisController`. Assign the Input Action references for X/Y look axes.

#### Camera Collision

Enable **Cinemachine Deoccluder** (previously CinemachineCollider) component on the virtual camera:
- Strategy: Pull Camera Forward
- Collision Filter: Set appropriate layer mask
- Damping: `0.2`

### 7. Advanced Movement Features

#### Dash / Dodge

```csharp
[Header("Dash")]
[SerializeField] private float _dashDistance = 5f;
[SerializeField] private float _dashDuration = 0.2f;
[SerializeField] private float _dashCooldown = 1f;

private float _lastDashTime = -Mathf.Infinity;
private bool _isDashing;

public void OnDash(InputAction.CallbackContext ctx)
{
    if (!ctx.started) return;
    if (Time.time - _lastDashTime < _dashCooldown) return;
    
    StartCoroutine(DashRoutine());
}

private IEnumerator DashRoutine()
{
    _isDashing = true;
    _lastDashTime = Time.time;
    
    Vector3 dashDir = transform.forward;
    float elapsed = 0f;
    float speed = _dashDistance / _dashDuration;
    
    while (elapsed < _dashDuration)
    {
        _controller.Move(dashDir * speed * Time.deltaTime);
        elapsed += Time.deltaTime;
        yield return null;
    }
    
    _isDashing = false;
}
```

## Best Practices

1. **Always use `Time.deltaTime`** (or `Time.fixedDeltaTime` in FixedUpdate) for framerate-independent movement.
2. **Cache `Camera.main`** — it calls `FindGameObjectWithTag` internally (expensive every frame).
3. **Use Cinemachine** for camera management — don't write raw camera following code.
4. **Implement coyote time and jump buffering** for responsive platforming.
5. **Use layers for ground detection** — never rely on tags for physics checks.
6. **Separate input reading from movement logic** — input in `Update()`, physics movement in `FixedUpdate()`.
7. **Use `[RequireComponent]`** to enforce dependencies (CharacterController, Rigidbody).
8. **Draw Gizmos** for debug visualization of ground checks, raycasts, and collision info.

## Common Pitfalls

| Pitfall | Why It Hurts | Fix |
|---------|-------------|-----|
| Physics movement in `Update()` | Inconsistent behavior at different frame rates | Use `FixedUpdate()` for Rigidbody movement |
| Not freezing Rigidbody rotation | Player tumbles on collision | Set `freezeRotation = true` |
| Using `Transform.Translate` with Rigidbody | Teleports past colliders | Use `Rigidbody.MovePosition` or `AddForce` |
| Calling `Camera.main` every frame | Performance overhead from internal `FindWithTag` | Cache in `Awake()` |
| No interpolation on Rigidbody | Jittery visual movement | Set `interpolation = Interpolate` |
| Hardcoded input (`Input.GetKey`) | Can't remap, not testable | Use the new Input System |
| No coyote time | Frustrating missed jumps at ledge edges | Implement coyote time buffer |

## Reference

- [Unity Manual — CharacterController](https://docs.unity3d.com/ScriptReference/CharacterController.html)
- [Unity Manual — Rigidbody](https://docs.unity3d.com/ScriptReference/Rigidbody.html)
- [Cinemachine Documentation](https://docs.unity3d.com/Packages/com.unity.cinemachine@latest)
- [Unity Input System](https://docs.unity3d.com/Packages/com.unity.inputsystem@latest)
