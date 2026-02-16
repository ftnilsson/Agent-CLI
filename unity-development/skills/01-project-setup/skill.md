# Project Setup & Architecture

## Description

This skill covers creating and structuring Unity projects for long-term maintainability, scalability, and team collaboration. A well-organized project from the start prevents costly refactors, reduces merge conflicts, and makes onboarding new team members straightforward.

## When To Use

- Starting a new Unity project from scratch
- Restructuring an existing project that has grown disorganized
- Setting up assembly definitions to improve compile times
- Configuring package dependencies and project settings
- Establishing coding conventions and folder standards for a team

## Prerequisites

- Unity 6 (6000.x) or later installed via Unity Hub
- Basic familiarity with the Unity Editor interface
- A code editor (Visual Studio, Rider, or VS Code with C# Dev Kit)

## Instructions

### 1. Create the Project

Use Unity Hub to create a new project. Select the appropriate template:

| Template | Use Case |
|----------|----------|
| **3D (URP)** | Most 3D games — best balance of quality and performance |
| **3D (HDRP)** | High-fidelity visuals for PC/console |
| **2D (URP)** | Sprite-based 2D games |
| **3D Mobile** | Mobile-optimized 3D games |

> Always prefer URP unless you have a specific reason to choose HDRP or Built-in. URP covers the widest platform range with modern rendering features.

### 2. Establish the Folder Structure

Organize the `Assets/` folder using a feature-based or module-based layout:

```
Assets/
├── _Project/                  # All project-specific content
│   ├── Art/
│   │   ├── Animations/
│   │   ├── Materials/
│   │   ├── Models/
│   │   ├── Textures/
│   │   └── UI/
│   ├── Audio/
│   │   ├── Music/
│   │   ├── SFX/
│   │   └── Mixers/
│   ├── Prefabs/
│   │   ├── Characters/
│   │   ├── Environment/
│   │   ├── UI/
│   │   └── VFX/
│   ├── Scenes/
│   │   ├── Levels/
│   │   ├── UI/
│   │   └── Testing/
│   ├── ScriptableObjects/
│   │   ├── Data/
│   │   ├── Events/
│   │   └── Config/
│   ├── Scripts/
│   │   ├── Runtime/
│   │   │   ├── Core/
│   │   │   ├── Gameplay/
│   │   │   ├── AI/
│   │   │   ├── UI/
│   │   │   ├── Audio/
│   │   │   ├── Input/
│   │   │   ├── Networking/
│   │   │   └── Utils/
│   │   └── Editor/
│   │       ├── Tools/
│   │       ├── Inspectors/
│   │       └── Windows/
│   ├── Settings/
│   │   ├── Input/
│   │   └── Rendering/
│   └── Shaders/
│       ├── ShaderGraphs/
│       └── Includes/
├── Plugins/                   # Third-party native plugins
└── StreamingAssets/           # Platform-specific streaming data
```

**Key principles:**
- Prefix the main project folder with `_` so it sorts to the top.
- Keep third-party assets in their own top-level folders (e.g., `Assets/TextMeshPro/`). Never move their internals.
- Use `Resources/` sparingly — prefer Addressables for runtime asset loading.
- The `Editor/` folder name is special in Unity; scripts inside it are excluded from runtime builds.

### 3. Configure Assembly Definitions

Assembly Definitions (`.asmdef`) dramatically improve compile times by isolating code into separate assemblies. Only modified assemblies recompile on change.

Create the following assembly definitions:

```
Scripts/
├── Runtime/
│   ├── Core/
│   │   └── Game.Core.asmdef
│   ├── Gameplay/
│   │   └── Game.Gameplay.asmdef
│   ├── AI/
│   │   └── Game.AI.asmdef
│   ├── UI/
│   │   └── Game.UI.asmdef
│   └── Utils/
│       └── Game.Utils.asmdef
└── Editor/
    └── Game.Editor.asmdef
```

Example `Game.Gameplay.asmdef`:

```json
{
    "name": "Game.Gameplay",
    "rootNamespace": "Game.Gameplay",
    "references": [
        "Game.Core",
        "Game.Utils",
        "Unity.InputSystem",
        "Unity.TextMeshPro"
    ],
    "includePlatforms": [],
    "excludePlatforms": [],
    "allowUnsafeCode": false,
    "overrideReferences": false,
    "precompiledReferences": [],
    "autoReferenced": true,
    "defineConstraints": [],
    "versionDefines": [],
    "noEngineReferences": false
}
```

**Rules for assembly references:**
- Keep dependencies unidirectional: `Gameplay → Core → Utils`, never the reverse.
- `Utils` should have zero project assembly references.
- `Editor` assemblies must set `includePlatforms` to `["Editor"]`.
- Reference third-party assemblies explicitly via `references`.

### 4. Configure Essential Packages

Open **Window → Package Manager** and install these foundational packages:

| Package | Purpose |
|---------|---------|
| `com.unity.inputsystem` | Modern input handling (replaces legacy Input) |
| `com.unity.textmeshpro` | High-quality text rendering |
| `com.unity.cinemachine` | Camera systems |
| `com.unity.addressables` | Scalable asset loading |
| `com.unity.localization` | Multi-language support |
| `com.unity.test-framework` | Unit and integration testing |

### 5. Configure Project Settings

#### Quality Settings
- Create at least three quality levels: `Low`, `Medium`, `High`.
- Assign appropriate URP Renderer assets to each level.

#### Player Settings
- Set **Company Name** and **Product Name**.
- Configure **Scripting Backend** to **IL2CPP** for release builds (Mono for faster iteration).
- Set **API Compatibility Level** to `.NET Standard 2.1`.
- Enable **Incremental GC** under Other Settings.

#### Physics Settings
- Set a global fixed timestep (default `0.02` = 50 Hz). Lower for mobile (`0.04`).
- Configure the **Layer Collision Matrix** — disable unnecessary layer collisions.

#### Tags & Layers
Define layers early:

```
Layers:
  8:  Ground
  9:  Player
  10: Enemy
  11: Projectile
  12: Interactable
  13: Trigger
  14: UI3D
  15: IgnoreRaycast_Custom
```

### 6. Set Up Version Control

#### .gitignore

Use the standard Unity `.gitignore`. Essential exclusions:

```gitignore
# Unity
[Ll]ibrary/
[Tt]emp/
[Oo]bj/
[Bb]uild/
[Bb]uilds/
[Ll]ogs/
[Uu]ser[Ss]ettings/
MemoryCaptures/
Recordings/

# IDE
.vs/
.idea/
*.csproj
*.sln
*.suo
*.user
*.pidb
*.booproj

# OS
.DS_Store
Thumbs.db

# Builds
*.apk
*.aab
*.unitypackage
*.app
```

#### Asset Serialization
Set **Edit → Project Settings → Editor → Asset Serialization Mode** to **Force Text**. This enables meaningful diffs and merges for Unity files.

#### Git LFS
Configure Git LFS for binary assets:

```
# .gitattributes
*.png filter=lfs diff=lfs merge=lfs -text
*.jpg filter=lfs diff=lfs merge=lfs -text
*.wav filter=lfs diff=lfs merge=lfs -text
*.mp3 filter=lfs diff=lfs merge=lfs -text
*.ogg filter=lfs diff=lfs merge=lfs -text
*.fbx filter=lfs diff=lfs merge=lfs -text
*.obj filter=lfs diff=lfs merge=lfs -text
*.psd filter=lfs diff=lfs merge=lfs -text
*.tga filter=lfs diff=lfs merge=lfs -text
*.tif filter=lfs diff=lfs merge=lfs -text
*.exr filter=lfs diff=lfs merge=lfs -text
*.unity filter=lfs diff=lfs merge=lfs -text
*.prefab filter=lfs diff=lfs merge=lfs -text
*.asset filter=lfs diff=lfs merge=lfs -text
*.controller filter=lfs diff=lfs merge=lfs -text
*.anim filter=lfs diff=lfs merge=lfs -text
```

### 7. Coding Conventions

Establish consistent C# conventions for the project:

```csharp
namespace Game.Gameplay
{
    /// <summary>
    /// Brief summary of the class purpose.
    /// </summary>
    public class PlayerHealth : MonoBehaviour
    {
        // --- Serialized Fields (Inspector-visible) ---
        [Header("Configuration")]
        [SerializeField] private int _maxHealth = 100;
        [SerializeField] private float _invincibilityDuration = 1.5f;
        
        [Header("References")]
        [SerializeField] private ParticleSystem _hitVfx;
        
        // --- Events ---
        public event System.Action<int, int> OnHealthChanged; // current, max
        public event System.Action OnDeath;
        
        // --- Private State ---
        private int _currentHealth;
        private bool _isInvincible;
        
        // --- Properties ---
        public int CurrentHealth => _currentHealth;
        public bool IsAlive => _currentHealth > 0;
        
        // --- Unity Lifecycle (in execution order) ---
        private void Awake()
        {
            _currentHealth = _maxHealth;
        }
        
        // --- Public API ---
        public void TakeDamage(int amount)
        {
            if (!IsAlive || _isInvincible) return;
            
            _currentHealth = Mathf.Max(0, _currentHealth - amount);
            OnHealthChanged?.Invoke(_currentHealth, _maxHealth);
            
            if (_currentHealth <= 0)
            {
                OnDeath?.Invoke();
            }
        }
        
        public void Heal(int amount)
        {
            if (!IsAlive) return;
            
            _currentHealth = Mathf.Min(_maxHealth, _currentHealth + amount);
            OnHealthChanged?.Invoke(_currentHealth, _maxHealth);
        }
    }
}
```

**Naming conventions:**
| Element | Convention | Example |
|---------|-----------|---------|
| Namespace | PascalCase, dot-separated | `Game.Gameplay` |
| Class / Struct | PascalCase | `PlayerHealth` |
| Interface | `I` + PascalCase | `IDamageable` |
| Public Method | PascalCase | `TakeDamage()` |
| Private Method | PascalCase | `ApplyDamage()` |
| Public Property | PascalCase | `CurrentHealth` |
| Private Field | `_camelCase` | `_currentHealth` |
| Serialized Field | `_camelCase` with `[SerializeField]` | `_maxHealth` |
| Constant | PascalCase | `MaxStackSize` |
| Enum | PascalCase (type and values) | `DamageType.Fire` |
| Event | `On` + PascalCase | `OnHealthChanged` |
| Parameter | camelCase | `damageAmount` |

## Best Practices

1. **One MonoBehaviour per file** — file name must match the class name.
2. **Prefer composition over inheritance** — use interfaces and component-based architecture.
3. **Use `[SerializeField]` on private fields** instead of making fields `public`.
4. **Group serialized fields with `[Header()]`** for Inspector readability.
5. **Use namespaces everywhere** — prevents naming collisions with third-party code.
6. **Create a Bootstrap scene** — a minimal scene (index 0) that initializes core systems and loads the first real scene.
7. **Define layers and tags as constants** — avoid magic strings scattered through code.
8. **Commit `.meta` files** — they contain GUIDs that Unity uses to track asset references.
9. **Use Presets** for consistent import settings on textures, audio, and models.

## Common Pitfalls

| Pitfall | Why It Hurts | Fix |
|---------|-------------|-----|
| Putting everything in one assembly | Full recompile on every change (~10-30s) | Use assembly definitions |
| Using `Resources/` for everything | All assets in `Resources/` are included in builds, bloating size | Use Addressables |
| Not using `.meta` files in version control | Broken asset references after pulling | Always commit `.meta` files |
| Public fields instead of `[SerializeField]` | Exposes internal state, breaks encapsulation | Use `[SerializeField] private` |
| Missing `.gitignore` | Committing `Library/` causes massive repos and constant conflicts | Add `.gitignore` before first commit |
| Inconsistent folder structure | Assets become impossible to find as project grows | Establish and enforce conventions early |
| Forgetting to set serialization to Force Text | Binary serialization prevents meaningful version control diffs | Set Force Text in Project Settings |

## Reference

- [Unity Manual — Project Organization Best Practices](https://docs.unity3d.com/Manual/cus-layout.html)
- [Unity Manual — Assembly Definitions](https://docs.unity3d.com/Manual/ScriptCompilationAssemblyDefinitionFiles.html)
- [Unity Manual — Package Manager](https://docs.unity3d.com/Manual/Packages.html)
- [Unity Manual — PlayerSettings](https://docs.unity3d.com/ScriptReference/PlayerSettings.html)
