import React,{useState,useEffect,useRef} from 'react';
import {version,source,capabilities} from './data.mjs';
import {capabilityGuides,capabilityGuide,inferCapability} from './capability-guides.mjs';
import {getWorkbenchRecipe,scenariosFor} from './workbench-data.mjs';
import {getPublicOutcome} from './public-outcomes.mjs';
import {developerGuides} from './docs-data.mjs';
import {tokenizeCode} from './code-tokens.mjs';
import {selectCodeText} from './code-selection.mjs';
import './kernel-workbench.css';

const phases=[
  {title:'Choose',hint:'Pick a capability'},
  {title:'Understand',hint:'What it provides'},
  {title:'Prepare',hint:'What you need'},
  {title:'Check',hint:'Outcomes & ownership'},
  {title:'Implement',hint:'Use and verify'}
];
const readyHash=(guide,scope,scenario)=>{
  const params=new URLSearchParams({cap:guide.id});
  if(guide.mode){
    params.set('mode',guide.mode);
    params.set('scope',scope||guide.scope||'scoped');
    params.set('scenario',scenario||guide.scenario||'success');
  }
  return '#/playground?'+params.toString();
};

export function IntegrationWorkbench({mode='core',scope='scoped',scenario='success',capabilityId=null,recovery=null,visitId=0}){
  const guide=capabilityGuide(capabilityId)||capabilityGuide(inferCapability(mode,scenario))||capabilityGuides[0];
  const capability=capabilities.find(item=>item.title===guide.title);
  const initialPhase=()=>{
    const params=new URLSearchParams(window.location.hash.split('?')[1]||'');
    return params.has('mode')?3:params.has('cap')?1:0;
  };
  const [phaseState,setPhaseState]=useState(()=>({key:visitId,phase:initialPhase()}));
  const phase=phaseState.key===visitId?phaseState.phase:initialPhase();
  const [readiness,setReadiness]=useState({});
  const [codeTab,setCodeTab]=useState('maven');
  const [copyStatus,setCopyStatus]=useState('');
  const focusReady=useRef(false);
  const codePreRef=useRef(null);

  // Only public contract outcomes are bundled; no hidden gate-by-gate trace.
  const scenarioList=guide.mode?scenariosFor(guide.mode,scope).filter(s=>guide.scenarios.includes(s.id)):[];
  const activeScenario=scenarioList.some(s=>s.id===scenario)?scenario:(scenarioList[0]?.id||'success');
  const result=guide.mode?getPublicOutcome(guide.mode,scope,activeScenario):null;
  const blocked=result?/^(DENIED|REJECTED|NOT FOUND|CONFLICT)/.test(result.outcome):false;
  const recipe=getWorkbenchRecipe(guide.mode||'core',scope,guide.testkit===true);
  const readyCount=guide.prepare.filter((_,i)=>readiness[guide.id+':'+i]).length;
  // Keep the first runnable program and OS commands identical to the tested
  // published website guide; never fork these samples into wizard-owned text.
  const firstProgram=developerGuides.find(item=>item.id==='first');
  // The published failure matrix remains the single source for HTTP diagnosis.
  // Browser scenarios do not validate credentials or access product data.
  const requestGuide=developerGuides.find(item=>item.id==='request');
  const failureInfo=guide.mode==='request'&&blocked?
    requestGuide.failureCases.find(item=>
      (item.scenario||item.id)===activeScenario&&item.scope===scope)||
    (activeScenario==='unverified'?requestGuide.failureCases.find(item=>item.id==='unverified'):null):null;
  const requestWiring=requestGuide.samples.find(item=>item.label==='Wiring');
  const runnableCore=guide.id==='ids';
  const codeChoices=[
    {id:'maven',label:'pom.xml',filename:'pom.xml (fragment)',kind:'Maven dependency fragment · existing project',language:'xml',code:recipe.maven},
    ...(guide.mode?[{
      id:'java',label:runnableCore?'Java 21 · complete':'Java excerpt',
      filename:runnableCore?'FirstKernelProgram.java':'Java integration excerpt',
      kind:runnableCore?'Complete runnable Java 21 program':recipe.javaKind,
      language:'java',code:runnableCore?firstProgram.samples.find(item=>item.label==='Java 21').code:recipe.java
    }]:[]),
    ...(guide.mode==='request'?[{
      id:'wiring',label:'Wiring excerpt',filename:requestWiring.filename,
      kind:requestWiring.kind,language:requestWiring.language,code:requestWiring.code
    }]:[]),
    ...(runnableCore?firstProgram.samples.filter(item=>item.label==='Run'||item.label==='Windows').map(item=>({
      id:item.label==='Run'?'unix':'windows',
      label:item.label==='Run'?'macOS / Linux':'Windows',
      filename:item.filename,kind:item.kind,language:item.language,code:item.code
    })):[])
  ];
  const selectedCode=codeChoices.find(item=>item.id===codeTab)||codeChoices[0];
  const code=selectedCode.code;
  const panelTitle=phase===0?'Which Kernel capability do you want to integrate?':
    phase===1?'Understand '+guide.title:
    phase===2?'Prepare for '+guide.title:
    phase===3?'Expected outcomes for '+guide.title:
    'Implement and verify '+guide.title;

  // Do not focus on initial route entry; the site router already focuses the
  // Playground heading. Later phase/capability changes focus the stable heading.
  useEffect(()=>{
    if(!focusReady.current){focusReady.current=true;return;}
    const heading=document.getElementById('wb-wizard-panel-title');
    heading?.focus({preventScroll:true});
    heading?.scrollIntoView({block:'start',behavior:'instant'});
  },[phase,guide.id]);

  function setPhase(next){
    setPhaseState({key:visitId,phase:Math.max(0,Math.min(next,phases.length-1))});
  }
  function updateRoute(hash,keepPhase){
    setCopyStatus('');
    const willChange=window.location.hash!==hash;
    setPhaseState({key:visitId+(willChange?1:0),phase:keepPhase});
    if(willChange)window.location.hash=hash;
  }
  function selectCapability(id){
    const next=capabilityGuide(id);
    if(!next)return;
    setCodeTab('maven');
    updateRoute(readyHash(next,next.scope,next.scenario),1);
  }
  function changeScenario(next){
    setCopyStatus('');
    updateRoute(readyHash(guide,scope,next),3);
  }
  function changeScope(next){
    const options=scenariosFor(guide.mode,next).filter(s=>guide.scenarios.includes(s.id));
    const candidate=options.some(s=>s.id===activeScenario)?activeScenario:'success';
    updateRoute(readyHash(guide,next,candidate),3);
  }
  function selectCode(){
    const selected=selectCodeText(codePreRef.current);
    setCopyStatus(selected?
      'Code selected. Press Ctrl+C (Windows/Linux) or Command+C (macOS) to copy.':
      'Text selection unavailable. Focus the example code block to select and copy manually.');
  }
  async function copyCode(){
    try{
      if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');
      await navigator.clipboard.writeText(code);
      setCopyStatus('Copied '+selectedCode.label+' to clipboard.');
    }catch{
      const selected=selectCodeText(codePreRef.current);
      setCopyStatus(selected?
        'Clipboard permission unavailable. Code selected; press Ctrl+C or Command+C to copy.':
        'Clipboard permission unavailable. Use Select code or select the example manually.');
    }
  }

  return <section id="workbench" className="section wb-section" aria-labelledby="workbench-title">
    <div className="wrap">
      <div className="wb-intro wb-wizard-intro">
        <span className="wb-kicker">GUIDED INTEGRATION / PUBLISHED v{version}</span>
        <h2 id="workbench-title" tabIndex={-1}>From capability <em>to integration.</em></h2>
        <p className="lead">Choose a capability, review what your application must supply, check published outcomes, and use released code. No internal execution diagram or live service simulation.</p>
      </div>
      <div className="wb-frame wb-wizard">
        <div className="wb-toolbar">
          <div className="wb-toolbar-title"><span className="wb-icon" aria-hidden="true">⌘</span><div><strong>Platform Kernel integration guide</strong><small>One capability at a time · application-owned boundaries preserved</small></div></div>
          <div className="wb-toolbar-right">Published v{version} · Java 21+</div>
        </div>
        <div className="wb-wizard-progress">
          <nav className="wb-wizard-steps" aria-label="Integration guide steps">
            {phases.map((item,i)=><button type="button" key={item.title} className={'wb-wizard-step'+(phase===i?' is-current':'')+(phase>i?' is-visited':'')}
              aria-current={phase===i?'step':undefined} aria-controls="wb-wizard-panel" onClick={()=>setPhase(i)}>
              <span className="wb-wizard-step-number">{String(i+1).padStart(2,'0')}</span>
              <span className="wb-wizard-step-label"><strong>{item.title}</strong><small>{item.hint}</small></span>
            </button>)}
          </nav>
          <div className="wb-wizard-context"><span>{phase+1} / {phases.length} steps</span><strong>{guide.title}</strong><small>{capability.status} · {guide.mode?'guided example':'contract guide'}</small></div>
        </div>
        <div className="wb-wizard-body" id="wb-wizard-panel">
          <div className="wb-wizard-panel-heading">
            <div><span className="wb-overline">STEP {String(phase+1).padStart(2,'0')} · {phases[phase].title.toUpperCase()}</span>
              <h3 id="wb-wizard-panel-title" tabIndex={-1}>{panelTitle}</h3></div>
            {phase>0&&<button type="button" className="wb-wizard-change" onClick={()=>setPhase(0)}>Change capability</button>}
          </div>
          {recovery&&<p className="wb-route-recovery" role="note"><strong>Shared link adjusted:</strong> {recovery}</p>}

          {phase===0&&<div className="wb-phase-choose">
            <p className="wb-wizard-lead">Choose what you want to add to your Java application. Each capability opens its own continuous guide—not a separate catalog or a generic simulator.</p>
            <div className="wb-capability-grid" aria-label="Published Kernel capabilities">
              {capabilityGuides.map((item,i)=>{
                const record=capabilities.find(c=>c.title===item.title);
                return <button type="button" className={'wb-capability-card'+(guide.id===item.id?' is-selected':'')} key={item.id}
                  aria-pressed={guide.id===item.id} onClick={()=>selectCapability(item.id)}>
                  <span className="wb-capability-card-top">{String(i+1).padStart(2,'0')} · {record.category}</span>
                  <strong>{item.title}</strong><small>{record.summary}</small>
                  <span className="wb-capability-card-state">{record.status}</span>
                </button>;
              })}
            </div>
          </div>}

          {phase===1&&<div className="wb-phase-understand">
            <p className="wb-wizard-lead">{capability.summary}</p>
            <div className="wb-wizard-two-col">
              <div className="wb-wizard-info">
                <span className="wb-wizard-info-kicker">SHIPS IN v{version}</span><h4>What Kernel provides</h4>
                <p>{capability.ships}</p>
              </div>
              <div className="wb-wizard-info">
                <span className="wb-wizard-info-kicker">APPLICATION RESPONSIBILITY</span><h4>What stays with your product</h4>
                <p>{capability.needs}</p>
              </div>
            </div>
            <p className="wb-wizard-caution">Kernel is an embedded Java library, not an IAM server, File Storage replacement, workflow engine or shared business database.</p>
            <div className="wb-wizard-read-more"><a href="#/reference/capabilities">Full capability reference</a><a href={source(capability.path)} target="_blank" rel="noopener noreferrer">Published v{version} source <span aria-hidden="true">↗</span></a></div>
          </div>}

          {phase===2&&<div className="wb-phase-prepare">
            <p className="wb-wizard-lead">Review the prerequisites before integrating. Checkboxes are your own planning notes, not an automated environment or security check.</p>
            <div className="wb-prerequisite-list">
              {guide.prepare.map((item,i)=><label className={'wb-prerequisite'+(readiness[guide.id+':'+i]?' is-ready':'')} key={item}>
                <input type="checkbox" checked={!!readiness[guide.id+':'+i]} onChange={e=>setReadiness(prev=>({...prev,[guide.id+':'+i]:e.target.checked}))}/>
                <span><strong>{i+1<10?'0'+(i+1):i+1} · {i===0?'Environment':i===1?'Integration inputs':'Ownership & safety'}</strong><small>{item}</small></span>
              </label>)}
            </div>
            <div className="wb-prepare-progress"><strong>{readyCount}/{guide.prepare.length} items self-marked ready</strong><span>You can continue without marking items complete. Verification belongs in your application.</span></div>
          </div>}

          {phase===3&&<div className="wb-phase-explore">
            <p className="wb-wizard-lead">Use these publicly documented outcomes to check your integration. The browser never executes Java, IAM verification, SQL or file operations, and it does not expose an internal execution trace.</p>
            <h4>What your consumer must verify</h4>
            <ul className="wb-process-list" aria-label="Consumer verification requirements">
              {guide.verify.map((item,i)=><li key={item}><span className="wb-process-number">{String(i+1).padStart(2,'0')}</span><div><p>{item}</p></div></li>)}
            </ul>
            {guide.mode?<>
              <div className="wb-walkthrough-header">
                <div><span className="wb-overline">PUBLISHED CONTRACT / ILLUSTRATIVE RESULT</span><h4>Check a {guide.title.toLowerCase()} outcome</h4></div>
                <span className="wb-mode-tag">{guide.mode==='mutation'?'Optional JDBC':guide.mode==='request'?'Request boundary':'Core library'}</span>
              </div>
              {guide.mode==='request'&&<div className="wb-scope-picker">
                <strong>Endpoint policy</strong>
                <div className="wb-scope-options">
                  <button type="button" aria-pressed={scope==='scoped'} className={scope==='scoped'?'is-selected':''} onClick={()=>changeScope('scoped')}>Tenant-scoped</button>
                  <button type="button" aria-pressed={scope==='tenantless'} className={scope==='tenantless'?'is-selected':''} onClick={()=>changeScope('tenantless')}>Tenantless</button>
                </div>
              </div>}
              <div className="wb-scenario-options" aria-label="Supported scenarios">
                {scenarioList.map(item=><button type="button" key={item.id} aria-pressed={item.id===activeScenario}
                  className={'wb-scenario'+(item.id===activeScenario?' is-selected':'')} onClick={()=>changeScenario(item.id)}>
                  <span className="wb-radio" aria-hidden="true"/><span><strong>{item.title}</strong><small>{item.hint}</small></span>
                </button>)}
              </div>
              <section className="wb-result-card" aria-labelledby="wb-result-title">
                <div className="wb-result-topline"><span className="wb-overline">EXPECTED CONTRACT OUTCOME</span><span>Illustrative · not executed</span></div>
                <div className="wb-trace-heading">
                  <h4 id="wb-result-title" tabIndex={-1}>{scenarioList.find(x=>x.id===activeScenario)?.title}</h4>
                  <span className={'wb-outcome'+(blocked?' is-blocked':'')+(result.outcome==='IN PROGRESS'?' is-pending':'')}>{result.outcome}</span>
                </div>
                <p className="wb-result-detail">{result.detail}</p>
                <div className="wb-result-facts">
                  <div><span>Responsible owner</span><strong>{result.owner}</strong></div>
                  <div><span>Consumer verification</span><strong>{result.verify}</strong></div>
                </div>
                {failureInfo&&<aside className="wb-request-recovery" aria-label="Failure diagnosis and safe recovery">
                  <div className="wb-request-recovery-head">
                    <strong>Diagnosis: {failureInfo.failure}</strong>
                    <span>HTTP {failureInfo.http}</span>
                  </div>
                  <p><strong>Responsible owner:</strong> {failureInfo.owner}</p>
                  <p><strong>How to recover:</strong> {failureInfo.recovery}</p>
                  <p className="wb-request-safe-ids">Use safe request_id and correlation_id for diagnosis. Never log tokens, raw claims or sensitive resource payloads.</p>
                  <a href="#/docs/request?section=failures">Review published failure mapping and recovery →</a>
                </aside>}
                <div className="wb-result-actions">
                  <a className="wb-result-primary" href={'#/docs/'+guide.guideId}>Read the published guide →</a>
                  <button type="button" onClick={()=>setPhase(4)}>Get implementation steps <span aria-hidden="true">→</span></button>
                </div>
              </section>
              <p className="wb-status-announcement visually-hidden" role="status" aria-atomic="true">{guide.title}. {result.outcome}. {result.verify}</p>
              <p className="wb-flow-summary">Contract outcomes explain required consumer behavior, not Kernel's internal execution order. Verify the published APIs against your own environment.</p>
            </>:<div className="wb-guide-only"><strong>Contract-led walkthrough</strong><p>{guide.limitation}</p><a href={source(capability.path)} target="_blank" rel="noopener noreferrer">Inspect the published contract <span aria-hidden="true">↗</span></a></div>}
          </div>}

          {phase===4&&<div className="wb-phase-implement">
            <p className="wb-wizard-lead">Use only the published v{version} artifacts. Maven entries are dependency fragments; integration excerpts require application-owned ports and wiring.</p>
            {runnableCore&&<section className="wb-first-run" aria-labelledby="wb-first-run-title">
              <span className="wb-overline">FIRST PUBLISHED-JAR RESULT · NO SERVER REQUIRED</span>
              <h4 id="wb-first-run-title">Run your first complete Java 21 program</h4>
              <ol>
                <li>Check <code>java -version</code> and <code>javac -version</code> (JDK 21 or newer).</li>
                <li>Select <strong>Java 21 · complete</strong> below. Save the exact code as <code>FirstKernelProgram.java</code>.</li>
                <li>Select <strong>macOS / Linux</strong> or <strong>Windows</strong>. Run the commands from the same directory as the saved file.</li>
                <li>Verify exactly two lowercase UUIDv7 values, one per line. Both change on every run.</li>
              </ol>
              <p>These commands download the released core JAR from Maven Central; Maven/Gradle projects can instead use the existing-project dependency fragment. No IAM, JDBC, database, or hosted Kernel service is needed.</p>
              <a href="#/docs/first">Full first-program guide, expected output and troubleshooting →</a>
            </section>}
            <div className="wb-export" id="workbench-output">
              <div className="wb-export-head"><div><span className="wb-overline">PUBLISHED LIBRARY / INTEGRATION RECIPE</span><h4 id="wb-code-heading" tabIndex={-1}>{recipe.artifacts.join(' + ')}</h4></div><span className="wb-published">v{version} / RELEASED</span></div>
              <div className="wb-export-grid">
                <div className="wb-code-pane">
                  <div className="wb-code-tabs"><div role="group" aria-label="Published code type">
                    {codeChoices.map(item=><button type="button" key={item.id} aria-pressed={selectedCode.id===item.id}
                      className={selectedCode.id===item.id?'is-selected':''} onClick={()=>{setCodeTab(item.id);setCopyStatus('')}}>{item.label}</button>)}
                    </div><div className="wb-code-actions"><button type="button" className="wb-copy" onClick={copyCode}>Copy code</button><button type="button" className="wb-select-code" onClick={selectCode}>Select code</button></div>
                  </div>
                  <div className="wb-code-kind">{selectedCode.filename} · {selectedCode.kind} · v{version}</div>
                  <pre ref={codePreRef} tabIndex={0} aria-label={selectedCode.filename+' code, scroll horizontally if needed'}><code>{tokenizeCode(code,selectedCode.language).map((part,i)=>part.kind?<span key={i} className={'tok-'+part.kind}>{part.text}</span>:part.text)}</code></pre>
                  <p className="wb-copy-feedback" role="status">{copyStatus}</p>
                </div>
                <div className="wb-check-pane">
                  <span className="wb-overline">CHECK IN YOUR APPLICATION</span>
                  <ul>{guide.verify.map(item=><li key={item}>{item}</li>)}</ul>
                  <p><strong>Application supplies</strong>{capability.needs}</p>
                  {guide.mode==='request'&&<p><strong>Request wiring</strong>Select the Wiring excerpt tab to see the published four-port RequestContextPipeline constructor. The real verifier, membership, entitlement and domain authorization ports must be supplied by your application.</p>}
                  {guide.mode&&<p><strong>Example scope</strong>{runnableCore?
                    'The complete FirstKernelProgram.java is runnable against the published JAR. The browser does not execute it.':
                    'The Java snippet is an integration excerpt for the '+(guide.mode==='request'?'request':'JDBC')+' pattern, not a complete executable application or execution of the selected scenario.'}</p>}
                  {runnableCore&&<p><strong>Expected output</strong>{firstProgram.expectedOutput}</p>}
                  {!guide.mode&&<p><strong>Contract-only evidence</strong>{guide.limitation}</p>}
                  <a href={'#/docs/'+guide.guideId}>Read the matching on-site guide →</a>
                </div>
              </div>
              <p className="wb-footnote">The browser does not run Kernel logic or certify tenant isolation, authorization, persistence, file access, telemetry or test acceptance.</p>
            </div>
            <div className="wb-wizard-read-more"><a href={source(capability.path)} target="_blank" rel="noopener noreferrer">Released source <span aria-hidden="true">↗</span></a><a href="#/reference/releases">Release and evidence status</a></div>
          </div>}

          <div className="wb-wizard-footer">
            <button type="button" className="wb-wizard-previous" disabled={phase===0} onClick={()=>setPhase(phase-1)}>← Previous step</button>
            <span>{phase+1} of {phases.length} · {guide.title}</span>
            {phase<phases.length-1?<button type="button" className="wb-wizard-next" onClick={()=>setPhase(phase+1)}>Next: {phases[phase+1].title} <span aria-hidden="true">→</span></button>:
              <button type="button" className="wb-wizard-next" onClick={()=>setPhase(0)}>Explore another capability <span aria-hidden="true">→</span></button>}
          </div>
        </div>
      </div>
    </div>
  </section>;
}
