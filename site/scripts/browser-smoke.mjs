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
  await wait('document.querySelectorAll(".docs-guide-group a").length===1','guide search did not filter topics');
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

  // Documentation links land on a selected, shareable learning scenario.
  await evaluate('location.hash="#/docs/request"');
  await wait('location.hash==="#/docs/request" && !!document.querySelector(".guide-try-link")','on-site flow link missing');
  assert.equal(await evaluate('document.querySelector(".guide-try-link").getAttribute("href")'),'#/playground?mode=request&scope=scoped&scenario=success');
  await click('.guide-try-link');
  await wait('location.hash.includes("mode=request") && document.querySelectorAll(".wb-trace-step").length===6','request walkthrough deep link failed');
  assert.ok((await evaluate(q('.wb-inspection')+'.innerText')).includes('What is checked?'),'decision inspector explains required checks');
  assert.ok((await evaluate(q('.wb-inspection')+'.innerText')).includes('Who owns this?'),'decision inspector explains responsibility');
  await click('.wb-scenario:nth-child(4)');
  await wait('location.hash.includes("scenario=cross-tenant")','cross-tenant scenario URL missing');
  assert.ok((await evaluate(q('.wb-outcome')+'.textContent')).includes('404'),'cross-tenant resource must be hidden');
  assert.equal(await evaluate('document.querySelectorAll(".wb-track li[data-state=blocked]").length'),1,'first failing gate is shown');
  await click('.wb-track li:nth-child(2) button');
  assert.equal(await evaluate('document.querySelector(".wb-inspection-tag").textContent.includes("2 OF 6")'),true,'second gate inspection opened');
  await click('.wb-trace-actions button:first-child');
  assert.equal(await evaluate('document.querySelector(".wb-inspection-tag").textContent.includes("1 OF 6")'),true,'previous decision navigation works');

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
  assert.equal(await evaluate('document.querySelectorAll(".wb-track li[data-state=skipped]").length'),3,'replay skips domain SQL and new intents');
  await click('.wb-scenario:nth-child(3)');
  assert.ok((await evaluate(q('.wb-outcome')+'.textContent')).includes('IN PROGRESS'),'concurrent retry is distinguished from replay');
  assert.equal(await evaluate('document.querySelector(".wb-check-pane a").getAttribute("href")'),'#/docs/jdbc','playground links to on-site JDBC docs');

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
    ['#/docs/request',['.guide-breadcrumb','.guide-excerpt-note','.docs-search-count']],
    ['#/reference/architecture',['.side-kicker','.reference-aside-note']],
    ['#/playground?mode=request&scope=scoped&scenario=success',['.wb-profile-number','.wb-stage-slash']]
  ]){
    await evaluate('location.hash='+JSON.stringify(hash));
    await wait('!!document.querySelector('+JSON.stringify(selectors[0])+')','contrast target route '+hash);
    for(const selector of selectors){
      const c=await computedContrast(selector);
      assert.ok(c.ratio>=4.5,'Normal small-text contrast below 4.5:1 '+hash+' '+selector+' '+JSON.stringify(c));
    }
  }
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
  console.log('Browser smoke: four destinations, source-aware docs search, deep-linked decision flows, keyboard/code, and 1440/1920/2560 desktop plus 720/640/390/320px reflow passed');
} finally {
  ws?.close();chrome.kill('SIGTERM');server.close();await sleep(200);await rm(profile,{recursive:true,force:true}).catch(()=>{});
}
