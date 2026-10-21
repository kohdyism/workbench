/* Workbench client: sign-in, dashboard, inbox, agents, priorities, activity and accounts.
   Ranks mail with the user's weights and rules, runs agents, and calls the server for mailbox
   actions and Claude. Includes a demo mode that runs entirely in the browser. */
(() => {
"use strict";

/* ================= icons ================= */
const I={
 check:'<path d="M5 12.5l4.2 4.2L19 7"/>',
 trash:'<path d="M4 7h16M9 7V4.5h6V7M6.5 7l.8 12a1.5 1.5 0 001.5 1.4h6.4a1.5 1.5 0 001.5-1.4L17.5 7M10 11v6M14 11v6"/>',
 unsub:'<path d="M3.5 6.5h17v11h-17zM3.5 7l8.5 6 8.5-6M4 20L20 4"/>',
 move:'<path d="M4 7h7l2 2h7v9H4zM12 13h5M15 11l2 2-2 2"/>',
 letgo:'<path d="M4 7h16v3H4zM6 10v8a1 1 0 001 1h10a1 1 0 001-1v-8M10 14h4"/>',
 pin:'<path d="M9 4h6l-1 5 3 3v1H7v-1l3-3zM12 13v7"/>',
 x:'<path d="M6 6l12 12M18 6L6 18"/>',
 chev:'<path d="M6 9l6 6 6-6"/>',
 sliders:'<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
 clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
 spark:'<path d="M12 3.5l1.8 5 5 1.8-5 1.8-1.8 5-1.8-5-5-1.8 5-1.8zM18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 search:'<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',
 back:'<path d="M15 5l-7 7 7 7"/>',
 send:'<path d="M4 12l16-8-6 16-2.5-6.5z"/>',
 sync:'<path d="M19 8a7.5 7.5 0 00-13.5-1.5M5 4v3.5h3.5M5 16a7.5 7.5 0 0013.5 1.5M19 20v-3.5h-3.5"/>',
 target:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
 grid:'<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
 inbox:'<path d="M4 13l2.5-7h11L20 13v5a1 1 0 01-1 1H5a1 1 0 01-1-1zM4 13h5l1 2h4l1-2h5"/>',
 bot:'<rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01M9.5 16h5"/>',
 list:'<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
 user:'<circle cx="12" cy="8.5" r="3.5"/><path d="M5 19.5c1-3.6 3.8-5.5 7-5.5s6 1.9 7 5.5"/>',
 reply:'<path d="M10 8L5 12.5 10 17M5 12.5h9a5 5 0 015 5V19"/>',
 fwd:'<path d="M14 8l5 4.5-5 4.5M19 12.5h-9a5 5 0 00-5 5V19"/>',
 pen:'<path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/>',
 info:'<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
 mail:'<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/>',
 shield:'<path d="M12 3.5l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9v-5z"/>',
 eye:'<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
 play:'<path d="M8 5.5v13l10-6.5z"/>',
 right:'<path d="M9 6l6 6-6 6"/>',
 task:'<rect x="4.5" y="4.5" width="15" height="15" rx="4"/><path d="M8.5 12.2l2.4 2.4 4.6-4.9"/>'
};
const ic=(n,c="")=>`<svg class="i ${c}" viewBox="0 0 24 24" aria-hidden="true">${I[n]||""}</svg>`;
const PV={google:{l:"G",c:"#ea4335",n:"Gmail"},microsoft:{l:"O",c:"#0a64d6",n:"Outlook"}};
const pv=p=>PV[p]||PV.google;

/* ================= model ================= */
const TYPES=["request","decision","meeting","fyi","notification","newsletter","sales"];
const TYPE_L={request:"Request",decision:"Decision",meeting:"Meeting",fyi:"FYI",notification:"Notification",newsletter:"Newsletter",sales:"Sales"};
const LANE={now:"Do today",plan:"Do later",delegate:"Hand off",letgo:"Low priority"};
const LANE_TIP={now:"Urgent, and fits in the time you have for email today",plan:"Important, but it can wait for a later slot",delegate:"Someone else could handle this. Forward it to them",letgo:"Low on urgency, importance and effort. Safe to archive"};
const LANE_C={now:"var(--now)",plan:"var(--plan)",delegate:"var(--del)",letgo:"var(--go)"};
const ACTIONS=[["letgo","Archive (low priority)"],["done","Mark done (archive)"],["pin","Pin to Do today"],["reply","Save a draft reply"],["send","Send a reply"],["project","File under a project"],["delegate","Forward to a colleague"]];
const ACT_L=Object.fromEntries(ACTIONS);
const ACT_VERB={letgo:"archived",done:"marked done",pin:"pinned",reply:"drafted a reply for",send:"sent a reply to",project:"filed",delegate:"forwarded"};
const AG_COLORS=["#5e5ce6","#0a84ff","#30b0c7","#34c759","#ff9f0a","#ff375f","#af52de","#ac8e68"];
const SCOPE_F=[["all","Any email"],["type","The email is a"],["sender","The sender includes"],["project","The project is"],["subject","The subject includes"],["any","The email mentions"]];
function uid(){return Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4);}
const newAgent=o=>Object.assign({id:"a"+uid(),name:"New agent",on:true,mode:"ask",maxI:null,field:"type",value:"notification",action:"letgo",param:"",instructions:"",context:"",allowed:["letgo","done","pin","reply"],color:AG_COLORS[Math.floor(Math.random()*AG_COLORS.length)],created:new Date().toISOString()},o||{});
const DEFAULT_AGENTS=()=>[
 newAgent({id:"a1",name:"Newsletter tidy",color:"#30b0c7",field:"type",value:"newsletter",action:"letgo",mode:"auto"}),
 newAgent({id:"a2",name:"Notification tidy",color:"#8e8e93",field:"type",value:"notification",maxI:3,action:"letgo",mode:"auto"}),
 newAgent({id:"a3",name:"Sales filter",color:"#ff9f0a",field:"type",value:"sales",action:"letgo",mode:"auto"}),
 newAgent({id:"a4",name:"Meeting assistant",color:"#5e5ce6",field:"type",value:"meeting",action:"reply",mode:"ask",allowed:["reply","pin"],
  param:"Hi {first},\n\nThanks for this. I could do Tuesday or Thursday afternoon. Would either work?\n",
  instructions:"For meeting requests, draft a short, friendly reply. Propose two times from my availability in the context. If the request is from my manager, accept their suggested time instead. If there's no clear ask for a meeting, do nothing.",
  context:"I'm usually free Tuesday and Thursday afternoons (14:00 to 17:00 UK time).\nI prefer 30-minute meetings.\nI don't take meetings on Fridays."})
];
const DEFAULT_SET=()=>({w:{u:40,i:40,e:20},budget:120,about:"",context:"",ctx:[],rules:[],agents:DEFAULT_AGENTS(),buckets:[],bucketSummaries:{},rundown:null,bucketsSuggestedAt:null});
const S={
 mode:"loading",user:null,accounts:[],emails:[],set:DEFAULT_SET(),log:[],queue:[],ai:{enabled:false,remaining:0},
 route:{view:"dashboard"},sheet:null,sheetFull:false,drafts:{},drafting:null,confirmSend:null,
 modal:null,syncing:false,syncNote:"",busy:new Set(),ctxBusy:false,
 box:{queue:"all",lastIds:null,folder:"inbox",account:"all",q:"",sel:null,orig:{},images:false,plain:false,compose:null,filter:null},
 tests:{},actFilter:"all",authErr:"",authBusy:false,dim:"project",showAllDims:false,showAllApprovals:false,qEdits:{},qEditing:null,tasks:[],keepTasks:new Set(),bucketSel:null,bview:"topic",navOpen:(()=>{try{return JSON.parse(localStorage.getItem("wb.nav")||"{}")||{};}catch(e){return {};}})(),bucketStatus:null,rundownOpen:false,sumBusy:false,rdBusy:false,bkBusy:false,tsEdit:null,showDone:false,readSent:new Set()
};

/* ================= utils ================= */
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clamp=(v,a=0,b=10)=>Math.max(a,Math.min(b,Number.isFinite(+v)?+v:a));
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(36);}
const firstName=f=>(String(f).replace(/<.*>/,"").replace(/["']/g,"").trim().split(/[\s,]+/)[0]||"there");
const dispName=e=>e.fromName||e.fromEmail||"Unknown";
const AVC=["#5e5ce6","#0a84ff","#30b0c7","#34c759","#ff9f0a","#ff375f","#af52de","#8e8e93","#ac8e68","#64d2ff"];
const avColor=s=>AVC[parseInt(hash(s||"?"),36)%AVC.length];
const initials=n=>{const p=String(n).replace(/[^\p{L}\s]/gu,"").trim().split(/\s+/);return ((p[0]||"?")[0]+(p[1]?p[1][0]:"")).toUpperCase();};
function when(iso){const d=new Date(iso);if(isNaN(d))return "";const now=new Date();const diff=(now-d)/864e5;
 if(d.toDateString()===now.toDateString())return d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
 if(diff<6&&diff>=0)return d.toLocaleDateString("en-GB",{weekday:"short"});return d.toLocaleDateString("en-GB",{day:"numeric",month:"short"});}
const fullDate=iso=>new Date(iso).toLocaleString("en-GB",{weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
const fmtMin=m=>m>=60?`${Math.floor(m/60)}h${m%60?" "+m%60+"m":""}`:`${m}m`;
function fridayEnd(){const d=new Date();const add=(5-d.getDay()+7)%7;d.setDate(d.getDate()+add);d.setHours(23,59,0,0);return d.toISOString();}
const shortDate=iso=>new Date(iso).toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"});
const isEmail=s=>/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(String(s||"").trim());
const live=()=>S.mode==="live";
const byId=id=>S.emails.find(e=>e.id===id);
const OPEN=e=>e.status==="open";
const HANDLED=["done","letgo","delegated","sent","deleted"];
const isToday=iso=>new Date(iso).toDateString()===new Date().toDateString();
const agentById=id=>S.set.agents.find(a=>a.id===id);
const accById=id=>S.accounts.find(a=>a.id===id);

/* ================= server ================= */
async function api(path,body,method){
 const r=await fetch(path,{method:method||(body?"POST":"GET"),headers:body?{"content-type":"application/json"}:{},body:body?JSON.stringify(body):undefined,credentials:"same-origin"});
 let j={};try{j=await r.json();}catch(e){}
 if(!r.ok){const err=new Error(j.error||`Request failed (${r.status})`);err.status=r.status;throw err;}
 return j;
}
function applyState(st){
 S.user=st.user;S.accounts=st.accounts||[];
 const bodies=new Map(S.emails.filter(e=>e.body).map(e=>[e.id,e.body]));
 S.emails=(st.emails||[]).map(e=>Object.assign(e,{body:bodies.get(e.id)||null}));
 const s=st.settings||{};S.set=Object.assign(DEFAULT_SET(),s);
 if(!Array.isArray(S.set.agents)||!S.set.agents.length)S.set.agents=DEFAULT_AGENTS();
 S.set.agents=S.set.agents.map(a=>newAgent(a));
 S.log=st.log||[];S.queue=st.queue||[];S.tasks=st.tasks||[];S.ai=st.ai||{enabled:false,remaining:0};
}
function mergeEmails(list){(list||[]).forEach(n=>{const i=S.emails.findIndex(e=>e.id===n.id);if(i>=0)S.emails[i]=Object.assign(S.emails[i],n);else S.emails.push(n);});}
let setT;const saved={t:0};
function markSaved(){saved.t=Date.now();const el=document.getElementById("savedmark");if(el)el.textContent="Saved";}
function saveSet(){if(!live()){markSaved();return;}clearTimeout(setT);setT=setTimeout(()=>api("/api/settings",{settings:S.set},"PUT").then(markSaved).catch(()=>toast("Couldn't save your settings. Check your connection.")),600);}
function saveQueue(add,remove,clear){if(!live())return;api("/api/queue",{add,remove,clear}).catch(()=>{});}

/* ================= scoring and ranking ================= */
function basicScore(e){
 const body=e.body||e.snippet||"";const t=(e.subject+" "+body).toLowerCase(),f=(e.fromName+" "+e.fromEmail).toLowerCase();
 let type="fyi";
 if(/unsubscribe|newsletter|digest|this week's edition|weekly roundup|view in browser/.test(t))type="newsletter";
 else if(/no-?reply|do not reply|notification|automated|alert@|notifications@|jira|workday|calendar/.test(f+" "+t.slice(0,200))&&!/\?/.test(body.slice(0,400)))type="notification";
 else if(/webinar|exclusive offer|free trial|book a demo|special offer|% off|limited time/.test(t))type="sales";
 else if(/approve|approval|sign-?off|decision|go\/no-go|decide/.test(t))type="decision";
 else if(/invite|meeting|call\b|schedule|available|free for|screen on/.test(t))type="meeting";
 else if(/\?|please|could you|can you|would you|need you/.test(t))type="request";
 let U=3,I=4;
 if(/urgent|asap|immediately|today|eod|end of day|right away/.test(t))U+=4;
 if(/tomorrow|deadline|overdue|by (mon|tue|wed|thu|fri|sat|sun)|this week|before (mon|tue|wed|thu|fri)/.test(t))U+=2;
 if(type==="decision"){I+=3;U+=1;}if(type==="request")I+=1;if(type==="meeting")U+=1;
 if(/waiting|still need|overdue|blocked|need (your|a) decision|competing offer/.test(t))U+=1;
 if(["newsletter","sales"].includes(type)){U=1;I=1;}if(type==="notification"){U=Math.min(U,3);I=2;}
 const words=body.split(/\s+/).length;const E=Math.min(9,1+Math.round(words/120)+(/attach/.test(t)?2:0)+(type==="decision"?1:0));
 const sents=body.replace(/\s+/g," ").split(/(?<=[.?!])\s/);
 const ask=(sents.find(s=>/\?|please|could you|can you/i.test(s))||"").slice(0,90);
 return {u:clamp(U),i:clamp(I),e:clamp(E),min:Math.max(2,E*5),type,project:"General",summary:(sents.find(s=>s.length>20)||e.subject).slice(0,110),ask:ask||"Nothing",reasons:[TYPE_L[type]]};
}
const activeCtx=()=>(S.set.ctx||[]).filter(r=>!r.expires||new Date(r.expires)>new Date());
function ruleMatch(r,e){
 if(r.field==="all")return true;
 const v=String(r.value||"").toLowerCase();if(!v)return false;const a=e.ai||{};
 if(r.field==="sender")return (e.fromName+" "+e.fromEmail).toLowerCase().includes(v);
 if(r.field==="project")return (a.project||"").toLowerCase().includes(v);
 if(r.field==="subject")return e.subject.toLowerCase().includes(v);
 if(r.field==="type")return (a.type||basicScore(e).type)===v;
 if(r.field==="any")return new RegExp("\\b"+v.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"\\b","i").test(e.fromName+" "+e.subject+" "+(e.body||e.snippet||""));
 return false;
}
function score(e){
 const a=e.ai||basicScore(e);let U=a.u,I=a.i,E=a.e;const applied=[];let delegate=null;
 for(const r of [...(S.set.rules||[]).map(x=>({...x,src:"rule"})),...activeCtx().map(x=>({...x,src:"context"}))]){
  if(!ruleMatch(r,e))continue;
  if(r.effect==="mul")I*=r.amount;else if(r.effect==="imp")I+=r.amount;else if(r.effect==="urg")U+=r.amount;else if(r.effect==="cap")I=Math.min(I,r.amount);else if(r.effect==="delegate")delegate=r.to;
  applied.push({label:r.label,src:r.src});
 }
 U=clamp(U);I=clamp(I);E=clamp(E);
 const w=S.set.w,tot=(w.u+w.i+w.e)||1;const cu=w.u*U/tot,ci=w.i*I/tot,ce=w.e*(10-E)/tot;
 return {U,I,E,s:cu+ci+ce,cu,ci,ce,applied,delegate,a};
}
function compute(){
 const open=S.emails.filter(OPEN);
 open.forEach(e=>{const c=e._c=score(e);e._over=false;
  if(c.I<=2&&c.U<=4||c.s<3.2)e._lane="letgo";
  else if(c.delegate&&c.I<7)e._lane="delegate";
  else if(c.U>=6)e._lane="now";
  else if(c.I>=5||c.s>=4.5)e._lane="plan";
  else e._lane="letgo";
 });
 open.sort((a,b)=>(b.pinned-a.pinned)||(b._c.s-a._c.s));
 let used=0;const today=[];
 open.forEach(e=>{if(e.pinned){today.push(e);used+=e._c.a.min||5;if(e._lane==="letgo")e._lane="plan";}});
 open.filter(e=>e._lane==="now"&&!e.pinned).forEach(e=>{const m=e._c.a.min||5;if(used+m<=S.set.budget){used+=m;today.push(e);}else{e._lane="plan";e._over=true;}});
 open.forEach(e=>e._today=today.includes(e));
 const lanes={plan:[],delegate:[],letgo:[]};open.forEach(e=>{if(!e._today&&lanes[e._lane])lanes[e._lane].push(e);});
 const ready=S.emails.filter(e=>e.status==="ready");
 const handled=S.emails.filter(e=>HANDLED.includes(e.status)).sort((a,b)=>(b.handledAt||"").localeCompare(a.handledAt||""));
 return {open,today,used,lanes,ready,handled};
}
const projects=()=>[...new Set(S.emails.map(e=>e.ai&&e.ai.project).filter(p=>p&&p!=="General"))];
const senders=()=>{const m={};S.emails.forEach(e=>{const k=dispName(e);m[k]=(m[k]||0)+1;});return m;};
const laneOf=e=>OPEN(e)?(e._today?"now":e._lane||"plan"):e.status==="ready"?"ready":"handled";

/* ================= actions ================= */
const VERB={delete:"Deleted",done:"Done",letgo:"Archived",delegate:"Forwarded",pin:"Pinned",reply:"Saved a draft for",send:"Sent a reply to",project:"Filed",reopen:"Moved back to inbox:"};
const snapL=e=>({id:e.id,status:e.status,pinned:e.pinned,draft:e.draft,delegatedTo:e.delegatedTo,handledAt:e.handledAt,project:e.ai&&e.ai.project});
function applyLocal(e,a,param){
 const now=new Date().toISOString();const txt=String(param||"").replace(/\{first\}/g,firstName(dispName(e)));
 if(a==="done"||a==="letgo"){e.status=a;e.handledAt=now;}
 else if(a==="delete"){e.status="deleted";e.handledAt=now;}
 else if(a==="delegate"){e.status="delegated";e.delegatedTo=param;e.handledAt=now;}
 else if(a==="send"){e.status="sent";e.draft=txt;e.handledAt=now;}
 else if(a==="pin")e.pinned=!e.pinned;
 else if(a==="reply"){e.status="ready";e.draft=txt;}
 else if(a==="project"){e.ai=e.ai||basicScore(e);e.ai.project=param;}
 else if(a==="reopen"){e.status="open";e.delegatedTo="";e.handledAt=null;}
 else if(a==="agentsran")e.agentsRan=true;
 else if(a==="read")e.unread=false;
}
/** Runs an action on the server (live) or locally (demo). Resolves with the log entry or null. */
async function act(ids,a,param,opts={}){
 ids=ids.filter(Boolean);if(!ids.length)return null;
 const actor=opts.actor||"You";const quiet=a==="agentsran"||a==="read";
 if(!live()){
  const es=ids.map(byId).filter(Boolean);const before=es.map(snapL);
  es.forEach(e=>applyLocal(e,a,opts.params&&opts.params[e.id]!=null?opts.params[e.id]:param));
  if(quiet)return null;
  const what=es.length===1?`“${es[0].subject}”`:`${es.length} emails`;
  const en={id:uid(),t:new Date().toISOString(),actor,text:opts.text&&a!=="send"&&a!=="delegate"?opts.text:`${VERB[a]} ${what}${a==="delegate"?" to "+param:a==="project"?" under "+param:""}`,undoable:a!=="send"&&a!=="delegate",undone:false,agentId:opts.agentId||null,reason:opts.reason||null,emailIds:es.map(e=>e.id),_undo:before};
  S.log.unshift(en);if(!opts.noRender)render();return en;
 }
 if(!quiet){ids.forEach(id=>S.busy.add(id));if(!opts.noRender)render();}
 try{
  const r=await api("/api/actions",{ids,action:a,param,actor,text:opts.text,agentId:opts.agentId,reason:opts.reason,params:opts.params});
  mergeEmails(r.emails);if(r.log)S.log.unshift(r.log);
  if(r.failed&&r.failed.length)toast(r.failed.length===ids.length?r.failed[0].error:`${r.failed.length} couldn't be updated: ${r.failed[0].error}`);
  return r.log;
 }catch(err){toast(err.message);return null;}
 finally{if(!quiet){ids.forEach(id=>S.busy.delete(id));if(!opts.noRender)render();}}
}
async function undo(id){
 const en=S.log.find(l=>l.id===id);if(!en||en.undone)return;
 if(!en.undoable){toast("Sent or forwarded email can't be unsent.");return;}
 if(!live()){(en._undo||[]).forEach(s=>{const e=byId(s.id);if(e){Object.assign(e,{status:s.status,pinned:s.pinned,draft:s.draft,delegatedTo:s.delegatedTo,handledAt:s.handledAt});if(e.ai&&s.project)e.ai.project=s.project;}});en.undone=true;toast("Undone");render();return;}
 try{const r=await api("/api/undo",{logId:id});mergeEmails(r.emails);en.undone=true;toast(r.failed&&r.failed.length?"Partly undone: "+r.failed[0]:"Undone");}
 catch(err){toast(err.message);}
 render();
}

/* ================= agents ================= */
const isAI=a=>Boolean((a.instructions||"").trim())&&live()&&S.ai.enabled;
function agentMatches(a,pool){return (pool||S.emails.filter(OPEN)).filter(e=>OPEN(e)&&ruleMatch({field:a.field,value:a.value},e)&&(a.maxI==null||a.maxI===""||score(e).I<=Number(a.maxI)));}
const sendOK=e=>score(e).I<=4;
const autoAllowed=(a,d,e)=>a.mode==="auto"&&(d.action!=="send"||sendOK(e));
function agentSentence(a){
 const f={all:"any email arrives",sender:"the sender includes",project:"the project is",subject:"the subject includes",type:"the email is a",any:"the email mentions"}[a.field]||"";
 const val=a.field==="all"?"":a.field==="type"?` <b>${esc((TYPE_L[a.value]||a.value).toLowerCase())}</b>`:` <b>“${esc(a.value)}”</b>`;
 const lim=a.maxI!=null&&a.maxI!==""?` and importance is ${esc(a.maxI)} or lower`:"";
 const d=(a.instructions||"").trim()?"Claude follows this agent's instructions to decide what to do":{letgo:"let it go",done:"mark it done",pin:"pin it to Today",reply:"save a draft reply",send:"send a fixed reply",project:`file it under ${esc(a.param)}`,delegate:`forward it to ${esc(a.param)}`}[a.action];
 return `When ${f}${val}${lim}, ${d}.`;
}
const plain=h=>h.replace(/<[^>]+>/g,"");
/** Decides what an agent would do with each email, without doing it. */
async function decide(a,emails){
 if(!emails.length)return [];
 if(isAI(a)){
  const out=[];
  for(let i=0;i<emails.length;i+=12){
   const chunk=emails.slice(i,i+12);
   const r=await api("/api/agents/run",{agent:{name:a.name,instructions:a.instructions,context:a.context,allowed:a.allowed},emailIds:chunk.map(e=>e.id)});
   out.push(...(r.decisions||[]));
  }
  return out;
 }
 const reason=(a.instructions||"").trim()?"Matched this agent's scope. Claude isn't available here, so the default action is used.":"Matched: "+plain(agentSentence(a));
 return emails.map(e=>({id:e.id,action:a.action,param:a.param,reason}));
}
let agentsRunning=false;
async function runAgents(emails,{manual=false,only=null}={}){
 if(agentsRunning)return;agentsRunning=true;
 let autoCount=0,queued=0,lastLog=null;const add=[];
 try{
  for(const a of S.set.agents){
   if(only?a.id!==only:!a.on)continue;
   const ms=agentMatches(a,emails);if(!ms.length)continue;
   let ds=[];try{ds=await decide(a,ms);}catch(err){toast(`${a.name}: ${err.message}`);continue;}
   const autoGroup={};
   for(const d of ds){
    if(d.action==="none"||!d.action)continue;const e=byId(d.id);if(!e||!OPEN(e))continue;
    if(autoAllowed(a,d,e)){
     if(isAI(a)){lastLog=await act([e.id],d.action,d.param,{actor:a.name,agentId:a.id,reason:d.reason,text:`${a.name} ${ACT_VERB[d.action]} “${e.subject}”`,noRender:true});autoCount++;}
     else (autoGroup[d.action]=autoGroup[d.action]||[]).push(e.id);
    }else if(!S.queue.find(q=>q.emailId===e.id&&q.agentId===a.id)){const q={id:uid(),agentId:a.id,emailId:e.id,action:d.action,param:d.param,reason:d.reason,t:new Date().toISOString()};S.queue.push(q);add.push(q);queued++;}
   }
   for(const [action,ids] of Object.entries(autoGroup)){
    lastLog=await act(ids,action,a.param,{actor:a.name,agentId:a.id,reason:ds[0]&&ds[0].reason,text:`${a.name} ${ACT_VERB[action]} ${ids.length} email${ids.length>1?"s":""}`,noRender:true});autoCount+=ids.length;
   }
  }
  const fresh=emails.filter(e=>!e.agentsRan).map(e=>e.id);
  if(fresh.length&&!only)await act(fresh,"agentsran");
  if(add.length)saveQueue(add);
  if(manual||autoCount||queued){const p=[];if(autoCount)p.push(`${autoCount} handled by agents`);if(queued)p.push(`${queued} waiting for your approval`);toast(p.join(" · ")||"Nothing matched",autoCount===1&&lastLog&&lastLog.undoable?lastLog.id:null);}
 }finally{agentsRunning=false;render();}
}
const qParam=(q,a)=>{const ta=document.getElementById("qe-"+q.id);if(ta)S.qEdits[q.id]=ta.value;return S.qEdits[q.id]!=null?S.qEdits[q.id]:(q.param!=null?q.param:a.param);};
async function approve(q){
 const a=agentById(q.agentId);if(!a){S.queue=S.queue.filter(x=>x.id!==q.id);return;}
 const param=qParam(q,a);S.queue=S.queue.filter(x=>x.id!==q.id);saveQueue([], [q.id]);delete S.qEdits[q.id];if(S.qEditing===q.id)S.qEditing=null;
 const en=await act([q.emailId],q.action||a.action,param,{actor:a.name+" (approved)",agentId:a.id,reason:q.reason});
 if(en)toast(en.text,en.undoable?en.id:null);
}

/* ================= sync ================= */
async function sync(manual){
 if(!live()||S.syncing)return;
 S.syncing=true;S.syncNote="Checking mail";renderChrome();
 try{
  for(let round=0;round<8;round++){
   const r=await api("/api/sync",{});
   applyState(r.state);
   if(r.problems&&r.problems.length&&round===0)toast(`${r.problems[0].account}: ${r.problems[0].error}`);
   if(manual&&round===0&&r.added===0&&!r.remaining)toast("You're up to date");
   if(!S.ai.enabled||!r.remaining)break;
   S.syncNote=`Sorting · ${r.remaining} left`;render();
  }
  const pending=S.emails.filter(e=>OPEN(e)&&!e.agentsRan&&(e.by==="ai"||!S.ai.enabled));
  if(pending.length){S.syncNote="Agents working";renderChrome();await runAgents(pending);}
  S.syncNote="Organising";renderChrome();await afterSort();
 }catch(err){if(err.status===401){S.mode="signedout";location.hash="#/login";}else toast(err.message);}
 S.syncing=false;S.syncNote="";render();
}

/* ================= AI helpers ================= */
async function aiDraft(e){
 if(!live()||!S.ai.enabled){S.drafts[e.id]=demoDraft(e);render();toast(live()?"Drafting isn't set up on this server, so here's a starting point.":"Demo draft. Connect a real inbox for Claude's drafts.");return;}
 S.drafting=e.id;render();
 try{const r=await api("/api/draft",{id:e.id});S.drafts[e.id]=r.text;}catch(err){toast(err.message);}
 S.drafting=null;render();
}
function demoDraft(e){const a=(e._c||score(e)).a;return `Hi ${firstName(dispName(e))},\n\nThanks for this. ${a.ask&&a.ask!=="Nothing"?"I'll pick this up and come back to you shortly.":"Noted, thank you."}\n\nBest,\n${firstName(S.user&&S.user.name||"Maya")}`;}
async function contextRules(text){
 if(live()&&S.ai.enabled){try{return (await api("/api/context",{text,projects:projects(),senders:Object.keys(senders()).slice(0,80),expires:fridayEnd()})).rules||[];}catch(err){toast(err.message);}}
 return parseContextBasic(text);
}
function parseContextBasic(text){
 const out=[];const ps=projects();const ss=Object.keys(senders());const cap=s=>s[0].toUpperCase()+s.slice(1);
 text.split(/[.\n!;]+(?=\s|$)/).map(s=>s.trim()).filter(Boolean).forEach(s=>{const l=s.toLowerCase();
  const cov=l.match(/(\w+)(?: \([^)]*\))? is covering (?:for )?(\w+)/);
  if(cov){const em=(s.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/)||[])[0];out.push({id:uid(),field:"any",value:cov[2],effect:"delegate",amount:0,to:em||cap(cov[1]),label:`${cap(cov[2])}'s mail → suggest ${cap(cov[1])}`,expires:fridayEnd()});return;}
  const hitP=ps.filter(p=>l.includes(p.toLowerCase())||p.toLowerCase().split(" ").some(w=>w.length>4&&l.includes(w)));
  const quoted=(s.match(/(?:about|on|the) ([a-z][\w ]{3,24})$/i)||[])[1];
  const targets=hitP.length?hitP.map(p=>({f:"project",v:p})):quoted?[{f:"any",v:quoted.replace(/^the /i,"")}]:[];
  if(/ignore|deprioriti|skip|not important|don't care/.test(l))targets.forEach(t=>out.push({id:uid(),field:t.f,value:t.v,effect:"cap",amount:1,label:`${cap(t.v)}: importance capped at 1`,expires:fridayEnd()}));
  else if(/focus|priorit|important|matters|deadline|urgent/.test(l)){
   targets.forEach(t=>out.push({id:uid(),field:t.f,value:t.v,effect:"imp",amount:2,label:`${cap(t.v)}: importance +2`,expires:fridayEnd()}));
   ss.forEach(n=>{const fn=n.split(" ")[0].toLowerCase();if(fn.length>2&&new RegExp("\\b"+fn+"\\b").test(l)&&!targets.length)out.push({id:uid(),field:"sender",value:n,effect:"mul",amount:1.5,label:`${n}: importance ×1.5`,expires:fridayEnd()});});
  }
 });
 return out.filter((r,i,arr)=>arr.findIndex(x=>x.label.toLowerCase()===r.label.toLowerCase())===i);
}

/* ================= demo ================= */
const DEMO_TASKS=[[/headcount line/,"Sign off the revised headcount line",2],[/Audit evidence/,"Send Raj the access log and 4.2 approvals",3],[/travel line/,"Confirm November travel forecast with Dev",2],[/go\/no-go/,"Decide go or no-go for Friday's cutover",1],[/migration risks/,"Draft board slide on top 3 migration risks",5],[/forecast locks/,"Update Q4 forecast programme lines",8],[/Interview feedback/,"Submit interview feedback in Workday",0],[/legacy API/,"Decide whether to extend the legacy API",3],[/Offer approval/,"Approve Jordan's offer in Workday",0],[/risk register/,"Review Priya's draft risk register",4],[/Phase 2/,"Propose a phase 2 kick-off date to Raj",6]];
function demoInbox(){
 const P={helen:["Helen Marsh","helen.marsh@halden.example"],raj:["Raj Patel","raj.patel@northwind.example"],priya:["Priya Shah","priya.shah@halden.example"],dev:["Dev Okoro","dev.okoro@halden.example"],sam:["Sam Wu","sam.wu@halden.example"],ana:["Ana Lima","ana.lima@halden.example"],lena:["Lena Fischer","lena@talentco.example"],it:["IT Service Desk","noreply@it.halden.example"],workday:["Workday","notifications@workday.example"],jira:["Jira","jira@halden.example"],carla:["Carla Deane","carla@cloudscale.example"],bright:["Brightdesk","hello@brightdesk.example"],news:["Logistics Weekly","newsletter@logweekly.example"],digest:["Ops Leaders Digest","digest@opsleaders.example"],tom:["Tom Reyes","tom.reyes@halden.example"],cal:["Calendar","calendar@halden.example"]};
 const K=[
  ["helen",95,"Q4 budget: need your sign-off on the headcount line by Thu","Hi Maya,\n\nFinance has revised the headcount line down by one FTE. I need your sign-off by Thursday so it goes into the board pack. If you disagree, tell me why and I'll take it to the CFO.\n\nHelen","g"],
  ["raj",300,"Audit evidence pack: two items still missing","Maya,\n\nWe're still missing the access-review log for September and the signed change approvals for release 4.2. Our auditors start fieldwork on Monday, so we need both before then.\n\nRaj","o"],
  ["dev",140,"Budget variance query: travel line is 18% over","Hi Maya,\n\nTravel is running 18% over plan, mostly the Northwind site visits. Can you confirm whether that's expected to continue into November?\n\nDev","g"],
  ["sam",60,"Migration cutover: go/no-go on Friday?","Maya,\n\nLoad tests passed at 1.4x peak. Two open defects are cosmetic. I'm recommending go for Friday 22:00, but it's your call as programme owner. Can you decide by Thursday end of day?\n\nSam","g"],
  ["priya",200,"Covering Tom's vendor renewals: which ones first?","Hi Maya,\n\nI've got Tom's renewal list. Three expire before he's back. Which should I prioritise?\n\nPriya","g"],
  ["helen",400,"Board pack: one slide on migration risks","Maya,\n\nCould you draft one slide on the top three migration risks for the board pack? Due next Tuesday.\n\nHelen","g"],
  ["dev",1300,"Reminder: Q4 forecast locks 31 Oct","All,\n\nForecasts lock on 31 October. Please update your programme lines before then.\n\nDev","g"],
  ["ana",2900,"Interview feedback overdue: two candidates","Hi Maya,\n\nWe're still waiting on your feedback for the two data analyst candidates. Both have competing offers, so please submit today if you can.\n\nAna","g"],
  ["lena",180,"Can you do a 30-minute screen on Wednesday?","Hi Maya,\n\nWe have a strong candidate for the analyst role. Are you free for a 30-minute meeting on Wednesday afternoon?\n\nLena","o"],
  ["helen",50,"Can you cover Tuesday's ops review?","Maya, I'm at the board offsite. Could you chair the ops review on Tuesday?\n\nHelen","g"],
  ["sam",500,"Need a decision: keep the legacy API three more months?","Maya,\n\nTwo internal teams haven't moved off the legacy API. Keeping it costs about £9k a month. Do we extend to January or force the move? I need a decision this week.\n\nSam","g"],
  ["ana",350,"Offer approval needed: data analyst role","Hi Maya,\n\nThe offer for Jordan is ready and within band. Please approve in Workday so we can send it today.\n\nAna","g"],
  ["raj",1600,"Phase 2 kick-off date?","Maya,\n\nOnce the audit is done we'd like to start phase 2. Could you suggest a kick-off date in November?\n\nRaj","o"],
  ["priya",900,"Draft risk register for your review","Hi Maya,\n\nAttached is the draft risk register. It feeds into Helen's board slide, so comments by Monday would be ideal.\n\nPriya","g"],
  ["sam",700,"Load test results (FYI)","Results attached. All targets met at 1.4x peak. No action needed.\n\nSam","g"],
  ["bright",600,"Renewal quote for Tom: expires 28 Oct","Hi Tom,\n\nYour Brightdesk renewal quote expires 28 October. Let us know if you'd like to proceed.\n\nBrightdesk","o"],
  ["carla",1100,"CloudScale contract question (Tom's account)","Hi, Tom mentioned a possible seat increase. Is that still the plan?\n\nCarla","o"],
  ["workday",240,"Approve timesheet: Priya Shah","A timesheet is awaiting your approval. This is an automated notification.","g"],
  ["it",800,"Your password expires in 3 days","Change your password before it expires to avoid losing access. Do not reply to this automated message.","g"],
  ["tom",2000,"Out of office until 3 November","I'm on leave until 3 November. Priya Shah is covering. This is an automated reply.","g"],
  ["carla",3000,"Quick question about your cloud spend","Hi Maya, would you be open to a 15-minute call about optimising your cloud spend? Book a demo here. Unsubscribe.","o"]
 ];
 const nl=["Port congestion eases in Q4","Five metrics every ops lead should track","Rail freight volumes up 6%","Inside the warehouse automation boom","Why last-mile costs keep rising"];
 for(let i=0;i<6;i++)K.push([i%2?"news":"digest",120+i*290,(i%2?"Logistics Weekly: ":"Digest: ")+nl[i%nl.length],"This week's edition is here. View in browser for the full stories. Unsubscribe at any time.","g"]);
 for(let i=0;i<6;i++)K.push(["jira",70+i*150,`MIG-${210+i}: status changed to ${["In review","Done","Blocked","In progress"][i%4]}`,"An issue you watch was updated. This is an automated notification.","g"]);
 for(let i=0;i<4;i++)K.push([i%2?"bright":"carla",400+i*500,["Webinar: modern service desks","Your exclusive Q4 offer","Customer story: 40% faster triage","Limited time: 20% off"][i],"Hi Maya, I wanted to share an exclusive offer that might help your team. Book a demo or unsubscribe here.","o"]);
 for(let i=0;i<3;i++)K.push(["cal",90+i*240,`Accepted: ${["Ops review","Migration stand-up","Budget sync"][i]}`,"This is an automated calendar notification.","g"]);
 const projectOf=t=>/budget|forecast|variance|travel line/i.test(t)?"Q4 budget":/audit|phase 2|northwind/i.test(t)?"Client audit":/migration|legacy api|load test|risk register|board pack|mig-/i.test(t)?"Platform migration":/interview|offer|screen|timesheet|candidate/i.test(t)?"Hiring":/renewal|tom's|cloudscale|brightdesk/i.test(t)?"Vendor renewals":"General";
 return K.map(([p,ago,subj,body,acc],i)=>({id:"d"+i,accountId:acc==="o"?"demo-o":"demo-g",provider:acc==="o"?"microsoft":"google",fromName:P[p][0],fromEmail:P[p][1],to:acc==="o"?"maya.okafor@halden-group.example":"maya@halden.example",subject:subj,snippet:body.slice(0,140),body,date:new Date(Date.now()-ago*60000).toISOString(),status:"open",pinned:false,ai:null,by:"basic",draft:"",delegatedTo:"",agentsRan:false,handledAt:null})).map(e=>{const sc=basicScore(e);const pj=projectOf(e.subject+" "+e.body);e.ai=Object.assign(sc,{project:sc.type==="newsletter"||sc.type==="sales"?"General":pj,reasons:[TYPE_L[sc.type],pj!=="General"?pj:""].filter(Boolean)});const dt=DEMO_TASKS.find(([re])=>re.test(e.subject));e.ai.tasks=dt?[{title:dt[1],due:isoDay(dt[2])}]:[];e.unread=Date.now()-new Date(e.date)<400*60000;return e;});
}
async function startDemo(){
 S.mode="demo";S.user={email:"maya@halden.example",name:"Maya Okafor"};
 S.accounts=[{id:"demo-g",provider:"google",email:"maya@halden.example",lastSync:new Date().toISOString()},{id:"demo-o",provider:"microsoft",email:"maya.okafor@halden-group.example",lastSync:new Date().toISOString()}];
 S.set=DEFAULT_SET();
 S.set.about="I'm Maya Okafor, Programme Manager at Halden Freight. My manager is Helen Marsh. Raj Patel at Northwind is our key client.";
 S.set.context="This week I'm focused on the Q4 budget. Priya (priya.shah@halden.example) is covering for Tom while he's on leave. Ignore anything about the office move.";
 S.set.ctx=[{id:uid(),field:"subject",value:"budget",effect:"imp",amount:2,label:"Q4 budget: importance +2",expires:fridayEnd()},{id:uid(),field:"any",value:"tom",effect:"delegate",amount:0,to:"priya.shah@halden.example",label:"Tom's mail → suggest Priya",expires:fridayEnd()},{id:uid(),field:"subject",value:"office move",effect:"cap",amount:1,label:"Office move: importance capped at 1",expires:fridayEnd()}];
 S.emails=demoInbox();S.log=[];S.queue=[];S.ai={enabled:false,remaining:0};
 go("dashboard");await runAgents(S.emails.filter(OPEN));await afterSort();
}

/* ================= routing ================= */
function parseRoute(){const h=location.hash.replace(/^#\/?/,"").split("/");const d=x=>{try{return decodeURIComponent(x);}catch(e){return x;}};return {view:h[0]||"dashboard",id:h[1]?d(h[1]):null,tab:h[2]?d(h[2]):null};}
function go(view,id,tab){const h="#/"+[view,id&&encodeURIComponent(id),tab&&encodeURIComponent(tab)].filter(Boolean).join("/");if(location.hash!==h)location.hash=h;else{S.route=parseRoute();render();}}
window.addEventListener("hashchange",()=>{S.route=parseRoute();S.authErr="";closePop();S.sheet=null;S.bsheet=null;render();if(S.route.view!=="inbox")window.scrollTo(0,0);});

/* ================= rendering: shared ================= */
const app=()=>document.getElementById("app");
function render(){
 if(S.mode==="loading"){app().innerHTML=`<div class="auth"><div class="brand"><div class="logo"><span class="mark">W</span>Workbench</div></div><div class="side"><span class="spin"></span></div></div>`;return;}
 if(S.mode==="signedout"){const k=captureFocus();app().innerHTML=authHTML();restoreFocus(k);renderOverlays();return;}
 const r=S.route;
 const views={dashboard:vDashboard,buckets:vBuckets,inbox:vInbox,tasks:vTasks,agents:vAgents,priorities:vPriorities,activity:vActivity,accounts:vAccounts,connect:vConnect};
 const v=views[r.view]?r.view:"dashboard";
 const keep=captureFocus();
 const lb=document.querySelector(".mail .lb");const lbTop=lb?lb.scrollTop:0;
 app().innerHTML=`<div class="shell${v==="inbox"?" fixed":""}">${navHTML(v)}<div class="content">${views[v]()}</div></div>`;
 const lb2=document.querySelector(".mail .lb");if(lb2)lb2.scrollTop=lbTop;
 restoreFocus(keep);afterRender(v);renderOverlays();
}
function renderChrome(){const el=document.getElementById("topstatus");if(el)el.innerHTML=statusHTML();}
const statusHTML=()=>S.syncing?`<span class="status" role="status"><span class="spin"></span>${esc(S.syncNote)}</span>`:"";
function captureFocus(){const a=document.activeElement;if(!a||!a.id)return null;return {id:a.id,s:a.selectionStart,e:a.selectionEnd};}
function restoreFocus(k){if(!k)return;const el=document.getElementById(k.id);if(el&&document.activeElement!==el){el.focus();try{if(k.s!=null)el.setSelectionRange(k.s,k.e);}catch(e){}}}
function navHTML(v){
 const st=compute();const nq=queueItems().length;const r=S.route;
 const rq=v==="inbox"?(isQueue(r.id)?r.id:(S.box.queue||"all")):null;
 const item=(k,icon,t,ct,hot)=>`<a class="nv" href="#/${k}" ${v===k?'aria-current="page"':""} title="${t}">${ic(icon)}<span class="t">${t}</span>${ct?`<span class="ct${hot?" hot":""}">${ct}</span>`:""}</a>`;
 const sub=(href,t,ct,cur,dot,hot)=>`<a class="nv sub" href="${href}" ${cur?'aria-current="page"':""}>${dot?`<span class="ldot" style="background:${dot}"></span>`:""}<span class="t">${esc(t)}</span>${ct?`<span class="ct${hot?" hot":""}">${ct}</span>`:""}</a>`;
 const grp=(k,icon,t,href,active,ct,hot,kids)=>{const open=S.navOpen[k]??(active||k==="inbox"||k==="dashboard");
  return `<div class="ng${active?" act":""}"><div class="nvh"><a class="nv" href="${href}" ${active&&!open?'aria-current="page"':""} title="${t}">${ic(icon)}<span class="t">${t}</span>${ct&&!open?`<span class="ct${hot?" hot":""}">${ct}</span>`:""}</a><button class="nv-tg" data-a="navtg" data-v="${k}" aria-expanded="${open}" aria-label="${open?"Hide":"Show"} ${t} sections"><svg class="i" viewBox="0 0 24 24" style="transform:rotate(${open?0:-90}deg)">${I.chev}</svg></button></div>${open?`<div class="nsub">${kids()}</div>`:""}</div>`;};
 const sg=taskSuggestions().length,ot=openTasks().length;
 const topic=(S.set.buckets||[]).length?bucketData("topic"):[];
 return `<nav class="nav" aria-label="Main">
  <div class="logo"><span class="mark">W</span><span class="w">Workbench</span></div>
  <div class="nav-sc">
  ${grp("dashboard","grid","Dashboard","#/dashboard",v==="dashboard"||v==="buckets",st.today.length||"",false,()=>sub("#/dashboard","Overview","",v==="dashboard")+sub("#/buckets","Buckets",topic.length||"",v==="buckets"))}
  ${grp("inbox","inbox","Inbox","#/inbox/all",v==="inbox",st.open.length+st.ready.length||"",false,()=>
   QUEUES.map(([k,l])=>sub(`#/inbox/${k}`,l,k==="done"?"":queueCount(k)||"",rq===k,Q_DOT[k],k==="approval"&&queueCount(k)>0)).join("")
   +(topic.length?`<div class="lbl3">Buckets</div>`+topic.map(d=>sub(`#/inbox/g-${d.b.id}`,d.b.name,d.active.length||"",rq==="g-"+d.b.id,d.b.color)).join(""):""))}
  ${grp("tasks","task","Tasks","#/tasks",v==="tasks",sg||ot||"",sg>0,()=>sub("#/tasks","To do",ot||"",v==="tasks"&&!r.id)+sub("#/tasks/suggested","Suggested",sg||"",v==="tasks"&&r.id==="suggested",null,sg>0)+sub("#/tasks/done","Done","",v==="tasks"&&r.id==="done"))}
  ${item("agents","bot","Agents",nq||"",nq>0)}
  <div class="sep"></div>
  ${item("priorities","sliders","Priorities")}
  ${item("activity","list","Activity")}
  ${item("accounts","user","Accounts")}
  </div>
  <div class="bottom">
   ${S.accounts.length?(S.accounts.some(a=>a.error)?`<a class="mb mbs" href="#/accounts">${ic("info")}<span class="e">A mailbox needs reconnecting</span><span class="sdot err"></span></a>`:""):`<a class="mb mbs" href="#/connect">${ic("plus")}<span class="e">Connect email</span></a>`}
   ${S.mode==="demo"?`<button class="mb" data-a="exitdemo" title="Leave the demo">${ic("back")}<span class="e mbs">Exit demo</span></button>`:""}
  </div></nav>`;
}
function vBuckets(){return topHTML("Buckets")+`<div class="page bpage">${bannersHTML()}${bucketsHTML()}</div>`;}
function topHTML(title,actions="",sub=""){
 return `<header class="top${sub?" tall":""}"><div class="top-in"><h1>${title}</h1><span id="topstatus">${statusHTML()}</span>${actions}
  ${live()?`<button class="ib" data-a="sync" aria-label="Check mail" title="Check mail" ${S.syncing?"disabled":""}>${ic("sync")}</button>`:""}
  <button class="btn pri sm" data-a="compose">${ic("pen")}<span>Compose</span></button></div>${sub}</header>`;
}
function bannersHTML(){
 const b=[];
 if(S.mode==="demo")b.push(`<div class="banner">${ic("info")}Demo with a sample inbox. Actions stay in this browser and nothing is sent.<button class="btn link sm sp" data-a="exitdemo">Create an account</button></div>`);
 S.accounts.filter(a=>a.error).forEach(a=>b.push(`<div class="banner warn">${esc(a.email)} needs reconnecting.<a class="btn link sm sp" href="/api/auth/${a.provider}/start?hint=${encodeURIComponent(a.email)}">Reconnect</a></div>`));
 return b.join("");
}
const handledLabel=e=>({deleted:"In the Bin",done:"Done",letgo:"Archived",delegated:"Forwarded to "+e.delegatedTo,sent:"Reply sent"}[e.status]||"");
const emptyHTML=t=>`<div class="empty">${t}</div>`;
const emptyState=(icon,title,sub)=>`<div class="es"><span class="es-i">${ic(icon)}</span><b>${title}</b>${sub?`<span>${sub}</span>`:""}</div>`;
function rowHTML(e,opt={}){
 const c=e._c||score(e),a=c.a,name=dispName(e),lane=laneOf(e);const busy=S.busy.has(e.id);const handled=HANDLED.includes(e.status);
 const acts=handled?(e.status==="sent"||e.status==="delegated"?"":`<button data-a="reopen" data-id="${e.id}" aria-label="${e.status==="deleted"?"Restore":"Move back to inbox"}" title="${e.status==="deleted"?"Restore from the Bin":"Move back to inbox"}">${ic("back")}</button>`)
  :e.status==="ready"?`<button data-a="openmail" data-v="reply" data-id="${e.id}" aria-label="Review and send" title="Review and send">${ic("send")}</button>`
  :`<button data-a="q-done" data-id="${e.id}" aria-label="Done" title="Done (archives it)">${ic("check")}</button><button data-a="q-letgo" data-id="${e.id}" aria-label="Archive" title="Archive (no reply needed)">${ic("letgo")}</button><button data-a="q-pin" data-id="${e.id}" aria-label="${e.pinned?"Unpin":"Pin to Do today"}" title="${e.pinned?"Unpin":"Pin to Do today"}">${ic("pin")}</button><button data-a="addtask" data-id="${e.id}" aria-label="Add task" title="Add task">${ic("task")}</button>${(S.set.buckets||[]).length?`<button data-a="movepop" data-id="${e.id}" aria-label="Move to bucket" title="Move to another bucket">${ic("move")}</button>`:""}<button data-a="q-delete" data-id="${e.id}" aria-label="Delete" title="Delete (moves to the Bin)">${ic("trash")}</button>`;
 const sub=handled?esc(handledLabel(e)):`${a.project&&a.project!=="General"?`<button class="tag" data-a="project" data-v="${esc(a.project)}">${esc(a.project)}</button>`:""}<span style="overflow:hidden;text-overflow:ellipsis">${esc(a.ask&&a.ask!=="Nothing"?a.ask:a.summary||e.snippet||"")}</span>`;
 const badge=handled?"":e.status==="ready"?`<span class="pill p-ready" data-tip="A reply draft is saved in your mailbox">Draft</span>`:`<span class="score ${lane} num" data-tip="score:${e.id}">${e.by==="ai"||!live()||!S.ai.enabled?c.s.toFixed(1):"·"}</span>`;
 const tc=tasksFor(e.id).length;
 return `<div class="row${busy?" busy":""}${opt.sel?" sel":""}${e.unread&&!handled?" unread":""}" data-a="${opt.mail?"selmail":"openmail"}" data-id="${e.id}"${opt.q?` data-q="${esc(opt.q)}"`:""} tabindex="0" title="${opt.mail?"":"Open in Inbox"}">
  <div class="av" style="background:${avColor(name)}" aria-hidden="true">${esc(initials(name))}</div>
  <div class="tx"><div class="l1"><span class="who" data-a="sender" data-v="${esc(name)}" data-tip="sender:${esc(name)}">${esc(name)}</span>${e.unread&&!handled?`<span class="udot" title="Unread"></span>`:""}${tc?`<span class="tcnt" data-tip="${esc(tasksFor(e.id).map(t=>t.title).join(" · "))}">${ic("task")}${tc}</span>`:""}${e.pinned?`<span class="pin" title="Pinned">${ic("pin")}</span>`:""}<span class="when" data-tip="${esc(fullDate(e.date))}">${when(e.date)}</span></div>
   <div class="sub">${esc(e.subject)}</div><div class="sum">${sub}</div></div>
  <div class="rt"><div class="qa">${acts}</div>${badge}</div></div>`;
}

/* ================= auth & onboarding ================= */
function authErrText(p){return ({not_configured:`Sign-in with ${p.get("provider")==="microsoft"?"Microsoft":"Google"} isn't set up on this server yet.`,access_denied:"You cancelled the sign-in.",state_mismatch:"That sign-in expired. Please try again.",connect_failed:"Workbench couldn't connect that account. Please try again.",no_email:"That account didn't share an email address.",already_linked:"That mailbox is already connected to a different Workbench account.",missing_scopes:"Workbench needs permission to read and send mail. Try again and tick both Gmail boxes on Google's permission screen."})[p.get("error")]||(p.get("error")?"Something went wrong connecting that account. Please try again.":"");}
function authHTML(){
 const signup=S.route.view==="signup";
 const p=new URLSearchParams(location.search);
 const err=S.authErr||authErrText(p);
 return `<div class="auth">
  <section class="brand"><div class="logo"><span class="mark">W</span>Workbench</div>
   <div style="display:flex;flex-direction:column;gap:18px"><h1>Tackle email strategically.</h1><p>Connect every inbox you use. Workbench scores each email for urgency, importance and effort, lets your agents handle the routine, and shows you only what deserves you today.</p></div>
   <div class="pts"><div>${ic("target")}<span>A Today list sized to the time you actually have.</span></div><div>${ic("bot")}<span>Agents you instruct in plain language, with approval before they act.</span></div><div>${ic("shield")}<span>Nothing is sent or deleted without your say-so. Every action can be reviewed.</span></div></div>
  </section>
  <section class="side"><form class="authcard" id="authform" novalidate>
   <div><h2>${signup?"Create your account":"Sign in"}</h2><p class="muted" style="margin-top:6px">${signup?"Then connect Gmail or Outlook. You can add several mailboxes.":"Welcome back."}</p></div>
   <a class="oauth" href="/api/auth/google/start"><span class="pv" style="background:${PV.google.c}">G</span>Continue with Google</a>
   <a class="oauth" href="/api/auth/microsoft/start"><span class="pv" style="background:${PV.microsoft.c}">O</span>Continue with Microsoft</a>
   <div class="or">or with email</div>
   ${signup?`<div class="fld"><label class="lbl" for="au-name">Name</label><input class="in" id="au-name" autocomplete="name" placeholder="Maya Okafor"></div>`:""}
   <div class="fld"><label class="lbl" for="au-email">Email</label><input class="in" id="au-email" type="email" autocomplete="email" placeholder="you@company.com"></div>
   <div class="fld"><label class="lbl" for="au-pw">Password</label><input class="in" id="au-pw" type="password" autocomplete="${signup?"new-password":"current-password"}" placeholder="${signup?"At least 10 characters":""}"></div>
   ${err?`<p class="err" role="alert">${esc(err)}</p>`:""}
   <button class="btn pri lg" type="submit" ${S.authBusy?"disabled":""}>${S.authBusy?"Please wait…":signup?"Create account":"Sign in"}</button>
   <p class="note" style="text-align:center">${signup?`Already have an account? <a href="#/login">Sign in</a>`:`New to Workbench? <a href="#/signup">Create an account</a>`}</p>
   <div class="or">or</div>
   <button class="btn lg" type="button" data-a="demo">${ic("play")}Try the demo inbox</button>
   <p class="fine">Workbench reads your recent inbox to sort it and only sends when you, or an agent you allowed, say so. <a href="/privacy">Privacy</a></p>
  </form></section></div>`;
}
function vConnect(){
 return topHTML("Connect your email")+`<div class="page"><div class="onb">
  <div><h2 class="hero">Connect the inboxes you want Workbench to sort.</h2><p class="muted" style="margin-top:8px;max-width:60ch">Add as many as you like. Workbench reads the last two weeks of each inbox, and can archive, label, draft and send on your instruction.</p></div>
  <div class="prov">
   <a class="provc" href="/api/auth/google/start"><span class="pv" style="background:${PV.google.c}">G</span><b>Gmail</b><span class="note">Google Workspace or personal Gmail</span></a>
   <a class="provc" href="/api/auth/microsoft/start"><span class="pv" style="background:${PV.microsoft.c}">O</span><b>Outlook</b><span class="note">Microsoft 365, Outlook.com or Hotmail</span></a>
   <div class="provc dis" data-tip="Yahoo needs an app password over IMAP, which isn't supported yet. You can forward Yahoo mail to a connected Gmail address."><span class="pv" style="background:#6001d2">Y</span><b>Yahoo</b><span class="note">Coming later</span></div>
  </div>
  ${S.accounts.length?`<div class="card"><div class="card-h"><h3>Connected</h3></div><div class="card-b">${S.accounts.map(a=>`<div style="display:flex;gap:10px;align-items:center"><span class="pv" style="background:${pv(a.provider).c}">${pv(a.provider).l}</span>${esc(a.email)}</div>`).join("")}</div></div>`:""}
  <div><a class="btn" href="#/dashboard">${S.accounts.length?"Go to dashboard":"Skip for now"}</a></div>
 </div></div>`;
}

/* ================= dashboard ================= */
/* ---------- dashboard helpers ---------- */
const FREE_DOMAINS=["gmail.com","googlemail.com","outlook.com","hotmail.com","live.com","yahoo.com","icloud.com","me.com","proton.me","protonmail.com"];
const orgOf=e=>{const d=(e.fromEmail.split("@")[1]||"").toLowerCase();if(!d)return "Unknown";if(FREE_DOMAINS.includes(d))return "Personal addresses";const parts=d.replace(/^(mail|email|e|notifications?|noreply|no-reply|it|news|newsletter)\./,"").split(".");return parts.length>2?parts.slice(-3).join("."):d;};
const DIMS=[["project","Project"],["type","Type"],["org","Organisation"],["mailbox","Mailbox"]];
function groupKey(dim,e){
 if(dim==="project")return (e._c||score(e)).a.project||"General";
 if(dim==="type")return TYPE_L[(e._c||score(e)).a.type]||"Other";
 if(dim==="mailbox"){const a=accById(e.accountId);return a?a.email:"Unknown";}
 return orgOf(e);
}
function breakdown(dim){
 const st=compute();const g={};
 st.open.forEach(e=>{const k=groupKey(dim,e);const x=g[k]=g[k]||{k,list:[],now:0,plan:0,delegate:0,letgo:0,min:0,dec:0,score:0};
  x.list.push(e);x[laneOf(e)]++;if(laneOf(e)!=="letgo")x.min+=(e._c.a.min||5);if(e._c.a.type==="decision")x.dec++;x.score+=e._c.s;});
 return Object.values(g).sort((a,b)=>(b.now-a.now)||((b.now+b.plan+b.delegate)-(a.now+a.plan+a.delegate))||(b.list.length-a.list.length));
}
function weekSeries(){
 const days=[];for(let i=6;i>=0;i--){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-i);days.push(d);}
 return days.map(d=>{const n=new Date(d);n.setDate(n.getDate()+1);
  const inRange=iso=>{if(!iso)return false;const t=new Date(iso);return t>=d&&t<n;};
  return {d,received:S.emails.filter(e=>inRange(e.date)).length,handled:S.emails.filter(e=>inRange(e.handledAt)).length,agents:S.log.filter(l=>l.agentId&&!l.undone&&inRange(l.t)).reduce((s,l)=>s+((l.emailIds||[]).length||1),0)};});
}
function weekChart(){
 const s=weekSeries();const max=Math.max(4,...s.map(x=>Math.max(x.received,x.handled)));
 const W=360,H=150,pl=26,pb=22,pt=8,bw=14,step=(W-pl-8)/7;const y=v=>pt+(H-pt-pb)*(1-v/max);
 const ticks=[0,Math.round(max/2),max];
 let g=`<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Emails received and handled over the last 7 days">`;
 ticks.forEach(t=>{g+=`<line x1="${pl}" x2="${W-4}" y1="${y(t)}" y2="${y(t)}" class="gl"/><text x="${pl-6}" y="${y(t)+3}" text-anchor="end" class="ax">${t}</text>`;});
 s.forEach((x,i)=>{const cx=pl+step*i+step/2;const lab=x.d.toLocaleDateString("en-GB",{weekday:"short"});
  g+=`<g data-tip="${esc(`${x.d.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"short"})}: ${x.received} received, ${x.handled} handled (${x.agents} by agents)`)}"><rect x="${cx-step/2}" y="${pt}" width="${step}" height="${H-pt-pb}" fill="transparent"/>
   <rect x="${cx-bw-1}" y="${y(x.received)}" width="${bw}" height="${Math.max(0,H-pb-y(x.received))}" rx="3" class="b-in"/>
   <rect x="${cx+1}" y="${y(x.handled)}" width="${bw}" height="${Math.max(0,H-pb-y(x.handled))}" rx="3" class="b-out"/>
   <text x="${cx}" y="${H-6}" text-anchor="middle" class="ax${i===6?" now":""}">${i===6?"Today":lab}</text></g>`;});
 return g+`</svg><div class="legend"><span><i class="b-in"></i>Received</span><span><i class="b-out"></i>Handled</span></div>`;
}
function breakdownCard(){
 const dim=S.dim||"project";const rows=breakdown(dim);const max=Math.max(1,...rows.map(r=>r.list.length));
 const tipList=list=>"list:"+list.slice().sort((a,b)=>b._c.s-a._c.s).slice(0,5).map(e=>e.id).join(",");
 return `<section class="card"><div class="card-h"><h3>Where your attention goes</h3><span class="sp"><div class="seg">${DIMS.map(([k,v])=>`<button data-a="dim" data-v="${k}" aria-pressed="${dim===k}">${v}</button>`).join("")}</div></span></div>
  <div class="bk">${rows.length?`<div class="bk-h"><span>${esc(DIMS.find(d=>d[0]===dim)[1])}</span><span>Open by lane</span><span class="r1">Do today</span><span class="r1">Time</span></div>`+rows.slice(0,S.showAllDims?rows.length:8).map(r=>{
   const seg=k=>r[k]?`<i style="width:${r[k]/max*100}%;background:${LANE_C[k]}" data-tip="${r[k]} ${LANE[k]}"></i>`:"";
   return `<button class="bk-r" data-a="bkopen" data-v="${esc(r.k)}" data-tip="${tipList(r.list)}"><span class="bk-n"><span>${esc(r.k)}</span><span class="note">${r.list.length} open${r.dec?` · ${r.dec} decision${r.dec>1?"s":""}`:""}</span></span><span class="stack">${seg("now")}${seg("plan")}${seg("delegate")}${seg("letgo")}</span><span class="r1 num ${r.now?"hot":""}">${r.now||"·"}</span><span class="r1 num">${r.min?fmtMin(r.min):"·"}</span></button>`;}).join("")
   +(rows.length>8&&!S.showAllDims?`<button class="more" data-a="alldims">Show all ${rows.length}</button>`:""):emptyState("grid","Nothing to break down","Open email will be grouped here by project, type, organisation or mailbox.")}</div>
  <div class="legend" style="padding:0 16px 14px">${["now","plan","delegate","letgo"].map(k=>`<span><i style="background:${LANE_C[k]}"></i>${LANE[k]}</span>`).join("")}</div></section>`;
}
/* ---------- dates ---------- */
const DAYMS=864e5;
const ymd=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const todayKey=()=>ymd(new Date());
const isoDay=off=>{const d=new Date();d.setDate(d.getDate()+off);return ymd(d);};
const fmtDay=d=>new Date(d+"T12:00:00").toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"});
function dueLabel(due){if(!due)return "";const t=todayKey();if(due<t)return "Overdue · "+fmtDay(due);if(due===t)return "Today";if(due===isoDay(1))return "Tomorrow";return fmtDay(due);}
const dueLow=due=>{const d=dueLabel(due);return /^(Today|Tomorrow)$/.test(d)?d.toLowerCase():d;};
const dueCls=due=>!due?"":due<todayKey()?"over":due===todayKey()?"today":"";
const TPL={request:["request","requests"],decision:["decision","decisions"],meeting:["meeting request","meeting requests"],fyi:["FYI","FYIs"],notification:["notification","notifications"],newsletter:["newsletter","newsletters"],sales:["sales email","sales emails"]};
const plural=(t,c)=>`${c} ${(TPL[t]||["email","emails"])[c===1?0:1]}`;
const shortSubj=s=>String(s).replace(/^(re|fwd?):\s*/i,"").split(/[:–]/)[0].trim().slice(0,48);

/* ---------- tasks ---------- */
const TSTAT={open:"To do",in_progress:"In progress",done:"Done"};
const isActive=t=>t.status==="open"||t.status==="in_progress";
const linkIds=t=>Array.isArray(t.emailIds)&&t.emailIds.length?t.emailIds:t.emailId?[t.emailId]:[];
const openTasks=()=>S.tasks.filter(isActive);
const tasksFor=id=>S.tasks.filter(t=>isActive(t)&&linkIds(t).includes(id));
const isDoneToday=t=>t.status==="done"&&t.doneAt&&isToday(t.doneAt);
const kept=t=>isActive(t)||(t.status==="done"&&(S.keepTasks.has(t.id)||isDoneToday(t)));
const shownTasksFor=id=>S.tasks.filter(t=>kept(t)&&linkIds(t).includes(id));
const taskOrder=(a,b)=>(a.due||"9999").localeCompare(b.due||"9999")||a.createdAt.localeCompare(b.createdAt);
function taskSuggestions(){
 const keys=new Set(S.tasks.map(t=>t.key).filter(Boolean));
 return S.emails.filter(e=>OPEN(e)||e.status==="ready").flatMap(e=>((e.ai&&e.ai.tasks)||[]).map((t,i)=>({key:e.id+":"+i,emailId:e.id,title:t.title,due:t.due||null}))).filter(s=>s.title&&!keys.has(s.key));
}
const suggestionsFor=id=>taskSuggestions().filter(s=>s.emailId===id);
const newTaskObj=o=>{const t=Object.assign({id:"t"+uid(),emailId:null,emailIds:[],title:"",notes:"",due:null,status:"open",source:"user",key:null,createdAt:new Date().toISOString(),doneAt:null},o||{});if(t.emailId&&!t.emailIds.length)t.emailIds=[t.emailId];t.emailId=t.emailIds[0]||null;return t;};
function normTask(t){t.emailIds=linkIds(t);t.emailId=t.emailIds[0]||null;return t;}
async function persistTask(t){
 normTask(t);if(!live()){markSaved();return;}
 try{const r=await api("/api/tasks",{task:t});const j=S.tasks.findIndex(x=>x.id===t.id);if(j>=0&&r.task){const keep=S.tasks[j];keep.emailIds=r.task.emailIds;keep.emailId=r.task.emailId;keep.createdAt=r.task.createdAt;keep.doneAt=r.task.doneAt;}markSaved();}catch(err){toast(err.message);}
}
async function saveTask(t,msg){
 normTask(t);const i=S.tasks.findIndex(x=>x.id===t.id);if(i>=0)S.tasks[i]=t;else S.tasks.unshift(t);
 render();if(msg)toast(msg);await persistTask(t);
}
async function approveSuggestion(key,edits){
 const s=taskSuggestions().find(x=>x.key===key);if(!s)return;
 await saveTask(newTaskObj({emailIds:[s.emailId],title:(edits&&edits.title)||s.title,due:edits&&"due" in edits?edits.due:s.due,source:"ai",key:s.key}),"Task added");
}
async function dismissSuggestion(key){const s=taskSuggestions().find(x=>x.key===key);if(!s)return;await saveTask(newTaskObj({emailIds:[s.emailId],title:s.title,status:"dismissed",source:"ai",key}),"Suggestion dismissed");}
async function setTaskStatus(id,st){
 const t=S.tasks.find(x=>x.id===id);if(!t||t.status===st)return;if(st==="done")S.keepTasks.add(id);
 await saveTask(Object.assign({},t,{status:st,doneAt:st==="done"?new Date().toISOString():null}),{done:"Task done",in_progress:"Marked in progress",open:"Moved back to to do"}[st]);
}
const toggleTask=id=>{const t=S.tasks.find(x=>x.id===id);if(t)return setTaskStatus(id,t.status==="done"?"open":"done");};
async function deleteTask(id){S.tasks=S.tasks.filter(x=>x.id!==id);if(S.taskOpen===id)S.taskOpen=null;render();toast("Task deleted");if(live())api(`/api/tasks/${encodeURIComponent(id)}`,null,"DELETE").catch(err=>toast(err.message));}
function linkCandidates(t){
 const have=new Set(linkIds(t));
 return S.emails.filter(e=>!have.has(e.id)).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,150);
}
function taskRowHTML(t){
 const ids=linkIds(t);const es=ids.map(byId).filter(Boolean);const e=es[0];const dl=dueLabel(t.due);const openRow=S.taskOpen===t.id;const st=t.status;
 const head=`<div class="tk-row" data-a="taskopen" data-id="${t.id}" role="button" tabindex="0" aria-expanded="${openRow}" title="${openRow?"Collapse":"Open task details"}">
  <button class="tkc${st==="in_progress"?" half":""}" role="checkbox" aria-checked="${st==="done"}" aria-label="${st==="done"?"Mark not done":"Mark done"}" data-a="tasktoggle" data-id="${t.id}">${st==="done"?ic("check"):""}</button>
  <div class="tkx"><div class="tkt">${esc(t.title)}</div><div class="tkm">${st==="in_progress"?`<span class="tst prog">In progress</span>`:""}${dl?`<span class="due ${st==="done"?"":dueCls(t.due)}">${esc(dl)}</span>`:""}${e?`<span class="tag" data-tip="${esc(es.map(x=>dispName(x)+": "+x.subject).join(" · "))}">${ic("mail")}<span class="tg-t">${esc(e.subject)}</span>${es.length>1?`<b class="num">+${es.length-1}</b>`:""}</span>`:""}${t.source==="ai"?`<span class="tag" data-tip="Suggested by Claude and approved by you">${ic("spark")}Claude</span>`:""}${t.notes&&!openRow?`<span class="tag" data-tip="${esc(t.notes.slice(0,300))}">${ic("list")}Notes</span>`:""}</div></div>
  <span class="tk-chev" aria-hidden="true"><svg class="i" viewBox="0 0 24 24" style="transform:rotate(${openRow?180:0}deg)">${I.chev}</svg></span></div>`;
 if(!openRow)return `<div class="tk${st==="done"?" done":""}">${head}</div>`;
 const cands=linkCandidates(t);
 return `<div class="tk open${st==="done"?" done":""}">${head}
  <div class="tk-body">
   <div class="fld"><label class="lbl" for="tf-title-${t.id}">Task</label><input class="in" id="tf-title-${t.id}" data-tf="title" data-id="${t.id}" value="${esc(t.title)}"></div>
   <div class="form" style="gap:12px">
    <div class="fld"><span class="lbl">Progress</span><div class="seg">${Object.entries(TSTAT).map(([k,v])=>`<button data-a="tkstatus" data-id="${t.id}" data-v="${k}" aria-pressed="${st===k}">${v}</button>`).join("")}</div></div>
    <div class="fld"><label class="lbl" for="tf-due-${t.id}">Due</label><input class="in" type="date" id="tf-due-${t.id}" data-tf="due" data-id="${t.id}" value="${esc(t.due||"")}" style="max-width:190px"></div>
   </div>
   <div class="fld"><label class="lbl" for="tf-notes-${t.id}">Description</label><textarea id="tf-notes-${t.id}" data-tf="notes" data-id="${t.id}" style="min-height:96px" placeholder="Add details, steps or progress notes">${esc(t.notes||"")}</textarea></div>
   <div class="fld"><span class="lbl">Linked emails <span class="num faint">${es.length}</span></span>
    ${es.length?`<div class="tk-links">${es.map(x=>`<div class="tk-link"><span class="av" style="width:26px;height:26px;font-size:10.5px;background:${avColor(dispName(x))}">${esc(initials(dispName(x)))}</span><button class="tk-lt" data-a="openmail" data-id="${x.id}" title="Open this email"><span class="who">${esc(dispName(x))} · ${when(x.date)}</span><span class="sub">${esc(x.subject)}</span></button><button class="ib" style="width:28px;height:28px" data-a="tkunlink" data-id="${t.id}" data-v="${x.id}" aria-label="Unlink this email" title="Unlink">${ic("x")}</button></div>`).join("")}</div>`:`<p class="note">No emails linked yet.</p>`}
    ${cands.length?`<select class="in" id="tf-link-${t.id}" data-tl="${t.id}" aria-label="Link another email"><option value="">Link another email…</option>${cands.map(x=>`<option value="${x.id}">${esc(dispName(x))}: ${esc(x.subject.slice(0,70))}</option>`).join("")}</select>`:""}
   </div>
   <div class="tk-foot"><span class="note">${t.source==="ai"?"Suggested by Claude, approved by you · ":""}Added ${when(t.createdAt)}${st==="done"&&t.doneAt?` · Done ${when(t.doneAt)}`:""} · <span id="savedmark">Changes save automatically</span></span><span class="sp"></span><button class="btn sm danger" data-a="deltask" data-id="${t.id}">Delete</button><button class="btn sm" data-a="taskopen" data-id="${t.id}">Close</button></div>
  </div></div>`;
}
function suggestionHTML(s,opts={}){
 const e=byId(s.emailId);const ed=S.tsEdit===s.key;
 return `<div class="ts">
  <span class="tsi" aria-hidden="true">${ic("spark")}</span>
  <div class="tkx">${ed?`<div class="form" style="grid-template-columns:minmax(0,1fr) 170px;gap:8px"><input class="in" id="tse-title" value="${esc(s.title)}" aria-label="Task title"><input class="in" id="tse-due" type="date" value="${esc(s.due||"")}" aria-label="Due date"></div>`:`<div class="tkt">${esc(s.title)}</div>`}
   <div class="tkm">${s.due&&!ed?`<span class="due ${dueCls(s.due)}">${esc(dueLabel(s.due))}</span>`:""}${e&&!opts.noEmail?`<button class="tag" data-a="openmail" data-id="${e.id}" data-tip="${esc(dispName(e)+": "+e.subject)}">${ic("mail")}<span class="tg-t">${esc(e.subject)}</span></button>`:""}<span class="note">Suggested task</span></div></div>
  <div class="tsa"><button class="btn pri sm" data-a="tsapprove" data-v="${esc(s.key)}">${ic("check")}${ed?"Add task":"Approve"}</button>${ed?`<button class="btn sm" data-a="tscancel">Cancel</button>`:`<button class="btn sm" data-a="tsedit" data-v="${esc(s.key)}">Edit</button>`}<button class="btn sm" data-a="tsdismiss" data-v="${esc(s.key)}">Dismiss</button></div></div>`;
}
function vTasks(){
 const tab=S.route.id==="suggested"||S.route.id==="done"?S.route.id:"todo";
 const sugg=taskSuggestions();const open=S.tasks.filter(t=>isActive(t)||(t.status==="done"&&S.keepTasks.has(t.id))).sort(taskOrder);const todo=open.filter(isActive);const prog=todo.filter(t=>t.status==="in_progress");
 const done=S.tasks.filter(t=>t.status==="done").sort((a,b)=>(b.doneAt||"").localeCompare(a.doneAt||""));
 const over=todo.filter(t=>t.due&&t.due<todayKey()),dueT=todo.filter(t=>t.due===todayKey()),week=todo.filter(t=>t.due&&t.due>=todayKey()&&t.due<=isoDay(7));
 const stat=(k,n,s,cls)=>`<div class="stat${cls?" "+cls:""}"><span class="k">${k}</span><span class="n">${n}</span><span class="s">${esc(s)}</span></div>`;
 const title={todo:"Tasks",suggested:"Suggested tasks",done:"Done tasks"}[tab];
 let body;
 if(tab==="suggested")body=`<section class="card"><div class="card-h"><h3>${ic("spark")}Suggested by Claude <span class="num faint">${sugg.length}</span></h3></div>
    <div class="card-b" style="padding-bottom:4px"><p class="note">Claude suggests tasks as it sorts your mail. Nothing goes on your list until you approve it.</p></div>
    <div class="tkl">${sugg.map(s=>suggestionHTML(s)).join("")||emptyState("spark","No suggestions right now","Claude suggests tasks as it sorts new mail.")}</div></section>`;
 else if(tab==="done")body=`<section class="card"><div class="card-h"><h3>Done <span class="num faint">${done.length}</span></h3></div><div class="tkl">${done.map(taskRowHTML).join("")||emptyState("check","Nothing finished yet","Tasks you tick off appear here.")}</div></section>`;
 else body=`<div class="stats">${stat("To do",todo.length,todo.length?`${prog.length} in progress · ${todo.filter(t=>!t.due).length} without a date`:"Nothing on your list")}${stat("Due today",dueT.length,dueT[0]?dueT[0].title:"Nothing due today",dueT.length?"hot":"")}${stat("Overdue",over.length,over[0]?over[0].title:"All on time",over.length?"hot":"")}${stat("Due this week",week.length,week[0]?week[0].title:"Nothing else this week")}</div>
  ${sugg.length?`<a class="infobox tnudge" href="#/tasks/suggested">${ic("spark")}<span>Claude suggested <b>${sugg.length}</b> task${sugg.length>1?"s":""} from your mail. Review them</span>${ic("right")}</a>`:""}
  <section class="card"><div class="card-h"><h3>To do <span class="num faint">${todo.length}${open.length>todo.length?` · ${open.length-todo.length} just done`:""}</span></h3><span class="sp"><span class="note">Click a task to open it</span></span></div><div class="tkl">${open.map(taskRowHTML).join("")||emptyState("task","No tasks. All clear!","Add one from any email, or approve one of Claude's suggestions.")}</div></section>`;
 return topHTML(title,`<button class="btn sm" data-a="newtask">${ic("plus")}New task</button>`)+`<div class="page tpage">${bannersHTML()}${body}</div>`;
}

/* ---------- buckets ---------- */
const BK_COLORS=["#0a84ff","#5e5ce6","#30b0c7","#34c759","#ff9f0a","#ff375f","#af52de","#ac8e68"];
const OTHER={id:"other",name:"Everything else",description:"Email that isn't in any other bucket.",color:"#8e8e93",system:true,projects:[],senders:[],keywords:[],types:[],include:[],exclude:[]};
const newBucket=o=>Object.assign({id:"b"+uid(),name:"New bucket",description:"",color:BK_COLORS[(S.set.buckets||[]).length%BK_COLORS.length],projects:[],senders:[],keywords:[],types:[],include:[],exclude:[],source:"user",kept:true},o||{});
const escRe=s=>String(s).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
function bMatch(b,e){
 if(!e||(b.exclude||[]).includes(e.id))return false;const a=(e._c||score(e)).a;
 if((b.types||[]).includes(a.type))return true;
 if((b.projects||[]).some(p=>p&&(a.project||"").toLowerCase()===String(p).toLowerCase()))return true;
 const from=(e.fromName+" "+e.fromEmail).toLowerCase();if((b.senders||[]).some(s=>s&&from.includes(String(s).toLowerCase())))return true;
 const txt=e.subject+" "+(a.summary||"")+" "+(e.body||e.snippet||"");return (b.keywords||[]).some(k=>k&&new RegExp("\\b"+escRe(k)+"\\b","i").test(txt));
}
function bucketIdOf(e){const B=S.set.buckets||[];for(const b of B)if((b.include||[]).includes(e.id))return b.id;for(const b of B)if(bMatch(b,e))return b.id;return "other";}
const bucketById=id=>id==="other"?OTHER:(S.set.buckets||[]).find(b=>b.id===id);
const STATUS=[["urgent","Urgent","var(--now)"],["approval","For approval","var(--accent)"],["ready","Drafts ready","var(--ready)"],["todo","To do","var(--plan)"],["delegate","Hand off","var(--del)"],["low","Low priority","var(--go)"],["done","Done this week","var(--faint)"]];
const statusCtx=()=>({q:new Set(queueItems().map(x=>x.e.id)),s:new Set(taskSuggestions().map(s=>s.emailId))});
const hasApproval=(e,ctx)=>(OPEN(e)||e.status==="ready")&&(ctx.q.has(e.id)||ctx.s.has(e.id));
function statusOf(e,ctx){
 if(OPEN(e)&&e._today)return "urgent";
 if(hasApproval(e,ctx))return "approval";
 if(e.status==="ready")return "ready";if(HANDLED.includes(e.status))return "done";if(tasksFor(e.id).length||e._lane==="plan")return "todo";if(e._lane==="delegate")return "delegate";return "low";
}
const BVIEWS=[["topic","Topic","Your buckets: projects, clients and kinds of mail"],["urgency","Urgency","How soon each email needs you, from its urgency score"],["importance","Importance","How much each email matters, from its importance score"],["effort","Effort","How long each email will take to deal with"],["type","Type","What each email asks of you"],["mailbox","Mailbox","Which mailbox it arrived in"]];
/* Groups for every view except Topic. Each email goes into the first group it fits. */
function viewGroups(view){
 const g=(id,name,description,color,test)=>({id:view+"-"+id,name,description,color,system:true,virtual:true,test});
 const sc=e=>e._c||score(e);
 if(view==="urgency")return [g("4","Very urgent","Needs you today, or something slips.","#ff3b30",e=>sc(e).U>=8),g("3","Urgent","Time-sensitive this week.","#ff9f0a",e=>sc(e).U>=6),g("2","Can wait a bit","Has a deadline, but not a close one.","#0a84ff",e=>sc(e).U>=4),g("1","Not urgent","No time pressure.","#8e8e93",()=>true)];
 if(view==="importance")return [g("4","Critical","Big consequences for you or your team.","#af52de",e=>sc(e).I>=8),g("3","High","Matters to your goals this week.","#5e5ce6",e=>sc(e).I>=6),g("2","Medium","Worth doing when you can.","#30b0c7",e=>sc(e).I>=4),g("1","Low","Little is lost if it waits.","#8e8e93",()=>true)];
 if(view==="effort")return [g("1","Quick","5 minutes or less. Good for gaps between meetings.","#34c759",e=>(sc(e).a.min||5)<=5),g("2","Short","Up to 15 minutes.","#0a84ff",e=>(sc(e).a.min||5)<=15),g("3","Longer","More than 15 minutes. Block time for these.","#ff9f0a",()=>true)];
 if(view==="type")return TYPES.map((t,i)=>g(t,(TPL[t]||[t,t+"s"])[1].replace(/^./,c=>c.toUpperCase()),{request:"Someone wants you to do something.",decision:"Someone is waiting on your decision.",meeting:"Invites and scheduling.",fyi:"For your information. Nothing is asked.",notification:"Automated updates from tools.",newsletter:"Newsletters and digests.",sales:"Sales and marketing."}[t]||"",BK_COLORS[i%BK_COLORS.length],e=>sc(e).a.type===t));
 if(view==="mailbox")return S.accounts.map(a=>g(a.id,a.email,`${a.provider==="microsoft"?"Outlook":"Gmail"} mailbox`,pv(a.provider).c,e=>e.accountId===a.id));
 return [];
}
const SCALE_VIEWS=["urgency","importance","effort"];
function bucketData(view){
 compute();view=view||"topic";const weekAgo=Date.now()-7*DAYMS;
 const V=view==="topic"?null:viewGroups(view);
 const B=V||[...(S.set.buckets||[]),OTHER];const map=new Map(B.map(b=>[b.id,{b,active:[],handled:[]}]));
 const gid=e=>{if(!V)return bucketIdOf(e);const x=V.find(b=>b.test(e));return x?x.id:null;};
 S.emails.forEach(e=>{const d=map.get(gid(e))||map.get("other");if(!d)return;if(OPEN(e)||e.status==="ready")d.active.push(e);else if(HANDLED.includes(e.status)&&e.handledAt&&new Date(e.handledAt)>weekAgo)d.handled.push(e);});
 const ctx=statusCtx();
 return [...map.values()].map(d=>{const a=d.active,o=a.filter(OPEN);
  d.unread=a.filter(e=>e.unread).length;d.urgent=o.filter(e=>e._today).length;d.approval=a.filter(e=>hasApproval(e,ctx)).length;
  d.tasks=a.reduce((s,e)=>s+tasksFor(e.id).length,0);d.ready=a.filter(e=>e.status==="ready").length;
  d.max=Math.max(0,...o.map(e=>e._c.s));d.prio=!o.length?"No":d.max>=6.5?"High":d.max>=4.5?"Medium":"Low";
  d.lanes={now:0,plan:0,delegate:0,letgo:0};o.forEach(e=>{d.lanes[laneOf(e)]++;});
  d.min=o.filter(e=>laneOf(e)!=="letgo").reduce((s,e)=>s+(e._c.a.min||5),0);return d;})
  .filter(d=>V?(SCALE_VIEWS.includes(view)||d.active.length||d.handled.length):(d.b.id!=="other"||d.active.length||d.handled.length));
}
const bucketHash=d=>hash(d.active.map(e=>e.id).sort().join(",")+"|"+d.b.name+"|"+(d.b.description||""));
function summaryFallback(d){
 const o=d.active.filter(OPEN);if(!o.length)return d.ready?`${d.ready} draft${d.ready>1?"s":""} ready to send.`:"Nothing open right now.";
 const top=o.slice().sort((x,y)=>y._c.s-x._c.s)[0];const ppl=[...new Set(o.map(e=>firstName(dispName(e))))].slice(0,3);
 const types={};o.forEach(e=>{types[e._c.a.type]=(types[e._c.a.type]||0)+1;});
 const tt=Object.entries(types).sort((x,y)=>y[1]-x[1]).slice(0,2).map(([t,n])=>plural(t,n)).join(" and ");
 const ask=top._c.a.ask&&top._c.a.ask!=="Nothing"?top._c.a.ask.replace(/[.?!]+$/,""):"";
 return `${tt[0].toUpperCase()+tt.slice(1)} from ${ppl.join(", ")}. Most pressing: ${shortSubj(top.subject)}${ask?` (${ask.length>70?ask.slice(0,70)+"…":ask})`:""}.`;
}
async function refreshSummaries(force,onlyId){
 if(S.sumBusy)return;S.set.bucketSummaries=S.set.bucketSummaries||{};
 const need=bucketData().filter(d=>(!onlyId||d.b.id===onlyId)&&d.active.length&&(force||!S.set.bucketSummaries[d.b.id]||S.set.bucketSummaries[d.b.id].h!==bucketHash(d)));
 if(!need.length)return;S.sumBusy=true;render();let res={};
 if(live()&&S.ai.enabled){try{res=(await api("/api/insights",{kind:"summaries",buckets:need.map(d=>({id:d.b.id,name:d.b.name,description:d.b.description,emailIds:d.active.slice().sort((x,y)=>score(y).s-score(x).s).slice(0,25).map(e=>e.id)}))})).summaries||{};}catch(err){if(force)toast(err.message);}}
 need.forEach(d=>{S.set.bucketSummaries[d.b.id]={h:bucketHash(d),text:res[d.b.id]||summaryFallback(d),by:res[d.b.id]?"ai":"basic",t:new Date().toISOString()};});
 S.sumBusy=false;saveSet();render();
}
function suggestBucketsBasic(){
 compute();const open=S.emails.filter(e=>OPEN(e)||e.status==="ready");const byP={};
 open.forEach(e=>{const p=(e._c||score(e)).a.project||"General";if(p!=="General")(byP[p]=byP[p]||[]).push(e);});
 const desc={"Q4 budget":"Budget sign-offs, forecasts and variance queries.","Client audit":"Audit evidence and next steps with the client.","Platform migration":"Cutover decisions, risks and engineering updates.","Hiring":"Candidates, interviews, offers and approvals.","Vendor renewals":"Supplier renewals and contract questions."};
 const out=Object.entries(byP).filter(([,l])=>l.length>=2).sort((a,b)=>b[1].length-a[1].length).slice(0,5).map(([p,l])=>({name:p,description:desc[p]||`Email about ${p}.`,projects:[p],senders:[],keywords:[],types:[],emailIds:l.map(e=>e.id)}));
 if(open.filter(e=>["newsletter","notification","sales"].includes((e._c||score(e)).a.type)).length>=2)out.push({name:"Automated and newsletters",description:"Notifications, newsletters and sales email.",projects:[],senders:[],keywords:[],types:["newsletter","notification","sales"],emailIds:[]});
 return out;
}
async function suggestBuckets(auto){
 if(S.bkBusy)return;S.bkBusy=true;render();let list=null;const existing=(S.set.buckets||[]).map(b=>b.name);
 if(live()&&S.ai.enabled){try{list=(await api("/api/insights",{kind:"buckets",existing})).buckets;}catch(err){if(!auto)toast(err.message);}}
 if(!list)list=suggestBucketsBasic();
 const names=new Set(existing.map(n=>n.toLowerCase()));const base=(S.set.buckets||[]).length;
 const add=list.filter(b=>b.name&&!names.has(b.name.toLowerCase())).map((b,i)=>newBucket({name:b.name,description:b.description||"",projects:b.projects||[],senders:b.senders||[],keywords:b.keywords||[],types:b.types||[],include:(b.emailIds||[]).slice(0,300),source:"ai",kept:false,color:BK_COLORS[(base+i)%BK_COLORS.length]}));
 S.set.buckets=[...(S.set.buckets||[]),...add];S.set.bucketsSuggestedAt=new Date().toISOString();S.bkBusy=false;saveSet();
 const who=live()&&S.ai.enabled?"Claude suggested":"Suggested";if(!auto||add.length)toast(add.length?`${who} ${add.length} bucket${add.length>1?"s":""}`:"No new buckets to suggest");
 render();await refreshSummaries(false);
}
function moveToBucket(eid,bid){
 const B=S.set.buckets||[];const e=byId(eid);B.forEach(b=>{b.include=(b.include||[]).filter(x=>x!==eid);});
 if(bid==="other")B.forEach(b=>{if(bMatch(b,e))b.exclude=[...(b.exclude||[]).filter(x=>x!==eid),eid].slice(-500);});
 else{const b=B.find(x=>x.id===bid);if(b){b.include=[...(b.include||[]),eid].slice(-500);b.exclude=(b.exclude||[]).filter(x=>x!==eid);}}
 saveSet();render();toast(`Moved to ${(bucketById(bid)||OTHER).name}`);
}
function bucketsHTML(){
 const view=S.bview||"topic";const data=bucketData(view);let sel=S.bucketSel&&data.find(d=>d.b.id===S.bucketSel);if(S.bucketSel&&!sel)S.bucketSel=null;
 const none=!(S.set.buckets||[]).length;
 const tabs=`<div class="seg bview" role="tablist" aria-label="Group your mail by">${BVIEWS.map(([k,l,t])=>`<button role="tab" data-a="bview" data-v="${k}" aria-selected="${view===k}" aria-pressed="${view===k}" title="${esc(t)}">${l}</button>`).join("")}</div>`;
 const tools=view!=="topic"?`<span class="note">${esc(BVIEWS.find(x=>x[0]===view)[2])}</span>`:(S.bkBusy?`<span class="status"><span class="spin"></span>Claude is grouping your mail</span>`:`<button class="btn sm" data-a="suggestbuckets" title="Claude looks at your open mail and proposes buckets">${ic("spark")}Suggest</button>`)+`<button class="btn sm" data-a="newbucket">${ic("plus")}New bucket</button>`;
 const head=`<div class="sec-h2"><h2>Buckets</h2>${tabs}<span class="sp"></span>${tools}</div>`;
 if(view==="topic"&&none&&!S.bkBusy)return head+`<div class="card"><div class="card-b" style="padding:20px"><p class="muted" style="max-width:62ch">Buckets group your email by project, client or kind of mail, with a summary and the numbers for each. Claude can suggest a set from your inbox, or you can make your own.</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn pri sm" data-a="suggestbuckets">${ic("spark")}Suggest buckets</button><button class="btn sm" data-a="newbucket">${ic("plus")}Make one</button></div></div></div>`;
 if(!data.length)return head+`<div class="card">${emptyState("inbox","Nothing to group yet","Once mail is synced, it shows here.")}</div>`;
 return head+`<div class="bkwrap"><div class="bkgrid">${data.map(d=>bucketCardHTML(d,sel&&sel.b.id===d.b.id)).join("")}</div>${sel?bucketPanelHTML(sel):`<div class="card bkslot">${emptyState("inbox","Open a bucket to see its email","Its email appears here, grouped into Urgent, For approval, To do and more.")}</div>`}</div>`;
}
function bucketCardHTML(d,on){
 const b=d.b;const sm=b.virtual?{text:d.active.length?summaryFallback(d):b.description}:(S.set.bucketSummaries||{})[b.id];
 const line=(label,val,status,cls,tip)=>`<span class="bl${val&&val!=="0"?"":" zero"}"${status&&val?` data-tip="bstat:${b.id}:${status}"`:tip?` data-tip="${esc(tip)}"`:""}><span class="bl-k">${label}</span><span class="bl-v num ${val&&val!=="0"?cls||"":""}">${val}</span></span>`;
 return `<button class="bkt${on?" on":""}" data-a="bucket" data-id="${b.id}" aria-expanded="${!!on}" ${on?'aria-current="true"':""} style="--bc:${b.color||"#8e8e93"}">
  ${on?`<span class="bkt-sel" aria-hidden="true">${ic("right")}</span>`:""}
  <span class="bkt-h"><span class="bkt-n">${esc(b.name)}${b.source==="ai"&&!b.kept?`<span class="bkt-ai" data-tip="Suggested for you. Open it to keep, edit or remove it.">${ic("spark")}</span>`:""}</span><span class="bkt-c" data-tip="${d.active.length} open${d.handled.length?`, ${d.handled.length} handled this week`:""}"><b class="num">${d.active.length}</b> open</span></span>
  <span class="bkt-box"><span class="bkt-bt">${esc(sm?sm.text:b.description||"No summary yet.")}</span></span>
  <span class="bkt-lines">
   ${line("Urgent",String(d.urgent),"urgent","red")}
   ${line("For approval",String(d.approval),"approval","blue")}
   ${line("Unread",String(d.unread),"unread")}
   ${line("Tasks",String(d.tasks),"tasks")}
   ${line("Priority",d.prio==="No"?"None":d.prio,null,d.prio==="High"?"red":"",`Highest score in this bucket: ${d.max.toFixed(1)}`)}
  </span>
 </button>`;
}
function bucketPanelHTML(d){
 const b=d.b;const sm=(S.set.bucketSummaries||{})[b.id];const ctx=statusCtx();
 const groups={};[...d.active,...d.handled].forEach(e=>{const s=statusOf(e,ctx);(groups[s]=groups[s]||[]).push(e);});
 const filt=S.bucketStatus;
 const chips=STATUS.filter(([k])=>groups[k]).map(([k,l,c])=>`<button class="chip${filt===k?" on":""}" data-a="bstatus" data-v="${k}">${l}<span class="k num">${groups[k].length}</span></button>`).join("");
 const sec=([k,l,c])=>{const list=groups[k];if(!list||(filt&&filt!==k))return "";
  const sorted=list.slice().sort((x,y)=>k==="done"?(y.handledAt||"").localeCompare(x.handledAt||""):score(y).s-score(x).s);const lim=filt?200:6;
  return `<div class="bps"><div class="bps-h${k==="urgent"?" red":""}">${l}<span class="num faint">${list.length}</span></div><div class="rows">${sorted.slice(0,lim).map(e=>hasApproval(e,ctx)?approvalEmailHTML(e,"g-"+b.id):rowHTML(e,{q:"g-"+b.id})).join("")}</div>${list.length>lim?`<button class="more" data-a="bstatus" data-v="${k}">Show all ${list.length}</button>`:""}</div>`;};
 return `<section class="card bkp" id="bkpanel" aria-label="${esc(b.name)}" style="--bc:${b.color||"#8e8e93"}">
  <div class="bkp-h"><h3>${esc(b.name)}</h3><span class="sp"></span>
   ${b.system?"":`<button class="btn sm" data-a="editbucket" data-id="${b.id}">${ic("sliders")}Edit</button>`}<button class="btn sm pri" data-a="bucketinbox" data-id="${b.id}" title="Work through these emails in Inbox, most important first">${ic("right")}Work through</button><button class="ib" data-a="closebucket" aria-label="Close bucket">${ic("x")}</button></div>
  ${b.source==="ai"&&!b.kept?`<div class="infobox" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${ic("spark")}Claude suggested this bucket.<span class="sp" style="margin-left:auto"></span><button class="btn pri sm" data-a="keepbucket" data-id="${b.id}">Keep</button><button class="btn sm" data-a="editbucket" data-id="${b.id}">Edit</button><button class="btn sm" data-a="delbucket" data-id="${b.id}">Remove</button></div>`:""}
  <div class="bkp-sum bkt-box"><p>${esc(b.virtual?(d.active.length?summaryFallback(d):b.description):sm?sm.text:(b.description||"No summary yet."))}</p>${b.virtual?`<span class="note">${esc(b.description)}</span>`:`<span class="note">${sm?`${sm.by==="ai"?"Summary by Claude":"Automatic summary"} · ${when(sm.t)} · `:""}<button class="btn link sm" style="padding:0" data-a="refreshsum" data-id="${b.id}" ${S.sumBusy?"disabled":""}>${S.sumBusy?"Updating…":"Refresh summary"}</button></span>`}</div>
  <div class="bkp-stats">${[["Open",d.active.length,"Open and draft-ready email"],["Urgent",d.urgent,"In Today"],["For approval",d.approval,"Agent suggestions and suggested tasks"],["Unread",d.unread,"Not opened yet"],["Tasks",d.tasks,"Open tasks linked to these emails"],["Time needed",d.min?fmtMin(d.min):"·","Estimated time for everything except low priority"]].map(([k,v,t])=>`<div class="ms" data-tip="${esc(t)}"><div class="n num">${v}</div><div class="k">${k}</div></div>`).join("")}</div>
  ${chips?`<div class="chips">${filt?`<button class="chip" data-a="bstatus" data-v="">All</button>`:""}${chips}</div>`:""}
  <div class="bkp-b">${STATUS.map(sec).join("")||emptyHTML("Nothing in this bucket right now.")}</div>
 </section>`;
}
function apItemHTML(q,e,a,compact){
 const act=q.action||a.action;const hasText=act==="reply"||act==="send";const txt=S.qEdits[q.id]??String(q.param!=null?q.param:a.param||"").replace(/\{first\}/g,firstName(dispName(e)));const editing=S.qEditing===q.id;
 return `<div class="ap${compact?" compact":""}">
  <div class="ap-h"><span class="agico" style="background:${a.color};width:24px;height:24px;border-radius:7px">${ic("bot")}</span><span class="ap-t"><a href="#/agents/${a.id}" class="ap-an">${esc(a.name)}</a> wants to <b>${esc((ACT_L[act]||act).toLowerCase())}</b>${act==="delegate"&&q.param?` to ${esc(q.param)}`:act==="project"&&(q.param||a.param)?` under ${esc(q.param||a.param)}`:""}</span>${act==="send"?`<span class="pill p-now" data-tip="This sends an email. It can't be undone.">Sends</span>`:""}</div>
  ${compact?"":`<button class="ap-e" data-a="openmail" data-q="approval" data-id="${e.id}"><span class="who">${esc(dispName(e))}</span><span class="sub">${esc(e.subject)}</span></button>`}
  ${q.reason?`<div class="r">${esc(q.reason)}</div>`:""}
  ${hasText?(editing?`<textarea id="qe-${q.id}" data-qe="${q.id}" style="min-height:110px">${esc(txt)}</textarea>`:`<div class="dr"><span class="dr-t">${esc(txt)}</span></div>`):""}
  <div class="ap-f"><button class="btn pri sm" data-a="approve" data-id="${q.id}">${ic("check")}${act==="send"?"Approve and send":"Approve"}</button>${hasText?`<button class="btn sm" data-a="qedit" data-id="${q.id}">${editing?"Done editing":"Edit"}</button>`:""}<button class="btn sm" data-a="dismiss" data-id="${q.id}">Dismiss</button>${compact?"":`<button class="btn sm link" data-a="openmail" data-q="approval" data-id="${e.id}">Open email</button>`}</div>
 </div>`;
}
function approvalEmailHTML(e,q){
 const qs=queueItems().filter(x=>x.e.id===e.id);const ss=suggestionsFor(e.id);
 return rowHTML(e,{q})+`<div class="apin">${qs.map(({q,a})=>apItemHTML(q,e,a,true)).join("")}${ss.map(s=>suggestionHTML(s,{noEmail:true})).join("")}</div>`;
}

/* ---------- bucket overlay, bulk actions, unsubscribe ---------- */
const UNSUB_TYPES=["newsletter","notification","sales"];
function bucketCardsHTML(data){
 return `<div class="bcards">${data.map(d=>{const sm=(S.set.bucketSummaries||{})[d.b.id];const txt=(sm?sm.text:d.b.description)||(d.active.length?summaryFallback(d):"Nothing here right now.");
  const link=(st,l,n,cls)=>`<button class="bcl${n?"":" zero"}${cls&&n?" "+cls:""}" data-a="bsopen" data-id="${d.b.id}" data-v="${st}" ${n?"":"tabindex=\"-1\""}><span class="bcl-l">${l}</span><b class="num">${n}</b>${ic("right")}</button>`;
  return `<div class="bc" style="--bc:${d.b.color||"#8e8e93"}">
   <button class="bc-main" data-a="bsopen" data-id="${d.b.id}" title="Open ${esc(d.b.name)}"><span class="bc-h"><span class="bc-n">${esc(d.b.name)}</span><span class="bc-c"><b class="num">${d.active.length}</b> open</span></span><span class="bc-sum">${esc(txt)}</span></button>
   <div class="bc-links">${link("urgent","Urgent",d.urgent,"red")}${link("approval","For your OK",d.approval,"blue")}${link("unread","Unread",d.unread)}</div></div>`;}).join("")}</div>`;
}
function bsheetData(){const B=S.bsheet;if(!B)return null;return bucketData(gView(B.id)).find(x=>x.b.id===B.id)||null;}
function bucketSheetHTML(d){
 const b=d.b;const sm=b.virtual?null:(S.set.bucketSummaries||{})[b.id];const ctx=statusCtx();const filt=S.bsheet.st||null;
 const groups={};[...d.active,...d.handled].forEach(e=>{const s=statusOf(e,ctx);(groups[s]=groups[s]||[]).push(e);});
 const unread=d.active.filter(e=>e.unread);const n=d.active.length;
 const chips=[...STATUS.filter(([k])=>groups[k]).map(([k,l])=>[k,l,groups[k].length]),...(unread.length?[["unread","Unread",unread.length]]:[])];
 const q="g-"+b.id;
 const sec=([k,l])=>{const list=k==="unread"?unread:groups[k];if(!list||(filt&&filt!==k)||(!filt&&k==="unread"))return "";
  const sorted=list.slice().sort((x,y)=>k==="done"?(y.handledAt||"").localeCompare(x.handledAt||""):score(y).s-score(x).s);const lim=filt?300:5;
  return `<div class="bps"><div class="bps-h${k==="urgent"?" red":""}">${l}<span class="num faint">${list.length}</span></div><div class="rows">${sorted.slice(0,lim).map(e=>hasApproval(e,ctx)?approvalEmailHTML(e,q):rowHTML(e,{q})).join("")}</div>${list.length>lim?`<button class="more" data-a="bsst" data-v="${k}">Show all ${list.length}</button>`:""}</div>`;};
 const likely=d.active.some(e=>UNSUB_TYPES.includes((e._c||score(e)).a.type));
 return `<div class="sh-top"><button class="ib" data-a="closebsheet" aria-label="Close">${ic("x")}</button><span class="ldot" style="background:var(--bc);width:10px;height:10px"></span><h2 class="bs-n">${esc(b.name)}</h2><span class="sp" style="margin-left:auto"></span>
   ${b.virtual||b.system?"":`<button class="btn sm" data-a="editbucket" data-id="${b.id}" title="Rename it or change what goes in it">${ic("sliders")}Edit</button>`}
   ${n?`<button class="btn sm pri" data-a="bucketinbox" data-id="${b.id}" title="Open these emails in Inbox, most important first">${ic("right")}Work through</button>`:""}</div>
  <div class="sh-body">
   ${b.source==="ai"&&!b.kept?`<div class="infobox" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${ic("spark")}Claude suggested this bucket.<span style="margin-left:auto"></span><button class="btn pri sm" data-a="keepbucket" data-id="${b.id}">Keep</button><button class="btn sm" data-a="delbucket" data-id="${b.id}">Remove</button></div>`:""}
   <div class="bkt-box"><p>${esc(b.virtual?(n?summaryFallback(d):b.description):sm?sm.text:(b.description||(n?summaryFallback(d):"Nothing here right now.")))}</p>${b.virtual?"":`<span class="note">${sm?`${sm.by==="ai"?"Summary by Claude":"Automatic summary"} · ${when(sm.t)} · `:""}<button class="btn link sm" style="padding:0" data-a="refreshsum" data-id="${b.id}" ${S.sumBusy?"disabled":""}>${S.sumBusy?"Updating…":"Refresh summary"}</button></span>`}</div>
   <div class="bkp-stats">${[["Open",n,"Open and draft-ready email"],["Urgent",d.urgent,"In Do today"],["For your OK",d.approval,"Agent suggestions and suggested tasks"],["Unread",d.unread,"Not opened yet"],["Tasks",d.tasks,"Open tasks linked to these emails"],["Time",d.min?fmtMin(d.min):"·","Estimated time, except low priority"]].map(([k,v,t])=>`<div class="ms" data-tip="${esc(t)}"><div class="n num">${v}</div><div class="k">${k}</div></div>`).join("")}</div>
   ${n?`<div class="bulk"><span class="lbl">All ${n} open in this bucket</span><div class="bulk-b">
    <button class="btn sm" data-a="bulk" data-v="read" data-id="${b.id}" ${unread.length?"":"disabled"}>${ic("eye")}Mark read${unread.length?` <span class="num faint">${unread.length}</span>`:""}</button>
    <button class="btn sm" data-a="bulk" data-v="archive" data-id="${b.id}">${ic("letgo")}Archive all</button>
    <button class="btn sm" data-a="bulk" data-v="unsub" data-id="${b.id}" title="Ask senders to stop emailing you">${ic("unsub")}Unsubscribe…</button>
    <button class="btn sm danger" data-a="bulk" data-v="delete" data-id="${b.id}">${ic("trash")}Delete all</button></div>
    ${likely?`<p class="note">Looks like newsletters or notifications. Unsubscribing stops new ones arriving.</p>`:""}</div>`:""}
   ${chips.length?`<div class="chips">${filt?`<button class="chip" data-a="bsst" data-v="">All</button>`:""}${chips.map(([k,l,c])=>`<button class="chip${filt===k?" on":""}" data-a="bsst" data-v="${k}">${l}<span class="k num">${c}</span></button>`).join("")}</div>`:""}
   <div class="bkp-b card">${[...STATUS,["unread","Unread"]].map(sec).join("")||emptyState("check","Nothing in this bucket right now","New email that fits will appear here.")}</div>
   ${b.virtual||b.system?"":`<div class="bs-foot"><span class="note">${b.source==="ai"?"Suggested by Claude. ":""}Removing a bucket doesn't change anything in your mailbox.</span><button class="btn sm danger" data-a="delbucket" data-id="${b.id}">Remove bucket</button></div>`}
  </div>`;
}
function renderBSheet(){
 const o=document.getElementById("overlay");const old=o.querySelector(".bsheet .sh-body");const top=old?old.scrollTop:0;
 o.querySelectorAll(".bsheet,.scrim.bkscrim").forEach(x=>x.remove());
 if(!S.bsheet||S.mode==="signedout")return;const d=bsheetData();if(!d){S.bsheet=null;return;}
 o.insertAdjacentHTML("afterbegin",`<div class="scrim bkscrim" data-a="closebsheet"></div><aside class="sheet bsheet" role="dialog" aria-modal="true" aria-label="${esc(d.b.name)}" style="--bc:${d.b.color||"#8e8e93"}">${bucketSheetHTML(d)}</aside>`);
 const nb=o.querySelector(".bsheet .sh-body");if(nb)nb.scrollTop=top;
}
function popMove(e){
 const cur=bucketIdOf(e);
 return `<h3>Move to bucket</h3><p class="note">Workbench will keep this email in the bucket you choose.</p><div class="mvl">${[...(S.set.buckets||[]),OTHER].map(b=>`<button class="mvi${b.id===cur?" on":""}" data-a="moveto" data-id="${e.id}" data-v="${b.id}" ${b.id===cur?"aria-current=\"true\"":""}><span class="ldot" style="background:${b.color||"#8e8e93"}"></span>${esc(b.name)}${b.id===cur?`<span class="note" style="margin-left:auto">Current</span>`:""}</button>`).join("")}</div><button class="btn sm" data-a="newbucket">${ic("plus")}New bucket</button>`;
}
function unsubSenders(d){
 const m=new Map();d.active.forEach(e=>{const k=(e.fromEmail||"").toLowerCase();if(!k)return;const x=m.get(k)||{email:k,name:dispName(e),ids:[],likely:false};x.ids.push(e.id);if(UNSUB_TYPES.includes((e._c||score(e)).a.type))x.likely=true;m.set(k,x);});
 return [...m.values()].sort((a,b)=>(b.likely-a.likely)||(b.ids.length-a.ids.length));
}
function bulkModalHTML(M){
 const d=bucketData(gView(M.bid)).find(x=>x.b.id===M.bid);const name=d?d.b.name:"this bucket";
 if(M.op==="unsub"){
  if(M.results){const lab={"one-click":"Unsubscribed","email":"Unsubscribe request emailed","link":"Needs one click on their page","none":"No unsubscribe option found"};
   const ok=M.results.filter(r=>r.ok).length;
   return {title:"Unsubscribe results",h:`<p class="muted">${ok?`Done for ${ok} sender${ok>1?"s":""}${M.archived?`, and ${M.archived} email${M.archived>1?"s":""} archived`:""}.`:"Nothing could be done automatically."}${M.demo?" This is the demo, so nothing was actually sent.":""}</p>
    <div class="usl">${M.results.map(r=>`<div class="usr"><span class="usd ${r.ok?"ok":r.method==="link"?"warn":"no"}">${r.ok?ic("check"):r.method==="link"?ic("right"):ic("x")}</span><span class="usx"><b>${esc(r.name)}</b><span class="note">${esc(r.sender)} · ${esc(lab[r.method]||"")}${r.error?` (${esc(r.error)})`:""}</span></span>${r.method==="link"&&r.url?`<a class="btn sm" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">Open page</a>`:""}</div>`).join("")}</div>`,
    foot:`<button class="btn pri sm" data-a="closemodal">Done</button>`};}
  const list=M.list;const sel=M.sel;const k=list.filter(x=>sel.has(x.email)).length;
  return {title:`Unsubscribe from ${name} senders`,h:`<p class="muted">Workbench asks each sender to remove you, using the unsubscribe option they include in their email. Some only offer a web page; you'll get a link for those.${list.some(x=>x.likely)?" Newsletters, notifications and sales email are ticked for you.":" None of these look like mailing lists, so nothing is ticked. People you work with usually can't be unsubscribed from."}</p>
   <div class="usl">${list.map(x=>`<label class="usr"><input type="checkbox" data-us="${esc(x.email)}" ${sel.has(x.email)?"checked":""}><span class="usx"><b>${esc(x.name)}</b><span class="note">${esc(x.email)} · ${x.ids.length} email${x.ids.length>1?"s":""}${x.likely?" · newsletter or notification":""}</span></span></label>`).join("")}</div>
   <label class="usr" style="border:0;padding-left:0"><input type="checkbox" id="us-arch" ${M.archive?"checked":""}><span>Also archive their emails here</span></label>`,
   foot:`<button class="btn sm" data-a="closemodal">Cancel</button><button class="btn pri sm" data-a="dounsub" ${!k||M.busy?"disabled":""}>${M.busy?"Unsubscribing…":`Unsubscribe from ${k}`}</button>`};
 }
 const n=M.ids.length;
 if(M.op==="delete")return {title:`Delete ${n} email${n>1?"s":""}?`,h:`<p class="muted">Every open email in <b>${esc(name)}</b> moves to your ${S.accounts.some(a=>a.provider==="microsoft")?"Bin or Deleted Items":"Bin"}. Gmail and Outlook empty it after about 30 days. You can undo this from the toast or from Activity.</p>`,foot:`<button class="btn sm" data-a="closemodal">Cancel</button><button class="btn sm danger" data-a="dobulk">${ic("trash")}Delete ${n}</button>`};
 return {title:`Archive ${n} email${n>1?"s":""}?`,h:`<p class="muted">Every open email in <b>${esc(name)}</b> leaves your inbox with a Workbench/Low priority label. Nothing is deleted, and you can undo it from Activity.</p>`,foot:`<button class="btn sm" data-a="closemodal">Cancel</button><button class="btn pri sm" data-a="dobulk">Archive ${n}</button>`};
}
async function runUnsub(M){
 M.busy=true;renderModal();const chosen=M.list.filter(x=>M.sel.has(x.email));const ids=chosen.flatMap(x=>x.ids);let results;
 if(live()){try{results=(await api("/api/unsubscribe",{ids})).results;}catch(err){M.busy=false;renderModal();toast(err.message);return;}}
 else{results=chosen.map(x=>x.likely?{sender:x.email,name:x.name,method:"one-click",ok:true}:{sender:x.email,name:x.name,method:"none",ok:false});M.demo=true;}
 const okS=new Set(results.filter(r=>r.ok).map(r=>String(r.sender).toLowerCase()));
 let archived=0;if(M.archive){const arch=chosen.filter(x=>okS.has(x.email)).flatMap(x=>x.ids).filter(id=>{const e=byId(id);return e&&OPEN(e);});
  if(arch.length){const en=await act(arch,"letgo",null,{text:`Archived ${arch.length} email${arch.length>1?"s":""} from unsubscribed senders`,noRender:true});if(en)archived=arch.length;}}
 if(S.modal===M){M.busy=false;M.results=results;M.archived=archived;}render();
}

/* ---------- daily rundown ---------- */
function rundownInputs(){
 const st=compute();const since=Date.now()-DAYMS,weekAgo=Date.now()-7*DAYMS;
 const received=S.emails.filter(e=>new Date(e.date)>since).sort((a,b)=>b.date.localeCompare(a.date));
 const week=S.emails.filter(e=>new Date(e.date)>weekAgo).sort((a,b)=>score(b).s-score(a).s);
 const owed=st.open.filter(e=>["request","decision","meeting"].includes(e._c.a.type)&&e._lane!=="letgo"&&!tasksFor(e.id).length);
 const todo=[...openTasks().sort((a,b)=>(a.due||"9999").localeCompare(b.due||"9999")).map(t=>({text:t.title+(t.status==="in_progress"?" (in progress)":"")+(t.due?` (${dueLow(t.due)})`:""),emailId:linkIds(t)[0]||null})),
  ...taskSuggestions().slice(0,5).map(s=>({text:"Suggested: "+s.title,emailId:s.emailId})),
  ...owed.slice(0,6).map(e=>({text:`Reply to ${firstName(dispName(e))}: ${e._c.a.ask&&e._c.a.ask!=="Nothing"?e._c.a.ask:shortSubj(e.subject)}`,emailId:e.id}))];
 const byType={};received.forEach(e=>{const t=(e._c||score(e)).a.type;byType[t]=(byType[t]||0)+1;});
 return {st,received,week,todo,byType,bd:bucketData()};
}
function rundownBasic(x){
 const st=x.st,n=st.today.length,top=st.today[0];
 const types=Object.entries(x.byType).sort((a,b)=>b[1]-a[1]);
 const bks=x.bd.filter(d=>d.b.id!=="other"&&d.active.length).sort((a,b)=>b.active.length-a.active.length).slice(0,3);
 const agents=S.log.filter(l=>l.agentId&&isToday(l.t)&&!l.undone).reduce((s,l)=>s+((l.emailIds||[]).length||1),0);
 const approvals=queueItems().length+taskSuggestions().length;
 const fb=x.bd.filter(d=>d.b.id!=="other").sort((a,b)=>(b.urgent*3+b.active.length)-(a.urgent*3+a.active.length))[0];
 const ctx=(S.set.context||"").split(/[.!\n]/)[0].trim();
 return {
  headline:n?`${n} thing${n>1?"s":""} need you today, starting with ${shortSubj(top.subject).toLowerCase()}`:"A quiet day: nothing urgent waiting",
  intro:`${x.received.length} email${x.received.length===1?"":"s"} arrived in the last 24 hours across ${S.accounts.length} mailbox${S.accounts.length===1?"":"es"}. ${agents?`Your agents handled ${agents}`:"Your agents haven't needed to act yet"}${approvals?`, and ${approvals} suggestion${approvals>1?"s":""} ${approvals>1?"wait":"waits"} for your approval.`:"."}`,
  received:`${types.length?"Mostly "+types.slice(0,3).map(([t,c])=>plural(t,c)).join(", ")+".":"Nothing new came in."}${bks.length?` The busiest buckets are ${bks.map(d=>`${d.b.name} (${d.active.length})`).join(", ")}.`:""}`,
  urgent:st.today.slice(0,5).map(e=>{const t=(e.ai&&e.ai.tasks&&e.ai.tasks[0])||tasksFor(e.id)[0];const ask=e.by==="ai"&&e._c.a.ask&&e._c.a.ask!=="Nothing"?e._c.a.ask:"";return {emailId:e.id,text:`${t?t.title:shortSubj(e.subject)}${ask&&!t?": "+ask.replace(/[.?!]+$/,""):""} (${firstName(dispName(e))}${t&&t.due?", "+dueLow(t.due):""})`};}),
  todo:x.todo.slice(0,6),
  focus:fb&&fb.active.length?{title:fb.b.name,text:`${fb.active.length} open email${fb.active.length>1?"s":""}${fb.urgent?`, ${fb.urgent} urgent today`:""}, and the most pressing is ${shortSubj((fb.active.filter(OPEN).sort((a,b)=>b._c.s-a._c.s)[0]||fb.active[0]).subject).toLowerCase()}. ${ctx?`You said: “${ctx}.”`:"Clear this first and let lower buckets wait."}`}:{title:"Keep it light",text:"Nothing stands out this week. Clear Today and let the rest wait."},
  signoff:n?"Start with the first item in Do today. Everything else can wait.":"Enjoy the quiet."
 };
}
async function refreshRundown(force){
 if(S.rdBusy||!S.emails.length)return;if(!force&&S.set.rundown&&S.set.rundown.date===todayKey())return;
 const x=rundownInputs();S.rdBusy=true;render();let data=null,by="basic";
 if(live()&&S.ai.enabled){try{
  const st=x.st;data=(await api("/api/insights",{kind:"rundown",receivedIds:x.received.slice(0,60).map(e=>e.id),urgentIds:st.today.slice(0,10).map(e=>e.id),weekIds:x.week.slice(0,60).map(e=>e.id),todo:x.todo.slice(0,20),
   stats:{received24h:x.received.length,openTotal:st.open.length,urgentToday:st.today.length,timeForToday:fmtMin(st.used),approvalsWaiting:queueItems().length,taskSuggestions:taskSuggestions().length,openTasks:openTasks().length,overdueTasks:openTasks().filter(t=>t.due&&t.due<todayKey()).length},
   buckets:x.bd.map(d=>({name:d.b.name,open:d.active.length,urgent:d.urgent}))})).rundown;by="ai";
 }catch(err){if(force)toast(err.message);}}
 if(!data)data=rundownBasic(x);
 S.set.rundown={date:todayKey(),t:new Date().toISOString(),by,data,counts:x.byType};S.rdBusy=false;saveSet();render();
}
function rundownHTML(){
 const R=S.set.rundown;
 if(!R){if(!S.emails.length)return `<section class="news"><div class="news-mast"><span class="kicker">Your daily rundown</span></div>${emptyState("mail","Your rundown will appear here","Once your mail is synced and sorted, Claude writes a short briefing each morning.")}</section>`;return `<section class="news"><div class="news-mast"><span class="kicker">Your daily rundown</span></div><div>${S.rdBusy?`<span class="status"><span class="spin"></span>Writing today's rundown</span>`:`<button class="btn sm" data-a="rdrefresh">${ic("spark")}Write today's rundown</button>`}</div></section>`;}
 const d=R.data,open=S.rundownOpen,stale=R.date!==todayKey();
 const item=x=>{const e=x.emailId&&byId(x.emailId);return `<li>${e?`<button class="nlink" data-a="openmail" data-id="${e.id}" data-tip="${esc(dispName(e)+": "+e.subject)}">${esc(x.text)}</button>`:esc(x.text)}</li>`;};
 const counts=R.counts||{};
 return `<section class="news${open?"":" mini"}" aria-label="Your daily rundown">
  <div class="news-mast"><span class="kicker">Your daily rundown</span><span class="news-date">${new Date(R.t).toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})}</span><span class="note" data-tip="${R.by==="ai"?"Written by Claude from your mail, tasks and context":"Compiled from your mail without Claude"}">${R.by==="ai"?"Written by Claude":"Compiled automatically"} at ${new Date(R.t).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}${stale?" · from an earlier day":""}</span><span class="sp"></span>
   ${S.rdBusy?`<span class="status"><span class="spin"></span>Updating</span>`:`<button class="ib" data-a="rdrefresh" aria-label="Refresh rundown" title="Write it again">${ic("sync")}</button>`}${open?`<button class="ib" data-a="rdtoggle" aria-expanded="true" aria-label="Collapse rundown" title="Collapse"><svg class="i" viewBox="0 0 24 24" aria-hidden="true" style="transform:rotate(180deg)">${I.chev}</svg></button>`:`<button class="btn sm" data-a="rdtoggle" aria-expanded="false" title="Read the full rundown">Read all<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${I.chev}</svg></button>`}</div>
  <h2 class="news-h">${esc(d.headline)}</h2>
  <p class="news-lede">${esc(d.intro)}</p>
  ${open?`<div class="news-cols">
   <article><h4>What came in</h4><p>${esc(d.received)}</p>${Object.keys(counts).length?`<div class="news-counts">${Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([t,c])=>`<span><b class="num">${c}</b> ${esc((TPL[t]||["email","emails"])[c===1?0:1])}</span>`).join("")}</div>`:""}</article>
   <article><h4>Urgent</h4>${d.urgent.length?`<ol>${d.urgent.map(item).join("")}</ol>`:`<p class="muted">Nothing urgent.</p>`}</article>
   <article><h4>To do</h4>${d.todo.length?`<ul>${d.todo.map(item).join("")}</ul>`:`<p class="muted">Nothing on your list.</p>`}</article>
  </div>
  <div class="news-focus"><span class="kicker">This week's focus</span><h3>${esc(d.focus.title)}</h3><p>${esc(d.focus.text)}</p></div>
  ${d.signoff?`<p class="news-sign">${esc(d.signoff)}</p>`:""}`:""}
 </section>`;
}
async function afterSort(){
 if(!S.set.bucketsSuggestedAt&&!(S.set.buckets||[]).length&&S.emails.filter(OPEN).length>=3)await suggestBuckets(true);
 else await refreshSummaries(false);
 await refreshRundown(false);
}

/* ---------- dashboard ---------- */
function approvalsCard(){
 const items=queueItems();const sugg=taskSuggestions();const ready=compute().ready;const total=items.length+sugg.length+ready.length;
 const head=`<div class="card-h"><h3><span class="ldot" style="background:var(--accent)"></span>Needs your OK <span class="num faint">${total}</span></h3><span class="sp">${total?`<button class="btn sm" data-a="goq" data-v="approval" data-start="1" title="Open each email with its suggestion, one at a time">One by one</button>`:""}${items.length>1?`<button class="btn sm pri" data-a="approveall" title="Approve every agent suggestion">Approve all agent actions</button>`:""}</span></div>`;
 if(!total)return `<section class="card" id="approvals">${head}${emptyState("check","No approvals needed, yay!","Agent actions, suggested tasks and drafts ready to send wait here for your OK.")}</section>`;
 const lim=S.showAllApprovals?99:3;
 return `<section class="card" id="approvals">${head}
  ${items.length?`<div class="aps-h">${ic("bot")}Agent actions <span class="num faint">${items.length}</span></div><div class="apl">${items.slice(0,lim).map(({q,e,a})=>apItemHTML(q,e,a,false)).join("")}</div>`:""}
  ${sugg.length?`<div class="aps-h">${ic("spark")}Suggested tasks <span class="num faint">${sugg.length}</span><span class="note" style="margin-left:auto">Added only when you approve</span></div><div class="tkl">${sugg.slice(0,lim).map(s=>suggestionHTML(s)).join("")}</div>`:""}
  ${ready.length?`<div class="aps-h">${ic("send")}Drafts ready to send <span class="num faint">${ready.length}</span><span class="note" style="margin-left:auto">Saved in your mailbox</span></div><div class="rows">${ready.slice(0,lim).map(e=>rowHTML(e,{q:"approval"})).join("")}</div>`:""}
  ${items.length>lim||sugg.length>lim||ready.length>lim?`<button class="more" data-a="moreapprovals">${S.showAllApprovals?"Show fewer":"Show all"}</button>`:""}</section>`;
}
function tasksCard(){
 const list=S.tasks.filter(kept).sort(taskOrder);const open=list.filter(isActive);const doneN=list.length-open.length;
 const shown=[...list.filter(isActive).slice(0,6),...list.filter(t=>t.status==="done")].sort(taskOrder).slice(0,Math.max(6,doneN+3));
 return `<section class="card" id="taskscard"><div class="card-h"><h3>${ic("task")}Tasks <span class="num faint">${open.length} open${doneN?` · ${doneN} done today`:""}</span></h3><span class="sp"><button class="btn sm" data-a="newtask">${ic("plus")}New</button><a class="btn sm" href="#/tasks">All</a></span></div>
  <div class="tkl">${shown.map(taskRowHTML).join("")||emptyState("task","No tasks. All clear!","Add one from any email, or approve one Claude suggests.")}</div>${list.length&&!open.length?`<div class="es-inline">${ic("check")}All done for today. Nice work!</div>`:""}</section>`;
}
/* The sticky strip under the page title: how today is going, and the three controls that shape it. */
function pulseHTML(st){
 const doneToday=st.handled.filter(e=>isToday(e.handledAt)).length;const left=st.today.length;const pct=doneToday+left?Math.round(doneToday/(doneToday+left)*100):100;
 const q=queueItems().length,sg=taskSuggestions().length,rd=st.ready.length,appr=q+sg+rd;
 const tk=openTasks();const prog=tk.filter(t=>t.status==="in_progress").length;const over=tk.filter(t=>t.due&&t.due<todayKey()).length;
 const owed=st.open.filter(e=>["request","decision","meeting"].includes(e._c.a.type)&&e._lane!=="letgo");
 const urgent=st.today;const tipList=list=>"list:"+list.slice(0,5).map(e=>e.id).join(",");
 const agentN=S.log.filter(l=>l.agentId&&isToday(l.t)&&!l.undone).reduce((s,l)=>s+((l.emailIds||[]).length||1),0);
 const m=(label,n,sub,a,v,tip,cls)=>`<button class="pm${cls&&n?" "+cls:""}" data-a="${a}" data-v="${v}"${a==="goq"&&n?' data-start="1"':""} data-tip="${esc(tip)}"><span class="pm-n num">${n}</span><span class="pm-t"><span class="pm-k">${label}</span><span class="pm-s">${esc(sub)}</span></span></button>`;
 const w=S.set.w,tot=(w.u+w.i+w.e)||1;
 return `<div class="pulse" role="region" aria-label="Today at a glance">
  <button class="pg" data-a="goq" data-v="today" data-start="1" data-tip="${esc(`${doneToday} handled today${agentN?`, ${agentN} by your agents`:""}. ${left} still in Do today, about ${fmtMin(st.used)} of your ${fmtMin(S.set.budget)}.`)}">
   <span class="pg-h"><span class="pm-k">Today's progress</span><span class="num pg-p">${left?`${doneToday} of ${doneToday+left} done`:doneToday?"All done":"Nothing due"}</span></span>
   <span class="pg-bar" aria-hidden="true"><i style="width:${pct}%"></i></span>
   <span class="pm-s">${left?`${fmtMin(st.used)} left of ${fmtMin(S.set.budget)}`:"Do today is clear"}</span></button>
  <span class="pdiv" aria-hidden="true"></span>
  ${m("Urgent",urgent.length,urgent.length?"In Do today":"Nothing urgent","goq","today",urgent.length?tipList(urgent):"Nothing urgent right now","red")}
  ${m("Needs your OK",appr,appr?[q&&`${q} agent`,sg&&`${sg} task${sg>1?"s":""}`,rd&&`${rd} draft${rd>1?"s":""}`].filter(Boolean).join(" · "):"All reviewed","goq","approval",q?"queue:":"Agent actions, suggested tasks and drafts ready to send","blue")}
  ${m("Tasks",tk.length,tk.length?[prog&&`${prog} in progress`,over&&`${over} overdue`].filter(Boolean).join(" · ")||"None started":"List is clear","nav","tasks",tk.length?"Your open tasks":"No open tasks",over?"red":"")}
  ${m("Replies owed",owed.length,owed.length?`Oldest ${when(owed.slice().sort((a,b)=>a.date.localeCompare(b.date))[0].date)}`:"All caught up","goq","replies",owed.length?tipList(owed):"No replies owed")}
  <span class="sp"></span>
  <span class="pctl">
   <button class="chip" data-a="budget" data-tip="Time you have for email today. Do today only holds what fits.">${ic("clock")}<span class="num">${fmtMin(S.set.budget)}</span></button>
   <button class="chip" data-a="context" data-tip="${esc(activeCtx().length?"This week: "+activeCtx().map(r=>r.label).join(" · "):"Tell Workbench what this week is about.")}">${ic("target")}<span>Context</span>${activeCtx().length?`<span class="k num">${activeCtx().length}</span>`:""}</button>
   <button class="chip" data-a="weights" data-tip="How email is ranked: urgency ${Math.round(w.u/tot*100)}%, importance ${Math.round(w.i/tot*100)}%, quick wins ${Math.round(w.e/tot*100)}%">${ic("sliders")}<span>${presetOf(S.set.w)?PRESETS[presetOf(S.set.w)][0]:"Custom"}</span></button>
  </span></div>`;
}
function bucketsBriefHTML(){
 const data=bucketData("topic");const none=!(S.set.buckets||[]).length;
 const head=`<div class="sec-h2"><h2>Buckets</h2><span class="note">${none?"Your mail, grouped the way you think about it.":"Click a bucket or a status to see its email"}</span><span class="sp"></span>${none?"":`<a class="btn sm" href="#/buckets" title="Views by urgency, importance, effort, type and mailbox">All views</a>`}</div>`;
 if(none)return head+`<div class="card"><div class="card-b"><p class="muted">Buckets group your mail by project, client or kind of mail.</p><div>${S.bkBusy?`<span class="status"><span class="spin"></span>Claude is grouping your mail</span>`:`<button class="btn pri sm" data-a="suggestbuckets">${ic("spark")}Suggest buckets</button>`}</div></div></div>`;
 return head+bucketCardsHTML(data);
}
function vDashboard(){
 const st=compute();
 const name=S.user&&S.user.name?firstName(S.user.name):"";
 const hour=new Date().getHours();const greet=hour<12?"Good morning":hour<18?"Good afternoon":"Good evening";
 const q=queueItems();const feed=S.log.filter(l=>l.agentId).slice(0,5);
 const laneLink=(k,list)=>`<button class="lnk" data-a="goq" data-v="${k}" title="${esc(LANE_TIP[k])}" data-tip="${list.length?"list:"+list.slice(0,5).map(e=>e.id).join(","):"Nothing here"}"><span class="ldot" style="background:${LANE_C[k]}"></span>${LANE[k]}<b class="num">${list.length}</b>${list.length&&k!=="letgo"?`<span class="faint num">${fmtMin(list.reduce((s,e)=>s+(e._c.a.min||5),0))}</span>`:""}</button>`;
 return topHTML(`${greet}${name?", "+esc(name):""}`,"",pulseHTML(st))+`<div class="page dash">${bannersHTML()}
  ${live()&&!S.accounts.length?`<div class="card"><div class="card-b" style="padding:20px"><h3>Connect an inbox to get started</h3><p class="muted">Workbench needs at least one mailbox to sort.</p><div><a class="btn pri" href="#/connect">${ic("plus")}Connect email</a></div></div></div>`:""}
  ${rundownHTML()}
  <div class="grid"><div class="col">
   <section class="card" id="today"><div class="card-h"><h3><span class="ldot" style="background:var(--now)"></span>Do today <span class="num faint">${st.today.length}</span></h3><span class="sp"><span class="note num">${fmtMin(st.used)} of ${fmtMin(S.set.budget)}</span>${st.today.length?`<button class="btn pri sm" data-a="goq" data-v="today" data-start="1" title="Open the first email and work down the list">${ic("right")}Start</button>`:""}</span></div>
    ${st.today.length?`<div class="rows">${st.today.map(e=>rowHTML(e,{q:"today"})).join("")}</div>`:emptyState("check","All done for today!",st.open.length?"Nothing urgent needs you. Check Do later when you have a moment.":"Your inbox is clear.")}
    <div class="lanefoot"><span class="note">The rest of your inbox</span>${laneLink("plan",st.lanes.plan)}${laneLink("delegate",st.lanes.delegate)}${laneLink("letgo",st.lanes.letgo)}</div></section>
   ${tasksCard()}
  </div><div class="col">
   ${approvalsCard()}
  </div></div>
  ${bucketsBriefHTML()}
  <div class="sec-h2"><h2>Behind the scenes</h2><span class="note">What you and your agents have been doing</span></div>
  <div class="grid3">
   <section class="card"><div class="card-h"><h3>Last 7 days</h3><span class="sp"><span class="note num">${weekSeries().reduce((s,x)=>s+x.handled,0)} handled</span></span></div><div class="card-b">${weekChart()}</div></section>
   <section class="card"><div class="card-h"><h3>${ic("bot")}Agent activity</h3><span class="sp"><a class="btn sm" href="#/agents">Agents</a></span></div>
    <div class="agstrip">${S.set.agents.map(a=>{const c=S.log.filter(l=>l.agentId===a.id&&!l.undone&&Date.now()-new Date(l.t)<7*864e5).reduce((s,l)=>s+((l.emailIds||[]).length||1),0);const p=q.filter(x=>x.a.id===a.id).length;return `<a class="agchip" href="#/agents/${a.id}" data-tip="${esc(plain(agentSentence(a)))}${p?` · ${p} waiting`:""}"><span class="ldot" style="background:${a.on?a.color:"var(--faint)"}"></span>${esc(a.name)}<span class="num faint">${c}</span>${p?`<span class="pill p-ask num">${p}</span>`:""}</a>`;}).join("")}</div>
    <div class="feed">${feed.map(l=>{const a=agentById(l.agentId);return `<div class="fi"><span class="ico" style="background:${a?a.color:"#8e8e93"}">${ic("bot")}</span><div class="x"><div>${esc(l.text)}</div><div class="s2">${a?`<a href="#/agents/${a.id}">${esc(a.name)}</a> · `:""}${when(l.t)}${l.undone?" · undone":""}</div></div>${l.reason?`<span class="ib" style="width:24px;height:24px" data-tip="${esc("Why: "+l.reason)}">${ic("info")}</span>`:""}</div>`;}).join("")||emptyState("bot","Your agents are standing by","They act on new mail after each sync.")}</div></section>
   <section class="card"><div class="card-h"><h3>${ic("mail")}Mailboxes</h3><span class="sp"><a class="btn sm" href="#/connect">${ic("plus")}Add</a></span></div>
    <div class="card-b">${S.accounts.map(a=>{const cnt=S.emails.filter(e=>e.accountId===a.id&&OPEN(e)).length;const td=S.emails.filter(e=>e.accountId===a.id&&OPEN(e)&&e._today).length;return `<button class="mbrow" data-a="bkmailbox" data-id="${a.id}" data-tip="acct:${a.id}"><span class="pv" style="background:${pv(a.provider).c}">${pv(a.provider).l}</span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;text-align:left">${esc(a.email)}</span><span class="note num">${td?`${td} today · `:""}${cnt} open</span><span class="sdot${a.error?" err":""}"></span></button>`;}).join("")||`<p class="muted">No mailboxes yet.</p>`}</div></section>
  </div></div>`;
}

/* ---------- work queues ---------- */
/* A queue is a focused list to work through: one per lane, plus every bucket ("g-<group id>"). */
const QUEUES=[["today","Do today"],["approval","Needs your OK"],["replies","Replies owed"],["plan","Do later"],["delegate","Hand off"],["letgo","Low priority"],["all","All mail"],["drafts","Drafts"],["done","Done"]];
const Q_BLURB={today:"Urgent and important, sized to your time today. Work top to bottom.",approval:"Agent actions, suggested tasks and drafts waiting on you.",replies:"People waiting on a reply, a decision or a meeting answer.",plan:"Important, but they can wait. Give them a slot this week.",delegate:"Someone else could handle these.",letgo:"Low urgency and importance. Safe to archive.",all:"Every open email, newest first.",drafts:"Replies saved in your mailbox, ready to send.",done:"What you and your agents have handled, newest first."};
const Q_DOT={today:"var(--now)",approval:"var(--accent)",replies:"var(--plan)",plan:"var(--plan)",delegate:"var(--del)",letgo:"var(--go)",drafts:"var(--ready)",all:"var(--faint)",done:"var(--faint)"};
const WORK_Q=["today","approval","replies","plan","delegate","letgo"];
const isQueue=k=>!!k&&(QUEUES.some(q=>q[0]===k)||k.startsWith("g-"));
const owedTest=e=>["request","decision","meeting"].includes((e._c||score(e)).a.type)&&e._lane!=="letgo";
const gView=gid=>{const p=gid.split("-")[0];return p!=="topic"&&BVIEWS.some(v=>v[0]===p)?p:"topic";};
function qGroup(k){const gid=k.slice(2);return bucketData(gView(gid)).find(d=>d.b.id===gid)||null;}
function qLabel(k){if(k&&k.startsWith("g-")){const d=qGroup(k);return d?d.b.name:"Bucket";}const q=QUEUES.find(x=>x[0]===k);return q?q[1]:"Inbox";}
function queueEmails(k){
 const st=compute();const rank=(a,b)=>score(b).s-score(a).s;const newest=(a,b)=>b.date.localeCompare(a.date);
 if(k&&k.startsWith("g-")){const d=qGroup(k);return d?d.active.slice().sort((a,b)=>(b._today-a._today)||rank(a,b)):[];}
 switch(k){
  case "today":return st.today.slice();
  case "approval":{const ctx=statusCtx();const ap=[...st.open,...st.ready].filter(e=>hasApproval(e,ctx)).sort(rank);return [...ap,...st.ready.filter(e=>!ap.includes(e)).sort(newest)];}
  case "replies":return st.open.filter(owedTest).sort((a,b)=>(b._today-a._today)||rank(a,b));
  case "plan":case "delegate":case "letgo":return st.lanes[k].slice();
  case "drafts":return st.ready.slice().sort(newest);
  case "done":return st.handled.slice();
  default:return [...st.open,...st.ready].sort(newest);
 }
}
const queueCount=k=>queueEmails(k).length;
function queueClearHTML(qk){
 const next=WORK_Q.filter(k=>k!==qk).map(k=>[k,queueCount(k)]).filter(x=>x[1]).slice(0,3);
 return `<div class="read-empty"><div class="qclear">${emptyState("check",`${esc(qLabel(qk))} is clear`,next.length?"Nice work. Here's what's waiting next.":"Nothing is waiting on you. Nice work!")}
  ${next.length?`<div class="qnext">${next.map(([k,n])=>`<button class="btn sm" data-a="goq" data-v="${k}" data-start="1"><span class="ldot" style="background:${Q_DOT[k]}"></span>${esc(qLabel(k))}<span class="num faint">${n}</span></button>`).join("")}</div>`:""}
  <a class="btn sm link" href="#/dashboard">Back to dashboard</a></div></div>`;
}

/* ================= inbox ================= */
function inboxList(base){
 const B=S.box;let list=base||queueEmails(B.queue);
 if(B.account!=="all")list=list.filter(e=>e.accountId===B.account);
 if(B.filter){const f=B.filter;list=list.filter(e=>{const a=(e._c||score(e)).a;return f.kind==="project"?(a.project||"General")===f.v:f.kind==="sender"?dispName(e)===f.v:f.kind==="decision"?a.type==="decision":f.kind==="type"?TYPE_L[a.type]===f.v:f.kind==="org"?orgOf(e)===f.v:f.kind==="bucket"?bucketIdOf(e)===f.v:true;});}
 if(B.q){const q=B.q.toLowerCase();list=list.filter(e=>(dispName(e)+" "+e.fromEmail+" "+e.subject+" "+(e.body||e.snippet||"")+" "+(e.ai&&e.ai.project||"")).toLowerCase().includes(q));}
 return list;
}
function vInbox(){
 const B=S.box;const r=S.route;
 let qk=isQueue(r.id)?r.id:(B.queue||"all");let sid=isQueue(r.id)?r.tab:r.id;
 if(qk.startsWith("g-")&&!qGroup(qk))qk="all";
 if(B.queue!==qk){B.lastIds=null;B.queue=qk;}
 const base=queueEmails(qk);const list=inboxList(base);const ids=list.map(e=>e.id);
 // After you act on an email it leaves the queue, so move on to the next one in the same place.
 if(sid&&!base.some(e=>e.id===sid)&&B.lastIds&&B.lastIds.includes(sid)){
  const i=B.lastIds.indexOf(sid);const nx=B.lastIds.slice(i+1).find(x=>ids.includes(x))||B.lastIds.slice(0,i).reverse().find(x=>ids.includes(x))||null;
  sid=nx;B.compose=null;S.confirmSend=null;history.replaceState(null,"","#/inbox/"+[qk,nx].filter(Boolean).map(encodeURIComponent).join("/"));S.route=parseRoute();
 }
 B.lastIds=ids;B.sel=sid||null;
 const sel=B.sel&&byId(B.sel);const st=compute();
 const f=B.filter;const fl=f?{project:"Project",sender:"From",decision:"Decisions",type:"Type",org:"Organisation",bucket:"Bucket"}[f.kind]+(f.v?": "+(f.kind==="bucket"?((bucketById(f.v)||OTHER).name):f.v):""):"";
 const g=qk.startsWith("g-")?qGroup(qk):null;const label=qLabel(qk);
 const mins=list.filter(OPEN).reduce((s,e)=>s+((e._c||score(e)).a.min||5),0);
 const time=qk==="today"?`${fmtMin(st.used)} of ${fmtMin(S.set.budget)}`:["done","all","drafts","letgo"].includes(qk)||!mins?"":`about ${fmtMin(mins)}`;
 const bulk=qk==="letgo"&&list.length?`<button class="btn sm" data-a="lane" data-v="letgo">Archive all…</button>`:qk==="delegate"&&list.length?`<button class="btn sm" data-a="lane" data-v="delegate">Forward all…</button>`:qk==="approval"&&queueItems().length>1?`<button class="btn sm" data-a="approveall">Approve all agent actions</button>`:"";
 const blurb=g?(g.b.virtual?g.b.description:((S.set.bucketSummaries||{})[g.b.id]||{}).text||g.b.description||"Email in this bucket, most important first."):Q_BLURB[qk]||"";
 const qopts=`${QUEUES.map(([k,l])=>`<option value="${k}" ${qk===k?"selected":""}>${l}</option>`).join("")}${(S.set.buckets||[]).length?`<optgroup label="Buckets">${[...S.set.buckets,OTHER].map(b=>`<option value="g-${b.id}" ${qk==="g-"+b.id?"selected":""}>${esc(b.name)}</option>`).join("")}</optgroup>`:""}${g&&g.b.virtual?`<option value="${qk}" selected>${esc(g.b.name)}</option>`:""}`;
 const empty=B.q?emptyState("search","Nothing matches your search","Try a sender, subject or project."):f?emptyState("search","Nothing matches this filter","Clear the filter to see the whole list."):emptyState("check",`${esc(label)} is clear`,qk==="done"?"Emails you finish appear here.":"Nothing here right now.");
 const readPane=sel?readingHTML(sel,list):list.length?`<div class="read-empty"><div class="qclear">${emptyState("mail",`${list.length} in ${esc(label)}`,blurb)}<div class="qnext"><button class="btn pri sm" data-a="selmail" data-id="${list[0].id}">${ic("right")}Start with the first</button></div><p class="note">J and K move between emails. E marks done. R replies.</p></div></div>`:queueClearHTML(qk);
 return topHTML("Inbox")+`<div class="mail${sel?" reading":""}">
  <section class="list" aria-label="${esc(label)}"><div class="lh">
   <div class="qh"><span class="ldot" style="background:${g?g.b.color:Q_DOT[qk]||"var(--faint)"}"></span><h2>${esc(label)}</h2><span class="num faint">${list.length}</span>${time?`<span class="note num">${time}</span>`:""}<span class="sp"></span>${bulk}</div>
   ${blurb?`<p class="note qb">${esc(blurb)}</p>`:""}
   <div class="qrow"><select class="in qsel" id="mqsel" aria-label="Choose a list">${qopts}</select><label class="search">${ic("search")}<input id="mq" value="${esc(B.q)}" placeholder="Search this list" aria-label="Search this list"></label>
    ${S.accounts.length>1?`<select class="in macct" id="macct" style="width:auto;height:32px;padding:2px 8px;max-width:170px" aria-label="Mailbox"><option value="all">All mailboxes</option>${S.accounts.map(a=>`<option value="${a.id}" ${B.account===a.id?"selected":""}>${esc(a.email)}</option>`).join("")}</select>`:""}</div>
   ${f?`<div><button class="chip on" data-a="clearboxfilter">${esc(fl)} ${ic("x")}</button></div>`:""}
  </div><div class="lb">${list.map(e=>rowHTML(e,{mail:true,sel:e.id===B.sel})).join("")||empty}</div></section>
  <section class="read" aria-label="Message">${readPane}</section></div>`;
}
function popWhy(e){
 const c=score(e),a=c.a,tot=c.s||1,open=OPEN(e);
 const bar=(l,v,col)=>`<div class="b"><span>${l}</span><span class="tr"><i style="width:${v*10}%;background:${col}"></i></span><span class="num">${v.toFixed(1)}</span></div>`;
 return `<h3>${open?`Why it's in ${esc(LANE[laneOf(e)]||"")}`:"How it was ranked"}</h3>
  <div class="bars">${bar("Urgency",c.U,"var(--now)")}${bar("Importance",c.I,"var(--plan)")}${bar("Effort",c.E,"var(--del)")}</div>
  <p class="note">Score ${c.s.toFixed(1)}: ${Math.round(c.cu/tot*100)}% urgency, ${Math.round(c.ci/tot*100)}% importance, ${Math.round(c.ce/tot*100)}% quick win. About ${fmtMin(a.min||5)}. ${e.by==="ai"?"Scored by Claude.":"Scored by basic rules."}${e._over?" Urgent, but it doesn't fit today's time, so it's in Do later.":""}</p>
  ${(a.reasons||[]).length||c.applied.length?`<div class="chips">${(a.reasons||[]).map(r=>`<span class="tag">${esc(r)}</span>`).join("")}${c.applied.map(r=>`<span class="tag" style="color:var(--accent)">${esc(r.label)}</span>`).join("")}</div>`:""}
  <div class="fld"><label class="lbl" for="sh-bucket">Bucket</label><select class="in" id="sh-bucket" data-id="${e.id}">${[...(S.set.buckets||[]),OTHER].map(b=>`<option value="${b.id}" ${bucketIdOf(e)===b.id?"selected":""}>${esc(b.name)}</option>`).join("")}</select></div>
  <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm" data-a="weight" data-v="up" data-id="${e.id}">Rank ${esc(firstName(dispName(e)))} higher</button><button class="btn sm" data-a="weight" data-v="down" data-id="${e.id}">Lower</button><button class="btn sm link" data-a="weights">Ranking mix</button></div>`;
}
function readingHTML(e,list){
 const c=score(e),a=c.a,name=dispName(e),acc=accById(e.accountId);const o=S.box.orig[e.id];const open=OPEN(e),ready=e.status==="ready";const busy=S.busy.has(e.id);
 const comp=S.box.compose&&S.box.compose.id===e.id?S.box.compose:null;const lane=laneOf(e);
 const ids=(list||[]).map(x=>x.id);const pos=ids.indexOf(e.id);
 const tb=`<div class="toolbar">
  <button class="btn sm mobile-back" data-a="closemail" aria-label="Back to list">${ic("back")}</button>
  <span class="qnav"><button class="ib" data-a="qnav" data-v="-1" ${pos<=0?"disabled":""} aria-label="Previous email" title="Previous (K)"><svg class="i" viewBox="0 0 24 24" style="transform:rotate(90deg)">${I.chev}</svg></button><button class="ib" data-a="qnav" data-v="1" ${pos<0||pos>=ids.length-1?"disabled":""} aria-label="Next email" title="Next (J)"><svg class="i" viewBox="0 0 24 24" style="transform:rotate(-90deg)">${I.chev}</svg></button><span class="qpos num">${pos>=0?`${pos+1} of ${ids.length}`:"Not in this list"}</span></span>
  ${open||ready?`<button class="btn sm" data-a="reply" data-id="${e.id}" title="Reply (R)">${ic("reply")}Reply</button><button class="btn sm" data-a="forward" data-id="${e.id}">${ic("fwd")}Forward</button>`:""}
  ${open?`<button class="btn sm" data-a="q-done" data-id="${e.id}" ${busy?"disabled":""} title="Archive it as handled (E)">${ic("check")}Done</button><button class="btn sm" data-a="q-letgo" data-id="${e.id}" ${busy?"disabled":""} title="Archive it, no reply needed">${ic("letgo")}Archive</button><button class="btn sm" data-a="q-pin" data-id="${e.id}" title="${e.provider==="microsoft"?"Flag":"Star"} it and pin to Do today">${ic("pin")}${e.pinned?"Unpin":"Pin"}</button>`:""}
  ${open||ready?`<button class="btn sm" data-a="q-delete" data-id="${e.id}" ${busy?"disabled":""} title="Move to the Bin (#)">${ic("trash")}Delete</button>`:""}${open&&(S.set.buckets||[]).length?`<button class="btn sm" data-a="movepop" data-id="${e.id}" title="Move to another bucket">${ic("move")}Move</button>`:""}
  ${HANDLED.includes(e.status)&&e.status!=="sent"&&e.status!=="delegated"?`<button class="btn sm" data-a="reopen" data-id="${e.id}">${ic("back")}${e.status==="deleted"?"Restore":"Move back to inbox"}</button>`:""}
  ${open||ready?`<button class="btn sm" data-a="addtask" data-id="${e.id}">${ic("task")}Add task</button>`:""}</div>`;
 let bodyHTML;
 if(o&&o.loading)bodyHTML=`<div class="plain muted">Loading message…</div>`;
 else if(o&&o.html&&!S.box.plain)bodyHTML=`<iframe class="frame" title="Message" sandbox="allow-popups allow-popups-to-escape-sandbox" srcdoc="${esc(frameDoc(o.html))}" style="height:min(70vh,900px)"></iframe>`;
 else bodyHTML=`<div class="plain">${esc((o&&o.text)||e.body||e.snippet||"(no text)")}</div>`;
 const qs=queueItems().filter(x=>x.e.id===e.id);
 const to=(o&&o.to)||e.to||"";
 return tb+`<div class="rd">
  <div class="triage">${open?`<button class="pill p-${lane}" data-a="why" data-id="${e.id}" data-tip="score:${e.id}"><span class="d"></span>${LANE[lane]||lane} · ${c.s.toFixed(1)}</button>`:`<span class="pill p-${ready?"ready":"off"}">${ready?"Draft saved":esc(handledLabel(e))}</span>`}${a.project&&a.project!=="General"?`<button class="tag" data-a="project" data-v="${esc(a.project)}">${esc(a.project)}</button>`:""}<span class="tag">${TYPE_L[a.type]||"Email"}</span>${a.ask&&a.ask!=="Nothing"?`<span class="tag tg-ask" data-tip="${esc(a.summary||"")}">Asks: ${esc(a.ask)}</span>`:""}<button class="btn sm link why" data-a="why" data-id="${e.id}" title="Why it ranks here, and how to change it">${ic("info")}Why here?</button></div>
  <h2>${esc(e.subject)}</h2>
  <div class="rd-from"><div class="av" style="background:${avColor(name)}">${esc(initials(name))}</div>
   <div class="rf"><div class="rf-1"><button class="who" data-a="sender" data-v="${esc(name)}">${esc(name)}</button><span class="faint rf-e">&lt;${esc(e.fromEmail)}&gt;</span><span class="rf-d" data-tip="${esc(fullDate(e.date))}">${when(e.date)}</span></div>
    <div class="rf-2">${to?`To ${esc(to)}`:""}${o&&o.cc?` · Cc ${esc(o.cc)}`:""}${acc&&S.accounts.length>1&&!to.toLowerCase().includes(acc.email.toLowerCase())?` · via ${esc(acc.email)}`:""}</div></div></div>
  ${qs.length?`<div class="rd-ap">${qs.map(({q,a:ag})=>apItemHTML(q,e,ag,true)).join("")}</div>`:""}
  ${(()=>{const ts=shownTasksFor(e.id),ss=suggestionsFor(e.id);return ts.length||ss.length?`<div class="rd-tasks">${ts.map(taskRowHTML).join("")}${ss.map(x=>suggestionHTML(x,{noEmail:true})).join("")}</div>`:"";})()}
  ${o&&o.html?`<div style="display:flex;gap:6px">${!S.box.plain?`<button class="btn sm" data-a="toggleimages" title="Remote images can tell senders you opened the email">${ic("eye")}${S.box.images?"Hide images":"Show images"}</button>`:""}<button class="btn sm" data-a="toggleplain">${S.box.plain?"Show formatted":"Plain text"}</button></div>`:""}
  ${bodyHTML}
  ${comp?composerHTML(e,comp):(open||ready)?`<button class="composer" style="text-align:left;color:var(--muted);flex-direction:row;align-items:center" data-a="reply" data-id="${e.id}">${ic("reply")} Reply to ${esc(firstName(name))}…</button>`:""}
 </div>`;
}
function frameDoc(html){
 const img=S.box.images?"img-src data: cid: https: http:;":"img-src data: cid:;";
 return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; ${img} style-src 'unsafe-inline'; font-src data:;"><base target="_blank"><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;font-size:14.5px;line-height:1.5;color:#1d1d1f;background:#fff;margin:16px 18px;word-wrap:break-word}img{max-width:100%;height:auto}</style></head><body>${html}</body></html>`;
}
function composerHTML(e,c){
 const draft=c.mode==="reply"?(S.drafts[e.id]??e.draft??""):(c.note||"");const busy=S.busy.has(e.id);
 const acc=accById(e.accountId);
 return `<div class="composer">
  <div style="display:flex;align-items:center;gap:8px;font-size:13.5px;flex-wrap:wrap"><b>${c.mode==="reply"?`Reply to ${esc(dispName(e))}`:"Forward"}</b><span class="faint">${acc?"from "+esc(acc.email):""}</span><span style="margin-left:auto"></span>${c.mode==="reply"?(S.drafting===e.id?`<span class="status"><span class="spin"></span>Writing</span>`:`<button class="btn sm" data-a="draft" data-id="${e.id}">${ic("spark")}${draft?"Redraft":"Draft with Claude"}</button>`):""}<button class="ib" style="width:28px;height:28px" data-a="closecompose" aria-label="Discard">${ic("x")}</button></div>
  ${c.mode==="forward"?`<input class="in" id="fwdto" type="email" placeholder="Colleague's email" value="${esc(c.to||"")}" aria-label="Forward to">`:""}
  <textarea id="${c.mode==="reply"?"draft":"fwdnote"}" data-id="${e.id}" placeholder="${c.mode==="reply"?"Write your reply":"Add a note"}">${esc(draft)}</textarea>
  ${S.confirmSend===e.id?`<div class="bar2"><span>Send to <b>${esc(c.mode==="reply"?e.fromEmail:c.to)}</b>?</span><span style="margin-left:auto"></span><button class="btn sm" data-a="cancelsend">Cancel</button><button class="btn pri sm" data-a="dosend" data-id="${e.id}" ${busy?"disabled":""}>${ic("send")}Send now</button></div>`
  :`<div class="bar2"><button class="btn pri sm" data-a="send" data-id="${e.id}" ${busy?"disabled":""}>${ic("send")}${c.mode==="reply"?"Send":"Forward"}</button>${c.mode==="reply"?`<button class="btn sm" data-a="savedraft" data-id="${e.id}" ${busy?"disabled":""}>Save draft</button>`:""}<span class="note">${c.mode==="reply"?"Replies in the same thread.":"Forwarding archives the original. It can't be undone."}</span></div>`}
 </div>`;
}
async function loadOriginal(e){
 const B=S.box;if(!e||B.orig[e.id])return;
 if(!live()){B.orig[e.id]={html:null,text:e.body||e.snippet,to:e.to,cc:""};return;}
 B.orig[e.id]={loading:true};render();
 try{const r=await api(`/api/emails/${encodeURIComponent(e.id)}/original`);B.orig[e.id]=r;if(!e.body)e.body=r.text;}catch(err){B.orig[e.id]={html:null,text:e.body||e.snippet,to:e.to};}
 if(S.route.view==="inbox"&&S.box.sel===e.id)render();
}

/* ================= agents ================= */
function vAgents(){
 const A=S.set.agents;const id=S.route.id||(A[0]&&A[0].id);const a=agentById(id);
 const tab=S.route.tab||"activity";
 return topHTML("Agents",`<button class="btn sm" data-a="newagent">${ic("plus")}New agent</button>`)+`<div class="page">${bannersHTML()}
  <div class="ag"><aside class="card agl" aria-label="Your agents">${A.map(x=>{const pend=queueItems().filter(q=>q.a.id===x.id).length;const runs=S.log.filter(l=>l.agentId===x.id).length;
   return `<a class="agi" href="#/agents/${x.id}/${tab}" aria-current="${x.id===id}" data-tip="${esc(plain(agentSentence(x)))}"><span class="agico" style="background:${x.color}">${ic((x.instructions||"").trim()?"spark":"bot")}</span><span style="min-width:0"><div class="nm">${esc(x.name)}</div><div class="s2">${!x.on?"Paused":x.mode==="auto"?"Acts automatically":"Asks first"}${(x.instructions||"").trim()?" · Claude":""}</div></span>${pend?`<span class="pill p-ask num" data-tip="${pend} waiting for approval">${pend}</span>`:runs?`<span class="note num" data-tip="${runs} actions logged">${runs}</span>`:""}</a>`;}).join("")||emptyHTML("No agents yet.")}
   <button class="agi" data-a="newagent" style="color:var(--accent)"><span class="agico" style="background:var(--fill);color:var(--accent)">${ic("plus")}</span><span class="nm">New agent</span></button></aside>
  <section class="card" style="min-width:0">${a?agentDetail(a,tab):emptyHTML("Create an agent to get started.")}</section></div></div>`;
}
function agentDetail(a,tab){
 const T=[["activity","Activity"],["instructions","Instructions"],["context","Context"],["settings","Settings"],["test","Test run"]];
 const hasIns=Boolean((a.instructions||"").trim());
 const head=`<div class="agh"><span class="agico" style="background:${a.color};width:40px;height:40px;border-radius:12px">${ic(hasIns?"spark":"bot")}</span>
  <div style="flex:1;min-width:0"><h2>${esc(a.name)}</h2><div class="meta" style="margin-top:2px"><span class="pill ${!a.on?"p-off":a.mode==="auto"?"p-auto":"p-ask"}" data-tip="${!a.on?"Paused: it won't run on new mail.":a.mode==="auto"?"Acts without asking. Sends only to importance 4 or lower.":"Suggestions wait under Agent approvals."}"><span class="d"></span>${!a.on?"Paused":a.mode==="auto"?"Acts automatically":"Asks first"}</span>${hasIns?`<span class="pill p-ask" data-tip="${isAI(a)?"Claude reads each matching email and decides using the instructions and context.":"Claude isn't available here, so the default action is used."}">Claude-powered</span>`:`<span class="pill p-off" data-tip="Applies the same action to every matching email.">Rule</span>`}</div></div>
  <button class="btn sm" data-a="runagent" data-id="${a.id}" ${a.on?"":"disabled"}>${ic("play")}Run now</button>
  <button class="switch" role="switch" aria-checked="${a.on}" aria-label="${a.on?"Pause":"Resume"} ${esc(a.name)}" data-a="toggleagent" data-id="${a.id}" data-tip="${a.on?"Pause":"Resume"} this agent"></button></div>
  <div class="tabs" role="tablist">${T.map(([k,v])=>`<a class="tab" role="tab" href="#/agents/${a.id}/${k}" aria-selected="${tab===k}">${v}</a>`).join("")}</div>`;
 let b="";
 if(tab==="activity"){
  const pend=queueItems().filter(q=>q.a.id===a.id);const logs=S.log.filter(l=>l.agentId===a.id);const matches=agentMatches(a);
  const week=logs.filter(l=>Date.now()-new Date(l.t)<7*864e5&&!l.undone).reduce((s,l)=>s+((l.emailIds||[]).length||1),0);
  b=`<div class="sentence">${agentSentence(a)}</div>
   <div class="ministats"><div class="ms" data-tip="Emails this agent acted on in the last 7 days"><div class="n num">${week}</div><div class="k">Handled this week</div></div><div class="ms" data-tip="Suggestions waiting for your approval"><div class="n num">${pend.length}</div><div class="k">Waiting for you</div></div><div class="ms" data-tip="${matches.length?"list:"+matches.slice(0,5).map(e=>e.id).join(","):"No open emails match its scope"}"><div class="n num">${matches.length}</div><div class="k">Open emails in scope</div></div></div>
   <div class="fld"><span class="lbl">Waiting for your approval</span>${pend.length?`<div style="display:flex;flex-direction:column;gap:8px">${pend.map(({q,e})=>qItemHTML(q,e,a)).join("")}</div>${pend.length>1?`<div><button class="btn sm pri" data-a="approveagent" data-id="${a.id}">Approve all ${pend.length}</button></div>`:""}`:`<p class="note">${a.mode==="auto"?"This agent acts automatically, so nothing waits here unless it wants to send to important mail.":"Nothing waiting."}</p>`}</div>
   <div class="fld"><span class="lbl">What it has done</span>${logs.length?`<div class="lst">${logs.slice(0,30).map(l=>`<div class="li"${l.undone?' style="opacity:.5"':""}><div class="grow"><div style="font-size:13.5px">${esc(l.text)}</div><div class="s2">${when(l.t)}${l.undone?" · undone":""}${l.reason?" · "+esc(l.reason):""}</div></div>${(l.emailIds||[])[0]&&byId(l.emailIds[0])?`<button class="btn sm" data-a="openmail" data-id="${l.emailIds[0]}">View</button>`:""}${l.undone||!l.undoable?"":`<button class="btn sm" data-a="undo" data-id="${l.id}">Undo</button>`}</div>`).join("")}</div>`:`<p class="note">No actions yet. It runs on new mail after each sync, or press Run now.</p>`}</div>`;
 }else if(tab==="instructions"){
  b=`<p class="muted">Tell this agent what to do in plain language. Claude reads each email in the agent's scope and follows these instructions. Leave it empty to apply the default action from Settings to every match.</p>
   <textarea id="ag-ins" data-id="${a.id}" style="min-height:200px" placeholder="e.g. For invoices from suppliers, file them under Finance. If the amount is over £5,000, pin it instead so I see it today.">${esc(a.instructions)}</textarea>
   <div class="fld"><span class="lbl">What Claude may do</span><div class="checks">${ACTIONS.map(([k,v])=>`<label><input type="checkbox" data-allow="${k}" data-id="${a.id}" ${a.allowed.includes(k)?"checked":""}> ${v}</label>`).join("")}</div>
   <span class="note">Claude can also decide to do nothing. Sending automatically is limited to emails with importance 4 or lower, whatever the instructions say.</span></div>
   <div class="infobox">Start from an example: ${Object.keys(TEMPLATES).map(n=>`<button class="btn link sm" data-a="instemplate" data-v="${esc(n)}" data-id="${a.id}">${esc(n)}</button>`).join("")}</div>
   <span class="note" id="savedmark"></span>`;
 }else if(tab==="context"){
  b=`<p class="muted">Facts this agent should know when deciding: availability, who covers what, addresses to forward to, how to sign off. Only this agent sees it.</p>
   <textarea id="ag-ctx" data-id="${a.id}" style="min-height:200px" placeholder="e.g. Finance contact: dev.okoro@company.com&#10;I'm out of office 3 to 7 November.&#10;Sign off as 'Best, Maya'.">${esc(a.context)}</textarea>
   <div class="fld"><span class="lbl">Shared with every agent</span><div class="box"><div class="kv"><span>About you</span><span>${esc(S.set.about||"Not set")}</span><span>This week</span><span>${esc(S.set.context||"Not set")}</span></div><div><a class="btn link sm" href="#/priorities" style="padding:0">Edit in Priorities</a></div></div></div>
   <span class="note" id="savedmark"></span>`;
 }else if(tab==="settings"){
  const valField=a.field==="all"?`<input class="in" disabled value="Every new email">`:a.field==="type"?`<select class="in" id="ag-val" data-id="${a.id}">${TYPES.map(t=>`<option value="${t}" ${a.value===t?"selected":""}>${TYPE_L[t]}</option>`).join("")}</select>`
   :`<input class="in" id="ag-val" data-id="${a.id}" value="${esc(a.value)}" ${a.field==="sender"?'list="sendl"':a.field==="project"?'list="projl"':""} placeholder="${a.field==="sender"?"Name or email":"Word or phrase"}"><datalist id="sendl">${Object.keys(senders()).map(n=>`<option value="${esc(n)}">`).join("")}</datalist><datalist id="projl">${projects().map(p=>`<option value="${esc(p)}">`).join("")}</datalist>`;
  const pField=a.action==="reply"||a.action==="send"?`<div class="fld full"><label class="lbl" for="ag-param">Default reply text</label><textarea id="ag-param" data-id="${a.id}" style="min-height:80px">${esc(a.param)}</textarea><span class="note">Used when there are no instructions. {first} becomes the sender's first name.</span></div>`
   :a.action==="project"||a.action==="delegate"?`<div class="fld full"><label class="lbl" for="ag-param">${a.action==="project"?"Project":"Colleague's email"}</label><input class="in" id="ag-param" data-id="${a.id}" value="${esc(a.param)}"></div>`:"";
  b=`<div class="form">
   <div class="fld full"><label class="lbl" for="ag-name">Name</label><input class="in" id="ag-name" data-id="${a.id}" value="${esc(a.name)}"></div>
   <div class="fld"><label class="lbl" for="ag-field">Scope: when</label><select class="in" id="ag-field" data-id="${a.id}">${SCOPE_F.map(([k,v])=>`<option value="${k}" ${a.field===k?"selected":""}>${v}</option>`).join("")}</select></div>
   <div class="fld"><label class="lbl" for="ag-val">Value</label>${valField}</div>
   <div class="fld"><label class="lbl" for="ag-max">Only if importance is at most</label><input class="in" id="ag-max" data-id="${a.id}" type="number" min="0" max="10" value="${a.maxI??""}" placeholder="Any"></div>
   <div class="fld"><label class="lbl" for="ag-act">Default action</label><select class="in" id="ag-act" data-id="${a.id}">${ACTIONS.map(([k,v])=>`<option value="${k}" ${a.action===k?"selected":""}>${v}</option>`).join("")}</select></div>
   ${pField}
   <div class="fld full"><span class="lbl">Approval</span><div class="seg"><button data-a="agmode" data-v="ask" data-id="${a.id}" aria-pressed="${a.mode==="ask"}">Ask me first</button><button data-a="agmode" data-v="auto" data-id="${a.id}" aria-pressed="${a.mode==="auto"}">Act automatically</button></div><span class="note">${a.mode==="auto"?"Acts on its own. Sends to important email (above 4) still wait for you.":"Every action waits under Agent approvals."}</span></div>
   <div class="fld full"><span class="lbl">Colour</span><div style="display:flex;gap:8px">${AG_COLORS.map(c=>`<button data-a="agcolor" data-v="${c}" data-id="${a.id}" aria-label="Colour ${c}" style="width:26px;height:26px;border-radius:8px;background:${c};${a.color===c?"box-shadow:0 0 0 2px var(--surface),0 0 0 4px "+c:""}"></button>`).join("")}</div></div>
  </div>
  ${a.action==="delegate"&&!isEmail(a.param)&&!hasIns?`<div class="warnbox">Add the colleague's email address to forward to.</div>`:""}
  <div style="display:flex;gap:8px;align-items:center"><span class="note" id="savedmark"></span><span style="margin-left:auto"></span><button class="btn sm danger" data-a="delagent" data-id="${a.id}">Delete agent</button></div>`;
 }else if(tab==="test"){
  const t=S.tests[a.id];const matches=agentMatches(a);
  b=`<p class="muted">See what this agent would do with your open mail right now. Nothing is changed.</p>
   <div style="display:flex;gap:8px;align-items:center"><button class="btn pri sm" data-a="testagent" data-id="${a.id}" ${t&&t.busy||!matches.length?"disabled":""}>${t&&t.busy?"Thinking…":"Preview on "+matches.length+" email"+(matches.length===1?"":"s")}</button>${!matches.length?`<span class="note">No open emails are in this agent's scope.</span>`:""}</div>
   ${t&&t.res?`<div>${t.res.map(d=>{const e=byId(d.id);if(!e)return "";const auto=autoAllowed(a,d,e);return `<div class="dec"><div style="min-width:0"><div style="font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(e.subject)}</div><div class="note">${esc(dispName(e))} · ${esc(d.reason||"")}</div>${d.param&&(d.action==="reply"||d.action==="send")?`<div class="qitem" style="margin-top:6px"><div class="dr">${esc(String(d.param).replace(/\{first\}/g,firstName(dispName(e))))}</div></div>`:""}</div><span class="pill ${d.action==="none"?"p-off":auto?"p-auto":"p-ask"}" data-tip="${d.action==="none"?"Would leave it alone":auto?"Would act automatically":"Would ask you first"}">${d.action==="none"?"No action":esc(ACT_L[d.action]||d.action)}</span></div>`;}).join("")}</div>`:""}`;
 }
 return head+`<div class="agb">${b}</div>`;
}
function qItemHTML(q,e,a){
 return `<div class="qitem"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b style="font-size:14px">${esc(ACT_L[q.action||a.action]||q.action)}</b><span class="muted" style="font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;flex:1">${esc(e.subject)} · ${esc(dispName(e))}</span></div>
  ${q.reason?`<div class="r">${esc(q.reason)}</div>`:""}
  ${(q.action==="reply"||q.action==="send")&&q.param?`<div class="dr">${esc(String(q.param).replace(/\{first\}/g,firstName(dispName(e))))}</div>`:""}
  <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn pri sm" data-a="approve" data-id="${q.id}">Approve</button><button class="btn sm" data-a="openmail" data-id="${e.id}">View email</button><button class="btn sm" data-a="dismiss" data-id="${q.id}">Dismiss</button></div></div>`;
}
const TEMPLATES={
 "Meeting replies":{field:"type",value:"meeting",action:"reply",allowed:["reply","pin"],instructions:"For meeting requests, draft a short, friendly reply proposing two times from my availability in the context. If it's from my manager, accept their suggested time. If it isn't really a meeting request, do nothing."},
 "Supplier invoices":{field:"any",value:"invoice",action:"project",param:"Finance",allowed:["project","pin","done"],instructions:"For invoices and receipts, file them under the project Finance. If the amount is over £5,000 or it says overdue, pin it instead so I see it today."},
 "VIP watcher":{field:"all",value:"",action:"pin",allowed:["pin","reply"],instructions:"If an email is from someone listed as a VIP in the context and asks me something, pin it. If they're only sharing information, do nothing."}
};

/* ================= priorities, activity, accounts ================= */
const PRESETS={balanced:["Balanced",40,40,20,"An even mix. A good everyday default."],deep:["Deep work",20,70,10,"What matters most comes first, even if it isn't due yet."],catchup:["Catch-up",30,20,50,"Quick wins first, for clearing a backlog in short gaps."],fire:["Firefighting",70,25,5,"Whatever is due soonest comes first, for deadline days."]};
const presetOf=w=>Object.keys(PRESETS).find(k=>{const p=PRESETS[k];return w.u===p[1]&&w.i===p[2]&&w.e===p[3];})||null;
function weightsHTML(w){
 const cur=presetOf(w);const tot=(w.u+w.i+w.e)||1;
 const bars=(u,i,e)=>{const t=(u+i+e)||1;return [["Urgency",u],["Importance",i],["Quick wins",e]].map(([l,v])=>`<span class="wb"><span class="wb-k">${l}</span><span class="wb-t"><i style="width:${Math.round(v/t*100)}%"></i></span><span class="wb-v num">${Math.round(v/t*100)}%</span></span>`).join("");};
 return `<div class="wp-grid">${Object.entries(PRESETS).map(([k,p])=>`<button class="wp${cur===k?" on":""}" data-a="preset" data-v="${k}" aria-pressed="${cur===k}">
   <span class="wp-h"><b>${p[0]}</b>${cur===k?`<span class="wp-on">${ic("check")}Selected</span>`:""}</span>
   <span class="wp-d">${p[4]}</span>${bars(p[1],p[2],p[3])}</button>`).join("")}
  ${cur?"":`<div class="wp on custom"><span class="wp-h"><b>Custom</b><span class="wp-on">${ic("check")}Selected</span></span><span class="wp-d">Your own mix, set below.</span>${bars(w.u,w.i,w.e)}</div>`}</div>
  <button class="disc" data-a="wfine" aria-expanded="${!!S.wFine}">${ic("chev")}Fine-tune the mix</button>
  ${S.wFine?`<div class="fine">${sliders(w)}<p class="note">Each factor's share is its value divided by the total. Now: urgency ${Math.round(w.u/tot*100)}%, importance ${Math.round(w.i/tot*100)}%, quick wins ${Math.round(w.e/tot*100)}%.</p></div>`:""}
  <div class="wprev"><span class="lbl">With this mix, Do today starts with</span><p class="note" id="wprev">${prefPreview()}</p></div>`;
}
function prefPreview(){const st=compute();const t=st.today.slice(0,3).map(e=>e.subject);return t.length?t.map(esc).join(" · "):"Nothing would land in Do today with this mix.";}
const sliders=w=>[["u","Urgency","How soon it matters"],["i","Importance","How much it matters"],["e","Quick wins","Favour low-effort emails"]].map(([k,l,h])=>`<div class="sl"><label for="w-${k}" title="${h}">${l}</label><input id="w-${k}" type="range" min="0" max="100" value="${w[k]}" data-w="${k}"><span class="num" id="wv-${k}">${w[k]}</span></div>`).join("");
const presetSeg=w=>`<div class="seg">${Object.entries(PRESETS).map(([k,p])=>`<button data-a="preset" data-v="${k}" aria-pressed="${w.u===p[1]&&w.i===p[2]&&w.e===p[3]}">${p[0]}</button>`).join("")}</div>`;
const ctxList=ctx=>ctx.length?`<div class="lst">${ctx.map(r=>`<div class="li"><span class="grow">${esc(r.label)}<div class="s2">Until ${shortDate(r.expires)}</div></span><button class="ib" style="width:28px;height:28px" data-a="rmctx" data-id="${r.id}" aria-label="Remove">${ic("x")}</button></div>`).join("")}</div>`:"";
function vPriorities(){
 const w=S.set.w;const ctx=activeCtx();
 return topHTML("Priorities")+`<div class="page"><div class="grid"><div class="col">
  <section class="card"><div class="card-h"><h3>How to weigh each email</h3></div><div class="card-b"><p class="note">Every email gets an urgency, importance and effort score. The mix decides how much each one counts when ranking. Pick the one that fits your day.</p>${weightsHTML(w)}</div></section>
  <section class="card"><div class="card-h"><h3>People and topics</h3></div><div class="card-b">
   <div class="lst">${(S.set.rules||[]).map(r=>`<div class="li"><span class="grow">${esc(r.label)}</span><button class="ib" style="width:28px;height:28px" data-a="rmrule" data-id="${r.id}" aria-label="Remove rule">${ic("x")}</button></div>`).join("")||`<div class="li note">No rules yet. Add one here, or click any sender's name.</div>`}</div>
   <div class="form"><input class="in" id="r-who" placeholder="Name, email or word" aria-label="Who or what" list="sendl"><datalist id="sendl">${Object.keys(senders()).map(n=>`<option value="${esc(n)}">`).join("")}</datalist>
    <div style="display:flex;gap:8px"><select class="in" id="r-eff" aria-label="Effect"><option value="mul|1.5">More important</option><option value="urg|2">More urgent</option><option value="cap|2">Less important</option></select><button class="btn sm" data-a="addrule">Add</button></div></div></div></section>
 </div><div class="col">
  <section class="card"><div class="card-h"><h3>This week's context</h3></div><div class="card-b">
   <p class="note">Say what matters right now. Workbench turns it into rules that expire on Friday, and every agent can read it.</p>
   <textarea id="ctx" placeholder="This week I'm focused on the Q4 budget. Priya (priya@company.com) is covering for Tom. Ignore anything about the office move.">${esc(S.set.context)}</textarea>
   <div><button class="btn pri sm" data-a="applyctx" ${S.ctxBusy?"disabled":""}>${S.ctxBusy?"Reading…":"Update context"}</button></div>${ctxList(ctx)}</div></section>
  <section class="card"><div class="card-h"><h3>About you</h3></div><div class="card-b">
   <textarea id="about" style="min-height:90px" placeholder="Your role and the people who matter, e.g. I'm a programme manager. My manager is Helen Marsh. Northwind is our key client.">${esc(S.set.about)}</textarea>
   <span class="note">Claude uses this when scoring, drafting and running agents. <span id="savedmark"></span></span></div></section>
 </div></div></div>`;
}
function vActivity(){
 const f=S.actFilter;const L=S.log.filter(l=>f==="all"||(f==="agents"?l.agentId:!l.agentId));
 return topHTML("Activity")+`<div class="page">
  <div class="seg">${[["all","Everything"],["you","You"],["agents","Agents"]].map(([k,v])=>`<button data-a="actfilter" data-v="${k}" aria-pressed="${f===k}">${v}</button>`).join("")}</div>
  <section class="card"><div class="feed">${L.map(l=>{const a=l.agentId&&agentById(l.agentId);return `<div class="fi"${l.undone?' style="opacity:.5"':""}><span class="ico" style="background:${a?a.color:"var(--fg)"};color:var(--bg)">${a?ic("bot"):ic("user")}</span><div class="x"><div>${esc(l.text)}</div><div class="s2">${a?`<a href="#/agents/${a.id}">${esc(a.name)}</a>`:esc(l.actor)} · ${esc(fullDate(l.t))}${l.undone?" · undone":""}${l.reason?` · <span data-tip="${esc(l.reason)}" style="text-decoration:underline dotted;cursor:help">why</span>`:""}</div></div><div style="display:flex;gap:4px">${(l.emailIds||[])[0]&&byId(l.emailIds[0])?`<button class="btn sm" data-a="openmail" data-id="${l.emailIds[0]}">View</button>`:""}${l.undone||!l.undoable?"":`<button class="btn sm" data-a="undo" data-id="${l.id}">Undo</button>`}</div></div>`;}).join("")||emptyHTML("Nothing yet. Everything you and your agents do shows up here.")}</div></section></div>`;
}
function vAccounts(){
 return topHTML("Accounts")+`<div class="page"><div class="grid"><div class="col">
  <section class="card"><div class="card-h"><h3>Mailboxes</h3><span class="sp">${live()?`<button class="btn sm" data-a="sync" ${S.syncing?"disabled":""}>${ic("sync")}Check mail</button>`:""}</span></div>
   <div class="card-b">${S.accounts.length?`<div class="lst">${S.accounts.map(a=>{const cnt=S.emails.filter(e=>e.accountId===a.id).length;return `<div class="li"><span class="pv" style="background:${pv(a.provider).c}">${pv(a.provider).l}</span><div class="grow"><div>${esc(a.email)}</div><div class="s2">${pv(a.provider).n} · ${a.error?"Reconnect needed":a.lastSync?"Synced "+esc(fullDate(a.lastSync)):"Not synced yet"} · ${cnt} emails</div></div>${a.error?`<a class="btn sm pri" href="/api/auth/${a.provider}/start?hint=${encodeURIComponent(a.email)}">Reconnect</a>`:""}${live()?`<button class="btn sm" data-a="disconnect" data-id="${a.id}">Disconnect</button>`:""}</div>`;}).join("")}</div>`:`<p class="muted">No mailboxes connected.</p>`}
   <div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn" href="/api/auth/google/start"><span class="pv" style="background:${PV.google.c};width:18px;height:18px">G</span>Add Gmail</a><a class="btn" href="/api/auth/microsoft/start"><span class="pv" style="background:${PV.microsoft.c};width:18px;height:18px">O</span>Add Outlook</a></div>
   <p class="note">Workbench syncs the last 14 days of each inbox when you open it, and every 5 minutes while it's open.</p></div></section>
 </div><div class="col">
  <section class="card"><div class="card-h"><h3>Your account</h3></div><div class="card-b"><div class="kv"><span>Name</span><span>${esc(S.user&&S.user.name||"Not set")}</span><span>Email</span><span>${esc(S.user&&S.user.email||"")}</span>${live()?`<span>Claude</span><span>${S.ai.enabled?`${S.ai.remaining} AI actions left today`:"Not set up on this server"}</span>`:""}</div>
   <div style="display:flex;gap:8px;flex-wrap:wrap">${live()?`<button class="btn sm" data-a="logout">Sign out</button><button class="btn sm danger" data-a="deleteme">Delete my data</button>`:`<button class="btn sm pri" data-a="exitdemo">Leave the demo</button>`}<a class="btn link sm" href="/privacy">Privacy</a></div></div></section>
 </div></div></div>`;
}

/* ================= overlays ================= */
function renderOverlays(){renderSheet();renderBSheet();renderModal();}
function renderSheet(){
 const o=document.getElementById("overlay");const old=o.querySelector(".sh-body");const top=old?old.scrollTop:0;
 o.querySelectorAll(".sheet,.scrim.s").forEach(x=>x.remove());
 const e=S.sheet&&byId(S.sheet);if(!e||S.mode==="signedout")return;
 compute();const c=score(e),a=c.a,tot=c.s||1,name=dispName(e);const open=OPEN(e);
 const bar=(l,v,col)=>`<div class="b"><span>${l}</span><span class="tr"><i style="width:${v*10}%;background:${col}"></i></span><span class="num">${v.toFixed(1)}</span></div>`;
 const lane=laneOf(e);const qs=S.queue.filter(q=>q.emailId===e.id);
 o.insertAdjacentHTML("beforeend",`<div class="scrim s" data-a="closesheet"></div><aside class="sheet" role="dialog" aria-modal="true" aria-label="Email details">
  <div class="sh-top"><button class="ib" data-a="closesheet" aria-label="Close">${ic("x")}</button><span class="note">Triage details</span><span style="margin-left:auto"></span><button class="btn sm" data-a="openmail" data-id="${e.id}">${ic("inbox")}Open in Inbox</button></div>
  <div class="sh-body">
   <div class="meta"><span class="av" style="width:28px;height:28px;font-size:11px;background:${avColor(name)}">${esc(initials(name))}</span><button class="who" style="font-weight:600;color:var(--fg)" data-a="sender" data-v="${esc(name)}">${esc(name)}</button><span class="faint">${esc(e.fromEmail)} · ${when(e.date)}</span></div>
   <h2>${esc(e.subject)}</h2>
   <div class="meta">${open?`<span class="pill p-${lane}"><span class="d"></span>${LANE[lane]}</span>`:`<span class="pill p-off">${esc(handledLabel(e)||"Draft saved")}</span>`}${a.project?`<button class="tag" data-a="project" data-v="${esc(a.project)}">${esc(a.project)}</button>`:""}<span class="tag">${TYPE_L[a.type]||"Email"}</span><span class="tag num">About ${fmtMin(a.min||5)}</span></div>
   <div class="box"><div class="kv"><span>Summary</span><span>${esc(a.summary||e.snippet||"")}</span><span>Asks you</span><span>${esc(a.ask||"Nothing")}</span></div></div>
   ${open?`<div class="bars">${bar("Urgency",c.U,"var(--now)")}${bar("Importance",c.I,"var(--plan)")}${bar("Effort",c.E,"var(--del)")}
    <p class="note">Score ${c.s.toFixed(1)}: ${Math.round(c.cu/tot*100)}% urgency, ${Math.round(c.ci/tot*100)}% importance, ${Math.round(c.ce/tot*100)}% quick win. ${e.by==="ai"?"Scored by Claude.":"Scored by basic rules."}${e._over?" Urgent, but it doesn't fit today's time, so it's in Do later.":""}</p>
    ${(a.reasons||[]).length||c.applied.length?`<div class="chips">${(a.reasons||[]).map(r=>`<span class="tag">${esc(r)}</span>`).join("")}${c.applied.map(r=>`<span class="tag" style="color:var(--accent)">${esc(r.label)}</span>`).join("")}</div>`:""}
    <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm" data-a="weight" data-v="up" data-id="${e.id}">Weight ${esc(firstName(name))} higher</button><button class="btn sm" data-a="weight" data-v="down" data-id="${e.id}">Weight lower</button></div></div>`:""}
   <div class="form" style="gap:10px"><div class="fld"><label class="lbl" for="sh-bucket">Bucket</label><select class="in" id="sh-bucket" data-id="${e.id}">${[...(S.set.buckets||[]),OTHER].map(b=>`<option value="${b.id}" ${bucketIdOf(e)===b.id?"selected":""}>${esc(b.name)}</option>`).join("")}</select></div><div class="fld" style="justify-content:flex-end"><button class="btn sm" data-a="addtask" data-id="${e.id}">${ic("task")}Add task</button></div></div>
   ${(()=>{const ts=shownTasksFor(e.id),ss=suggestionsFor(e.id);return ts.length||ss.length?`<div class="fld"><span class="lbl">Tasks</span><div class="tkl boxed">${ts.map(taskRowHTML).join("")}${ss.map(x=>suggestionHTML(x,{noEmail:true})).join("")}</div></div>`:"";})()}
   ${qs.map(q=>{const ag=agentById(q.agentId);return ag?`<div class="fld"><span class="lbl">${esc(ag.name)} suggests</span>${qItemHTML(q,e,ag)}</div>`:"";}).join("")}
   <div><button class="disc" data-a="full" aria-expanded="${S.sheetFull}">${ic("chev")}Message</button>${S.sheetFull?`<div class="msg" style="margin-top:8px">${esc(e.body||e.snippet||"")}</div>`:""}</div>
  </div>
  <div class="sh-foot">${open?`<button class="btn pri sm" data-a="openmail" data-id="${e.id}" data-v="reply">${ic("reply")}Reply</button><button class="btn sm" data-a="s-done" data-id="${e.id}">Done</button><button class="btn sm" data-a="s-letgo" data-id="${e.id}">Archive</button><button class="btn sm" data-a="s-pin" data-id="${e.id}">${e.pinned?"Unpin":"Pin"}</button><button class="btn sm" data-a="delegate" data-id="${e.id}">Forward</button>`:e.status==="ready"?`<button class="btn pri sm" data-a="openmail" data-id="${e.id}" data-v="reply">${ic("send")}Review and send</button>`:e.status!=="sent"&&e.status!=="delegated"?`<button class="btn sm" data-a="reopen" data-id="${e.id}">Move back to inbox</button>`:""}</div></aside>`);
 const nb=o.querySelector(".sh-body");if(nb)nb.scrollTop=top;
}
function renderModal(){
 const o=document.getElementById("overlay");const keep=captureFocus();o.querySelectorAll(".modal,.scrim.m").forEach(x=>x.remove());
 const M=S.modal;if(!M)return;let h="",title="",foot="",wide=false;
 if(M.t==="compose"){title="New email";wide=true;
  const accs=S.accounts;h=`<div class="form">
   <div class="fld full"><label class="lbl" for="c-from">From</label><select class="in" id="c-from">${accs.map(a=>`<option value="${a.id}" ${M.from===a.id?"selected":""}>${esc(a.email)}</option>`).join("")}</select></div>
   <div class="fld"><label class="lbl" for="c-to">To</label><input class="in" id="c-to" value="${esc(M.to||"")}" placeholder="name@company.com, …"></div>
   <div class="fld"><label class="lbl" for="c-cc">Cc</label><input class="in" id="c-cc" value="${esc(M.cc||"")}" placeholder="Optional"></div>
   <div class="fld full"><label class="lbl" for="c-subj">Subject</label><input class="in" id="c-subj" value="${esc(M.subject||"")}"></div>
   <div class="fld full"><label class="lbl" for="c-body">Message</label><textarea id="c-body" style="min-height:200px">${esc(M.body||"")}</textarea></div></div>
   ${!accs.length?`<div class="warnbox">Connect a mailbox to send email.</div>`:""}`;
  foot=M.confirm?`<span style="margin-right:auto;align-self:center;font-size:14px">Send to <b>${esc(M.to)}</b>?</span><button class="btn sm" data-a="c-cancelsend">Cancel</button><button class="btn pri sm" data-a="c-dosend" ${M.busy?"disabled":""}>${ic("send")}Send now</button>`:`<button class="btn sm" data-a="closemodal">Discard</button><button class="btn sm" data-a="c-draft" ${M.busy||!accs.length?"disabled":""}>Save draft</button><button class="btn pri sm" data-a="c-send" ${M.busy||!accs.length?"disabled":""}>${ic("send")}Send</button>`;}
 else if(M.t==="context"){title="This week's context";
  h=`<p class="muted">Tell Workbench what matters right now. It turns this into rules you can see and remove. Rules expire on Friday.</p>
   <textarea id="ctx" placeholder="This week I'm focused on the Q4 budget. Priya (priya@company.com) is covering for Tom.">${esc(S.set.context)}</textarea>
   ${S.ctxBusy?`<span class="status"><span class="spin"></span>Reading your context</span>`:""}${ctxList(activeCtx())}`;
  foot=`<button class="btn sm" data-a="closemodal">Close</button><button class="btn pri sm" data-a="applyctx" ${S.ctxBusy?"disabled":""}>Update</button>`;}
 else if(M.t==="lane"){const st=compute();const list=st.lanes[M.lane]||[];title=`${LANE[M.lane]} · ${list.length}`;wide=true;
  h=`<p class="muted">${{plan:"Important, but they can wait. Give these a slot later this week.",delegate:"Someone else could handle these. Forwarding sends each one to a colleague and archives it.",letgo:"Low on urgency, importance and effort, so they're safe to archive. You can move any back to the inbox."}[M.lane]}</p>
   <div class="card"><div class="rows">${list.map(e=>rowHTML(e,{q:M.lane})).join("")||emptyHTML("Nothing here.")}</div></div>
   ${M.lane==="delegate"&&list.length?`<div class="fld"><span class="lbl">Forward to</span>${list.map(e=>{const to=(M.to||{})[e.id]??(isEmail(e._c.delegate)?e._c.delegate:"");return `<div style="display:flex;gap:8px;align-items:center"><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13.5px">${esc(e.subject)}</span><input class="in" style="max-width:240px" data-dto="${e.id}" value="${esc(to)}" placeholder="${esc(e._c.delegate||"colleague")}'s email" aria-label="Forward to"></div>`;}).join("")}</div>`:""}`;
  foot=`<button class="btn sm" data-a="closemodal">Close</button>${M.lane==="letgo"&&list.length?`<button class="btn pri sm" data-a="doletgo">Archive all ${list.length}</button>`:""}${M.lane==="delegate"&&list.length?`<button class="btn pri sm" data-a="dodelegateall">Forward ${list.length}</button>`:""}`;}
 else if(M.t==="weights"){title="How to rank your email";const w=S.set.w;
  h=`<p class="muted">Pick how Workbench should rank your email today.</p>${weightsHTML(w)}`;wide=true;
  foot=`<a class="btn sm" href="#/priorities">All priorities</a><button class="btn pri sm" data-a="closemodal">Done</button>`;}
 else if(M.t==="newagent"){title="New agent";
  h=`<div class="fld"><label class="lbl" for="na-name">Name</label><input class="in" id="na-name" value="${esc(M.name||"")}" placeholder="e.g. Invoice filer"></div>
   <div class="fld"><span class="lbl">Start from</span><div class="lst">${[["blank","Blank rule","Pick a scope and one action, no AI"],["Meeting replies","Meeting replies","Drafts replies with times from your availability"],["Supplier invoices","Supplier invoices","Files invoices, pins big or overdue ones"],["VIP watcher","VIP watcher","Pins anything your VIPs ask you"]].map(([k,n,d])=>`<label class="li" style="cursor:pointer"><input type="radio" name="na-t" value="${esc(k)}" ${(M.tpl||"blank")===k?"checked":""} style="accent-color:var(--accent)"><span class="grow"><div>${n}</div><div class="s2">${d}</div></span></label>`).join("")}</div></div>`;
  foot=`<button class="btn sm" data-a="closemodal">Cancel</button><button class="btn pri sm" data-a="createagent">Create</button>`;}
 else if(M.t==="deleteme"){title="Delete your Workbench data?";h=`<p class="muted">This disconnects every mailbox and permanently deletes all mail, scores, settings, agents and history Workbench stored. Your mailboxes themselves aren't affected. This can't be undone.</p>`;foot=`<button class="btn sm" data-a="closemodal">Cancel</button><button class="btn sm redfill" data-a="dodeleteme">Delete everything</button>`;}
 else if(M.t==="disconnect"){const a=accById(M.id);title=`Disconnect ${a?a.email:"this mailbox"}?`;h=`<p class="muted">Workbench stops reading this mailbox and deletes everything it synced from it. Your mail itself isn't touched. To revoke access fully, also remove Workbench in your ${a&&a.provider==="microsoft"?"Microsoft":"Google"} account's security settings.</p>`;foot=`<button class="btn sm" data-a="closemodal">Cancel</button><button class="btn sm redfill" data-a="dodisconnect" data-id="${M.id}">Disconnect</button>`;}
 else if(M.t==="task"){title=M.id?"Edit task":"New task";const e=M.emailId&&byId(M.emailId);
  h=`<div class="fld"><label class="lbl" for="tk-title">Task</label><input class="in" id="tk-title" value="${esc(M.title||"")}" placeholder="e.g. Send Raj the access log"></div>
   <div class="fld"><label class="lbl" for="tk-due">Due</label><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><input class="in" id="tk-due" type="date" value="${esc(M.due||"")}" style="max-width:180px"><div class="seg">${[["Today",0],["Tomorrow",1],["In 3 days",3],["Next week",7],["No date",null]].map(([l,o])=>`<button data-a="tkdue" data-v="${o===null?"":o}" aria-pressed="${(o===null?!M.due:M.due===isoDay(o))}">${l}</button>`).join("")}</div></div></div>
   <div class="fld"><label class="lbl" for="tk-notes">Notes</label><textarea id="tk-notes" style="min-height:80px" placeholder="Optional">${esc(M.notes||"")}</textarea></div>
   ${e?`<div class="fld"><span class="lbl">From email</span><button class="ap-e" data-a="openmail" data-id="${e.id}"><span class="who">${esc(dispName(e))}</span><span class="sub">${esc(e.subject)}</span></button></div>`:""}
   ${e&&!M.id&&openTasks().filter(t=>!linkIds(t).includes(e.id)).length?`<div class="fld"><label class="lbl" for="tk-existing">Or add this email to a task you already have</label><div style="display:flex;gap:8px"><select class="in" id="tk-existing"><option value="">Choose a task…</option>${openTasks().filter(t=>!linkIds(t).includes(e.id)).sort(taskOrder).map(t=>`<option value="${t.id}">${esc(t.title)}</option>`).join("")}</select><button class="btn sm" data-a="tklinkexisting">Link</button></div></div>`:""}`;
  foot=`${M.id?`<button class="btn sm danger" data-a="deltask" data-id="${M.id}" style="margin-right:auto">Delete</button>`:""}<button class="btn sm" data-a="closemodal">Cancel</button><button class="btn pri sm" data-a="savetask">${M.id?"Save":"Add task"}</button>`;}
 else if(M.t==="bucket"){const b=M.b;title=M.isNew?"New bucket":"Edit bucket";wide=true;
  const projs=[...new Set([...projects(),...(b.projects||[])])];
  h=`<div class="form">
   <div class="fld"><label class="lbl" for="bk-name">Name</label><input class="in" id="bk-name" value="${esc(b.name)}"></div>
   <div class="fld"><span class="lbl">Title colour</span><div style="display:flex;gap:8px;flex-wrap:wrap">${BK_COLORS.map(c=>`<button data-a="bkcolor" data-v="${c}" aria-label="Colour ${c}" aria-pressed="${b.color===c}" style="width:26px;height:26px;border-radius:8px;background:${c};${b.color===c?"box-shadow:0 0 0 2px var(--surface),0 0 0 4px "+c:""}"></button>`).join("")}</div></div>
   <div class="fld full"><label class="lbl" for="bk-desc">Description</label><input class="in" id="bk-desc" value="${esc(b.description||"")}" placeholder="What belongs here, in a sentence"></div>
  </div>
  <div class="fld"><span class="lbl">Put email here when any of these match</span><span class="note">Emails go to the first bucket they match, in the order shown on the dashboard.</span></div>
  ${projs.length?`<div class="fld"><span class="lbl">Projects</span><div class="checks">${projs.map(p=>`<label><input type="checkbox" data-bkproj="${esc(p)}" ${(b.projects||[]).includes(p)?"checked":""}> ${esc(p)}</label>`).join("")}</div></div>`:""}
  <div class="fld"><span class="lbl">Types</span><div class="checks">${TYPES.map(t=>`<label><input type="checkbox" data-bktype="${t}" ${(b.types||[]).includes(t)?"checked":""}> ${TYPE_L[t]}</label>`).join("")}</div></div>
  <div class="form"><div class="fld"><label class="lbl" for="bk-senders">Senders</label><input class="in" id="bk-senders" value="${esc((b.senders||[]).join(", "))}" placeholder="Names or email fragments, separated by commas"></div>
   <div class="fld"><label class="lbl" for="bk-keywords">Keywords</label><input class="in" id="bk-keywords" value="${esc((b.keywords||[]).join(", "))}" placeholder="e.g. invoice, forecast"></div></div>
  <p class="note" id="bk-count">${bucketPreview(b)}</p>
  ${(b.include||[]).length||(b.exclude||[]).length?`<div class="note">${(b.include||[]).length} email${(b.include||[]).length===1?"":"s"} placed here by hand or by Claude${(b.exclude||[]).length?`, ${(b.exclude||[]).length} kept out`:""}. <button class="btn link sm" style="padding:0" data-a="bkclear">Clear these</button></div>`:""}`;
  foot=`${M.isNew?"":`<button class="btn sm danger" data-a="delbucket" data-id="${b.id}" style="margin-right:auto">Delete bucket</button>`}<button class="btn sm" data-a="closemodal">Cancel</button><button class="btn pri sm" data-a="savebucket">${M.isNew?"Create bucket":"Save"}</button>`;}
 else if(M.t==="bulk"){const r=bulkModalHTML(M);title=r.title;h=r.h;foot=r.foot;}
 else if(M.t==="delbucket"){const b=bucketById(M.id);title=`Remove ${b?b.name:"bucket"}?`;h=`<p class="muted">Its emails move to other buckets or Everything else. Nothing changes in your mailbox.</p>`;foot=`<button class="btn sm" data-a="closemodal">Cancel</button><button class="btn sm redfill" data-a="dodelbucket" data-id="${M.id}">Remove bucket</button>`;}
 else if(M.t==="delagent"){const a=agentById(M.id);title=`Delete ${a?a.name:"agent"}?`;h=`<p class="muted">Its pending suggestions are removed. Its past actions stay in Activity.</p>`;foot=`<button class="btn sm" data-a="closemodal">Cancel</button><button class="btn sm redfill" data-a="dodelagent" data-id="${M.id}">Delete agent</button>`;}
 o.insertAdjacentHTML("beforeend",`<div class="scrim m" data-a="closemodal"></div><div class="modal${wide?" wide":""}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="mo-h"><h2>${esc(title)}</h2><button class="ib" data-a="closemodal" aria-label="Close">${ic("x")}</button></div><div class="mo-b">${h}</div><div class="mo-f">${foot}</div></div>`);
 restoreFocus(keep);
}
const pop=document.getElementById("pop");let popKey=null;
function openPop(anchor,html,key){
 if(popKey===key&&!pop.hidden){closePop();return;}
 popKey=key;pop.innerHTML=html;pop.hidden=false;
 const r=anchor.getBoundingClientRect();const pw=pop.offsetWidth,ph=pop.offsetHeight;
 let left=r.left<window.innerWidth/2?r.left:r.right-pw;left=Math.min(window.innerWidth-pw-12,Math.max(12,left));
 let top=r.bottom+8;if(top+ph>window.innerHeight-12)top=Math.max(12,r.top-ph-8);
 pop.style.left=left+"px";pop.style.top=top+"px";
}
function closePop(){if(pop){pop.hidden=true;popKey=null;}}
function queueItems(){return S.queue.map(q=>({q,e:byId(q.emailId),a:agentById(q.agentId)})).filter(x=>x.e&&x.a&&OPEN(x.e));}
function popQueue(){
 const items=queueItems();
 return `<div style="display:flex;align-items:center"><h3>Agent approvals</h3>${items.length?`<button class="btn link sm" style="margin-left:auto" data-a="approveall">Approve all</button>`:""}</div>
  ${items.length?items.slice(0,8).map(({q,e,a})=>`<div class="qitem"><div style="font-size:13px"><b>${esc(a.name)}</b> <span class="muted">· ${esc(ACT_L[q.action||a.action]||"")}</span></div><div style="font-size:13.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(e.subject)}</div>${q.reason?`<div class="r">${esc(q.reason)}</div>`:""}<div style="display:flex;gap:4px"><button class="btn pri sm" data-a="approve" data-id="${q.id}">Approve</button><button class="btn sm" data-a="openmail" data-id="${e.id}">View</button><button class="btn sm" data-a="dismiss" data-id="${q.id}">Dismiss</button></div></div>`).join("")+(items.length>8?`<a class="btn sm" href="#/agents">See all ${items.length}</a>`:""):`<p class="muted">Nothing to review.</p>`}`;
}
function popSender(name){
 const n=senders()[name]||0;const r=(S.set.rules||[]).find(x=>x.field==="sender"&&x.value.toLowerCase()===name.toLowerCase());
 const e=S.emails.find(x=>dispName(x)===name);
 return `<div style="display:flex;gap:10px;align-items:center"><div class="av" style="background:${avColor(name)}">${esc(initials(name))}</div><div style="min-width:0"><h3>${esc(name)}</h3><div class="note" style="overflow:hidden;text-overflow:ellipsis">${esc(e?e.fromEmail:"")}</div></div></div>
  <div class="note num">${n} email${n===1?"":"s"} in Workbench</div>
  <div class="fld"><span class="lbl">Weight</span><div class="seg">${[["down","Lower"],["none","Normal"],["up","Higher"],["urgent","Urgent"]].map(([k,v])=>`<button data-a="sweight" data-v="${k}" data-n="${esc(name)}" aria-pressed="${(r?{cap:"down",mul:"up",urg:"urgent"}[r.effect]:"none")===k}">${v}</button>`).join("")}</div></div>
  <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm" data-a="fsender" data-v="${esc(name)}">Show all from ${esc(firstName(name))}</button>${e?`<button class="btn sm" data-a="composeto" data-v="${esc(e.fromEmail)}">${ic("pen")}Email</button>`:""}</div>`;
}
function popBudget(){return `<h3>Time for email today</h3><p class="note">Do today only holds what fits. Urgent email that doesn't fit moves to Do later.</p><div class="seg">${[30,60,90,120,180,240].map(m=>`<button data-a="setbudget" data-v="${m}" aria-pressed="${S.set.budget===m}">${fmtMin(m)}</button>`).join("")}</div>`;}
function popDelegate(e){const sug=score(e).delegate||"";return `<h3>Forward</h3><p class="note">Forwards with a note, then archives it. This can't be undone.</p><input class="in" id="delname" type="email" placeholder="colleague@company.com" value="${esc(isEmail(sug)?sug:"")}"><textarea id="delnote" style="min-height:64px">Could you take this one, please? Thanks.</textarea><button class="btn pri sm" data-a="dodelegate1" data-id="${e.id}">Forward</button>`;}

const tip=document.getElementById("tip");
function tipFor(key){
 if(key.startsWith("score:")){const e=byId(key.slice(6));if(!e)return "";const c=score(e);
  const b=(l,v)=>`<div class="tb"><span>${l}</span><span class="tt"><i style="width:${v*10}%"></i></span><span class="num">${v.toFixed(0)}</span></div>`;
  const why=[...(c.a.reasons||[]),...c.applied.map(r=>r.label)].slice(0,4);
  return `<b>Score ${c.s.toFixed(1)}</b> · ${LANE[laneOf(e)]||""}${b("Urgency",c.U)}${b("Importance",c.I)}${b("Effort",c.E)}${why.length?`<div style="margin-top:5px;opacity:.85">${why.map(esc).join(" · ")}</div>`:""}${e._over?`<div style="margin-top:4px;opacity:.85">Urgent, but doesn't fit today's time</div>`:""}${e.by!=="ai"&&live()&&S.ai.enabled?`<div style="margin-top:4px;opacity:.7">Basic score until Claude sorts it</div>`:""}`;}
 if(key.startsWith("sender:")){const n=key.slice(7);const c=senders()[n]||0;const r=(S.set.rules||[]).find(x=>x.field==="sender"&&n.toLowerCase().includes(x.value.toLowerCase()));return `${esc(n)} · ${c} email${c===1?"":"s"}${r?"<br>"+esc(r.label):""}<br><span style="opacity:.7">Click to adjust weight</span>`;}
 if(key.startsWith("list:")){const es=key.slice(5).split(",").map(byId).filter(Boolean);return es.length?`<ul>${es.map(e=>`<li>${esc(e.subject)}</li>`).join("")}</ul>`:"";}
 if(key.startsWith("acct:")){const a=accById(key.slice(5));if(!a)return "";const cnt=S.emails.filter(e=>e.accountId===a.id&&OPEN(e)).length;return `<b>${esc(a.email)}</b><br>${pv(a.provider).n} · ${a.error?"Reconnect needed":a.lastSync?"Synced "+esc(fullDate(a.lastSync)):"Not synced yet"}<br>${cnt} open emails`;}
 if(key==="queue:"){return `<ul>${queueItems().slice(0,5).map(({q,e,a})=>`<li>${esc(a.name)}: ${esc(ACT_L[q.action||a.action]||"")} · ${esc(e.subject)}</li>`).join("")}</ul>`;}
 if(key.startsWith("bstat:")){const [,bid,stt]=key.split(":");const d=bucketData(S.bview).find(x=>x.b.id===bid);if(!d)return "";const ctx=statusCtx();
  if(stt==="tasks"){const ts=d.active.flatMap(e=>tasksFor(e.id));return ts.length?`<ul>${ts.slice(0,5).map(t=>`<li>${esc(t.title)}${t.due?" · "+esc(dueLabel(t.due)):""}</li>`).join("")}</ul>`:"";}
  const list=stt==="urgent"?d.active.filter(e=>OPEN(e)&&e._today):stt==="approval"?d.active.filter(e=>hasApproval(e,ctx)):d.active.filter(e=>e.unread);
  return list.length?`<ul>${list.slice(0,5).map(e=>`<li>${esc(e.subject)}</li>`).join("")}</ul>`:"";}
 if(key==="agentlog:"){return `<ul>${S.log.filter(l=>l.agentId&&isToday(l.t)).slice(0,5).map(l=>`<li>${esc(l.text)}</li>`).join("")}</ul>`;}
 return esc(key);
}
if(matchMedia("(hover:hover)").matches){
 document.addEventListener("mouseover",ev=>{const t=ev.target.closest("[data-tip]");if(!t){tip.hidden=true;return;}
  const html=tipFor(t.dataset.tip);if(!html){tip.hidden=true;return;}tip.innerHTML=html;tip.hidden=false;
  const r=t.getBoundingClientRect();const w=tip.offsetWidth,h=tip.offsetHeight;
  const left=Math.min(window.innerWidth-w-10,Math.max(10,r.left+r.width/2-w/2));let top=r.top-h-8;if(top<10)top=r.bottom+8;
  tip.style.left=left+"px";tip.style.top=top+"px";});
 document.addEventListener("scroll",()=>{tip.hidden=true;},true);
}
let toastT;function toast(msg,undoId){const t=document.getElementById("toast");t.innerHTML=`<span>${esc(msg)}</span>${undoId?`<button data-a="undo" data-id="${undoId}">Undo</button>`:""}`;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,5000);}
function afterRender(v){if(v==="inbox"&&S.box.sel){const e=byId(S.box.sel);if(e&&!S.box.orig[e.id])loadOriginal(e);if(e&&e.unread&&!S.readSent.has(e.id)){S.readSent.add(e.id);e.unread=false;act([e.id],"read");setTimeout(render,0);}}
 if((v==="dashboard"||v==="buckets")&&S.scrollPanel){S.scrollPanel=false;const p=document.getElementById("bkpanel");if(p&&window.innerWidth<1100)p.scrollIntoView({behavior:"smooth",block:"start"});}}

/* ================= events ================= */
const draftOf=id=>{const ta=document.getElementById("draft");return ta&&ta.dataset.id===id?ta.value:(S.drafts[id]??(byId(id)||{}).draft??"");};
function openMail(id,reply,qk){S.sheet=null;closePop();const e=byId(id);
 const inQ=k=>k&&isQueue(k)&&queueEmails(k).some(x=>x.id===id);
 let q=inQ(qk)?qk:inQ(S.box.queue)?S.box.queue:!e?"all":HANDLED.includes(e.status)?"done":"all";
 if(q!==S.box.queue)S.box.filter=null;
 S.box.compose=reply?{id,mode:"reply"}:(S.box.compose&&S.box.compose.id===id?S.box.compose:null);S.confirmSend=null;go("inbox",q,id);}
function goQueue(k,start){closePop();S.bsheet=null;S.modal=null;renderModal();S.box.filter=null;S.box.q="";S.box.compose=null;const first=start?queueEmails(k)[0]:null;go("inbox",k,first?first.id:null);}
function setAgent(id,patch){const a=agentById(id);if(!a)return;Object.assign(a,patch);saveSet();}
async function onClick(ev){
 const t=ev.target.closest("[data-a]");
 if(!pop.hidden&&!ev.target.closest("#pop")&&!(t&&["queue","sender","budget","delegate","why","movepop"].includes(t.dataset.a)))closePop();
 if(!t||t.disabled)return;const a=t.dataset.a,id=t.dataset.id,v=t.dataset.v;
 const one=async(op,param)=>{const en=await act([id],op,param);if(en)toast(en.text,en.undoable?en.id:null);};
 switch(a){
  case "demo":ev.preventDefault();startDemo();break;
  case "exitdemo":location.hash="#/signup";location.reload();break;
  case "open":case "openmail":closePop();S.modal=null;renderModal();openMail(id,v==="reply",t.dataset.q);break;
  case "goq":goQueue(v,!!t.dataset.start);break;
  case "why":{ev.stopPropagation();const e=byId(id);if(e)openPop(t,popWhy(e),"why"+id);break;}
  case "qnav":{const ids=S.box.lastIds||[];const i=ids.indexOf(S.box.sel);const j=i<0?0:i+Number(v);if(ids[j]){S.box.compose=null;S.confirmSend=null;go("inbox",S.box.queue,ids[j]);}break;}
  case "navtg":{const cur=t.getAttribute("aria-expanded")==="true";S.navOpen[v]=!cur;try{localStorage.setItem("wb.nav",JSON.stringify(S.navOpen));}catch(e){}render();break;}
  case "closesheet":S.sheet=null;renderSheet();break;
  case "full":S.sheetFull=!S.sheetFull;renderSheet();break;
  case "selmail":S.box.compose=null;S.confirmSend=null;go("inbox",S.box.queue||"all",id);break;
  case "closemail":go("inbox",S.box.queue||"all");break;
  case "folder":goQueue(v);break;
  case "clearboxfilter":S.box.filter=null;render();break;
  case "toggleplain":S.box.plain=!S.box.plain;render();break;
  case "toggleimages":S.box.images=!S.box.images;render();break;
  case "q-done":case "s-done":if(a==="s-done"){S.sheet=null;}await one("done");break;
  case "q-letgo":case "s-letgo":if(a==="s-letgo"){S.sheet=null;}await one("letgo");break;
  case "q-pin":case "s-pin":await one("pin");break;
  case "q-delete":await one("delete");break;
  case "movepop":ev.stopPropagation();{const e=byId(id);if(e)openPop(t,popMove(e),"mv"+id);}break;
  case "moveto":closePop();moveToBucket(id,v);break;
  case "stop":break;
  case "bsopen":closePop();S.bsheet={id,st:v||null};render();break;
  case "bsst":S.bsheet&&(S.bsheet.st=v||null);render();{const b=document.querySelector(".bsheet .sh-body");if(b)b.scrollTop=0;}break;
  case "closebsheet":S.bsheet=null;render();break;
  case "bulk":{const d=bucketData(gView(id)).find(x=>x.b.id===id);if(!d)break;const ids=d.active.map(e=>e.id);
   if(v==="read"){const un=d.active.filter(e=>e.unread).map(e=>e.id);un.forEach(x=>{const e=byId(x);if(e)e.unread=false;});render();toast(`Marked ${un.length} as read`);if(live())act(un,"read");break;}
   if(v==="unsub"){const list=unsubSenders(d);const likely=list.filter(x=>x.likely);S.modal={t:"bulk",op:"unsub",bid:id,list,sel:new Set(likely.map(x=>x.email)),archive:true};renderModal();break;}
   S.modal={t:"bulk",op:v,bid:id,ids};renderModal();break;}
  case "dobulk":{const M=S.modal;if(!M)break;S.modal=null;renderModal();const en=await act(M.ids,M.op==="delete"?"delete":"letgo",null,{text:`${M.op==="delete"?"Deleted":"Archived"} ${M.ids.length} email${M.ids.length>1?"s":""} in ${(bucketById(M.bid)||{name:"a bucket"}).name}`});if(en)toast(en.text,en.undoable?en.id:null);break;}
  case "dounsub":if(S.modal&&S.modal.t==="bulk")await runUnsub(S.modal);break;
  case "reopen":await one("reopen");break;
  case "reply":if(S.route.view!=="inbox"){openMail(id,true);break;}S.box.compose={id,mode:"reply"};S.confirmSend=null;render();setTimeout(()=>{const ta=document.getElementById("draft");if(ta)ta.focus();},0);break;
  case "forward":{const e=byId(id);const d=score(e).delegate;S.box.compose={id,mode:"forward",to:isEmail(d)?d:"",note:"Could you take this one, please? Thanks."};S.confirmSend=null;render();break;}
  case "closecompose":S.box.compose=null;S.confirmSend=null;render();break;
  case "send":{const c=S.box.compose;
   if(c&&c.mode==="forward"){c.to=((document.getElementById("fwdto")||{}).value||"").trim();c.note=(document.getElementById("fwdnote")||{}).value||"";if(!isEmail(c.to)){toast("Enter your colleague's email address");return;}}
   else{S.drafts[id]=draftOf(id);if(!S.drafts[id].trim()){toast("Write a reply first");return;}}
   S.confirmSend=id;render();break;}
  case "cancelsend":S.confirmSend=null;render();break;
  case "dosend":{const c=S.box.compose;S.confirmSend=null;let en;
   if(c&&c.mode==="forward")en=await act([id],"delegate",c.to,{text:c.note});else en=await act([id],"send",S.drafts[id]||draftOf(id));
   if(en){toast(en.text);S.box.compose=null;delete S.drafts[id];}render();break;}
  case "savedraft":{const txt=draftOf(id);if(!txt.trim())return;const en=await act([id],"reply",txt);if(en){toast(live()?"Draft saved in your mailbox":"Draft saved",en.id);delete S.drafts[id];S.box.compose=null;render();}break;}
  case "draft":S.drafts[id]=draftOf(id);aiDraft(byId(id));break;
  case "delegate":openPop(t,popDelegate(byId(id)),"del"+id);setTimeout(()=>{const i=document.getElementById("delname");if(i)i.focus();},0);break;
  case "dodelegate1":{const to=document.getElementById("delname").value.trim();const note=document.getElementById("delnote").value;if(!isEmail(to)){toast("Enter your colleague's email address");return;}closePop();S.sheet=null;const en=await act([id],"delegate",to,{text:note});if(en)toast(en.text);break;}
  case "weight":case "sweight":{const name=a==="weight"?dispName(byId(id)):t.dataset.n;
   S.set.rules=(S.set.rules||[]).filter(r=>!(r.field==="sender"&&r.value.toLowerCase()===name.toLowerCase()));
   if(v!=="none")S.set.rules.push({id:uid(),field:"sender",value:name,effect:v==="up"?"mul":v==="down"?"cap":"urg",amount:v==="up"?1.5:2,label:`${name}: ${v==="up"?"more important":v==="down"?"less important":"more urgent"}`});
   saveSet();toast(v==="none"?`${name} back to normal weight`:`${name}: ${v==="up"?"more important":v==="down"?"less important":"more urgent"}. Ranking updated.`);
   render();if(a==="sweight")pop.innerHTML=popSender(name);break;}
  case "sender":ev.stopPropagation();openPop(t,popSender(v),"snd"+v);break;
  case "fsender":closePop();S.box.filter={kind:"sender",v};go("inbox","all");break;
  case "project":closePop();S.box.filter={kind:"project",v};S.sheet=null;S.modal=null;renderModal();go("inbox","all");break;
  case "filter":if(v==="reply")goQueue("replies");else{S.box.filter={kind:v};go("inbox","all");}break;
  case "scrollto":{const el=document.getElementById(v);if(el)el.scrollIntoView({behavior:"smooth",block:"start"});break;}
  case "nav":go(v);break;
  case "lane":S.modal={t:"lane",lane:v,to:{}};renderModal();break;
  case "budget":openPop(t,popBudget(),"budget");break;
  case "setbudget":S.set.budget=Number(v);saveSet();closePop();render();break;
  case "context":S.modal={t:"context"};renderModal();break;
  case "weights":S.modal={t:"weights"};renderModal();break;
  case "applyctx":{const txt=document.getElementById("ctx").value;S.set.context=txt;S.ctxBusy=true;render();
   const rules=txt.trim()?await contextRules(txt):[];S.set.ctx=rules;S.ctxBusy=false;saveSet();toast(rules.length?`${rules.length} rule${rules.length>1?"s":""} from your context`:"No rules found. Try naming a project or person.");render();break;}
  case "rmctx":S.set.ctx=S.set.ctx.filter(r=>r.id!==id);saveSet();render();break;
  case "doletgo":{const ids=compute().lanes.letgo.map(e=>e.id);S.modal=null;const en=await act(ids,"letgo");if(en)toast(en.text,en.id);break;}
  case "dodelegateall":{const list=compute().lanes.delegate;const groups={};const missing=[];
   list.forEach(e=>{const inp=document.querySelector(`[data-dto="${CSS.escape(e.id)}"]`);const to=(inp?inp.value:"").trim();if(isEmail(to))(groups[to]=groups[to]||[]).push(e.id);else missing.push(e);});
   if(missing.length){toast("Add an email address for each one");return;}
   S.modal=null;let n=0;for(const [to,ids] of Object.entries(groups)){const en=await act(ids,"delegate",to,{noRender:true});if(en)n+=ids.length;}render();if(n)toast(`Forwarded ${n} email${n>1?"s":""}`);break;}
  case "preset":{const p=PRESETS[v];S.set.w={u:p[1],i:p[2],e:p[3]};saveSet();render();toast(`Ranking by ${p[0]}`);break;}
  case "wfine":S.wFine=!S.wFine;render();break;
  case "addrule":{const who=document.getElementById("r-who").value.trim();if(!who)return;const [eff,n]=document.getElementById("r-eff").value.split("|");
   S.set.rules=(S.set.rules||[]).concat([{id:uid(),field:"sender",value:who,effect:eff,amount:Number(n),label:`${who}: ${eff==="mul"?"more important":eff==="urg"?"more urgent":"less important"}`}]);saveSet();render();break;}
  case "rmrule":S.set.rules=S.set.rules.filter(r=>r.id!==id);saveSet();render();break;
  case "closemodal":S.modal=null;renderModal();break;
  case "queue":openPop(t,popQueue(),"queue");break;
  case "sync":closePop();sync(true);break;
  case "undo":document.getElementById("toast").hidden=true;await undo(id);break;
  case "approve":{const q=S.queue.find(x=>x.id===id);if(q)await approve(q);if(!pop.hidden)pop.innerHTML=popQueue();render();break;}
  case "dismiss":S.queue=S.queue.filter(x=>x.id!==id);saveQueue([], [id]);delete S.qEdits[id];if(!pop.hidden)pop.innerHTML=popQueue();render();break;
  case "approveall":case "approveagent":{const items=queueItems().filter(x=>a==="approveall"||x.a.id===id);closePop();
   const params=new Map(items.map(({q,a:ag})=>[q.id,qParam(q,ag)]));
   const ids=new Set(items.map(x=>x.q.id));S.queue=S.queue.filter(x=>!ids.has(x.id));saveQueue([],[...ids]);let n=0;S.qEditing=null;
   for(const {q,a:ag} of items){const en=await act([q.emailId],q.action||ag.action,params.get(q.id),{actor:ag.name+" (approved)",agentId:ag.id,reason:q.reason,noRender:true});delete S.qEdits[q.id];if(en)n++;}
   toast(`Approved ${n} suggestion${n===1?"":"s"}`);render();break;}
  case "toggleagent":{const ag=agentById(id);setAgent(id,{on:!ag.on});render();break;}
  case "agmode":setAgent(id,{mode:v});render();break;
  case "agcolor":setAgent(id,{color:v});render();break;
  case "runagent":await runAgents(S.emails.filter(OPEN),{manual:true,only:id});break;
  case "testagent":{const ag=agentById(id);S.tests[id]={busy:true};render();try{S.tests[id]={res:await decide(ag,agentMatches(ag))};}catch(err){S.tests[id]=null;toast(err.message);}render();break;}
  case "instemplate":{const tp=TEMPLATES[v];if(tp){setAgent(id,{instructions:tp.instructions,allowed:tp.allowed});render();toast("Example instructions added. Edit them to fit.");}break;}
  case "newagent":S.modal={t:"newagent"};renderModal();setTimeout(()=>{const i=document.getElementById("na-name");if(i)i.focus();},0);break;
  case "createagent":{const name=document.getElementById("na-name").value.trim();const tpl=(document.querySelector('input[name="na-t"]:checked')||{}).value||"blank";
   const ag=newAgent(Object.assign({name:name||(tpl==="blank"?"New agent":tpl)},TEMPLATES[tpl]||{}));
   if(tpl==="Meeting replies")ag.context="My availability: Tuesday and Thursday afternoons, 14:00 to 17:00 UK time.";
   if(tpl==="VIP watcher")ag.context="VIPs: (add names or email addresses here)";
   S.set.agents.push(ag);saveSet();S.modal=null;go("agents",ag.id,tpl==="blank"?"settings":"instructions");toast(`Created “${ag.name}”`);break;}
  case "delagent":S.modal={t:"delagent",id};renderModal();break;
  case "dodelagent":{S.set.agents=S.set.agents.filter(x=>x.id!==id);const rm=S.queue.filter(q=>q.agentId===id).map(q=>q.id);S.queue=S.queue.filter(q=>q.agentId!==id);saveQueue([],rm);saveSet();S.modal=null;go("agents");break;}
  case "actfilter":S.actFilter=v;render();break;
  case "bucket":S.bucketSel=S.bucketSel===id?null:id;S.bucketStatus=null;S.scrollPanel=!!S.bucketSel;render();break;
  case "closebucket":S.bucketSel=null;S.bucketStatus=null;render();break;
  case "bstatus":S.bucketStatus=v||null;render();break;
  case "bucketinbox":goQueue("g-"+id,true);break;
  case "suggestbuckets":await suggestBuckets(false);break;
  case "refreshsum":await refreshSummaries(true,id);break;
  case "keepbucket":{const b=bucketById(id);if(b){b.kept=true;saveSet();toast(`Kept “${b.name}”`);render();}break;}
  case "newbucket":S.modal={t:"bucket",isNew:true,b:newBucket()};renderModal();setTimeout(()=>{const i=document.getElementById("bk-name");if(i){i.focus();i.select();}},0);break;
  case "editbucket":{const b=bucketById(id);if(b){S.modal={t:"bucket",b:JSON.parse(JSON.stringify(b))};renderModal();}break;}
  case "bkcolor":readBucketForm();S.modal.b.color=v;renderModal();break;
  case "bkclear":readBucketForm();S.modal.b.include=[];S.modal.b.exclude=[];renderModal();break;
  case "savebucket":{readBucketForm();const b=S.modal.b;if(!b.name.trim()){toast("Give the bucket a name");return;}b.kept=true;const i=(S.set.buckets||[]).findIndex(x=>x.id===b.id);
   if(i>=0)S.set.buckets[i]=b;else S.set.buckets=[...(S.set.buckets||[]),b];S.modal=null;saveSet();S.bucketSel=b.id;toast(`Saved “${b.name}”`);render();refreshSummaries(false,b.id);break;}
  case "delbucket":S.modal={t:"delbucket",id};renderModal();break;
  case "dodelbucket":if(S.bsheet&&S.bsheet.id===id)S.bsheet=null;S.set.buckets=(S.set.buckets||[]).filter(b=>b.id!==id);if(S.set.bucketSummaries)delete S.set.bucketSummaries[id];S.modal=null;if(S.bucketSel===id)S.bucketSel=null;saveSet();toast("Bucket removed");render();break;
  case "rdtoggle":S.rundownOpen=!S.rundownOpen;render();break;
  case "rdrefresh":await refreshRundown(true);break;
  case "addtask":{const e=byId(id);if(!e)return;closePop();const sg=suggestionsFor(id)[0];const ask=(e._c||score(e)).a.ask;S.modal={t:"task",emailId:id,key:sg?sg.key:null,title:sg?sg.title:(e.by==="ai"&&ask&&ask!=="Nothing"?ask.replace(/[.?!]+$/,""):shortSubj(e.subject)),due:sg?sg.due:null,notes:""};renderModal();setTimeout(()=>{const i=document.getElementById("tk-title");if(i)i.focus();},0);break;}
  case "newtask":S.modal={t:"task",title:"",due:null,notes:""};renderModal();setTimeout(()=>{const i=document.getElementById("tk-title");if(i)i.focus();},0);break;
  case "edittask":case "taskopen":S.taskOpen=S.taskOpen===id?null:id;S.modal=null;render();break;
  case "tkstatus":await setTaskStatus(id,v);break;
  case "tkunlink":{const tk=S.tasks.find(x=>x.id===id);if(tk){tk.emailIds=linkIds(tk).filter(x=>x!==v);normTask(tk);render();toast("Email unlinked");persistTask(tk);}break;}
  case "tklinkexisting":{const sel=document.getElementById("tk-existing");const tk=sel&&S.tasks.find(x=>x.id===sel.value);if(!tk){toast("Choose a task first");return;}tk.emailIds=[...new Set([...linkIds(tk),S.modal.emailId])];normTask(tk);S.modal=null;render();toast(`Linked to “${tk.title}”`);persistTask(tk);break;}
  case "tkdue":readTaskForm();S.modal.due=v===""?null:isoDay(Number(v));renderModal();break;
  case "savetask":{readTaskForm();const M=S.modal;if(!M.title.trim()){toast("Give the task a title");return;}const old=M.id&&S.tasks.find(x=>x.id===M.id);
   const tk=old?Object.assign({},old,{title:M.title.trim(),due:M.due||null,notes:M.notes}):newTaskObj({emailIds:M.emailId?[M.emailId]:[],title:M.title.trim(),due:M.due||null,notes:M.notes,key:M.key||null,source:M.key?"ai":"user"});S.modal=null;await saveTask(tk,old?"Task saved":"Task added");break;}
  case "deltask":S.modal=null;await deleteTask(id);break;
  case "tasktoggle":await toggleTask(id);break;
  case "toggledone":S.showDone=!S.showDone;render();break;
  case "tsedit":S.tsEdit=v;render();setTimeout(()=>{const i=document.getElementById("tse-title");if(i)i.focus();},0);break;
  case "tscancel":S.tsEdit=null;render();break;
  case "tsapprove":{let edits=null;if(S.tsEdit===v){const ti=document.getElementById("tse-title"),di=document.getElementById("tse-due");edits={title:(ti&&ti.value.trim())||undefined,due:di?(di.value||null):undefined};if(edits.due===undefined)delete edits.due;S.tsEdit=null;}await approveSuggestion(v,edits);break;}
  case "tsdismiss":if(S.tsEdit===v)S.tsEdit=null;await dismissSuggestion(v);break;
  case "dim":S.dim=v;S.showAllDims=false;render();break;
  case "alldims":S.showAllDims=true;render();break;
  case "moreapprovals":S.showAllApprovals=!S.showAllApprovals;render();break;
  case "bview":S.bview=v;S.bucketSel=null;S.bucketStatus=null;render();break;
  case "qedit":{const ta=document.getElementById("qe-"+id);if(ta)S.qEdits[id]=ta.value;S.qEditing=S.qEditing===id?null:id;render();setTimeout(()=>{const t2=document.getElementById("qe-"+id);if(t2)t2.focus();},0);break;}
  case "bkopen":{const dim=S.dim||"project";if(dim==="mailbox"){const acc=S.accounts.find(x=>x.email===v);S.box.account=acc?acc.id:"all";S.box.filter=null;}else S.box.filter={kind:dim,v};go("inbox","all");break;}
  case "bkmailbox":S.box.account=id;S.box.filter=null;go("inbox","all");break;
  case "compose":S.modal={t:"compose",from:S.box.account!=="all"?S.box.account:(S.accounts[0]||{}).id};renderModal();break;
  case "composeto":closePop();S.modal={t:"compose",from:(S.accounts[0]||{}).id,to:v};renderModal();break;
  case "c-send":case "c-draft":{const M=S.modal;readCompose();
   if(!M.to||!M.to.split(/[,;\s]+/).filter(Boolean).every(isEmail)){toast("Check the To addresses");return;}
   if(a==="c-send"){M.confirm=true;renderModal();break;}
   await doCompose("draft");break;}
  case "c-cancelsend":S.modal.confirm=false;renderModal();break;
  case "c-dosend":await doCompose("send");break;
  case "disconnect":S.modal={t:"disconnect",id};renderModal();break;
  case "dodisconnect":try{await api(`/api/accounts/${encodeURIComponent(id)}`,null,"DELETE");S.modal=null;toast("Mailbox disconnected");applyState(await api("/api/state"));}catch(err){toast(err.message);}render();break;
  case "deleteme":S.modal={t:"deleteme"};renderModal();break;
  case "dodeleteme":try{await api("/api/me",null,"DELETE");location.hash="#/signup";location.reload();}catch(err){toast(err.message);}break;
  case "logout":await api("/api/auth/logout",{}).catch(()=>{});location.hash="#/login";location.reload();break;
 }
}
function readBucketForm(){const M=S.modal;if(!M||M.t!=="bucket")return;const b=M.b,g=id=>document.getElementById(id);const list=v=>String(v||"").split(",").map(x=>x.trim()).filter(Boolean).slice(0,30);
 if(g("bk-name"))b.name=g("bk-name").value.slice(0,40);if(g("bk-desc"))b.description=g("bk-desc").value.slice(0,200);if(g("bk-senders"))b.senders=list(g("bk-senders").value);if(g("bk-keywords"))b.keywords=list(g("bk-keywords").value);
 const pr=[...document.querySelectorAll("[data-bkproj]")];if(pr.length)b.projects=pr.filter(x=>x.checked).map(x=>x.dataset.bkproj);
 const ty=[...document.querySelectorAll("[data-bktype]")];if(ty.length)b.types=ty.filter(x=>x.checked).map(x=>x.dataset.bktype);}
function bucketPreview(b){compute();const act=S.emails.filter(e=>OPEN(e)||e.status==="ready");const n=act.filter(e=>(b.include||[]).includes(e.id)||bMatch(b,e)).length;return `${n} open email${n===1?"":"s"} match right now.`;}
function readTaskForm(){const M=S.modal;if(!M||M.t!=="task")return;const g=id=>document.getElementById(id);if(g("tk-title"))M.title=g("tk-title").value.slice(0,200);if(g("tk-due"))M.due=g("tk-due").value||null;if(g("tk-notes"))M.notes=g("tk-notes").value.slice(0,4000);}
function readCompose(){const M=S.modal;if(!M||M.t!=="compose")return;const g=id=>(document.getElementById(id)||{}).value;M.from=g("c-from")||M.from;M.to=(g("c-to")||"").trim();M.cc=(g("c-cc")||"").trim();M.subject=g("c-subj")||"";M.body=g("c-body")||"";}
async function doCompose(mode){
 const M=S.modal;M.busy=true;renderModal();
 if(!live()){S.log.unshift({id:uid(),t:new Date().toISOString(),actor:"You",text:`${mode==="draft"?"Saved a draft":"Sent"} “${M.subject||"(no subject)"}” to ${M.to}`,undoable:false,undone:false});S.modal=null;toast(mode==="draft"?"Draft saved (demo)":"Sent (demo, nothing actually sent)");render();return;}
 try{const r=await api("/api/compose",{accountId:M.from,to:M.to,cc:M.cc,subject:M.subject,body:M.body,mode});if(r.log)S.log.unshift(r.log);S.modal=null;toast(mode==="draft"?"Draft saved in your mailbox":"Sent");render();}
 catch(err){M.busy=false;M.confirm=false;renderModal();toast(err.message);}
}
document.addEventListener("click",ev=>{onClick(ev);});
document.addEventListener("submit",async ev=>{
 if(ev.target.id!=="authform")return;ev.preventDefault();
 const signup=S.route.view==="signup";const g=id=>(document.getElementById(id)||{}).value||"";
 const body={name:g("au-name"),email:g("au-email"),password:g("au-pw")};
 S.authBusy=true;S.authErr="";render();
 try{await api(signup?"/api/auth/signup":"/api/auth/login",body);S.authBusy=false;await enterApp(signup?"connect":"dashboard");}
 catch(err){S.authBusy=false;S.authErr=err.message;render();const em=document.getElementById("au-email");if(em)em.value=body.email;const nm=document.getElementById("au-name");if(nm)nm.value=body.name;}
});
const debounced={};function later(k,fn,ms=500){clearTimeout(debounced[k]);debounced[k]=setTimeout(fn,ms);}
document.addEventListener("input",ev=>{const t=ev.target;const id=t.dataset&&t.dataset.id;
 if(t.dataset&&t.dataset.qe){S.qEdits[t.dataset.qe]=t.value;return;}
 if(t.dataset&&t.dataset.tf&&t.dataset.tf!=="due"){const tk=S.tasks.find(x=>x.id===t.dataset.id);if(tk){tk[t.dataset.tf]=t.dataset.tf==="title"?t.value.slice(0,200):t.value.slice(0,8000);const m=document.getElementById("savedmark");if(m)m.textContent="Saving…";later("tk"+tk.id,()=>{if(tk.title.trim())persistTask(tk);},700);}return;}
 if(S.modal&&S.modal.t==="bucket"&&t.id&&t.id.startsWith("bk-")){readBucketForm();const c=document.getElementById("bk-count");if(c)c.textContent=bucketPreview(S.modal.b);return;}
 if(t.dataset&&t.dataset.w){S.set.w[t.dataset.w]=Number(t.value);const vEl=document.getElementById("wv-"+t.dataset.w);if(vEl)vEl.textContent=t.value;const p=document.getElementById("wprev");if(p)p.innerHTML=prefPreview();saveSet();}
 else if(t.id==="draft"){S.drafts[id]=t.value;}
 else if(t.id==="fwdnote"&&S.box.compose)S.box.compose.note=t.value;
 else if(t.id==="fwdto"&&S.box.compose)S.box.compose.to=t.value;
 else if(t.id==="mq"){S.box.q=t.value;later("mq",render,200);}
 else if(t.id==="about"){S.set.about=t.value;saveSet();}
 else if(t.id==="ag-ins")setAgent(id,{instructions:t.value});
 else if(t.id==="ag-ctx")setAgent(id,{context:t.value});
 else if(t.id==="ag-name")setAgent(id,{name:t.value.slice(0,60)||"Agent"});
 else if(t.id==="ag-param")setAgent(id,{param:t.value});
 else if(t.id==="ag-val")setAgent(id,{value:t.value});
 else if(t.id==="ag-max")setAgent(id,{maxI:t.value===""?null:clamp(t.value)});
 else if(t.dataset&&t.dataset.dto&&S.modal)S.modal.to[t.dataset.dto]=t.value;
 else if(S.modal&&S.modal.t==="compose"&&t.id&&t.id.startsWith("c-"))readCompose();
 else if(t.id==="na-name"&&S.modal)S.modal.name=t.value;
});
document.addEventListener("change",ev=>{const t=ev.target;const id=t.dataset&&t.dataset.id;
 if(t.dataset&&t.dataset.w){render();return;}
 if(t.dataset&&t.dataset.tf==="due"){const tk=S.tasks.find(x=>x.id===t.dataset.id);if(tk){tk.due=t.value||null;render();persistTask(tk);}return;}
 if(t.dataset&&t.dataset.tf==="title"){render();return;}
 if(t.dataset&&t.dataset.tl){const tk=S.tasks.find(x=>x.id===t.dataset.tl);if(tk&&t.value){tk.emailIds=[...new Set([...linkIds(tk),t.value])];normTask(tk);render();toast("Email linked");persistTask(tk);}return;}
 if(t.dataset&&t.dataset.us&&S.modal&&S.modal.op==="unsub"){if(t.checked)S.modal.sel.add(t.dataset.us);else S.modal.sel.delete(t.dataset.us);renderModal();return;}
 if(t.id==="us-arch"&&S.modal){S.modal.archive=t.checked;return;}
 if(t.id==="macct"){S.box.account=t.value;go("inbox",S.box.queue||"all");}
 else if(t.id==="mqsel"){goQueue(t.value);}
 else if(t.id==="sh-bucket"){moveToBucket(t.dataset.id,t.value);}
 else if(S.modal&&S.modal.t==="bucket"&&(t.dataset.bkproj!=null||t.dataset.bktype!=null)){readBucketForm();const c=document.getElementById("bk-count");if(c)c.textContent=bucketPreview(S.modal.b);}
 else if(t.id==="ag-field"){setAgent(id,{field:t.value,value:t.value==="type"?"notification":""});render();}
 else if(t.id==="ag-act"){setAgent(id,{action:t.value,param:t.value==="reply"||t.value==="send"?"Hi {first},\n\nThanks, received. I'll come back to you by the end of the week.\n":""});render();}
 else if(t.id==="ag-val"||t.id==="ag-max"||t.id==="ag-name"||t.id==="ag-ins")render();
 else if(t.dataset&&t.dataset.allow){const ag=agentById(id);const set=new Set(ag.allowed);t.checked?set.add(t.dataset.allow):set.delete(t.dataset.allow);setAgent(id,{allowed:[...set]});}
 else if(t.name==="na-t"&&S.modal)S.modal.tpl=t.value;
});
document.addEventListener("keydown",ev=>{
 if(ev.key==="Escape"){if(!pop.hidden)closePop();else if(S.modal){S.modal=null;renderModal();}else if(S.sheet){S.sheet=null;renderSheet();}else if(S.bsheet){S.bsheet=null;render();}else if(S.route.view==="inbox"&&S.box.compose){S.box.compose=null;render();}}
 if((ev.key==="Enter"||ev.key===" ")&&ev.target.classList&&ev.target.classList.contains("tk-row")){ev.preventDefault();ev.target.click();return;}
 if(ev.key==="Enter"&&ev.target.classList&&ev.target.classList.contains("row")){ev.preventDefault();ev.target.click();return;}
 const tg=ev.target;if(S.route.view!=="inbox"||S.modal||ev.metaKey||ev.ctrlKey||ev.altKey||(tg&&(tg.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName))))return;
 const k=ev.key.toLowerCase();const btn=sel=>{const b=document.querySelector(sel);if(b&&!b.disabled){ev.preventDefault();b.click();}};
 if(k==="j")btn('.toolbar [data-a="qnav"][data-v="1"]');else if(k==="k")btn('.toolbar [data-a="qnav"][data-v="-1"]');
 else if(k==="e")btn('.toolbar [data-a="q-done"]');else if(ev.key==="#"||k==="delete")btn('.toolbar [data-a="q-delete"]');else if(k==="r")btn('.toolbar [data-a="reply"]');
 if(!S.box.sel&&(k==="j"||k==="enter")){const f=document.querySelector('.qclear [data-a="selmail"]');if(f){ev.preventDefault();f.click();}}
});

/* ================= boot ================= */
async function enterApp(view){
 const st=await api("/api/state");S.mode="live";applyState(st);
 const p=new URLSearchParams(location.search);const c=p.get("connected");
 if(c||p.get("error")){const em=authErrText(p);history.replaceState(null,"","/"+(location.hash||""));if(c)setTimeout(()=>toast(`${pv(c).n} connected. Checking mail…`),50);else if(em)setTimeout(()=>toast(em),50);}
 S.route=parseRoute();
 if(view)go(view);else if(["login","signup",""].includes(S.route.view))go(S.accounts.length?"dashboard":"connect");else render();
 sync();
 if(!window.__wbTimer)window.__wbTimer=setInterval(()=>{if(document.visibilityState==="visible")sync();},5*60*1000);
}
async function boot(){
 S.route=parseRoute();render();
 const p=new URLSearchParams(location.search);
 try{await enterApp(p.get("connected")?"dashboard":null);}
 catch(err){S.mode="signedout";if(!["login","signup"].includes(S.route.view))location.hash=p.get("error")?"#/login":"#/login";S.route=parseRoute();render();}
}
boot();
})();
