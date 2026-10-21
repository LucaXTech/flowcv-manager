import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const path=new URL('../../',import.meta.url);
const get=f=>readFileSync(new URL(f,path),'utf8');
assert.match(get('installer/FlowCV-Manager.iss'),/Source: "runtime\\node.exe"/);
assert.match(get('installer/FlowCV-Manager.iss'),/Filename: "{app}\\node.exe"/);
assert.match(get('.github/workflows/windows-installer.yml'),/Copy-Item \$node 'installer\/runtime\/node.exe'/);
assert.match(get('FlowCV-Local-Manager/FlowCV-Manager.vbs'),/If Not fso.FileExists\(nodeExe\)/);
assert.match(get('installer/FlowCV-Manager.iss'),/function PrepareToInstall\(/);
assert.match(get('installer/FlowCV-Manager.iss'),/NODE-LICENSE.txt/);
assert.match(get('.gitignore'),/^\*\.json$/m);
// Regression: the ZIP/.cmd installer must include the i18n bundle used by app.js.
const index=get('FlowCV-Local-Manager/index.html');
const installerPS=get('Installa-FlowCV.ps1');
const assets=[...index.matchAll(/(?:src|href)="\/([^"]+\.(?:js|css|svg))"/g)].map(m=>m[1]);
for(const asset of assets){
  assert.match(installerPS,new RegExp("'"+asset.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+"'"),
    `ZIP installer does not copy required UI asset: ${asset}`);
}
assert.match(get('installer/FlowCV-Manager.iss'),/\\\*\.js"/);
console.log('PASS: standalone installer packaging configuration');
