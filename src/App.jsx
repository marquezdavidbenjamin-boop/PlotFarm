import { useState, useEffect, useMemo, useCallback, useRef } from "react";

/* ─── FONTS ─────────────────────────────────────────────────────────────── */
if (!document.getElementById("fm-fonts")) {
  const l = document.createElement("link");
  l.id = "fm-fonts"; l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,700;1,9..144,300&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@300;400;500&display=swap";
  document.head.appendChild(l);
}
if (!document.getElementById("jszip-s")) {
  const s = document.createElement("script");
  s.id = "jszip-s";
  s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
  document.head.appendChild(s);
}

/* ─── PALETTE ────────────────────────────────────────────────────────────── */
const C = {
  bg:"#F7F9F7", surface:"#FFFFFF", surfaceAlt:"#F2F5F0",
  border:"#E0E8DA", borderHov:"#C4D4BC",
  green:"#2D6A4F", greenLight:"#D8EDE2", greenMid:"#52B788",
  blue:"#1A6B9A",  blueLight:"#DDF0FA",
  sage:"#5A8F76",  sageLight:"#E4F1EB",
  amber:"#B86E1A", amberLight:"#FDF0E0",
  coral:"#C84B2F", coralLight:"#FDEAE5",
  slate:"#3D4F47", slateLight:"#6B7F74",
  muted:"#9AADA4", mutedLight:"#E8EDEB",
  indigo:"#4F46E5",indigoLight:"#EEF2FF",
};

/* ─── CONSTANTS ──────────────────────────────────────────────────────────── */
const STAGES = ["tls_raw","tls_registered","tls_processed","outputs"];
const STAGE_LABELS = {tls_raw:"TLS Raw",tls_registered:"Registered",tls_processed:"Processed",outputs:"Outputs"};
const STATUS_CFG = {
  complete:        {bg:C.greenLight, text:C.green,  dot:C.greenMid, label:"Complete"},
  in_progress:     {bg:C.blueLight,  text:C.blue,   dot:C.blue,     label:"In Progress"},
  pending:         {bg:C.mutedLight, text:C.muted,  dot:C.muted,    label:"Pending"},
  failed:          {bg:C.coralLight, text:C.coral,  dot:C.coral,    label:"Failed"},
  skipped:         {bg:"#F0F2EF",    text:"#AAB5AE", dot:"#C4CDC8", label:"Skipped"},
  review_required: {bg:C.amberLight, text:C.amber,  dot:C.amber,    label:"Needs Review"},
};
const FILE_CFG = {
  csv:   {icon:"⬡",color:C.green, bg:C.greenLight,label:"CSV Data"},
  photo: {icon:"◈",color:C.blue,  bg:C.blueLight, label:"Photographs"},
  tls:   {icon:"◎",color:C.sage,  bg:C.sageLight, label:"TLS Scans"},
  output:{icon:"◆",color:C.amber, bg:C.amberLight,label:"Outputs"},
};
const EQUIPMENT_LIST = [
  "FARO-Focus3D-SN12345","FARO-Focus3D-SN12346",
  "Leica-BLK360-SN789","Riegl-VZ-400i-SN001","Trimble-TX8-SN456",
];
const DEMO_PROJECT = {
  id:"proj_demo",
  name:"2026 Spring Survey",
  campaign:"2026_SpringSurvey",
  createdAt: new Date().toISOString(),
  plots:[
    {id:"PLT-001",campaign:"2026_SpringSurvey",date:"2026-03-01",lat:-33.8651,lon:151.2099,gpsAcc:0.04,equipment:"FARO-Focus3D-SN12345",operator:"J. Smith", status:{tls_raw:"complete",tls_registered:"complete",tls_processed:"in_progress",outputs:"pending"},  files:{csv:3,photos:47,tls:4},notes:"Steep slope NW corner. Scan 3 partially obstructed.",flags:["review_required"],sizeMb:4821},
    {id:"PLT-002",campaign:"2026_SpringSurvey",date:"2026-03-01",lat:-33.8702,lon:151.2155,gpsAcc:0.03,equipment:"FARO-Focus3D-SN12345",operator:"J. Smith", status:{tls_raw:"complete",tls_registered:"complete",tls_processed:"complete",outputs:"complete"}, files:{csv:4,photos:52,tls:4},notes:"Clean capture. Excellent reflectivity.",flags:[],sizeMb:5102},
    {id:"PLT-003",campaign:"2026_SpringSurvey",date:"2026-03-02",lat:-33.8589,lon:151.2031,gpsAcc:0.06,equipment:"FARO-Focus3D-SN12345",operator:"R. Chen",  status:{tls_raw:"complete",tls_registered:"in_progress",tls_processed:"pending",outputs:"pending"},  files:{csv:2,photos:38,tls:3},notes:"Wind interference during scan 2.",flags:["partial_scan"],sizeMb:3914},
    {id:"PLT-004",campaign:"2026_SpringSurvey",date:"2026-03-02",lat:-33.8634,lon:151.2088,gpsAcc:0.05,equipment:"FARO-Focus3D-SN12346",operator:"R. Chen",  status:{tls_raw:"failed",tls_registered:"skipped",tls_processed:"skipped",outputs:"skipped"},  files:{csv:1,photos:12,tls:0},notes:"Scanner fault mid-scan. Rescheduled.",flags:["failed","review_required"],sizeMb:412},
    {id:"PLT-005",campaign:"2026_SpringSurvey",date:"2026-03-03",lat:-33.8711,lon:151.2201,gpsAcc:0.04,equipment:"FARO-Focus3D-SN12346",operator:"J. Smith", status:{tls_raw:"complete",tls_registered:"pending",tls_processed:"pending",outputs:"pending"},  files:{csv:3,photos:61,tls:5},notes:"",flags:[],sizeMb:6230},
    {id:"PLT-006",campaign:"2026_SpringSurvey",date:"2026-03-03",lat:-33.8799,lon:151.2312,gpsAcc:0.07,equipment:"FARO-Focus3D-SN12346",operator:"A. Patel", status:{tls_raw:"pending",tls_registered:"pending",tls_processed:"pending",outputs:"pending"},  files:{csv:0,photos:0,tls:0},notes:"Awaiting field visit.",flags:[],sizeMb:0},
  ],
};

/* ─── HELPERS ────────────────────────────────────────────────────────────── */
function plotProgress(p) {
  const v={complete:3,in_progress:2,pending:1,skipped:0,failed:0};
  return Math.round((STAGES.reduce((a,s)=>a+(v[p.status[s]]||0),0)/(STAGES.length*3))*100);
}
function plotDotColor(p) {
  if(STAGES.some(s=>p.status[s]==="failed")) return C.coral;
  const pr=plotProgress(p);
  if(pr===100) return C.greenMid;
  if(pr>0) return C.blue;
  return C.muted;
}
function fmtBytes(b){
  if(b>=1e9) return (b/1e9).toFixed(1)+" GB";
  if(b>=1e6) return (b/1e6).toFixed(1)+" MB";
  if(b>=1e3) return (b/1e3).toFixed(0)+" KB";
  return b+" B";
}
function uid(){return "proj_"+Date.now()+"_"+Math.random().toString(36).slice(2,7);}
function plotId(existing){
  const nums=existing.map(p=>{const m=p.id.match(/PLT-(\d+)/);return m?parseInt(m[1]):0;});
  const next=(Math.max(0,...nums)+1);
  return "PLT-"+String(next).padStart(3,"0");
}

/* ─── STORAGE LAYER (localStorage — persists across sessions) ────────────── */
const STORAGE_INDEX_KEY = "fm:project-index";
const projKey = (id) => `fm:project:${id}`;

async function loadIndex() {
  try { const v = localStorage.getItem(STORAGE_INDEX_KEY); return v ? JSON.parse(v) : []; }
  catch { return []; }
}
async function saveIndex(index) {
  try { localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(index)); } catch {}
}
async function loadProject(id) {
  try { const v = localStorage.getItem(projKey(id)); return v ? JSON.parse(v) : null; }
  catch { return null; }
}
async function saveProject(proj) {
  try { localStorage.setItem(projKey(proj.id), JSON.stringify(proj)); } catch {}
}
async function deleteProject(id) {
  try { localStorage.removeItem(projKey(id)); } catch {}
}

/* ─── SMALL UI COMPONENTS ────────────────────────────────────────────────── */
const inp = {background:C.bg,border:`1.5px solid ${C.border}`,borderRadius:8,padding:"8px 12px",color:C.slate,fontSize:12,fontFamily:"'DM Sans',sans-serif",outline:"none",width:"100%",boxSizing:"border-box",transition:"border-color 0.18s"};

function StatusPill({status,small}){
  const c=STATUS_CFG[status]||STATUS_CFG.pending;
  return(
    <span style={{display:"inline-flex",alignItems:"center",gap:5,background:c.bg,color:c.text,border:`1.5px solid ${c.dot}44`,borderRadius:20,padding:small?"2px 8px":"4px 10px",fontSize:small?10:11,fontWeight:600,letterSpacing:"0.03em",fontFamily:"'DM Mono',monospace"}}>
      <span style={{width:6,height:6,borderRadius:"50%",background:c.dot,flexShrink:0}}/>
      {c.label}
    </span>
  );
}
function Card({children,style={}}){return<div style={{background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:14,padding:20,...style}}>{children}</div>;}
function Label({children,style={}}){return<div style={{fontSize:10,fontWeight:700,letterSpacing:"0.12em",color:C.muted,marginBottom:8,fontFamily:"'DM Mono',monospace",textTransform:"uppercase",...style}}>{children}</div>;}
function Btn({children,onClick,variant="primary",disabled,style={}}){
  const base={borderRadius:8,padding:"8px 18px",fontSize:12,fontWeight:600,fontFamily:"'DM Sans',sans-serif",cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.45:1,letterSpacing:"0.02em",transition:"all 0.18s",display:"inline-flex",alignItems:"center",gap:6,border:"none"};
  const vars={
    primary:{background:C.green,color:"#fff"},
    secondary:{background:C.surface,color:C.slate,border:`1.5px solid ${C.border}`},
    ghost:{background:"transparent",color:C.blue,border:`1.5px solid ${C.blueLight}`},
    danger:{background:C.coralLight,color:C.coral,border:`1.5px solid ${C.coral}44`},
    export:{background:C.indigoLight,color:C.indigo,border:"1.5px solid #C7D2FE"},
    exportAll:{background:C.indigo,color:"#fff"},
  }[variant]||{};
  return<button onClick={onClick} disabled={disabled} style={{...base,...vars,...style}}>{children}</button>;
}

/* ─── SVG MAP ────────────────────────────────────────────────────────────── */
function PlotMap({plots,selectedId,onSelect}){
  if(!plots||plots.length===0) return(
    <div style={{height:260,display:"flex",alignItems:"center",justifyContent:"center",background:C.bg,borderRadius:14,border:`1.5px solid ${C.border}`,color:C.muted,fontSize:13}}>
      No plots registered yet
    </div>
  );
  const lats=plots.map(p=>p.lat), lons=plots.map(p=>p.lon);
  const padPct=0.15;
  const latRange=Math.max(0.005,Math.max(...lats)-Math.min(...lats));
  const lonRange=Math.max(0.005,Math.max(...lons)-Math.min(...lons));
  const minLat=Math.min(...lats)-latRange*padPct;
  const maxLat=Math.max(...lats)+latRange*padPct;
  const minLon=Math.min(...lons)-lonRange*padPct;
  const maxLon=Math.max(...lons)+lonRange*padPct;
  const W=540,H=280,PAD=32;
  function project(lat,lon){
    return{
      x:PAD+((lon-minLon)/(maxLon-minLon))*(W-PAD*2),
      y:PAD+((maxLat-lat)/(maxLat-minLat))*(H-PAD*2),
    };
  }
  const gridLats=Array.from({length:4},(_,i)=>minLat+(i/3)*(maxLat-minLat));
  const gridLons=Array.from({length:5},(_,i)=>minLon+(i/4)*(maxLon-minLon));
  return(
    <div style={{position:"relative",background:"linear-gradient(160deg,#EAF3EE 0%,#E3EFF5 100%)",borderRadius:14,border:`1.5px solid ${C.border}`,overflow:"hidden",boxShadow:`0 4px 20px rgba(45,106,79,0.07)`}}>
      <div style={{position:"absolute",inset:0,backgroundImage:`radial-gradient(circle,${C.border} 0.8px,transparent 0.8px)`,backgroundSize:"18px 18px",opacity:0.45,pointerEvents:"none"}}/>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{display:"block"}}>
        {gridLats.map((lat,i)=>{const{y}=project(lat,minLon);return<line key={i} x1={PAD} y1={y} x2={W-PAD} y2={y} stroke={C.border} strokeWidth={0.7} strokeDasharray="3,5"/>;})}
        {gridLons.map((lon,i)=>{const{x}=project(minLat,lon);return<line key={i} x1={x} y1={PAD} x2={x} y2={H-PAD} stroke={C.border} strokeWidth={0.7} strokeDasharray="3,5"/>;})}
        {gridLats.map((lat,i)=>{const{y}=project(lat,minLon);return<text key={i} x={PAD-3} y={y+3} textAnchor="end" fontSize={7} fill={C.muted} fontFamily="monospace">{lat.toFixed(3)}°</text>;})}
        {gridLons.map((lon,i)=>{const{x}=project(minLat,lon);return<text key={i} x={x} y={H-PAD+13} textAnchor="middle" fontSize={7} fill={C.muted} fontFamily="monospace">{lon.toFixed(3)}°</text>;})}
        {plots.map((p,i)=>{
          if(i===plots.length-1) return null;
          const a=project(p.lat,p.lon),b=project(plots[i+1].lat,plots[i+1].lon);
          return<line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={C.border} strokeWidth={1.2} strokeDasharray="4,5" opacity={0.6}/>;
        })}
        {plots.map(p=>{
          const{x,y}=project(p.lat,p.lon);
          const color=plotDotColor(p);
          const sel=p.id===selectedId;
          const prog=plotProgress(p);
          return(
            <g key={p.id} onClick={()=>onSelect(p.id)} style={{cursor:"pointer"}}>
              {sel&&<circle cx={x} cy={y} r={20} fill="none" stroke={color} strokeWidth={1.5} opacity={0.2}/>}
              <circle cx={x} cy={y} r={sel?15:12} fill="white" stroke={color} strokeWidth={sel?2.5:1.5} style={{transition:"all 0.2s",filter:sel?`drop-shadow(0 3px 8px ${color}55)`:"none"}}/>
              {prog>0&&prog<100&&(()=>{
                const r2=sel?15:12,circ=2*Math.PI*r2;
                return<circle cx={x} cy={y} r={r2} fill="none" stroke={color} strokeWidth={sel?2.5:1.5} strokeDasharray={circ} strokeDashoffset={circ*(1-prog/100)} transform={`rotate(-90 ${x} ${y})`} opacity={0.6}/>;
              })()}
              <circle cx={x} cy={y} r={sel?6:4.5} fill={color}/>
              <text x={x} y={y-(sel?22:18)} textAnchor="middle" fontSize={sel?10:9} fontWeight={sel?700:600} fill={sel?color:C.slateLight} fontFamily="'DM Mono',monospace" style={{transition:"all 0.2s"}}>{p.id}</text>
            </g>
          );
        })}
        <g transform={`translate(${PAD+10},${PAD+10})`}>
          <circle cx={0} cy={0} r={11} fill="white" stroke={C.border} strokeWidth={1} opacity={0.9}/>
          <polygon points="0,-8 2.5,2 0,0 -2.5,2" fill={C.coral}/>
          <polygon points="0,8 2.5,-2 0,0 -2.5,-2" fill={C.muted}/>
          <text x={0} y={-9} textAnchor="middle" fontSize={6.5} fill={C.coral} fontWeight={700} fontFamily="monospace">N</text>
        </g>
      </svg>
      <div style={{position:"absolute",bottom:10,left:12,display:"flex",gap:10,background:"rgba(255,255,255,0.88)",backdropFilter:"blur(6px)",borderRadius:7,padding:"4px 9px",border:`1px solid ${C.border}`,fontSize:9,fontFamily:"'DM Mono',monospace"}}>
        {[["Complete",C.greenMid],["In Progress",C.blue],["Failed",C.coral],["Pending",C.muted]].map(([l,c])=>(
          <div key={l} style={{display:"flex",alignItems:"center",gap:4,color:C.slate}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:c}}/>
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── PROJECT MANAGER ────────────────────────────────────────────────────── */
function ProjectManager({projects,activeId,onSwitch,onCreate,onDelete,onRename,saving}){
  const [creating,setCreating]=useState(false);
  const [newName,setNewName]=useState("");
  const [newCampaign,setNewCampaign]=useState("");
  const [renaming,setRenaming]=useState(null);
  const [renameVal,setRenameVal]=useState("");
  function doCreate(){
    if(!newName.trim()) return;
    onCreate(newName.trim(),newCampaign.trim()||newName.trim().replace(/\s+/g,"_"));
    setNewName(""); setNewCampaign(""); setCreating(false);
  }
  function doRename(proj){
    if(!renameVal.trim()) return;
    onRename(proj.id,renameVal.trim());
    setRenaming(null); setRenameVal("");
  }
  return(
    <div style={{width:240,background:"#1C2820",display:"flex",flexDirection:"column",borderRight:`1.5px solid #2E3D35`,flexShrink:0}}>
      <div style={{padding:"20px 18px 14px",borderBottom:"1px solid #2E3D35"}}>
        <div style={{fontSize:9,color:"#52A882",letterSpacing:"0.18em",fontFamily:"'DM Mono',monospace",marginBottom:3}}>FIELD MONITOR</div>
        <div style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:600,color:"#E8F0EC",lineHeight:1.2}}>Plot<br/>Management</div>
        <div style={{display:"flex",alignItems:"center",gap:6,marginTop:8}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:saving?"#52B788":"#9AADA4",transition:"background 0.4s"}}/>
          <span style={{fontSize:10,color:saving?"#52A882":"#5A7065",fontFamily:"'DM Mono',monospace"}}>{saving?"Saving…":"All saved"}</span>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"10px 10px"}}>
        <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.14em",color:"#52A882",fontFamily:"'DM Mono',monospace",padding:"0 8px",marginBottom:6}}>PROJECTS</div>
        {projects.map(proj=>{
          const active=proj.id===activeId;
          return(
            <div key={proj.id} style={{borderRadius:9,marginBottom:2,border:`1.5px solid ${active?"#52B78844":"transparent"}`,background:active?"#2A3D33":"transparent",transition:"all 0.15s",overflow:"hidden"}}>
              {renaming===proj.id?(
                <div style={{padding:"8px 10px"}}>
                  <input value={renameVal} onChange={e=>setRenameVal(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter")doRename(proj);if(e.key==="Escape"){setRenaming(null);}}}
                    autoFocus style={{...inp,background:"#1C2820",border:"1.5px solid #52B788",color:"#E8F0EC",marginBottom:6,fontSize:11}}/>
                  <div style={{display:"flex",gap:5}}>
                    <button onClick={()=>doRename(proj)} style={{flex:1,background:"#52B788",color:"#fff",border:"none",borderRadius:6,padding:"4px 8px",fontSize:10,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Save</button>
                    <button onClick={()=>setRenaming(null)} style={{flex:1,background:"#2E3D35",color:"#9AADA4",border:"none",borderRadius:6,padding:"4px 8px",fontSize:10,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Cancel</button>
                  </div>
                </div>
              ):(
                <div onClick={()=>onSwitch(proj.id)} style={{padding:"10px 10px",cursor:"pointer",userSelect:"none"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <span style={{fontSize:12,fontWeight:active?600:400,color:active?"#7EC8A4":"#8DA89A",lineHeight:1.3,flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{proj.name}</span>
                    <div style={{display:"flex",gap:3,flexShrink:0,marginLeft:6}}>
                      <button onClick={e=>{e.stopPropagation();setRenaming(proj.id);setRenameVal(proj.name);}} style={{background:"none",border:"none",color:"#5A7065",cursor:"pointer",fontSize:11,padding:"2px 3px",borderRadius:4,lineHeight:1}}>✎</button>
                      <button onClick={e=>{e.stopPropagation();if(confirm(`Delete "${proj.name}"? This cannot be undone.`))onDelete(proj.id);}} style={{background:"none",border:"none",color:"#5A7065",cursor:"pointer",fontSize:11,padding:"2px 3px",borderRadius:4,lineHeight:1}}>✕</button>
                    </div>
                  </div>
                  <div style={{fontSize:9,color:"#52A882",fontFamily:"'DM Mono',monospace",marginTop:2}}>{proj.campaign||proj.name}</div>
                  <div style={{fontSize:9,color:"#3A5A47",marginTop:1}}>{proj.plotCount||0} plots</div>
                </div>
              )}
            </div>
          );
        })}
        {creating?(
          <div style={{background:"#2A3D33",borderRadius:9,border:"1.5px solid #52B78844",padding:"10px 10px",marginTop:4}}>
            <div style={{fontSize:9,color:"#52A882",fontFamily:"'DM Mono',monospace",marginBottom:6,letterSpacing:"0.1em"}}>NEW PROJECT</div>
            <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Project name…"
              onKeyDown={e=>{if(e.key==="Enter")doCreate();if(e.key==="Escape")setCreating(false);}}
              autoFocus style={{...inp,background:"#1C2820",border:"1.5px solid #3A5A47",color:"#E8F0EC",marginBottom:6,fontSize:11}}/>
            <input value={newCampaign} onChange={e=>setNewCampaign(e.target.value)} placeholder="Campaign tag (optional)…"
              onKeyDown={e=>{if(e.key==="Enter")doCreate();}}
              style={{...inp,background:"#1C2820",border:"1.5px solid #3A5A47",color:"#E8F0EC",marginBottom:8,fontSize:11}}/>
            <div style={{display:"flex",gap:5}}>
              <button onClick={doCreate} style={{flex:1,background:"#52B788",color:"#fff",border:"none",borderRadius:6,padding:"5px 8px",fontSize:10,cursor:"pointer",fontWeight:600,fontFamily:"'DM Sans',sans-serif"}}>Create</button>
              <button onClick={()=>{setCreating(false);setNewName("");setNewCampaign("");}} style={{flex:1,background:"#2E3D35",color:"#9AADA4",border:"none",borderRadius:6,padding:"5px 8px",fontSize:10,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Cancel</button>
            </div>
          </div>
        ):(
          <button onClick={()=>setCreating(true)}
            style={{width:"100%",background:"none",border:"1.5px dashed #2E3D35",borderRadius:9,padding:"8px 10px",color:"#52A882",fontSize:11,cursor:"pointer",textAlign:"left",fontFamily:"'DM Sans',sans-serif",marginTop:4,transition:"all 0.15s"}}
            onMouseEnter={e=>e.currentTarget.style.borderColor="#52B788"}
            onMouseLeave={e=>e.currentTarget.style.borderColor="#2E3D35"}>
            + New Project
          </button>
        )}
      </div>
      <div style={{padding:"10px 18px",borderTop:"1px solid #2E3D35",fontSize:9,color:"#3A5A47",fontFamily:"'DM Mono',monospace",lineHeight:1.7}}>
        DATA PERSISTS<br/>ACROSS SESSIONS<br/>VIA LOCALSTORAGE
      </div>
    </div>
  );
}

/* ─── MAIN MONITORING APP ────────────────────────────────────────────────── */
function MonitoringApp({project,onChange,showToast}){
  const {plots=[]}=project;
  const [selected,setSelected]=useState(plots[0]?.id||null);
  const [view,setView]=useState("overview");
  const [search,setSearch]=useState("");
  const [filterStatus,setFilter]=useState("all");
  const [editMeta,setEditMeta]=useState(null);
  const [csvDone,setCsvDone]=useState(false);
  const [showMap,setShowMap]=useState(false);
  const [newPlot,setNewPlot]=useState({id:"",campaign:project.campaign,date:new Date().toISOString().slice(0,10),lat:"",lon:"",gpsAcc:"",equipment:"",operator:"",notes:""});

  useEffect(()=>{
    setSelected(plots[0]?.id||null);
    setView("overview");
    setNewPlot(p=>({...p,campaign:project.campaign}));
  },[project.id]);

  const plot=plots.find(p=>p.id===selected);
  const filtered=useMemo(()=>plots.filter(p=>{
    const q=search.toLowerCase();
    return(p.id.toLowerCase().includes(q)||p.operator.toLowerCase().includes(q)||p.campaign.toLowerCase().includes(q))
      &&(filterStatus==="all"||Object.values(p.status).includes(filterStatus)||p.flags.includes(filterStatus));
  }),[plots,search,filterStatus]);

  const stats={
    total:plots.length,
    complete:plots.filter(p=>STAGES.every(s=>p.status[s]==="complete"||p.status[s]==="skipped")).length,
    inProgress:plots.filter(p=>STAGES.some(s=>p.status[s]==="in_progress")).length,
    failed:plots.filter(p=>STAGES.some(s=>p.status[s]==="failed")).length,
  };

  function updatePlots(newPlots){onChange({...project,plots:newPlots,plotCount:newPlots.length});}
  const saveMeta=()=>{updatePlots(plots.map(p=>p.id===editMeta.id?editMeta:p));setEditMeta(null);showToast("Metadata saved");};
  const updateStatus=(plotId,stage,val)=>{updatePlots(plots.map(p=>p.id===plotId?{...p,status:{...p.status,[stage]:val}}:p));showToast(`${STAGE_LABELS[stage]} → ${STATUS_CFG[val]?.label}`);};

  const addPlot=()=>{
    if(!newPlot.id||!newPlot.lat||!newPlot.lon){showToast("Plot ID, Lat & Lon required",false);return;}
    const p={...newPlot,lat:parseFloat(newPlot.lat),lon:parseFloat(newPlot.lon),gpsAcc:parseFloat(newPlot.gpsAcc)||0,
      status:{tls_raw:"pending",tls_registered:"pending",tls_processed:"pending",outputs:"pending"},
      files:{csv:0,photos:0,tls:0},flags:[],sizeMb:0};
    updatePlots([...plots,p]);setSelected(p.id);setView("overview");showToast(`${p.id} registered`);
    setNewPlot({id:plotId([...plots,p]),campaign:project.campaign,date:new Date().toISOString().slice(0,10),lat:"",lon:"",gpsAcc:"",equipment:"",operator:"",notes:""});
  };
  const removePlot=(id)=>{
    if(!confirm(`Delete ${id}? This cannot be undone.`)) return;
    const next=plots.filter(p=>p.id!==id);
    updatePlots(next);setSelected(next[0]?.id||null);setView("overview");showToast(`${id} removed`);
  };
  const exportCSV=()=>{
    const hdr=["plot_id","campaign","date","gps_lat","gps_lon","gps_acc_m","equipment","operator","tls_raw","tls_registered","tls_processed","outputs","n_csv","n_photos","n_tls","size_mb","flags","notes"];
    const rows=plots.map(p=>[p.id,p.campaign,p.date,p.lat,p.lon,p.gpsAcc,p.equipment,p.operator,p.status.tls_raw,p.status.tls_registered,p.status.tls_processed,p.status.outputs,p.files.csv,p.files.photos,p.files.tls,p.sizeMb,p.flags.join("|"),`"${p.notes}"`].join(","));
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([[hdr.join(","),...rows].join("\n")],{type:"text/csv"}));a.download=`${project.campaign}_master_index.csv`;a.click();
    setCsvDone(true);setTimeout(()=>setCsvDone(false),2500);showToast("master_index.csv exported");
  };
  useEffect(()=>{
    if(view==="new"&&!newPlot.id) setNewPlot(p=>({...p,id:plotId(plots)}));
  },[view]);

  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:C.bg}}>
      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        <div style={{width:260,background:C.surface,borderRight:`1.5px solid ${C.border}`,display:"flex",flexDirection:"column",flexShrink:0}}>
          <div style={{padding:"16px 18px 10px",borderBottom:`1px solid ${C.border}`}}>
            <div style={{fontSize:9,color:C.muted,letterSpacing:"0.12em",fontFamily:"'DM Mono',monospace",marginBottom:2}}>{project.campaign}</div>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:17,fontWeight:600,color:C.slate,lineHeight:1.2}}>{project.name}</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",borderBottom:`1px solid ${C.border}`}}>
            {[["Total",stats.total,C.blue],["Done",stats.complete,C.green],["Active",stats.inProgress,C.amber],["Issues",stats.failed,C.coral]].map(([l,v,color],i)=>(
              <div key={l} style={{padding:"10px 14px",borderRight:i%2===0?`1px solid ${C.border}`:"none",borderBottom:i<2?`1px solid ${C.border}`:"none"}}>
                <div style={{fontSize:9,color:C.muted,letterSpacing:"0.1em",fontFamily:"'DM Mono',monospace",marginBottom:2}}>{l.toUpperCase()}</div>
                <div style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:600,color}}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{padding:"10px 12px 6px"}}>
            <div style={{position:"relative",marginBottom:7}}>
              <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:C.muted,fontSize:13}}>⌕</span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search plots…" style={{...inp,paddingLeft:26,fontSize:12}}/>
            </div>
            <select value={filterStatus} onChange={e=>setFilter(e.target.value)} style={{...inp,fontSize:11,color:C.slateLight}}>
              <option value="all">All statuses</option>
              {Object.entries(STATUS_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"4px 8px"}}>
            {filtered.length===0&&<div style={{textAlign:"center",padding:30,color:C.muted,fontSize:12}}>No plots match</div>}
            {filtered.map((p,i)=>{
              const active=p.id===selected;
              const prog=plotProgress(p);
              const dotColor=plotDotColor(p);
              return(
                <div key={p.id} onClick={()=>{setSelected(p.id);setView("overview");}}
                  style={{padding:"10px 12px",borderRadius:10,marginBottom:2,cursor:"pointer",background:active?C.greenLight:"transparent",border:`1.5px solid ${active?C.green+"44":"transparent"}`,transition:"all 0.15s",animation:`fadeUp 0.3s ease ${i*0.03}s both`}}
                  onMouseEnter={e=>{if(!active)e.currentTarget.style.background=C.surfaceAlt;}}
                  onMouseLeave={e=>{if(!active)e.currentTarget.style.background="transparent";}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                    <div style={{display:"flex",alignItems:"center",gap:7}}>
                      <div style={{width:7,height:7,borderRadius:"50%",background:dotColor,flexShrink:0}}/>
                      <span style={{fontFamily:"'Fraunces',serif",fontSize:13,fontWeight:600,color:active?C.green:C.slate}}>{p.id}</span>
                    </div>
                    {p.flags.length>0&&<span style={{fontSize:9,color:C.amber,background:C.amberLight,border:`1px solid ${C.amber}44`,borderRadius:4,padding:"1px 5px",fontWeight:700}}>FLAG</span>}
                  </div>
                  <div style={{paddingLeft:14}}>
                    <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:2}}>
                      <div style={{flex:1,height:3,background:C.border,borderRadius:2,overflow:"hidden"}}>
                        <div style={{width:`${prog}%`,height:"100%",background:dotColor,borderRadius:2,transition:"width 0.5s"}}/>
                      </div>
                      <span style={{fontSize:9,color:C.muted,fontFamily:"'DM Mono',monospace"}}>{prog}%</span>
                    </div>
                    <div style={{fontSize:10,color:C.muted}}>{p.operator} · {p.date}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{padding:"10px 12px 12px",borderTop:`1px solid ${C.border}`,display:"flex",flexDirection:"column",gap:6}}>
            <Btn onClick={()=>{setView("new");}} style={{width:"100%",justifyContent:"center"}}>+ Register New Plot</Btn>
            <div style={{display:"flex",gap:6}}>
              <Btn variant="secondary" onClick={()=>setShowMap(m=>!m)} style={{flex:1,justifyContent:"center",fontSize:11,padding:"7px 10px"}}>{showMap?"◎ Hide Map":"◎ Map"}</Btn>
              <Btn variant="export" onClick={exportCSV} style={{flex:1,justifyContent:"center",fontSize:11,padding:"7px 10px"}}>{csvDone?"✓ CSV":"⬡ CSV"}</Btn>
            </div>
          </div>
        </div>

        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{background:C.surface,borderBottom:`1.5px solid ${C.border}`,padding:"0 24px",display:"flex",alignItems:"center",boxShadow:"0 1px 6px rgba(45,106,79,0.05)",flexShrink:0}}>
            {view!=="new"&&[["overview","Overview"],["pipeline","Pipeline"],["metadata","Metadata"],["map","Map View"]].map(([v,label])=>(
              <button key={v} onClick={()=>setView(v)} style={{background:"none",border:"none",borderBottom:view===v?`2.5px solid ${C.green}`:"2.5px solid transparent",color:view===v?C.green:C.muted,padding:"14px 16px 12px",fontSize:12,fontFamily:"'DM Sans',sans-serif",fontWeight:view===v?600:400,cursor:"pointer",transition:"all 0.15s"}}>{label}</button>
            ))}
            {view==="new"&&<div style={{padding:"14px 16px 12px",borderBottom:`2.5px solid ${C.green}`,color:C.green,fontSize:12,fontWeight:600}}>New Plot</div>}
            <div style={{flex:1}}/>
            {plot&&view!=="new"&&(
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:10,color:C.muted,fontFamily:"'DM Mono',monospace"}}>
                  {typeof plot.lat==="number"?plot.lat.toFixed(4):plot.lat}° · {typeof plot.lon==="number"?plot.lon.toFixed(4):plot.lon}°
                </span>
                <Btn variant="danger" onClick={()=>removePlot(plot.id)} style={{padding:"5px 12px",fontSize:10}}>✕ Delete</Btn>
              </div>
            )}
          </div>

          <div style={{flex:1,overflowY:"auto",padding:24}}>

            {view==="new"&&(
              <div style={{maxWidth:520,animation:"fadeUp 0.3s ease"}}>
                <h1 style={{fontFamily:"'Fraunces',serif",fontSize:26,fontWeight:600,color:C.slate,margin:"0 0 4px"}}>Register New Plot</h1>
                <p style={{fontSize:12,color:C.muted,margin:"0 0 20px"}}>Fields marked * are required.</p>
                <Card>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                    {[["Plot ID *","id","PLT-007","text","1/-1"],["Date *","date","","date","1/-1"],["GPS Latitude *","lat","-33.8651","text",""],["GPS Longitude *","lon","151.2099","text",""],["GPS Accuracy (m)","gpsAcc","0.05","text",""],["Operator","operator","J. Smith","text",""]].map(([l,k,ph,type,span])=>(
                      <div key={k} style={span?{gridColumn:span}:{}}>
                        <Label style={{marginBottom:4}}>{l}</Label>
                        <input type={type} value={newPlot[k]} onChange={e=>setNewPlot(p=>({...p,[k]:e.target.value}))} placeholder={ph} style={inp}/>
                      </div>
                    ))}
                    <div style={{gridColumn:"1/-1"}}>
                      <Label style={{marginBottom:4}}>Equipment</Label>
                      <select value={newPlot.equipment} onChange={e=>setNewPlot(p=>({...p,equipment:e.target.value}))} style={inp}>
                        <option value="">Select…</option>
                        {EQUIPMENT_LIST.map(e=><option key={e} value={e}>{e}</option>)}
                      </select>
                    </div>
                    <div style={{gridColumn:"1/-1"}}>
                      <Label style={{marginBottom:4}}>Field Notes</Label>
                      <textarea value={newPlot.notes} onChange={e=>setNewPlot(p=>({...p,notes:e.target.value}))} rows={3} style={{...inp,resize:"vertical"}} placeholder="Observations, anomalies, equipment notes…"/>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:10,marginTop:18}}>
                    <Btn onClick={addPlot}>Register Plot</Btn>
                    <Btn variant="secondary" onClick={()=>setView("overview")}>Cancel</Btn>
                  </div>
                </Card>
              </div>
            )}

            {view==="overview"&&plot&&(
              <div style={{animation:"fadeUp 0.3s ease"}}>
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20}}>
                  <div>
                    <div style={{fontSize:10,color:C.muted,letterSpacing:"0.1em",fontFamily:"'DM Mono',monospace",marginBottom:2}}>{plot.campaign}</div>
                    <h1 style={{fontFamily:"'Fraunces',serif",fontSize:28,fontWeight:600,color:C.slate,margin:"0 0 4px"}}>{plot.id}</h1>
                    <div style={{fontSize:12,color:C.slateLight}}>{plot.operator} · {plot.date} {plot.equipment&&`· ${plot.equipment.split("-").slice(0,2).join("-")}`}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontFamily:"'Fraunces',serif",fontSize:36,fontWeight:700,color:plotDotColor(plot)}}>{plotProgress(plot)}%</div>
                    <div style={{fontSize:10,color:C.muted,fontFamily:"'DM Mono',monospace"}}>PIPELINE PROGRESS</div>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
                  {[["Photos",plot.files.photos,C.blue,(plot.files.photos/80)*100],["TLS Scans",plot.files.tls,C.sage,(plot.files.tls/6)*100],["CSV Files",plot.files.csv,C.green,(plot.files.csv/6)*100],["Data",fmtBytes(plot.sizeMb*1024*1024),C.amber,50]].map(([label,val,color,pct])=>{
                    const r=14,circ=2*Math.PI*r;
                    return(
                      <Card key={label} style={{display:"flex",alignItems:"center",gap:10,padding:13}}>
                        <svg width={36} height={36} style={{transform:"rotate(-90deg)",flexShrink:0}}>
                          <circle cx={18} cy={18} r={r} fill="none" stroke={C.border} strokeWidth={2.5}/>
                          <circle cx={18} cy={18} r={r} fill="none" stroke={color} strokeWidth={2.5} strokeDasharray={circ} strokeDashoffset={circ*(1-pct/100)} strokeLinecap="round"/>
                        </svg>
                        <div>
                          <div style={{fontFamily:"'Fraunces',serif",fontSize:16,fontWeight:600,color,lineHeight:1}}>{val}</div>
                          <div style={{fontSize:10,color:C.muted,marginTop:2}}>{label}</div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
                <Card style={{marginBottom:12}}>
                  <Label>Processing Pipeline</Label>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                    {STAGES.map((stage,i)=>{
                      const s=plot.status[stage];
                      const m=STATUS_CFG[s]||STATUS_CFG.pending;
                      return(
                        <div key={stage} style={{background:m.bg,border:`1.5px solid ${m.dot}33`,borderRadius:10,padding:"11px 12px 9px"}}>
                          <div style={{fontSize:9,color:C.muted,letterSpacing:"0.08em",fontFamily:"'DM Mono',monospace",marginBottom:3}}>STAGE {i+1}</div>
                          <div style={{fontSize:12,fontWeight:600,color:C.slate,marginBottom:7}}>{STAGE_LABELS[stage]}</div>
                          <StatusPill status={s} small/>
                        </div>
                      );
                    })}
                  </div>
                </Card>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                  <Card>
                    <Label>Location</Label>
                    <div style={{height:56,background:"linear-gradient(135deg,#E8F4EE 0%,#E4EDF5 100%)",borderRadius:8,marginBottom:10,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden",border:`1px solid ${C.border}`}}>
                      <div style={{position:"absolute",inset:0,backgroundImage:`radial-gradient(circle,${C.border} 1px,transparent 1px)`,backgroundSize:"12px 12px"}}/>
                      <div style={{width:10,height:10,borderRadius:"50%",background:C.green,boxShadow:`0 0 0 4px ${C.greenMid}33`,zIndex:1}}/>
                    </div>
                    {[["Latitude",`${plot.lat}°`],["Longitude",`${plot.lon}°`],["GPS Acc",`± ${plot.gpsAcc} m`]].map(([k,v])=>(
                      <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${C.border}`}}>
                        <span style={{fontSize:11,color:C.muted}}>{k}</span>
                        <span style={{fontSize:11,color:C.slate,fontFamily:"'DM Mono',monospace",fontWeight:500}}>{v}</span>
                      </div>
                    ))}
                  </Card>
                  <Card>
                    <Label>File Summary</Label>
                    {[["CSV Data",plot.files.csv,C.green],["Photographs",plot.files.photos,C.blue],["TLS Scans",plot.files.tls,C.sage]].map(([l,v,c])=>{
                      const m=Math.max(1,plot.files.csv,plot.files.photos,plot.files.tls);
                      return(
                        <div key={l} style={{marginBottom:10}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                            <span style={{fontSize:11,color:C.slateLight,display:"flex",alignItems:"center",gap:5}}><span style={{width:7,height:7,borderRadius:"50%",background:c,display:"inline-block"}}/>{l}</span>
                            <span style={{fontSize:11,fontFamily:"'DM Mono',monospace",color:C.muted}}>{v}</span>
                          </div>
                          <div style={{height:4,background:C.border,borderRadius:2,overflow:"hidden"}}>
                            <div style={{width:`${(v/m)*100}%`,height:"100%",background:c,borderRadius:2,transition:"width 0.5s"}}/>
                          </div>
                        </div>
                      );
                    })}
                    <div style={{marginTop:10,paddingTop:8,borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between"}}>
                      <span style={{fontSize:10,color:C.muted}}>Total size</span>
                      <span style={{fontSize:11,fontFamily:"'DM Mono',monospace",color:C.slate,fontWeight:600}}>{plot.sizeMb>0?fmtBytes(plot.sizeMb*1024*1024):"—"}</span>
                    </div>
                  </Card>
                </div>
                {plot.notes&&(
                  <div style={{background:C.amberLight,border:`1.5px solid ${C.amber}33`,borderRadius:10,padding:"12px 16px"}}>
                    <Label style={{color:C.amber,marginBottom:4}}>Field Notes</Label>
                    <p style={{margin:0,fontSize:12,color:C.slate,lineHeight:1.75}}>{plot.notes}</p>
                  </div>
                )}
              </div>
            )}

            {view==="pipeline"&&plot&&(
              <div style={{animation:"fadeUp 0.3s ease"}}>
                <h2 style={{fontFamily:"'Fraunces',serif",fontSize:22,fontWeight:600,color:C.slate,margin:"0 0 4px"}}>{plot.id} · Pipeline</h2>
                <p style={{fontSize:12,color:C.muted,margin:"0 0 20px"}}>Update each stage status directly. Changes save automatically.</p>
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  {STAGES.map((stage,i)=>{
                    const s=plot.status[stage];
                    const m=STATUS_CFG[s]||STATUS_CFG.pending;
                    return(
                      <Card key={stage} style={{display:"flex",alignItems:"center",gap:16}}>
                        <div style={{width:36,height:36,borderRadius:"50%",background:m.bg,border:`2px solid ${m.dot}44`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          <span style={{fontFamily:"'DM Mono',monospace",fontSize:12,fontWeight:700,color:m.dot}}>{i+1}</span>
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13,fontWeight:600,color:C.slate,marginBottom:2}}>{STAGE_LABELS[stage]}</div>
                          <StatusPill status={s}/>
                        </div>
                        <select value={s} onChange={e=>updateStatus(plot.id,stage,e.target.value)} style={{...inp,maxWidth:160,fontSize:11}}>
                          {Object.entries(STATUS_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {view==="metadata"&&plot&&(
              <div style={{maxWidth:560,animation:"fadeUp 0.3s ease"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
                  <div>
                    <h2 style={{margin:"0 0 3px",fontFamily:"'Fraunces',serif",fontSize:22,fontWeight:600,color:C.slate}}>Metadata</h2>
                    <p style={{margin:0,fontSize:12,color:C.muted}}>{plot.id}</p>
                  </div>
                  {!editMeta
                    ?<Btn variant="ghost" onClick={()=>setEditMeta({...plot,status:{...plot.status}})}>Edit</Btn>
                    :<div style={{display:"flex",gap:8}}><Btn onClick={saveMeta}>Save</Btn><Btn variant="secondary" onClick={()=>setEditMeta(null)}>Cancel</Btn></div>}
                </div>
                <Card style={{marginBottom:12}}>
                  <Label>Identity & Location</Label>
                  {[["Plot ID","id",false],["Campaign","campaign",true],["Date","date",true],["Operator","operator",true],["Equipment","equipment",true],["Latitude","lat",true],["Longitude","lon",true],["GPS Accuracy (m)","gpsAcc",true]].map(([l,k,ed])=>{
                    const val=editMeta?editMeta[k]:plot[k];
                    return(
                      <div key={k} style={{display:"flex",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
                        <span style={{width:160,fontSize:11,color:C.muted,flexShrink:0}}>{l}</span>
                        {editMeta&&ed
                          ?<input value={val} onChange={e=>setEditMeta(p=>({...p,[k]:e.target.value}))} style={{flex:1,...inp,maxWidth:280}}/>
                          :<span style={{fontSize:11,fontWeight:600,color:C.slate,fontFamily:"'DM Mono',monospace"}}>{String(val)}</span>}
                      </div>
                    );
                  })}
                </Card>
                <Card style={{marginBottom:12}}>
                  <Label>Processing Status</Label>
                  {STAGES.map((stage,i)=>{
                    const val=editMeta?editMeta.status[stage]:plot.status[stage];
                    return(
                      <div key={stage} style={{display:"flex",alignItems:"center",padding:"8px 0",borderBottom:i<3?`1px solid ${C.border}`:"none"}}>
                        <span style={{width:160,fontSize:11,color:C.muted,flexShrink:0}}>{STAGE_LABELS[stage]}</span>
                        {editMeta
                          ?<select value={val} onChange={e=>setEditMeta(p=>({...p,status:{...p.status,[stage]:e.target.value}}))} style={{...inp,maxWidth:180}}>
                            {Object.keys(STATUS_CFG).map(s=><option key={s} value={s}>{STATUS_CFG[s].label}</option>)}
                          </select>
                          :<StatusPill status={val} small/>}
                      </div>
                    );
                  })}
                </Card>
                <Card>
                  <Label>Notes</Label>
                  {editMeta
                    ?<textarea value={editMeta.notes} onChange={e=>setEditMeta(p=>({...p,notes:e.target.value}))} rows={4} style={{...inp,resize:"vertical"}}/>
                    :<p style={{margin:0,fontSize:12,color:plot.notes?C.slate:C.muted,lineHeight:1.75}}>{plot.notes||"No notes recorded."}</p>}
                </Card>
              </div>
            )}

            {view==="map"&&(
              <div style={{animation:"fadeUp 0.3s ease"}}>
                <div style={{marginBottom:14}}>
                  <h2 style={{fontFamily:"'Fraunces',serif",fontSize:22,fontWeight:600,color:C.slate,margin:"0 0 3px"}}>Plot Map · {project.name}</h2>
                  <p style={{margin:0,fontSize:12,color:C.muted}}>{plots.length} plots · Click a marker to select</p>
                </div>
                <PlotMap plots={plots} selectedId={selected} onSelect={id=>{setSelected(id);}}/>
                {selected&&plot&&(
                  <div style={{marginTop:14,display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
                    {STAGES.map(stage=>{
                      const s=plot.status[stage];
                      const m=STATUS_CFG[s]||STATUS_CFG.pending;
                      return(
                        <div key={stage} style={{background:m.bg,border:`1.5px solid ${m.dot}33`,borderRadius:10,padding:"10px 12px"}}>
                          <div style={{fontSize:9,color:C.muted,fontFamily:"'DM Mono',monospace",marginBottom:2}}>{STAGE_LABELS[stage]}</div>
                          <StatusPill status={s} small/>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {view==="overview"&&!plot&&(
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:300,color:C.muted,fontSize:13,textAlign:"center"}}>
                <div style={{fontSize:48,opacity:0.15,marginBottom:12}}>◎</div>
                <div style={{fontFamily:"'Fraunces',serif",fontSize:18,color:C.slateLight,marginBottom:8}}>No plots yet</div>
                <div style={{marginBottom:20,fontSize:12}}>Register your first plot to get started</div>
                <Btn onClick={()=>setView("new")}>+ Register New Plot</Btn>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── ROOT APP ───────────────────────────────────────────────────────────── */
export default function App(){
  const [loading,setLoading]=useState(true);
  const [projects,setProjects]=useState([]);
  const [activeId,setActiveId]=useState(null);
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState(null);
  const saveTimeout=useRef(null);

  useEffect(()=>{
    (async()=>{
      let index=await loadIndex();
      if(index.length===0){
        const demo={...DEMO_PROJECT,plotCount:DEMO_PROJECT.plots.length};
        await saveProject(demo);
        index=[{id:demo.id,name:demo.name,campaign:demo.campaign,plotCount:demo.plotCount,createdAt:demo.createdAt}];
        await saveIndex(index);
        setProjects(index);
        setActiveId(demo.id);
      } else {
        setProjects(index);
        setActiveId(index[0].id);
      }
      setLoading(false);
    })();
  },[]);

  const [activeProject,setActiveProject]=useState(null);
  useEffect(()=>{
    if(!activeId) return;
    setActiveProject(null);
    loadProject(activeId).then(proj=>{
      if(proj) setActiveProject(proj);
    });
  },[activeId]);

  const handleProjectChange=useCallback((updated)=>{
    setActiveProject(updated);
    setSaving(true);
    if(saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current=setTimeout(async()=>{
      await saveProject(updated);
      setProjects(prev=>{
        const next=prev.map(p=>p.id===updated.id?{...p,name:updated.name,campaign:updated.campaign,plotCount:updated.plotCount}:p);
        saveIndex(next);
        return next;
      });
      setSaving(false);
    },400);
  },[]);

  const showToast=(msg,ok=true)=>{setToast({msg,ok});setTimeout(()=>setToast(null),3000);};

  const createProject=async(name,campaign)=>{
    const proj={id:uid(),name,campaign,createdAt:new Date().toISOString(),plots:[],plotCount:0};
    await saveProject(proj);
    const entry={id:proj.id,name,campaign,plotCount:0,createdAt:proj.createdAt};
    const next=[...projects,entry];
    setProjects(next);
    await saveIndex(next);
    setActiveId(proj.id);
    setActiveProject(proj);
    showToast(`Project "${name}" created`);
  };
  const deleteProjectFn=async(id)=>{
    await deleteProject(id);
    const next=projects.filter(p=>p.id!==id);
    setProjects(next);
    await saveIndex(next);
    if(activeId===id){
      setActiveId(next[0]?.id||null);
      if(next[0]) setActiveProject(await loadProject(next[0].id));
      else setActiveProject(null);
    }
    showToast("Project deleted");
  };
  const renameProject=async(id,name)=>{
    if(activeProject&&activeProject.id===id){
      const updated={...activeProject,name};
      await saveProject(updated);
      setActiveProject(updated);
    }
    const next=projects.map(p=>p.id===id?{...p,name}:p);
    setProjects(next);
    await saveIndex(next);
    showToast("Project renamed");
  };

  if(loading) return(
    <div style={{height:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#1C2820",fontFamily:"'DM Mono',monospace"}}>
      <div style={{fontSize:32,marginBottom:16,opacity:0.4,animation:"spin 2s linear infinite"}}>◎</div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <div style={{color:"#52A882",fontSize:12,letterSpacing:"0.14em"}}>LOADING PROJECTS…</div>
    </div>
  );

  return(
    <div style={{display:"flex",height:"100vh",fontFamily:"'DM Sans',sans-serif",color:C.slate,overflow:"hidden"}}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes toastIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:${C.border};border-radius:4px}
        input:focus,select:focus,textarea:focus{border-color:${C.greenMid}!important;box-shadow:0 0 0 3px ${C.greenMid}18!important}
      `}</style>
      {toast&&(
        <div style={{position:"fixed",top:16,right:16,zIndex:2000,background:C.surface,border:`1.5px solid ${toast.ok?C.greenMid:C.coral}55`,borderRadius:10,padding:"10px 16px",display:"flex",alignItems:"center",gap:9,boxShadow:"0 8px 24px rgba(0,0,0,0.1)",animation:"toastIn 0.25s ease",fontSize:12,maxWidth:300}}>
          <span style={{fontSize:14,color:toast.ok?C.green:C.coral}}>{toast.ok?"✓":"✕"}</span>
          <span style={{color:C.slate}}>{toast.msg}</span>
        </div>
      )}
      <ProjectManager
        projects={projects}
        activeId={activeId}
        onSwitch={async(id)=>{
          setActiveId(id);
          const proj=await loadProject(id);
          setActiveProject(proj);
        }}
        onCreate={createProject}
        onDelete={deleteProjectFn}
        onRename={renameProject}
        saving={saving}
      />
      {activeProject?(
        <MonitoringApp
          key={activeProject.id}
          project={activeProject}
          onChange={handleProjectChange}
          showToast={showToast}
        />
      ):(
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",background:C.bg,flexDirection:"column",gap:12}}>
          <div style={{fontSize:48,opacity:0.1}}>◎</div>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:22,color:C.slateLight}}>No project selected</div>
          <div style={{fontSize:12,color:C.muted}}>Create a project in the sidebar to get started</div>
        </div>
      )}
    </div>
  );
}
