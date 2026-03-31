# Project Setup & Architecture

## Folder Structure

- Prefix the main project folder with `_Project/` so it sorts above third-party packages
- Place all game content under `Assets/_Project/` — never scatter files at the Assets root
- Keep third-party packages in their own top-level folders (e.g., `Assets/TextMeshPro/`); never reorganize their internals
- Organize scripts under `Scripts/Runtime/` and `Scripts/Editor/` within the project folder
- Store URP Renderer assets and Volume Profiles in `Settings/Rendering/`

## Assembly Definitions

- Create one `.asmdef` per logical domain: `Game.Core`, `Game.Gameplay`, `Game.UI`, `Game.AI`, `Game.Utils`, `Game.Editor`
- Enforce unidirectional dependencies: `Gameplay → Core → Utils`, never reverse
- Set `includePlatforms: ["Editor"]` on all `Game.Editor` assembly definitions
- Set `rootNamespace` in each `.asmdef` to match the assembly name

```json
{
    "name": "Game.Gameplay",
    "rootNamespace": "Game.Gameplay",
    "references": ["Game.Core", "Game.Utils", "Unity.InputSystem"],
    "autoReferenced": true,
    "allowUnsafeCode": false
}
```

## Package Manager

- Install `com.unity.inputsystem` — never use the legacy `Input` class in new code
- Install `com.unity.textmeshpro`, `com.unity.cinemachine`, `com.unity.addressables`
- Install `com.unity.test-framework` for all projects; configure test assemblies from day one
- Install `com.unity.ai.navigation` for NavMesh support

## Player Settings

- Set Scripting Backend to **IL2CPP** for release, **Mono** for faster Editor iteration
- Set API Compatibility Level to `.NET Standard 2.1`
- Enable **Incremental GC** under Other Settings
- Set Fixed Timestep to `0.02` (50 Hz) for desktop; `0.03–0.04` for mobile
- Set **Asset Serialization Mode** to **Force Text** (Edit → Project Settings → Editor)

## Layer & Tag Setup

- Define physics layers at project start: `Ground (8)`, `Player (9)`, `Enemy (10)`, `Projectile (11)`, `Interactable (12)`, `Trigger (13)`
- Define tags as constants in a static class — avoid magic strings scattered through code
- Disable unnecessary layer collisions in the Layer Collision Matrix (Physics Settings)

## Version Control

- Commit `.gitignore` before the first Unity commit; exclude `Library/`, `Temp/`, `Obj/`, `Builds/`, `UserSettings/`
- Commit all `.meta` files — they contain GUIDs Unity uses to track asset references
- Configure Git LFS for binary assets: `*.png`, `*.fbx`, `*.wav`, `*.mp3`, `*.unity`, `*.prefab`, `*.asset`
- Use Force Text serialization to enable meaningful diffs and merges on Unity YAML files

## Coding Conventions

- One `MonoBehaviour` per file; file name must exactly match the class name
- Use namespaces everywhere — prevents collisions with third-party code
- Serialize Inspector fields as `[SerializeField] private int _maxHealth = 100;` — never use `public` fields
- Group Inspector fields with `[Header("Configuration")]` and `[Header("References")]`
- Name events with `On` prefix: `OnHealthChanged`, `OnPlayerDied`

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| All scripts in one assembly | Use `.asmdef` files to isolate domains |
| `Resources/` for runtime loading | Use Addressables |
| Public fields for Inspector exposure | Use `[SerializeField] private` |
| Binary asset serialization | Set Force Text in Project Settings → Editor |
| Cross-package folder edits | Only modify files under `_Project/` |
| Missing `.gitignore` before first commit | Adds `Library/` to version control; causes constant conflicts |

## Best Practices

- Create a Bootstrap scene at Build Index 0 that initializes core systems then loads the first real scene
- Use `[CreateAssetMenu]` on every `ScriptableObject` with an organized menu path
- Enable Incremental GC to reduce GC spike frequency
- Use Presets for consistent import settings on textures, audio clips, and models
- Enforce assembly dependency direction in code review — violations break compilation isolation
- Add `link.xml` early if using reflection-heavy libraries to prevent IL2CPP stripping issues
- Set at least three Quality levels: `Low`, `Medium`, `High`, each with a dedicated URP Renderer asset
