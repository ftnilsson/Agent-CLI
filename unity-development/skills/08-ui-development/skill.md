# UI Development

## Canvas Setup

- Set `CanvasScaler` to **Scale With Screen Size**, Reference Resolution `1920×1080`, Screen Match Mode `Match Width Or Height`, Match `0.5`
- Use **Screen Space - Overlay** for HUD and menus; **World Space** for floating health bars and in-world screens
- Split UI into multiple canvases by update frequency — a single canvas redraws everything when any element changes
- Place exactly one `EventSystem` in the persistent `_Core` scene — duplicate EventSystems break all input

## Layout

- Set anchors on every RectTransform relative to the intended screen region — never use pixel-perfect positions without anchors
- Use `VerticalLayoutGroup` / `HorizontalLayoutGroup` / `GridLayoutGroup` for dynamic lists — never manually position children
- Add `ContentSizeFitter` to text elements and containers that must grow with content
- Disable `Raycast Target` on all non-interactive Image and Text components — reduces raycasting cost every frame

## TextMeshPro

- Use `TMP_Text` exclusively — never use the legacy `Text` component
- Reference TextMeshPro components as `[SerializeField] private TMP_Text _label`
- Use rich text tags for inline styling: `<color=#FFD700>Gold</color>`, `<b>Bold</b>`, `<size=150%>Large</size>`
- Set `Raycast Target = false` on all TMP labels that are display-only

## Buttons and Interactables

```csharp
public class MainMenuUI : MonoBehaviour
{
    [SerializeField] private Button _playButton;
    [SerializeField] private Button _quitButton;

    private void OnEnable()
    {
        _playButton.onClick.AddListener(OnPlay);
        _quitButton.onClick.AddListener(OnQuit);
    }

    private void OnDisable()
    {
        _playButton.onClick.RemoveListener(OnPlay);
        _quitButton.onClick.RemoveListener(OnQuit);
    }

    private void OnPlay() { /* load game */ }
    private void OnQuit()
    {
        #if UNITY_EDITOR
        UnityEditor.EditorApplication.isPlaying = false;
        #else
        Application.Quit();
        #endif
    }
}
```

- Subscribe to `button.onClick.AddListener()` in `OnEnable()` and remove in `OnDisable()` — never leave persistent listeners from code
- Use `CanvasGroup.interactable` to enable/disable entire panels rather than toggling individual buttons

## Health Bars and Sliders

- Drive slider value via `SetHealth(float current, float max)` — compute normalized value inside the method
- Use `Mathf.Lerp(_slider.value, _targetValue, _lerpSpeed * Time.deltaTime)` for smooth visual response
- Use a `Gradient` evaluated by `slider.value` to tint the fill color red-to-green automatically

## World Space UI

- Set the Canvas Render Mode to **World Space**; manually set Canvas width/height to match the sprite scale
- Update world-space canvas position in `LateUpdate()` so it runs after all character movement
- Use `transform.forward = camera.transform.forward` to billboard the canvas toward the camera

## Panel Management

- Implement a panel stack: `ShowPanel(panel)` pushes current to stack; `GoBack()` pops and restores
- Animate panels with `CanvasGroup` alpha fades using `Time.unscaledDeltaTime` — paused games (`timeScale = 0`) must still animate menus
- Call `gameObject.SetActive(false)` after fade-out completes, not before, to prevent disappearing mid-animation

## Safe Area Handling

- Apply `Screen.safeArea` to the root container `RectTransform` for mobile devices with notches or rounded corners
- Reapply when `Screen.safeArea` changes — device orientation changes it

## UI Toolkit

- Use UI Toolkit for Editor tools, settings screens, and text-heavy interfaces
- Query elements by name: `root.Q<Button>("play-button")`
- Subscribe to `button.clicked` in `OnEnable()` and unsubscribe in `OnDisable()`
- Use USS stylesheets for all visual styling — avoid inline styles in UXML
- Use USS transitions (`transition-duration: 0.2s`) for hover and active states instead of code

## Sprite Atlases

- Create a Sprite Atlas for all UI sprites used on the same canvas — reduces draw calls by batching multiple sprites into one texture sample

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Legacy `Text` component | Always use `TMP_Text` |
| `Raycast Target` enabled on all images | Disable on non-interactive elements |
| Single canvas for all UI | Split by update frequency |
| `RectTransform.position =` for UI animation | Use `anchoredPosition` |
| `Time.deltaTime` in paused menus | Use `Time.unscaledDeltaTime` |
| Duplicate `EventSystem` components | Keep exactly one in `_Core` scene |
| No Safe Area handling on mobile | UI clips behind notches and rounded corners |

## Best Practices

- Pool dynamic UI elements: damage numbers, notification toasts, list items
- Use `Canvas.ForceUpdateCanvases()` only when immediate layout recalculation is required — it is expensive
- Keep canvas hierarchy as flat as possible — deep nesting increases layout recalculation overhead
- Use a Sprite Atlas for icons shared across inventory, ability bar, and shop panels
