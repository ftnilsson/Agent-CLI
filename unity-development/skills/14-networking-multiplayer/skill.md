# Networking & Multiplayer

## Package Setup

- Install `com.unity.netcode.gameobjects` (Netcode for GameObjects) as the core networking framework
- Install `com.unity.multiplayer.tools` for the Network Profiler and Runtime Stats Monitor
- Install `com.unity.services.lobby` and `com.unity.services.relay` for matchmaking and NAT traversal
- Install `com.unity.services.authentication` for anonymous or platform sign-in

## NetworkManager Configuration

- Add the `NetworkManager` component to a persistent root GameObject in the `_Core` scene
- Assign the player prefab — it must have a `NetworkObject` component
- Register all spawnable prefabs in the **Network Prefabs** list before entering Play Mode
- Use `UnityTransport` as the transport layer; configure Relay data before calling `StartHost()` or `StartClient()`
- Subscribe to `OnClientConnectedCallback` and `OnClientDisconnectCallback` in `OnEnable()`; unsubscribe in `OnDisable()`

## NetworkBehaviour Rules

- Inherit from `NetworkBehaviour` (not `MonoBehaviour`) for all networked scripts
- Check `IsOwner` before processing local input: `if (!IsOwner) return;`
- Check `IsServer` before modifying `NetworkVariable` values or spawning objects
- Use `OnNetworkSpawn()` and `OnNetworkDespawn()` instead of `Start()` / `OnDestroy()` for network lifecycle
- Subscribe to `NetworkVariable.OnValueChanged` in `OnNetworkSpawn()`; unsubscribe in `OnNetworkDespawn()`

## NetworkVariables

```csharp
public class PlayerHealth : NetworkBehaviour
{
    public NetworkVariable<int> Health = new(100,
        NetworkVariableReadPermission.Everyone,
        NetworkVariableWritePermission.Server);

    public override void OnNetworkSpawn() => Health.OnValueChanged += OnHealthChanged;
    public override void OnNetworkDespawn() => Health.OnValueChanged -= OnHealthChanged;

    private void OnHealthChanged(int prev, int next) { /* update UI, VFX */ }

    [ServerRpc]
    public void TakeDamageServerRpc(int damage)
    {
        Health.Value = Mathf.Max(0, Health.Value - damage);
        if (Health.Value <= 0) DieClientRpc();
    }

    [ClientRpc]
    private void DieClientRpc() { /* play death animation on all clients */ }
}
```

- Declare with explicit permissions: `new NetworkVariable<int>(100, NetworkVariableReadPermission.Everyone, NetworkVariableWritePermission.Server)`
- Implement `INetworkSerializable` for structured data: provide `NetworkSerialize<T>(BufferSerializer<T> serializer)`
- Minimize `NetworkVariable` writes — only update when the value genuinely changes to reduce bandwidth

## RPCs

- Name `[ServerRpc]` methods with the `ServerRpc` suffix — Unity enforces this convention
- Name `[ClientRpc]` methods with the `ClientRpc` suffix
- By default only the object owner can call a `[ServerRpc]` — add `(RequireOwnership = false)` to allow any client
- Use `ServerRpcParams rpcParams = default` to identify the calling client: `rpcParams.Receive.SenderClientId`
- Validate all data received in `[ServerRpc]` — never trust client input

## Object Spawning

- Only the server can call `NetworkObject.Spawn()` — clients must send a `[ServerRpc]` request
- Call `networkObject.Despawn()` on the server to remove an object from all clients
- Transfer ownership with `networkObject.ChangeOwnership(clientId)` when needed (client-authoritative projectiles)

## NetworkTransform

- Add `NetworkTransform` for automatic position/rotation sync; configure sync axes and thresholds
- For client-authoritative movement, override `OnIsServerAuthoritative()` to return `false`
- Add `NetworkAnimator` alongside `Animator` for automatic parameter and trigger synchronization

## Lobby and Relay (Unity Gaming Services)

- Initialize Unity Services: `await UnityServices.InitializeAsync()`
- Sign in: `await AuthenticationService.Instance.SignInAnonymouslyAsync()`
- Send lobby heartbeat every 15 seconds: `await LobbyService.Instance.SendHeartbeatPingAsync(lobbyId)` — lobbies expire without heartbeats
- Create Relay allocation → get join code → configure `UnityTransport` → `StartHost()`
- Join Relay: `await RelayService.Instance.JoinAllocationAsync(joinCode)` → configure transport → `StartClient()`

## Scene Management

- Use `NetworkManager.Singleton.SceneManager.LoadScene()` for synchronized scene loading — never `SceneManager.LoadScene()` directly
- Subscribe to `SceneManager.OnLoadEventCompleted` to know when all clients have loaded the scene

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Client spawning objects directly | Send `[ServerRpc]`; server calls `NetworkObject.Spawn()` |
| `NetworkVariable` written from client | Only the server (or permitted writer) may write |
| Player prefab not in Network Prefabs list | Prefab cannot spawn on clients |
| `ServerRpc` method missing `ServerRpc` suffix | Unity will not register it as an RPC |
| `SceneManager.LoadScene()` in networked game | Scenes desync across clients |
| No lobby heartbeat | Lobby expires after 30 seconds |

## Best Practices

- Validate all `[ServerRpc]` input on the server — position, action legality, cooldowns
- Use `INetworkSerializable` structs for batching multiple values instead of separate `NetworkVariable`s
- Profile bandwidth per object with the Network Profiler
- Test with ParrelSync (two Unity Editor instances) or standalone builds to catch sync issues early
- Handle disconnections gracefully — clean up player state in `OnClientDisconnectCallback`
- Separate network logic from gameplay logic for offline testability
- Use connection approval to enforce version matching and max player limits
