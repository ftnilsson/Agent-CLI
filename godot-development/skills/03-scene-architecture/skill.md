# Scene Architecture & Management

## Scene Composition Rules

- Keep scenes small and single-purpose — one scene per logical entity (player, enemy, door, HUD)
- Compose level scenes from instanced sub-scenes, not from hundreds of inline nodes
- Use scene inheritance for variants: create `enemy_base.tscn` then extend to `enemy_goblin.tscn`
- Use `Marker2D` / `Marker3D` nodes for spawn points and reference positions — never hardcode coordinates
- Organize scenes by feature: `scenes/characters/`, `scenes/ui/`, `scenes/levels/`
- Never call `get_tree().change_scene_to_file()` directly — always route through a `SceneManager` autoload

## Scene Transitions

```gdscript
# scripts/autoload/scene_manager.gd
extends Node

signal transition_finished

func change_scene(path: String) -> void:
    _animation.play("fade_out")
    await _animation.animation_finished
    get_tree().change_scene_to_file(path)
    _animation.play("fade_in")
    await _animation.animation_finished
    transition_finished.emit()

func reload_current_scene() -> void:
    change_scene(get_tree().current_scene.scene_file_path)
```

## Async Scene Loading

- Use `ResourceLoader.load_threaded_request(path)` for large scenes to avoid main-thread stalls
- Poll status with `ResourceLoader.load_threaded_get_status(path, progress)` each frame
- Show a loading screen while polling; remove it after `THREAD_LOAD_LOADED` status
- Call `get_tree().change_scene_to_packed(scene)` once the packed scene is ready
- Handle `THREAD_LOAD_FAILED` with `push_error()` and graceful fallback

## Additive Scene Loading

- Load overlays, sub-levels, and UI screens additively with `scene.instantiate()` + `add_child()`
- Track additively loaded scenes in a dictionary keyed by path for clean removal
- Always call `queue_free()` on additively loaded nodes when unloading

## PackedScene Instancing

- Use `@export var scene: PackedScene` for editor-assignable scene references
- Cast the instantiated result to its expected type: `var enemy := enemy_scene.instantiate() as EnemyBase`
- Never use hardcoded `preload()` paths inside methods that run frequently

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Single monolithic scene with hundreds of nodes | Break into small, instanced sub-scenes |
| `get_tree().change_scene_to_file()` called directly from game nodes | Route all transitions through SceneManager autoload |
| Circular scene references (A instances B instances A) | Use signals or autoloads to break the cycle |
| Nodes added via `add_child()` never freed | Always call `queue_free()` or track and remove explicitly |
| Hardcoded scene paths as string literals in scripts | Use `@export var scene: PackedScene` |
| Loading large scenes synchronously on the main thread | Use `ResourceLoader.load_threaded_request()` |

## Best Practices

- Instance sub-scenes via `@export var scene: PackedScene` — assign in the editor, not in code
- Use a single `SceneManager` autoload for all scene transitions and additive loads
- Play transition animations (fade out → change → fade in) to mask loading hitches
- Reload the current scene through `SceneManager.reload_current_scene()` for consistency
- Group related instanced nodes under named parent nodes (`Enemies`, `Pickups`, `Platforms`)
- Free all dynamically added children in `_exit_tree()` or via explicit unload calls
- Test scene transitions under slow conditions by artificially adding delays during development
