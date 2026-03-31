# Networking & Multiplayer

## Transport Selection

| Transport | Use Case |
|-----------|---------|
| `ENetMultiplayerPeer` | UDP — fast, best for real-time games, LAN/online |
| `WebSocketMultiplayerPeer` | WebSocket — browser-compatible |
| `WebRTCMultiplayerPeer` | Peer-to-peer without a relay server |

- Peer ID `1` is always the server (authority); clients receive unique IDs
- Use server-authoritative architecture for game-critical state — never trust client input

## Hosting and Joining

```gdscript
func host_game(port: int = 7000) -> Error:
    var peer := ENetMultiplayerPeer.new()
    var err := peer.create_server(port, 8)
    if err != OK:
        return err
    multiplayer.multiplayer_peer = peer
    multiplayer.peer_connected.connect(_on_peer_connected)
    multiplayer.peer_disconnected.connect(_on_peer_disconnected)
    return OK

func join_game(address: String, port: int = 7000) -> Error:
    var peer := ENetMultiplayerPeer.new()
    var err := peer.create_client(address, port)
    if err != OK:
        return err
    multiplayer.multiplayer_peer = peer
    multiplayer.connected_to_server.connect(_on_connected)
    multiplayer.connection_failed.connect(_on_failed)
    multiplayer.server_disconnected.connect(_on_disconnected)
    return OK
```

- Always handle `peer_disconnected` — clean up player nodes and state immediately
- Set `multiplayer.multiplayer_peer = null` on connection failure and server disconnect
- Store player data in a `Dictionary` keyed by peer ID

## RPC Annotations

- Use `@rpc("any_peer", "call_local", "reliable")` for client→server requests
- Use `@rpc("authority", "call_local", "reliable")` for server→all-clients broadcasts
- Use `"unreliable"` or `"unreliable_ordered"` transfer mode for high-frequency position updates
- Use `"reliable"` for important one-time events: damage, item pickup, game state changes
- Always validate on server — never execute game-critical logic based on unvalidated client RPC input

## MultiplayerSpawner

- Add `MultiplayerSpawner` to the scene; configure `Auto Spawn List` with all spawnable scenes
- Set `Spawn Path` to the parent node where instances are added
- On the server, call `add_child(instance, true)` — the `true` flag enables network spawn replication
- Never manually instantiate spawned objects on clients — they receive nodes automatically

## MultiplayerSynchronizer

- Add `MultiplayerSynchronizer` as a child of the node to sync
- Add properties to `Replication Config`: use "Always" mode for transform, "On Change" for state flags
- Set the owning peer as authority: `player.set_multiplayer_authority(peer_id)`
- Gate input processing with `if not is_multiplayer_authority(): return`
- Interpolate remote player positions: `global_position = global_position.lerp(synced_position, 10.0 * delta)`

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| No `set_multiplayer_authority()` on player nodes | Set authority to the owning peer — default is server |
| RPC called before connection is established | Check `multiplayer.multiplayer_peer != null` first |
| Syncing all properties every frame | Only sync position/rotation unreliably; derive other state locally |
| No handling of `peer_disconnected` | Always clean up player nodes and data on disconnect |
| `call_local` on every RPC | Only use `call_local` when the caller should also execute the function |
| Game logic executed directly on client RPC input | Validate all client requests on the server before acting |

## Best Practices

- Use `MultiplayerSpawner` and `MultiplayerSynchronizer` instead of writing custom sync code
- Use `unreliable` transfer for position, rotation, and animation state — high frequency, stale data is fine
- Use `reliable` transfer for health changes, item pickups, and game events — must not be dropped
- Interpolate remote player positions client-side to hide network jitter
- Validate all `any_peer` RPC calls on the server before executing game logic
- Handle all disconnection signals: `peer_disconnected`, `server_disconnected`, `connection_failed`
- Test with simulated latency and packet loss using the network conditions simulator
