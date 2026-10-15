import * as THREE from '../vendor/three.module.min.js';

// Original, texture-free equipment. The accepted adult mesh and all source PNGs
// remain unchanged. Coordinates are in the accepted character's 1.72m bind space.
const attached = new WeakMap();
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const SILVER = '#d7e1e6';
const PEARL = '#eef2f3';
const EDGE = '#617a88';
const INK = '#273840';
const ICE = '#91d3e3';

/** Apply only to the private material clones of the Artemis NPC. */
export function applyArtemisMaterials(materials) {
  const palette = {
    'Sapphire tailored shell': ['#c3d0d7', 0.36, 0.34],
    'Tailored jacket panels': ['#e0e7eb', 0.32, 0.40],
    'Graphite undersuit': ['#25323b', 0.51, 0.10],
    'Boots and gloves': ['#202a32', 0.33, 0.20],
    'Silver articulated trim': ['#708a99', 0.25, 0.76],
    'Ponytail · obsidian': ['#282d34', 0.42, 0.0],
    'Domain accent': [ICE, 0.24, 0.60],
  };
  for (const material of materials) {
    const values = palette[material.name];
    if (!values) continue;
    material.color.set(values[0]);
    material.roughness = values[1];
    material.metalness = values[2];
    if (material.name === 'Domain accent') material.emissive.set(ICE).multiplyScalar(0.035);
  }
}

class FacetedGeometry {
  constructor() { this.positions = []; this.colors = []; }
  triangle(a, b, c, color) {
    const tint = new THREE.Color(color);
    for (const p of [a, b, c]) {
      this.positions.push(p.x, p.y, p.z);
      this.colors.push(tint.r, tint.g, tint.b);
    }
  }
  quad(a, b, c, d, color) {
    this.triangle(a, b, c, color);
    this.triangle(a, c, d, color);
  }
  finish() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3));
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
  }
}

function sweptBand(builder, points, widths, depth, colors = [SILVER, EDGE, PEARL, EDGE]) {
  // Beveled rectangular section, with the broad face approximately toward +Z.
  const rings = points.map((point, index) => {
    const tangent = points[Math.min(points.length - 1, index + 1)].clone().sub(points[Math.max(0, index - 1)]).normalize();
    let widthAxis = V(-tangent.y, tangent.x, 0).normalize();
    if (widthAxis.lengthSq() < .5) widthAxis = V(1, 0, 0);
    const normal = tangent.clone().cross(widthAxis).normalize();
    const width = widths.length === 1 ? widths[0] : widths[index];
    const bevel = Math.min(width * .18, depth * .32);
    return [[-width / 2 + bevel, -depth / 2], [width / 2 - bevel, -depth / 2],
      [width / 2, -depth / 2 + bevel], [width / 2, depth / 2 - bevel],
      [width / 2 - bevel, depth / 2], [-width / 2 + bevel, depth / 2],
      [-width / 2, depth / 2 - bevel], [-width / 2, -depth / 2 + bevel]].map(([x, z]) => point.clone().addScaledVector(widthAxis, x).addScaledVector(normal, z));
  });
  for (let row = 0; row < rings.length - 1; row++) {
    for (let side = 0; side < 8; side++) {
      const next = (side + 1) % 8;
      builder.quad(rings[row][next], rings[row + 1][next], rings[row + 1][side], rings[row][side], colors[side % colors.length]);
    }
  }
  for (let side = 1; side < 7; side++) {
    builder.triangle(rings[0][0], rings[0][side + 1], rings[0][side], EDGE);
    const end = rings[rings.length - 1];
    builder.triangle(end[0], end[side], end[side + 1], EDGE);
  }
}

function diamond(builder, centre, width, height, depth, front = V(0, 0, 1), up = V(0, 1, 0)) {
  const right = up.clone().cross(front).normalize();
  const middle = [centre.clone().addScaledVector(up, height / 2),
    centre.clone().addScaledVector(right, width / 2), centre.clone().addScaledVector(up, -height / 2),
    centre.clone().addScaledVector(right, -width / 2)];
  const crown = centre.clone().addScaledVector(front, depth * .55);
  const back = centre.clone().addScaledVector(front, -depth * .45);
  for (let i = 0; i < 4; i++) {
    const next = (i + 1) % 4;
    builder.triangle(middle[i], crown, middle[next], [PEARL, ICE, SILVER, '#b4c8d4'][i]);
    builder.triangle(middle[i], middle[next], back, EDGE);
  }
}

function shell(builder, centre, axis, outward, rows, startAngle, endAngle, segments = 10) {
  const radial = outward.clone().addScaledVector(axis, -outward.dot(axis)).normalize();
  const across = axis.clone().cross(radial).normalize();
  const outer = rows.map(([distance, radius]) => Array.from({ length: segments + 1 }, (_, i) => {
    const a = startAngle + (endAngle - startAngle) * i / segments;
    return centre.clone().addScaledVector(axis, distance).addScaledVector(radial, Math.cos(a) * radius).addScaledVector(across, Math.sin(a) * radius);
  }));
  const inner = rows.map(([distance, radius]) => Array.from({ length: segments + 1 }, (_, i) => {
    const a = startAngle + (endAngle - startAngle) * i / segments;
    return centre.clone().addScaledVector(axis, distance).addScaledVector(radial, Math.cos(a) * (radius - .004)).addScaledVector(across, Math.sin(a) * (radius - .004));
  }));
  for (let row = 0; row < rows.length - 1; row++) {
    for (let side = 0; side < segments; side++) {
      builder.quad(outer[row][side + 1], outer[row + 1][side + 1], outer[row + 1][side], outer[row][side], side === 0 || side === segments - 1 ? EDGE : side % 3 === 0 ? SILVER : PEARL);
      builder.quad(inner[row][side], inner[row + 1][side], inner[row + 1][side + 1], inner[row][side + 1], INK);
    }
    for (const side of [0, segments]) builder.quad(outer[row][side], inner[row][side], inner[row + 1][side], outer[row + 1][side], EDGE);
  }
  for (const row of [0, rows.length - 1]) {
    for (let side = 0; side < segments; side++) builder.quad(outer[row][side], outer[row][side + 1], inner[row][side + 1], inner[row][side], SILVER);
  }
  return outer;
}

function headJewelry() {
  const g = new FacetedGeometry();
  // Small ear drops. Both sit outside the face silhouette, below the actual lobes.
  for (const sign of [-1, 1]) {
    const x = sign * .085;
    diamond(g, V(x, 1.573, .057), .0048, .0065, .003);
    sweptBand(g, [V(x, 1.570, .057), V(x, 1.561, .059)], [.0017], .0016, [SILVER]);
    diamond(g, V(x, 1.549, .060), .0105, .026, .0055);
  }
  // Architectural hair pin follows one temple and the ponytail sweep; no forehead crown.
  sweptBand(g, [V(.079, 1.628, .045), V(.078, 1.653, .034), V(.067, 1.685, .015), V(.044, 1.713, -.006), V(.023, 1.722, -.025)], [.0035], .0025);
  sweptBand(g, [V(.077, 1.648, .039), V(.066, 1.679, .024), V(.050, 1.696, .010)], [.0013], .0012, [ICE]);
  diamond(g, V(.071, 1.676, .025), .009, .023, .0035, V(.55, 0, .835).normalize());
  return g.finish();
}

function shoulderPlate() {
  const g = new FacetedGeometry();
  const shoulder = V(.16584, 1.36401, .02283);
  const axis = V(.33659, 1.17851, .02745).sub(shoulder).normalize();
  const outward = V(-axis.y, axis.x, 0).normalize();
  const rows = [[-.006, .060], [.014, .076], [.050, .078], [.099, .067], [.142, .048]];
  const rim = shell(g, shoulder, axis, outward, rows, -1.58, 1.58, 10);
  sweptBand(g, rim[1].map(p => p.clone().addScaledVector(outward, .0018)), [.0023], .0015, [ICE, EDGE, ICE, EDGE]);
  // One very shallow cut-diamond insignia, proportioned as a clasp rather than a spike.
  diamond(g, shoulder.clone().addScaledVector(axis, .06).addScaledVector(outward, .080), .018, .030, .004, outward, axis.clone().negate());
  return g.finish();
}

function forearmBracer() {
  const g = new FacetedGeometry();
  const elbow = V(-.33659, 1.17851, .02745);
  const axis = V(-.45485, 1.04803, .17161).sub(elbow).normalize();
  const outward = V(0, 0, 1).addScaledVector(axis, -axis.z).normalize();
  const rim = shell(g, elbow, axis, outward, [[.062, .043], [.074, .046], [.143, .039], [.178, .034]], -2.88, 2.88, 12);
  sweptBand(g, rim[1], [.0019], .0016, [EDGE, ICE, EDGE, ICE]);
  const badge = elbow.clone().addScaledVector(axis, .117).addScaledVector(outward, .043);
  diamond(g, badge, .011, .032, .003, outward, axis);
  return g.finish();
}

function foldedBow() {
  const g = new FacetedGeometry();
  const main = [V(-.132, 1.037, -.140), V(-.157, 1.096, -.165), V(-.145, 1.183, -.187),
    V(-.084, 1.291, -.199), V(.025, 1.425, -.191), V(.151, 1.555, -.177),
    V(.221, 1.629, -.150), V(.243, 1.704, -.128), V(.215, 1.747, -.109)];
  sweptBand(g, main, [.010, .017, .021, .023, .022, .020, .016, .012, .006], .009);
  const folded = [V(-.009, 1.342, -.208), V(.010, 1.428, -.218), V(.057, 1.520, -.210),
    V(.123, 1.605, -.190), V(.189, 1.663, -.162), V(.217, 1.704, -.143)];
  sweptBand(g, folded, [.017, .018, .017, .014, .011, .005], .0075);
  sweptBand(g, main.slice(1, -1).map(p => p.clone().add(V(0, 0, .0055))), [.0016], .0012, [ICE]);
  // Fine restrained cable and a dark grip make the folded object read as equipment.
  sweptBand(g, [main[0].clone().add(V(.005, .003, -.002)), V(.007, 1.397, -.210), main.at(-1).clone().add(V(-.004, -.003, -.002))], [.0014], .0013, [INK]);
  sweptBand(g, [V(-.026, 1.364, -.206), V(.027, 1.431, -.201)], [.018], .011, [INK, EDGE, INK, EDGE]);
  diamond(g, V(.005, 1.397, -.193), .020, .034, .007);
  return g.finish();
}

function fitPrivateArtemisClothing(model) {
  const byName = new Map();
  model.traverse(object => { if (object.isSkinnedMesh) byName.set(object.name, object); });
  const find = name => byName.get(THREE.PropertyBinding.sanitizeNodeName(name));
  const shirt = find('Tailored outer suit');
  const undersuit = find('Opaque full undersuit');
  if (!shirt || !undersuit) throw new Error('Artemis tailoring requires the accepted opaque suit layers');
  const owned = [];
  const copy = object => {
    const original = object.geometry;
    const geometry = original.clone();
    object.geometry = geometry;
    owned.push({ object, original, geometry });
    return geometry;
  };
  const geometry = copy(shirt);
  const sourcePosition = shirt.geometry.attributes.position;
  const kept = [];
  const index = geometry.index.array;
  for (let i = 0; i < index.length; i += 3) {
    const meanY = (sourcePosition.getY(index[i]) + sourcePosition.getY(index[i + 1]) + sourcePosition.getY(index[i + 2])) / 3;
    // There is a real empty gap between the source trousers (<.97m) and shirt
    // (>1.18m). This keeps the complete shirt with no arbitrary cut through it.
    if (meanY > 1.10) kept.push(index[i], index[i + 1], index[i + 2]);
  }
  const hiddenTrouserTriangles = (index.length - kept.length) / 3;
  geometry.setIndex(kept);
  const position = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  const envelope = undersuit.geometry.attributes.position;
  const used = new Set(kept);
  let maximumClearanceMove = 0;
  for (const i of used) {
    const px = position.getX(i), py = position.getY(i), pz = position.getZ(i);
    let nearestDistance = Infinity;
    let nearest = 0;
    for (let j = 0; j < envelope.count; j++) {
      const x = px - envelope.getX(j), y = py - envelope.getY(j), z = pz - envelope.getZ(j);
      const distance = x * x + y * y + z * z;
      if (distance < nearestDistance) { nearestDistance = distance; nearest = j; }
    }
    const nx = normal.getX(i), ny = normal.getY(i), nz = normal.getZ(i);
    const separation = (px - envelope.getX(nearest)) * nx + (py - envelope.getY(nearest)) * ny + (pz - envelope.getZ(nearest)) * nz;
    const move = Math.min(.016, Math.max(.006, .008 - separation));
    position.setXYZ(i, px + nx * move, py + ny * move, pz + nz * move);
    maximumClearanceMove = Math.max(maximumClearanceMove, move);
  }
  position.needsUpdate = true;
  // Keep the source smooth normals. UV seams duplicate position vertices, so
  // recomputing normals on this split mesh would introduce hard shading seams.
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  // A standard hidden-body mask removes only fully covered central torso faces.
  // The neck, sleeve openings, opaque midriff, trousers, hands and boots remain.
  const bodyGeometry = copy(undersuit);
  const bodyPosition = bodyGeometry.attributes.position;
  const bodyIndex = bodyGeometry.index.array;
  const visibleBody = [];
  for (let i = 0; i < bodyIndex.length; i += 3) {
    const tri = [bodyIndex[i], bodyIndex[i + 1], bodyIndex[i + 2]];
    const completelyCovered = tri.every(v => bodyPosition.getY(v) > 1.215 && bodyPosition.getY(v) < 1.43 && Math.abs(bodyPosition.getX(v)) < .24);
    if (!completelyCovered) visibleBody.push(...tri);
  }
  const maskedCoveredTorsoTriangles = (bodyIndex.length - visibleBody.length) / 3;
  bodyGeometry.setIndex(visibleBody);
  // Keep the tailored jacket panels and piping above the newly spaced shirt.
  for (const name of ['Continuous fitted jacket panels', 'Jacket silver piping']) {
    const object = find(name);
    if (!object) continue;
    const own = copy(object);
    const points = own.attributes.position;
    for (let i = 0; i < points.count; i++) points.setZ(i, points.getZ(i) + .009);
    points.needsUpdate = true;
    own.computeBoundingBox();
    own.computeBoundingSphere();
  }
  // The silver collar now sits over a genuinely spaced shirt. Flare its lower
  // edge slightly and retain a close, face-clear upper rim; move piping with it.
  for (const name of ['Closed structured jacket collar', 'Continuous collar silver piping']) {
    const object = find(name);
    if (!object) continue;
    const own = copy(object);
    const points = own.attributes.position;
    for (let i = 0; i < points.count; i++) {
      const x = points.getX(i), y = points.getY(i), z = points.getZ(i);
      const heightFraction = THREE.MathUtils.clamp((y - 1.425) / .063, 0, 1);
      const centreZ = .026 + .009 * heightFraction;
      const dz = z - centreZ;
      const radius = Math.hypot(x, dz);
      const move = .013 - .008 * heightFraction + (name.includes('piping') ? .001 : 0);
      if (radius > 1e-5) points.setXYZ(i, x + x / radius * move, y, z + dz / radius * move);
    }
    points.needsUpdate = true;
    own.computeBoundingBox();
    own.computeBoundingSphere();
  }
  return {
    owned,
    stats: { hiddenTrouserTriangles, maskedCoveredTorsoTriangles, retainedShirtTriangles: kept.length / 3, maximumClearanceMoveMetres: maximumClearanceMove, privateGeometries: owned.length },
    dispose() {
      for (const { object, original, geometry: own } of owned) { object.geometry = original; own.dispose(); }
    },
  };
}

/** Attach in the accepted bind pose, before starting the model's mixer. */
export function attachArtemisEquipment(model, { castShadow = false } = {}) {
  if (attached.has(model)) return attached.get(model);
  const definitions = [
    ['Artemis diamond ear jewelry and hair pin', 'head', headJewelry],
    ['Artemis asymmetric silver pauldron', 'upperarm01.L', shoulderPlate],
    ['Artemis silver forearm bracer', 'lowerarm01.R', forearmBracer],
    ['Artemis folded architectural bow', 'spine01', foldedBow],
  ];
  const bones = new Map();
  model.traverse(object => { if (object.isBone) bones.set(object.name, object); });
  for (const [, boneName] of definitions) {
    const bone = bones.get(THREE.PropertyBinding.sanitizeNodeName(boneName));
    if (!bone) throw new Error(`Artemis equipment requires ${boneName}`);
    if (bone.quaternion.angleTo(new THREE.Quaternion()) > 1e-5) throw new Error('Attach Artemis equipment before starting the idle mixer');
  }
  // Object3D.attach preserves world transform under this uniformly-scaled rig.
  // Both mesh and bone inherit the same avatar scale; it is not baked twice.
  model.updateWorldMatrix(true, true);
  for (let ancestor = model; ancestor; ancestor = ancestor.parent) {
    const { x, y, z } = ancestor.scale;
    if (Math.abs(x - y) > 1e-6 || Math.abs(x - z) > 1e-6) throw new Error('Artemis equipment requires uniform ancestor scale');
  }
  const tailoring = fitPrivateArtemisClothing(model);
  const material = new THREE.MeshStandardMaterial({ name: 'Artemis brushed silver equipment', color: 0xffffff, vertexColors: true, metalness: .72, roughness: .28 });
  const meshes = [];
  for (const [name, boneName, build] of definitions) {
    const geometry = build();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    mesh.userData.artemisEquipment = true;
    mesh.userData.attachmentBone = boneName;
    model.add(mesh);
    mesh.updateWorldMatrix(true, false);
    bones.get(THREE.PropertyBinding.sanitizeNodeName(boneName)).attach(mesh);
    meshes.push(mesh);
  }
  const triangles = meshes.reduce((sum, mesh) => sum + mesh.geometry.attributes.position.count / 3, 0);
  const stats = Object.freeze({ version: 3, meshes: meshes.length, drawCalls: meshes.length, triangles, textures: 0, originalEquipment: true, sharedAdultBase: true, tailoring: tailoring.stats });
  let disposed = false;
  const result = {
    meshes,
    stats,
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const mesh of meshes) { mesh.removeFromParent(); mesh.geometry.dispose(); }
      material.dispose();
      tailoring.dispose();
      attached.delete(model);
    },
  };
  attached.set(model, result);
  return result;
}
