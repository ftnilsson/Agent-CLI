# Project Setup & Architecture

## Folder Structure

- Place scenes under `scenes/` with feature sub-folders: `levels/`, `characters/`, `ui/`
- Place scripts under `scripts/` with sub-folders: `autoload/`, `player/`, `systems/`
- Place `.tres` resource files under `resources/` organized by type
- Place raw assets under `assets/art/`, `assets/audio/`, `assets/fonts/`, `assets/shaders/`
- Place third-party plugins under `addons/`
- Place test files under `tests/`

## Renderer Selection

| Renderer | Use Case |
|----------|----------|
| Forward+ | Default for 3D — full feature set, modern hardware |
| Mobile | Mobile-optimized 3D, reduced feature set |
| Compatibility | WebGL, older hardware, widest platform support |

Use Forward+ unless targeting mobile or web platforms specifically.

## Autoloads

```gdscript
# scripts/autoload/event_bus.gd
extends Node

signal player_died
signal score_changed(new_score: int)
signal level_completed(level_id: int)
```

- Register global singletons in Project Settings → Globals → Autoload
- Create separate autoloads per responsibility: `EventBus`, `GameManager`, `SceneManager`, `AudioManager`, `SaveManager`
- Access autoloads by registered name: `EventBus.player_died.emit()`
- Never let autoloads grow into god objects — one responsibility each
- Autoloads coordinate systems; scenes own game logic

## Project Settings

- Set Viewport Width/Height to target resolution under Display → Window
- Set Stretch Mode to `canvas_items` and Stretch Aspect to `expand` for responsive scaling
- Define all Input Map actions before writing gameplay code: `move_left`, `move_right`, `jump`, `attack`, `interact`, `pause`
- Name all Collision Layers in Project Settings → Layer Names → 2D/3D Physics before placing nodes
- Configure Physics Ticks Per Second (default 60) under Physics

## Version Control

- Commit `export_presets.cfg` — it contains platform build configuration
- Never commit `.godot/` — add it to `.gitignore`
- Use `*.tscn merge=union` and `*.tres merge=union` in `.gitattributes` to reduce merge conflicts
- Track binary assets (`.png`, `.ogg`, `.glb`) with Git LFS

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Flat folder structure with all files at root | Organize into feature sub-folders immediately |
| Giant autoload handling unrelated systems | Split into focused single-responsibility autoloads |
| Hardcoded `res://` string paths scattered in scripts | Use `@export var scene: PackedScene` and `preload()` |
| Collision layers unnamed and unnumbered arbitrarily | Name all layers in Project Settings before building levels |
| `.godot/` committed to version control | Add to `.gitignore` — never commit generated cache |

## Best Practices

- Establish folder structure and autoloads before writing any gameplay code
- Use `class_name` on scripts that will be referenced by type elsewhere
- Keep scenes small and composable — avoid monolithic scenes with hundreds of nodes
- Set up export presets for all target platforms early to catch export issues during development
- Use `@export` and `preload()` instead of hardcoded string paths
- Configure collision layers with descriptive names before placing any physics bodies
- Use feature branches and merge via pull requests to reduce integration conflicts
- Set indent to tabs matching Godot convention; use `gdtoolkit` for CI formatting
