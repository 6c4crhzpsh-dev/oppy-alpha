import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabase = createClient(
  "https://pabnncvorvyrwgcxgqiu.supabase.co",
  "sb_publishable_f2wQ78XtQ5OO657Y7Lfvsg_nk_o27Ep",
  { auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:true } }
);

const A = document.querySelector("#app");
const SITE_URL = "https://oppy-alpha.vercel.app/";
const RECOVERY_URL = "https://oppy-alpha.vercel.app/recover.html";
const Q = [
  ["canton","In welchem Kanton wohnst du?",["Aargau","Bern","Basel-Landschaft","Basel-Stadt","Luzern","St. Gallen","Waadt","Zürich","Anderer Kanton"]],
  ["household","Wie lebst du?",["Allein","Paar","Familie mit Kindern","Alleinerziehend"]],
  ["employment","Wie arbeitest du?",["Angestellt ≥ 8 Std./Woche","Angestellt < 8 Std./Woche","Selbstständig","Arbeitslos","Nicht erwerbstätig"]],
  ["housing","Wie wohnst du?",["Miete","Eigentum"]],
  ["income","Haushaltseinkommen ungefähr?",["unter CHF 60'000","CHF 60'000–90'000","CHF 90'000–130'000","über CHF 130'000"]],
  ["pillar3a","Zahlst du in die Säule 3a ein?",["Ja","Nein","Weiss nicht"]]
];

const RULES = [
  {id:"CH-KVG-003",title:"Unfalldeckung in der Krankenkasse prüfen",source:"BAG / Suva",confidence:"hoch",impact:"mögliche laufende Ersparnis",type:"money",when:f=>f.employment==="Angestellt ≥ 8 Std./Woche",text:"Prüfe, ob Unfall zusätzlich in deiner Grundversicherung eingeschlossen ist, obwohl du über den Arbeitgeber für Nichtberufsunfälle gedeckt bist."},
  {id:"CH-3A-001",title:"3a-Spielraum prüfen",source:"BSV / ESTV",confidence:"mittel",impact:"Steuerpotenzial",type:"money",when:f=>f.pillar3a==="Nein",text:"Eine 3a-Einzahlung kann steuerlich relevant sein. Die konkrete Wirkung hängt von Einkommen, Steuerort und Vorsorgesituation ab."},
  {id:"CH-HOUSING-001",title:"Mietzins auf Referenzzins prüfen",source:"BWO",confidence:"mittel",impact:"mögliche Mietsenkung",type:"money",when:f=>f.housing==="Miete",text:"Für eine belastbare Prüfung braucht OPPY den Mietvertrag oder die letzte Mietzinsanpassung."},
  {id:"CH-KVG-011",title:"Prämienverbilligung prüfen",source:"BAG / Kanton",confidence:"mittel",impact:"möglicher Anspruch",type:"money",when:f=>["unter CHF 60'000","CHF 60'000–90'000"].includes(f.income),text:"Ein möglicher Anspruch wird kantonal bestimmt. OPPY zeigt in der Alpha bewusst nur eine Triage."},
  {id:"CH-AHV-001",title:"AHV-IK-Auszug prüfen",source:"AHV/IV",confidence:"hoch",impact:"Vorsorge-Check",type:"watch",when:f=>true,text:"Ein individueller Kontoauszug kann helfen, fehlende Beitragsjahre oder Einträge früh zu erkennen."},
  {id:"CH-KVG-012",title:"Krankenkassen-Watch vormerken",source:"BAG / Priminfo",confidence:"hoch",impact:"jährlicher Watch",type:"watch",when:f=>true,text:"Prämien, Franchise und Versicherungsmodell sollten regelmässig neu gegen dein Profil geprüft werden."},
  {id:"CH-BVG-002",title:"BVG bei Jobwechsel neu prüfen",source:"BSV",confidence:"mittel",impact:"Vorsorge-Check",type:"watch",when:f=>f.employment?.startsWith("Angestellt"),text:"Bei einem Jobwechsel können Pensionskasse, Freizügigkeit und Unfalldeckung neu relevant werden."},
  {id:"CH-TAX-001",title:"Berufskosten steuerlich prüfen",source:"ESTV / Kanton",confidence:"mittel",impact:"Steuerpotenzial",type:"money",when:f=>f.employment?.startsWith("Angestellt"),text:"Berufskosten können steuerlich relevant sein. Für eine konkrete Rechnung braucht OPPY zusätzliche Angaben."}
];

let step = 0;
const esc = s => String(s ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));

async function currentUser(){
  const { data } = await supabase.auth.getUser();
  return data.user;
}
async function route(){
  const u = await currentUser();
  u ? home(u) : landing();
}
function landing(){
  A.innerHTML = `<span class="kicker">Persönlicher Opportunity Agent</span>
  <h1>Was entgeht dir?</h1>
  <p class="lead">OPPY prüft mögliche finanzielle Vorteile, Ansprüche, Fristen und unnötige Kosten in deiner persönlichen Situation.</p>
  <div class="row"><button class="primary" id="login">Kostenlos starten</button><button class="secondary" id="demo">Demo ansehen</button></div>
  <div class="card"><b>Cloud-Konto</b><p class="small">Nach dem Login werden deine Alpha-Profildaten deinem Benutzerkonto zugeordnet. Row Level Security begrenzt den Datenzugriff auf das eingeloggte Konto.</p></div>`;
  document.querySelector("#login").onclick = authScreen;
  document.querySelector("#demo").onclick = () => render([RULES[0],RULES[2],RULES[4]], true);
}
function authScreen(){
  A.innerHTML = `<span class="kicker">OPPY Konto</span><h1>Einloggen oder registrieren</h1>
  <div class="card"><input id="email" type="email" placeholder="E-Mail"><input id="password" type="password" placeholder="Passwort (mind. 10 Zeichen)">
  <div class="row"><button class="primary" id="signin">Einloggen</button><button class="secondary" id="signup">Registrieren</button><button class="secondary" id="reset">Passwort vergessen</button></div><div id="msg"></div></div>
  <button class="secondary" id="back">Zurück</button>`;
  const msg = document.querySelector("#msg");
  const email = document.querySelector("#email");
  const password = document.querySelector("#password");
  document.querySelector("#signin").onclick = async () => {
    const { error } = await supabase.auth.signInWithPassword({email:email.value.trim(), password:password.value});
    if(error) msg.innerHTML = `<div class="notice">${esc(error.message)}</div>`; else route();
  };
  document.querySelector("#signup").onclick = async () => {
    if(password.value.length < 10){ msg.innerHTML='<div class="notice">Bitte mindestens 10 Zeichen verwenden.</div>'; return; }
    const { data, error } = await supabase.auth.signUp({email:email.value.trim(),password:password.value,options:{emailRedirectTo:SITE_URL}});
    if(error) msg.innerHTML=`<div class="notice">${esc(error.message)}</div>`;
    else if(!data.session) msg.innerHTML='<div class="notice ok">Konto erstellt. Bitte bestätige die E-Mail und logge dich danach ein.</div>';
    else route();
  };
  document.querySelector("#reset").onclick = async () => {
    if(!email.value.trim()) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email.value.trim(), {redirectTo:RECOVERY_URL});
    msg.innerHTML = error ? `<div class="notice">${esc(error.message)}</div>` : '<div class="notice ok">Reset-Mail wurde angefordert.</div>';
  };
  document.querySelector("#back").onclick = landing;
}
async function home(u){
  const { data:facts } = await supabase.from("user_facts").select("key,value").eq("user_id",u.id);
  A.innerHTML = `<span class="kicker">OPPY Radar</span><h1>Guten Tag.</h1>
  <p class="lead">${facts?.length ? "Dein Profil ist gespeichert. Ich kann es erneut prüfen." : "Beantworte sechs kurze Fragen für deinen ersten Scan."}</p>
  <div class="row"><button class="primary" id="scan">${facts?.length ? "Neu scannen" : "Profil anlegen"}</button><button class="secondary" id="results">Meine Treffer</button><button class="secondary" id="move">Ich ziehe um</button><button class="secondary" id="job">Neuer Job</button></div>
  <div class="card"><b>Kontrolle über deine Daten</b><p class="small">Eingeloggt als ${esc(u.email)}.</p>
  <div class="row"><button class="secondary" id="logout">Ausloggen</button><button class="danger" id="delete">Meine Alpha-Daten löschen</button></div></div>`;
  document.querySelector("#scan").onclick = () => { step=0; question(); };
  document.querySelector("#results").onclick = loadResults;
  document.querySelector("#move").onclick = () => lifeEvent("MOVE");
  document.querySelector("#job").onclick = () => lifeEvent("JOB_CHANGE");
  document.querySelector("#logout").onclick = async () => { await supabase.auth.signOut(); route(); };
  document.querySelector("#delete").onclick = deleteData;
}
function question(){
  const [key,title,opts] = Q[step];
  A.innerHTML = `<div class="progress"><div class="bar" style="width:${Math.round(step/Q.length*100)}%"></div></div>
  <span class="kicker">Frage ${step+1} von ${Q.length}</span><h2>${title}</h2><p class="small">Ich frage nur Angaben, die konkrete Prüfungen freischalten.</p>
  <div class="grid">${opts.map(v=>`<button class="choice" data-value="${esc(v)}">${esc(v)}</button>`).join("")}</div>`;
  document.querySelectorAll(".choice").forEach(b => b.onclick = () => saveFact(key,b.dataset.value));
}
async function saveFact(key,value){
  const u = await currentUser();
  const { error } = await supabase.from("user_facts").upsert(
    {user_id:u.id,key,value,source:"user",updated_at:new Date().toISOString()},
    {onConflict:"user_id,key"}
  );
  if(error){ alert(error.message); return; }
  step++;
  step < Q.length ? question() : runScan();
}
async function profile(){
  const u = await currentUser();
  const { data,error } = await supabase.from("user_facts").select("key,value").eq("user_id",u.id);
  if(error) throw error;
  return Object.fromEntries((data||[]).map(x=>[x.key,x.value]));
}
async function runScan(){
  A.innerHTML='<h2>OPPY prüft deine Situation …</h2><p class="lead">Regeln werden gegen dein gespeichertes Profil ausgeführt.</p>';
  const u = await currentUser();
  const f = await profile();
  const hits = RULES.filter(r => r.when(f));
  let del = await supabase.from("opportunity_results").delete().eq("user_id",u.id);
  if(del.error){ alert(del.error.message); return; }
  const rows = hits.map(r=>({user_id:u.id,rule_id:r.id,title:r.title,confidence:r.confidence,impact_label:r.impact,explanation:r.text,source_label:r.source,rule_version:"alpha-1"}));
  if(rows.length){
    const {error} = await supabase.from("opportunity_results").insert(rows);
    if(error){ alert(error.message); return; }
  }
  render(hits,false);
}
async function loadResults(){
  const u = await currentUser();
  const { data,error } = await supabase.from("opportunity_results").select("*").eq("user_id",u.id).order("created_at",{ascending:false});
  if(error){ alert(error.message); return; }
  render((data||[]).map(x=>({id:x.rule_id,title:x.title,confidence:x.confidence,impact:x.impact_label,text:x.explanation,source:x.source_label,type:x.impact_label?.includes("Watch")?"watch":"money"})),false);
}
function render(hits,demo=false){
  A.innerHTML = `<span class="kicker">${demo?"Demo":"Dein Ergebnis"}</span><h1>Ich habe ${hits.length} Dinge für dich gefunden.</h1>
  <p class="lead">Alpha-Treffer sind Hinweise. Vor einer konkreten Aktion müssen fehlende Angaben und die aktuelle Regelquelle validiert werden.</p>
  ${hits.map((r,i)=>`<div class="card ${r.type||"money"}"><span class="badge">${esc(r.id)}</span><span class="badge">${esc(r.confidence)}</span><span class="badge">${esc(r.source)}</span><h2>${esc(r.title)}</h2><div class="value">${esc(r.impact)}</div><p>${esc(r.text)}</p>${demo?"":`<button class="secondary why" data-i="${i}">Warum sehe ich das?</button><div id="ev${i}"></div>`}</div>`).join("")}
  <div class="row"><button class="secondary" id="homeBtn">${demo?"Zurück":"Start"}</button></div>`;
  document.querySelector("#homeBtn").onclick = () => demo ? landing() : route();
  if(!demo){
    document.querySelectorAll(".why").forEach(b => b.onclick = async () => {
      const f = await profile(), r = hits[Number(b.dataset.i)];
      document.querySelector("#ev"+b.dataset.i).innerHTML = `<div class="evidence"><b>Evidence Alpha</b><br>Regel: ${esc(r.id)}<br>Quelle: ${esc(r.source)}<br>Verwendete Profilfelder: ${esc(Object.keys(f).join(", "))}<br>Status: Alpha – vor einer Aktion müssen Quelle, Gültigkeit, Ausnahmen und Berechnung vollständig validiert sein.</div>`;
      b.remove();
    });
  }
}
async function lifeEvent(type){
  const u=await currentUser();
  const {error}=await supabase.from("life_events").insert({user_id:u.id,event_type:type,payload:{source:"alpha-ui"}});
  if(error){ alert(error.message); return; }
  const f=await profile();
  const ids = type==="MOVE" ? ["CH-HOUSING-001","CH-KVG-011","CH-KVG-012"] : ["CH-KVG-003","CH-BVG-002","CH-3A-001","CH-AHV-001"];
  render(RULES.filter(r=>ids.includes(r.id)&&r.when(f)),false);
}
async function deleteData(){
  if(!confirm("Profil, Treffer und Life Events dieser Alpha-Version wirklich löschen?")) return;
  const u=await currentUser();
  for(const table of ["opportunity_results","life_events","user_facts"]){
    const {error}=await supabase.from(table).delete().eq("user_id",u.id);
    if(error){ alert(error.message); return; }
  }
  alert("Deine gespeicherten Alpha-Daten wurden gelöscht.");
  home(u);
}

route();
