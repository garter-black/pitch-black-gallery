import * as THREE from './vendor/three.module.min.js';
import {ROOMS} from './world-data.js';
import {createHallPresence} from './presence-client.js';

const $=selector=>document.querySelector(selector);
const portraits=Object.fromEntries(ROOMS.map(room=>[room.god,'art/'+room.god.toLowerCase()+'-portrait-v5.png']));
const signatures={Hecate:'Astral step · the whole constellation answers her.',Athena:'Aegis · one perfect defensive field.',Hera:'Sovereign arrival · a ceremonial blink.',Hedone:'Afterimage · a brief dance of motion.',Artemis:'Diamond tether · a precise crystalline grapple.',Aphrodite:'Rose veil · a slow, graceful aerial drift.',Nyx:'Shadow step · a short midnight blink.',Hestia:'Hearthward · a warm circle of protection.',Thalia:'Triple arc · three playful jumps.',Persephone:'Rootway · movement through living light.',Euterpe:'Resonance dash · movement on the beat.',Erato:'Frame shift · a cinematic afterimage.',Cassandra:'Foresight · a glimpse of the next path.',Circe:'Rewrite · a single spatial fold.',Selene:'Lunar glide · weightless descent.',Demeter:'Canopy vault · a rising leap.',Medea:'Forge lunge · a forceful forward burst.',Peitho:'Accord · a stabilizing field.',Styx:'Gatekeeper · one controlled threshold.',Eos:'Dawn dash · a sharp burst of light.'};

export function createExperience({scene,player,camera,canvas,toast,openDialog,closeDialogs,getYaw,getPitch,getRoom,getStarted,setMotion}){
  const visited=new Set();let role='visitor',currentRoom=null,privateMode=false;
  const dots=new Map(),namespace='http://www.w3.org/2000/svg';
  function svg(tag,attributes){const node=document.createElementNS(namespace,tag);for(const [k,v] of Object.entries(attributes))node.setAttribute(k,v);$('#minimap').append(node);return node;}
  svg('rect',{x:23,y:10,width:60,height:86,fill:'#101820','fill-opacity':'.55',stroke:'#dce5ea','stroke-opacity':'.35','stroke-width':'.6'});
  for(const room of ROOMS)dots.set(room.id,svg('rect',{x:room.x+49,y:room.z+49,width:8,height:8,fill:room.color,'fill-opacity':'.25',stroke:room.color,'stroke-width':'.4'}));
  svg('rect',{x:50.4,y:96,width:5.2,height:23,fill:'#a79274','fill-opacity':'.3',stroke:'#d8c5a7','stroke-width':'.3'});
  svg('rect',{x:46.9,y:119,width:12.2,height:28,fill:'#404843',stroke:'#e1d0b4','stroke-width':'.4'});
  svg('path',{d:'M 53 119 L 53 147 M 46.9 128 L 59.1 128',stroke:'#b1b8ae','stroke-width':'.25',fill:'none'});
  const marker=svg('path',{d:'M0 -4 L2.7 3 L0 1.6 L-2.7 3 Z',fill:'#ffffff'});

  function profile(){
    const room=getRoom();if(!room)return;
    $('#profile-title').textContent=room.god.toUpperCase();$('#profile-domain').textContent=room.name;
    $('#profile-role').textContent=room.role;$('#profile-description').textContent=room.description;$('#profile-power').textContent=signatures[room.god];
    const portrait=portraits[room.god],art=$('#profile-art');art.hidden=!portrait;
    if(portrait)art.setAttribute('src',portrait);
    art.setAttribute('alt','Original character portrait of '+room.god);
    $('#profile-art-note').textContent=portrait?'Original character portrait / Black Garter.':'Original character designs are being developed for this domain.';
    openDialog('god-profile');
  }
  $('#profile-open').addEventListener('click',profile);
  $('#motion-toggle').addEventListener('click',()=>{const active=$('#motion-toggle').textContent.endsWith('OFF');setMotion(active);$('#motion-toggle').textContent='CAMERA EFFECTS '+(active?'ON':'OFF');});
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)$('#motion-toggle').textContent='CAMERA EFFECTS OFF';

  const anchors=[[-14,17,-25],[14,17,-25],[-14,17,25],[14,17,25],[0,27,-26],[0,17,0]].map(position=>new THREE.Vector3(...position));
  const hookGroup=new THREE.Group();hookGroup.visible=false;scene.add(hookGroup);
  for(const point of anchors){const ring=new THREE.Mesh(new THREE.TorusGeometry(.38,.035,5,24),new THREE.MeshBasicMaterial({color:'#d4eff8',transparent:true,opacity:.8}));ring.position.copy(point);hookGroup.add(ring);}
  const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineBasicMaterial({color:'#d6f3ff',transparent:true,opacity:.8}));line.visible=false;scene.add(line);
  const raycaster=new THREE.Raycaster();
  function blocksSight(item){
    const object=item.object;
    if(!object.isMesh||hookGroup.children.includes(object)||object.material?.transparent)return false;
    for(let parent=object;parent;parent=parent.parent)if(!parent.visible||parent.userData.localPlayer===true)return false;
    return true;
  }
  function clearSight(origin,target){
    const delta=target.clone().sub(origin),distance=delta.length();
    raycaster.set(origin,delta.normalize());raycaster.far=Math.max(0,distance-.8);
    return !raycaster.intersectObjects(scene.children,true).some(blocksSight);
  }
  function targetAnchor(){
    const origin=camera.position,direction=new THREE.Vector3();camera.getWorldDirection(direction);
    const chest=new THREE.Vector3(player.x,player.y+1.25,player.z);
    let best=null,bestScore=.79;
    for(const anchor of anchors){
      const delta=anchor.clone().sub(origin),distance=delta.length();if(distance>30||distance<2)continue;
      const score=delta.normalize().dot(direction);if(score<=bestScore)continue;
      if(!clearSight(origin,anchor)||!clearSight(chest,anchor))continue;best=anchor;bestScore=score;
    }
    return best;
  }
  function ability(name){
    if(role!=='owner'){toast('Sign in as the owner to use this ability.');return;}
    if(!getStarted()||document.querySelector('dialog[open]'))return;
    if(name==='blink'){
      if(player.blink(getYaw())){toast('BLINK');document.body.classList.remove('motion-flash');void document.body.offsetWidth;document.body.classList.add('motion-flash');}else toast(player.blinkCooldown>0?'Blink recharges in '+player.blinkCooldown.toFixed(1)+'s.':'No clear path ahead.');
    }
    if(name==='vault')toast(player.vault(getYaw())?'LUNGE VAULT':'Move close to a low ledge and face it.');
    if(name==='grapple'){
      if(player.grappleTarget){player.releaseGrapple();toast('TETHER RELEASED');return;}
      const target=targetAnchor();if(!target){toast('Aim toward one of the silver anchor rings.');return;}
      toast(player.grapple(target)?'DIAMOND TETHER':'Grapple is recharging.');
    }
  }
  for(const button of document.querySelectorAll('[data-ability]'))button.addEventListener('click',()=>ability(button.dataset.ability));
  document.addEventListener('keydown',event=>{if(event.repeat||!getStarted()||document.querySelector('dialog[open]')||/INPUT|TEXTAREA|SELECT/.test(event.target.tagName))return;const name={KeyB:'blink',KeyG:'grapple',KeyF:'vault'}[event.code];if(name){event.preventDefault();ability(name);}});

  let lastSend=0,sessionReady=false,pageHidden=false,networkAvailable=globalThis.navigator?.onLine!==false;
  const peers=new Map();
  function removePeer(id){const peer=peers.get(id);if(!peer)return;scene.remove(peer.mesh);peer.mesh.traverse(object=>{object.geometry?.dispose();if(object.material)object.material.dispose();});peers.delete(id);}
  // Presence needs a websocket backend. Static preview/production hosts (no /api/presence) get a
  // no-op presence: solo exploration is the honest state there, and the browser console stays clean
  // instead of retrying a WebSocket endpoint that can never upgrade. Re-enable by hosting the
  // presence worker alongside the site.
  const presenceBackendHosts=['127.0.0.1','localhost'];
  const presenceEnabled=presenceBackendHosts.includes(location.hostname)||location.protocol==='file:';
  const noopPresence={setAvailable(){},position(){return false;},portal(){return true;}};
  const presence=presenceEnabled?createHallPresence({
    url:(location.protocol==='https:'?'wss://':'ws://')+location.host+'/api/presence',
    autoRetry:!['127.0.0.1','localhost'].includes(location.hostname),
    onReset(){for(const id of [...peers.keys()])removePeer(id);},
    onState(state){
      $('#presence-label').textContent=privateMode?'PRIVATE SPACE':!networkAvailable?'OFFLINE / EXPLORING SOLO':
        pageHidden||document.visibilityState==='hidden'?'HALL PAUSED':
        {connecting:'CONNECTING TO THE HALL',connected:'CONNECTED TO THE HALL',disconnected:['127.0.0.1','localhost'].includes(location.hostname)?'SOLO EXPLORATION':'SOLO / RECONNECTING',paused:'SOLO EXPLORATION'}[state];
    },
    onSnapshot(players,ownId){
      const present=new Set();
      for(const item of players){
        if(!item||typeof item.id!=='string'||item.id.length>80||item.id===ownId||!Array.isArray(item.position)||item.position.length!==3||!item.position.every(n=>Number.isFinite(n)&&Math.abs(n)<=250))continue;
        present.add(item.id);let peer=peers.get(item.id);
        if(!peer){const mesh=new THREE.Group();const body=new THREE.Mesh(new THREE.CapsuleGeometry(.22,.88,3,8),new THREE.MeshStandardMaterial({color:'#d5e4ec',emissive:'#1c3440',metalness:.6,roughness:.3}));body.position.y=1;mesh.add(body);const halo=new THREE.Mesh(new THREE.TorusGeometry(.36,.022,4,24),new THREE.MeshBasicMaterial({color:'#e0f5ff'}));halo.rotation.x=Math.PI/2;halo.position.y=1.85;mesh.add(halo);scene.add(mesh);peer={mesh,target:new THREE.Vector3(),yaw:0};peers.set(item.id,peer);}
        peer.target.set(...item.position);peer.yaw=Number.isFinite(item.yaw)?item.yaw:0;
      }
      for(const id of [...peers.keys()])if(!present.has(id))removePeer(id);
      $('#presence-label').textContent=(peers.size+1)+' IN THE HALL';
    },
  }):noopPresence;
  function syncPresence(){presence.setAvailable(sessionReady&&!privateMode&&!pageHidden&&document.visibilityState!=='hidden'&&networkAvailable&&location.protocol!=='file:');}
  document.addEventListener('visibilitychange',syncPresence);
  globalThis.addEventListener?.('pagehide',()=>{pageHidden=true;syncPresence();});
  globalThis.addEventListener?.('pageshow',()=>{pageHidden=false;syncPresence();});
  globalThis.addEventListener?.('offline',()=>{networkAvailable=false;syncPresence();});
  globalThis.addEventListener?.('online',()=>{networkAvailable=true;syncPresence();});
  const sessionListeners=new Set();let sessionValue=null,lastSessionCheck=performance.now(),checkingSession=false;
  function applySession(data){
    role=['owner','staff'].includes(data.role)?data.role:'visitor';const capabilities=Array.isArray(data.capabilities)?data.capabilities:[];
    player.setCapabilities(Object.fromEntries(capabilities.map(name=>[name,role==='owner'])));if(role!=='owner')player.releaseGrapple();hookGroup.visible=role==='owner'&&!privateMode;$('#owner-abilities').hidden=role!=='owner';if(!privateMode)$('#session-label').textContent=role==='owner'?'OWNER / ALL TRAVERSAL ONLINE':role==='staff'?'STAFF / WELCOME BACK':'VISITOR / EXPLORE FREELY';
    sessionValue={role,capabilities,privateDestinations:role==='visitor'?[]:data.privateDestinations};for(const listener of sessionListeners)listener(sessionValue);return sessionValue;
  }
  // The session endpoint exists only on a worker-backed deployment; the current static
  // Pages deployment has no /api/session (an /api/* request there returns a 200 HTML
  // fallback), so the fetch stays off unless index.html declares it with the
  // pb-session-api meta. Static hosts therefore never poke a phantom /api route.
  const sessionApiAvailable=location.protocol!=='file:'&&!location.hostname.endsWith('.pages.dev')&&(document.querySelector('meta[name="pb-session-api"]')||{}).content==='on';
  async function refreshSession(){checkingSession=true;lastSessionCheck=performance.now();if(!sessionApiAvailable)return applySession({role:'visitor',capabilities:[]});try{const response=await fetch('/api/session',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(8000)});return applySession(response.ok?await response.json():{role:'visitor',capabilities:[]});}catch{return applySession({role:'visitor',capabilities:[]});}finally{checkingSession=false;}}
  const session=refreshSession().then(data=>{sessionReady=true;syncPresence();return data;});

  function update(dt,now){
    if(getStarted()&&!checkingSession&&now-lastSessionCheck>60000)void refreshSession();
    if(getStarted()&&!privateMode){$('#atlas-progress').hidden=false;$('#minimap').setAttribute('viewBox',player.z>43?'35 93 36 60':'0 0 106 106');marker.setAttribute('transform','translate('+(player.x+53)+' '+(player.z+53)+') rotate('+(-getYaw()*180/Math.PI)+')');for(const room of ROOMS)dots.get(room.id).setAttribute('display',(room.floor==='Upper')===(player.y>=8)?'block':'none');}
    const room=getRoom();if(room!==currentRoom){currentRoom=room;$('#profile-open').hidden=!room||privateMode;if(room){visited.add(room.id);for(const item of ROOMS)dots.get(item.id).setAttribute('fill-opacity',item.id===room.id?'1':visited.has(item.id)?'.65':'.25');$('#visited-count').textContent=visited.size+' / 20 DOMAINS';}}
    hookGroup.visible=role==='owner'&&!privateMode;
    for(const ring of hookGroup.children)ring.quaternion.copy(camera.quaternion);
    line.visible=!!player.grappleTarget&&!privateMode;
    if(line.visible){const positions=line.geometry.attributes.position;positions.setXYZ(0,player.x+.2,player.y+1.25,player.z);positions.setXYZ(1,player.grappleTarget.x,player.grappleTarget.y,player.grappleTarget.z);positions.needsUpdate=true;line.geometry.computeBoundingSphere();}
    for(const peer of peers.values()){peer.mesh.position.lerp(peer.target,Math.min(1,dt*12));peer.mesh.rotation.y=peer.yaw;}
    if(!privateMode&&getStarted()&&now-lastSend>125&&presence.position([player.x,Math.max(0,player.y),player.z],getYaw()))lastSend=now;
  }
  return {session,update,ability,onSession(listener){sessionListeners.add(listener);if(sessionValue)listener(sessionValue);},portal(destination){if(!privateMode&&presence.portal(Number.isInteger(Number(destination))?'room:'+Number(destination):destination))lastSend=performance.now();},get role(){return role;},setPrivate(value){privateMode=value;$('#atlas-progress').hidden=value;$('#profile-open').hidden=true;syncPresence();}};
}
