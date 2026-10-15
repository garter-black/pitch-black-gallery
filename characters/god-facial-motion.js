import * as THREE from '../vendor/three.module.min.js';

let assetPromise;
export function preloadFacialMotion() {
  if (!assetPromise) assetPromise = Promise.all([
    fetch(new URL('./god-facial-morphs.json', import.meta.url)).then(r => { if (!r.ok) throw new Error('Facial pose metadata unavailable'); return r.json(); }),
    fetch(new URL('./god-facial-morphs.bin', import.meta.url)).then(r => { if (!r.ok) throw new Error('Facial poses unavailable'); return r.arrayBuffer(); }),
  ]).then(([meta, buffer]) => {
    if (meta.version !== 1 || meta.byteLength !== buffer.byteLength || Object.keys(meta.identities).length !== 20) throw new Error('Invalid facial poses');
    return {meta, buffer};
  }).catch(error => { assetPromise = undefined; throw error; });
  return assetPromise;
}

function expand(asset, record) {
  const read = (d, Type) => {
    if (!Number.isInteger(d.offset) || !Number.isInteger(d.count) || d.offset < 0 || d.count < 0 || d.offset % Type.BYTES_PER_ELEMENT || d.offset + d.count * Type.BYTES_PER_ELEMENT > asset.buffer.byteLength) throw new Error('Invalid facial attribute');
    return new Type(asset.buffer, d.offset, d.count);
  };
  const indices = read(record.indices, Uint16Array), position = read(record.position, Float32Array), normal = read(record.normal, Float32Array);
  if (position.length !== indices.length * 3 || normal.length !== position.length) throw new Error('Invalid facial attribute count');
  const p = new Float32Array(record.vertices * 3), n = new Float32Array(p.length);
  let previous = -1;
  for (let i = 0; i < indices.length; i++) {
    const index = indices[i];
    if (index >= record.vertices || index <= previous) throw new Error('Invalid facial vertex');
    previous = index;
    for (let c = 0; c < 3; c++) {
      const value = position[i * 3 + c], direction = normal[i * 3 + c];
      if (!Number.isFinite(value) || !Number.isFinite(direction) || Math.abs(value) > .04) throw new Error('Invalid facial deformation');
      p[index * 3 + c] = value; n[index * 3 + c] = direction;
    }
  }
  return {position: new THREE.Float32BufferAttribute(p, 3), normal: new THREE.Float32BufferAttribute(n, 3)};
}

// Original asymmetric timing, informed by the fast closure/slow recovery in
// Trutoiu et al. (2011). This is an authored curve, not their measured capture.
export function blinkClosure(seconds) {
  if (seconds <= 0 || seconds >= .34) return 0;
  if (seconds < .075) return Math.sin(seconds / .075 * Math.PI / 2) ** 2;
  if (seconds < .095) return 1;
  const t = (seconds - .095) / .245, k = 7;
  const tail = (1 + k) * Math.exp(-k);
  return Math.max(0, ((1 + k * t) * Math.exp(-k * t) - tail) / (1 - tail));
}

export function attachFacialMotion(model, name, asset) {
  const record = asset.meta.identities[name] || asset.meta.identities.Hecate;
  let face, lashes;
  model.traverse(object => {
    if (!object.isSkinnedMesh) return;
    if (object.name.startsWith('Adult_face')) face = object;
    if (object.name.endsWith('fitted eyelashes01')) lashes = object;
  });
  if (!face || !lashes) throw new Error('Fitted facial surfaces unavailable');
  const meshes = [face, lashes];
  for (const [mesh, data] of [[face, record.face], [lashes, record.lashes]]) {
    if (mesh.geometry.attributes.position.count !== data.vertices || Object.keys(mesh.geometry.morphAttributes).length) throw new Error('Unexpected facial topology');
    const morph = expand(asset, data);
    mesh.geometry.morphAttributes.position = [morph.position];
    mesh.geometry.morphAttributes.normal = [morph.normal];
    mesh.geometry.morphTargetsRelative = true;
    mesh.updateMorphTargets();
    mesh.material.needsUpdate = true;
    // The closed lids remain within the current head/eyelash bounds in this
    // review; renderer bounds are expanded through Three's morph-aware methods.
    mesh.geometry.computeBoundingBox(); mesh.geometry.computeBoundingSphere();
  }
  let seed = 2166136261;
  for (const character of name) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619) >>> 0;
  const random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
  let age = 0, next = .8 + random() * 3.2, elapsed = -1, count = 0, disposed = false, closure = 0;
  function setClosure(value) {
    if (disposed) return;
    closure = THREE.MathUtils.clamp(Number(value) || 0, 0, 1);
    for (const mesh of meshes) mesh.morphTargetInfluences[0] = closure;
  }
  return {
    setClosure,
    reset() { if (!disposed) { age = 0; next = .8 + random() * 3.2; elapsed = -1; setClosure(0); } },
    update(deltaSeconds, {paused = false, disabled = false, reset = false} = {}) {
      if (disposed || paused) return;
      if (reset) this.reset();
      if (disabled) { elapsed = -1; age = 0; setClosure(0); return; }
      const dt = Math.min(.1, Math.max(0, Number(deltaSeconds) || 0));
      age += dt;
      if (elapsed < 0 && age >= next) { elapsed = age - next; age = 0; count++; }
      else if (elapsed >= 0) elapsed += dt;
      if (elapsed >= .34) { elapsed = -1; next = 2.3 + random() * 4.1; age = 0; }
      setClosure(elapsed < 0 ? 0 : blinkClosure(elapsed));
    },
    getState() { return {closure, count, elapsed, next, disposed, version: 1}; },
    dispose() { if (!disposed) { setClosure(0); disposed = true; } },
  };
}
