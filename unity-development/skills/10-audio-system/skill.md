# Audio System

## Description

This skill covers implementing audio in Unity — from basic sound effects to full audio management with AudioMixers, spatial 3D audio, music systems with crossfading, and performance-friendly audio pooling. Good audio is one of the most impactful yet underinvested areas of game development; it provides 50% of the player experience.

## When To Use

- Playing sound effects (attacks, footsteps, UI clicks, ambient sounds)
- Setting up a music system with playlists, crossfading, and transitions
- Configuring 3D spatial audio for immersive environments
- Building an AudioMixer with volume groups (Master, Music, SFX, Voice, Ambient)
- Implementing a settings menu for audio volume control
- Optimizing audio memory and runtime performance
- Creating audio pools for frequently played sounds

## Prerequisites

- Unity 6 (6000.x)
- Basic understanding of AudioSource and AudioClip
- [02 — C# Scripting](../02-CSharp-Scripting/skill.md) fundamentals
- [07 — ScriptableObjects](../07-ScriptableObjects/skill.md) for data-driven audio

## Instructions

### 1. Audio Architecture Overview

```
Audio System Architecture:
├── AudioManager (Singleton or Service)
│   ├── Music Player (dedicated AudioSource, crossfade support)
│   ├── SFX Pool (pooled AudioSources for one-shots)
│   ├── Ambient Controller (looping environmental audio)
│   └── Voice Controller (dialogue, narration)
│
├── AudioMixer
│   ├── Master Group
│   │   ├── Music Group
│   │   ├── SFX Group
│   │   ├── Voice Group
│   │   └── Ambient Group
│   └── Snapshots (Normal, Paused, Underwater, Combat)
│
└── Audio Data (ScriptableObjects)
    ├── SFX Definitions (clip, volume, pitch, spatial)
    └── Music Playlists (tracks, transition info)
```

### 2. AudioMixer Setup

Create: **Assets → Create → Audio Mixer → GameAudioMixer**

```
GameAudioMixer:
├── Master (exposed param: "MasterVolume")
│   ├── Music (exposed param: "MusicVolume")
│   │   └── Effects: Lowpass Filter (for underwater/paused)
│   ├── SFX (exposed param: "SFXVolume")
│   │   └── Effects: Send to Reverb
│   ├── Voice (exposed param: "VoiceVolume")
│   │   └── Effects: Ducking from Music
│   └── Ambient (exposed param: "AmbientVolume")
│       └── Effects: Reverb Zone
│
├── Snapshots:
│   ├── Normal    — All groups at 0 dB
│   ├── Paused    — Music -10 dB, SFX -80 dB, Lowpass on Music
│   ├── Cutscene  — Music 0 dB, SFX -80 dB, Voice +3 dB
│   └── Underwater — Lowpass on everything, reverb
```

> **Expose parameters:** Right-click a mixer parameter → "Expose to Script" → name it. This enables runtime volume control.

### 3. Audio Manager

```csharp
using UnityEngine;
using UnityEngine.Audio;

public class AudioManager : MonoBehaviour
{
    public static AudioManager Instance { get; private set; }
    
    [Header("Mixer")]
    [SerializeField] private AudioMixer _mixer;
    
    [Header("Music")]
    [SerializeField] private AudioSource _musicSourceA;
    [SerializeField] private AudioSource _musicSourceB;
    [SerializeField] private float _crossfadeDuration = 2f;
    
    [Header("SFX Pool")]
    [SerializeField] private int _sfxPoolSize = 16;
    [SerializeField] private AudioSource _sfxTemplate;
    
    private AudioSource[] _sfxPool;
    private int _sfxPoolIndex;
    private AudioSource _activeMusicSource;
    private bool _isMusicSourceA = true;
    
    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
        DontDestroyOnLoad(gameObject);
        
        InitializeSFXPool();
        _activeMusicSource = _musicSourceA;
    }
    
    // --- SFX ---
    
    private void InitializeSFXPool()
    {
        _sfxPool = new AudioSource[_sfxPoolSize];
        for (int i = 0; i < _sfxPoolSize; i++)
        {
            var go = new GameObject($"SFX_Source_{i}");
            go.transform.SetParent(transform);
            _sfxPool[i] = go.AddComponent<AudioSource>();
            _sfxPool[i].outputAudioMixerGroup = _sfxTemplate.outputAudioMixerGroup;
            _sfxPool[i].playOnAwake = false;
        }
    }
    
    /// <summary>
    /// Play a one-shot SFX (2D — UI clicks, pickups, non-spatial).
    /// </summary>
    public void PlaySFX(AudioClip clip, float volume = 1f, float pitchVariance = 0f)
    {
        if (clip == null) return;
        
        AudioSource source = GetNextSFXSource();
        source.spatialBlend = 0f; // 2D
        source.clip = clip;
        source.volume = volume;
        source.pitch = 1f + Random.Range(-pitchVariance, pitchVariance);
        source.Play();
    }
    
    /// <summary>
    /// Play a SFX at a world position (3D spatial audio).
    /// </summary>
    public void PlaySFXAtPoint(AudioClip clip, Vector3 position, float volume = 1f, 
        float pitchVariance = 0.05f)
    {
        if (clip == null) return;
        
        AudioSource source = GetNextSFXSource();
        source.transform.position = position;
        source.spatialBlend = 1f; // Full 3D
        source.clip = clip;
        source.volume = volume;
        source.pitch = 1f + Random.Range(-pitchVariance, pitchVariance);
        source.Play();
    }
    
    /// <summary>
    /// Play a random clip from an array (great for footsteps, hits).
    /// </summary>
    public void PlayRandomSFX(AudioClip[] clips, Vector3 position, float volume = 1f)
    {
        if (clips == null || clips.Length == 0) return;
        PlaySFXAtPoint(clips[Random.Range(0, clips.Length)], position, volume);
    }
    
    private AudioSource GetNextSFXSource()
    {
        var source = _sfxPool[_sfxPoolIndex];
        _sfxPoolIndex = (_sfxPoolIndex + 1) % _sfxPoolSize;
        return source;
    }
    
    // --- Music ---
    
    /// <summary>
    /// Play music with crossfade from current track.
    /// </summary>
    public void PlayMusic(AudioClip clip, bool loop = true)
    {
        if (clip == null) return;
        
        var newSource = _isMusicSourceA ? _musicSourceB : _musicSourceA;
        newSource.clip = clip;
        newSource.loop = loop;
        newSource.Play();
        
        StartCoroutine(CrossfadeMusic(_activeMusicSource, newSource));
        
        _activeMusicSource = newSource;
        _isMusicSourceA = !_isMusicSourceA;
    }
    
    public void StopMusic()
    {
        StartCoroutine(FadeOut(_activeMusicSource, _crossfadeDuration));
    }
    
    private System.Collections.IEnumerator CrossfadeMusic(AudioSource from, AudioSource to)
    {
        float elapsed = 0f;
        float fromStartVol = from.volume;
        
        to.volume = 0f;
        
        while (elapsed < _crossfadeDuration)
        {
            elapsed += Time.unscaledDeltaTime;
            float t = elapsed / _crossfadeDuration;
            
            from.volume = Mathf.Lerp(fromStartVol, 0f, t);
            to.volume = Mathf.Lerp(0f, 1f, t);
            
            yield return null;
        }
        
        from.Stop();
        from.volume = fromStartVol;
        to.volume = 1f;
    }
    
    private System.Collections.IEnumerator FadeOut(AudioSource source, float duration)
    {
        float startVol = source.volume;
        float elapsed = 0f;
        
        while (elapsed < duration)
        {
            elapsed += Time.unscaledDeltaTime;
            source.volume = Mathf.Lerp(startVol, 0f, elapsed / duration);
            yield return null;
        }
        
        source.Stop();
        source.volume = startVol;
    }
    
    // --- Mixer Volume Control ---
    
    /// <summary>
    /// Set volume on a mixer group. Value is 0-1 (linear), converted to dB.
    /// </summary>
    public void SetVolume(string exposedParam, float linearVolume)
    {
        // Convert linear (0-1) to logarithmic dB (-80 to 0)
        float dB = linearVolume > 0.001f 
            ? Mathf.Log10(linearVolume) * 20f 
            : -80f;
        _mixer.SetFloat(exposedParam, dB);
    }
    
    public float GetVolume(string exposedParam)
    {
        _mixer.GetFloat(exposedParam, out float dB);
        return Mathf.Pow(10f, dB / 20f); // Convert dB back to linear
    }
    
    // --- Snapshots ---
    
    public void TransitionToSnapshot(string snapshotName, float duration = 1f)
    {
        var snapshot = _mixer.FindSnapshot(snapshotName);
        snapshot?.TransitionTo(duration);
    }
}
```

### 4. ScriptableObject Audio Definitions

Data-driven audio for easy designer tuning:

```csharp
using UnityEngine;

[CreateAssetMenu(fileName = "New SFX", menuName = "Audio/SFX Definition")]
public class SFXDefinition : ScriptableObject
{
    [Header("Clips")]
    [SerializeField] private AudioClip[] _clips;
    
    [Header("Playback")]
    [Range(0f, 1f)] public float volume = 1f;
    [Range(0f, 0.3f)] public float pitchVariance = 0.05f;
    [Range(0f, 1f)] public float spatialBlend = 1f;
    
    [Header("Cooldown")]
    [Tooltip("Minimum seconds between plays (prevents sound stacking)")]
    public float cooldown = 0.05f;
    
    [System.NonSerialized] private float _lastPlayTime;
    
    public AudioClip GetRandomClip()
    {
        if (_clips == null || _clips.Length == 0) return null;
        return _clips[Random.Range(0, _clips.Length)];
    }
    
    public bool CanPlay()
    {
        if (Time.time - _lastPlayTime < cooldown) return false;
        _lastPlayTime = Time.time;
        return true;
    }
    
    public void Play(Vector3 position)
    {
        if (!CanPlay()) return;
        AudioManager.Instance.PlaySFXAtPoint(GetRandomClip(), position, volume, pitchVariance);
    }
    
    public void Play2D()
    {
        if (!CanPlay()) return;
        AudioManager.Instance.PlaySFX(GetRandomClip(), volume, pitchVariance);
    }
}
```

**Usage:**

```csharp
public class Weapon : MonoBehaviour
{
    [SerializeField] private SFXDefinition _swingSound;
    [SerializeField] private SFXDefinition _hitSound;
    
    public void OnSwing() => _swingSound.Play(transform.position);
    public void OnHit(Vector3 hitPoint) => _hitSound.Play(hitPoint);
}
```

### 5. Music Playlist System

```csharp
[CreateAssetMenu(fileName = "New Playlist", menuName = "Audio/Music Playlist")]
public class MusicPlaylist : ScriptableObject
{
    public AudioClip[] tracks;
    public bool shuffle = false;
    public float trackGap = 1f; // Seconds between tracks
    
    [System.NonSerialized] private int _currentIndex;
    [System.NonSerialized] private int[] _shuffledOrder;
    
    public AudioClip GetNextTrack()
    {
        if (tracks == null || tracks.Length == 0) return null;
        
        if (shuffle)
        {
            if (_shuffledOrder == null || _shuffledOrder.Length != tracks.Length)
                ReShuffle();
            
            var clip = tracks[_shuffledOrder[_currentIndex]];
            _currentIndex = (_currentIndex + 1) % tracks.Length;
            
            if (_currentIndex == 0) ReShuffle();
            return clip;
        }
        
        var track = tracks[_currentIndex];
        _currentIndex = (_currentIndex + 1) % tracks.Length;
        return track;
    }
    
    private void ReShuffle()
    {
        _shuffledOrder = new int[tracks.Length];
        for (int i = 0; i < tracks.Length; i++) _shuffledOrder[i] = i;
        
        // Fisher-Yates shuffle
        for (int i = tracks.Length - 1; i > 0; i--)
        {
            int j = Random.Range(0, i + 1);
            (_shuffledOrder[i], _shuffledOrder[j]) = (_shuffledOrder[j], _shuffledOrder[i]);
        }
    }
}
```

### 6. 3D Spatial Audio Configuration

Configure AudioSource for realistic 3D audio:

```
AudioSource (3D Spatial Settings):
  Spatial Blend: 1.0 (full 3D)
  Doppler Level: 0.5 (subtle doppler for moving sources)
  Min Distance: 1    (full volume within this radius)
  Max Distance: 30   (inaudible beyond this)
  Rolloff Mode: Logarithmic (realistic) or Custom (game-tuned)
  Spread: 0-360 (stereo width — 0 for point, 360 for ambient)
  
Reverb Zone Mix: 1.0 (respect reverb zones)
```

#### Audio Reverb Zones

Place `AudioReverbZone` components in your environment:

| Zone | Preset | Where |
|------|--------|-------|
| Cave | Cave preset | Underground areas |
| Hall | Hall preset | Large indoor rooms |
| Forest | Forest preset | Outdoor wooded areas |
| Bathroom | Bathroom preset | Small tiled rooms |
| None | Off | Open outdoor areas |

### 7. Footstep System

```csharp
using UnityEngine;

public class FootstepSystem : MonoBehaviour
{
    [System.Serializable]
    public class SurfaceAudio
    {
        public PhysicsMaterial surfaceMaterial;
        public SFXDefinition footstepSound;
    }
    
    [SerializeField] private SurfaceAudio[] _surfaces;
    [SerializeField] private SFXDefinition _defaultFootstep;
    [SerializeField] private float _rayDistance = 1.2f;
    [SerializeField] private LayerMask _groundMask;
    
    /// <summary>
    /// Called from Animation Event on walk/run clips.
    /// </summary>
    public void OnFootstep()
    {
        if (Physics.Raycast(transform.position + Vector3.up * 0.1f, Vector3.down, 
            out RaycastHit hit, _rayDistance, _groundMask))
        {
            var material = hit.collider.sharedMaterial;
            SFXDefinition sound = _defaultFootstep;
            
            foreach (var surface in _surfaces)
            {
                if (surface.surfaceMaterial == material)
                {
                    sound = surface.footstepSound;
                    break;
                }
            }
            
            sound.Play(hit.point);
        }
    }
}
```

### 8. Volume Settings UI

```csharp
using UnityEngine;
using UnityEngine.UI;

public class AudioSettingsUI : MonoBehaviour
{
    [SerializeField] private Slider _masterSlider;
    [SerializeField] private Slider _musicSlider;
    [SerializeField] private Slider _sfxSlider;
    [SerializeField] private Slider _voiceSlider;
    
    private void Start()
    {
        // Load saved settings
        _masterSlider.value = PlayerPrefs.GetFloat("MasterVolume", 1f);
        _musicSlider.value = PlayerPrefs.GetFloat("MusicVolume", 0.8f);
        _sfxSlider.value = PlayerPrefs.GetFloat("SFXVolume", 1f);
        _voiceSlider.value = PlayerPrefs.GetFloat("VoiceVolume", 1f);
        
        // Apply
        ApplyVolumes();
        
        // Listen for changes
        _masterSlider.onValueChanged.AddListener(_ => ApplyVolumes());
        _musicSlider.onValueChanged.AddListener(_ => ApplyVolumes());
        _sfxSlider.onValueChanged.AddListener(_ => ApplyVolumes());
        _voiceSlider.onValueChanged.AddListener(_ => ApplyVolumes());
    }
    
    private void ApplyVolumes()
    {
        AudioManager.Instance.SetVolume("MasterVolume", _masterSlider.value);
        AudioManager.Instance.SetVolume("MusicVolume", _musicSlider.value);
        AudioManager.Instance.SetVolume("SFXVolume", _sfxSlider.value);
        AudioManager.Instance.SetVolume("VoiceVolume", _voiceSlider.value);
    }
    
    public void SaveSettings()
    {
        PlayerPrefs.SetFloat("MasterVolume", _masterSlider.value);
        PlayerPrefs.SetFloat("MusicVolume", _musicSlider.value);
        PlayerPrefs.SetFloat("SFXVolume", _sfxSlider.value);
        PlayerPrefs.SetFloat("VoiceVolume", _voiceSlider.value);
        PlayerPrefs.Save();
    }
}
```

### 9. Audio Import Settings

| Audio Type | Load Type | Compression | Sample Rate |
|-----------|-----------|-------------|-------------|
| **Short SFX** (< 1s) | Decompress On Load | PCM or ADPCM | Original |
| **Medium SFX** (1-5s) | Compressed In Memory | Vorbis (70%) | 22050 Hz |
| **Music** (> 5s) | Streaming | Vorbis (50-70%) | 44100 Hz |
| **Ambient loops** | Compressed In Memory | Vorbis (50%) | 22050 Hz |
| **Voice/Dialogue** | Streaming | Vorbis (70%) | 22050 Hz |

> **Key rules:** 
> - Always set mono for 3D spatial SFX (stereo is wasted for spatialized audio).
> - Use streaming for music and long audio to reduce memory.
> - Force mono on mobile for all SFX to halve memory usage.

## Best Practices

1. **Use an AudioMixer** — always route audio through mixer groups for global volume control.
2. **Convert linear to dB** for mixer volume: `dB = Mathf.Log10(linear) * 20f`. Never set raw 0–1 on mixer params.
3. **Pool AudioSources** for SFX — `AudioSource.PlayClipAtPoint` creates and destroys a GameObject each call.
4. **Add pitch variance** (±5%) on repeated SFX — prevents machine-gun repetition on footsteps, hits, shots.
5. **Use multiple clips per sound** — cycle or randomize to avoid listener fatigue.
6. **Set cooldowns** on frequently triggered sounds — prevents audio stacking and clipping.
7. **Use `Time.unscaledDeltaTime`** for music crossfades — music should continue during pause.
8. **Mark 3D SFX as mono** — stereo 3D audio wastes memory and can cause spatial confusion.
9. **Use Streaming for music** — keeps memory usage low for long tracks.
10. **Always use AudioMixer Snapshots** for state changes (pause, underwater) instead of manual parameter tweaking.

## Common Pitfalls

| Pitfall | Why It Hurts | Fix |
|---------|-------------|-----|
| Using `AudioSource.PlayClipAtPoint` | Creates/destroys GameObjects (GC pressure) | Use an AudioSource pool |
| Setting mixer volume with linear 0–1 | Volume sounds wrong (not perceptually linear) | Convert to dB: `Log10(v) * 20` |
| Stereo clips for 3D audio | Doubled memory, poor spatialization | Import as mono for 3D SFX |
| "Decompress On Load" for music | Huge memory usage for long tracks | Use Streaming for music |
| No pitch variation on repeated SFX | Sounds robotic and repetitive | Add ±5% random pitch variance |
| Playing too many sounds simultaneously | Audio clipping, muddy mix | Set a maximum concurrent sound count per category |
| AudioMixer volume at -80 dB instead of 0 at start | Silent game until settings loaded | Load and apply saved settings in `Start()` |
| Not using mixer groups | Can't control volume by category | Route every AudioSource through a mixer group |

## Reference

- [Unity Manual — Audio](https://docs.unity3d.com/Manual/Audio.html)
- [Unity Manual — AudioMixer](https://docs.unity3d.com/Manual/AudioMixer.html)
- [Unity Manual — AudioSource](https://docs.unity3d.com/ScriptReference/AudioSource.html)
- [Unity Manual — Audio Clip Import Settings](https://docs.unity3d.com/Manual/class-AudioClip.html)
- [Unity Manual — Audio Spatializer](https://docs.unity3d.com/Manual/AudioSpatializerSDK.html)
