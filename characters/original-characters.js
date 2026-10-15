import * as THREE from '../vendor/three.module.min.js';
import {GLTFLoader} from '../vendor/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from '../vendor/addons/libs/meshopt_decoder.module.js';

// All five recovered Huntress variants share a verified pose/bind mismatch.
// Keep the source intact, but do not render a known severely deformed body.
export const HUNTRESS_REPAIR_HOLD=true;

// Recovered from liminal-flight's authored character loaders. The original
// glTF materials, UV channels, skeleton and source clip remain intact.
export const ORIGINAL_CHARACTERS = Object.freeze({
  sorceress: {name:'Sorceress',author:'Pigcraft',file:'sorceress.glb',maps:'4K',
    source:'https://sketchfab.com/3d-models/dark-fantasy-sorceress-crystal-staff-a307ea3800d748c487d26235bb43ecc0',
    changes:'Existing Meshopt derivative; original 4K textures and both UV channels retained.',
    sha256:'c0896a772634fcfb72c78c76ca8c118b526675ea2c621180ede9146e405752c0'},
  huntress: {name:'Huntress',author:'Wilson',file:'huntress.glb',maps:'2K / 4K',
    source:'https://sketchfab.com/3d-models/huntress-19ceb83a896c4d668b0f30a6fc58d563',
    changes:'Existing animation buffer-view repair; original geometry, rig and full-resolution textures retained.',
    sha256:'e48b008e3787adf14d7817ad1ba8d961244e95b8f82b0ba9953a2869e41afc1b'}
});
export function originalCharacterChoice(){
  const query=new URLSearchParams(location.search).get('body');
  if(Object.hasOwn(ORIGINAL_CHARACTERS,query))return query;
  try {const saved=localStorage.getItem('witchline-body');if(Object.hasOwn(ORIGINAL_CHARACTERS,saved))return saved;}catch{}
  return 'sorceress';
}
export function saveOriginalCharacterChoice(id){
  if(!Object.hasOwn(ORIGINAL_CHARACTERS,id))throw new RangeError('Unknown character');
  try{localStorage.setItem('witchline-body',id);}catch{}
}
function release(root){
  const geometries=new Set(),materials=new Set(),textures=new Set(),images=new Set(),skeletons=new Set();
  root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.skeleton)skeletons.add(o.skeleton);for(const m of [].concat(o.material||[]))materials.add(m);});
  for(const m of materials)for(const v of Object.values(m))if(v?.isTexture)textures.add(v);
  for(const t of textures){if(t.source?.data)images.add(t.source.data);t.dispose();}
  for(const i of images)i.close?.();
  for(const m of materials)m.dispose();for(const g of geometries)g.dispose();for(const s of skeletons)s.dispose();
  root.removeFromParent();
}
export async function loadOriginalCharacter(id,{height=2.2,castShadow=true,anisotropy=8}={}){
  if(id==='huntress'&&HUNTRESS_REPAIR_HOLD)throw new Error('Huntress is preserved but held for a verified skin-binding repair.');
  const credit=ORIGINAL_CHARACTERS[id];if(!credit)throw new RangeError('Unknown character');
  const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(new URL('./originals/'+credit.file,import.meta.url).href);
  const model=gltf.scene,group=new THREE.Group();group.name=credit.name;
  let mixer=null,action=null,disposed=false,sourceMotion=true,sourceTime=0;
  try{
    // As in the existing loader, normalize before advancing any source animation.
    const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
    if(!Number.isFinite(size.y)||size.y<=0)throw new Error('Invalid source model bounds');
    const scale=height/size.y,mount=new THREE.Group();mount.scale.setScalar(scale);mount.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);mount.add(model);group.add(mount);
    const status={id,name:credit.name,source:credit.source,sha256:credit.sha256,rigged:false,joints:0,triangles:0,animations:gltf.animations.length,textureSizes:[],normalUV:[],animationActive:false};
    const textures=new Set(),skeletons=new Set();
    model.traverse(o=>{
      if(!o.isMesh)return;
      o.castShadow=castShadow;o.receiveShadow=true;
      status.rigged ||= !!o.isSkinnedMesh;
      status.triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;
      if(o.skeleton)skeletons.add(o.skeleton);
      for(const material of [].concat(o.material)){
        // In particular: Sorceress's normal texture is UV1. Do not replace it
        // with UV0 or regenerate tangents against the wrong atlas.
        if(material.normalMap)status.normalUV.push(material.normalMap.channel);
        for(const texture of Object.values(material))if(texture?.isTexture){texture.anisotropy=anisotropy;textures.add(texture);}
      }
    });
    status.joints=[...skeletons].reduce((n,s)=>n+s.bones.length,0);
    status.textureSizes=[...new Set([...textures].map(t=>`${t.image?.width}×${t.image?.height}`))];
    status.normalUV=[...new Set(status.normalUV)];
    const clip=gltf.animations.find(c=>Number.isFinite(c.duration)&&c.duration>0);
    if(clip){mixer=new THREE.AnimationMixer(model);action=mixer.clipAction(clip);action.play();mixer.setTime(0);status.clipName=clip.name;status.clipSeconds=clip.duration;}
    status.sourceMotion=!!mixer;
    group.userData.character=status;
    // This exported source's head-bone origin is substantially above its
    // rendered eyes. Anchor framing to evaluated skin vertices, not the joint.
    let eyes;
    model.traverse(o=>{if(!eyes&&o.isMesh&&[].concat(o.material||[]).some(m=>m.name==='aiStandardSurface9'))eyes=o;});
    const eyeVertex=new THREE.Vector3();
    group.userData.getPortraitTarget=out=>{
      group.updateMatrixWorld(true);
      if(eyes){
        const count=eyes.geometry.attributes.position.count,stride=Math.max(1,Math.ceil(count/128));let samples=0;
        out.set(0,0,0);
        for(let i=0;i<count;i+=stride){eyes.getVertexPosition(i,eyeVertex);out.add(eyeVertex.applyMatrix4(eyes.matrixWorld));samples++;}
        if(samples){out.divideScalar(samples);out.y+=height*.012;return out;}
      }
      out.set(0,height*.89,0);return group.localToWorld(out);
    };
    // Stopping restores the imported node transforms through the mixer's saved
    // original bindings. It does not rewrite inverse binds or fabricate a rig.
    group.userData.setSourceMotion=enabled=>{
      if(disposed)return;
      sourceMotion=!!enabled;status.sourceMotion=sourceMotion&&!!mixer;
      if(action){if(sourceMotion){action.play();mixer.setTime(sourceTime);}else action.stop();}
      model.updateMatrixWorld(true);
    };
    group.userData.setCharacterTime=time=>{if(disposed)return;sourceTime=Math.max(0,Number(time)||0);if(sourceMotion)mixer?.setTime(sourceTime);};
    group.userData.updateCharacter=dt=>{if(disposed||!sourceMotion)return;const delta=Math.max(0,Math.min(.1,Number(dt)||0));sourceTime+=delta;mixer?.update(delta);};
    group.userData.disposeCharacter=()=>{if(disposed)return;disposed=true;mixer?.stopAllAction();mixer?.uncacheRoot(model);release(model);group.clear();group.removeFromParent();};
    return group;
  }catch(error){mixer?.stopAllAction();release(model);throw error;}
}
