import * as THREE from './vendor/three.module.min.js';

// r180 keeps the current program on a material. Sharing one material between
// instanced and ordinary meshes repeatedly invalidates that program selection.
// Keep identical opaque material values and texture references in each cohort.
export function createMaterialCohorts(scene){
 const originals=new Map(),clones=new Map();let enabled=false;
 function restore(){for(const [object,material]of originals)object.material=material;originals.clear();}
 return {
  setEnabled(value){restore();enabled=!!value;if(!enabled)return;
   const regular=new Set(),instanced=[];
   scene.traverse(object=>{if(!object.isMesh||Array.isArray(object.material))return;if(object.isInstancedMesh)instanced.push(object);else regular.add(object.material);});
   for(const object of instanced){const material=object.material;
    if(!regular.has(material)||material.transparent||material.onBeforeCompile!==THREE.Material.prototype.onBeforeCompile||material.customProgramCacheKey!==THREE.Material.prototype.customProgramCacheKey)continue;
    let copy=clones.get(material);if(!copy){copy=material.clone();clones.set(material,copy);}else copy.copy(material);
    originals.set(object,material);object.material=copy;
   }
  },
  get info(){return {enabled,splitMaterials:clones.size,instancedObjects:originals.size};},
  dispose(){restore();for(const copy of clones.values())copy.dispose();clones.clear();enabled=false;}
 };
}
