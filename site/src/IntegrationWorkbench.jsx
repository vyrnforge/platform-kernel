import React, {useState} from 'react';
import {repo,version} from './data.mjs';
import {getWorkbenchTrace,getWorkbenchRecipe,workbenchModes,workbenchScenarios} from './workbench-data.mjs';
import {tokenizeCode} from './code-tokens.mjs';
import './kernel-workbench.css';

export function IntegrationWorkbench(){
  const [mode,setMode]=useState('core');
  const [scope,setScope]=useState('scoped');
  const [scenario,setScenario]=useState('success');
  const [activeStep,setActiveStep]=useState(0);
  const [testkit,setTestkit]=useState(false);
  const [codeTab,setCodeTab]=useState('maven');
  const [copyStatus,setCopyStatus]=useState('');
  const trace=getWorkbenchTrace(mode,scope,scenario);
  const recipe=getWorkbenchRecipe(mode,scope,testkit);
  const scenarios=workbenchScenarios[mode];
  const current=trace.steps[activeStep];
  const code=codeTab==='maven'?recipe.maven:recipe.java;
  const modeInfo=workbenchModes.find(x=>x.id===mode);
  const blocked=trace.outcome.startsWith('DENIED')||trace.outcome.startsWith('REJECTED')||trace.outcome.startsWith('CONFLICT');

  function selectMode(next){setMode(next);setScenario('success');setActiveStep(0);setCodeTab('maven');setCopyStatus('')}
  function selectScope(next){setScope(next);setScenario('success');setActiveStep(0);setCopyStatus('')}
  function selectScenario(next){setScenario(next);setActiveStep(0)}
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
        <div><span className="wb-kicker">SIMULATED LEARNING / RELEASED v{version}</span>
          <h2 id="workbench-title">Trace a request. <em>Understand the boundary.</em></h2>
          <p className="lead">Select a scenario to understand where Kernel checks stop and application responsibilities begin. Copy released dependency or Java examples afterward.</p>
        </div>
        
      </div>
      <div className="wb-frame">
        <div className="wb-toolbar">
          <div className="wb-toolbar-title"><span className="wb-icon" aria-hidden="true">⌘</span><div><strong>Integration Playground</strong><small>Scenario walkthrough and code reference</small></div></div>
          <div className="wb-toolbar-right">Simulation · not executable Java <span className="wb-toolbar-version">v{version} published</span></div>
        </div>
        <div className="wb-layout">
          <aside className="wb-config" aria-label="Workbench configuration">
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
              <p>{scope==='scoped'?'One active tenant, membership and module guard.':'Still authenticated and authorized; no active tenant.'}</p>
            </fieldset>}
            <fieldset className="wb-fieldset">
              <legend><span>{mode==='request'?'03':'02'}</span> Try a scenario</legend>
              <div className="wb-scenario-options">{scenarios.map(item=><button type="button" key={item.id} className={'wb-scenario'+(scenario===item.id?' is-selected':'')} aria-pressed={scenario===item.id} onClick={()=>selectScenario(item.id)}>
                <span className="wb-radio" aria-hidden="true"/><span><strong>{item.title}</strong><small>{item.hint}</small></span>
              </button>)}</div>
            </fieldset>
            <label className="wb-testkit"><input type="checkbox" checked={testkit} onChange={e=>{setTestkit(e.target.checked);setCopyStatus('')}} /><span><strong>Include consumer testkit</strong><small>Test-scope dependency only</small></span></label>
            <div className="wb-aside-note"><span aria-hidden="true">◎</span><p>No account, backend, or sample credentials. This model is explanatory and does not execute Kernel APIs or prove production authorization.</p></div>
          </aside>
          <div className="wb-main">
            <div className="wb-stage-heading"><div><span className="wb-overline">COMPOSED ARCHITECTURE</span><h3>{modeInfo.title}<span className="wb-stage-slash"> / {mode==='request'?(scope==='scoped'?'tenant-scoped':'tenantless'):mode==='mutation'?'JDBC adapter':'zero infrastructure'}</span></h3></div><span className="wb-mode-tag">{modeInfo.badge}</span></div>
            <div className="wb-trace-heading"><div><span className="wb-overline">DECISION TRACE / SIMULATED</span><h4>{scenarios.find(x=>x.id===scenario)?.title}</h4></div><span className={'wb-outcome'+(blocked?' is-blocked':'')}>{trace.outcome}</span></div>
            <ol className="wb-track" aria-label="Walk through decision stages">
              {trace.steps.map((item,i)=><li key={item.name}><button type="button" aria-current={i===activeStep?'step':undefined} className={'wb-trace-step'+(i===activeStep?' is-current':'')+(item.state==='blocked'?' is-blocked':'')} onClick={()=>setActiveStep(i)}>
                <span className="wb-trace-number">{String(i+1).padStart(2,'0')}</span>
                <span className="wb-trace-name">{item.name}</span>
                <span className="wb-trace-state">{item.state==='blocked'?'Blocked':item.state==='skipped'?'Skipped':item.state==='pending'?'Not reached':'Stage '+(i+1)}</span>
              </button></li>)}
            </ol>
            <div className="wb-inspection" aria-live="polite">
              <div><span className="wb-inspection-tag">INSPECTING STEP {activeStep+1} OF {trace.steps.length}</span><h4>{current.name}</h4><p>{current.description}</p><span className="wb-owner">Owner: {current.owner}</span></div>
              <div className="wb-trace-actions"><button type="button" onClick={()=>setActiveStep(0)} disabled={activeStep===0}>↺ Reset</button><button type="button" className="wb-next" onClick={()=>setActiveStep(x=>Math.min(x+1,trace.steps.length-1))} disabled={activeStep===trace.steps.length-1}>Next stage <span aria-hidden="true">→</span></button></div>
            </div>
            <p className="wb-outcome-note"><strong>Result:</strong> {trace.detail}</p>
            <div className="wb-export" id="workbench-output">
              <div className="wb-export-head"><div><span className="wb-overline">YOUR STARTER RECIPE</span><h4>{recipe.artifacts.length} {recipe.artifacts.length===1?'artifact':'artifacts'} · Java 21+</h4></div><span className="wb-published">● v{version} / RELEASED</span></div>
              <div className="wb-export-grid">
                <div className="wb-code-pane"><div className="wb-code-tabs"><div role="group" aria-label="Generated code type"><button type="button" aria-pressed={codeTab==='maven'} className={codeTab==='maven'?'is-selected':''} onClick={()=>{setCodeTab('maven');setCopyStatus('')}}>pom.xml</button><button type="button" aria-pressed={codeTab==='java'} className={codeTab==='java'?'is-selected':''} onClick={()=>{setCodeTab('java');setCopyStatus('')}}>Java example</button></div><button type="button" className="wb-copy" onClick={copyCode}>Copy <span aria-hidden="true">↗</span></button></div>
                  <div className="wb-code-kind">{codeTab==='maven'?'Maven coordinates · published artifacts only':recipe.javaKind}</div><pre tabIndex={0} aria-label="Generated code, scroll horizontally if needed"><code>{tokenizeCode(code,codeTab==='maven'?'xml':'java').map((part,i)=>part.kind?<span key={i} className={'tok-'+part.kind}>{part.text}</span>:part.text)}</code></pre><p className="wb-copy-feedback" role="status">{copyStatus}</p>
                </div>
                <div className="wb-check-pane"><span className="wb-overline">INTEGRATION CHECKLIST</span><ul>{recipe.checks.map(x=><li key={x}>{x}</li>)}</ul><p><strong>Your application owns</strong>{recipe.appOwnership}</p><a href={repo+'/blob/main/'+recipe.guide} target="_blank" rel="noopener noreferrer">Open the integration guide <span aria-hidden="true">↗</span></a></div>
              </div>
              <p className="wb-footnote">Code is derived from published v{version} usage guidance. Java excerpts need application-provided ports and wiring. Simulated decisions are not live security tests, and all production claims require consumer-specific verification.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>;
}
