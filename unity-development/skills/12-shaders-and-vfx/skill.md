# Shaders & Visual Effects

## URP Pipeline Requirements

- Ensure a `UniversalRenderPipelineAsset` is assigned in Edit → Project Settings → Graphics
- Use **Forward+** renderer (default in Unity 6 URP) for most games
- Inject custom render passes via `ScriptableRendererFeature` — never modify built-in pipeline passes directly
- Drive post-processing and environment settings through the **Volume** framework

## Shader Graph

- Create shaders via Assets → Create → Shader Graph → URP → Lit Shader Graph (or Unlit, Sprite Lit)
- Click **Save Asset** in the Shader Graph window after every change — Unity does not auto-save graph edits
- Expose properties via the Blackboard panel as `Float`, `Color`, `Texture2D`, `Vector` — access from C# via `MaterialPropertyBlock`
- Cache `Shader.PropertyToID("_PropertyName")` as `static readonly int` — never use string lookups in Update

## MaterialPropertyBlock

- Use `MaterialPropertyBlock` for per-instance material overrides — never use `renderer.material` (creates a clone per call)
- Get the block: `renderer.GetPropertyBlock(_mpb)`, modify it, then `renderer.SetPropertyBlock(_mpb)`
- `renderer.sharedMaterial` reads the global material — setting values on it affects all objects using that material

```csharp
private static readonly int DissolveAmount = Shader.PropertyToID("_DissolveAmount");
private MaterialPropertyBlock _mpb;

private void Awake() => _mpb = new MaterialPropertyBlock();

public void SetDissolve(float t)
{
    _renderer.GetPropertyBlock(_mpb);
    _mpb.SetFloat(DissolveAmount, t);
    _renderer.SetPropertyBlock(_mpb);
}
```

## Common Shader Graph Patterns

**Dissolve:** Sample noise texture → subtract `_DissolveAmount` → feed to Alpha Clip Threshold; use a `Step` on offset value → multiply by `_EdgeColor` → add to Emission for glowing edge

**Fresnel outline:** `Fresnel Effect` node → multiply by `_OutlineColor` (HDR) → add to Emission

**Water:** Vertex displacement via Gradient Noise + `_Time`; two scrolling normal maps blended; depth-based color gradient using Scene Depth; foam via depth difference near geometry edges

**Hologram:** `Frac(WorldPos.y * _LineFrequency + _Time * _ScrollSpeed)` → `Step(0.5)` → multiply into Alpha; Fresnel for edge glow; Transparent surface type

## Post-Processing (Volume Framework)

- Create a **Global Volume** (GameObject → Volume → Global Volume) with a Volume Profile
- Override effects on the profile: Bloom, Color Adjustments, Tonemapping (ACES), Vignette, Depth of Field, Motion Blur
- Use **Local Volumes** (Collider as Trigger) to apply effects in specific areas (underwater tint, cave color grading)
- Animate post-processing at runtime: `volume.profile.TryGet(out Vignette vignette)` then `vignette.intensity.Override(value)`
- Ensure the Camera has **Post Processing** enabled — effects do not apply otherwise

## Full Screen Pass (Unity 6 URP)

- Add `Full Screen Pass Renderer Feature` in the URP Renderer Data
- Assign an Unlit Shader Graph material that uses the `URP Sample Buffer (BlitSource)` node to read screen color
- Set the pass event to `AfterRenderingPostProcessing` for effects that run after bloom and tonemapping

## HLSL Hand-Written Shaders

- Tag URP shaders: `"RenderPipeline"="UniversalPipeline"` and pass `"LightMode"="UniversalForward"`
- Include `Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl`
- Use `CBUFFER_START(UnityPerMaterial)` / `CBUFFER_END` for SRP Batcher compatibility
- Use `TransformObjectToHClip()`, `TRANSFORM_TEX()`, `SAMPLE_TEXTURE2D()` from the URP shader library

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| `renderer.material` for per-instance changes | Use `MaterialPropertyBlock` |
| String lookups for shader properties in Update | Cache `Shader.PropertyToID()` as `static readonly int` |
| `multi_compile` for material-local keywords | Use `shader_feature` to avoid build time explosion |
| Post-processing not visible | Enable Post Processing on the Camera; add a Volume to the scene |
| Transparent objects not receiving shadows | Use Alpha Clip (cutout) instead of Alpha Blend |
| Pink/magenta material | Shader incompatible with active pipeline — check URP tags |
| Z-fighting on coplanar surfaces | Offset render queue or use Depth Offset node in Shader Graph |

## Best Practices

- Use SRP Batcher — group materials by shader variant to reduce set-pass calls; verify in Frame Debugger
- Pack masks into RGBA channels (R=metallic, G=occlusion, B=detail mask, A=smoothness) to minimize texture samples
- Use LOD shaders on distant objects via separate materials on LOD Groups
- Profile with Frame Debugger (Window → Analysis → Frame Debugger) to inspect every draw call
- Keep Shader Graph variant count low — each exposed keyword doubles compilation time
