import * as THREE from '../vendor/three.module.min.js';
// Share a small request queue across faces and wardrobes. Avoid a burst of
// twenty photographic maps competing with the required model/animation files.
const pending=[],cache=new Map();let active=0;
// These two square garment normal maps ship at 4096px. Decode them at 2048px
// before upload: their RGBA mip chains use 128 MiB less in total. Skin, hair,
// portraits and the original source files retain their existing resolution.
const garmentNormalMaps=new Set(['wardrobe-female_casualsuit01-normal.png','wardrobe-female_casualsuit02-normal.png']);
function pump(){while(active<3&&pending.length){active++;const task=pending.shift();task().finally(()=>{active--;pump();});}}
async function loadBitmap(url){
  const options={imageOrientation:'none',premultiplyAlpha:'none'};
  if(garmentNormalMaps.has(new URL(url).pathname.split('/').pop()))Object.assign(options,{resizeWidth:2048,resizeHeight:2048,resizeQuality:'high'});
  let lastError;
  for(let attempt=0;attempt<3;attempt++){
    try{return await new THREE.ImageBitmapLoader().setOptions(options).loadAsync(url);}
    catch(error){lastError=error;if(attempt<2)await new Promise(resolve=>setTimeout(resolve,250*(attempt+1)));}
  }
  throw lastError;
}
export function loadCharacterTexture(file,colorSpace=THREE.SRGBColorSpace){
  const url=new URL('./'+file,import.meta.url).href,key=url+'|'+colorSpace;
  if(!cache.has(key))cache.set(key,new Promise((resolve,reject)=>{
    pending.push(async()=>{try{const bitmap=await loadBitmap(url);const texture=new THREE.Texture(bitmap);texture.flipY=false;texture.colorSpace=colorSpace;texture.anisotropy=4;texture.needsUpdate=true;resolve(texture);}catch(error){cache.delete(key);reject(error);}});pump();
  }));return cache.get(key);
}
