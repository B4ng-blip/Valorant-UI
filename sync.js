/* Realtime sync over public MQTT-over-WebSocket brokers (no account needed).
   The control panel publishes the full state (retained); overlays subscribe.
   Retained messages mean an overlay that connects later instantly gets the
   latest state. Requires mqtt.js (loaded from CDN in the HTML). */

const Sync = (function(){
  // public brokers (WSS). If one is flaky, the next is tried.
  // For private/guaranteed use, replace with your own broker or an Ably/HiveMQ Cloud URL.
  const BROKERS = [
    "wss://broker.emqx.io:8084/mqtt",
    "wss://broker.hivemq.com:8884/mqtt"
  ];
  let client=null, topic=null, onState=null, brokerIdx=0, connected=false, everConnected=false;

  function getRoom(){
    const u=new URLSearchParams(location.search);
    let r=(u.get("room")||"").replace(/[^a-zA-Z0-9_-]/g,"").slice(0,24);
    if(!r){ r=Math.random().toString(36).slice(2,8); }
    return r;
  }
  function setStatus(ok){
    connected=ok; if(ok) everConnected=true;
    const dot=document.getElementById("syncStatus");
    if(dot){ dot.className="sync "+(ok?"ok":"off"); dot.textContent=ok?"● 실시간 연결됨":"● 연결 중…"; }
    if(typeof window.__onSync==="function") window.__onSync(ok);
  }

  function start(room, cb){
    onState=cb;
    topic="valo-overlay/"+room+"/state";
    connect();
  }
  function connect(){
    const url=BROKERS[brokerIdx%BROKERS.length];
    try{
      client=mqtt.connect(url,{
        clientId:"valo_"+Math.random().toString(16).slice(2,10),
        reconnectPeriod:2500, connectTimeout:9000, clean:true
      });
    }catch(e){ fallback(); return; }

    client.on("connect",()=>{ setStatus(true); client.subscribe(topic,{qos:0}); });
    client.on("message",(t,payload)=>{
      if(!onState) return;
      try{ onState(JSON.parse(payload.toString())); }catch(e){}
    });
    client.on("close",()=>setStatus(false));
    client.on("offline",()=>setStatus(false));
    client.on("error",()=>{ if(!everConnected) fallback(); });
  }
  function fallback(){
    try{ client && client.end(true); }catch(e){}
    brokerIdx++;
    if(brokerIdx<BROKERS.length*2) setTimeout(connect,500);
    else setStatus(false);
  }

  function publish(state){
    if(client && connected){
      try{ client.publish(topic, JSON.stringify(state), {retain:true, qos:0}); }catch(e){}
    }
  }

  return { start, publish, getRoom, isConnected:()=>connected };
})();
