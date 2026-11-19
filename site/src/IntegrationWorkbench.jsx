import React,{useState,useEffect,useRef} from 'react';
import {version,source,capabilities} from './data.mjs';
import {capabilityGuides,capabilityGuide,inferCapability} from './capability-guides.mjs';
import {getWorkbenchTrace,getWorkbenchRecipe,scenariosFor} from './workbench-data.mjs';
import {developerGuides} from './docs-data.mjs';
import {tokenizeCode} from './code-tokens.mjs';
import './kernel-workbench.css';

const phases=[
  {title:'Choose',hint:'Pick a capability'},
  {title:'Understand',hint:'What it provides'},
  {title:'Prepare',hint:'What you need'},
  {title:'Explore',hint:'How it works'},
  {title:'Implement',hint:'Use and verify'}
];
const stepLabels={done:'Passed',blocked:'Stopped here',skipped:'Not required',pending:'Not reached'};
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
  const [selection,setSelection]=useState({key:'',step:0});
  const [readiness,setReadiness]=useState({});
  const [codeTab,setCodeTab]=useState('maven');
  const [copyStatus,setCopyStatus]=useState('');
  const focusReady=useRef(false);

  // Each route history visit starts its trace at decision 1, even on Back.
  const scenarioList=guide.mode?scenariosFor(guide.mode,scope).filter(s=>guide.scenarios.includes(s.id)):[];
  const activeScenario=scenarioList.some(s=>s.id===scenario)?scenario:(scenarioList[0]?.id||'success');
  const trace=guide.mode?getWorkbenchTrace(guide.mode,scope,activeScenario):null;
  const recipe=getWorkbenchRecipe(guide.mode||'core',scope,guide.testkit===true);
  const currentStep=trace?Math.min(selection.key===visitId?selection.step:0,trace.steps.length-1):0;
  const selectTraceStep=n=>setSelection({key:visitId,step:Math.max(0,Math.min(n,trace.steps.length-1))});
  const inspected=trace?.steps[currentStep];
  const blocked=trace?.steps.some(x=>x.state==='blocked');
  const spotlightIndex=trace?Math.max(0,trace.steps.findIndex(x=>x.state==='blocked')>=0?
    trace.steps.findIndex(x=>x.state==='blocked'):guide.id==='idempotency'&&activeScenario==='replay'?1:trace.steps.length-1):0;
  const spotlight=trace?.steps[spotlightIndex];
  const readyCount=guide.prepare.filter((_,i)=>readiness[guide.id+':'+i]).length;
  // Keep the first runnable program and OS commands identical to the tested
  // published website guide; never fork these samples into wizard-owned text.
  const firstProgram=developerGuides.find(item=>item.id==='first');
  // Use the same published request failure matrix as the Documentation guide.
  // Failure/HTTP mappings are only explanatory; the browser never validates IAM
  // credentials or queries a consuming product's records.
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
    phase===3?'How '+guide.title+' works':
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
  function inspectSpotlight(){
    selectTraceStep(spotlightIndex);
    document.getElementById('wb-inspection-heading')?.focus({preventScroll:true});
    document.getElementById('wb-inspection-heading')?.scrollIntoView({block:'nearest',behavior:'instant'});
  }
  async function copyCode(){
    try{
      if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');
      await navigator.clipboard.writeText(code);
      setCopyStatus('Copied '+selectedCode.label+' to clipboard.');
    }catch{
      setCopyStatus('Clipboard unavailable. Select the example text to copy manually.');
    }
  }

  return <section id="workbench" className="section wb-section" aria-labelledby="workbench-title">
    <div className="wrap">
      <div className="wb-intro wb-wizard-intro">
        <span className="wb-kicker">GUIDED INTEGRATION / PUBLISHED v{version}</span>
        <h2 id="workbench-title" tabIndex={-1}>From capability <em>to integration.</em></h2>
        <p className="lead">One guided path: discover what the library provides, prepare your application, inspect the relevant behavior, and leave with the released code and checks.</p>
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
            <p className="wb-wizard-lead">Follow the capability-specific integration sequence. The browser explains the contracts; it never executes real Java, identity verification, SQL or file operations.</p>
            <ol className="wb-process-list">
              {guide.process.map((item,i)=><li key={item.name}><span className="wb-process-number">{String(i+1).padStart(2,'0')}</span><div><h4>{item.name}</h4><small>{item.owner}</small><p>{item.detail}</p></div></li>)}
            </ol>
            {guide.mode?<>
              <div className="wb-walkthrough-header">
                <div><span className="wb-overline">SCENARIO / DETERMINISTIC SIMULATION</span><h4>Explore a {guide.title.toLowerCase()} scenario</h4></div>
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
                <div className="wb-result-topline"><span className="wb-overline">SIMULATED OUTCOME</span><span>Illustrative · not executed</span></div>
                <div className="wb-trace-heading">
                  <h4 id="wb-result-title" tabIndex={-1}>{scenarioList.find(x=>x.id===activeScenario)?.title}</h4>
                  <span className={'wb-outcome'+(blocked?' is-blocked':'')+(trace.outcome==='IN PROGRESS'?' is-pending':'')}>{trace.outcome}</span>
                </div>
                <p className="wb-result-detail">{trace.detail}</p>
                <div className="wb-result-facts">
                  <div><span>{blocked?'Stopped at':'Focus decision'}</span><strong>{spotlight.name}</strong></div>
                  <div><span>Responsible owner</span><strong>{spotlight.owner}</strong></div>
                </div>
                {failureInfo&&<aside className="wb-request-recovery" aria-label="Failure diagnosis and safe recovery">
                  <div className="wb-request-recovery-head">
                    <strong>Diagnosis: {failureInfo.failure}</strong>
                    <span>HTTP {failureInfo.http}</span>
                  </div>
                  <dl>
                    <div><dt>Stopped at</dt><dd>{failureInfo.gate}</dd></div>
                    <div><dt>Responsible owner</dt><dd>{failureInfo.owner}</dd></div>
                  </dl>
                  <p><strong>How to recover:</strong> {failureInfo.recovery}</p>
                  <p className="wb-request-safe-ids">Use safe request_id and correlation_id to trace this denial. Never log tokens, raw claims or sensitive resource payloads.</p>
                  <a href="#/docs/request?section=failures">Review published failure mapping and recovery →</a>
                </aside>}
                <div className="wb-result-actions">
                  <button type="button" className="wb-result-primary" onClick={inspectSpotlight}>Inspect this decision <span aria-hidden="true">→</span></button>
                  <button type="button" onClick={()=>setPhase(4)}>Get implementation steps <span aria-hidden="true">→</span></button>
                </div>
              </section>
              <p className="wb-status-announcement visually-hidden" role="status" aria-atomic="true">{guide.title}. {trace.outcome}. Decision {currentStep+1} of {trace.steps.length}: {inspected.name}, {stepLabels[inspected.state]}.</p>
              <p className="wb-flow-summary">{trace.steps.length} ordered decisions. Select a decision to see its source-grounded owner, check and result.</p>
              <div className="wb-trace-layout">
                <ol className="wb-track" aria-label="Ordered request decisions">
                  {trace.steps.map((item,i)=><li key={item.name} data-state={item.state}>
                    <button type="button" className={'wb-trace-step'+(i===currentStep?' is-current':'')}
                      aria-current={i===currentStep?'step':undefined} aria-controls="wb-inspection"
                      aria-label={'Step '+(i+1)+': '+item.name+', '+stepLabels[item.state]} onClick={()=>selectTraceStep(i)}>
                      <span className="wb-trace-number">{String(i+1).padStart(2,'0')}</span><span className="wb-trace-name">{item.name}</span><span className="wb-trace-state">{stepLabels[item.state]}</span>
                    </button>
                  </li>)}
                </ol>
                <section className="wb-inspection" id="wb-inspection" aria-labelledby="wb-inspection-heading">
                  <span className="wb-inspection-tag">DECISION {currentStep+1} OF {trace.steps.length}</span>
                  <span className={'wb-inspection-state is-'+inspected.state}>{stepLabels[inspected.state]}</span>
                  <h4 id="wb-inspection-heading" tabIndex={-1}>{inspected.name}</h4>
                  <div className="wb-decision-detail"><strong>What is checked?</strong><p>{inspected.check}</p></div>
                  <div className="wb-decision-detail"><strong>Why this result?</strong><p>{inspected.description}</p></div>
                  <div className="wb-decision-detail"><strong>Who owns this?</strong><p>{inspected.owner}</p></div>
                  <div className="wb-trace-actions">
                    <button type="button" disabled={currentStep===0} onClick={()=>selectTraceStep(currentStep-1)}>← Previous</button>
                    <button type="button" className="wb-next" disabled={currentStep===trace.steps.length-1} onClick={()=>selectTraceStep(currentStep+1)}>Next decision →</button>
                  </div>
                </section>
              </div>
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
                    </div><button type="button" className="wb-copy" onClick={copyCode}>Copy code</button>
                  </div>
                  <div className="wb-code-kind">{selectedCode.filename} · {selectedCode.kind} · v{version}</div>
                  <pre tabIndex={0} aria-label={selectedCode.filename+' code, scroll horizontally if needed'}><code>{tokenizeCode(code,selectedCode.language).map((part,i)=>part.kind?<span key={i} className={'tok-'+part.kind}>{part.text}</span>:part.text)}</code></pre>
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
