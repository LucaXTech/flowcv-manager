/** FlowCV Local Manager. Local CV library and explicit, verified FlowCV restore. Node >=22. */
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fs, existsSync } from 'node:fs';
import { randomUUID, randomBytes } from 'node:crypto';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { createBridge } from './bridge.mjs';
const execFileAsync = promisify(execFile);
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DATA = process.env.FLOWCV_MANAGER_DATA_DIR || path.join(os.homedir(), 'Documents', 'FlowCV-Local-Manager');
const PORT = Number(process.env.FLOWCV_MANAGER_PORT || 8765);
const CLI = process.env.FLOWCV_CLI_PATH || path.resolve(ROOT, '..', 'dist', 'cli.js');
const registryFile = path.join(DATA, 'registry.json');
const token = randomBytes(32).toString('hex');
let queue = Promise.resolve();
const mutate = fn => {
  const job = queue.then(fn);
  queue = job.catch(() => {});
  return job;
};
function httpError(code, message) { const e = Error(message); e.code = code; return e; }
function assertGuid(id) { if (!/^[a-f0-9-]{36}$/i.test(id || '')) throw httpError(400,'Identificativo non valido'); }
function assertObject(x) { if (!x || Array.isArray(x) || typeof x !== 'object') throw httpError(400,'Oggetto JSON richiesto'); }
function validateResume(r) {
  assertObject(r);
  if (!r.id || typeof r.id !== 'string') throw httpError(400,'Manca l’ID del CV');
  assertObject(r.content); assertObject(r.personalDetails); assertObject(r.customization);
  let count=0;
  for (const [key, section] of Object.entries(r.content)) {
    assertObject(section);
    if (!Array.isArray(section.entries)) throw httpError(400, `entries non è un array: ${key}`);
    for (const entry of section.entries) { assertObject(entry); if (typeof entry.id !== 'string') throw httpError(400,`Voce senza ID: ${key}`); count++; }
  }
  if (count > 10000) throw httpError(400,'Troppi elementi');
  return r;
}
function counts(cv){const sections=Object.values(cv.content || {});let visible=0,hidden=0;for(const s of sections) for(const e of s.entries || []) e.isHidden ? hidden++ : visible++;return {sections:sections.length,visible,hidden,total:visible+hidden};}
const fileFor = id => {assertGuid(id);return path.join(DATA,'cvs',`${id}.json`);};
async function atomicWrite(filename, content) {
  await fs.mkdir(path.dirname(filename),{recursive:true});
  const temp = `${filename}.${randomUUID()}.tmp`;
  try { await fs.writeFile(temp,typeof content==='string'?content:JSON.stringify(content,null,2)+'\n',{encoding:'utf8',flag:'wx'}); await fs.rename(temp,filename); }
  finally {await fs.rm(temp,{force:true}).catch(()=>{});}
}
async function init(){await fs.mkdir(path.join(DATA,'cvs'),{recursive:true});await fs.mkdir(path.join(DATA,'history'),{recursive:true});if(!existsSync(registryFile)) await atomicWrite(registryFile,{format:1,items:[]});}
async function reg(){return JSON.parse(await fs.readFile(registryFile,'utf8'));}
async function findItem(id, r=undefined){assertGuid(id);const registry=r || await reg();const item=registry.items.find(i=>i.localId===id);if(!item) throw httpError(404,'CV locale non trovato');return {registry,item};}
async function cvOf(id){await findItem(id);return validateResume(JSON.parse(await fs.readFile(fileFor(id),'utf8')));}
function summary(item,cv){return { ...item, ...counts(cv) };}
async function addCV(cv,name,kind='import',meta={}) {
  validateResume(cv);
  if(typeof name!=='string' || name.trim().length<1 || name.length>120) throw httpError(400,'Nome richiesto (max 120 caratteri)');
  const r=await reg(), id=randomUUID(), now=new Date().toISOString();
  const item={localId:id,name:name.trim(),company:'',role:'',notes:'',origin:kind,sourceResumeId:cv.id,createdAt:now,updatedAt:now,archived:false,trashedAt:null};
  item.company=cleanMetadata(meta.company,100);item.role=cleanMetadata(meta.role,100);item.notes=cleanMetadata(meta.notes,1000);
  await atomicWrite(fileFor(id),cv);
  r.items.push(item);await atomicWrite(registryFile,r);
  return summary(item,cv);
}
function cleanMetadata(value,max){if(value===undefined||value===null)return '';if(typeof value!=='string'||value.length>max)throw httpError(400,`Valore troppo lungo (max ${max})`);return value.trim();}
async function editCV(id, mutator) {
  const {registry,item}=await findItem(id);
  const current=await cvOf(id);const proposed=structuredClone(current);
  mutator(proposed);
  validateResume(proposed);
  const histId=`${new Date().toISOString().replaceAll(':','-')}-${randomUUID()}`;
  await atomicWrite(path.join(DATA,'history',id,`${histId}.json`),current);
  await atomicWrite(fileFor(id),proposed);
  item.updatedAt=new Date().toISOString();await atomicWrite(registryFile,registry);
  return summary(item,proposed);
}
async function bodyJSON(req,max=1_500_000){
  if(!req.headers['content-type']?.startsWith('application/json')) throw httpError(415,'Richiesta application/json necessaria');
  const chunks=[];let n=0;
  for await(const chunk of req){n+=chunk.length;if(n>max) throw httpError(413,'File troppo grande');chunks.push(chunk);}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw httpError(400,'JSON non valido');}
}
function json(res,obj,status=200){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(obj));}
function text(res,s,status=200,ct='text/plain; charset=utf-8'){res.writeHead(status,{'Content-Type':ct,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(s);}
function sendFile(res,file,ct){return fs.readFile(path.join(ROOT,file)).then(data=>{res.writeHead(200,{'Content-Type':ct,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'"});res.end(data)});}
// Fail loudly if an installer omits a required UI asset. Never show an empty CV library as a side effect.
for (const asset of ['index.html','app.js','i18n.js','style.css','favicon.svg']) {
  if (!existsSync(path.join(ROOT,asset))) throw new Error(`Incomplete FlowCV Manager installation: missing ${asset}. Please reinstall.`);
}
await init();
const bridge=createBridge({DATA,atomicWrite,addCV,cvOf,mutate,bodyJSON,json});
const server=http.createServer(async(req,res)=>{
 try{
  const host=req.headers.host||'';
  if(![`127.0.0.1:${PORT}`,`localhost:${PORT}`].includes(host)) throw httpError(403,'Host non permesso');
  const url=new URL(req.url,'http://127.0.0.1');const u=url.pathname;const method=req.method;
  if(method!=='GET'&&method!=='HEAD'){
    if(req.headers['x-flowcv-manager-token']!==token) throw httpError(403,'Token locale mancante');
    const origin=req.headers.origin;
    if(origin && ![`http://127.0.0.1:${PORT}`,`http://localhost:${PORT}`].includes(origin)) throw httpError(403,'Origin non permessa');
  }
  if(method==='GET'&&u==='/') return await sendFile(res,'index.html','text/html; charset=utf-8');
  if(method==='GET'&&u==='/i18n.js') return await sendFile(res,'i18n.js','text/javascript; charset=utf-8');
  if(method==='GET'&&u==='/app.js') return await sendFile(res,'app.js','text/javascript; charset=utf-8');
  if(method==='GET'&&u==='/style.css') return await sendFile(res,'style.css','text/css; charset=utf-8');
  if(method==='GET'&&u==='/favicon.svg') return await sendFile(res,'favicon.svg','image/svg+xml; charset=utf-8');
  if(u.startsWith('/api/session')) { const handled=await bridge.handle(req,res,url); if(handled!==false)return; }
  // App-mode browser has a separate profile; open the original FlowCV in the
  // user's DEFAULT system browser (where they are already signed in).
  if(method==='POST'&&u==='/api/open-flowcv') {
    if(process.platform!=='win32') throw httpError(501,'Apertura del browser predefinito disponibile su Windows');
    const psScript = "try { Start-Process -FilePath 'msedge.exe' -ArgumentList 'https://app.flowcv.com' -ErrorAction Stop } catch { Start-Process -FilePath 'https://app.flowcv.com' -ErrorAction Stop }";
    await execFileAsync('powershell.exe',['-NoProfile','-NonInteractive','-Command',psScript],
      {windowsHide:true,timeout:10000});
    return json(res,{opened:true});
  }

  if(method==='GET'&&u==='/api/status') return json(res,{token,store:DATA,cliAvailable:existsSync(CLI),writeToFlowCV:true});
  if(method==='GET'&&u==='/api/cvs') {
    const r=await reg();const items=[];for(const item of r.items){const cv=await cvOf(item.localId);items.push(summary(item,cv));}return json(res,items);
  }
  if(method==='POST'&&u==='/api/import') { const b=await bodyJSON(req); assertObject(b);return json(res,await mutate(()=>addCV(b.resume,b.name||b.resume?.title||'CV importato','import',b)),201); }
  if(method==='POST'&&u==='/api/cvs') {const b=await bodyJSON(req);assertObject(b);const cv=structuredClone(await cvOf(b.sourceId));cv.title=b.name||cv.title;return json(res,await mutate(()=>addCV(cv,b.name,'clone',b)),201);}
  if(method==='POST'&&u==='/api/pull') {const b=await bodyJSON(req,10000);assertObject(b);assertGuid(b.resumeId);
    if(!existsSync(CLI)) throw httpError(404,'CLI Flowcv-MCP non disponibile; posiziona il gestore nella cartella Flowcv-MCP');
    const {stdout}=await execFileAsync(process.execPath,[CLI,'resume','get',b.resumeId],{maxBuffer:5_000_000,timeout:40000,windowsHide:true});
    let cv;try{cv=JSON.parse(stdout)}catch{throw httpError(502,'La CLI non ha restituito un JSON valido')}
    return json(res,await mutate(()=>addCV(cv,b.name||`FlowCV ${new Date().toLocaleString('it-IT')}`,'flowcv-readonly')),201);
  }
  const match=u.match(/^\/api\/cvs\/([0-9a-f-]{36})(?:\/(.*))?$/i);
  if(match){const id=match[1], action=match[2]||'';assertGuid(id);
    if(method==='GET'&&action==='') {const cv=await cvOf(id);return json(res,{item:(await findItem(id)).item,resume:cv});}
    if(method==='PATCH'&&action==='metadata'){
      const b=await bodyJSON(req,10000);assertObject(b);
      return json(res,await mutate(async()=>{
        const {registry,item}=await findItem(id);
        if(typeof b.name!=='string'||!b.name.trim()||b.name.length>120)throw httpError(400,'Nome non valido');
        item.name=b.name.trim();item.company=cleanMetadata(b.company,100);
        item.role=cleanMetadata(b.role,100);item.notes=cleanMetadata(b.notes,1000);
        item.updatedAt=new Date().toISOString();await atomicWrite(registryFile,registry);return item;
      }));
    }
    if(method==='PATCH'&&action==='trash'){
      const b=await bodyJSON(req,1000);assertObject(b);
      if(typeof b.trashed!=='boolean')throw httpError(400,'Valore cestino non valido');
      return json(res,await mutate(async()=>{
        const {registry,item}=await findItem(id);
        item.trashedAt=b.trashed?new Date().toISOString():null;
        item.updatedAt=new Date().toISOString();await atomicWrite(registryFile,registry);return item;
      }));
    }
    if(method==='DELETE'&&action===''){
      const b=await bodyJSON(req,1000);if(b.confirm!==true)throw httpError(400,'Conferma richiesta');
      return json(res,await mutate(async()=>{
        const {registry,item}=await findItem(id);
        if(!item.trashedAt)throw httpError(409,'Sposta prima il CV nel Cestino');
        await atomicWrite(registryFile,{...registry,items:registry.items.filter(x=>x.localId!==id)});
        await fs.rm(fileFor(id),{force:true});
        await fs.rm(path.join(DATA,'history',id),{recursive:true,force:true});
        return {deleted:true};
      }));
    }
    if(method==='GET'&&action==='export') {const cv=await cvOf(id);res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Content-Disposition':`attachment; filename="flowcv-${id}.json"`,'Cache-Control':'no-store'});return res.end(JSON.stringify(cv,null,2)+'\n');}
    if(method==='GET'&&action==='history') {const folder=path.join(DATA,'history',id);const files=(await fs.readdir(folder).catch(()=>[])).filter(f=>/^[0-9TZ:.-]+-[0-9a-f-]{36}\.json$/i.test(f));return json(res,files.sort().reverse());}
    if(method==='POST'&&action==='history/recover') {
      const b=await bodyJSON(req,10000);assertObject(b);
      if(typeof b.filename!=='string'||!/^[0-9TZ:.-]+-[0-9a-f-]{36}\.json$/i.test(b.filename)) throw httpError(400,'Snapshot non valido');
      const snapshot=JSON.parse(await fs.readFile(path.join(DATA,'history',id,b.filename),'utf8'));
      const oldItem=(await findItem(id)).item;
      return json(res,await mutate(()=>addCV(snapshot,`${oldItem.name} - recuperato`,'history')),201);
    }
    if(method==='POST'&&action==='entry/new') {
      const b=await bodyJSON(req,10000);assertObject(b);const key=b.sectionKey;
      return json(res,await mutate(()=>editCV(id,cv=>{
        if(!Object.hasOwn(cv.content,key))throw httpError(404,'Sezione inesistente');
        const entries=cv.content[key].entries;
        const example=entries.find(e=>e.id===b.fromEntryId)||entries[0];
        if(!example)throw httpError(400,'Sezione vuota: utilizzare JSON avanzato');
        const fresh=structuredClone(example);fresh.id=randomUUID();fresh.isHidden=false;
        for(const [field,value] of Object.entries(fresh))if(typeof value==='string'&&!['id','createdAt','updatedAt'].includes(field)){
          if(['startDateNew','endDateNew','employerLink','schoolLink','titleLink','location','websiteLink'].includes(field))fresh[field]='';
          else if(field==='title'||field==='skill'||field==='jobTitle'||field==='degree'||field==='language'||field==='employer')fresh[field]='Nuova voce';
          else if(field==='text'||field==='infoHtml'||field==='description')fresh[field]='';
          else fresh[field]='';
        }
        fresh.createdAt=new Date().toISOString();fresh.updatedAt=fresh.createdAt;entries.push(fresh);
      })),201);
    }
    if(method==='PATCH'&&action==='section'){
      const b=await bodyJSON(req);assertObject(b);
      return json(res,await mutate(()=>editCV(id,cv=>{
        if(!Object.hasOwn(cv.content,b.sectionKey))throw httpError(404,'Sezione inesistente');
        if(typeof b.displayName!=='string')throw httpError(400,'Nome sezione richiesto');
        cv.content[b.sectionKey].displayName=b.displayName;
      })));
    }
    if(method==='PATCH'&&action==='name') {const b=await bodyJSON(req);assertObject(b);if(typeof b.name!=='string'||!b.name.trim()||b.name.length>120)throw httpError(400,'Nome non valido');
      return json(res,await mutate(async()=>{const {registry,item}=await findItem(id);item.name=b.name.trim();item.updatedAt=new Date().toISOString();await atomicWrite(registryFile,registry);return item;}));}
    if(method==='PATCH'&&action==='archive'){const b=await bodyJSON(req);assertObject(b);if(typeof b.archived!=='boolean')throw httpError(400,'Booleano richiesto');
      return json(res,await mutate(async()=>{const {registry,item}=await findItem(id);item.archived=b.archived;await atomicWrite(registryFile,registry);return item;}));}
    if(method==='PATCH'&&action==='resume') {const b=await bodyJSON(req);assertObject(b);validateResume(b.resume);const old=await cvOf(id);if(b.resume.id!==old.id)throw httpError(400,'Non modificare l’ID remoto del CV');return json(res,await mutate(()=>editCV(id,cv=>{Object.keys(cv).forEach(k=>delete cv[k]);Object.assign(cv,b.resume)})));}
    if(method==='PATCH'&&action==='personal') {const b=await bodyJSON(req);assertObject(b);assertObject(b.fields);return json(res,await mutate(()=>editCV(id,cv=>{for(const [k,v] of Object.entries(b.fields)){if(!(k in cv.personalDetails))throw httpError(400,`Campo sconosciuto ${k}`);if(typeof cv.personalDetails[k] !== 'string'||typeof v!=='string')throw httpError(400,`Campo ${k} non testuale`);cv.personalDetails[k]=v;}})));}
    const em=action.match(/^entry\/([^/]+)\/([0-9a-f-]{36})$/i);
    if(method==='PATCH'&&em){const key=decodeURIComponent(em[1]),entryId=em[2];const b=await bodyJSON(req);assertObject(b);assertObject(b.fields);return json(res,await mutate(()=>editCV(id,cv=>{
      const sec=cv.content[key];if(!sec)throw httpError(404,'Sezione mancante');const entry=sec.entries.find(e=>e.id===entryId);if(!entry)throw httpError(404,'Voce non trovata');
      for(const [k,v] of Object.entries(b.fields)) {if(!Object.hasOwn(entry,k)||['id','createdAt','updatedAt'].includes(k))throw httpError(400,`Campo non modificabile: ${k}`);if(k==='isHidden'){if(typeof v!=='boolean')throw httpError(400,'Booleano richiesto');}else if(typeof entry[k]!=='string'||typeof v!=='string')throw httpError(400,`Tipo non supportato per ${k}`);entry[k]=v;}
      entry.updatedAt=new Date().toISOString();
    })));
    }
  }
  throw httpError(404,'Percorso non trovato');
 }catch(e){json(res,{error:e?.message||String(e)},Number.isInteger(e?.code)?e.code:500);}
});
server.listen(PORT,'127.0.0.1',()=>{console.log(`FlowCV Local Manager: http://127.0.0.1:${PORT}`);console.log(`Archivio: ${DATA}`);console.log('Account singolo e Cestino. Pubblica e scarica PDF con un clic: nessun backup o conferma aggiuntiva.');});
