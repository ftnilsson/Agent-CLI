# Input System

## Description

This skill covers Unity's new Input System package — the modern replacement for the legacy `Input` class. It provides action-based input handling with support for multiple devices, rebinding, composite bindings, processor stacks, and interaction patterns. The new Input System decouples game actions from physical inputs, enabling seamless controller/keyboard switching, accessible remapping, and local multiplayer.

## When To Use

- Setting up player controls for any new Unity project
- Supporting multiple input devices (keyboard, gamepad, touch, XR)
- Implementing input rebinding UI for player customization
- Building local multiplayer with per-player device assignment
- Creating complex input interactions (hold, tap, multi-tap, slow-tap)
- Migrating from legacy `Input.GetKey` / `Input.GetAxis` code

## Prerequisites

- Unity 6 (6000.x)
- Package: `com.unity.inputsystem` (install via Package Manager)
- Set **Active Input Handling** to "Input System Package (New)" or "Both" in Player Settings
- [02 — C# Scripting](../02-CSharp-Scripting/skill.md) fundamentals

## Instructions

### 1. Core Concepts

| Concept | Description |
|---------|-------------|
| **Input Action Asset** | A `.inputactions` asset file containing all action maps, actions, and bindings |
| **Action Map** | A group of related actions (e.g., "Player", "UI", "Vehicle") |
| **Action** | A named game action (e.g., "Move", "Jump", "Fire") with a value type |
| **Binding** | Maps a physical input (key, button, stick) to an action |
| **Composite** | Combines multiple inputs into one value (e.g., WASD → Vector2) |
| **Interaction** | Modifies how an input triggers (Hold, Tap, SlowTap, MultiTap) |
| **Processor** | Transforms raw input values (DeadZone, Normalize, Invert, Scale) |

### 2. Create an Input Action Asset

1. **Right-click in Project** → Create → Input Actions.
2. Name it `PlayerInputActions`.
3. Double-click to open the Input Actions editor.

#### Recommended Action Maps

```
PlayerInputActions.inputactions
├── Player (Action Map)
│   ├── Move          [Value, Vector2]
│   │   ├── WASD (2D Composite)
│   │   │   ├── Up: W / Keyboard
│   │   │   ├── Down: S / Keyboard
│   │   │   ├── Left: A / Keyboard
│   │   │   └── Right: D / Keyboard
│   │   ├── Arrow Keys (2D Composite)
│   │   └── Left Stick / Gamepad
│   ├── Look          [Value, Vector2]
│   │   ├── Mouse Delta / Mouse
│   │   └── Right Stick / Gamepad
│   ├── Jump          [Button]
│   │   ├── Space / Keyboard
│   │   └── South Button / Gamepad
│   ├── Sprint        [Button]
│   │   ├── Left Shift / Keyboard
│   │   └── Left Trigger / Gamepad
│   ├── Fire          [Button]
│   │   ├── Left Mouse Button / Mouse
│   │   └── Right Trigger / Gamepad
│   ├── Interact      [Button]
│   │   ├── E / Keyboard
│   │   └── West Button / Gamepad
│   └── Pause         [Button]
│       ├── Escape / Keyboard
│       └── Start / Gamepad
├── UI (Action Map)
│   ├── Navigate      [Value, Vector2]
│   ├── Submit        [Button]
│   ├── Cancel        [Button]
│   └── Point         [Value, Vector2]
└── Vehicle (Action Map) — optional
    ├── Steer         [Value, float]
    ├── Accelerate    [Value, float]
    └── Brake         [Value, float]
```

> **Tip:** Enable "Generate C# Class" in the Input Actions asset Inspector. This generates a type-safe wrapper class with auto-complete support.

### 3. Using PlayerInput Component (Recommended for most games)

The `PlayerInput` component is the highest-level API. Add it to the player GameObject.

**Configuration:**
- **Actions:** Assign the `PlayerInputActions` asset
- **Default Map:** "Player"
- **Behavior:** Choose one:

| Behavior | Description | Best For |
|----------|-------------|----------|
| **Send Messages** | Calls `OnMove()`, `OnJump()` on the same GameObject | Simple single-player |
| **Broadcast Messages** | Calls methods on the GameObject and all children | Compound player objects |
| **Invoke Unity Events** | Wire up via Inspector (like Button.onClick) | Designer-friendly, visual |
| **Invoke C# Events** | Subscribe via `PlayerInput.onActionTriggered` | Programmer-friendly |

#### Send Messages / Broadcast Messages

Methods are called automatically based on action names:

```csharp
using UnityEngine;
using UnityEngine.InputSystem;

public class PlayerMovement : MonoBehaviour
{
    private Vector2 _moveInput;
    
    // Method name must be "On" + ActionName
    public void OnMove(InputValue value)
    {
        _moveInput = value.Get<Vector2>();
    }
    
    public void OnJump(InputValue value)
    {
        if (value.isPressed)
            Jump();
    }
    
    public void OnFire(InputValue value)
    {
        if (value.isPressed)
            Fire();
    }
}
```

#### Invoke Unity Events

Wire actions to methods in the Inspector:

```csharp
public class PlayerActions : MonoBehaviour
{
    // These methods are wired to PlayerInput events in the Inspector
    public void OnMove(InputAction.CallbackContext context)
    {
        Vector2 input = context.ReadValue<Vector2>();
    }
    
    public void OnJump(InputAction.CallbackContext context)
    {
        // context.started = button pressed
        // context.performed = interaction completed (default: same as started for buttons)
        // context.canceled = button released
        if (context.performed)
            Jump();
    }
}
```

#### Invoke C# Events

```csharp
public class PlayerController : MonoBehaviour
{
    private PlayerInput _playerInput;
    
    private void Awake()
    {
        _playerInput = GetComponent<PlayerInput>();
    }
    
    private void OnEnable()
    {
        _playerInput.onActionTriggered += HandleAction;
    }
    
    private void OnDisable()
    {
        _playerInput.onActionTriggered -= HandleAction;
    }
    
    private void HandleAction(InputAction.CallbackContext context)
    {
        switch (context.action.name)
        {
            case "Move":
                _moveInput = context.ReadValue<Vector2>();
                break;
            case "Jump":
                if (context.performed) Jump();
                break;
        }
    }
}
```

### 4. Direct Action References (No PlayerInput component)

For more control, reference actions directly without the `PlayerInput` component:

```csharp
using UnityEngine;
using UnityEngine.InputSystem;

public class DirectInputExample : MonoBehaviour
{
    [SerializeField] private InputActionReference _moveActionRef;
    [SerializeField] private InputActionReference _jumpActionRef;
    [SerializeField] private InputActionReference _fireActionRef;
    
    private InputAction _moveAction;
    private InputAction _jumpAction;
    private InputAction _fireAction;
    
    private void Awake()
    {
        _moveAction = _moveActionRef.action;
        _jumpAction = _jumpActionRef.action;
        _fireAction = _fireActionRef.action;
    }
    
    private void OnEnable()
    {
        _moveAction.Enable();
        _jumpAction.Enable();
        _fireAction.Enable();
        
        _jumpAction.performed += OnJump;
        _fireAction.performed += OnFire;
    }
    
    private void OnDisable()
    {
        _jumpAction.performed -= OnJump;
        _fireAction.performed -= OnFire;
        
        _moveAction.Disable();
        _jumpAction.Disable();
        _fireAction.Disable();
    }
    
    private void Update()
    {
        Vector2 move = _moveAction.ReadValue<Vector2>();
        // Apply movement...
    }
    
    private void OnJump(InputAction.CallbackContext ctx) { /* jump */ }
    private void OnFire(InputAction.CallbackContext ctx) { /* fire */ }
}
```

### 5. Generated C# Class Approach

Enable "Generate C# Class" on the Input Actions asset. This creates a type-safe class:

```csharp
public class GeneratedInputExample : MonoBehaviour
{
    private PlayerInputActions _input;
    
    private void Awake()
    {
        _input = new PlayerInputActions();
    }
    
    private void OnEnable()
    {
        _input.Player.Enable();
        _input.Player.Jump.performed += OnJump;
        _input.Player.Fire.performed += OnFire;
    }
    
    private void OnDisable()
    {
        _input.Player.Jump.performed -= OnJump;
        _input.Player.Fire.performed -= OnFire;
        _input.Player.Disable();
    }
    
    private void Update()
    {
        Vector2 move = _input.Player.Move.ReadValue<Vector2>();
    }
    
    private void OnJump(InputAction.CallbackContext ctx) { }
    private void OnFire(InputAction.CallbackContext ctx) { }
    
    private void OnDestroy()
    {
        _input?.Dispose();
    }
}
```

### 6. Switching Action Maps

Switch between Player and UI input contexts:

```csharp
public class InputMapSwitcher : MonoBehaviour
{
    private PlayerInput _playerInput;
    
    private void Awake()
    {
        _playerInput = GetComponent<PlayerInput>();
    }
    
    public void SwitchToUI()
    {
        _playerInput.SwitchCurrentActionMap("UI");
        Cursor.lockState = CursorLockMode.None;
        Cursor.visible = true;
    }
    
    public void SwitchToPlayer()
    {
        _playerInput.SwitchCurrentActionMap("Player");
        Cursor.lockState = CursorLockMode.Locked;
        Cursor.visible = false;
    }
}
```

### 7. Interactions and Processors

#### Interactions (configure in the Binding properties)

| Interaction | Behavior | Use Case |
|-------------|----------|----------|
| **Default** | Fires on press | Normal buttons |
| **Hold** | Fires after holding for N seconds | Charge attacks, context actions |
| **Tap** | Fires on quick press + release | Quick actions |
| **SlowTap** | Fires on slow press + release | Deliberate actions |
| **MultiTap** | Fires after N taps within time | Double-tap dodge |
| **Press** | Configure press/release behavior | Custom triggers |

#### Processors (transform raw values)

| Processor | Effect | Common Use |
|-----------|--------|------------|
| **StickDeadzone** | Ignore small stick movements | Prevent drift |
| **NormalizeVector2** | Normalize to unit length | Consistent diagonal speed |
| **InvertVector2** | Flip one or both axes | Invert Y look |
| **ScaleVector2** | Multiply axes | Sensitivity multiplier |
| **AxisDeadzone** | Deadzone for single axis | Trigger deadzones |
| **Clamp** | Clamp value to range | Limit input magnitude |

### 8. Input Rebinding

Allow players to remap controls at runtime:

```csharp
using UnityEngine;
using UnityEngine.InputSystem;
using TMPro;

public class RebindUI : MonoBehaviour
{
    [SerializeField] private InputActionReference _actionRef;
    [SerializeField] private int _bindingIndex = 0;
    [SerializeField] private TMP_Text _bindingText;
    [SerializeField] private GameObject _rebindOverlay;
    
    private InputActionRebindingExtensions.RebindingOperation _rebindOperation;
    
    private void Start()
    {
        UpdateBindingDisplay();
        LoadBindingOverride();
    }
    
    public void StartRebinding()
    {
        _actionRef.action.Disable();
        _rebindOverlay.SetActive(true);
        
        _rebindOperation = _actionRef.action.PerformInteractiveRebinding(_bindingIndex)
            .WithControlsExcluding("Mouse")          // Exclude mouse movement
            .WithCancelingThrough("<Keyboard>/escape") // Allow cancel
            .OnMatchWaitForAnother(0.1f)              // Debounce
            .OnComplete(operation =>
            {
                _rebindOverlay.SetActive(false);
                UpdateBindingDisplay();
                SaveBindingOverride();
                operation.Dispose();
                _actionRef.action.Enable();
            })
            .OnCancel(operation =>
            {
                _rebindOverlay.SetActive(false);
                operation.Dispose();
                _actionRef.action.Enable();
            })
            .Start();
    }
    
    private void UpdateBindingDisplay()
    {
        _bindingText.text = InputControlPath.ToHumanReadableString(
            _actionRef.action.bindings[_bindingIndex].effectivePath,
            InputControlPath.HumanReadableStringOptions.OmitDevice);
    }
    
    private void SaveBindingOverride()
    {
        string overrides = _actionRef.action.actionMap.asset.SaveBindingOverridesAsJson();
        PlayerPrefs.SetString("InputBindings", overrides);
    }
    
    private void LoadBindingOverride()
    {
        string overrides = PlayerPrefs.GetString("InputBindings", string.Empty);
        if (!string.IsNullOrEmpty(overrides))
        {
            _actionRef.action.actionMap.asset.LoadBindingOverridesFromJson(overrides);
            UpdateBindingDisplay();
        }
    }
    
    private void OnDestroy()
    {
        _rebindOperation?.Dispose();
    }
}
```

### 9. Local Multiplayer

The `PlayerInputManager` component handles automatic device assignment:

```csharp
using UnityEngine;
using UnityEngine.InputSystem;

public class LocalMultiplayerManager : MonoBehaviour
{
    // PlayerInputManager calls these via SendMessage
    
    private void OnPlayerJoined(PlayerInput playerInput)
    {
        int playerIndex = playerInput.playerIndex;
        Debug.Log($"Player {playerIndex} joined with {playerInput.currentControlScheme}");
        
        // Assign player color, spawn position, etc.
        var player = playerInput.GetComponent<PlayerSetup>();
        player.Initialize(playerIndex);
    }
    
    private void OnPlayerLeft(PlayerInput playerInput)
    {
        Debug.Log($"Player {playerInput.playerIndex} left");
    }
}
```

**PlayerInputManager settings:**
- **Join Behavior:** "Join Players When Button Is Pressed" or "Join Players When Join Action Is Triggered"
- **Player Prefab:** Assign the player prefab (must have `PlayerInput` component)
- **Max Player Count:** Set for your game (e.g., 4 for split-screen)
- **Joining Enabled By Default:** true for lobby screens

### 10. Touch Input

```csharp
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.EnhancedTouch;

public class TouchInputExample : MonoBehaviour
{
    private void OnEnable()
    {
        EnhancedTouchSupport.Enable();
        UnityEngine.InputSystem.EnhancedTouch.Touch.onFingerDown += OnFingerDown;
    }
    
    private void OnDisable()
    {
        UnityEngine.InputSystem.EnhancedTouch.Touch.onFingerDown -= OnFingerDown;
        EnhancedTouchSupport.Disable();
    }
    
    private void OnFingerDown(Finger finger)
    {
        Vector2 screenPos = finger.screenPosition;
        Debug.Log($"Touch at {screenPos}");
    }
}
```

## Best Practices

1. **Always use the new Input System** — legacy `Input.GetKey()` is deprecated and won't receive updates.
2. **Generate a C# class** from the Input Actions asset for compile-time safety.
3. **Use Action Maps** to separate input contexts (Player, UI, Vehicle, Menu).
4. **Enable/disable actions in `OnEnable`/`OnDisable`** — never leave actions permanently enabled.
5. **Dispose** the generated input class in `OnDestroy()` to prevent leaks.
6. **Add dead zones** to stick inputs — prevents phantom input from controller drift.
7. **Support multiple control schemes** — define "Keyboard&Mouse" and "Gamepad" schemes for automatic switching.
8. **Use `InputActionReference`** for serialized references — they survive asset reimport better than direct references.
9. **Save/load binding overrides** via JSON — persist player preferences across sessions.
10. **Test with multiple devices** — plug in a gamepad and verify switching works.

## Common Pitfalls

| Pitfall | Why It Hurts | Fix |
|---------|-------------|-----|
| Forgetting to enable actions | No input events fire | Enable in `OnEnable()`, or use `PlayerInput` component |
| Not unsubscribing from events | Memory leaks, errors after destroy | Always unsubscribe in `OnDisable()` |
| Reading input in `FixedUpdate()` | Missed button presses between fixed steps | Read in `Update()`, apply physics in `FixedUpdate()` |
| Not disposing `RebindingOperation` | Memory leak | Call `Dispose()` in `OnComplete`, `OnCancel`, and `OnDestroy` |
| Using both old and new Input Systems | Confusing behavior, double inputs | Set "Active Input Handling" to "Input System Package (New)" |
| Mixing `PlayerInput` with manual action enabling | Actions conflict, double-firing | Choose one approach per action map |
| Not handling `context.canceled` | Hold-to-sprint stays active after release | Check all three phases: started, performed, canceled |

## Reference

- [Unity Input System Manual](https://docs.unity3d.com/Packages/com.unity.inputsystem@latest)
- [Input System Quickstart](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.11/manual/QuickStartGuide.html)
- [Input Action Assets](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.11/manual/ActionAssets.html)
- [Interactive Rebinding](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.11/manual/ActionBindings.html#interactive-rebinding)
