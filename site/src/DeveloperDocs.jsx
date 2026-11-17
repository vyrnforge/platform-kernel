import React, {useState} from 'react';
import {repo, source} from './data.mjs';
import {documentationVersion, developerGuides} from './docs-data.mjs';
import './developer-docs.css';

const groups = ['Getting started', 'Integrate', 'Test & operate'];
const related = [
  {label:'HTTP edge integration',path:'docs/integration/http-edge-reference.md'},
  {label:'Observability & health',path:'docs/observability/observability-health.md'},
  {label:'Adoption checklist',path:'docs/integration/adoption-checklist.md'},
  {label:'Reliability semantics',path:'docs/contracts/reliability-semantics.md'}
];

export function DeveloperDocs() {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('install');
  const [exampleIndex, setExampleIndex] = useState(0);
  const [copyStatus, setCopyStatus] = useState('');
  const needle = query.trim().toLocaleLowerCase();
  const visible = developerGuides.filter(g =>
    !needle || [g.title, g.summary, g.group, g.when, ...g.steps]
      .join(' ').toLocaleLowerCase().includes(needle));
  const guide = visible.find(g => g.id === selectedId) || visible[0];
  const example = guide?.samples[Math.min(exampleIndex, guide.samples.length - 1)];

  function choose(id) {
    setSelectedId(id);
    setExampleIndex(0);
    setCopyStatus('');
  }

  async function copyExample() {
    if (!example) return;
    try {
      if (!navigator.clipboard?.writeText) throw Error('Clipboard not available');
      await navigator.clipboard.writeText(example.code);
      setCopyStatus('Copied to clipboard');
    } catch {
      setCopyStatus('Clipboard unavailable. Select the code to copy manually.');
    }
  }

  return <section id="docs" className="section docs-section" aria-labelledby="docs-title">
    <div className="wrap">
      <div className="docs-heading">
        <div>
          <span className="eyebrow">DEVELOPER DOCUMENTATION · PUBLISHED v{documentationVersion}</span>
          <h2 id="docs-title">From dependency to working integration.</h2>
          <p className="lead">Install the library, run real Java APIs and follow task-based integration recipes. The interactive showcase explains the architecture; these guides show how to use it.</p>
        </div>
        <a className="docs-reference-link" href={repo+'/tree/main/docs/integration'} target="_blank" rel="noopener noreferrer">Browse all reference docs <span aria-hidden="true">↗</span></a>
      </div>
      <div className="docs-shell">
        <aside className="docs-side" aria-label="Developer documentation navigation">
          <label htmlFor="docs-search">Find a guide</label>
          <input id="docs-search" type="search" value={query} placeholder="Search guides…" onChange={e=>{setQuery(e.target.value);setExampleIndex(0);setCopyStatus('')}} />
          <nav aria-label="Developer guide topics" className="docs-topic-nav">
            {groups.map(group => {
              const items = visible.filter(g => g.group === group);
              return items.length > 0 && <div className="docs-nav-group" key={group}>
                <span className="docs-group-title">{group}</span>
                {items.map(item => <button type="button" key={item.id}
                  aria-pressed={guide?.id===item.id} aria-controls="docs-guide"
                  className={'docs-topic'+(guide?.id===item.id?' selected':'')}
                  onClick={()=>choose(item.id)}>{item.title}</button>)}
              </div>;
            })}
          </nav>
          {visible.length===0 && <div className="docs-no-matches">No guides match “{query}”. <button type="button" onClick={()=>setQuery('')}>Clear search</button></div>}
          <div className="docs-version">Examples target <strong>published v{documentationVersion}</strong>. The separate v0.4.0 preview is not an installable release.</div>
        </aside>
        {guide ? <article className="docs-article" id="docs-guide" aria-labelledby="docs-guide-title">
          <div className="docs-article-meta"><span>{guide.group}</span><span>v{documentationVersion} · Published APIs</span></div>
          <h3 id="docs-guide-title">{guide.title}</h3>
          <p className="docs-summary">{guide.summary}</p>
          <p className="docs-live-label" aria-live="polite">Showing: {guide.title}</p>
          <div className="docs-context">
            <div><strong>Before you start</strong><p>{guide.prerequisite}</p></div>
            <div><strong>When to use this</strong><p>{guide.when}</p></div>
          </div>
          <h4>Steps</h4>
          <ol className="docs-steps">{guide.steps.map((step, i)=><li key={i}>{step}</li>)}</ol>
          <div className="docs-code">
            <div className="docs-code-head">
              <div className="docs-code-choices" aria-label="Code sample">
                {guide.samples.map((sample,i)=><button key={sample.label} type="button" aria-pressed={example?.label===sample.label} className={example?.label===sample.label?'selected':''} onClick={()=>{setExampleIndex(i);setCopyStatus('')}}>{sample.label}</button>)}
              </div>
              <button type="button" className="docs-copy" onClick={copyExample} aria-label={'Copy '+example.label+' example'}>Copy code</button>
            </div>
            <p className="docs-code-kind">{example.kind}</p>
            <pre aria-label={example.label+' code example'}><code>{example.code}</code></pre>
            <p className="docs-copy-status" role="status">{copyStatus}</p>
          </div>
          <div className="docs-bottom">
            <div><h4>Check your integration</h4><p>{guide.verify}</p></div>
            <div><h4>Ownership boundary</h4><p>{guide.ownership}</p></div>
          </div>
          <div className="docs-links">
            <a href={repo+'/blob/main/'+guide.guide} target="_blank" rel="noopener noreferrer">Detailed integration guide <span aria-hidden="true">↗</span></a>
            <a href={source(guide.source)} target="_blank" rel="noopener noreferrer">View v{documentationVersion} release source <span aria-hidden="true">↗</span></a>
          </div>
          <p className="docs-source-note">Integration guides on the main branch evolve and may mention candidate APIs. The example and release-source links here are scoped to v{documentationVersion}; snippets labeled “integration excerpt” require your application wiring.</p>
        </article> : <div className="docs-empty" id="docs-guide" role="status">Try searching for installation, identity, retries or testing.</div>}
      </div>
      <div className="docs-related">
        <strong>More reference topics</strong>
        {related.map(item=><a key={item.path} href={repo+'/blob/main/'+item.path} target="_blank" rel="noopener noreferrer">{item.label} <span aria-hidden="true">↗</span></a>)}
      </div>
    </div>
  </section>;
}
