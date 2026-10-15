import * as THREE from '../vendor/three.module.min.js';

// Original stage costume for the published CC0 adult base. Decorative, not audio hardware.
// The smooth crown dimensions were fitted offline to the exact scalp/hair surface.
const attached=new WeakMap();
const PALETTE={titanium:'#b8c4cd',amber:'#c39a55',ivory:'#ddd8cb',ink:'#17202a'};

export function attachEuterpeHeadset(model,{castShadow=false}={}){
  if(!model?.isObject3D)throw new TypeError('Euterpe headset needs the verified adult model');
  if(attached.has(model))return attached.get(model);
  const bones=new Map(),surfaces=new Set();
  model.traverse(n=>{if(n.isBone)bones.set(n.name,n);if(n.isMesh)surfaces.add(n.name);});
  const head=bones.get('head');
  if(!head||head.quaternion.angleTo(new THREE.Quaternion())>1e-5)throw new Error('Attach Euterpe headset in the verified bind pose');
  for(const name of['Adult_face_and_neck','Textured_ponytail','Fitted_eyes'])if(!surfaces.has(name))throw new Error('Euterpe headset requires '+name);
  for(let n=model;n;n=n.parent)if(Math.abs(n.scale.x-n.scale.y)>1e-6||Math.abs(n.scale.x-n.scale.z)>1e-6||n.scale.x<=0)throw new Error('Headset requires positive uniform ancestor scale');
  model.updateWorldMatrix(true,true);model.updateMatrixWorld(true);
  const resources=new Set(),meshes=[],batches=new Map();let disposed=false;
  const cleanup=()=>{for(const mesh of meshes)mesh.removeFromParent();for(const resource of resources)resource.dispose();resources.clear();};
  try{
    for(const[key,parameters]of Object.entries({metal:{name:'Euterpe / titanium and amber stage metal',metalness:.91,roughness:.29},soft:{name:'Euterpe / graphite headset cushions',metalness:.06,roughness:.79}})){
      const material=new THREE.MeshStandardMaterial({...parameters,color:'#ffffff',vertexColors:true});resources.add(material);batches.set(key,{material,positions:[],normals:[],colors:[],sections:[]});
    }
    const identity=new THREE.Quaternion(),V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
    const rotation=(x,y,z,a)=>new THREE.Quaternion().setFromAxisAngle(V(x,y,z),a);
    function append(geometry,batchName,color,centre,scale,quaternion,section){
      let expanded;
      try{
        geometry.applyMatrix4(new THREE.Matrix4().compose(V(...centre),quaternion,V(...scale)));
        expanded=geometry.index?geometry.toNonIndexed():geometry;
        const p=expanded.attributes.position,n=expanded.attributes.normal,batch=batches.get(batchName),tint=new THREE.Color(PALETTE[color]||color),firstVertex=batch.positions.length/3,bounds=new THREE.Box3();
        const a=V(),b=V(),c=V(),ab=V(),ac=V();
        for(let i=0;i<p.count;i+=3){
          a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1);c.fromBufferAttribute(p,i+2);
          if(ab.subVectors(b,a).cross(ac.subVectors(c,a)).lengthSq()<1e-22)continue;
          for(let j=i;j<i+3;j++){a.fromBufferAttribute(p,j);bounds.expandByPoint(a);batch.positions.push(a.x,a.y,a.z);a.fromBufferAttribute(n,j).normalize();batch.normals.push(a.x,a.y,a.z);batch.colors.push(tint.r,tint.g,tint.b);}
        }
        batch.sections.push({...section,firstVertex,vertexCount:batch.positions.length/3-firstVertex,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()}});
      }finally{if(expanded&&expanded!==geometry)expanded.dispose();geometry.dispose();}
    }
    const box=(name,batch,color,centre,size,kind='detail')=>append(new THREE.BoxGeometry(1,1,1),batch,color,centre,size,identity,{name,kind});
    const disc=(name,batch,color,sign,x,y,z,ry,rz,thickness,kind='earcap',segments=32)=>append(new THREE.CylinderGeometry(1,1,1,segments,1,false),batch,color,[sign*x,y,z],[ry,thickness,rz],rotation(0,0,1,-sign*Math.PI/2),{name,kind,side:sign});
    function rod(name,a,b,radius,color='titanium'){
      const from=V(...a),to=V(...b),direction=to.clone().sub(from),q=new THREE.Quaternion().setFromUnitVectors(V(0,1,0),direction.clone().normalize());
      append(new THREE.CylinderGeometry(radius,radius,direction.length(),10,1,false),'metal',color,from.add(to).multiplyScalar(.5).toArray(),[1,1,1],q,{name,kind:'yoke'});
    }
    function crownStrip(name,batch,color,offset,halfThickness,halfWidth){
      const points=[];
      for(let i=0;i<=40;i++){
        const a=-Math.PI/2+i*Math.PI/40,radius=1/Math.hypot(Math.sin(a)/.1005,Math.cos(a)/.13675);
        points.push(V(Math.sin(a)*radius,1.604+Math.cos(a)*radius,.033));
      }
      const rings=points.map((p,i)=>{
        const tangent=points[Math.min(i+1,40)].clone().sub(points[Math.max(i-1,0)]).normalize(),out=V(-tangent.y,tangent.x,0);
        return [[-1,-1],[-1,1],[1,1],[1,-1]].map(([radial,z])=>p.clone().addScaledVector(out,offset+radial*halfThickness).add(V(0,0,z*halfWidth)));
      });
      const values=[],triangle=(a,b,c)=>values.push(...a.toArray(),...b.toArray(),...c.toArray());
      for(let i=0;i<40;i++)for(let j=0;j<4;j++){const k=(j+1)%4;triangle(rings[i][j],rings[i+1][j],rings[i+1][k]);triangle(rings[i][j],rings[i+1][k],rings[i][k]);}
      triangle(rings[0][0],rings[0][1],rings[0][2]);triangle(rings[0][0],rings[0][2],rings[0][3]);
      triangle(rings[40][0],rings[40][2],rings[40][1]);triangle(rings[40][0],rings[40][3],rings[40][2]);
      // Normalize the authored closed strip's winding before generating flat normals.
      let volume=0;for(let i=0;i<values.length;i+=9)volume+=V(...values.slice(i,i+3)).dot(V(...values.slice(i+3,i+6)).cross(V(...values.slice(i+6,i+9))));
      if(volume<0)for(let i=0;i<values.length;i+=9)for(let j=0;j<3;j++){const a=values[i+3+j];values[i+3+j]=values[i+6+j];values[i+6+j]=a;}
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(values,3));geometry.computeVertexNormals();
      append(geometry,batch,color,[0,0,0],[1,1,1],identity,{name,kind:'crown'});
    }
    crownStrip('Crown / graphite underpad','soft','ink',-.002,.003,.017);
    crownStrip('Crown / titanium arch','metal','titanium',.0022,.0024,.0145);
    crownStrip('Crown / amber centre inlay','metal','amber',.0049,.0008,.004);

    for(const sign of[-1,1]){
      const y=1.601,z=.033;
      append(new THREE.TorusGeometry(1,.21,8,40),'soft','ink',[sign*.101,y,z],[.0295,.04,.027],rotation(0,1,0,Math.PI/2),{name:'Ear / oval cushion '+sign,kind:'cushion',side:sign});
      disc('Ear / titanium housing '+sign,'metal','titanium',sign,.114,y,z,.047,.034,.025);
      disc('Ear / chamfer step '+sign,'metal','titanium',sign,.126,y,z,.043,.030,.010);
      append(new THREE.TorusGeometry(1,.08,6,40),'metal','ivory',[sign*.132,y,z],[.028,.04,.018],rotation(0,1,0,Math.PI/2),{name:'Ear / pale reveal '+sign,kind:'earcap',side:sign});
      disc('Ear / graphite recess '+sign,'soft','ink',sign,.1325,y,z,.034,.023,.006);
      disc('Ear / amber signal plate '+sign,'metal','amber',sign,.136,y,z,.028,.019,.005);
      for(let i=0;i<5;i++)box('Ear / signal inlay '+sign+'/'+i,'soft','ink',[sign*.139,y,z+(i-2)*.006],[.0025,[.018,.027,.037,.025,.014][i],.0024]);
      for(const direction of[-1,1]){
        const a=[sign*.1015,1.611,.033],b=[sign*.12,1.636,.033+direction*.018],c=[sign*.13,1.629,.033+direction*.022];
        rod('Yoke / rising arm '+sign+'/'+direction,a,b,.0033);rod('Yoke / return arm '+sign+'/'+direction,b,c,.0033);
        disc('Yoke / ear pivot '+sign+'/'+direction,'metal','amber',sign,.131,1.629,.033+direction*.022,.006,.006,.005,'yoke',16);
      }
    }
    // One original rearward accent, seated in a visible socket on the left earcap.
    box('Fin / mounting socket','metal','titanium',[.129,1.638,.032],[.011,.024,.036],'fin');
    function fin(name,color,x,depth,points){
      const shape=new THREE.Shape(points.map(([y,z])=>new THREE.Vector2(-z,y)));
      append(new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,steps:1,curveSegments:1}),'metal',color,[x,0,0],[1,1,1],rotation(0,1,0,Math.PI/2),{name,kind:'fin'});
    }
    fin('Fin / asymmetric blade','titanium',.127,.009,[[1.628,.022],[1.648,.015],[1.693,-.017],[1.696,-.001],[1.659,.039],[1.632,.045]]);
    fin('Fin / amber inset','amber',.1355,.0018,[[1.643,.024],[1.652,.023],[1.686,-.006],[1.684,.003],[1.656,.032]]);

    let triangles=0,attributeBytes=0,components=0;
    for(const [name,batch]of batches){
      const geometry=new THREE.BufferGeometry();resources.add(geometry);
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(batch.positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(batch.normals,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(batch.colors,3));
      geometry.userData.sections=batch.sections;geometry.computeBoundingBox();geometry.computeBoundingSphere();
      const mesh=new THREE.Mesh(geometry,batch.material);meshes.push(mesh);mesh.name='Euterpe / Auric monitors / '+name;mesh.castShadow=castShadow;mesh.receiveShadow=true;
      mesh.userData.euterpeHeadset=true;mesh.userData.attachmentBone='head';model.add(mesh);mesh.updateWorldMatrix(true,false);head.attach(mesh);
      triangles+=geometry.attributes.position.count/3;for(const a of Object.values(geometry.attributes))attributeBytes+=a.array.byteLength;components+=batch.sections.length;
    }
    const stats=Object.freeze({version:1,meshes:meshes.length,drawCalls:meshes.length,materials:batches.size,triangles,attributeBytes,components,textures:0,lights:0,perFrameUpdates:0,originalEquipment:true,sharedAdultBase:true,sourceGeometryChanges:0});
    const result={meshes,stats,dispose(){if(disposed)return;disposed=true;cleanup();attached.delete(model);}};
    attached.set(model,result);return result;
  }catch(error){cleanup();throw error;}
}
