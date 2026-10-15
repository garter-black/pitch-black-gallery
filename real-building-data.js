// Reconstructed from A100–A103 (Nov 2017) and the supplied interior references.
// Source coordinates remain in metres. The walkthrough enlarges the venue by 40%.
// Small wall offsets are traced, not a survey of the current as-built property.
export const BUILDING = Object.freeze({name:'Black Garter',address:'17–19 The Seven Ways, Rockdale',
  scale:32.72,frontZ:66,datum:115.36,baseY:3,frontage:12.195,collisionRadius:.26,
  experienceScale:1.4,experiencePivot:{x:0,y:3,z:66.2},
  bounds:{minX:-6.15,maxX:6.15,minZ:65.65,maxZ:94.15},
  // Lower-ground clearance is expanded by 1.33m for a full-height avatar.
  levels:{lower:.25,ground:3,bar:3.97,mezzanine:4.93,first:6.44,firstSouth:7.64}});
export const planPoint=(px,py,y=3)=>({x:(418-py)/BUILDING.scale,y,z:BUILDING.frontZ+(1160-px)/BUILDING.scale});
export function planBounds(rect){const a=planPoint(rect[0],rect[1]),b=planPoint(rect[2],rect[3]);return {minX:Math.min(a.x,b.x),maxX:Math.max(a.x,b.x),minZ:Math.min(a.z,b.z),maxZ:Math.max(a.z,b.z)};}
// [name, plan rectangle, world floor level, furnishing, palette]
export const BUILDING_ROOMS = [
 ['Suite 1',[249,422,340,513],1.58,'bed','sage'],
 ['Suite 2',[249,520,373,609],1.58,'bed','plum'],
 ['Suite 3',[382,463,457,591],1.58,'bed','cream'],
 ['Suite 4',[464,463,539,591],1.58,'bed','sage'],
 ['Suite 5',[548,510,636,609],1.58,'bed','plum'],
 ['Lower lounge',[645,510,770,609],1.58,'lounge','charcoal'],
 ['VIP lounge',[843,424,1122,592],1.58,'lounge','charcoal'],
 ['Laundry',[249,277,390,410],1.58,'laundry','cream'],
 ['Linen store',[404,279,550,364],1.47,'store','cream'],
 ['Store 2',[562,279,647,360],1.47,'store','cream'],
 ['Store 3',[661,279,737,336],1.47,'store','cream'],
 ['Store 4',[753,279,821,360],1.34,'store','cream'],
 ['Store 5',[833,279,900,360],1.29,'store','cream'],
 ['Store 6',[915,227,991,362],1.34,'store','cream'],
 ['Reception office',[405,280,546,370],3.36,'office','sage'],
 ['Suite 7',[561,280,646,360],3.34,'bed','cream'],
 ['Staff office 1',[753,280,819,357],3.34,'office','sage'],
 ['Staff office 2',[833,280,899,357],3.34,'office','sage'],
 ['Suite 8',[913,230,989,325],3,'bed','plum'],
 ['Suite 9',[1005,230,1151,291],3,'bed','cream'],
 ['Bar and lounge',[847,431,1124,562],3.97,'bar','charcoal'],
 ['Suite 6 / mezzanine',[650,480,770,607],4.93,'bed','cream'],
 ['Suite 16',[405,280,548,400],6.44,'spa','charcoal'],
 ['Staff office 3',[563,280,646,358],6.44,'office','sage'],
 ['Suite 14',[813,280,899,359],6.44,'bed','plum'],
 ['Suite 13',[913,230,988,360],6.44,'bed','cream'],
 ['Upper lounge',[1005,230,1154,322],6.44,'lounge','charcoal'],
 ['Staff office 4',[1040,336,1147,405],6.44,'office','sage'],
 ['Suite 10',[846,435,958,567],7.64,'spa','charcoal'],
 ['Suite 11',[1008,436,1132,510],7.64,'bed','cream'],
 ['Suite 12',[1008,524,1127,607],7.64,'bed','plum'],
 ['Suite 15',[651,480,769,607],7.64,'spa','charcoal'],
].map(([name,rect,y,kind,palette])=>({name,rect,y:y<2?.25:y,kind,palette,...planBounds(rect)}));

// Solid wall runs leave the door openings shown on the source drawings.
export const PLAN_WALLS = {
 lower:[
  [242,272,242,614],[242,614,770,614],[838,601,1128,601],[1141,415,1128,601],
  [242,415,337,415],[391,415,1138,415],[398,273,398,415],
  [244,272,289,272],[328,272,432,272],[463,272,588,272],[615,272,681,272],[713,272,772,272],[801,272,853,272],[882,272,908,272],
  [555,273,555,366],[555,367,948,367],[654,273,654,344],[654,344,744,344],[744,273,744,367],[827,273,827,367],[907,273,907,367],[998,221,998,367],[977,367,998,367],
  [250,517,341,517],[343,451,343,517],[376,459,376,597],[377,597,405,597],[434,597,487,597],[517,597,545,597],
  [409,459,514,459],[539,459,568,459],[460,459,460,597],[544,459,544,614],
  [544,505,597,505],[597,459,597,521],[640,512,640,614],[640,473,840,473],[770,512,770,614],[838,513,838,601],
 ],
 ground:[
  [399,274,399,317],[399,343,399,374],[350,374,399,374],[350,414,638,414],[350,405,350,414],
  [399,274,433,274],[471,274,509,274],[539,274,587,274],[617,274,654,274],[693,274,724,274],[750,274,774,274],[804,274,855,274],[884,274,906,274],
  [555,274,555,368],[555,368,617,368],[653,274,653,368],[744,274,744,368],[744,368,794,368],[827,274,827,355],[859,368,906,368],[906,274,906,368],
  [906,330,964,330],[966,330,966,367],[998,222,998,367],[908,272,939,222],[939,222,1168,222],
  [1103,298,1160,298],[1103,298,1103,347],[1035,347,1103,347],
  [708,414,770,414],[817,414,876,414],[944,414,1148,414],
  [644,473,838,473],[644,477,644,614],[838,473,838,575],[773,510,773,579],[773,606,773,614],[775,614,1135,614],
 ],
 first:[
  [399,274,399,414],[399,274,449,274],[484,274,592,274],[624,274,654,274],[708,274,755,274],[784,274,819,274],[855,274,906,274],
  [399,414,559,414],[613,414,968,414],[1003,414,1148,414],
  [555,275,555,376],[555,401,555,414],[555,367,600,367],[632,367,653,367],[653,274,653,367],
  [744,274,744,367],[744,328,806,328],[775,367,806,367],[806,328,806,367],[848,367,948,367],[906,274,906,367],
  [906,274,938,222],[938,222,1167,222],[998,222,998,367],[977,367,998,367],[1035,329,1155,329],[1035,329,1035,373],[1035,402,1035,414],
  [644,473,694,473],[725,473,793,473],[824,473,838,473],[644,473,644,614],[644,614,1134,614],
  [775,475,775,578],[775,606,775,614],[838,425,838,574],[838,574,936,574],[968,425,968,574],
  [1003,425,1003,482],[1003,510,1003,530],[1003,559,1003,614],[1003,517,1137,517],
 ],
 mezzanine:[[644,473,694,473],[725,473,793,473],[824,473,838,473],[644,473,644,614],[644,614,838,614],[775,475,775,551],[775,606,775,614]],
};

// World conversion includes the drawing's reflected X axis. The street and hub
// passage keep their existing dimensions; the venue expands about its front wall.
export function buildingWorldPoint(p){const s=BUILDING.experienceScale,a=BUILDING.experiencePivot;return {x:-(p.x-a.x)*s+a.x,y:a.y+(p.y-a.y)*s,z:a.z+(p.z-a.z)*s};}
export function buildingPlanPoint(p){const s=BUILDING.experienceScale,a=BUILDING.experiencePivot;return {x:-(p.x-a.x)/s+a.x,y:a.y+(p.y-a.y)/s,z:a.z+(p.z-a.z)/s};}
export function containsBuilding(player){
 const b=BUILDING.bounds,s=BUILDING.experienceScale,p=BUILDING.experiencePivot;
 return player.z>=43&&player.z<=p.z+(b.maxZ-p.z)*s+1&&Math.abs(player.x)<Math.max(16,Math.max(Math.abs(b.minX),Math.abs(b.maxX))*s+1);
}
export function buildingLocation(player){
 if(!containsBuilding(player))return null;
 if(player.z<58)return {name:'Black Garter passage',level:'GROUND / TO THE SEVEN WAYS',copy:'Follow the passage to the Black Garter front door.'};
 const p=buildingPlanPoint(player);
 if(p.z<65.65)return {name:'The Seven Ways',level:'BLACK GARTER / STREET FRONT',copy:'17–19 The Seven Ways, Rockdale. Enter beneath the curved glass canopy.'};
 const room=BUILDING_ROOMS.find(r=>p.x>=r.minX&&p.x<=r.maxX&&p.z>=r.minZ&&p.z<=r.maxZ&&Math.abs(p.y-r.y)<.6);
 const level=p.y<2.65?'LOWER GROUND':p.y<4.7?'GROUND':p.y<5.8?'MEZZANINE':'FIRST FLOOR';
 return {name:room?.name||'Black Garter',level:'BLACK GARTER / '+level,copy:room?.kind==='bar'?'Black walls, gold panels, ceiling wallpaper and the glass-block lounge.':room?.kind==='spa'?'Dark stone, mirrored walls and a corner spa.':'Explore the connected rooms, stairways and courtyards.'};
}
