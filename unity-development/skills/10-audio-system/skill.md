# Audio System

## AudioMixer Architecture

- Route every `AudioSource` through an `AudioMixer` group — never play audio without a mixer group
- Create groups: `Master → Music`, `Master → SFX`, `Master → Voice`, `Master → Ambient`
- Expose mixer parameters via right-click → "Expose to Script"; name them `MasterVolume`, `MusicVolume`, `SFXVolume`
- Convert linear 0–1 volume to dB: `dB = linearVolume > 0.001f ? Mathf.Log10(linearVolume) * 20f : -80f`
- Never set mixer float values with raw 0–1 linear — the curve sounds wrong to human hearing
- Create Mixer Snapshots for game states: `Normal`, `Paused` (SFX ducked, lowpass on music), `Underwater`, `Cutscene`

## AudioManager Setup

- Implement a pool of `AudioSource` components for SFX playback — never use `AudioSource.PlayClipAtPoint()` (creates and destroys a GameObject per call)
- Use two `AudioSource` components for music (`_musicSourceA`, `_musicSourceB`) to enable crossfading
- Crossfade music by lerping volume on both sources simultaneously using `Time.unscaledDeltaTime` — works during pause

```csharp
public void SetVolume(string exposedParam, float linearVolume)
{
    float dB = linearVolume > 0.001f ? Mathf.Log10(linearVolume) * 20f : -80f;
    _mixer.SetFloat(exposedParam, dB);
}

public void PlaySFXAtPoint(AudioClip clip, Vector3 position, float volume = 1f, float pitchVariance = 0.05f)
{
    if (clip == null) return;
    AudioSource source = GetNextPooledSource();
    source.transform.position = position;
    source.spatialBlend = 1f;
    source.clip = clip;
    source.volume = volume;
    source.pitch = 1f + Random.Range(-pitchVariance, pitchVariance);
    source.Play();
}
```

## ScriptableObject Audio Definitions

- Define `SFXDefinition : ScriptableObject` with `AudioClip[]`, `volume`, `pitchVariance`, `cooldown`, `spatialBlend`
- Randomize clip selection with `_clips[Random.Range(0, _clips.Length)]` to avoid repetition
- Add a `cooldown` field with `[System.NonSerialized] float _lastPlayTime` to prevent stacking on rapid triggers
- Call `sfxDef.Play(transform.position)` from the MonoBehaviour — all playback logic stays in the data asset

## Footstep System

- Trigger footstep sounds via Animation Events on walk/run clips — never use timers
- Raycast downward from the character's feet position to detect the surface `PhysicsMaterial`
- Match `PhysicsMaterial` references to `SFXDefinition` assets in a serialized array for material-based sound selection

## Spatial Audio Configuration

- Set `spatialBlend = 1.0` on all in-world SFX; `0.0` for UI and 2D sounds
- Set `rolloffMode` to `Logarithmic` for realistic distance falloff; `Custom` for game-tuned curves
- Set `minDistance` (full volume) and `maxDistance` (inaudible) per sound category
- Force 3D SFX clips to **mono** in import settings — stereo wastes memory and produces poor spatialization
- Place `AudioReverbZone` components in caves, hallways, and large rooms

## Audio Import Settings

| Clip Type | Load Type | Compression | Sample Rate |
|-----------|-----------|-------------|-------------|
| Short SFX (< 1s) | Decompress On Load | PCM/ADPCM | Original |
| Medium SFX (1–5s) | Compressed In Memory | Vorbis 70% | 22050 Hz |
| Music (> 5s) | Streaming | Vorbis 50–70% | 44100 Hz |
| Ambient loops | Compressed In Memory | Vorbis 50% | 22050 Hz |

- Enable **Force To Mono** on all 3D SFX to halve memory usage
- Enable **Streaming** for music — never `Decompress On Load` for long tracks

## Volume Settings Persistence

- Load `PlayerPrefs.GetFloat("MasterVolume", 1f)` and apply in `Start()` before any sound plays
- Save preferences on settings close or `Application.quitting`

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| `AudioSource.PlayClipAtPoint()` | Use a pooled `AudioSource` array |
| Linear 0–1 value on mixer float | Convert to dB with `Log10(v) * 20` |
| Stereo clips for 3D audio | Import as mono for all spatialized SFX |
| `Decompress On Load` for music | Use Streaming load type |
| No pitch variation on repeated SFX | Add ±5% random pitch variance |
| Playing without mixer group | Cannot mix, duck, or snapshot-control |

## Best Practices

- Add pitch variance (±5%) on all repeated SFX — footsteps, hits, gunshots
- Use multiple clips per sound category and randomize selection
- Trigger `_mixer.FindSnapshot("Paused")?.TransitionTo(0.2f)` on pause — do not manually tweak params
- Pool SFX AudioSources with a ring-buffer index for O(1) next-source retrieval
- Use `Time.unscaledDeltaTime` in all music fade coroutines — music must continue during `timeScale = 0`
- Set concurrent sound count limits per category to prevent mix clipping
