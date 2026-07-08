import { useState, useEffect, useRef } from "react";

const SL_YELLOW = "#F5E020";

const MOODS = [
  { id:"fastest",  label:"Fastest",  icon:"⚡", color:"#F5E020", desc:"Pure speed, zero compromise" },
  { id:"scenic",   label:"Scenic",   icon:"🌄", color:"#10b981", desc:"Beauty over efficiency" },
  { id:"relaxing", label:"Relaxing", icon:"🍃", color:"#06b6d4", desc:"Low stress, high calm" },
  { id:"local",    label:"Local",    icon:"🏘️", color:"#f59e0b", desc:"Hidden gems & locals' picks" },
  { id:"adventure",label:"Adventure",icon:"🧭", color:"#ef4444", desc:"Unexpected & memorable" },
];

const ROUTES = {
  fastest:[
    {id:"f1",name:"Highway Express",time:"18 min",distance:"24.3 km",scenic:2,traffic:9,relaxation:3,adventure:1,color:"#F5E020",ai:"The most direct path cuts through the highway corridor. You'll gain 12 minutes but trade the city's character for concrete lanes. Best for early mornings when traffic is thin.",waypoints:[[51.505,-0.09],[51.515,-0.07],[51.525,-0.05],[51.53,-0.02]]},
    {id:"f2",name:"Ring Road Cut",time:"22 min",distance:"26.8 km",scenic:4,traffic:7,relaxation:5,adventure:2,color:"#eab308",ai:"A slight detour around the city ring reduces bottleneck risk by 40%. Marginally longer, but your arrival time variance is far lower.",waypoints:[[51.505,-0.09],[51.51,-0.1],[51.52,-0.08],[51.53,-0.02]]},
    {id:"f3",name:"Smart Predict",time:"25 min",distance:"22.1 km",scenic:3,traffic:8,relaxation:4,adventure:2,color:"#ca8a04",ai:"Shortest by distance, not time. The algorithm predicts signal timing patterns and routes you through three green waves in sequence.",waypoints:[[51.505,-0.09],[51.508,-0.11],[51.518,-0.09],[51.53,-0.02]]},
  ],
  scenic:[
    {id:"s1",name:"River Panorama",time:"34 min",distance:"31.2 km",scenic:10,traffic:5,relaxation:8,adventure:4,color:"#10b981",ai:"This route hugs the river for 8 kilometres. Sunrise hits the water between the two bridges — if you're driving at golden hour, you'll understand why locals never take the highway.",waypoints:[[51.505,-0.09],[51.5,-0.1],[51.495,-0.07],[51.5,-0.04],[51.53,-0.02]]},
    {id:"s2",name:"Park Boulevard",time:"38 min",distance:"28.7 km",scenic:9,traffic:6,relaxation:9,adventure:3,color:"#34d399",ai:"Passes through three parks and a Georgian terrace. 16 minutes longer than fastest, but the canopy tunnel in spring is worth every second.",waypoints:[[51.505,-0.09],[51.51,-0.11],[51.515,-0.09],[51.52,-0.06],[51.53,-0.02]]},
    {id:"s3",name:"Hilltop Circuit",time:"42 min",distance:"33.5 km",scenic:10,traffic:3,relaxation:7,adventure:6,color:"#6ee7b7",ai:"The only route with a city panorama viewpoint. The descent on the north side gives you a 30-second view of the full skyline.",waypoints:[[51.505,-0.09],[51.5,-0.12],[51.51,-0.13],[51.52,-0.1],[51.53,-0.02]]},
  ],
  relaxing:[
    {id:"r1",name:"Green Corridor",time:"29 min",distance:"25.1 km",scenic:7,traffic:8,relaxation:10,adventure:2,color:"#06b6d4",ai:"Designed around traffic psychology: fewer merges, wider lanes, tree-lined for the last 6km. Drive calm, arrive calm.",waypoints:[[51.505,-0.09],[51.508,-0.1],[51.518,-0.08],[51.525,-0.04],[51.53,-0.02]]},
    {id:"r2",name:"Suburb Glide",time:"31 min",distance:"27.4 km",scenic:6,traffic:9,relaxation:9,adventure:1,color:"#22d3ee",ai:"Residential streets with 30km/h zones. No sudden stops, no lane jockeying.",waypoints:[[51.505,-0.09],[51.51,-0.095],[51.52,-0.075],[51.53,-0.02]]},
    {id:"r3",name:"Canal Path",time:"36 min",distance:"29.8 km",scenic:8,traffic:9,relaxation:10,adventure:3,color:"#67e8f9",ai:"Follows the canal towpath through three villages. No traffic lights for the middle 14km.",waypoints:[[51.505,-0.09],[51.5,-0.095],[51.495,-0.08],[51.5,-0.05],[51.53,-0.02]]},
  ],
  local:[
    {id:"l1",name:"Market Quarter",time:"33 min",distance:"26.9 km",scenic:8,traffic:5,relaxation:6,adventure:7,color:"#f59e0b",ai:"The route locals actually use. Passes the covered market, 1920s cinema, and three bakeries that open at 06:30.",waypoints:[[51.505,-0.09],[51.51,-0.1],[51.515,-0.08],[51.52,-0.05],[51.53,-0.02]]},
    {id:"l2",name:"Old Town Weave",time:"37 min",distance:"24.3 km",scenic:9,traffic:4,relaxation:5,adventure:8,color:"#fbbf24",ai:"Cobblestone sections through the medieval quarter GPS usually avoids. The shortcut saves 4 minutes nobody outside the district knows about.",waypoints:[[51.505,-0.09],[51.507,-0.1],[51.512,-0.11],[51.52,-0.07],[51.53,-0.02]]},
    {id:"l3",name:"Artist District",time:"40 min",distance:"28.1 km",scenic:8,traffic:6,relaxation:7,adventure:6,color:"#fcd34d",ai:"Through the regenerated warehouse district, past street murals and independent coffee roasters.",waypoints:[[51.505,-0.09],[51.5,-0.1],[51.505,-0.11],[51.515,-0.09],[51.53,-0.02]]},
  ],
  adventure:[
    {id:"a1",name:"Ridge Run",time:"44 min",distance:"38.2 km",scenic:9,traffic:2,relaxation:4,adventure:10,color:"#ef4444",ai:"Unpaved section for 4km through moorland. The kind of route that becomes a story.",waypoints:[[51.505,-0.09],[51.5,-0.12],[51.495,-0.1],[51.505,-0.06],[51.53,-0.02]]},
    {id:"a2",name:"Coastal Detour",time:"51 min",distance:"45.7 km",scenic:10,traffic:1,relaxation:6,adventure:10,color:"#f87171",ai:"33 minutes longer than fastest. Worth every second. You will see the sea from 200 metres elevation.",waypoints:[[51.505,-0.09],[51.5,-0.13],[51.49,-0.11],[51.5,-0.06],[51.53,-0.02]]},
    {id:"a3",name:"Forest Traverse",time:"47 min",distance:"41.3 km",scenic:8,traffic:1,relaxation:5,adventure:9,color:"#fca5a5",ai:"Through ancient woodland, zero mobile signal for 18 minutes. The map runs out, the road doesn't.",waypoints:[[51.505,-0.09],[51.495,-0.11],[51.49,-0.09],[51.5,-0.05],[51.53,-0.02]]},
  ],
};

function SLLogo({ size = 36 }) {
  const vb=60, c=30, ringR=vb*0.27, tipDist=vb*0.46, lineW=vb*0.022, dotR=vb*0.06, COL="#c8a800";
  const angles=[225,315,9,63,117,171];
  return (
    <svg width={size} height={size} viewBox={`0 0 ${vb} ${vb}`} fill="none">
      {angles.map((deg,i)=>{
        const rad=deg*Math.PI/180;
        const sx=c+ringR*Math.cos(rad), sy=c+ringR*Math.sin(rad);
        const ex=c+tipDist*Math.cos(rad), ey=c+tipDist*Math.sin(rad);
        return <g key={i}><line x1={sx} y1={sy} x2={ex} y2={ey} stroke={COL} strokeWidth={lineW} strokeLinecap="round"/><circle cx={ex} cy={ey} r={dotR} fill={COL}/></g>;
      })}
      <circle cx={c} cy={c} r={ringR} stroke={COL} strokeWidth={vb*0.038} fill="#000"/>
      <text x={c} y={c+vb*0.105} textAnchor="middle" fill={COL} fontSize={vb*0.295} fontWeight="800" fontFamily="-apple-system,sans-serif" letterSpacing="0.5">SL</text>
    </svg>
  );
}

function ScoreBar({ label, value, color }) {
  const [w, setW] = useState(0);
  useEffect(()=>{ const t=setTimeout(()=>setW(value*10),150); return ()=>clearTimeout(t); },[value]);
  return (
    <div style={{marginBottom:7}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:3,fontSize:10,color:"#555",letterSpacing:"0.08em",textTransform:"uppercase"}}>
        <span>{label}</span><span style={{color,fontWeight:700}}>{value}/10</span>
      </div>
      <div style={{height:2,background:"rgba(255,255,255,0.06)",borderRadius:99}}>
        <div style={{height:"100%",width:`${w}%`,background:color,borderRadius:99,transition:"width .9s cubic-bezier(0.23,1,0.32,1)"}}/>
      </div>
    </div>
  );
}

function RouteCard({ route, selected, onClick, activeMood }) {
  const mood = MOODS.find(m=>m.id===activeMood);
  const [hov, setHov] = useState(false);
  const active = selected?.id === route.id;
  return (
    <div onClick={()=>onClick(route)} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{cursor:"pointer",borderRadius:12,padding:"14px 16px",transition:"all .3s",position:"relative",overflow:"hidden",marginBottom:8,
        border:`1px solid ${active?route.color+"88":"rgba(255,255,255,0.06)"}`,
        background:active?`linear-gradient(135deg,${route.color}14,${route.color}06)`:hov?"rgba(255,255,255,0.03)":"rgba(255,255,255,0.015)",
        transform:active?"translateY(-2px)":hov?"translateY(-1px)":"none",
        boxShadow:active?`0 0 0 1px ${route.color}33,0 8px 28px ${route.color}18`:"none"}}>
      {active && <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${route.color},transparent)`}}/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
        <div>
          <div style={{fontSize:11,color:route.color,fontWeight:700,marginBottom:3}}>{mood?.icon} {route.name}</div>
          <div style={{display:"flex",gap:8,alignItems:"baseline"}}>
            <span style={{color:"#f5f5f5",fontWeight:700,fontSize:16}}>{route.time}</span>
            <span style={{color:"#555",fontSize:11}}>· {route.distance}</span>
          </div>
        </div>
        {active && <div style={{width:6,height:6,borderRadius:"50%",background:route.color,marginTop:3}}/>}
      </div>
      <ScoreBar label="Scenic"     value={route.scenic}     color={SL_YELLOW}/>
      <ScoreBar label="Traffic"    value={route.traffic}    color="#c8f520"/>
      <ScoreBar label="Relaxation" value={route.relaxation} color="#f5a820"/>
      <ScoreBar label="Adventure"  value={route.adventure}  color="#f57820"/>
      {active && (
        <div style={{marginTop:10,padding:"9px 11px",background:"rgba(245,224,32,0.04)",borderRadius:8,borderLeft:`2px solid ${route.color}`}}>
          <div style={{fontSize:9,color:route.color,letterSpacing:"0.12em",textTransform:"uppercase",fontWeight:800,marginBottom:4}}>AI Insight</div>
          <p style={{fontSize:11,color:"#777",lineHeight:1.6,margin:0}}>{route.ai}</p>
        </div>
      )}
    </div>
  );
}

function MapView({ selectedRoute, activeMood }) {
  const mapRef=useRef(null), mapInst=useRef(null), layer=useRef(null);
  const mood=MOODS.find(m=>m.id===activeMood);
  const [ready,setReady]=useState(!!window.L);

  useEffect(()=>{
    if(window.L){setReady(true);return;}
    const link=document.createElement("link");
    link.rel="stylesheet"; link.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
    const s=document.createElement("script");
    s.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.onload=()=>setReady(true);
    document.head.appendChild(s);
  },[]);

  useEffect(()=>{
    if(!ready||mapInst.current)return;
    mapInst.current=window.L.map(mapRef.current,{center:[51.513,-0.06],zoom:12,zoomControl:false,attributionControl:false});
    window.L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",{subdomains:"abcd",maxZoom:19}).addTo(mapInst.current);
    window.L.control.zoom({position:"bottomright"}).addTo(mapInst.current);
  },[ready]);

  useEffect(()=>{
    if(!mapInst.current)return;
    if(layer.current)mapInst.current.removeLayer(layer.current);
    if(!selectedRoute)return;
    const g=window.L.layerGroup();
    window.L.polyline(selectedRoute.waypoints,{color:selectedRoute.color,weight:16,opacity:.08}).addTo(g);
    window.L.polyline(selectedRoute.waypoints,{color:selectedRoute.color,weight:3,opacity:.95}).addTo(g);
    selectedRoute.waypoints.forEach((wp,i,arr)=>{
      if(i!==0&&i!==arr.length-1)return;
      const st=i===0;
      window.L.marker(wp,{icon:window.L.divIcon({className:"",html:`<div style="width:12px;height:12px;border-radius:50%;background:${st?selectedRoute.color:"#f5f5f5"};border:2px solid ${st?"#0a0a0a":selectedRoute.color};box-shadow:0 0 14px ${selectedRoute.color}cc"></div>`,iconSize:[12,12],iconAnchor:[6,6]})}).addTo(g);
    });
    layer.current=g; g.addTo(mapInst.current);
    mapInst.current.fitBounds(selectedRoute.waypoints,{padding:[50,50],animate:true,duration:.8});
  },[selectedRoute]);

  return (
    <div style={{position:"relative",width:"100%",height:"100%"}}>
      {mood && <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:500,height:500,borderRadius:"50%",background:`radial-gradient(circle,${mood.color}10 0%,transparent 65%)`,pointerEvents:"none",zIndex:1,animation:"slPulse 4s ease-in-out infinite"}}/>}
      <div ref={mapRef} style={{width:"100%",height:"100%"}}/>
      {!selectedRoute && (
        <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:2,background:"rgba(10,10,10,0.5)",backdropFilter:"blur(3px)"}}>
          <div style={{opacity:.35,marginBottom:10}}><SLLogo size={44}/></div>
          <div style={{color:"#444",fontSize:12}}>Select a route to visualise it</div>
        </div>
      )}
    </div>
  );
}

function Hero({ onEnter }) {
  const [loaded,setLoaded]=useState(false);
  useEffect(()=>{const t=setTimeout(()=>setLoaded(true),80);return()=>clearTimeout(t);},[]);
  return (
    <div style={{minHeight:"100vh",background:"#0a0a0a",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden",padding:"24px"}}>
      <div style={{position:"absolute",inset:0,backgroundImage:`linear-gradient(rgba(245,224,32,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(245,224,32,0.03) 1px,transparent 1px)`,backgroundSize:"64px 64px"}}/>
      <div style={{position:"absolute",top:"10%",left:"10%",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,#F5E02015 0%,transparent 70%)",animation:"slPulse 5s ease-in-out infinite"}}/>
      <div style={{position:"absolute",bottom:"8%",right:"8%",width:320,height:320,borderRadius:"50%",background:"radial-gradient(circle,#10b98110 0%,transparent 70%)",animation:"slPulse 6s ease-in-out infinite 1.5s"}}/>
      <div style={{textAlign:"center",zIndex:2,opacity:loaded?1:0,transform:loaded?"none":"translateY(24px)",transition:"all 1s cubic-bezier(0.23,1,0.32,1)"}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(245,224,32,0.08)",border:"1px solid rgba(245,224,32,0.2)",borderRadius:99,padding:"5px 16px",marginBottom:28,fontSize:11,color:SL_YELLOW,letterSpacing:"0.1em",textTransform:"uppercase"}}>
          <span style={{width:5,height:5,borderRadius:"50%",background:SL_YELLOW,display:"inline-block",animation:"slPulse 1.5s ease-in-out infinite"}}/>
          AI-Powered Route Intelligence
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:14,marginBottom:20}}>
          <SLLogo size={52}/>
          <div style={{fontSize:"clamp(28px,5vw,44px)",fontWeight:900,letterSpacing:"-0.04em",color:"#f5f5f5"}}>
            Scout Lane<span style={{color:SL_YELLOW}}>AI</span>
          </div>
        </div>
        <h1 style={{fontSize:"clamp(34px,6vw,68px)",fontWeight:900,lineHeight:1.05,margin:"0 0 18px",letterSpacing:"-0.03em",color:"#f5f5f5"}}>
          Routes that feel<br/>
          <span style={{background:`linear-gradient(135deg,${SL_YELLOW},#c8f520,#f5a820)`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>like you</span>
        </h1>
        <p style={{fontSize:"clamp(14px,2vw,17px)",color:"#555",maxWidth:460,margin:"0 auto 36px",lineHeight:1.75}}>
          Not the fastest. Not the shortest.<br/>The route that matches your mood, your morning, your moment.
        </p>
        <button onClick={onEnter}
          style={{background:`linear-gradient(135deg,${SL_YELLOW},#d4c01a)`,border:"none",borderRadius:12,padding:"13px 36px",color:"#0a0a0a",fontSize:15,fontWeight:800,cursor:"pointer",boxShadow:`0 0 32px ${SL_YELLOW}44`,transition:"all .2s"}}
          onMouseOver={e=>e.currentTarget.style.transform="translateY(-2px)"}
          onMouseOut={e=>e.currentTarget.style.transform="none"}>
          Open Scout Lane →
        </button>
        <div style={{display:"flex",justifyContent:"center",gap:36,marginTop:48,flexWrap:"wrap"}}>
          {[["5 moods","Route personalities"],["AI insight","Per-route analysis"],["Live scores","Real-time comparison"]].map(([n,l])=>(
            <div key={n} style={{textAlign:"center"}}>
              <div style={{fontSize:18,fontWeight:800,color:"#f5f5f5"}}>{n}</div>
              <div style={{fontSize:10,color:"#444",marginTop:2,letterSpacing:"0.05em",textTransform:"uppercase"}}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [page,setPage]=useState("hero");
  const [activeMood,setActiveMood]=useState("scenic");
  const [selected,setSelected]=useState(null);
  const [from,setFrom]=useState("London Bridge, SE1");
  const [to,setTo]=useState("Hampstead Heath, NW3");
  const [searched,setSearched]=useState(false);
  const [mobileTab,setMobileTab]=useState("search");
  const [winW,setWinW]=useState(typeof window!=="undefined"?window.innerWidth:1024);

  useEffect(()=>{
    const fn=()=>setWinW(window.innerWidth);
    window.addEventListener("resize",fn);
    return()=>window.removeEventListener("resize",fn);
  },[]);

  const isMobile=winW<640, isTablet=winW>=640&&winW<1024;
  const routes=ROUTES[activeMood]||[];
  const mood=MOODS.find(m=>m.id===activeMood);

  const handleSearch=()=>{ setSearched(true); setSelected(routes[0]); if(isMobile)setMobileTab("map"); };
  const handleRoute=(r)=>{ setSelected(r); if(isMobile)setMobileTab("map"); };

  if(page==="hero") return (
    <>
      <style>{`@keyframes slPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(1.05)}} *{box-sizing:border-box;margin:0;padding:0}`}</style>
      <Hero onEnter={()=>setPage("app")}/>
    </>
  );

  const Nav = (
    <nav style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:isMobile?"11px 14px":"13px 22px",borderBottom:"1px solid rgba(255,255,255,0.05)",background:"rgba(10,10,10,0.9)",backdropFilter:"blur(16px)",flexShrink:0,zIndex:100}}>
      <div style={{display:"flex",alignItems:"center",gap:9}}>
        <SLLogo size={isMobile?26:30}/>
        <span style={{fontWeight:800,fontSize:isMobile?13:15,letterSpacing:"-0.03em",color:"#f5f5f5"}}>Scout Lane<span style={{color:SL_YELLOW}}>AI</span></span>
      </div>
      <div style={{display:"flex",gap:7,alignItems:"center"}}>
        {isMobile && (
          <div style={{display:"flex",background:"rgba(255,255,255,0.05)",borderRadius:7,padding:2,gap:2}}>
            {["search","map"].map(tab=>(
              <button key={tab} onClick={()=>setMobileTab(tab)} style={{background:mobileTab===tab?"rgba(255,255,255,0.1)":"transparent",border:"none",borderRadius:5,padding:"4px 10px",color:mobileTab===tab?"#f5f5f5":"#555",fontSize:10,fontWeight:700,cursor:"pointer"}}>
                {tab==="search"?"🔍":"🗺️"} {tab}
              </button>
            ))}
          </div>
        )}
        <button onClick={()=>setPage("hero")} style={{background:"transparent",border:"1px solid rgba(255,255,255,0.07)",borderRadius:7,padding:isMobile?"4px 9px":"5px 13px",color:"#444",fontSize:11,cursor:"pointer"}}>← Back</button>
      </div>
    </nav>
  );

  const Panel = (
    <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden",background:"#0d0d0d"}}>
      <div style={{padding:"14px 14px 0",flexShrink:0}}>
        {[{label:"From",val:from,set:setFrom,icon:"📍"},{label:"To",val:to,set:setTo,icon:"🏁"}].map(({label,val,set,icon})=>(
          <div key={label} style={{marginBottom:8}}>
            <div style={{fontSize:9,color:"#444",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4}}>{label}</div>
            <div style={{display:"flex",alignItems:"center",gap:7,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:9,padding:"9px 11px"}}>
              <span style={{fontSize:13}}>{icon}</span>
              <input value={val} onChange={e=>set(e.target.value)} style={{flex:1,fontSize:12,outline:"none",background:"transparent",border:"none",color:"#f5f5f5"}}/>
            </div>
          </div>
        ))}
        <div style={{marginBottom:10}}>
          <div style={{fontSize:9,color:"#444",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>Travel Mood</div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            {MOODS.map(m=>(
              <button key={m.id} onClick={()=>{setActiveMood(m.id);setSelected(null);setSearched(false);}}
                style={{background:activeMood===m.id?`${m.color}18`:"rgba(255,255,255,0.02)",border:`1px solid ${activeMood===m.id?m.color+"88":"rgba(255,255,255,0.06)"}`,borderRadius:7,padding:"5px 9px",color:activeMood===m.id?m.color:"#555",fontSize:10,fontWeight:600,cursor:"pointer",transition:"all .2s"}}>
                {m.icon} {m.label}
              </button>
            ))}
          </div>
          {mood && <div style={{marginTop:5,fontSize:10,color:"#444",fontStyle:"italic"}}>{mood.desc}</div>}
        </div>
        <button onClick={handleSearch}
          style={{width:"100%",background:`linear-gradient(135deg,${mood?.color||SL_YELLOW},${mood?.color||SL_YELLOW}cc)`,border:"none",borderRadius:9,padding:"10px",color:"#0a0a0a",fontSize:12,fontWeight:800,cursor:"pointer",marginBottom:12,transition:"all .2s"}}
          onMouseOver={e=>e.currentTarget.style.opacity=".9"}
          onMouseOut={e=>e.currentTarget.style.opacity="1"}>
          Find Routes →
        </button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"0 14px 14px"}}>
        <style>{`::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#222;border-radius:99px}`}</style>
        {searched ? routes.map((r,i)=>(
          <div key={r.id} style={{animation:"slFadeUp .4s ease forwards",animationDelay:`${i*.09}s`,opacity:0}}>
            <RouteCard route={r} selected={selected} onClick={handleRoute} activeMood={activeMood}/>
          </div>
        )) : (
          <div style={{textAlign:"center",padding:"40px 12px"}}>
            <div style={{opacity:.25,marginBottom:8}}><SLLogo size={36}/></div>
            <div style={{fontSize:11,color:"#444"}}>Choose your mood and search</div>
          </div>
        )}
      </div>
    </div>
  );

  const MapOverlays = (
    <>
      {selected && (
        <div style={{position:"absolute",top:14,right:14,zIndex:500,background:"rgba(10,10,10,0.92)",backdropFilter:"blur(20px)",border:`1px solid ${selected.color}44`,borderRadius:11,padding:"10px 14px",maxWidth:200}}>
          <div style={{fontSize:9,color:selected.color,letterSpacing:"0.1em",textTransform:"uppercase",fontWeight:800,marginBottom:6}}>{mood?.icon} {selected.name}</div>
          <div style={{display:"flex",gap:14}}>
            <div><div style={{fontSize:18,fontWeight:900,color:"#f5f5f5"}}>{selected.time}</div><div style={{fontSize:9,color:"#444"}}>travel time</div></div>
            <div><div style={{fontSize:18,fontWeight:900,color:"#f5f5f5"}}>{selected.distance}</div><div style={{fontSize:9,color:"#444"}}>distance</div></div>
          </div>
        </div>
      )}
      {searched && selected && (
        <div style={{position:"absolute",bottom:16,left:"50%",transform:"translateX(-50%)",display:"flex",gap:5,zIndex:500,maxWidth:"92%",overflowX:"auto"}}>
          {routes.map(r=>(
            <button key={r.id} onClick={()=>setSelected(r)}
              style={{flexShrink:0,background:selected.id===r.id?r.color:"rgba(10,10,10,0.88)",backdropFilter:"blur(14px)",border:`1px solid ${selected.id===r.id?r.color:"rgba(255,255,255,0.08)"}`,borderRadius:8,padding:"6px 12px",color:selected.id===r.id?"#0a0a0a":"#555",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>
              {r.time} <span style={{fontWeight:400,opacity:.6}}>{r.distance}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );

  return (
    <>
      <style>{`
        @keyframes slPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(1.05)}}
        @keyframes slFadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        *{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
      `}</style>
      <div style={{height:"100vh",background:"#0a0a0a",color:"#f5f5f5",display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {Nav}
        {isMobile ? (
          <div style={{flex:1,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",inset:0,display:mobileTab==="search"?"flex":"none",flexDirection:"column"}}>
              {Panel}
            </div>
            <div style={{position:"absolute",inset:0,display:mobileTab==="map"?"block":"none"}}>
              <MapView selectedRoute={selected} activeMood={activeMood}/>
              {isMobile && selected && (
                <button onClick={()=>setMobileTab("search")} style={{position:"absolute",top:14,left:14,zIndex:600,background:"rgba(10,10,10,0.88)",backdropFilter:"blur(12px)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"6px 12px",color:"#888",fontSize:11,cursor:"pointer"}}>← Routes</button>
              )}
              {MapOverlays}
            </div>
          </div>
        ) : (
          <div style={{flex:1,display:"flex",overflow:"hidden"}}>
            <div style={{width:isTablet?280:350,flexShrink:0,borderRight:"1px solid rgba(255,255,255,0.05)"}}>
              {Panel}
            </div>
            <div style={{flex:1,position:"relative",minWidth:0}}>
              <MapView selectedRoute={selected} activeMood={activeMood}/>
              {MapOverlays}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
