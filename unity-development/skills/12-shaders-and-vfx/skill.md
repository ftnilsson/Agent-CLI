# 12 — Shaders & Visual Effects

## Description

Create and customise shaders for Unity 6 using **Shader Graph** (URP / HDRP) and, where necessary, hand-written HLSL. This skill covers material setup, lighting models, post-processing, and common visual-effect patterns such as dissolve, outline, water, and hologram shaders.

## When To Use

- You need a custom look that the default Lit / Unlit shaders cannot achieve.
- Adding post-processing effects (bloom, color grading, vignette, etc.).
- Building stylised or non-photorealistic rendering (NPR) visuals.
- Creating screen-space or full-screen effects (e.g., damage vignette, underwater distortion).
- Optimising rendering with purpose-built shaders that skip unnecessary calculations.

## Prerequisites

| Skill | Why |
|-------|-----|
| [01 — Project Setup](../01-Project-Setup/skill.md) | URP/HDRP pipeline must be configured |
| [02 — C# Scripting](../02-CSharp-Scripting/skill.md) | Controlling material properties at runtime via scripts |

## Instructions

### 1 — URP Rendering Pipeline Basics

Ensure the project has the **Universal RP** package installed and a `UniversalRenderPipelineAsset` assigned in **Edit ▸ Project Settings ▸ Graphics**.

Key renderer features in URP:
- **Forward / Forward+** renderer (default in Unity 6 URP).
- **Renderer Features** — inject custom passes (outline, blur, etc.) into the render pipeline.
- **Volume framework** — drive post-processing and environment settings.

### 2 — Shader Graph Fundamentals

Create a Shader Graph asset via **Assets ▸ Create ▸ Shader Graph ▸ URP ▸ Lit Shader Graph** (or Unlit, Sprite Lit, etc.).

#### Common Node Categories

| Category | Key Nodes |
|----------|-----------|
| **Input** | Position, Normal, UV, Time, Screen Position, View Direction |
| **Math** | Add, Multiply, Lerp, Remap, Step, Smoothstep, Clamp |
| **UV** | Tiling And Offset, Rotate, Polar Coordinates, Flipbook |
| **Texture** | Sample Texture 2D, Triplanar, Normal From Texture |
| **Procedural** | Noise (Gradient, Simple, Voronoi), Checkerboard |
| **Artistic** | Contrast, Saturation, Channel Mixer, Blend |
| **Channel** | Split, Combine, Swizzle |

#### Exposing Properties

Right-click in the Blackboard panel ▸ **Add Property** to create exposed shader properties:

```
Float   _DissolveAmount   Range(0, 1)
Color   _EdgeColor         HDR
Texture2D _NoiseTex
```

Access these from C# via `MaterialPropertyBlock` or `material.SetFloat()`.

### 3 — Dissolve Shader (Shader Graph)

A dissolve effect clips pixels based on a noise texture threshold.

**Graph Outline:**
1. Sample a noise texture (`Simple Noise` node or a baked noise `Texture2D`).
2. Subtract `_DissolveAmount` from the noise value.
3. Feed the result into **Alpha Clip Threshold** on the Fragment output (set Alpha to 1).
4. Use a `Step` node on a slightly offset value to create the glowing edge, multiply by `_EdgeColor`, and add to **Emission**.

**Drive from C#:**

```csharp
using UnityEngine;

public class DissolveController : MonoBehaviour
{
    [SerializeField] private Renderer _renderer;
    [SerializeField] private float _duration = 2f;

    private static readonly int DissolveAmount = Shader.PropertyToID("_DissolveAmount");
    private MaterialPropertyBlock _mpb;

    private void Awake()
    {
        _mpb = new MaterialPropertyBlock();
    }

    public void StartDissolve()
    {
        StartCoroutine(DissolveRoutine());
    }

    private System.Collections.IEnumerator DissolveRoutine()
    {
        float elapsed = 0f;
        while (elapsed < _duration)
        {
            elapsed += Time.deltaTime;
            float t = Mathf.Clamp01(elapsed / _duration);

            _mpb.SetFloat(DissolveAmount, t);
            _renderer.SetPropertyBlock(_mpb);

            yield return null;
        }
    }
}
```

### 4 — Outline / Rim-Light Shader

**Fresnel approach (Shader Graph):**
1. Use the **Fresnel Effect** node with a `Power` property exposed.
2. Multiply the fresnel output by `_OutlineColor` (HDR).
3. Add to the **Emission** output.

**Inverted-hull approach (two-pass via Renderer Feature):**
For a solid outline, duplicate the mesh in a second pass with vertex extrusion along normals and front-face culling. In URP, implement this via a custom **ScriptableRendererFeature**:

```csharp
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

public class OutlineRendererFeature : ScriptableRendererFeature
{
    [System.Serializable]
    public class Settings
    {
        public Material outlineMaterial;
        public RenderPassEvent renderPassEvent = RenderPassEvent.AfterRenderingOpaques;
        public LayerMask layerMask = -1;
    }

    public Settings settings = new();
    private OutlineRenderPass _pass;

    public override void Create()
    {
        _pass = new OutlineRenderPass(settings);
    }

    public override void AddRenderPasses(ScriptableRenderer renderer, ref RenderingData renderingData)
    {
        if (settings.outlineMaterial != null)
            renderer.EnqueuePass(_pass);
    }

    private class OutlineRenderPass : ScriptableRenderPass
    {
        private readonly Settings _settings;
        private FilteringSettings _filteringSettings;

        public OutlineRenderPass(Settings settings)
        {
            _settings = settings;
            renderPassEvent = settings.renderPassEvent;
            _filteringSettings = new FilteringSettings(RenderQueueRange.opaque, settings.layerMask);
        }

        public override void Execute(ScriptableRenderContext context, ref RenderingData renderingData)
        {
            var drawSettings = CreateDrawingSettings(
                new ShaderTagId("UniversalForward"),
                ref renderingData,
                SortingCriteria.CommonOpaque);
            drawSettings.overrideMaterial = _settings.outlineMaterial;

            context.DrawRenderers(renderingData.cullResults, ref drawSettings, ref _filteringSettings);
        }
    }
}
```

### 5 — Water Shader

Water is a combination of several effects layered in Shader Graph:

| Layer | Technique |
|-------|-----------|
| **Surface colour** | Depth-based colour gradient (Scene Depth → subtract Fragment Depth → Lerp between shallow and deep colour) |
| **Waves** | Vertex displacement via Gradient Noise offset by `_Time` |
| **Normals** | Two scrolling normal maps blended to simulate ripples |
| **Foam** | Screen-space depth difference near geometry edges |
| **Refraction** | Screen Color node offset by normal map (transparent surface type) |
| **Caustics** | Voronoi noise projected onto submerged surfaces |

Set the Shader Graph surface type to **Transparent** and render face to **Both** for see-through water.

### 6 — Hologram / Scan-Line Shader

```
Shader Graph recipe:
1. Base colour     → Multiply by _HoloColor (HDR cyan/green).
2. Scan-lines      → Frac(WorldPos.y * _LineFrequency + _Time * _ScrollSpeed)
                      → Step(0.5) → multiply into Alpha.
3. Glitch          → Random Range on UV.x triggered by frac(_Time * speed) < threshold.
4. Fresnel rim     → Add to Emission for edge glow.
5. Surface type    → Transparent, Alpha blend.
```

### 7 — Post-Processing with the Volume Framework

Unity 6 URP uses the **Volume** component for post-processing.

1. Create a **Global Volume** (GameObject ▸ Volume ▸ Global Volume).
2. Add a **Volume Profile** and override effects:

| Effect | Common Properties |
|--------|-------------------|
| **Bloom** | Threshold, Intensity, Scatter |
| **Color Adjustments** | Post Exposure, Contrast, Saturation |
| **Tonemapping** | ACES, Neutral |
| **Vignette** | Intensity, Smoothness |
| **Depth of Field** | Gaussian / Bokeh, Focus Distance |
| **Motion Blur** | Intensity, clamp |
| **Film Grain** | Type, Intensity |

**Local Volumes** use a Collider (set as Trigger) to apply effects in specific areas (e.g., underwater tint).

#### Animating Post-Processing at Runtime

```csharp
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

public class DamageVignette : MonoBehaviour
{
    [SerializeField] private Volume _volume;
    [SerializeField] private float _maxIntensity = 0.5f;
    [SerializeField] private float _fadeSpeed = 2f;

    private Vignette _vignette;
    private float _currentIntensity;

    private void Start()
    {
        _volume.profile.TryGet(out _vignette);
    }

    public void Flash()
    {
        _currentIntensity = _maxIntensity;
    }

    private void Update()
    {
        if (_currentIntensity > 0f)
        {
            _currentIntensity -= Time.deltaTime * _fadeSpeed;
            _currentIntensity = Mathf.Max(0f, _currentIntensity);
            _vignette.intensity.Override(_currentIntensity);
        }
    }
}
```

### 8 — Custom Full-Screen Pass (URP Renderer Feature)

Unity 6 URP supports **Full Screen Pass Renderer Feature** out of the box:

1. In the URP Renderer Data, click **Add Renderer Feature ▸ Full Screen Pass Renderer Feature**.
2. Assign a **Material** using an **Unlit Shader Graph** with the `URP Sample Buffer` node to access the screen color.
3. Set the pass event (e.g., `AfterRenderingPostProcessing`).

For a grayscale full-screen effect:

```
Shader Graph (Unlit, Full-Screen):
1. URP Sample Buffer (BlitSource) → output colour.
2. Split R, G, B.
3. Dot with luminance weights (0.2126, 0.7152, 0.0722).
4. Combine back to RGB.
5. Lerp between original and grayscale by _Intensity property.
6. Output to Base Color.
```

### 9 — Hand-Written HLSL (When Shader Graph Isn't Enough)

For advanced techniques (compute shaders, tessellation, custom lighting models), write HLSL directly:

```hlsl
Shader "Custom/SimpleUnlit"
{
    Properties
    {
        _BaseColor ("Base Color", Color) = (1,1,1,1)
        _MainTex   ("Texture",   2D)    = "white" {}
    }
    SubShader
    {
        Tags { "RenderPipeline"="UniversalPipeline" "RenderType"="Opaque" }

        Pass
        {
            Name "ForwardLit"
            Tags { "LightMode"="UniversalForward" }

            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            struct Attributes
            {
                float4 positionOS : POSITION;
                float2 uv         : TEXCOORD0;
            };

            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                float2 uv         : TEXCOORD0;
            };

            TEXTURE2D(_MainTex);
            SAMPLER(sampler_MainTex);

            CBUFFER_START(UnityPerMaterial)
                float4 _BaseColor;
                float4 _MainTex_ST;
            CBUFFER_END

            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                OUT.positionCS = TransformObjectToHClip(IN.positionOS.xyz);
                OUT.uv = TRANSFORM_TEX(IN.uv, _MainTex);
                return OUT;
            }

            half4 frag(Varyings IN) : SV_Target
            {
                half4 tex = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, IN.uv);
                return tex * _BaseColor;
            }
            ENDHLSL
        }
    }
}
```

### 10 — Material Property Blocks vs Shared Materials

| Approach | Use Case | Notes |
|----------|----------|-------|
| `renderer.material` | Per-instance unique material | Creates a clone — **memory overhead**; remember to destroy |
| `renderer.sharedMaterial` | Read global material values | Setting values affects **all** objects sharing the material |
| `MaterialPropertyBlock` | Per-instance overrides without cloning | Best for runtime property changes; uses `SetPropertyBlock()` |

```csharp
// Preferred: MaterialPropertyBlock
private static readonly int ColorProp = Shader.PropertyToID("_BaseColor");
private MaterialPropertyBlock _mpb;

private void Awake() => _mpb = new MaterialPropertyBlock();

public void SetColor(Color color)
{
    _renderer.GetPropertyBlock(_mpb);
    _mpb.SetColor(ColorProp, color);
    _renderer.SetPropertyBlock(_mpb);
}
```

## Best Practices

1. **Use Shader Graph** for most shaders — visual iteration is faster and graph shaders automatically get SRP Batcher compatibility.
2. **Cache `Shader.PropertyToID`** in static readonly fields — avoid string lookups every frame.
3. **Prefer `MaterialPropertyBlock`** over `renderer.material` to prevent material instance leaks.
4. **Keep keyword variants low** — each `#pragma multi_compile` doubles compilation time and memory. Use `shader_feature` for material-local keywords.
5. **Profile with Frame Debugger** (Window ▸ Analysis ▸ Frame Debugger) to inspect draw calls, batches, and shader passes.
6. **Use SRP Batcher** — group materials by shader to reduce set-pass calls. Check compatibility in the Frame Debugger.
7. **Minimise texture samples** — pack masks into RGBA channels of a single texture (R=metallic, G=occlusion, B=detail, A=smoothness).
8. **LOD shaders** — use simpler shaders on distant objects via Shader LOD or separate materials on LOD Groups.

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Shader compiles for every keyword combo → huge build times | Use `shader_feature` instead of `multi_compile` for material-only keywords |
| Z-fighting on overlapping surfaces | Offset render queue or use `Depth Offset` in Shader Graph |
| Material turns pink / magenta | Shader incompatible with active render pipeline; ensure URP tags |
| `renderer.material` leaking materials | Switch to `MaterialPropertyBlock` or call `Destroy(material)` |
| Post-processing not appearing | Ensure Camera has **Post Processing** enabled and a Volume exists in the scene |
| Transparent objects not receiving shadows | Use **Alpha Clip** (cutout) instead of Alpha Blend where possible |
| Shader Graph changes not applying | Click **Save Asset** in the Shader Graph window; reimport if needed |

## Reference

- [Shader Graph Manual](https://docs.unity3d.com/Packages/com.unity.shadergraph@17.0/manual/index.html)
- [URP Shaders & Materials](https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@17.0/manual/shaders-in-universalrp.html)
- [Writing Custom Shaders (URP)](https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@17.0/manual/writing-custom-shaders-urp.html)
- [Volume Framework](https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@17.0/manual/Volumes.html)
- [ScriptableRendererFeature API](https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@17.0/api/UnityEngine.Rendering.Universal.ScriptableRendererFeature.html)
- [Frame Debugger](https://docs.unity3d.com/6000.0/Documentation/Manual/FrameDebugger.html)
