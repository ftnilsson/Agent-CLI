# Scene Architecture Review

Review the following Unity scene setup for architecture and best practices.

## Check For

1. **Hierarchy organisation** — Is the hierarchy flat and logical? Are objects grouped under empty parents with descriptive names?
2. **Prefab usage** — Are reusable objects prefabs? Are nested prefabs used where appropriate?
3. **Component responsibility** — Does each MonoBehaviour have a single responsibility? Are "manager" scripts doing too much?
4. **Scene references** — Are cross-object references set via the inspector or found at runtime? Is there a risk of null references?
5. **Scriptable Objects** — Could configuration data be moved to ScriptableObjects instead of hardcoded values?
6. **Lighting** — Is the lighting setup appropriate for the target platform? Are light probes placed for dynamic objects?
7. **Physics layers** — Are collision layers configured to avoid unnecessary collision checks?
8. **Canvas setup** — Are UI canvases split to avoid unnecessary rebuilds? Is the event system configured?
9. **Loading** — Are large assets set up for addressable/async loading? Are scenes split for additive loading?
10. **Entry points** — Is there a clear initialisation order? Are `Awake` vs `Start` vs `OnEnable` used correctly?

## Output Format

1. Rate the scene architecture: ⭐ out of 5
2. List what's well-structured
3. List issues with suggested restructuring
4. If applicable, provide a sample hierarchy layout
