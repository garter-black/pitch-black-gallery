import * as THREE from './vendor/three.module.min.js';
import {floorHeightAt} from './movement.js';

// Local presentation only: no input, movement mutation, identity or presence API.
// Camera boom/shoulder model follows the same separation of pivot, shoulder and
// collision radius described by Unity's Third Person Follow documentation.
// https://docs.unity3d.com/Packages/com.unity.cinemachine@3.1/manual/CinemachineThirdPersonFollow.html
const TAU = Math.PI * 2;
const SHOULDER_SECONDS = 0.18, CAMERA_CLEARANCE = 0.235;
const BOX_AXES = [['x', 'minX', 'maxX'], ['y', 'minY', 'maxY'], ['z', 'minZ', 'maxZ']];
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const finitePosition = value => value && ['x', 'y', 'z'].every(axis => Number.isFinite(value[axis]));
const wrap = angle => ((angle + Math.PI) % TAU + TAU) % TAU - Math.PI;
const damping = (rate, dt) => 1 - Math.exp(-rate * dt);

export const PLAYER_PALETTE = Object.freeze({
  name: 'Local Explorer', accent: '#d9e7ef', shell: '#202b35', hair: '#393443', height: 1.8,
});

/** Anatomical side of the wall relative to the currently rendered +Z-facing rig. */
export function wallSideForHeading(worldX, worldZ, heading) {
  if (![worldX, worldZ, heading].every(Number.isFinite)) return null;
  const length = Math.hypot(worldX, worldZ);
  if (!Number.isFinite(length) || length < 1e-6) return null;
  const localX = Math.cos(heading) * (worldX / length) - Math.sin(heading) * (worldZ / length);
  if (Math.abs(localX) < 0.35) return null; // A near-front/back wall is not a safe side guess.
  return localX > 0 ? 'left' : 'right'; // Accepted skeleton's L bones have positive local X.
}

function boxEntry(start, delta, box, padding) {
  let entry = 0, exit = 1;
  for (const [axis, low, high] of BOX_AXES) {
    const min = box[low] - padding, max = box[high] + padding;
    if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) return Infinity;
    if (Math.abs(delta[axis]) < 1e-10) {
      // A sweep along a clearance surface is safe; treating it as an overlap
      // would trap a camera that is trying to slide away from a clipped boom.
      if (start[axis] <= min + 1e-9 || start[axis] >= max - 1e-9) return Infinity;
    } else {
      let near = (min - start[axis]) / delta[axis], far = (max - start[axis]) / delta[axis];
      if (near > far) { const swap = near; near = far; far = swap; }
      entry = Math.max(entry, near); exit = Math.min(exit, far);
      if (entry > exit) return Infinity;
    }
  }
  return exit <= 1e-9 ? Infinity : entry;
}

const cameraHit = () => ({ position: new THREE.Vector3(), distance: 0, collided: false, fraction: 1, box: null });
function clipCameraBoomInto(pivot, desired, obstacles, padding, result) {
  const dx = desired.x - pivot.x, dy = desired.y - pivot.y, dz = desired.z - pivot.z;
  const delta = result.position.set(dx, dy, dz);
  let fraction = 1;
  const minX=Math.min(pivot.x,desired.x)-padding,maxX=Math.max(pivot.x,desired.x)+padding;
  const minY=Math.min(pivot.y,desired.y)-padding,maxY=Math.max(pivot.y,desired.y)+padding;
  const minZ=Math.min(pivot.z,desired.z)-padding,maxZ=Math.max(pivot.z,desired.z)+padding;
  result.box = null;
  for (const box of obstacles) {
    // Conservative segment bounds reject distant colliders before the exact
    // slab sweep. Equality stays in the narrow phase, preserving grazing hits.
    if(box.maxX<minX || box.minX>maxX || box.maxY<minY || box.minY>maxY || box.maxZ<minZ || box.minZ>maxZ)continue;
    const entry = boxEntry(pivot, delta, box, padding);
    if (entry < fraction) { fraction = entry; result.box = box; }
  }
  result.position.set(pivot.x + dx * fraction, pivot.y + dy * fraction, pivot.z + dz * fraction);
  result.distance = Math.hypot(dx, dy, dz) * fraction;
  result.collided = fraction < 1; result.fraction = fraction;
  return result;
}

function distanceToExpandedBox(point, box, padding) {
  return Math.hypot(Math.max(box.minX - padding - point.x, 0, point.x - box.maxX - padding),
    Math.max(box.minY - padding - point.y, 0, point.y - box.maxY - padding),
    Math.max(box.minZ - padding - point.z, 0, point.z - box.maxZ - padding));
}

/** Clip a camera-sized boom against expanded AABBs, including thin walls. */
export function clipCameraBoom(pivot, desired, obstacles = [], { radius = 0.20, margin = 0.035 } = {}) {
  if (!finitePosition(pivot) || !finitePosition(desired)) throw new TypeError('Camera endpoints must be finite vectors');
  if (!Number.isFinite(radius) || radius < 0 || radius > 1 || !Number.isFinite(margin) || margin < 0 || margin > 0.5) throw new RangeError('Invalid camera clearance');
  const result = clipCameraBoomInto(pivot, desired, obstacles, radius + margin, cameraHit());
  return { position: result.position, distance: result.distance, collided: result.collided, fraction: result.fraction };
}

/** Nearest floor/table surface below the feet, never the jumping player's Y. */
export function groundHeightBelow(player, floors = [], obstacles = []) {
  let height = -Infinity;
  for (const floor of floors) {
    const surface=floorHeightAt(floor,player.x,player.z);
    if (Number.isFinite(surface) && surface <= player.y + 0.08 && player.x >= floor.minX && player.x <= floor.maxX
        && player.z >= floor.minZ && player.z <= floor.maxZ) height = Math.max(height, surface);
  }
  for (const box of obstacles) {
    if (Number.isFinite(box.maxY) && box.maxY <= player.y + 0.08 && player.x >= box.minX && player.x <= box.maxX
        && player.z >= box.minZ && player.z <= box.maxZ) height = Math.max(height, box.maxY);
  }
  return Number.isFinite(height) ? height : null;
}

function makeContactShadow() {
  const size = 32, pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const radius = Math.hypot((x + 0.5 - size / 2) / (size / 2), (y + 0.5 - size / 2) / (size / 2));
    pixels[(y * size + x) * 4 + 3] = Math.round(Math.pow(Math.max(0, 1 - radius), 1.8) * 255);
  }
  const map = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  map.minFilter = THREE.LinearFilter; map.magFilter = THREE.LinearFilter; map.generateMipmaps = false; map.needsUpdate = true;
  const material = new THREE.MeshBasicMaterial({ map, color: '#080b0e', transparent: true, depthWrite: false, opacity: 0.4 });
  const geometry = new THREE.PlaneGeometry(1.7, 1.25);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'Local player contact shadow'; mesh.rotation.x = -Math.PI / 2; mesh.visible = false;
  return { mesh, dispose() { geometry.dispose(); material.dispose(); map.dispose(); } };
}

async function defaultAvatarFactory(options) {
  const { createPlayerAvatar } = await import('./characters/locomotion-runtime.js');
  return createPlayerAvatar(options);
}

/**
 * Root integration:
 *   const view = createPlayerPresentation({scene,camera,onError});
 *   view.update(dt,{player,yaw,pitch,started,paused,reducedMotion});
 * Call after baseline first-person camera placement, before aiming/interaction.
 * Call reset() after teleports. Only this module's localPlayer root is attached.
 * shoulder / setShoulder(side) / toggleShoulder() select a camera side only.
 * The selected side survives first person and loading; clear switches take 0.18s.
 * ready resolves false on load failure/disposal; it never rejects unobserved.
 */
export function createPlayerPresentation({ scene, camera, onError = () => {}, avatarFactory = defaultAvatarFactory } = {}) {
  if (!scene?.isObject3D || !camera?.isCamera) throw new TypeError('A Three scene and camera are required');
  const root = new THREE.Group(); root.name = 'Local player presentation'; root.userData.localPlayer = true; root.visible = false;
  const shadow = makeContactShadow(); root.add(shadow.mesh);
  let model = null, disposed = false, status = 'loading', mode = 'third-person', effectiveMode = 'first-person';
  let shoulder = 1, needsSnap = true, cameraInitialized = false, playerInitialized = false;
  let displayedShoulder = 1, shoulderFrom = 1, shoulderElapsed = SHOULDER_SECONDS;
  let shoulderSweep = false, detourRadius = Infinity;
  let previousObstacles = null, previousFloors = null, heading = 0;
  const previousPlayer = new THREE.Vector3(), follow = new THREE.Vector3(), pivot = new THREE.Vector3();
  const desired = new THREE.Vector3(), target = new THREE.Vector3(), direction = new THREE.Vector3(), candidate = new THREE.Vector3();
  const detourTarget = new THREE.Vector3();
  const goalHit = cameraHit(), boomHit = cameraHit(), pathHit = cameraHit(), routeHit = cameraHit();
  let cameraObstructed = false;

  const ready = Promise.resolve().then(() => avatarFactory({ ...PLAYER_PALETTE, castShadow: false })).then(value => {
    if (!value?.avatar?.isObject3D || typeof value.controller?.update !== 'function' || typeof value.dispose !== 'function') {
      value?.dispose?.(); throw new TypeError('Player character factory returned an invalid instance');
    }
    if (disposed) { value.dispose(); return false; }
    model = value; root.add(model.avatar); status = 'ready'; needsSnap = true;
    return true;
  }).catch(error => {
    if (!disposed) { status = 'error'; root.visible = false; try { onError(error); } catch { /* Presentation stays in first person. */ } }
    return false;
  });

  function reset() { needsSnap = true; cameraInitialized = false; playerInitialized = false; }
  function setMode(value) {
    if (value !== 'first-person' && value !== 'third-person') throw new RangeError('Unknown player view');
    if (mode !== value) { mode = value; reset(); root.visible = false; }
    return mode;
  }
  function setShoulder(value) {
    if (value !== 'left' && value !== 'right') throw new RangeError('Unknown camera shoulder');
    const next = value === 'left' ? -1 : 1;
    if (shoulder !== next) {
      shoulder = next; shoulderFrom = displayedShoulder; shoulderElapsed = 0; shoulderSweep = true;
    }
    return value; // Idempotent: do not restart a switch or reset player history.
  }

  function update(deltaSeconds, { player, yaw = 0, pitch = 0, started = false, paused = false, reducedMotion = false } = {}) {
    if (disposed) return;
    if (!finitePosition(player) || !Number.isFinite(yaw) || !Number.isFinite(pitch)) {
      root.visible = false; effectiveMode = 'first-person'; return;
    }
    const dt = clamp(Number(deltaSeconds) || 0, 0, 0.1);
    const obstacles = Array.isArray(player.obstacles) ? player.obstacles : [];
    const floors = Array.isArray(player.floors) ? player.floors : [];
    if (obstacles !== previousObstacles || floors !== previousFloors) {
      previousObstacles = obstacles; previousFloors = floors;
      needsSnap = true;
    }
    // Read current objects, including in-place collider edits. Detached rooms
    // omit floor slabs from movement obstacles, so supply thin camera slabs.
    const colliders = [...obstacles, ...floors.flatMap(floor => {
      if(!floor.ramp)return [{ minX: floor.minX, maxX: floor.maxX, minZ: floor.minZ, maxZ: floor.maxZ, minY: floor.y - 0.25, maxY: floor.y }];
      const alongX=!!floor.slopeX,span=alongX?floor.maxX-floor.minX:floor.maxZ-floor.minZ,count=Math.ceil(span/.3),boxes=[];
      for(let i=0;i<count;i++){
        const b={minX:floor.minX,maxX:floor.maxX,minZ:floor.minZ,maxZ:floor.maxZ};
        if(alongX){b.minX+=span*i/count;b.maxX=floor.minX+span*(i+1)/count;}else{b.minZ+=span*i/count;b.maxZ=floor.minZ+span*(i+1)/count;}
        const a=floorHeightAt(floor,b.minX,b.minZ),z=floorHeightAt(floor,b.maxX,b.maxZ);b.minY=Math.min(a,z)-.15;b.maxY=Math.max(a,z);boxes.push(b);
      }return boxes;
    })];
    const dx = playerInitialized ? player.x - previousPlayer.x : 0;
    const dz = playerInitialized ? player.z - previousPlayer.z : 0;
    if (playerInitialized && Math.hypot(dx, player.y - previousPlayer.y, dz) > 6) needsSnap = true;
    const snap = needsSnap || !playerInitialized;
    const speed = !snap && !paused && dt > 0 ? clamp(Math.hypot(dx, dz) / dt, 0, 45) : 0;
    if (snap) heading = wrap(yaw + Math.PI); // Accepted model faces local +Z.
    else if (speed > 0.12) {
      const nextHeading = Math.atan2(dx, dz);
      heading += wrap(nextHeading - heading) * (reducedMotion ? 1 : damping(18, dt));
    }
    previousPlayer.set(player.x, player.y, player.z); playerInitialized = true;
    root.position.copy(previousPlayer); root.rotation.y = heading;

    if (!started || status !== 'ready' || mode === 'first-person') {
      root.visible = false; effectiveMode = 'first-person'; cameraInitialized = false; needsSnap = true;
      return; // Preserve the caller's exact baseline camera, including welcome.
    }
    // Scene changes remove public children. Reattach only this local player root,
    // never a god group, shared visitor mesh or saved public-world container.
    if (root.parent !== scene) { scene.add(root); needsSnap = true; }
    root.visible = true;
    if (!paused) {
      try {
        // Locomotion is meaningful motion; reduced motion removes idle drift
        // and camera inertia while keeping walk/jump feedback readable.
        const animationDelta = reducedMotion && speed < 0.12 && player.grounded === true ? 0 : dt;
        model.controller.update(animationDelta, { speed, grounded: player.grounded === true,
          verticalVelocity: Number(player.velocityY) || 0, dashing: Number(player.dashTime) > 0,
          jumpCount: Number.isSafeInteger(player.jumps) ? player.jumps : 0,
          vaultTime: Number.isFinite(player.vaultTime) ? player.vaultTime : 0,
          gliding: player.gliding === true, reset: snap, reducedMotion,
          grappling: Boolean(finitePosition(player.grappleTarget)),
          grappleAge: Number.isFinite(player.grappleCooldown) && player.grappleCooldown >= 0 && player.grappleCooldown <= 2.8 ? 2.8 - player.grappleCooldown : 2.8,
          wallRunning: player.wallRunning === true && player.grounded !== true,
          wallTime: Number.isFinite(player.wallTime) ? player.wallTime : null,
          wallSide: wallSideForHeading(player.wallDirectionX, player.wallDirectionZ, heading) });
      } catch (error) {
        root.visible = false; effectiveMode = 'first-person'; status = 'error';
        try { model.dispose(); } catch { /* Keep the world usable after a pose failure. */ }
        model = null;
        try { onError(error); } catch { /* First person remains available. */ }
        return;
      }
    }

    const floorY = groundHeightBelow(player, floors, obstacles);
    const aboveFloor = floorY === null ? Infinity : Math.max(0, player.y - floorY);
    shadow.mesh.visible = floorY !== null && aboveFloor < 7;
    if (shadow.mesh.visible) {
      shadow.mesh.position.y = floorY - player.y + 0.018;
      const spread = 1 + Math.min(aboveFloor, 4) * 0.16;
      shadow.mesh.scale.set(spread, spread, 1);
      shadow.mesh.material.opacity = 0.42 * Math.exp(-aboveFloor / 1.8);
    }

    const viewPitch = clamp(pitch, -1.35, 1.35), viewYaw = wrap(yaw);
    const snapCamera = needsSnap || !cameraInitialized || reducedMotion;
    const priorShoulder = displayedShoulder;
    if (snapCamera) {
      displayedShoulder = shoulder; shoulderElapsed = SHOULDER_SECONDS; shoulderSweep = false; detourRadius = Infinity;
    } else {
      shoulderElapsed = Math.min(SHOULDER_SECONDS, shoulderElapsed + dt);
      const progress = shoulderElapsed / SHOULDER_SECONDS, eased = progress * progress * (3 - 2 * progress);
      displayedShoulder = shoulderFrom + (shoulder - shoulderFrom) * eased;
    }
    direction.set(-Math.sin(viewYaw) * Math.cos(viewPitch), Math.sin(viewPitch), -Math.cos(viewYaw) * Math.cos(viewPitch));
    pivot.set(player.x, player.y + 1.35, player.z);
    desired.copy(pivot).addScaledVector(direction, -3.65);
    desired.x += Math.cos(viewYaw) * 0.62 * displayedShoulder;
    desired.z -= Math.sin(viewYaw) * 0.62 * displayedShoulder;
    desired.y += 0.65;
    const clipped = clipCameraBoomInto(pivot, desired, colliders, CAMERA_CLEARANCE, goalHit);
    cameraObstructed = clipped.collided;
    if (snapCamera) follow.copy(clipped.position);
    else {
      // Immediately retract an old boom occluded by movement/in-place geometry
      // edits. A newly blocked viewpoint must not stay beyond the obstruction.
      clipCameraBoomInto(pivot, follow, colliders, CAMERA_CLEARANCE, boomHit);
      if (boomHit.collided) { follow.copy(boomHit.position); cameraObstructed = true; }
      if (Number.isFinite(detourRadius) && !clipCameraBoomInto(follow, clipped.position, colliders, CAMERA_CLEARANCE, pathHit).collided) detourRadius = Infinity;
      if (Number.isFinite(detourRadius)) {
        detourTarget.copy(clipped.position).sub(pivot).clampLength(0, detourRadius).add(pivot);
        candidate.copy(follow).lerp(detourTarget, damping(15, dt));
      } else {
        // Apply the finite shoulder curve before ordinary follow damping, so a
        // stationary clear-space switch finishes on time without double easing.
        const lateral = (displayedShoulder - priorShoulder) * 0.62;
        candidate.copy(follow); candidate.x += Math.cos(viewYaw) * lateral; candidate.z -= Math.sin(viewYaw) * lateral;
        candidate.lerp(clipped.position, damping(15, dt));
      }
      clipCameraBoomInto(pivot, candidate, colliders, CAMERA_CLEARANCE, boomHit);
      if (shoulderSweep && clipCameraBoomInto(follow, boomHit.position, colliders, CAMERA_CLEARANCE, pathHit).collided) {
        // Clear endpoints can straddle a thin divider. Retract along the current
        // clear boom, then cross at a radius in front of the blocking box before
        // extending. Keeping the temporary radius prevents an oscillating retry.
        detourRadius = Math.min(detourRadius, Math.max(0, distanceToExpandedBox(pivot, pathHit.box, CAMERA_CLEARANCE) - 0.04));
        detourTarget.copy(follow).sub(pivot).clampLength(0, detourRadius).add(pivot);
        clipCameraBoomInto(follow, detourTarget, colliders, CAMERA_CLEARANCE, routeHit);
        follow.copy(routeHit.position); cameraObstructed = true;
      } else follow.copy(boomHit.position);
      if (shoulderSweep && shoulderElapsed === SHOULDER_SECONDS && !Number.isFinite(detourRadius)
          && !clipCameraBoomInto(follow, clipped.position, colliders, CAMERA_CLEARANCE, pathHit).collided) shoulderSweep = false;
      cameraObstructed ||= Number.isFinite(detourRadius);
    }
    // Collision scratch results must not retain a detached room's box objects.
    goalHit.box = boomHit.box = pathHit.box = routeHit.box = null;
    const separation = follow.distanceTo(pivot);
    if (separation < 0.8) {
      root.visible = false; effectiveMode = 'first-person';
      camera.position.set(player.x, player.y + 1.72, player.z);
      camera.rotation.set(pitch, yaw, 0, 'YXZ');
    } else {
      effectiveMode = 'third-person';
      target.set(player.x, player.y + 1.25, player.z).addScaledVector(direction, 6);
      camera.position.copy(follow); camera.lookAt(target);
      // Avoid showing the inside of the model when the boom retracts tightly.
      model.avatar.visible = separation > 1.05;
    }
    camera.updateMatrixWorld(); cameraInitialized = true; needsSnap = false;
  }

  function dispose() {
    if (disposed) return;
    disposed = true; status = 'disposed'; root.visible = false; root.removeFromParent();
    model?.dispose(); model = null; shadow.dispose();
    // Geometry/textures from the accepted GLTF are shared. Never traverse and
    // dispose them here; the character factory owns only its private resources.
  }

  return { ready, update, reset, setMode, toggleMode: () => setMode(mode === 'third-person' ? 'first-person' : 'third-person'),
    setShoulder, toggleShoulder: () => setShoulder(shoulder === 1 ? 'left' : 'right'), get shoulder() { return shoulder === 1 ? 'right' : 'left'; },
    dispose, get mode() { return mode; }, get effectiveMode() { return effectiveMode; },
    get status() { return status; }, get cameraObstructed() { return cameraObstructed; } };
}
