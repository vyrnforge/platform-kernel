import {version} from './data.mjs';
import {developerGuides} from './docs-data.mjs';

// A deterministic explanation of released v0.3.2 behavior, NOT a Kernel execution engine.
// Keep application-owned verification, membership, policy and SQL explicit.
export const workbenchModes = [
  {id:'core',number:'01',title:'Core foundation',subtitle:'IDs, correlation and contracts',badge:'No infrastructure',guide:'first'},
  {id:'request',number:'02',title:'Protected API',subtitle:'Trusted identity and tenant boundaries',badge:'Application wiring',guide:'request'},
  {id:'mutation',number:'03',title:'Durable mutation',subtitle:'Retries, atomic intents and outbox',badge:'Optional JDBC',guide:'jdbc'}
];

export const workbenchScenarios = {
  core:[
    {id:'success',title:'Generate and propagate',hint:'Independent core primitives'},
    {id:'no-infrastructure',title:'No database or IAM',hint:'No hidden platform dependency'}
  ],
  request:[
    {id:'success',title:'Authorized request',hint:'All required guards pass'},
    {id:'unverified',title:'Unverified identity',hint:'401 · verify before policy'},
    {id:'scope',title:'Wrong tenant context',hint:'400 or 403 · scope denied'},
    {id:'cross-tenant',title:'Cross-tenant resource',hint:'404 · hide other tenant data',scopes:['scoped']},
    {id:'membership',title:'Missing membership',hint:'403 · product membership port',scopes:['scoped']},
    {id:'module',title:'Disabled module',hint:'403 · entitlement guard',scopes:['scoped']},
    {id:'denied',title:'Resource permission denied',hint:'403 · domain authorization'}
  ],
  mutation:[
    {id:'success',title:'First committed write',hint:'Atomic product transaction'},
    {id:'replay',title:'Retry after commit',hint:'REPLAY · skip duplicate SQL'},
    {id:'in-progress',title:'Concurrent retry',hint:'IN_PROGRESS · no new write'},
    {id:'conflict',title:'Same key, different payload',hint:'CONFLICT · no new write'}
  ]
};

export function scenariosFor(mode='core',scope='scoped'){
  const scenarios=workbenchScenarios[mode];
  if(!scenarios)throw new Error('Unknown workbench mode: '+mode);
  return scenarios.filter(item=>!item.scopes||item.scopes.includes(scope));
}

const step=(name,owner,check,description,state='done')=>({name,owner,check,description,state});
const trace=(outcome,detail,steps)=>({outcome,detail,steps});

// Stop at the first failure; subsequent gates were never called.
// In particular, "not reached" is different from "not required" on valid tenantless flows.
function stopAt(steps,index,outcome,detail,reason){
  return trace(outcome,detail,steps.map((item,i)=>i<index?item:i===index?
    {...item,state:'blocked',description:reason}:{...item,state:'pending',description:'Not evaluated: the previous gate stopped this request.'}));
}

export function getWorkbenchTrace(mode='core',scope='scoped',scenario='success'){
  if(!scenariosFor(mode,scope).some(item=>item.id===scenario))throw new Error('Scenario is not available for this mode and scope');
  if(mode==='core'){
    const offline=scenario==='no-infrastructure';
    return trace('CORE READY',offline?
      'Independent core utilities can run without an IAM server, database, broker or shared Kernel service.':
      'The application generates technical identifiers and propagates correlation over its own boundaries.',[
      step('Invoke Java API','Application','Does the host call an API from the embedded core JAR?','No HTTP server or mandatory framework is involved.'),
      step('Create ID and context','Kernel · core','Does core return a UUIDv7 ID and correlation context?','Use UuidV7.generate() and CorrelationContext.create() from the published library.'),
      step('Propagate context','Application','Where will correlation travel next?','Choose HTTP, event or background-job propagation. The application owns the transport.')
    ]);
  }
  if(mode==='request'){
    const tenantless=scope==='tenantless';
    const steps=[
      step('Verify identity','Application + IAM / IdP','Is the credential actually verified and the actor trusted?',
        'The application validates a credential/session first. The Kernel identity adapter consumes trusted identity; extracting a bearer token does not verify it.'),
      step('Establish request scope','Kernel · request pipeline','Does trusted tenant context match the endpoint policy and resource?',
        tenantless?'A tenantless policy requires no active tenant and no tenant-owned resource.':
          'One active tenant is required; the resource tenant must match the trusted active tenant.'),
      step('Check tenant membership','Application port + Kernel','Does the actor belong to the active tenant?',
        tenantless?'Not invoked on a valid tenantless request.':'Kernel invokes the application-supplied authoritative TenantMembershipPort.',
        tenantless?'skipped':'done'),
      step('Check module entitlement','Application port + Kernel','Is the required tenant module enabled and effective now?',
        tenantless?'Not invoked on a valid tenantless request.':'Kernel checks the supplied ModuleEntitlementPort; enabled is not a resource permission.',
        tenantless?'skipped':'done'),
      step('Authorize resource','Application · domain policy','May this actor perform the action on this actual resource?',
        'DomainAuthorizationHook is supplied by the owning product and still runs for authenticated tenantless operations.'),
      step('Run product handler','Application · business data','Will product-owned reads/writes preserve business and tenant boundaries?',
        'Only after the required checks pass does the application perform its own business logic and tenant-filtered SQL.')
    ];
    if(scenario==='unverified')return stopAt(steps,0,'DENIED · 401',
      'Unverified credentials fail before request or resource policies. The application must not build a trusted actor from raw client claims.',
      'No trusted credential or actor projection was established.');
    if(scenario==='scope')return stopAt(steps,1,tenantless?'REJECTED · 400':'DENIED · 403',
      tenantless?'An active tenant on an explicitly tenantless endpoint is INVALID_CONTEXT (400).':
        'A tenant-scoped policy without an active tenant is TENANT_REQUIRED (403).',
      tenantless?'The endpoint says tenantless, but the request contains an active tenant.':
        'The endpoint requires a tenant; none was established.');
    if(scenario==='cross-tenant')return stopAt(steps,1,'NOT FOUND · 404',
      'The Kernel reports TENANT_CONTEXT_MISMATCH; its HTTP mapper hides another tenant resource behind a 404.',
      'The resource belongs to a different tenant than the trusted request context.');
    if(scenario==='membership')return stopAt(steps,2,'DENIED · 403',
      'The membership port rejects this actor/tenant pair. Do not continue to entitlement or domain reads.',
      'The application membership port returned false.');
    if(scenario==='module')return stopAt(steps,3,'DENIED · 403',
      'MODULE_DISABLED covers missing, disabled, mismatched and future-effective entitlements. A module is not a resource permission.',
      'No currently enabled entitlement was returned for this tenant and module.');
    if(scenario==='denied')return stopAt(steps,4,'DENIED · 403',
      'A verified actor and enabled tenant module do not replace product-owned resource authorization.',
      'The application DomainAuthorizationHook rejects the requested action.');
    return trace('REQUEST ALLOWED',
      tenantless?'Trusted identity and domain authorization pass; membership and module checks are intentionally not invoked.':
        'Trusted identity, tenant scope, membership, module entitlement and product domain authorization pass.',steps);
  }
  if(mode==='mutation'){
    const steps=[
      step('Authorize this attempt','Application · domain policy','Is the caller currently authorized for this exact operation?',
        'Authenticate and check active tenant, module, resource permission and tenant-filtered targets on every retry.'),
      step('Acquire idempotency','Kernel · optional JDBC','Is the key/fingerprint new, replayable, in progress or conflicting?',
        'JdbcIdempotencyPort.begin uses tenant, operation, key, fingerprint and expiry to return ACQUIRED, REPLAY, IN_PROGRESS or CONFLICT.'),
      step('Execute product SQL','Application + JDBC','Did ACQUIRED receive one leased transaction and its Connection?',
        'Only ACQUIRED runs domain SQL through executeIdempotent on the supplied Connection; no manual commit or external side effect.'),
      step('Persist required intents','Application + JDBC','Are audit/event intents and replay result committed with the domain change?',
        'Domain mutation, required intents and idempotency completion are committed atomically inside the same application-owned transaction.'),
      step('Deliver and reconcile','Application · operations','Who publishes, deduplicates and recovers events after commit?',
        'A separate outbox worker publishes at-least-once; consumers deduplicate and operators reconcile failed or DEAD claims.')
    ];
    if(scenario==='conflict')return stopAt(steps,1,'CONFLICT · 409',
      'A reused key with a different fingerprint yields CONFLICT. 409 is an illustrative product HTTP mapping, not an automatic response from the JDBC port.',
      'The stored fingerprint differs. Do not execute new domain SQL or create new intents.');
    if(scenario==='in-progress')return stopAt(steps,1,'IN PROGRESS',
      'A matching key already has an active lease. The product must return safe retry guidance; do not start a second mutation.',
      'Another attempt is still IN_PROGRESS. No new write is acquired.');
    if(scenario==='replay')return trace('SAFE REPLAY',
      'After fresh authorization, the stored result is returned and no domain SQL or new event/audit intent is created. Earlier outbox work may still need delivery.',[
        steps[0],
        {...steps[1],description:'Matching completed key and fingerprint returns REPLAY.'},
        {...steps[2],state:'skipped',description:'Skipped: the previously committed mutation must not be run again.'},
        {...steps[3],state:'skipped',description:'Skipped: the original transaction already persisted its intents and replay result.'},
        {...steps[4],state:'skipped',description:'No new work enqueued; the existing outbox worker may still have delivery or reconciliation to do.'}
      ]);
    return trace('ATOMIC INTENT COMMIT',
      'One product-owned JDBC transaction commits domain data, required audit/event intents and the replay result. Delivery is a separate at-least-once operation.',steps);
  }
  throw new Error('Unknown workbench mode: '+mode);
}

const dependency = (artifact,scope)=>[
  '<dependency>',
  '  <groupId>io.github.vyrnforge</groupId>',
  '  <artifactId>'+artifact+'</artifactId>',
  '  <version>'+version+'</version>',
  ...(scope?['  <scope>'+scope+'</scope>']:[]),
  '</dependency>'
].join('\n');

export function getWorkbenchRecipe(mode='core',scope='scoped',testkit=false){
  const isMutation=mode==='mutation';
  const choice=mode==='request'?(scope==='tenantless'?0:1):isMutation?1:0;
  const guideId=mode==='core'?'first':mode==='request'?'request':'jdbc';
  const guide=developerGuides.find(g=>g.id===guideId);
  const sample=guide.samples[choice];
  const artifacts=['platform-kernel',...(isMutation?['platform-kernel-jdbc']:[]),...(testkit?['platform-kernel-testkit']:[])];
  const maven=artifacts.map(a=>dependency(a,a==='platform-kernel-testkit'?'test':null)).join('\n\n');
  const checks=mode==='core'
    ?['Compile against Java 21 and published v'+version+'.','Decide where your application propagates correlation.']
    :mode==='request'
    ?['Use a real token verifier and normalized identity; never trust client tenant headers.',scope==='tenantless'?'Test authenticated tenantless behavior and reject unexpected active tenant.':'Test no membership, disabled module and cross-tenant resource access.','Keep resource authorization and tenant-filtered queries in your application.']
    :['Reauthorize every attempt before acquiring its idempotency key.','Use one product-owned JDBC transaction; verify rollback, replay, conflict and concurrent retries.','Run an outbox publisher, receiver deduplication and DEAD-event reconciliation.'];
  if(testkit)checks.push('Use testkit only in test scope; validate real product wiring separately.');
  return {
    version,artifacts,maven,java:sample.code,javaKind:sample.kind,
    guideId,
    checks,
    appOwnership: mode==='core'?'Runtime composition, logging and propagation':
      mode==='request'?'Authentication, membership sources, domain authorization and data':
      'Business SQL, connection lifecycle, delivery transport and recovery'
  };
}
