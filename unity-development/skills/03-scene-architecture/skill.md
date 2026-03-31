# Scene Architecture & Management

## Scene Layout

- Use multi-scene additive architecture for all non-trivial games
- Keep `_Bootstrap.unity` at Build Index 0 — initializes systems and immediately loads other scenes
- Keep `_Core.unity` loaded persistently — holds `GameManager`, `AudioManager`, `UIManager`, `InputManager`, `SceneLoader`, `EventSystem`
- Store level scenes under `Scenes/Levels/`, menu scenes under `Scenes/UI/`, test scenes under `Scenes/Testing/`
- Never use `DontDestroyOnLoad` when additive scene management achieves the same goal

## Bootstrap Pattern

```csharp
public class Bootstrap : MonoBehaviour
{
    [SerializeField] private string _coreSceneName = "_Core";
    [SerializeField] private string _firstSceneName = "MainMenu";

    private async void Awake()
    {
        await SceneManager.LoadSceneAsync(_coreSceneName, LoadSceneMode.Additive);
        await SceneManager.LoadSceneAsync(_firstSceneName, LoadSceneMode.Additive);
        SceneManager.SetActiveScene(SceneManager.GetSceneByName(_firstSceneName));
        await SceneManager.UnloadSceneAsync(gameObject.scene);
    }
}
```

## Scene Loading Rules

- Always use `LoadSceneMode.Additive` at runtime — `LoadSceneMode.Single` destroys persistent managers
- Set the active scene with `SceneManager.SetActiveScene()` after every additive load — controls lighting and new object placement
- Use `allowSceneActivation = false` to control when a loaded scene becomes active (enables progress bars)
- Call `Resources.UnloadUnusedAssets()` and `GC.Collect()` after unloading scenes
- Use `SceneManager.sceneLoaded` / `SceneManager.sceneUnloaded` events instead of polling
- Never use synchronous `LoadScene()` at runtime — always async

## Addressable Scene Loading

- Use `Addressables.LoadSceneAsync(address, LoadSceneMode.Additive)` for DLC and large projects
- Store the `AsyncOperationHandle<SceneInstance>` and call `Addressables.UnloadSceneAsync(handle)` to release
- Addressable scenes do not need to be listed in Build Settings

## Scene Hierarchy Organization

Organize every scene with empty GameObject separators:

```
--- ENVIRONMENT ---
    Terrain, Static_Props, Dynamic_Props, Lighting
--- GAMEPLAY ---
    SpawnPoints, Triggers, Interactables, Waypoints
--- CAMERAS ---
    Virtual_Cameras
--- DEBUG ---
    TestObjects  (tag: EditorOnly)
```

- Tag debug-only objects with `EditorOnly` — Unity strips them from builds automatically
- Place exactly one `EventSystem` in `_Core` — never allow duplicates across scenes

## Cross-Scene Communication

- Never create direct references between objects in different scenes — they break on scene reload
- Use ScriptableObject event channels or ScriptableObject variables to communicate across scenes
- Use `SceneManager.GetSceneByName()` for runtime scene queries, not `FindObjectOfType`

## Multi-Scene Editing

- Open multiple scenes simultaneously by dragging them into the Hierarchy while holding Ctrl
- Right-click a scene header → Set Active Scene before placing new objects
- Set the correct active scene before baking lighting — bake is per-active-scene

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| `LoadSceneMode.Single` for transitions | Use additive loading; unload previous scene explicitly |
| Cross-scene `GameObject` references | Use ScriptableObject channels or events |
| Forgetting `SetActiveScene()` | New objects go to wrong scene; lighting is incorrect |
| Not unloading previous scenes | Memory grows unboundedly |
| Multiple `EventSystem` components | Breaks all UI input; keep one in `_Core` |
| `DontDestroyOnLoad` for managers | Keep `_Core` scene loaded instead |

## Best Practices

- Use a minimum load time (`WaitForSecondsRealtime`) to prevent loading-screen flicker on fast machines
- Store level metadata (scene name, thumbnail, recommended level) in `LevelInfo` ScriptableObjects
- Use a `Sandbox.unity` scene for quick feature iteration without loading the full game
- Test scene load/unload memory with the Memory Profiler to detect leaks
- Track the currently loaded level scene by name so it can be unloaded before loading the next
