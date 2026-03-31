# Audio System

## Audio Bus Layout

Configure in the Audio panel (bottom of editor):

```
Master (Limiter effect — prevent clipping)
├── Music
├── SFX
├── UI
└── Ambient
```

- Create separate buses for Music, SFX, UI, and Ambient — never route everything through Master
- Add a Limiter effect on the Master bus to prevent clipping
- Use bus names as `StringName` constants: `&"Music"`, `&"SFX"`, `&"UI"`

## AudioStreamPlayer Node Selection

| Node | Use Case |
|------|----------|
| `AudioStreamPlayer` | Non-positional — music, UI sounds, global SFX |
| `AudioStreamPlayer2D` | 2D positional audio — attenuates by distance to camera |
| `AudioStreamPlayer3D` | 3D positional audio — full spatial panning and attenuation |

- Set `max_distance` and `attenuation` on `AudioStreamPlayer2D/3D` in the Inspector
- Add pitch variation to repeated sounds: `player.pitch_scale = randf_range(0.9, 1.1)`
- Use `AudioStreamRandomizer` for automatic random variation of repeated sound effects

## AudioManager Autoload

```gdscript
extends Node

@onready var _music_player: AudioStreamPlayer = $MusicPlayer
var _sfx_pool: Array[AudioStreamPlayer] = []
const SFX_POOL_SIZE := 8

func _ready() -> void:
    _music_player.bus = &"Music"
    for i in SFX_POOL_SIZE:
        var player := AudioStreamPlayer.new()
        player.bus = &"SFX"
        add_child(player)
        _sfx_pool.append(player)

func play_sfx(stream: AudioStream, volume_db: float = 0.0) -> void:
    for player in _sfx_pool:
        if not player.playing:
            player.stream = stream
            player.volume_db = volume_db
            player.play()
            return

func set_bus_volume(bus_name: StringName, volume: float) -> void:
    var idx := AudioServer.get_bus_index(bus_name)
    AudioServer.set_bus_volume_db(idx, linear_to_db(volume))
```

- Pool `AudioStreamPlayer` nodes in an autoload — never instantiate and free them at runtime
- Fade music transitions using `Tween` on `volume_db` — never cut abruptly between tracks
- Use `AudioServer.get_bus_index(bus_name)` to look up bus indices for volume control

## Volume Settings

- Store volume as a linear float (0.0–1.0) in save data; convert to dB with `linear_to_db()`
- Read current bus volume with `db_to_linear(AudioServer.get_bus_volume_db(idx))` for slider initialization
- Mute buses with `AudioServer.set_bus_mute(idx, true)` — do not set volume to -80 dB

## File Format Rules

- Use `.ogg` for music — smaller files, suitable for streaming
- Use `.wav` for short SFX — no decode latency, instant playback
- Never use `.mp3` for music in Godot — `.ogg` is preferred for size and licensing

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| `AudioStreamPlayer` attached to a gameplay node that gets freed | Route all audio through persistent AudioManager autoload |
| All sounds on Master bus | Create Music, SFX, UI buses for independent volume control |
| Music stream swapped without fading | Fade out old stream, swap, fade in new stream |
| `AudioStreamPlayer` instantiated per sound effect at runtime | Pool players in AudioManager `_ready()` |
| No `max_distance` on positional audio | Set `max_distance` in Inspector — default plays at full volume globally |
| `.wav` used for music tracks | Use `.ogg` for music — much smaller file size |

## Best Practices

- Create all buses (Music, SFX, UI, Ambient) before importing any audio assets
- Pool `AudioStreamPlayer` nodes at startup — use a fixed-size pool of 8–16 SFX players
- Add pitch variation (`randf_range(0.9, 1.1)`) to all repeated sound effects
- Use `AudioStreamRandomizer` for footsteps, impacts, and any sound played frequently
- Persist volume settings to a save file and restore on game start
- Test audio at multiple system volume levels to ensure the mix holds
