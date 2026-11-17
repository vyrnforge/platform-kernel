import React,{useEffect,useMemo,useRef,useState} from 'react';
import {source,version} from './data.mjs';
import {developerGuides,searchDeveloperGuides} from './docs-data.mjs';
import {tokenizeCode} from './code-tokens.mjs';
import {PreviewGuide} from './PreviewGuide.jsx';
import {searchPreview} from './preview-data.mjs';
import './developer-docs.css';

const groups=['Getting started','Integrate','Test & operate'];

export function DeveloperDocs({guideId='install'}){
  const [query,setQuery]=useState('');
  const searchInputRef=useRef(null);
  const [sampleIndex,setSampleIndex]=useState(0);
  const [copyStatus,setCopyStatus]=useState('');
  const isPreview=guideId==='preview';
  const guide=developerGuides.find(x=>x.id===guideId)||developerGuides[0];
  const index=developerGuides.indexOf(guide);
  const sample=guide.samples[Math.min(sampleIndex,guide.samples.length-1)];
  const visible=useMemo(()=>searchDeveloperGuides(query),[query]);
  const previewVisible=useMemo(()=>searchPreview(query),[query]);
  useEffect(()=>{setSampleIndex(0);setCopyStatus('')},[guideId]);
  async function copySample(){
    try{
      if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');
      await navigator.clipboard.writeText(sample.code);
      setCopyStatus('Code copied.');
    }catch{setCopyStatus('Clipboard unavailable. Select the code block to copy manually.')}
  }
  return <div className="docs-page content-surface">
    <div className="wrap docs-page-heading"><span className="eyebrow">DEVELOPER DOCUMENTATION / v{version} PUBLISHED · v0.4.0 PREVIEW</span><h1 id="page-title" tabIndex={-1}>Learn by building.</h1><p>Task-based guides for the real v{version} Java library. Each recipe states what the Kernel provides and what your application must implement.</p></div>
    <div className="wrap docs-layout">
      <aside className="docs-sidebar">
        <div className="docs-sidebar-top"><label htmlFor="guide-search">Search documentation</label><input type="search" id="guide-search" ref={searchInputRef} placeholder="Find a guide…" value={query} onChange={e=>setQuery(e.target.value)}/></div>
        <p className="docs-search-count" role="status">{visible.length+(previewVisible?1:0)} of {developerGuides.length+1} guides</p>
        <nav aria-label="Developer guide navigation" className="docs-guide-nav">
          {groups.map(group=>{
            const items=visible.filter(x=>x.group===group);
            return items.length>0&&<div className="docs-guide-group" key={group}><h2>{group}</h2>{items.map(item=><a href={'#/docs/'+item.id} key={item.id} aria-current={!isPreview&&guide.id===item.id?'page':undefined}>{item.title}<span aria-hidden="true">→</span></a>)}</div>;
          })}
        </nav>
        {previewVisible&&<div className="docs-preview-entry"><span className="side-kicker">UPCOMING · NOT PUBLISHED</span><a href="#/docs/preview" aria-current={isPreview?'page':undefined}>v0.4.0 Developer Preview <span aria-hidden="true">→</span></a></div>}
        {visible.length===0&&!previewVisible&&<p className="docs-search-empty">No matching guides. <button type="button" onClick={()=>{searchInputRef.current?.focus();setQuery('')}}>Clear search</button></p>}
        <div className="docs-sidebar-note"><strong>Version boundary</strong><p>Core guides use published v{version}. The v0.4.0 preview is not released or installable yet.</p></div>
      </aside>
      {isPreview?<PreviewGuide/>:<article className="guide-article" aria-labelledby="guide-heading">
        <nav className="guide-breadcrumb" aria-label="Breadcrumb"><a href="#/docs/install">Documentation</a><span aria-hidden="true"> / </span><span>{guide.group}</span></nav>
        <div className="guide-topline"><span>Practical integration</span><span>v{version} · released APIs</span></div>
        <h2 id="guide-heading" tabIndex={-1}>{guide.title}</h2>
        <p className="guide-summary">{guide.summary}</p>
        <div className="guide-callout"><strong>When to use this</strong><p>{guide.when}</p><strong>What the Kernel provides</strong><p>{guide.provides}</p></div>
        <section className="guide-section"><h3>Before you start</h3><p>{guide.prerequisite}</p></section>
        <section className="guide-section"><h3>Steps</h3><ol>{guide.steps.map((step,i)=><li key={i}>{step}</li>)}</ol></section>
        {guide.id==='request'&&<section className="request-decisions" aria-labelledby="request-choices-heading">
          <h3 id="request-choices-heading">Choose the right request scope</h3>
          <p>One verified identity can use either path, but a tenantless endpoint is never anonymous or a bypass for tenant-owned records. These are published v{version} rules.</p>
          <div className="request-scope-grid">{guide.endpointChoices.map(item=><section key={item.id}>
            <h4>{item.name}</h4><p><strong>When:</strong> {item.when}</p><p><strong>Policy:</strong> <code>{item.policy}</code></p><p><strong>Checks:</strong> {item.guards}</p><p><strong>Application owns:</strong> {item.ownership}</p>
            <a href={'#/playground?mode=request&scope='+item.id+'&scenario='+item.scenario}>Inspect {item.name.toLowerCase()} flow →</a>
          </section>)}</div>
        </section>}
        {guide.id==='request'&&<section className="request-decisions" aria-labelledby="request-denials-heading">
          <h3 id="request-denials-heading">Failure and recovery reference</h3>
          <p>Find the first blocked gate. Subsequent checks are <strong>not reached</strong>; for valid tenantless requests membership and entitlement are <strong>not required</strong>. The HTTP statuses below are the released Kernel HTTP mapper's mappings; application verification failures may be handled before Kernel.</p>
          <div className="request-failures-scroll" role="region" tabIndex={0} aria-label="Request failure and recovery table; scroll horizontally if needed">
            <table className="request-failures">
              <thead><tr><th scope="col">Scenario / first gate</th><th scope="col">Kernel failure / HTTP</th><th scope="col">Owner and recovery</th><th scope="col">Walkthrough</th></tr></thead>
              <tbody>{guide.failureCases.map(item=><tr key={item.id}>
                <th scope="row"><strong>{item.trigger}</strong><span>{item.gate} · {item.scope==='scoped'?'tenant-scoped':'tenantless'}</span></th>
                <td><code>{item.failure}</code><span className="request-http">{item.http} HTTP</span></td>
                <td><strong>{item.owner}</strong><p>{item.recovery}</p></td>
                <td><a href={'#/playground?mode=request&scope='+item.scope+'&scenario='+(item.scenario||item.id)}>View failure →</a></td>
              </tr>)}</tbody>
            </table>
          </div>
          <p className="request-diagnostics"><strong>Safe diagnostics:</strong> {guide.diagnostics}</p>
        </section>}
        <section className="guide-section" aria-label="Published library example">
          <div className="guide-code-heading"><h3>Example</h3><span>{sample.kind}</span></div>
          <div className="guide-code-shell">
            <div className="guide-code-toolbar"><div className="guide-code-tabs" role="group" aria-label="Choose example">{guide.samples.map((x,i)=><button key={x.label} type="button" aria-pressed={i===sampleIndex} onClick={()=>{setSampleIndex(i);setCopyStatus('')}}>{x.label}</button>)}</div><button type="button" className="guide-copy" onClick={copySample}>Copy code</button></div>
            <div className="guide-code-caption">{sample.filename} · {sample.language.toUpperCase()}</div><pre tabIndex={0} aria-label={sample.filename+' code sample, scroll horizontally if needed'}><code>{tokenizeCode(sample.code,sample.language).map((part,i)=>part.kind?<span key={i} className={'tok-'+part.kind}>{part.text}</span>:part.text)}</code></pre><p role="status" className="guide-copy-status">{copyStatus}</p>
          </div>
          {guide.expectedOutput&&<div className="guide-expected-output" role="note"><strong>Expected result</strong><p>{guide.expectedOutput}</p></div>}
          {sample.kind.includes('Integration excerpt')&&<p className="guide-excerpt-note">This excerpt is not a complete application: the identity verifier, adapters, ports, product SQL and authorization policies are supplied by your application.</p>}
        </section>
        <details className="guide-troubleshooting"><summary>Common mistakes &amp; troubleshooting</summary><ul>{guide.mistakes.map((item,i)=><li key={i}>{item}</li>)}</ul></details>
        <div className="guide-assurance">
          <section><h3>Check your integration</h3><p>{guide.verify}</p></section>
          <section><h3>Ownership boundary</h3><p>{guide.ownership}</p></section>
        </div>
        <div className="guide-resource-links">{guide.id==='request'||guide.id==='jdbc'||guide.id==='first'?<a className="guide-try-link" href={guide.id==='request'?'#/playground?mode=request&scope=scoped&scenario=success':guide.id==='jdbc'?'#/playground?mode=mutation&scenario=replay':'#/playground?mode=core&scenario=success'}>Walk through this flow in the Playground →</a>:null}<a href={source(guide.source)} target="_blank" rel="noopener noreferrer">Published v{version} source ↗</a></div>
        <p className="guide-note">The practical integration guide is on this website; the GitHub link above points only to immutable released source for verification.</p>
        <nav className="guide-pager" aria-label="Previous and next guides">
          {index>0?<a href={'#/docs/'+developerGuides[index-1].id}><span>← Previous</span><strong>{developerGuides[index-1].title}</strong></a>:<span/>}
          {index<developerGuides.length-1?<a href={'#/docs/'+developerGuides[index+1].id}><span>Next →</span><strong>{developerGuides[index+1].title}</strong></a>:<span/>}
        </nav>
      </article>}
    </div>
  </div>;
}
