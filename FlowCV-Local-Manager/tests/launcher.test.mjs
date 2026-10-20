import {spawn} from 'node:child_process';
import {mkdtempSync, rmSync, writeFileSync, chmodSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {browserCandidates,findBrowser} from '../launcher.mjs';
const env={ProgramFiles:'C:\\Program Files',LOCALAPPDATA:'C:\\Users\\tester\\AppData\\Local'};
const list=browserCandidates(env,'win32');
assert(list.some(x=>x.includes('Microsoft')&&x.endsWith('msedge.exe')));
assert(list.some(x=>x.includes('Google')&&x.endsWith('chrome.exe')));
const custom='C:\\Portable\\Edge.exe';
assert.equal(findBrowser({...env,FLOWCV_MANAGER_BROWSER:custom},'win32',x=>x===custom),custom);
function run(bin,args,opts){return new Promise((resolve,reject)=>{
 const c=spawn(bin,args,opts);let stderr='';c.stderr?.on('data',b=>stderr+=b.toString());
 c.on('error',reject);c.on('exit',(code,signal)=>resolve({code,signal,stderr}));
});}
if(process.platform!=='win32'){
 const temp=mkdtempSync(path.join(os.tmpdir(),'flowcv-launcher-'));
 const browser=path.join(temp,'fake-browser');
 const port=25000+Math.floor(Math.random()*20000);
 const base=`http://127.0.0.1:${port}`;
 writeFileSync(browser,'#!/bin/sh\nexit 0\n');chmodSync(browser,0o755);
 const launcher=fileURLToPath(new URL('../launcher.mjs',import.meta.url));
 const opts={env:{...process.env,FLOWCV_MANAGER_BROWSER:browser,FLOWCV_MANAGER_PORT:String(port),FLOWCV_MANAGER_DATA_DIR:temp,LOCALAPPDATA:temp},stdio:'pipe'};
 try{
  let result=await run(process.execPath,[launcher],opts);
  assert.equal(result.code,0,'launcher exits after opening browser even if browser exits immediately: '+result.stderr);
  let alive=await fetch(`${base}/api/status`);
  assert.equal(alive.status,200,'server stays alive after Edge-like immediate browser exit');
  const first=await alive.json();
  result=await run(process.execPath,[launcher],opts);
  assert.equal(result.code,0,'second launch reuses service');
  alive=await fetch(`${base}/api/status`);
  assert.equal((await alive.json()).token,first.token,'existing server reused');
  result=await run(process.execPath,[launcher,'--stop'],opts);
  assert.equal(result.code,0,'explicit stop succeeds: '+result.stderr);
  let down=false;
  for(let i=0;i<20;i++){
   try{await fetch(`${base}/api/status`)}catch{down=true;break}
   await new Promise(r=>setTimeout(r,80));
  }
  assert(down,'server stops on explicit shutdown');
 }finally{
  await run(process.execPath,[launcher,'--stop'],opts).catch(()=>{});
  rmSync(temp,{recursive:true,force:true});
 }
}
console.log('PASS: browser selection, early-exit resilience, reuse and explicit stop');
