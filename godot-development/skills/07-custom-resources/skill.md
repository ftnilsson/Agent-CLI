# Custom Resources

## Defining Custom Resources

```gdscript
class_name WeaponData
extends Resource

@export var weapon_name: String = ""
@export var damage: int = 10
@export var fire_rate: float = 0.5
@export var projectile_scene: PackedScene
@export var fire_sound: AudioStream
@export var icon: Texture2D

@export_group("Upgrades")
@export var max_level: int = 5
@export var damage_per_level: int = 3
```

- Always add `class_name` — without it the resource won't appear in the editor's "New Resource" picker
- Always extend `Resource`, not `Node` — resources have no scene tree presence
- Use `@export` on all data fields so they are editable in the Inspector
- Save instances as `.tres` (text/readable) or `.res` (binary) under `resources/` organized by type

## Creating and Using Resource Instances

- Right-click in the FileSystem dock → New Resource → search for class name to create instances
- Reference resources from nodes with `@export var weapon: WeaponData`
- Call `resource.duplicate()` to get a per-instance copy before mutating at runtime — shared resources affect all users
- Never store `Node` references inside a `Resource` — resources persist across scenes, nodes do not

## Resource Collections

- Build typed arrays of resources for collections: `@export var entries: Array[LootEntry] = []`
- Create sub-resources (e.g., `LootEntry extends Resource`) to compose structured data hierarchies
- Use `@export_range(1, 99)`, `@export_enum()`, and `@export_multiline` for validation and UX hints
- Use `@export_group()` and `@export_subgroup()` to organize Inspector properties

## EventChannel Pattern

- Create an `EventChannel extends Resource` with a signal to decouple emitters from listeners
- Assign the same `.tres` instance to both emitter and listener via `@export`
- Emit with `event_channel.triggered.emit(data)`, connect with `event_channel.triggered.connect(callback)`
- Enables cross-scene communication without autoloads or direct node references

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| `class_name` omitted from resource script | Add `class_name` so it appears in editor resource pickers |
| Mutating a shared `.tres` at runtime | Call `resource.duplicate()` to get a per-instance copy |
| `Node` reference stored inside a `Resource` | Store `NodePath` or use signals instead |
| `Dictionary` used for structured game data | Use a typed `Resource` subclass — type-safe, serializable, Inspector-friendly |
| All resource data in a single flat class | Use `@export_group()` and sub-resources to organize |
| Loading resources inside `_process()` | Preload in `_ready()` or use `@export` |

## Best Practices

- Use custom resources for any data editable by designers without code changes: stats, items, abilities, levels
- Organize `.tres` files in `resources/` with sub-folders matching the resource type
- Use `StringName` (`&"id"`) for identifiers that are compared frequently — faster than `String`
- Use `@export_range()` to constrain numeric values and prevent invalid data
- Prefer resources over dictionaries for structured data — resources are type-safe and Inspector-editable
- Use resource inheritance to share common fields: `ItemData` → `ConsumableData`, `EquipmentData`
- Keep resource scripts in `resources/` or `scripts/resources/` separate from node scripts
