// Anonymous public-hall transport. Availability is controlled by the world so
// hidden tabs and private spaces cannot publish a position or reopen a socket.
export function createHallPresence({url,onState=()=>{},onReset=()=>{},onSnapshot=()=>{},
  makeSocket=value=>new WebSocket(value),now=()=>performance.now(),
  setTimer=(callback,delay)=>setTimeout(callback,delay),clearTimer=id=>clearTimeout(id),
  random=Math.random,autoRetry=true}){
  const HANDSHAKE_MS=10000,RESPONSE_MS=12000;
  let available=false,disposed=false,socket=null,opened=false,ownId=null,sequence=0;
  let timer=null,timerVersion=0,failures=0,connectedAt=0,lastReceived=0,awaitingSince=null;

  function cancelTimer(){timerVersion++;if(timer!==null)clearTimer(timer);timer=null;}
  function schedule(callback,delay){
    cancelTimer();const version=timerVersion;
    timer=setTimer(()=>{if(version!==timerVersion)return;timer=null;callback();},Math.max(0,delay));
  }
  function retire(){
    cancelTimer();const previous=socket;socket=null;opened=false;ownId=null;awaitingSince=null;
    // Invalidate callbacks before close, which may synchronously dispatch events.
    if(previous)try{previous.close(1000,'public_presence_paused');}catch{/* Already closed. */}
    onReset();
  }
  function failed(){
    retire();if(!available||disposed)return;onState('disconnected');
    if(autoRetry){
      const delay=Math.min(30000,1000*2**Math.min(failures++,5))*(.8+.2*random());
      schedule(connect,delay);
    }
  }
  function watch(){
    if(!socket||!available||disposed)return;
    const deadline=!opened||!ownId?connectedAt+HANDSHAKE_MS:
      awaitingSince===null?null:Math.max(awaitingSince,lastReceived)+RESPONSE_MS;
    if(deadline===null){cancelTimer();return;}
    if(now()>=deadline){failed();return;}
    schedule(watch,deadline-now());
  }
  function connect(){
    if(!available||disposed||socket)return;
    cancelTimer();onState('connecting');connectedAt=now();lastReceived=connectedAt;
    try{socket=makeSocket(url);}catch{failed();return;}
    const current=socket;
    current.addEventListener('open',()=>{
      if(socket!==current||!available)return;opened=true;sequence=0;watch();
    });
    current.addEventListener('close',()=>{if(socket===current)failed();});
    current.addEventListener('error',()=>{if(socket===current)failed();});
    current.addEventListener('message',event=>{
      if(socket!==current||!available||!opened)return;
      try{
        const data=JSON.parse(event.data);
        if(data?.type==='hello'&&typeof data.id==='string'&&data.id.length>0&&data.id.length<=80){
          if(ownId)return;ownId=data.id;lastReceived=now();onState('connected');watch();
        }else if(data?.type==='snapshot'&&ownId&&Array.isArray(data.players)){
          onSnapshot(data.players.slice(0,32),ownId);
          lastReceived=now();awaitingSince=null;failures=0;watch();
        }
      }catch{/* Invalid remote data cannot extend connection liveness. */}
    });
    watch();
  }
  function send(frame){
    if(!available||disposed||!opened||!ownId||socket?.readyState!==1)return false;
    try{
      socket.send(JSON.stringify({...frame,seq:++sequence}));
      if(awaitingSince===null)awaitingSince=now();watch();return true;
    }catch{failed();return false;}
  }
  return {
    setAvailable(value){
      value=!!value;if(disposed||value===available)return;available=value;
      if(value){failures=0;connect();}else{retire();onState('paused');}
    },
    position(position,yaw){return send({type:'position',position,yaw});},
    portal(destination){return send({type:'portal',destination});},
    dispose(){if(disposed)return;disposed=true;available=false;retire();},
  };
}
