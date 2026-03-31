# UI Development

## Control Node Hierarchy

- Place all HUD and menu UI inside a `CanvasLayer` to keep it above the game world
- Set the root `Control` node to full-rect anchors so it fills the screen
- Use containers for all layout — never position child controls with manual pixel offsets
- Keep UI scenes shallow and composable — avoid deeply nested Control hierarchies

## Container Selection

| Container | Purpose |
|-----------|---------|
| `HBoxContainer` | Horizontal row of elements |
| `VBoxContainer` | Vertical column of elements |
| `GridContainer` | Grid layout with fixed columns |
| `MarginContainer` | Add padding around a single child |
| `CenterContainer` | Center a single child |
| `PanelContainer` | Background panel with a child |
| `ScrollContainer` | Scrollable content area |

## Node References and Signals

```gdscript
class_name HUD
extends CanvasLayer

@onready var _health_bar: ProgressBar = %HealthBar
@onready var _score_label: Label = %ScoreLabel

func _ready() -> void:
    %StartButton.pressed.connect(_on_start_pressed)
    %StartButton.grab_focus()

func update_health(current: int, maximum: int) -> void:
    _health_bar.max_value = maximum
    _health_bar.value = current

func update_score(score: int) -> void:
    _score_label.text = "Score: %d" % score
```

- Use unique names (`%NodeName`) for all signal-connected and frequently accessed nodes
- Always call `grab_focus()` on the default button so keyboard and gamepad can navigate menus
- Connect button signals in `_ready()` — never in `_process()`
- Separate UI logic from game logic — UI nodes listen to signals, they do not drive gameplay

## Theming

- Create one `Theme` resource and assign it to the root `Control` node — children inherit it
- Override per-node theme properties in code with `add_theme_color_override()` or `add_theme_font_size_override()`
- Define fonts, colors, margins, and styleboxes in the Theme resource — never hardcode them per-node
- Use theme type variations for consistent button variants (primary, danger, secondary)

## Responsive Design

- Set Stretch Mode to `canvas_items` and Stretch Aspect to `expand` in Project Settings → Display → Window
- Use anchor presets to position UI regions: `PRESET_TOP_LEFT`, `PRESET_BOTTOM_WIDE`, `PRESET_CENTER`
- Use `Tween` for smooth UI animations: fades, slides, scale bounces
- Set `mouse_filter = MOUSE_FILTER_IGNORE` on non-interactive `Control` nodes so they don't block gameplay input

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Manual pixel positioning instead of containers | Use `HBoxContainer`, `VBoxContainer`, `GridContainer` |
| `$Button` path reference deep in hierarchy | Use `%UniqueNodeName` for referenced nodes |
| No `grab_focus()` on default menu button | Call `grab_focus()` in `_ready()` for keyboard/gamepad navigation |
| UI script drives game state directly | UI emits signals; game systems listen and react |
| No stretch mode set | Set `canvas_items` + `expand` in Project Settings |
| Interactive panels blocking gameplay input | Set `mouse_filter = MOUSE_FILTER_IGNORE` on transparent overlays |

## Best Practices

- Always use containers for layout — they handle resize and resolution changes automatically
- Use unique names (`%`) for nodes referenced by scripts to survive hierarchy refactors
- Apply one root `Theme` resource rather than styling each node individually
- Use `CanvasLayer` to keep UI on top of all game world content
- Test menu navigation with keyboard and gamepad — call `grab_focus()` on first focusable element
- Use `Tween.set_ease()` and `Tween.set_trans()` for polished UI motion
- Keep UI scenes small and focused: separate `MainMenu`, `HUD`, `PauseMenu`, `InventoryScreen`
