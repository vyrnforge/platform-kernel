// Illustrative, deterministic sequences based on released v0.2.1 source.
// No network, credentials, production telemetry, or execution of Java code.
const core='kernel-core/src/main/java/io/vyrnforge/platform/kernel/';
const jdbc='kernel-persistence-jdbc/src/main/java/io/vyrnforge/platform/kernel/persistence/jdbc/';
const n=(id,title,owner,x,y,description,path)=>({id,title,owner,x,y,description,path});
const f=(node,label,detail,signal,tone='info')=>({node,label,detail,signal,tone});
const s=(id,title,outcome,tone,frames)=>({id,title,outcome,tone,frames});
const request=[
n('client','API client','PRODUCT',120,100,'The product receives a request and supplies endpoint policy.','kernel-http/'),
n('edge','HTTP edge','KERNEL HTTP',370,100,'Extract configured headers, request/correlation metadata and credential.','kernel-http/'),
n('identity','Trusted identity','IAM / IDP',620,100,'Upstream verifier authenticates; ValidatedIdentityAdapter consumes only a trusted projection.',core+'identity/ValidatedIdentityAdapter.java'),
n('tenant','Tenant guard','KERNEL CORE',870,100,'Validate active tenant, resource ownership and membership. Explicitly tenantless policies reject an active tenant.',core+'pipeline/RequestContextPipeline.java'),
n('entitlement','Module access','KERNEL CORE',870,260,'Tenant module entitlement is independent of product domain authorization.',core+'pipeline/RequestContextPipeline.java'),
n('policy','Domain policy','PRODUCT',620,260,'The resource-owning product decides whether the actor may perform the action.',core+'ports/DomainAuthorizationHook.java'),
n('handler','Domain handler','PRODUCT',370,260,'Product performs the business operation with tenant-scoped persistence.','consumer-tests/asset-reference/'),
n('response','Response','HTTP EDGE',120,260,'Return the product response and request/correlation headers.','kernel-http/'),
n('reject','Safe rejection','HTTP EDGE',620,410,'Map failures to stable error codes; cross-tenant resource mismatch is hidden as 404.','kernel-http/')];
const rq=[f('client','Request received','A product endpoint declares its required module and action.','POST /v1/assets'),f('edge','Context extracted','Read X-Tenant-Id and correlation; generate a fresh request ID.','request_id: new UUIDv7'),f('identity','Identity established','Only a trusted upstream authentication projection reaches the kernel.','ActorContext · issuer + subject'),f('tenant','Tenant verified','Check tenant ownership and membership before module entitlement.','tenant_id: tenant-A'),f('entitlement','Module enabled','Asset is enabled for this tenant; this does not grant domain permission.','module: asset · enabled'),f('policy','Domain permitted','Product authorizes the requested action against the resource.','action: asset.create'),f('handler','Handler executes','The domain owns validation, persistence and business response.','tenant-scoped mutation'),f('response','Response sent','The product returns its result with correlation and request metadata.','HTTP 2xx · correlation_id retained','success')];
const deny=(at,node,label,detail,signal)=>[...rq.slice(0,at),f(node,label,detail,signal,'danger'),f('reject','Request stopped','No domain handler executes. The HTTP adapter maps the kernel failure safely.',signal,'danger')];
const mutation=[
n('call','Authorized call','PRODUCT',120,100,'Authorize every request, including retries; bind the effective request fingerprint.','docs/contracts/reliability-semantics.md'),
n('begin','Acquire / replay','IDEMPOTENCY',370,100,'Tenant + operation + key is the scope. Begin returns ACQUIRED, REPLAY, IN_PROGRESS or CONFLICT.',jdbc+'JdbcIdempotencyPort.java'),
n('lock','Lock active lease','POSTGRES',620,100,'Lock the matching unexpired lease with SELECT FOR UPDATE before invoking domain work.',jdbc+'JdbcReliabilityTransaction.java'),
n('write','Domain + intents','POSTGRES',870,100,'Write product data and required event/audit intents using the same connection.',jdbc+'JdbcReliabilityTransaction.java'),
n('result','Store replay result','POSTGRES',870,260,'Encode and persist the result under the active lease in the transaction.',jdbc+'JdbcReliabilityTransaction.java'),
n('commit','Commit all four','POSTGRES',620,260,'Domain row, event intent, audit intent and idempotency result become durable together.',jdbc+'JdbcReliabilityTransaction.java'),
n('reply','Return result','PRODUCT',370,260,'Return the committed result; a lost response does not undo the database commit.','consumer-tests/asset-reference/'),
n('replay','Stored replay','IDEMPOTENCY',120,260,'Same fingerprint returns stored result during the retention window without rerunning domain work.',jdbc+'JdbcIdempotencyPort.java'),
n('rollback','Rollback','POSTGRES',870,410,'Roll back all transactional writes on failure; acquired lease remains until abort or expiry.',jdbc+'JdbcReliabilityTransaction.java'),
n('lost','Lost response','CLIENT',370,410,'The caller can retry after a response is lost, within the configured retention window.','docs/v2/production-hardening.md')];
const mut=[f('call','Request authorized','Product supplies a tenant-scoped operation, key and effective request fingerprint.','tenant-A / asset.create / key-1'),f('begin','Lease acquired','Begin creates an IN_PROGRESS record and returns its lease.','ACQUIRED · lease UUIDv7'),f('lock','Lease locked','executeIdempotent locks the exact active lease on the product database connection.','SELECT … FOR UPDATE'),f('write','Writes staged','Stage domain mutation, event intent and audit intent. No external side effects in the transaction.','domain + outbox + audit'),f('result','Result staged','Encode the result and mark the same lease COMPLETED, still inside the transaction.','idempotency = COMPLETED'),f('commit','Atomic commit','Commit domain data, both intents and the replay result together.','COMMIT · 4 durable records','success'),f('reply','Response returned','The caller receives the result. The outbox can publish asynchronously.','asset_id: asset-123','success')];
const outbox=[
n('intent','Committed intent','PRODUCT DB',120,100,'The product transaction persists event intent before acknowledging its mutation.',jdbc+'JdbcReliabilityTransaction.java'),
n('workerA','Worker A','PUBLISHER',370,100,'Claim a PENDING row with a unique token and lease expiry; increment attempts.',jdbc+'JdbcOutboxPublisher.java'),
n('transport','Event transport','EXTERNAL',620,100,'A product-supplied transport sends the event. A delivery can happen before the worker records success.',jdbc+'EventTransport.java'),
n('consumer','Event consumer','OTHER PRODUCT',870,100,'Consumers deduplicate event IDs; at-least-once delivery does not imply exactly-once.', 'docs/contracts/reliability-semantics.md'),
n('pending','PENDING','POSTGRES',120,260,'Pending events are eligible when available and unlocked or their prior lease expires.',jdbc+'JdbcOutboxPublisher.java'),
n('workerB','Worker B','PUBLISHER',370,260,'A second worker can reclaim an expired event using a new UUIDv7 token.',jdbc+'JdbcOutboxPublisher.java'),
n('fence','Claim fence','POSTGRES',620,260,'Only the matching current unexpired claim token may update delivery state.',jdbc+'JdbcOutboxPublisher.java'),
n('published','PUBLISHED','POSTGRES',870,260,'Successful fenced update records published state.',jdbc+'JdbcOutboxPublisher.java'),
n('dead','DEAD','POSTGRES',870,410,'An exhausted attempt enters DEAD; reconcile uncertain delivery before re-drive.',jdbc+'JdbcOutboxPublisher.java'),
n('stale','Lost claim','PUBLISHER',620,410,'Stale workers cannot overwrite state; lostClaims() exposes superseded or expired claims.',jdbc+'OutboxPublishResult.java')];
const ob=[f('intent','Event intent committed','The domain commit created a durable event with its event ID and correlation ID.','event_id: evt-1'),f('pending','Pending delivery','The outbox row is PENDING and available to publishers.','status = PENDING'),f('workerA','Worker A claims','Claim under row lock; generate a token and increment attempts.','token=A · attempts=1'),f('transport','Event sent','The product transport publishes the event. Delivery may be duplicated.','event_id: evt-1'),f('consumer','Consumer accepts','The downstream consumer deduplicates by event ID before applying its own mutation.','consumer deduplication'),f('fence','Fence validates','Update only if token A still owns an unexpired pending claim.','WHERE claim_token=A'),f('published','State committed','The fenced update marks PUBLISHED and clears the claim.','status = PUBLISHED','success')];
const ops=[
n('incoming','Inbound request','PRODUCT',120,100,'Read or create business correlation ID; create a new request ID.','kernel-observability/'),
n('context','Correlation','KERNEL',370,100,'Propagate business correlation independently of request IDs and opaque trace context.','kernel-observability/'),
n('event','Event / job','PRODUCT',620,100,'An event/job receives the business correlation and a fresh invocation request ID.','kernel-observability/'),
n('downstream','Next product','PRODUCT',870,100,'A downstream consumer correlates work without sharing authoritative data.','kernel-observability/'),
n('telemetry','Safe telemetry','KERNEL',370,260,'Actor/tenant telemetry dimensions are opt-in; never log credentials.','kernel-observability/'),
n('probe','Health probes','PRODUCT',620,260,'Product supplies liveness and readiness probes. HealthAggregator sanitizes probe failures.','kernel-observability/'),
n('operator','Operator view','EXTERNAL',870,260,'Deployment exports logs, traces and metrics to its chosen backend.','docs/observability/observability-health.md'),
n('notready','Not ready','DEPLOYMENT',620,410,'Readiness may be DOWN even when process liveness is UP.','kernel-observability/')];
const op=[f('incoming','Request starts','A new request gets a request ID, while an existing business correlation can be preserved.','correlation=C1 · request=R1'),f('context','Correlation propagated','Carry business correlation through API, event or job. W3C trace context remains separate.','correlation=C1'),f('event','Invocation starts','The event consumer creates a new request ID and retains business correlation.','correlation=C1 · request=R2'),f('downstream','Downstream work','A second product owns its own data and authorization.','correlation=C1 · request=R3'),f('telemetry','Safe attributes','Emit safe contextual fields; actor and tenant dimensions default off.','actor_id / tenant_id: omitted'),f('operator','Correlated view','Product observability backend can connect related work.','same correlation · distinct requests','success')];
export const flows=[
{id:'request',title:'Secure request',subtitle:'Access control / provider-neutral identity',nodes:request,scenarios:[
s('allowed','Allowed request','Handler executes','success',rq),
s('invalid','Invalid credential','401 · authentication failed','danger',deny(2,'identity','Authentication fails','No trusted identity can be established.','HTTP 401 · AUTHENTICATION_FAILED')),
s('missing','Missing active tenant','403 · tenant required','danger',deny(3,'tenant','Tenant required','Tenant-scoped endpoints require an active tenant.','HTTP 403 · TENANT_REQUIRED')),
s('cross','Cross-tenant resource','404 · resource hidden','danger',deny(3,'tenant','Resource mismatch','Resource belongs to a different tenant; do not reveal existence.','HTTP 404 · TENANT_CONTEXT_MISMATCH')),
s('tenantless','Tenantless endpoint + tenant','400 · invalid context','danger',deny(3,'tenant','Tenantless policy violation','v0.2.1 rejects an active tenant even if the tenant-owned resource matches.','HTTP 400 · INVALID_CONTEXT')),
s('membership','Non-member','403 · membership required','danger',deny(3,'tenant','Membership denied','The actor is not a member of the active tenant.','HTTP 403 · TENANT_MEMBERSHIP_REQUIRED')),
s('module','Module disabled','403 · module disabled','danger',deny(4,'entitlement','Module disabled','The tenant has no enabled entitlement for the requested module.','HTTP 403 · MODULE_DISABLED')),
s('permission','Domain permission denied','403 · access denied','danger',deny(5,'policy','Product denies action','Domain authorization remains the product responsibility.','HTTP 403 · DOMAIN_ACCESS_DENIED'))]},
{id:'mutation',title:'Atomic mutation',subtitle:'One transaction / four durable records',nodes:mutation,group:{x:514,y:45,w:464,h:264,label:'ONE PRODUCT JDBC TRANSACTION'},scenarios:[
s('create','Create asset','Committed atomically','success',mut),
s('lost','Lost response after commit','REPLAY · no second mutation','success',[...mut.slice(0,6),f('lost','Response lost','Database commit succeeded but the client never received a response.','network failure after COMMIT','warning'),f('call','Client retries','Reauthorize and repeat the same scoped key and fingerprint.','same key + fingerprint'),f('begin','Completed record found','The committed replay record survived the lost response.','REPLAY'),f('replay','Return saved result','Do not rerun domain work while the completed record is retained.','asset_id: asset-123','success')]),
s('duplicate','Duplicate request','REPLAY · saved result','success',[mut[0],f('begin','Completed record found','Same scope and fingerprint has already completed.','REPLAY'),f('replay','Stored result returned','Replay without executing the mutation again.','asset_id: asset-123','success')]),
s('concurrent','Concurrent retry','Serialized · replay or in progress','warning',[...mut.slice(0,3),f('call','Second request arrives','A retry uses the same key while the first transaction holds the lease lock.','request 2 · same key','warning'),f('begin','Retry waits','The row lock serializes the retry; before work locks the row, begin may instead return IN_PROGRESS.','waiting for lease row','warning'),...mut.slice(3,6),f('replay','Retry replays','After the first commit, the waiting begin observes COMPLETED and replays.','REPLAY','success')]),
s('conflict','Different payload / same key','CONFLICT · no mutation','danger',[mut[0],f('begin','Fingerprint conflict','The key exists with a different effective request fingerprint.','CONFLICT','danger'),f('reply','Caller rejects','The product maps the conflict to its API error policy.','no domain work','danger')]),
s('rollback','Transaction fails','Rolled back · no partial data','danger',[...mut.slice(0,4),f('rollback','Failure rolls back','Domain row, audit, event and replay-result writes are rolled back. Acquired lease is still IN_PROGRESS until abort/expiry.','ROLLBACK','danger'),f('reply','Failure returned','The product handles lease abort or expiry and retry semantics.','no committed mutation','danger')]),
s('expired','Lease expires during work','Rolled back · lease invalid','danger',[...mut.slice(0,4),f('result','Lease expired','Completion requires an unexpired matching lease; expiry fails the transaction.','lease expiry','danger'),f('rollback','All writes rolled back','No partial domain or intent commit; a new lease may be acquired after expiry.','ROLLBACK','danger')])]},
{id:'outbox',title:'Events & audit',subtitle:'Fenced delivery / retries / recovery',nodes:outbox,scenarios:[
s('publish','Successful publication','PUBLISHED','success',ob),
s('retry','Transport failure then retry','PUBLISHED after retry','success',[...ob.slice(0,3),f('transport','Transient send failure','A transport error occurs; persist only a safe failure code.','temporary failure','warning'),f('fence','Release current claim','Matching token A returns event to PENDING with delayed availability.','PENDING · retry delay','warning'),f('pending','Backoff elapsed','The event becomes eligible for another attempt.','available_at reached'),f('workerB','New claim','Worker B acquires a new token and increments the attempts.','token=B · attempts=2'),...ob.slice(3,5),f('fence','New claim finalizes','Only token B can update this state.','WHERE claim_token=B'),ob[6]]),
s('stale','Stale worker race','PUBLISHED · old update rejected','success',[...ob.slice(0,4),f('workerB','A lease expires','B reclaims the pending row while A is delayed. The new token fences A.','token=B · attempts=2','warning'),f('transport','B sends event','A previous send may already have happened. The transport is at-least-once-compatible.','duplicate possible','warning'),f('consumer','Consumer deduplicates','Same event ID is safe only when the consumer implements deduplication.','evt-1 → deduplicated'),f('fence','B owns claim','B finalizes with its matching token.','WHERE claim_token=B'),ob[6],f('workerA','A returns late','The older worker tries to record failure or success with token A.','stale token=A','warning'),f('fence','A update rejected','The current state/token no longer matches. No row update occurs.','0 rows updated','danger'),f('stale','Lost claim recorded','lostClaims() exposes the stale attempt; PUBLISHED remains unchanged.','lostClaims=1','success')]),
s('dead','Retry budget exhausted','DEAD · reconcile before re-drive','danger',[...ob.slice(0,3),f('transport','Final attempt fails','Configured maxAttempts reached. Transport error remains sanitized.','attempts = maxAttempts','warning'),f('fence','Current claim verified','Only the current matching token can mark the final failure.','claim token verified'),f('dead','Terminal state','Record DEAD for operator visibility. Reconcile before any re-drive.','status = DEAD','danger')]),
s('crash','Final worker lease expires','DEAD · no extra send','danger',[...ob.slice(0,3),f('transport','Worker disappears','A final attempt may have delivered before the worker disappeared.','delivery uncertain','warning'),f('pending','Expired final claim','Lease expires with attempts at the configured budget.','attempts = maxAttempts','warning'),f('workerB','Recovery scan','A new worker finds the exhausted claim; does not send again.','no additional send'),f('dead','Mark exhausted','Record ATTEMPTS_EXHAUSTED; reconcile uncertain external delivery.','status = DEAD','danger')])]},
{id:'operations',title:'Observability',subtitle:'Correlation / privacy / readiness',nodes:ops,scenarios:[
s('trace','Cross-product correlation','Correlated request and event','success',op),
s('healthy','Healthy dependencies','Live + ready','success',[...op.slice(0,2),f('telemetry','Safe telemetry','Structured attributes omit actor and tenant identifiers by default.','safe defaults'),f('probe','Dependencies healthy','Liveness and readiness probes report UP.','LIVE=UP · READY=UP'),f('operator','Ready to serve','Deployment can use readiness to route traffic.','ready','success')]),
s('dbdown','Database unavailable','Live · not ready','warning',[...op.slice(0,2),f('probe','Dependency probe fails','Database readiness fails; exceptions become safe failure codes.','DATABASE_UNAVAILABLE','warning'),f('notready','Readiness down','Liveness can remain UP; readiness reports DOWN.','LIVE=UP · READY=DOWN','warning'),f('operator','Operator notified','Deployment must expose health and route traffic according to readiness.','not ready','warning')])]}
];
export const getFlow=(id)=>flows.find(f=>f.id===id)||flows[0];
export const getScenario=(flow,id)=>flow.scenarios.find(s=>s.id===id)||flow.scenarios[0];
export function edgePath(a,b){
  const hx=94, hy=39;
  if(a.x===b.x){
    const sign=Math.sign(b.y-a.y);
    if(Math.abs(b.y-a.y)>180){const side=a.x<500?-1:1;const x=a.x+side*116;return 'M '+(a.x+side*hx)+' '+a.y+' H '+x+' V '+b.y+' H '+(b.x+side*hx);}
    return 'M '+a.x+' '+(a.y+sign*hy)+' V '+(b.y-sign*hy);
  }
  if(a.y===b.y){
    const sign=Math.sign(b.x-a.x);
    if(Math.abs(b.x-a.x)>260){const y=a.y-58;return 'M '+a.x+' '+(a.y-hy)+' V '+y+' H '+b.x+' V '+(b.y-hy);}
    return 'M '+(a.x+sign*hx)+' '+a.y+' H '+(b.x-sign*hx);
  }
  const sign=Math.sign(b.y-a.y),mid=(a.y+b.y)/2;
  return 'M '+a.x+' '+(a.y+sign*hy)+' V '+mid+' H '+b.x+' V '+(b.y-sign*hy);
}
export function routeEdges(flow,scenario){
  const lookup=Object.fromEntries(flow.nodes.map(n=>[n.id,n]));
  const edges=new Map();
  for(const [seq,kind] of [[flow.scenarios[0].frames,'base'],[scenario.frames,'selected']]){
    for(let i=1;i<seq.length;i++){
      const from=seq[i-1].node,to=seq[i].node;if(from===to)continue;
      const key=from+'>'+to;
      if(!edges.has(key))edges.set(key,{key,from,to,path:edgePath(lookup[from],lookup[to]),kind,indices:[]});
      const edge=edges.get(key);if(kind==='selected'){edge.kind='selected';edge.indices.push(i);}
    }
  }
  return [...edges.values()];
}
