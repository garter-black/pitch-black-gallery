import * as THREE from '../vendor/three.module.min.js';

// Original geometry, in the accepted 1.72m adult bind space. This treatment is
// exclusive to the Artemis NPC. No source mesh buffer or bitmap is rewritten.
const attached = new WeakMap();
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const scalpCentre = V(0, 1.628, .034);

class HairGeometry {
  constructor() { this.positions = []; this.colors = []; this.indices = []; this.ranges = []; }
  vertex(point, tint) {
    const index = this.positions.length / 3;
    this.positions.push(point.x, point.y, point.z);
    this.colors.push(tint.r, tint.g, tint.b);
    return index;
  }
  quad(a, b, c, d) { this.indices.push(a, b, d, b, c, d); }
  finish() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3));
    geometry.setIndex(this.indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    geometry.userData.hairSections = this.ranges;
    return geometry;
  }
}

function color(shade) { return new THREE.Color('#25282f').multiplyScalar(shade); }

function taperedLock(builder, points, width, thickness, { steps = 27, twist = 0, seed = 0, kind = 'tail' } = {}) {
  const start = builder.positions.length / 3;
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const sides = 10;
  const rings = [];
  let previousTangent, transportedNormal;
  for (let row = 0; row <= steps; row++) {
    const t = row / steps;
    const centre = curve.getPoint(t);
    const tangent = curve.getTangent(t).normalize();
    if (!previousTangent) {
      const firstAcross = V(1, 0, 0).addScaledVector(tangent, -tangent.x).normalize();
      transportedNormal = firstAcross.cross(tangent).normalize();
    } else {
      transportedNormal.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(previousTangent, tangent));
      transportedNormal.addScaledVector(tangent, -transportedNormal.dot(tangent)).normalize();
    }
    previousTangent = tangent.clone();
    // Parallel transport keeps the flattened section continuous around the
    // gathered root, including where its tangent passes through horizontal.
    const broadNormal = transportedNormal.clone();
    broadNormal.applyAxisAngle(tangent, twist * Math.sin(t * Math.PI) + seed * .055);
    const across = tangent.clone().cross(broadNormal).normalize();
    // Broad, flattened lens sections with a long tapered end, never round tubes.
    const envelope = Math.max(.035, Math.pow(Math.sin(Math.PI * (.10 + .90 * t)), .7) * (1 - .66 * t));
    const ring = [];
    for (let side = 0; side < sides; side++) {
      const angle = side / sides * Math.PI * 2;
      const u = Math.cos(angle);
      const depth = Math.sin(angle);
      const ridge = depth > 0 ? 1 + .16 * Math.cos(u * Math.PI * 3 + seed) : .72;
      const point = centre.clone().addScaledVector(across, u * width * envelope / 2)
        .addScaledVector(broadNormal, depth * thickness * envelope * ridge / 2);
      const shade = .68 + .19 * (1 - Math.abs(u)) + .10 * Math.cos(u * Math.PI * 4 + seed) + .035 * Math.sin(t * 11 + seed);
      ring.push(builder.vertex(point, color(shade)));
    }
    rings.push(ring);
  }
  for (let row = 0; row < steps; row++) for (let side = 0; side < sides; side++) {
    const next = (side + 1) % sides;
    // With across = tangent cross normal, this order faces away from the axis.
    builder.quad(rings[row][side], rings[row + 1][side], rings[row + 1][next], rings[row][next]);
  }
  for (const [row, sign] of [[0, -1], [steps, 1]]) {
    const centre = builder.vertex(curve.getPoint(row / steps), color(.66));
    for (let side = 0; side < sides; side++) {
      const a = rings[row][side], b = rings[row][(side + 1) % sides];
      builder.indices.push(...(sign === -1 ? [centre, a, b] : [centre, b, a]));
    }
  }
  builder.ranges.push({ kind, start, count: builder.positions.length / 3 - start, steps, sides });
}

function scalpProjector(sourceGeometry, minimumY = 1.578) {
  const position = sourceGeometry.attributes.position;
  const index = sourceGeometry.index;
  const triangles = [];
  for (let i = 0; i < index.count; i += 3) {
    const a = V().fromBufferAttribute(position, index.getX(i));
    const b = V().fromBufferAttribute(position, index.getX(i + 1));
    const c = V().fromBufferAttribute(position, index.getX(i + 2));
    if (Math.min(a.y, b.y, c.y) < minimumY) continue;
    triangles.push([a, b, c]);
  }
  const ray = new THREE.Ray(), hit = V();
  return direction => {
    ray.set(scalpCentre, direction.clone().normalize());
    let distance = 0;
    let result;
    for (const [a, b, c] of triangles) {
      if (!ray.intersectTriangle(a, b, c, false, hit)) continue;
      const candidate = hit.distanceToSquared(scalpCentre);
      if (candidate > distance && candidate < .026) { distance = candidate; result = hit.clone(); }
    }
    if (!result) throw new Error(`Artemis scalp sweep left the accepted hair envelope: ${direction.toArray().join(',')}`);
    return result;
  };
}

function scalpSweeps(builder, sourceGeometry) {
  const project = scalpProjector(sourceGeometry);
  // Front and side roots sweep across the crown to a high, slightly offset tie.
  // Points define growth direction; each shallow strip conforms to source hair.
  const roots = [
    [-.018, 1.686, .128], [-.039, 1.682, .121], [-.054, 1.671, .111],
    [-.067, 1.653, .089], [-.077, 1.635, .063], [-.079, 1.626, .029],
    [-.076, 1.622, -.010], [-.059, 1.613, -.051],
    [.012, 1.689, .128], [.035, 1.682, .123], [.054, 1.670, .111],
    [.068, 1.651, .087], [.077, 1.635, .061], [.079, 1.625, .027],
    [.073, 1.622, -.014], [.054, 1.613, -.051],
  ];
  for (let lock = 0; lock < roots.length; lock++) {
    const root = V(...roots[lock]);
    const sign = root.x < 0 ? -1 : 1;
    const rootDirection = root.clone().sub(scalpCentre).normalize();
    const crownDirection = V(sign * .041, 1.739, .012).sub(scalpCentre).normalize();
    const tieDirection = V(sign * .011, 1.713, -.065).sub(scalpCentre).normalize();
    const curve = new THREE.CatmullRomCurve3([rootDirection, crownDirection, tieDirection], false, 'centripetal');
    const rows = 19, columns = 6;
    const rings = [];
    const start = builder.positions.length / 3;
    for (let row = 0; row <= rows; row++) {
      const t = row / rows;
      const direction = curve.getPoint(t).normalize();
      const tangent = curve.getTangent(t).normalize();
      const across = tangent.clone().cross(direction).normalize();
      const lengthFade = Math.pow(Math.max(0, Math.sin(Math.PI * t)), .8);
      const width = (.035 + (lock % 3) * .004) * (.008 + .992 * lengthFade);
      const ring = [];
      for (let column = 0; column <= columns; column++) {
        const u = column / columns * 2 - 1;
        const sampleDirection = direction.clone().addScaledVector(across, width * u).normalize();
        const point = project(sampleDirection);
        const lift = .00005 + lengthFade * (.00020 + .00032 * Math.pow(Math.max(0, 1 - u * u), 1.1)
          + .000075 * Math.cos(u * Math.PI * 3 + lock * .65));
        point.addScaledVector(sampleDirection, lift);
        const shade = .77 + .08 * (1 - u * u) + .045 * Math.cos(u * Math.PI * 3 + lock * .65);
        ring.push(builder.vertex(point, new THREE.Color('#11151a').multiplyScalar(shade)));
      }
      rings.push(ring);
    }
    for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
      builder.quad(rings[row][column + 1], rings[row + 1][column + 1], rings[row + 1][column], rings[row][column]);
    }
    builder.ranges.push({ kind: 'scalp', start, count: builder.positions.length / 3 - start, rows, columns });
  }
}

function highPonytail(builder, sourceGeometry) {
  // Layered locks open from the high tie and converge into staggered sharp ends.
  // Their fall stays on the opposite side of the folded bow's exposed upper limb.
  const locks = [
    [-.019, -.009, .038, .007, -.012, .015],
    [.001, -.001, .041, .008, .012, -.005],
    [.018, .008, .034, .007, .035, .025],
    [-.029, .009, .029, .006, -.032, .044],
    [-.010, .018, .035, .006, -.015, .071],
    [.013, -.020, .032, .006, .026, .085],
    [-.036, -.008, .024, .005, -.042, .105],
  ];
  const project = scalpProjector(sourceGeometry);
  locks.forEach(([dx, dz, width, thickness, tipX, short], i) => {
    const root = project(V(dx * 3.2, .74, -.67)).add(V(0, .0005, -.001));
    taperedLock(builder, [
      root,
      root.clone().add(V(dx * .40, .009 - i * .0008, -.027)),
      V(dx - .013, 1.660, -.124 + dz * .6),
      V(dx - .036, 1.557, -.153 + dz * .65),
      V(dx * .78 - .053, 1.444 + short * .24, -.150 + dz * .65),
      V(tipX - .073, 1.354 + short * .6, -.129 + dz * .5),
      V(tipX - .076, 1.290 + short, -.102 + dz * .2),
    ], width, thickness, { twist: .28 + i * .05, seed: i * .79 });
  });
  // Two narrow exterior breaks prevent a single moulded outline at the tips.
  const leftRoot = project(V(-.04, .74, -.67));
  const rightRoot = project(V(.04, .74, -.67));
  taperedLock(builder, [leftRoot, leftRoot.clone().add(V(-.017, .002, -.034)), V(-.076, 1.564, -.176),
    V(-.111, 1.442, -.161), V(-.132, 1.368, -.118)], .010, .0028, { steps: 23, twist: -.24, seed: 2.4 });
  taperedLock(builder, [rightRoot, rightRoot.clone().add(V(.007, .003, -.027)), V(-.011, 1.556, -.137),
    V(-.028, 1.443, -.145), V(-.049, 1.344, -.108)], .009, .0025, { steps: 23, twist: .55, seed: 3.7 });
}

function faceFraming(builder) {
  taperedLock(builder, [V(-.041, 1.695, .135), V(-.060, 1.675, .124), V(-.071, 1.651, .126),
    V(-.073, 1.619, .133), V(-.067, 1.591, .139), V(-.070, 1.573, .129)], .008, .0022,
  { steps: 24, twist: -.30, seed: .8, kind: 'face-frame' });
  taperedLock(builder, [V(.052, 1.680, .126), V(.070, 1.656, .126), V(.074, 1.635, .125),
    V(.071, 1.609, .129)], .0055, .0018, { steps: 18, twist: .18, seed: 1.6, kind: 'face-frame' });
}

function closeRetainedRoot(builder, faceGeometry) {
  // Removing the separate old tail reveals a small opening in its source cap.
  // This hair-only closure follows the existing adult scalp, with no skin edit.
  const project = scalpProjector(faceGeometry, 1.48);
  const start = builder.positions.length / 3;
  // Odd lateral subdivisions bridge the source body's narrow midline seam.
  const rows = 12, columns = 15, rings = [];
  for (let row = 0; row <= rows; row++) {
    const ring = [];
    for (let column = 0; column <= columns; column++) {
      const x = -.86 + 1.72 * column / columns;
      const y = -.05 + 1.18 * row / rows;
      const direction = V(x, y, -1).normalize();
      const point = project(direction).addScaledVector(direction, .0022);
      ring.push(builder.vertex(point, new THREE.Color('#0b1015')));
    }
    rings.push(ring);
  }
  for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
    builder.quad(rings[row][column], rings[row + 1][column], rings[row + 1][column + 1], rings[row][column + 1]);
  }
  builder.ranges.push({ kind: 'root-closure', start, count: builder.positions.length / 3 - start, rows, columns });
}

function retainScalp(sourceHair) {
  const original = sourceHair.geometry;
  const geometry = original.clone();
  const position = geometry.attributes.position;
  const sourceIndex = geometry.index.array;
  const keep = [];
  let hiddenTailTriangles = 0, hiddenRootConeTriangles = 0;
  const parent = Array.from({ length: position.count }, (_, i) => i);
  const root = vertex => { while (parent[vertex] !== vertex) { parent[vertex] = parent[parent[vertex]]; vertex = parent[vertex]; } return vertex; };
  const union = (a, b) => { parent[root(a)] = root(b); };
  const joined = new Map();
  for (let vertex = 0; vertex < position.count; vertex++) {
    const key = [position.getX(vertex), position.getY(vertex), position.getZ(vertex)].map(value => value.toFixed(5)).join(',');
    if (joined.has(key)) union(vertex, joined.get(key));
    else joined.set(key, vertex);
  }
  for (let i = 0; i < sourceIndex.length; i += 3) { union(sourceIndex[i], sourceIndex[i + 1]); union(sourceIndex[i], sourceIndex[i + 2]); }
  const components = new Map();
  for (let vertex = 0; vertex < position.count; vertex++) {
    const id = root(vertex);
    if (!components.has(id)) components.set(id, { minY: Infinity, maxZ: -Infinity });
    const component = components.get(id);
    component.minY = Math.min(component.minY, position.getY(vertex));
    component.maxZ = Math.max(component.maxZ, position.getZ(vertex));
  }
  for (let i = 0; i < sourceIndex.length; i += 3) {
    const vertices = [sourceIndex[i], sourceIndex[i + 1], sourceIndex[i + 2]];
    // Omit complete disconnected low-tail components, including their upper
    // gathered roots. No cross-section cut or attached blunt stub remains.
    const component = components.get(root(vertices[0]));
    if (component.minY < 1.40 && component.maxZ < -.03) { hiddenTailTriangles++; continue; }
    // A small cap cone was fitted around the former lower tie. Omit its outer
    // faces and cover that measured rear area with the fitted closure above.
    if (vertices.some(vertex => Math.abs(position.getX(vertex)) < .033 && position.getY(vertex) > 1.625
      && position.getY(vertex) < 1.676 && position.getZ(vertex) < -.052)) { hiddenRootConeTriangles++; continue; }
    keep.push(...vertices);
  }
  geometry.setIndex(keep);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return { original, geometry, hiddenTriangles: (sourceIndex.length - keep.length) / 3, hiddenTailTriangles, hiddenRootConeTriangles };
}

function addTailMorphs(mesh, worldScale) {
  const geometry = mesh.geometry, position = geometry.attributes.position, normal = geometry.attributes.normal;
  const maximumWorldDisplacement = .008;
  const amplitude = maximumWorldDisplacement / worldScale;
  const positions = [new Float32Array(position.count * 3), new Float32Array(position.count * 3)];
  const normals = [new Float32Array(position.count * 3), new Float32Array(position.count * 3)];
  let movingVertices = 0;
  for (const section of geometry.userData.hairSections) {
    if (section.kind !== 'tail') continue;
    for (let vertex = section.start; vertex < section.start + section.count; vertex++) {
      // The upper gathered tail and every non-tail section remain exact. The
      // same smooth shear on all lower locks preserves their relative layers.
      const u = THREE.MathUtils.clamp((1.590 - position.getY(vertex)) / .290, 0, 1);
      const weight = u * u * (3 - 2 * u);
      if (weight === 0) continue;
      movingVertices++;
      positions[0][vertex * 3] = amplitude * weight;
      positions[1][vertex * 3 + 2] = amplitude * weight;
      // Inverse-transpose of this shear is linear in its two weights. The
      // renderer normalizes the result; no per-frame normal rebuild is needed.
      const derivative = u > 0 && u < 1 ? -6 * u * (1 - u) / .290 : 0;
      normals[0][vertex * 3 + 1] = -amplitude * derivative * normal.getX(vertex);
      normals[1][vertex * 3 + 1] = -amplitude * derivative * normal.getZ(vertex);
    }
  }
  geometry.morphTargetsRelative = true;
  geometry.morphAttributes.position = positions.map((values, index) => {
    const attribute = new THREE.BufferAttribute(values, 3);
    attribute.name = index === 0 ? 'Artemis tail lateral lag' : 'Artemis tail fore-aft lag';
    return attribute;
  });
  geometry.morphAttributes.normal = normals.map(values => new THREE.BufferAttribute(values, 3));
  mesh.updateMorphTargets();
  // Signed weights are bounded to the unit disk, so this covers every blend,
  // including negative targets which automatic positive-target bounds omit.
  geometry.boundingBox.min.add(V(-amplitude, 0, -amplitude));
  geometry.boundingBox.max.add(V(amplitude, 0, amplitude));
  geometry.boundingSphere.radius += amplitude;
  return Object.freeze({ modes: 2, movingVertices, fixedVertices: position.count - movingVertices,
    positionAttributeBytes: positions.reduce((sum, values) => sum + values.byteLength, 0),
    normalAttributeBytes: normals.reduce((sum, values) => sum + values.byteLength, 0),
    maximumWorldDisplacement, maximumLocalDisplacement: amplitude, worldScaleAtAttachment: worldScale,
    rendererMorphTextures: 1, rendererMorphTextureBytesAt16K: position.count * 2 * 4 * 2 * 4,
    rendererMorphTextureByteBudget: 524288, rendererTextureBudgetScope: 'Payload at common power-of-two 2K-16K texture limits; excludes driver overhead',
    shader: 'Standard position and normal morph targets',
    perFrameVertexBufferWrites: 0, normalRecomputationsPerFrame: 0 });
}

function tailResponse(mesh, head, worldScale) {
  const current = new THREE.Quaternion(), previous = new THREE.Quaternion(), change = new THREE.Quaternion();
  const offset = new Float64Array(2), velocity = new Float64Array(2);
  const omega = 8, responseGain = 2.4, maximumDisplacement = .008;
  let disposed = false;
  function reset() {
    if (disposed) return;
    offset.fill(0); velocity.fill(0);
    mesh.morphTargetInfluences.fill(0);
    head.getWorldQuaternion(previous);
  }
  function update(rawDelta) {
    if (disposed) return false;
    const dt = typeof rawDelta === 'number' ? rawDelta : NaN;
    if (!Number.isFinite(dt) || dt <= 0 || dt > .1) { reset(); return false; }
    head.getWorldQuaternion(current);
    change.copy(previous).invert().multiply(current).normalize();
    previous.copy(current);
    if (change.w < 0) { change.x *= -1; change.y *= -1; change.z *= -1; change.w *= -1; }
    const sine = Math.hypot(change.x, change.y, change.z);
    const angle = 2 * Math.atan2(sine, change.w);
    if (!Number.isFinite(angle) || angle > .45) { reset(); return false; }
    const factor = sine > 1e-12 ? angle / sine : 2;
    const lateral = worldScale * (.28 * change.z - .12 * change.y) * factor;
    const foreAft = worldScale * -.28 * change.x * factor;
    if (!Number.isFinite(lateral / dt) || !Number.isFinite(foreAft / dt)) { reset(); return false; }
    // Exact critically damped response to the measured, linearly changing head
    // target over this step. The two states are follower error and velocity;
    // no oscillator or wall-clock phase is injected. expm1 keeps tiny dt stable.
    const decay = Math.exp(-omega * dt), decayMinusOne = Math.expm1(-omega * dt);
    const rampPosition = 2 / omega * decayMinusOne + dt * decay;
    const rampVelocity = -decayMinusOne - omega * dt * decay;
    for (let axis = 0; axis < 2; axis++) {
      const targetVelocity = (axis === 0 ? lateral : foreAft) / dt;
      const coupling = velocity[axis] + omega * offset[axis];
      const nextPosition = (offset[axis] + coupling * dt) * decay + targetVelocity * rampPosition;
      const nextVelocity = (velocity[axis] - omega * coupling * dt) * decay + targetVelocity * rampVelocity;
      offset[axis] = Math.abs(nextPosition) < 1e-12 ? 0 : nextPosition;
      velocity[axis] = Math.abs(nextVelocity) < 1e-12 ? 0 : nextVelocity;
    }
    let x = responseGain * offset[0] / maximumDisplacement;
    let z = responseGain * offset[1] / maximumDisplacement;
    const length = Math.hypot(x, z);
    if (length > 1) { x /= length; z /= length; }
    mesh.morphTargetInfluences[0] = x;
    mesh.morphTargetInfluences[1] = z;
    return true;
  }
  reset();
  return { update, reset, dispose() { if (disposed) return; reset(); disposed = true; } };
}

/** Attach once in the bind pose, before the character's idle mixer is started. */
export function attachArtemisHair(model, { castShadow = false } = {}) {
  if (attached.has(model)) return attached.get(model);
  const head = model.getObjectByName(THREE.PropertyBinding.sanitizeNodeName('head'));
  const sourceHair = model.getObjectByName(THREE.PropertyBinding.sanitizeNodeName('Textured ponytail'));
  const face = model.getObjectByName(THREE.PropertyBinding.sanitizeNodeName('Adult face and neck'));
  if (!head?.isBone || !sourceHair?.isSkinnedMesh || !face?.isSkinnedMesh) throw new Error('Artemis hair requires the accepted head and fitted source hair');
  if (head.quaternion.angleTo(new THREE.Quaternion()) > 1e-5) throw new Error('Attach Artemis hair before starting the idle mixer');
  for (let ancestor = model; ancestor; ancestor = ancestor.parent) {
    const { x, y, z } = ancestor.scale;
    if (Math.abs(x - y) > 1e-6 || Math.abs(x - z) > 1e-6) throw new Error('Artemis hair requires uniform ancestor scale');
  }
  const scalp = retainScalp(sourceHair);
  let geometry;
  try {
    const builder = new HairGeometry();
    scalpSweeps(builder, scalp.geometry);
    highPonytail(builder, scalp.geometry);
    faceFraming(builder);
    closeRetainedRoot(builder, face.geometry);
    geometry = builder.finish();
  } catch (error) { scalp.geometry.dispose(); throw error; }
  const material = new THREE.MeshStandardMaterial({ name: 'Artemis original obsidian hair locks',
    color: 0xffffff, vertexColors: true, roughness: .49, metalness: 0, side: THREE.FrontSide });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'Artemis swept crown, high ponytail and loose face framing';
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  mesh.userData.artemisHair = true;
  mesh.userData.attachmentBone = 'head';
  model.updateWorldMatrix(true, true);
  model.add(mesh);
  mesh.updateWorldMatrix(true, false);
  head.attach(mesh);
  sourceHair.geometry = scalp.geometry;
  const worldScale = model.getWorldScale(V()).x;
  const motion = addTailMorphs(mesh, worldScale);
  const response = tailResponse(mesh, head, worldScale);
  const stats = Object.freeze({ version: 1, meshes: 1, drawCalls: 1, triangles: geometry.index.count / 3,
    // Legacy textures counts authored maps; morph storage is renderer-managed.
    textures: 0, authoredTextures: 0, rendererManagedTextures: 1,
    materials: 1, privateGeometries: 2, hiddenSourceTailTriangles: scalp.hiddenTailTriangles,
    hiddenSourceRootConeTriangles: scalp.hiddenRootConeTriangles,
    netAddedTriangles: geometry.index.count / 3 - scalp.hiddenTriangles, originalGeometry: true,
    inheritedScalpTexture: true, secondaryMotion: true, motion });
  let disposed = false;
  const result = { meshes: [mesh], stats, update: response.update, reset: response.reset, dispose() {
    if (disposed) return;
    disposed = true;
    response.dispose();
    mesh.removeFromParent();
    geometry.dispose();
    material.dispose();
    sourceHair.geometry = scalp.original;
    scalp.geometry.dispose();
    attached.delete(model);
  } };
  attached.set(model, result);
  return result;
}
