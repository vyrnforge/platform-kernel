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
import {resolveRoute,referenceTopics} from '../src/routes.mjs';
import {workbenchModes,scenariosFor} from '../src/workbench-data.mjs';
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
  assert.ok((await evaluate(q('.guide-expected-output')+'.textContent')).includes('UUIDv7'),'expected output is explained');
  assert.ok((await evaluate(q('.guide-code-caption')+'.textContent')).includes('Terminal'),'source platform is identified');
  await click('.guide-code-tabs button:nth-child(3)');
  assert.ok((await evaluate(q('.guide-code-shell code')+'.textContent')).includes('Invoke-WebRequest'),'Windows PowerShell instructions are available');
  assert.ok((await evaluate(q('.guide-code-shell code')+'.textContent')).includes("java -cp '.;."),'Windows classpath separator is correct');
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
  await wait('[...document.querySelectorAll(".docs-guide-group a")].some(a=>a.getAttribute("href")?.startsWith("#/docs/jdbc"))','search must find the relevant JDBC guide');
  await setSearch('classpath separator');
  await wait('document.querySelectorAll(".docs-guide-group a").length===1','search did not index troubleshooting content');
  await setSearch('unlikely-search-xyz');
  await wait('!!document.querySelector(".docs-search-empty")','search empty state not visible');
  // Reset unmounts its own button: focus must return to the labeled search field.
  await evaluate('document.querySelector(".docs-search-empty button").focus()');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13});
  await wait('document.querySelectorAll(".docs-guide-group a").length===5','clear search did not restore topics');
  assert.equal(await evaluate('document.activeElement.id'),'guide-search','clearing search returns keyboard focus to search input');


  // One best matching passage per guide, not a second search or another page.
  await setSearch('classpath separator');
  await wait('document.querySelectorAll(".docs-guide-group a").length===1','classpath result missing');
  assert.ok((await evaluate(q('.docs-result-content small')+'.textContent')).includes('Troubleshooting: '),'search result lacks context');
  assert.ok((await evaluate(q('.docs-guide-group a')+'.getAttribute("href")')).includes('section=troubleshooting'),'search result does not deep link to the matching section');
  await click('.docs-guide-group a');
  await wait('location.hash.includes("section=troubleshooting") && document.activeElement?.id==="guide-troubleshooting-summary"','troubleshooting deep link did not restore focus');
  assert.equal(await evaluate('document.querySelector(".guide-troubleshooting").open'),true,'linked troubleshooting details must be open');
  assert.equal(await evaluate('document.querySelector("#guide-search").value'),'classpath separator','search text should be restorable');
  await evaluate('history.back()');
  await wait('location.hash==="#/docs/assure"','browser Back did not restore the originating assurance guide URL');
  await wait('document.activeElement?.id==="guide-heading"','browser Back did not refocus guide heading; active='+await evaluate('document.activeElement?.id'));
  await evaluate('history.forward()');
  await wait('location.hash.includes("section=troubleshooting") && document.activeElement?.id==="guide-troubleshooting-summary"','Forward did not restore matching section');
  assert.equal(await evaluate('document.querySelector("#guide-search").value'),'classpath separator','Forward must restore search query');

  await setSearch('TENANT_CONTEXT_MISMATCH');
  await wait('document.querySelectorAll(".docs-guide-group a").length===1','request failure search not found');
  assert.ok((await evaluate(q('.docs-guide-group a')+'.getAttribute("href")')).includes('section=failures'),'request search should link to failure passage');
  await click('.docs-guide-group a');
  await wait('location.hash.includes("#/docs/request?section=failures") && document.activeElement?.id==="request-denials-heading"','failure search focus failed');
  assert.equal(await evaluate('document.querySelector("#guide-search").value'),'TENANT_CONTEXT_MISMATCH');
  assert.ok((await evaluate(q('.request-failures')+'.textContent')).includes('TENANT_CONTEXT_MISMATCH'),'failure reference content missing');

  // Example-result deep link must activate matching code tab without claiming preview APIs.
  await evaluate('location.hash="#/docs/first?section=example&sample=2&q=Invoke-WebRequest"');
  await wait('document.activeElement?.id==="guide-example-heading" && document.querySelector(".guide-code-shell code")?.textContent.includes("Invoke-WebRequest")','Windows source-context deep link failed');
  assert.equal(await evaluate('document.querySelector(".guide-code-tabs button:nth-child(3)").getAttribute("aria-pressed")'),'true');
  await evaluate('location.hash="#/docs/first?section=unsupported&sample=99"');
  await wait('document.activeElement?.id==="guide-heading" && !!document.querySelector(".guide-code-shell code")','invalid section fallback failed');
  assert.equal(await evaluate('document.querySelector(".guide-code-tabs button:first-child").getAttribute("aria-pressed")'),'true','invalid sample index should use default published example');

  // Internal documentation navigation should resolve to an actual site destination.
  for(const hash of ['#/docs/install','#/docs/first','#/docs/request','#/docs/jdbc','#/docs/assure',
      '#/docs/preview','#/reference/architecture','#/reference/capabilities','#/reference/releases','#/playground']){
    await evaluate('location.hash='+JSON.stringify(hash));
    await wait('!!document.querySelector(".site-header")','route missing '+hash);
    const urls=await evaluate('[...document.querySelectorAll("a")].map(a=>a.getAttribute("href")).filter(h=>h&&h.startsWith("#/"))');
    assert.ok(urls.every(href=>resolveRoute(href).page!=='notfound'),'broken internal docs link on '+hash+': '+urls.filter(href=>resolveRoute(href).page==='notfound').join(','));
  }
  await evaluate('location.hash="#/docs/install"');
  await wait('document.activeElement?.id==="guide-heading"','restore docs before reference checks');

  // Reference is documentation, not another homepage showcase.
  await click('.primary-nav a[href="#/reference/architecture"]');
  await wait('location.hash==="#/reference/architecture" && !!document.querySelector(".ownership-grid")','architecture reference failed');
  assert.equal(await evaluate('document.activeElement.id'),'reference-heading','reference route focuses its topic heading');
  assert.equal(await evaluate('document.querySelectorAll(".ownership-grid section").length'),4,'four separate ownership boundaries');
  assert.equal(await evaluate('document.querySelectorAll(".reference-patterns details").length'),4,'deployment notes are consolidated in reference');
  await click('.reference-patterns summary');
  assert.equal(await evaluate('document.querySelector(".reference-patterns details").open'),true,'topology reference expands');
  // Native <summary> must also toggle with Space from the keyboard.
  await evaluate('document.querySelector(".reference-patterns summary").focus()');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32,nativeVirtualKeyCode:32});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32,nativeVirtualKeyCode:32});
  await wait('!document.querySelector(".reference-patterns details").open','keyboard Space did not close Reference details');
  await click('.reference-nav a[href="#/reference/capabilities"]');
  await wait('location.hash==="#/reference/capabilities"','capability reference failed');
  assert.equal(await evaluate('document.querySelectorAll(".capability-row").length'),capabilities.length,'all release capabilities accounted for');
  await click('.reference-nav a[href="#/reference/releases"]');
  await wait('location.hash==="#/reference/releases"','release reference failed');
  assert.ok((await evaluate(q('.reference-article')+'.innerText')).includes('NOT PUBLISHED'),'candidate not misrepresented as released');
  assert.equal(await evaluate('document.querySelector(".reference-preview-doc a").getAttribute("href")'),'#/docs/preview','preview belongs on the documentation website');
  assert.ok((await evaluate(q('.reference-article')+'.innerText')).includes('not available to install from Maven Central yet'),'preview stays explicitly unavailable');
  await click('.reference-preview-doc a');
  await wait('location.hash==="#/docs/preview" && !!document.querySelector(".preview-article")','candidate deep-link guide missing');
  assert.equal(await evaluate('document.activeElement.id'),'guide-heading','preview heading is focused');
  assert.ok((await evaluate(q('.preview-warning')+'.textContent')).includes('Not released'),'candidate must remain clearly unpublished');
  assert.ok((await evaluate('document.querySelectorAll(".preview-table tbody tr").length'))>=5,'candidate changes are readable on-site');
  await click('.preview-samples:first-of-type .guide-code-tabs button:nth-child(2)');
  assert.ok((await evaluate(q('.preview-samples:first-of-type code')+'.textContent')).includes('testImplementation'),'candidate Gradle example is visible');
  await click('.preview-samples:first-of-type .guide-copy');
  await wait('document.querySelector(".preview-samples:first-of-type .guide-copy-status").textContent.length>0','preview code-copy feedback');
  await evaluate('location.hash="#/docs/install"');
  await wait('location.hash==="#/docs/install" && !!document.querySelector(".guide-article:not(.preview-article)")','published docs route restored');
  assert.ok((await evaluate(q('.guide-code-shell code')+'.textContent')).includes('0.3.2'),'published installation remains 0.3.2');


  // Request scope and failure reference live on-site, with deep links to the one Playground.
  await evaluate('location.hash="#/docs/request"');
  await wait('document.querySelectorAll(".request-scope-grid section").length===2','two request scopes should be visible');
  assert.equal(await evaluate('document.querySelectorAll(".request-failures tbody tr").length'),8,'all failure states documented');
  assert.ok((await evaluate(q('.request-diagnostics')+'.textContent')).includes('correlation_id'),'safe error correlation must be explicit');
  await click('.guide-code-tabs button:nth-child(3)');
  assert.ok((await evaluate(q('.guide-code-shell code')+'.textContent')).includes('new RequestContextPipeline<>'),'published constructor visible');
  await evaluate('document.querySelector(".request-failures a[href*=membership]").focus()');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13});
  await wait('location.hash.includes("scenario=membership") && document.activeElement?.id==="workbench-title"','failed scenario keyboard navigation/focus');
  assert.equal(await evaluate('document.activeElement.id'),'workbench-title','Playground heading gets focus');
  assert.ok((await evaluate(q('.wb-outcome')+'.textContent')).includes('403'),'membership maps 403');
  await evaluate('location.hash="#/docs/request"');
  await wait('!!document.querySelector(".request-failures")','return to request docs should work');
  // At mobile widths, error details scroll locally without whole-page overflow.

  // Guided integration: one capability controls understand, preparation, trace
  // and published implementation. Legacy docs deep links enter its Explore step.
  await evaluate('location.hash="#/docs/request"');
  await wait('!!document.querySelector(".guide-try-link")','on-site guide link missing');
  assert.equal(await evaluate('document.querySelector(".guide-try-link").getAttribute("href")'),'#/playground?mode=request&scope=scoped&scenario=success');
  await click('.guide-try-link');
  await wait('location.hash.includes("mode=request") && document.querySelectorAll(".wb-trace-step").length===6','legacy request walkthrough deep link failed');
  assert.ok((await evaluate(q('#wb-wizard-panel-title')+'.textContent')).includes('Identity & tenancy'),'legacy request route must map to correct capability guide');
  assert.equal(await evaluate('document.querySelectorAll(".wb-wizard-step").length'),5,'wizard must expose five sequenced stages');
  assert.ok((await evaluate(q('.wb-inspection')+'.innerText')).includes('What is checked?'),'decision inspector shows contract check');
  assert.ok((await evaluate(q('.wb-inspection')+'.innerText')).includes('Who owns this?'),'decision inspector names owner');
  assert.equal(await evaluate('document.querySelectorAll(".wb-status-announcement[role=status]").length'),1,'exactly one simulated trace status');

  // A domain-specific failure is part of the HTTP guide, not a generic mode switch.
  await evaluate('location.hash="#/playground?cap=http&mode=request&scope=scoped&scenario=cross-tenant"');
  await wait('document.querySelector(".wb-outcome")?.textContent.includes("404")','HTTP cross-tenant route failed');
  assert.ok((await evaluate(q('#wb-wizard-panel-title')+'.textContent')).includes('API standards'),'HTTP route must open its corresponding capability');
  assert.equal(await evaluate('document.querySelectorAll(".wb-track li[data-state=blocked]").length'),1,'first failing gate must be unambiguous');
  assert.ok((await evaluate(q('.wb-result-facts')+'.textContent')).includes('Establish request scope'),'HTTP example stops at correct gate');
  assert.ok((await evaluate(q('.wb-request-recovery')+'.textContent')).includes('TENANT_CONTEXT_MISMATCH'),'cross-tenant denial uses published KernelFailure');
  assert.ok((await evaluate(q('.wb-request-recovery')+'.textContent')).includes('HTTP 404'),'cross-tenant response stays existence-safe');
  assert.ok((await evaluate(q('.wb-request-recovery')+'.textContent')).includes('authoritative product storage'),'cross-tenant recovery retains authoritative product ownership');
  assert.equal(await evaluate('document.querySelector(".wb-request-recovery a").getAttribute("href")'),'#/docs/request?section=failures','failure recovery links to existing published request guide');
  await click('.wb-result-primary');
  await wait('document.activeElement?.id==="wb-inspection-heading" && document.querySelector(".wb-inspection-tag")?.textContent.includes("2 OF 6")','inspector jump must focus blocking decision');
  await click('.wb-trace-actions button:first-child');
  assert.ok((await evaluate(q('.wb-inspection-tag')+'.textContent')).includes('1 OF 6'),'previous decision works');
  await click('.wb-wizard-step:nth-child(5)');
  await wait('!!document.querySelector(".wb-code-tabs [role=group] button:last-child")','request implementation tabs unavailable');
  assert.equal(await evaluate('document.querySelectorAll(".wb-code-tabs [role=group] button").length'),3,'request needs Maven + endpoint excerpt + four-port wiring');
  await click('.wb-code-tabs [role=group] button:last-child');
  const publishedWiring=developerGuides.find(item=>item.id==='request').samples.find(item=>item.label==='Wiring');
  assert.equal(await evaluate(q('.wb-code-pane code')+'.textContent'),publishedWiring.code,'request wiring must exactly reuse the published version-safe constructor');
  assert.ok((await evaluate(q('.wb-code-kind')+'.textContent')).includes('Integration excerpt'),'real token verifier and ports must remain application-owned');

  // Check representative first-stop failures and safe remediation in the same
  // wizard rather than sending the reader back to an unrelated simulator.
  await evaluate('location.hash="#/playground?cap=identity&mode=request&scope=scoped&scenario=unverified"');
  await wait('!!document.querySelector(".wb-request-recovery")','unverified denial mapping missing');
  assert.ok((await evaluate(q('.wb-request-recovery')+'.textContent')).includes('AUTHENTICATION_FAILED'),'unverified actor needs published failure code');
  assert.ok((await evaluate(q('.wb-request-recovery')+'.textContent')).includes('HTTP 401'),'unverified actor must map to 401');
  await evaluate('location.hash="#/playground?cap=identity&mode=request&scope=scoped&scenario=membership"');
  await wait('document.querySelector(".wb-request-recovery")?.textContent.includes("TENANT_MEMBERSHIP_REQUIRED")','membership 403 diagnosis missing');
  assert.ok((await evaluate(q('.wb-request-recovery')+'.textContent')).includes('HTTP 403'),'membership denial must be HTTP 403');
  await evaluate('location.hash="#/playground?cap=http&mode=request&scope=tenantless&scenario=scope"');
  await wait('document.querySelector(".wb-request-recovery")?.textContent.includes("INVALID_CONTEXT")','tenantless 400 diagnosis missing');
  assert.ok((await evaluate(q('.wb-request-recovery')+'.textContent')).includes('HTTP 400'),'tenantless active tenant must map 400');
  await evaluate('location.hash="#/playground?cap=http&mode=request&scope=tenantless&scenario=denied"');
  await wait('document.querySelector(".wb-request-recovery")?.textContent.includes("DOMAIN_ACCESS_DENIED")','tenantless product authorization diagnosis missing');
  assert.ok((await evaluate(q('.wb-request-recovery')+'.textContent')).includes('HTTP 403'),'tenantless domain denial must map 403');
  await evaluate('location.hash="#/playground?cap=http&mode=request&scope=tenantless&scenario=success"');
  await wait('document.querySelector(".wb-outcome")?.textContent.includes("REQUEST ALLOWED")','valid tenantless request route not restored');
  assert.equal(await evaluate('document.querySelector(".wb-request-recovery")===null'),true,'allowed tenantless operation must not invent failure');

  // Shareable capability URLs must restore the *same* guide and outcome,
  // never silently drift to a different simulation on a valid mode link.
  await evaluate('location.hash="#/playground?cap=identity"');
  await wait('!!document.querySelector(".wb-phase-understand") && document.querySelector(".wb-wizard-context strong")?.textContent==="Identity & tenancy"','capability-only Identity URL should show Identity Understand step');
  assert.equal(await evaluate('document.querySelector(".wb-route-recovery")===null'),true,'capability-only Identity URL should not invent recovery');
  await evaluate('location.hash="#/playground?cap=idempotency"');
  await wait('document.querySelector(".wb-wizard-context strong")?.textContent==="Idempotency" && !!document.querySelector(".wb-phase-understand")','capability-only Idempotency URL should show its own Understand step');

  await evaluate('location.hash="#/playground?cap=module&mode=request&scope=scoped&scenario=cross-tenant"');
  await wait('document.querySelector(".wb-route-recovery")?.textContent.includes("Scenario unavailable for this capability")','capability mismatch needs explicit recovery');
  assert.ok((await evaluate(q('.wb-wizard-context strong')+'.textContent')).includes('Module & feature controls'),'mismatched scenario must stay in selected capability');
  assert.ok((await evaluate(q('#wb-result-title')+'.textContent')).includes('Disabled module'),'module fallback outcome should be visible');
  assert.equal(await evaluate('document.querySelectorAll(".wb-scenario[aria-pressed=true]").length'),1,'recovered capability must have one visible selected scenario');
  assert.ok((await evaluate(q('.wb-scenario[aria-pressed=true]')+'.textContent')).includes('Disabled module'),'recovered scenario choice must match result');

  await evaluate('location.hash="#/playground?mode=request&scope=tenantless&scenario=denied"');
  await wait('document.querySelector(".wb-wizard-context strong")?.textContent==="API standards" && document.querySelector(".wb-request-recovery")?.textContent.includes("DOMAIN_ACCESS_DENIED")','legacy domain-denied link must use API guide and preserve denial');
  assert.equal(await evaluate('document.querySelector(".wb-route-recovery")===null'),true,'valid legacy denial must not be silently remapped');
  await evaluate('location.hash="#/playground?cap=files&mode=request&scenario=success"');
  await wait('document.querySelector(".wb-route-recovery")?.textContent.includes("Capability and integration pattern do not match")','incompatible contract-only capability needs visible recovery');
  assert.ok((await evaluate(q('.wb-wizard-context strong')+'.textContent')).includes('Identity & tenancy'),'invalid contract/mode pair should recover to supported request guide');

  // A new Playground visit opens a single capability-selection stage.
  await click('.primary-nav a[href="#/playground"]');
  await wait('location.hash==="#/playground" && !!document.querySelector(".wb-capability-grid")','wizard root failed');
  assert.equal(await evaluate('document.activeElement?.id'),'wb-wizard-panel-title','Playground return focuses its Choose capability step heading');
  assert.equal(await evaluate('document.querySelectorAll(".wb-capability-card").length'),9,'all nine published capabilities must be selectable');
  assert.equal(await evaluate('document.querySelectorAll(".wb-wizard-step[aria-current=step]").length'),1,'only one wizard phase may be current');
  assert.equal(await evaluate('document.querySelectorAll(".wb-result-card").length'),0,'scenario result must not appear as a disconnected second app');

  // Events & audit proceeds through capability-specific shipped, prepare,
  // explore and implementation phases, without changing the chosen capability.
  await click('.wb-capability-card:nth-child(6)');
  await wait('location.hash.includes("cap=events") && document.querySelector("#wb-wizard-panel-title")?.textContent.includes("Understand Events")','capability choose must advance to understanding');
  assert.ok((await evaluate(q('.wb-phase-understand')+'.textContent')).includes('JdbcReliabilityTransaction'),'understanding describes the real released contract');
  assert.ok((await evaluate(q('.wb-phase-understand')+'.textContent')).includes('What stays with your product'),'ownership visible in same guide');
  await click('.wb-wizard-next');
  await wait('!!document.querySelector(".wb-phase-prepare")','wizard must progress to prerequisites');
  assert.equal(await evaluate('document.querySelectorAll(".wb-prerequisite input").length'),3,'capability-specific preparation checklist missing');
  await click('.wb-prerequisite:first-child input');
  assert.ok((await evaluate(q('.wb-prepare-progress')+'.textContent')).includes('1/3'),'readiness is local self-attestation');
  await click('.wb-wizard-next');
  await wait('!!document.querySelector(".wb-phase-explore")','wizard must progress to how it works');
  assert.equal(await evaluate('document.querySelectorAll(".wb-process-list li").length'),3,'events sequence must be capability-specific');
  assert.ok((await evaluate(q('.wb-outcome')+'.textContent')).includes('ATOMIC'),'events should use its relevant published JDBC pattern');
  assert.equal(await evaluate('document.querySelectorAll(".wb-wizard-step[aria-current=step]").length'),1,'wizard current-step state duplicated');
  await click('.wb-wizard-next');
  await wait('!!document.querySelector(".wb-phase-implement")','wizard must lead into code and verification');
  assert.ok((await evaluate(q('.wb-code-pane code')+'.textContent')).includes('platform-kernel-jdbc'),'released JDBC artifact shown');
  assert.equal(await evaluate('document.querySelector(".wb-check-pane a").getAttribute("href")'),'#/docs/jdbc','events implementation must link to matching guide');

  // Contract-only capabilities remain in the same wizard, with specific steps
  // but no invented browser trace or unrelated Java example.
  await click('.wb-wizard-change');
  await wait('!!document.querySelector(".wb-capability-grid")','change capability must return to selection');
  await click('.wb-capability-card:nth-child(8)');
  await wait('location.hash.includes("cap=files") && !!document.querySelector(".wb-phase-understand")','FileReference capability selection failed');
  await click('.wb-wizard-step:nth-child(3)');
  assert.ok((await evaluate(q('.wb-phase-prepare')+'.textContent')).includes('File Storage provider'),'file preparation must name external owner');
  await click('.wb-wizard-step:nth-child(4)');
  assert.ok((await evaluate(q('.wb-guide-only')+'.textContent')).includes('Contract-only'),'file reference must not pretend to run Java or access files');
  assert.equal(await evaluate('document.querySelector(".wb-result-card")===null'),true,'contract-only capability must not show a simulated request');
  await click('.wb-wizard-step:nth-child(5)');
  assert.equal(await evaluate('document.querySelectorAll(".wb-code-tabs button[aria-pressed]").length'),1,'contract guide must not show unrelated Java example');
  assert.ok((await evaluate(q('.wb-code-pane code')+'.textContent')).includes('platform-kernel'),'contract requires published core artifact');
  await evaluate('location.hash="#/docs/install"');
  await wait('!!document.querySelector(".docs-layout")','shared contract guide needs an independent route entry');
  await evaluate('location.hash="#/playground?cap=files"');
  await wait('!!document.querySelector(".wb-phase-understand") && document.querySelector("#wb-wizard-panel-title")?.textContent.includes("File references")','shared contract-only link must open the right Understand step');
  await click('.wb-wizard-change');
  await click('.wb-capability-card:nth-child(9)');
  await wait('location.hash.includes("cap=testkit")','testkit guide selection failed');
  await click('.wb-wizard-step:nth-child(5)');
  assert.ok((await evaluate(q('.wb-code-pane code')+'.textContent')).includes('<scope>test</scope>'),'testkit dependency must stay test-scoped');
  assert.equal(await evaluate('document.querySelector(".wb-check-pane a").getAttribute("href")'),'#/docs/assure','testkit must link to consumer assurance guide');

  // Core first-run is a complete tested Java 21 program, with actual released
  // Unix/Windows run instructions reused directly from the on-site first guide.
  await click('.wb-wizard-change');
  await wait('!!document.querySelector(".wb-capability-grid")','return to capability picker for first run');
  await click('.wb-capability-card:nth-child(3)');
  await wait('location.hash.includes("cap=ids")','IDs first-run capability unavailable');
  await click('.wb-wizard-step:nth-child(5)');
  await wait('!!document.querySelector(".wb-first-run")','runnable first-program instructions missing');
  assert.equal(await evaluate('document.querySelectorAll(".wb-code-tabs [role=group] button").length'),4,'core first-run must offer Maven, complete Java, Unix and Windows');
  assert.ok((await evaluate(q('.wb-first-run')+'.textContent')).includes('FirstKernelProgram.java'),'first-run file name missing');
  const firstPublished=developerGuides.find(x=>x.id==='first').samples;
  await click('.wb-code-tabs [role=group] button:nth-child(2)');
  assert.equal(await evaluate(q('.wb-code-pane code')+'.textContent'),firstPublished.find(x=>x.label==='Java 21').code,'wizard must use exact canonical complete Java sample');
  assert.ok((await evaluate(q('.wb-code-kind')+'.textContent')).includes('Complete runnable Java'),'complete program must be labeled');
  await click('.wb-code-tabs [role=group] button:nth-child(3)');
  assert.equal(await evaluate(q('.wb-code-pane code')+'.textContent'),firstPublished.find(x=>x.label==='Run').code,'Unix commands must be canonical site instructions');
  await click('.wb-code-tabs [role=group] button:nth-child(4)');
  assert.equal(await evaluate(q('.wb-code-pane code')+'.textContent'),firstPublished.find(x=>x.label==='Windows').code,'Windows instructions must be canonical site instructions');
  assert.ok((await evaluate(q('.wb-code-pane code')+'.textContent')).includes("java -cp '.;."),'Windows classpath must use semicolon');
  await click('.wb-copy');
  await wait('document.querySelector(".wb-copy-feedback")?.textContent.length>0','first-run copy needs accessible result or fallback');
  assert.ok((await evaluate(q('.wb-copy-feedback')+'.textContent')).match(/Copied|Clipboard unavailable/),'first-run copy failure needs usable fallback');
  assert.ok((await evaluate(q('.wb-first-run a')+'.getAttribute("href")'))==='#/docs/first','runnable first-program guide link missing');

  // History, selected trace reset and one nonverbose status remain meaningful.
  await evaluate('location.hash="#/playground?mode=request&scope=scoped&scenario=membership"');
  await wait('document.querySelector(".wb-status-announcement")?.textContent.includes("Identity & tenancy")','membership deep link must enter trace');
  assert.equal(await evaluate('document.querySelector(".wb-inspection").hasAttribute("aria-live")'),false,'verbose inspector must not be live');
  assert.equal(await evaluate('document.querySelectorAll(".wb-status-announcement[role=status]").length'),1,'exactly one trace status');
  await evaluate('document.querySelector(".wb-track li:nth-child(3) button").focus()');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13});
  await wait('document.querySelector(".wb-inspection-tag")?.textContent.includes("3 OF 6")','keyboard activation of denial gate failed');
  assert.ok((await evaluate(q('.wb-status-announcement')+'.textContent')).includes('Stopped here'),'status must include stop state');
  await click('.wb-scenario:first-child');
  await wait('location.hash.includes("scenario=success") && document.querySelector(".wb-inspection-tag")?.textContent.includes("1 OF 6")','scenario change should reset selection');
  await evaluate('history.back()');
  await wait('location.hash.includes("scenario=membership") && document.querySelector(".wb-inspection-tag")?.textContent.includes("1 OF 6")','Back should restore URL and first gate');
  await evaluate('history.forward()');
  await wait('location.hash.includes("scenario=success")','Forward should restore scenario');

  await evaluate('location.hash="#/playground?mode=request&scope=tenantless&scenario=membership"');
  await wait('!!document.querySelector(".wb-route-recovery")','invalid scenario link must explain recovery');
  assert.ok((await evaluate(q('.wb-route-recovery')+'.textContent')).includes('Scenario unavailable'),'invalid link explanation missing');
  assert.ok((await evaluate(q('.wb-status-announcement')+'.textContent')).includes('REQUEST ALLOWED'),'fallback must be a valid trace');
  await evaluate('location.hash="#/playground?mode=mutation&scope=scoped&scenario=replay"');
  await wait('document.querySelector(".wb-outcome")?.textContent.includes("SAFE REPLAY")','mutation replay URL not restored');
  assert.equal(await evaluate('document.querySelectorAll(".wb-track li[data-state=skipped]").length'),3,'replay must skip duplicate SQL and intents');
  await click('.wb-wizard-step:nth-child(5)');
  assert.equal(await evaluate('document.querySelector(".wb-code-pane pre").getAttribute("tabindex")'),'0','code stays keyboard scrollable');
  await click('.wb-copy');
  await wait('document.querySelector(".wb-copy-feedback").textContent.length>0','clipboard feedback missing');
  assert.ok((await evaluate(q('.wb-copy-feedback')+'.textContent')).match(/Copied|Clipboard unavailable/),'copy denial must have manual fallback');

  // Long-guide reading flow uses only existing section routes and accessible
  // headings: no second sidebar or another Docs destination.
  await evaluate('location.hash="#/docs/request"');
  await wait('!!document.querySelector(".guide-reading-path")','request reading path missing');
  assert.equal(await evaluate('document.querySelectorAll(".guide-reading-path a").length'),7,'request section map mismatch');
  assert.ok((await evaluate(q('.guide-reading-path')+'.getAttribute("aria-label")'))==='Sections in this guide');
  await click('.guide-reading-path a[href="#/docs/request?section=failures"]');
  await wait('location.hash.includes("section=failures") && document.activeElement?.id==="request-denials-heading"','failure jump lost heading focus');
  assert.equal(await evaluate('document.querySelector(".guide-reading-path a[href*=failures]").getAttribute("aria-current")'),'location','selected section not identified');
  await evaluate('history.back()');
  await wait('location.hash==="#/docs/request" && document.activeElement?.id==="guide-heading"','Back should return to guide overview');
  await evaluate('history.forward()');
  await wait('location.hash.includes("section=failures") && document.activeElement?.id==="request-denials-heading"','Forward should restore selected section focus');
  await evaluate('location.hash="#/docs/jdbc"');
  await wait('!!document.querySelector(".guide-reading-path")','JDBC reading path missing');
  assert.equal(await evaluate('document.querySelectorAll(".guide-reading-path a").length'),7,'JDBC section map mismatch');
  assert.equal(await evaluate('document.querySelector(".request-decisions details.guide-troubleshooting").open'),false,'recovery should not expand automatically on overview');
  await click('.guide-reading-path a[href="#/docs/jdbc?section=recovery"]');
  await wait('location.hash.includes("section=recovery") && document.querySelector(".request-decisions details.guide-troubleshooting")?.open','recovery jump failed to open native disclosure');
  assert.equal(await evaluate('document.activeElement?.id'),'jdbc-recovery-heading','recovery jump did not focus summary');
  await evaluate('location.hash="#/docs/assure"');
  await wait('!!document.querySelector(".guide-reading-path")','consumer assurance reading path missing');
  assert.equal(await evaluate('document.querySelectorAll(".guide-reading-path a").length'),6,'consumer section map mismatch');
  await click('.guide-reading-path a[href="#/docs/assure?section=conformance"]');
  await wait('location.hash.includes("section=conformance") && document.activeElement?.id==="consumer-evidence-heading"','conformance jump failed');
  await evaluate('location.hash="#/docs/first"');
  await wait('!!document.querySelector(".guide-article")','first guide missing');
  assert.equal(await evaluate('document.querySelectorAll(".guide-reading-path").length'),0,'short first Java guide should not gain redundant in-article navigation');
  await evaluate('location.hash="#/docs/install"');
  await wait('document.activeElement?.id==="guide-heading"','restore install guide after reading-flow test');

  // The existing JDBC guide must explain every decision and support keyboard flow to the one Playground.
  await evaluate('location.hash="#/docs/jdbc"');
  await wait('document.querySelectorAll("#jdbc-decision-heading").length===1','JDBC decision guide absent');
  assert.equal(await evaluate('document.querySelectorAll("#jdbc-decision-heading ~ .request-failures-scroll tbody tr").length'),4,'all four JDBC outcomes must be shown');
  assert.ok((await evaluate(q('.request-diagnostics')+'.textContent')).includes('consumer testkit'),'on-site verification path must be available');
  await evaluate('document.querySelector("details.guide-troubleshooting summary").focus()');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32,nativeVirtualKeyCode:32});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32,nativeVirtualKeyCode:32});
  assert.equal(await evaluate('document.querySelector("details.guide-troubleshooting").open'),true,'native JDBC recovery disclosure not keyboard operable');
  await click('.request-failures a[href*="scenario=in-progress"]');
  await wait('location.hash.includes("scenario=in-progress")','in-progress scenario deep link failed');
  assert.ok((await evaluate(q('.wb-outcome')+'.textContent')).includes('IN PROGRESS'),'concurrent retry must not read as REPLAY');
  assert.equal(await evaluate('document.querySelectorAll(".wb-track li[data-state=blocked]").length'),1,'in-progress must stop at acquire');
  await click('.wb-wizard-step:nth-child(5)');
  await wait('!!document.querySelector(".wb-check-pane a")','implementation phase must expose matching JDBC guide');
  await click('.wb-check-pane a');
  await wait('location.hash==="#/docs/jdbc" && !!document.querySelector("#jdbc-decision-heading")','return to JDBC guide failed');
  await click('.request-diagnostics a[href="#/docs/assure"]');
  await wait('location.hash==="#/docs/assure" && !!document.querySelector("#consumer-evidence-heading")','consumer conformance handoff failed');
  assert.equal(await evaluate('document.querySelectorAll("#consumer-evidence-heading ~ .request-failures-scroll tbody tr").length'),10,'published conformance IDs must be listed');
  assert.ok((await evaluate(q('.guide-code-shell code')+'.textContent')).includes('<scope>test</scope>'),'testkit must remain test scope');

  // Issue #83 — full supported route/state matrix in the rendered production bundle.
  // Semantic checks are deterministic smoke gates, NOT a complete WCAG/AT audit.
  const matrix=[
    ['#/','.home-hero'],
    ...developerGuides.map(guide=>['#/docs/'+guide.id,'#guide-heading']),
    ['#/docs/preview','#guide-heading'],
    ['#/playground','.wb-capability-grid'],
    ['#/playground?cap=files','.wb-phase-understand'],
    ['#/playground?cap=identity','.wb-phase-understand'],
    ['#/playground?cap=idempotency','.wb-phase-understand'],
    ['#/playground?cap=module&mode=request&scope=scoped&scenario=cross-tenant','.wb-route-recovery'],
    ...referenceTopics.map(topic=>['#/reference/'+topic.id,'#reference-heading']),
    ...workbenchModes.flatMap(mode=>
      (mode.id==='request'?['scoped','tenantless']:['scoped'])
        .flatMap(scope=>scenariosFor(mode.id,scope).map(s=>
          ['#/playground?mode='+mode.id+'&scope='+scope+'&scenario='+s.id,'.wb-frame'])))
  ];
  let inspectedControls=0,checkedInternalLinks=0,inspectedAXControls=0;
  // Chrome computes accessible names through labels, relations and hidden text.
  // This checks the actual AX tree without adding a second UI testing framework.
  async function checkAXTree(label){
    const ax=(await send('Accessibility.getFullAXTree')).nodes||[];
    const exposed=ax.filter(node=>!node.ignored);
    const roles=new Set(['button','link','checkbox','radioButton','textField','searchbox','comboBox','switch','tab']);
    const actionable=exposed.filter(node=>roles.has(node.role?.value));
    const unnamed=actionable.filter(node=>!String(node.name?.value??'').trim());
    assert.deepEqual(unnamed.map(node=>({role:node.role?.value,backendDOMNodeId:node.backendDOMNodeId})),[],
      'Computed accessible name missing in Chromium AX tree on '+label);
    assert.equal(exposed.filter(node=>node.role?.value==='main').length,1,
      'Expected exactly one main landmark on '+label);
    assert.ok(exposed.some(node=>node.role?.value==='heading'&&String(node.name?.value??'').trim()),
      'Expected a named heading on '+label);
    inspectedAXControls+=actionable.length;
  }
  for(const [hash,target] of matrix){
    await evaluate('location.hash='+JSON.stringify(hash));
    await wait('!!document.querySelector('+JSON.stringify(target)+')','quality route missing '+hash);
    await sleep(85);
    const audit=await evaluate(`(()=>{
      const elements=[...document.querySelectorAll('[id]')];
      const ids=new Set(),duplicates=[];
      for(const el of elements){if(ids.has(el.id))duplicates.push(el.id);ids.add(el.id);}
      const accessible=el=>(el.getAttribute('aria-label')||el.getAttribute('aria-labelledby')&&
        document.getElementById(el.getAttribute('aria-labelledby'))?.textContent||el.textContent||'').trim();
      const unnamedButtons=[...document.querySelectorAll('button')].filter(x=>!accessible(x)).length;
      const unnamedLinks=[...document.querySelectorAll('a[href]')].filter(x=>!accessible(x)).length;
      const unlabeledInputs=[...document.querySelectorAll('input,select,textarea')].filter(x=>!x.labels?.length&&!x.getAttribute('aria-label')&&!x.getAttribute('aria-labelledby')).length;
      const missingControls=[...document.querySelectorAll('[aria-controls]')].filter(x=>
        x.getAttribute('aria-controls').split(' ').some(id=>!document.getElementById(id))).length;
      const positiveTab=[...document.querySelectorAll('[tabindex]')].filter(x=>Number(x.getAttribute('tabindex'))>0).length;
      return {duplicates,unnamedButtons,unnamedLinks,unlabeledInputs,missingControls,positiveTab,
        links:[...document.querySelectorAll('a[href]')].map(x=>x.getAttribute('href')).filter(x=>x.startsWith('#/')),
        controls:document.querySelectorAll('button,input,select,textarea').length,
        overflow:document.documentElement.scrollWidth>window.innerWidth+1,
        headings:document.querySelectorAll('h1,h2,h3,h4').length};
    })()`);
    assert.deepEqual(audit.duplicates,[],'Duplicate DOM IDs on '+hash);
    for(const key of ['unnamedButtons','unnamedLinks','unlabeledInputs','missingControls','positiveTab']){
      assert.equal(audit[key],0,key+' on '+hash+': '+JSON.stringify(audit));
    }
    assert.ok(!audit.overflow,'Whole-page overflow on '+hash);
    assert.ok(audit.headings>0,'No content headings on '+hash);
    for(const href of audit.links)assert.notEqual(resolveRoute(href).page,'notfound','Broken rendered hash link '+href+' on '+hash);
    await checkAXTree(hash);
    inspectedControls+=audit.controls;checkedInternalLinks+=audit.links.length;
  }
  // The matrix covers historical scenario URLs and current capability links.
  // Also verify the interactive five-stage wizard itself, not just its first
  // page and deep-linked Explore mode. These states are not separate apps.
  await evaluate('location.hash="#/playground"');
  await wait('!!document.querySelector(".wb-capability-grid")','wizard chooser for AX audit unavailable');
  const axSteps=['Choose','Understand','Prepare','Explore','Implement'];
  for(let i=0;i<axSteps.length;i++){
    if(i===1){
      await click('.wb-capability-card:nth-child(3)');
    }else if(i>1){
      await click('.wb-wizard-step:nth-child('+(i+1)+')');
    }
    await wait('document.querySelectorAll(".wb-wizard-step[aria-current=step]").length===1 && document.querySelector(".wb-wizard-step:nth-child('+(i+1)+')")?.getAttribute("aria-current")==="step" && !!document.querySelector("#wb-wizard-panel-title")',
      'wizard step is not a meaningful accessible state '+axSteps[i]);
    await checkAXTree('wizard '+axSteps[i]);
  }
  // Further sample the contract-only path with a different accessible
  // control surface; no code execution or WCAG claim is implied.
  await click('.wb-wizard-change');
  await wait('!!document.querySelector(".wb-capability-grid")','contract-only chooser unavailable');
  await click('.wb-capability-card:nth-child(8)');
  await wait('!!document.querySelector(".wb-phase-understand")','file reference guide unavailable');
  await click('.wb-wizard-step:nth-child(4)');
  await wait('!!document.querySelector(".wb-guide-only")','contract-only Explore guide unavailable');
  await checkAXTree('contract-only File references Explore');
  // Reduced-motion preference must disable state transition animation on the
  // existing mode controls; still requires an actual OS/browser human check.
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await evaluate('location.hash="#/playground"');
  await wait('!!document.querySelector(".wb-capability-card")','reduced motion Playground unavailable');
  assert.equal(await evaluate('matchMedia("(prefers-reduced-motion: reduce)").matches'),true,'reduced motion emulation failed');
  assert.ok((await evaluate('getComputedStyle(document.querySelector(".wb-capability-card")).transitionDuration')).split(',').every(s=>parseFloat(s)===0),'reduced motion mode selector still transitions');
  await send('Emulation.setEmulatedMedia',{features:[]});
  await evaluate('location.hash="#/"');
  await wait('!!document.querySelector(".home-hero")','home performance route missing');
  const perf=await evaluate(`(()=>{
    const nav=performance.getEntriesByType('navigation')[0];
    return {domNodes:document.querySelectorAll('*').length,resourceCount:performance.getEntriesByType('resource').length,
      dclMs:nav?Math.round(nav.domContentLoadedEventEnd):null,
      loadMs:nav?Math.round(nav.loadEventEnd):null};
  })()`);
  console.log('SITE_BROWSER_QA '+JSON.stringify({routeCount:matrix.length,inspectedControls,inspectedAXControls,checkedInternalLinks,reducedMotion:true,perf}));

  // Baseline semantic and small-text contrast checks. This is not an AT or WCAG certification.
  const computedContrast=async selector=>{
    const expr='(()=>{'+
      'const el=document.querySelector('+JSON.stringify(selector)+');'+
      'if(!el)throw Error("Contrast target not found");'+
      'const fore=getComputedStyle(el).color;'+
      'let node=el,bg="rgb(255, 255, 255)";'+
      'while(node){const c=getComputedStyle(node).backgroundColor;'+
      'if(c&&c!=="transparent"&&c!=="rgba(0, 0, 0, 0)"){bg=c;break;}node=node.parentElement;}'+
      'const luminance=c=>{const v=c.match(/[\\d.]+/g).slice(0,3).map(Number);'+
      'return v.map(x=>{let s=x/255;return s<=.04045?s/12.92:Math.pow((s+.055)/1.055,2.4);})'+
      '.reduce((sum,x,i)=>sum+x*[.2126,.7152,.0722][i],0);};'+
      'const a=luminance(fore),b=luminance(bg);'+
      'return {ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05),foreground:fore,background:bg};})()';
    return evaluate(expr);
  };
  for(const [hash,selectors] of [
    ['#/',['.brand-name small']],
    ['#/docs/request',['.guide-breadcrumb','.guide-excerpt-note','.docs-search-count']],
    ['#/reference/architecture',['.side-kicker','.reference-aside-note']],
    ['#/playground',['.wb-capability-card-top','.wb-capability-card-state']],
    ['#/playground?mode=request&scope=scoped&scenario=success',['.wb-process-list small','.wb-trace-state','.wb-decision-detail p']]
  ]){
    await evaluate('location.hash='+JSON.stringify(hash));
    await wait('!!document.querySelector('+JSON.stringify(selectors[0])+')','contrast target route '+hash);
    for(const selector of selectors){
      const c=await computedContrast(selector);
      assert.ok(c.ratio>=4.5,'Normal small-text contrast below 4.5:1 '+hash+' '+selector+' '+JSON.stringify(c));
    }
  }
  await evaluate('location.hash="#/playground?mode=request&scope=scoped&scenario=success"');
  await wait('!!document.querySelector(".wb-wizard-step")','code contrast wizard route missing');
  await click('.wb-wizard-step:nth-child(5)');
  const codeContrast=await computedContrast('.wb-code-kind');
  assert.ok(codeContrast.ratio>=4.5,'Published code note contrast below 4.5:1: '+JSON.stringify(codeContrast));

  // Missing hash route provides a keyboard-reachable recovery path and heading focus.
  await evaluate('location.hash="#/route-not-found"');
  await wait('!!document.querySelector(".not-found")','missing-route view did not render');
  assert.equal(await evaluate('document.activeElement.id'),'page-title','missing-route heading must receive focus');
  await evaluate('document.querySelector(".not-found a").focus()');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13});
  await wait('location.hash==="#/docs/install" && document.activeElement?.id==="guide-heading"','unknown-route recovery did not navigate and focus guide heading');
  assert.equal(await evaluate('document.activeElement.id'),'guide-heading','recovered guide heading should receive focus');

  // Full-width desktop regression: previous 1180px shell must not return at 1920/2560px.
  // Check the real rendered production bundle across all four site destinations.
  for(const width of [1440,1920,2560]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:1100,deviceScaleFactor:1,mobile:false});
    for(const [hash,selector] of [
      ['#/','.home-hero .wrap'],
      ['#/docs/install','.docs-layout'],
      ['#/docs/preview','.docs-layout'],
      ['#/playground','.wb-frame'],
      ['#/reference/architecture','.reference-layout']
    ]){
      await evaluate('location.hash='+JSON.stringify(hash));
      await wait('!!document.querySelector('+JSON.stringify(selector)+')','wide route '+hash+' missing');
      const measurement=await evaluate('(()=>{const wrap=document.querySelector(".wrap");const r=wrap.getBoundingClientRect();return {width:r.width,left:r.left,right:document.documentElement.clientWidth-r.right,body:document.documentElement.scrollWidth}})()');
      assert.ok(measurement.width>=width*.9,'Page shell constrained at '+width+' on '+hash+': '+JSON.stringify(measurement));
      assert.ok(Math.abs(measurement.left-measurement.right)<=2,'Asymmetric desktop page gutters '+width+' '+hash);
      assert.ok(measurement.body<=width+1,'Unexpected page overflow at '+width+' '+hash);
      const panel=await evaluate('document.querySelector('+JSON.stringify(selector)+').getBoundingClientRect().width');
      assert.ok(panel>=width*.89,'Page destination remains width-constrained '+hash+' at '+width);
      if(hash.startsWith('#/docs/')){
        const article=await evaluate('document.querySelector(".guide-article").getBoundingClientRect().width');
        assert.ok(article>=width*.62,'Documentation article did not expand at '+width);
      }
    }
  }
  // Restore the baseline viewport before checking responsive breakpoints.
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});

  // Wide, zoom-equivalent and narrow reflow: page has no horizontal overflow; code scrolls in its own pane.
  for(const width of [720,640,390,320]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===390});
    await sleep(180);
    assert.ok(await evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),'Playground overflows viewport '+width);
    // The capability wizard intro must be one readable vertical sequence.
    // Page-level overflow alone missed a 90px-wide broken heading at 390px.
    await evaluate('location.hash="#/playground"');
    await wait('!!document.querySelector(".wb-wizard-intro h2")','wizard intro missing at '+width);
    const hero=await evaluate('(()=>{const h=document.querySelector(".wb-wizard-intro h2").getBoundingClientRect(),p=document.querySelector(".wb-wizard-intro .lead").getBoundingClientRect(),k=document.querySelector(".wb-wizard-intro .wb-kicker").getBoundingClientRect();return {hWidth:h.width,hBottom:h.bottom,pTop:p.top,pWidth:p.width,kWidth:k.width,bodyWidth:document.documentElement.scrollWidth}})()');
    assert.ok(hero.hWidth>=Math.min(width-58,260),'Wizard hero heading collapsed at '+width+': '+JSON.stringify(hero));
    assert.ok(hero.pTop>=hero.hBottom-1,'Wizard hero introduction must stack below heading at '+width+': '+JSON.stringify(hero));
    assert.ok(hero.pWidth>=Math.min(width-58,260),'Wizard lead must remain readable at '+width+': '+JSON.stringify(hero));
    assert.ok(hero.bodyWidth<=width+1,'Wizard intro must not cause overflow at '+width);
    await evaluate('location.hash="#/docs/first"');
    await wait('!!document.querySelector(".guide-article")','mobile docs missing');
    assert.ok(await evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),'Docs overflow viewport '+width);
    // Both integration guides contain long inline Java API identifiers.
    // Tables and code may scroll locally; the document itself must not.
    for(const id of ['request','jdbc']){
      await evaluate('location.hash="#/docs/'+id+'"');
      await wait('!!document.querySelector(".guide-article") && !!document.querySelector(".request-failures-scroll")','integration guide '+id+' missing at '+width);
      assert.ok(await evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),'Page-level overflow in '+id+' guide at '+width+'px');
      assert.equal(await evaluate('getComputedStyle(document.querySelector(".request-failures-scroll")).overflowX'),'auto','table scroll should remain local in '+id);
      if(width<=640)assert.ok(await evaluate('document.querySelector(".request-failures-scroll").scrollWidth>document.querySelector(".request-failures-scroll").clientWidth'),'wide table lost local scrolling in '+id+' at '+width);
      if(width<=640){
        assert.ok(await evaluate('document.querySelector(".guide-reading-path").scrollWidth<=document.querySelector(".guide-article").clientWidth'),'reading path must fit article at '+width);
        assert.ok(await evaluate('document.querySelector(".guide-reading-path-links").scrollWidth>document.querySelector(".guide-reading-path-links").clientWidth'),'section links should have local scroll at '+width);
        await evaluate('(()=>{const links=document.querySelectorAll(".guide-reading-path a");links[links.length-1].focus()})()');
        await wait('document.querySelector(".guide-reading-path-links").scrollLeft>0','keyboard focus should reveal last in-guide section at '+width);
        assert.ok(await evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),'section navigation must not cause whole-page overflow at '+width);
      }
    }
    await evaluate('location.hash="#/docs/first"');
    await wait('!!document.querySelector(".guide-article")','return to first guide after reflow tests');
    if(width<=640){
      assert.equal(await evaluate('getComputedStyle(document.querySelector(".docs-guide-nav")).overflowX'),'auto','guide navigation must scroll locally at '+width);
      assert.equal(await evaluate('document.querySelectorAll(".docs-guide-nav a").length'),5,'all published guides remain reachable');
      assert.ok(await evaluate('document.querySelector(".docs-guide-nav").scrollWidth>document.querySelector(".docs-guide-nav").clientWidth'),'guide rail must expose more topics at '+width);
      assert.ok(await evaluate('document.querySelector(".guide-article").getBoundingClientRect().top<window.innerHeight'),'current guide content should begin within the first viewport at '+width);
      await evaluate('(()=>{const links=document.querySelectorAll(".docs-guide-nav a");links[links.length-1].focus()})()');
      await wait('document.querySelector(".docs-guide-nav").scrollLeft>0','keyboard focus should bring the last guide into view at '+width);
      assert.ok(await evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),'guide rail must not create page overflow at '+width);
    }
    assert.equal(await evaluate('getComputedStyle(document.querySelector(".guide-code-shell pre")).overflowX'),'auto','code has local horizontal scrolling at '+width);
    if(width<=390)assert.ok(await evaluate('document.querySelector(".guide-code-shell pre").scrollWidth>document.querySelector(".guide-code-shell pre").clientWidth'),'long code scrolls at narrow viewport');
    await evaluate('location.hash="#/reference/architecture"');
    await wait('!!document.querySelector(".ownership-grid")','responsive reference missing');
    assert.ok(await evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),'Reference overflows viewport '+width);
    if(width<=640){
      assert.equal(await evaluate('document.querySelectorAll(".reference-nav a").length'),3,'all reference topics remain available');
      assert.equal(await evaluate('getComputedStyle(document.querySelector(".reference-nav")).overflowX'),'auto','reference topic rail scrolls locally');
      assert.ok(await evaluate('document.querySelector(".reference-article").getBoundingClientRect().top<window.innerHeight'),'reference article should begin within the first viewport at '+width);
      await evaluate('document.querySelectorAll(".reference-nav a")[2].focus()');
      await wait('document.querySelector(".reference-nav").scrollLeft>0','keyboard focus should reveal last reference topic at '+width);
      assert.ok(await evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),'reference topic rail must not overflow document');
    }
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
  console.log('Browser smoke: four destinations, source-aware docs search, deep-linked decision flows, keyboard/code, and 1440/1920/2560 desktop plus 720/640/390/320px reflow passed');
} finally {
  ws?.close();chrome.kill('SIGTERM');server.close();await sleep(200);await rm(profile,{recursive:true,force:true}).catch(()=>{});
}
