# 14 — Networking & Multiplayer

## Description

Build multiplayer games in Unity 6 using **Netcode for GameObjects (NGO)**. This skill covers host/client architecture, networked object spawning, state synchronisation, RPCs, lobby/relay services, and common multiplayer patterns such as client-side prediction and lag compensation.

## When To Use

- Building any real-time multiplayer game (co-op, competitive, party).
- Adding online features to a single-player game (leaderboards, ghost replays).
- Creating dedicated-server or listen-server (host) architectures.
- Implementing matchmaking, lobbies, and relay connections through Unity Gaming Services.

## Prerequisites

| Skill | Why |
|-------|-----|
| [01 — Project Setup](../01-Project-Setup/skill.md) | Package installation and project configuration |
| [02 — C# Scripting](../02-CSharp-Scripting/skill.md) | Async patterns, events, and core C# knowledge |
| [03 — Scene Architecture](../03-Scene-Architecture/skill.md) | Networked scene management and additive loading |

## Instructions

### 1 — Package Setup

Install the following packages via the Package Manager:

| Package | ID | Purpose |
|---------|----|---------|
| Netcode for GameObjects | `com.unity.netcode.gameobjects` | Core networking framework |
| Unity Transport | `com.unity.transport` | Low-level network transport (installed as dependency) |
| Multiplayer Tools | `com.unity.multiplayer.tools` | Profiler, runtime stats monitor |
| Lobby (optional) | `com.unity.services.lobby` | Matchmaking lobbies |
| Relay (optional) | `com.unity.services.relay` | NAT punch-through relay servers |
| Authentication (optional) | `com.unity.services.authentication` | Anonymous / platform sign-in |

### 2 — NetworkManager Setup

1. Create an empty GameObject named `NetworkManager`.
2. Add the **NetworkManager** component.
3. Set the **Player Prefab** (must have a `NetworkObject` component).
4. Register all spawnable prefabs in the **Network Prefabs** list.
5. Choose a transport (default: **UnityTransport**).

```csharp
using Unity.Netcode;
using UnityEngine;

public class GameNetworkManager : MonoBehaviour
{
    public void StartHost()
    {
        NetworkManager.Singleton.StartHost();
    }

    public void StartClient()
    {
        NetworkManager.Singleton.StartClient();
    }

    public void StartServer()
    {
        NetworkManager.Singleton.StartServer();
    }

    public void Disconnect()
    {
        NetworkManager.Singleton.Shutdown();
    }

    private void OnEnable()
    {
        NetworkManager.Singleton.OnClientConnectedCallback += OnClientConnected;
        NetworkManager.Singleton.OnClientDisconnectCallback += OnClientDisconnected;
    }

    private void OnDisable()
    {
        if (NetworkManager.Singleton != null)
        {
            NetworkManager.Singleton.OnClientConnectedCallback -= OnClientConnected;
            NetworkManager.Singleton.OnClientDisconnectCallback -= OnClientDisconnected;
        }
    }

    private void OnClientConnected(ulong clientId)
    {
        Debug.Log($"Client {clientId} connected.");
    }

    private void OnClientDisconnected(ulong clientId)
    {
        Debug.Log($"Client {clientId} disconnected.");
    }
}
```

### 3 — NetworkObject & Ownership

Every networked GameObject needs a `NetworkObject` component. Key concepts:

| Concept | Description |
|---------|-------------|
| **NetworkObjectId** | Unique ID across all clients |
| **OwnerClientId** | The client that "owns" this object |
| **IsOwner** | True on the owning client |
| **IsServer** / **IsHost** | True on the server / host |
| **IsLocalPlayer** | True if this is the local player's object |

```csharp
using Unity.Netcode;

public class OwnershipExample : NetworkBehaviour
{
    private void Update()
    {
        // Only the owner should process input
        if (!IsOwner) return;

        // Process local input...
    }
}
```

### 4 — NetworkVariables (State Synchronisation)

`NetworkVariable<T>` automatically synchronises values from server to all clients.

```csharp
using Unity.Netcode;
using UnityEngine;

public class PlayerHealth : NetworkBehaviour
{
    // Only the server can write; all clients can read (default permissions)
    public NetworkVariable<int> Health = new(
        value: 100,
        readPerm: NetworkVariableReadPermission.Everyone,
        writePerm: NetworkVariableWritePermission.Server
    );

    public NetworkVariable<bool> IsAlive = new(true);

    public override void OnNetworkSpawn()
    {
        Health.OnValueChanged += OnHealthChanged;
    }

    public override void OnNetworkDespawn()
    {
        Health.OnValueChanged -= OnHealthChanged;
    }

    private void OnHealthChanged(int previousValue, int newValue)
    {
        Debug.Log($"Health changed: {previousValue} → {newValue}");
        // Update UI, play damage effects, etc.
    }

    // Called on the server
    [ServerRpc]
    public void TakeDamageServerRpc(int damage)
    {
        if (!IsAlive.Value) return;

        Health.Value = Mathf.Max(0, Health.Value - damage);

        if (Health.Value <= 0)
        {
            IsAlive.Value = false;
            DieClientRpc();
        }
    }

    [ClientRpc]
    private void DieClientRpc()
    {
        // Play death animation on all clients
        Debug.Log("Player died!");
    }
}
```

#### Custom NetworkVariable Types

For complex data, implement `INetworkSerializable`:

```csharp
using Unity.Netcode;

public struct PlayerStats : INetworkSerializable
{
    public int Kills;
    public int Deaths;
    public float Score;

    public void NetworkSerialize<T>(BufferSerializer<T> serializer) where T : IReaderWriter
    {
        serializer.SerializeValue(ref Kills);
        serializer.SerializeValue(ref Deaths);
        serializer.SerializeValue(ref Score);
    }
}
```

### 5 — RPCs (Remote Procedure Calls)

| RPC Type | Direction | Use Case |
|----------|-----------|----------|
| `[ServerRpc]` | Client → Server | Send input/actions to server for validation |
| `[ClientRpc]` | Server → All Clients | Broadcast events (explosions, chat messages) |

```csharp
using Unity.Netcode;
using UnityEngine;

public class PlayerCombat : NetworkBehaviour
{
    [SerializeField] private float _attackRange = 2f;
    [SerializeField] private int _attackDamage = 25;
    [SerializeField] private LayerMask _hitMask;

    // Client calls this to request an attack
    [ServerRpc]
    public void AttackServerRpc(ServerRpcParams rpcParams = default)
    {
        // Server validates and executes
        if (Physics.Raycast(transform.position, transform.forward, out var hit, _attackRange, _hitMask))
        {
            if (hit.collider.TryGetComponent<PlayerHealth>(out var health))
            {
                health.TakeDamageServerRpc(_attackDamage);
                AttackFeedbackClientRpc(hit.point, hit.normal);
            }
        }
    }

    // Server tells all clients to show VFX
    [ClientRpc]
    private void AttackFeedbackClientRpc(Vector3 hitPoint, Vector3 hitNormal)
    {
        // Spawn hit VFX at the impact point on all clients
        Debug.Log($"Hit at {hitPoint}");
    }
}
```

#### ServerRpc Ownership Requirement

By default, only the **owner** of a `NetworkObject` can call a `[ServerRpc]` on it. To allow any client:

```csharp
[ServerRpc(RequireOwnership = false)]
public void InteractServerRpc(ServerRpcParams rpcParams = default)
{
    ulong senderId = rpcParams.Receive.SenderClientId;
    Debug.Log($"Interaction requested by client {senderId}");
}
```

### 6 — Networked Object Spawning

Only the **server** can spawn and despawn `NetworkObject`s.

```csharp
using Unity.Netcode;
using UnityEngine;

public class ProjectileSpawner : NetworkBehaviour
{
    [SerializeField] private GameObject _projectilePrefab;
    [SerializeField] private Transform _firePoint;

    [ServerRpc]
    public void FireServerRpc(Vector3 direction)
    {
        var projectile = Instantiate(_projectilePrefab, _firePoint.position, Quaternion.LookRotation(direction));
        projectile.GetComponent<NetworkObject>().Spawn();

        // Optionally transfer ownership to the firing client
        // projectile.GetComponent<NetworkObject>().ChangeOwnership(OwnerClientId);
    }

    // Despawn (server only)
    public void DespawnProjectile(NetworkObject networkObject)
    {
        networkObject.Despawn(); // Removes from all clients
    }
}
```

### 7 — NetworkTransform

Synchronise position, rotation, and scale automatically:

1. Add `NetworkTransform` component to the `NetworkObject`.
2. Configure which axes to sync and thresholds.

For **client-authoritative movement** (owner drives position):

```csharp
using Unity.Netcode.Components;

// Override to allow owner to write transform
public class ClientNetworkTransform : NetworkTransform
{
    protected override bool OnIsServerAuthoritative()
    {
        return false; // Client-authoritative
    }
}
```

### 8 — Networked Animation

Add `NetworkAnimator` alongside `Animator` on a `NetworkObject`:

```csharp
using Unity.Netcode.Components;

// Client-authoritative animator
public class ClientNetworkAnimator : NetworkAnimator
{
    protected override bool OnIsServerAuthoritative()
    {
        return false;
    }
}
```

This automatically synchronises Animator parameters and triggers across the network.

### 9 — Lobby & Relay (Unity Gaming Services)

#### Authentication

```csharp
using Unity.Services.Core;
using Unity.Services.Authentication;
using UnityEngine;

public class AuthenticationManager : MonoBehaviour
{
    private async void Start()
    {
        await UnityServices.InitializeAsync();
        await AuthenticationService.Instance.SignInAnonymouslyAsync();
        Debug.Log($"Signed in. Player ID: {AuthenticationService.Instance.PlayerId}");
    }
}
```

#### Creating & Joining Lobbies

```csharp
using System.Collections.Generic;
using Unity.Services.Lobbies;
using Unity.Services.Lobbies.Models;
using UnityEngine;

public class LobbyManager : MonoBehaviour
{
    private Lobby _currentLobby;

    public async void CreateLobby(string lobbyName, int maxPlayers)
    {
        var options = new CreateLobbyOptions
        {
            IsPrivate = false,
            Data = new Dictionary<string, DataObject>
            {
                { "GameMode", new DataObject(DataObject.VisibilityOptions.Public, "Deathmatch") },
                { "Map",      new DataObject(DataObject.VisibilityOptions.Public, "Arena_01") }
            }
        };

        _currentLobby = await LobbyService.Instance.CreateLobbyAsync(lobbyName, maxPlayers, options);
        Debug.Log($"Lobby created: {_currentLobby.Id}, Code: {_currentLobby.LobbyCode}");

        // Start heartbeat to keep lobby alive
        InvokeRepeating(nameof(HeartbeatLobby), 15f, 15f);
    }

    public async void JoinLobbyByCode(string lobbyCode)
    {
        _currentLobby = await LobbyService.Instance.JoinLobbyByCodeAsync(lobbyCode);
        Debug.Log($"Joined lobby: {_currentLobby.Id}");
    }

    public async void QuickJoin()
    {
        var options = new QuickJoinLobbyOptions
        {
            Filter = new List<QueryFilter>
            {
                new(QueryFilter.FieldOptions.AvailableSlots, "0", QueryFilter.OpOptions.GT)
            }
        };

        _currentLobby = await LobbyService.Instance.QuickJoinLobbyAsync(options);
    }

    private async void HeartbeatLobby()
    {
        if (_currentLobby != null)
            await LobbyService.Instance.SendHeartbeatPingAsync(_currentLobby.Id);
    }
}
```

#### Relay Setup

```csharp
using Unity.Services.Relay;
using Unity.Services.Relay.Models;
using Unity.Netcode;
using Unity.Netcode.Transports.UTP;
using UnityEngine;

public class RelayManager : MonoBehaviour
{
    public async void StartHostWithRelay(int maxConnections = 4)
    {
        Allocation allocation = await RelayService.Instance.CreateAllocationAsync(maxConnections);
        string joinCode = await RelayService.Instance.GetJoinCodeAsync(allocation.AllocationId);

        Debug.Log($"Relay Join Code: {joinCode}");

        var transport = NetworkManager.Singleton.GetComponent<UnityTransport>();
        transport.SetHostRelayData(
            allocation.RelayServer.IpV4,
            (ushort)allocation.RelayServer.Port,
            allocation.AllocationIdBytes,
            allocation.Key,
            allocation.ConnectionData
        );

        NetworkManager.Singleton.StartHost();
    }

    public async void JoinWithRelay(string joinCode)
    {
        JoinAllocation joinAllocation = await RelayService.Instance.JoinAllocationAsync(joinCode);

        var transport = NetworkManager.Singleton.GetComponent<UnityTransport>();
        transport.SetClientRelayData(
            joinAllocation.RelayServer.IpV4,
            (ushort)joinAllocation.RelayServer.Port,
            joinAllocation.AllocationIdBytes,
            joinAllocation.Key,
            joinAllocation.ConnectionData,
            joinAllocation.HostConnectionData
        );

        NetworkManager.Singleton.StartClient();
    }
}
```

### 10 — Networked Scene Management

```csharp
using Unity.Netcode;
using UnityEngine;

public class NetworkSceneLoader : NetworkBehaviour
{
    // Server-only: load a new scene for all clients
    public void LoadGameScene(string sceneName)
    {
        if (!IsServer) return;

        NetworkManager.Singleton.SceneManager.LoadScene(sceneName, UnityEngine.SceneManagement.LoadSceneMode.Single);
    }

    private void OnEnable()
    {
        NetworkManager.Singleton.SceneManager.OnLoadEventCompleted += OnSceneLoaded;
    }

    private void OnDisable()
    {
        if (NetworkManager.Singleton?.SceneManager != null)
            NetworkManager.Singleton.SceneManager.OnLoadEventCompleted -= OnSceneLoaded;
    }

    private void OnSceneLoaded(string sceneName, UnityEngine.SceneManagement.LoadSceneMode loadSceneMode,
        System.Collections.Generic.List<ulong> clientsCompleted,
        System.Collections.Generic.List<ulong> clientsTimedOut)
    {
        Debug.Log($"Scene '{sceneName}' loaded. {clientsCompleted.Count} clients ready.");
    }
}
```

### 11 — Connection Approval

Validate clients before they can join:

```csharp
using Unity.Netcode;
using UnityEngine;

public class ConnectionApproval : MonoBehaviour
{
    [SerializeField] private string _gameVersion = "1.0.0";

    private void Start()
    {
        NetworkManager.Singleton.ConnectionApprovalCallback = ApproveConnection;
    }

    private void ApproveConnection(
        NetworkManager.ConnectionApprovalRequest request,
        NetworkManager.ConnectionApprovalResponse response)
    {
        // Deserialise payload sent by client
        string clientVersion = System.Text.Encoding.UTF8.GetString(request.Payload);

        bool approved = clientVersion == _gameVersion;

        response.Approved = approved;
        response.CreatePlayerObject = approved;
        response.Reason = approved ? string.Empty : "Version mismatch";

        if (!approved)
            Debug.Log($"Client {request.ClientNetworkId} rejected: {response.Reason}");
    }
}
```

## Best Practices

1. **Validate everything on the server** — never trust client input. Use `[ServerRpc]` to request actions, then verify before applying.
2. **Minimise `NetworkVariable` updates** — use thresholds and only change values when they actually differ.
3. **Use `INetworkSerializable`** for structured data instead of multiple `NetworkVariable`s.
4. **Separate network logic from gameplay logic** — keeps code testable offline.
5. **Use Relay** for peer-to-peer games to avoid NAT traversal issues.
6. **Profile with Multiplayer Tools** — the Network Profiler shows bandwidth, RPCs, and variable sync per object.
7. **Test with multiple instances** — use ParrelSync or build a standalone client alongside the editor.
8. **Handle disconnections gracefully** — subscribe to `OnClientDisconnectCallback` and clean up state.
9. **Use connection approval** to enforce version matching and prevent incompatible clients.

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Client trying to spawn objects | Only the server can call `NetworkObject.Spawn()`; send a `[ServerRpc]` request instead |
| `NetworkVariable` not updating on clients | Ensure only the server (or permitted writer) modifies the value |
| Player prefab not spawning | Register it in `NetworkManager ▸ Network Prefabs` and ensure it has a `NetworkObject` component |
| `ServerRpc` not firing | Method name must end with `ServerRpc`; the caller must be the owner (or set `RequireOwnership = false`) |
| Relay join code not working | Ensure both host and client have called `UnityServices.InitializeAsync()` and signed in |
| Scene objects not syncing | Use `NetworkManager.SceneManager.LoadScene()` instead of `SceneManager.LoadScene()` |
| High bandwidth usage | Reduce sync frequency, compress data, use delta compression, sync only changed state |
| Lobby disappearing | Send heartbeat pings every 15 seconds via `SendHeartbeatPingAsync()` |

## Reference

- [Netcode for GameObjects Documentation](https://docs-multiplayer.unity3d.com/netcode/current/about/)
- [Unity Transport Documentation](https://docs-multiplayer.unity3d.com/transport/current/about/)
- [Lobby Service](https://docs.unity3d.com/Packages/com.unity.services.lobby@1.2/manual/index.html)
- [Relay Service](https://docs.unity3d.com/Packages/com.unity.services.relay@1.1/manual/index.html)
- [Multiplayer Tools](https://docs-multiplayer.unity3d.com/tools/current/about/)
- [Multiplayer Samples & Tutorials](https://docs-multiplayer.unity3d.com/netcode/current/tutorials/get-started-ngo/)
