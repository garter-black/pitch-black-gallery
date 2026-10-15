import * as THREE from '../vendor/three.module.min.js';

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=x=>{const t=clamp(x,0,1);return t*t*(3-2*t);};
const derivative=x=>x>0&&x<1?6*x*(1-x):0;

// Fit the rear curtain to the actual outfit in bind space. Its lower lengths
// follow the same surface weights as the back, rather than pivoting rigidly
// through the torso whenever the neck bends. The crown and front stay on head.
function fitToBack(mesh,headJoint,colliders){
  const g=mesh.geometry,source=g.attributes.position,triangles=[];
  for(const collider of colliders){
    const c=collider.geometry,p=c.attributes.position,index=c.index,si=c.attributes.skinIndex,sw=c.attributes.skinWeight;
    if(!p||!index||!si||!sw)continue;
    for(let i=0;i<index.count;i+=3){
      const ids=[index.getX(i),index.getX(i+1),index.getX(i+2)];
      const v=ids.map(j=>new THREE.Vector3().fromBufferAttribute(p,j));
      if(Math.max(...v.map(a=>a.y))<.88||Math.min(...v.map(a=>a.y))>1.54||Math.min(...v.map(a=>a.z))>.04)continue;
      const [a,b,d]=v,den=(b.y-d.y)*(a.x-d.x)+(d.x-b.x)*(a.y-d.y);
      if(Math.abs(den)<1e-10)continue;
      triangles.push({ids,v,den,si,sw,minX:Math.min(...v.map(a=>a.x)),maxX:Math.max(...v.map(a=>a.x)),minY:Math.min(...v.map(a=>a.y)),maxY:Math.max(...v.map(a=>a.y))});
    }
  }
  // These attributes belonged to shared immutable source buffers before fitting.
  const position=source.clone();g.setAttribute('position',position);g.setAttribute('normal',g.attributes.normal.clone());
  const indices=g.attributes.skinIndex,weights=g.attributes.skinWeight,triangle=new THREE.Triangle(),query=new THREE.Vector3(),nearest=new THREE.Vector3(),coordinates=new THREE.Vector3();let fitted=0,weighted=0,edgeFitted=0,maxCorrection=0;
  for(let i=0;i<source.count;i++){
    const x=source.getX(i),y=source.getY(i),z=source.getZ(i);
    const follow=smooth((1.53-y)/.05)*smooth((.02-z)/.04);if(follow===0)continue;
    let match,bary,back=Infinity;
    for(const t of triangles){
      if(x<t.minX||x>t.maxX||y<t.minY||y>t.maxY)continue;
      const [a,b,d]=t.v,u=((b.y-d.y)*(x-d.x)+(d.x-b.x)*(y-d.y))/t.den,v=((d.y-a.y)*(x-d.x)+(a.x-d.x)*(y-d.y))/t.den,w=1-u-v;
      if(Math.min(u,v,w)<-1e-6)continue;
      const hit=u*a.z+v*b.z+w*d.z;if(hit<back){back=hit;match=t;bary=[u,v,w];}
    }
    // A shoulder/neckline may have no surface directly behind a bind-space
    // sample. Follow the nearby edge instead of leaving a head-weighted island.
    if(!match){
      query.set(x,y,z);let distance=.07*.07;
      for(const t of triangles){
        if(x<t.minX-.07||x>t.maxX+.07||y<t.minY-.07||y>t.maxY+.07)continue;
        triangle.set(...t.v);triangle.closestPointToPoint(query,nearest);const d=query.distanceToSquared(nearest);
        if(d<distance){distance=d;back=nearest.z;match=t;triangle.getBarycoord(nearest,coordinates);bary=coordinates.toArray();}
      }
      if(match)edgeFitted++;
    }
    if(!match)continue;
    const correction=Math.max(0,z-(back-.015))*follow;
    position.setZ(i,z-correction);if(correction>0){fitted++;maxCorrection=Math.max(maxCorrection,correction);}
    const blend=new Map([[headJoint,1-follow]]);
    for(let j=0;j<3;j++)for(let k=0;k<4;k++){
      const n=match.ids[j]*4+k,b=match.si.array[n],weight=match.sw.array[n]*Math.max(0,bary[j])*follow;
      blend.set(b,(blend.get(b)||0)+weight);
    }
    const selected=[...blend].filter(([,w])=>w>1e-8).sort((a,b)=>b[1]-a[1]).slice(0,4),total=selected.reduce((sum,[,w])=>sum+w,0);
    for(let k=0;k<4;k++){indices.array[i*4+k]=selected[k]?.[0]||0;weights.array[i*4+k]=(selected[k]?.[1]||0)/total;}weighted++;
  }
  // Recalculate only the fitted region; the original crown/fringe normals remain exact.
  const originalNormal=g.attributes.normal.clone();g.computeVertexNormals();
  for(let i=0;i<source.count;i++)if(source.getY(i)>=1.53||source.getZ(i)>=.02)g.attributes.normal.setXYZ(i,originalNormal.getX(i),originalNormal.getY(i),originalNormal.getZ(i));
  return {fittedVertices:fitted,torsoWeightedVertices:weighted,nearbyEdgeVertices:edgeFitted,maximumRestCorrectionMeters:maxCorrection,clearanceMeters:.015,crownAndFringeUnchanged:true,ownedAttributeBytes:source.count*3*4*2};
}

// Exact response to a constant drive during each measured frame. Bounded
// underdamped springs retain a small follow-through without Euler instability.
export function createHairResponse(){
  const axes=[{x:0,v:0},{x:0,v:0}],omega=12,damping=.65,frequency=omega*Math.sqrt(1-damping*damping);
  function reset(){for(const a of axes){a.x=0;a.v=0;}}
  function update(dt,{velocityX=0,velocityZ=0,yawRate=0,pitchRate=0,reset:clear=false,disabled=false}={}){
    if(clear||disabled||!Number.isFinite(dt)||dt<0||dt>.1){reset();return state();}
    const value=x=>Number.isFinite(x)?x:0;
    const targets=[clamp(-value(velocityX)*.10+value(yawRate)*.03,-.8,.8),clamp(value(velocityZ)*.10+Math.abs(value(pitchRate))*.02,0,.75)];
    const decay=Math.exp(-damping*omega*dt),c=Math.cos(frequency*dt),s=Math.sin(frequency*dt);
    axes.forEach((a,i)=>{const offset=a.x-targets[i],b=(a.v+damping*omega*offset)/frequency;
      const wave=offset*c+b*s;a.x=targets[i]+decay*wave;a.v=decay*((-offset*frequency*s+b*frequency*c)-damping*omega*wave);
      const lo=i===0?-1:0;if(a.x<lo){a.x=lo;a.v=Math.max(0,a.v);}if(a.x>1){a.x=1;a.v=Math.min(0,a.v);}
    });return state();
  }
  function state(){return {lateral:axes[0].x,back:axes[1].x,velocityLateral:axes[0].v,velocityBack:axes[1].v};}
  return {update,reset,getState:state};
}

/** Original small shape offsets. Scalp/fringe stay exactly on the source rig. */
export function attachLongHairMotion(mesh,headJoint,colliders=[]){
  if(!mesh.skeleton?.bones[headJoint]?.isBone||!mesh.geometry.attributes.normal||mesh.geometry.morphAttributes.position?.length)throw new Error('Long hair response requires an unmodified fitted groom');
  const fitting=fitToBack(mesh,headJoint,colliders);
  const geometry=mesh.geometry,position=geometry.attributes.position,normal=geometry.attributes.normal,head=mesh.skeleton.bones[headJoint];
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const minY=geometry.boundingBox.min.y,anchorY=1.43,length=Math.max(.1,anchorY-minY);
  const offsets=[[0,.005,-.055],[-.045,.004,-.009],[.045,.004,-.009]],morphPositions=[],morphNormals=[];
  let pinned=0,moving=0;
  for(const [target,offset]of offsets.entries()){
    const p=new Float32Array(position.count*3),n=new Float32Array(position.count*3);
    for(let i=0;i<position.count;i++){
      const ty=(anchorY-position.getY(i))/length,tz=(.02-position.getZ(i))/.04;
      const sy=smooth(ty),sz=smooth(tz),weight=sy*sz,gy=-derivative(ty)*sz/length,gz=-derivative(tz)*sy/.04;
      if(target===0){if(weight===0)pinned++;else moving++;}
      for(let a=0;a<3;a++)p[i*3+a]=offset[a]*weight;
      // Inverse-transpose of I + offset outer gradient(weight), retaining
      // the exact original normal where the shape is pinned.
      const nx=normal.getX(i),ny=normal.getY(i),nz=normal.getZ(i);
      if(weight===0&&gy===0&&gz===0)continue;
      const factor=(offset[0]*nx+offset[1]*ny+offset[2]*nz)/(1+gy*offset[1]+gz*offset[2]);
      const out=new THREE.Vector3(nx,ny-gy*factor,nz-gz*factor).normalize();
      n[i*3]=out.x-nx;n[i*3+1]=out.y-ny;n[i*3+2]=out.z-nz;
    }
    const pa=new THREE.BufferAttribute(p,3),na=new THREE.BufferAttribute(n,3);pa.name=['back','left','right'][target];morphPositions.push(pa);morphNormals.push(na);
  }
  geometry.morphTargetsRelative=true;geometry.morphAttributes.position=morphPositions;geometry.morphAttributes.normal=morphNormals;
  geometry.boundingBox.expandByScalar(.085);geometry.boundingSphere.radius+=.085;mesh.updateMorphTargets();
  const response=createHairResponse(),previousPosition=new THREE.Vector3(),currentPosition=new THREE.Vector3(),velocity=new THREE.Vector3(),scale=new THREE.Vector3();
  const previousQuaternion=new THREE.Quaternion(),currentQuaternion=new THREE.Quaternion(),inverse=new THREE.Quaternion(),rotation=new THREE.Quaternion();
  let initialized=false,disposed=false;
  const stats={kind:'Spring-driven lower back lengths',fitting,targets:3,pinnedVertices:pinned,movingVertices:moving,attributeBytes:position.count*3*4*3*2,maximumShapeOffsetMeters:.085,extraDrawCalls:0,extraBones:0,scalpAndFringePinned:true,strandCollisionSolver:false};
  mesh.userData.secondaryHairMotion=stats;
  function update(dt,{reset=false,disabled=false}={}){
    if(disposed)return;
    head.updateWorldMatrix(true,false);head.matrixWorld.decompose(currentPosition,currentQuaternion,scale);
    const elapsed=Number.isFinite(dt)&&dt>0&&dt<=.1?dt:0;
    let clear=reset||disabled||!initialized||!Number.isFinite(dt)||dt<0||dt>.1;
    velocity.copy(currentPosition).sub(previousPosition);if(velocity.length()>3)clear=true;
    if(elapsed&&!clear)velocity.divideScalar(elapsed*Math.max(.01,Math.abs(scale.x))).applyQuaternion(inverse.copy(currentQuaternion).invert());else velocity.set(0,0,0);
    rotation.copy(previousQuaternion).invert().multiply(currentQuaternion);if(rotation.w<0)rotation.set(-rotation.x,-rotation.y,-rotation.z,-rotation.w);
    const sine=Math.hypot(rotation.x,rotation.y,rotation.z),factor=elapsed&&!clear&&sine>1e-8?2*Math.atan2(sine,rotation.w)/(sine*elapsed):0;
    const state=response.update(elapsed,{velocityX:velocity.x,velocityZ:velocity.z,yawRate:rotation.y*factor,pitchRate:rotation.x*factor,reset:clear,disabled});
    mesh.morphTargetInfluences[0]=state.back;mesh.morphTargetInfluences[1]=Math.max(0,-state.lateral);mesh.morphTargetInfluences[2]=Math.max(0,state.lateral);
    previousPosition.copy(currentPosition);previousQuaternion.copy(currentQuaternion);initialized=true;return state;
  }
  return {stats,update,dispose(){if(disposed)return;disposed=true;response.reset();mesh.morphTargetInfluences.fill(0);}};
}
