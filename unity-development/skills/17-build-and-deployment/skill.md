# Build & Deployment

## Build Settings (Unity 6)

- Use **Build Profiles** (File → Build Profiles) for per-platform saved configurations — Unity 6 replaces the old single Build Settings window
- Create separate profiles: `Windows Release`, `Android Debug`, `WebGL`, `iOS Release`
- Each profile stores: platform, scene list, scripting define symbols, compression method, Development Build flag
- Always include `Bootstrap.unity` at index 0 in the scene list; add all other scenes in load order

## Player Settings

- Set Scripting Backend to **IL2CPP** for all release builds — faster runtime performance and enables code stripping
- Keep **Mono** for Editor iteration (faster script compilation)
- Set API Compatibility Level to `.NET Standard 2.1`
- Set Managed Stripping Level to **Medium** for most projects; **High** for WebGL
- Protect reflection-dependent types in `Assets/link.xml`:

```xml
<linker>
    <assembly fullname="MyGame.Runtime" preserve="all" />
    <assembly fullname="UnityEngine" preserve="nothing">
        <type fullname="UnityEngine.JsonUtility" preserve="all" />
    </assembly>
</linker>
```

## Scripting Define Symbols

- Define `DEMO_BUILD`, `ENABLE_CHEATS`, `ANALYTICS_ENABLED` per profile via Player Settings → Other Settings → Scripting Define Symbols
- Use defines to gate content, not core game logic — `#if DEMO_BUILD maxLevel = 3; #endif`
- Strip debug consoles and logging in release with scripting defines — never rely on runtime flags alone

## Addressables

- Build Addressables **before** building the player — run `AddressableAssetSettings.BuildPlayerContent()` in CI before the build step
- Organize groups: `Built-In` (packed with player), `Levels` (load per level), `Audio` (stream), `DLC` (remote CDN)
- Release handles after use: `Addressables.Release(handle)` or `Addressables.ReleaseInstance(handle)`
- Check download size before downloading: `await Addressables.GetDownloadSizeAsync(label)`

## Automated Build Script

```csharp
#if UNITY_EDITOR
public static class BuildScript
{
    [MenuItem("Build/Build Windows")]
    public static void BuildWindows()
    {
        var options = new BuildPlayerOptions
        {
            scenes = new[] { "Assets/Scenes/Bootstrap.unity", "Assets/Scenes/MainMenu.unity", "Assets/Scenes/Game.unity" },
            locationPathName = "Builds/Windows/MyGame.exe",
            target = BuildTarget.StandaloneWindows64,
            options = BuildOptions.CleanBuildCache
        };
        BuildReport report = BuildPipeline.BuildPlayer(options);
        Debug.Log(report.summary.result == BuildResult.Succeeded
            ? $"Build succeeded: {report.summary.totalSize / 1024f / 1024f:F2} MB"
            : $"Build failed: {report.summary.result}");
    }
}
#endif
```

## CI/CD Pipeline (GitHub Actions)

- Use `game-ci/unity-test-runner@v4` to run Edit Mode and Play Mode tests before every build
- Use `game-ci/unity-builder@v4` with a matrix of `targetPlatform` for parallel multi-platform builds
- Store `UNITY_LICENSE` as a GitHub secret — never commit license files
- Set `versioning: Semantic` in the builder action to auto-increment version from git tags
- Upload build artifacts with `actions/upload-artifact@v4`

## Version Management

- Auto-increment version in `IPreprocessBuildWithReport.OnPreprocessBuild()` — parse `PlayerSettings.bundleVersion` and increment the patch component
- Increment `PlayerSettings.Android.bundleVersionCode` on every Android build
- Sync iOS build number with the Android bundle version code for consistency

## Platform-Specific Rules

**Android:**
- Target API 24+ (Android 7.0 minimum); set `targetSdkVersion` to latest stable
- Build AAB (`.aab`) for Google Play; APK for sideloading — set `EditorUserBuildSettings.buildAppBundle = true`
- Sign the AAB with a keystore; store the keystore file and password safely — losing it prevents future updates
- Enable IL2CPP for 64-bit ARM compliance (required by Google Play)

**iOS:**
- Unity generates an Xcode project — archive and upload from Xcode, not directly from Unity
- Requires valid Apple Developer certificate and provisioning profile before build
- IL2CPP only — Mono is not supported on iOS
- Set minimum iOS version to iOS 15 for Unity 6

**WebGL:**
- Enable code stripping at High level — has the largest impact on `.wasm` file size
- Use Brotli compression; configure server with MIME type `application/wasm` for `.wasm` files
- WebGL does not support multithreading or native plugins
- Set initial memory size appropriate to the game; enable Memory Growth for variable-size content

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| IL2CPP stripping errors at runtime | Add types to `link.xml`; lower stripping level temporarily |
| Android build rejected on Play Store | Use AAB format; ensure 64-bit target; check `targetSdkVersion` |
| Addressables missing at runtime | Build Addressables before building the player |
| WebGL build > 100 MB | Enable High stripping; use Brotli; reduce texture sizes |
| Lost Android keystore | Store keystore + password in a secure password manager and version control vault |
| `MissingMethodException` in IL2CPP | Reflection-based code stripped — add to `link.xml` |
| Manual build-and-upload workflow | Automate with CI/CD — human error on every release |

## Best Practices

- Run all automated tests in CI before every build — catch regressions before they reach distribution
- Profile build size after every build: check Editor.log for the assets-by-size breakdown
- Tag builds with Git SHA — embed `Application.version` + short commit hash in crash reports
- Test on the lowest target hardware spec — optimize for minimum, not development machine
- Disable Development Build flag on all release profiles — strips profiler overhead and debug symbols
- Keep signing certificates and keystore files backed up in a secure location separate from the repository
