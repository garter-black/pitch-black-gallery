import * as THREE from './vendor/three.module.min.js';
import {BUILDING,BUILDING_ROOMS,PLAN_WALLS,planPoint,planBounds,buildingLocation,containsBuilding} from './real-building-data.js';

// Connected architectural reconstruction, enlarged for the virtual walkthrough. Photos and
// original plans remain in the private working archive, outside the web assets.
export function createRealBuilding({scene,floors,obstacles}){
 const firstFloor=floors.length,firstObstacle=obstacles.length;
 const root=new THREE.Group();root.name='Black Garter / 17–19 The Seven Ways';scene.add(root);
 const groups=new Map();let group;
 function zone(name){if(!groups.has(name)){const g=new THREE.Group();g.name=name;root.add(g);groups.set(name,g);}group=groups.get(name);return group;}
 const cube=new THREE.BoxGeometry(1,1,1),sphere=new THREE.SphereGeometry(1,14,10);
 const roundShape=new THREE.Shape();const r=.07;
 roundShape.moveTo(-.5+r,-.5);roundShape.lineTo(.5-r,-.5);roundShape.quadraticCurveTo(.5,-.5,.5,-.5+r);roundShape.lineTo(.5,.5-r);roundShape.quadraticCurveTo(.5,.5,.5-r,.5);roundShape.lineTo(-.5+r,.5);roundShape.quadraticCurveTo(-.5,.5,-.5,.5-r);roundShape.lineTo(-.5,-.5+r);roundShape.quadraticCurveTo(-.5,-.5,-.5+r,-.5);
 const soft=new THREE.ExtrudeGeometry(roundShape,{depth:.86,bevelEnabled:true,bevelSize:.07,bevelThickness:.07,bevelSegments:2,steps:1,curveSegments:3});soft.translate(0,0,-.43);soft.computeVertexNormals();
 const textures=[];
 function pattern(kind){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d');
  let seed=197;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  c.fillStyle=kind==='wood'?'#ad9b82':kind==='carpet'?'#777571':kind==='stone'?'#aca9a2':'#ada9a6';c.fillRect(0,0,256,256);
  for(let i=0;i<2400;i++){const a=rand();c.fillStyle=a>.5?'rgba(255,255,255,.085)':'rgba(0,0,0,.085)';const x=rand()*256,y=rand()*256;c.fillRect(x,y,kind==='wood'?1:2,kind==='wood'?10+rand()*60:2);}
  if(kind==='carpet'){for(let i=0;i<35;i++){c.fillStyle=i%5?'rgba(20,20,20,.12)':'rgba(194,151,58,.4)';c.fillRect(rand()*256,rand()*256,1+rand()*2,8+rand()*55);}}
  if(kind==='stone'){c.strokeStyle='rgba(57,47,40,.25)';c.lineWidth=.65;for(let i=0;i<7;i++){c.beginPath();c.moveTo(0,rand()*256);for(let x=20;x<=256;x+=20)c.lineTo(x,rand()*30+x*.57+i*30);c.stroke();}}
  if(kind==='wood'){for(let x=0;x<256;x+=64){c.fillStyle='rgba(0,0,0,.17)';c.fillRect(x,0,1,256);c.fillRect(x,(x*3)%256,64,1);}}
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(kind==='wood'?2:3,kind==='wood'?2:3);t.anisotropy=4;textures.push(t);return t;
 }
 const stoneMap=pattern('stone'),woodMap=pattern('wood'),carpetMap=pattern('carpet'),renderMap=pattern('render');
 const standard=(color,roughness=.65,metalness=0,map)=>new THREE.MeshStandardMaterial({color,roughness,metalness,...(map?{map}:{}),envMapIntensity:.28});
 // Original acanthus wallpaper, drawn at a readable scale without photo grain.
 // This is a decor interpretation of the current references, not a recovered print.
 function ceilingWallpaper(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;const c=canvas.getContext('2d');
  c.fillStyle='#111513';c.fillRect(0,0,1024,1024);
  function leaf(x,y,angle,length,width,color){c.save();c.translate(x,y);c.rotate(angle);c.fillStyle=color;c.beginPath();c.moveTo(0,0);c.bezierCurveTo(-width,-length*.3,-width*.65,-length*.9,0,-length);c.bezierCurveTo(width*.65,-length*.9,width,-length*.3,0,0);c.fill();c.strokeStyle='#b09761';c.lineWidth=1.5;c.beginPath();c.moveTo(0,-5);c.quadraticCurveTo(-width*.1,-length*.55,0,-length*.94);c.stroke();c.restore();}
  for(let row=-1;row<=2;row++)for(let col=-1;col<=2;col++){
   const x=col*512+(row%2)*256,y=row*512+180;c.save();c.translate(x,y);
   for(const sign of [-1,1]){c.strokeStyle='#8d7348';c.lineWidth=3;c.beginPath();c.moveTo(0,228);c.bezierCurveTo(sign*158,154,sign*128,-87,sign*18,-134);c.stroke();
    for(let i=0;i<6;i++){const t=i/5,px=sign*(28+Math.sin(t*Math.PI)*86),py=182-t*247;leaf(px,py,sign*(.72+t*.33),108-i*6,32,['#6d7150','#887a50','#4a5e4e'][i%3]);leaf(px,py,-sign*(.45-t*.15),74,23,'#3d5146');}}
   leaf(0,55,0,163,46,'#92815a');leaf(0,24,-.4,101,25,'#b3a071');leaf(0,24,.4,101,25,'#9c875b');
   c.fillStyle='#b59562';for(const [dx,dy,r]of [[0,228,5],[-11,240,3],[11,240,3]]){c.beginPath();c.arc(dx,dy,r,0,Math.PI*2);c.fill();}c.restore();
  }
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;textures.push(t);return t;
 }
 const wallpaperMap=ceilingWallpaper();
 const m={
  facade:standard('#131416',.81,0,renderMap),trim:standard('#0c0d0e',.43,.08),sage:standard('#151615',.66),cream:standard('#c6bdb0',.8),plum:standard('#20151b',.7),charcoal:standard('#101112',.56),
  wallpaper:standard('#ffffff',.86,0,wallpaperMap),panel:standard('#0d0f10',.42),tape:standard('#d2aa60',.31,.58),
  stone:standard('#55534f',.42,.08,stoneMap),marble:standard('#bcb29b',.24,.08,stoneMap),darkStone:standard('#242527',.27,.15,stoneMap),timber:standard('#504038',.54,0,woodMap),carpet:standard('#242320',.96,0,carpetMap),
  brass:standard('#ad8750',.3,.78),chrome:standard('#989fa2',.2,.88),linen:standard('#c9c6bb',.9),velvet:standard('#131415',.78),glass:standard('#516369',.13,.35),pink:standard('#cb8392',.75),leaf:standard('#344f31',.88),pot:standard('#343635',.72),
  glow:new THREE.MeshBasicMaterial({color:'#ffe6b3'}),redGlow:new THREE.MeshBasicMaterial({color:'#c46c64'}),window:standard('#637b86',.2,.25),black:new THREE.MeshBasicMaterial({color:'#0f1113'}),
 };
 m.wallpaper.emissive.set('#ffffff');m.wallpaper.emissiveMap=wallpaperMap;m.wallpaper.emissiveIntensity=.16;
 const wallpaperState={status:'fallback',asset:'/virtual-office/art/garter-ceiling-botanical-v1.png'};
 if(typeof document.createElementNS==='function'){
  wallpaperState.status='loading';new THREE.TextureLoader().load(wallpaperState.asset,t=>{
   t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;textures.push(t);
   m.wallpaper.map=t;m.wallpaper.emissiveMap=t;m.wallpaper.needsUpdate=true;wallpaperState.status='ready';
  },undefined,()=>{wallpaperState.status='fallback';console.warn('Black Garter ceiling wallpaper unavailable; using the local pattern.');});
 }
 function mesh(geometry,material,x,y,z,w,h,d,solid=false){const o=new THREE.Mesh(geometry,material);o.position.set(x,y,z);o.scale.set(w,h,d);group.add(o);if(solid)obstacles.push({minX:x-w/2,maxX:x+w/2,minY:y-h/2,maxY:y+h/2,minZ:z-d/2,maxZ:z+d/2});return o;}
 const box=(x,y,z,w,h,d,material=m.trim,solid=false)=>mesh(cube,material,x,y,z,w,h,d,solid);
 const cushion=(x,y,z,w,h,d,material=m.linen)=>mesh(soft,material,x,y,z,w,h,d);
 function plate(rect,y,material=m.carpet,holes=[]){
  let pieces=[planBounds(rect)];
  for(const hole of holes){const h=planBounds(hole),next=[];for(const b of pieces){const ax=Math.max(b.minX,h.minX),bx=Math.min(b.maxX,h.maxX),az=Math.max(b.minZ,h.minZ),bz=Math.min(b.maxZ,h.maxZ);if(ax>=bx||az>=bz){next.push(b);continue;}
   if(b.minX<ax)next.push({...b,maxX:ax});if(bx<b.maxX)next.push({...b,minX:bx});if(b.minZ<az)next.push({minX:ax,maxX:bx,minZ:b.minZ,maxZ:az});if(bz<b.maxZ)next.push({minX:ax,maxX:bx,minZ:bz,maxZ:b.maxZ});}pieces=next;}
  for(const b of pieces){box((b.minX+b.maxX)/2,y-.055,(b.minZ+b.maxZ)/2,b.maxX-b.minX,.11,b.maxZ-b.minZ,material,true);obstacles.at(-1).walkable=true;floors.push({...b,y,building:true});}
 }
 function worldFloor(x,z,w,d,y,material=m.stone){box(x,y-.08,z,w,.16,d,material,true);obstacles.at(-1).walkable=true;floors.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,y,building:true});}
 function wallRun(a,b,y,h=2.65,material=m.sage,trim=true){
  const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz),x=(a.x+b.x)/2,z=(a.z+b.z)/2;
  const o=box(x,y+h/2,z,.16,h,length+.13,material);o.rotation.y=Math.atan2(dx,dz);
  const count=Math.abs(dx)<.001||Math.abs(dz)<.001?1:Math.max(1,Math.ceil(length/.32));for(let i=0;i<count;i++){const t=(i+.5)/count,px=Math.abs(dx)<.001?.085:0,pz=Math.abs(dz)<.001?.085:0;obstacles.push({minX:a.x+dx*t-px-Math.abs(dx)/count/2,maxX:a.x+dx*t+px+Math.abs(dx)/count/2,minZ:a.z+dz*t-pz-Math.abs(dz)/count/2,maxZ:a.z+dz*t+pz+Math.abs(dz)/count/2,minY:y,maxY:y+h});}
  if(trim){
   for(const [dy,height,mat,width] of [[.06,.12,m.trim,.185],[1.01,.012,m.tape,.184],[h-.08,.1,m.trim,.185]]){const edge=box(x,y+dy,z,width,height,length+.15,mat);edge.rotation.y=o.rotation.y;}
   const dado=box(x,y+.51,z,.174,.91,length+.12,m.panel);dado.rotation.y=o.rotation.y;
   // Thin applied gold tape outlines each black panel on both wall faces.
   const panels=Math.max(1,Math.floor(length/1.12)),span=length/panels,ux=dx/length,uz=dz/length,nx=uz,nz=-ux;
   for(let i=0;i<panels;i++)for(const side of [-1,1]){
    const cx=a.x+ux*(i+.5)*span+nx*side*.093,cz=a.z+uz*(i+.5)*span+nz*side*.093,pw=Math.max(.14,span-.17);
    for(const dy of [.17,.86]){const strip=box(cx,y+dy,cz,.009,.009,pw,m.tape);strip.rotation.y=o.rotation.y;}
    for(const sign of [-1,1]){const strip=box(cx+ux*sign*pw/2,y+.515,cz+uz*sign*pw/2,.009,.69,.009,m.tape);strip.rotation.y=o.rotation.y;}
    if(h>2.35){const bottom=1.18,top=h-.28;
     for(const dy of [bottom,top]){const strip=box(cx,y+dy,cz,.009,.009,pw,m.tape);strip.rotation.y=o.rotation.y;}
     for(const sign of [-1,1]){const strip=box(cx+ux*sign*pw/2,y+(bottom+top)/2,cz+uz*sign*pw/2,.009,top-bottom,.009,m.tape);strip.rotation.y=o.rotation.y;}
    }
   }
  }
 }
 function walls(lines,y,h,material=m.sage,trim=true){for(const s of lines)wallRun(planPoint(s[0],s[1]),planPoint(s[2],s[3]),y,h,material,trim);}
 function textLabel(text,x,y,z,width=.9,height=.18,rotation=0,color='#eee9df'){
  const c=document.createElement('canvas');c.width=1024;c.height=192;const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='600 82px Helvetica, Arial, sans-serif';ctx.fillText(text,512,98,980);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;textures.push(t);
  const o=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false,side:THREE.FrontSide}));o.position.set(x,y,z);o.rotation.y=rotation;o.scale.x=-1;group.add(o);return o;
 }
 function rail(a,b,y0,y1){const d=new THREE.Vector3(b.x-a.x,y1-y0,b.z-a.z),len=d.length();const o=new THREE.Mesh(new THREE.CylinderGeometry(.027,.027,len,8),m.brass);o.position.set((a.x+b.x)/2,(y0+y1)/2+1,(a.z+b.z)/2);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());group.add(o);const count=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.7);for(let i=0;i<=count;i++){let t=i/count;box(a.x+(b.x-a.x)*t,y0+(y1-y0)*t+.48,a.z+(b.z-a.z)*t,.025,.96,.025,m.trim);}}
 const ramps=[];
 function ramp(a,b,width,y0,y1,steps=true,handrails=true){
  const alongX=Math.abs(b.x-a.x)>Math.abs(b.z-a.z),length=alongX?Math.abs(b.x-a.x):Math.abs(b.z-a.z),n=steps?Math.max(1,Math.ceil(Math.abs(y1-y0)/.16)):1;
  const minX=Math.min(a.x,b.x)-(alongX?0:width/2),maxX=Math.max(a.x,b.x)+(alongX?0:width/2),minZ=Math.min(a.z,b.z)-(alongX?width/2:0),maxZ=Math.max(a.z,b.z)+(alongX?width/2:0);
  const slopeX=alongX?(y1-y0)/(b.x-a.x):0,slopeZ=alongX?0:(y1-y0)/(b.z-a.z);
  const f={minX,maxX,minZ,maxZ,y:y0,slopeX,slopeZ,originX:a.x,originZ:a.z,building:true,ramp:true,rampId:ramps.length};floors.push(f);ramps.push(f);
  if(steps){for(let i=0;i<n;i++){const t=(i+.5)/n,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,y=y0+(y1-y0)*t;box(x,y-.065,z,alongX?length/n:width,.13,alongX?width:length/n,m.carpet,true);Object.assign(obstacles.at(-1),{walkable:true,rampSurface:true,rampId:f.rampId});box(x,y+.004,z,alongX?.02:width,.012,alongX?width:.02,m.brass);}}
  else {const pts=[minX,y0-.01,minZ,maxX,y0-.01,minZ,maxX,y1-.01,maxZ,minX,y1-.01,maxZ];const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));geo.setIndex([0,2,1,0,3,2]);geo.computeVertexNormals();group.add(new THREE.Mesh(geo,m.stone));}
  if(handrails){for(const sign of [-1,1]){const off=width/2-.055;rail({x:a.x+(alongX?0:sign*off),z:a.z+(alongX?sign*off:0)},{x:b.x+(alongX?0:sign*off),z:b.z+(alongX?sign*off:0)},y0,y1);}}
 }
 function stair(px0,py0,px1,py1,w,y0,y1){ramp(planPoint(px0,py0),planPoint(px1,py1),w,y0,y1);}
 function ceiling(rect,y,holes=[]){
  const old=floors.length,objects=group.children.length;plate(rect,y,m.charcoal,holes);floors.splice(old);
  // Underside UVs use room metres, so narrow halls do not stretch the motif.
  for(const slab of group.children.slice(objects)){const w=slab.scale.x,d=slab.scale.z,geo=new THREE.PlaneGeometry(w,d);const uv=geo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*w/3.4,uv.getY(i)*d/3.4);uv.needsUpdate=true;const paper=new THREE.Mesh(geo,m.wallpaper);paper.rotation.x=Math.PI/2;paper.position.set(slab.position.x,y-.113,slab.position.z);group.add(paper);}
 }
 function lightBar(x,y,z,w=.025,h=.025,d=2,mat=m.glow){box(x,y,z,w,h,d,mat);}
 function plant(x,y,z,scale=.7){box(x,y+.22*scale,z,.46*scale,.44*scale,.46*scale,m.pot,true);for(let i=0;i<7;i++){const a=i*2.4;const leaf=mesh(sphere,m.leaf,x+Math.sin(a)*.22*scale,y+(.7+i%3*.17)*scale,z+Math.cos(a)*.22*scale,.085*scale,.5*scale,.1*scale);leaf.rotation.z=Math.sin(a)*.7;leaf.rotation.x=Math.cos(a)*.7;}}
 function lamp(x,y,z){box(x,y+.34,z,.025,.6,.025,m.brass);const shade=new THREE.Mesh(new THREE.CylinderGeometry(.1,.15,.22,14),m.linen);shade.position.set(x,y+.68,z);group.add(shade);box(x,y+.025,z,.23,.05,.23,m.brass);}
 function sofa(x,y,z,w=2.2,angle=0){const parts=[];parts.push(cushion(x,y+.32,z,w,.46,.78,m.velvet),cushion(x,y+.72,z-.32,w,.76,.22,m.velvet));for(const s of [-1,1])parts.push(cushion(x+s*(w/2-.09),y+.55,z,.2,.55,.86,m.velvet));for(let i=0;i<Math.floor(w/.32);i++)parts.push(cushion(x-w/2+.22+i*.32,y+.81,z-.195,.25,.2,.05,m.velvet));if(angle)for(const o of parts){const dx=o.position.x-x,dz=o.position.z-z;o.position.x=x+Math.cos(angle)*dx+Math.sin(angle)*dz;o.position.z=z-Math.sin(angle)*dx+Math.cos(angle)*dz;o.rotation.y=angle;}obstacles.push({minX:x-(angle?.48:w/2),maxX:x+(angle?.48:w/2),minZ:z-(angle?w/2:.48),maxZ:z+(angle?w/2:.48),minY:y,maxY:y+.65});}
 function roomFit(room,index){const {minX,maxX,minZ,maxZ,y,kind}=room,w=maxX-minX,d=maxZ-minZ,cx=(minX+maxX)/2,cz=(minZ+maxZ)/2;
  const palette=room.palette==='plum'?m.plum:m.charcoal;
  // A rear feature wall and a carpet/stone patch differentiate real interiors.
  const frontBed=/^Suite (11|12)$/.test(room.name),frontOffice=room.name==='Staff office 4',northBed=room.y>=3&&room.rect[3]<420;
  const back=frontBed||frontOffice||kind==='bar'?minZ+.08:maxZ-.08;box(cx,y+1.22,back,w,.01+2.44,.07,palette);plate(room.rect,y+.008,kind==='spa'?m.darkStone:kind==='bed'&&room.palette==='cream'?m.timber:m.carpet,kind==='bar'?[[816,417,880,465]]:[]);
  if(kind==='bed'||kind==='spa'){
   const bedWidth=Math.min(1.46,w-.65),bedDepth=Math.min(1.95,d-.54),bx=northBed?maxX-bedWidth/2-.22:minX+bedWidth/2+.22,bz=frontBed?back+bedDepth/2+.06:back-bedDepth/2-.06;
   box(bx,y+.19,bz,bedWidth,.38,bedDepth,m.timber,true);cushion(bx,y+.46,bz,bedWidth,.22,bedDepth,m.linen);cushion(bx,y+.94,back-.07,bedWidth+.08,1.45,.1,palette);
   for(const side of [-1,1]){const pillow=mesh(sphere,m.linen,bx+side*bedWidth*.24,y+.65,back+(frontBed?.35:-.35),bedWidth*.22,.12,.25);pillow.rotation.z=side*.1;}
   cushion(bx,y+.6,bz-bedDepth*.12,bedWidth+.04,.05,bedDepth*.56,index%3?m.linen:m.velvet);
   if(w>2.3){const nx=northBed?maxX-bedWidth-.48:minX+bedWidth+.48,nz=frontBed?minZ+.3:maxZ-.3;box(nx,y+.31,nz,.38,.62,.4,m.chrome,true);lamp(nx,y+.63,nz);}
   if(room.palette==='cream'){for(const dy of [.92,2.15])box(cx,y+dy,back+(frontBed?.045:-.045),w-.24,.012,.014,m.tape);for(const side of [-1,1])box(cx+side*(w-.24)/2,y+1.535,back+(frontBed?.045:-.045),.012,1.23,.014,m.tape);}
   if(kind==='spa'&&w>2.4){const sx=maxX-.66,sz=minZ+.73;box(sx,y+.3,sz,1.18,.6,1.18,m.marble,true);mesh(sphere,m.linen,sx,y+.59,sz,.53,.06,.52);mesh(sphere,m.window,sx,y+.63,sz,.42,.018,.42);box(sx+.42,y+.81,sz+.34,.035,.24,.035,m.chrome);}
  }else if(kind==='office'){
   const deskZ=frontOffice?minZ+.47:maxZ-.45;
   box(cx,y+.73,deskZ,Math.min(1.6,w-.25),.065,.7,m.timber,true);for(const s of [-1,1])box(cx+s*Math.min(.6,w*.3),y+.35,deskZ,.04,.7,.55,m.trim);
   box(cx,y+1.03,deskZ+.05,.6,.36,.045,m.trim);box(cx,y+1.03,deskZ+.024,.53,.29,.008,m.window);cushion(cx,y+.44,frontOffice?deskZ+.82:Math.max(minZ+.4,maxZ-1.27),.5,.13,.5,m.velvet);
  }else if(kind==='laundry'||kind==='store'){
   if(kind==='laundry')for(let i=0;i<3;i++){const x=minX+.44+i*.73;box(x,y+.44,maxZ-.43,.66,.88,.65,m.cream,true);mesh(sphere,m.window,x,y+.42,maxZ-.767,.24,.24,.022);}
   else {box(cx,y+.9,maxZ-.24,Math.max(.7,w-.32),1.8,.42,m.timber,true);for(let row=0;row<4;row++){box(cx,y+.28+row*.42,maxZ-.47,Math.max(.7,w-.3),.04,.46,m.cream);for(let j=0;j<3;j++)cushion(cx+(j-1)*w*.22,y+.37+row*.42,maxZ-.49,w*.19,.13,.34,m.linen);}}
  }else {
   const sofaWidth=Math.min(2.55,w-1.05);sofa(maxX-.2-sofaWidth/2,y,minZ+.62,sofaWidth);if(d>3.3&&w>3.3)sofa(maxX-.55,y,cz,Math.min(2.6,d-1.6),Math.PI/2);
   const tableZ=Math.min(maxZ-1.25,minZ+1.95);box(cx,y+.33,tableZ,Math.min(1.15,w*.37),.13,.65,m.darkStone,true);box(cx,y+.14,tableZ,Math.min(.95,w*.33),.28,.5,m.brass);
   if(kind==='bar'){
    box(maxX-.47,y+.53,cz,.72,1.06,Math.min(3.1,d-.5),m.trim,true);box(maxX-.47,y+1.085,cz,.87,.085,Math.min(3.25,d-.35),m.marble);
    for(let j=0;j<5;j++){const z=minZ+.6+j*(d-1.2)/4;box(maxX-.85,y+.96,z,.035,.15,.035,m.brass);cushion(maxX-1.25,y+.64,z,.38,.12,.38,m.velvet);box(maxX-1.25,y+.31,z,.05,.6,.05,m.brass);}
   }
   plant(kind==='bar'?minX+.42:maxX-.42,y,kind==='bar'?minZ+.45:maxZ-.47,.8);
   // The camera photos show a glass-block feature wall with broken vertical LEDs.
   if(kind==='bar'){const columns=Math.max(3,Math.floor((w-.32)/.255)),rows=8;for(let ix=0;ix<columns;ix++)for(let iy=0;iy<rows;iy++)box(minX+.17+ix*.255,y+.48+iy*.255,minZ+.065,.233,.233,.11,m.glass);
    for(let j=0;j<5;j++){const x=minX+.25+(w-.5)*j/4;lightBar(x,y+1.42,minZ+.135,.018,1.86,.015);if(j%2)lightBar(x+.17,y+.55,minZ+.14,.35,.015,.015);}}
  }
  // Small plaques stay below the ceiling and have no people or private records.
  textLabel(room.name.toUpperCase(),cx,y+2.15,Math.min(maxZ-.12,minZ+.06),Math.min(w-.15,1.7),.2,0);
  for(const side of [-1,1]){
   lightBar(cx,y+2.46,cz+side*(d/2-.12),Math.max(.2,w-.25),.01,.012);
   lightBar(cx+side*(w/2-.12),y+2.46,cz,.012,.01,Math.max(.2,d-.25));
  }
  // Gold panels continue across the rear feature wall, which sits in front of
  // some traced structural runs. The glass-block lounge retains its feature.
  if(kind!=='bar'&&kind!=='laundry'&&kind!=='store'){
   const facing=frontBed||frontOffice?1:-1,zz=back+facing*.047,n=Math.max(1,Math.floor(w/1.1)),span=w/n;
   for(let j=0;j<n;j++){const xx=minX+(j+.5)*span,ww=Math.max(.1,span-.17);for(const dy of [.17,.86,1.15,2.26])box(xx,y+dy,zz,ww,.009,.008,m.tape);for(const sx of [-1,1]){box(xx+sx*ww/2,y+.515,zz,.009,.69,.008,m.tape);box(xx+sx*ww/2,y+1.705,zz,.009,1.11,.008,m.tape);}}
  }
 }

 zone('Passage and street');
 worldFloor(0,44.5,6,3,0);ramp({x:0,z:46},{x:0,z:58},5.2,0,3,false,true);worldFloor(0,62,28,8,3,m.stone);
 for(const x of [-2.8,2.8]){wallRun({x,z:43},{x,z:46},0,4.4,m.facade,false);box(x,1.55,52,.25,3.1,12,m.facade,true);lightBar(x*.93,.12,44.4,.035,.025,2.6);}
 for(const x of [-13.8,13.8])box(x,3.65,62,.25,1.3,8,m.facade,true);
 for(let x=-13;x<=13;x+=1.05)box(x,3.008,62,.012,.008,7.9,m.trim);
 for(const z of [58.5,60,61.5,63,64.5])box(0,3.012,z,27.5,.006,.012,m.trim);
 textLabel('BLACK GARTER',0,3.6,43.56,4.6,.68,Math.PI);textLabel('17–19 THE SEVEN WAYS',0,2.8,43.57,3.8,.36,Math.PI);
 textLabel('THE PANTHEON',0,3.6,43.7,4.4,.6,0);textLabel('RETURN TO THE ATRIUM',0,2.9,43.69,3.6,.3,0);
 for(const x of [-10,10]){box(x,4.8,61,.08,3.6,.08,m.trim);box(x,6.57,61,1.5,.12,.55,m.trim);lightBar(x,6.495,61,1.32,.015,.35);plant(x,3,64.7,1.1);}
 const firstVenueFloor=floors.length,firstVenueObstacle=obstacles.length;
 zone('Lower ground');
 plate([246,274,1135,612],.25,m.carpet);plate([246,222,996,273],.25,m.stone);
 walls(PLAN_WALLS.lower,.25,2.63,m.sage);
 // The room row and courtyard remain below open sky at the back of the plot.
 ceiling([244,420,640,614],2.94);ceiling([244,274,640,414],3.08);ceiling([838,420,1135,614],3.86,[[816,417,880,465]]);
 zone('Ground');
 ceiling([838,424,1135,614],7.64,[[969,423,1002,484]]);
 plate([399,274,1155,414],3.18,m.carpet,[[653,274,744,368]]);plate([998,224,1155,414],3,m.carpet);
 plate([908,224,998,368],3,m.carpet);plate([350,374,399,414],3.36,m.carpet);
 plate([838,424,1135,614],3.97,m.carpet,[[774,474,838,614],[816,417,880,465]]);
  plate([642,412,838,474],3.18,m.carpet,[[642,420,780,475]]);
 walls(PLAN_WALLS.ground.filter(s=>Math.max(s[1],s[3])<473),3.18,2.96,m.sage);
 walls(PLAN_WALLS.ground.filter(s=>Math.max(s[1],s[3])>=473),3.18,1.75,m.sage);
 // Lower-ground stair occupies the existing south stair core; smooth floor under treads.
 stair(648,446,778,446,1.25,.25,3.18);worldFloor(planPoint(797,446).x,planPoint(797,446).z,1.32,1.28,3.18,m.carpet);
 stair(817,441,878,441,1.28,3.18,3.97);
 // North return stair, joining the long hallway to the first-floor hallway.
 stair(677,398,677,303,1.11,3.18,4.81);plate([658,275,740,303],4.81,m.carpet);
 stair(720,303,720,398,1.11,4.81,6.44);
 zone('Mezzanine');
 ceiling([645,475,775,614],7.64);
 plate([647,475,775,612],4.93,m.timber);plate([775,552,807,578],4.93,m.carpet);
 walls(PLAN_WALLS.mezzanine,4.93,2.55,m.charcoal);
 // The shallow bar-to-mezzanine rise uses the south edge of the core. Keeping
 // it separate from the upper return flights avoids intersecting stair volumes.
 stair(838,592,775,592,.78,3.97,4.93);
 zone('First floor');
 plate([399,274,1155,414],6.44,m.carpet,[[653,274,744,395]]);plate([908,224,1155,368],6.44,m.carpet);
 plate([838,424,1135,614],7.64,m.darkStone,[[969,423,1002,484]]);plate([645,475,775,614],7.64,m.darkStone);plate([775,566,838,614],7.64,m.carpet);
 walls(PLAN_WALLS.first.filter(s=>s[1]<420&&s[3]<420),6.44,2.62,m.charcoal);
 walls(PLAN_WALLS.first.filter(s=>s[1]>=420||s[3]>=420),7.64,2.58,m.charcoal);
 stair(986,420,986,485,1.01,6.44,7.64);
 worldFloor(.03,planPoint(986,420).z,.42,1.01,6.44,m.carpet);
 stair(793,566,793,510,.82,4.93,6.285);plate([776,476,836,510],6.285,m.carpet);
 stair(821,510,821,566,.7,6.285,7.64);
 ceiling([399,273,1160,415],9.15,[[653,274,744,368]]);ceiling([908,224,1160,368],9.15);
 ceiling([839,424,1138,616],10.35);ceiling([644,474,839,616],10.35);

 for(const [i,room] of BUILDING_ROOMS.entries()){zone(room.y<2?'Lower ground':room.y<4.7?'Ground':room.y<5.8?'Mezzanine':'First floor');roomFit(room,i);}
 // Circulation now uses the black paint, gold tape and warm perimeter lighting.
 // Wallpaper above the ground hall follows the overhead first-floor slab.
 zone('Ground');ceiling([399,274,1155,414],6.44,[[653,274,744,395]]);
 for(const [zoneName,y] of [['Ground',3.18],['First floor',6.44]]){zone(zoneName);for(let px=410;px<1120;px+=65){const p=planPoint(px,399);box(p.x,y+2.52,p.z,.045,.045,1.85,m.chrome);lightBar(p.x+.45,y+2.57,p.z,.018,.018,1.8);}}
 zone('Exterior');
 // Two attached street facades, deliberately kept distinct like the actual frontage.
 const front=66.2;
 function facadeSection(x0,x1,y0,y1){box((x0+x1)/2,(y0+y1)/2,front,x1-x0,y1-y0,.28,m.facade,true);}
 const splits=[[-6.12,-.03,12.37],[-.03,6.08,11.57]];
 for(const [left,right,top] of splits){facadeSection(left,right,5.56,6.54);facadeSection(left,right,8.34,top);for(const x of [left+.07,right-.07])facadeSection(x-.07,x+.07,3,top);for(const h of [top-.1,top-.37])box((left+right)/2,h,front-.19,right-left+.12,.11,.22,m.trim);}
 // Window and door opening coordinates follow the A200 window/door schedule.
 function frontWindow(x,y,w,h){box(x,y,front-.026,w,h,.07,m.window,true);for(const s of [-1,1]){box(x+s*(w/2+.045),y,front-.18,.075,h+.19,.12,m.trim);box(x,y+s*(h/2+.045),front-.18,w+.16,.075,.12,m.trim);}box(x,y-h*.13,front-.22,w,.055,.1,m.chrome);}
 frontWindow(-2.6,4.95,4.1,1.73);frontWindow(.87,4.95,1.03,1.64);frontWindow(5.05,4.95,1.03,1.64);
 for(const [x,w,h,y] of [[-4.07,1.08,1.8,7.42],[-2.75,1.08,1.8,7.42],[.82,1.07,1.63,7.4],[2.94,.43,1.59,7.4],[5.03,1.07,1.63,7.4]])frontWindow(x,y,w,h);
 // Fill the facade around its openings without putting a collider across either door.
 for(const [a,b] of [[-6.05,-5.76],[-4.64,-4.60],[-.50,-.08],[.05,.27],[1.48,2.29],[3.59,4.44],[5.66,6.03]])facadeSection(a,b,3.08,5.56);
 for(const [a,b] of [[-6.03,-4.7],[-3.5,-3.35],[-2.15,-.08],[.06,.21],[1.43,2.65],[3.22,4.42],[5.65,6.03]])facadeSection(a,b,6.54,8.34);
 for(const [x,w] of [[-2.6,4.1],[.87,1.03],[5.05,1.03]])facadeSection(x-w/2-.05,x+w/2+.05,3.08,4.08);
 // Main door is open in the walkthrough; door leaf rests inside the vestibule.
 const doorX=2.94;for(const x of [doorX-.665,doorX+.665])box(x,4.23,front-.18,.085,2.48,.18,m.trim);
 worldFloor(doorX,66.6,1.2,1.6,3,m.darkStone);
 // The scaled hall threshold exceeds a normal step; a shallow inset ramp
 // joins the existing street datum without altering the movement controller.
 ramp({x:doorX,z:65.35},{x:doorX,z:66.12},1.16,3,3.18,false,false);
 box(doorX,5.47,front-.18,1.42,.12,.18,m.trim);box(doorX+.64,4.19,front+.7,.065,2.35,1.25,m.trim);box(doorX+.60,4.16,front+.22,.035,.45,.035,m.brass);
 textLabel('17–19',doorX,5.72,front-.20,.66,.21,Math.PI);
 // Left entrance threshold meets the lounge's raised floor.
 ramp({x:-5.18,z:64.7},{x:-5.18,z:67.1},1.08,3,3.97,true,false);
 textLabel('BLACK GARTER',3.0,10.25,front-.23,5.15,.81,Math.PI,'#f0e9d8');
 textLabel('Black Garter',-3.02,6.09,front-1.82,3.55,.38,Math.PI);
 // Right canopy is bowed glass; left shopfront has its separate straight awning.
 box(-3.06,6.32,front-.91,6.08,.16,1.85,m.trim);
 const canopyGlass=new THREE.MeshStandardMaterial({color:'#91a6a2',roughness:.16,metalness:.15,transparent:true,opacity:.45,side:THREE.DoubleSide,depthWrite:false});
 const canopyPts=[];for(let i=0;i<=24;i++){const x=.04+i*6.05/24,h=6.22+.57*Math.sin(Math.PI*i/24);canopyPts.push(x,h,front-.06,x,h,front-1.83);}
 const cg=new THREE.BufferGeometry();cg.setAttribute('position',new THREE.Float32BufferAttribute(canopyPts,3));const ids=[];for(let i=0;i<24;i++){let k=i*2;ids.push(k,k+1,k+2,k+1,k+3,k+2);}cg.setIndex(ids);cg.computeVertexNormals();group.add(new THREE.Mesh(cg,canopyGlass));
 for(let i=0;i<=8;i++){const x=.04+i*6.05/8,h=6.22+.57*Math.sin(Math.PI*i/8);box(x,h,front-.95,.055,.075,1.86,m.trim);}
 for(const z of [front-.06,front-1.83])for(let i=0;i<24;i++){const x0=.04+i*6.05/24,x1=.04+(i+1)*6.05/24,y0=6.22+.57*Math.sin(Math.PI*i/24),y1=6.22+.57*Math.sin(Math.PI*(i+1)/24);const b=box((x0+x1)/2,(y0+y1)/2,z,Math.hypot(x1-x0,y1-y0),.075,.065,m.trim);b.rotation.z=Math.atan2(y1-y0,x1-x0);}
 for(const x of [1.55,4.25]){box(x,5.06,front-.22,.14,.24,.17,m.brass);lightBar(x,4.86,front-.24,.055,.1,.06);}
 for(const x of [-5.74,-1.2])plant(x,3,64.8,1.05);
 // Side party walls and staggered roof silhouette match the joined building masses.
 wallRun({x:6.12,z:66.2},{x:6.12,z:89.3},.1,11.45,m.facade,false);
 wallRun({x:-6.12,z:66.2},{x:-6.12,z:81.6},.1,12.27,m.facade,false);
 wallRun({x:-6.12,z:81.6},{x:-6.12,z:94.05},.1,3.1,m.facade,false);
 wallRun({x:6.12,z:89.3},{x:6.12,z:94.05},.1,3.1,m.facade,false);
 wallRun({x:-6.12,z:94.05},{x:6.12,z:94.05},.1,3.1,m.facade,false);
 box(-3.04,10.6,73.65,6.02,.18,14.65,m.trim,true);box(3.04,9.4,77.7,6.02,.18,23,m.trim,true);
 // The actual courtyard voids stay open; a low coping defines their edges.
 for(const r of [[247,220,994,270],[245,420,635,614]]){const b=planBounds(r);for(const x of [b.minX,b.maxX])box(x,3.27,(b.minZ+b.maxZ)/2,.13,.3,b.maxZ-b.minZ,m.stone);}

 // One transform enlarges architecture, furnishings and circulation together.
 // Physics support planes and colliders receive the identical transform below.
 const s=BUILDING.experienceScale,pivot=BUILDING.experiencePivot;
 for(const [name,g]of groups)if(name!=='Passage and street'){g.scale.setScalar(s);g.position.set(pivot.x*(1-s),pivot.y*(1-s),pivot.z*(1-s));}
 for(const f of floors.slice(firstVenueFloor)){
  f.minX=pivot.x+(f.minX-pivot.x)*s;f.maxX=pivot.x+(f.maxX-pivot.x)*s;f.minZ=pivot.z+(f.minZ-pivot.z)*s;f.maxZ=pivot.z+(f.maxZ-pivot.z)*s;f.y=pivot.y+(f.y-pivot.y)*s;f.stepHeight=.28;
  if(f.originX!==undefined)f.originX=pivot.x+(f.originX-pivot.x)*s;if(f.originZ!==undefined)f.originZ=pivot.z+(f.originZ-pivot.z)*s;
 }
 for(const b of obstacles.slice(firstVenueObstacle)){if(b.walkable)b.stepHeight=.28;for(const axis of ['X','Y','Z']){const origin=pivot[axis.toLowerCase()];for(const edge of ['min','max'])b[edge+axis]=origin+(b[edge+axis]-origin)*s;}}
 // Batch inside each level/material, preserving local culling bounds. No hidden
 // floors or walls are removed when walking between the hub and the building.
 let instances=0,batches=0;
 for(const g of groups.values()){
  const byGeometry=new Map();for(const o of [...g.children]){if(![cube,soft,sphere].includes(o.geometry))continue;if(!byGeometry.has(o.geometry))byGeometry.set(o.geometry,new Map());const byMaterial=byGeometry.get(o.geometry);if(!byMaterial.has(o.material))byMaterial.set(o.material,[]);byMaterial.get(o.material).push(o);}
  for(const [geo,byMaterial] of byGeometry)for(const [mat,objects] of byMaterial){if(objects.length<2)continue;const batch=new THREE.InstancedMesh(geo,mat,objects.length);for(const [i,o]of objects.entries()){o.updateMatrix();batch.setMatrixAt(i,o.matrix);g.remove(o);}batch.computeBoundingSphere();batch.instanceMatrix.needsUpdate=true;g.add(batch);instances+=objects.length;batches++;}
 }
 // The drawing's top edge is on the right when viewed from the street. Reflect
 // the constructed X axis together with every collider and support plane.
 // Label planes counter-reflect locally, so their lettering remains readable.
 root.scale.x=-1;
 for(const f of floors.slice(firstFloor)){[f.minX,f.maxX]=[-f.maxX,-f.minX];if(f.originX!==undefined)f.originX=-f.originX;if(f.slopeX)f.slopeX=-f.slopeX;}
 for(const b of obstacles.slice(firstObstacle))[b.minX,b.maxX]=[-b.maxX,-b.minX];
 root.updateMatrixWorld(true);
 return {root,ramps,rooms:BUILDING_ROOMS,location:buildingLocation,contains:containsBuilding,collisionRadius:BUILDING.collisionRadius,receipt:{name:BUILDING.name,rooms:BUILDING_ROOMS.length,suites:16,levels:4,instancedObjects:instances,batches,frontage:BUILDING.frontage*s,sourceFrontage:BUILDING.frontage,experienceScale:s,wallpaper:wallpaperState,decor:'Black paint, gold-tape panels, acanthus ceiling wallpaper, warm perimeter light',reference:'A100–A103; current garter.black and [REMOVED-FORBIDDEN-DOMAIN].com.au decor references',lowerGroundHeadroomAdapted:true}};
}
