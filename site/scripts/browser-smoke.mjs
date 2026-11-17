// Real browser smoke test of the production bundle. Uses installed Chromium/Chrome
// and Node 22's built-in WebSocket, avoiding a new runtime dependency.
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, extname } from 'node:path';
import { flows } from '../src/flow-data.mjs';
import { version } from '../src/data.mjs';
import { developerGuides } from '../src/docs-data.mjs';
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
const chrome=spawn(chromeBin,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+profile,url],{stdio:['ignore','ignore','pipe']});
let chromeErrors='',launchError;
chrome.stderr.on('data',chunk=>{chromeErrors=(chromeErrors+chunk.toString()).slice(-6000)});
chrome.on('error',error=>{launchError=error});
let ws;
try{
  let port;
  for(let i=0;i<300;i++){if(launchError)throw launchError;if(chrome.exitCode!==null)throw Error('Chrome exited: '+chrome.exitCode+'\n'+chromeErrors);try{port=(await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];break}catch{await sleep(100)}}
  assert.ok(port,'Chrome debugging port not available\n'+chromeErrors);
  let target;
  for(let i=0;i<300;i++){try{const pages=await (await fetch('http://127.0.0.1:'+port+'/json/list',{signal:AbortSignal.timeout(2000)})).json();target=pages.find(p=>p.type==='page'&&p.url.startsWith(url));if(target)break;}catch{}await sleep(100)}
  assert.ok(target,'Page target not found\n'+chromeErrors);
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ok,no)=>{const timer=setTimeout(()=>no(Error('Chrome websocket open timeout')),10000);ws.addEventListener('open',()=>{clearTimeout(timer);ok()},{once:true});ws.addEventListener('error',e=>{clearTimeout(timer);no(e)},{once:true})});
  let nextId=0;const pending=new Map(),errors=[];
  ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);if(!p)return;pending.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result)}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++nextId;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value};
  const wait=async (condition,message)=>{for(let i=0;i<200;i++){if(await evaluate(condition))return;await sleep(100)}throw Error((message||condition)+'\nBrowser exceptions: '+JSON.stringify(errors)+'\nChrome: '+chromeErrors)};
  const click=async selector=>{await evaluate('document.querySelector('+JSON.stringify(selector)+').click()');await sleep(70)};
  const q=selector=>'document.querySelector('+JSON.stringify(selector)+')';
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await wait('!!document.querySelector("[data-testid=flow-studio]")','React Flow Studio did not render');
  assert.ok((await evaluate('document.body.innerText')).includes(version+' RELEASED'),'Expected released version '+version);
  assert.equal(await evaluate('document.querySelectorAll(".feature-card").length'),4,'four reviewed candidate highlights');
  assert.equal(await evaluate('document.querySelectorAll(".boundary-products > div").length'),3,'application-owned authority shown');
  assert.ok((await evaluate('document.body.innerText')).includes('Not published · No adoption implied'),'candidate must not be represented as released');
  assert.equal(await evaluate('document.querySelector(".skip-link").getAttribute("href")'),'#content');
  assert.equal(await evaluate('document.querySelectorAll(".docs-topic").length'),developerGuides.length,'all developer guides are available');
  assert.equal(await evaluate('document.querySelector(".docs-nav-link").getAttribute("href")'),'#workbench');
  assert.equal(await evaluate('document.querySelectorAll(".hero-console-modes button").length'),3,'hero offers interactive paths');
  await click('.hero-console-modes button:nth-child(3)');
  assert.ok((await evaluate(q('.hero-console-result strong')+'.textContent')).includes('ATOMIC'),'hero demo reacts to mode selection');
  assert.ok((await evaluate(q('.hero-console-window code')+'.textContent')).includes('executeIdempotent'),'hero snippet updates');
  await click('.hero-console-modes button:nth-child(1)');
  assert.ok((await evaluate(q('.hero-console-window code')+'.textContent')).includes('UuidV7.generate'),'hero can return to core example');
  assert.equal(await evaluate('document.querySelectorAll(".wb-profile").length'),3,'three integration paths');
  assert.ok((await evaluate(q(".wb-code-pane code")+".textContent")).includes("platform-kernel"),'core recipe is initially present');
  await click('.wb-profile:nth-child(2)');
  assert.ok((await evaluate(q('.wb-stage-heading h3')+'.textContent')).includes('Protected API'),'switching profiles updates architecture');
  await click('.wb-scenario:nth-child(2)');
  assert.ok((await evaluate(q('.wb-outcome')+'.textContent')).includes('401'),'missing verified actor fails closed');
  await click('.wb-scope-options button:nth-child(2)');
  await click('.wb-scenario:nth-child(3)');
  assert.ok((await evaluate(q('.wb-outcome')+'.textContent')).includes('400'),'tenantless active tenant is invalid');
  await click('.wb-code-tabs button:nth-child(2)');
  assert.ok((await evaluate(q('.wb-code-pane code')+'.textContent')).includes('EndpointPolicy.tenantless'),'scope changes Java guidance');
  await click('.wb-trace-actions .wb-next');
  assert.equal(await evaluate(q('.wb-inspection-tag')+'.textContent'),'INSPECTING STEP 2 OF 4','step navigation advances');
  await click('.wb-profile:nth-child(3)');
  assert.ok((await evaluate(q('.wb-code-pane code')+'.textContent')).includes('platform-kernel-jdbc'),'JDBC is an optional runtime artifact');
  await click('.wb-testkit input');
  assert.ok((await evaluate(q('.wb-code-pane code')+'.textContent')).includes('<scope>test</scope>'),'testkit remains test-scoped');
  await click('.wb-code-tabs button:nth-child(2)');
  assert.ok((await evaluate(q('.wb-code-pane code')+'.textContent')).includes('executeIdempotent'),'JDBC Java excerpt is generated');
  await click('.wb-scenario:nth-child(2)');
  assert.ok((await evaluate(q('.wb-outcome')+'.textContent')).includes('SAFE REPLAY'),'retry scenario illustrates replay');
  await click('.wb-profile:nth-child(1)');
  assert.ok((await evaluate(q('.wb-code-pane code')+'.textContent')).includes('platform-kernel'),'core mode restores dependencies');

  assert.equal(await evaluate('getComputedStyle(document.querySelector(".docs-topic-nav")).display'),'block','desktop guide groups stack vertically');
  // Keyboard users can select a guide with a native button and Enter.
  await evaluate('document.querySelector(".docs-nav-group:nth-child(2) .docs-topic").focus()');
  assert.equal(await evaluate('document.activeElement.classList.contains("docs-topic")'),true);
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});
  await send('Input.dispatchKeyEvent',{type:'char',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13});
  await wait('document.querySelector("#docs-guide-title").textContent === "Resolve a trusted request"','Keyboard Enter must activate the guide');
  await click('.docs-code-choices button:nth-child(2)');
  assert.ok((await evaluate(q('.docs-code code')+'.textContent')).includes('TenantContext.tenant(tenantId)'),'tenant-scoped usage snippet visible');
  await click('.docs-nav-group:first-child .docs-topic');
  await click('.docs-code-choices button:nth-child(2)');
  assert.ok((await evaluate(q('.docs-code code')+'.textContent')).includes('mavenCentral()'),'Gradle tab changes code');
  // At an effective 200%-zoom desktop content width (720 CSS px), the layout still reflows.
  await send('Emulation.setDeviceMetricsOverride',{width:720,height:1000,deviceScaleFactor:1,mobile:false});
  await sleep(200);
  assert.ok(await evaluate('document.documentElement.scrollWidth <= window.innerWidth+1'),'Guide layout overflows an effective 200%-zoom desktop width');
  assert.ok(await evaluate('document.querySelector(".docs-code pre").scrollWidth >= document.querySelector(".docs-code pre").clientWidth'),'code panel remains scrollable');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await click('.journey-choice:nth-child(2)');
  assert.ok((await evaluate('document.querySelector(".journey-detail").innerText')).includes('Commit a business change'),'path selector updates content');
  await click('.journey-choice:nth-child(1)');
  await click('.nav-actions button.primary');
  assert.ok(await evaluate('document.body.classList.contains("presenting")'),'presentation mode opens');
  await click('.present-controls button:nth-of-type(2)');
  assert.ok(await evaluate('document.querySelector("#workbench").getBoundingClientRect().height > 0'),'interactive workbench presentation slide reachable');
  await click('.present-controls button:nth-of-type(2)');
  assert.ok(await evaluate('document.querySelector("#journeys").getBoundingClientRect().height > 0'),'journey presentation slide reachable');
  await click('.present-controls button:last-child');
  assert.equal(await evaluate('document.body.classList.contains("presenting")'),false,'presentation mode exits');
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
  assert.ok(await evaluate('document.querySelector(".wb-architecture").getBoundingClientRect().width <= innerWidth'),'Workbench architecture reflows on mobile');
  await click('.wb-profile:nth-child(2)');
  assert.ok((await evaluate(q('.wb-stage-heading h3')+'.textContent')).includes('Protected API'),'mobile configuration works');
  assert.ok(await evaluate('document.documentElement.scrollWidth <= window.innerWidth+1'),'Workbench must not overflow mobile viewport');
  await click('.docs-nav-group:first-child .docs-topic:nth-of-type(2)');
  assert.ok((await evaluate(q('.docs-code code')+'.textContent')).includes('FirstKernelProgram'),'mobile developer guide is usable');
  assert.ok(await evaluate('document.documentElement.scrollWidth <= window.innerWidth+1'),'Documentation must not overflow mobile viewport');
  assert.ok(await evaluate('document.querySelector(".docs-code pre").scrollWidth > document.querySelector(".docs-code pre").clientWidth'),'Long code lines scroll inside code panel');
  assert.ok(await evaluate('document.querySelector(".fs-canvas").scrollWidth > document.querySelector(".fs-canvas").clientWidth'),'Mobile graph should scroll within its canvas');
  await click('[data-mode="request"]');await click('[data-scenario="tenantless"]');await click('[data-step="4"]');
  assert.equal(await evaluate(q('[data-testid=flow-state]')+'.textContent'),'400 · invalid context');
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await click('[aria-label="Restart sequence"]');await click('[data-testid="play"]');await sleep(1650);
  assert.equal(await evaluate('document.querySelector(".fs-graph animateMotion")!==null'),false,'Reduced motion must suppress packet animation');
  await click('[data-testid="play"]');
  assert.deepEqual(errors,[],'Browser JavaScript exceptions');
  console.log('Browser smoke: motion, pause, stepping, expanded view, mobile layout, reduced motion and release-version outcomes passed');
} finally {
  ws?.close();chrome.kill('SIGTERM');server.close();await sleep(200);await rm(profile,{recursive:true,force:true}).catch(()=>{});
}
