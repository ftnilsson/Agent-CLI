# Scene Architecture & Management

## Description

This skill covers designing and managing Unity scenes for scalability, fast iteration, and seamless player experiences. It includes multi-scene workflows, additive scene loading, scene transitions, prefab-based level design, and bootstrap patterns. Proper scene architecture prevents monolithic scenes that are slow to load and impossible to merge in version control.

## When To Use

- Designing the scene hierarchy for a new game
- Implementing loading screens and scene transitions
- Breaking a monolithic scene into modular, additively loaded pieces
- Setting up a persistent systems scene (audio, UI, game manager)
- Creating a level-loading pipeline with progress tracking
- Working with prefabs and nested prefabs for modular level design

## Prerequisites

- Unity 6 (6000.x) project with URP configured
- [01 — Project Setup](../01-Project-Setup/skill.md) completed
- [02 — C# Scripting](../02-CSharp-Scripting/skill.md) fundamentals understood
- Package: `com.unity.addressables` (recommended for larger projects)

## Instructions

### 1. Scene Architecture Patterns

#### Single-Scene (Small games / prototypes)

Everything lives in one scene. Simple but doesn't scale.

```
Scenes/
└── MainScene.unity
```

#### Multi-Scene Additive (Recommended for most games)

A persistent "core" scene stays loaded while gameplay scenes are loaded/unloaded additively.

```
Scenes/
├── _Bootstrap.unity          # Index 0 — initializes systems, loads Core
├── _Core.unity               # Persistent: managers, UI, audio, camera
├── Levels/
│   ├── Level_01.unity
│   ├── Level_02.unity
│   └── Level_Boss.unity
├── UI/
│   ├── MainMenu.unity
│   └── PauseMenu.unity
└── Testing/
    └── Sandbox.unity
```

#### Streaming World (Open-world games)

Sectors of the world load/unload based on player proximity. Use Addressables + scene streaming.

### 2. The Bootstrap Pattern

The Bootstrap scene is always Build Index 0. It runs first, initializes core systems, then loads the appropriate scenes.

```csharp
using UnityEngine;
using UnityEngine.SceneManagement;

public class Bootstrap : MonoBehaviour
{
    [SerializeField] private string _coreSceneName = "_Core";
    [SerializeField] private string _firstSceneName = "MainMenu";
    
    private async void Awake()
    {
        // Prevent this scene from accumulating objects
        // Load core systems scene (persistent managers)
        await SceneManager.LoadSceneAsync(_coreSceneName, LoadSceneMode.Additive);
        
        // Load the first gameplay/menu scene
        await SceneManager.LoadSceneAsync(_firstSceneName, LoadSceneMode.Additive);
        
        // Set the gameplay scene as active (controls lighting, new objects, etc.)
        SceneManager.SetActiveScene(SceneManager.GetSceneByName(_firstSceneName));
        
        // Unload bootstrap — it's done its job
        await SceneManager.UnloadSceneAsync(gameObject.scene);
    }
}
```

### 3. Persistent Core Scene

The `_Core` scene contains systems that must survive scene changes:

```
_Core Scene Hierarchy:
├── [GameManager]          — Game state, flow control
├── [AudioManager]         — Music, SFX, mixers
├── [UIManager]            — Canvas for persistent HUD, loading screens
│   ├── LoadingScreen
│   ├── FadeOverlay
│   └── DialoguePanel
├── [InputManager]         — Input System player input
├── [SaveManager]          — Persistence layer
├── [EventSystem]          — Unity EventSystem (one globally)
├── [SceneLoader]          — Handles all scene transitions
└── [CameraRig]            — Cinemachine brain + virtual cameras
```

> All root objects in `_Core` should use `DontDestroyOnLoad` or — better — remain loaded via additive scene management (no `DontDestroyOnLoad` needed if the scene itself is never unloaded).

### 4. Scene Loader (Transition System)

A robust scene loader handles transitions with loading screens, progress bars, and fade effects.

```csharp
using System;
using System.Collections;
using UnityEngine;
using UnityEngine.SceneManagement;

public class SceneLoader : MonoBehaviour
{
    [SerializeField] private CanvasGroup _loadingScreen;
    [SerializeField] private UnityEngine.UI.Slider _progressBar;
    [SerializeField] private float _fadeDuration = 0.5f;
    [SerializeField] private float _minimumLoadingTime = 1f;
    
    public event Action<string> OnSceneLoadStarted;
    public event Action<string> OnSceneLoadCompleted;
    
    private string _currentLevelScene;
    private bool _isLoading;
    
    /// <summary>
    /// Transitions from the current level scene to a new one with a loading screen.
    /// </summary>
    public void LoadScene(string sceneName)
    {
        if (_isLoading) return;
        StartCoroutine(LoadSceneRoutine(sceneName));
    }
    
    private IEnumerator LoadSceneRoutine(string sceneName)
    {
        _isLoading = true;
        OnSceneLoadStarted?.Invoke(sceneName);
        
        // Fade in loading screen
        yield return FadeLoadingScreen(1f);
        
        // Unload current level if one is loaded
        if (!string.IsNullOrEmpty(_currentLevelScene))
        {
            var unload = SceneManager.UnloadSceneAsync(_currentLevelScene);
            while (!unload.isDone)
                yield return null;
        }
        
        // Optionally clean up
        yield return Resources.UnloadUnusedAssets();
        System.GC.Collect();
        
        // Load new scene
        float startTime = Time.unscaledTime;
        var load = SceneManager.LoadSceneAsync(sceneName, LoadSceneMode.Additive);
        load.allowSceneActivation = false;
        
        // Update progress bar (0.0 to 0.9 is loading, 0.9 means ready to activate)
        while (load.progress < 0.9f)
        {
            _progressBar.value = Mathf.Clamp01(load.progress / 0.9f);
            yield return null;
        }
        _progressBar.value = 1f;
        
        // Ensure minimum loading time for smooth UX
        float elapsed = Time.unscaledTime - startTime;
        if (elapsed < _minimumLoadingTime)
        {
            yield return new WaitForSecondsRealtime(_minimumLoadingTime - elapsed);
        }
        
        // Activate the scene
        load.allowSceneActivation = true;
        while (!load.isDone)
            yield return null;
        
        SceneManager.SetActiveScene(SceneManager.GetSceneByName(sceneName));
        _currentLevelScene = sceneName;
        
        // Fade out loading screen
        yield return FadeLoadingScreen(0f);
        
        _isLoading = false;
        OnSceneLoadCompleted?.Invoke(sceneName);
    }
    
    private IEnumerator FadeLoadingScreen(float targetAlpha)
    {
        _loadingScreen.gameObject.SetActive(true);
        float startAlpha = _loadingScreen.alpha;
        float elapsed = 0f;
        
        while (elapsed < _fadeDuration)
        {
            elapsed += Time.unscaledDeltaTime;
            _loadingScreen.alpha = Mathf.Lerp(startAlpha, targetAlpha, elapsed / _fadeDuration);
            yield return null;
        }
        
        _loadingScreen.alpha = targetAlpha;
        
        if (targetAlpha == 0f)
            _loadingScreen.gameObject.SetActive(false);
    }
}
```

### 5. Addressable Scene Loading (Advanced)

For larger projects, use Addressables for scene management. This enables remote loading and download-on-demand.

```csharp
using UnityEngine;
using UnityEngine.AddressableAssets;
using UnityEngine.ResourceManagement.AsyncOperations;
using UnityEngine.ResourceManagement.ResourceProviders;

public class AddressableSceneLoader : MonoBehaviour
{
    private AsyncOperationHandle<SceneInstance> _currentSceneHandle;
    
    public async Awaitable LoadSceneAddressable(string sceneAddress)
    {
        // Unload previous
        if (_currentSceneHandle.IsValid())
        {
            await Addressables.UnloadSceneAsync(_currentSceneHandle).Task;
        }
        
        // Load new scene additively
        _currentSceneHandle = Addressables.LoadSceneAsync(
            sceneAddress,
            UnityEngine.SceneManagement.LoadSceneMode.Additive
        );
        
        await _currentSceneHandle.Task;
    }
}
```

### 6. Prefab-Based Level Design

Use prefabs for modular level construction instead of placing everything directly in scenes.

#### Level Building Blocks

```csharp
/// <summary>
/// Marks a prefab as a level section. Provides metadata for the level editor.
/// </summary>
public class LevelSection : MonoBehaviour
{
    [Header("Metadata")]
    [SerializeField] private string _sectionId;
    [SerializeField] private Bounds _bounds;
    
    [Header("Connections")]
    [SerializeField] private Transform[] _connectionPoints;
    
    public string SectionId => _sectionId;
    public Bounds Bounds => _bounds;
    public Transform[] ConnectionPoints => _connectionPoints;
    
    private void OnDrawGizmosSelected()
    {
        Gizmos.color = Color.cyan;
        Gizmos.DrawWireCube(_bounds.center + transform.position, _bounds.size);
        
        Gizmos.color = Color.green;
        foreach (var point in _connectionPoints)
        {
            if (point != null)
                Gizmos.DrawSphere(point.position, 0.5f);
        }
    }
}
```

#### Scene References via ScriptableObjects

```csharp
[CreateAssetMenu(fileName = "New Level Info", menuName = "Data/Level Info")]
public class LevelInfo : ScriptableObject
{
    public string levelName;
    public string sceneName;
    public Sprite thumbnail;
    [TextArea] public string description;
    public int recommendedLevel;
    public LevelInfo nextLevel;
}
```

### 7. Multi-Scene Editing in the Editor

Unity supports loading multiple scenes simultaneously in the Editor:

1. **Drag scenes into the Hierarchy** while holding Ctrl/Cmd.
2. **Right-click a scene** → Set Active Scene.
3. New objects are created in the active scene.
4. **Save modified scenes individually** via right-click → Save Scene, or Ctrl+S to save all.

**Tips for multi-scene editing:**
- Cross-scene references are fragile — use events or ScriptableObject channels instead.
- Light baking is per-active-scene. Set the correct scene as active before baking.
- Use scene-specific lighting settings by placing a `LightingSettings` asset in each level scene.

### 8. Scene Hierarchy Organization

Within each scene, organize the hierarchy consistently:

```
Scene Hierarchy:
├── --- ENVIRONMENT ---    (separator using empty GameObject)
│   ├── Terrain
│   ├── Static_Props
│   ├── Dynamic_Props
│   └── Lighting
│       ├── Directional Light
│       ├── Point_Lights
│       └── Reflection_Probes
├── --- GAMEPLAY ---
│   ├── SpawnPoints
│   ├── Triggers
│   ├── Interactables
│   └── Waypoints
├── --- CAMERAS ---
│   └── Virtual_Cameras
└── --- DEBUG ---
    └── TestObjects (disabled in builds)
```

> Use `---` separator naming or the `EditorOnly` tag for debug objects that should be stripped from builds.

## Best Practices

1. **Never use `DontDestroyOnLoad` when additive scenes suffice** — it's harder to manage and debug.
2. **Set Build Settings scene list carefully** — only include scenes loaded by `SceneManager.LoadScene()`. Addressable scenes don't need to be listed.
3. **Use `LoadSceneMode.Additive` for all runtime loading** — `LoadSceneMode.Single` unloads everything else and can destroy persistent systems.
4. **Set the active scene** after additive loading so new instantiated objects go to the correct scene.
5. **Use `allowSceneActivation = false`** for controlled loading with progress feedback.
6. **Avoid cross-scene direct references** — they break. Use events, ScriptableObjects, or tag/find patterns during scene initialization.
7. **Profile scene load times** — large scenes can cause frame hitches. Consider async loading with progress reporting.
8. **Use scene variants** for testing — a `Sandbox.unity` scene for quick iteration on specific features.

## Common Pitfalls

| Pitfall | Why It Hurts | Fix |
|---------|-------------|-----|
| Only using `LoadSceneMode.Single` | Destroys persistent managers on every load | Use additive loading |
| Cross-scene object references | References become null when scenes reload | Use events or ScriptableObject channels |
| Not setting active scene after additive load | New objects go to the wrong scene, lighting is incorrect | Call `SetActiveScene()` |
| Forgetting to unload old scenes | Memory keeps growing as scenes stack up | Track and unload previous scenes |
| Scene loading on the main thread | Frame hitches or freezes | Use `LoadSceneAsync` with progress tracking |
| Duplicate EventSystems | UI breaks with multiple EventSystems | Keep one in the Core scene only |
| Not calling `Resources.UnloadUnusedAssets()` | Memory from unloaded scenes lingers | Call after unloading scenes |

## Reference

- [Unity Manual — Scene Management](https://docs.unity3d.com/Manual/managing-scenes.html)
- [Unity Manual — Multi-Scene Editing](https://docs.unity3d.com/Manual/MultiSceneEditing.html)
- [Unity Scripting API — SceneManager](https://docs.unity3d.com/ScriptReference/SceneManagement.SceneManager.html)
- [Unity Manual — Addressable Assets](https://docs.unity3d.com/Packages/com.unity.addressables@latest)
