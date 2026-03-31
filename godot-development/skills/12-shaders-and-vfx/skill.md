# Shaders & Visual Effects

## Shader Types

- Use `shader_type canvas_item` for 2D sprites, UI, and screen-space effects
- Use `shader_type spatial` for 3D surface materials
- Use `shader_type particles` for custom GPU particle behavior
- Add `render_mode unshaded` to spatial shaders that implement custom lighting — default is PBR

## Shader Uniforms

```glsl
shader_type canvas_item;

uniform vec4 flash_color : source_color = vec4(1.0, 1.0, 1.0, 1.0);
uniform float flash_amount : hint_range(0.0, 1.0) = 0.0;
uniform sampler2D noise_texture : hint_default_white;

void fragment() {
    vec4 tex = texture(TEXTURE, UV);
    COLOR.rgb = mix(tex.rgb, flash_color.rgb, flash_amount);
    COLOR.a = tex.a;
}
```

- Always add `hint_range`, `source_color`, or `hint_default_*` hints to uniforms — they control Inspector display
- Set uniform values from GDScript with `material.set_shader_parameter("param_name", value)`
- Use `instance uniform` when many objects share a shader but need individual values
- Retrieve `ShaderMaterial` with `node.material as ShaderMaterial` before calling `set_shader_parameter()`

## Common 2D Effects

- Hit flash: blend `TEXTURE` color with a solid `flash_color` uniform using `mix()`
- Outline: sample alpha at `UV ± TEXTURE_PIXEL_SIZE * outline_width` and draw `outline_color` where original alpha is 0
- Dissolve: use a noise texture; `discard` fragments where `noise < dissolve_amount`; draw edge color in the `edge_width` band
- Screen distortion: sample `hint_screen_texture` with offset UVs for heat/water ripple effects

## 3D Spatial Shaders

- Access `NORMAL`, `VIEW`, `ALBEDO`, `EMISSION`, `ROUGHNESS`, `METALLIC` in the `fragment()` function
- Use `EMISSION` for rim lighting, glow, and emissive effects — set it additively on top of `ALBEDO`
- Use `dot(NORMAL, VIEW)` for rim/fresnel effects
- Avoid branching in shaders — replace `if` with `mix()`, `step()`, and `smoothstep()`

## Post-Processing

- Implement full-screen post-processing with a `ColorRect` covering the viewport assigned a `ShaderMaterial`
- Sample the screen with `uniform sampler2D screen_texture : hint_screen_texture, filter_linear_mipmap`
- Read screen UV with `SCREEN_UV` inside `canvas_item` fragment shaders
- Prefer built-in `Environment` resource effects (SSAO, SSR, bloom, tonemap) over custom post-processing when sufficient

## VisualShader

- Use VisualShader for rapid prototyping and non-programmer-friendly workflows
- VisualShader compiles to the same underlying code as text shaders — no runtime performance difference
- Convert to text shader for fine-grained control after prototyping

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Uniforms declared without type hints | Add `hint_range`, `source_color`, or `hint_default_*` |
| `if/else` branching in hot fragment paths | Replace with `mix()`, `step()`, `smoothstep()` |
| `hint_screen_texture` in a non-full-screen shader | Only valid on a full-screen `ColorRect` or `SubViewport` quad |
| Spatial shader without `render_mode unshaded` for custom lighting | Add `render_mode unshaded` explicitly |
| `set_shader_parameter()` called on wrong material type | Cast with `node.material as ShaderMaterial` first |
| One large shader handling many effects | Split into small focused shaders — one effect per shader |

## Best Practices

- Declare all tunable values as `uniform` with `hint_range` so designers can tweak in the Inspector
- Keep shaders small and single-purpose — compose multiple `ShaderMaterial` effects via `CanvasGroup` or layered meshes
- Profile shader cost with the Godot GPU profiler — fragment shaders execute per pixel
- Use `instance uniform` for per-object variation on shared materials (character tint, dissolve progress)
- Animate shader uniforms from GDScript using `Tween` for smooth transitions (flash, dissolve, reveal)
- Set `render_priority` correctly on transparent materials to ensure correct draw order
