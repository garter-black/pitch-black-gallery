import {addNyxGallery} from './nyx-gallery.js';
import {addHestiaEmber} from './hestia-ember.js';
import {addArtemisAtelier} from './artemis-atelier.js';
import {addAthenaArchive} from './athena-archive.js';
import {addEuterpeResonance} from './euterpe-resonance.js';
// Original procedural architecture. No remote models, scene credentials or private spaces.
export const DOMAIN_FEATURES = {
  Hecate:['Three lunar thresholds','Constellation ceiling','Obsidian council wings'],
  Athena:['Double-height reading cloisters','Suspended index blades','Evidence worktables'],
  Hera:['Ceremonial colonnade','Folded silk canopy','Arrival reception'],
  Hedone:['Pleated velvet proscenium','Intimate theatre seating','Suspended mirror canopy'],
  Artemis:['Faceted cathedral vaults','Jewellery vitrines','Platinum appraisal benches'],
  Aphrodite:['Petal rotunda','Rosewater lounges','Pearl veil screens'],
  Nyx:['Offset exhibition walls','Monochrome art panels','Sculpture plinth sequence'],
  Hestia:['Timber mountain rafters','Hearthside living room','Geometric alpine window'],
  Thalia:['Impossible ribbon ceiling','Asymmetric salon islands','Kinetic framing'],
  Persephone:['Root-grown arches','Luminous flower beds','Machine-wall conduits'],
  Euterpe:['Acoustic nave','Listening terraces','Waveform frieze'],
  Erato:['Projection chamber','Cinema seating aisles','Oxblood curtain walls'],
  Cassandra:['Rain-window lobby','Emerald reception','Midnight hospitality lounge'],
  Circe:['Ceramic fabrication arches','Media workstations','Programmable wall arrays'],
  Selene:['Observatory dome','Lunar instrument terrace','Pearl executive lounge'],
  Demeter:['Greenhouse ribs','Canopy aqueducts','Living machinery'],
  Medea:['Overhead forge gantry','Copper heat exchangers','Tool-lined workbenches'],
  Peitho:['Sandstone hearing chamber','Colonnaded benches','Suspended balance'],
  Styx:['Layered fortress ribs','Blackwater causeway','Sentinel wall slots'],
  Eos:['Opaline folded canopy','Instrument laboratory','Dawn horizon wall'],
};

export function configureArchitecturalLight({THREE,renderer,scene,mats}){
  // A generated studio environment gives metal real broad reflections without a downloaded HDRI.
  const environment=new THREE.Scene();
  environment.background=new THREE.Color('#293039');
  const panelGeo=new THREE.PlaneGeometry(1,1);
  const panels=[
    [0,18,0,36,26,1.8,'#f5f1e6',-Math.PI/2,0],
    [-18,3,0,20,30,1.1,'#d8e5f5',0,Math.PI/2],
    [18,7,-3,8,24,.65,'#8da3b9',0,-Math.PI/2],
    [0,5,-23,28,8,.8,'#e9e3d7',0,0],
    [0,8,23,20,5,.5,'#b1c8df',0,Math.PI],
  ];
  for(const [x,y,z,w,h,intensity,color,rx,ry] of panels){
    const material=new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(intensity),side:THREE.DoubleSide});
    const panel=new THREE.Mesh(panelGeo,material);panel.position.set(x,y,z);panel.scale.set(w,h,1);panel.rotation.set(rx,ry,0);environment.add(panel);
  }
  const pmrem=new THREE.PMREMGenerator(renderer);
  const target=pmrem.fromScene(environment,.05,.1,100);
  scene.environment=target.texture;scene.environmentIntensity=.72;
  pmrem.dispose();panelGeo.dispose();environment.traverse(node=>node.material?.dispose());

  const surface=document.createElement('canvas');surface.width=256;surface.height=256;
  const context=surface.getContext('2d');const pixels=context.createImageData(256,256);
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){
    const i=(y*256+x)*4;
    const grain=((x*73+y*131+x*y*17)%47)-23;
    const vein=Math.sin(x*.025+Math.sin(y*.034)*2.5)*4;
    const value=127+grain*.38+vein;
    pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=value;pixels.data[i+3]=255;
  }
  context.putImageData(pixels,0,0);
  const bump=new THREE.CanvasTexture(surface);bump.wrapS=bump.wrapT=THREE.RepeatWrapping;bump.repeat.set(4,4);
  mats.stone.bumpMap=bump;mats.stone.bumpScale=.055;mats.stone.roughness=.69;mats.stone.color.set('#7f8485');
  mats.dark.bumpMap=bump;mats.dark.bumpScale=.021;mats.dark.roughness=.29;mats.dark.metalness=.48;
  mats.silver.roughness=.23;mats.silver.metalness=.88;
  mats.white.roughness=.51;
  return {environment:'original procedural light panels',retainedEnvironmentTarget:target};
}

export function addArchitecture({THREE,scene,ROOMS,mats,box,floor,label,ring,animated,obstacles}){
  const startObjects=scene.children.length;
  const standard=(color,roughness=.5,metalness=.25)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const warm=standard('#bcb8aa',.71,.08),leather=standard('#242628',.74,.08),wood=standard('#6a5140',.78,.04),bronze=standard('#a29177',.35,.68);
  const soil=standard('#252d25',.95,0),foliage=standard('#778074',.87,0),rug=standard('#2a3033',.93,0);
  const paleGlow=new THREE.MeshBasicMaterial({color:'#e6e8df'});
  const softLight=new THREE.MeshBasicMaterial({color:'#c9d6e3',transparent:true,opacity:.065,depthWrite:false,side:THREE.DoubleSide});
  const cylinderGeo=new THREE.CylinderGeometry(1,1,1,16);
  const sphereGeo=new THREE.SphereGeometry(1,16,10);
  // Tiny unlit ceiling stars keep rounded silhouettes with fewer surface segments.
  const starGeo=new THREE.SphereGeometry(1,8,6);
  const staticCurves=[];
  let newSolidCount=0;
  function solidBox(...args){newSolidCount++;return box(...args,true);}
  function cylinder(x,y,z,radius,height,material,solid=false){
    const mesh=new THREE.Mesh(cylinderGeo,material);mesh.position.set(x,y,z);mesh.scale.set(radius,height,radius);scene.add(mesh);
    if(solid){newSolidCount++;obstacles.push({minX:x-radius,maxX:x+radius,minY:y-height/2,maxY:y+height/2,minZ:z-radius,maxZ:z+radius});}
    return mesh;
  }
  function sphere(x,y,z,rx,ry,rz,material){const mesh=new THREE.Mesh(sphereGeo,material);mesh.position.set(x,y,z);mesh.scale.set(rx,ry,rz);scene.add(mesh);return mesh;}
  function curve(points,radius,material,segments=30){
    const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    const mesh=new THREE.Mesh(new THREE.TubeGeometry(path,segments,radius,6,false),material);scene.add(mesh);staticCurves.push(mesh);return mesh;
  }
  function beam(a,b,width,material){
    const midpoint=new THREE.Vector3(...a).add(new THREE.Vector3(...b)).multiplyScalar(.5);
    const direction=new THREE.Vector3(...b).sub(new THREE.Vector3(...a));
    const mesh=box(midpoint.x,midpoint.y,midpoint.z,width,direction.length(),width,material);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());return mesh;
  }
  function seat(x,y,z,w,d,material=leather,rotation=0){
    // The full footprint is solid; low cushions can be jumped onto.
    const base=solidBox(x,y+.34,z,w,.68,d,material);
    const back=box(x,y+.91,z-d*.41,w,1.14,.22,material);
    for(const sign of [-1,1])box(x+sign*(w*.5-.1),y+.71,z,.2,.65,d,mats.silver);
    if(rotation){base.rotation.y=rotation;back.rotation.y=rotation;}
  }
  function planter(x,z,w,d,y=0){
    solidBox(x,y+.38,z,w,.76,d,mats.dark);
    box(x,y+.775,z,w-.18,.025,d-.18,soil);
    for(let i=0;i<7;i++){
      const px=x+Math.sin(i*2.3)*(w*.36),pz=z+Math.cos(i*1.7)*(d*.32);
      const h=.65+(i%3)*.2;
      curve([[px,y+.75,pz],[px+.13,y+1.4,pz],[px-.18,y+.8+h,pz+.16]],.035,bronze,8);
      sphere(px,y+1+h,pz,.22,.43,.17,foliage);
    }
  }

  // Layered gallery edges and tapering supports turn thin platforms into architecture.
  for(const side of [-1,1]){
    box(side*17.1,9.78,0,.45,.35,68,mats.silver);
    box(side*17.12,9.38,0,.65,.32,68,mats.dark);
    box(side*17.18,9.14,0,.13,.055,68,paleGlow);
    for(const z of [-32,-16,0,16,32]){
      beam([side*19,4.7,z],[side*17.2,9.3,z],.21,mats.silver);
      box(side*27.8,8.9,z,1.7,.1,13.5,mats.silver);
      box(side*28.14,8.7,z,.11,.08,13.3,paleGlow);
      for(const y of [0,10]){
        const directorySide=side<0?'WEST':'EAST';
        label(directorySide,side*24.4,y+5.8,z+7.05,3.8,.6,'#bbc4cd',-side*Math.PI/2,'GALLERY / '+(y===0?'00':'01'));
      }
    }
    for(const z of [-40,-24,-8,8,24,40]){
      box(side*19,.24,z,1.45,.48,1.45,mats.dark);
      box(side*19,10.1,z,1.35,.35,1.35,mats.silver);
      for(const offset of [-.55,.55])box(side*19+offset,18.1,z,.12,15.8,.95,mats.dark);
    }
  }
  // Existing front and back bridges receive layered soffits and actual wayfinding.
  for(const z of [-38.5,38.5]){
    box(0,9.57,z,33.5,.42,8.6,mats.dark);
    for(const dz of [-4.18,4.18])box(0,9.29,z+dz,33.4,.085,.1,paleGlow);
    for(let x=-15;x<=15;x+=3)box(x,9.14,z,.1,.23,8.3,mats.silver);
  }
  label('WEST GALLERY',-10,12.8,34.08,7.5,1,'#dbe2e7',0,'01 / UPPER DOMAINS');
  label('EAST GALLERY',10,12.8,34.08,7.5,1,'#dbe2e7',0,'01 / UPPER DOMAINS');

  // A ribbed glass barrel-vault, open above the original structural crossbeams.
  const roof=[];
  for(let i=0;i<=16;i++){const x=-22+i*44/16;roof.push([x,26+7*Math.sqrt(Math.max(0,1-(x/22)**2))]);}
  for(let z=-42;z<=42;z+=7){
    curve(roof.map(([x,y])=>[x,y,z]),.13,mats.silver,48);
    curve(roof.map(([x,y])=>[x,y-.22,z]),.035,paleGlow,48);
  }
  for(let index=0;index<roof.length;index+=2){const [x,y]=roof[index];box(x,y,0,.11,.12,84,mats.silver);}
  const positions=[],normals=[],uv=[];
  for(let i=0;i<roof.length-1;i++)for(let j=0;j<12;j++){
    const z=-42+j*7,[x1,y1]=roof[i],[x2,y2]=roof[i+1];
    for(const p of [[x1,y1,z],[x2,y2,z],[x2,y2,z+7],[x1,y1,z],[x2,y2,z+7],[x1,y1,z+7]]){positions.push(...p);normals.push(0,-1,0);uv.push(p[0]/44,p[2]/84);}
  }
  const roofGeo=new THREE.BufferGeometry();roofGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));roofGeo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));roofGeo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));roofGeo.computeVertexNormals();
  const roofGlass=new THREE.MeshStandardMaterial({color:'#aabecb',roughness:.13,metalness:.33,transparent:true,opacity:.14,depthWrite:false,side:THREE.DoubleSide});
  scene.add(new THREE.Mesh(roofGeo,roofGlass));
  // A broad skylight above the glass gives the crown view a legible overhead surface.
  box(0,35.5,0,9,.07,80,new THREE.MeshBasicMaterial({color:'#cbd6dc'}));
  for(const x of [-5.2,5.2])box(x,35.4,0,.07,.12,80,mats.silver);
  for(const side of [-1,1]){
    const lightSheet=box(side*10.8,18,0,.012,22,55,softLight);lightSheet.rotation.z=side*.35;
  }
  // A civic-scale rear elevation frames the existing wordmark and crown cantilever.
  for(const side of [-1,1]){
    box(side*15.4,15.5,-42.16,1.1,29,.45,mats.white);
    box(side*14.73,15.5,-41.88,.055,28.7,.045,paleGlow);
    for(let x=19.5;x<47;x+=2.2)box(side*x,15,-42.13,.36,29,.65,x%3>1?mats.stone:mats.dark);
    box(side*13.8,23.6,-36.3,.32,.66,13.4,mats.silver);
    beam([side*13,20,-42],[side*10,23.65,-30],.25,mats.silver);
  }
  box(0,23.53,-29.7,27.5,.66,.32,mats.dark);box(0,23.18,-29.51,26.8,.055,.04,paleGlow);
  // Quiet seating groups flank the clear central promenade.
  for(const side of [-1,1])for(const z of [-19,20]){
    seat(side*12,0,z,4.2,1.65);
    cylinder(side*12,.34,z+2.6,.9,.68,mats.silver,true);
    box(side*12,.7,z+2.6,1.1,.025,1.1,warm);
    planter(side*12,z-2.8,4.5,1.15);
    box(side*12,.032,z+1.1,6.4,.012,7.9,rug);
  }
  // Public informational kiosks, with architectural maps rather than command affordances.
  for(const side of [-1,1]){
    solidBox(side*10,1.1,31,1.3,2.2,.38,mats.dark);
    box(side*10,1.42,31.21,1.03,1.3,.025,mats.silver);
    for(let i=0;i<5;i++)for(const column of [-1,1])box(side*10+column*.28,1.92-i*.23,31.235,.38,.14,.012,i===2?paleGlow:mats.dark);
    label('DIRECTORY',side*10,2.54,31.23,2.7,.48,'#d5dde3',0,'20 DOMAINS / EXPLORE');
  }
  // Refined crown furnishings remain peripheral to the public overlook landing.
  seat(-8.7,24,-37,4,1.7);seat(8.7,24,-37,4,1.7);
  for(const x of [-8.7,8.7]){cylinder(x,24.34,-34.8,.85,.68,mats.silver,true);box(x,26.6,-41.85,4.6,3.7,.07,mats.dark);}
  for(const x of [-11.5,11.5]){box(x,27.7,-37,.075,.07,9,paleGlow);}
  label('RIO',0,25.76,-36.76,2.1,.4,'#e0e5e4',0,'CROWN OFFICE');

  const roomReceipts=[];
  for(const room of ROOMS){
    const countBefore=scene.children.length;
    const {side,y,z,color}=room;
    const accent=standard(color,.46,.37),dim=standard(new THREE.Color(color).multiplyScalar(.26),.59,.32);
    const light=new THREE.MeshBasicMaterial({color});
    const X=u=>side*(29+u),Z=v=>z+v;
    const B=(u,h,v,w,ht,d,material=accent,solid=false)=>solid?solidBox(X(u),y+h,Z(v),w,ht,d,material):box(X(u),y+h,Z(v),w,ht,d,material);
    const C=(u,h,v,r,ht,material=accent,solid=false)=>cylinder(X(u),y+h,Z(v),r,ht,material,solid);
    const S=(u,h,v,rx,ry,rz,material=accent)=>sphere(X(u),y+h,Z(v),rx,ry,rz,material);
    const T=(points,r,material=accent,segments=28)=>curve(points.map(([u,h,v])=>[X(u),y+h,Z(v)]),r,material,segments);
    const L=(text,u,h,v,w=6,ht=1,sub='')=>label(text,X(u),y+h,Z(v),w,ht,color,-side*Math.PI/2,sub);
    const arc=(u,base,width,height,material=accent,r=.08)=>T(Array.from({length:17},(_,i)=>{const t=i/16;return [u,base+height*Math.sin(t*Math.PI),-width/2+t*width];}),r,material,32);
    const localBeam=(a,b,w,material=accent)=>beam([X(a[0]),y+a[1],Z(a[2])],[X(b[0]),y+b[1],Z(b[2])],w,material);
    const localSeat=(u,v,w=2.2,d=1.6,material=dim)=>seat(X(u),y,Z(v),w,d,material);
    const consoleDesk=(u,v,material=mats.white)=>{
      B(u,.84,v,2.5,.18,1.2,material,true);for(const du of [-.92,.92])B(u+du,.4,v,.11,.8,.82,mats.silver);
      B(u,1.32,v-.23,1.1,.72,.08,mats.dark);B(u,1.34,v-.18,.99,.58,.012,light);
      for(let i=0;i<4;i++)B(u-.36+i*.24,1.36,v-.164,.035,.28+(i%2)*.12,.008,mats.dark);
    };
    // A layered threshold and subtle cove belong to every room; interiors below diverge.
    for(const sign of [-1,1]){
      B(.34,3.2,sign*3.22,.16,6.42,.16,mats.silver);
      B(.55,.24,sign*4.75,.5,.48,2.65,mats.dark);
      B(9,8.31,sign*7.36,17.4,.11,.15,accent);
      B(9,8.19,sign*7.38,16.7,.035,.03,light);
    }
    B(9,8.35,0,17.4,.075,.065,light);
    L(room.role,17.43,1.9,0,7.3,.58,'PUBLIC PROFILE / VIEW ONLY');

    switch(room.god){
      case 'Hecate': {
        for(const u of [5.2,9.6,14]){
          arc(u,1.1,12,6.4,mats.silver,.14);
          arc(u,1.2,11.7,6.15,light,.035);
          for(const sign of [-1,1])B(u,1.25,sign*5.8,.6,2.5,.9,mats.dark,true);
        }
        for(const sign of [-1,1]){B(7.5,.8,sign*5.9,3.5,1.6,1.15,dim,true);B(7.5,1.64,sign*5.9,3.6,.06,1.22,mats.silver);}
        for(let i=0;i<42;i++){const u=2+(i*17%149)/10,v=-6.6+(i*31%132)/10;S(u,8.26,v,.023+(i%3)*.009,.022,.023,light).geometry=starGeo;}
        break;
      }
      case 'Athena': {
        for(const sign of [-1,1])for(const u of [3.3,6.6,9.9]){
          B(u,3.3,sign*6.7,.28,6.6,1.3,warm,true);
          B(u+1.35,6.45,sign*6.7,2.7,.24,1.3,warm);
          for(let shelf=0;shelf<5;shelf++)B(u+1.35,.8+shelf*1.03,sign*6.65,2.5,.11,1.1,bronze);
        }
        for(let i=0;i<11;i++)B(6.2+i*.73,7.3,0,.045,1.6,5.8,i%3?warm:mats.silver);
        for(const sign of [-1,1])consoleDesk(6,sign*4.25,warm);
        addAthenaArchive({THREE,scene,room});
        L('ARCHIVE / 01',16.75,4.6,0,6.6,.8,'EVIDENCE · INSTRUMENTS · KNOWLEDGE');
        break;
      }
      case 'Hera': {
        const silk=new THREE.MeshStandardMaterial({color:'#e5dcc6',roughness:.93,side:THREE.DoubleSide});
        for(const sign of [-1,1])for(const u of [3.2,6.8,10.4,14]){C(u,3.25,sign*5.8,.28,6.5,warm,true);C(u,6.6,sign*5.8,.46,.2,mats.silver);}
        for(const u of [4.2,8.7,13.2]){
          const canopy=new THREE.Mesh(new THREE.ConeGeometry(4.2,.75,4,1,true),silk);canopy.position.set(X(u),y+6.8,z);canopy.rotation.y=Math.PI/4;canopy.scale.z=.95;scene.add(canopy);
        }
        B(4.5,.78,-4.4,3.4,1.56,1.35,warm,true);B(4.5,1.61,-4.4,3.6,.08,1.6,mats.silver);L('ARRIVAL',4.5,2.5,-4.4,3.5,.55);
        localSeat(5.5,4.5,3.3,1.6,warm);break;
      }
      case 'Hedone': {
        for(let i=0;i<26;i++)C(17.32,4,-7.1+i*.55,.27,7.8,dim);
        for(const u of [4,7.2])for(const v of [-4.6,-2.7,2.7,4.6])localSeat(u,v,1.35,1.28,dim);
        for(const u of [4.4,8.7,13]){arc(u,1.4,13.2,5.8,accent,.21);arc(u,1.45,12.7,5.5,light,.025);}
        for(let i=0;i<6;i++){const mirror=B(5.5+i*1.65,7.6,0,1.2,.1,9,mats.silver);mirror.rotation.x=(i%2?.05:-.05);}
        break;
      }
      case 'Artemis': {
        for(const u of [4.5,8.5,12.5,16]){
          for(const sign of [-1,1]){localBeam([u,.15,sign*6],[u,5.1,sign*4.9],.2,mats.silver);localBeam([u,5.1,sign*4.9],[u,7.8,0],.2,mats.silver);localBeam([u,.18,sign*5.75],[u,5.0,sign*4.68],.036,light);localBeam([u,5,sign*4.68],[u,7.54,0],.036,light);}
        }
        for(const sign of [-1,1])for(const u of [4.7,8.2,11.7]){
          B(u,.64,sign*5.1,1.95,1.28,1.35,mats.white,true);
          B(u,1.35,sign*5.1,2.04,.055,1.45,mats.silver);
          B(u,1.74,sign*5.1,1.85,.74,1.26,mats.glass);
        }
        addArtemisAtelier({THREE,scene,room});
        L('CELESTYN',17.38,4.8,0,8.4,1.05,'DIAMOND ATELIER');break;
      }
      case 'Aphrodite': {
        const petals=['#b99b9f','#d5b9bc'].map(color=>new THREE.MeshStandardMaterial({color,side:THREE.DoubleSide,roughness:.6}));
        for(let i=0;i<7;i++){
          const a=i*Math.PI*2/7;
          const petal=new THREE.Mesh(new THREE.SphereGeometry(1,18,10,0,Math.PI*2,0,Math.PI/2),petals[i%2]);
          petal.position.set(X(10+Math.cos(a)*2),y+6.2,Z(Math.sin(a)*2));petal.scale.set(3.5,.36,1.7);petal.rotation.y=a;scene.add(petal);
        }
        for(const sign of [-1,1]){localSeat(5.5,sign*4.5,3.4,1.7,accent);C(8,.32,sign*4.5,.66,.64,mats.silver,true);for(let i=0;i<9;i++)B(11+i*.6,4.2,sign*6.9,.045,6.2,.13,warm);}
        break;
      }
      case 'Nyx': {
        const gallery=addNyxGallery({THREE,scene,room});
        obstacles.push(...gallery.colliders);newSolidCount+=gallery.colliders.length;
        for(const [u,v,w] of [[4.8,-5.8,2.4],[8.3,5.9,3.1],[11.3,-5.8,2.6]]){
          B(u,2.8,v,w,5.6,.28,mats.dark,true);B(u,3.05,v+(v<0?.155:-.155),w*.8,3.7,.025,mats.white);
          for(let i=0;i<4;i++){const cut=B(u-w*.2+i*w*.14,3.05,v+(v<0?.175:-.175),.055,3.25,.018,mats.dark);cut.rotation.z=(i-1.5)*.16;}
          B(u,5.78,v,w+.4,.055,.28,light);
        }
        for(const u of [3.5,7,10.5,14]){const knife=B(u,7.4,0,.07,.1,10.5,mats.silver);knife.rotation.y=.17;}
        L('NYX / COLLECTION',17.35,4.6,0,8,.8,'FORM · SHADOW · SILENCE');break;
      }
      case 'Hestia': {
        const ember=addHestiaEmber({THREE,scene,room});
        obstacles.push(ember.cabinetCollider);newSolidCount++;
        for(const u of [3.2,6.5,9.8,13.1,16.4])for(const sign of [-1,1]){localBeam([u,5.2,sign*7],[u,8,0],.31,wood);B(u,3.1,sign*7,.24,6.2,.24,wood,true);}
        for(const v of [-5.2,-2.6,0,2.6,5.2])B(10,7.94-Math.abs(v)*.38,v,16,.15,.2,wood);
        localSeat(6,-4.9,3.7,1.8,dim);localSeat(7,4.7,3.8,1.8,warm);B(6,.32,2,2.2,.64,1.1,wood,true);
        for(let i=0;i<7;i++){const log=C(15,.22+(i%2)*.35,-5.7+i*.21,.16,1.7,wood);log.rotation.z=Math.PI/2;}
        for(const v of [-5.7,5.7]){const peak=new THREE.Mesh(new THREE.ConeGeometry(1.25,3.5,3),mats.white);peak.position.set(X(17.18),y+4.4,Z(v));peak.rotation.z=Math.PI/2;scene.add(peak);}
        break;
      }
      case 'Thalia': {
        for(const sign of [-1,1]){
          T([[2.5,5.5,sign*5.9],[5,7.3,sign*3.8],[9,6.2,sign*5.4],[12,7.7,sign*2.8],[16,6.1,sign*5.8]],.25,sign<0?accent:warm,42);
          localSeat(5.2,sign*4.8,2.8,1.7,sign<0?accent:warm);
          const framing=B(10,4.2,sign*6.6,5.5,.13,.24,mats.silver);framing.rotation.z=side*sign*.35;
        }
        for(let i=0;i<7;i++){const slab=B(3.8+i*1.3,.055,-3.5,1,.06,1.2,i%2?warm:dim);slab.rotation.y=(i%3)*.2;}
        break;
      }
      case 'Persephone': {
        for(const u of [3.4,7.2,11,14.8]){
          T([[u,.3,-6.4],[u-.5,3.4,-5.8],[u+.7,6.3,-3.7],[u,7.7,0],[u-.7,6.3,3.7],[u+.5,3.4,5.8],[u,.3,6.4]],.2,dim,38);
          T([[u,.4,-6.2],[u-.3,3.5,-5.6],[u+.8,6.5,-3.5],[u,7.5,0],[u-.7,6.1,3.7],[u+.4,3.3,5.6],[u,.4,6.2]],.035,light,38);
        }
        for(const sign of [-1,1])for(let i=0;i<8;i++){
          const u=2.8+i*1.7;B(u,.24,sign*6.4,1.5,.48,1.1,dim,true);
          T([[u,.3,sign*6.4],[u+.3,1.3,sign*6.2],[u-.1,1.8,sign*6.3]],.03,mats.silver,8);
          S(u,1.75,sign*6.3,.21,.16,.28,light);
        }
        break;
      }
      case 'Euterpe': {
        addEuterpeResonance({THREE,scene,room});
        for(let i=0;i<10;i++)arc(2.8+i*1.48,.7,13.1,6.8,i%3?wood:accent,.14);
        for(const sign of [-1,1]){for(const u of [4.2,7.8])localSeat(u,sign*4.5,2.6,1.5,dim);for(let i=0;i<31;i++)B(17.35,4.3,-6.7+i*.44,.055,.35+Math.abs(Math.sin(i*.72))*2.4,.07,light);}
        break;
      }
      case 'Erato': {
        for(const u of [3.2,6.1,9])for(const v of [-4.8,-3.2,3.2,4.8])localSeat(u,v,1.2,1.2,dim);
        for(const sign of [-1,1])for(let i=0;i<26;i++)C(2.5+i*.57,3.6,sign*7.18,.16,7.1,dim);
        B(3.4,6.4,0,1.6,.9,1,mats.dark);C(4.28,6.4,0,.22,.35,mats.silver).rotation.z=Math.PI/2;
        const projection=new THREE.Mesh(new THREE.ConeGeometry(2.2,11.5,4,1,true),softLight);projection.position.set(X(10.1),y+5.1,z);projection.rotation.z=side*Math.PI/2;projection.rotation.x=Math.PI/4;scene.add(projection);
        for(const sign of [-1,1])B(17.2,4.2,sign*5.55,.1,5.7,.07,light);
        break;
      }
      case 'Cassandra': {
        for(let i=0;i<24;i++)B(17.24,4.2,-6.8+i*.58,.04,7.2,.06,i%3?accent:mats.silver);
        for(let i=0;i<36;i++)B(17.15,1.2+(i*17%57)/10,-6.8+(i*29%136)/10,.014,.42+(i%4)*.2,.014,light);
        B(4.8,.86,-4.8,3.8,1.72,1.7,dim,true);B(4.8,1.76,-4.8,4,.09,1.9,bronze);L('AFTERHOURS',4.8,2.75,-4.8,3.4,.6);
        localSeat(5,4.4,4.1,1.65,dim);C(8,.36,4.3,.78,.72,bronze,true);
        for(const u of [3.4,9.3,15.2])arc(u,2.5,13.4,4.6,bronze,.065);
        break;
      }
      case 'Circe': {
        for(const u of [4,8.4,12.8]){
          for(const sign of [-1,1]){localBeam([u,0,sign*6.4],[u+1.1,5.7,sign*5.3],.38,mats.white);localBeam([u+1.1,5.7,sign*5.3],[u+1.7,7.5,0],.3,mats.white);}
        }
        for(const sign of [-1,1])for(const u of [4.8,8.3])consoleDesk(u,sign*4.75);
        for(let column=0;column<6;column++)for(let row=0;row<4;row++){B(17.3,2.2+row*.9,-5.5+column*2.2,.1,.6,1.65,dim);B(17.23,2.2+row*.9,-5.5+column*2.2,.015,.045,1.4,light);}
        break;
      }
      case 'Selene': {
        const dome=new THREE.Mesh(new THREE.SphereGeometry(1,32,14,0,Math.PI*2,0,Math.PI/2),new THREE.MeshStandardMaterial({color:'#8994a4',roughness:.4,metalness:.5,side:THREE.DoubleSide}));dome.position.set(X(10.2),y+6.5,z);dome.scale.set(6.7,1.5,6.7);scene.add(dome);
        for(let i=0;i<8;i++){const a=i*Math.PI/4;T([[10.2,8.05,0],[10.2+Math.cos(a)*4.5,7.64,Math.sin(a)*4.5],[10.2+Math.cos(a)*6.65,6.5,Math.sin(a)*6.65]],.04,mats.silver,16);}
        localSeat(5,-4.5,3.5,1.8,mats.white);C(8,.3,-4.5,.7,.6,mats.silver,true);
        C(7.4,1.1,4.2,.16,2.2,mats.silver,true);const telescope=C(7.9,2.1,4.2,.34,2.3,mats.white);telescope.rotation.z=-side*.9;
        S(17.2,4.4,0,.12,2.0,2.0,paleGlow);break;
      }
      case 'Demeter': {
        for(const u of [3.1,6.6,10.1,13.6,17.1]){
          for(const sign of [-1,1]){B(u,3.15,sign*6.7,.16,6.3,.16,warm,true);localBeam([u,6.3,sign*6.7],[u,8,0],.13,warm);}
        }
        for(const sign of [-1,1]){
          B(9.5,1.9,sign*6.7,15.5,.32,.67,bronze);B(9.5,2.08,sign*6.7,15,.05,.5,light);
          for(const u of [4,8,12,16]){C(u,.85,sign*6.3,.37,1.7,bronze,true);const wheel=ring(X(u),y+2.9,Z(sign*6.3),.67,.09,bronze,0);wheel.rotation.y=Math.PI/2;}
          for(let i=0;i<5;i++){const u=3.2+i*2.7;T([[u,2.1,sign*6.7],[u+.5,4.2,sign*6],[u-.3,6.5,sign*5.8]],.055,dim,16);S(u,6.4,sign*5.8,.8,.18,.45,accent);}
        }
        break;
      }
      case 'Medea': {
        for(const sign of [-1,1]){
          B(9,6.4,sign*5.6,16,.42,.4,mats.silver);
          for(const u of [3,9,15]){B(u,3.15,sign*6,.3,6.3,.3,dim,true);B(u,.87,sign*4.9,3.6,1.74,1.3,dim,true);B(u,1.78,sign*4.9,3.8,.09,1.5,bronze);}
          for(let i=0;i<14;i++)C(17.1,3.6,sign*(.7+i*.43),.11,5.9,bronze);
        }
        B(9,6.65,0,.44,.54,11.5,mats.silver);C(9,5.8,0,.16,1.25,bronze);
        for(let i=0;i<6;i++){const tool=B(4.7+i*.3,2.5,-6.95,.1,1.0+(i%2)*.3,.08,mats.silver);tool.rotation.z=.14*(i%3-1);}
        break;
      }
      case 'Peitho': {
        for(const sign of [-1,1])for(const u of [3.6,7.5,11.4,15.3]){
          C(u,3.1,sign*6.65,.27,6.2,warm,true);C(u,6.28,sign*6.65,.47,.15,bronze);
          if(u<12)localSeat(u,sign*4.7,2.8,1.4,warm);
        }
        B(13,5.9,0,.15,.14,6.2,bronze);
        for(const sign of [-1,1]){C(13,4.9,sign*2.7,.022,1.9,mats.silver);const pan=C(13,3.94,sign*2.7,.72,.08,bronze);pan.scale.x*=.85;}
        L('HEARING CHAMBER',17.24,4.55,0,8.6,.82,'HALL OF ACCORD');break;
      }
      case 'Styx': {
        for(const u of [3.4,6.8,10.2,13.6,17]){
          for(const sign of [-1,1]){B(u,3.55,sign*6.5,.55,7.1,1.6,dim,true);B(u-side*.05,4,sign*5.65,.08,3.7,.045,light);}
          B(u,7.18,0,.55,.44,14.1,mats.dark);
        }
        for(const sign of [-1,1]){B(9,.045,sign*4.6,16,.035,2.1,mats.glass);B(9,.08,sign*3.51,16,.075,.11,mats.silver);}
        B(7.5,.016,0,13,.019,4.2,dim);
        break;
      }
      case 'Eos': {
        const opal=['#bcbec2','#ddcbbf'].map(color=>new THREE.MeshStandardMaterial({color,side:THREE.DoubleSide,roughness:.38,metalness:.34}));
        for(let i=0;i<8;i++){
          const u=3.5+i*1.45;
          const shard=new THREE.Mesh(new THREE.ConeGeometry(3.1,.7,3,1,true),opal[i%2]);shard.position.set(X(u),y+7.3,z);shard.rotation.y=i*.35;shard.scale.z=1.8;scene.add(shard);
        }
        for(const sign of [-1,1])for(const u of [4.7,8.4]){consoleDesk(u,sign*4.7,warm);C(u,2.05,sign*4.7,.24,.7,mats.silver);}
        B(17.35,4.3,0,.05,3.7,12,mats.white);B(17.31,3.54,0,.012,.055,12,light);
        for(let i=0;i<8;i++){const lens=ring(X(16.9),y+4.4,Z(-4.9+i*1.4),.44,.033,accent,0);lens.rotation.y=Math.PI/2;}
        break;
      }
    }
    roomReceipts.push({god:room.god,features:DOMAIN_FEATURES[room.god],newSceneObjects:scene.children.length-countBefore});
  }
  const unbatchedObjectCount=scene.children.length-startObjects;
  // Merge this pass's opaque non-box details by material. Existing architecture and
  // animated objects are not touched; ordinary boxes still use the host's instance batch.
  const mergeGroups=new Map();
  const hostBoxGeometry=scene.children.slice(startObjects).find(mesh=>mesh.geometry?.type==='BoxGeometry')?.geometry;
  for(const mesh of scene.children.slice(startObjects)){
    if(!mesh.isMesh||mesh.geometry===hostBoxGeometry||mesh.material.transparent||mesh.children.length||mesh.userData.text)continue;
    if(!mergeGroups.has(mesh.material))mergeGroups.set(mesh.material,[]);
    mergeGroups.get(mesh.material).push(mesh);
  }
  let mergedSourceMeshes=0;
  const vertex=new THREE.Vector3(),normal=new THREE.Vector3(),normalMatrix=new THREE.Matrix3();
  for(const [material,meshes] of mergeGroups){
    if(meshes.length<2)continue;
    const count=meshes.reduce((total,mesh)=>total+(mesh.geometry.index?.count??mesh.geometry.attributes.position.count),0);
    const positions=new Float32Array(count*3),normals=new Float32Array(count*3),uvs=new Float32Array(count*2);let cursor=0;
    for(const mesh of meshes){
      mesh.updateMatrix();normalMatrix.getNormalMatrix(mesh.matrix);
      const {position,normal:sourceNormal,uv:sourceUv}=mesh.geometry.attributes;
      const indices=mesh.geometry.index;const length=indices?.count??position.count;
      for(let i=0;i<length;i++){
        const index=indices?indices.getX(i):i;
        vertex.fromBufferAttribute(position,index).applyMatrix4(mesh.matrix);vertex.toArray(positions,cursor*3);
        if(sourceNormal)normal.fromBufferAttribute(sourceNormal,index).applyMatrix3(normalMatrix).normalize();else normal.set(0,1,0);
        normal.toArray(normals,cursor*3);
        uvs[cursor*2]=sourceUv?.getX(index)??0;uvs[cursor*2+1]=sourceUv?.getY(index)??0;cursor++;
      }
      scene.remove(mesh);
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.BufferAttribute(normals,3));geometry.setAttribute('uv',new THREE.BufferAttribute(uvs,2));geometry.computeBoundingSphere();
    const merged=new THREE.Mesh(geometry,material);merged.userData.architectureMergedSources=meshes.length;scene.add(merged);mergedSourceMeshes+=meshes.length;
  }
  starGeo.dispose(); // All star vertices are now owned by the existing material batch.
  return {version:2,rooms:roomReceipts,newSceneObjects:scene.children.length-startObjects,unbatchedObjectCount,mergedSourceMeshes,newSolidCount,hubFeatures:['Barrel-vault skylight','Layered galleries','Bridge soffits','Crown cantilever','Seating islands','Public wayfinding']};
}
