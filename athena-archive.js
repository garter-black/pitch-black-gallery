// Original procedural instruments and bound folios for Athena's public archive.
// Static display art; no external assets or physical instrument simulation.
export function addAthenaArchive({THREE,scene,room}={}){
  if(!THREE?.BufferGeometry||!scene?.isScene||![-1,1].includes(room?.side)||!Number.isFinite(room?.y)||!Number.isFinite(room?.z))throw new TypeError('Archive needs a scene and a finite public room');
  const group=new THREE.Group();group.name='Athena / Proof compass and indexed folios';group.userData.athenaArchive=true;
  group.position.set(room.side*29,room.y,room.z);group.rotation.y=room.side<0?Math.PI:0;
  const owned=new Set(),meshes=[],batches=new Map();let disposed=false;
  const dispose=()=>{if(disposed)return;disposed=true;group.removeFromParent();for(const resource of owned)resource.dispose();owned.clear();};
  try{
    const specs={
      graphite:{color:'#171d23',roughness:.46,metalness:.45},
      platinum:{color:'#bfc9cf',roughness:.23,metalness:.85},
      ivory:{color:'#d8d3bf',roughness:.66,metalness:.12},
      cobalt:{color:'#284d7b',roughness:.3,metalness:.47},
    };
    for(const [name,parameters]of Object.entries(specs)){
      const material=new THREE.MeshStandardMaterial(parameters);material.name='Athena archive / '+name;owned.add(material);
      batches.set(name,{material,positions:[],normals:[],components:[]});
    }
    const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),quaternion=new THREE.Quaternion(),scale=new THREE.Vector3();
    const identity=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0);
    function append(geometry,material,centre,dimensions=[1,1,1],rotation=identity,record={}){
      let expanded;
      try{
        expanded=geometry.index?geometry.toNonIndexed():geometry;
        position.fromArray(centre);scale.fromArray(dimensions);quaternion.copy(rotation);
        matrix.compose(position,quaternion,scale);expanded.applyMatrix4(matrix);expanded.computeBoundingBox();
        const batch=batches.get(material),p=expanded.getAttribute('position'),n=expanded.getAttribute('normal');
        const firstVertex=batch.positions.length/3;
        for(let i=0;i<p.count;i++){batch.positions.push(p.getX(i),p.getY(i),p.getZ(i));batch.normals.push(n.getX(i),n.getY(i),n.getZ(i));}
        batch.components.push({...record,firstVertex,vertexCount:p.count,bounds:{min:expanded.boundingBox.min.toArray(),max:expanded.boundingBox.max.toArray()}});
      }finally{if(expanded&&expanded!==geometry)expanded.dispose();geometry.dispose();}
    }
    const box=(name,kind,material,centre,dimensions,rotation=identity,extra={})=>append(new THREE.BoxGeometry(1,1,1),material,centre,dimensions,rotation,{name,kind,...extra});
    const cylinder=(name,material,centre,radius,height,rotation=identity,segments=12)=>append(new THREE.CylinderGeometry(radius,radius,height,segments,1,false),material,centre,[1,1,1],rotation,{name,kind:'instrument'});
    function strut(name,a,b,radius=.055){
      const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),delta=vb.clone().sub(va);
      const centre=va.add(vb).multiplyScalar(.5),rotation=new THREE.Quaternion().setFromUnitVectors(up,delta.clone().normalize());
      cylinder(name,'platinum',centre.toArray(),radius,delta.length(),rotation,10);
    }
    const about=(axis,angle)=>new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(...axis),angle);
    const mainRotation=about([0,1,0],Math.PI/2);
    const bearingRotation=about([0,0,1],Math.PI/2);
    const centre=[13,3.65,0];

    // Broad feet sit on the existing white plinth; the open fork rises above them.
    box('Compass / lower foot','instrument','graphite',[13,1.65,0],[2.25,.1,1.78]);
    box('Compass / platinum reveal','instrument','platinum',[13,1.712,0],[2.14,.024,1.66]);
    box('Compass / upper foot','instrument','graphite',[13,1.76,0],[1.92,.072,1.49]);
    for(const sign of[-1,1]){
      const a=[13,1.78,sign*.64],b=[13,2.46,sign*.96],c=[13,3.65,sign*1.29];
      strut('Fork / lower '+sign,a,b,.07);strut('Fork / upper '+sign,b,c,.058);
      cylinder('Bearing / '+sign,'graphite',c,.145,.20,bearingRotation,24);
      cylinder('Bearing face / '+sign,'platinum',[12.884,3.65,sign*1.29],.116,.04,bearingRotation,24);
      cylinder('Bearing pin / '+sign,'cobalt',[12.856,3.65,sign*1.29],.045,.021,bearingRotation,12);
    }
    append(new THREE.TorusGeometry(1.27,.048,8,96),'platinum',centre,[1,1,1],mainRotation,{name:'Compass / graduated circle',kind:'instrument'});
    const innerRotation=about([0,0,1],.38).multiply(mainRotation);
    append(new THREE.TorusGeometry(.94,.038,8,80),'graphite',centre,[1,1,1],innerRotation,{name:'Compass / oblique inner circle',kind:'instrument'});
    append(new THREE.TorusGeometry(.94,.011,6,80),'platinum',[12.962,3.635,0],[1,1,1],innerRotation,{name:'Compass / inner silver edge',kind:'instrument'});
    for(let i=0;i<72;i++){
      const a=i*Math.PI*2/72,major=i%6===0,length=major?.135:.055,radius=major?1.21:1.25;
      box('Graduation / '+String(i).padStart(2,'0'),'instrument',major?'cobalt':'ivory',[13,3.65+radius*Math.cos(a),radius*Math.sin(a)],[.09,length,major?.035:.014],about([1,0,0],a));
    }
    cylinder('Spindle / platinum axis','platinum',[13,3.65,0],.036,2.54,identity,12);
    cylinder('Gimbal / transverse axle','platinum',[13,3.65,0],.028,2.58,about([1,0,0],Math.PI/2),12);
    append(new THREE.OctahedronGeometry(1,0),'ivory',centre,[.23,.69,.23],identity,{name:'Spindle / ivory proof crystal',kind:'instrument'});
    for(const sign of[-1,1]){
      cylinder('Spindle / end collar '+sign,'platinum',[13,3.65+sign*1.23,0],.075,.08,identity,16);
      cylinder('Gimbal / inner bearing '+sign,'platinum',[13,3.65,sign*.94],.072,.09,about([1,0,0],Math.PI/2),16);
    }

    // Each folio rests on an existing shelf. Volume/trim records retain its bay.
    let folios=0;
    for(const sign of[-1,1])for(const bay of[4.65,7.95])for(let shelf=0;shelf<5;shelf++){
      const base=.855+shelf*1.03;
      for(let i=0;i<6;i++){
        const u=bay+(i-2.5)*.31,width=.18+(i%3)*.02,height=.58+((i+shelf*2)%5)*.035,v=sign*6.65;
        const id=`${sign}/${bay}/${shelf}/${i}`,extra={folioId:id,bay,shelf,shelfSign:sign,shelfTop:base};
        const bodyMaterial=(i+shelf)%4===0?'graphite':'ivory';
        box('Folio / '+id,'folio',bodyMaterial,[u,base+height/2,v],[width,height,.64],identity,extra);
        // Spine bands have a small positive thickness and sit against the cover.
        for(const fraction of[.17,.78])box('Spine band / '+id+'/'+fraction,'spine','platinum',[u,base+height*fraction,sign*6.323],[width*.72,.014,.014],identity,extra);
        if((i+shelf)%3===0)box('Cobalt index / '+id,'spine','cobalt',[u,base+height*.46,sign*6.32],[width*.29,.12,.02],identity,extra);
        folios++;
      }
    }

    let triangles=0,attributeBytes=0,componentCount=0;const bounds=new THREE.Box3();
    for(const [name,batch]of batches){
      const geometry=new THREE.BufferGeometry();owned.add(geometry);geometry.name='Athena archive / '+name;
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(batch.positions,3));
      geometry.setAttribute('normal',new THREE.Float32BufferAttribute(batch.normals,3));
      geometry.userData.components=batch.components;geometry.computeBoundingBox();geometry.computeBoundingSphere();bounds.union(geometry.boundingBox);
      const mesh=new THREE.Mesh(geometry,batch.material);mesh.name=geometry.name;mesh.userData.athenaArchive=true;group.add(mesh);meshes.push(mesh);
      triangles+=geometry.getAttribute('position').count/3;for(const attribute of Object.values(geometry.attributes))attributeBytes+=attribute.array.byteLength;componentCount+=batch.components.length;
    }
    const stats={version:1,meshes:meshes.length,materials:batches.size,triangles,attributeBytes,components:componentCount,folios,shelfRows:20,
      bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},source:'Original procedural display art'};
    group.userData.archiveStats=stats;scene.add(group);return{group,meshes,stats,dispose};
  }catch(error){dispose();throw error;}
}
