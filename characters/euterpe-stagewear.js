import * as THREE from '../vendor/three.module.min.js';

// Original stagewear pattern, evaluated in the shared garment bind coordinates.
// All cloth layers use the same pattern so intersecting inherited layers cannot
// reveal a differently coloured underlay. Geometry and skin data stay untouched.
const attached = new WeakMap();
const bodies = new Set(['Tailored_outer_suit', 'Continuous_fitted_jacket_panels', 'Opaque_full_undersuit']);
const collarName = 'Closed_structured_jacket_collar';
const finishes = Object.freeze({
  'Boots and gloves': ['#171b20', .48, .02],
  'Silver articulated trim': ['#c3b899', .38, .88],
  'Domain accent': ['#c69a53', .33, .58],
});
const vector = hex => 'vec3(' + new THREE.Color(hex).toArray().map(v => v.toFixed(9)).join(',') + ')';
const pattern = `
 varying vec3 vEuterpeStagewear;
 float stageBand(float v, float lo, float hi, float f) {
   return smoothstep(lo-f,lo+f,v)*(1.0-smoothstep(hi-f,hi+f,v));
 }
 vec3 stageBody(vec3 p) {
   float ax=abs(p.x);
   float front=smoothstep(0.025,0.065,p.z);
   float edge=0.065+0.055*smoothstep(1.10,1.38,p.y);
   float ribbon=stageBand(ax,edge,edge+0.034,0.002)*stageBand(p.y,1.075,1.407,0.003)*front;
   float yoke=smoothstep(0.12,0.16,ax)*stageBand(p.y,1.365,1.445,0.003);
   float legEdge=0.135+0.070*clamp((0.96-p.y)/0.72,0.0,1.0);
   float leg=stageBand(ax,legEdge-0.012,legEdge+0.012,0.002)*stageBand(p.y,0.39,0.99,0.004);
   float signal=stageBand(p.x,0.047,0.084,0.001)*front*
     (stageBand(p.y,1.247,1.252,0.001)+stageBand(p.y,1.263,1.268,0.001)+stageBand(p.y,1.279,1.284,0.001));
   vec3 fabric=mix(${vector('#192126')},${vector('#ad7737')},max(max(ribbon,yoke),leg*0.82));
   return mix(fabric,${vector('#c7b58a')},clamp(signal,0.0,1.0));
 }
 vec3 stageCollar(vec3 p) {
   float panel=stageBand(p.y,1.432,1.481,0.0015);
   return mix(${vector('#192126')},${vector('#ad7737')},panel);
 }
`;

function paint(material, mode) {
  material.color.set('#ffffff');
  material.roughness = mode === 'collar' ? .49 : .66;
  material.metalness = mode === 'collar' ? .32 : .04;
  material.onBeforeCompile = shader => {
    if (!shader.vertexShader.includes('#include <begin_vertex>') || !shader.fragmentShader.includes('#include <color_fragment>')) {
      throw new Error('Stagewear needs the pinned standard shader chunks');
    }
    shader.vertexShader = 'varying vec3 vEuterpeStagewear;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>', '#include <begin_vertex>\nvEuterpeStagewear = position;');
    shader.fragmentShader = pattern + shader.fragmentShader.replace('#include <color_fragment>',
      '#include <color_fragment>\ndiffuseColor.rgb *= ' + (mode === 'collar' ? 'stageCollar' : 'stageBody') + '(vEuterpeStagewear);');
  };
  material.customProgramCacheKey = () => 'black-garter/euterpe-stagewear/v2/' + mode;
  material.needsUpdate = true;
}

/** Apply only inside the exact Euterpe factory; the returned handle owns cleanup. */
export function applyEuterpeStagewear(model) {
  if (!model?.isObject3D) throw new TypeError('Stagewear needs an adult character model');
  if (attached.has(model)) return attached.get(model);
  const meshes=[]; model.traverse(object => { if (object.isMesh) meshes.push(object); });
  for (const name of [...bodies,collarName]) {
    const mesh=meshes.find(m=>m.name===name);
    if (!mesh?.isSkinnedMesh || !mesh.material?.isMeshStandardMaterial) throw new TypeError('Stagewear needs the supported adult garments');
  }
  const owned=new Set(), changes=[], finishCache=new Map();
  const release=()=>{for(const material of owned) material.dispose();owned.clear();};
  const restore=()=>{for(const change of changes)if(change.mesh.material===change.material)change.mesh.material=change.original;};
  try {
    for(const mesh of meshes) {
      const mode=bodies.has(mesh.name)?'body':mesh.name===collarName?'collar':null;
      const finish=finishes[mesh.material?.name];
      if(!mode&&!finish)continue;
      const original=mesh.material;
      let material=mode?null:finishCache.get(original);
      if(!material){
        material=original.clone();owned.add(material);
        if(mode)paint(material,mode);
        else {
          material.color.set(finish[0]);material.roughness=finish[1];material.metalness=finish[2];
          if(original.name==='Domain accent')material.emissive.set('#000000');
          finishCache.set(original,material);
        }
      }
      changes.push({mesh,original,material});
    }
    for(const change of changes)change.mesh.material=change.material;
    let disposed=false;
    const result={
      stats:Object.freeze({version:2,originalStagewearFinish:true,sharedAdultBase:true,
        materials:owned.size,patternedMaterials:4,patternModes:2,addedGeometry:0,addedAttributeBytes:0,
        addedTriangles:0,addedMeshes:0,addedDrawCalls:0,addedTextures:0,addedLights:0,
        perFrameCpuUpdates:0,deformationChanges:0,fragmentPattern:true}),
      dispose(){if(disposed)return;disposed=true;restore();release();attached.delete(model);},
    };
    attached.set(model,result);return result;
  }catch(error){restore();release();throw error;}
}
