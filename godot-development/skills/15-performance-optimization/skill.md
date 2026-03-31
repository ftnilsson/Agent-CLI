# Performance Optimization

## Profiling First

- Always profile before optimizing — open Debugger → Profiler tab while the game runs
- Identify the actual bottleneck: Process Time (CPU scripts), Physics Time, or Idle Time (GPU-bound)
- Measure specific sections with `Time.get_ticks_usec()` before and after suspect code
- Check Debugger → Monitors for draw calls, object count, and memory usage
- Never optimize code that is not shown by the profiler to be a bottleneck

## Process Throttling

```gdscript
var _check_timer: float = 0.0
const CHECK_INTERVAL := 0.2  # 5× per second instead of 60×

func _process(delta: float) -> void:
    _check_timer += delta
    if _check_timer < CHECK_INTERVAL:
        return
    _check_timer = 0.0
    _run_expensive_check()
```

- Throttle expensive checks (group queries, distance scans) to run 5–10× per second, not every frame
- Use `distance_squared_to()` instead of `distance_to()` for all range comparisons — avoids square root
- Call `set_process(false)` and `set_physics_process(false)` on nodes that do not need per-frame updates
- Avoid allocating `Array`, `Dictionary`, or objects inside `_process()` — allocate in `_ready()` and reuse

## Object Pooling

- Pool all frequently spawned/destroyed objects: bullets, particles, coins, enemies
- Pre-instantiate pool objects in `_ready()`, hide them, and disable processing
- Acquire from pool by finding a hidden/inactive object; release by hiding and disabling
- Grow the pool automatically when exhausted rather than returning null

## Rendering Optimization

**2D:**
- Use texture atlases (sprite sheets) to reduce texture bind switches
- Use `CanvasGroup` to batch child `CanvasItem` draw calls into one
- Minimize unique `Material` instances — shared materials batch automatically
- Avoid changing `z_index` per-frame — layer changes break batching

**3D:**
- Use `MultiMeshInstance3D` for thousands of identical objects (grass, trees, rocks, debris)
- Enable occlusion culling for indoor or complex scenes
- Use `LODGroup` or manual distance checks for level-of-detail switching
- Merge static geometry at edit time — fewer draw calls for non-moving level geometry

## Physics Optimization

- Use simplified collision shapes: capsule/sphere/box over `ConcavePolygonShape` or mesh
- Set collision masks precisely — unnecessary layer overlaps cause redundant physics checks
- Disable collision shapes on off-screen or inactive objects
- Use `CharacterBody.motion_mode = GROUNDED` for platformers to reduce internal raycasts

## Memory Management

- Set large resource references to `null` in `_exit_tree()` to allow garbage collection
- Preload heavy assets in `_ready()` or at load time — never load synchronously during gameplay
- Use `ResourceLoader.load_threaded_request()` for large assets to avoid frame hitches
- Monitor memory growth in Debugger → Monitors → Memory during extended play sessions

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Optimizing before profiling | Profile first — find the actual bottleneck |
| `get_tree().get_nodes_in_group()` every frame | Cache results; use `Area` for detection |
| `get_node()` calls inside `_process()` | Cache with `@onready` in `_ready()` |
| `distance_to()` for range comparisons | Use `distance_squared_to()` — no square root |
| `Array`/`Dictionary` created inside `_process()` | Pre-allocate in `_ready()`, reuse every frame |
| Unique material per object instance | Share materials across objects for automatic batching |

## Best Practices

- Profile on the target platform — PC performance does not predict mobile performance
- Pool bullets, particles, and any object spawned more than a few times per second
- Use `call_deferred()` to spread non-urgent operations across frames
- Move heavy calculations to a background thread with `WorkerThreadPool.add_task()`
- Disable processing on nodes outside the camera frustum or beyond a distance threshold
- Keep draw call count below 200 for mobile; below 1000 for desktop as a rough target
- Use `MultiMeshInstance3D` for any 3D objects repeated more than ~50 times in the scene
