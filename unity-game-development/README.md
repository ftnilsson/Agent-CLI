# Unity Game Development — Agent Skills

A comprehensive collection of agent skills for Unity game development. Each skill provides structured instructions, best practices, code patterns, and pitfalls to avoid when working with specific Unity subsystems.

## Skills Overview

| # | Skill | Description |
|---|-------|-------------|
| 01 | [Project Setup & Architecture](skills/01-project-setup/skill.md) | Project structure, assembly definitions, packages, and coding conventions |
| 02 | [C# Scripting Fundamentals](skills/02-csharp-scripting/skill.md) | MonoBehaviour lifecycle, coroutines, events, design patterns |
| 03 | [Scene Architecture & Management](skills/03-scene-architecture/skill.md) | Scene loading, additive scenes, transitions, and prefab workflows |
| 04 | [Player Controller](skills/04-player-controller/skill.md) | Character controllers, 2D/3D movement, camera systems |
| 05 | [Physics & Collision](skills/05-physics-and-collision/skill.md) | Rigidbodies, colliders, triggers, raycasting, joints |
| 06 | [Input System](skills/06-input-system/skill.md) | New Input System, action maps, bindings, processor stacks |
| 07 | [ScriptableObject Architecture](skills/07-scriptableobjects/skill.md) | Data containers, event channels, runtime sets, variables, strategy pattern |
| 08 | [UI Development](skills/08-ui-development/skill.md) | Canvas, responsive UI, UI Toolkit, data binding |
| 09 | [Animation System](skills/09-animation-system/skill.md) | Animator controllers, blend trees, IK, Timeline |
| 10 | [Audio System](skills/10-audio-system/skill.md) | AudioSource, AudioMixer, spatial audio, music management |
| 11 | [AI & Navigation](skills/11-ai-and-navigation/skill.md) | NavMesh, pathfinding, state machines, behavior trees |
| 12 | [Shaders & Visual Effects](skills/12-shaders-and-vfx/skill.md) | Shader Graph, URP/HDRP, post-processing |
| 13 | [Particle Systems & VFX](skills/13-particle-systems/skill.md) | Particle System, VFX Graph, trail renderers |
| 14 | [Networking & Multiplayer](skills/14-networking-multiplayer/skill.md) | Netcode for GameObjects, lobbies, relay, state sync |
| 15 | [Performance Optimization](skills/15-performance-optimization/skill.md) | Profiling, batching, LOD, object pooling, memory |
| 16 | [Testing & Debugging](skills/16-testing-and-debugging/skill.md) | Unit tests, Play Mode tests, debug tooling |
| 17 | [Build & Deployment](skills/17-build-and-deployment/skill.md) | Platform builds, Addressables, CI/CD pipelines |

## Skill File Standard

Each skill follows the **Skills.Md** standard:

```
skills/
└── <nn>-<skill-name>/
    └── skill.md
```

### Skill Markdown Structure

Every `skill.md` contains the following sections:

1. **Title** — Clear skill name
2. **Description** — What the skill covers and why it matters
3. **When To Use** — Trigger conditions for activating this skill
4. **Prerequisites** — Required packages, Unity version, or prior skills
5. **Instructions** — Step-by-step guidance with code examples
6. **Best Practices** — Proven patterns and conventions
7. **Common Pitfalls** — Mistakes to avoid and how to fix them
8. **Reference** — Links to official Unity documentation

## Unity Version Target

These skills target **Unity 6 (6000.x)** with the **Universal Render Pipeline (URP)** as the default, while noting HDRP and Built-in differences where relevant.
