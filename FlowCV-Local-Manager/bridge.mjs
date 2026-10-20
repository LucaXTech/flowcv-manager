/** Single-account FlowCV bridge for explicit import/export and online restore. No browser automation. */
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

const ORIGIN='https://app.flowcv.com';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const sha=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const count=c=>Object.values(c||{}).reduce((n,s)=>n+(s.entries?.length||0),0);
const PDF_LIMIT=30*1024*1024;
/** FlowCV's own PDF export endpoint, not a local PDF renderer. */
export async function fetchFlowCvPdf(cookie,resumeId){
 validId(resumeId);
 const url=new URL('/api/resumes/download',ORIGIN);
 url.searchParams.set('resumeId',resumeId);
 url.searchParams.set('previewPageCount','1');
 const response=await fetch(url,{
  method:'GET',redirect:'manual',signal:AbortSignal.timeout(60000),
  headers:{Accept:'application/json, text/plain, */*',Cookie:`flowcvsidapp=${cookie}`}
 });
 if(response.status===401 || response.status===403)error(401,'Sessione FlowCV scaduta: aggiorna il cookie');
 if(!response.ok || response.status>=300&&response.status<400)error(502,`FlowCV non ha generato il PDF (HTTP ${response.status})`);
 const type=(response.headers.get('content-type')||'').toLowerCase();
 if(type.includes('json')||type.includes('html')||type.includes('text/plain'))error(502,'FlowCV non ha restituito un PDF');
 const declaredSize=Number(response.headers.get('content-length'));
 if(Number.isFinite(declaredSize)&&declaredSize>PDF_LIMIT)error(502,'PDF FlowCV troppo grande');
 const bytes=Buffer.from(await response.arrayBuffer());
 if(bytes.length>PDF_LIMIT||bytes.length<6||bytes.subarray(0,5).toString('ascii')!=='%PDF-')
  error(502,'File restituito da FlowCV non è un PDF valido');
 return bytes;
}
function pdfFilename(title){
 // ASCII-safe Content-Disposition filename; never trust the remote title as headers.
 const ascii=String(title||'Resume').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[^A-Za-z0-9._ -]/g,' ').replace(/\s+/g,' ').trim().slice(0,70);
 return `FlowCV-${ascii||'Resume'}.pdf`;
}
function error(status,message){const e=new Error(message);e.code=status;throw e;}
function validId(id){if(typeof id!=='string'||!UUID.test(id))error(400,'ID del curriculum non valido');}
function differences(a,b,path='',out=[]){
 if(isDeepStrictEqual(a,b))return out;
 if(a&&b&&!Array.isArray(a)&&!Array.isArray(b)&&typeof a==='object'&&typeof b==='object'){
  for(const k of new Set([...Object.keys(a),...Object.keys(b)]))differences(a[k],b[k],`${path}.${k}`,out);
 }else if(Array.isArray(a)&&Array.isArray(b)){
  if(a.length!==b.length)out.push(`${path}.length`);
  for(let i=0;i<Math.max(a.length,b.length);i++)differences(a[i],b[i],`${path}[${i}]`,out);
 }else out.push(path||'$');
 return out;
}
export async function windowsDpapi(value,mode){
 if(process.platform!=='win32')error(501,'Il salvataggio cifrato delle sessioni richiede Windows');
 const script=String.raw`
$ErrorActionPreference='Stop'
# powershell.exe usa Windows PowerShell 5.1: ProtectedData risiede in System.Security.dll.
# L'assembly non viene sempre caricato automaticamente in una sessione -NoProfile.
Add-Type -AssemblyName System.Security -ErrorAction Stop
$inputBase64=[Console]::In.ReadToEnd().Trim()
$bytes=[Convert]::FromBase64String($inputBase64)
if ('MODE' -eq 'encrypt') { $result=[System.Security.Cryptography.ProtectedData]::Protect($bytes,$null,[System.Security.Cryptography.DataProtectionScope]::CurrentUser) }
else { $result=[System.Security.Cryptography.ProtectedData]::Unprotect($bytes,$null,[System.Security.Cryptography.DataProtectionScope]::CurrentUser) }
[Console]::Out.Write([Convert]::ToBase64String($result))
`.replace('MODE',mode);
 const encoded=Buffer.from(script,'utf16le').toString('base64');
 return await new Promise((resolve,reject)=>{
  const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',encoded],{windowsHide:true,stdio:['pipe','pipe','pipe']});
  let output='',stderr='',finished=false;
  const done=(err,result)=>{if(finished)return;finished=true;clearTimeout(timer);err?reject(err):resolve(result)};
  const timer=setTimeout(()=>{child.kill();done(Error('Timeout Windows DPAPI'))},15000);
  child.stdout.on('data',b=>output+=String(b));child.stderr.on('data',b=>stderr+=String(b));
  child.on('error',err=>done(err));
  child.on('close',code=>{if(code===0&&output.trim())done(null,output.trim());else done(Error('DPAPI non disponibile: '+stderr.slice(0,220)))});
  child.stdin.end(mode==='encrypt'?Buffer.from(value,'utf8').toString('base64'):value);
 });
}
async function api(cookie,route,method='GET',payload){
 const resp=await fetch(`${ORIGIN}${route}`,{
  method,redirect:'manual',signal:AbortSignal.timeout(30000),
  headers:{Accept:'application/json',Cookie:`flowcvsidapp=${cookie}`,...(payload===undefined?{}:{'Content-Type':'application/json'})},
  body:payload===undefined?undefined:JSON.stringify(payload)
 });
 let obj;try{obj=await resp.json()}catch{error(502,`Risposta FlowCV non JSON (HTTP ${resp.status})`)}
 if(!resp.ok || !obj?.success)error(resp.status===401?401:502,
  `FlowCV: HTTP ${resp.status}, codice ${obj?.code??'?'}${obj?.error?`, ${obj.error}`:''}`);
 return obj.data;
}
export function createBridge({DATA,atomicWrite,addCV,cvOf,mutate,bodyJSON,json,
                                encrypt=windowsDpapi,decrypt=windowsDpapi,
                                apiCall=api,pdfFetch=fetchFlowCvPdf}){
 const directory=path.join(DATA,'account');
 const profilePath=path.join(directory,'profile.json');
 const credentialPath=path.join(directory,'session.dpapi');
 const tickets=new Map();

 async function profile(){try{return JSON.parse(await fs.readFile(profilePath,'utf8'))}catch(e){if(e.code==='ENOENT')return null;throw e}}
 async function credential(){
  let encrypted;try{encrypted=(await fs.readFile(credentialPath,'utf8')).trim()}catch{error(401,'Non hai collegato un account FlowCV')}
  try{return Buffer.from(await decrypt(encrypted,'decrypt'),'base64').toString('utf8')}
  catch{error(401,'Sessione non leggibile: aggiorna il cookie')}
 }
 async function authenticate(){
  const p=await profile();if(!p)error(401,'Collega prima il tuo account');
  const cookie=await credential();
  let user;try{user=(await apiCall(cookie,'/api/auth/init_user')).user}catch{error(401,'Sessione FlowCV scaduta: aggiorna il cookie')}
  if(user?.email?.toLowerCase()!==p.email.toLowerCase())error(401,'La sessione appartiene a un account diverso');
  return {cookie,email:p.email};
 }
 async function connect(raw,confirmation){
  if(typeof raw!=='string')error(400,'Valore cookie mancante');
  const value=raw.trim().replace(/^flowcvsidapp=/i,'');
  if(!value || value.length>5000 || /[\r\n;]/.test(value))error(400,'Cookie non valido. Incolla solo il valore flowcvsidapp');
  let user;try{user=(await apiCall(value,'/api/auth/init_user')).user}catch{error(401,'Cookie scaduto o non valido. Riprova da FlowCV')}
  const email=user?.email;if(typeof email!=='string'||!email)error(401,'Account FlowCV non identificato');
  const old=await profile();
  if(old && old.email.toLowerCase()!==email.toLowerCase() && confirmation!=='CAMBIA ACCOUNT')
    error(409,`È già collegato ${old.email}. Per sostituirlo conferma il cambio account.`);
  const blob=await encrypt(value,'encrypt');
  await atomicWrite(credentialPath,blob+'\n');
  await atomicWrite(profilePath,{email,updatedAt:new Date().toISOString()});
  return {connected:true,valid:true,email};
 }
 async function getRemote(cookie,id){
  validId(id);
  const listing=(await apiCall(cookie,'/api/resumes/all')).resumes||[];
  if(!listing.some(r=>r.id===id))error(403,'Il CV non appartiene all’account corrente');
  const resume=(await apiCall(cookie,`/api/resumes/${id}`)).resume;
  if(resume?.id!==id)error(502,'FlowCV ha restituito un CV diverso da quello richiesto');
  return resume;
 }
 // Reuse the verified restore logic: never publish if FlowCV did not save the selected CV.
 async function applyAndVerify(cookie,source,target){
  const personal={...source.personalDetails,photo:target.personalDetails?.photo};
  const expected={content:source.content,customization:source.customization,personalDetails:personal,lng:source.lng};
  const actual={content:target.content,customization:target.customization,personalDetails:target.personalDetails,lng:target.lng};
  if(differences(actual,expected).length){
   let apiError=null,languageError=null;
   try{await apiCall(cookie,'/api/resumes/apply_template','PATCH',{
    resumeId:target.id,templateId:source.customization?.lastUsedTemplateId,
    customization:source.customization,content:source.content,personalDetails:personal,
    businessDetails:source.businessDetails||{},usingBusinessTemplateId:''
   });}catch(e){apiError=e.message}
   if(source.lng && source.lng!==target.lng){
    try{await apiCall(cookie,'/api/resumes/save_language','PATCH',{resumeId:target.id,lng:source.lng})}
    catch(e){languageError=e.message}
   }
   const after=await getRemote(cookie,target.id);
   const mismatch=differences(
    {content:after.content,customization:after.customization,personalDetails:after.personalDetails,lng:after.lng},expected);
   if(mismatch.length)error(409,`Ripristino non verificato (${mismatch.length} differenze). Pubblicazione e PDF annullati.${apiError?' API: '+apiError:''}${languageError?' Lingua: '+languageError:''}`);
   return after;
  }
  return target;
 }
 const activeExports=new Set();
 async function handle(req,res,url){
  const u=url.pathname,method=req.method;
  if(method==='GET'&&u==='/api/session'){
   const p=await profile();if(!p)return json(res,{connected:false,valid:false});
   try{await authenticate();return json(res,{connected:true,valid:true,email:p.email})}
   catch{return json(res,{connected:true,valid:false,email:p.email,reason:'Sessione scaduta'});}
  }
  if(method==='POST'&&u==='/api/session/connect'){
   const b=await bodyJSON(req,12000);return json(res,await connect(b.cookie,b.confirmSwitch));
  }
  if(method==='POST'&&u==='/api/session/from-cli'){
   const b=await bodyJSON(req,1500);
   const file=path.join(os.homedir(),'.config','flowcv','config.json');
   let raw;try{raw=JSON.parse(await fs.readFile(file,'utf8')).cookie}catch{error(404,'Cookie CLI non trovato: incollalo manualmente')}
   return json(res,await connect(raw,b.confirmSwitch));
  }
  if(method==='POST'&&u==='/api/session/forget'){
   const b=await bodyJSON(req,1000);if(b.confirm!=='SCOLLEGA')error(400,'Conferma mancante');
   await fs.rm(profilePath,{force:true});await fs.rm(credentialPath,{force:true});
   return json(res,{connected:false});
  }
  if(method==='GET'&&u==='/api/session/resumes'){
   const {cookie}=await authenticate();return json(res,(await apiCall(cookie,'/api/resumes/all')).resumes||[]);
  }
  if(method==='POST'&&u==='/api/session/pdf'){
   const b=await bodyJSON(req,10000);const {cookie}=await authenticate();
   const target=await getRemote(cookie,b.resumeId);
   const bytes=await pdfFetch(cookie,target.id);
   const filename=pdfFilename(target.title);
   res.writeHead(200,{
    'Content-Type':'application/pdf',
    'Content-Length':bytes.length,
    'Content-Disposition':`attachment; filename="${filename}"`,
    'Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff',
    'Content-Security-Policy':"default-src 'none'; sandbox"
   });
   res.end(bytes);
   return;
  }
  // One click: local CV -> current online resume -> verify -> publish web page -> authentic PDF.
  // No confirmation and no automatic backup: this is the explicitly requested workflow.
  if(method==='POST'&&u==='/api/session/use-and-download'){
   const b=await bodyJSON(req,10000);
   validId(b.localId);validId(b.resumeId);
   if(activeExports.has(b.resumeId))error(409,'Pubblicazione già in corso. Attendi il completamento.');
   activeExports.add(b.resumeId);
   try{
    const {cookie}=await authenticate();
    const source=await cvOf(b.localId);
    const target=await getRemote(cookie,b.resumeId);
    const after=await applyAndVerify(cookie,source,target);
    if(!after.webResumeLive){
     try{await apiCall(cookie,'/api/resumes/publish_web_resume','PATCH',{resumeId:target.id,publish:true})}
     catch(e){error(502,`CV ripristinato, ma pubblicazione web non riuscita: ${e.message}`)}
     const published=await getRemote(cookie,target.id);
     if(!published.webResumeLive)error(502,'CV ripristinato, ma FlowCV non conferma la pubblicazione web. PDF non richiesto.');
    }
    let bytes;
    try{bytes=await pdfFetch(cookie,target.id)}
    catch(e){error(502,`CV ripristinato e pubblicato, ma download PDF fallito: ${e.message}`)}
    // The archive metadata provides a meaningful filename without changing the CV title online.
    const filename=pdfFilename(typeof b.filename==='string'?b.filename:source.title);
    res.writeHead(200,{
     'Content-Type':'application/pdf',
     'Content-Length':bytes.length,
     'Content-Disposition':`attachment; filename="${filename}"`,
     'Cache-Control':'no-store',
     'X-Content-Type-Options':'nosniff',
     'Content-Security-Policy':"default-src 'none'; sandbox"
    });
    res.end(bytes);
    return;
   }finally{activeExports.delete(b.resumeId)}
  }
  if(method==='POST'&&u==='/api/session/pull'){
   const b=await bodyJSON(req,10000);const {cookie}=await authenticate();const target=await getRemote(cookie,b.resumeId);
   const title=(typeof b.name==='string'&&b.name.trim())||`FlowCV · ${target.title||'Curriculum'}`;
   return json(res,await mutate(()=>addCV(target,title,'flowcv-snapshot',b)),201);
  }
  if(method==='POST'&&u==='/api/session/preview'){
   const b=await bodyJSON(req,10000);const {cookie,email}=await authenticate();
   const source=await cvOf(b.localId),target=await getRemote(cookie,b.resumeId);
   const mergedPersonal={...source.personalDetails,photo:target.personalDetails?.photo};
   const expected={content:source.content,customization:source.customization,personalDetails:mergedPersonal,lng:source.lng};
   const actual={content:target.content,customization:target.customization,personalDetails:target.personalDetails,lng:target.lng};
   const changed=differences(actual,expected);
   const ticketId=randomUUID();tickets.set(ticketId,{localId:b.localId,remoteId:b.resumeId,
    email,oldHash:sha(actual),localHash:sha(source),expires:Date.now()+300000});
   return json(res,{ticketId,account:email,title:target.title,published:!!target.webResumeLive,
    changes:changed.length,firstChanges:changed.slice(0,12),sections:Object.keys(source.content||{}).length,
    entries:count(source.content),photoPreserved:!!target.personalDetails?.photo?.imageId});
  }
  if(method==='POST'&&u==='/api/session/push'){
   const b=await bodyJSON(req,10000),ticket=tickets.get(b.ticketId);tickets.delete(b.ticketId);
   if(!ticket||ticket.expires<Date.now())error(409,'Anteprima scaduta: creane una nuova');
   const {cookie,email}=await authenticate();
   if(email!==ticket.email)error(409,'Account diverso da quello dell’anteprima');
   const source=await cvOf(ticket.localId),target=await getRemote(cookie,ticket.remoteId);
   const actual={content:target.content,customization:target.customization,personalDetails:target.personalDetails,lng:target.lng};
   if(sha(source)!==ticket.localHash || sha(actual)!==ticket.oldHash)
    error(409,'Il CV locale o online è cambiato dopo l’anteprima. Ripeti il confronto.');
   if(b.confirm!==(target.webResumeLive?'PUBBLICATO':'INVIA'))error(409,'Conferma esplicita mancante');
   const personal={...source.personalDetails,photo:target.personalDetails?.photo};
   let apiError=null,languageError=null;
   try{await apiCall(cookie,'/api/resumes/apply_template','PATCH',{
    resumeId:ticket.remoteId,templateId:source.customization?.lastUsedTemplateId,
    customization:source.customization,content:source.content,personalDetails:personal,
    businessDetails:source.businessDetails||{},usingBusinessTemplateId:''
   });}catch(e){apiError=e.message}
   if(source.lng && source.lng!==target.lng){
    try{await apiCall(cookie,'/api/resumes/save_language','PATCH',{resumeId:ticket.remoteId,lng:source.lng})}
    catch(e){languageError=e.message}
   }
   const after=await getRemote(cookie,ticket.remoteId);
   const mismatches=differences({content:after.content,customization:after.customization,personalDetails:after.personalDetails,lng:after.lng},
    {content:source.content,customization:source.customization,personalDetails:personal,lng:source.lng});
   return json(res,{verified:mismatches.length===0,totalMismatches:mismatches.length,mismatches:mismatches.slice(0,30),
    apiError,languageError,sections:Object.keys(after.content||{}).length,entries:count(after.content)});
  }
  return false;
 }
 return {handle};
}
