# UI Development

## Description

This skill covers building user interfaces in Unity — from traditional Canvas/uGUI systems to the modern UI Toolkit. It includes HUD elements, menus, responsive layouts, data binding, localization-ready text, and accessible design. Good UI is the bridge between your game systems and the player.

## When To Use

- Building HUD elements (health bars, minimaps, ammo counters, quest trackers)
- Creating menu systems (main menu, pause menu, settings, inventory)
- Implementing responsive layouts that adapt to screen size and aspect ratio
- Building data-driven UI that updates from game state
- Adding screen-space or world-space UI (floating health bars, dialogue bubbles)
- Choosing between Canvas/uGUI and UI Toolkit for a new project

## Prerequisites

- Unity 6 (6000.x) with URP
- Package: `com.unity.textmeshpro` (included by default)
- [02 — C# Scripting](../02-CSharp-Scripting/skill.md) fundamentals
- [07 — ScriptableObjects](../07-ScriptableObjects/skill.md) for data binding patterns

## Instructions

### 1. Canvas System Overview

Unity's primary runtime UI system is Canvas-based (uGUI).

#### Canvas Render Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| **Screen Space - Overlay** | Renders on top of everything, resolution-independent | HUD, menus, popups |
| **Screen Space - Camera** | Rendered by a specific camera, supports post-processing | HUD with depth-of-field, particle integration |
| **World Space** | Canvas exists in 3D world space | Health bars above enemies, in-world screens, VR UI |

#### Canvas Setup

```
Canvas (Screen Space - Overlay)
├── CanvasScaler
│   ├── UI Scale Mode: Scale With Screen Size
│   ├── Reference Resolution: 1920 x 1080
│   ├── Screen Match Mode: Match Width Or Height
│   └── Match: 0.5 (balanced)
├── GraphicRaycaster
└── UI Elements...
```

> **Always use "Scale With Screen Size"** with a 1920×1080 reference resolution. This ensures your UI looks correct on any display.

### 2. Layout System

#### RectTransform Anchors

Anchors determine how a UI element responds to parent resizing:

```
Anchor Presets:
┌─────────────────────────────────┐
│ Top-Left    Top-Center   Top-R  │  ← Fixed corners
│                                 │
│ Mid-Left    Center      Mid-R   │  ← Centered elements
│                                 │
│ Bot-Left    Bot-Center   Bot-R  │  ← Fixed corners
│                                 │
│ Stretch-H   Stretch-V   Full    │  ← Responsive stretch
└─────────────────────────────────┘
```

| Anchor | Use Case |
|--------|----------|
| **Top-Left** | Minimap, player info |
| **Top-Center** | Timer, objective text |
| **Top-Right** | Score, currency |
| **Bottom-Center** | Action bar, abilities |
| **Bottom-Right** | Ammo counter |
| **Center** | Crosshair, popup dialogs |
| **Stretch** | Backgrounds, full-screen overlays |

#### Layout Groups

```csharp
// Automatic layout — use Layout Group components instead of manual positioning

// Vertical list (inventory, settings menu)
VerticalLayoutGroup:
  Padding: 10, 10, 10, 10
  Spacing: 5
  Child Alignment: Upper Center
  Child Force Expand Width: true
  Child Force Expand Height: false

// Horizontal bar (ability slots, toolbar)
HorizontalLayoutGroup:
  Spacing: 8
  Child Alignment: Middle Center

// Grid (inventory grid, level select)
GridLayoutGroup:
  Cell Size: 80 x 80
  Spacing: 4 x 4
  Constraint: Fixed Column Count = 6
```

#### Content Size Fitter

Automatically sizes elements to fit their content:

```
Text Element with ContentSizeFitter:
  Horizontal Fit: Preferred Size
  Vertical Fit: Preferred Size
  → Text box grows/shrinks to fit text content
```

### 3. Core UI Components

#### TextMeshPro (Always use TMP, never legacy Text)

```csharp
using TMPro;
using UnityEngine;

public class ScoreDisplay : MonoBehaviour
{
    [SerializeField] private TMP_Text _scoreText;
    [SerializeField] private TMP_Text _comboText;
    
    public void UpdateScore(int score)
    {
        _scoreText.text = $"Score: {score:N0}";  // "Score: 1,234"
    }
    
    public void ShowCombo(int combo)
    {
        // Rich text tags for styled text
        _comboText.text = $"<size=150%><color=#FFD700>{combo}x</color></size> COMBO!";
    }
}
```

**TMP Rich Text Tags:**
```
<b>Bold</b>
<i>Italic</i>
<color=#FF0000>Red Text</color>
<size=150%>Large</size>
<sprite name="coin"> Inline sprites
<link="url">Clickable</link>
<mark=#FFFF00AA>Highlighted</mark>
```

#### Buttons

```csharp
using UnityEngine;
using UnityEngine.UI;

public class MainMenuUI : MonoBehaviour
{
    [SerializeField] private Button _playButton;
    [SerializeField] private Button _settingsButton;
    [SerializeField] private Button _quitButton;
    
    private void OnEnable()
    {
        _playButton.onClick.AddListener(OnPlayClicked);
        _settingsButton.onClick.AddListener(OnSettingsClicked);
        _quitButton.onClick.AddListener(OnQuitClicked);
    }
    
    private void OnDisable()
    {
        _playButton.onClick.RemoveListener(OnPlayClicked);
        _settingsButton.onClick.RemoveListener(OnSettingsClicked);
        _quitButton.onClick.RemoveListener(OnQuitClicked);
    }
    
    private void OnPlayClicked() { /* Load game */ }
    private void OnSettingsClicked() { /* Open settings panel */ }
    private void OnQuitClicked()
    {
        #if UNITY_EDITOR
        UnityEditor.EditorApplication.isPlaying = false;
        #else
        Application.Quit();
        #endif
    }
}
```

#### Sliders (Health bars, volume)

```csharp
public class HealthBar : MonoBehaviour
{
    [SerializeField] private Slider _slider;
    [SerializeField] private Image _fillImage;
    [SerializeField] private Gradient _colorGradient;
    [SerializeField] private float _lerpSpeed = 5f;
    
    private float _targetValue;
    
    public void SetHealth(float current, float max)
    {
        _targetValue = current / max;
    }
    
    private void Update()
    {
        // Smooth lerp to target value
        _slider.value = Mathf.Lerp(_slider.value, _targetValue, _lerpSpeed * Time.deltaTime);
        _fillImage.color = _colorGradient.Evaluate(_slider.value);
    }
}
```

### 4. World Space UI (Floating Health Bars)

```csharp
public class WorldSpaceHealthBar : MonoBehaviour
{
    [SerializeField] private Slider _slider;
    [SerializeField] private Vector3 _offset = new(0, 2.5f, 0);
    
    private Transform _target;
    private Camera _camera;
    
    public void Initialize(Transform target)
    {
        _target = target;
        _camera = Camera.main;
    }
    
    private void LateUpdate()
    {
        if (_target == null) return;
        
        // Follow target in world space
        transform.position = _target.position + _offset;
        
        // Always face camera (billboard)
        transform.forward = _camera.transform.forward;
    }
    
    public void UpdateHealth(float normalized)
    {
        _slider.value = normalized;
    }
}
```

### 5. Screen Transitions and Animations

#### UI Animations with DOTween-style approach

```csharp
using System.Collections;
using UnityEngine;

public class PanelAnimator : MonoBehaviour
{
    [SerializeField] private CanvasGroup _canvasGroup;
    [SerializeField] private RectTransform _panel;
    [SerializeField] private float _fadeDuration = 0.3f;
    [SerializeField] private float _slideDuration = 0.3f;
    
    public void Show()
    {
        gameObject.SetActive(true);
        StartCoroutine(AnimateIn());
    }
    
    public void Hide()
    {
        StartCoroutine(AnimateOut());
    }
    
    private IEnumerator AnimateIn()
    {
        // Slide up + fade in
        Vector2 startPos = _panel.anchoredPosition + Vector2.down * 50f;
        Vector2 endPos = _panel.anchoredPosition;
        _panel.anchoredPosition = startPos;
        _canvasGroup.alpha = 0f;
        _canvasGroup.interactable = false;
        
        float elapsed = 0f;
        while (elapsed < _fadeDuration)
        {
            elapsed += Time.unscaledDeltaTime;
            float t = EaseOutCubic(elapsed / _fadeDuration);
            _canvasGroup.alpha = t;
            _panel.anchoredPosition = Vector2.LerpUnclamped(startPos, endPos, t);
            yield return null;
        }
        
        _canvasGroup.alpha = 1f;
        _panel.anchoredPosition = endPos;
        _canvasGroup.interactable = true;
    }
    
    private IEnumerator AnimateOut()
    {
        _canvasGroup.interactable = false;
        float startAlpha = _canvasGroup.alpha;
        float elapsed = 0f;
        
        while (elapsed < _fadeDuration)
        {
            elapsed += Time.unscaledDeltaTime;
            _canvasGroup.alpha = Mathf.Lerp(startAlpha, 0f, elapsed / _fadeDuration);
            yield return null;
        }
        
        gameObject.SetActive(false);
    }
    
    private static float EaseOutCubic(float t) => 1f - Mathf.Pow(1f - t, 3f);
}
```

### 6. UI Manager Pattern

```csharp
using System.Collections.Generic;
using UnityEngine;

public class UIManager : MonoBehaviour
{
    [SerializeField] private Canvas _mainCanvas;
    
    [Header("Panels")]
    [SerializeField] private GameObject _hudPanel;
    [SerializeField] private GameObject _pausePanel;
    [SerializeField] private GameObject _settingsPanel;
    [SerializeField] private GameObject _inventoryPanel;
    [SerializeField] private GameObject _gameOverPanel;
    
    private readonly Stack<GameObject> _panelStack = new();
    private GameObject _currentPanel;
    
    private void Start()
    {
        // Start with HUD
        ShowPanel(_hudPanel);
    }
    
    public void ShowPanel(GameObject panel)
    {
        if (_currentPanel != null)
        {
            _panelStack.Push(_currentPanel);
            _currentPanel.SetActive(false);
        }
        
        _currentPanel = panel;
        _currentPanel.SetActive(true);
    }
    
    public void GoBack()
    {
        if (_panelStack.Count == 0) return;
        
        _currentPanel.SetActive(false);
        _currentPanel = _panelStack.Pop();
        _currentPanel.SetActive(true);
    }
    
    public void ShowPause()
    {
        Time.timeScale = 0f;
        ShowPanel(_pausePanel);
    }
    
    public void Resume()
    {
        Time.timeScale = 1f;
        GoBack();
    }
}
```

### 7. Responsive Design

```csharp
using UnityEngine;

/// <summary>
/// Adjusts UI layout based on screen aspect ratio and safe areas (notches, etc.).
/// </summary>
public class SafeAreaAdapter : MonoBehaviour
{
    [SerializeField] private RectTransform _safeAreaRect;
    
    private Rect _lastSafeArea;
    
    private void Update()
    {
        if (Screen.safeArea != _lastSafeArea)
        {
            ApplySafeArea();
        }
    }
    
    private void ApplySafeArea()
    {
        _lastSafeArea = Screen.safeArea;
        
        Vector2 anchorMin = _lastSafeArea.position;
        Vector2 anchorMax = _lastSafeArea.position + _lastSafeArea.size;
        
        anchorMin.x /= Screen.width;
        anchorMin.y /= Screen.height;
        anchorMax.x /= Screen.width;
        anchorMax.y /= Screen.height;
        
        _safeAreaRect.anchorMin = anchorMin;
        _safeAreaRect.anchorMax = anchorMax;
    }
}
```

### 8. UI Toolkit (Modern Alternative)

UI Toolkit uses UXML (structure) and USS (styling) — similar to HTML/CSS. It's the future direction for Unity UI.

#### UXML Template

```xml
<!-- MainMenu.uxml -->
<ui:UXML xmlns:ui="UnityEngine.UIElements">
    <ui:VisualElement class="container">
        <ui:Label text="My Game" class="title" />
        <ui:VisualElement class="button-container">
            <ui:Button name="play-button" text="Play" class="menu-button" />
            <ui:Button name="settings-button" text="Settings" class="menu-button" />
            <ui:Button name="quit-button" text="Quit" class="menu-button" />
        </ui:VisualElement>
    </ui:VisualElement>
</ui:UXML>
```

#### USS Stylesheet

```css
/* MainMenu.uss */
.container {
    flex-grow: 1;
    justify-content: center;
    align-items: center;
    background-color: rgba(0, 0, 0, 0.8);
}

.title {
    font-size: 64px;
    color: white;
    margin-bottom: 40px;
    -unity-font-style: bold;
}

.button-container {
    width: 300px;
}

.menu-button {
    height: 60px;
    margin: 8px 0;
    font-size: 24px;
    border-radius: 8px;
    background-color: rgb(50, 50, 80);
    color: white;
    border-width: 2px;
    border-color: rgb(100, 100, 160);
    transition-duration: 0.2s;
}

.menu-button:hover {
    background-color: rgb(70, 70, 120);
    scale: 1.05 1.05;
}

.menu-button:active {
    background-color: rgb(40, 40, 60);
    scale: 0.98 0.98;
}
```

#### C# Controller for UI Toolkit

```csharp
using UnityEngine;
using UnityEngine.UIElements;

public class MainMenuController : MonoBehaviour
{
    [SerializeField] private UIDocument _document;
    
    private Button _playButton;
    private Button _settingsButton;
    private Button _quitButton;
    
    private void OnEnable()
    {
        var root = _document.rootVisualElement;
        
        _playButton = root.Q<Button>("play-button");
        _settingsButton = root.Q<Button>("settings-button");
        _quitButton = root.Q<Button>("quit-button");
        
        _playButton.clicked += OnPlay;
        _settingsButton.clicked += OnSettings;
        _quitButton.clicked += OnQuit;
    }
    
    private void OnDisable()
    {
        _playButton.clicked -= OnPlay;
        _settingsButton.clicked -= OnSettings;
        _quitButton.clicked -= OnQuit;
    }
    
    private void OnPlay() { /* Load game scene */ }
    private void OnSettings() { /* Show settings */ }
    private void OnQuit() { Application.Quit(); }
}
```

### 9. Canvas vs UI Toolkit Decision Guide

| Factor | Canvas (uGUI) | UI Toolkit |
|--------|---------------|------------|
| **Maturity** | Fully mature, battle-tested | Maturing, some runtime gaps |
| **World Space UI** | Excellent | Not supported at runtime |
| **Animation** | Animator, code, DOTween | USS transitions, code |
| **Styling** | Per-element in Inspector | USS stylesheets (CSS-like) |
| **Performance** | Good with optimization | Faster for complex UIs |
| **Learning curve** | Unity-specific | Web developers feel at home |
| **Best for** | Game HUD, world UI, most games | Tools, menus, text-heavy UI |

> **Recommendation:** Use Canvas/uGUI for most games today. Use UI Toolkit for Editor tools and text-heavy interfaces. Watch for UI Toolkit's runtime feature parity improvements.

## Best Practices

1. **Use CanvasGroups** for fade, interactability, and raycasting control on entire panels.
2. **Separate HUD from menu canvases** — menu pauses may need `Time.timeScale = 0` with `Time.unscaledDeltaTime` animations.
3. **Pool dynamic UI elements** (damage numbers, list items, notifications).
4. **Use TextMeshPro exclusively** — never use legacy `Text` component.
5. **Set up a UI atlas** (Sprite Atlas) — reduces draw calls for UI sprites.
6. **Disable Raycast Target** on non-interactive elements (images, labels) — saves raycasting cost.
7. **Use `CanvasScaler` with "Scale With Screen Size"** at 1920×1080 reference.
8. **Apply Safe Area handling** for mobile (notches, rounded corners).
9. **Keep canvas hierarchy flat** — deep nesting causes layout recalculation overhead.
10. **Use `Canvas.ForceUpdateCanvases()` sparingly** — it forces immediate full recalculation.

## Common Pitfalls

| Pitfall | Why It Hurts | Fix |
|---------|-------------|-----|
| Using legacy `Text` instead of TMP | Blurry text, no rich features, deprecated | Always use `TMP_Text` |
| Raycast Target on all images | Every image is checked for interactions | Disable on non-interactive elements |
| Single Canvas for all UI | Any change dirties the entire canvas mesh | Split into multiple canvases by update frequency |
| Animating UI with `Transform` | Doesn't work with RectTransform properly | Use `RectTransform.anchoredPosition` |
| Not using `Time.unscaledDeltaTime` in paused menus | UI animations freeze when `timeScale = 0` | Use unscaled time for pause menus |
| Duplicate EventSystem components | Input stops working or double-fires | Keep exactly one EventSystem in the scene |
| Not handling Safe Area on mobile | UI hidden behind notches/rounded corners | Apply `Screen.safeArea` to root container |

## Reference

- [Unity Manual — Canvas](https://docs.unity3d.com/Manual/UICanvas.html)
- [Unity Manual — UI Toolkit](https://docs.unity3d.com/Manual/UIElements.html)
- [TextMeshPro Documentation](https://docs.unity3d.com/Packages/com.unity.textmeshpro@latest)
- [Unity Manual — Canvas Scaler](https://docs.unity3d.com/Manual/script-CanvasScaler.html)
- [Unity Manual — Layout Groups](https://docs.unity3d.com/Manual/comp-UIAutoLayout.html)
