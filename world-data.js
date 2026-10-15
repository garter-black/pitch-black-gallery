// Public locations only. This file contains no private scenes or agent authority.
export const ROOMS = [
  [1,'Hecate','Astral Sanctum','Ground','#bcc5e5','astral','Orchestration & concierge','Black basalt, moonlit glass and an orbital sanctuary.'],
  [2,'Athena','Archive of Proof','Upper','#e4dcc1','archive','Evidence & knowledge','Ivory shelves and precise instruments suspended in quiet.'],
  [3,'Hera','Palace of Arrival','Ground','#d9caab','garden','Welcome & hospitality','Champagne stone and a ceremonial garden of arrival.'],
  [4,'Hedone','Velvet Eclipse','Upper','#a34b66','stage','Entertainment','Crimson velvet and mirrors surrounding an intimate stage.'],
  [5,'Artemis','Diamond Vault','Ground','#bbecf3','crystal','Diamonds & commerce','A platinum atelier opening into a cathedral of cut crystal.'],
  [6,'Aphrodite','Rosewater Pavilion','Ground','#dfadb9','garden','People & wellbeing','Rose quartz and a floating garden in soft light.'],
  [7,'Nyx','Gallery of Midnight','Upper','#9da0b1','gallery','Art & design','Black sculpture and razor-thin light in an endless gallery.'],
  [8,'Hestia','Ember House','Ground','#d4a37b','hearth','Property','Warm timber and stone gathered around a monumental hearth.'],
  [9,'Thalia','The Impossible Salon','Ground','#aebdde','kinetic','Consulting','Kinetic sculpture and playful impossible geometry.'],
  [10,'Persephone','Underbloom','Ground','#b18fd1','garden','Artificial intelligence','Luminous roots wind through plum-black machinery.'],
  [11,'Euterpe','Resonance Hall','Upper','#dfb775','sound','Music','Amber acoustic rings around a suspended listening stage.'],
  [12,'Erato','The Endless Cinema','Upper','#c89baa','stage','Film','A silver screen within an oxblood cinema.'],
  [13,'Cassandra','Afterhours Hotel','Upper','#87b2a4','city','Hospitality','Emerald glass and a midnight city beyond the lounge.'],
  [14,'Circe','The Rewrite Foundry','Ground','#aad9e2','digital','Websites','White ceramic and programmable planes of light.'],
  [15,'Selene','Lunar Observatory','Ground','#d1d8e6','astral','Executive support','Pearl stone and orbital silver above the clouds.'],
  [16,'Demeter','Living Engine','Upper','#a2bd81','garden','Infrastructure','A living canopy grows through warm brass machinery.'],
  [17,'Medea','The Alchemist Workshop','Ground','#d7a276','kinetic','Upgrades','Burnished steel, suspended amber glass and a working forge.'],
  [18,'Peitho','Hall of Accord','Upper','#d4c4a5','archive','Legal','Luminous sandstone and formal architecture of agreement.'],
  [19,'Styx','The Blackwater Gate','Upper','#91aab6','gate','Security','Severe obsidian rising above a perfectly still black river.'],
  [20,'Eos','Dawn Laboratory','Upper','#e5bda9','digital','Research','Opaline glass and precise instruments on a dawn horizon.'],
].map(([id,god,name,floor,color,motif,role,description]) => ({id,god,name,floor,color,motif,role,description,profileId:id===1?'hecate':null}));

for (const floor of ['Ground','Upper']) {
  ROOMS.filter(room => room.floor === floor).forEach((room,index) => {
    room.side = index < 5 ? -1 : 1;
    room.z = -32 + (index % 5) * 16;
    room.y = floor === 'Ground' ? 0 : 10;
    room.x = room.side * 38;
  });
}

export const TRACKS = [
  ['Detonate (Pitch Black)','01-detonate-pitch-black.mp3'],
  ['The Black Garter / Unburied','02-the-black-garter-unburied.mp3'],
  ['Married to the Lightning','06-married-to-the-lightning.mp3'],
  ['Honi Soit','29-honi-soit.mp3'],
  ['Sanguis et Ferrum','30-sanguis-et-ferrum.mp3'],
].map(([title,file]) => ({title,url:'https://album.black.gallery/audio/'+file}));
