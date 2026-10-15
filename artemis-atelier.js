// Original, static jewellery geometry for the six existing public Artemis cases.
// Opaque reflective surfaces approximate cut stones; no gem optics or grading.
const installed = new WeakMap();
const names = ['Round solitaire', 'Step-cut shoulders', 'Halo pendant', 'Paired drops', 'Seven-stone bracelet', 'Loose-cut study'];

function faceted(THREE, vertices, faces, centre, name) {
  const positions = [], normals = [], colors = [], indices = [], facets = [];
  const edge = new THREE.Vector3(), normal = new THREE.Vector3(), midpoint = new THREE.Vector3();
  for (let faceIndex = 0; faceIndex < faces.length; faceIndex++) {
    const { ids: sourceIds, region = 'surface', tint = '#d6eaf3' } = faces[faceIndex];
    const ids = [...sourceIds];
    normal.copy(vertices[ids[1]]).sub(vertices[ids[0]]).cross(edge.copy(vertices[ids[2]]).sub(vertices[ids[0]])).normalize();
    midpoint.set(0, 0, 0); for (const id of ids) midpoint.add(vertices[id]); midpoint.multiplyScalar(1 / ids.length);
    if (normal.dot(edge.copy(midpoint).sub(centre)) < 0) { ids.reverse(); normal.negate(); }
    const first = positions.length / 3, firstIndex = indices.length;
    const color = new THREE.Color(tint);
    for (const id of ids) { vertices[id].toArray(positions, positions.length); normal.toArray(normals, normals.length); color.toArray(colors, colors.length); }
    for (let corner = 1; corner < ids.length - 1; corner++) indices.push(first, first + corner, first + corner + 1);
    facets.push({ region, firstVertex: first, vertexCount: ids.length, firstIndex, indexCount: indices.length - firstIndex });
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  geometry.name = name; geometry.userData.facets = facets; geometry.userData.interiorPoint = centre.toArray();
  return geometry;
}

/** An original 57-principal-face arrangement, plus a simplified 16-face girdle. */
export function buildRoundCutGeometry(THREE, { radius = .15, tableRatio = .54, crownHeight = .052, pavilionDepth = .13, girdleHeight = .008 } = {}) {
  if (![radius, tableRatio, crownHeight, pavilionDepth, girdleHeight].every(Number.isFinite)
    || Math.min(radius, crownHeight, pavilionDepth, girdleHeight) <= 0 || tableRatio <= .2 || tableRatio >= .65) throw new RangeError('Invalid round-cut dimensions');
  const vertices = [], faces = [];
  const ring = (count, r, y, phase = 0) => Array.from({ length: count }, (_, index) => {
    const angle = phase + index * Math.PI * 2 / count;
    vertices.push(new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r)); return vertices.length - 1;
  });
  const table = ring(8, radius * tableRatio, crownHeight);
  const starY = crownHeight * (1 - .78 * Math.cos(Math.PI / 8)) / (1 - tableRatio);
  const stars = ring(8, radius * .78, starY, Math.PI / 8);
  const upper = ring(16, radius, 0), lower = ring(16, radius, -girdleHeight);
  const pavilion = ring(8, radius * .50, -girdleHeight - pavilionDepth * (1 - .50 * Math.cos(Math.PI / 8)), Math.PI / 8);
  const tip = vertices.push(new THREE.Vector3(0, -girdleHeight - pavilionDepth, 0)) - 1;
  faces.push({ ids: table, region: 'table', tint: '#f1f9ff' });
  for (let i = 0; i < 8; i++) {
    const next = (i + 1) % 8, previous = (i + 7) % 8, even = i * 2, odd = even + 1, nextEven = (even + 2) % 16;
    faces.push({ ids: [table[i], table[next], stars[i]], region: 'star', tint: i % 2 ? '#d6edf7' : '#eaf6fa' });
    faces.push({ ids: [table[i], stars[previous], upper[even], stars[i]], region: 'bezel', tint: i % 2 ? '#b5d6e6' : '#d1e8f1' });
    faces.push({ ids: [stars[i], upper[even], upper[odd]], region: 'upper-half', tint: '#a6c9dc' });
    faces.push({ ids: [stars[i], upper[odd], upper[nextEven]], region: 'upper-half', tint: '#e1f2fb' });
    faces.push({ ids: [tip, pavilion[previous], lower[even], pavilion[i]], region: 'pavilion-main', tint: i % 2 ? '#bad9e9' : '#82adc5' });
    faces.push({ ids: [pavilion[i], lower[even], lower[odd]], region: 'lower-half', tint: '#d7edf6' });
    faces.push({ ids: [pavilion[i], lower[odd], lower[nextEven]], region: 'lower-half', tint: '#99bfd4' });
  }
  for (let i = 0; i < 16; i++) faces.push({ ids: [upper[i], lower[i], lower[(i + 1) % 16], upper[(i + 1) % 16]], region: 'girdle', tint: '#c8e0eb' });
  const geometry = faceted(THREE, vertices, faces, new THREE.Vector3(0, -pavilionDepth * .25, 0), 'Original round-cut stone');
  geometry.userData.principalFacetCount = 57; geometry.userData.girdleFacetCount = 16;
  return geometry;
}

/** Clipped rectangular tiers give the step cut long planar crown/pavilion faces. */
export function buildStepCutGeometry(THREE, { width = .28, depth = .21, crownHeight = .047, pavilionDepth = .115, girdleHeight = .008 } = {}) {
  if (![width, depth, crownHeight, pavilionDepth, girdleHeight].every(Number.isFinite) || Math.min(width, depth, crownHeight, pavilionDepth, girdleHeight) <= 0) throw new RangeError('Invalid step-cut dimensions');
  const vertices = [], faces = [], cut = Math.min(width, depth) * .19;
  const outline = [[width / 2 - cut, depth / 2], [width / 2, depth / 2 - cut], [width / 2, -depth / 2 + cut], [width / 2 - cut, -depth / 2],
    [-width / 2 + cut, -depth / 2], [-width / 2, -depth / 2 + cut], [-width / 2, depth / 2 - cut], [-width / 2 + cut, depth / 2]];
  const levels = [[.57, crownHeight], [.77, crownHeight * .64], [.91, crownHeight * .28], [1, 0], [1, -girdleHeight],
    [.74, -girdleHeight - pavilionDepth * .43], [.36, -girdleHeight - pavilionDepth * .83], [.045, -girdleHeight - pavilionDepth]];
  const rings = levels.map(([scale, y]) => outline.map(([x, z]) => { vertices.push(new THREE.Vector3(x * scale, y, z * scale)); return vertices.length - 1; }));
  faces.push({ ids: rings[0], region: 'table', tint: '#eef8ff' });
  for (let level = 0; level < rings.length - 1; level++) for (let edge = 0; edge < 8; edge++) {
    const region = level < 3 ? 'crown-step' : level === 3 ? 'girdle' : 'pavilion-step';
    const palette = ['#c0deed', '#e3f2f8', '#9dbfd3', '#c7e1ec', '#a3c6d9', '#d8edf6', '#88b2ca'];
    faces.push({ ids: [rings[level][edge], rings[level + 1][edge], rings[level + 1][(edge + 1) % 8], rings[level][(edge + 1) % 8]], region, tint: palette[(level + edge % 2) % palette.length] });
  }
  faces.push({ ids: rings.at(-1), region: 'culet', tint: '#bcd9e8' });
  return faceted(THREE, vertices, faces, new THREE.Vector3(0, -pavilionDepth * .25, 0), 'Original clipped step-cut stone');
}

function bevelBlock(THREE, width, height, depth, bevel = .012) {
  const b = Math.min(bevel, height * .22), c = Math.min(width, depth) * .12;
  const points = [[-width / 2 + c, -depth / 2], [width / 2 - c, -depth / 2], [width / 2, -depth / 2 + c], [width / 2, depth / 2 - c],
    [width / 2 - c, depth / 2], [-width / 2 + c, depth / 2], [-width / 2, depth / 2 - c], [-width / 2, -depth / 2 + c]];
  const vertices = [], faces = [];
  const rings = [[b, -height / 2], [0, -height / 2 + b], [0, height / 2 - b], [b, height / 2]].map(([inset, y]) => points.map(([x, z]) => {
    const scale = 1 - 2 * inset / Math.min(width, depth);
    vertices.push(new THREE.Vector3(x * scale, y, z * scale)); return vertices.length - 1;
  }));
  faces.push({ ids: rings[0], tint: '#ffffff' }, { ids: rings[3], tint: '#ffffff' });
  for (let level = 0; level < 3; level++) for (let i = 0; i < 8; i++) faces.push({ ids: [rings[level][i], rings[level + 1][i], rings[level + 1][(i + 1) % 8], rings[level][(i + 1) % 8]], tint: '#ffffff' });
  return faceted(THREE, vertices, faces, new THREE.Vector3(), 'Original bevelled display support');
}

function merge(THREE, components, role, transform = new THREE.Matrix4()) {
  const positions = [], normals = [], colors = [], ranges = [];
  const point = new THREE.Vector3(), normal = new THREE.Vector3(), tint = new THREE.Color('#ffffff'), normalMatrix = new THREE.Matrix3();
  for (const component of components.filter(part => part.role === role)) {
    const matrix = transform.clone().multiply(component.matrix); normalMatrix.getNormalMatrix(matrix);
    const geometry = component.geometry, start = positions.length / 3;
    const count = geometry.index?.count ?? geometry.attributes.position.count;
    for (let i = 0; i < count; i++) {
      const vertex = geometry.index ? geometry.index.getX(i) : i;
      point.fromBufferAttribute(geometry.attributes.position, vertex).applyMatrix4(matrix).toArray(positions, positions.length);
      normal.fromBufferAttribute(geometry.attributes.normal, vertex).applyMatrix3(normalMatrix).normalize().toArray(normals, normals.length);
      if (geometry.attributes.color) tint.fromBufferAttribute(geometry.attributes.color, vertex); else tint.set('#ffffff');
      tint.toArray(colors, colors.length);
    }
    ranges.push({ name: component.name, start, count: positions.length / 3 - start });
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeBoundingBox(); geometry.computeBoundingSphere(); geometry.userData.components = ranges;
  return geometry;
}

/** Local coordinates: case centre in X/Z, shelf-relative Y with a 22.5mm margin. */
export function buildArtemisExhibitGeometry(THREE, index) {
  if (!Number.isInteger(index) || index < 0 || index > 5) throw new RangeError('Artemis exhibit index must be 0..5');
  const components = [];
  const matrix = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, scale = [1, 1, 1]) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(...scale));
  const put = (role, name, geometry, transform = new THREE.Matrix4()) => { components.push({ role, name, geometry, matrix: transform }); return transform; };
  const rod = (name, a, b, radius = .009) => {
    const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b), direction = to.clone().sub(from);
    const transform = new THREE.Matrix4().compose(from.add(to).multiplyScalar(.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize()), new THREE.Vector3(1, 1, 1));
    put('platinum', name, new THREE.CylinderGeometry(radius, radius, direction.length(), 8, 1, false), transform);
  };
  const prongs = (name, transform, radius, count = 4, base = null) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.PI / 4 + i * Math.PI * 2 / count;
      const a = base ? new THREE.Vector3(base[0] + Math.cos(angle) * .036, base[1], base[2] + Math.sin(angle) * .036)
        : new THREE.Vector3(Math.cos(angle) * radius * .52, -.075, Math.sin(angle) * radius * .52).applyMatrix4(transform);
      const b = new THREE.Vector3(Math.cos(angle) * radius * .97, .016, Math.sin(angle) * radius * .97).applyMatrix4(transform);
      rod(`${name} prong${i + 1}`, a.toArray(), b.toArray(), .008);
    }
  };
  const halo = (name, transform, radius, tube = .009) => put('platinum', name, new THREE.TorusGeometry(radius, tube, 6, 32), transform.clone().multiply(matrix(0, -.003, 0, Math.PI / 2)));
  put('platinum', 'Inset platinum tray rim', bevelBlock(THREE, 1.50, .025, .84, .005), matrix(0, .0175, 0));
  put('velvet', 'Black velvet tray', bevelBlock(THREE, 1.46, .052, .80), matrix(0, .053, 0));
  if (index === 0 || index === 1) {
    put('platinum', 'Continuous platinum ring band', new THREE.TorusGeometry(.178, .023, 8, 48), matrix(0, .258, .012, -.10, index === 0 ? -.22 : .17));
    put('velvet', 'Low ring saddle', bevelBlock(THREE, .20, .095, .17), matrix(0, .108, .012));
    const setting = matrix(0, .436, .040, .48, index === 0 ? -.16 : .20);
    const gem = index === 0 ? buildRoundCutGeometry(THREE) : buildStepCutGeometry(THREE);
    put('gems', names[index], gem, setting); prongs('Raised ring setting', setting, index === 0 ? .15 : .145);
    if (index === 1) for (const sign of [-1, 1]) {
      const shoulder = matrix(sign * .188, .387, .022, .40, sign * .22, -sign * .20);
      put('gems', 'Small shoulder baguette', buildStepCutGeometry(THREE, { width: .085, depth: .067, crownHeight: .016, pavilionDepth: .035, girdleHeight: .004 }), shoulder);
      rod('Step-cut shoulder support', [sign * .13, .37, .01], [sign * .215, .373, .028], .016);
    }
  } else if (index === 2) {
    put('velvet', 'Pendant presentation slope', bevelBlock(THREE, .66, .50, .08), matrix(0, .326, -.10, -.12));
    const setting = matrix(0, .266, .018, Math.PI / 2, 0, -.12);
    put('gems', 'Round halo pendant', buildRoundCutGeometry(THREE, { radius: .14, crownHeight: .049, pavilionDepth: .12 }), setting);
    halo('Fine pendant halo', setting, .15); prongs('Pendant setting', setting, .14);
    put('platinum', 'Pendant bail', new THREE.TorusGeometry(.028, .007, 6, 20), matrix(0, .426, .035));
    put('platinum', 'Folded necklace chain', new THREE.TorusGeometry(.095, .0065, 6, 40), matrix(0, .511, -.004, -.10, 0, .08, [1.37, .76, 1]));
  } else if (index === 3) {
    put('velvet', 'Paired earring tablet', bevelBlock(THREE, .79, .50, .075), matrix(0, .326, -.097, -.12));
    for (const sign of [-1, 1]) {
      const top = matrix(sign * .202, .476, .021, Math.PI / 2);
      put('gems', 'Round earring stud', buildRoundCutGeometry(THREE, { radius: .061, crownHeight: .022, pavilionDepth: .050, girdleHeight: .004 }), top);
      halo('Stud setting', top, .063, .006);
      const drop = matrix(sign * .202, .258, .030, Math.PI / 2, 0, sign * .065);
      put('gems', 'Clipped step-cut drop', buildStepCutGeometry(THREE, { width: .153, depth: .22, crownHeight: .031, pavilionDepth: .071, girdleHeight: .005 }), drop);
      prongs('Drop setting', drop, .092);
      rod('Articulated earring link', [sign * .202, .393, .048], [sign * .202, .439, .048], .007);
    }
  } else if (index === 4) {
    put('platinum', 'Continuous oval bracelet', new THREE.TorusGeometry(.30, .017, 8, 48), matrix(0, .149, 0, Math.PI / 2, 0, 0, [1.30, .83, 1]));
    for (const sign of [-1, 1]) put('velvet', 'Low bracelet saddle', bevelBlock(THREE, .12, .066, .10, .008), matrix(sign * .20, .112, -.214));
    for (let i = 0; i < 7; i++) {
      const angle = .16 + i * (Math.PI - .32) / 6;
      const x = Math.cos(angle) * .390, z = Math.sin(angle) * .249;
      const setting = matrix(x, .165, z, .16, 0, 0);
      put('gems', 'Bracelet round-cut stone', buildRoundCutGeometry(THREE, { radius: .056, crownHeight: .020, pavilionDepth: .047, girdleHeight: .0035 }), setting);
      halo('Bracelet bezel', setting, .057, .006);
    }
  } else {
    for (const sign of [-1, 1]) {
      const setting = matrix(sign * .29, sign < 0 ? .301 : .285, .015, .32, sign * .24, sign * .12);
      put('gems', sign < 0 ? 'Loose round-cut study' : 'Loose step-cut study', sign < 0
        ? buildRoundCutGeometry(THREE, { radius: .185, crownHeight: .064, pavilionDepth: .155 })
        : buildStepCutGeometry(THREE, { width: .31, depth: .255, crownHeight: .055, pavilionDepth: .13 }), setting);
      put('velvet', 'Low loose-stone rest', new THREE.CylinderGeometry(.052, .088, .088, 16), matrix(sign * .29, .119, -.012));
      prongs('Loose-stone cradle', setting, sign < 0 ? .185 : .15, 3, [sign * .29, .154, -.012]);
    }
  }
  const batches = Object.fromEntries(['gems', 'platinum', 'velvet'].map(role => [role, merge(THREE, components, role)]));
  const bounds = new THREE.Box3(); for (const geometry of Object.values(batches)) bounds.union(geometry.boundingBox);
  const componentInfo = components.map(part => ({ name: part.name, role: part.role, geometry: part.geometry, matrix: part.matrix }));
  let disposed = false;
  return { name: names[index], batches, bounds, components: componentInfo,
    dispose() { if (disposed) return; disposed = true; for (const geometry of Object.values(batches)) geometry.dispose(); for (const part of components) part.geometry.dispose(); } };
}

/** Add only the contained exhibits, leaving host cases, glass and colliders intact. */
export function addArtemisAtelier({ THREE, scene, room }) {
  if (room.god !== 'Artemis') return null;
  if (![room.side, room.y, room.z].every(Number.isFinite) || Math.abs(room.side) !== 1) throw new RangeError('Artemis atelier requires a public room placement');
  let rooms = installed.get(scene); if (!rooms) { rooms = new Map(); installed.set(scene, rooms); }
  const key = `${room.side}/${room.y}/${room.z}`; if (rooms.has(key)) return rooms.get(key);
  const group = new THREE.Group(); group.name = 'Artemis original diamond atelier'; group.position.set(room.side * 29, room.y, room.z);
  const parts = [], exhibits = [];
  let index = 0;
  for (const sign of [-1, 1]) for (const u of [4.7, 8.2, 11.7]) {
    const exhibit = buildArtemisExhibitGeometry(THREE, index);
    const transform = new THREE.Matrix4().compose(new THREE.Vector3(room.side * u, 1.395, sign * 5.1),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), sign > 0 ? Math.PI : 0), new THREE.Vector3(1, 1, 1));
    for (const [role, geometry] of Object.entries(exhibit.batches)) parts.push({ role, name: `${index + 1}: ${exhibit.name}`, geometry, matrix: transform });
    exhibits.push({ index, name: exhibit.name, u, v: sign * 5.1, localBounds: { min: exhibit.bounds.min.toArray(), max: exhibit.bounds.max.toArray() },
      roomBounds: { min: exhibit.bounds.clone().applyMatrix4(transform).min.toArray(), max: exhibit.bounds.clone().applyMatrix4(transform).max.toArray() } });
    for (const component of exhibit.components) component.geometry.dispose();
    index++;
  }
  const materials = {
    gems: new THREE.MeshStandardMaterial({ name: 'Artemis opaque cut-stone approximation', color: '#ffffff', metalness: .28, roughness: .17, vertexColors: true }),
    platinum: new THREE.MeshStandardMaterial({ name: 'Artemis platinum exhibit settings', color: '#dde4e8', metalness: 1, roughness: .29, vertexColors: true }),
    velvet: new THREE.MeshStandardMaterial({ name: 'Artemis matte black display velvet', color: '#12171c', metalness: 0, roughness: .93, vertexColors: true }),
  };
  let triangles = 0, attributeBytes = 0;
  for (const [role, material] of Object.entries(materials)) {
    const geometry = merge(THREE, parts, role); const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `Artemis atelier ${role}`; mesh.receiveShadow = true; group.add(mesh);
    triangles += geometry.attributes.position.count / 3;
    attributeBytes += Object.values(geometry.attributes).reduce((sum, attribute) => sum + attribute.array.byteLength, 0);
  }
  for (const part of parts) part.geometry.dispose();
  const stats = Object.freeze({ version: 1, exhibits: 6, meshes: 3, materials: 3, mainPassDrawCalls: 3, triangles, attributeBytes,
    textures: 0, lights: 0, animatedObjects: 0, colliderChanges: 0, originalGeometry: true, physicalRefraction: false });
  group.userData.artemisAtelier = { stats, exhibits }; scene.add(group);
  let disposed = false;
  const result = { group, exhibits, stats, dispose() {
    if (disposed) return; disposed = true; group.removeFromParent();
    for (const mesh of group.children) { mesh.geometry.dispose(); mesh.material.dispose(); }
    rooms.delete(key);
  } };
  rooms.set(key, result); return result;
}
