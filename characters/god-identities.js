import * as THREE from '../vendor/three.module.min.js';
import { loadCharacterTexture } from './god-textures.js';
import { attachLongHairMotion } from './god-hair-motion.js';
import { preloadFacialMotion, attachFacialMotion } from './god-facial-motion.js';
let identitiesPromise;
function preloadIdentityGeometry(){
  if(!identitiesPromise)identitiesPromise=Promise.all([
    fetch(new URL('./god-identities.json',import.meta.url)).then(r=>{if(!r.ok)throw new Error('Character identities unavailable');return r.json()}),
    fetch(new URL('./god-identities.bin',import.meta.url)).then(r=>{if(!r.ok)throw new Error('Character geometry unavailable');return r.arrayBuffer()})
  ]).then(([meta,buffer])=>{if(meta.version!==1||meta.byteLength!==buffer.byteLength||Object.keys(meta.identities).length!==20)throw new Error('Invalid character identity asset');return {meta,buffer}}).catch(e=>{identitiesPromise=undefined;throw e});
  return identitiesPromise;
}

/** A named avatar waits only for its own maps. Omit name to warm the full cast. */
export async function preloadGodIdentities(name){
  // Optional expressions load alongside the required character assets. A failed
  // expression request cannot prevent the world or player from loading.
  const facialReady=preloadFacialMotion().catch(()=>null);
  const asset=await preloadIdentityGeometry(),catalog={...asset.meta.groom,...asset.meta.skinTextures};
  const identity=asset.meta.identities[name]||asset.meta.identities.Hecate;
  const keys=name===undefined?Object.keys(catalog):[...new Set([...(identity.groom||[]).map(part=>part.style),identity.skinTexture].filter(Boolean))];
  const textures=Object.fromEntries(await Promise.all(keys.map(async key=>{
    if(!catalog[key]?.texture)throw new Error('Missing character texture '+key);
    return [key,await loadCharacterTexture(catalog[key].texture)];
  })));
  // Failed maps remain retryable in the shared texture loader without throwing
  // away valid geometry or rejecting another avatar's independent dependency set.
  return {...asset,textures,facialReady};
}
function values(asset,desc){
  if(!desc||desc.offset<0||desc.offset%4||desc.count<0)throw new Error('Invalid character attribute');
  const Type=desc.type==='u16'?Uint16Array:Float32Array;
  if(desc.offset+desc.count*Type.BYTES_PER_ELEMENT>asset.buffer.byteLength)throw new Error('Truncated character geometry');
  return new Type(asset.buffer,desc.offset,desc.count);
}
function attribute(asset,desc){return new THREE.BufferAttribute(values(asset,desc),desc.itemSize)}

/** Per-avatar owned geometry/materials; shared base and texture maps are untouched. */
export function applyGodIdentity(model,name,asset){
  const d=asset.meta.identities[name]||asset.meta.identities.Hecate;
  const hecateStyle=d===asset.meta.identities.Hecate; // Includes the local explorer's existing identity fallback.
  const geometries=[],materials=[];let face,eyes,hair;
  model.traverse(o=>{if(!o.isSkinnedMesh)return;if(o.geometry.attributes.position.count===4444&&o.material.name==='Skin · adult 25')face=o;else if(o.material.name==='Eyes')eyes=o;else if(o.material.name==='Ponytail · obsidian')hair=o});
  if(!face||!eyes||!hair)throw new Error('Accepted character parts not found');
  function replaceGeometry(o,p,n){const g=o.geometry.clone();g.setAttribute('position',attribute(asset,d[p]));g.setAttribute('normal',attribute(asset,d[n]));g.computeBoundingBox();g.computeBoundingSphere();o.geometry=g;geometries.push(g);}
  replaceGeometry(face,'facePosition','faceNormal');replaceGeometry(hair,'hairPosition','hairNormal');
  const eyeGeo=new THREE.BufferGeometry();eyeGeo.setAttribute('position',attribute(asset,d.eyePosition));eyeGeo.setAttribute('normal',attribute(asset,d.eyeNormal));eyeGeo.setAttribute('uv',attribute(asset,asset.meta.eyes.uv));eyeGeo.setIndex(attribute(asset,asset.meta.eyes.index));
  const count=asset.meta.eyes.vertices,joints=new Uint16Array(count*4),weights=new Float32Array(count*4);
  for(let i=0;i<count;i++){joints[i*4]=asset.meta.eyes.headJoint;weights[i*4]=1;}
  eyeGeo.setAttribute('skinIndex',new THREE.BufferAttribute(joints,4));eyeGeo.setAttribute('skinWeight',new THREE.BufferAttribute(weights,4));eyeGeo.computeBoundingBox();eyeGeo.computeBoundingSphere();eyes.geometry=eyeGeo;geometries.push(eyeGeo);
  const skin=new THREE.MeshPhysicalMaterial({name:'Skin · '+name,map:d.skinTexture?asset.textures[d.skinTexture]:face.material.map,color:d.skinTint||d.skin,roughness:.62,metalness:0,specularIntensity:.35,specularColor:'#ffe6db',sheen:.08,sheenColor:'#cf9d8b',sheenRoughness:1});
  face.material=skin;materials.push(skin);
  const eye=new THREE.MeshPhysicalMaterial({name:'Eyes · '+name,map:eyes.material.map,alphaTest:.25,roughness:.32,metalness:0,ior:1.38,specularIntensity:.45});
  // The accepted eye atlas has two photographed irises. A colour-difference
  // mask also selected pink sclera and flattened the iris with a brightness
  // floor. Match the actual atlas regions and retain its radial luminance detail.
  const iris=new THREE.Color(d.iris);
  eye.onBeforeCompile=shader=>{shader.uniforms.irisTone={value:iris};shader.fragmentShader='uniform vec3 irisTone;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
float irisRadius = min(distance(vMapUv,vec2(0.706,0.296)),distance(vMapUv,vec2(0.290,0.708)));
float irisMask = smoothstep(0.035,0.041,irisRadius) * (1.0-smoothstep(0.103,0.116,irisRadius));
float irisLuma = dot(diffuseColor.rgb,vec3(0.2126,0.7152,0.0722));
float irisDetail = pow(clamp(irisLuma / 0.12,0.0,1.0),0.65);
diffuseColor.rgb = mix(diffuseColor.rgb,irisTone * irisDetail,irisMask);
`);};
  eye.customProgramCacheKey=()=> 'bg-iris-v2';eyes.material=eye;materials.push(eye);
  // The original scalp texture has a dark baked tone. These are pigment tints,
  // while authored geometric head variants provide the structural differences.
  hair.material.color.set(d.hair);hair.material.roughness=.53;
  const groomMeshes=[],responses=[],longHair=[];
  // The high-detail source eye already includes a curved cornea, but its UVs
  // point to the atlas's transparent corner and the colour pass discards it.
  // Reuse that authored surface for a separate specular-only wet reflection.
  // Additive black dielectric shading approximates the thin clear layer without
  // a scene transmission buffer or another image; it is not full refraction.
  const cornealIndices=[],surfaceIndices=[],eyeUvs=eyeGeo.attributes.uv.array,eyeIndex=eyeGeo.index.array;
  for(let i=0;i<eyeIndex.length;i+=3){const triangle=[eyeIndex[i],eyeIndex[i+1],eyeIndex[i+2]];(triangle.every(v=>eyeUvs[v*2]>.87&&eyeUvs[v*2+1]>.87)?cornealIndices:surfaceIndices).push(...triangle);}
  if(cornealIndices.length){
    eyeGeo.setIndex(surfaceIndices); // Partition existing triangles; do not draw the shell twice.
    const corneaGeo=new THREE.BufferGeometry();
    for(const [key,value]of Object.entries(eyeGeo.attributes))corneaGeo.setAttribute(key,value);
    corneaGeo.setIndex(cornealIndices);corneaGeo.boundingBox=eyeGeo.boundingBox.clone();corneaGeo.boundingSphere=eyeGeo.boundingSphere.clone();
    const corneaMaterial=new THREE.MeshPhysicalMaterial({name:'Eyes / corneal reflection · '+name,color:'#000000',roughness:.055,metalness:0,ior:1.38,specularIntensity:1,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,forceSinglePass:true});
    const cornea=new THREE.SkinnedMesh(corneaGeo,corneaMaterial);cornea.name=name+' · fitted corneal reflections';cornea.bind(eyes.skeleton,eyes.bindMatrix);cornea.receiveShadow=true;eyes.parent.add(cornea);groomMeshes.push(cornea);geometries.push(corneaGeo);materials.push(corneaMaterial);
  }
  for(const part of d.groom||[]){
    if(part.isHair)hair.visible=false;
    const template=asset.meta.groom[part.style],g=new THREE.BufferGeometry();g.setAttribute('position',attribute(asset,part.position));g.setAttribute('normal',attribute(asset,part.normal));g.setAttribute('uv',attribute(asset,template.uv));g.setIndex(attribute(asset,template.index));
    const indices=new Uint16Array(template.vertices*4),influences=new Float32Array(template.vertices*4);for(let i=0;i<template.vertices;i++){indices[4*i]=asset.meta.eyes.headJoint;influences[4*i]=1;}g.setAttribute('skinIndex',new THREE.BufferAttribute(indices,4));g.setAttribute('skinWeight',new THREE.BufferAttribute(influences,4));g.computeBoundingBox();g.computeBoundingSphere();
    // Brows/lashes contain soft alpha strands; a half-opacity cut discarded
    // most of them. Blend these thin overlays in one pass while retaining
    // depth testing against the face and opaque hair in front of them.
    const material=new THREE.MeshStandardMaterial({name:name+' · '+part.style,map:asset.textures[part.style],color:part.isHair?(hecateStyle?'#78747d':'#ddd6cf'):'#ffffff',roughness:part.isHair?(hecateStyle?.6:.78):1,alphaTest:part.isHair?.42:.01,alphaToCoverage:!!part.isHair,transparent:!part.isHair,depthWrite:!!part.isHair,forceSinglePass:true,side:THREE.DoubleSide});
    const groom=new THREE.SkinnedMesh(g,material);groom.name=name+' · fitted '+part.style;groom.bind(eyes.skeleton,eyes.bindMatrix);groom.receiveShadow=true;eyes.parent.add(groom);geometries.push(g);materials.push(material);groomMeshes.push(groom);
    if(part.isHair&&part.style==='hair_long01')longHair.push(groom);
  }
  const stats={name,geometryVersion:1,individualHead:true,headVertices:face.geometry.attributes.position.count,eyeVertices:count,skinTone:d.skin,irisTone:d.iris,hairstyle:d.groom?.find(p=>p.isHair)?.style||'ponytail',fittedBrows:true,fittedLashes:true,irisDetailVersion:2,cornealReflectionTriangles:cornealIndices.length/3};
  model.userData.godIdentity=stats;let disposed=false,facial;
  stats.facialMotion='loading';
  const facialReady=(asset.facialReady||Promise.resolve(null)).then(data=>{
    if(disposed)return false;
    if(!data){stats.facialMotion='unavailable';return false;}
    facial=attachFacialMotion(model,name,data);stats.facialMotion='ready';return true;
  }).catch(()=>{if(!disposed)stats.facialMotion='unavailable';return false;});
  return {stats,facialReady,updateFace(dt,options){if(!disposed)facial?.update(dt,options);},enableHairMotion(colliders){if(disposed||responses.length)return;for(const groom of longHair)responses.push(attachLongHairMotion(groom,asset.meta.eyes.headJoint,[face,...colliders]));if(responses.length)stats.secondaryHairMotion=responses.map(response=>response.stats);},updateHair(dt,options){if(!disposed)for(const response of responses)response.update(dt,options);},dispose(){if(disposed)return;disposed=true;facial?.dispose();responses.forEach(response=>response.dispose());groomMeshes.forEach(m=>m.removeFromParent());geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose())}};
}
