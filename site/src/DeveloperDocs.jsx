import React,{useEffect,useMemo,useRef,useState} from 'react';
import {source,version} from './data.mjs';
import {developerGuides,searchDeveloperGuideMatches} from './docs-data.mjs';
import {tokenizeCode} from './code-tokens.mjs';
import {selectCodeText} from './code-selection.mjs';
import {PreviewGuide} from './PreviewGuide.jsx';
import {searchPreview} from './preview-data.mjs';
import './developer-docs.css';

const groups=['Getting started','Integrate','Test & operate'];

/* Section links reuse the existing validated Docs hash routes and heading IDs.
   Only longer implementation guides need a local reading path; short first-run
   guides retain their simpler one-column reading flow. */
const readingPath={
  request:[
    {id:'prerequisite',label:'Before you start'},
    {id:'steps',label:'Steps'},
    {id:'scope',label:'Choose scope'},
    {id:'failures',label:'Failure & recovery'},
    {id:'example',label:'Example'},
    {id:'verification',label:'Verify'},
    {id:'ownership',label:'Ownership'}
  ],
  jdbc:[
    {id:'prerequisite',label:'Before you start'},
    {id:'steps',label:'Steps'},
    {id:'decisions',label:'Decision outcomes'},
    {id:'recovery',label:'Recovery cases'},
    {id:'example',label:'Example'},
    {id:'troubleshooting',label:'Troubleshooting'},
    {id:'verification',label:'Verify'}
  ],
  assure:[
    {id:'prerequisite',label:'Before you start'},
    {id:'steps',label:'Test steps'},
    {id:'conformance',label:'Conformance checks'},
    {id:'example',label:'Testkit example'},
    {id:'verification',label:'Verify'},
    {id:'ownership',label:'Ownership'}
  ]
};


export function DeveloperDocs({guideId='install',section='overview',selectedSampleIndex=null,searchQuery=null}){
  const [query,setQuery]=useState(searchQuery||'');
  const searchInputRef=useRef(null);
  const codePreRef=useRef(null);
  const [sampleIndex,setSampleIndex]=useState(0);
  const [copyStatus,setCopyStatus]=useState('');
  const isPreview=guideId==='preview';
  const guide=developerGuides.find(x=>x.id===guideId)||developerGuides[0];
  const index=developerGuides.indexOf(guide);
  const sample=guide.samples[Math.min(sampleIndex,guide.samples.length-1)];
  const matches=useMemo(()=>searchDeveloperGuideMatches(query),[query]);
  const visible=matches.map(x=>x.guide);
  const previewVisible=useMemo(()=>searchPreview(query),[query]);
  useEffect(()=>{setSampleIndex(Number.isInteger(selectedSampleIndex)?selectedSampleIndex:0);setCopyStatus('')},[guideId,selectedSampleIndex]);
  useEffect(()=>{setQuery(searchQuery||'')},[guideId,searchQuery]);
  function selectSample(){
    const selected=selectCodeText(codePreRef.current);
    setCopyStatus(selected?
      'Code selected. Press Ctrl+C (Windows/Linux) or Command+C (macOS) to copy.':
      'Text selection unavailable. Focus the code block to select and copy manually.');
  }
  async function copySample(){
    try{
      if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');
      await navigator.clipboard.writeText(sample.code);
      setCopyStatus('Code copied.');
    }catch{
      const selected=selectCodeText(codePreRef.current);
      setCopyStatus(selected?
        'Clipboard permission unavailable. Code selected; press Ctrl+C or Command+C to copy.':
        'Clipboard permission unavailable. Use Select code or select the code block manually.');
    }
  }
  return <div className="docs-page content-surface">
    <div className="wrap docs-page-heading"><span className="eyebrow">DEVELOPER DOCUMENTATION / v{version} PUBLISHED · v0.4.0 STATUS</span><h1 id="page-title" tabIndex={-1}>Learn by building.</h1><p>Task-based guides for the real v{version} Java library. Each recipe states what the Kernel provides and what your application must implement.</p></div>
    <div className="wrap docs-layout">
      <aside className="docs-sidebar">
        <div className="docs-sidebar-top"><label htmlFor="guide-search">Search documentation</label><input type="search" id="guide-search" ref={searchInputRef} placeholder="Find a guide…" value={query} onChange={e=>setQuery(e.target.value)}/></div>
        <p className="docs-search-count" role="status">{visible.length+(previewVisible?1:0)} of {developerGuides.length+1} guides</p>
        <nav aria-label="Developer guide navigation" className="docs-guide-nav">
          {groups.map(group=>{
            const items=matches.filter(x=>x.guide.group===group);
            return items.length>0&&<div className="docs-guide-group" key={group}><h2>{group}</h2>{items.map(result=>{
              const item=result.guide;
              const params=new URLSearchParams();
              if(query.trim()){
                params.set('section',result.section);
                if(result.sampleIndex!==null)params.set('sample',String(result.sampleIndex));
                params.set('q',query.trim().slice(0,120));
              }
              const href='#/docs/'+item.id+(params.size?'?'+params.toString():'');
              return <a href={href} key={item.id} aria-current={!isPreview&&guide.id===item.id?'page':undefined}>
                <span className="docs-result-content"><strong>{item.title}</strong>{query.trim()&&<small>{result.label}: {result.excerpt}</small>}</span>
                <span className="docs-nav-arrow" aria-hidden="true">→</span>
              </a>;
            })}</div>;
          })}
        </nav>
        {previewVisible&&<div className="docs-preview-entry"><span className="side-kicker">UPCOMING · NOT PUBLISHED</span><a href="#/docs/preview" aria-current={isPreview?'page':undefined}>v0.4.0 Release Status <span aria-hidden="true">→</span></a></div>}
        {visible.length===0&&!previewVisible&&<p className="docs-search-empty">No matching guides. <button type="button" onClick={()=>{searchInputRef.current?.focus();setQuery('')}}>Clear search</button></p>}
        <div className="docs-sidebar-note"><strong>Version boundary</strong><p>Core guides use published v{version}. v0.4.0 is not released or installable; its public page shows status only.</p></div>
      </aside>
      {isPreview?<PreviewGuide/>:<article className="guide-article" aria-labelledby="guide-heading">
        <nav className="guide-breadcrumb" aria-label="Breadcrumb"><a href="#/docs/install">Documentation</a><span aria-hidden="true"> / </span><span>{guide.group}</span></nav>
        <div className="guide-topline"><span>Practical integration</span><span>v{version} · released APIs</span></div>
        <h2 id="guide-heading" tabIndex={-1}>{guide.title}</h2>
        <p className="guide-summary">{guide.summary}</p>
        {readingPath[guide.id]&&<nav className="guide-reading-path" aria-label="Sections in this guide">
          <span className="guide-reading-path-title">In this guide</span>
          <div className="guide-reading-path-links">
            {readingPath[guide.id].map(item=><a key={item.id}
              href={'#/docs/'+guide.id+'?section='+item.id}
              aria-current={section===item.id?'location':undefined}>{item.label}</a>)}
          </div>
        </nav>}
        <div className="guide-callout"><strong>When to use this</strong><p>{guide.when}</p><strong>What the Kernel provides</strong><p>{guide.provides}</p></div>
        <section className="guide-section"><h3 id="guide-prerequisite-heading" tabIndex={-1}>Before you start</h3><p>{guide.prerequisite}</p></section>
        <section className="guide-section"><h3 id="guide-steps-heading" tabIndex={-1}>Steps</h3><ol>{guide.steps.map((step,i)=><li key={i}>{step}</li>)}</ol></section>
        {guide.id==='request'&&<section className="request-decisions" aria-labelledby="request-choices-heading">
          <h3 id="request-choices-heading" tabIndex={-1}>Choose the right request scope</h3>
          <p>One verified identity can use either path, but a tenantless endpoint is never anonymous or a bypass for tenant-owned records. These are published v{version} rules.</p>
          <div className="request-scope-grid">{guide.endpointChoices.map(item=><section key={item.id}>
            <h4>{item.name}</h4><p><strong>When:</strong> {item.when}</p><p><strong>Policy:</strong> <code>{item.policy}</code></p><p><strong>Checks:</strong> {item.guards}</p><p><strong>Application owns:</strong> {item.ownership}</p>
            <a href={'#/playground?mode=request&scope='+item.id+'&scenario='+item.scenario}>See {item.name.toLowerCase()} usage example →</a>
          </section>)}</div>
        </section>}
        {guide.id==='request'&&<section className="request-decisions" aria-labelledby="request-denials-heading">
          <h3 id="request-denials-heading" tabIndex={-1}>Failure and recovery reference</h3>
          <p>Use the published error codes and HTTP mappings to handle denied requests safely. Tenantless endpoints do not require tenant membership or module entitlement, but still require authentication and domain authorization. Application verification failures may be handled before Kernel.</p>
          <div className="request-failures-scroll" role="region" tabIndex={0} aria-label="Request failure and recovery table; scroll horizontally if needed">
            <table className="request-failures">
              <thead><tr><th scope="col">Request condition</th><th scope="col">Kernel failure / HTTP</th><th scope="col">Owner and recovery</th><th scope="col">Usage example</th></tr></thead>
              <tbody>{guide.failureCases.map(item=><tr key={item.id}>
                <th scope="row"><strong>{item.trigger}</strong><span>{item.scope==='scoped'?'tenant-scoped':'tenantless'} endpoint</span></th>
                <td><code>{item.failure}</code><span className="request-http">{item.http} HTTP</span></td>
                <td><strong>{item.owner}</strong><p>{item.recovery}</p></td>
                <td><a href={'#/playground?mode=request&scope='+item.scope+'&scenario='+(item.scenario||item.id)}>See outcome →</a></td>
              </tr>)}</tbody>
            </table>
          </div>
          <p className="request-diagnostics"><strong>Safe diagnostics:</strong> {guide.diagnostics}</p>
        </section>}

        {guide.id==='jdbc'&&<section className="request-decisions" aria-labelledby="jdbc-decision-heading">
          <h3 id="jdbc-decision-heading" tabIndex={-1}>Handle each idempotency result</h3>
          <p>These are the released JDBC adapter's <strong>decision types</strong>, not automatic HTTP responses. Your application must authenticate and authorize every attempt <strong>before</strong> calling <code>begin</code>. Only ACQUIRED executes a new mutation.</p>
          <div className="request-failures-scroll" role="region" tabIndex={0} aria-label="Idempotency decisions table; scroll horizontally if needed">
            <table className="request-failures">
              <thead><tr><th scope="col">Decision</th><th scope="col">Effect / no new work</th><th scope="col">Owner and next step</th><th scope="col">Usage example</th></tr></thead>
              <tbody>{guide.decisionStates.map(item=><tr key={item.id}>
                <th scope="row"><strong>{item.type}</strong><span>Published v{version}</span></th>
                <td>{item.effect}</td>
                <td><strong>{item.owner}</strong><p>{item.next}</p><p>{item.recovery}</p></td>
                <td><a href={'#/playground?mode=mutation&scenario='+item.id}>See {item.type} example →</a></td>
              </tr>)}</tbody>
            </table>
          </div>
          <details className="guide-troubleshooting" open={section==='recovery'}><summary id="jdbc-recovery-heading">Recovery cases: rollback, lost response, duplicate delivery and migrations</summary>
            <ul>{guide.recoveryPaths.map(item=><li key={item.case}><strong>{item.case}:</strong> {item.explanation} <span className="jdbc-evidence">{item.verify} · {item.owner}</span></li>)}</ul>
          </details>
          <p className="request-diagnostics"><strong>What to test next:</strong> <a href="#/docs/assure">Open consumer testkit and conformance checks</a>. No Playground or testkit result is evidence of an actual committed product transaction.</p>
        </section>}
        {guide.id==='assure'&&<section className="request-decisions" aria-labelledby="consumer-evidence-heading">
          <h3 id="consumer-evidence-heading" tabIndex={-1}>Durable consumer conformance evidence</h3>
          <p>These identifiers refer to the existing published conformance specification, not executed tests. For each applicable case, attach real product code, PostgreSQL/receiver logs, result and recovery evidence. Mark others <strong>not applicable with rationale</strong>.</p>
          <div className="request-failures-scroll" role="region" tabIndex={0} aria-label="Durable consumer conformance checks; scroll horizontally if needed">
            <table className="request-failures">
              <thead><tr><th scope="col">Scenario</th><th scope="col">Consumer verification</th></tr></thead>
              <tbody>{guide.conformanceCases.map(item=><tr key={item.id}><th scope="row"><strong>{item.id}</strong><span>{item.title}</span></th><td>{item.evidence}</td></tr>)}</tbody>
            </table>
          </div>
          <p className="request-diagnostics"><strong>Review usage:</strong> <a href="#/docs/jdbc">Return to the optional JDBC decision and recovery guide</a>. Product acceptance still requires independent conformance under issue #41.</p>
        </section>}
        <section className="guide-section" aria-label="Published library example">
          <div className="guide-code-heading"><h3 id="guide-example-heading" tabIndex={-1}>Example</h3><span>{sample.kind}</span></div>
          <div className="guide-code-shell">
            <div className="guide-code-toolbar"><div className="guide-code-tabs" role="group" aria-label="Choose example">{guide.samples.map((x,i)=><button key={x.label} type="button" aria-pressed={i===sampleIndex} onClick={()=>{setSampleIndex(i);setCopyStatus('')}}>{x.label}</button>)}</div><div className="guide-code-actions"><button type="button" className="guide-copy" onClick={copySample}>Copy code</button><button type="button" className="guide-select-code" onClick={selectSample}>Select code</button></div></div>
            <div className="guide-code-caption">{sample.filename} · {sample.language.toUpperCase()}</div><pre ref={codePreRef} tabIndex={0} aria-label={sample.filename+' code sample, scroll horizontally if needed'}><code>{tokenizeCode(sample.code,sample.language).map((part,i)=>part.kind?<span key={i} className={'tok-'+part.kind}>{part.text}</span>:part.text)}</code></pre><p role="status" className="guide-copy-status">{copyStatus}</p>
          </div>
          {guide.expectedOutput&&<div className="guide-expected-output" role="note"><strong>Expected result</strong><p>{guide.expectedOutput}</p></div>}
          {sample.kind.includes('Integration excerpt')&&<p className="guide-excerpt-note">This excerpt is not a complete application: the identity verifier, adapters, ports, product SQL and authorization policies are supplied by your application.</p>}
        </section>
        <details className="guide-troubleshooting" open={section==='troubleshooting'}><summary id="guide-troubleshooting-summary">Common mistakes &amp; troubleshooting</summary><ul>{guide.mistakes.map((item,i)=><li key={i}>{item}</li>)}</ul></details>
        <div className="guide-assurance">
          <section><h3 id="guide-verification-heading" tabIndex={-1}>Check your integration</h3><p>{guide.verify}</p></section>
          <section><h3 id="guide-ownership-heading" tabIndex={-1}>Ownership boundary</h3><p>{guide.ownership}</p></section>
        </div>
        <div className="guide-resource-links">{guide.id==='request'||guide.id==='jdbc'||guide.id==='first'?<a className="guide-try-link" href={guide.id==='request'?'#/playground?mode=request&scope=scoped&scenario=success':guide.id==='jdbc'?'#/playground?mode=mutation&scenario=replay':'#/playground?mode=core&scenario=success'}>Review a usage example in the Playground →</a>:null}<a href={source(guide.source)} target="_blank" rel="noopener noreferrer">Published v{version} source ↗</a></div>
        <p className="guide-note">The practical integration guide is on this website; the GitHub link above points only to immutable released source for verification.</p>
        <nav className="guide-pager" aria-label="Previous and next guides">
          {index>0?<a href={'#/docs/'+developerGuides[index-1].id}><span>← Previous</span><strong>{developerGuides[index-1].title}</strong></a>:<span/>}
          {index<developerGuides.length-1?<a href={'#/docs/'+developerGuides[index+1].id}><span>Next →</span><strong>{developerGuides[index+1].title}</strong></a>:<span/>}
        </nav>
      </article>}
    </div>
  </div>;
}
