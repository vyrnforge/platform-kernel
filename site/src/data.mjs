export const repo='https://github.com/vyrnforge/platform-kernel';
export const commit='078cb93b23e03b190abecb0ff3896945cf0ea509';
export const source=(path)=>repo+'/'+(path.endsWith('/')?'tree':'blob')+'/'+commit+'/'+path;
export const capabilities=[
{title:'Identity & tenancy',category:'Security',status:'Integration required',summary:'Provider-neutral identity, explicit tenant and membership guard.',ships:'ValidatedIdentityAdapter and RequestContextPipeline normalize trusted identity and enforce tenant/module gates.',needs:'Trusted token verifier, membership store and product authorization policy.',path:'kernel-core/'},
{title:'API standards',category:'Security',status:'Implemented',summary:'Consistent request context, correlation headers and safe errors.',ships:'Framework-neutral HttpRequestContextAdapter and HttpKernelErrorMapper; 400, 401, 403 and cross-tenant 404 mapping.',needs:'Web framework, endpoint wiring and domain error policy.',path:'kernel-http/'},
{title:'IDs & contracts',category:'Foundation',status:'Implemented',summary:'UUIDv7 and versioned, transport-neutral schemas.',ships:'Java records and released v0.2 JSON Schema; immutable historical v0.1 contract baseline.',needs:'Domain-owned payloads and compatibility-aware consumers.',path:'contracts/'},
{title:'Module & feature controls',category:'Security',status:'Integration required',summary:'Registry, entitlements, feature flags and non-secret config.',ships:'StaticProductModuleRegistry, entitlement/feature/configuration ports and in-memory test adapters.',needs:'Authoritative production stores and rollout policy. Flags are not permissions.',path:'kernel-controls/'},
{title:'Idempotency',category:'Reliability',status:'Implemented',summary:'Tenant-scoped acquire, replay, in-progress and conflict.',ships:'JdbcIdempotencyPort persists leases and completed results with fingerprint checks.',needs:'Fingerprint, expiry and domain crash-consistency strategy.',path:'kernel-persistence-jdbc/src/main/java/io/vyrnforge/platform/kernel/persistence/jdbc/JdbcIdempotencyPort.java'},
{title:'Events & audit',category:'Reliability',status:'Implemented',summary:'Atomic intents, durable outbox and append-oriented audit.',ships:'JdbcReliabilityTransaction commits domain change plus event/audit on one connection. Publisher retries and marks DEAD.',needs:'Transport, scheduler, consumer deduplication and retention/re-drive operations.',path:'kernel-persistence-jdbc/'},
{title:'Observability & health',category:'Operations',status:'Implemented',summary:'Correlation, safe telemetry and liveness/readiness.',ships:'CorrelationPropagation, TelemetryAttributes and HealthAggregator.',needs:'Logging/tracing/metrics backend, endpoints and SLOs.',path:'kernel-observability/'},
{title:'File references',category:'Foundation',status:'Contract only',summary:'Opaque external file reference and optional metadata.',ships:'FileReference contract; possession never grants file access.',needs:'File Storage client and authorization integration; deferred from V2.',path:'kernel-core/src/main/java/io/vyrnforge/platform/kernel/file/FileReference.java'},
{title:'Consumer testkit',category:'Foundation',status:'Implemented',summary:'Deterministic adapters and Asset reference validation.',ships:'In-memory ports and PostgreSQL reference tests demonstrate integration boundaries.',needs:'Real Asset/ITSM adoption, load testing and operational acceptance.',path:'consumer-tests/asset-reference/'}
];
export const architectures=[
{title:'Single product',label:'01 / START SIMPLE',description:'Embed the kernel in an Asset application. Keep one product database and add durable reliability only where needed.',products:[{name:'Asset Management',instances:1,db:'Asset DB + reliability'}],external:'IAM / external IdP · optional event transport',note:'No mandatory kernel server. Product owns its data.'},
{title:'Multi-product suite',label:'02 / GROW INDEPENDENTLY',description:'Asset and ITSM use the same versioned contracts but remain independent applications and data owners.',products:[{name:'Asset Management',instances:1,db:'Asset DB + reliability'},{name:'ITSM / ESM',instances:1,db:'ITSM DB + reliability'}],external:'Provider-neutral identity · event transport · observability',note:'ITSM integration is the next validation target, not a shipped application.'},
{title:'Scaled SaaS',label:'03 / SCALE HORIZONTALLY',description:'Replicate each product behind a gateway. Keep tenant-aware data access and durable outbox/idempotency stores shared within each product deployment.',products:[{name:'Asset Management',instances:3,db:'Asset DB + reliability'},{name:'ITSM / ESM',instances:3,db:'ITSM DB + reliability'}],external:'Event transport · telemetry collectors · worker scheduling',note:'Illustrative topology; throughput, DB capacity and tenant isolation require deployment testing.'},
{title:'Dedicated environment',label:'04 / ISOLATE BY CUSTOMER',description:'Run independent product instances and storage inside a dedicated customer environment, with its own identity provider and operations.',products:[{name:'Customer A / Asset',instances:2,db:'Customer A DB'},{name:'Customer B / Asset',instances:2,db:'Customer B DB'}],external:'Per-environment identity, transport and telemetry',note:'Deployment portability is a design goal, not a certified customer-VPC deployment.'}
];
export const demos=[
{title:'Secure request',steps:['HTTP edge','Identity','Tenant & resource','Entitlement','Domain authorization','Product handler'],scenarios:[
{name:'Allowed request',at:5,result:'200 · handler executes',detail:'A trusted identity, tenant membership, enabled module and product authorization resolve a request context. The product owns its business response.'},
{name:'Invalid credential',at:1,result:'401 · authentication failed',detail:'The upstream verifier must validate credentials before constructing the trusted projection.'},
{name:'No active tenant',at:2,result:'403 · tenant required',detail:'A tenant-scoped endpoint cannot execute without an active tenant.'},
{name:'Cross-tenant resource',at:2,result:'404 · resource hidden',detail:'Resource tenant does not match active tenant. Product must also scope database queries.'},
{name:'Not a member',at:2,result:'403 · membership required',detail:'Identity and tenant membership are distinct.'},
{name:'Module disabled',at:3,result:'403 · module disabled',detail:'Tenant entitlement is checked independently of domain permissions.'},
{name:'Permission denied',at:4,result:'403 · access denied',detail:'Resource-owning product implements the domain authorization hook.'}
]},
{title:'Reliable mutation',steps:['Authorized request','Idempotency begin','Domain + audit + event','Commit','Complete lease','Response'],scenarios:[
{name:'First request',at:5,result:'ACQUIRED → completed',detail:'Domain mutation, audit and event intent share a JDBC transaction. Idempotency completion occurs separately.'},
{name:'Duplicate request',at:1,result:'REPLAY · stored result',detail:'Same tenant, operation, key and fingerprint returns the completed result without rerunning the mutation.'},
{name:'Concurrent retry',at:1,result:'IN_PROGRESS',detail:'Same fingerprint is already executing. Caller decides response and retry behavior.'},
{name:'Conflicting payload',at:1,result:'CONFLICT',detail:'Same key with different fingerprint is rejected.'},
{name:'Transaction rollback',at:2,result:'Rolled back',detail:'No committed domain mutation, audit or event intent; caller manages lease abort.'},
{name:'Crash after commit',at:3,result:'Risk · replay gap',detail:'Domain commit precedes lease completion. After expiry, retry can acquire again; product needs reconciliation or domain uniqueness.'}
]},
{title:'Events & audit',steps:['Atomic commit','Outbox PENDING','Worker claim','Transport publish','Delivery state'],scenarios:[
{name:'Successful publish',at:4,result:'PUBLISHED',detail:'A transport adapter delivers the event; consumers must deduplicate event IDs.'},
{name:'Transient failure',at:3,result:'PENDING · retry later',detail:'Bounded retry delays publication; the event remains durable.'},
{name:'Attempts exhausted',at:4,result:'DEAD · operator action',detail:'Terminal failure is visible. Operations need monitoring, reconciliation and explicit re-drive.'},
{name:'Worker crash',at:2,result:'Lease expiry · reclaim',detail:'Abandoned claim can be reclaimed. Duplicate delivery is possible; stale-worker fencing requires hardening.'}
]},
{title:'Operations',steps:['Request correlation','Event propagation','Safe telemetry','Health probes','Operator'],scenarios:[
{name:'Healthy dependency',at:4,result:'Ready + live',detail:'Product supplies health probes and exports telemetry to its chosen backend.'},
{name:'Database unavailable',at:3,result:'Not ready',detail:'Readiness can fail separately from liveness; probe errors use safe codes.'},
{name:'Trace across products',at:4,result:'Shared correlation',detail:'Business correlation is preserved while each invocation has a new request ID. Tenant and actor dimensions default off.'}
]}
];
export const sections=['overview','product','capabilities','architecture','demo','usecases','readiness','adoption','start'];
