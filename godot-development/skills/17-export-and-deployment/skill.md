# Export & Deployment

## Export Template Setup

- Install export templates via Editor → Manage Export Templates → Download and Install
- Templates are version-specific — reinstall when upgrading Godot
- Create export presets early in development — do not wait until release

## Export Preset Configuration

| Platform | Required Configuration |
|----------|----------------------|
| Windows | Product name, company, version, `.ico` icon (256×256) |
| macOS | Bundle identifier, short version, `.icns` icon, codesign identity for distribution |
| Linux | Binary format (`x86_64`), no special requirements for basic export |
| Android | Package name, version code/name, keystore paths, target architectures (`arm64-v8a` required for Play Store) |
| iOS | Bundle identifier, short version, icons at all required sizes, Xcode required for signing |
| Web | Thread support variant, VRAM texture compression for WebGL compatibility |

## Feature Tags

```gdscript
func _ready() -> void:
    if OS.has_feature("mobile"):
        _setup_touch_controls()
    elif OS.has_feature("pc"):
        _setup_keyboard_controls()
    if OS.has_feature("web"):
        _disable_file_dialogs()
    if OS.has_feature("debug"):
        _enable_debug_overlay()
```

- Use `OS.has_feature()` to branch on platform and build type — never use hardcoded platform strings
- Add custom feature tags per preset in the Export dialog for fine-grained conditional behavior
- Keep `export_presets.cfg` in version control — it contains platform build configuration

## Reducing Export Size

- Add exclusion filters in export preset: `*.md`, `*.txt`, `tests/*`, `docs/*`
- Place a `.gdignore` file in any folder to exclude it entirely from export
- Enable Strip Debug Symbols for release builds
- Use VRAM compression for 3D textures; use Lossless for 2D pixel art
- Disable unused engine modules via Project Settings for the export target

## CI/CD with GitHub Actions

```yaml
name: Build
on:
  push:
    tags: ['v*']
jobs:
  export:
    runs-on: ubuntu-latest
    container:
      image: barichello/godot-ci:4.3
    strategy:
      matrix:
        include:
          - preset: "Windows Desktop"
            path: build/windows/game.exe
          - preset: "Linux/X11"
            path: build/linux/game
          - preset: "Web"
            path: build/web/game.html
    steps:
      - uses: actions/checkout@v4
      - name: Export
        run: |
          mkdir -p $(dirname ${{ matrix.path }})
          godot --headless --export-release "${{ matrix.preset }}" ${{ matrix.path }}
      - uses: actions/upload-artifact@v4
        with:
          name: ${{ matrix.preset }}
          path: $(dirname ${{ matrix.path }})/
```

## Web Export Requirements

- Serve web exports over HTTPS — `SharedArrayBuffer` requires secure context
- Set `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers
- Test with a local HTTP server — `file://` protocol does not work for web exports
- Use the Thread support export variant for multi-threaded performance

## Android Signing

- Generate a debug keystore for local testing: `keytool -genkey -v -keystore debug.keystore`
- Generate a release keystore for Play Store distribution — store it securely, never in version control
- Set keystore paths and passwords in the Android export preset

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Export templates missing | Install via Editor → Manage Export Templates before exporting |
| Web export tested by opening `.html` directly | Use a local HTTP server — `file://` blocks SharedArrayBuffer |
| Release keystore committed to version control | Store keystores outside the repo; use CI secrets |
| Test and dev files included in export | Add `tests/*`, `*.md`, `.gdignore` exclusion filters |
| Export only tested at end of development | Export and test on target hardware after every milestone |
| Platform differences handled with `if "windows" in OS.get_name()` | Use `OS.has_feature("pc")` / `OS.has_feature("mobile")` |

## Best Practices

- Test exports on target hardware at every milestone — desktop FPS does not predict mobile FPS
- Keep `export_presets.cfg` in version control alongside source
- Automate CI builds triggered on version tags — catch export issues immediately
- Use `OS.has_feature()` for all platform-conditional code
- Strip debug symbols and exclude test files from all release builds
- Deploy web builds to itch.io or a static host with correct CORS headers configured
- Store version string in `project.godot` under `[application] config/version` and read it at runtime
