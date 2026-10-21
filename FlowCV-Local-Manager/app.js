'use strict';
const $=id=>document.getElementById(id);
const i18n=window.FlowCVI18n;const t=i18n.t;const locale=()=>i18n.locale();
const errText=e=>i18n.dynamicError(e?.message||String(e));
const state={token:'',items:[],id:null,document:null,entryId:null,sectionKey:null,tab:'sections',filter:'active',query:''};
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=String(text);return e;};
const set=(node,...children)=>{node.replaceChildren(...children);return node;};
const clean=text=>{const doc=new DOMParser().parseFromString(String(text??''),'text/html');return (doc.body.textContent||'').replace(/\s+/g,' ').trim();};
const niceDate=iso=>{try{return new Date(iso).toLocaleString(locale())}catch{return iso}};
async function ask(title,label,value=''){const result=window.prompt(`${t(title)} — ${t(label)}`,value);return result===null?null:result.trim();}
let toastTimer;
function notice(msg,error=false){const e=$('toast');e.textContent=t(msg);e.hidden=false;e.classList.toggle('error',error);clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.hidden=true,5500);}
async function api(url,method='GET',payload){const opts={method,headers:{}};if(method!=='GET'){opts.headers['Content-Type']='application/json';opts.headers['X-FlowCV-Manager-Token']=state.token;opts.body=JSON.stringify(payload??{});}const res=await fetch(url,opts);const obj=await res.json().catch(()=>({error:'Risposta non valida'}));if(!res.ok)throw Error(i18n.dynamicError(obj.error)||`HTTP ${res.status}`);return obj;}
async function guarded(fn){try{await fn()}catch(e){notice(errText(e),true)}}
async function load(){state.items=await api('/api/cvs');renderList();if(state.id&&state.items.some(x=>x.localId===state.id))await select(state.id);else if(state.items.some(x=>!x.trashedAt&&!x.archived))await select(state.items.find(x=>!x.trashedAt&&!x.archived).localId);else if(state.items.length)await select(state.items[0].localId);else showEmpty();}
function showEmpty(){state.id=null;state.document=null;$('empty').hidden=false;$('workspace').hidden=true;updateRemoteButtons();}
function renderList(){
 const nav=$('cvList');nav.replaceChildren();
 const q=state.query.toLocaleLowerCase(locale());const active=state.items.filter(x=>!x.trashedAt&&!x.archived);
 $('countCV').textContent=active.length;
 const filtered=state.items.filter(item=>{
  if(state.filter==='trash'?!item.trashedAt:state.filter==='archived'?!item.archived||!!item.trashedAt:!!item.trashedAt||!!item.archived)return false;
  return [item.name,item.company,item.role,item.notes].some(v=>String(v||'').toLocaleLowerCase(locale()).includes(q));
 }).sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));
 for(const item of filtered){
  const b=el('button','cv-item'+(item.localId===state.id?' selected':'')+(item.trashedAt?' is-trash':''));
  const top=el('div','cv-item-top');top.append(el('strong','',item.name));
  if(/master/i.test(item.name))top.append(el('span','mini-star','★'));
  b.append(top);
  const sub=[item.company,item.role].filter(Boolean).join(' · ');
  if(sub)b.append(el('div','item-company',sub));
  b.append(el('small','',`${item.visible} ${t('voci visibili')} · ${niceDate(item.updatedAt)}`));
  b.onclick=()=>guarded(()=>select(item.localId));nav.append(b);
 }
 if(!filtered.length)nav.append(el('p','muted',t(state.filter==='trash'?'Il cestino è vuoto.':'Nessun risultato. Importa un JSON o cambia ricerca.')));
}
async function select(id){
 resetSyncReview();state.id=id;const result=await api(`/api/cvs/${id}`);state.document=result;
 state.sectionKey=state.sectionKey&&result.resume.content[state.sectionKey]?state.sectionKey:Object.keys(result.resume.content)[0];state.entryId=null;
 $('empty').hidden=true;$('workspace').hidden=false;renderList();renderHead();switchTab(state.tab);updateRemoteButtons();
}
function renderHead(){
 const {item, resume:cv}=state.document;set($('cvTitle'),document.createTextNode(item.name));
 $('cvCompany').textContent=[item.company,item.role].filter(Boolean).join('  ·  ');$('cvCompany').hidden=!item.company&&!item.role;
 $('cvSummary').textContent=`${Object.keys(cv.content).length} ${t('sezioni')}  ·  ${countsLocal(cv).visible} ${t('visibili')}  ·  ${countsLocal(cv).hidden} ${t('nascoste')}  ·  ${t('Aggiornato')} ${niceDate(item.updatedAt)}`;
 $('notesBar').textContent=item.notes||'';$('notesBar').hidden=!item.notes;
 $('trashBanner').hidden=!item.trashedAt;
 $('trashBtn').hidden=!!item.trashedAt;$('unarchiveBtn').hidden=!item.archived||!!item.trashedAt;$('recoverBtn').hidden=!item.trashedAt;$('deleteForeverBtn').hidden=!item.trashedAt;
 $('mainRestore').disabled=!!item.trashedAt||!remoteState.session?.valid||!remoteState.resumeId;
}
function countsLocal(cv){let visible=0,hidden=0;for(const s of Object.values(cv.content||{}))for(const e of s.entries||[])e.isHidden?hidden++:visible++;return {visible,hidden};}
function switchTab(tab){state.tab=tab;for(const b of document.querySelectorAll('.tabbar button'))b.classList.toggle('active',b.dataset.tab===tab);for(const t of ['sections','personal','advanced','history'])$(t+'Tab').hidden=t!==tab;if(tab==='sections')renderSections();if(tab==='personal')renderPersonal();if(tab==='advanced')$('jsonEditor').value=JSON.stringify(state.document.resume,null,2);if(tab==='history')guarded(renderHistory);}
function renderSections(){const content=state.document.resume.content, keys=Object.keys(content),aside=$('sections');aside.replaceChildren();for(const key of keys){const s=content[key],vis=s.entries.filter(e=>!e.isHidden).length;const b=el('button',key===state.sectionKey?'active':'');b.append(el('span','',s.displayName||key),el('small','',`${vis}/${s.entries.length} ${t('visibili')}`));b.onclick=()=>{state.sectionKey=key;state.entryId=null;renderSections()};aside.append(b);}renderEntries();}
function labelEntry(e){return e.title||e.skill||e.jobTitle||e.degree||e.language||e.employer||(e.text?clean(e.text).slice(0,100):t('Voce senza titolo'));}
function renderEntries(){const key=state.sectionKey,sec=state.document.resume.content[key],head=$('sectionHead');if(!sec)return;
head.replaceChildren();const box=el('div');box.append(el('h2','',sec.displayName||key),el('span','muted',`${sec.entries.length} ${t('voci')} · ${sec.sectionType||key}`));const actions=el('div','rowgap');const rename=el('button','',t('Rinomina sezione'));rename.onclick=()=>guarded(async()=>{const name=await ask('Nome sezione','Nome visualizzato',sec.displayName||key);if(name===null)return;await api(`/api/cvs/${state.id}/section`,'PATCH',{sectionKey:key,displayName:name});await refresh();notice('Nome sezione aggiornato')});const add=el('button','',t('+ Nuova voce'));add.onclick=()=>guarded(async()=>{await api(`/api/cvs/${state.id}/entry/new`,'POST',{sectionKey:key});await refresh();notice('Nuova voce aggiunta')});actions.append(rename,add);head.append(box,actions);
const list=$('entries');list.replaceChildren();for(const entry of sec.entries){const b=el('button',`entryitem${entry.id===state.entryId?' chosen':''}${entry.isHidden?' is-hidden':''}`);b.append(el('span','visibility'+(entry.isHidden?' hidden':''),entry.isHidden?'◌':'●'));const summary=el('span');summary.append(el('strong','',labelEntry(entry)),el('small','',clean(entry.description||entry.infoHtml||entry.text||entry.subTitle||'').slice(0,140)));b.append(summary,el('span','pill'+(entry.isHidden?' hidden':''),t(entry.isHidden?'Nascosto':'Visibile')));b.onclick=()=>{state.entryId=entry.id;renderEntries()};list.append(b);}renderEditor();}
function editLabel(k){return t(({jobTitle:'Ruolo / titolo',employer:'Datore di lavoro',title:'Titolo',subTitle:'Sottotitolo',startDateNew:'Data inizio',endDateNew:'Data fine',infoHtml:'Descrizione (HTML FlowCV)',description:'Descrizione (HTML FlowCV)',text:'Testo profilo (HTML FlowCV)',skill:'Competenza',language:'Lingua',school:'Università / ente',degree:'Titolo di studio',titleLink:'URL',level:'Livello'}[k]||k));}
function field(name,value,large=false){const wrap=el('div','field'+(large?' full':'')),label=el('label','',editLabel(name));const input=el(large?'textarea':'input');input.name=name;input.value=value;wrap.append(label,input);if(large)wrap.append(el('div','htmlhint',t('Il contenuto originale usa HTML: mantieni i tag se vuoi conservarne la formattazione.')));return wrap;}
function renderEditor(){const area=$('entryEditor');area.replaceChildren();const sec=state.document.resume.content[state.sectionKey],entry=sec.entries.find(e=>e.id===state.entryId);if(!entry){area.append(el('p','muted',t('Seleziona una voce per modificarla. Puoi scegliere anche le voci nascoste.')));return;}
const form=el('form');form.append(el('h3','',t('Modifica voce')));const grid=el('div','formgrid');const editable=Object.entries(entry).filter(([k,v])=>!['id','createdAt','updatedAt'].includes(k)&&typeof v==='string');for(const [k,v] of editable)grid.append(field(k,v,['description','text','infoHtml'].includes(k)||v.length>200));const show=el('div','field full');const lbl=el('label');const chk=el('input');chk.type='checkbox';chk.checked=!entry.isHidden;chk.style.width='auto';lbl.append(chk,document.createTextNode(t(' Mostra questa voce nel CV')));show.append(lbl);grid.append(show);const bottom=el('div','formfooter');const save=el('button','primary',t('Salva modifiche locali'));save.type='submit';bottom.append(save);grid.append(bottom);form.append(grid);form.onsubmit=ev=>{ev.preventDefault();guarded(async()=>{const obj={isHidden:!chk.checked};for(const i of form.querySelectorAll('[name]'))obj[i.name]=i.value;await api(`/api/cvs/${state.id}/entry/${encodeURIComponent(state.sectionKey)}/${entry.id}`,'PATCH',{fields:obj});await refresh();state.entryId=entry.id;renderEntries();notice('Modifiche salvate. Snapshot precedente conservato.')})};area.append(form);}
function renderPersonal(){const cv=state.document.resume,form=$('personalForm');form.replaceChildren();for(const [k,v] of Object.entries(cv.personalDetails)){if(typeof v!=='string')continue;if(!v&&!['jobTitle','fullName','displayEmail','phone','address','website','github','availability'].includes(k))continue;form.append(field(k,v,v.length>200));}const b=el('button','primary',t('Salva dati personali'));b.type='submit';const f=el('div','formfooter');f.append(b);form.append(f);form.onsubmit=e=>{e.preventDefault();guarded(async()=>{const fields={};for(const x of form.querySelectorAll('[name]'))fields[x.name]=x.value;await api(`/api/cvs/${state.id}/personal`,'PATCH',{fields});await refresh();notice('Dati personali salvati localmente')})};}
async function renderHistory(){const names=await api(`/api/cvs/${state.id}/history`);const holder=$('historyItems');holder.replaceChildren();if(!names.length){holder.append(el('p','muted',t('Ancora nessuna modifica: il backup importato è intatto.')));return;}for(const filename of names){const r=el('div','historyrow');r.append(el('span','',filename));const b=el('button','',t('Recupera come nuovo CV'));b.onclick=()=>guarded(async()=>{const result=await api(`/api/cvs/${state.id}/history/recover`,'POST',{filename});notice('Snapshot recuperato come nuovo CV');await load();await select(result.localId)});r.append(b);holder.append(r);}}
async function refresh(){const id=state.id;state.items=await api('/api/cvs');state.document=await api(`/api/cvs/${id}`);renderList();renderHead();}

// ——— Simple library controls ———
const remoteState={session:null,resumeId:'',busy:false};
function resetSyncReview(){ /* A new preview is requested for every restore */ }
function updateRemoteButtons(){
 const ready=!!remoteState.session?.valid&&!!remoteState.resumeId;
 $('saveOnlineBtn').disabled=$('saveOnlineEmpty').disabled=!ready;
 $('mainRestore').disabled=!ready||!state.id||!!state.document?.item?.trashedAt||remoteState.busy;
}
function closeMenu(){$('moreMenu').open=false;}
async function refreshSession(){
 const result=await api('/api/session');remoteState.session=result;
 $('authDot').className='status-dot'+(result.valid?' ready':result.connected?' expired':'');
 $('authStatus').textContent=result.valid?result.email:t(result.connected?'Sessione scaduta':'Non collegato');
 if(result.valid){await refreshRemote();}
 else{remoteState.resumeId='';$('remoteResumeSelect').replaceChildren(new Option(t('Collega un account'),''));}
 updateRemoteButtons();return result;
}
async function refreshRemote(){
 if(!remoteState.session?.valid)return;
 const current=remoteState.resumeId,items=await api('/api/session/resumes');
 const list=$('remoteResumeSelect');list.replaceChildren();
 for(const cv of items)list.add(new Option(`${cv.title||(i18n.language==='en'?'Resume':'Curriculum')}${cv.webResumeLive?t(' · pubblicato'):''}`,cv.id));
 remoteState.resumeId=items.some(x=>x.id===current)?current:(items[0]?.id||'');
 list.value=remoteState.resumeId;updateRemoteButtons();
}
async function connectWith(endpoint,payload={}){
 try{await api(endpoint,'POST',payload)}catch(e){
  if(!e.message.includes('È già collegato')&&!e.message.includes('Already connected'))throw e;
  const yes=await confirmAction('Cambiare account?',`${i18n.dynamicError(e.message)}\n${t('Sostituire l’account collegato in questo programma?')}`,'Sì, cambia account');
  if(!yes)return;
  await api(endpoint,'POST',{...payload,confirmSwitch:'CAMBIA ACCOUNT'});
 }
 await refreshSession();$('accountDetails').open=false;notice('Collegamento aggiornato.');
}
$('loginEdge').onclick=()=>guarded(async()=>{
 await api('/api/open-flowcv','POST',{});
 notice('FlowCV aperto nel tuo Edge: copia il cookie in F12 e incollalo qui.');
});
$('importCli').onclick=()=>guarded(()=>connectWith('/api/session/from-cli'));
$('saveCookie').onclick=()=>guarded(async()=>{
 const input=$('cookieInput'),cookie=input.value.trim();if(!cookie)throw Error('Inserisci il valore flowcvsidapp.');
 input.value='';await connectWith('/api/session/connect',{cookie});
});
$('refreshAuth').onclick=()=>guarded(refreshSession);
$('remoteResumeSelect').onchange=()=>{remoteState.resumeId=$('remoteResumeSelect').value;updateRemoteButtons()};
$('authPill').onclick=()=>{if(!remoteState.session?.valid)$('accountDetails').open=true};
$('searchCV').oninput=e=>{state.query=e.target.value;renderList()};
$('filterCV').onchange=e=>{state.filter=e.target.value;renderList()};
$('reload').onclick=()=>guarded(async()=>{await load();await refreshSession();notice('Archivio aggiornato')});
function metadata(title,values={}){
 return new Promise(resolve=>{
  const d=$('metaDialog'),form=$('metaForm');$('metaTitle').textContent=t(title);
  $('metaName').value=values.name||'';$('metaCompany').value=values.company||'';
  $('metaRole').value=values.role||'';$('metaNotes').value=values.notes||'';
  d.showModal();$('metaName').focus();$('metaName').select();
  d.addEventListener('close',function done(){
   d.removeEventListener('close',done);
   resolve(d.returnValue==='ok'?{
    name:$('metaName').value.trim(),company:$('metaCompany').value.trim(),
    role:$('metaRole').value.trim(),notes:$('metaNotes').value.trim()
   }:null);
  },{once:true});
 });
}
function confirmAction(title,message,label='Sì, continua',details='',danger=false){
 return new Promise(resolve=>{
  const d=$('confirmDialog');$('confirmTitle').textContent=t(title);
  $('confirmText').textContent=t(message);$('confirmYes').textContent=t(label);
  $('confirmYes').className='btn '+(danger?'btn-danger':'btn-primary');
  $('confirmIcon').textContent=danger?'!':'↥';
  $('confirmDetails').textContent=t(details);$('confirmDetails').hidden=!details;
  d.showModal();d.addEventListener('close',function done(){d.removeEventListener('close',done);resolve(d.returnValue==='ok')},{once:true});
 });
}
function selectFile(){$('fileInput').click()}
$('importBtn').onclick=$('importEmpty').onclick=selectFile;
$('fileInput').onchange=()=>guarded(async()=>{
 const f=$('fileInput').files?.[0];if(!f)return;
 try{
  if(f.size>1_500_000)throw Error('Il file JSON supera 1,5 MB');
  const resume=JSON.parse(await f.text());
  const meta=await metadata('Importa curriculum',{name:resume.title||f.name.replace(/\.json$/i,'')});
  if(!meta)return;
  const item=await api('/api/import','POST',{resume,...meta});
  state.filter='active';$('filterCV').value='active';state.query='';$('searchCV').value='';
  await load();await select(item.localId);notice('Nuova versione importata in archivio.');
 }finally{$('fileInput').value=''}
});
$('editMetaBtn').onclick=()=>guarded(async()=>{
 const current=state.document.item,meta=await metadata('Modifica scheda',current);if(!meta)return;
 await api(`/api/cvs/${state.id}/metadata`,'PATCH',meta);await refresh();renderHead();notice('Scheda aggiornata.');
});
$('duplicateBtn').onclick=()=>guarded(async()=>{
 closeMenu();const cur=state.document.item;
 const meta=await metadata('Duplica curriculum',{name:cur.name+t(' — copia'),company:cur.company,role:cur.role,notes:cur.notes});if(!meta)return;
 const item=await api('/api/cvs','POST',{sourceId:state.id,...meta});await load();await select(item.localId);
 notice('Copia indipendente creata.');
});
$('exportBtn').onclick=()=>{closeMenu();if(!state.id)return;
 const a=document.createElement('a');a.href=`/api/cvs/${state.id}/export`;a.download='curriculum-flowcv.json';a.click();};
$('trashBtn').onclick=()=>guarded(async()=>{closeMenu();const id=state.id;
 await api(`/api/cvs/${id}/trash`,'PATCH',{trashed:true});
 state.id=null;await load();notice('Spostato nel Cestino. Recuperabile in qualsiasi momento.');
});
$('unarchiveBtn').onclick=()=>guarded(async()=>{closeMenu();
 await api(`/api/cvs/${state.id}/archive`,'PATCH',{archived:false});
 state.filter='active';$('filterCV').value='active';await load();notice('CV recuperato dall’archivio.');
});
$('recoverBtn').onclick=()=>guarded(async()=>{closeMenu();
 await api(`/api/cvs/${state.id}/trash`,'PATCH',{trashed:false});
 state.filter='active';$('filterCV').value='active';await load();notice('Curriculum recuperato.');
});
$('deleteForeverBtn').onclick=()=>guarded(async()=>{closeMenu();const id=state.id;
 const yes=await confirmAction('Eliminare definitivamente?',i18n.language==='en'?`“${state.document.item.name}” will be permanently deleted from the local library. This cannot be undone.`:`«${state.document.item.name}» verrà cancellato dall’archivio locale. Questa operazione non è reversibile.`, 'Sì, elimina', '',true);
 if(!yes)return;
 await api(`/api/cvs/${id}`,'DELETE',{confirm:true});state.id=null;await load();notice('Curriculum eliminato definitivamente.');
});
async function saveFromOnline(){
 if(!remoteState.resumeId)throw Error('Nessun curriculum FlowCV collegato.');
 const selected=$('remoteResumeSelect').selectedOptions[0]?.textContent||(i18n.language==='en'?'FlowCV resume':'Curriculum FlowCV');
 const meta=await metadata('Salva versione da FlowCV',{name:`${selected.replace(t(' · pubblicato'),'')} — ${new Date().toLocaleDateString(locale())}`});
 if(!meta)return;
 const item=await api('/api/session/pull','POST',{resumeId:remoteState.resumeId,...meta});
 state.filter='active';$('filterCV').value='active';state.query='';$('searchCV').value='';
 await load();await select(item.localId);notice('CV online salvato come nuova versione locale.');
}
$('saveOnlineBtn').onclick=$('saveOnlineEmpty').onclick=()=>guarded(saveFromOnline);
async function restore(){
 if(!state.id||!remoteState.resumeId||remoteState.busy)throw Error('Seleziona un CV locale e collega FlowCV.');
 const item=state.document.item;
 if(item.trashedAt)throw Error('Recupera prima il CV dal Cestino.');
 remoteState.busy=true;updateRemoteButtons();
 const action=$('mainRestore'),label=action.textContent;
 action.textContent=t('Pubblicazione e download…');
 try{
  // One deliberate click authorizes replace + public web publish + PDF export.
  const response=await fetch('/api/session/use-and-download',{
   method:'POST',headers:{'Content-Type':'application/json','X-FlowCV-Manager-Token':state.token},
   body:JSON.stringify({localId:state.id,resumeId:remoteState.resumeId,filename:[item.company,item.role].filter(Boolean).join(' - ')||item.name})
  });
  if(!response.ok){
   const problem=await response.json().catch(()=>({}));
   throw Error(problem.error||`Operazione non riuscita (HTTP ${response.status})`);
  }
  if(!response.headers.get('content-type')?.includes('application/pdf'))throw Error('FlowCV non ha restituito un PDF.');
  const blob=await response.blob();
  const rawName=response.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1];
  const filename=rawName||'FlowCV-Resume.pdf';
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  try{
   link.href=url;link.download=filename;document.body.append(link);link.click();
   notice('CV caricato e pubblicato. PDF originale scaricato.');
  }finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),120000)}
  await refreshRemote();
 }finally{action.textContent=t('↥ Pubblica e scarica PDF');remoteState.busy=false;updateRemoteButtons()}
}
$('flowcvWebsite').onclick=()=>guarded(async()=>{
 // A standalone Edge app uses a separate browser profile. Open the ORIGINAL
 // FlowCV site using Windows' default browser instead (existing login).
 if(navigator.platform.startsWith('Win')||navigator.userAgent.includes('Windows')){
   try {await api('/api/open-flowcv','POST',{});return;}
   catch(e){window.open('https://app.flowcv.com','_blank','noopener');throw e;}
 }
 window.open('https://app.flowcv.com','_blank','noopener');
});
$('mainRestore').onclick=()=>guarded(restore);
$('jsonReset').onclick=()=>{$('jsonEditor').value=JSON.stringify(state.document.resume,null,2);notice('Modifiche non salvate annullate.');};
$('jsonSave').onclick=()=>guarded(async()=>{const resume=JSON.parse($('jsonEditor').value);
 await api(`/api/cvs/${state.id}/resume`,'PATCH',{resume});await refresh();notice('JSON salvato e snapshot precedente conservato.');});
for(const b of document.querySelectorAll('.tabbar button'))b.onclick=()=>switchTab(b.dataset.tab);
// Startup after all declarations (including remoteState): no connection to FlowCV is needed to browse local CVs.
async function boot(){try{
 const status=await api('/api/status');state.token=status.token;await load();
 await refreshSession();if(!remoteState.session?.valid)$('accountDetails').open=true;
}catch(e){notice(t('Avvio: ')+errText(e),true)}}
boot();

window.addEventListener('flowcv-language-change',()=>{
    if (!remoteState.busy) $('mainRestore').textContent=t('↥ Pubblica e scarica PDF');
 renderList();if(state.document){renderHead();switchTab(state.tab);}
 if(remoteState.session){
  $('authStatus').textContent=remoteState.session.valid?remoteState.session.email:t(remoteState.session.connected?'Sessione scaduta':'Non collegato');
  if(remoteState.session.valid)guarded(refreshRemote);
  else $('remoteResumeSelect').replaceChildren(new Option(t('Collega un account'),''));
 }
});
