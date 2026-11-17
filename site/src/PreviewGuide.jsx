import React,{useState} from 'react';
import {preview} from './preview-data.mjs';
import {tokenizeCode} from './code-tokens.mjs';
import {repo,version,candidatePr} from './data.mjs';

// Shared documentation code affordances, with no new render or highlighting dependency.
function PreviewSamples({ids,title}){
  const [active,setActive]=useState(ids[0]);
  const [copyStatus,setCopyStatus]=useState('');
  const sample=preview.samples.find(x=>x.id===active);
  async function copy(){
    try{
      if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');
      await navigator.clipboard.writeText(sample.code);
      setCopyStatus('Code copied.');
    }catch{
      setCopyStatus('Clipboard unavailable. Select the code block to copy manually.');
    }
  }
  return <div className="preview-samples">
    <div className="guide-code-heading"><h4>{title}</h4><span>{sample.note}</span></div>
    <div className="guide-code-shell">
      <div className="guide-code-toolbar">
        <div className="guide-code-tabs" role="group" aria-label={title}>{ids.map(id=>{
          const item=preview.samples.find(x=>x.id===id);
          return <button type="button" key={id} aria-pressed={id===active} onClick={()=>{setActive(id);setCopyStatus('')}}>{item.label}</button>;
        })}</div>
        <button type="button" className="guide-copy" onClick={copy}>Copy code</button>
      </div>
      <div className="guide-code-caption">{sample.filename} · {sample.language.toUpperCase()}</div>
      <pre tabIndex={0} aria-label={sample.filename+' example, scroll horizontally if needed'}><code>{tokenizeCode(sample.code,sample.language).map((part,i)=>part.kind?<span key={i} className={'tok-'+part.kind}>{part.text}</span>:part.text)}</code></pre>
      <p role="status" className="guide-copy-status">{copyStatus}</p>
    </div>
  </div>;
}

export function PreviewGuide(){
  return <article className="guide-article preview-article" aria-labelledby="guide-heading">
    <nav className="guide-breadcrumb" aria-label="Breadcrumb"><a href="#/docs/install">Documentation</a><span aria-hidden="true"> / </span><span>Upcoming release</span></nav>
    <div className="guide-topline"><span>Developer guide · pre-publication</span><span>v{preview.version} · NOT PUBLISHED</span></div>
    <h2 id="guide-heading" tabIndex={-1}>v{preview.version} developer preview</h2>
    <p className="guide-summary">{preview.summary}</p>
    <div className="preview-warning" role="note"><strong>Not released. Do not install v{preview.version} yet.</strong><p>v{version} is the published Maven Central version. All future dependency snippets and new API examples below are prepared for review, not for live adoption.</p><a href="#/docs/install">Use the published v{version} quickstart</a></div>

    <section className="preview-part" aria-labelledby="preview-changes">
      <h3 id="preview-changes">What changes from v{preview.published}?</h3>
      <div className="preview-table-wrap"><table className="preview-table"><thead><tr><th scope="col">Area</th><th scope="col">Candidate change</th><th scope="col">What to verify</th></tr></thead><tbody>
        {preview.changes.map(item=><tr key={item.area}><th scope="row">{item.area}</th><td>{item.change}</td><td>{item.action}</td></tr>)}
      </tbody></table></div>
      <p>The embedded Java 21 library, three-JAR distribution, immutable released wire schemas and Flyway V1–V3 scripts remain unchanged. IAM, File Storage and business data authorization stay with their owning systems.</p>
    </section>

    <section className="preview-part" aria-labelledby="preview-install">
      <h3 id="preview-install">Future Maven and Gradle installation</h3>
      <p>These are dependency fragments for existing projects, <strong>not yet available for installation</strong>. Once publication is independently verified, keep all selected artifacts on the same released version. The JDBC adapter is optional; the testkit belongs only in test scope.</p>
      <PreviewSamples ids={['maven','gradle']} title="Dependency examples · after release only"/>
      <p>After publication, check <code>mvn dependency:tree</code> or <code>./gradlew dependencies</code> for version convergence and no obsolete split artifacts. There is no mandatory Kernel server or custom Maven repository.</p>
    </section>

    <section className="preview-part" aria-labelledby="preview-identity">
      <h3 id="preview-identity">Authenticated tenantless pipeline</h3>
      <p><strong>When to use:</strong> explicitly non-tenant-owned actions after the application has verified a user or service credential. The new factory avoids wiring tenant-membership and module-entitlement ports that tenantless-only endpoints do not call.</p>
      <PreviewSamples ids={['tenantless']} title="Candidate tenantless API · integration excerpt"/>
      <p><strong>Kernel provides:</strong> request context and fail-closed scope checks. <strong>Application provides:</strong> real token/session verification, stable identity mapping, resource lookup and domain authorization. The example uses a synthetic permission projection, not a complete security implementation.</p>
      <p><strong>Verify:</strong> trusted profile succeeds; unverified identity and denied resource permission fail; an active tenant or tenant-owned resource fails; a tenant-scoped policy does not bypass membership/entitlement. Keep the full four-port constructor for tenant-scoped operations.</p>
    </section>

    <section className="preview-part" aria-labelledby="preview-validation">
      <h3 id="preview-validation">Module keys and idempotency validation</h3>
      <PreviewSamples ids={['keys']} title="Candidate module-key grammar"/>
      <p>Module key grammar remains <code>^[a-z][a-z0-9_.:-]*$</code> (maximum 128 characters). Registration and tenant entitlement govern module availability, not permission to access a product resource.</p>
      <p><code>IdempotencyRequest</code> now rejects overlong operation (192), key (512) and request fingerprint (512) fields measured as Unicode code points, before JDBC persistence. Operation also follows the lowercase grammar. Validate exact boundaries, matching replay fingerprints, conflicts and expiry; never truncate keys silently. Reauthorize each retried attempt.</p>
    </section>

    <section className="preview-part" aria-labelledby="preview-jdbc">
      <h3 id="preview-jdbc">Optional JDBC codec and durable mutations</h3>
      <PreviewSamples ids={['jdbc']} title="Candidate configurable Jackson codec"/>
      <p>The optional codec copies the mapper, disables default typing and orders map keys. Changing deployed codec settings can change persisted payloads and fingerprints; prove old records, replays, null-handling and round trips before switching. Public transport JSON schemas remain a separate mapping responsibility.</p>
      <p>For retriable writes, authenticate/authorize first, call <code>JdbcIdempotencyPort.begin(request)</code>, execute business SQL plus required event/audit intents on the <strong>same supplied JDBC Connection</strong> only for <code>ACQUIRED</code>, and use <code>executeIdempotent</code> for atomic result completion. Handle <code>REPLAY</code>, <code>IN_PROGRESS</code> and <code>CONFLICT</code> explicitly. Never commit manually or perform external side effects in the transaction callback. Event delivery is at-least-once compatible and requires receiver deduplication and operator reconciliation.</p>
      <p>Kernel JDBC ships immutable Flyway V1–V3 scripts. Do not blindly run the legacy migrator in an application with its own <code>db/migration</code> history. Your application owns migration authority, backups, least-privilege roles, rollout and restore.</p>
    </section>

    <section className="preview-part" aria-labelledby="preview-http">
      <h3 id="preview-http">HTTP and readiness responsibilities</h3>
      <p>Preserve duplicate request header values so mixed-case duplicates can be rejected safely. Bearer-token extraction is not signature, issuer or audience verification. Resource tenant IDs must be checked against authoritative product data; actual SQL must be tenant-filtered. Maintain correlation IDs and safe API error mapping.</p>
      <p><code>HealthAggregator.check(type)</code> runs synchronously and does not impose I/O deadlines. Register actual dependency probes and apply client and endpoint timeouts in the host application; an empty probe list reporting UP does not prove downstream readiness.</p>
    </section>

    <section className="preview-part" aria-labelledby="preview-acceptance">
      <h3 id="preview-acceptance">Upgrade verification · v{preview.published} to prospective v{preview.version}</h3>
      <ol className="preview-checklist">{preview.checks.map(x=><li key={x}>{x}</li>)}</ol>
      <p>Source-level CI and synthetic examples cannot certify the consumer. Keep a product-specific test record, migration/rollback procedure and responsible approver.</p>
    </section>

    <section className="preview-part" aria-labelledby="preview-troubleshoot">
      <h3 id="preview-troubleshoot">Troubleshooting</h3>
      <div className="preview-faq">{preview.mistakes.map(x=><details key={x.symptom}><summary>{x.symptom}</summary><p>{x.fix}</p></details>)}</div>
    </section>

    <section className="preview-part preview-handoff" aria-labelledby="preview-handoff">
      <h3 id="preview-handoff">Publication handoff</h3>
      <p>This developer documentation is intentionally prepared <strong>before</strong> publication. It is not release approval. After a separately approved release is signed, tagged and anonymously resolved from Maven Central, update this website's installation defaults, source pins, version/status labels and verification links through a reviewed website change.</p>
      <p><a href={candidatePr} target="_blank" rel="noopener noreferrer">Inspect unpublished release candidate PR #65</a> · <a href={repo+'/tree/'+preview.sourceCommit} target="_blank" rel="noopener noreferrer">Inspect candidate API source reviewed for this guide</a></p>
      <p><a href="#/reference/releases">Back to version status</a> · <a href="#/docs/install">Published v{version} quickstart</a></p>
    </section>
  </article>;
}
