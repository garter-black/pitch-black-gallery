import {createOriginalHecate,disposeOriginalHecates} from './hecate-original-avatar.js?v=sorceress-20260928-r2';
import * as THREE from '../vendor/three.module.min.js';
import { GLTFLoader } from '../vendor/addons/loaders/GLTFLoader.js';
import { clone } from '../vendor/addons/utils/SkeletonUtils.js';
import { attachArtemisHair } from './artemis-hair.js';
import { preloadGodIdentities, applyGodIdentity } from './god-identities.js';
import { preloadGodWardrobe, applyGodWardrobe } from './god-wardrobe.js';

/** Individual head anatomy and contemporary styling on the verified adult rig. */
export const CHARACTER_VARIANTS = Object.freeze({
  Hecate: { accent: '#a98dff', shell: '#21172e', hair: '#473757' },
  Athena: { accent: '#86d5ff', shell: '#162c42', hair: '#827763' },
  Hera: { accent: '#edc776', shell: '#342b20', hair: '#50402f' },
  Hedone: { accent: '#ff8abe', shell: '#452537', hair: '#794651' },
  Artemis: { accent: '#6bd8fa', shell: '#163f55', hair: '#60677f' },
  Aphrodite: { accent: '#ffa9b9', shell: '#40262e', hair: '#b38363' },
  Nyx: { accent: '#8897ff', shell: '#141829', hair: '#394263' },
  Hestia: { accent: '#ffb77c', shell: '#3d2a22', hair: '#885136' },
  Thalia: { accent: '#aaf0a7', shell: '#22382d', hair: '#8e753f' },
  Persephone: { accent: '#d6a9ec', shell: '#312239', hair: '#554161' },
  Euterpe: { accent: '#b6e4ff', shell: '#243841', hair: '#7e839c' },
  Erato: { accent: '#ed8ba8', shell: '#422331', hair: '#833f53' },
  Cassandra: { accent: '#a2b9ea', shell: '#25303d', hair: '#5d526c' },
  Circe: { accent: '#98e9bd', shell: '#1f3834', hair: '#3c6253' },
  Selene: { accent: '#d9e9ff', shell: '#303748', hair: '#b5b7c9' },
  Demeter: { accent: '#d3cc8a', shell: '#343927', hair: '#7e6740' },
  Medea: { accent: '#be86dc', shell: '#30203e', hair: '#52315e' },
  Peitho: { accent: '#f3ac81', shell: '#3d302c', hair: '#956447' },
  Styx: { accent: '#76c1c6', shell: '#1c2d34', hair: '#394b5b' },
  Eos: { accent: '#ffc397', shell: '#45312e', hair: '#bd8755' },
});

const modelUrl = new URL('./artemis.glb', import.meta.url).href;
const liveAvatars = new Set();
const position = new THREE.Vector3();
const GAZE_RANGE = 7.5; // metres: a god notices a visitor inside this radius
const GAZE_TURN = 0.95; // clamped shoulder turn (radians, ~54 degrees)
const GAZE_RATE = 2.4;  // easing speed for the turn
let templatePromise;

export function preloadGodCharacters() {
  if (!templatePromise) {
    templatePromise = new GLTFLoader().loadAsync(modelUrl).catch(error => {
      templatePromise = undefined;
      throw error;
    });
  }
  return templatePromise;
}

function phaseFor(name) {
  let hash = 0;
  for (const letter of name) hash = (hash * 31 + letter.charCodeAt(0)) >>> 0;
  return (hash % 600) / 100;
}

/**
 * Returns a normal THREE.Group. Add it to the world and place its feet on the floor.
 * Geometry and unchanged source textures are shared; skeleton/materials are private.
 * Caller should surface load errors. This factory never substitutes a billboard.
 */
export async function createGodAvatar({ profileId, name = 'Artemis', accent, height = 1.8, castShadow = false } = {}) {
  if (!Number.isFinite(height) || height < 1.4 || height > 3) throw new RangeError('Character height must be 1.4 to 3 metres');
  // Stable host identity precedes the generic rig. Failure is surfaced, never substituted.
  if (profileId === 'hecate') return createOriginalHecate({height,castShadow});
  const [gltf, identityAsset, wardrobeAsset] = await Promise.all([preloadGodCharacters(), preloadGodIdentities(name), preloadGodWardrobe(name)]);
  const variant = CHARACTER_VARIANTS[name] || CHARACTER_VARIANTS.Artemis;
  const avatar = new THREE.Group();
  const model = clone(gltf.scene);
  avatar.name = `${name} · rigged adult avatar`;
  avatar.scale.setScalar(height / 1.72);
  avatar.add(model);
  const accentColor = new THREE.Color(accent || variant.accent);
  const shellColor = new THREE.Color(variant.shell);
  const hairColor = new THREE.Color(variant.hair);
  const materialCache = new Map();
  let sharedSkeleton;
  model.traverse(object => {
    if (!object.isMesh) return;
    object.castShadow = castShadow;
    object.receiveShadow = true;
    // The exporter uses the same ordered joint list/bind matrices on every part.
    // One skeleton per avatar avoids computing 163 matrices for every garment.
    if (object.isSkinnedMesh) {
      if (!sharedSkeleton) sharedSkeleton = object.skeleton;
      else object.skeleton = sharedSkeleton;
    }
    const original = object.material;
    if (!materialCache.has(original)) {
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
      materialCache.set(original, material);
    }
    object.material = materialCache.get(original);
  });
  const identity = applyGodIdentity(model, name, identityAsset);
  const wardrobe = applyGodWardrobe(model, name, wardrobeAsset, { castShadow });
  const equipment = null;
  const hair = name === 'Artemis' ? attachArtemisHair(model, { castShadow }) : null;
  const surfaces = null;
  const stagewear = null;
  const mixer = new THREE.AnimationMixer(model);
  for (const clip of gltf.animations) mixer.clipAction(clip).play();
  mixer.setTime(phaseFor(name));
  avatar.updateMatrixWorld(true);
  hair?.reset();
  avatar.userData.character = {
    name,
    base: 'MakeHuman CC0 adult female, age 25',
    variant: 'Individual facial anatomy and everyday wardrobe on a shared adult rig',
    wardrobe: wardrobe.stats,
    fullyClothed: true,
    heightMeters: height,
    joints: sharedSkeleton?.bones.length || 0,
    animationActive: false,
    identity: identity.stats,
    ...(equipment ? { equipment: equipment.stats } : {}),
    ...(hair ? { hair: hair.stats } : {}),
    ...(surfaces ? { surfaces } : {}),
    ...(stagewear ? { stagewear: stagewear.stats } : {}),
  };
  const record = { avatar, model, mixer, hair, identity, skeleton: sharedSkeleton, materials: [...materialCache.values()], phase: phaseFor(name), distance: Infinity };
  liveAvatars.add(record);
  avatar.userData.disposeCharacter = () => {
    if (!liveAvatars.delete(record)) return;
    mixer.stopAllAction();
    mixer.uncacheRoot(model);
    identity.dispose();
    wardrobe.dispose();
    hair?.dispose();
    equipment?.dispose();
    stagewear?.dispose();
    record.skeleton?.dispose();
    for (const material of record.materials) material.dispose();
    avatar.removeFromParent();
  };
  return avatar;
}

/** Advance at most three nearby visible characters, suitable for integrated GPUs. */
export function updateGodAvatars(deltaSeconds, cameraPosition, { maxAnimated = 3, animationDistance = 24 } = {}) {
  const delta = Math.min(0.1, Math.max(0, Number(deltaSeconds) || 0));
  const nearby = [];
  for (const record of liveAvatars) {
    record.avatar.userData.character.animationActive = false;
    record.distance = cameraPosition ? record.avatar.getWorldPosition(position).distanceToSquared(cameraPosition) : 0;
    let visible = true;
    for (let object = record.avatar; object; object = object.parent) {
      if (!object.visible) { visible = false; break; }
    }
    if (visible && record.avatar.parent && record.distance <= animationDistance * animationDistance) nearby.push(record);
  }
  nearby.sort((a, b) => a.distance - b.distance);
  const limit = Math.max(0, Math.floor(maxAnimated));
  let turned = 0;
  for (const record of nearby.slice(0, limit)) {
    record.mixer.update(delta);
    record.identity.updateFace(delta);
    record.hair?.update(deltaSeconds);
    record.avatar.userData.character.animationActive = true;
    // Alive-ness: a god within a few metres turns to meet the visitor's eyes
    // (eased shoulder turn, clamped so nobody spins away from their desk).
    if (cameraPosition && record.distance <= GAZE_RANGE * GAZE_RANGE && record.avatar.parent) {
      record.avatar.getWorldPosition(position);
      if (record.baseYaw === undefined) record.baseYaw = record.avatar.rotation.y;
      const wanted = Math.atan2(cameraPosition.x - position.x, cameraPosition.z - position.z);
      let offset = wanted - record.baseYaw;
      offset = Math.atan2(Math.sin(offset), Math.cos(offset));
      offset = Math.max(-GAZE_TURN, Math.min(GAZE_TURN, offset));
      const desired = record.baseYaw + offset;
      let step = desired - record.avatar.rotation.y;
      step = Math.atan2(Math.sin(step), Math.cos(step));
      record.avatar.rotation.y += step * Math.min(1, delta * GAZE_RATE);
      turned++;
    }
  }
  for (const record of liveAvatars) {
    if (!record.avatar.userData.character.animationActive) {
      record.hair?.reset();
      record.identity.updateFace(0,{disabled:true});
      // Out of attention range the god eases back to their post.
      if (record.baseYaw !== undefined) {
        let step = record.baseYaw - record.avatar.rotation.y;
        step = Math.atan2(Math.sin(step), Math.cos(step));
        if (Math.abs(step) > 0.002) record.avatar.rotation.y += step * Math.min(1, delta * 1.1);
      }
    }
  }
  return { avatars: liveAvatars.size, animated: Math.min(nearby.length, limit), turned };
}

export function disposeGodAvatars() {
  disposeOriginalHecates();
  for (const record of [...liveAvatars]) record.avatar.userData.disposeCharacter();
}
