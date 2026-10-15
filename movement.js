// Deterministic local movement; the scene supplies public colliders and floors.
export function floorHeightAt(floor,x,z){
  return floor.y+(floor.slopeX||0)*(x-(floor.originX||0))+(floor.slopeZ||0)*(z-(floor.originZ||0));
}
export class Movement {
  constructor(floors, obstacles) {
    this.floors = floors;
    this.obstacles = obstacles;
    this.radius = 0.34;
    this.height = 1.72;
    this.setCapabilities({});
    this.reset(0, 0, 32);
  }
  setCapabilities(capabilities) {
    // This is local simulation, not an authorization boundary. Private scenes
    // and shared-session privileges must be checked by the server separately.
    this.capabilities=Object.fromEntries(['blink','grapple','vault','glide','wallrun'].map(key=>[key,capabilities[key]===true]));
  }
  reset(x, y, z) {
    Object.assign(this, {x,y,z,velocityX:0,velocityZ:0,velocityY:0,jumps:0,grounded:true,dashTime:0,dashCooldown:0,dashX:0,dashZ:0,blinkCooldown:0,grappleCooldown:0,grappleTarget:null,wallTime:0,glideTime:0,wallRunning:false,gliding:false,vaultTime:0,wallDirectionX:0,wallDirectionZ:0});
  }
  jump() {
    if (this.jumps >= 3) return false;
    this.velocityY = 7.8;
    this.grounded = false;
    this.jumps += 1;
    return true;
  }
  dash(yaw, forward=1, strafe=0) {
    if (this.dashCooldown > 0) return false;
    const length = Math.hypot(forward, strafe) || 1;
    if (!forward && !strafe) forward = 1;
    this.dashX = (-Math.sin(yaw)*forward + Math.cos(yaw)*strafe)/length;
    this.dashZ = (-Math.cos(yaw)*forward - Math.sin(yaw)*strafe)/length;
    this.dashTime = 0.2;
    this.dashCooldown = 1.25;
    return true;
  }
  blink(yaw) {
    if(!this.capabilities.blink||this.blinkCooldown>0)return false;
    const dx=-Math.sin(yaw),dz=-Math.cos(yaw),start={x:this.x,z:this.z};
    // Sweep the entire path, including thin obstacles; blink never skips walls.
    for(let distance=.08;distance<=8;distance+=.08){
      const x=start.x+dx*distance,z=start.z+dz*distance;
      if(this.blocked(x,z))break;
      this.x=x;this.z=z;
    }
    if(Math.hypot(this.x-start.x,this.z-start.z)<.4){this.x=start.x;this.z=start.z;return false;}
    this.blinkCooldown=5;return true;
  }
  grapple(target) {
    if(!this.capabilities.grapple||this.grappleCooldown>0||!target||!['x','y','z'].every(key=>Number.isFinite(target[key])))return false;
    const distance=Math.hypot(target.x-this.x,target.y-this.y,target.z-this.z);
    if(distance<2||distance>30)return false;
    // Only valid visible anchors selected by the scene reach this point.
    this.grappleTarget={x:target.x,y:target.y,z:target.z};this.grappleCooldown=2.8;
    this.grounded=false;this.jumps=Math.max(this.jumps,1);return true;
  }
  releaseGrapple(){this.grappleTarget=null;}
  vault(yaw) {
    if(!this.capabilities.vault||!this.grounded||this.vaultTime>0)return false;
    const dx=-Math.sin(yaw),dz=-Math.cos(yaw);
    const ahead=this.obstacles.filter(b=>{
      const x=this.x+dx*1.05,z=this.z+dz*1.05;
      return x+this.radius>b.minX&&x-this.radius<b.maxX&&z+this.radius>b.minZ&&z-this.radius<b.maxZ&&b.maxY>this.y+.35&&b.maxY<=this.y+1.6;
    });
    if(!ahead.length)return false;
    this.velocityY=9.5;this.grounded=false;this.jumps=Math.max(this.jumps,1);
    this.dashX=dx;this.dashZ=dz;this.vaultTime=.58;return true;
  }
  blocked(x, z) {
    const r = this.radius;
    // Test the full body at a reachable step height, including its head. Only
    // explicitly walkable building slabs may be stepped over while grounded.
    let feet=this.y;
    if(this.grounded)for(const f of this.floors){
      if(f.building===true&&x>=f.minX&&x<=f.maxX&&z>=f.minZ&&z<=f.maxZ){
        const y=floorHeightAt(f,x,z);if(y<=this.y+Math.min(.28,Math.max(.2,f.stepHeight||.2))&&y>=this.y-.26)feet=Math.max(feet,y);
      }
    }
    const supportFlights=new Set();
    if(this.grounded)for(const f of this.floors)if(f.ramp&&f.rampId!==undefined&&x>=f.minX&&x<=f.maxX&&z>=f.minZ&&z<=f.maxZ&&Math.abs(floorHeightAt(f,x,z)-feet)<.2)supportFlights.add(f.rampId);
    // The smooth support plane owns contact with its own treads. Their solid
    // undersides still stop an avatar below the flight or airborne into it.
    return this.obstacles.some(b => !(this.grounded&&b.rampSurface&&supportFlights.has(b.rampId))
      &&!(this.grounded&&b.walkable===true&&b.maxY<=feet+((x<b.minX||x>b.maxX||z<b.minZ||z>b.maxZ)?Math.max(.2,r,Math.min(.28,b.stepHeight||.2)):.04))
      &&x+r>b.minX&&x-r<b.maxX&&z+r>b.minZ&&z-r<b.maxZ&&feet+this.height>b.minY+.04&&feet<b.maxY-.04);
  }
  step(dt, input) {
    let remaining = Math.min(Math.max(dt,0),0.08);
    while (remaining > 0) {
      const step = Math.min(remaining, 1/120);
      this.tick(step,input);
      remaining -= step;
    }
  }
  tick(dt, {forward=0,strafe=0,yaw=0,sprint=false,walk=false,glide=false}={}) {
    this.dashCooldown = Math.max(0,this.dashCooldown-dt);
    this.blinkCooldown=Math.max(0,this.blinkCooldown-dt);
    this.grappleCooldown=Math.max(0,this.grappleCooldown-dt);
    this.wallRunning=false;this.gliding=false;this.wallDirectionX=0;this.wallDirectionZ=0;
    const length = Math.max(1,Math.hypot(forward,strafe));
    const speed = sprint ? 4.6 : walk ? 1.3 : 3.1;
    const targetX=(-Math.sin(yaw)*forward+Math.cos(yaw)*strafe)*speed/length;
    const targetZ=(-Math.cos(yaw)*forward-Math.sin(yaw)*strafe)*speed/length;
    // Physical acceleration gives the captured gait time to take weight. Braking
    // and reversing stay responsive; special traversal retains its own speeds.
    const braking=!forward&&!strafe || targetX*this.velocityX+targetZ*this.velocityZ<0;
    const acceleration=this.grounded ? (braking?18:walk?9:13) : 11;
    const changeX=targetX-this.velocityX,changeZ=targetZ-this.velocityZ;
    const amount=Math.min(1,acceleration*dt/(Math.hypot(changeX,changeZ)||1));
    this.velocityX+=changeX*amount;this.velocityZ+=changeZ*amount;
    let vx=this.velocityX,vz=this.velocityZ;
    if(this.dashTime>0){vx=this.dashX*24;vz=this.dashZ*24;this.dashTime=Math.max(0,this.dashTime-dt);}
    if(this.vaultTime>0){vx=this.dashX*9;vz=this.dashZ*9;this.vaultTime=Math.max(0,this.vaultTime-dt);}
    let gravity=22;
    if(this.capabilities.wallrun&&!this.grounded&&sprint&&forward>0&&this.wallTime<1.25){
      const sideX=Math.cos(yaw)*.64,sideZ=-Math.sin(yaw)*.64;
      const wallSide=this.blocked(this.x+sideX,this.z+sideZ)?1:this.blocked(this.x-sideX,this.z-sideZ)?-1:0;
      if(wallSide){
        this.wallRunning=true;this.wallTime+=dt;gravity=3;this.velocityY=Math.max(this.velocityY,-.8);vx*=1.2;vz*=1.2;
        this.wallDirectionX=wallSide*sideX/.64;this.wallDirectionZ=wallSide*sideZ/.64;
      }
    }
    if(this.capabilities.glide&&glide&&!this.grounded&&this.velocityY<0&&this.glideTime<5){
      this.gliding=true;this.glideTime+=dt;gravity=3;this.velocityY=Math.max(this.velocityY,-2.8);
    }
    if(this.grappleTarget){
      const target=this.grappleTarget,dx=target.x-this.x,dy=target.y-this.y,dz=target.z-this.z,distance=Math.hypot(dx,dy,dz);
      if(distance<1||distance>32)this.releaseGrapple();
      else {vx=dx/distance*18;vz=dz/distance*18;this.velocityY=dy/distance*18;gravity=0;}
    }
    const nextX=this.x+vx*dt,nextZ=this.z+vz*dt;
    const beforeX=this.x,beforeZ=this.z;
    if(!this.blocked(nextX,this.z))this.x=nextX;else this.velocityX=0;
    if(!this.blocked(this.x,nextZ))this.z=nextZ;else this.velocityZ=0;
    if(this.grappleTarget&&(Math.abs(vx)>1||Math.abs(vz)>1)&&this.x===beforeX&&this.z===beforeZ)this.releaseGrapple();
    const previousY=this.y;
    const wasGrounded=this.grounded;
    this.velocityY-=gravity*dt;
    this.y+=this.velocityY*dt;
    if(this.velocityY>0){
      for(const b of this.obstacles){
        if(this.x+this.radius>b.minX && this.x-this.radius<b.maxX && this.z+this.radius>b.minZ && this.z-this.radius<b.maxZ && previousY+this.height<=b.minY+0.03 && this.y+this.height>=b.minY){this.y=b.minY-this.height;this.velocityY=0;this.releaseGrapple();}
      }
    }
    this.grounded=false;
    if(this.velocityY<=0){
      let landing=-Infinity;
      for(const f of this.floors){
        if(this.x>=f.minX && this.x<=f.maxX && this.z>=f.minZ && this.z<=f.maxZ){
          const height=floorHeightAt(f,this.x,this.z);
          // Real-building thresholds and ramped stair collision follow the foot
          // support while grounded. Airborne players cannot snap up to a floor.
          // Enlarged venue thresholds have an explicit, capped step allowance.
          // Ordinary hub floors and airborne collision retain their defaults.
          const stepUp=wasGrounded&&f.building===true ? Math.min(.28,Math.max(.2,f.stepHeight||.2)) : .05;
          const followDown=wasGrounded&&f.building===true&&height<=previousY&&height>=previousY-.26;
          if(previousY>=height-stepUp && (this.y<=height||followDown))landing=Math.max(landing,height);
        }
      }
      for(const b of this.obstacles){
        if(!b.rampSurface&&this.x>=b.minX && this.x<=b.maxX && this.z>=b.minZ && this.z<=b.maxZ && previousY>=b.maxY-0.05 && this.y<=b.maxY)landing=Math.max(landing,b.maxY);
      }
      if(Number.isFinite(landing)){this.y=landing;this.velocityY=0;this.grounded=true;this.jumps=0;this.wallTime=0;this.glideTime=0;}
    }
  }
}
