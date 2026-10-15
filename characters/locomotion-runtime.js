import { createForearmTwist } from './god-forearm-twist.js';
import * as THREE from '../vendor/three.module.min.js';
import { GLTFLoader } from '../vendor/addons/loaders/GLTFLoader.js';
import { clone } from '../vendor/addons/utils/SkeletonUtils.js';
import { preloadGodCharacters, CHARACTER_VARIANTS } from './character-runtime.js';
import { preloadGodIdentities, applyGodIdentity } from './god-identities.js';
import { preloadGodWardrobe, applyGodWardrobe } from './god-wardrobe.js';

export const LOCOMOTION_CLIPS = Object.freeze({
  idle: 'Artemis quiet idle',
  walk: 'BG_Walk_Captured',
  run: 'BG_Jog_Captured',
  sprint: 'BG_Run_Captured',
  jump: 'BG_Jump',
  landing: 'BG_Landing',
  dash: 'BG_Dash',
  vault: 'BG_Vault',
  glide: 'BG_Glide',
  grapple: 'BG_Grapple',
  wallLeft: 'BG_WallRun_Left',
  wallRight: 'BG_WallRun_Right',
});
let motionPromise;
let traversalPromise;
let grapplePromise;
let wallRunPromise;
const TRAVERSAL_KEYS = ['vault', 'glide'];
const WALL_RUN_KEYS = ['wallLeft', 'wallRight'];
const VAULT_SECONDS = 0.58;
const GRAPPLE_SECONDS = 0.65;

export function preloadLocomotion() {
  if (!motionPromise) {
    motionPromise = Promise.all(['artemis-locomotion.glb', 'god-locomotion-captured.glb'].map(file => new GLTFLoader().loadAsync(new URL(file, import.meta.url).href))).then(assets => assets.flatMap(gltf => gltf.animations)).catch(error => {
      motionPromise = undefined;
      throw error;
    });
  }
  return motionPromise;
}

/** Optional presentation asset. A missing file never rejects the base player. */
export function preloadTraversal() {
  if (!traversalPromise) {
    traversalPromise = new GLTFLoader().loadAsync(new URL('./artemis-traversal.glb', import.meta.url).href).then(gltf => {
      if (!TRAVERSAL_KEYS.every(key => gltf.animations.some(clip => clip.name === LOCOMOTION_CLIPS[key]))) {
        throw new Error('Incomplete optional traversal animation set');
      }
      return gltf.animations;
    }).catch(() => {
      traversalPromise = undefined;
      return []; // Existing jump/fall poses continue to present traversal.
    });
  }
  return traversalPromise;
}

/** Independently optional; a failed grapple download leaves earlier poses usable. */
export function preloadGrapple() {
  if (!grapplePromise) {
    grapplePromise = new GLTFLoader().loadAsync(new URL('./artemis-grapple.glb', import.meta.url).href).then(gltf => {
      if (!gltf.animations.some(clip => clip.name === LOCOMOTION_CLIPS.grapple)) throw new Error('Missing optional grapple clip');
      return gltf.animations;
    }).catch(() => { grapplePromise = undefined; return []; });
  }
  return grapplePromise;
}

export function preloadWallRun() {
  if (!wallRunPromise) {
    wallRunPromise = new GLTFLoader().loadAsync(new URL('./artemis-wallrun.glb', import.meta.url).href).then(gltf => {
      if (!WALL_RUN_KEYS.every(key => gltf.animations.some(clip => clip.name === LOCOMOTION_CLIPS[key]))) throw new Error('Incomplete optional wall-run clips');
      return gltf.animations;
    }).catch(() => { wallRunPromise = undefined; return []; });
  }
  return wallRunPromise;
}

function createController(model, clips, heightScale = 1, updateHair = () => {}) {
  const armTwist = createForearmTwist(model);
  const mixer = new THREE.AnimationMixer(model);
  const actions = new Map();
  const weights = new Map();
  const loops = new Set(['idle', 'walk', 'run', 'sprint', 'glide', ...WALL_RUN_KEYS]);
  function addAction(key, clip) {
    const action = mixer.clipAction(clip);
    action.setLoop(loops.has(key) ? THREE.LoopRepeat : THREE.LoopOnce, loops.has(key) ? Infinity : 1);
    action.clampWhenFinished = !loops.has(key);
    action.setEffectiveWeight(0);
    actions.set(key, action);
    weights.set(key, 0);
  }
  for (const [key, clipName] of Object.entries(LOCOMOTION_CLIPS)) {
    if (TRAVERSAL_KEYS.includes(key) || key === 'grapple' || WALL_RUN_KEYS.includes(key)) continue;
    const clip = clips.find(candidate => candidate.name === clipName);
    if (!clip) throw new Error(`Missing player animation ${clipName}`);
    addAction(key, clip);
  }
  let current = 'idle';
  let elapsed = 0;
  let lastGrounded = true;
  let lastJumpCount = 0;
  let lastVaultRemaining = 0;
  let lastGrappling = false;
  let lastGrappleAge = 0;
  let transition = null;
  let disposed = false;
  weights.set('idle', 1);
  actions.get('idle').setEffectiveWeight(1).play();
  mixer.update(0);
  updateHair(0,{reset:true});

  function setAction(key, { fade = 0.18, restart = false, immediate = false } = {}) {
    if (!actions.has(key)) throw new RangeError(`Unknown movement action: ${key}`);
    if (disposed || (current === key && !restart && !immediate)) return;
    armTwist.restore();
    const next = actions.get(key);
    // Own weights explicitly. Repeated interrupted Three crossFadeTo calls can
    // otherwise leave completed/clamped actions contributing to later poses.
    for (const action of actions.values()) action.stopFading().stopWarping();
    const duration = immediate ? 0 : Math.max(0, Math.min(0.5, Number(fade) || 0));
    const from = new Map(weights);
    const running = ['walk', 'run', 'sprint'];
    // A brief idle interruption can leave a gait fading underneath it. Keep
    // that stride on restart instead of snapping its contributing leg pose.
    const previousGait = running.includes(current) ? current : running
      .filter(name => weights.get(name) > 0).sort((a, b) => weights.get(b) - weights.get(a))[0];
    const previous = actions.get(previousGait);
    const gaitPhase = !immediate && !restart && key !== current && running.includes(key) && previous ? previous.time / previous.getClip().duration : 0;
    const idleTime = !immediate && !restart && key === 'idle' && from.get('idle') > 0 ? next.time : 0;
    next.reset().setEffectiveTimeScale(1).setEffectiveWeight(from.get(key) || 0).play();
    if (gaitPhase) next.time = gaitPhase * next.getClip().duration;
    else if (idleTime) next.time = idleTime;
    current = key;
    elapsed = 0;
    transition = { from, duration, elapsed: 0 };
    applyBlend(0);
  }

  function applyBlend(delta) {
    if (!transition) return;
    transition.elapsed += delta;
    const t = transition.duration ? Math.min(1, transition.elapsed / transition.duration) : 1;
    const eased = t * t * (3 - 2 * t);
    for (const [key, action] of actions) {
      const weight = (transition.from.get(key) || 0) * (1 - eased) + (key === current ? eased : 0);
      weights.set(key, weight);
      if (t === 1 && key !== current) action.stop();
      action.setEffectiveWeight(weight);
    }
    if (t === 1) transition = null;
  }

  function synchronizeGaits() {
    if (!['walk', 'run', 'sprint'].includes(current)) return;
    const reference = actions.get(current), duration = reference.getClip().duration;
    const phase = reference.time / duration, cyclesPerSecond = reference.getEffectiveTimeScale() / duration;
    for (const key of ['walk', 'run', 'sprint']) {
      if (key === current || !(weights.get(key) > 0)) continue;
      const action = actions.get(key), seconds = action.getClip().duration;
      // Share normalized stride time for the entire fade, including wrap.
      // Matching only the initial phase lets different clip lengths drift.
      action.time = phase * seconds;
      action.setEffectiveTimeScale(cyclesPerSecond * seconds);
    }
  }

  return {
    clipNames: LOCOMOTION_CLIPS,
    setAction,
    addTraversal(optionalClips) {
      if (disposed || !TRAVERSAL_KEYS.every(key => optionalClips.some(clip => clip.name === LOCOMOTION_CLIPS[key]))) return false;
      for (const key of TRAVERSAL_KEYS) {
        if (!actions.has(key)) addAction(key, optionalClips.find(clip => clip.name === LOCOMOTION_CLIPS[key]));
      }
      return true;
    },
    addGrapple(optionalClips) {
      const clip = optionalClips.find(candidate => candidate.name === LOCOMOTION_CLIPS.grapple);
      if (disposed || !clip) return false;
      if (!actions.has('grapple')) addAction('grapple', clip);
      return true;
    },
    addWallRun(optionalClips) {
      if (disposed || !WALL_RUN_KEYS.every(key => optionalClips.some(clip => clip.name === LOCOMOTION_CLIPS[key]))) return false;
      for (const key of WALL_RUN_KEYS) if (!actions.has(key)) addAction(key, optionalClips.find(clip => clip.name === LOCOMOTION_CLIPS[key]));
      return true;
    },
    update(deltaSeconds, { speed = 0, grounded = true, verticalVelocity = 0, dashing = false, jumpCount,
      vaultTime = 0, gliding = false, grappling = false, grappleAge,
      wallRunning = false, wallTime, wallSide, reset = false, paused = false, reducedMotion = false } = {}) {
      if (disposed || paused) return this.getState();
      armTwist.restore();
      const delta = Math.min(0.1, Math.max(0, Number(deltaSeconds) || 0));
      const horizontalSpeed = Math.max(0, Number(speed) || 0);
      const onGround = Boolean(grounded);
      const observedJumpCount = Number.isFinite(jumpCount) ? Math.max(0, Math.floor(jumpCount)) : lastJumpCount;
      const remaining = !onGround && Number.isFinite(vaultTime) ? THREE.MathUtils.clamp(vaultTime, 0, VAULT_SECONDS) : 0;
      const repeatAirJump = !reset && !onGround && observedJumpCount > lastJumpCount;
      const enteringVault = remaining > 0 && (current !== 'vault' || remaining > lastVaultRemaining + 0.005);
      const useVault = remaining > 0 && actions.has('vault');
      const useGlide = !onGround && gliding === true && verticalVelocity <= 0 && actions.has('glide');
      const activeGrapple = grappling === true;
      const age = Number.isFinite(grappleAge) && grappleAge >= 0 ? Math.min(2.8, grappleAge) : GRAPPLE_SECONDS;
      const enteringGrapple = !lastGrappling || age < lastGrappleAge - 0.005;
      const wallKey = wallSide === 'left' ? 'wallLeft' : wallSide === 'right' ? 'wallRight' : null;
      // The final eligible physics tick can pass the 1.25-second airborne budget
      // slightly. This presentation tolerance does not extend that game budget.
      const useWallRun = !onGround && wallRunning === true && wallKey && Number.isFinite(wallTime)
        && wallTime >= 0 && wallTime <= 1.35 && actions.has(wallKey);
      if (activeGrapple) {
        // Movement's target-based velocity override has final priority. Read
        // only its boolean/age presentation signal, never a target or authority.
        const key = actions.has('grapple') ? 'grapple' : 'jump';
        setAction(key, { fade: 0.055, restart: enteringGrapple, immediate: reset });
        const action = actions.get(key);
        action.paused = true;
        // Cooldown-derived age avoids replaying reach after a hidden view or
        // late optional load. Missing age chooses a settled pose conservatively.
        action.time = key === 'grapple' ? Math.min(action.getClip().duration, age) : verticalVelocity < -0.2 ? 0.64 : 0.35;
      } else if (useVault) {
        setAction('vault', { fade: 0.055, restart: enteringVault, immediate: reset });
        // The game's remaining time determines phase, even after a hidden view,
        // paused frame or late optional load. Animation never drives movement.
        actions.get('vault').paused = true;
        actions.get('vault').time = Math.min(actions.get('vault').getClip().duration, VAULT_SECONDS - remaining);
      } else if (dashing) {
        setAction('dash', { fade: 0.06, immediate: reset });
      } else if (useGlide && !repeatAirJump) {
        setAction('glide', { fade: 0.14, immediate: reset });
      } else if (useWallRun && !repeatAirJump) {
        setAction(wallKey, { fade: 0.08, immediate: reset });
        const action = actions.get(wallKey);
        action.paused = true;
        action.time = wallTime % action.getClip().duration;
      } else if (!onGround) {
        const enteringAir = current !== 'jump' || reset || lastGrappling;
        setAction('jump', { fade: 0.08, restart: repeatAirJump || lastGrappling, immediate: reset });
        if (enteringAir && !repeatAirJump && verticalVelocity < -0.2) actions.get('jump').time = 0.64;
      } else if (!reset && (!lastGrounded || lastGrappling) && onGround) {
        setAction('landing', { fade: 0.065, restart: true });
      } else if (reset || !(current === 'landing' && elapsed < 0.24)) {
        const sprintThreshold = current === 'sprint' ? 3.45 : 3.7;
        setAction(horizontalSpeed > sprintThreshold ? 'sprint' : horizontalSpeed > (current === 'run' ? 1.75 : 1.95) ? 'run' : horizontalSpeed > 0.12 ? 'walk' : 'idle', { immediate: reset });
      }
      if (current === 'walk') actions.get('walk').setEffectiveTimeScale(THREE.MathUtils.clamp(horizontalSpeed / (1.2110234344302184 * heightScale), 0.3, 1.65));
      if (current === 'run') actions.get('run').setEffectiveTimeScale(THREE.MathUtils.clamp(horizontalSpeed / (2.955489925275779 * heightScale), 0.45, 2));
      if (current === 'sprint') actions.get('sprint').setEffectiveTimeScale(THREE.MathUtils.clamp(horizontalSpeed / (3.393937856855789 * heightScale), 0.45, 2));
      applyBlend(delta);
      synchronizeGaits();
      mixer.update(delta);
      armTwist.apply(['walk', 'run', 'sprint'].reduce((total, key) => total + (weights.get(key) || 0), 0));
      updateHair(delta,{reset,disabled:reducedMotion});
      elapsed += delta;
      lastGrounded = onGround;
      lastJumpCount = onGround ? 0 : observedJumpCount;
      lastVaultRemaining = remaining;
      lastGrappling = activeGrapple;
      lastGrappleAge = activeGrapple ? age : 0;
      return this.getState();
    },
    getState() {
      const action = actions.get(current);
      return { action: current, clip: LOCOMOTION_CLIPS[current], time: action.time, duration: action.getClip().duration, rate: action.getEffectiveTimeScale(), elapsed, airJumpCount: lastJumpCount, disposed,
        traversalAvailable: TRAVERSAL_KEYS.every(key => actions.has(key)), grappleAvailable: actions.has('grapple'),
        wallRunAvailable: WALL_RUN_KEYS.every(key => actions.has(key)), weights: Object.fromEntries(weights) };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      armTwist.dispose();
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
    },
  };
}

/**
 * Independent local player. Never registers with god/NPC animation updates.
 * Group origin is the floor, facing +Z; world translation/yaw are caller-owned.
 * Only a private skeleton and materials are created. Geometry/textures stay shared.
 */
export async function createPlayerAvatar({ name = 'Hecate', accent, shell, hair, height = 1.8, castShadow = false } = {}) {
  if (!Number.isFinite(height) || height < 1.4 || height > 3) throw new RangeError('Character height must be 1.4 to 3 metres');
  const optionalTraversal = preloadTraversal();
  const optionalGrapple = preloadGrapple();
  const optionalWallRun = preloadWallRun();
  const [base, motion, identityAsset, wardrobeAsset] = await Promise.all([preloadGodCharacters(), preloadLocomotion(), preloadGodIdentities(name), preloadGodWardrobe(name)]);
  const model = clone(base.scene);
  const avatar = new THREE.Group();
  avatar.name = `${name} · local player`;
  avatar.scale.setScalar(height / 1.72);
  avatar.add(model);
  const palette = CHARACTER_VARIANTS[name] || CHARACTER_VARIANTS.Hecate;
  const accentColor = new THREE.Color(accent || palette.accent);
  const shellColor = new THREE.Color(shell || palette.shell);
  const hairColor = new THREE.Color(hair || palette.hair);
  const materials = new Map();
  let skeleton;
  model.traverse(object => {
    if (!object.isMesh) return;
    object.castShadow = castShadow;
    object.receiveShadow = true;
    if (object.isSkinnedMesh) {
      if (!skeleton) skeleton = object.skeleton;
      else object.skeleton = skeleton;
    }
    const original = object.material;
    if (!materials.has(original)) {
      const material = original.clone();
      if (material.name === 'Domain accent') {
        material.color.copy(accentColor);
        material.emissive.copy(accentColor).multiplyScalar(0.22);
      } else if (material.name === 'Sapphire tailored shell') {
        material.color.copy(shellColor);
      } else if (material.name === 'Tailored jacket panels') {
        material.color.copy(shellColor).multiplyScalar(1.25);
      } else if (material.name === 'Ponytail · obsidian') {
        material.color.copy(hairColor);
      }
      materials.set(original, material);
    }
    object.material = materials.get(original);
  });
  const identity = applyGodIdentity(model, name, identityAsset);
  const wardrobe = applyGodWardrobe(model, name, wardrobeAsset, { castShadow });
  identity.enableHairMotion(wardrobe.meshes);
  const controller = createController(model, [...base.animations, ...motion], height / 1.72, (delta,options) => {
    identity.updateHair(delta,options);
    identity.updateFace(delta,options);
  });
  const traversalReady = optionalTraversal.then(clips => controller.addTraversal(clips)).catch(() => false);
  const grappleReady = optionalGrapple.then(clips => controller.addGrapple(clips)).catch(() => false);
  const wallRunReady = optionalWallRun.then(clips => controller.addWallRun(clips)).catch(() => false);
  avatar.userData.playerCharacter = { adultAgeYears: 25, fullyClothed: true, sharedAcceptedBase: true, identity: identity.stats, wardrobe: wardrobe.stats, animationStyle: 'Retargeted CMU locomotion with original traversal', joints: skeleton.bones.length };
  avatar.updateMatrixWorld(true);
  let disposed = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    controller.dispose();
    identity.dispose();
    wardrobe.dispose();
    skeleton.dispose();
    for (const material of materials.values()) material.dispose();
    avatar.removeFromParent();
  }
  return { avatar, controller, traversalReady, grappleReady, wallRunReady, facialReady:identity.facialReady, dispose };
}
