# 15 — Performance Optimization

## Description

Profile, diagnose, and fix performance bottlenecks in Unity 6 projects. This skill covers CPU and GPU profiling, draw-call optimization, memory management, object pooling, Level-of-Detail (LOD), occlusion culling, async loading, and platform-specific tuning.

## When To Use

- Frame rate drops below target (60 fps / 30 fps depending on platform).
- Profiler shows spikes in scripts, rendering, physics, or GC allocation.
- Memory usage is too high or the game crashes on target hardware.
- Build size needs to be reduced.
- Preparing for mobile, console, or VR where budgets are tighter.

## Prerequisites

| Skill | Why |
|-------|-----|
| [01 — Project Setup](../01-Project-Setup/skill.md) | Project configuration baselines |
| [02 — C# Scripting](../02-CSharp-Scripting/skill.md) | Understanding of managed vs. native code paths |

## Instructions

### 1 — Profiling Tools Overview

| Tool | Opens Via | Purpose |
|------|-----------|---------|
| **Unity Profiler** | Window ▸ Analysis ▸ Profiler | CPU, GPU, memory, rendering, physics, audio per frame |
| **Frame Debugger** | Window ▸ Analysis ▸ Frame Debugger | Step through every draw call in a frame |
| **Memory Profiler** | Package `com.unity.memoryprofiler` | Snapshot-based memory analysis |
| **Profile Analyzer** | Package `com.unity.performance.profile-analyzer` | Compare profiler captures statistically |
| **Rendering Debugger** | In play mode overlay (URP) | Overdraw, mip maps, wireframe |
| **Multiplayer Tools** | Network Profiler | Bandwidth per object/RPC |

**Always profile on target hardware** — editor overhead skews results.

### 2 — CPU Optimization

#### 2.1 — Reduce Per-Frame Work

```csharp
// BAD: Expensive call every frame
private void Update()
{
    var target = GameObject.FindWithTag("Player"); // Allocates + searches
    transform.LookAt(target.transform);
}

// GOOD: Cache references
private Transform _target;

private void Start()
{
    _target = GameObject.FindWithTag("Player").transform;
}

private void Update()
{
    transform.LookAt(_target);
}
```

#### 2.2 — Stagger Expensive Work

```csharp
using UnityEngine;

public class AIPerception : MonoBehaviour
{
    [SerializeField] private float _scanInterval = 0.2f;

    private float _nextScanTime;

    private void Update()
    {
        if (Time.time < _nextScanTime) return;
        _nextScanTime = Time.time + _scanInterval;

        PerformScan();
    }

    private void PerformScan()
    {
        // Expensive detection logic runs 5× per second instead of 60+
    }
}
```

#### 2.3 — Avoid Garbage Collection (GC) Allocation

| Anti-Pattern | Fix |
|-------------|-----|
| `GetComponent<T>()` every frame | Cache in `Awake()` or `Start()` |
| `string + string` concatenation in loops | Use `StringBuilder` or `string.Create` |
| `LINQ` in hot paths | Replace with manual loops |
| `foreach` on non-struct enumerators | Use `for` loops or `List<T>.ForEach` |
| `new List<T>()` per frame | Pre-allocate and `.Clear()` |
| Boxing value types (`object` params) | Use generics or typed overloads |
| `Physics.RaycastAll()` | Use `RaycastNonAlloc()` with pre-allocated array |
| `Camera.main` (Unity < 2020) | Cache the reference (Unity 6 caches internally, but still good practice) |

```csharp
// Pre-allocated physics buffers
private readonly Collider[] _overlapResults = new Collider[32];
private readonly RaycastHit[] _raycastResults = new RaycastHit[16];

private void DetectNearby(Vector3 center, float radius, LayerMask mask)
{
    int count = Physics.OverlapSphereNonAlloc(center, radius, _overlapResults, mask);
    for (int i = 0; i < count; i++)
    {
        ProcessHit(_overlapResults[i]);
        _overlapResults[i] = null; // Clear reference to avoid keeping objects alive
    }
}
```

#### 2.4 — Jobs System & Burst Compiler

For compute-heavy work (pathfinding, spatial queries, procedural generation), offload to worker threads:

```csharp
using Unity.Burst;
using Unity.Collections;
using Unity.Jobs;
using UnityEngine;

[BurstCompile]
public struct DistanceJob : IJobParallelFor
{
    [ReadOnly] public NativeArray<Vector3> Positions;
    public Vector3 Target;
    public NativeArray<float> Distances;

    public void Execute(int index)
    {
        Distances[index] = Vector3.Distance(Positions[index], Target);
    }
}

public class DistanceCalculator : MonoBehaviour
{
    public void CalculateDistances(Vector3[] positions, Vector3 target)
    {
        var positionsNative = new NativeArray<Vector3>(positions, Allocator.TempJob);
        var distances = new NativeArray<float>(positions.Length, Allocator.TempJob);

        var job = new DistanceJob
        {
            Positions = positionsNative,
            Target = target,
            Distances = distances
        };

        JobHandle handle = job.Schedule(positions.Length, 64);
        handle.Complete();

        // Read results from distances...

        positionsNative.Dispose();
        distances.Dispose();
    }
}
```

### 3 — Rendering Optimization

#### 3.1 — Draw Call Reduction

| Technique | How |
|-----------|-----|
| **Static Batching** | Mark non-moving objects as `Static` — Unity combines meshes at build time |
| **Dynamic Batching** | Automatic for small meshes (< 300 verts) with same material (URP setting) |
| **SRP Batcher** | Enabled by default in URP; groups materials by shader variant |
| **GPU Instancing** | Enable on material for many identical objects (trees, grass, rocks) |
| **Texture Atlasing** | Combine multiple textures into one atlas to share materials |

Check draw calls in the **Profiler Rendering module** or the **Frame Debugger**.

#### 3.2 — Level of Detail (LOD)

```
LOD Group Component Setup:
- LOD 0 (0%-50%):    Full-detail mesh (100% screen height threshold)
- LOD 1 (50%-25%):   Medium mesh (~50% triangles)
- LOD 2 (25%-10%):   Low mesh (~25% triangles)
- Culled (< 10%):    Not rendered at all
```

```csharp
// Programmatic LOD adjustment for performance scaling
using UnityEngine;

public class QualityAdjuster : MonoBehaviour
{
    public void SetLODBias(float bias)
    {
        // Higher bias = higher quality LODs at greater distance
        // Lower bias = switch to lower LODs sooner
        QualitySettings.lodBias = bias; // Default is 2.0
    }
}
```

#### 3.3 — Occlusion Culling

1. Mark static geometry as **Occluder Static** and/or **Occludee Static**.
2. Open **Window ▸ Rendering ▸ Occlusion Culling**.
3. Bake the occlusion data.
4. Camera automatically skips rendering objects hidden behind walls.

For dynamic occlusion, Unity 6 URP supports the **GPU Occlusion Culling** feature.

#### 3.4 — Camera & Rendering Settings

| Setting | Optimisation |
|---------|-------------|
| **Far Clip Plane** | Reduce to minimum acceptable distance |
| **MSAA** | 2× or off for mobile; 4× for desktop |
| **HDR** | Disable if not needed (saves bandwidth) |
| **Shadows** | Reduce cascade count (2 for mobile); lower shadow distance |
| **Render Scale** | < 1.0 renders at lower resolution then upscales |
| **Depth Texture / Opaque Texture** | Disable if no effects use them |

### 4 — Memory Optimization

#### 4.1 — Texture Settings

| Setting | Recommendation |
|---------|---------------|
| **Max Size** | Use the smallest that looks acceptable (512-1024 for most, 2048 for hero assets) |
| **Compression** | ASTC (mobile), BC7/DXT5 (desktop), ETC2 (Android fallback) |
| **Mipmaps** | Enable for 3D; disable for UI/sprites |
| **Read/Write** | Disable unless you need CPU access (doubles memory) |

#### 4.2 — Audio Clip Settings

| Setting | Recommendation |
|---------|---------------|
| **Load Type** | `Decompress On Load` for short SFX; `Streaming` for music |
| **Compression** | Vorbis (quality 50-70%) for most; ADPCM for frequent short clips |
| **Force To Mono** | Enable for SFX that don't need stereo |
| **Preload Audio Data** | Disable for large/infrequent sounds |

#### 4.3 — Addressables & Async Loading

Avoid loading everything at startup. Use Addressables to load/unload groups on demand:

```csharp
using UnityEngine;
using UnityEngine.AddressableAssets;
using UnityEngine.ResourceManagement.AsyncOperations;

public class AsyncLoader : MonoBehaviour
{
    [SerializeField] private AssetReference _prefabRef;
    private AsyncOperationHandle<GameObject> _handle;

    public async void LoadAndInstantiate(Vector3 position)
    {
        _handle = Addressables.InstantiateAsync(_prefabRef, position, Quaternion.identity);
        await _handle.Task;

        if (_handle.Status == AsyncOperationStatus.Succeeded)
            Debug.Log($"Loaded: {_handle.Result.name}");
    }

    public void Unload()
    {
        if (_handle.IsValid())
            Addressables.ReleaseInstance(_handle);
    }
}
```

### 5 — Object Pooling

Reuse objects instead of creating/destroying them:

```csharp
using UnityEngine;
using UnityEngine.Pool;

public class BulletPool : MonoBehaviour
{
    [SerializeField] private Bullet _bulletPrefab;
    [SerializeField] private int _defaultCapacity = 20;
    [SerializeField] private int _maxSize = 100;

    private IObjectPool<Bullet> _pool;

    public IObjectPool<Bullet> Pool => _pool;

    private void Awake()
    {
        _pool = new ObjectPool<Bullet>(
            createFunc: () =>
            {
                var bullet = Instantiate(_bulletPrefab);
                bullet.SetPool(_pool);
                return bullet;
            },
            actionOnGet: bullet => bullet.gameObject.SetActive(true),
            actionOnRelease: bullet => bullet.gameObject.SetActive(false),
            actionOnDestroy: bullet => Destroy(bullet.gameObject),
            defaultCapacity: _defaultCapacity,
            maxSize: _maxSize
        );
    }

    public Bullet Get(Vector3 position, Quaternion rotation)
    {
        var bullet = _pool.Get();
        bullet.transform.SetPositionAndRotation(position, rotation);
        return bullet;
    }
}

public class Bullet : MonoBehaviour
{
    private IObjectPool<Bullet> _pool;
    [SerializeField] private float _lifetime = 3f;

    public void SetPool(IObjectPool<Bullet> pool) => _pool = pool;

    private void OnEnable()
    {
        CancelInvoke();
        Invoke(nameof(ReturnToPool), _lifetime);
    }

    private void ReturnToPool()
    {
        _pool.Release(this);
    }
}
```

### 6 — Physics Optimization

| Setting | Where | Recommendation |
|---------|-------|---------------|
| **Fixed Timestep** | Project Settings ▸ Time | 0.02 (50Hz) default; raise to 0.03+ for less critical physics |
| **Layer Collision Matrix** | Project Settings ▸ Physics | Uncheck layer pairs that never need to collide |
| **Default Solver Iterations** | Project Settings ▸ Physics | Lower for simple games (4-6 instead of default 6) |
| **Auto Sync Transforms** | Project Settings ▸ Physics | Disable — call `Physics.SyncTransforms()` manually if needed |
| **Reuse Collision Callbacks** | Project Settings ▸ Physics | Enable to reduce GC per collision event |

```csharp
// Disable auto-simulation for deterministic physics
// Physics.simulationMode = SimulationMode.Script;
// Then call Physics.Simulate(Time.fixedDeltaTime) manually.
```

### 7 — Script Optimization Patterns

#### Disable Unused Components

```csharp
// Disable AI for off-screen enemies
private void OnBecameInvisible() => enabled = false;
private void OnBecameVisible() => enabled = true;
```

#### Spatial Partitioning for Large Worlds

For hundreds/thousands of entities, avoid `O(n²)` checks:

```csharp
using System.Collections.Generic;
using UnityEngine;

public class SpatialGrid<T>
{
    private readonly Dictionary<Vector2Int, List<T>> _cells = new();
    private readonly float _cellSize;

    public SpatialGrid(float cellSize) => _cellSize = cellSize;

    public Vector2Int GetCell(Vector3 position)
    {
        return new Vector2Int(
            Mathf.FloorToInt(position.x / _cellSize),
            Mathf.FloorToInt(position.z / _cellSize)
        );
    }

    public void Insert(Vector3 position, T item)
    {
        var cell = GetCell(position);
        if (!_cells.TryGetValue(cell, out var list))
        {
            list = new List<T>();
            _cells[cell] = list;
        }
        list.Add(item);
    }

    public void Clear() => _cells.Clear();

    public IEnumerable<T> GetNearby(Vector3 position, int radius = 1)
    {
        var center = GetCell(position);
        for (int x = -radius; x <= radius; x++)
        for (int y = -radius; y <= radius; y++)
        {
            var cell = new Vector2Int(center.x + x, center.y + y);
            if (_cells.TryGetValue(cell, out var list))
            {
                foreach (var item in list)
                    yield return item;
            }
        }
    }
}
```

### 8 — Platform-Specific Budgets

| Platform | Target FPS | Tri Budget/Frame | Draw Calls | Memory |
|----------|-----------|-------------------|------------|--------|
| **PC (mid)** | 60 | 1-5M | 2000-5000 | 4-8 GB |
| **Mobile** | 30-60 | 100K-500K | 100-300 | 500 MB-1.5 GB |
| **Console** | 30-60 | 2-10M | 2000-5000 | 3-8 GB |
| **VR** | 72-120 | 500K-2M | 100-500 | 2-4 GB |

### 9 — Automated Performance Monitoring

```csharp
using UnityEngine;

public class PerformanceMonitor : MonoBehaviour
{
    [SerializeField] private float _updateInterval = 0.5f;

    private float _accum;
    private int _frames;
    private float _fps;

    private void Update()
    {
        _accum += Time.unscaledDeltaTime;
        _frames++;

        if (_accum >= _updateInterval)
        {
            _fps = _frames / _accum;
            _accum = 0f;
            _frames = 0;

            if (_fps < 30f)
                Debug.LogWarning($"Low FPS: {_fps:F1}");
        }
    }

    // Expose for debug UI
    public float CurrentFPS => _fps;
    public float FrameTime => 1000f / Mathf.Max(_fps, 0.001f);
}
```

## Best Practices

1. **Profile first, optimise second** — never guess where the bottleneck is.
2. **Set a frame budget** and stick to it: ~16.6 ms for 60 fps, ~33.3 ms for 30 fps.
3. **Profile on target device** — editor adds overhead that hides or creates false bottlenecks.
4. **Use Deep Profiling sparingly** — it adds significant overhead; use Profiler Markers for targeted measurements.
5. **Batch GC-heavy operations** to loading screens or pauses using `GC.Collect()` + `GarbageCollector.GCMode`.
6. **Pool everything** that spawns and despawns frequently (projectiles, effects, enemies, UI elements).
7. **Use Addressables** to load/unload asset groups — avoid keeping unused assets in memory.
8. **Compress textures aggressively** — visual quality loss is often imperceptible.
9. **Reduce shadow distance and cascades** on mobile — shadows are one of the biggest GPU costs.
10. **Keep the Layer Collision Matrix tight** — unchecked pairs skip broadphase entirely.

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Profiling only in the editor | Always profile dev builds on target hardware |
| GC spikes every few seconds | Find and eliminate per-frame allocations; use `Profiler.BeginSample` to isolate |
| Draw calls too high | Enable SRP Batcher; use material atlasing; static-batch environment |
| Texture memory exhausted on mobile | Set platform-specific Max Size overrides; use ASTC compression |
| `FindObjectOfType` in `Update` | Cache references at initialization |
| Physics `FixedUpdate` running too often | Raise `Fixed Timestep` if precision isn't critical |
| Shadows rendering everywhere | Set shadow distance to match gameplay area; use shadow cascades wisely |
| Addressables not releasing | Always call `Addressables.Release()` or `ReleaseInstance()` when done |
| Async operations blocking main thread | Use `await` with Unity's async patterns or coroutines; avoid `.Result` |

## Reference

- [Unity Profiler](https://docs.unity3d.com/6000.0/Documentation/Manual/Profiler.html)
- [Frame Debugger](https://docs.unity3d.com/6000.0/Documentation/Manual/FrameDebugger.html)
- [Memory Profiler Package](https://docs.unity3d.com/Packages/com.unity.memoryprofiler@1.1/manual/index.html)
- [Object Pooling API](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Pool.ObjectPool-1.html)
- [Jobs System](https://docs.unity3d.com/6000.0/Documentation/Manual/JobSystem.html)
- [Burst Compiler](https://docs.unity3d.com/Packages/com.unity.burst@1.8/manual/index.html)
- [Optimization Best Practices](https://docs.unity3d.com/6000.0/Documentation/Manual/BestPracticeGuides.html)
