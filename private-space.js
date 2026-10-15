import * as THREE from './vendor/three.module.min.js';

const finiteVector=(value,limit=250)=>Array.isArray(value)&&value.length===3&&value.every(n=>Number.isFinite(n)&&Math.abs(n)<=limit);
const color=value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
export function validatePrivateManifest(data){
  if(!data||data.version!==1||data.isolated!==true||typeof data.title!=='string'||data.title.length>100)throw new Error('Invalid private scene');
  if(!finiteVector(data.bounds?.min)||!finiteVector(data.bounds?.max)||!data.bounds.max.every((n,i)=>n>data.bounds.min[i]))throw new Error('Invalid scene bounds');
  if(!finiteVector(data.spawn?.position)||!Number.isFinite(data.spawn.yaw)||!data.spawn.position.every((n,i)=>n>=data.bounds.min[i]&&n<=data.bounds.max[i]))throw new Error('Invalid scene arrival');
  if(!color(data.environment?.background)||!color(data.environment?.fogColor))throw new Error('Invalid scene atmosphere');
  if(!Array.isArray(data.objects)||data.objects.length>180||!Array.isArray(data.lights)||data.lights.length>16)throw new Error('Invalid scene complexity');
  for(const item of data.objects){if(!['box','sphere','cylinder'].includes(item.shape)||!finiteVector(item.position)||!finiteVector(item.size,200)||!item.size.every(n=>n>0)||!color(item.color)||(item.emissive&&!color(item.emissive))||(item.rotation&&!finiteVector(item.rotation,12)))throw new Error('Invalid scene object');}
  for(const light of data.lights){if(!finiteVector(light.position)||!color(light.color)||!Number.isFinite(light.intensity)||light.intensity<0||light.intensity>30||!Number.isFinite(light.distance)||light.distance<0||light.distance>200)throw new Error('Invalid scene light');}
  if(!finiteVector(data.exit?.position)||!data.exit.position.every((n,i)=>n>=data.bounds.min[i]&&n<=data.bounds.max[i])||!Number.isFinite(data.exit.radius)||data.exit.radius<.5||data.exit.radius>10||data.exit.return!=='public_spawn')throw new Error('Invalid scene exit');
  return data;
}

export function createPrivateSpace({scene,player,experience,toast,closeDialogs,setOrientation,onLocation,returnToSpawn}){
  let manifest=null,privateRoot=null,saved=null,pending=null,generation=0;
  let approvedDestinations=new Set();
  const $=selector=>document.querySelector(selector);
  function cancelEntry(){generation++;if(pending)pending.controller.abort();pending=null;}
  async function enter(destination){
    if(pending)return;
    if(typeof destination!=='string'||!approvedDestinations.has(destination)){toast('Sign in with an account that has access to this space.');return;}
    const operation={generation:++generation,destination,controller:new AbortController()};pending=operation;
    const timeout=setTimeout(()=>operation.controller.abort(),8000);let switched=false;
    function assertCurrent(){if(pending!==operation||generation!==operation.generation||!approvedDestinations.has(destination)||operation.controller.signal.aborted)throw new Error('Your private access changed. Sign in again to return.');}
    try{
      const response=await fetch('/api/private-scene/'+encodeURIComponent(destination),{credentials:'same-origin',cache:'no-store',signal:operation.controller.signal});
      assertCurrent();
      if(!response.ok)throw new Error(response.status===401||response.status===403?'Sign in with an account that has access to this space.':'The private space could not load.');
      const next=validatePrivateManifest(await response.json());
      assertCurrent();
      if(next.id!==destination)throw new Error('The private scene identity did not match the requested space.');
      if(manifest)restorePublic(false,false);
      experience.setPrivate(true);
      saved={children:scene.children.slice(),background:scene.background,environment:scene.environment,fog:scene.fog,floors:player.floors,obstacles:player.obstacles};
      manifest=next;privateRoot=new THREE.Group();switched=true;closeDialogs();
      for(const child of saved.children)scene.remove(child);
      scene.add(privateRoot);scene.background=new THREE.Color(next.environment.background);scene.environment=null;scene.fog=new THREE.FogExp2(next.environment.fogColor,.012);
      privateRoot.add(new THREE.HemisphereLight('#f6eee1','#151720',1.6));
      const privateObstacles=[];
      for(const item of next.objects){
        const geometry=item.shape==='sphere'?new THREE.SphereGeometry(.5,24,16):item.shape==='cylinder'?new THREE.CylinderGeometry(.5,.5,1,24):new THREE.BoxGeometry(1,1,1);
        const material=new THREE.MeshStandardMaterial({color:item.color,roughness:.6,metalness:.12,emissive:item.emissive||'#000000',emissiveIntensity:item.emissive?.6:0});
        const mesh=new THREE.Mesh(geometry,material);mesh.position.set(...item.position);mesh.scale.set(...item.size);if(item.rotation)mesh.rotation.set(...item.rotation);privateRoot.add(mesh);
        if(item.shape==='box'&&!item.rotation&&item.position[1]+item.size[1]/2>next.spawn.position[1]+.08){privateObstacles.push({minX:item.position[0]-item.size[0]/2,maxX:item.position[0]+item.size[0]/2,minY:item.position[1]-item.size[1]/2,maxY:item.position[1]+item.size[1]/2,minZ:item.position[2]-item.size[2]/2,maxZ:item.position[2]+item.size[2]/2});}
      }
      for(const item of next.lights){const lamp=new THREE.PointLight(item.color,item.intensity,item.distance,1.4);lamp.position.set(...item.position);privateRoot.add(lamp);}
      player.floors=[{minX:next.bounds.min[0],maxX:next.bounds.max[0],minZ:next.bounds.min[2],maxZ:next.bounds.max[2],y:next.spawn.position[1]}];player.obstacles=privateObstacles;
      player.reset(...next.spawn.position);setOrientation(next.spawn.yaw,0);onLocation(next.title);
      $('#session-label').textContent='PRIVATE ACCESS';$('#presence-label').textContent='PUBLIC PRESENCE DISCONNECTED';$('#interaction').hidden=false;$('#interact-button').textContent='E / RETURN TO THE HALL';
      $('#private-return').hidden=false;$('#profile-open').hidden=true;$('#visitor-status').textContent='PRIVATE SPACE';
      toast('Private space ready. Only authorized accounts can load this scene.');
    }catch(error){
      if(pending!==operation||generation!==operation.generation)return;
      const message=operation.controller.signal.aborted?'The private space took too long to load. Please try again.':error.message||'This space is unavailable.';
      if(switched)leave();toast(message);
    }
    finally{clearTimeout(timeout);if(pending===operation)pending=null;}
  }
  function restorePublic(returnToHall=true,reconnect=true){
    if(!manifest)return;
    scene.remove(privateRoot);privateRoot.traverse(object=>{object.geometry?.dispose();object.material?.dispose();});
    for(const child of saved.children)scene.add(child);scene.background=saved.background;scene.environment=saved.environment;scene.fog=saved.fog;player.floors=saved.floors;player.obstacles=saved.obstacles;
    manifest=null;privateRoot=null;saved=null;
    // The caller's mandatory spawn reset runs while presence is still private.
    // Switching to another private room never opens a public socket in between.
    if(returnToHall)returnToSpawn();
    if(reconnect)experience.setPrivate(false);
    $('#private-return').hidden=true;$('#visitor-status').textContent='PUBLIC EXPLORATION · GOD PROFILES ARE VIEW ONLY';$('#session-label').textContent=experience.role==='owner'?'OWNER / ALL TRAVERSAL ONLINE':experience.role==='staff'?'STAFF / WELCOME BACK':'VISITOR / EXPLORE FREELY';
  }
  function leave(returnToHall=true){cancelEntry();restorePublic(returnToHall);}
  function update(){if(!manifest)return;const p=manifest.exit.position,near=Math.hypot(player.x-p[0],player.z-p[2])<manifest.exit.radius;$('#interaction').hidden=!near;$('#interact-button').textContent='E / RETURN TO THE HALL';if(player.y<manifest.bounds.min[1]-3||player.x<manifest.bounds.min[0]||player.x>manifest.bounds.max[0]||player.z<manifest.bounds.min[2]||player.z>manifest.bounds.max[2])player.reset(...manifest.spawn.position);}
  $('#private-return').addEventListener('click',()=>leave());
  experience.onSession(session=>{
    const destinations=['owner','staff'].includes(session.role)&&Array.isArray(session.privateDestinations)?session.privateDestinations.filter(destination=>destination&&typeof destination.id==='string'&&typeof destination.label==='string'):[];
    approvedDestinations=new Set(destinations.map(destination=>destination.id));
    if(pending&&!approvedDestinations.has(pending.destination))cancelEntry();
    if(manifest&&!destinations.some(destination=>destination.id===manifest.id)){leave();toast('Your private session ended. Sign in again to return.');}
    $('#private-destinations').replaceChildren();
    for(const destination of destinations){if(typeof destination.id!=='string'||typeof destination.label!=='string')continue;const button=document.createElement('button');button.textContent=destination.label;button.addEventListener('click',()=>enter(destination.id));$('#private-destinations').append(button);}
    $('#private-destinations').hidden=destinations.length===0;
  });
  return {enter,leave,update,get active(){return !!manifest;},interact(){if(!manifest)return false;const p=manifest.exit.position;if(Math.hypot(player.x-p[0],player.z-p[2])<manifest.exit.radius)leave();return true;}};
}
