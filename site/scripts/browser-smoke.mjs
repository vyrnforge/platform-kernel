// Real browser smoke test of the production bundle. Uses installed Chromium/Chrome
// and Node 22's built-in WebSocket, avoiding a new runtime dependency.
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, extname } from 'node:path';
import { flows } from '../src/flow-data.mjs';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const dist=resolve('dist'),prefix='/platform-kernel/';
const server=createServer(async(req,res)=>{try{
  const path=new URL(req.url,'http://localhost').pathname;
  if(!path.startsWith(prefix)){res.writeHead(404).end();return;}
  const file=resolve(dist,path.slice(prefix.length)||'index.html');
  if(!file.startsWith(dist+'/')){res.writeHead(403).end();return;}
  const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
  res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream'}).end(await readFile(file));
}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+prefix;
const profile=await mkdtemp(join(tmpdir(),'kernel-chrome-'));
let chromeBin=process.env.CHROME_BIN;
if(!chromeBin){for(const b of ['google-chrome','chromium','chromium-browser']){try{chromeBin=execFileSync('which',[b],{encoding:'utf8'}).trim();break}catch{}}}
assert.ok(chromeBin,'Chrome or Chromium is required for browser smoke tests');
const chrome=spawn(chromeBin,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+profile,url],{stdio:'ignore'});
let ws;
try{
  let port;
  for(let i=0;i<100;i++){try{port=(await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];break}catch{await sleep(100)}}
  assert.ok(port,'Chrome debugging port not available');
  let target;
  for(let i=0;i<100;i++){try{const pages=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();target=pages.find(p=>p.type==='page'&&p.url.startsWith(url));if(target)break;}catch{}await sleep(100)}
  assert.ok(target,'Page target not found');
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ok,no)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',no,{once:true})});
  let nextId=0;const pending=new Map(),errors=[];
  ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);if(!p)return;pending.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result)}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++nextId;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value};
  const wait=async (condition,message)=>{for(let i=0;i<80;i++){if(await evaluate(condition))return;await sleep(100)}throw Error(message||condition)};
  const click=async selector=>{await evaluate('document.querySelector('+JSON.stringify(selector)+').click()');await sleep(70)};
  const q=selector=>'document.querySelector('+JSON.stringify(selector)+')';
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await wait('!!document.querySelector("[data-testid=flow-studio]")','React Flow Studio did not render');
  assert.match(await evaluate('document.body.innerText'),/0\.3\.0 RELEASED/);
  assert.equal(await evaluate('document.querySelectorAll("[data-mode]").length'),4);
  // Traverse every scenario, inspect the terminal step and prove restart works.
  for(const f of flows){
    await click('[data-mode="'+f.id+'"]');
    for(const s of f.scenarios){
      await click('[data-scenario="'+s.id+'"]');
      await click('[data-step="'+(s.frames.length-1)+'"]');
      assert.equal(await evaluate(q('[data-testid=step-title]')+'.textContent'),s.frames.at(-1).label);
      assert.equal(await evaluate(q('[data-testid=flow-state]')+'.textContent'),s.outcome);
      assert.equal(await evaluate('document.querySelectorAll(".fs-node.active").length'),1);
      await click('[aria-label="Restart sequence"]');
      assert.equal(await evaluate(q('[data-testid=step-title]')+'.textContent'),s.frames[0].label);
    }
  }
  console.log('All '+flows.reduce((a,f)=>a+f.scenarios.length,0)+' scenarios passed terminal-state and restart checks');
  await click('[data-mode="request"]');
  await click('[data-testid="play"]');
  await wait('document.querySelector(".fs-edge.active")!==null && document.querySelector(".fs-graph animateMotion")!==null','Animated packet did not appear');
  const step=await evaluate(q('[data-testid=step-title]')+'.textContent');
  await click('[data-testid="play"]');
  await sleep(1700);
  assert.equal(await evaluate(q('[data-testid=step-title]')+'.textContent'),step,'Pause did not stop playback');
  await click('[aria-label="Next step"]');
  await click('[aria-label="Previous step"]');
  await click('[aria-label="Expand workspace"]');
  assert.equal(await evaluate('document.querySelector(".flow-studio").getAttribute("aria-modal")'),'true');
  await click('[aria-label="Close expanded view"]');
  assert.equal(await evaluate('document.querySelector(".flow-studio").classList.contains("expanded")'),false);
  await click('[data-mode="mutation"]');await click('[data-scenario="lost"]');await click('[data-step="5"]');
  assert.equal(await evaluate(q('[data-testid=step-title]')+'.textContent'),'Atomic commit');
  await click('[data-mode="outbox"]');await click('[data-scenario="stale"]');await click('[data-step="11"]');
  assert.equal(await evaluate(q('[data-testid=step-title]')+'.textContent'),'Lost claim recorded');
  // Scroll the studio into view; verify viewport fit and responsive graph scrolling.
  await evaluate('document.querySelector("#demo").scrollIntoView()');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await sleep(200);
  assert.ok(await evaluate('document.documentElement.scrollWidth <= window.innerWidth+1'),'Page overflows mobile viewport');
  assert.ok(await evaluate('document.querySelector(".fs-canvas").scrollWidth > document.querySelector(".fs-canvas").clientWidth'),'Mobile graph should scroll within its canvas');
  await click('[data-mode="request"]');await click('[data-scenario="tenantless"]');await click('[data-step="4"]');
  assert.equal(await evaluate(q('[data-testid=flow-state]')+'.textContent'),'400 · invalid context');
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await click('[aria-label="Restart sequence"]');await click('[data-testid="play"]');await sleep(1650);
  assert.equal(await evaluate('document.querySelector(".fs-graph animateMotion")!==null'),false,'Reduced motion must suppress packet animation');
  await click('[data-testid="play"]');
  assert.deepEqual(errors,[],'Browser JavaScript exceptions');
  console.log('Browser smoke: motion, pause, stepping, expanded view, mobile layout, reduced motion and v0.3.0 outcomes passed');
} finally {
  ws?.close();chrome.kill('SIGTERM');server.close();await sleep(200);await rm(profile,{recursive:true,force:true}).catch(()=>{});
}
