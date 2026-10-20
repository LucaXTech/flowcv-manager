import {mkdtempSync, rmSync, promises as fs} from 'node:fs';
import {tmpdir} from 'node:os';import path from 'node:path';
import assert from 'node:assert/strict';
import {createBridge,fetchFlowCvPdf} from '../bridge.mjs';

const DATA=mkdtempSync(path.join(tmpdir(),'flowcv-bridge-unit-'));
const old={id:'11111111-1111-4111-8111-111111111111',title:'Originale',content:{},personalDetails:{fullName:'Prima',photo:{imageId:'account-photo'}},customization:{font:{selected:'sans'},lastUsedTemplateId:'template'},lng:'en',webResumeLive:true};
const src={id:'22222222-2222-4222-8222-222222222222',title:'Biomedical',content:{work:{entries:[{id:'33333333-3333-4333-8333-333333333333',jobTitle:'R&D',isHidden:false}],displayName:'Esperienza',sectionType:'work'}},personalDetails:{fullName:'Dopo',photo:{imageId:'source-photo'}},customization:{font:{selected:'serif'},lastUsedTemplateId:'template'},lng:'it',businessDetails:{}};
let online=structuredClone(old),writes=0,pdfRequests=0,publishRequests=0,allowApply=true;
const maps=new Map([['44444444-4444-4444-8444-444444444444',structuredClone(src)]]);
const mockApi=async (cookie,route,method,payload)=>{
 assert.equal(cookie,'secret-cookie');
 if(route==='/api/auth/init_user')return {user:{email:'test@example.net'}};
 if(route==='/api/resumes/all')return {resumes:[{id:old.id,title:online.title,webResumeLive:online.webResumeLive}]};
 if(route===`/api/resumes/${old.id}`)return {resume:structuredClone(online)};
 if(route==='/api/resumes/apply_template'){
  writes++;assert.equal(method,'PATCH');assert.equal(payload.resumeId,old.id);
  if(!allowApply)return {};
  online.content=structuredClone(payload.content);online.customization=structuredClone(payload.customization);
  online.personalDetails=structuredClone(payload.personalDetails);return {};
 }
 if(route==='/api/resumes/save_language'){if(allowApply)online.lng=payload.lng;return {}}
 if(route==='/api/resumes/publish_web_resume'){
  publishRequests++;assert.equal(payload.resumeId,old.id);assert.equal(payload.publish,true);
  online.webResumeLive=true;return {};
 }
 throw Error('Unexpected API route: '+route);
};
const atomicWrite=async(file,body)=>{await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,typeof body==='string'?body:JSON.stringify(body))};
const newId='55555555-5555-4555-8555-555555555555';
const bridge=createBridge({DATA,atomicWrite,apiCall:mockApi,
 pdfFetch:async(cookie,id)=>{
  assert.equal(cookie,'secret-cookie');assert.equal(id,old.id);
  pdfRequests++;
  return Buffer.from('%PDF-1.4\nOriginal FlowCV test\n');
 },
 encrypt:async value=>Buffer.from(value).toString('base64'),decrypt:async value=>value,
 bodyJSON:async req=>req.body,
 json:(res,obj)=>obj,
 cvOf:async id=>structuredClone(maps.get(id)),
 addCV:async(cv,name,origin)=>{maps.set(newId,structuredClone(cv));return {localId:newId,name,origin}},
 mutate:async fn=>await fn()
});
async function call(endpoint,method='GET',body){return bridge.handle({method,body}, {}, new URL('http://localhost'+endpoint));}
try{
 assert.deepEqual(await call('/api/session'),{connected:false,valid:false});
 const connected=await call('/api/session/connect','POST',{cookie:'secret-cookie'});
 assert.equal(connected.email,'test@example.net');
 assert.equal((await call('/api/session')).valid,true);
 assert.equal((await call('/api/session/resumes')).length,1);
 const served={status:null,headers:null,bytes:null,
  writeHead(code,headers){this.status=code;this.headers=headers},
  end(bytes){this.bytes=bytes}
 };
 await bridge.handle({method:'POST',body:{resumeId:old.id}},served,new URL('http://localhost/api/session/pdf'));
 assert.equal(served.status,200);
 assert.equal(served.headers['Content-Type'],'application/pdf');
 assert.equal(served.headers['Cache-Control'],'no-store');
 assert(served.headers['Content-Disposition'].includes('FlowCV-Originale.pdf'));
 assert.equal(served.bytes.toString('ascii').slice(0,5),'%PDF-');
 assert.equal(pdfRequests,1);
 await assert.rejects(call('/api/session/pdf','POST',{resumeId:src.id}),/non appartiene/);
 assert.equal(pdfRequests,1,'Non deve richiedere il PDF di un CV esterno');
 const preview=await call('/api/session/preview','POST',{localId:'44444444-4444-4444-8444-444444444444',resumeId:old.id});
 assert(preview.changes>0);assert(preview.published);assert(preview.photoPreserved);
 const restored=await call('/api/session/push','POST',{ticketId:preview.ticketId,confirm:'PUBBLICATO'});
 assert(restored.verified,JSON.stringify(restored));assert.equal(restored.totalMismatches,0);assert.equal('backupLocalId' in restored,false);
 assert.equal(writes,1);assert.equal(online.personalDetails.photo.imageId,'account-photo');assert.equal(online.id,old.id);
 // New single-action flow: currently published, select a different local CV, verify, download.
 online=structuredClone(old);
 const readyForPdf={status:null,headers:null,bytes:null,
  writeHead(code,headers){this.status=code;this.headers=headers},end(bytes){this.bytes=bytes}};
 await bridge.handle({method:'POST',body:{localId:'44444444-4444-4444-8444-444444444444',resumeId:old.id,filename:'Coloplast - R&D'}},
  readyForPdf,new URL('http://localhost/api/session/use-and-download'));
 assert.equal(readyForPdf.status,200);
 assert.equal(readyForPdf.headers['Content-Type'],'application/pdf');
 assert(readyForPdf.headers['Content-Disposition'].includes('Coloplast - R D.pdf'));
 assert.equal(online.personalDetails.fullName,'Dopo');
 assert.equal(online.personalDetails.photo.imageId,'account-photo');
 assert.equal(publishRequests,0,'Already published: should not republish');
 // Once a target is unpublished, the same click must publish it before downloading.
 online=structuredClone(old);online.webResumeLive=false;
 const unpublishedPdf={status:null,headers:null,bytes:null,
  writeHead(code,headers){this.status=code;this.headers=headers},end(bytes){this.bytes=bytes}};
 await bridge.handle({method:'POST',body:{localId:'44444444-4444-4444-8444-444444444444',resumeId:old.id}},
  unpublishedPdf,new URL('http://localhost/api/session/use-and-download'));
 assert.equal(unpublishedPdf.status,200);assert.equal(online.webResumeLive,true);
 assert.equal(publishRequests,1);
 const pdfsBeforeFailure=pdfRequests,publishesBeforeFailure=publishRequests;
 // Never publish or download if the server ignores our resume update.
 online=structuredClone(old);online.webResumeLive=false;
 allowApply=false;
 await assert.rejects(call('/api/session/use-and-download','POST',{
  localId:'44444444-4444-4444-8444-444444444444',resumeId:old.id}),/Ripristino non verificato/);
 assert.equal(publishRequests,publishesBeforeFailure);
 assert.equal(pdfRequests,pdfsBeforeFailure);
 assert.equal(online.webResumeLive,false);
 allowApply=true;
 // A second attempt must be possible; no stuck busy lock after a rejected operation.
 const retryPdf={status:null,headers:null,bytes:null,
  writeHead(code,headers){this.status=code;this.headers=headers},end(bytes){this.bytes=bytes}};
 await bridge.handle({method:'POST',body:{localId:'44444444-4444-4444-8444-444444444444',resumeId:old.id}},
  retryPdf,new URL('http://localhost/api/session/use-and-download'));
 assert.equal(retryPdf.status,200);
 assert.equal(maps.has(newId),false,'Non deve generare CV backup nella libreria');
 await assert.rejects(fs.stat(path.join(DATA,'remote-backups')), {code:'ENOENT'});
 // Validate real upstream PDF response handling, JSON errors and HTML redirects.
 const originalFetch=globalThis.fetch;
 try{
  globalThis.fetch=async(url,options)=>{
   assert.equal(options.method,'GET');
   assert.equal(options.headers.Cookie,'flowcvsidapp=secret-cookie');
   assert.equal(new URL(url).searchParams.get('previewPageCount'),'1');
   return new Response(Buffer.from('%PDF-1.7\nsynthetic\n'),{status:200,headers:{'content-type':'application/pdf'}});
  };
  const pdf=await fetchFlowCvPdf('secret-cookie',old.id);
  assert.equal(pdf.toString('ascii').slice(0,5),'%PDF-');
  globalThis.fetch=async()=>new Response(JSON.stringify({success:false}),{status:200,headers:{'content-type':'application/json'}});
  await assert.rejects(fetchFlowCvPdf('secret-cookie',old.id),/non ha restituito un PDF/);
  globalThis.fetch=async()=>new Response('Not a PDF',{status:200,headers:{'content-type':'application/pdf'}});
  await assert.rejects(fetchFlowCvPdf('secret-cookie',old.id),/non è un PDF valido/);
  globalThis.fetch=async()=>new Response(null,{status:302,headers:{location:'/login'}});
  await assert.rejects(fetchFlowCvPdf('secret-cookie',old.id),/non ha generato il PDF/);
 }finally{globalThis.fetch=originalFetch}
 console.log('PASS: login, original PDF, one-click restore/publish/download, no backup, no double-publish, verification gate, retry, photo');
}finally{rmSync(DATA,{recursive:true,force:true})}
