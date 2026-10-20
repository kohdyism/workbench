/* Workbench client. Renders the inbox, ranks mail with the user's weights and rules, runs agents,
   and talks to the server for sync, mailbox actions and Claude. Also has a local demo mode. */
(() => {
"use strict";

/* ============ icons ============ */
const I={
 check:'<path d="M5 12.5l4.2 4.2L19 7"/>',
 letgo:'<path d="M4 7h16v3H4zM6 10v8a1 1 0 001 1h10a1 1 0 001-1v-8M10 14h4"/>',
 pin:'<path d="M9 4h6l-1 5 3 3v1H7v-1l3-3zM12 13v7"/>',
 x:'<path d="M6 6l12 12M18 6L6 18"/>',
 chev:'<path d="M6 9l6 6 6-6"/>',
 sliders:'<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
 clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
 bell:'<path d="M6 16V11a6 6 0 0112 0v5l1.5 2h-15zM10 20a2 2 0 004 0"/>',
 spark:'<path d="M12 3.5l1.8 5 5 1.8-5 1.8-1.8 5-1.8-5-5-1.8 5-1.8zM18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 search:'<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',
 back:'<path d="M15 5l-7 7 7 7"/>',
 send:'<path d="M4 12l16-8-6 16-2.5-6.5z"/>',
 sync:'<path d="M19 8a7.5 7.5 0 00-13.5-1.5M5 4v3.5h3.5M5 16a7.5 7.5 0 0013.5 1.5M19 20v-3.5h-3.5"/>',
 target:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>'
};
const ic=(n,c="")=>`<svg class="i ${c}" viewBox="0 0 24 24" aria-hidden="true">${I[n]}</svg>`;
const PV={google:{l:"G",c:"#ea4335",n:"Gmail"},microsoft:{l:"O",c:"#0a64d6",n:"Outlook"}};

/* ============ state ============ */
const TYPES=["request","decision","meeting","fyi","notification","newsletter","sales"];
const TYPE_L={request:"Request",decision:"Decision",meeting:"Meeting",fyi:"FYI",notification:"Notification",newsletter:"Newsletter",sales:"Sales"};
const LANE={now:"Today",plan:"Plan",delegate:"Delegate",letgo:"Let go"};
const ACT_L={letgo:"let it go",done:"mark it done",pin:"pin it to Today",reply:"save a draft reply",send:"send a fixed reply",project:"file it",delegate:"forward it"};
const DEFAULT_AGENTS=()=>[
 {id:"a1",name:"Newsletter tidy",field:"type",value:"newsletter",maxI:null,action:"letgo",param:"",mode:"auto",on:true},
 {id:"a2",name:"Notification tidy",field:"type",value:"notification",maxI:3,action:"letgo",param:"",mode:"auto",on:true},
 {id:"a3",name:"Sales filter",field:"type",value:"sales",maxI:null,action:"letgo",param:"",mode:"auto",on:true},
 {id:"a4",name:"Meeting replies",field:"type",value:"meeting",maxI:null,action:"reply",param:"Hi {first},\n\nThanks for this. Could you send two or three times that work for you this week?\n",mode:"ask",on:true}
];
const DEFAULT_SET=()=>({w:{u:40,i:40,e:20},budget:120,about:"",context:"",ctx:[],rules:[],agents:DEFAULT_AGENTS()});
const S={
 mode:"loading", user:null, accounts:[], emails:[], set:DEFAULT_SET(), log:[], queue:[], ai:{enabled:false,remaining:0},
 view:"home", open:{plan:false,delegate:false,letgo:false,handled:false,ready:true}, showAll:{},
 filter:null, q:"", searching:false, sheet:null, sheetWhy:false, sheetFull:false, drafts:{}, drafting:null, confirmSend:null,
 modal:null, syncing:false, syncNote:"", busy:new Set()
};

/* ============ utils ============ */
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clamp=(v,a=0,b=10)=>Math.max(a,Math.min(b,Number.isFinite(+v)?+v:a));
const uid=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4);
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(36);}
const firstName=f=>(String(f).replace(/<.*>/,"").replace(/["']/g,"").trim().split(/[\s,]+/)[0]||"there");
const dispName=e=>e.fromName||e.fromEmail||"Unknown";
const AVC=["#5e5ce6","#0a84ff","#30b0c7","#34c759","#ff9f0a","#ff375f","#af52de","#8e8e93","#ac8e68","#64d2ff"];
const avColor=s=>AVC[parseInt(hash(s||"?"),36)%AVC.length];
const initials=n=>{const p=String(n).replace(/[^\p{L}\s]/gu,"").trim().split(/\s+/);return ((p[0]||"?")[0]+(p[1]?p[1][0]:"")).toUpperCase();};
function when(iso){const d=new Date(iso);if(isNaN(d))return "";const now=new Date();const diff=(now-d)/864e5;
 if(d.toDateString()===now.toDateString())return d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
 if(diff<6)return d.toLocaleDateString("en-GB",{weekday:"short"});return d.toLocaleDateString("en-GB",{day:"numeric",month:"short"});}
const fmtMin=m=>m>=60?`${Math.floor(m/60)}h${m%60?" "+m%60+"m":""}`:`${m}m`;
function fridayEnd(){const d=new Date();const add=(5-d.getDay()+7)%7;d.setDate(d.getDate()+add);d.setHours(23,59,0,0);return d.toISOString();}
const shortDate=iso=>new Date(iso).toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"});
const isEmail=s=>/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(String(s||"").trim());
const live=()=>S.mode==="live";
const byId=id=>S.emails.find(e=>e.id===id);
const OPEN=e=>e.status==="open";

/* ============ server ============ */
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
 const s=st.settings||{};S.set=Object.assign(DEFAULT_SET(),s);if(!Array.isArray(S.set.agents)||!S.set.agents.length)S.set.agents=DEFAULT_AGENTS();
 S.log=st.log||[];S.queue=st.queue||[];S.ai=st.ai||{enabled:false,remaining:0};
}
function mergeEmails(list){(list||[]).forEach(n=>{const i=S.emails.findIndex(e=>e.id===n.id);if(i>=0)S.emails[i]=Object.assign(S.emails[i],n);else S.emails.push(n);});}
let setT;function saveSet(){if(!live())return;clearTimeout(setT);setT=setTimeout(()=>api("/api/settings",{settings:S.set},"PUT").catch(()=>toast("Couldn't save your settings. Check your connection.")),600);}
function saveQueue(add,remove,clear){if(!live())return;api("/api/queue",{add,remove,clear}).catch(()=>{});}

/* ============ basic scoring (used before Claude scores, and in demo) ============ */
function basicScore(e){
 const body=e.body||e.snippet||"";const t=(e.subject+" "+body).toLowerCase(),f=(e.fromName+" "+e.fromEmail).toLowerCase();
 let type="fyi";
 if(/unsubscribe|newsletter|digest|this week's edition|weekly roundup|view in browser/.test(t))type="newsletter";
 else if(/no-?reply|do not reply|notification|automated|alert@|notifications@|jira|workday|calendar/.test(f+" "+t.slice(0,200))&&!/\?/.test(body.slice(0,400)))type="notification";
 else if(/webinar|exclusive offer|free trial|book a demo|special offer|% off|limited time/.test(t))type="sales";
 else if(/approve|approval|sign-?off|decision|go\/no-go|decide/.test(t))type="decision";
 else if(/invite|meeting|call\b|schedule|available|free for/.test(t))type="meeting";
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

/* ============ ranking ============ */
const activeCtx=()=>(S.set.ctx||[]).filter(r=>!r.expires||new Date(r.expires)>new Date());
function ruleMatch(r,e){
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
 const lanes={plan:[],delegate:[],letgo:[]};open.forEach(e=>{if(!today.includes(e)&&lanes[e._lane])lanes[e._lane].push(e);});
 const ready=S.emails.filter(e=>e.status==="ready");
 const handled=S.emails.filter(e=>["done","letgo","delegated","sent"].includes(e.status)).sort((a,b)=>(b.handledAt||"").localeCompare(a.handledAt||""));
 return {open,today,used,lanes,ready,handled};
}
const projects=()=>[...new Set(S.emails.map(e=>e.ai&&e.ai.project).filter(p=>p&&p!=="General"))];
const senders=()=>{const m={};S.emails.forEach(e=>{const k=dispName(e);m[k]=(m[k]||0)+1;});return m;};

/* ============ actions ============ */
const VERB={done:"Done",letgo:"Let go",delegate:"Delegated",pin:"Pinned",reply:"Saved a draft for",send:"Sent a reply to",project:"Filed",reopen:"Reopened"};
const snapL=e=>({id:e.id,status:e.status,pinned:e.pinned,draft:e.draft,delegatedTo:e.delegatedTo,handledAt:e.handledAt,project:e.ai&&e.ai.project});
function applyLocal(e,a,param){
 const now=new Date().toISOString();const txt=String(param||"").replace(/\{first\}/g,firstName(dispName(e)));
 if(a==="done"||a==="letgo"){e.status=a;e.handledAt=now;}
 else if(a==="delegate"){e.status="delegated";e.delegatedTo=param;e.handledAt=now;}
 else if(a==="send"){e.status="sent";e.draft=txt;e.handledAt=now;}
 else if(a==="pin")e.pinned=!e.pinned;
 else if(a==="reply"){e.status="ready";e.draft=txt;}
 else if(a==="project"){e.ai=e.ai||basicScore(e);e.ai.project=param;}
 else if(a==="reopen"){e.status="open";e.delegatedTo="";e.handledAt=null;}
 else if(a==="agentsran")e.agentsRan=true;
}
/** Runs an action on the server (live) or locally (demo). Resolves with the log entry, or null. */
async function act(ids,a,param,actor="You",text){
 ids=ids.filter(Boolean);if(!ids.length)return null;
 if(!live()){
  const es=ids.map(byId).filter(Boolean);const before=es.map(snapL);es.forEach(e=>applyLocal(e,a,param));
  if(a==="agentsran")return null;
  const what=es.length===1?`“${es[0].subject}”`:`${es.length} emails`;
  const en={id:uid(),t:new Date().toISOString(),actor,text:text||`${VERB[a]} ${what}${a==="delegate"?" to "+param:a==="project"?" under "+param:""}`,undoable:a!=="send"&&a!=="delegate",undone:false,_undo:before};
  S.log.unshift(en);return en;
 }
 const quiet=a==="agentsran";if(!quiet){ids.forEach(id=>S.busy.add(id));render();}
 try{
  const r=await api("/api/actions",{ids,action:a,param,actor,text});
  mergeEmails(r.emails);if(r.log)S.log.unshift(r.log);
  if(r.failed&&r.failed.length)toast(r.failed.length===ids.length?r.failed[0].error:`${r.failed.length} couldn't be updated: ${r.failed[0].error}`);
  return r.log;
 }catch(err){toast(err.message);return null;}
 finally{if(!quiet){ids.forEach(id=>S.busy.delete(id));render();}}
}
async function undo(id){
 const en=S.log.find(l=>l.id===id);if(!en||en.undone)return;
 if(!en.undoable){toast("Sent or forwarded email can't be unsent.");return;}
 if(!live()){(en._undo||[]).forEach(s=>{const e=byId(s.id);if(e){Object.assign(e,{status:s.status,pinned:s.pinned,draft:s.draft,delegatedTo:s.delegatedTo,handledAt:s.handledAt});if(e.ai&&s.project)e.ai.project=s.project;}});en.undone=true;toast("Undone");render();return;}
 try{const r=await api("/api/undo",{logId:id});mergeEmails(r.emails);en.undone=true;toast(r.failed&&r.failed.length?"Partly undone: "+r.failed[0]:"Undone");}
 catch(err){toast(err.message);}
 render();if(popKey==="activity")pop.innerHTML=popActivity();
}

/* ============ agents ============ */
function agentMatches(a,pool){return (pool||S.emails.filter(OPEN)).filter(e=>OPEN(e)&&ruleMatch({field:a.field,value:a.value},e)&&(a.maxI==null||a.maxI===""||score(e).I<=Number(a.maxI)));}
const autoOK=a=>a.action!=="send"||(a.maxI!=null&&a.maxI!==""&&Number(a.maxI)<=4);
let agentsRunning=false;
async function runAgents(emails,manual){
 if(agentsRunning)return;agentsRunning=true;
 try{
  let autoCount=0;const add=[];let last=null;
  for(const a of S.set.agents){if(!a.on)continue;
   const ms=agentMatches(a,emails);if(!ms.length)continue;
   if(a.mode==="auto"&&autoOK(a)){last=await act(ms.map(e=>e.id),a.action,a.param,a.name,`${a.name} · ${ACT_L[a.action]} for ${ms.length} email${ms.length>1?"s":""}`);autoCount+=ms.length;}
   else ms.forEach(e=>{if(!S.queue.find(q=>q.emailId===e.id&&q.agentId===a.id)){const q={id:uid(),agentId:a.id,emailId:e.id};S.queue.push(q);add.push(q);}});
  }
  const fresh=emails.filter(e=>!e.agentsRan).map(e=>e.id);
  if(fresh.length)await act(fresh,"agentsran");
  if(add.length)saveQueue(add);
  if(manual||autoCount||add.length){const parts=[];if(autoCount)parts.push(`${autoCount} handled by agents`);if(add.length)parts.push(`${add.length} waiting for your approval`);toast(parts.join(" · ")||"No open emails matched",autoCount&&last?last.id:null);}
 }finally{agentsRunning=false;render();}
}
function agentSentence(a){
 const f={sender:"the sender includes",project:"the project is",subject:"the subject includes",type:"the email is a",any:"the email mentions"}[a.field];
 const val=a.field==="type"?(TYPE_L[a.value]||a.value).toLowerCase():`“${a.value}”`;
 const lim=a.maxI!=null&&a.maxI!==""?` and importance is ${a.maxI} or lower`:"";
 const d={letgo:"let it go",done:"mark it done",pin:"pin it to Today",reply:"save a draft reply",send:"send a fixed reply",project:`file it under ${a.param}`,delegate:`forward it to ${a.param}`}[a.action];
 return `When ${f} <b>${esc(val)}</b>${esc(lim)}, ${esc(d)}.`;
}

/* ============ sync ============ */
async function sync(manual){
 if(!live()||S.syncing)return;
 S.syncing=true;S.syncNote="Checking mail";renderBar();
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
  if(pending.length)await runAgents(pending);
 }catch(err){if(err.status===401){S.mode="signedout";}else toast(err.message);}
 S.syncing=false;S.syncNote="";render();
}

/* ============ AI helpers ============ */
async function aiDraft(e){
 if(!live()||!S.ai.enabled){toast(live()?"Drafting isn't set up on this server.":"Drafting works once you connect a real inbox.");return;}
 S.drafting=e.id;renderSheet();
 try{const r=await api("/api/draft",{id:e.id});S.drafts[e.id]=r.text;}catch(err){toast(err.message);}
 S.drafting=null;renderSheet();
}
async function contextRules(text){
 if(live()&&S.ai.enabled){try{return (await api("/api/context",{text,projects:projects(),senders:Object.keys(senders()).slice(0,80),expires:fridayEnd()})).rules||[];}catch(err){toast(err.message);}}
 return parseContextBasic(text);
}
function parseContextBasic(text){
 const out=[];const ps=projects();const ss=Object.keys(senders());const cap=s=>s[0].toUpperCase()+s.slice(1);
 text.split(/[.\n!;]+/).map(s=>s.trim()).filter(Boolean).forEach(s=>{const l=s.toLowerCase();
  const cov=l.match(/(\w+) is covering (?:for )?(\w+)/);
  if(cov){out.push({id:uid(),field:"any",value:cov[2],effect:"delegate",amount:0,to:cap(cov[1]),label:`${cap(cov[2])}'s mail → suggest ${cap(cov[1])}`,expires:fridayEnd()});return;}
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

/* ============ demo inbox ============ */
function demoInbox(){
 const P={helen:["Helen Marsh","helen.marsh@halden.example"],raj:["Raj Patel","raj.patel@northwind.example"],priya:["Priya Shah","priya.shah@halden.example"],dev:["Dev Okoro","dev.okoro@halden.example"],sam:["Sam Wu","sam.wu@halden.example"],ana:["Ana Lima","ana.lima@halden.example"],lena:["Lena Fischer","lena@talentco.example"],fac:["Facilities Desk","facilities@halden.example"],it:["IT Service Desk","noreply@it.halden.example"],workday:["Workday","notifications@workday.example"],jira:["Jira","jira@halden.example"],carla:["Carla Deane","carla@cloudscale.example"],bright:["Brightdesk","hello@brightdesk.example"],news:["Logistics Weekly","newsletter@logweekly.example"],digest:["Ops Leaders Digest","digest@opsleaders.example"],comms:["Internal Comms","comms@halden.example"],tom:["Tom Reyes","tom.reyes@halden.example"],cal:["Calendar","calendar@halden.example"]};
 const K=[
  ["helen",95,"Q4 budget: need your sign-off on the headcount line by Thu","Hi Maya,\n\nFinance has revised the headcount line down by one FTE. I need your sign-off by Thursday so it goes into the board pack. If you disagree, tell me why and I'll take it to the CFO.\n\nHelen"],
  ["raj",300,"Audit evidence pack: two items still missing","Maya,\n\nWe're still missing the access-review log for September and the signed change approvals for release 4.2. Our auditors start fieldwork on Monday, so we need both before then.\n\nRaj"],
  ["dev",140,"Budget variance query: travel line is 18% over","Hi Maya,\n\nTravel is running 18% over plan, mostly the Northwind site visits. Can you confirm whether that's expected to continue into November?\n\nDev"],
  ["sam",60,"Migration cutover: go/no-go on Friday?","Maya,\n\nLoad tests passed at 1.4x peak. Two open defects are cosmetic. I'm recommending go for Friday 22:00, but it's your call as programme owner. Can you decide by Thursday end of day?\n\nSam"],
  ["priya",200,"Covering Tom's vendor renewals: which ones first?","Hi Maya,\n\nI've got Tom's renewal list. Three expire before he's back. Which should I prioritise?\n\nPriya"],
  ["helen",400,"Board pack: one slide on migration risks","Maya,\n\nCould you draft one slide on the top three migration risks for the board pack? Due next Tuesday.\n\nHelen"],
  ["dev",1300,"Reminder: Q4 forecast locks 31 Oct","All,\n\nForecasts lock on 31 October. Please update your programme lines before then.\n\nDev"],
  ["ana",2900,"Interview feedback overdue: two candidates","Hi Maya,\n\nWe're still waiting on your feedback for the two data analyst candidates. Both have competing offers, so please submit today if you can.\n\nAna"],
  ["lena",180,"Can you do a 30-minute screen on Wednesday?","Hi Maya,\n\nWe have a strong candidate for the analyst role. Are you free for a 30-minute screen on Wednesday afternoon?\n\nLena"],
  ["helen",50,"Can you cover Tuesday's ops review?","Maya, I'm at the board offsite. Could you chair the ops review on Tuesday?\n\nHelen"],
  ["sam",500,"Need a decision: keep the legacy API three more months?","Maya,\n\nTwo internal teams haven't moved off the legacy API. Keeping it costs about £9k a month. Do we extend to January or force the move? I need a decision this week.\n\nSam"],
  ["ana",350,"Offer approval needed: data analyst role","Hi Maya,\n\nThe offer for Jordan is ready and within band. Please approve in Workday so we can send it today.\n\nAna"],
  ["raj",1600,"Phase 2 kick-off date?","Maya,\n\nOnce the audit is done we'd like to start phase 2. Could you suggest a kick-off date in November?\n\nRaj"],
  ["priya",900,"Draft risk register for your review","Hi Maya,\n\nAttached is the draft risk register. It feeds into Helen's board slide, so comments by Monday would be ideal.\n\nPriya"],
  ["sam",700,"Load test results (FYI)","Results attached. All targets met at 1.4x peak. No action needed.\n\nSam"],
  ["raj",1500,"Thanks for the call, notes attached","Notes from Monday attached. No actions for you.\n\nRaj"],
  ["bright",600,"Renewal quote for Tom: expires 28 Oct","Hi Tom,\n\nYour Brightdesk renewal quote expires 28 October. Let us know if you'd like to proceed.\n\nBrightdesk"],
  ["carla",1100,"CloudScale contract question (Tom's account)","Hi, Tom mentioned a possible seat increase. Is that still the plan?\n\nCarla"],
  ["workday",240,"Approve timesheet: Priya Shah","A timesheet is awaiting your approval. This is an automated notification."],
  ["it",800,"Your password expires in 3 days","Change your password before it expires to avoid losing access. Do not reply to this automated message."],
  ["fac",450,"Office move: choose your desk zone","Please choose a desk zone for the new floor by Friday."],
  ["tom",2000,"Out of office until 3 November","I'm on leave until 3 November. Priya Shah is covering. This is an automated reply."],
  ["carla",3000,"Quick question about your cloud spend","Hi Maya, would you be open to a 15-minute call about optimising your cloud spend? Book a demo here. Unsubscribe."]
 ];
 const nl=["Port congestion eases in Q4","Five metrics every ops lead should track","Rail freight volumes up 6%","Inside the warehouse automation boom","Why last-mile costs keep rising"];
 for(let i=0;i<8;i++)K.push([i%2?"news":"digest",120+i*290,(i%2?"Logistics Weekly: ":"Digest: ")+nl[i%nl.length],"This week's edition is here. View in browser for the full stories. Unsubscribe at any time."]);
 for(let i=0;i<8;i++)K.push(["jira",70+i*150,`MIG-${210+i}: status changed to ${["In review","Done","Blocked","In progress"][i%4]}`,"An issue you watch was updated. This is an automated notification."]);
 for(let i=0;i<5;i++)K.push([i%2?"bright":"carla",400+i*500,["Webinar: modern service desks","Your exclusive Q4 offer","Customer story: 40% faster triage","Book your free assessment","Limited time: 20% off"][i],"Hi Maya, I wanted to share an exclusive offer that might help your team. Book a demo or unsubscribe here."]);
 for(let i=0;i<4;i++)K.push(["cal",90+i*240,`Accepted: ${["Ops review","Migration stand-up","Budget sync","1:1 Priya"][i]}`,"This is an automated calendar notification."]);
 return K.map(([p,ago,subj,body],i)=>({id:"d"+i,accountId:"demo",provider:"google",fromName:P[p][0],fromEmail:P[p][1],to:"",subject:subj,snippet:body.slice(0,140),body,date:new Date(Date.now()-ago*60000).toISOString(),status:"open",pinned:false,ai:null,by:"basic",draft:"",delegatedTo:"",agentsRan:false,handledAt:null}));
}
async function startDemo(){
 S.mode="demo";S.user={email:"maya@halden.example"};S.accounts=[{id:"demo",provider:"google",email:"maya@halden.example"}];
 S.set=DEFAULT_SET();
 S.set.about="I'm Maya Okafor, Programme Manager at Halden Freight. My manager is Helen Marsh. Raj Patel at Northwind is our key client.";
 S.set.context="This week I'm focused on the Q4 budget. Priya is covering for Tom while he's on leave. Ignore anything about the office move.";
 S.set.ctx=[{id:uid(),field:"subject",value:"budget",effect:"imp",amount:2,label:"Q4 budget: importance +2",expires:fridayEnd()},{id:uid(),field:"any",value:"tom",effect:"delegate",amount:0,to:"priya.shah@halden.example",label:"Tom's mail → suggest Priya",expires:fridayEnd()},{id:uid(),field:"subject",value:"office move",effect:"cap",amount:1,label:"Office move: importance capped at 1",expires:fridayEnd()}];
 S.emails=demoInbox();S.log=[];S.queue=[];S.ai={enabled:false,remaining:0};
 render();await runAgents(S.emails.filter(OPEN));
}

/* ============ rendering ============ */
function renderBar(){
 const b=document.getElementById("bar");
 if(S.mode==="signedout"||S.mode==="loading"){b.innerHTML=`<div class="logo"><span class="mark">W</span>Workbench</div>`;return;}
 const nq=S.queue.filter(q=>{const e=byId(q.emailId);return e&&OPEN(e);}).length;const acc=S.accounts[0];
 b.innerHTML=`<div class="logo"><span class="mark">W</span>Workbench</div>
  ${S.syncing?`<span class="status" role="status"><span class="spin"></span><span>${esc(S.syncNote)}</span></span>`:""}
  ${S.view==="home"?`<button class="ib" data-a="search" aria-label="Search" title="Search">${ic("search")}</button>`:""}
  <button class="ib" data-a="queue" aria-label="Agent suggestions" title="Agent suggestions">${ic("bell")}${nq?`<span class="dot num">${nq}</span>`:""}</button>
  <button class="ib" data-a="activity" aria-label="Activity" title="Activity and undo">${ic("clock")}</button>
  <button class="ib" data-a="prefs" aria-label="Priorities" title="Priorities">${ic("sliders")}</button>
  <button class="ib" data-a="agents" aria-label="Agents" title="Agents">${ic("spark")}</button>
  <button class="ib" data-a="account" aria-label="Accounts" title="${esc(acc?acc.email:"Accounts")}"><span class="av" style="width:28px;height:28px;font-size:11px;background:${avColor(S.user&&S.user.email)}">${esc(initials((S.user&&S.user.email||"?").split("@")[0].replace(/[._]/g," ")))}</span></button>`;
}
function rowHTML(e,opt={}){
 const c=e._c||score(e),a=c.a,lane=e._lane||"plan",name=dispName(e);const handled=opt.handled;const busy=S.busy.has(e.id);
 return `<div class="row" data-a="open" data-id="${e.id}" tabindex="0"${busy?' style="opacity:.55"':""}>
  <div class="av" style="background:${avColor(name)}" aria-hidden="true">${esc(initials(name))}</div>
  <div class="tx"><div class="l1"><span class="who" data-a="sender" data-v="${esc(name)}" data-tip="sender:${esc(name)}">${esc(name)}</span>${e.pinned?`<span class="pin" title="Pinned">${ic("pin")}</span>`:""}<span class="when">${when(e.date)}</span></div>
   <div class="sub">${esc(e.subject)}</div>
   <div class="sum">${handled?esc(handledLabel(e)):`${a.project&&a.project!=="General"?`<button class="tag" data-a="project" data-v="${esc(a.project)}">${esc(a.project)}</button> `:""}${esc(a.ask&&a.ask!=="Nothing"?a.ask:a.summary||e.snippet||"")}`}</div></div>
  <div class="rt">
   <div class="qa">${handled?(e.status==="sent"||e.status==="delegated"?"":`<button data-a="reopen" data-id="${e.id}" aria-label="Move back to inbox" title="Move back to inbox">${ic("back")}</button>`):e.status==="ready"?`<button data-a="open" data-id="${e.id}" aria-label="Review and send" title="Review and send">${ic("send")}</button>`:`<button data-a="q-done" data-id="${e.id}" aria-label="Done" title="Done (archives it)">${ic("check")}</button><button data-a="q-letgo" data-id="${e.id}" aria-label="Let go" title="Let go (archives with a label)">${ic("letgo")}</button><button data-a="q-pin" data-id="${e.id}" aria-label="${e.pinned?"Unpin":"Pin to Today"}" title="${e.pinned?"Unpin":"Pin to Today"}">${ic("pin")}</button>`}</div>
   ${handled||e.status==="ready"?"":`<span class="score ${lane} num" data-tip="score:${e.id}">${e.by==="ai"||!live()||!S.ai.enabled?c.s.toFixed(1):"·"}</span>`}
  </div></div>`;
}
const handledLabel=e=>({done:"Done",letgo:"Let go",delegated:"Forwarded to "+e.delegatedTo,sent:"Reply sent"}[e.status]||"");
function section(key,title,list,{color,action,blurb}={}){
 if(!list.length)return "";
 const open=S.open[key];const lim=S.showAll[key]?list.length:6;
 return `<section class="sec"><div class="sec-h"><button class="tog" data-a="toggle" data-v="${key}" aria-expanded="${open}">${ic("chev")}<span class="t">${color?`<span class="ldot" style="background:${color}"></span>`:""}${title} <span class="num faint">${list.length}</span></span></button>${blurb?`<span class="note" style="margin-left:4px">${blurb}</span>`:""}<span class="sp">${action||""}</span></div>
  ${open?`<div class="card">${list.slice(0,lim).map(e=>rowHTML(e,{handled:key==="handled"})).join("")}${list.length>lim?`<button class="more" data-a="showall" data-v="${key}">Show all ${list.length}</button>`:""}</div>`:""}</section>`;
}
function landingHTML(){
 const p=new URLSearchParams(location.search);const err=p.get("error");
 const msg={not_configured:`Sign-in with ${p.get("provider")==="microsoft"?"Microsoft":"Google"} isn't set up on this server yet.`,access_denied:"You cancelled the sign-in, so nothing was connected.",state_mismatch:"That sign-in expired. Please try again.",connect_failed:"Workbench couldn't connect that account. Please try again.",no_email:"That account didn't share an email address."}[err];
 return `<div class="land">
  ${msg?`<div class="banner warn">${esc(msg)}</div>`:""}
  <h1>Your inbox,<br>tackled strategically.</h1>
  <p>Connect Gmail or Outlook. Workbench scores every email for urgency, importance and effort, lets agents handle the routine mail, and shows you only what deserves you today.</p>
  <div class="cta">
   <a href="/api/auth/google/start"><span class="pv" style="background:${PV.google.c}">G</span>Continue with Google</a>
   <a href="/api/auth/microsoft/start"><span class="pv" style="background:${PV.microsoft.c}">O</span>Continue with Microsoft</a>
   <button data-a="demo">Try the demo inbox</button>
  </div>
  <p class="fine">Workbench reads your recent inbox to sort it, and archives, labels, drafts or sends only when you ask, or when an agent you set up is allowed to. You can disconnect and delete your data at any time. <a href="/privacy">Privacy</a></p>
 </div>`;
}
function renderHome(){
 const m=document.getElementById("main");
 if(S.mode==="loading"){m.innerHTML=`<p class="muted">Loading…</p>`;return;}
 if(S.mode==="signedout"){m.innerHTML=landingHTML();return;}
 const st=compute();
 const banners=[];
 if(S.mode==="demo")banners.push(`<div class="banner">Demo inbox · actions stay in this browser <button class="btn link sm sp" data-a="exitdemo">Connect a real inbox</button></div>`);
 S.accounts.filter(a=>a.error).forEach(a=>banners.push(`<div class="banner warn">${esc(a.email)} needs reconnecting. <a class="btn link sm sp" href="/api/auth/${a.provider}/start?hint=${encodeURIComponent(a.email)}">Reconnect</a></div>`));
 if(live()&&!S.accounts.length)banners.push(`<div class="banner">No mailbox connected. <a class="btn link sm sp" href="/api/auth/google/start">Connect Gmail</a><a class="btn link sm" href="/api/auth/microsoft/start">Connect Outlook</a></div>`);
 if(live()&&!S.emails.length&&!S.syncing){m.innerHTML=banners.join("")+`<div class="welcome"><h1>Nothing to sort yet.</h1><p>Workbench looks at your inbox from the last two weeks. New mail appears here when it syncs.</p><button class="btn pri" data-a="sync">${ic("sync")}Check mail now</button></div>`;return;}
 if(S.filter||S.q){
  const f=S.filter;let list=[...st.open,...st.ready];
  if(f){list=list.filter(e=>f.kind==="project"?(e.ai&&e.ai.project)===f.v:f.kind==="sender"?dispName(e)===f.v:f.kind==="decision"?e._c&&e._c.a.type==="decision":f.kind==="reply"?["request","decision","meeting"].includes(e._c&&e._c.a.type):true);}
  if(S.q){const q=S.q.toLowerCase();list=list.filter(e=>(dispName(e)+" "+e.subject+" "+(e.body||e.snippet||"")+" "+(e.ai&&e.ai.project||"")).toLowerCase().includes(q));}
  const label=f?{project:"Project",sender:"From",decision:"Decisions",reply:"Replies owed"}[f.kind]+(f.v?": "+f.v:""):"";
  m.innerHTML=`<div class="filt">${S.searching||S.q?`<label class="search">${ic("search")}<input id="q" value="${esc(S.q)}" placeholder="Search mail" aria-label="Search mail"></label>`:""}${f?`<button class="chip on" data-a="clearfilter">${esc(label)} ${ic("x")}</button>`:""}${S.q&&!f?`<button class="btn sm" data-a="clearfilter">Clear</button>`:""}</div>
   <section class="sec"><div class="sec-h"><span class="t">${list.length} open email${list.length===1?"":"s"}</span></div>${list.length?`<div class="card">${list.map(e=>rowHTML(e)).join("")}</div>`:`<p class="muted">Nothing matches.</p>`}</section>`;
  const qi=document.getElementById("q");if(qi&&S.searching&&document.activeElement!==qi){qi.focus();qi.setSelectionRange(qi.value.length,qi.value.length);}
  return;
 }
 const n=st.today.length;const dec=st.open.filter(e=>e._c.a.type==="decision"&&e._lane!=="letgo").length;
 const owed=st.open.filter(e=>["request","decision","meeting"].includes(e._c.a.type)&&e._lane!=="letgo").length;
 const ctx=activeCtx();
 const hero=n?`<em class="num">${n}</em> email${n>1?"s":""} need${n>1?"":"s"} you today.`:st.open.length?"You're clear for today.":"Everything's handled.";
 m.innerHTML=banners.join("")+`
  <div><div class="date">${new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})}</div>
   <h1 class="hero">${hero}</h1>
   <div class="chips">
    <button class="chip" data-a="budget" data-tip="About ${fmtMin(st.used)} planned of ${fmtMin(S.set.budget)}. Click to change how much time you have for email today.">${ic("clock")}<span class="num">${fmtMin(S.set.budget)}</span><span class="k">today</span></button>
    <button class="chip" data-a="context" data-tip="${esc(ctx.length?ctx.map(r=>r.label).join(" · "):"Tell Workbench what this week is about.")}">${ic("target")}<span>${ctx.length?"Context":"Add context"}</span>${ctx.length?`<span class="k num">${ctx.length} rule${ctx.length>1?"s":""}</span>`:""}</button>
    ${dec?`<button class="chip" data-a="flag" data-v="decision" data-tip="Emails asking you to decide something">${dec} <span class="k">decision${dec>1?"s":""}</span></button>`:""}
    ${owed?`<button class="chip" data-a="flag" data-v="reply" data-tip="Requests, decisions and meeting asks that aren't let go">${owed} <span class="k">replies owed</span></button>`:""}
   </div></div>
  ${n?`<section class="sec"><div class="sec-h"><span class="t"><span class="ldot" style="background:var(--now)"></span>Today</span><span class="sp"><span class="note num">${fmtMin(st.used)} of ${fmtMin(S.set.budget)}</span></span></div><div class="card">${st.today.map(e=>rowHTML(e)).join("")}</div></section>`:""}
  ${section("ready","Ready to send",st.ready,{color:"var(--ready)",blurb:"Drafts saved in your mailbox"})}
  ${section("plan","Plan",st.lanes.plan,{color:"var(--plan)"})}
  ${section("delegate","Delegate",st.lanes.delegate,{color:"var(--del)",action:st.lanes.delegate.length?`<button class="btn link sm" data-a="delegateall">Forward all</button>`:""})}
  ${section("letgo","Let go",st.lanes.letgo,{color:"var(--go)",action:`<button class="btn link sm" data-a="letgoall">Let go of ${st.lanes.letgo.length}</button>`})}
  ${section("handled","Handled",st.handled)}
  ${live()&&!S.ai.enabled?`<p class="note">AI isn't set up on this server, so Workbench is sorting with basic rules.</p>`:""}`;
}
function renderAgents(){
 const m=document.getElementById("main");const A=S.set.agents;
 m.innerHTML=`<div><button class="back" data-a="home">${ic("back")}Inbox</button></div>
  <div><h1 class="hero" style="margin:0">Agents</h1><p class="muted" style="margin:8px 0 0;max-width:62ch">Agents run on new mail each time Workbench syncs. They never delete. Agents can only send automatically to emails with importance 4 or lower; everything else asks you first. Every action shows in Activity.</p></div>
  <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn pri sm" data-a="newagent">${ic("plus")}New agent</button>${S.emails.some(OPEN)?`<button class="btn sm" data-a="runall">Run all on open mail</button>`:""}</div>
  <div class="card">${A.map(a=>{const n=agentMatches(a).length;const auto=a.mode==="auto"&&autoOK(a);return `<div class="agent">
   <div class="grow"><span class="nm">${esc(a.name)}</span><span class="ds">${agentSentence(a)}</span>
    <div class="ft"><span class="mode ${auto?"auto":"ask"}" data-tip="${auto?"Acts without asking. Undo from Activity, except sends and forwards.":"Puts suggestions under the bell for you to approve."}">${auto?"Acts automatically":"Asks first"}</span><span class="num">${n} open match${n===1?"":"es"}</span>
     <button class="btn link sm" data-a="runagent" data-id="${a.id}" ${a.on&&n?"":"disabled"}>Run now</button><button class="btn link sm" data-a="editagent" data-id="${a.id}">Edit</button></div></div>
   <button class="switch" role="switch" aria-checked="${a.on}" aria-label="${a.on?"Pause":"Resume"} ${esc(a.name)}" data-a="toggleagent" data-id="${a.id}"></button></div>`;}).join("")||`<div class="agent"><span class="muted">No agents yet.</span></div>`}</div>`;
}
function render(){renderBar();if(S.view==="agents"&&S.mode!=="signedout")renderAgents();else renderHome();renderSheet();renderModal();}

/* ---- sheet ---- */
async function loadBody(e){
 if(e.body||!live())return;
 try{const r=await api(`/api/emails/${encodeURIComponent(e.id)}`);e.body=r.body;}catch(err){e.body=e.snippet;}
 if(S.sheet===e.id)renderSheet();
}
function renderSheet(){
 const o=document.getElementById("overlay");const old=o.querySelector(".sh-body");const top=old?old.scrollTop:0;
 const keepTa=document.getElementById("draft");const focused=keepTa&&document.activeElement===keepTa;const caret=focused?keepTa.selectionStart:null;
 o.querySelectorAll(".sheet,.scrim.s").forEach(x=>x.remove());
 const e=S.sheet&&byId(S.sheet);if(!e)return;
 const c=score(e),a=c.a,tot=c.s||1,name=dispName(e);const open=OPEN(e),ready=e.status==="ready";const busy=S.busy.has(e.id);
 const draft=S.drafts[e.id]??e.draft??"";
 const bar=(l,v,col)=>`<div class="b"><span>${l}</span><span class="tr"><i style="width:${v*10}%;background:${col}"></i></span><span class="num">${v.toFixed(1)}</span></div>`;
 const acc=S.accounts.find(x=>x.id===e.accountId);
 let foot;
 if(open||ready){
  if(S.confirmSend===e.id)foot=`<span style="align-self:center;font-size:14px">Send to <b>${esc(e.fromEmail)}</b>?</span><span style="margin-left:auto"></span><button class="btn sm" data-a="cancelsend">Cancel</button><button class="btn pri sm" data-a="dosend" data-id="${e.id}" ${busy?"disabled":""}>${ic("send")}Send now</button>`;
  else foot=`<button class="btn pri sm" data-a="send" data-id="${e.id}" ${draft.trim()&&!busy?"":"disabled"}>${ic("send")}Send</button>
   <button class="btn sm" data-a="savedraft" data-id="${e.id}" ${draft.trim()&&!busy?"":"disabled"} title="Save as a draft in your mailbox">Save draft</button>
   <button class="btn sm" data-a="s-done" data-id="${e.id}" ${busy?"disabled":""} title="Archives it">Done</button>
   ${open?`<button class="btn sm" data-a="s-letgo" data-id="${e.id}" ${busy?"disabled":""}>Let go</button><button class="btn sm" data-a="delegate" data-id="${e.id}" ${busy?"disabled":""}>Forward</button>`:""}`;
 }else foot=e.status==="sent"||e.status==="delegated"?`<span class="note" style="align-self:center">${esc(handledLabel(e))}</span>`:`<button class="btn sm" data-a="reopen" data-id="${e.id}">Move back to inbox</button>`;
 const html=`<div class="scrim s" data-a="closesheet"></div><aside class="sheet" role="dialog" aria-modal="true" aria-label="Email">
  <div class="sh-top"><button class="ib" data-a="closesheet" aria-label="Close">${ic("x")}</button>${acc&&S.accounts.length>1?`<span class="note">${esc(acc.email)}</span>`:""}<span style="margin-left:auto"></span>
   ${open?`<button class="ib" data-a="s-pin" data-id="${e.id}" aria-label="${e.pinned?"Unpin":"Pin to Today"}" title="${e.pinned?"Unpin":"Pin to Today (stars or flags it)"}">${ic("pin",e.pinned?"pin":"")}</button>`:""}</div>
  <div class="sh-body">
   <div class="meta"><span class="av" style="width:28px;height:28px;font-size:11px;background:${avColor(name)}">${esc(initials(name))}</span><button class="who" style="font-weight:600;color:var(--fg)" data-a="sender" data-v="${esc(name)}">${esc(name)}</button><span class="faint">${esc(e.fromEmail)}</span><span class="faint">· ${when(e.date)}</span></div>
   <h2>${esc(e.subject)}</h2>
   <div class="meta">${a.project?`<button class="tag" data-a="project" data-v="${esc(a.project)}">${esc(a.project)}</button>`:""}<span class="tag">${TYPE_L[a.type]||"Email"}</span><span class="tag num">About ${fmtMin(a.min||5)}</span>${open?`<button class="score ${e._lane||"plan"} num" data-a="why" title="Why it ranks here">${c.s.toFixed(1)}</button>`:`<span class="tag">${esc(handledLabel(e)||"Draft saved")}</span>`}</div>
   ${a.summary||a.ask?`<div class="box"><div class="kv"><span>Summary</span><span>${esc(a.summary||"")}</span><span>Asks you</span><span>${esc(a.ask||"Nothing")}</span></div></div>`:""}
   ${open?`<div><button class="disc" data-a="why" aria-expanded="${S.sheetWhy}">${ic("chev")}Why it ranks here</button>
    ${S.sheetWhy?`<div class="bars" style="margin-top:10px">${bar("Urgency",c.U,"var(--now)")}${bar("Importance",c.I,"var(--plan)")}${bar("Effort",c.E,"var(--del)")}
     <p class="note" style="margin:2px 0 0">${Math.round(c.cu/tot*100)}% urgency, ${Math.round(c.ci/tot*100)}% importance, ${Math.round(c.ce/tot*100)}% quick win. ${e.by==="ai"?"Scored by Claude.":"Scored by basic rules."}${e._over?" Urgent, but it doesn't fit today's time.":""}</p>
     ${(a.reasons||[]).length||c.applied.length?`<div class="chips" style="margin-top:4px">${(a.reasons||[]).map(r=>`<span class="tag">${esc(r)}</span>`).join("")}${c.applied.map(r=>`<span class="tag" style="color:var(--accent)">${esc(r.label)}</span>`).join("")}</div>`:""}
     <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px"><button class="btn sm" data-a="weight" data-v="up" data-id="${e.id}">Weight ${esc(firstName(name))} higher</button><button class="btn sm" data-a="weight" data-v="down" data-id="${e.id}">Weight lower</button></div></div>`:""}</div>`:""}
   <div><div class="msg ${S.sheetFull?"":"clip"}">${e.body==null&&live()?`<span class="muted">Loading message…</span>`:esc(e.body||e.snippet||"(no text)")}</div>${(e.body||"").length>380?`<button class="btn link sm" style="margin-top:6px;padding:0" data-a="full">${S.sheetFull?"Show less":"Show full message"}</button>`:""}</div>
   ${open||ready?`<div class="fld"><div style="display:flex;align-items:center;gap:8px"><span class="lbl">Reply</span><span style="margin-left:auto"></span>${S.drafting===e.id?`<span class="status"><span class="spin"></span>Writing</span>`:live()&&S.ai.enabled?`<button class="btn sm" data-a="draft" data-id="${e.id}">${ic("spark")}${draft?"Redraft":"Draft with Claude"}</button>`:""}</div>
    <textarea id="draft" data-id="${e.id}" placeholder="Write a reply${live()&&S.ai.enabled?", or ask Claude to draft one":""}">${esc(draft)}</textarea>
    <span class="note">${live()?`Sends from ${esc(acc?acc.email:"your account")} as a reply in the same thread.`:"In the demo nothing is actually sent."}</span></div>`:""}
  </div>
  <div class="sh-foot">${foot}</div></aside>`;
 o.insertAdjacentHTML("beforeend",html);
 const nb=o.querySelector(".sh-body");if(nb)nb.scrollTop=top;
 if(focused){const ta=document.getElementById("draft");if(ta){ta.focus();if(caret!=null)ta.setSelectionRange(caret,caret);}}
}

/* ---- modals ---- */
const PRESETS={balanced:["Balanced",40,40,20],deep:["Deep work",20,70,10],catchup:["Catch-up",30,20,50],fire:["Firefighting",70,25,5]};
function prefPreview(){const st=compute();const t=st.today.slice(0,3).map(e=>e.subject);return t.length?`Today would start with: ${t.map(esc).join(" · ")}`:"Nothing would land in Today with these weights.";}
function renderModal(){
 const o=document.getElementById("overlay");o.querySelectorAll(".modal,.scrim.m").forEach(x=>x.remove());
 const M=S.modal;if(!M)return;let h="",title="",foot="";
 if(M.t==="prefs"){title="Priorities";const w=S.set.w;
  const sl=(k,l)=>`<div class="sl"><label for="w-${k}">${l}</label><input id="w-${k}" type="range" min="0" max="100" value="${w[k]}" data-w="${k}"><span class="num" id="wv-${k}">${w[k]}</span></div>`;
  h=`<div class="fld"><span class="lbl">How to weigh each email</span><div class="seg">${Object.entries(PRESETS).map(([k,p])=>`<button data-a="preset" data-v="${k}" aria-pressed="${w.u===p[1]&&w.i===p[2]&&w.e===p[3]}">${p[0]}</button>`).join("")}</div></div>
   <div style="display:flex;flex-direction:column;gap:12px">${sl("u","Urgency")}${sl("i","Importance")}${sl("e","Quick wins")}</div>
   <p class="note" id="wprev">${prefPreview()}</p>
   <div class="fld"><span class="lbl">People and topics</span>
    <div class="list">${(S.set.rules||[]).map(r=>`<div class="li"><span class="grow">${esc(r.label)}</span><button class="ib" style="width:28px;height:28px" data-a="rmrule" data-id="${r.id}" aria-label="Remove rule">${ic("x")}</button></div>`).join("")||`<div class="li note">No rules yet. Add one below, or use “Weight higher” on any email.</div>`}</div>
    <div class="form" style="margin-top:4px"><input class="in" id="r-who" placeholder="Name, email or word" aria-label="Who or what" list="sendl"><datalist id="sendl">${Object.keys(senders()).map(n=>`<option value="${esc(n)}">`).join("")}</datalist>
     <div style="display:flex;gap:8px"><select class="in" id="r-eff" aria-label="Effect"><option value="mul|1.5">More important</option><option value="urg|2">More urgent</option><option value="cap|2">Less important</option></select><button class="btn sm" data-a="addrule">Add</button></div></div></div>
   <div class="fld"><span class="lbl">About you</span><textarea id="about" style="min-height:80px" placeholder="Your role and the people who matter, e.g. I'm a programme manager. My manager is Helen Marsh. Northwind is our key client.">${esc(S.set.about)}</textarea><span class="note">Claude uses this when scoring and drafting.</span></div>`;
  foot=`<button class="btn pri sm" data-a="saveprefs">Done</button>`;}
 else if(M.t==="context"){title="This week's context";const ctx=activeCtx();
  h=`<p class="muted">Tell Workbench what matters right now, in your own words. It turns this into rules you can see and remove. Rules expire on Friday.</p>
   <textarea id="ctx" placeholder="This week I'm focused on the Q4 budget. Priya (priya@company.com) is covering for Tom. Ignore anything about the office move.">${esc(M.text??S.set.context)}</textarea>
   ${M.busy?`<span class="status"><span class="spin"></span>Reading your context</span>`:""}
   ${ctx.length?`<div class="list">${ctx.map(r=>`<div class="li"><span class="grow">${esc(r.label)}<div class="s2">Until ${shortDate(r.expires)}</div></span><button class="ib" style="width:28px;height:28px" data-a="rmctx" data-id="${r.id}" aria-label="Remove">${ic("x")}</button></div>`).join("")}</div>`:""}`;
  foot=`<button class="btn sm" data-a="closemodal">Close</button><button class="btn pri sm" data-a="applyctx" ${M.busy?"disabled":""}>Update</button>`;}
 else if(M.t==="letgo"){const st=compute();const list=st.lanes.letgo;title=`Let go of ${list.length} emails?`;
  const by={};list.forEach(e=>{const k=TYPE_L[e._c.a.type]||"Other";by[k]=(by[k]||0)+1;});
  h=`<p class="muted">These score low on urgency, importance and effort. Workbench archives them${live()?" in your mailbox with a “Workbench/Let go” label":""}. You can move any back or undo from Activity.</p><div class="list">${Object.entries(by).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="li"><span class="grow">${k}</span><span class="num muted">${v}</span></div>`).join("")}</div>`;
  foot=`<button class="btn sm" data-a="closemodal">Cancel</button><button class="btn pri sm" data-a="doletgo">Let go</button>`;}
 else if(M.t==="delegateall"){const st=compute();const list=st.lanes.delegate;title=`Forward ${list.length} emails?`;
  h=`<p class="muted">Each is forwarded with a short note, then archived. Forwarding can't be undone.</p><div class="list">${list.map(e=>{const to=M.to[e.id]??(isEmail(e._c.delegate)?e._c.delegate:"");return `<div class="li" style="flex-wrap:wrap"><span class="grow">${esc(e.subject)}</span><input class="in" style="max-width:220px" data-dto="${e.id}" value="${esc(to)}" placeholder="${esc(e._c.delegate||"")}'s email" aria-label="Forward to"></div>`;}).join("")}</div>`;
  foot=`<button class="btn sm" data-a="closemodal">Cancel</button><button class="btn pri sm" data-a="dodelegateall">Forward</button>`;}
 else if(M.t==="agent"){const b=M.a;title=M.edit?"Edit agent":"New agent";
  const valField=b.field==="type"?`<select class="in" id="g-val">${TYPES.map(t=>`<option value="${t}" ${b.value===t?"selected":""}>${TYPE_L[t]}</option>`).join("")}</select>`
   :b.field==="project"?`<input class="in" id="g-val" list="projl" value="${esc(b.value)}"><datalist id="projl">${projects().map(p=>`<option value="${esc(p)}">`).join("")}</datalist>`
   :`<input class="in" id="g-val" value="${esc(b.value)}" ${b.field==="sender"?'list="sendl2"':""} placeholder="${b.field==="sender"?"Name or email":"Word or phrase"}">${b.field==="sender"?`<datalist id="sendl2">${Object.keys(senders()).map(n=>`<option value="${esc(n)}">`).join("")}</datalist>`:""}`;
  const pField=b.action==="reply"||b.action==="send"?`<div class="fld full"><label class="lbl" for="g-param">Reply text</label><textarea id="g-param" style="min-height:80px">${esc(b.param)}</textarea><span class="note">Use {first} for the sender's first name.</span></div>`
   :b.action==="project"||b.action==="delegate"?`<div class="fld full"><label class="lbl" for="g-param">${b.action==="project"?"Project":"Colleague's email"}</label><input class="in" id="g-param" value="${esc(b.param)}" ${b.action==="delegate"?'type="email" placeholder="name@company.com"':""}></div>`:"";
  const bad=b.mode==="auto"&&!autoOK(b);const badDel=b.action==="delegate"&&!isEmail(b.param);const n=agentMatches(b).length;
  h=`${!M.edit&&live()&&S.ai.enabled?`<div class="fld"><span class="lbl">Describe it</span><div style="display:flex;gap:8px"><input class="in" id="g-desc" value="${esc(M.desc||"")}" placeholder="e.g. Archive Jira updates unless they mention me"><button class="btn sm" data-a="buildagent" ${M.busy?"disabled":""}>${M.busy?"Building…":"Build"}</button></div></div>`:""}
   <div class="form">
    <div class="fld full"><label class="lbl" for="g-name">Name</label><input class="in" id="g-name" value="${esc(b.name)}" placeholder="e.g. Jira tidy"></div>
    <div class="fld"><label class="lbl" for="g-field">When</label><select class="in" id="g-field">${[["type","The email is a"],["sender","The sender includes"],["project","The project is"],["subject","The subject includes"],["any","The email mentions"]].map(([k,v])=>`<option value="${k}" ${b.field===k?"selected":""}>${v}</option>`).join("")}</select></div>
    <div class="fld"><label class="lbl" for="g-val">Value</label>${valField}</div>
    <div class="fld"><label class="lbl" for="g-act">Then</label><select class="in" id="g-act">${[["letgo","Let it go"],["done","Mark done"],["pin","Pin to Today"],["reply","Save a draft reply"],["send","Send a fixed reply"],["project","File under a project"],["delegate","Forward to a colleague"]].map(([k,v])=>`<option value="${k}" ${b.action===k?"selected":""}>${v}</option>`).join("")}</select></div>
    <div class="fld"><label class="lbl" for="g-max">Only if importance is at most</label><input class="in" id="g-max" type="number" min="0" max="10" value="${b.maxI??""}" placeholder="Any"></div>
    ${pField}
    <div class="fld full"><span class="lbl">Approval</span><div class="seg"><button data-a="gmode" data-v="ask" aria-pressed="${b.mode==="ask"}">Ask me first</button><button data-a="gmode" data-v="auto" aria-pressed="${b.mode==="auto"}">Act automatically</button></div></div>
   </div>
   <p class="note num">${n} open email${n===1?"":"s"} match right now.</p>
   ${bad?`<div class="warnbox">Agents can only send automatically when importance is limited to 4 or lower. Set a limit, or choose “Ask me first”.</div>`:""}
   ${badDel?`<div class="warnbox">Add the colleague's email address to forward to.</div>`:""}`;
  foot=`${M.edit?`<button class="btn sm danger" data-a="delagent" style="margin-right:auto">Delete</button>`:""}<button class="btn sm" data-a="closemodal">Cancel</button><button class="btn pri sm" data-a="saveagent" ${bad||badDel?"disabled":""}>${M.edit?"Save":"Create agent"}</button>`;}
 else if(M.t==="deleteme"){title="Delete your Workbench data?";h=`<p class="muted">This disconnects every mailbox and permanently deletes all mail, scores, settings, agents and history Workbench stored. Your actual mailboxes aren't affected. This can't be undone.</p>`;foot=`<button class="btn sm" data-a="closemodal">Cancel</button><button class="btn pri sm" style="background:var(--now)" data-a="dodeleteme">Delete everything</button>`;}
 else if(M.t==="disconnect"){const a=S.accounts.find(x=>x.id===M.id);title=`Disconnect ${a?a.email:"this mailbox"}?`;h=`<p class="muted">Workbench stops reading this mailbox and deletes everything it synced from it. Your mail itself isn't touched. To fully revoke access, also remove Workbench in your ${a&&a.provider==="microsoft"?"Microsoft":"Google"} account's security settings.</p>`;foot=`<button class="btn sm" data-a="closemodal">Cancel</button><button class="btn pri sm" style="background:var(--now)" data-a="dodisconnect" data-id="${M.id}">Disconnect</button>`;}
 o.insertAdjacentHTML("beforeend",`<div class="scrim m" data-a="closemodal"></div><div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="mo-h"><h2>${esc(title)}</h2><button class="ib" data-a="closemodal" aria-label="Close">${ic("x")}</button></div><div class="mo-b">${h}</div><div class="mo-f">${foot}</div></div>`);
}

/* ---- popovers ---- */
const pop=document.getElementById("pop");let popKey=null;
function openPop(anchor,html,key){
 if(popKey===key&&!pop.hidden){closePop();return;}
 popKey=key;pop.innerHTML=html;pop.hidden=false;
 const r=anchor.getBoundingClientRect();const pw=pop.offsetWidth,ph=pop.offsetHeight;
 let left=Math.min(window.innerWidth-pw-12,Math.max(12,r.right-pw));if(r.left+pw<window.innerWidth-12&&r.left<window.innerWidth/2)left=Math.max(12,r.left);
 let top=r.bottom+8;if(top+ph>window.innerHeight-12)top=Math.max(12,r.top-ph-8);
 pop.style.left=left+"px";pop.style.top=top+"px";
}
function closePop(){pop.hidden=true;popKey=null;}
function queueItems(){return S.queue.map(q=>({q,e:byId(q.emailId),a:S.set.agents.find(x=>x.id===q.agentId)})).filter(x=>x.e&&x.a&&OPEN(x.e));}
function popQueue(){
 const items=queueItems();
 return `<div style="display:flex;align-items:center"><h3>Agent suggestions</h3>${items.length?`<button class="btn link sm" style="margin-left:auto" data-a="approveall">Approve all</button>`:""}</div>
  ${items.length?`<div class="list">${items.map(({q,e,a})=>`<div class="li" style="align-items:flex-start"><div class="grow"><div><b>${esc(a.name)}</b> <span class="muted">· ${esc({letgo:"let go",done:"mark done",pin:"pin",reply:"save a draft reply",send:"send a reply",project:"file under "+a.param,delegate:"forward to "+a.param}[a.action])}</span></div><div class="s2" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(e.subject)}</div>
   <div style="display:flex;gap:4px;margin-top:6px"><button class="btn pri sm" data-a="approve" data-id="${q.id}">Approve</button><button class="btn sm" data-a="open" data-id="${e.id}">View</button><button class="btn sm" data-a="dismiss" data-id="${q.id}">Dismiss</button></div></div></div>`).join("")}</div>`:`<p class="muted" style="margin:0">Nothing to review. Agents set to “Ask me first” put their suggestions here.</p>`}`;
}
function popActivity(){
 const L=S.log.slice(0,25);
 return `<h3>Activity</h3>${L.length?`<div class="list">${L.map(l=>`<div class="li"${l.undone?' style="opacity:.5"':""}><div class="grow"><div style="font-size:13.5px">${esc(l.text)}</div><div class="s2">${esc(l.actor)} · ${when(l.t)}${l.undone?" · undone":""}</div></div>${l.undone||!l.undoable?"":`<button class="btn sm" data-a="undo" data-id="${l.id}">Undo</button>`}</div>`).join("")}</div>`:`<p class="muted" style="margin:0">No actions yet. Everything you and your agents do shows up here, with undo where possible.</p>`}`;
}
function popSender(name){
 const n=senders()[name]||0;const r=(S.set.rules||[]).find(x=>x.field==="sender"&&x.value.toLowerCase()===name.toLowerCase());
 const e=S.emails.find(x=>dispName(x)===name);
 return `<div style="display:flex;gap:10px;align-items:center"><div class="av" style="background:${avColor(name)}">${esc(initials(name))}</div><div><h3>${esc(name)}</h3><div class="note">${esc(e?e.fromEmail:"")}</div></div></div>
  <div class="note num">${n} email${n===1?"":"s"} in Workbench</div>
  <div class="fld"><span class="lbl">Weight</span><div class="seg">${[["down","Lower"],["none","Normal"],["up","Higher"],["urgent","Urgent"]].map(([k,v])=>`<button data-a="sweight" data-v="${k}" data-n="${esc(name)}" aria-pressed="${(r?{cap:"down",mul:"up",urg:"urgent"}[r.effect]:"none")===k}">${v}</button>`).join("")}</div></div>
  <button class="btn sm" data-a="fsender" data-v="${esc(name)}">Show all from ${esc(firstName(name))}</button>`;
}
function popBudget(){return `<h3>Time for email today</h3><p class="note" style="margin:0">Today only holds what fits. Urgent emails that don't fit move to Plan.</p><div class="seg">${[30,60,90,120,180,240].map(m=>`<button data-a="setbudget" data-v="${m}" aria-pressed="${S.set.budget===m}">${fmtMin(m)}</button>`).join("")}</div>`;}
function popDelegate(e){const sug=score(e).delegate||"";return `<h3>Forward</h3><p class="note" style="margin:0">Forwards with a short note, then archives it. This can't be undone.</p><input class="in" id="delname" type="email" placeholder="colleague@company.com" value="${esc(isEmail(sug)?sug:"")}"><textarea id="delnote" style="min-height:64px">Could you take this one, please? Thanks.</textarea><button class="btn pri sm" data-a="dodelegate1" data-id="${e.id}">Forward</button>`;}
function popAccount(){
 return `<h3>${esc(S.user?S.user.email:"")}</h3>
  <div class="list">${S.accounts.map(a=>`<div class="li"><span class="acct grow"><span class="pv" style="background:${(PV[a.provider]||PV.google).c}">${(PV[a.provider]||PV.google).l}</span><span><div>${esc(a.email)}</div><div class="s2">${a.error?"Reconnect needed":a.lastSync?"Synced "+when(a.lastSync):"Not synced yet"}</div></span></span>${live()?`<button class="btn sm" data-a="disconnect" data-id="${a.id}">Disconnect</button>`:""}</div>`).join("")||`<div class="li note">No mailboxes connected.</div>`}</div>
  ${live()?`<div style="display:flex;gap:6px;flex-wrap:wrap"><a class="btn sm" href="/api/auth/google/start">${ic("plus")}Gmail</a><a class="btn sm" href="/api/auth/microsoft/start">${ic("plus")}Outlook</a><button class="btn sm" data-a="sync" ${S.syncing?"disabled":""}>${ic("sync")}Check mail</button></div>
   <div style="display:flex;gap:6px;flex-wrap:wrap;border-top:1px solid var(--line);padding-top:10px"><button class="btn sm" data-a="logout">Sign out</button><button class="btn sm danger" data-a="deleteme">Delete my data</button><a class="btn link sm" href="/privacy">Privacy</a></div>`
  :`<button class="btn pri sm" data-a="exitdemo">Connect a real inbox</button>`}`;
}

/* ---- tooltip + toast ---- */
const tip=document.getElementById("tip");
function tipFor(key){
 if(key.startsWith("score:")){const e=byId(key.slice(6));if(!e)return "";const c=score(e);
  const b=(l,v)=>`<div class="tb"><span>${l}</span><span class="tt"><i style="width:${v*10}%"></i></span><span class="num">${v.toFixed(0)}</span></div>`;
  const why=[...(c.a.reasons||[]),...c.applied.map(r=>r.label)].slice(0,4);
  return `<b>Score ${c.s.toFixed(1)}</b> · ${LANE[e._lane]||""}${b("Urgency",c.U)}${b("Importance",c.I)}${b("Effort",c.E)}${why.length?`<div style="margin-top:5px;opacity:.85">${why.map(esc).join(" · ")}</div>`:""}${e._over?`<div style="margin-top:4px;opacity:.85">Urgent, but doesn't fit today's time</div>`:""}${e.by!=="ai"&&live()&&S.ai.enabled?`<div style="margin-top:4px;opacity:.7">Basic score until Claude sorts it</div>`:""}`;}
 if(key.startsWith("sender:")){const n=key.slice(7);const c=senders()[n]||0;const r=(S.set.rules||[]).find(x=>x.field==="sender"&&n.toLowerCase().includes(x.value.toLowerCase()));return `${esc(n)} · ${c} email${c===1?"":"s"}${r?"<br>"+esc(r.label):""}<br><span style="opacity:.7">Click to adjust weight</span>`;}
 return esc(key);
}
if(matchMedia("(hover:hover)").matches){
 document.addEventListener("mouseover",ev=>{const t=ev.target.closest("[data-tip]");if(!t){tip.hidden=true;return;}
  tip.innerHTML=tipFor(t.dataset.tip);if(!tip.innerHTML){tip.hidden=true;return;}tip.hidden=false;
  const r=t.getBoundingClientRect();const w=tip.offsetWidth,h=tip.offsetHeight;
  const left=Math.min(window.innerWidth-w-10,Math.max(10,r.left+r.width/2-w/2));let top=r.top-h-8;if(top<10)top=r.bottom+8;
  tip.style.left=left+"px";tip.style.top=top+"px";});
 document.addEventListener("scroll",()=>tip.hidden=true,true);
}
let toastT;function toast(msg,undoId){const t=document.getElementById("toast");t.innerHTML=`<span>${esc(msg)}</span>${undoId?`<button data-a="undo" data-id="${undoId}">Undo</button>`:""}`;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,5000);}

/* ============ events ============ */
function readAgentForm(){const M=S.modal;if(!M||M.t!=="agent")return;const b=M.a,g=id=>document.getElementById(id);
 if(g("g-name"))b.name=g("g-name").value;if(g("g-val"))b.value=g("g-val").value;if(g("g-max"))b.maxI=g("g-max").value===""?null:Number(g("g-max").value);if(g("g-param"))b.param=g("g-param").value;if(g("g-desc"))M.desc=g("g-desc").value;}
const draftOf=id=>{const ta=document.getElementById("draft");return ta&&ta.dataset.id===id?ta.value:(S.drafts[id]??(byId(id)||{}).draft??"");};
function closeSheetIf(id){if(S.sheet===id){S.sheet=null;S.confirmSend=null;}}
document.addEventListener("click",async ev=>{
 const t=ev.target.closest("[data-a]");
 if(!pop.hidden&&!ev.target.closest("#pop")&&!(t&&["queue","activity","sender","budget","delegate","account"].includes(t.dataset.a)))closePop();
 if(!t||t.disabled)return;const a=t.dataset.a,id=t.dataset.id,v=t.dataset.v;
 const one=async(op,param)=>{const en=await act([id],op,param);if(en)toast(en.text,en.undoable?en.id:null);};
 switch(a){
  case "demo":startDemo();break;
  case "exitdemo":location.href="/";break;
  case "open":closePop();S.sheet=id;S.sheetWhy=false;S.sheetFull=false;S.confirmSend=null;renderSheet();const e0=byId(id);if(e0)loadBody(e0);break;
  case "closesheet":S.sheet=null;S.confirmSend=null;renderSheet();break;
  case "why":S.sheetWhy=!S.sheetWhy;renderSheet();break;
  case "full":S.sheetFull=!S.sheetFull;renderSheet();break;
  case "q-done":case "s-done":closeSheetIf(id);await one("done");break;
  case "q-letgo":case "s-letgo":closeSheetIf(id);await one("letgo");break;
  case "q-pin":case "s-pin":await one("pin");break;
  case "reopen":await one("reopen");break;
  case "send":S.drafts[id]=draftOf(id);S.confirmSend=id;renderSheet();break;
  case "cancelsend":S.confirmSend=null;renderSheet();break;
  case "dosend":{const txt=draftOf(id);if(!txt.trim())return;S.confirmSend=null;const en=await act([id],"send",txt);if(en){toast(en.text);closeSheetIf(id);delete S.drafts[id];}render();break;}
  case "savedraft":{const txt=draftOf(id);if(!txt.trim())return;const en=await act([id],"reply",txt);if(en){toast(live()?"Draft saved in your mailbox":"Draft saved",en.id);delete S.drafts[id];}break;}
  case "draft":S.drafts[id]=draftOf(id);aiDraft(byId(id));break;
  case "delegate":openPop(t,popDelegate(byId(id)),"del"+id);setTimeout(()=>{const i=document.getElementById("delname");i&&i.focus();},0);break;
  case "dodelegate1":{const to=document.getElementById("delname").value.trim();const note=document.getElementById("delnote").value;if(!isEmail(to)){toast("Enter your colleague's email address");return;}closePop();closeSheetIf(id);const en=await act([id],"delegate",to,"You",note);if(en)toast(en.text);break;}
  case "weight":case "sweight":{const name=a==="weight"?dispName(byId(id)):t.dataset.n;
   S.set.rules=(S.set.rules||[]).filter(r=>!(r.field==="sender"&&r.value.toLowerCase()===name.toLowerCase()));
   if(v!=="none")S.set.rules.push({id:uid(),field:"sender",value:name,effect:v==="up"?"mul":v==="down"?"cap":"urg",amount:v==="up"?1.5:2,label:`${name}: ${v==="up"?"more important":v==="down"?"less important":"more urgent"}`});
   saveSet();toast(v==="none"?`${name} back to normal weight`:`${name}: ${v==="up"?"more important":v==="down"?"less important":"more urgent"}. Ranking updated.`);
   render();if(a==="sweight")pop.innerHTML=popSender(name);break;}
  case "sender":ev.stopPropagation();openPop(t,popSender(v),"snd"+v);break;
  case "fsender":closePop();S.filter={kind:"sender",v};S.sheet=null;S.view="home";render();break;
  case "project":S.filter={kind:"project",v};S.sheet=null;S.view="home";render();window.scrollTo({top:0});break;
  case "flag":S.filter={kind:v};render();break;
  case "clearfilter":S.filter=null;S.q="";S.searching=false;render();break;
  case "search":S.searching=true;S.view="home";render();break;
  case "toggle":S.open[v]=!S.open[v];renderHome();break;
  case "showall":S.showAll[v]=true;renderHome();break;
  case "budget":openPop(t,popBudget(),"budget");break;
  case "setbudget":S.set.budget=Number(v);saveSet();closePop();render();break;
  case "context":S.modal={t:"context"};renderModal();break;
  case "applyctx":{const txt=document.getElementById("ctx").value;S.set.context=txt;S.modal={t:"context",text:txt,busy:true};renderModal();
   const rules=txt.trim()?await contextRules(txt):[];S.set.ctx=rules;saveSet();S.modal={t:"context",text:txt};toast(rules.length?`${rules.length} rule${rules.length>1?"s":""} from your context`:"No rules found. Try naming a project or person.");render();break;}
  case "rmctx":S.set.ctx=S.set.ctx.filter(r=>r.id!==id);saveSet();render();break;
  case "letgoall":S.modal={t:"letgo"};renderModal();break;
  case "doletgo":{const ids=compute().lanes.letgo.map(e=>e.id);S.modal=null;renderModal();const en=await act(ids,"letgo");if(en)toast(en.text,en.id);break;}
  case "delegateall":S.modal={t:"delegateall",to:{}};renderModal();break;
  case "dodelegateall":{const list=compute().lanes.delegate;const groups={};const missing=[];
   list.forEach(e=>{const inp=document.querySelector(`[data-dto="${CSS.escape(e.id)}"]`);const to=(inp?inp.value:"").trim();if(isEmail(to))(groups[to]=groups[to]||[]).push(e.id);else missing.push(e);});
   if(missing.length){toast("Add an email address for each one");return;}
   S.modal=null;renderModal();let n=0;for(const [to,ids] of Object.entries(groups)){const en=await act(ids,"delegate",to);if(en)n+=ids.length;}if(n)toast(`Forwarded ${n} email${n>1?"s":""}`);break;}
  case "prefs":S.modal={t:"prefs"};renderModal();break;
  case "preset":{const p=PRESETS[v];S.set.w={u:p[1],i:p[2],e:p[3]};saveSet();render();break;}
  case "addrule":{const who=document.getElementById("r-who").value.trim();if(!who)return;const [eff,n]=document.getElementById("r-eff").value.split("|");
   S.set.rules=(S.set.rules||[]).concat([{id:uid(),field:"sender",value:who,effect:eff,amount:Number(n),label:`${who}: ${eff==="mul"?"more important":eff==="urg"?"more urgent":"less important"}`}]);saveSet();render();break;}
  case "rmrule":S.set.rules=S.set.rules.filter(r=>r.id!==id);saveSet();render();break;
  case "saveprefs":{const ab=document.getElementById("about");if(ab)S.set.about=ab.value;saveSet();S.modal=null;render();break;}
  case "closemodal":S.modal=null;renderModal();break;
  case "queue":openPop(t,popQueue(),"queue");break;
  case "activity":openPop(t,popActivity(),"activity");break;
  case "account":openPop(t,popAccount(),"account");break;
  case "sync":closePop();sync(true);break;
  case "undo":document.getElementById("toast").hidden=true;await undo(id);break;
  case "approve":case "dismiss":{const q=S.queue.find(x=>x.id===id);S.queue=S.queue.filter(x=>x.id!==id);saveQueue([], [id]);
   if(q&&a==="approve"){const ag=S.set.agents.find(x=>x.id===q.agentId);if(ag){const en=await act([q.emailId],ag.action,ag.param,ag.name+" (approved)");if(en)toast(en.text,en.undoable?en.id:null);}}
   render();if(!pop.hidden)pop.innerHTML=popQueue();break;}
  case "approveall":{const items=queueItems();S.queue=[];saveQueue([],[],true);closePop();
   const groups={};items.forEach(({q,a:ag})=>{(groups[ag.id]=groups[ag.id]||{ag,ids:[]}).ids.push(q.emailId);});
   let n=0;for(const {ag,ids} of Object.values(groups)){const en=await act(ids,ag.action,ag.param,ag.name+" (approved)");if(en)n+=ids.length;}
   toast(`Approved ${n} suggestion${n===1?"":"s"}`);render();break;}
  case "agents":closePop();S.view="agents";S.sheet=null;render();window.scrollTo({top:0});break;
  case "home":S.view="home";render();break;
  case "toggleagent":{const ag=S.set.agents.find(x=>x.id===id);ag.on=!ag.on;saveSet();render();break;}
  case "runagent":{const ag=S.set.agents.find(x=>x.id===id);const others=S.set.agents.filter(x=>x!==ag&&x.on);others.forEach(x=>x.on=false);const was=ag.on;ag.on=true;try{await runAgents(S.emails.filter(OPEN),true);}finally{others.forEach(x=>x.on=true);ag.on=was;}render();break;}
  case "runall":await runAgents(S.emails.filter(OPEN),true);break;
  case "newagent":S.modal={t:"agent",a:{id:uid(),name:"",field:"type",value:"notification",maxI:null,action:"letgo",param:"",mode:"ask",on:true}};renderModal();break;
  case "editagent":S.modal={t:"agent",edit:true,a:JSON.parse(JSON.stringify(S.set.agents.find(x=>x.id===id)))};renderModal();break;
  case "gmode":readAgentForm();S.modal.a.mode=v;renderModal();break;
  case "buildagent":{readAgentForm();const d=S.modal.desc;if(!d)return;S.modal.busy=true;renderModal();
   try{const r=(await api("/api/agents/build",{desc:d,projects:projects()})).agent||{};
    Object.assign(S.modal.a,{name:String(r.name||"New agent").slice(0,40),field:["sender","project","subject","type","any"].includes(r.field)?r.field:"any",value:String(r.value||""),maxI:r.maxImportance==null?null:clamp(r.maxImportance),action:["letgo","done","pin","reply","send","project","delegate"].includes(r.action)?r.action:"letgo",param:String(r.param||""),mode:r.mode==="auto"?"auto":"ask"});}
   catch(err){toast(err.message);}S.modal.busy=false;renderModal();break;}
  case "saveagent":{readAgentForm();const b=S.modal.a;if(!b.value){toast("Add a value for “When”");return;}if(!b.name)b.name="New agent";
   const i=S.set.agents.findIndex(x=>x.id===b.id);if(i>=0)S.set.agents[i]=b;else S.set.agents.push(b);saveSet();S.modal=null;toast(`Agent “${b.name}” saved`);render();break;}
  case "delagent":S.set.agents=S.set.agents.filter(x=>x.id!==S.modal.a.id);saveSet();S.modal=null;render();break;
  case "disconnect":closePop();S.modal={t:"disconnect",id};renderModal();break;
  case "dodisconnect":try{await api(`/api/accounts/${encodeURIComponent(id)}`,null,"DELETE");S.modal=null;toast("Mailbox disconnected");const st=await api("/api/state");applyState(st);}catch(err){toast(err.message);}render();break;
  case "deleteme":closePop();S.modal={t:"deleteme"};renderModal();break;
  case "dodeleteme":try{await api("/api/me",null,"DELETE");location.href="/";}catch(err){toast(err.message);}break;
  case "logout":await api("/api/auth/logout",{}).catch(()=>{});location.href="/";break;
 }
});
document.addEventListener("change",ev=>{const t=ev.target;
 if(t.id==="g-field"){readAgentForm();S.modal.a.field=t.value;S.modal.a.value=t.value==="type"?"notification":"";renderModal();}
 else if(t.id==="g-act"){readAgentForm();S.modal.a.action=t.value;S.modal.a.param=t.value==="reply"||t.value==="send"?"Hi {first},\n\nThanks, received. I'll come back to you by the end of the week.\n":"";renderModal();}
 else if(["g-max","g-val","g-param"].includes(t.id)){readAgentForm();renderModal();}
});
document.addEventListener("input",ev=>{const t=ev.target;
 if(t.dataset&&t.dataset.w){S.set.w[t.dataset.w]=Number(t.value);document.getElementById("wv-"+t.dataset.w).textContent=t.value;const p=document.getElementById("wprev");if(p)p.innerHTML=prefPreview();saveSet();renderHome();}
 else if(t.id==="draft"){S.drafts[t.dataset.id]=t.value;const dis=!t.value.trim();document.querySelectorAll('[data-a="send"],[data-a="savedraft"]').forEach(b=>b.disabled=dis);}
 else if(t.id==="q"){S.q=t.value;renderHome();}
 else if(t.dataset&&t.dataset.dto&&S.modal)S.modal.to[t.dataset.dto]=t.value;
});
document.addEventListener("keydown",ev=>{
 if(ev.key==="Escape"){if(!pop.hidden)closePop();else if(S.modal){S.modal=null;renderModal();}else if(S.sheet){S.sheet=null;S.confirmSend=null;renderSheet();}else if(S.filter||S.q){S.filter=null;S.q="";S.searching=false;render();}}
 if(ev.key==="Enter"&&ev.target.classList&&ev.target.classList.contains("row")){S.sheet=ev.target.dataset.id;renderSheet();const e=byId(S.sheet);if(e)loadBody(e);}
});

/* ============ boot ============ */
async function boot(){
 render();
 try{const st=await api("/api/state");S.mode="live";applyState(st);
  const p=new URLSearchParams(location.search);if(p.get("connected")){history.replaceState(null,"","/");toast(`${(PV[p.get("connected")]||{}).n||"Mailbox"} connected. Checking mail…`);}
  render();sync();
  setInterval(()=>{if(document.visibilityState==="visible")sync();},5*60*1000);
 }catch(err){S.mode="signedout";render();}
}
boot();
})();
