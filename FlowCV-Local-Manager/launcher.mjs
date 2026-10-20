/**
 * FlowCV Manager desktop launcher.
 * The localhost service is intentionally independent from Edge's startup process:
 * on Windows, Edge may delegate an --app window to an existing browser process and
 * exit its initially spawned process while the app window remains open.
 *
 * A second launch reuses the same local service. Run `node launcher.mjs --stop`
 * (or Arresta-FlowCV.cmd) to shut down the detached service explicitly.
 */
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, appendFileSync, openSync, closeSync, readFileSync, writeFileSync, rmSync, renameSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = process.env.FLOWCV_MANAGER_DATA_DIR || path.join(os.homedir(), 'Documents', 'FlowCV-Local-Manager');
const PORT = Number(process.env.FLOWCV_MANAGER_PORT || 8765);
const URL = `http://127.0.0.1:${PORT}`;
const PROFILE = path.join(process.env.LOCALAPPDATA || DATA, 'FlowCV-Manager', 'AppWindow');
const STATE = path.join(DATA, 'launcher-state.json');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fingerprint = token => createHash('sha256').update(token).digest('hex');

function log(message) {
  try {
    mkdirSync(DATA, {recursive:true});
    appendFileSync(path.join(DATA, 'launcher.log'), `${new Date().toISOString()} ${String(message).replace(/[\r\n]/g, ' ')}\n`, 'utf8');
  } catch { /* logger must not prevent launch */ }
}
function safeReadState() {
  try { return JSON.parse(readFileSync(STATE,'utf8')); } catch { return null; }
}
function safeWriteState(state) {
  mkdirSync(DATA, {recursive:true});
  const tmp=STATE+'.'+process.pid+'.tmp';
  writeFileSync(tmp,JSON.stringify(state)+'\n',{encoding:'utf8',mode:0o600});
  renameSync(tmp,STATE);
}
export function browserCandidates(env=process.env,platform=process.platform) {
  const custom=env.FLOWCV_MANAGER_BROWSER;
  const results=custom?[custom]:[];
  if(platform==='win32') {
    const pf=[env['PROGRAMFILES(X86)'],env.ProgramFiles,env.LOCALAPPDATA].filter(Boolean);
    for(const root of pf){
      results.push(path.join(root,'Microsoft','Edge','Application','msedge.exe'));
      results.push(path.join(root,'Google','Chrome','Application','chrome.exe'));
    }
  } else results.push('/usr/bin/chromium','/usr/bin/google-chrome','/usr/bin/chromium-browser');
  return [...new Set(results)];
}
export function findBrowser(env=process.env,platform=process.platform,check=existsSync){
  return browserCandidates(env,platform).find(check);
}
async function status() {
  try {
    const resp=await fetch(`${URL}/api/status`,{signal:AbortSignal.timeout(800),cache:'no-store'});
    if(!resp.ok)return null;
    const obj=await resp.json();
    // Only attach to our FlowCV Manager, not an unrelated service on localhost.
    return obj&&typeof obj.token==='string'&&obj.token.length>=32&&typeof obj.store==='string'&&obj.writeToFlowCV===true?obj:null;
  }catch{return null;}
}
async function startServer() {
  if(await status()){log(`Server FlowCV gia attivo su ${PORT}.`);return;}
  mkdirSync(DATA,{recursive:true});
  const logFd=openSync(path.join(DATA,'server.log'),'a');
  let child;
  try {
    child=spawn(process.execPath,[path.join(HERE,'server.mjs')],{
      cwd:HERE,env:process.env,windowsHide:true,detached:true,stdio:['ignore',logFd,logFd]
    });
  }finally{closeSync(logFd);}
  let spawnError=null,exitCode=null;
  child.once('error',e=>{spawnError=e});
  child.once('exit',(code,signal)=>{exitCode=code??signal??'unknown'});
  for(let tries=0;tries<100;tries++){
    if(spawnError)throw Error(`Node.js non riesce ad avviare il server: ${spawnError.message}`);
    if(exitCode!==null)throw Error(`Il server si e' arrestato durante l'avvio (codice ${exitCode}); vedi server.log in Documenti\\FlowCV-Local-Manager.`);
    const ready=await status();
    if(ready){
      safeWriteState({pid:child.pid,port:PORT,tokenFingerprint:fingerprint(ready.token),createdAt:new Date().toISOString()});
      child.unref();
      log(`Server avviato in background (PID ${child.pid}, porta ${PORT}).`);
      return;
    }
    await sleep(140);
  }
  try{child.kill()}catch{}
  throw Error(`Il server non risponde sulla porta ${PORT}; vedi server.log in Documenti\\FlowCV-Local-Manager.`);
}
async function stopServer() {
  const state=safeReadState();
  const alive=await status();
  if(!alive){log('Arresto: server non attivo.');rmSync(STATE,{force:true});return;}
  // Prevent killing an unrelated PID or a server that is not ours.
  if(!state || state.port!==PORT || state.tokenFingerprint!==fingerprint(alive.token) || !Number.isSafeInteger(state.pid)){
    throw Error('Server attivo ma non identificabile come quello avviato dal Manager. Arresto annullato.');
  }
  log(`Richiesto arresto del server PID ${state.pid}.`);
  try{process.kill(state.pid,'SIGTERM');}
  catch(e){if(e.code!=='ESRCH')throw e;}
  for(let i=0;i<40;i++){
    if(!(await status())){rmSync(STATE,{force:true});log('Server arrestato.');return;}
    await sleep(100);
  }
  throw Error('Il server non si e\' arrestato. Controlla server.log.');
}
async function openWindow() {
  const browser=findBrowser();
  if(!browser)throw Error('Edge/Chrome non trovato. Controlla l\'installazione o FLOWCV_MANAGER_BROWSER.');
  mkdirSync(PROFILE,{recursive:true});
  log('Apro app con '+browser);
  const args=[`--app=${URL}`,`--user-data-dir=${PROFILE}`,'--no-first-run','--no-default-browser-check','--disable-background-mode'];
  const child=spawn(browser,args,{cwd:HERE,windowsHide:true,stdio:'ignore'});
  await new Promise((resolve,reject)=>{
    let settled=false;
    child.once('error',e=>{if(!settled){settled=true;reject(e)}});
    child.once('spawn',()=>{if(!settled){settled=true;resolve()}});
  });
  child.on('exit',code=>{if(code!==0)log('Edge/Chrome ha terminato il processo iniziale con codice '+code);});
  // Do not wait for child.on('exit') to control the server lifetime!
  // Edge can reuse an already-running profile and immediately exit this process.
  log('Finestra richiesta a Edge/Chrome; server indipendente dalla finestra.');
}

async function main(){
  if(!Number.isInteger(PORT)||PORT<1024||PORT>65535)throw Error('Porta FLOWCV_MANAGER_PORT non valida.');
  if(process.argv.includes('--stop'))return stopServer();
  // Fail before browser launch, instead of showing ERR_CONNECTION_REFUSED.
  await startServer();
  await openWindow();
}

const invokedDirectly=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invokedDirectly){
  try{await main();}
  catch(e){log('ERRORE: '+e.message);console.error('ERRORE FlowCV Manager:',e.message);process.exitCode=1;}
}
