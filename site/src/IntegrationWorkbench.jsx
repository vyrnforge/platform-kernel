import React,{useState} from 'react';
import {version} from './data.mjs';
import {getWorkbenchTrace,getWorkbenchRecipe,workbenchModes,scenariosFor} from './workbench-data.mjs';
import {tokenizeCode} from './code-tokens.mjs';
import './kernel-workbench.css';

const stepLabels={done:'Passed',blocked:'Stopped here',skipped:'Not required',pending:'Not reached'};

export function IntegrationWorkbench({mode='core',scope='scoped',scenario='success',recovery=null}){
  const [selection,setSelection]=useState({key:'',step:0});
  const [testkit,setTestkit]=useState(false);
  const [codeTab,setCodeTab]=useState('maven');
  const [copyStatus,setCopyStatus]=useState('');
  const trace=getWorkbenchTrace(mode,scope,scenario);
  const recipe=getWorkbenchRecipe(mode,scope,testkit);
  const scenarios=scenariosFor(mode,scope);
  // A route change selects its first gate synchronously, avoiding stale inspector
  // announcements before effects run. Stage navigation is local to one route.
  const routeKey=[mode,scope,scenario].join('|');
  const stepIndex=selection.key===routeKey?Math.min(selection.step,trace.steps.length-1):0;
  const selectStep=next=>setSelection({key:routeKey,step:Math.max(0,Math.min(next,trace.steps.length-1))});
  const current=trace.steps[stepIndex];
  const code=codeTab==='maven'?recipe.maven:recipe.java;
  const modeInfo=workbenchModes.find(x=>x.id===mode);
  const blocked=trace.steps.some(x=>x.state==='blocked');
  const paused=trace.outcome==='IN PROGRESS';
  const passed=trace.steps.filter(x=>x.state==='done').length;
  const skipped=trace.steps.filter(x=>x.state==='skipped').length;

  // The URL is the source of truth for mode/scope/scenario. Local stage selection
  // does not modify history. Code-copy feedback is reset only by user actions.
  function navigate(nextMode,nextScope,nextScenario){
    setCopyStatus('');
    window.location.hash='#/playground?mode='+nextMode+'&scope='+nextScope+'&scenario='+nextScenario;
  }
  function selectMode(next){
    setCodeTab('maven');
    navigate(next,'scoped','success');
  }
  function selectScope(next){navigate(mode,next,'success')}
  function selectScenario(next){navigate(mode,scope,next)}
  async function copyCode(){
    try{
      if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');
      await navigator.clipboard.writeText(code);
      setCopyStatus('Copied '+(codeTab==='maven'?'Maven dependencies':'Java example')+' to clipboard.');
    }catch{setCopyStatus('Clipboard unavailable. Select the example text to copy manually.')}
  }

  return <section id="workbench" className="section wb-section" aria-labelledby="workbench-title">
    <div className="wrap">
      <div className="wb-intro">
        <div>
          <span className="wb-kicker">SIMULATED LEARNING / RELEASED v{version}</span>
          <h2 id="workbench-title" tabIndex={-1}>Trace a request. <em>Understand the boundary.</em></h2>
          <p className="lead">Follow one real integration path at a time. Inspect each decision, who owns it and where failures stop the application. The sample code stays pinned to the published library.</p>
        </div>
      </div>
      <div className="wb-frame">
        <div className="wb-toolbar">
          <div className="wb-toolbar-title"><span className="wb-icon" aria-hidden="true">⌘</span><div><strong>Integration Playground</strong><small>Choose a path · inspect a decision · verify in your application</small></div></div>
          <div className="wb-toolbar-right">Simulation, not executable Java <span className="wb-toolbar-version">v{version} published</span></div>
        </div>
        <div className="wb-layout">
          <aside className="wb-config" aria-label="Playground scenario configuration">
            <fieldset className="wb-fieldset">
              <legend><span>01</span> Choose your application pattern</legend>
              <div className="wb-profile-options">
                {workbenchModes.map(item=><button key={item.id} type="button" className={'wb-profile'+(mode===item.id?' is-selected':'')} aria-pressed={mode===item.id} onClick={()=>selectMode(item.id)}>
                  <span className="wb-profile-number">{item.number}</span>
                  <span><strong>{item.title}</strong><small>{item.subtitle}</small></span>
                  <span className="wb-profile-check" aria-hidden="true">{mode===item.id?'✓':'+'}</span>
                </button>)}
              </div>
            </fieldset>
            {mode==='request'&&<fieldset className="wb-fieldset wb-scope-set">
              <legend><span>02</span> Select endpoint scope</legend>
              <div className="wb-scope-options">
                <button type="button" className={scope==='scoped'?'is-selected':''} aria-pressed={scope==='scoped'} onClick={()=>selectScope('scoped')}>Tenant-scoped</button>
                <button type="button" className={scope==='tenantless'?'is-selected':''} aria-pressed={scope==='tenantless'} onClick={()=>selectScope('tenantless')}>Tenantless</button>
              </div>
              <p>{scope==='scoped'?'Requires active tenant, membership and enabled module.':'Still authenticated and domain-authorized. No active tenant.'}</p>
            </fieldset>}
            <fieldset className="wb-fieldset">
              <legend><span>{mode==='request'?'03':'02'}</span> Try a scenario</legend>
              <div className="wb-scenario-options">{scenarios.map(item=><button type="button" key={item.id} className={'wb-scenario'+(scenario===item.id?' is-selected':'')} aria-pressed={scenario===item.id} onClick={()=>selectScenario(item.id)}>
                <span className="wb-radio" aria-hidden="true"/>
                <span><strong>{item.title}</strong><small>{item.hint}</small></span>
              </button>)}</div>
            </fieldset>
            <label className="wb-testkit"><input type="checkbox" checked={testkit} onChange={e=>{setTestkit(e.target.checked);setCopyStatus('')}}/><span><strong>Include consumer testkit</strong><small>Test-scope dependency only</small></span></label>
            <p className="wb-aside-note">Scenarios are deterministic explanations. No credentials, database writes or Kernel APIs run in this browser. Production authorization must be tested in your application.</p>
          </aside>
          <div className="wb-main">
            <div className="wb-stage-heading">
              <div><span className="wb-overline">CURRENT INTEGRATION PATH</span><h3>{modeInfo.title}<span className="wb-stage-slash"> / {mode==='request'?(scope==='scoped'?'tenant-scoped':'tenantless'):mode==='mutation'?'optional JDBC':'core only'}</span></h3></div>
              <span className="wb-mode-tag">{modeInfo.badge}</span>
            </div>
            <div className="wb-trace-heading">
              <div><span className="wb-overline">REQUEST / DECISION WALKTHROUGH</span><h4>{scenarios.find(x=>x.id===scenario)?.title}</h4></div>
              <span className={'wb-outcome'+(blocked?' is-blocked':'')+(paused?' is-pending':'')}>{trace.outcome}</span>
            </div>
            {recovery&&<p className="wb-route-recovery" role="note"><strong>Shared link adjusted:</strong> {recovery}</p>}
            <p className="wb-status-announcement visually-hidden" role="status" aria-atomic="true">{modeInfo.title}, {scenarios.find(x=>x.id===scenario)?.title}. {trace.outcome}. Decision {stepIndex+1} of {trace.steps.length}: {current.name}, {stepLabels[current.state]}.</p>
            <p className="wb-flow-summary">{trace.steps.length} decisions · {passed} passed{skipped?', '+skipped+' not required':''}{blocked?', stopped at the highlighted gate':''}. Select a stage to inspect the exact responsibility.</p>
            <div className="wb-trace-layout">
              <ol className="wb-track" aria-label="Ordered request decisions">
                {trace.steps.map((item,i)=><li key={item.name} data-state={item.state}>
                  <button type="button" aria-current={i===stepIndex?'step':undefined} aria-controls="wb-inspection" aria-label={'Step '+(i+1)+': '+item.name+', '+stepLabels[item.state]} className={'wb-trace-step'+(i===stepIndex?' is-current':'')} onClick={()=>selectStep(i)}>
                    <span className="wb-trace-number">{String(i+1).padStart(2,'0')}</span>
                    <span className="wb-trace-name">{item.name}</span>
                    <span className="wb-trace-state">{stepLabels[item.state]}</span>
                  </button>
                </li>)}
              </ol>
              <section id="wb-inspection" className="wb-inspection" aria-labelledby="wb-inspection-heading">
                <span className="wb-inspection-tag">DECISION {stepIndex+1} OF {trace.steps.length}</span>
                <span className={'wb-inspection-state is-'+current.state}>{stepLabels[current.state]}</span>
                <h4 id="wb-inspection-heading">{current.name}</h4>
                <div className="wb-decision-detail"><strong>What is checked?</strong><p>{current.check}</p></div>
                <div className="wb-decision-detail"><strong>Why this result?</strong><p>{current.description}</p></div>
                <div className="wb-decision-detail"><strong>Who owns this?</strong><p>{current.owner}</p></div>
                <div className="wb-trace-actions">
                  <button type="button" aria-controls="wb-inspection" onClick={()=>selectStep(stepIndex-1)} disabled={stepIndex===0}>← Previous</button>
                  <button type="button" className="wb-next" aria-controls="wb-inspection" onClick={()=>selectStep(stepIndex+1)} disabled={stepIndex===trace.steps.length-1}>Next decision <span aria-hidden="true">→</span></button>
                </div>
              </section>
            </div>
            <p className="wb-outcome-note"><strong>Outcome explained:</strong> {trace.detail}</p>
            <div className="wb-export" id="workbench-output">
              <div className="wb-export-head"><div><span className="wb-overline">START WITH THE PUBLISHED LIBRARY</span><h4>{recipe.artifacts.length} {recipe.artifacts.length===1?'artifact':'artifacts'} · Java 21+</h4></div><span className="wb-published">v{version} / RELEASED</span></div>
              <div className="wb-export-grid">
                <div className="wb-code-pane">
                  <div className="wb-code-tabs"><div role="group" aria-label="Generated code type"><button type="button" aria-pressed={codeTab==='maven'} className={codeTab==='maven'?'is-selected':''} onClick={()=>{setCodeTab('maven');setCopyStatus('')}}>pom.xml</button><button type="button" aria-pressed={codeTab==='java'} className={codeTab==='java'?'is-selected':''} onClick={()=>{setCodeTab('java');setCopyStatus('')}}>Java example</button></div><button type="button" className="wb-copy" onClick={copyCode}>Copy code</button></div>
                  <div className="wb-code-kind">{codeTab==='maven'?'Maven dependency fragments · v'+version:recipe.javaKind}</div>
                  <pre tabIndex={0} aria-label="Generated code, scroll horizontally if needed"><code>{tokenizeCode(code,codeTab==='maven'?'xml':'java').map((part,i)=>part.kind?<span key={i} className={'tok-'+part.kind}>{part.text}</span>:part.text)}</code></pre>
                  <p className="wb-copy-feedback" role="status">{copyStatus}</p>
                </div>
                <div className="wb-check-pane">
                  <span className="wb-overline">VERIFY IN YOUR APPLICATION</span>
                  <ul>{recipe.checks.map(x=><li key={x}>{x}</li>)}</ul>
                  <p><strong>Your application owns</strong>{recipe.appOwnership}</p>
                  <a href={'#/docs/'+recipe.guideId}>Read the on-site integration guide →</a>
                </div>
              </div>
              <p className="wb-footnote">Examples use published v{version} APIs. Java excerpts require product-owned ports and wiring. The walkthrough never executes real Kernel logic or certifies tenant isolation, authorization or persistence.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>;
}
