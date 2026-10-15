# Captured locomotion and original traversal

The current player loads `god-locomotion-captured.glb` with `BG_Walk_Captured`,
`BG_Jog_Captured` and `BG_Run_Captured`. These are selected 120 Hz CMU recordings
retargeted to the existing adult skeleton. See [provenance](./PROVENANCE.md) for
source and permission details. Noise filtering, phase alignment and flat-floor
stance fitting are applied offline. The default jog is 3.1 m/s; X toggles a
1.3 m/s walking pace and Shift runs at 4.6 m/s. Movement accelerates and brakes;
cadence follows actual displacement and height. Walk/jog/run changes preserve
lead-foot phase throughout the fade: contributing gait clips share normalized
stride time and advance at matching cycle rates even when their durations
differ. A quick return from idle retains a still-fading gait's phase. Once idle
has settled, a fresh gait starts normally; reset clears old stride history.
A contributing idle loop also retains its time when a quick stop interrupts
its fade-out, avoiding a small reset of the existing breathing pose.
Dash and original traversal stay independent.

This is a small capture blend set, not a trajectory-search motion-matching
system. Starts and stops use physical acceleration and blended loops; bespoke
captured start/stop/pivot clips and terrain IK remain further work.

## Local-player hair follow-through

Local players using `hair_long01` fit the rear lengths to the selected outfit
and neck. The lower hair inherits the underlying surface's bone weights through
a smooth join; the crown and front remain attached to the head. This addresses
the old head-only attachment cutting through the back during captured motion.
Fitting uses private vertex copies and leaves the shared source buffer intact.
Three original relative shapes then move the lower lengths, driven by measured
head translation and rotation through bounded damped springs. Shape normals use
the deformation's inverse transpose. No new images or binary assets are loaded.
There are no additional bones or draw calls. The 3,314-vertex style adds 238,608
bytes of morph attributes and 79,536 bytes of owned fitted positions/normals;
GPU morph packing has a separate texture cost.
Reset/teleport and reduced-motion mode clear the response; paused updates hold
it. NPC hair and other hairstyles are unchanged. This is a fitted, restrained
shape response with a bind-pose clearance target, not per-frame strand/body
collision simulation or cloth physics. Source hair detail remains coarse.

## Earlier procedural revision, preserved for reference

The earlier running override is `god-running-v2.glb` (124,264 bytes), containing
`BG_Run_Refined` and `BG_Sprint_Refined`. Their normal and sprint strides have
separate timing, a narrower foot track, controlled root compression, anatomical
arm swing, bent elbows and relaxed finger curl. Playback follows actual travel
speed and displayed character height; switching between run and sprint keeps
stride phase. Reset/teleport clears the old phase. Support is derived from the
actual contemporary trainers in `god-wardrobe.glb`, including heel-to-toe roll.

These are original authored animations inspired by the user's athletic action
game reference, not motion capture or extracted Stellar Blade clips. Contact
verification uses the real Three.js skinning and mixer on a flat floor. There
is no terrain-adaptive foot IK. Existing walking, jumping, dash, vault, glide,
grapple and wall-run files remain unchanged. The earlier record below describes
their source assets; the older `BG_Run` clip is retained but no longer selected
by the player controller.

`artemis-locomotion.glb` contains five original authored/procedural skeletal clips for the accepted adult Black Garter character foundation. It is a separate **61,472-byte animation-only GLB**, with no meshes or textures. The accepted `artemis.glb` remains unchanged at SHA-256 `e99290c5245a78132665c7647f3fad9aa10c803dfdd21881979b75f4b9fe52fb`; its accepted clothing, mesh fitting, source texture bytes and idle are preserved.

`artemis-traversal.glb` adds two original actions in a separate **44,704-byte animation-only GLB**. The earlier five-action file remains byte-for-byte unchanged at SHA-256 `942dbdf5573b8717f1003c3db4bfcab77659402c2a7e121ecf32bce11f37cb9b`. The traversal asset contains no geometry, materials, textures, skins or external resource links.

`artemis-grapple.glb` adds a separate **31,328-byte animation-only GLB** containing an original reach, pull and settled airborne hold. Both earlier motion files, the accepted base and all NPC appearance assets remain unchanged. The grapple file has no geometry, materials, textures, skins or external resource links.

`artemis-wallrun.glb` adds **40,540 bytes** containing two original mirrored wall-running cycles on the same rig. It contains animation data and joint references only. The accepted base, all three earlier motion files and NPC appearance assets remain unchanged.

| Action | Actual clip name | Duration | Playback |
| --- | --- | ---: | --- |
| Walk | `BG_Walk` | 1.20 seconds | Loop |
| Run | `BG_Run` | 0.74 seconds | Loop |
| Jump | `BG_Jump` | 0.82 seconds | Once, hold final pose |
| Landing | `BG_Landing` | 0.38 seconds | Once |
| Dash | `BG_Dash` | 0.46 seconds | Once |
| Vault | `BG_Vault` | 0.58 seconds | Phase follows active vault time |
| Glide | `BG_Glide` | 2.40 seconds | Loop while gliding |
| Grapple | `BG_Grapple` | 0.65 seconds | Phase follows launch age, then holds |
| Left wall-run | `BG_WallRun_Left` | 0.64 seconds | Cyclic phase follows cumulative wall time |
| Right wall-run | `BG_WallRun_Right` | 0.64 seconds | Cyclic phase follows cumulative wall time |

The existing `Artemis quiet idle` is reused. Every new clip has fourteen tracks: thirteen bone rotations and a vertical root-bone translation. Authored two-bone inverse kinematics controls the legs, with forward knee bends, planted stance feet, swing-foot clearance, counter-swinging arms and a restrained spine lean. These are stylized original animations, not motion capture or a claim of AAA completion. No external motion library, model-generation API or download was used.

Vault uses a compact asymmetric leg tuck, an advancing lead knee, opposed arm gestures and a deliberate torso lean. Glide uses bent elbows, arms below the shoulder line, a staggered relaxed leg shape and small stable breathing motion. Its first and last poses and sampled boundary velocities agree. Vault has36 keyframes and glide49, including their endpoints. These clips supply the character pose; they do not imply contact-aware hands, cloth simulation or physical wings.

Grapple has40 keyframes and14 tracks. A quick right-hand reach leads into a compact arm/torso pull, opposed supporting arm and staggered legs. The pose settles by0.46 seconds and holds still. It is authored in local forward space; it does not rotate the player toward an anchor or solve a hand to a live target. The existing schematic tether still starts at the player's chest offset, so this is not wrist-to-cable attachment.

Each wall-run cycle has33 keys and14 tracks, with exact repeated endpoints. The wall-side leg lifts and cycles beneath a compact forward bracing gesture; the outside arm and leg counter-stride. The torso leans slightly forward and away from the wall. These are authored in-place poses with mirrored bone rotations. There is no runtime hand/foot contact solver, wall alignment rotation or animation-driven displacement.

## Player factory and controller

```js
import { createPlayerAvatar } from './characters/locomotion-runtime.js';

const { avatar, controller, traversalReady, grappleReady, wallRunReady, dispose } = await createPlayerAvatar({
  name: 'Local Explorer',
  accent: '#d9e7ef',
  shell: '#202b35',
  hair: '#393443',
  height: 1.8,
});
scene.add(avatar);

// Your player controller owns group position, heading, physics and camera.
avatar.position.copy(playerFloorPoint);
avatar.rotation.y = playerHeading;
controller.update(deltaSeconds, {
  speed: measuredHorizontalSpeed,
  grounded: player.grounded,
  verticalVelocity: player.verticalVelocity,
  dashing: player.dashing,
  jumpCount: player.jumps,
  vaultTime: player.vaultTime, // Remaining seconds from the movement simulation.
  gliding: player.gliding,
  grappling: hasFiniteGrappleTarget,
  grappleAge: secondsSinceAcceptedGrappleLaunch,
  wallRunning: player.wallRunning && !player.grounded,
  wallTime: player.wallTime, // Cumulative airborne wall budget, not local playback age.
  wallSide: anatomicalWallSide, // 'left', 'right', or null for an ambiguous direction.
});

// Remove just this player. Shared textures/geometry and god instances survive.
dispose();
```

The factory resolves to `{ avatar, controller, traversalReady, grappleReady, wallRunReady, dispose }`. It reuses the existing cached character template and loads the movement GLB once. The optional traversal, grapple and wall-run requests run independently; a slow or failed download does not delay the existing body or five-action controller. Each readiness promise resolves to a boolean and never rejects. While an optional action is unavailable, existing jump/fall poses continue to present airborne movement. If a request finishes after this player is disposed, it adds no new mixer actions. Later player creation can retry a failed optional request. Missing wall-run clips preserve the already loaded vault/glide/grapple actions; the left/right pair registers only when both required clips exist.

`avatar` is a normal `THREE.Group`: its origin is the **floor point**, forward is **local +Z**, and its height defaults to1.8 metres. The factory has a private skeleton and cloned materials. Geometry and original source textures remain shared. The player is never registered with `updateGodAvatars`, so it does not consume an NPC animation slot or receive competing idle updates. Every part of the player shares its one skeleton.

The controller changes skeletal pose only. It does not write the avatar group's position, yaw, scale, physics or camera. Horizontal root-bone translation is constant. Internal skeleton crouch/bob ranges up to approximately 15.6 cm; authored leg IK compensates for that on planted feet. The game still owns ballistic jump height and dash displacement.

`controller.update(dt, state)` chooses idle below 0.12 m/s, walk up to 3.0 m/s, and run above that. The hub's normal 5.4 m/s movement and 8.4 m/s sprint therefore both use the run clip at different cadences. Walk cadence uses a 1.45 m/s reference and run uses 4.3 m/s, with capped time scales. These are visual approximations, not a physical stride solver.

When `grounded` becomes false, the jump pose starts. Increasing `jumpCount` while already airborne restarts it, covering the second and third air jumps. A falling entry without a new jump starts near the descent pose. Ground contact resets the jump count and triggers landing, holding its recovery for0.24 seconds before returning to idle/walk/run.

The state priority is an active grapple, active airborne vault, dash, active descending glide, active airborne wall-run, ordinary airborne jump/fall, landing, then gait. A fresh air jump interrupts glide or wall-run for that observed update. Grounded frames ignore stale vault/glide/wall-run flags. Vault time is bounded to0–0.58 seconds and its pose is sampled from the remaining time, including after a late asset load or return from first person. A new increasing vault timer restarts the action. Releasing glide or wall-run selects the existing descent pose and actual ground contact selects landing. Gameplay continues to own all movement flags, capabilities, collision and vertical velocity; these presentation inputs are not authorization.

Grapple has final priority because the existing movement simulation applies its target-based velocity last. The adapter passes only a finite-target boolean and a scalar age. Successful launch sets the existing cooldown to2.8 seconds, so age is derived from2.8 minus current cooldown while a target exists. Cooldown continues after release and is never an active-state signal by itself. Age is finite and bounded; malformed cooldown or missing/invalid age selects a settled phase rather than a fresh reach. The controller receives no target object or anchor coordinates.

The grapple action is sampled directly at current age and held after its last frame. A late download, paused frame or return from first person therefore cannot replay old anticipation. Release selects the current fall, fresh jump, glide, vault, dash or ground recovery immediately through a short blend, without waiting for the clip to end. Very short pulls may finish before the full reach is visible. If the asset is missing, a sampled existing airborne pose supplies the fallback and resumes ordinary playback after release.

The existing movement simulation accumulates `wallTime` within a1.25-second airborne budget and resets it on ground contact. Wall-run clips sample `wallTime % clip.duration` directly, with their actions paused so mixer time cannot add a second clock. This preserves the current cycle through late asset loading, hidden views, pause and repeated side changes. Only finite nonnegative times up to1.35 seconds are accepted; that small presentation tolerance includes the existing final physics tick that can cross the1.25-second check. It does not extend the physics budget. Missing or malformed side/time data uses the earlier airborne pose.

Movement adds only `wallDirectionX` and `wallDirectionZ`: a unit world direction toward the successful existing side probe, cleared each tick and on reset. The original plus probe still short-circuits the minus probe. The adapter projects that direction against the currently rendered heading, which follows actual horizontal displacement, including strafing. The accepted rig faces local +Z and its anatomical left bones occupy positive local X. A projection magnitude below0.35 is treated as ambiguous, as are nonfinite or near-zero direction vectors. The controller receives only the active boolean, cumulative time and anatomical side; it receives no wall coordinates or collision objects. Same-tick ground contact can leave the simulation's wall flag set, so both the adapter and controller explicitly require airborne state.

`controller.setAction(key, { fade, restart })` provides an explicit event hook for an available action. The next ordinary `update` still applies the supplied gameplay state. `controller.getState()` reports the current action, actual clip name, animation time, action elapsed time, air-jump count, traversal/grapple/wall-run availability, blend weights and disposal state. Call `dispose()` on the returned player object when removing it; `controller.dispose()` alone releases only animation bindings.

Blend weights are normalized to total influence1. Each transition starts from the current blended weights and stops obsolete actions when its short fade ends. Rapid interruptions remain continuous and bounded by the eleven named actions; they do not add independent fading influences. No scheduled Three fades or warps are left behind. This explicitly handles interrupted actions, since Three's completed-loop clamping does not handle interruption cleanup. See the primary [AnimationAction documentation](https://threejs.org/docs/pages/AnimationAction.html) and [Animation System overview](https://threejs.org/manual/en/animation-system.html).

Paused frames should skip updates, or pass `paused: true`; both preserve pose/state. Delta is bounded to0–0.1 seconds. `reset: true` selects the current gameplay pose immediately and discards old blend history. The player adapter supplies reset on travel and first/full-body re-entry, preventing an old midair pose from reappearing after teleport. Ordinary shoulder changes preserve the current pose. Reduced-motion presentation can suppress idle drift while retaining movement feedback; the camera/presentation adapter owns that preference.

## Cost, verification and limits

The earlier movement download is61,472 bytes; vault/glide adds44,704 bytes, grapple adds31,328 bytes and wall-run adds40,540 bytes. These add no model vertices, textures or draw calls. Showing one third-person player adds one rendering instance of the accepted35,460-triangle, fourteen-part model, one163-bone skeleton and private materials. Source geometry/textures stay shared with the gods. A motion clip evaluates fourteen tracks. Ordinary transitions briefly evaluate two clips; rapid repeated interruptions can temporarily involve more of the eleven fixed actions, with one normalized influence budget and complete cleanup after the final fade.

`build_locomotion.py` independently authors the poses against the immutable accepted joint hierarchy. It refuses to run if the accepted character hash has changed. It records clip durations, keyframe counts, original authorship, zero download bytes and the source rig hash in `LOCOMOTION-BUILD-RECEIPT.json`.

`verify_locomotion.py` checks the animation-only GLB structure, finite normalized quaternions, matching loop boundaries, bounded adjacent pose changes, constant horizontal root motion and exact preservation of the accepted character. `verify-locomotion-runtime.mjs` uses the actual pinned Three.js loader and mixer against the accepted model, checks authored poses and interpolation midpoints, finite skinned geometry, ankle targets and planted heel height, state transitions, repeated air jumps, independent player materials/skeleton, shared geometry/textures, NPC isolation and cleanup. Its Node texture decoder is a stand-in; final visual acceptance is a separate browser review.

`build_traversal.py` authors only the two additional clips and refuses to run unless both immutable GLB hashes agree. `verify_traversal.py` checks structure, rotations, loop continuity and immutable base/equipment/hair bytes. `verify-traversal-runtime.mjs` applies all traversal keys and interpolation midpoints through the actual pinned Three loader/mixer, checks anatomical silhouette and skinned bounds, interrupted blends, phase/restart/priority, falling/landing, all three jumps, pause/reset, resource isolation, delayed/failed optional loads and actual player presentation through view changes and detached scenes. Private receipts record the measured samples and results. Node image decoding is stubbed; browser inspection remains separate.

`build_grapple.py` writes only the new grapple asset after checking all three immutable base/motion hashes. `verify_grapple.py` checks its structure, normalized rotations, bounded adjacent motion, fixed horizontal root and exact settled hold. `verify-grapple-runtime.mjs` uses the actual pinned loader/mixer, measures effective action weights and compares post-interruption poses with independent single-clip references. It also checks every key and midpoint, pose bounds, short/repeated pulls, priority, malformed ages, pause/reset, optional loading/failure, player/NPC ownership and the actual adapter through view/travel/detached-scene changes. These are procedural and runtime checks, not an exhaustive collision proof or physical Android playthrough.

`build_wallrun.py` checks all four protected base/motion hashes and writes only the new wall-run GLB. `verify_wallrun.py` checks its animation-only structure, finite normalized rotations, exact mirrored tracks and loop endpoints, bounded seam changes and fixed horizontal root. `verify-wallrun-runtime.mjs` uses actual pinned Three loader/mixer actions and the real player adapter. It samples both clips and interpolated poses, bounds skinned geometry and anatomy, compares phases and final gait poses with independent single-clip references, inspects actual effective weights, and covers malformed states, priority, repeated sides, pause/reset, optional failure/incomplete pairs/retry, disposal, NPC isolation, and cardinal/yawed/strafe direction mapping.

The private wall-surface receipt records every vertex in sampled cycles and blends at the actual1.8 m player size. It also measures real movement and rendered heading against explicit flat-wall paths. These checks distinguish the current pose from incoming accepted run/fall/glide extents and transient blend overshoot. They are finite fixture evidence, not a wall-collision guarantee. Authored limb motion and a fixed collision capsule remain separate, and the clearance evidence does not cover arbitrary corners, wall angles or larger custom avatar heights.

The accepted numeric candidate covers66 authored keys,64 midpoints,377,830 sampled skinned vertices for pose/blend bounds, and110 interrupted blend frames. Its separate surface check measures every vertex at220 cycle/blend poses and1,374 active-wall frames across ten actual movement paths. At1.8 m height, the complete sampled cycles extend at most0.24515 m toward a tangential wall. The full digital strafe fixtures retain minimum clearances of2.00 cm and2.62 cm on the two walls while the rendered heading settles; partial strafe, straight/contact-straight and steering-away cases also pass. The largest sampled entry-blend overshoot above the unblended prior/target motion is1.71 cm. An incoming accepted glide/run/fall can still extend outside the capsule while fading, so these numbers do not promise contact-safe arbitrary transitions.

This local-player increment has no terrain-aware foot placement, collision-aware hand placement, facial performance, secondary player hair motion, motion matching or a full superpower transition set. The existing collision capsule does not guarantee clearance for extended hands or other posed limbs. Vault, grapple and wall-run are in-place stylized poses, not obstacle-specific contact solvers. The grapple has no target-facing pitch solver or wrist-bound cable. The camera and world movement system remain separate. The existing source/rig licenses and model limitations remain in [PROVENANCE.md](./PROVENANCE.md).

The only new public asset for this wall-run increment is `characters/artemis-wallrun.glb`, alongside the existing controller, side-projection helper and three adapter inputs, two presentation-only Movement metadata fields, and this documentation. All earlier motion assets remain unchanged. Build scripts, tests, contact samples and internal verification receipts remain private.


### Forearm deformation during captured gaits

The local player distributes longitudinal wrist twist over the two existing
forearm bones after gait mixing. A compensating wrist rotation preserves the
animated palm, fingers and joint positions. The correction follows the actual
combined gait weight and restores its owned rotations before mixer updates and
action activation, so interrupted fades do not store modified binding poses.
Pause holds the pose; disposal restores it. Bent or unsupported middle-bone
chains are left alone. NPC controllers and shared geometry are unchanged.

This is a small skin-and-sleeve deformation improvement. It does not replace
the three captured cycles, change palm posing, add starts/stops/pivots or solve
cloth/strand collisions. Original geometry, image and motion assets are retained.
