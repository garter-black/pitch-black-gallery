// Original static industrial art for Euterpe's public listening room.
// The console and driver relief are display objects, not audio controls.
export function addEuterpeResonance({THREE,scene,room}={}){
  if(!THREE?.BufferGeometry||!scene?.isScene||![-1,1].includes(room?.side)||!Number.isFinite(room?.y)||!Number.isFinite(room?.z))throw new TypeError('Resonance needs a scene and a finite public room');
  const group=new THREE.Group();group.name='Euterpe / Resonance instruments';group.userData.euterpeResonance=true;
  group.position.set(room.side*29,room.y,room.z);group.rotation.y=room.side<0?Math.PI:0;
  const owned=new Set(),batches=new Map(),meshes=[];let disposed=false;
  const dispose=()=>{if(disposed)return;disposed=true;group.removeFromParent();for(const resource of owned)resource.dispose();owned.clear();};
  try{
    const specs={
      graphite:{color:'#202227',roughness:.54,metalness:.27},
      titanium:{color:'#a4acb1',roughness:.25,metalness:.86},
      ivory:{color:'#d8d4c6',roughness:.57,metalness:.15},
      amber:{color:'#b88c4b',roughness:.33,metalness:.55},
    };
    for(const [name,parameters]of Object.entries(specs)){
      const material=new THREE.MeshStandardMaterial(parameters);owned.add(material);
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
        const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),ab=new THREE.Vector3(),ac=new THREE.Vector3();
        const bounds=new THREE.Box3();
        for(let i=0;i<p.count;i+=3){
          a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1);c.fromBufferAttribute(p,i+2);
          if(ab.subVectors(b,a).cross(ac.subVectors(c,a)).lengthSq()<1e-18)continue;
          const face=record.kind==='driver'?ab.clone().normalize():null;
          for(let j=i;j<i+3;j++){
            a.fromBufferAttribute(p,j);bounds.expandByPoint(a);batch.positions.push(a.x,a.y,a.z);
            if(face)batch.normals.push(face.x,face.y,face.z);
            else{a.fromBufferAttribute(n,j).normalize();batch.normals.push(a.x,a.y,a.z);}
          }
        }
        batch.components.push({...record,firstVertex,vertexCount:batch.positions.length/3-firstVertex,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()}});
      }finally{if(expanded&&expanded!==geometry)expanded.dispose();geometry.dispose();}
    }
    const box=(name,kind,material,centre,dimensions,rotation=identity,extra={})=>append(new THREE.BoxGeometry(1,1,1),material,centre,dimensions,rotation,{name,kind,...extra});
    const cylinder=(name,kind,material,centre,radius,height,rotation=identity,segments=12,extra={})=>append(new THREE.CylinderGeometry(radius,radius,height,segments,1,false),material,centre,[1,1,1],rotation,{name,kind,...extra});
    const faceRotation=rotate(0,0,1,Math.PI/2),ringRotation=rotate(0,1,0,Math.PI/2);

    // Relief fits inside the old baffle outline and its existing amber surrounds.
    for(const sign of[-1,1]){
      const v=sign*5.5;
      box('Array / baffle plate '+sign,'speaker','graphite',[11.99,2.4,v],[.06,4.56,1.38]);
      for(const edge of[-1,1])box('Array / edge '+sign+'/'+edge,'speaker','titanium',[11.97,2.4,v+edge*.67],[.055,4.54,.035]);
      for(const h of[.18,4.62])box('Array / sill '+sign+'/'+h,'speaker','titanium',[11.97,h,v],[.055,.035,1.375]);
      for(let driver=0;driver<3;driver++){
        const h=1+driver*1.4,id=sign+'/'+driver;
        const profile=[[0,-11.962],[.402,-11.962],[.402,-11.898],[.365,-11.874],[.315,-11.886],[.115,-11.944],[.091,-11.909],[0,-11.893]];
        append(new THREE.LatheGeometry(profile.map(([r,u])=>new THREE.Vector2(r,u)),48),'graphite',[0,h,v],[1,1,1],faceRotation,{name:'Diaphragm / '+id,kind:'driver',driverId:id});
        append(new THREE.TorusGeometry(.366,.012,6,48),'titanium',[11.875,h,v],[1,1,1],ringRotation,{name:'Diaphragm / inner reveal '+id,kind:'speaker',driverId:id});
        for(let i=0;i<4;i++){
          const angle=Math.PI/4+i*Math.PI/2;
          cylinder('Array / fastener '+id+'/'+i,'speaker','titanium',[11.937,h+Math.cos(angle)*.595,v+Math.sin(angle)*.595],.028,.055,faceRotation,10,{driverId:id});
          box('Array / fastener slot '+id+'/'+i,'speaker','graphite',[11.906,h+Math.cos(angle)*.595,v+Math.sin(angle)*.595],[.012,.007,.033]);
        }
      }
      for(let i=0;i<7;i++)box('Array / bass vent '+sign+'/'+i,'speaker','graphite',[11.946,.38,v+(i-3)*.15],[.048,.095,.086]);
      box('Array / amber badge '+sign,'speaker','amber',[11.939,4.43,v],[.043,.115,.29]);
      for(const edge of[-1,1])box('Array / badge engraving '+sign+'/'+edge,'speaker','ivory',[11.914,4.43,v+edge*.07],[.012,.061,.011]);
    }

    // Inclined panel with a continuous body, side cheeks and stage-supported feet.
    const tilt=.19,panelRotation=rotate(0,0,1,tilt),panelCentre=new THREE.Vector3(11.6,1.55,0);
    const point=(u,h,v)=>new THREE.Vector3(u,h,v).applyQuaternion(panelRotation).add(panelCentre).toArray();
    const panelBox=(name,material,u,h,v,w,ht,d,kind='console',extra={})=>box(name,kind,material,point(u,h,v),[w,ht,d],panelRotation,extra);
    const panelCylinder=(name,material,u,h,v,radius,height,extra={})=>cylinder(name,'control',material,point(u,h,v),radius,height,panelRotation,12,extra);
    panelBox('Console / main housing','graphite',0,0,0,2.1,.2,4.25);
    for(const sign of[-1,1]){
      panelBox('Console / titanium cheek '+sign,'titanium',0,.014,sign*2.155,2.18,.23,.062);
      panelBox('Console / amber cheek inset '+sign,'amber',0,.136,sign*2.154,1.82,.016,.028);
      box('Console / stage foot '+sign,'foot','graphite',[11.6,.835,sign*1.65],[1.75,.07,.32]);
      box('Console / foot reveal '+sign,'stand','titanium',[11.6,.875,sign*1.65],[1.52,.01,.24]);
      for(const u of[-.58,.58]){
        const target=point(u,-.084,sign*1.65),height=target[1]-.88;
        box('Console / leg '+sign+'/'+u,'stand','titanium',[target[0],.88+height/2,sign*1.65],[.085,height,.13]);
      }
      panelBox('Console / end rail '+sign,'titanium',sign*1.06,.01,0,.025,.2,4.25);
      for(const u of[-.87,0,.87])panelCylinder('Console / chassis screw '+sign+'/'+u,'graphite',u,.145,sign*2.155,.022,.018);
    }
    panelBox('Console / wrist rail','graphite',-.96,.135,0,.16,.07,4.10);
    for(const u of[-.58,.58])box('Console / trestle stretcher '+u,'stand','titanium',[point(u,-.084,0)[0],1.03,0],[.066,.09,3.42]);
    panelBox('Console / meter bridge','graphite',.72,.125,0,.54,.05,3.89);
    let controls=0,meterSegments=0;
    for(let channel=0;channel<24;channel++){
      const v=(channel-11.5)*.151,master=channel>=20;
      const extra={channel};
      panelBox('Channel / track '+channel,'titanium',-.46,.104,v,.60,.009,.019,'control',extra);
      const faderU=-.69+((channel*7)%11)*.041;
      panelBox('Channel / fader '+channel,master?'amber':'ivory',faderU,.127,v,.107,.037,.083,'control',extra);controls++;
      panelBox('Channel / fader line '+channel,'graphite',faderU,.148,v,.013,.008,.067,'control',extra);
      for(const tick of[-.76,-.59,-.42,-.25])panelBox('Channel / scale '+channel+'/'+tick,'ivory',tick,.104,v+.047,.006,.008,.016,'control',extra);
      for(const u of[.12,.41]){
        panelCylinder('Channel / rotary '+channel+'/'+u,'graphite',u,.134,v,.037,.074,extra);
        panelBox('Channel / pointer '+channel+'/'+u,'ivory',u-.009,.174,v,.03,.008,.008,'control',extra);controls++;
      }
      for(let segment=0;segment<7;segment++){
        panelBox('Channel / meter inlay '+channel+'/'+segment,segment<3+(channel%5)?'amber':'titanium',.53+segment*.056,.155,v,.033,.014,.044,'meter',extra);meterSegments++;
      }
      panelBox('Channel / identification '+channel,'ivory',-.06,.104,v,.044,.008,.037,'control',extra);
    }
    for(const v of[-1.962,1.962]){
      panelCylinder('Console / master dial '+v,'amber',.35,.17,v,.072,.14);controls++;
      panelBox('Console / master pointer '+v,'ivory',.326,.244,v,.07,.01,.013,'control');
      for(let i=0;i<5;i++)panelBox('Console / bus index '+v+'/'+i,'titanium',-.65+i*.15,.106,v,.065,.012,.07,'control');
    }
    for(const channel of[7,15,19])panelBox('Console / bus separator '+channel,'amber',-.01,.105,(channel-11)*.151,1.71,.01,.007);

    let triangles=0,attributeBytes=0,components=0;const bounds=new THREE.Box3();
    for(const [name,batch]of batches){
      const geometry=new THREE.BufferGeometry();owned.add(geometry);geometry.name='Euterpe resonance / '+name;
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(batch.positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(batch.normals,3));
      geometry.userData.components=batch.components;geometry.computeBoundingBox();geometry.computeBoundingSphere();bounds.union(geometry.boundingBox);
      const mesh=new THREE.Mesh(geometry,batch.material);mesh.name=geometry.name;mesh.userData.euterpeResonance=true;group.add(mesh);meshes.push(mesh);
      triangles+=geometry.getAttribute('position').count/3;for(const attribute of Object.values(geometry.attributes))attributeBytes+=attribute.array.byteLength;components+=batch.components.length;
    }
    const stats={version:1,meshes:meshes.length,materials:batches.size,triangles,attributeBytes,components,drivers:6,channels:24,controls,meterSegments,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},source:'Original static display art; no sound processing or interactive controls'};
    group.userData.resonanceStats=stats;scene.add(group);return{group,meshes,stats,dispose};
  }catch(error){dispose();throw error;}
}
