import React, {useId, useState} from 'react';
import {repo, version, candidateVersion, candidatePr} from './data.mjs';
import './showcase.css';

const highlights = [
  {id:'01', label:'NEW JAVA API', icon:'◈', title:'Authenticated, without tenancy', description:'Compose an explicitly tenantless request pipeline without provisioning a fake tenant. The application still verifies identity, owns authorization, and cannot read tenant-owned resources.', example:'RequestContextPipeline.tenantless(identity, domainPolicy)', source:57},
  {id:'02', label:'NEW JDBC API', icon:'{}', title:'Your Jackson configuration', description:'Supply an ObjectMapper to the optional JDBC codec. The codec copies it defensively; existing default construction remains available. Validate stored-payload compatibility before switching.', example:'new JacksonRecordCodec(applicationMapper)', source:59},
  {id:'03', label:'HARDENED VALIDATION', icon:'✓', title:'Predictable boundaries', description:'Idempotency input limits now match PostgreSQL columns and module keys use one published grammar. Invalid inputs fail earlier, before they reach persistence or policy execution.', example:'192 / 512 / 512 character limits · module key ≤128', source:55},
  {id:'04', label:'INTEGRATION QUALITY', icon:'↗', title:'Safer paths into production', description:'Verified Flyway coexistence, safe JDBC atomicity guidance, duplicate-header tests, health-probe guidance and consistent source hygiene clarify where the Kernel ends and application ownership begins.', example:'No new service, migration or shared business data', source:60}
];
const journeys = [
  {name:'Build an API', eyebrow:'PATH 01 · CORE ONLY', title:'Give every request a consistent foundation.', description:'For APIs, CLIs and workers that need IDs, safe errors, correlation or optional request context—without a required Kernel database or service.', steps:[['Install','Use platform-kernel as a Java 21 library.'],['Integrate','Add IDs/correlation; verify identity only where the operation is authenticated.'],['Own','Keep resource authorization, HTTP framework wiring and business records in your application.']], example:'io.github.vyrnforge:platform-kernel:' + version, href:'docs/integration/quickstart.md'},
  {name:'Make writes reliable', eyebrow:'PATH 02 · OPTIONAL JDBC', title:'Commit a business change and its evidence together.', description:'For retriable tenant-scoped operations that need durable event/audit intent and a safe replay result in one product-owned PostgreSQL transaction.', steps:[['Select','Add platform-kernel-jdbc and keep your own schema/transaction authority.'],['Compose','Authorize each attempt; acquire a lease; use executeIdempotent with the supplied connection.'],['Operate','Deduplicate downstream events, bound retries and verify recovery/rollback.']], example:'io.github.vyrnforge:platform-kernel-jdbc:' + version, href:'docs/integration/jdbc-safe-mutation.md'},
  {name:'Connect independent products', eyebrow:'PATH 03 · CONTRACTS FIRST', title:'Share technical contracts, not business databases.', description:'For independently owned applications that need common actor context, stable IDs/references, versioned events and correlation across product boundaries.', steps:[['Map','Name each product’s authoritative data and authorization decisions.'],['Connect','Integrate IAM or an external IdP through a trusted projection; pass file references without granting file access.'],['Verify','Run conformance and negative tenant-isolation tests before each product adopts a version.']], example:'Each product chooses its own Kernel version', href:'docs/integration/consumer-conformance.md'}
];

function SourceLink({path,children}) {
  return <a href={repo+'/blob/main/'+path} target="_blank" rel="noopener noreferrer">{children}<span aria-hidden="true"> ↗</span></a>;
}

export function ReleasePreview() {
  return <section className="section preview-section" id="next" aria-labelledby="next-title">
    <div className="wrap">
      <div className="preview-heading">
        <div>
          <span className="eyebrow">THE NEXT RELEASE · FEATURE PREVIEW</span>
          <h2 id="next-title">Smaller integration friction.<br/><em>Stronger foundations.</em></h2>
          <p className="lead">Version {candidateVersion} is prepared in source and its release candidate has passed automated checks. These additions are <strong>not yet published on Maven Central</strong>. Continue using the released v{version} artifacts until publication is verified.</p>
        </div>
        <div className="preview-status" aria-label="Release status">
          <span className="status-dot" aria-hidden="true"/>
          <strong>v{candidateVersion} · Candidate</strong>
          <span>Not published · No adoption implied</span>
          <a href={candidatePr} target="_blank" rel="noopener noreferrer">View candidate PR ↗</a>
        </div>
      </div>
      <div className="feature-grid">
        {highlights.map(feature=><article className="feature-card" key={feature.id}>
          <div className="feature-card-top"><span className="feature-icon" aria-hidden="true">{feature.icon}</span><span className="feature-kind">{feature.label}</span></div>
          <h3>{feature.title}</h3>
          <p>{feature.description}</p>
          <code>{feature.example}</code>
          <a href={repo+'/pull/'+feature.source} target="_blank" rel="noopener noreferrer">Review source change #{feature.source} ↗</a>
        </article>)}
      </div>
      <p className="preview-footnote">No new Kernel service, database, workflow engine, IAM implementation or file-storage client is part of this candidate. Existing release artifacts stay immutable.</p>
    </div>
  </section>;
}

export function JourneySelector() {
  const [selected,setSelected]=useState(0);
  const id=useId();
  const j=journeys[selected];
  return <section className="section journey-section" id="journeys" aria-labelledby="journeys-title">
    <div className="wrap">
      <div className="eyebrow">START WITH YOUR GOAL</div>
      <h2 id="journeys-title">One library. Different entry points.</h2>
      <p className="lead">Select what you're building. The foundation stays small because each application adopts only what it actually needs.</p>
      <div className="journey-layout">
        <div className="journey-menu" aria-label="Choose an adoption path">
          {journeys.map((item,i)=><button key={item.name} type="button" className={'journey-choice '+(i===selected?'selected':'')} aria-pressed={i===selected} aria-controls={id} onClick={()=>setSelected(i)}>
            <span className="journey-number">0{i+1}</span><span><strong>{item.name}</strong><small>{item.eyebrow}</small></span><span className="journey-arrow" aria-hidden="true">↗</span>
          </button>)}
        </div>
        <div className="journey-detail" id={id} aria-live="polite" aria-atomic="true">
          <span className="eyebrow">{j.eyebrow}</span>
          <h3>{j.title}</h3>
          <p>{j.description}</p>
          <ol className="journey-steps">{j.steps.map(([title,body])=><li key={title}><strong>{title}</strong><span>{body}</span></li>)}</ol>
          <div className="journey-command"><span>STARTING POINT · PUBLISHED v{version}</span><code>{j.example}</code></div>
          <SourceLink path={j.href}>Open implementation guide</SourceLink>
        </div>
      </div>
    </div>
  </section>;
}

export function BoundaryMap() {
  return <section className="section boundary-section dark" id="boundaries" aria-labelledby="boundaries-title">
    <div className="wrap">
      <div className="eyebrow">ARCHITECTURE / OWNERSHIP</div>
      <h2 id="boundaries-title">A shared foundation.<br/><em>Not a shared monolith.</em></h2>
      <p className="lead">The Kernel is embedded inside independently deployed applications. It standardizes technical interfaces while the owning domain keeps its data, policy and business behavior.</p>
      <div className="boundary-diagram" role="group" aria-label="Three-layer ownership model">
        <div className="boundary-lane">
          <div className="boundary-heading"><span>01</span><strong>OWNING APPLICATIONS</strong><small>Separate deployments, records and policy</small></div>
          <div className="boundary-products"><div><strong>Application A</strong><span>Business data + authorization</span></div><div><strong>Application B</strong><span>Business data + authorization</span></div><div><strong>Application C</strong><span>Business data + authorization</span></div></div>
        </div>
        <div className="boundary-connector" aria-hidden="true">↓ <span>Embedded per application</span> ↓</div>
        <div className="boundary-kernel">
          <div><span className="eyebrow">02 / SHARED TECHNICAL FOUNDATION</span><strong>Platform Kernel</strong><span>Context & IDs · HTTP & controls · events & audit intent · telemetry</span></div>
          <div><span>OPTIONAL</span><strong>JDBC adapter</strong><small>Product-owned PostgreSQL</small></div>
          <div><span>TEST ONLY</span><strong>Testkit</strong><small>Conformance fixtures</small></div>
        </div>
        <div className="boundary-connector" aria-hidden="true">↓ <span>Integrations, not ownership transfer</span> ↓</div>
        <div className="boundary-external">
          <div><strong>IAM / external identity provider</strong><span>Authenticates and supplies trusted identity</span></div>
          <div><strong>File Storage</strong><span>Owns file bytes, grants and lifecycle</span></div>
          <div><strong>Transport / telemetry</strong><span>App-chosen infrastructure</span></div>
        </div>
      </div>
      <div className="boundary-notes">
        <p><strong>Trusted, not trusted by default.</strong> The application authenticates; tenant membership and entitlement do not replace resource authorization.</p>
        <p><strong>One authority per domain.</strong> Kernel events and file IDs carry references, not another product’s authoritative records.</p>
        <p><strong>Portable by design.</strong> No mandatory Kernel server, broker, external IAM product or shared cross-product database.</p>
      </div>
    </div>
  </section>;
}
