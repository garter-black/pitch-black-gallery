import * as THREE from '../vendor/three.module.min.js';
import {loadOriginalCharacter,originalCharacterChoice,saveOriginalCharacterChoice,ORIGINAL_CHARACTERS,HUNTRESS_REPAIR_HOLD} from './original-characters.js?v=sorceress-20260928-r2';
const live=new Set();
const position=new THREE.Vector3();
function publish(id,loading,error=''){
  const state={id,loading,error,credit:ORIGINAL_CHARACTERS[id],huntressHeld:HUNTRESS_REPAIR_HOLD};
  window.__pbOriginalCharacter=state;
  window.dispatchEvent(new CustomEvent('pb:original-character-state',{detail:state}));
}

// Keep each world's existing placement, profile, clickable group and movement
// controller. Only Hecate's stationary host appearance uses these source models.
export async function createOriginalHecate({height=1.85,castShadow=false}={}){
  const avatar=new THREE.Group();avatar.name='Hecate · original character';
  const record={avatar,model:null,disposed:false,request:0};live.add(record);
  async function choose(id){
    if(!Object.hasOwn(ORIGINAL_CHARACTERS,id)||record.disposed)return;
    if(id==='huntress'&&HUNTRESS_REPAIR_HOLD){publish(record.model?.userData.character.id||'sorceress',false,'Huntress is temporarily held for a skinning repair.');return;}
    const token=++record.request;publish(id,true);
    const next=await loadOriginalCharacter(id,{height,castShadow});
    // Gallery Hecate is the recovered stationary host; do not synthesize locomotion.
    next.userData.setSourceMotion(false);
    if(record.disposed||token!==record.request){next.userData.disposeCharacter();return;}
    // The Huntress source includes a tall banner. Match the actual head height
    // at a host's station instead of shrinking the person to fit her props.
    if(id==='huntress'){
      const head=next.userData.getPortraitTarget(new THREE.Vector3());
      if(head.y>0)next.scale.setScalar(height*.93/head.y);
    }
    record.model?.userData.disposeCharacter();record.model=next;avatar.add(next);
    avatar.userData.character={...next.userData.character,profileId:'hecate',name:'Hecate',appearance:id,stationary:true};
    avatar.userData.character.sourceName=next.userData.character.name;
    saveOriginalCharacterChoice(id);publish(id,false);
  }
  const onChoice=e=>choose(e.detail.id).catch(error=>publish(record.model?.userData.character.id||'sorceress',false,error.message));
  avatar.userData.setCharacterTime=t=>record.model?.userData.setCharacterTime(t);
  avatar.userData.disposeCharacter=()=>{if(record.disposed)return;record.disposed=true;record.request++;window.removeEventListener('pb:original-character-choice',onChoice);record.model?.userData.disposeCharacter();live.delete(record);avatar.removeFromParent();};
  try{await choose(HUNTRESS_REPAIR_HOLD?'sorceress':originalCharacterChoice());window.addEventListener('pb:original-character-choice',onChoice);return avatar;}
  catch(error){avatar.userData.disposeCharacter();publish(originalCharacterChoice(),false,error.message);throw error;}
}
export function updateOriginalHecates(dt,cameraPosition){
  for(const record of live){
    let visible=true;for(let o=record.avatar;o;o=o.parent)if(!o.visible){visible=false;break;}
    const close=!cameraPosition||record.avatar.getWorldPosition(position).distanceToSquared(cameraPosition)<26*26;
    if(visible&&close&&record.avatar.parent)record.model?.userData.updateCharacter(dt);
  }
}
export function disposeOriginalHecates(){for(const record of [...live])record.avatar.userData.disposeCharacter();}
