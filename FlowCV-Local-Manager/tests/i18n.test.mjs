import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {runInNewContext} from 'node:vm';
const folder=new URL('../',import.meta.url);
const src=readFileSync(new URL('i18n.js',folder),'utf8');
const html=readFileSync(new URL('index.html',folder),'utf8');
const js=readFileSync(new URL('app.js',folder),'utf8');
function sandbox(nav='en-US',stored){
 const listeners={};
 const getNode=(s)=>({textContent:s,isConnected:true});
 const brand=getNode('Il tuo archivio professionale');
 const existingName=getNode('Coloplast — R&D Engineer');
 const select={value:null,addEventListener:(k,fn)=>listeners[k]=fn,isConnected:true};
 const window={dispatchEvent:ev=>{listeners.event=ev}, FlowCVI18n:null};
 const store=new Map(stored?[['flowcv-manager-ui-language',stored]]:[]);
 const localStorage={getItem:(k)=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
 const nodes=[brand]; // The CV name has not been loaded yet: cannot be affected by static scanning
 let i=0;
 const document={body:{},documentElement:{lang:undefined},createTreeWalker:()=>({nextNode:()=>nodes[i++]||null}),querySelectorAll:()=>[],getElementById:id=>id==='languageSelect'?select:null};
 const context={document,window,navigator:{language:nav},localStorage,NodeFilter:{SHOW_TEXT:4},CustomEvent:class {constructor(name,args){this.type=name;this.detail=args?.detail}}};
 runInNewContext(src,context);
 return {i18n:window.FlowCVI18n,brand,existingName,select,listeners,store,document};
}
test('defaults to English outside Italian locales; Italian locale stays Italian',()=>{
 const en=sandbox('en-US');assert.equal(en.i18n.language,'en');assert.equal(en.brand.textContent,'Your professional resume library');
 const it=sandbox('it-IT');assert.equal(it.i18n.language,'it');assert.equal(it.brand.textContent,'Il tuo archivio professionale');
});
test('EN/IT persists, translates UI only, never edits resume content',()=>{
 const v=sandbox('en-US');assert.equal(v.i18n.t('Salva'),'Save');
 v.select.value='it';v.listeners.change();assert.equal(v.i18n.language,'it');assert.equal(v.brand.textContent,'Il tuo archivio professionale');
 assert.equal(v.store.get('flowcv-manager-ui-language'),'it');
 assert.equal(v.existingName.textContent,'Coloplast — R&D Engineer');
 v.select.value='en';v.listeners.change();assert.equal(v.brand.textContent,'Your professional resume library');
 assert.equal(v.i18n.t('Coloplast — R&D Engineer'),'Coloplast — R&D Engineer');
});
test('serves i18n before app and protects user data',()=>{
 assert.match(html,/<script src="\/i18n\.js" defer><\/script>\s*<script src="\/app\.js" defer><\/script>/);
 assert.match(js, /window\.FlowCVI18n/);
 assert.match(js, /locale\(\)/);
 assert.match(js, /renderList\(\);if\(state\.document\)/);
});
