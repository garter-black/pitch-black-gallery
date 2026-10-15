import * as THREE from '../vendor/three.module.min.js';
import { GLTFLoader } from '../vendor/addons/loaders/GLTFLoader.js';
import { loadCharacterTexture } from './god-textures.js';

// Everyday outfits are individual styling, independent of domain powers.
export const GOD_WARDROBES=Object.freeze({
  Hecate:{style:'tank-jeans',top:'#28272b',bottom:'#333c46'},
  Athena:{style:'tee-jeans',top:'#e9e1cc',bottom:'#314559'},
  Artemis:{style:'blouse-jeans',top:'#b9d7e0',bottom:'#416783'},
  Nyx:{style:'tee-jeans',top:'#25262a',bottom:'#2a2c33'},
  Hera:{style:'blouse-skirt',top:'#e7dcc4',bottom:'#2c3344'},
  Hedone:{style:'tank-shorts',top:'#ad3642',bottom:'#537185'},
  Aphrodite:{style:'summer-dress',top:'#d9bfc1',bottom:'#d9bfc1'},
  Hestia:{style:'blouse-jeans',top:'#92a28d',bottom:'#354754'},
  Thalia:{style:'tank-shorts',top:'#2d6096',bottom:'#7490a4'},
  Persephone:{style:'summer-dress',top:'#70415e',bottom:'#70415e'},
  Euterpe:{style:'tee-shorts',top:'#262a31',bottom:'#303a48'},
  Erato:{style:'tank-jeans',top:'#813d4f',bottom:'#354453'},
  Cassandra:{style:'tee-jeans',top:'#355d49',bottom:'#9c987f'},
  Circe:{style:'tee-jeans',top:'#deddd3',bottom:'#535d65'},
  Selene:{style:'tank-jeans',top:'#dedfdb',bottom:'#929da6'},
  Demeter:{style:'blouse-skirt',top:'#697951',bottom:'#b3a68c'},
  Medea:{style:'blouse-jeans',top:'#564439',bottom:'#272c32'},
  Peitho:{style:'blouse-skirt',top:'#e1d3b8',bottom:'#656b70'},
  Styx:{style:'tank-jeans',top:'#33393e',bottom:'#555e68'},
  Eos:{style:'summer-dress',top:'#dca78c',bottom:'#dca78c'},
});
let promise;
function preloadWardrobeGeometry(){
  if(!promise)promise=Promise.all([
    new GLTFLoader().loadAsync(new URL('./god-wardrobe.glb',import.meta.url).href),
    fetch(new URL('./god-wardrobe.json',import.meta.url)).then(r=>{if(!r.ok)throw new Error('Wardrobe unavailable');return r.json();}),
  ]).then(([gltf,meta])=>{
    const meshes={};gltf.scene.traverse(o=>{if(o.isSkinnedMesh)meshes[o.name]=o;});return {meta,meshes};
  }).catch(e=>{promise=undefined;throw e;});return promise;
}
/** A named outfit loads its normal/AO maps and trainers, sharing successful maps. */
export async function preloadGodWardrobe(name){
  const asset=await preloadWardrobeGeometry(),outfit=GOD_WARDROBES[name]||GOD_WARDROBES.Hecate;
  const keys=name===undefined?Object.keys(asset.meta.textures):[...new Set([
    ...asset.meta.styles[outfit.style].parts.flatMap(part=>part.source?[part.source+':normal',part.source+':ao']:[]),
    'shoes05:diffuse'
  ])];
  const textures=Object.fromEntries(await Promise.all(keys.map(async key=>{
    const file=asset.meta.textures[key];if(!file)throw new Error('Missing wardrobe texture '+key);
    return [key,await loadCharacterTexture(file,key.endsWith(':diffuse')?THREE.SRGBColorSpace:THREE.NoColorSpace)];
  })));
  return {...asset,textures};
}
export function applyGodWardrobe(model,name,asset,{castShadow=false}={}){
  const outfit=GOD_WARDROBES[name]||GOD_WARDROBES.Hecate;
  let anchor,skin;const hidden=[];
  model.traverse(o=>{
    if(!o.isSkinnedMesh)return;
    if(o.material.name.startsWith('Skin · ')){anchor=o;skin=o.material;return;}
    if(o.material.name.startsWith('Eyes')||o.material.name==='Ponytail · obsidian'||o.name.includes(' · fitted '))return;
    o.visible=false;hidden.push(o);
  });
  if(!anchor)throw new Error('Clothed character rig unavailable');
  const added=[],materials=[];
  function attach(meshName,material){
    // GLTFLoader sanitizes dots/spaces but keeps the underscore identifiers.
    const template=asset.meshes[meshName];if(!template)throw new Error('Missing garment '+meshName);
    const mesh=new THREE.SkinnedMesh(template.geometry,material);mesh.name=meshName;mesh.bind(anchor.skeleton,anchor.bindMatrix);mesh.castShadow=castShadow;mesh.receiveShadow=true;anchor.parent.add(mesh);added.push(mesh);
  }
  for(const part of asset.meta.styles[outfit.style].parts){
    let material=skin;
    if(part.part!=='skin'){
      material=new THREE.MeshStandardMaterial({name:name+' · '+part.part,color:outfit[part.part],roughness:.9,metalness:0,side:THREE.DoubleSide,normalMap:asset.textures[part.source+':normal'],normalScale:new THREE.Vector2(.5,.5),aoMap:asset.textures[part.source+':ao'],aoMapIntensity:.45});
      // glTF's UVs are preserved. The source logo/diffuse texture is deliberately
      // not used on plain cotton, linen and denim garments.
      materials.push(material);
    }
    attach(part.mesh,material);
  }
  const shoe=new THREE.MeshStandardMaterial({name:name+' · everyday trainers',map:asset.textures['shoes05:diffuse'],roughness:.88,metalness:0});materials.push(shoe);attach(asset.meta.shoe,shoe);
  const stats={style:outfit.style,contemporary:true,highCollar:false,armour:false,sharedGarmentGeometry:true};model.userData.wardrobe=stats;let disposed=false;
  return {stats,meshes:added,dispose(){if(disposed)return;disposed=true;added.forEach(m=>m.removeFromParent());materials.forEach(m=>m.dispose());}};
}
