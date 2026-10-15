import * as THREE from '../vendor/three.module.min.js';
import { copyAthenaEquipmentData } from './athena-equipment-data.js';

// Original accepted Athena equipment, precomputed without quantizing its data.
// Cached templates stay private; geometry arrays and material belong to each avatar.
const attached = new WeakMap();

function geometryFromData(data) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(data.position, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(data.color, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(data.normal, 3));
  geometry.boundingBox = new THREE.Box3(new THREE.Vector3().fromArray(data.bounds.min), new THREE.Vector3().fromArray(data.bounds.max));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3().fromArray(data.bounds.centre), data.bounds.radius);
  geometry.userData.sections = data.sections;
  return geometry;
}

/** Attach to this verified model's bind pose before its idle mixer starts. */
export function attachAthenaEquipment(model, {castShadow = false} = {}) {
  if (attached.has(model)) return attached.get(model);
  const bones = new Map(), surfaces = new Set();
  model.traverse(node => { if (node.isBone) bones.set(node.name, node); if (node.isMesh) surfaces.add(node.name); });
  const required = ['head', 'spine01', 'upperarm01.L', 'upperarm01.R', 'lowerarm01.L', 'lowerarm01.R'];
  for (const name of required) {
    const bone = bones.get(THREE.PropertyBinding.sanitizeNodeName(name));
    if (!bone) throw new Error('Athena equipment requires ' + name);
    if (bone.quaternion.angleTo(new THREE.Quaternion()) > 1e-5) throw new Error('Attach Athena equipment before starting the idle mixer');
  }
  for (let node = model; node; node = node.parent) if (Math.abs(node.scale.x - node.scale.y) > 1e-6 || Math.abs(node.scale.x - node.scale.z) > 1e-6) throw new Error('Athena equipment requires uniform ancestor scale');
  for (const names of [
    ['Adult_face_and_neck', 'Textured_ponytail'],
    ['Tailored_outer_suit', 'Opaque_full_undersuit', 'Continuous_fitted_jacket_panels'],
    ['Tailored_outer_suit', 'Opaque_full_undersuit', 'Closed_structured_jacket_collar', 'Adult_face_and_neck'],
  ]) if (!names.some(name => surfaces.has(name))) throw new Error('Athena equipment requires the verified source surface');
  model.updateWorldMatrix(true, true);
  // Preserve the established clone bind-inverse refresh before bone attachment.
  model.updateMatrixWorld(true);
  const definitions = copyAthenaEquipmentData();
  const material = new THREE.MeshStandardMaterial({name: 'Athena brushed platinum and cobalt equipment', color: '#ffffff', vertexColors: true, metalness: 1, roughness: .36});
  const meshes = [];
  try {
    for (const data of definitions) {
      const mesh = new THREE.Mesh(geometryFromData(data), material); meshes.push(mesh);
      mesh.name = data.name; mesh.castShadow = castShadow; mesh.receiveShadow = true;
      mesh.userData.athenaEquipment = true; mesh.userData.attachmentBone = data.bone;
      model.add(mesh); mesh.updateWorldMatrix(true, false); bones.get(THREE.PropertyBinding.sanitizeNodeName(data.bone)).attach(mesh);
    }
  } catch (error) { for (const mesh of meshes) { mesh.removeFromParent(); mesh.geometry.dispose(); } material.dispose(); throw error; }
  const triangles = meshes.reduce((sum, mesh) => sum + mesh.geometry.attributes.position.count / 3, 0);
  const attributeBytes = meshes.reduce((sum, mesh) => sum + Object.values(mesh.geometry.attributes).reduce((bytes, attribute) => bytes + attribute.array.byteLength, 0), 0);
  const stats = Object.freeze({version: 1, meshes: 4, drawCalls: 4, materials: 1, triangles, attributeBytes, textures: 0, lights: 0, perFrameUpdates: 0,
    originalEquipment: true, sharedAdultBase: true, sourceGeometryChanges: 0});
  let disposed = false;
  const result = {meshes, stats, dispose() {
    if (disposed) return; disposed = true;
    for (const mesh of meshes) { mesh.removeFromParent(); mesh.geometry.dispose(); } material.dispose(); attached.delete(model);
  }};
  attached.set(model, result); return result;
}