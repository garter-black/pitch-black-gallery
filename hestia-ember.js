// Original static joinery and hearth relief for Hestia's public Ember House.
// Glowing coals are display art, not a fire, heat or lighting simulation.
export function addHestiaEmber({THREE,scene,room}={}){
  if(!THREE?.BufferGeometry||!scene?.isScene||![-1,1].includes(room?.side)||!Number.isFinite(room?.y)||!Number.isFinite(room?.z))throw new TypeError('Ember House needs a scene and a finite public room');
  const group=new THREE.Group();group.name='Hestia / Hearth and timber joinery';group.userData.hestiaEmber=true;
  group.position.set(room.side*29,room.y,room.z);group.rotation.y=room.side<0?Math.PI:0;
  const owned=new Set(),batches=new Map(),meshes=[];let disposed=false;
  const dispose=()=>{if(disposed)return;disposed=true;group.removeFromParent();for(const resource of owned)resource.dispose();owned.clear();};
  try{
    const specs={
      limestone:{color:'#b4a28a',roughness:.87,metalness:.035},
      smokedOak:{color:'#583d2d',roughness:.84,metalness:.02},
      endgrain:{color:'#9c7650',roughness:.92,metalness:.015},
      iron:{color:'#20211e',roughness:.69,metalness:.35},
      bronze:{color:'#8e7758',roughness:.41,metalness:.72},
      ember:{color:'#a14d1d',emissive:'#db4d12',emissiveIntensity:1.6,roughness:.83,metalness:0},
    };
    for(const [name,parameters]of Object.entries(specs)){
      const material=new THREE.MeshStandardMaterial(parameters);material.name='Ember House / '+name;owned.add(material);
      batches.set(name,{material,positions:[],normals:[],components:[]});
    }
    const identity=new THREE.Quaternion();
    const rotate=(x,y,z,angle)=>new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(x,y,z),angle);
    function append(geometry,material,centre,scale,rotation,record){
      let expanded;
      try{
        geometry.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...centre),rotation,new THREE.Vector3(...scale)));
        expanded=geometry.index?geometry.toNonIndexed():geometry;
        const p=expanded.getAttribute('position'),n=expanded.getAttribute('normal'),batch=batches.get(material),firstVertex=batch.positions.length/3;
        const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),ab=new THREE.Vector3(),ac=new THREE.Vector3(),bounds=new THREE.Box3();
        for(let i=0;i<p.count;i+=3){
          a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1);c.fromBufferAttribute(p,i+2);
          if(ab.subVectors(b,a).cross(ac.subVectors(c,a)).lengthSq()<1e-18)continue;
          for(let j=i;j<i+3;j++){
            a.fromBufferAttribute(p,j);bounds.expandByPoint(a);batch.positions.push(a.x,a.y,a.z);
            a.fromBufferAttribute(n,j).normalize();batch.normals.push(a.x,a.y,a.z);
          }
        }
        batch.components.push({...record,firstVertex,vertexCount:batch.positions.length/3-firstVertex,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()}});
      }finally{if(expanded&&expanded!==geometry)expanded.dispose();geometry.dispose();}
    }
    const box=(name,kind,material,centre,dimensions,rotation=identity,extra={})=>append(new THREE.BoxGeometry(1,1,1),material,centre,dimensions,rotation,{name,kind,...extra});
    const cylinder=(name,kind,material,centre,radius,height,rotation=identity,segments=14,extra={})=>append(new THREE.CylinderGeometry(radius,radius,height,segments,1,false),material,centre,[1,1,1],rotation,{name,kind,...extra});
    const axial=rotate(0,0,1,Math.PI/2),endFace=rotate(0,1,0,Math.PI/2);

    // Two fitted wall linings start beyond the shared portal. Their narrow joints
    // and inset rails retain the existing rafters, window forms and seating.
    for(const sign of[-1,1]){
      box('Joinery / backing '+sign,'wall','smokedOak',[10.1,3.3,sign*7.72],[14.5,6.42,.08]);
      for(const h of[.12,1.02,6.47])box('Joinery / frame '+sign+'/'+h,'wall','endgrain',[10.1,h,sign*7.655],[14.52,.12,.085]);
      for(let i=0;i<37;i++){
        const u=2.98+i*.396;
        box('Joinery / fluted stile '+sign+'/'+i,'wall','endgrain',[u,3.76,sign*7.639],[.044,5.35,.085]);
        if(i%6===0)box('Joinery / pegged joint '+sign+'/'+i,'wall','bronze',[u,1.02,sign*7.588],[.024,.034,.018]);
      }
      for(const u of[3.22,9.76,16.82]){
        box('Joinery / lamp back '+sign+'/'+u,'wall','iron',[u,4.05,sign*7.575],[.16,1.38,.045]);
        box('Joinery / lamp brass '+sign+'/'+u,'wall','bronze',[u,4.05,sign*7.545],[.055,1.31,.035]);
        box('Joinery / lamp inlay '+sign+'/'+u,'wall','limestone',[u,4.05,sign*7.522],[.012,1.14,.012]);
      }
    }

    // Relief clads the existing solid hearth. The dark firebox covers the old
    // flat glow panel, while the surround remains attached to its stone mass.
    box('Hearth / firebox back','hearth','iron',[11.923,1.3,0],[.078,1.93,4.31]);
    box('Hearth / lower stone ledge','hearth','limestone',[11.96,.19,0],[.32,.38,6.24]);
    box('Hearth / mantel shelf','hearth','limestone',[11.965,2.36,0],[.33,.14,6.24]);
    box('Hearth / mantel reveal','hearth','bronze',[11.79,2.36,0],[.025,.025,5.96]);
    for(let row=0;row<8;row++){
      const h=2.655+row*.482;
      for(let column=0;column<6;column++){
        const v=(column-2.5)*.989;
        box('Hearth / upper ashlar '+row+'/'+column,'hearth','limestone',[11.974,h,v],[.125,.455,.96]);
      }
    }
    for(const sign of[-1,1]){
      for(let row=0;row<4;row++)box('Hearth / jamb stone '+sign+'/'+row,'hearth','limestone',[11.966,.63+row*.463,sign*2.63],[.15,.438,.74]);
      box('Hearth / firebox jamb '+sign,'hearth','iron',[11.865,1.3,sign*2.145],[.15,1.97,.1]);
      for(const h of[.355,2.245])box('Hearth / firebox lintel '+sign+'/'+h,'hearth','iron',[11.857,h,sign*1.047],[.14,.075,2.1]);
      box('Hearth / outer return '+sign,'hearth','limestone',[12.99,3.19,sign*3.026],[1.94,6.36,.065]);
      for(let course=0;course<12;course++)box('Hearth / return joint '+sign+'/'+course,'hearth','iron',[12.99,.46+course*.491,sign*3.064],[1.85,.013,.014]);
    }
    for(let i=0;i<4;i++){
      const h=.51+i*.12,rotation=rotate(1,0,0,Math.PI/2+(i%2?.07:-.07));
      cylinder('Firebox / charred timber '+i,'hearth','iron',[11.835,h,0],.059,3.68,rotation,14);
      for(const v of[-1.42,-.51,.62,1.47])box('Firebox / glowing fissure '+i+'/'+v,'hearth','ember',[11.773,h-.012,v],[.009,.019,.105]);
    }
    for(let i=0;i<27;i++){
      const v=-1.75+(i%9)*.415+(Math.floor(i/9)%2?.18:0),h=.65+Math.floor(i/9)*.104+Math.sin(i*2.31)*.035;
      const rotation=rotate(1,0,0,(i%5)*.3);
      append(new THREE.IcosahedronGeometry(1,0),i%4?'ember':'iron',[11.837,h,v],[.047,.047+(i%3)*.011,.14],rotation,{name:'Firebox / ember '+i,kind:'hearth'});
    }
    for(const h of[.42,.89])box('Firebox / grate rail '+h,'hearth','iron',[11.741,h,0],[.032,.033,3.91]);
    for(let i=0;i<14;i++)box('Firebox / grate upright '+i,'hearth','iron',[11.743,.647,-1.82+i*.28],[.034,.485,.026]);

    // The low firewood cabinet occupies the deep wall margin below the existing
    // alpine window forms. Visible end-grain circles make each split log legible.
    box('Wood store / base','woodstore','iron',[16.9,.08,-5.35],[.78,.16,2.86]);
    box('Wood store / back','woodstore','smokedOak',[17.272,1.25,-5.35],[.075,2.18,2.86]);
    for(const sign of[-1,1])box('Wood store / upright '+sign,'woodstore','iron',[16.9,1.25,-5.35+sign*1.415],[.78,2.18,.072]);
    box('Wood store / cap','woodstore','endgrain',[16.9,2.39,-5.35],[.81,.10,2.91]);
    for(let row=0;row<5;row++){
      const h=.37+row*.404;
      for(let column=0;column<5;column++){
        const v=-6.4+column*.518+(row%2?.11:0),radius=.21+(column%2)*.012,id=row+'/'+column;
        cylinder('Wood store / log '+id,'woodstore','smokedOak',[16.89,h,v],radius,.68,axial,12,{logId:id});
        cylinder('Wood store / end grain '+id,'woodstore','endgrain',[16.539,h,v],radius*.90,.026,axial,12,{logId:id});
        append(new THREE.TorusGeometry(radius*.51,.006,3,10),'smokedOak',[16.522,h,v],[1,1,1],endFace,{name:'Wood store / growth ring '+id,kind:'woodstore',logId:id});
        box('Wood store / split '+id,'woodstore','smokedOak',[16.523,h-radius*.22,v],[.012,radius*.72,.012],rotate(1,0,0,(column-row)*.28));
      }
    }
    box('Wood store / brass foot rail','woodstore','bronze',[16.494,.19,-5.35],[.022,.044,2.64]);

    let triangles=0,attributeBytes=0,components=0;const bounds=new THREE.Box3();
    for(const [name,batch]of batches){
      const geometry=new THREE.BufferGeometry();owned.add(geometry);geometry.name='Ember House / '+name;
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(batch.positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(batch.normals,3));
      geometry.userData.components=batch.components;geometry.computeBoundingBox();geometry.computeBoundingSphere();bounds.union(geometry.boundingBox);
      const mesh=new THREE.Mesh(geometry,batch.material);mesh.name=geometry.name;mesh.userData.hestiaEmber=true;group.add(mesh);meshes.push(mesh);
      triangles+=geometry.getAttribute('position').count/3;for(const attribute of Object.values(geometry.attributes))attributeBytes+=attribute.array.byteLength;components+=batch.components.length;
    }
    const cabinetBox=new THREE.Box3();
    for(const batch of batches.values())for(const part of batch.components)if(part.kind==='woodstore'){
      cabinetBox.union(new THREE.Box3(new THREE.Vector3(...part.bounds.min),new THREE.Vector3(...part.bounds.max)));
    }
    group.updateMatrix();cabinetBox.applyMatrix4(group.matrix);
    const cabinetCollider={minX:cabinetBox.min.x,maxX:cabinetBox.max.x,minY:cabinetBox.min.y,maxY:cabinetBox.max.y,minZ:cabinetBox.min.z,maxZ:cabinetBox.max.z};
    const stats={version:1,meshes:meshes.length,materials:batches.size,triangles,attributeBytes,components,stackedLogs:25,embers:27,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},source:'Original static hearth relief and joinery; no fire or heat simulation'};
    group.userData.emberStats=stats;scene.add(group);return{group,meshes,stats,cabinetCollider,dispose};
  }catch(error){dispose();throw error;}
}
