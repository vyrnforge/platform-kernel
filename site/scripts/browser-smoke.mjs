// Real browser smoke test of the production bundle. Uses installed Chromium/Chrome
// and Node 22's built-in WebSocket, avoiding a new runtime dependency.
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, extname } from 'node:path';
import { version,capabilities } from '../src/data.mjs';
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
  await wait('!!document.querySelector(".home-hero")','Home route did not render');
  assert.equal(await evaluate('document.querySelectorAll(".primary-nav a").length'),4,'four top-level destinations only');
  assert.equal(await evaluate('document.querySelectorAll(".next-grid > a").length'),3,'one concise quickstart route');
  assert.ok((await evaluate(q('.home-code code')+'.textContent')).includes(version),'published Maven version visible');
  assert.equal(await evaluate('document.querySelectorAll(".flow-studio,.hero-console,.journey-choice,.feature-card").length'),0,'duplicate showcase layers removed');
  assert.equal(await evaluate('document.querySelector(".skip-link").getAttribute("href")'),'#main');
  await click('.skip-link');
  assert.equal(await evaluate('document.activeElement.id'),'main','skip link focuses main without hijacking route');
  assert.equal(await evaluate('location.hash'),'','skip link should preserve route');

  // Dedicated docs URL: selection, search, code tabs, keyboard links and guide navigation.
  await click('.primary-nav a[href="#/docs/install"]');
  await wait('document.querySelector(".guide-article") && location.hash==="#/docs/install"','Documentation page did not render');
  assert.equal(await evaluate('document.querySelectorAll(".docs-guide-group a").length'),5,'five addressable developer guides');
  assert.ok((await evaluate(q('#guide-heading')+'.textContent')).includes('Install the released library'));
  assert.equal(await evaluate('document.activeElement.id'),'guide-heading','docs navigation announces the active guide');
  await click('.guide-code-tabs button:nth-child(2)');
  assert.ok((await evaluate(q('.guide-code-shell code')+'.textContent')).includes('mavenCentral()'),'Gradle tab changes example');
  await click('.guide-copy');
  await wait('document.querySelector(".guide-copy-status").textContent.length>0','copy action must report success or a usable fallback');
  await click('.guide-pager a:last-child');
  await wait('location.hash==="#/docs/first" && document.querySelector("#guide-heading").textContent.includes("first Java")','next guide deep link failed');
  assert.ok((await evaluate(q('.guide-code-shell code')+'.textContent')).includes('UuidV7.generate'),'real first Java API visible');
  assert.ok(await evaluate('document.querySelectorAll(".guide-code-shell .tok-keyword").length>0'),'syntax highlighting is rendered without altering code text');
  await click('.guide-code-tabs button:nth-child(2)');
  assert.ok((await evaluate(q('.guide-code-shell code')+'.textContent')).includes('javac --release 21'),'run commands are directly accessible');
  assert.equal(await evaluate('document.querySelector(".guide-code-caption").textContent.includes("terminal")'),true,'filename/language is identified');
  await click('.docs-guide-group:nth-child(2) a:first-of-type');
  await wait('location.hash==="#/docs/request"','request guide navigation failed');
  assert.equal(await evaluate('document.querySelector(".docs-guide-group:nth-child(2) a:first-of-type").getAttribute("aria-current")'),'page');
  await click('.guide-code-tabs button:nth-child(2)');
  assert.ok((await evaluate(q('.guide-code-shell code')+'.textContent')).includes('TenantContext.tenant(tenantId)'),'tenant-scoped excerpt visible');
  await evaluate('document.querySelector(".docs-guide-group:last-child a").focus()');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});
  await send('Input.dispatchKeyEvent',{type:'char',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13});
  await wait('location.hash==="#/docs/assure"','keyboard guide navigation failed');
  // React controlled search: use the native setter to simulate the browser input path.
  const setSearch=async text=>evaluate('(()=>{const el=document.querySelector("#guide-search");const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set;setter.call(el,'+JSON.stringify(text)+');el.dispatchEvent(new Event("input",{bubbles:true}));return true})()');
  await setSearch('retriable');
  await wait('document.querySelectorAll(".docs-guide-group a").length===1','guide search did not filter topics');
  await setSearch('classpath separator');
  await wait('document.querySelectorAll(".docs-guide-group a").length===1','search did not index troubleshooting content');
  await setSearch('unlikely-search-xyz');
  await wait('!!document.querySelector(".docs-search-empty")','search empty state not visible');
  await click('.docs-search-empty button');
  await wait('document.querySelectorAll(".docs-guide-group a").length===5','clear search did not restore topics');

  // Reference is documentation, not another homepage showcase.
  await click('.primary-nav a[href="#/reference/architecture"]');
  await wait('location.hash==="#/reference/architecture" && !!document.querySelector(".ownership-grid")','architecture reference failed');
  assert.equal(await evaluate('document.activeElement.id'),'reference-heading','reference route focuses its topic heading');
  assert.equal(await evaluate('document.querySelectorAll(".ownership-grid section").length'),4,'four separate ownership boundaries');
  assert.equal(await evaluate('document.querySelectorAll(".reference-patterns details").length'),4,'deployment notes are consolidated in reference');
  await click('.reference-patterns summary');
  assert.equal(await evaluate('document.querySelector(".reference-patterns details").open'),true,'topology reference expands');
  await click('.reference-nav a[href="#/reference/capabilities"]');
  await wait('location.hash==="#/reference/capabilities"','capability reference failed');
  assert.equal(await evaluate('document.querySelectorAll(".capability-row").length'),capabilities.length,'all release capabilities accounted for');
  await click('.reference-nav a[href="#/reference/releases"]');
  await wait('location.hash==="#/reference/releases"','release reference failed');
  assert.ok((await evaluate(q('.reference-article')+'.innerText')).includes('NOT PUBLISHED'),'candidate not misrepresented as released');

  // One playground only, with published code output and negative scenarios.
  await click('.primary-nav a[href="#/playground"]');
  await wait('location.hash==="#/playground" && !!document.querySelector(".wb-frame")','playground failed');
  assert.equal(await evaluate('document.activeElement.id'),'workbench-title','playground route focuses its visible heading');
  assert.equal(await evaluate('document.querySelectorAll(".wb-profile").length'),3,'supported modes present');
  await click('.wb-profile:nth-child(2)');
  await click('.wb-scenario:nth-child(2)');
  assert.ok((await evaluate(q('.wb-outcome')+'.textContent')).includes('401'),'unverified identity denial visible');
  await click('.wb-scope-options button:nth-child(2)');
  await click('.wb-scenario:nth-child(3)');
  assert.ok((await evaluate(q('.wb-outcome')+'.textContent')).includes('400'),'invalid tenantless context visible');
  await click('.wb-code-tabs button:nth-child(2)');
  assert.ok((await evaluate(q('.wb-code-pane code')+'.textContent')).includes('EndpointPolicy.tenantless'),'version-correct tenantless excerpt');
  await click('.wb-profile:nth-child(3)');
  await click('.wb-testkit input');
  assert.ok((await evaluate(q('.wb-code-pane code')+'.textContent')).includes('<scope>test</scope>'),'testkit stays test-only');
  await click('.wb-scenario:nth-child(2)');
  assert.ok((await evaluate(q('.wb-outcome')+'.textContent')).includes('SAFE REPLAY'),'idempotent replay simulated');

  // Wide, zoom-equivalent and narrow reflow: page has no horizontal overflow; code scrolls in its own pane.
  for(const width of [720,640,390,320]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===390});
    await sleep(180);
    assert.ok(await evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),'Playground overflows viewport '+width);
    await evaluate('location.hash="#/docs/first"');
    await wait('!!document.querySelector(".guide-article")','mobile docs missing');
    assert.ok(await evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),'Docs overflow viewport '+width);
    if(width<=640)assert.equal(await evaluate('getComputedStyle(document.querySelector(".docs-guide-nav")).display'),'flex','mobile guide links use compact wrapping navigation at '+width);
    assert.equal(await evaluate('getComputedStyle(document.querySelector(".guide-code-shell pre")).overflowX'),'auto','code has local horizontal scrolling at '+width);
    if(width<=390)assert.ok(await evaluate('document.querySelector(".guide-code-shell pre").scrollWidth>document.querySelector(".guide-code-shell pre").clientWidth'),'long code scrolls at narrow viewport');
    await evaluate('location.hash="#/reference/architecture"');
    await wait('!!document.querySelector(".ownership-grid")','responsive reference missing');
    assert.ok(await evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),'Reference overflows viewport '+width);
    await evaluate('location.hash="#/"');
    await wait('!!document.querySelector(".home-hero")','responsive home missing');
    assert.ok(await evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),'Home overflows viewport '+width);
    await evaluate('location.hash="#/playground"');
    await wait('!!document.querySelector(".wb-frame")','responsive playground missing');
  }
  await evaluate('location.hash="#/"');
  await wait('document.activeElement?.id==="page-title"','Home heading should receive route-change focus');
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  assert.equal(await evaluate('matchMedia("(prefers-reduced-motion: reduce)").matches'),true,'reduced-motion preference present');
  assert.deepEqual(errors,[],'browser JavaScript exceptions');
  console.log('Browser smoke: four destinations, source-aware docs search, focus, keyboard/code, playground, and 720/640/390/320px reflow passed');
} finally {
  ws?.close();chrome.kill('SIGTERM');server.close();await sleep(200);await rm(profile,{recursive:true,force:true}).catch(()=>{});
}
