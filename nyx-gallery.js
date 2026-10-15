// Original relief sculptures fitted to Nyx's existing public gallery partitions.
export function addNyxGallery({THREE,scene,room}={}){
  if(!THREE?.BufferGeometry||!scene?.isScene||![-1,1].includes(room?.side)||!Number.isFinite(room?.y)||!Number.isFinite(room?.z))throw new TypeError('Nyx gallery needs a scene and a finite public room');
  const group=new THREE.Group();group.name='Nyx / Midnight relief collection';group.userData.nyxGallery=true;
  group.position.set(room.side*29,room.y,room.z);group.rotation.y=room.side<0?Math.PI:0;
  const owned=new Set(),batches=new Map(),meshes=[];let disposed=false;
  const dispose=()=>{if(disposed)return;disposed=true;group.removeFromParent();for(const resource of owned)resource.dispose();owned.clear();};
  try{
    const specs={ink:{color:'#151923',roughness:.65,metalness:.27},graphite:{color:'#3c4250',roughness:.54,metalness:.46},silver:{color:'#b6c1d1',roughness:.32,metalness:.87},bone:{color:'#d6d7d0',roughness:.73,metalness:.08}};
    for(const [name,parameters]of Object.entries(specs)){
      const material=new THREE.MeshStandardMaterial(parameters);material.name='Midnight collection / '+name;owned.add(material);
      batches.set(name,{material,positions:[],normals:[],components:[]});
    }
    const identity=new THREE.Quaternion();
    const rotation=(x,y,z)=>new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z));
    function append(geometry,material,centre,scale,quaternion,record){
      let expanded;
      try{
        geometry.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...centre),quaternion,new THREE.Vector3(...scale)));
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
    function polygon(points,depth){
      const shape=new THREE.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
      return new THREE.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:false,curveSegments:12});
    }
    function arc(radius,width,start,end,steps=24){
      const points=[];
      for(let i=0;i<=steps;i++){const a=start+(end-start)*i/steps;points.push([Math.cos(a)*radius,Math.sin(a)*radius]);}
      for(let i=steps;i>=0;i--){const a=start+(end-start)*i/steps;points.push([Math.cos(a)*(radius-width),Math.sin(a)*(radius-width)]);}
      return points;
    }
    const partitions=[[4.8,-5.8,2.4],[8.3,5.9,3.1],[11.3,-5.8,2.6]];
    for(let panel=0;panel<partitions.length;panel++){
      const [u,worldV,width]=partitions[panel],v=room.side*worldV,facing=-Math.sign(v),faceRotation=rotation(0,facing<0?Math.PI:0,0),w=width*.84,h=3.94;
      const place=(x,y,depth)=>[u+(facing<0?-x:x),3.05+y,v+facing*depth];
      const box=(name,material,x,y,depth,sx,sy,sz,turn=0)=>append(new THREE.BoxGeometry(1,1,1),material,place(x,y,depth),[sx,sy,sz],faceRotation.clone().multiply(rotation(0,0,turn)),{panel,name,kind:'frame'});
      const relief=(name,material,points,x,y,depth,thickness,turn=0)=>append(polygon(points,thickness),material,place(x,y,depth),[1,1,1],faceRotation.clone().multiply(rotation(0,0,turn)),{panel,name,kind:'sculpture'});
      // The opaque back fully covers the earlier white inset and graphic cuts.
      box('Collection '+panel+' / inset backing','ink',0,0,.207,w,3.84,.04);
      for(const sign of[-1,1]){
        box('Collection '+panel+' / outer stile '+sign,'silver',sign*(w/2+.019),0,.245,.032,h,.067);
        box('Collection '+panel+' / inner reveal '+sign,'graphite',sign*(w/2-.025),0,.256,.015,h-.08,.035);
        box('Collection '+panel+' / cross rail '+sign,'silver',0,sign*(h/2-.016),.245,w+.07,.032,.067);
      }
      // A low, inset collector's plate is geometry, not another label texture.
      box('Collection '+panel+' / plate','graphite',w*.29,-1.76,.244,.31,.09,.025);
      for(let i=0;i<=panel;i++)box('Collection '+panel+' / plate mark '+i,'bone',w*.29-.07+i*.07,-1.76,.26,.025,.014,.009);

      if(panel===0){
        // Two interrupted orbital bands interlock through a narrow vertical spine.
        relief('Broken orbit / upper','graphite',arc(.66,.125,.15,Math.PI*1.75),-.09,.68,.26,.17,-.13);
        relief('Broken orbit / upper rim','silver',arc(.66,.014,.15,Math.PI*1.75),-.09,.68,.435,.014,-.13);
        relief('Broken orbit / lower','graphite',arc(.72,.16,-Math.PI*.85,Math.PI*.65),.07,-.68,.28,.20,.19);
        relief('Broken orbit / lower rim','silver',arc(.72,.014,-Math.PI*.85,Math.PI*.65),.07,-.68,.485,.014,.19);
        relief('Broken orbit / spine','bone',[[-.04,-1.43],[.025,-1.32],[.07,1.41],[-.02,1.28]],0,0,.265,.055);
        for(const sign of[-1,1])box('Broken orbit / anchor '+sign,'graphite',sign*.23,sign*1.47,.28,.19,.065,.08,.11);
      }else if(panel===1){
        // Five off-axis folded prisms; alternating returns make the face sculptural.
        for(let i=0;i<5;i++){
          const y=-1.20+i*.59,shift=(i%2?.07:-.06),turn=(i-2)*.035;
          const shape=[[-1.03,-.135],[-.32,-.275],[1.02,.12],[.39,.27]];
          relief('Fold study / blade '+i,i%2?'graphite':'bone',shape,shift,y,.255,.09+i*.027,turn);
          relief('Fold study / return '+i,'silver',[[-1.03,-.135],[-.32,-.275],[-.32,-.246],[-.98,-.108]],shift,y,.35+i*.027,.012,turn);
          box('Fold study / standoff '+i,'ink',shift-.32,y-.08,.241,.11,.18,.05);
        }
      }else{
        // A small cabinet of black forms: offset compartments, arcs and stepped cuts.
        const cellW=.55,cellH=.57;
        for(let row=0;row<5;row++)for(let column=0;column<3;column++){
          const x=(column-1)*.63,y=(2-row)*.62,id=row+'/'+column;
          box('Shadow cabinet / pocket '+id,'graphite',x,y,.247,cellW,cellH,.032);
          for(const sign of[-1,1]){
            box('Shadow cabinet / upright '+id+'/'+sign,'ink',x+sign*cellW/2,y,.297,.025,cellH+.025,.13);
            box('Shadow cabinet / rail '+id+'/'+sign,'ink',x,y+sign*cellH/2,.297,cellW,.025,.13);
          }
          if((row+column)%3===0){
            relief('Shadow cabinet / arc '+id,'silver',arc(.202,.053,-.25,Math.PI*1.45,14),x,y,.276,.13,(row-column)*.28);
          }else if((row+column)%3===1){
            relief('Shadow cabinet / folded cut '+id,'bone',[[-.19,-.19],[-.06,-.21],[.19,.16],[.08,.20]],x,y,.277,.10,(column-1)*.11);
          }else{
            for(let step=0;step<3;step++)box('Shadow cabinet / step '+id+'/'+step,'silver',x-.13+step*.115,y-.08+step*.07,.29+step*.044,.058,.27-step*.04,.072);
          }
        }
      }
    }
    let triangles=0,attributeBytes=0,components=0;const bounds=new THREE.Box3(),panelBounds=partitions.map(()=>new THREE.Box3());
    for(const [name,batch]of batches){
      const geometry=new THREE.BufferGeometry();owned.add(geometry);geometry.name='Midnight collection / '+name;
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(batch.positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(batch.normals,3));
      geometry.userData.components=batch.components;geometry.computeBoundingBox();geometry.computeBoundingSphere();bounds.union(geometry.boundingBox);
      const mesh=new THREE.Mesh(geometry,batch.material);mesh.name=geometry.name;mesh.userData.nyxGallery=true;group.add(mesh);meshes.push(mesh);
      triangles+=geometry.getAttribute('position').count/3;for(const attribute of Object.values(geometry.attributes))attributeBytes+=attribute.array.byteLength;components+=batch.components.length;
      for(const part of batch.components)panelBounds[part.panel].union(new THREE.Box3(new THREE.Vector3(...part.bounds.min),new THREE.Vector3(...part.bounds.max)));
    }
    group.updateMatrix();
    const colliders=panelBounds.map(box=>{box.applyMatrix4(group.matrix);return{minX:box.min.x,maxX:box.max.x,minY:box.min.y,maxY:box.max.y,minZ:box.min.z,maxZ:box.max.z};});
    const stats={version:1,meshes:meshes.length,materials:batches.size,triangles,attributeBytes,components,panels:3,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},source:'Original static framed relief collection; existing gallery partitions retained'};
    group.userData.galleryStats=stats;scene.add(group);return{group,meshes,stats,colliders,dispose};
  }catch(error){dispose();throw error;}
}
