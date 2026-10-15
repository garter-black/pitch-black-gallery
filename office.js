import * as THREE from './vendor/three.module.min.js';
import {ROOMS,TRACKS} from './world-data.js?v=sorceress-20260928-r2';
import {Movement} from './movement.js';
import {advanceFrame,frameSeconds} from './frame-timing.js';
import {configureArchitecturalLight,addArchitecture} from './architecture.js';
import {createMaterialCohorts} from './architecture-materials.js';
import {createGodAvatar,updateGodAvatars} from './characters/character-runtime.js?v=sorceress-20260928-r2';
import {createPlayerPresentation} from './player-avatar.js';
import {readViewPreferences,saveViewPreferences,cameraShortcut} from './view-controls.js';

const $ = selector => document.querySelector(selector);
const canvas = $('#scene');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
} catch {
  $('#loading').textContent='This browser could not start 3D graphics. Open the design study or try a browser with WebGL enabled.';
  throw new Error('WebGL renderer unavailable');
}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;
// Tone mapping: ACESFilmic stays the verified default. The AgX experiment (2026-09-24,
// receipt evidence/tone/) flattened the mid-tones of this glass hall under vision review,
// so AgX remains available for QA only: ?tone=agx.
const toneParam=new URLSearchParams(location.search).get('tone');
renderer.toneMapping=toneParam==='agx'?THREE.AgXToneMapping:THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=toneParam==='agx'?1.12:1.04;
const scene=new THREE.Scene();
scene.background=new THREE.Color('#0d151e');
scene.fog=new THREE.FogExp2('#101922',0.0049);
const camera=new THREE.PerspectiveCamera(69,innerWidth/innerHeight,0.06,190);
camera.rotation.order='YXZ';
const floors=[],obstacles=[],animated=[];
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const sharedBox=new THREE.BoxGeometry(1,1,1);
const mats={
  stone:new THREE.MeshStandardMaterial({color:'#797e7f',roughness:.74,metalness:.15}),
  dark:new THREE.MeshStandardMaterial({color:'#141b23',roughness:.42,metalness:.5}),
  silver:new THREE.MeshStandardMaterial({color:'#c2c7ca',roughness:.27,metalness:.77}),
  white:new THREE.MeshStandardMaterial({color:'#c7c6bd',roughness:.62,metalness:.18}),
  glow:new THREE.MeshBasicMaterial({color:'#e9f5fa'}),
  glass:new THREE.MeshStandardMaterial({color:'#a3b9bf',transparent:true,opacity:.12,roughness:.15,metalness:.2,depthWrite:false,side:THREE.DoubleSide}),
};
scene.add(new THREE.HemisphereLight('#d7e8ff','#42454a',2.2));
const sun=new THREE.DirectionalLight('#eff1e7',3.3);sun.position.set(-20,50,22);scene.add(sun);
const fill=new THREE.DirectionalLight('#95b1d2',1.1);fill.position.set(30,12,-25);scene.add(fill);
const architecturalLighting=configureArchitecturalLight({THREE,renderer,scene,mats});
// Image-based lighting: a small procedural room rendered once through PMREMGenerator gives
// every metal, glass and stone surface a believable reflection set with zero download cost.
// Cool window light from one side, warm ceiling accents, neutral shell - the hall's palette.
const environmentTexture=(()=>{
  const pmrem=new THREE.PMREMGenerator(renderer);
  const room=new THREE.Scene();
  const slab=(color,w,h,d,x,y,z)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshBasicMaterial({color}));mesh.position.set(x,y,z);room.add(mesh);return mesh;};
  slab('#3d434a',24,.5,24,0,4.2,0);        // ceiling shell
  slab('#23262a',24,.5,24,0,-.6,0);        // floor shell
  slab('#474d55',.5,5.4,24,-12,1.6,0);     // walls
  slab('#474d55',.5,5.4,24,12,1.6,0);
  slab('#353a41',24,5.4,.5,0,1.6,-12);
  slab('#9fc3e6',7,3.2,.4,-11.6,2.1,-5);   // cool window light
  slab('#9fc3e6',7,3.2,.4,-11.6,2.1,5);
  slab('#ffd9a8',3.4,.3,1.8,0,3.7,2.6);    // warm starlight accents
  slab('#ffc38a',2.4,.3,1.3,4.2,3.7,-3.2);
  slab('#eaf4ff',1.5,.3,1.5,-3.2,3.7,0);
  const target=pmrem.fromScene(room,0.03);
  pmrem.dispose();
  scene.environment=target.texture;
  if('environmentIntensity' in scene)scene.environmentIntensity=.42;
  return target.texture;
})();

function box(x,y,z,w,h,d,material=mats.stone,solid=false){
  const mesh=new THREE.Mesh(sharedBox,material);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);scene.add(mesh);
  if(solid)obstacles.push({minX:x-w/2,maxX:x+w/2,minY:y-h/2,maxY:y+h/2,minZ:z-d/2,maxZ:z+d/2});
  return mesh;
}
function floor(x,z,w,d,y=0,material=mats.dark){
  box(x,y-.16,z,w,.32,d,material,true);floors.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,y});
}
function label(text,x,y,z,width=6,height=1,color='#edf0ed',rotation=0,subline=''){
  const surface=document.createElement('canvas');surface.width=1024;surface.height=192;
  const ctx=surface.getContext('2d');ctx.clearRect(0,0,1024,192);ctx.textAlign='center';ctx.fillStyle=color;
  ctx.font='300 70px Helvetica, Arial, sans-serif';ctx.fillText(text.toUpperCase(),512,subline?91:124);
  if(subline){ctx.fillStyle='#aeb5bc';ctx.font='23px Helvetica, Arial, sans-serif';ctx.fillText(subline.toUpperCase(),512,151);}
  const texture=new THREE.CanvasTexture(surface);texture.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:THREE.DoubleSide});
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),material);mesh.position.set(x,y,z);mesh.rotation.y=rotation;scene.add(mesh);return mesh;
}
function ring(x,y,z,radius,tube,material=mats.glow,rotationX=Math.PI/2){
  const mesh=new THREE.Mesh(new THREE.TorusGeometry(radius,tube,8,72),material);mesh.position.set(x,y,z);mesh.rotation.x=rotationX;scene.add(mesh);return mesh;
}
function glow(color){return new THREE.MeshBasicMaterial({color});}
function point(color,x,y,z,intensity=35,distance=20){const light=new THREE.PointLight(color,intensity,distance,2);light.position.set(x,y,z);scene.add(light);return light;}

// An open, monumental shared atrium, with two galleries of ten rooms.
// The hub ends at each portal. Room floors own the surface beyond x = ±29,
// avoiding coplanar hub/room slabs and keeping the shared grid in the atrium.
floor(0,0,58,86);
for(let x=-28;x<=28;x+=4)box(x,.006,0,.018,.012,85,mats.silver);
for(let z=-42;z<=42;z+=4)box(0,.008,z,58,.012,.018,mats.silver);
floor(-23,0,12,86,10,mats.stone);floor(23,0,12,86,10,mats.stone);
floor(0,-38.5,34,9,10,mats.stone);floor(0,38.5,34,9,10,mats.stone);
// Clear glass edges expose the central void from above.
for(const side of [-1,1]){
  box(side*17,10.82,0,.12,1.64,68,mats.glass,true);box(side*17,11.67,0,.09,.07,68,mats.silver);
  box(side*17,10.03,0,.15,.06,68,mats.glow);
  for(const z of [-34,34]){box(side*8.5,10.82,z,17,1.64,.12,mats.glass,true);box(side*8.5,11.67,z,17,.07,.09,mats.silver);}
  for(const z of [-40,-24,-8,8,24,40]){
    box(side*19,13,z,.75,26,.75,mats.white,true);
    box(side*18.6,13,z+.4,.045,25.6,.055,mats.glow);
  }
  box(side*48.5,15,0,1,30,86,mats.dark,true);
}
box(0,15,-43,98,30,1,mats.dark,true);
// The ground-level doorway connects the existing hub to the real building.
box(-26,15,43,46,30,1,mats.dark,true);box(26,15,43,46,30,1,mats.dark,true);
box(0,17.25,43,6,25.5,1,mats.dark,true);
// Light ribs draw the eye all the way to the crown office.
for(let z=-42;z<=42;z+=7){
  box(0,30,z,34,.35,.5,mats.silver);
  box(0,29.77,z,32,.065,.07,mats.glow);
  for(const side of [-1,1]){const r=box(side*20,25.5,z,.35,11,.5,mats.silver);r.rotation.z=side*.65;}
}
// A curved glass vault is added by the architectural pass below.
for(let z=-38;z<=38;z+=19){point('#d8e5ef',0,20,z,120,38);}
// The shared hall's signature: a suspended, faceted black-silver constellation.
ring(0,12.4,0,7.8,.065,mats.glow);
ring(0,12.7,0,8.8,.12,mats.silver);
ring(0,1.5,0,5.2,.075,mats.silver);
ring(0,.06,0,6,.035,mats.glow);
const heart=new THREE.Mesh(new THREE.OctahedronGeometry(3.2,0),new THREE.MeshStandardMaterial({color:'#d3e3ec',metalness:.84,roughness:.19}));
heart.position.set(0,8,0);heart.scale.y=1.7;scene.add(heart);animated.push({mesh:heart,spin:.085});
const outline=new THREE.LineSegments(new THREE.EdgesGeometry(heart.geometry),new THREE.LineBasicMaterial({color:'#eff8ff'}));heart.add(outline);
for(const side of [-1,1]){box(side*8,.3,5,3,.6,7,mats.stone,true);box(side*8,.68,5,2.8,.16,6.7,mats.dark,true);}
label('BLACK GARTER',0,19.4,-42.38,23,3,'#eef1ed',0,'TWENTY GODS / ONE SHARED WORLD');
label('THE PANTHEON',0,5,-42.35,12,1.7,'#c7d7e5',0,'GROUND ATRIUM / OPEN EXPLORATION');

function roomMotif(room){
  const {x,y,z,color,motif,side}=room;
  const accent=new THREE.MeshStandardMaterial({color,roughness:.35,metalness:.4});
  const lit=glow(color);
  const deepX=x+side*4;
  floor(x,z,18,15.8,y,new THREE.MeshStandardMaterial({color:new THREE.Color(color).multiplyScalar(.22),roughness:.4,metalness:.23}));
  box(x,y+4.3,z-7.9,18,8.6,.24,mats.dark,true);box(x,y+4.3,z+7.9,18,8.6,.24,mats.dark,true);
  box(side*47.1,y+4.3,z,.3,8.6,16,mats.dark,true);
  box(x,y+8.65,z,18,.2,16,mats.dark,true);
  // Shared portal frame; color and material take over deeper in each room.
  for(const offset of [-5.6,5.6])box(side*29,y+3.8,z+offset,.5,7.6,4.6,mats.stone,true);
  box(side*29,y+7.75,z,.6,1.3,16,mats.stone,true);
  for(const offset of [-3.25,3.25])box(side*28.66,y+3.2,z+offset,.07,6.4,.08,mats.glow);
  box(side*28.66,y+6.4,z,.07,.06,6.6,mats.glow);
  label(room.god,side*28.61,y+7.55,z,6.5,1.2,'#f1f1e9',-side*Math.PI/2,String(room.id).padStart(2,'0')+' / '+room.name);
  label(room.name,side*46.89,y+6.5,z,11,1.65,color,-side*Math.PI/2);
  box(side*43.9,y+.03,z,4,.035,13,accent);
  for(const dz of [-6.4,6.4])box(x,y+.05,z+dz,17,.03,.045,lit);
  if(['crystal','astral'].includes(motif)){
    ring(deepX,y+.24,z,3.4,.065,lit);
    for(let i=0;i<5;i++){
      const a=i*Math.PI*2/5;
      const mesh=new THREE.Mesh(new THREE.OctahedronGeometry(motif==='crystal'?1.3:.7),accent);
      mesh.position.set(deepX+Math.cos(a)*2.2,y+2.5+Math.sin(a)*.5,z+Math.sin(a)*2.2);mesh.scale.y=1.9;scene.add(mesh);animated.push({mesh,spin:.12+i*.01});
    }
    if(motif==='astral'){const orb=ring(deepX,y+4,z,3,.045,lit,0);orb.rotation.y=.6;animated.push({mesh:orb,spin:.08});}
  } else if(motif==='garden'){
    floor(deepX,z,4.5,10,y+.15,accent);
    for(let i=0;i<9;i++){
      const px=deepX+Math.sin(i*2.4)*2.2,pz=z+Math.cos(i*1.7)*4.5,height=2.6+(i%3)*.7;
      box(px,y+height/2,pz,.14,height,.14,mats.silver);
      const plant=new THREE.Mesh(new THREE.IcosahedronGeometry(1.12,0),accent);plant.position.set(px,y+height,pz);plant.scale.set(.9,1.6,.9);scene.add(plant);
    }
    ring(deepX,y+6.3,z,4.2,.06,lit);
  } else if(motif==='archive'){
    for(const dz of [-5.4,5.4]){
      box(deepX,y+2.5,z+dz,5,5,.8,mats.white,true);
      for(let shelf=0;shelf<5;shelf++)for(let book=0;book<12;book++)box(deepX-2.2+book*.4,y+.6+shelf*.92,z+dz-side*.5,.22,.66,.42,book%3?accent:mats.dark);
    }
    box(deepX,y+.8,z,3.6,1.6,2,mats.white,true);ring(deepX,y+3.6,z,1.7,.075,lit,0);
  } else if(motif==='sound'){
    for(let i=0;i<5;i++){const acoustic=ring(deepX,y+3.8,z,1.8+i*.57,.095,i%2?accent:lit,0);acoustic.rotation.y=Math.PI/2;}
    box(deepX,y+.4,z,6,.8,6,mats.dark,true);
    for(const dz of [-5.5,5.5]){box(deepX,y+2.4,z+dz,2,4.8,1.5,mats.dark,true);for(let i=0;i<3;i++){const speaker=ring(deepX-side*1.02,y+1+i*1.4,z+dz,.45,.08,accent,0);speaker.rotation.y=Math.PI/2;}}
  } else if(motif==='stage'){
    box(deepX,y+.45,z,5,.9,11,mats.dark,true);
    box(side*46.65,y+4,z,.08,4.3,10,motif==='stage'&&room.god==='Erato'?mats.white:accent);
    for(let i=0;i<8;i++)box(side*46.5,y+4,z-5.5+i*1.55,.3,7,.25,accent);
    for(const dz of [-4.2,0,4.2])box(x-side*2,y+.6,z+dz,1.5,1.2,2,accent,true);
  } else if(motif==='hearth'){
    box(deepX,y+3.2,z,2,6.4,6,mats.stone,true);box(deepX-side*1.03,y+1.3,z,.07,1.7,4,lit);
    for(const dz of [-4.5,4.5])box(x,y+.45,z+dz,6,.9,1.6,accent,true);
  } else if(motif==='city'){
    for(let i=0;i<13;i++){const h=1.2+(i*7%11)*.42;box(deepX+Math.sin(i*2)*1.5,y+h/2,z-6+i,1,h,.7,accent);box(deepX-side*.55,y+h/2,z-6+i,.04,h*.85,.15,lit);}
    box(x-side*2,y+.6,z,3.8,1.2,2,mats.dark,true);
  } else if(motif==='digital'){
    for(let i=0;i<6;i++){box(deepX,y+1.3+i*.8,z,3.8,.04,5.4-i*.4,i%2?lit:accent);}
    for(const dz of [-5,5])box(x,y+.9,z+dz,5,1.8,1.5,mats.white,true);
  } else if(motif==='gate'){
    for(const dz of [-3.5,3.5])box(deepX,y+3.5,z+dz,2,7,2,accent,true);
    box(deepX,y+6.8,z,2,.4,8,lit);box(deepX,y+.08,z,8,.07,12,mats.glass);
  } else {
    for(let i=0;i<3;i++){
      const mesh=new THREE.Mesh(new THREE.TorusKnotGeometry(.9+i*.15,.14,52,7),i%2?accent:mats.silver);mesh.position.set(deepX,y+2.4,z+(i-1)*4);scene.add(mesh);animated.push({mesh,spin:.1*(i+1)});
      box(deepX,y+.5,z+(i-1)*4,2,1,2,mats.white,true);
    }
  }
}
ROOMS.forEach(roomMotif);

// Public crown office architectural overlook. No private rooms ship in this bundle.
floor(0,-36.5,27,13,24,mats.dark);
box(0,24.85,-30,27,1.7,.12,mats.glass,true);box(0,25.75,-30,27,.08,.08,mats.silver);
for(const x of [-13.5,13.5])box(x,25.7,-36.5,.2,3.4,13,mats.glass,true);
box(0,24.7,-38,6,1.4,2,mats.silver,true);box(0,25.43,-38,6.3,.06,2.3,mats.glow);
box(0,25.2,-40,1.6,2.4,1,mats.dark,true);
label('CROWN OFFICE',0,29.5,-42.36,13,1.7,'#f1f4ef',0,'RIO / ABOVE THE PANTHEON');
label('CROWN OFFICE',0,22,-29.92,11,1.4,'#dbe7ef',0,'ATRIUM OVERLOOK');
// Glass lift portals provide an explicit route between each built level.
for(const y of [0,10]){
  for(const x of [-2.3,2.3])box(x,y+2.5,-39,.16,5,.16,mats.glow);
  box(0,y+5,-39,4.7,.08,.16,mats.glow);box(0,y+.05,-39,4.8,.04,4,mats.glass);
  label('LIFT',0,y+3.5,-40.5,2.6,.7,'#e5e9ef',0,'E / CHOOSE LEVEL');
}
// Spawn's physical jukebox and satellite speakers.
box(-4,.95,30,1.2,1.9,.8,mats.silver,true);box(-4,1.12,30.425,.95,1.45,.03,mats.dark);
for(let i=0;i<11;i++)box(-4.39+i*.078,1.16,30.45,.03,.3+(i%4)*.18,.025,mats.glow);
label('JUKEBOX',-4,2.2,30.48,2.2,.5,'#e6eff5',0,'DETONATE / E TO PLAY');
for(const x of [-15,15])for(const z of [-25,25]){
  box(x,3.3,z,.8,2,.8,mats.dark,true);for(let i=0;i<2;i++)ring(x,2.8+i*.8,z+.415,.28,.045,mats.silver,0);
}

const architectureReceipt=addArchitecture({THREE,scene,ROOMS,mats,box,floor,label,ring,animated,obstacles});
// SPLIT t_50a95d6b (24 Sep 2026): the Black Garter building was removed from this world on
// Rio's order and lives only at black.garter.app now. In its place: a lit doorway across the
// street that crosses to the venue. The stub keeps the old interface so the HUD and collision
// code keep working without the venue geometry.
const venueDoor=new THREE.Group();venueDoor.name='The Black Garter / street doorway';
{
  const frame=mats.silver,glowMat=new THREE.MeshBasicMaterial({color:'#ffcf9a'});
  const post=(x)=>{const m=new THREE.Mesh(sharedBox,frame);m.position.set(x,2.3,65.9);m.scale.set(.34,4.6,.34);scene.add(m);return m;};
  post(-2.1);post(2.1);
  const lintel=new THREE.Mesh(sharedBox,frame);lintel.position.set(0,4.75,65.9);lintel.scale.set(4.55,.34,.38);scene.add(lintel);
  const sill=new THREE.Mesh(sharedBox,frame);sill.position.set(0,.07,65.9);sill.scale.set(4.55,.14,.5);scene.add(sill);
  const light=new THREE.Mesh(sharedBox,glowMat);light.position.set(0,2.3,65.85);light.scale.set(3.9,4.4,.06);scene.add(light);
  const light2=new THREE.Mesh(sharedBox,glowMat);light2.position.set(0,2.3,65.7);light2.scale.set(3.35,3.9,.06);scene.add(light2);
  point('#ffd9a8',0,3.4,64.6,26,17);
}
label('THE BLACK GARTER',0,5.6,65.62,8.4,1.05,'#ffd9a8',0,'ACROSS THE STREET · BLACK.GARTER.APP ↗');
const realBuilding={
  location:()=>null,
  contains:()=>false,
  collisionRadius:.34,
  receipt:{status:'removed',order:'BLACK-GARTER-APP-SPLIT-20260924',note:'venue geometry not in this world; doorway links to https://black.garter.app'}
};
// Batch repeated architecture by material to keep the first slice practical on laptops.
const batches=new Map();
for(const mesh of [...scene.children]){
  if(mesh.geometry!==sharedBox)continue;
  if(!batches.has(mesh.material))batches.set(mesh.material,[]);
  batches.get(mesh.material).push(mesh);
}
for(const [material,meshes] of batches){
  const batch=new THREE.InstancedMesh(sharedBox,material,meshes.length);
  meshes.forEach((mesh,index)=>{mesh.updateMatrix();batch.setMatrixAt(index,mesh.matrix);scene.remove(mesh);});
  batch.instanceMatrix.needsUpdate=true;batch.computeBoundingSphere();scene.add(batch);
}

// Static geometry uses separate material program caches for instanced and ordinary meshes.
// Material values and textures remain identical; no work is added to the frame loop.
const architectureMaterials=createMaterialCohorts(scene);
architectureMaterials.setEnabled(true);

import {createExperience} from './experience.js';
import {createPrivateSpace} from './private-space.js';
const player=new Movement(floors,obstacles);
// Visitors load the world shell first. Character assets (rig, identities, wardrobe,
// facial motion) stream only after the visitor enters the world or takes the directory.
let openAvatarGate;
const avatarGate=new Promise(resolve=>{openAvatarGate=resolve;});
let avatarsRequested=false;
async function gatedPlayerAvatarFactory(options){
  await avatarGate;
  const {createPlayerAvatar}=await import('./characters/locomotion-runtime.js');
  return createPlayerAvatar(options);
}
const playerPresentation=createPlayerPresentation({scene,camera,onError:()=>updateViewControls(),avatarFactory:gatedPlayerAvatarFactory});
const viewPreferences=readViewPreferences();
playerPresentation.setMode(viewPreferences.mode);playerPresentation.setShoulder(viewPreferences.shoulder);
function updateViewControls(){
  const ready=playerPresentation.status==='ready',full=playerPresentation.mode==='third-person';
  const side=playerPresentation.shoulder,opposite=side==='left'?'right':'left';
  $('#view-toggle').disabled=!ready;$('#view-quick').disabled=!ready;
  $('#shoulder-toggle').disabled=!ready||!full;$('#shoulder-quick').disabled=!ready||!full;
  $('#view-toggle').textContent=ready?(full?'V / SWITCH TO FIRST PERSON':'V / SWITCH TO FULL BODY'):'CHARACTER VIEW LOADING';
  $('#view-quick').setAttribute('aria-label',full?'Switch to first-person view':'Switch to full-body view');
  $('#shoulder-toggle').textContent='C / SWAP TO '+opposite.toUpperCase();
  $('#shoulder-quick').textContent='SHOULDER → '+opposite[0].toUpperCase();
  $('#shoulder-quick').setAttribute('aria-label','Switch to '+opposite+' shoulder');
  $('#shoulder-quick').title=full?'C / Switch to '+opposite+' shoulder':'Switch to full body to swap shoulders';
  $('#camera-state').textContent=ready?(full?'Full body view · '+side+' shoulder. V changes view. C swaps sides.':'First person view. V switches to full body; your '+side+' shoulder choice is kept.'):'Your character is arriving. First person is ready while it loads.';
  if(playerPresentation.status==='error'){$('#view-toggle').textContent='CHARACTER VIEW UNAVAILABLE';$('#camera-state').textContent='Character view could not load. First person is ready; reload to retry the character.';}
}
updateViewControls();playerPresentation.ready.then(()=>updateViewControls());
const godGroup=new THREE.Group();godGroup.name='The twenty gods';scene.add(godGroup);
const shadowCanvas=document.createElement('canvas');shadowCanvas.width=64;shadowCanvas.height=64;const shadowContext=shadowCanvas.getContext('2d'),shadowGradient=shadowContext.createRadialGradient(32,32,2,32,32,32);shadowGradient.addColorStop(0,'rgba(0,0,0,.48)');shadowGradient.addColorStop(.45,'rgba(0,0,0,.25)');shadowGradient.addColorStop(1,'rgba(0,0,0,0)');shadowContext.fillStyle=shadowGradient;shadowContext.fillRect(0,0,64,64);const contactShadowMaterial=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false});
for(const room of ROOMS){const contact=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.05),contactShadowMaterial);contact.rotation.x=-Math.PI/2;contact.position.set(room.side*35.5,room.y+.018,room.z);godGroup.add(contact);}
let loadedGods=0;
function loadWorldAvatars(){
  if(avatarsRequested)return;avatarsRequested=true;openAvatarGate();
  Promise.allSettled(ROOMS.map(async room=>{const avatar=await createGodAvatar({profileId:room.profileId,name:room.god,accent:room.color,height:1.85});avatar.position.set(room.side*35.5,room.y,room.z);avatar.rotation.y=-room.side*Math.PI/2;godGroup.add(avatar);loadedGods++;$('#character-state').textContent=loadedGods+' / 20 characters ready';})).then(results=>{if(results.some(result=>result.status==='rejected')){$('#character-state').textContent=loadedGods+' / 20 characters loaded. Reload to retry missing models.';}else{$('#character-state').textContent='20 characters · Hecate: original Sorceress (4K, stationary)';}});
}
let cameraEffects=!reducedMotion;
let yaw=0,pitch=.08,started=false,lastTime=performance.now(),toastTimer,dragPointer=null,lastDrag=null,activeRoom=null;
let fpsStart=performance.now(),fpsFrames=0,lastTravel=-Infinity;
const pressed=new Set();
let showTouch=true;
const status={rooms:ROOMS.length,build:'01',mode:'public exploration',renderedFrames:0,currentLocation:'The Atrium',floor:'Ground',jumpsUsed:0,dashReady:true,x:0,y:0,z:32};
// Read-only browser diagnostics for checks. No command or movement mutation hooks.
Object.defineProperty(window,'officeDiagnostics',{get:()=>({...status,avatarsRequested,renderer:'Three.js '+THREE.REVISION,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,realBuilding:realBuilding.receipt})});

function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,4000);}
function start(){const first=!started;started=true;loadWorldAvatars();document.body.classList.add('playing');$('#welcome').hidden=true;$('#location').hidden=false;$('#crosshair').hidden=false;$('#movement-status').hidden=false;$('#touch-controls').hidden=!showTouch;$('#camera-quick-controls').hidden=!showTouch;canvas.focus({preventScroll:true});if(first&&$('#arrival-audio').checked)toggleMusic();if(window.PBTouch)window.PBTouch.setActive(true);}
function openDialog(id){pressed.clear();document.exitPointerLock?.();if(window.PBTouch)window.PBTouch.setActive(false);$('#'+id).showModal();}
function closeDialogs(){document.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());canvas.focus({preventScroll:true});if(started&&window.PBTouch)window.PBTouch.setActive(true);}
function teleport(destination,force=false){
  if(!force&&performance.now()-lastTravel<800)return;lastTravel=performance.now();
  privateSpaces.leave(false);
  closeDialogs();start();pitch=0;
  if(destination==='spawn'){player.reset(0,0,32);yaw=0;}
  else if(destination==='upper'){player.reset(0,10,38);yaw=0;}
  else if(destination==='crown'){player.reset(0,24,-32.2);yaw=Math.PI;pitch=-.25;}
  else {const room=ROOMS.find(item=>item.id===Number(destination));if(!room)return;player.reset(room.side*32.7,room.y,room.z);yaw=-room.side*Math.PI/2;}
  playerPresentation.reset();
  experience.portal(destination);
  updateLocation();
}
let walkingPace=false;
function togglePace(){walkingPace=!walkingPace;$('#pace-toggle').textContent=walkingPace?'X / WALKING PACE':'X / JOGGING PACE';$('#pace-toggle').setAttribute('aria-pressed',String(walkingPace));toast(walkingPace?'WALKING PACE':'JOGGING PACE');}
$('#pace-toggle').addEventListener('click',togglePace);
function input(){const touch=window.PBTouch?window.PBTouch.move:{x:0,y:0};return {forward:Number(pressed.has('KeyW')||pressed.has('ArrowUp')||pressed.has('forward'))-Number(pressed.has('KeyS')||pressed.has('ArrowDown')||pressed.has('back'))+touch.y,strafe:Number(pressed.has('KeyD')||pressed.has('right'))-Number(pressed.has('KeyA')||pressed.has('left'))+touch.x,yaw,walk:walkingPace,sprint:pressed.has('ShiftLeft')||pressed.has('ShiftRight')||pressed.has('touch-sprint'),glide:pressed.has('Space')||pressed.has('touch-glide')};}
function jump(){if(!started||document.querySelector('dialog[open]'))return;if(player.jump())toast(player.jumps===3?'TRIPLE JUMP':'JUMP '+player.jumps+' / 3');}
function dash(){if(!started||document.querySelector('dialog[open]'))return;const direction=input();if(player.dash(yaw,direction.forward,direction.strafe))toast('DASH');}
function nearby(){if(Math.hypot(player.x,player.z+39)<5.3&&player.y<13)return 'lift';if(Math.hypot(player.x+4,player.z-30)<4.3&&player.y<3)return 'music';if(Math.hypot(player.x,player.z-63.6)<5.2&&player.y<4.5)return 'venue';return null;}
function interact(){if(privateSpaces.active){privateSpaces.interact();return;}const which=nearby();if(which==='lift')openDialog('lift');if(which==='music')toggleMusic();if(which==='venue'){window.open('https://black.garter.app/','_blank','noopener');toast('CROSSING TO THE BLACK GARTER ↗');}}
function updateLocation(){
  if(privateSpaces.active){privateSpaces.update();return;}
  const room=ROOMS.find(r=>Math.abs(player.x-r.x)<9&&Math.abs(player.z-r.z)<7.8&&Math.abs(player.y-r.y)<7.5);
  const building=realBuilding.location(player);
  const crown=player.y>22;
  const name=building?building.name:room?room.name:crown?'Crown Office':player.y>=8?'Upper Gallery':'The Atrium';
  if(name!==status.currentLocation||activeRoom!==room||(building&&$('#floor-label').textContent!==building.level)){
    $('#location-title').textContent=room?room.god.toUpperCase()+' / '+room.name.toUpperCase():name.toUpperCase();
    $('#floor-label').textContent=building?building.level:room?room.floor.toUpperCase()+' / DOMAIN '+String(room.id).padStart(2,'0'):crown?'CROWN / ATRIUM OVERLOOK':player.y>=8?'UPPER / SHARED GALLERY':'GROUND / SHARED HUB';
    $('#location-copy').textContent=building?building.copy:room?room.description:crown?'Your office, above every public domain.':player.y>=8?'Ten more domains. The whole atrium below.':'Concrete. Glass. Silver. Twenty worlds beyond. The Black Garter doorway across the street leads to the venue.';
    activeRoom=room;status.currentLocation=name;
  }
  status.floor=building?building.level:crown?'Crown':player.y>=8?'Upper':'Ground';
  const proximity=nearby();$('#interaction').hidden=!started||!proximity;$('#interact-button').textContent=proximity==='lift'?'E / OPEN LIFT':proximity==='venue'?'E / CROSS TO BLACK GARTER ↗':'E / TOGGLE JUKEBOX';
}

$('#enter').addEventListener('click',start);
$('#directory-open').addEventListener('click',()=>openDialog('directory'));
$('#building-route').addEventListener('click',()=>{window.open('https://black.garter.app/','_blank','noopener');toast('CROSSING TO THE BLACK GARTER ↗ The doorway is across the street.');});
$('#gallery-directory-button').addEventListener('click',()=>{location.href='gallery/';});
$('#settings-open').addEventListener('click',()=>openDialog('settings'));
function saveView(){saveViewPreferences({mode:playerPresentation.mode,shoulder:playerPresentation.shoulder});}
function toggleView(){if($('#view-toggle').disabled)return;playerPresentation.toggleMode();updateViewControls();saveView();}
function swapShoulder(){if($('#shoulder-toggle').disabled)return;playerPresentation.toggleShoulder();updateViewControls();saveView();toast(playerPresentation.shoulder.toUpperCase()+' SHOULDER');}
$('#view-toggle').addEventListener('click',toggleView);
$('#shoulder-toggle').addEventListener('click',swapShoulder);
$('#view-quick').addEventListener('click',()=>{toggleView();canvas.focus({preventScroll:true});});
$('#shoulder-quick').addEventListener('click',()=>{swapShoulder();canvas.focus({preventScroll:true});});
document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>{$('#'+button.dataset.close).close();canvas.focus({preventScroll:true});}));
document.querySelectorAll('[data-destination]').forEach(button=>button.addEventListener('click',()=>teleport(button.dataset.destination)));
for(const room of ROOMS){const button=document.createElement('button');button.className='room-card';button.dataset.room=room.id;button.innerHTML='<span class="room-id">'+String(room.id).padStart(2,'0')+'</span><strong>'+room.god.toUpperCase()+'</strong><small>'+room.name+' · '+room.floor+'</small>';button.addEventListener('click',()=>teleport(room.id));$('#room-list').append(button);}
$('#interact-button').addEventListener('click',interact);
for(const [id,action,hold] of [['jump-button',jump,'touch-glide'],['dash-button',dash,'touch-sprint']]){const button=$('#'+id);button.addEventListener('pointerdown',event=>{event.preventDefault();button.setPointerCapture(event.pointerId);pressed.add(hold);action();});for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,()=>pressed.delete(hold));button.addEventListener('click',event=>{if(event.detail===0)action();});}
$('#toggle-touch').addEventListener('click',()=>{showTouch=!showTouch;$('#touch-controls').hidden=!showTouch||!started;$('#camera-quick-controls').hidden=!showTouch||!started;$('#toggle-touch').textContent=showTouch?'HIDE TOUCH CONTROLS':'SHOW TOUCH CONTROLS';});
$('#quality').addEventListener('change',event=>{renderer.setPixelRatio(Math.min(devicePixelRatio,Number(event.target.value)));renderer.setSize(innerWidth,innerHeight);});
$('#lock-mouse').addEventListener('click',async()=>{closeDialogs();start();try{await canvas.requestPointerLock();}catch{toast('Mouse lock is unavailable here. Drag the view to look around.');}});
document.addEventListener('pointerlockerror',()=>toast('Drag the view to look around; mouse lock is unavailable here.'));
document.addEventListener('mousemove',event=>{if(document.pointerLockElement===canvas){yaw-=event.movementX*.0022;pitch=Math.max(-1.35,Math.min(1.35,pitch-event.movementY*.0022));}});
canvas.addEventListener('pointerdown',event=>{if(!started)start();if(document.pointerLockElement===canvas)return;dragPointer=event.pointerId;lastDrag={x:event.clientX,y:event.clientY};canvas.setPointerCapture(event.pointerId);});
canvas.addEventListener('pointermove',event=>{if(dragPointer!==event.pointerId||!lastDrag||document.pointerLockElement===canvas)return;yaw-=(event.clientX-lastDrag.x)*.004;pitch=Math.max(-1.35,Math.min(1.35,pitch-(event.clientY-lastDrag.y)*.004));lastDrag={x:event.clientX,y:event.clientY};});
canvas.addEventListener('pointerup',()=>{dragPointer=null;lastDrag=null;});canvas.addEventListener('pointercancel',()=>{dragPointer=null;lastDrag=null;});
for(const button of document.querySelectorAll('[data-hold]')){
  button.addEventListener('pointerdown',event=>{pressed.add(button.dataset.hold);button.setPointerCapture(event.pointerId);event.preventDefault();});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,()=>pressed.delete(button.dataset.hold));
}
// Shared mobile controller (pb-touch.js): the one joystick contract used by every Pitch
// Black world. The stick feeds input() directly, so nothing can be reversed; the look pad
// reuses the desktop drag's sign and scale (dx right = turn right, dy down = look down).
if(window.PBTouch)window.PBTouch.init({active:false,hide:['#touch-controls'],
  getPose:()=>({x:player.x,z:player.z,fx:-Math.sin(yaw),fz:-Math.cos(yaw),rx:Math.cos(yaw),rz:-Math.sin(yaw),pitch}),
  onLook:(dx,dy)=>{yaw-=dx*.004;pitch=Math.max(-1.35,Math.min(1.35,pitch-dy*.004));},
  buttons:[{label:'RUN',key:'ShiftLeft',toggle:true},{label:'JUMP',key:'Space'},{label:'DASH',key:'KeyQ'},{label:'USE',key:'KeyE'}]});
document.addEventListener('keydown',event=>{
  const cameraAction=cameraShortcut(event,{started,dialogOpen:!!document.querySelector('dialog[open]')});
  if(cameraAction){event.preventDefault();if(cameraAction==='view')toggleView();else swapShoulder();return;}
  if(event.code==='KeyV'||event.code==='KeyC')return;
  if(!started||document.querySelector('dialog[open]')||/INPUT|SELECT|TEXTAREA/.test(event.target.tagName))return;
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code))event.preventDefault();
  pressed.add(event.code);if(event.repeat)return;
  if(event.code==='KeyX'){event.preventDefault();togglePace();}
  if(event.code==='Space')jump();if(event.code==='KeyQ')dash();if(event.code==='KeyE')interact();if(event.code==='KeyR')teleport('spawn');
});
document.addEventListener('keyup',event=>pressed.delete(event.code));
window.addEventListener('blur',()=>pressed.clear());
document.addEventListener('visibilitychange',()=>{pressed.clear();lastTime=performance.now();});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});

const music=$('#music');music.volume=.38;let trackIndex=0,shuffle=[];
function nextTrack(){if(!shuffle.length){shuffle=TRACKS.map((_,i)=>i).filter(i=>i!==trackIndex);for(let i=shuffle.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[shuffle[i],shuffle[j]]=[shuffle[j],shuffle[i]];}}return shuffle.pop();}
async function playTrack(index){trackIndex=index;music.src=TRACKS[index].url;$('#track-name').textContent=TRACKS[index].title;$('#music-status').textContent='Loading the published recording…';try{await music.play();}catch{$('#music-status').textContent='Press play to start the recording.';}}
function toggleMusic(){if(music.paused){if(!music.src)playTrack(trackIndex);else music.play().catch(()=>$('#music-status').textContent='Playback could not start. Press play to retry.');}else music.pause();}
$('#music-toggle').addEventListener('click',toggleMusic);$('#music-next').addEventListener('click',()=>playTrack(nextTrack()));
$('#volume').addEventListener('input',event=>music.volume=Number(event.target.value)/100);
music.addEventListener('playing',()=>{$('#music-toggle').textContent='Ⅱ';$('#music-toggle').setAttribute('aria-label','Pause spawn jukebox');$('#music-status').textContent='Playing / continuous hype rotation';});
music.addEventListener('pause',()=>{$('#music-toggle').textContent='▶';$('#music-toggle').setAttribute('aria-label','Play spawn jukebox');if(!music.ended)$('#music-status').textContent='Paused';});
music.addEventListener('error',()=>{$('#music-status').textContent='Recording unavailable. Press next to try another track.';});
music.addEventListener('ended',()=>playTrack(nextTrack()));

const experience=createExperience({scene,player,camera,canvas,toast,openDialog,closeDialogs,getYaw:()=>yaw,getPitch:()=>pitch,getRoom:()=>activeRoom,getStarted:()=>started,setMotion:value=>cameraEffects=value});
const privateSpaces=createPrivateSpace({scene,player,experience,toast,closeDialogs,setOrientation:(y,p)=>{yaw=y;pitch=p;},onLocation:title=>{start();activeRoom=null;status.currentLocation=title;$('#location-title').textContent=title;$('#floor-label').textContent='PRIVATE SPACE';$('#location-copy').textContent='A quiet place of your own.';},returnToSpawn:()=>teleport('spawn',true)});

function frame(now){
  requestAnimationFrame(frame);
  const dt=frameSeconds((now-lastTime)/1000);lastTime=now;
  if(document.hidden){fpsFrames=0;fpsStart=now;return;}
  const paused=!!document.querySelector('dialog[open]');
  advanceFrame(started&&!paused?dt:0,step=>{
    if(started&&!paused){
      if(pressed.has('ArrowLeft'))yaw+=step*1.55;if(pressed.has('ArrowRight'))yaw-=step*1.55;
      if(!privateSpaces.active)player.radius=realBuilding.contains(player)?realBuilding.collisionRadius:.34;
      player.step(step,input());if(player.y < -12){teleport('spawn');toast('Returned to the atrium.');}
    }
    camera.position.set(player.x,player.y+1.72,player.z);camera.rotation.set(pitch,yaw,0);
    playerPresentation.update(step,{player,yaw,pitch,started,paused,reducedMotion});
  });
  if(!reducedMotion)for(const item of animated)item.mesh.rotation.y+=dt*item.spin;
  const targetFov=started&&(player.dashTime>0||player.grappleTarget)&&cameraEffects?79:69;
  if(Math.abs(camera.fov-targetFov)>.05){camera.fov+=(targetFov-camera.fov)*Math.min(1,dt*14);camera.updateProjectionMatrix();}
  experience.update(dt,now);
  if(!privateSpaces.active&&!document.hidden){const gaze=updateGodAvatars(reducedMotion?0:dt,camera.position);status.gaze=gaze&&typeof gaze.turned==='number'?gaze.turned:0;}
  renderer.render(scene,camera);status.renderedFrames++;
  fpsFrames++;if(now-fpsStart>=1500){if(!document.hidden)$('#render-state').textContent=Math.round(fpsFrames*1000/(now-fpsStart))+' FPS · '+renderer.info.render.calls+' draw calls · 20 domains';fpsFrames=0;fpsStart=now;}
  if(status.renderedFrames%6===0){
    updateLocation();status.x=Number(player.x.toFixed(3));status.y=Number(player.y.toFixed(3));status.z=Number(player.z.toFixed(3));status.jumpsUsed=player.jumps;status.dashReady=player.dashCooldown===0;
    $('#jump-status').textContent='JUMP · '+(3-player.jumps)+' READY';$('#dash-status').textContent=player.dashCooldown>0?'DASH · '+player.dashCooldown.toFixed(1)+'S':'DASH · READY';
  }
}
$('#loading').hidden=true;$('#enter').disabled=false;
$('#render-state').textContent='20 domains · shared hall · original world in construction';
// Interactive first, shaders after: the visitor can enter as soon as the world shell is up.
// The program pre-compile then runs in its own task (parallel shader compile where the
// browser supports it) so the first frames stay smooth without blocking the button.
requestAnimationFrame(()=>setTimeout(()=>{try{if(typeof renderer.compileAsync==='function')renderer.compileAsync(scene,camera).catch(()=>{});else renderer.compile(scene,camera);}catch{/* On-demand compilation covers the first render. */}},0));
requestAnimationFrame(frame);
