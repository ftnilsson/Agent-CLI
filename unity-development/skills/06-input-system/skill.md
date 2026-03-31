# Input System

## Setup

- Install `com.unity.inputsystem` via Package Manager
- Set Active Input Handling to "Input System Package (New)" in Player Settings — never "Both" unless migrating legacy code
- Create one `PlayerInputActions.inputactions` asset for the project
- Enable "Generate C# Class" on the asset for compile-time safe access to actions and maps

## Input Action Asset Structure

- Create action maps by input context: `Player`, `UI`, `Vehicle`, `Cinematic`
- Define `Move` and `Look` as `[Value, Vector2]`; define `Jump`, `Fire`, `Interact` as `[Button]`
- Add `WASD` as a 2D Composite and `Left Stick / Gamepad` as a second binding on `Move`
- Add `Mouse Delta` and `Right Stick` as bindings on `Look`
- Apply `StickDeadzone` processor to all stick bindings to prevent controller drift
- Apply `NormalizeVector2` to movement composites for consistent diagonal speed

## PlayerInput Component

- Add `PlayerInput` to the player GameObject; assign the `PlayerInputActions` asset; set Default Map to "Player"
- Use **Send Messages** behavior for single-player — Unity calls `OnMove(InputValue)`, `OnJump(InputValue)` automatically
- Use **Invoke C# Events** behavior when you need finer control over subscription lifetime
- Use **Invoke Unity Events** for designer-wired connections in the Inspector

```csharp
public class PlayerMovement : MonoBehaviour
{
    private Vector2 _moveInput;

    public void OnMove(InputValue value) => _moveInput = value.Get<Vector2>();

    public void OnJump(InputValue value)
    {
        if (value.isPressed) Jump();
    }
}
```

## Direct Action Reference Approach

- Use `[SerializeField] private InputActionReference _moveRef` for serialized action references
- Enable actions in `OnEnable()`, disable in `OnDisable()` — never leave actions permanently enabled
- Subscribe to `action.performed` for button press; `action.canceled` for button release
- Dispose the generated input class instance in `OnDestroy()` to prevent leaks

## Generated C# Class Approach

- Instantiate once in `Awake()`: `_input = new PlayerInputActions()`
- Enable per-map: `_input.Player.Enable()`
- Access values per-frame: `_input.Player.Move.ReadValue<Vector2>()`
- Dispose in `OnDestroy()`: `_input?.Dispose()`

## Action Map Switching

- Switch context with `playerInput.SwitchCurrentActionMap("UI")` on menu open; restore `"Player"` on close
- Lock cursor on gameplay: `Cursor.lockState = CursorLockMode.Locked`; unlock on menus: `CursorLockMode.None`

## Interactions and Processors

- Add `Hold` interaction on a binding for charge attacks — fires `performed` after hold duration
- Add `MultiTap` interaction for double-tap dodge — configure tap count and max tap spacing
- Add `InvertVector2` processor on Look Y-axis for users who prefer inverted look
- Add `ScaleVector2` processor as a sensitivity multiplier — expose the scale value as a setting

## Input Rebinding

- Use `action.PerformInteractiveRebinding(bindingIndex)` for runtime remapping
- Exclude `<Mouse>/position` and `<Mouse>/delta` from rebinding to prevent accidental mouse binding
- Allow cancellation via `.WithCancelingThrough("<Keyboard>/escape")`
- Save overrides with `asset.SaveBindingOverridesAsJson()` and restore with `LoadBindingOverridesFromJson()`
- Always call `operation.Dispose()` in both `OnComplete` and `OnCancel` callbacks

## Local Multiplayer

- Add `PlayerInputManager` to manage multi-player device assignment
- Set Join Behavior to "Join Players When Join Action Is Triggered"
- Subscribe to `OnPlayerJoined(PlayerInput)` via Send Messages on the manager object
- Assign per-player spawn points and colors in `OnPlayerJoined` using `playerInput.playerIndex`

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| `Input.GetKey()` / `Input.GetAxis()` | Use Input System package |
| Forgetting to enable actions | Enable in `OnEnable()`, or use `PlayerInput` component |
| Not unsubscribing from action events | Unsubscribe in `OnDisable()` |
| Reading input in `FixedUpdate()` | Read in `Update()`, apply physics in `FixedUpdate()` |
| Not disposing `RebindingOperation` | Call `Dispose()` in OnComplete and OnCancel |
| No dead zone on sticks | Phantom drift input from controller hardware |

## Best Practices

- Use `InputActionReference` for serialized references — survives asset reimports better than direct references
- Define "Keyboard&Mouse" and "Gamepad" control schemes for automatic device switching
- Test with a physical gamepad connected — verify switching, deadzones, and UI navigation
- Use `InputControlPath.ToHumanReadableString()` to display binding names in rebinding UI
- Handle all three callback phases where needed: `started`, `performed`, `canceled`
