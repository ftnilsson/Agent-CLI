# 17 — Build & Deployment

## Description

Configure, build, and distribute Unity 6 projects for multiple platforms. This skill covers build settings, platform switching, Addressable asset bundles, player settings, code stripping, CI/CD pipelines, and publishing workflows for PC, mobile, console, and WebGL.

## When To Use

- Preparing the game for distribution on a specific platform.
- Setting up automated build pipelines (CI/CD) with GitHub Actions, GitLab CI, or Jenkins.
- Splitting content into downloadable asset bundles via Addressables.
- Optimising build size and load times.
- Managing multiple build configurations (debug, release, demo).

## Prerequisites

| Skill | Why |
|-------|-----|
| [01 — Project Setup](../01-Project-Setup/skill.md) | Project structure, packages, and Git configuration |
| [15 — Performance Optimization](../15-Performance-Optimization/skill.md) | Texture compression, LODs, and asset settings affect build size |
| [16 — Testing & Debugging](../16-Testing-And-Debugging/skill.md) | Automated tests should run before every build |

## Instructions

### 1 — Build Settings Overview

Open **File ▸ Build Settings** (or **File ▸ Build Profiles** in Unity 6).

| Setting | Purpose |
|---------|---------|
| **Scenes In Build** | Which scenes are included and their index order |
| **Platform** | Target platform (Windows, macOS, Linux, Android, iOS, WebGL, etc.) |
| **Build Profile** | Unity 6 introduces Build Profiles for per-platform configurations |
| **Development Build** | Includes debug symbols, profiler support, script debugging |
| **Compression Method** | Default, LZ4 (fast load), LZ4HC (smaller size) |

### 2 — Player Settings

Configure via **Edit ▸ Project Settings ▸ Player** or per-profile in Unity 6.

#### Common Settings

| Category | Key Settings |
|----------|-------------|
| **Company / Product Name** | Appears in window title, file paths, and store listings |
| **Version** | Semantic version (1.0.0) — automate in CI |
| **Default Icon** | App icon per platform |
| **Splash Screen** | Unity splash (required on Personal) + custom logos |
| **Resolution & Presentation** | Default resolution, fullscreen mode, orientation (mobile) |
| **Other Settings** | Color Space (Linear recommended), Scripting Backend, API Compatibility |

#### Scripting Backend

| Backend | Use Case |
|---------|----------|
| **Mono** | Faster iteration; supports `System.Reflection` fully |
| **IL2CPP** | Required for iOS; better runtime performance; enables code stripping |

Set in **Player Settings ▸ Other Settings ▸ Scripting Backend**.

#### Managed Stripping Level

| Level | Effect |
|-------|--------|
| **Minimal** | Strips unused framework code conservatively |
| **Low** | Strips more aggressively |
| **Medium** | Good balance for most projects |
| **High** | Maximum stripping — may break reflection-based code |

Protect reflection-dependent types with a `link.xml` file:

```xml
<!-- Assets/link.xml -->
<linker>
    <assembly fullname="MyGame.Runtime" preserve="all" />
    <assembly fullname="UnityEngine" preserve="nothing">
        <type fullname="UnityEngine.JsonUtility" preserve="all" />
    </assembly>
</linker>
```

### 3 — Build Profiles (Unity 6)

Unity 6 introduces **Build Profiles** — saved per-platform build configurations.

1. Open **File ▸ Build Profiles**.
2. Create a new profile (e.g., "Windows Release", "Android Debug").
3. Each profile stores: platform, scenes, scripting defines, compression, development flag.
4. Switch profiles to rebuild for different targets quickly.

### 4 — Scripting Define Symbols

Add custom `#define` symbols per platform/profile:

**Player Settings ▸ Other Settings ▸ Scripting Define Symbols** or via script:

```csharp
#if UNITY_EDITOR
using UnityEditor;

public static class DefineSymbols
{
    public static void AddDefine(string define)
    {
        var target = EditorUserBuildSettings.selectedBuildTargetGroup;
        string defines = PlayerSettings.GetScriptingDefineSymbolsForGroup(target);

        if (!defines.Contains(define))
        {
            defines += $";{define}";
            PlayerSettings.SetScriptingDefineSymbolsForGroup(target, defines);
        }
    }
}
#endif
```

Usage in game code:

```csharp
#if DEMO_BUILD
    // Limit content for demo
    maxLevel = 3;
#endif

#if ENABLE_CHEAT_CONSOLE
    debugConsole.SetActive(true);
#endif
```

### 5 — Addressable Asset System

Split content into loadable bundles to reduce initial build size and enable downloadable content.

#### Setup

1. Install `com.unity.addressables`.
2. Open **Window ▸ Asset Management ▸ Addressables ▸ Groups**.
3. Mark assets as Addressable in the Inspector or drag them into groups.

#### Group Organisation

| Group | Contents | Load Strategy |
|-------|----------|---------------|
| **Built-In** | Core scenes, player prefab, UI | Packed with player |
| **Levels** | Level-specific scenes and assets | Load per level |
| **Audio** | Music and ambient sounds | Stream or download |
| **DLC** | Post-launch content | Download from CDN |

#### Building Addressables

```csharp
#if UNITY_EDITOR
using UnityEditor;
using UnityEditor.AddressableAssets.Settings;
using UnityEditor.AddressableAssets;

public static class AddressableBuildScript
{
    [MenuItem("Build/Build Addressables")]
    public static void BuildAddressables()
    {
        AddressableAssetSettings.BuildPlayerContent();
    }

    [MenuItem("Build/Clean Addressables")]
    public static void CleanAddressables()
    {
        AddressableAssetSettings.CleanPlayerContent();
    }
}
#endif
```

#### Runtime Loading

```csharp
using UnityEngine;
using UnityEngine.AddressableAssets;
using UnityEngine.ResourceManagement.AsyncOperations;

public class ContentLoader : MonoBehaviour
{
    public async void LoadLevel(string levelKey)
    {
        var handle = Addressables.LoadSceneAsync(levelKey);
        await handle.Task;

        if (handle.Status == AsyncOperationStatus.Succeeded)
            Debug.Log($"Level '{levelKey}' loaded.");
        else
            Debug.LogError($"Failed to load level '{levelKey}'.");
    }

    public async void DownloadDependencies(string label)
    {
        var sizeHandle = Addressables.GetDownloadSizeAsync(label);
        await sizeHandle.Task;

        long size = sizeHandle.Result;
        Debug.Log($"Download size for '{label}': {size / 1024f / 1024f:F2} MB");

        if (size > 0)
        {
            var downloadHandle = Addressables.DownloadDependenciesAsync(label);
            while (!downloadHandle.IsDone)
            {
                float progress = downloadHandle.PercentComplete;
                Debug.Log($"Downloading: {progress * 100f:F0}%");
                await System.Threading.Tasks.Task.Yield();
            }
            Addressables.Release(downloadHandle);
        }
        Addressables.Release(sizeHandle);
    }
}
```

### 6 — Platform-Specific Build Scripts

#### Automated Build via Editor Script

```csharp
#if UNITY_EDITOR
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

public static class BuildScript
{
    private static readonly string[] Scenes =
    {
        "Assets/Scenes/Bootstrap.unity",
        "Assets/Scenes/MainMenu.unity",
        "Assets/Scenes/Game.unity"
    };

    [MenuItem("Build/Build Windows")]
    public static void BuildWindows()
    {
        Build(BuildTarget.StandaloneWindows64, "Builds/Windows/MyGame.exe");
    }

    [MenuItem("Build/Build macOS")]
    public static void BuildMacOS()
    {
        Build(BuildTarget.StandaloneOSX, "Builds/macOS/MyGame.app");
    }

    [MenuItem("Build/Build WebGL")]
    public static void BuildWebGL()
    {
        Build(BuildTarget.WebGL, "Builds/WebGL");
    }

    [MenuItem("Build/Build Android")]
    public static void BuildAndroid()
    {
        // Set Android-specific settings
        PlayerSettings.Android.bundleVersionCode++;
        EditorUserBuildSettings.buildAppBundle = true; // AAB for Google Play
        Build(BuildTarget.Android, "Builds/Android/MyGame.aab");
    }

    [MenuItem("Build/Build iOS")]
    public static void BuildIOS()
    {
        Build(BuildTarget.iOS, "Builds/iOS");
    }

    private static void Build(BuildTarget target, string path)
    {
        var options = new BuildPlayerOptions
        {
            scenes = Scenes,
            locationPathName = path,
            target = target,
            options = BuildOptions.CleanBuildCache
        };

        BuildReport report = BuildPipeline.BuildPlayer(options);
        BuildSummary summary = report.summary;

        if (summary.result == BuildResult.Succeeded)
            Debug.Log($"Build succeeded: {summary.totalSize / 1024f / 1024f:F2} MB in {summary.totalTime.TotalSeconds:F1}s");
        else
            Debug.LogError($"Build failed: {summary.result}");
    }
}
#endif
```

### 7 — CI/CD Pipeline

#### GitHub Actions Example

```yaml
# .github/workflows/unity-build.yml
name: Unity Build

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          lfs: true

      - uses: game-ci/unity-test-runner@v4
        env:
          UNITY_LICENSE: ${{ secrets.UNITY_LICENSE }}
        with:
          projectPath: .
          testMode: all
          artifactsPath: test-results

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results
          path: test-results

  build:
    name: Build for ${{ matrix.targetPlatform }}
    needs: test
    runs-on: ubuntu-latest
    strategy:
      matrix:
        targetPlatform:
          - StandaloneWindows64
          - StandaloneOSX
          - StandaloneLinux64
          - WebGL

    steps:
      - uses: actions/checkout@v4
        with:
          lfs: true

      - uses: game-ci/unity-builder@v4
        env:
          UNITY_LICENSE: ${{ secrets.UNITY_LICENSE }}
        with:
          projectPath: .
          targetPlatform: ${{ matrix.targetPlatform }}
          buildName: MyGame
          versioning: Semantic

      - uses: actions/upload-artifact@v4
        with:
          name: build-${{ matrix.targetPlatform }}
          path: build/${{ matrix.targetPlatform }}
```

#### Secrets Setup for GameCI

1. Request a Unity license activation file.
2. Store the license in GitHub repo secrets as `UNITY_LICENSE`.
3. For Unity Plus/Pro, also set `UNITY_EMAIL`, `UNITY_PASSWORD`, `UNITY_SERIAL`.

### 8 — Version Management

```csharp
#if UNITY_EDITOR
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;

public class AutoVersionIncrement : IPreprocessBuildWithReport
{
    public int callbackOrder => 0;

    public void OnPreprocessBuild(BuildReport report)
    {
        // Auto-increment build number
        string version = PlayerSettings.bundleVersion;
        if (System.Version.TryParse(version, out var v))
        {
            string newVersion = $"{v.Major}.{v.Minor}.{v.Build + 1}";
            PlayerSettings.bundleVersion = newVersion;
            Debug.Log($"Version incremented: {version} → {newVersion}");
        }

        // Set Android version code
        PlayerSettings.Android.bundleVersionCode++;
        // Set iOS build number
        PlayerSettings.iOS.buildNumber = PlayerSettings.Android.bundleVersionCode.ToString();
    }
}
#endif
```

### 9 — Platform-Specific Considerations

#### Windows / macOS / Linux

| Item | Details |
|------|---------|
| IL2CPP | Recommended for release builds |
| Compression | LZ4HC for smallest size |
| Steam integration | Use Steamworks.NET package |
| Installer | Use Inno Setup (Windows) or create .dmg (macOS) |
| Code signing | Required for macOS notarisation; recommended on Windows |

#### Android

| Item | Details |
|------|---------|
| Minimum API Level | API 24+ (Android 7.0) recommended |
| Scripting Backend | IL2CPP (required for 64-bit ARM) |
| Build Output | AAB for Google Play; APK for sideloading |
| Keystore | **Sign the AAB/APK** — store the keystore safely, losing it means you can't update |
| Texture Compression | ASTC (default for modern devices) |
| Split APKs | Enable **Split Application Binary** for large APKs |

#### iOS

| Item | Details |
|------|---------|
| Xcode Project | Unity generates an Xcode project; archive and upload from Xcode |
| Signing | Requires Apple Developer certificate and provisioning profile |
| Scripting Backend | IL2CPP only |
| Minimum iOS Version | iOS 15+ recommended for Unity 6 |
| App Thinning | Enable bitcode and asset slicing |

#### WebGL

| Item | Details |
|------|---------|
| Compression | Brotli (smallest) or Gzip; configure server headers |
| Memory | Set initial memory size; enable memory growth |
| Threading | No multithreading support |
| Code Stripping | High recommended — large impact on .wasm size |
| Template | Create custom template for branding |
| Server config | Configure MIME types: `.wasm` → `application/wasm`, `.data` → `application/octet-stream` |

### 10 — Build Size Analysis

```csharp
#if UNITY_EDITOR
using UnityEditor;
using UnityEngine;

public static class BuildSizeAnalysis
{
    [MenuItem("Build/Log Build Report")]
    public static void LogBuildReport()
    {
        // After a build, check the Editor.log for size breakdown
        // or use the Build Report Inspector package
        Debug.Log("Check Editor.log for detailed build report.");
        Debug.Log($"Log path: {System.IO.Path.Combine(Application.persistentDataPath, "..", "Unity", "Editor", "Editor.log")}");
    }
}
#endif
```

**Editor.log** contains a detailed breakdown:

```
Used Assets and files from the Resources folder, sorted by uncompressed size:
 3.2 MB  Assets/Textures/Environment/ground_albedo.png
 2.8 MB  Assets/Audio/Music/main_theme.ogg
 ...

Build Report:
Textures        45.3 MB   52.1%
Meshes          12.1 MB   13.9%
Audio           10.5 MB   12.1%
Scripts          5.2 MB    6.0%
...
```

### 11 — Pre-Build Checklist

```markdown
## Release Build Checklist

### Assets
- [ ] Texture compression set per platform (ASTC/BC7/ETC2)
- [ ] Audio compression configured (Vorbis for music, ADPCM for SFX)
- [ ] Unused assets removed or excluded from build
- [ ] Addressable groups built and uploaded to CDN

### Settings
- [ ] Scripting Backend set to IL2CPP
- [ ] Managed Stripping Level set to Medium or High
- [ ] Development Build DISABLED
- [ ] Version number updated
- [ ] Splash screen configured (if required)
- [ ] Player resolution / orientation correct

### Quality
- [ ] All automated tests pass (Edit + Play Mode)
- [ ] No compiler warnings
- [ ] Profiled on target hardware — meets FPS target
- [ ] Memory usage within platform budget
- [ ] No `Debug.Log` calls in release (use [Conditional])

### Platform
- [ ] Android: Keystore configured, AAB signed
- [ ] iOS: Signing certificate valid, minimum iOS set
- [ ] WebGL: Compression configured, server MIME types set
- [ ] Console: TRC/Lotcheck requirements met

### Distribution
- [ ] Build uploaded to store / distribution platform
- [ ] Store listing metadata updated
- [ ] Patch notes written
```

## Best Practices

1. **Automate builds with CI/CD** — never rely on manual build-and-upload workflows.
2. **Use IL2CPP for release** — it's faster at runtime and enables code stripping.
3. **Build Addressables before the player build** — ensure content is up to date.
4. **Keep the keystore / signing certificates safe** — loss means you can't push updates.
5. **Profile the build size** — check Editor.log after each build to catch bloat early.
6. **Test on lowest target hardware** — optimise for the minimum spec, not your development machine.
7. **Use Build Profiles** (Unity 6) to maintain separate configs for each platform and build type.
8. **Strip debug code** from release builds using `[Conditional]` attributes and scripting defines.
9. **Tag builds with Git SHA** — include the commit hash in the build for traceability.
10. **Run tests in CI before building** — catch regressions before they reach builds.

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Build fails with IL2CPP stripping errors | Add types to `link.xml`; lower stripping level |
| Android build rejected on Play Store | Ensure 64-bit (arm64) target; use AAB format; check `targetSdkVersion` |
| iOS build signing fails | Renew certificates; match bundle ID with provisioning profile |
| WebGL build huge (100+ MB) | Enable code stripping (High); compress with Brotli; reduce textures |
| Addressables missing at runtime | Build Addressables before building the player; check catalog path |
| CI build hangs | Set `-quit` and `-batchmode` flags; add a timeout |
| Build output not found | Check `locationPathName` in build script; ensure target folder exists |
| `MissingMethodException` in IL2CPP build | Reflection-based code stripped; add to `link.xml` |
| WebGL doesn't load in browser | Configure server MIME types for `.wasm` and compressed files |
| Version not incrementing | Automate with `IPreprocessBuildWithReport` or CI pipeline |

## Reference

- [Build Settings](https://docs.unity3d.com/6000.0/Documentation/Manual/BuildSettings.html)
- [Player Settings](https://docs.unity3d.com/6000.0/Documentation/Manual/class-PlayerSettings.html)
- [IL2CPP Overview](https://docs.unity3d.com/6000.0/Documentation/Manual/IL2CPP.html)
- [Managed Code Stripping](https://docs.unity3d.com/6000.0/Documentation/Manual/ManagedCodeStripping.html)
- [Addressables System](https://docs.unity3d.com/Packages/com.unity.addressables@2.1/manual/index.html)
- [GameCI — Unity Actions](https://game.ci/docs/github/getting-started)
- [WebGL Build & Deployment](https://docs.unity3d.com/6000.0/Documentation/Manual/webgl-building.html)
- [Android Publishing](https://docs.unity3d.com/6000.0/Documentation/Manual/android-BuildProcess.html)
- [iOS Build Pipeline](https://docs.unity3d.com/6000.0/Documentation/Manual/iphone-BuildProcess.html)
