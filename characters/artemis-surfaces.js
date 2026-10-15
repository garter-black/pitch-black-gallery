// Material-only direction for the exact Artemis NPC. Call after its private
// material clones, equipment and hair exist. This module owns no GPU resources.
const applied = new WeakMap();

// Color, roughness, metalness, optional emission. The accepted scene controls
// its environment intensity; this module does not change reflection ownership.
// Names are preserved because the accepted factories use them for ownership.
const finishes = Object.freeze({
  'Sapphire tailored shell': ['#c5cbd0', .64, 0],
  'Tailored jacket panels': ['#e1e4e2', .41, 0],
  'Graphite undersuit': ['#151e24', .70, 0],
  'Boots and gloves': ['#151b21', .27, 0],
  'Silver articulated trim': ['#d4dee2', .32, 1],
  'Domain accent': ['#7fb5c9', .18, 0, '#000000'],
  'Ponytail · obsidian': ['#2b3037', .60, 0],
  'Skin · adult 25': [null, .58, 0],
  'Eyes': [null, .10, 0],
  'Artemis brushed silver equipment': ['#ffffff', .47, 1],
  'Artemis original obsidian hair locks': [null, .44, 0],
});

/** Edit only the already-private materials owned by the Artemis NPC factory. */
export function applyArtemisSurfaces(model) {
  if (applied.has(model)) return applied.get(model);
  const materials = new Set();
  model.traverse(object => {
    if (!object.isMesh) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
  });
  const changed = [];
  for (const material of materials) {
    const finish = finishes[material.name];
    if (!finish || !material.isMeshStandardMaterial) continue;
    const [color, roughness, metalness, emissive] = finish;
    if (color !== null) material.color.set(color);
    material.roughness = roughness;
    material.metalness = metalness;
    if (emissive !== undefined) material.emissive.set(emissive);
    // Existing maps, map color spaces, normal scales, alpha/skinning flags and
    // material identities remain intact. No shader define or needsUpdate change.
    changed.push(material.name);
  }
  const result = Object.freeze({ version: 1, materialsRefined: changed.length,
    materialNames: Object.freeze(changed), addedMaterials: 0, addedTextures: 0,
    addedGeometry: 0, addedDrawCalls: 0, physicalGemOrSubsurfaceSimulation: false });
  applied.set(model, result);
  return result;
}
