import React from 'react';
import {repo,source,version,candidateVersion,candidatePr,capabilities,architectures,releaseRun} from './data.mjs';
import {referenceTopics} from './routes.mjs';

const guideLinks={
  'Identity & tenancy':'request',
  'API standards':'request',
  'IDs & contracts':'first',
  'Module & feature controls':'request',
  'Idempotency':'jdbc',
  'Events & audit':'jdbc',
  'Observability & health':'first',
  'File references':'request',
  'Consumer testkit':'assure'
};

const boundaries=[
  {title:'Application / domain',type:'Authoritative owner',items:'Business data and SQL, resource authorization, tenant-filtered reads, SLOs and deployment.'},
  {title:'Kernel (embedded)',type:'Shared technical contracts',items:'UUIDv7, request and correlation contexts, module guards, event/audit contracts; optional JDBC reliability.'},
  {title:'IAM / external IdP',type:'External authority',items:'Authentication and trusted identity projection. The Kernel does not run an identity server.'},
  {title:'File Storage',type:'External authority',items:'File bytes, metadata, storage grants and lifecycle; application stores opaque references.'}
];

export function Reference({topic='architecture'}){
  return <div className="content-surface">
    <div className="page-intro wrap">
      <span className="eyebrow">REFERENCE / PUBLISHED v{version}</span>
      <h1 id="page-title" tabIndex={-1}>Contracts, boundaries<br/>and release status.</h1>
      <p>Look up what ships, who owns each responsibility and which library version is actually available.</p>
    </div>
    <div className="reference-layout wrap">
      <aside className="reference-aside" aria-label="Reference topics">
        <span className="side-kicker">REFERENCE TOPICS</span>
        <nav className="reference-nav" aria-label="Reference navigation">
          {referenceTopics.map(x=><a key={x.id} href={'#/reference/'+x.id} aria-current={topic===x.id?'page':undefined}>{x.title}<span aria-hidden="true">↗</span></a>)}
        </nav>
        <div className="reference-aside-note">Use the <a href="#/docs/install">documentation</a> for implementation steps and the <a href="#/playground">playground</a> for interactive examples.</div>
      </aside>
      <div className="reference-main">
        {topic==='architecture'&&<article className="reference-article" aria-labelledby="reference-heading">
          <span className="eyebrow">SYSTEM BOUNDARIES</span>
          <h2 id="reference-heading" tabIndex={-1}>Modular products, unified platform.</h2>
          <p className="reference-lead">Platform Kernel is a Java library embedded in each product. It does not require a shared server, shared business database, IAM replacement or File Storage replacement.</p>
          <div className="ownership-grid">
            {boundaries.map(x=><section key={x.title}><span>{x.type}</span><h3>{x.title}</h3><p>{x.items}</p></section>)}
          </div>
          <h3 className="reference-subhead">Deployment patterns</h3>
          <div className="reference-patterns">
            {architectures.map(x=><details key={x.title}><summary><strong>{x.title}</strong><span>{x.label}</span></summary><div><p>{x.description}</p><p><strong>Topology:</strong> {x.products.map(y=>y.name+' ('+y.instances+' instance'+(y.instances===1?'':'s')+')').join(' · ')}</p><p><strong>External services:</strong> {x.external}</p><p>{x.note}</p></div></details>)}
          </div>
          <p className="reference-caution">These are illustrative arrangements, not production throughput benchmarks or certified deployment profiles. Each domain remains authoritative for its own data and authorization.</p>
          <a className="inline-link" href={repo+'/blob/main/docs/integration/identity-boundary.md'} target="_blank" rel="noopener noreferrer">Read the identity integration boundary ↗</a>
        </article>}
        {topic==='capabilities'&&<article className="reference-article" aria-labelledby="reference-heading">
          <span className="eyebrow">WHAT THE PUBLISHED LIBRARY PROVIDES</span>
          <h2 id="reference-heading" tabIndex={-1}>Capability reference.</h2>
          <p className="reference-lead">Each capability shows the library contract and the work that stays with the consuming application. Use the guide link for implementation, not this catalog.</p>
          <div className="capability-reference">
            {capabilities.map(x=><section key={x.title} className="capability-row">
              <div className="capability-row-heading"><h3>{x.title}</h3><span>{x.status}</span></div>
              <p>{x.summary}</p>
              <dl><dt>Ships in v{version}</dt><dd>{x.ships}</dd><dt>Application supplies</dt><dd>{x.needs}</dd></dl>
              <div className="capability-links"><a href={'#/docs/'+guideLinks[x.title]}>Usage guide ↗</a><a href={source(x.path)} target="_blank" rel="noopener noreferrer">Released source ↗</a></div>
            </section>)}
          </div>
        </article>}
        {topic==='releases'&&<article className="reference-article" aria-labelledby="reference-heading">
          <span className="eyebrow">VERSIONS & READINESS</span>
          <h2 id="reference-heading" tabIndex={-1}>Use the released version.</h2>
          <p className="reference-lead">A green library pipeline and a browser demo do not certify your application's security or production readiness.</p>
          <div className="versions-grid">
            <section><span className="version-state released">PUBLISHED</span><h3>v{version}</h3><p>Java 21+ core JAR, optional JDBC adapter and test-scope testkit. Maven Central coordinates are <code>io.github.vyrnforge</code>. The examples on this site are pinned to this release.</p><a href={'https://central.sonatype.com/artifact/io.github.vyrnforge/platform-kernel/'+version} target="_blank" rel="noopener noreferrer">View on Maven Central ↗</a></section>
            <section><span className="version-state preview">NOT PUBLISHED</span><h3>v{candidateVersion}</h3><p>Candidate changes remain under separate release governance. Do not copy unreleased convenience APIs into a v{version} project or assume adoption is approved.</p><a href={candidatePr} target="_blank" rel="noopener noreferrer">Review candidate PR ↗</a></section>
          </div>
          <h3 className="reference-subhead">Release and consumer evidence</h3>
          <p>The published version has automated release evidence, but real consumers must independently verify IAM/File Storage integration, tenant isolation, retry behavior, database migration compatibility, operations and rollback.</p>
          <div className="reference-links"><a href={repo+'/actions/runs/'+releaseRun} target="_blank" rel="noopener noreferrer">Published release workflow ↗</a><a href={source('CHANGELOG.md')} target="_blank" rel="noopener noreferrer">Release changelog ↗</a><a href="#/docs/assure">Consumer verification guide ↗</a></div>
          <p className="reference-caution">No Kernel v{candidateVersion} publication, consumer upgrade, external penetration test or performance certification is implied by this website.</p>
        </article>}
      </div>
    </div>
  </div>;
}
