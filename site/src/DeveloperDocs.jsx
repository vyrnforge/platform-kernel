import React,{useEffect,useMemo,useState} from 'react';
import {repo,source,version} from './data.mjs';
import {developerGuides} from './docs-data.mjs';
import './developer-docs.css';

const groups=['Getting started','Integrate','Test & operate'];

export function DeveloperDocs({guideId='install'}){
  const [query,setQuery]=useState('');
  const [sampleIndex,setSampleIndex]=useState(0);
  const [copyStatus,setCopyStatus]=useState('');
  const guide=developerGuides.find(x=>x.id===guideId)||developerGuides[0];
  const index=developerGuides.indexOf(guide);
  const sample=guide.samples[Math.min(sampleIndex,guide.samples.length-1)];
  const visible=useMemo(()=>{
    const needle=query.trim().toLocaleLowerCase();
    return developerGuides.filter(x=>!needle||[x.title,x.summary,x.group,x.when,...x.steps].join(' ').toLocaleLowerCase().includes(needle));
  },[query]);
  useEffect(()=>{setSampleIndex(0);setCopyStatus('')},[guideId]);
  async function copySample(){
    try{
      if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');
      await navigator.clipboard.writeText(sample.code);
      setCopyStatus('Code copied.');
    }catch{setCopyStatus('Clipboard unavailable. Select the code block to copy manually.')}
  }
  return <div className="docs-page content-surface">
    <div className="wrap docs-page-heading"><span className="eyebrow">DEVELOPER DOCUMENTATION / PUBLISHED v{version}</span><h1 id="page-title" tabIndex={-1}>Learn by building.</h1><p>Task-based guides for the real v{version} Java library. Each recipe states what the Kernel provides and what your application must implement.</p></div>
    <div className="wrap docs-layout">
      <aside className="docs-sidebar">
        <div className="docs-sidebar-top"><label htmlFor="guide-search">Search documentation</label><input type="search" id="guide-search" placeholder="Find a guide…" value={query} onChange={e=>setQuery(e.target.value)}/></div>
        <nav aria-label="Developer guide navigation" className="docs-guide-nav">
          {groups.map(group=>{
            const items=visible.filter(x=>x.group===group);
            return items.length>0&&<div className="docs-guide-group" key={group}><h2>{group}</h2>{items.map(item=><a href={'#/docs/'+item.id} key={item.id} aria-current={guide.id===item.id?'page':undefined}>{item.title}<span aria-hidden="true">→</span></a>)}</div>;
          })}
        </nav>
        {visible.length===0&&<p className="docs-search-empty">No matching guides. <button type="button" onClick={()=>setQuery('')}>Clear search</button></p>}
        <div className="docs-sidebar-note"><strong>Version boundary</strong><p>Examples use published v{version}. The v0.4.0 candidate is not yet released.</p></div>
      </aside>
      <article className="guide-article" aria-labelledby="guide-heading">
        <div className="guide-topline"><span>{guide.group}</span><span>v{version} · released APIs</span></div>
        <h2 id="guide-heading">{guide.title}</h2>
        <p className="guide-summary">{guide.summary}</p>
        <div className="guide-callout"><strong>When to use this</strong><p>{guide.when}</p></div>
        <section className="guide-section"><h3>Before you start</h3><p>{guide.prerequisite}</p></section>
        <section className="guide-section"><h3>Steps</h3><ol>{guide.steps.map((step,i)=><li key={i}>{step}</li>)}</ol></section>
        <section className="guide-section" aria-label="Published library example">
          <div className="guide-code-heading"><h3>Example</h3><span>{sample.kind}</span></div>
          <div className="guide-code-shell">
            <div className="guide-code-toolbar"><div className="guide-code-tabs" role="group" aria-label="Choose example">{guide.samples.map((x,i)=><button key={x.label} type="button" aria-pressed={i===sampleIndex} onClick={()=>{setSampleIndex(i);setCopyStatus('')}}>{x.label}</button>)}</div><button type="button" className="guide-copy" onClick={copySample}>Copy code</button></div>
            <pre aria-label={sample.label+' code sample'}><code>{sample.code}</code></pre><p role="status" className="guide-copy-status">{copyStatus}</p>
          </div>
          {sample.kind.includes('Integration excerpt')&&<p className="guide-excerpt-note">This excerpt is not a complete application: the identity verifier, adapters, ports, product SQL and authorization policies are supplied by your application.</p>}
        </section>
        <div className="guide-assurance">
          <section><h3>Check your integration</h3><p>{guide.verify}</p></section>
          <section><h3>Ownership boundary</h3><p>{guide.ownership}</p></section>
        </div>
        <div className="guide-resource-links"><a href={repo+'/blob/main/'+guide.guide} target="_blank" rel="noopener noreferrer">Full integration guide ↗</a><a href={source(guide.source)} target="_blank" rel="noopener noreferrer">Published v{version} source ↗</a></div>
        <p className="guide-note">Living documentation on main may mention candidate APIs. The example and release-source link on this page target the published v{version} baseline.</p>
        <nav className="guide-pager" aria-label="Previous and next guides">
          {index>0?<a href={'#/docs/'+developerGuides[index-1].id}><span>← Previous</span><strong>{developerGuides[index-1].title}</strong></a>:<span/>}
          {index<developerGuides.length-1?<a href={'#/docs/'+developerGuides[index+1].id}><span>Next →</span><strong>{developerGuides[index+1].title}</strong></a>:<span/>}
        </nav>
      </article>
    </div>
  </div>;
}
