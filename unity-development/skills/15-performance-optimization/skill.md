# Performance Optimization

## Profiling Tools

- Always profile on target hardware — Editor overhead produces false results
- Use **Unity Profiler** (Window → Analysis → Profiler) for CPU, GPU, memory, rendering, and physics per-frame analysis
- Use **Frame Debugger** (Window → Analysis → Frame Debugger) to inspect every draw call in a frame
- Use **Memory Profiler** (`com.unity.memoryprofiler`) for snapshot-based memory leak detection
- Use **Profile Analyzer** (`com.unity.performance.profile-analyzer`) to compare captures statistically
- Set a frame budget: 16.6ms for 60 FPS, 33.3ms for 30 FPS — work backwards from there

## CPU: Eliminate Per-Frame Allocations

- Cache all component references in `Awake()` — never call `GetComponent<T>()` in `Update()`
- Never use `FindObjectOfType<T>()`, `FindWithTag()`, or `FindObjectsByType<T>()` in `Update()`
- Use `RaycastNonAlloc` / `OverlapSphereNonAlloc` / `OverlapBoxNonAlloc` with pre-allocated arrays
- Avoid LINQ in `Update()` — use `for` loops and pre-allocated `List<T>` instead
- Avoid boxing: do not pass value types as `object`; use generic overloads
- Clear and reuse collections: `_list.Clear()` not `_list = new List<T>()`

```csharp
private readonly Collider[] _overlapBuffer = new Collider[32];

private void Scan(Vector3 center, float radius, LayerMask mask)
{
    int count = Physics.OverlapSphereNonAlloc(center, radius, _overlapBuffer, mask);
    for (int i = 0; i < count; i++) Process(_overlapBuffer[i]);
}
```

## CPU: Stagger Expensive Work

- Run AI perception, pathfinding, and heavy queries on an interval (0.1–0.5s), not every frame
- Use `Time.frameCount % interval == 0` to distribute work across frames for large entity counts
- Use `OnBecameInvisible()` / `OnBecameVisible()` to disable AI and animation on off-screen objects

## CPU: Jobs System & Burst Compiler

- Use `IJobParallelFor` with `[BurstCompile]` for compute-heavy work (spatial queries, procedural generation, physics prediction)
- Use `NativeArray<T>` with `Allocator.TempJob` for job data — dispose after `handle.Complete()`
- Use `Allocator.Persistent` for long-lived buffers; dispose in `OnDestroy()`

## Rendering: Draw Call Reduction

- Mark all non-moving environment objects as **Static** for static batching at build time
- Enable **GPU Instancing** on materials for repeated identical meshes (trees, rocks, grass)
- Enable **SRP Batcher** (default in URP 6) — group materials by shader to reduce set-pass calls
- Build **Sprite Atlases** for UI sprites — reduces UI draw calls to one per atlas
- Pack multiple mask textures into one RGBA texture (R=metallic, G=AO, B=detail, A=smoothness)

## Rendering: LOD and Culling

- Add `LODGroup` to all significant environment assets: LOD0 (full), LOD1 (50%), LOD2 (25%), Culled (< 10%)
- Bake **Occlusion Culling** for indoor environments — cameras skip rendering occluded geometry
- Reduce far clip plane to the minimum acceptable distance for the scene
- Reduce shadow distance and cascade count for mobile — shadows are the largest GPU cost

## Rendering: URP Camera Settings

- Disable HDR on cameras that do not use bloom or color grading
- Set MSAA to 2× for mobile; 4× for desktop
- Set Render Scale < 1.0 with DLSS/FSR upscaling for performance headroom
- Disable Depth Texture and Opaque Texture passes when no effects use them

## Memory: Textures

- Set platform-specific Max Size overrides: 512–1024 for most assets, 2048 for hero assets only
- Use ASTC compression on mobile, BC7/DXT5 on desktop
- Disable mipmaps on UI sprites and 2D game textures
- Disable Read/Write on textures that do not need CPU access

## Object Pooling

- Pool all objects that spawn and despawn at runtime: projectiles, VFX, enemies, UI popups
- Use `UnityEngine.Pool.ObjectPool<T>` — built-in pool with collection check and max size
- Pre-warm pools during loading screens, not during gameplay spikes

## Physics

- Raise Fixed Timestep to 0.03–0.04 for mobile when precise physics is not required
- Disable all unused layer pairs in the Layer Collision Matrix — zero-cost broadphase skip
- Enable `Reuse Collision Callbacks` in Physics Settings to eliminate per-collision GC
- Disable `Auto Sync Transforms` and call `Physics.SyncTransforms()` manually when needed

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Profiling only in the Editor | Profile dev builds on target hardware |
| GC spikes every few seconds | Find and eliminate per-frame allocations |
| `FindObjectOfType` in `Update()` | Cache reference at initialization |
| `RaycastAll` in hot paths | Use `RaycastNonAlloc` with pre-allocated buffer |
| No LOD on environment assets | Add `LODGroup` with at least three levels |
| Addressables not released | Always call `Addressables.Release()` or `ReleaseInstance()` |
| `.Result` on async operations | Use `await` — `.Result` blocks the main thread |

## Best Practices

- Add `ProfilerMarker` to expensive systems: `using (s_MyMarker.Auto()) { ... }` — appears in Profiler timeline
- Use Addressables to load and unload asset groups on demand — avoid loading everything at startup
- Platform budgets: Mobile ≤ 300 draw calls, ≤ 500K triangles, ≤ 1.5 GB memory; VR ≤ 500 draw calls at 72+ FPS
- Use `QualitySettings.lodBias` to adjust LOD aggressiveness per platform at runtime
- Batch GC-heavy operations to loading screens using `System.GC.Collect()` and `GarbageCollector.GCMode`
