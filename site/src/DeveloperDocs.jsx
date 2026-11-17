import React,{useEffect,useMemo,useState} from 'react';
import {source,version} from './data.mjs';
import {developerGuides,searchDeveloperGuides} from './docs-data.mjs';
import {tokenizeCode} from './code-tokens.mjs';
import {PreviewGuide} from './PreviewGuide.jsx';
import {searchPreview} from './preview-data.mjs';
import './developer-docs.css';

const groups=['Getting started','Integrate','Test & operate'];

export function DeveloperDocs({guideId='install'}){
  const [query,setQuery]=useState('');
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
        <div className="docs-sidebar-top"><label htmlFor="guide-search">Search documentation</label><input type="search" id="guide-search" placeholder="Find a guide…" value={query} onChange={e=>setQuery(e.target.value)}/></div>
        <p className="docs-search-count" role="status">{visible.length+(previewVisible?1:0)} of {developerGuides.length+1} guides</p>
        <nav aria-label="Developer guide navigation" className="docs-guide-nav">
          {groups.map(group=>{
            const items=visible.filter(x=>x.group===group);
            return items.length>0&&<div className="docs-guide-group" key={group}><h2>{group}</h2>{items.map(item=><a href={'#/docs/'+item.id} key={item.id} aria-current={!isPreview&&guide.id===item.id?'page':undefined}>{item.title}<span aria-hidden="true">→</span></a>)}</div>;
          })}
        </nav>
        {previewVisible&&<div className="docs-preview-entry"><span className="side-kicker">UPCOMING · NOT PUBLISHED</span><a href="#/docs/preview" aria-current={isPreview?'page':undefined}>v0.4.0 Developer Preview <span aria-hidden="true">→</span></a></div>}
        {visible.length===0&&!previewVisible&&<p className="docs-search-empty">No matching guides. <button type="button" onClick={()=>setQuery('')}>Clear search</button></p>}
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
        <section className="guide-section" aria-label="Published library example">
          <div className="guide-code-heading"><h3>Example</h3><span>{sample.kind}</span></div>
          <div className="guide-code-shell">
            <div className="guide-code-toolbar"><div className="guide-code-tabs" role="group" aria-label="Choose example">{guide.samples.map((x,i)=><button key={x.label} type="button" aria-pressed={i===sampleIndex} onClick={()=>{setSampleIndex(i);setCopyStatus('')}}>{x.label}</button>)}</div><button type="button" className="guide-copy" onClick={copySample}>Copy code</button></div>
            <div className="guide-code-caption">{sample.filename} · {sample.language.toUpperCase()}</div><pre tabIndex={0} aria-label={sample.filename+' code sample, scroll horizontally if needed'}><code>{tokenizeCode(sample.code,sample.language).map((part,i)=>part.kind?<span key={i} className={'tok-'+part.kind}>{part.text}</span>:part.text)}</code></pre><p role="status" className="guide-copy-status">{copyStatus}</p>
          </div>
          {sample.kind.includes('Integration excerpt')&&<p className="guide-excerpt-note">This excerpt is not a complete application: the identity verifier, adapters, ports, product SQL and authorization policies are supplied by your application.</p>}
        </section>
        <details className="guide-troubleshooting"><summary>Common mistakes &amp; troubleshooting</summary><ul>{guide.mistakes.map((item,i)=><li key={i}>{item}</li>)}</ul></details>
        <div className="guide-assurance">
          <section><h3>Check your integration</h3><p>{guide.verify}</p></section>
          <section><h3>Ownership boundary</h3><p>{guide.ownership}</p></section>
        </div>
        <div className="guide-resource-links"><a href={source(guide.source)} target="_blank" rel="noopener noreferrer">Published v{version} source ↗</a></div>
        <p className="guide-note">The practical integration guide is on this website; the GitHub link above points only to immutable released source for verification.</p>
        <nav className="guide-pager" aria-label="Previous and next guides">
          {index>0?<a href={'#/docs/'+developerGuides[index-1].id}><span>← Previous</span><strong>{developerGuides[index-1].title}</strong></a>:<span/>}
          {index<developerGuides.length-1?<a href={'#/docs/'+developerGuides[index+1].id}><span>Next →</span><strong>{developerGuides[index+1].title}</strong></a>:<span/>}
        </nav>
      </article>}
    </div>
  </div>;
}
