import {version} from './data.mjs';
import {developerGuides} from './docs-data.mjs';

// Static, deterministic learning model. No Kernel code is executed in the browser.
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
    {id:'success',title:'Authorized request',hint:'Guards pass'},
    {id:'unverified',title:'Unverified identity',hint:'Reject before policy'},
    {id:'scope',title:'Invalid tenant context',hint:'Fail closed'},
    {id:'denied',title:'Resource access denied',hint:'Product decision'}
  ],
  mutation:[
    {id:'success',title:'First committed write',hint:'Single transaction'},
    {id:'replay',title:'Retry after commit',hint:'Safe replay'},
    {id:'conflict',title:'Different payload, same key',hint:'Conflict'}
  ]
};

const step=(name,owner,description,state='done')=>({name,owner,description,state});
const completed=(outcome,detail,steps)=>({outcome,detail,steps});

export function getWorkbenchTrace(mode='core',scope='scoped',scenario='success'){
  if(mode==='core'){
    const offline=scenario==='no-infrastructure';
    return completed('CORE READY',
      offline?'No identity provider, broker or database is needed for these independent calls.':'The application generates a technical ID and correlation context; it decides where to propagate them.',[
      step('Java application','App owned','The application invokes a published API.'),
      step('UUIDv7 + correlation','Kernel · core','The embedded library returns the identifier and context.'),
      step('Continue application work','App owned',offline?'No external service was contacted.':'Your transport or job wiring carries the context onward.')
    ]);
  }
  if(mode==='request'){
    const tenantless=scope==='tenantless';
    if(scenario==='unverified')return completed('DENIED · 401','Unverified callers do not reach the tenant or resource policy.',[
      step('Verify identity','App + IAM / IdP','No trusted identity was established.','blocked'),
      step('Evaluate endpoint scope','Kernel contract','Not evaluated.','pending'),
      step('Authorize resource','App owned','Not evaluated.','pending'),
      step('Handle request','App owned','Handler does not execute.','pending')
    ]);
    if(scenario==='scope')return completed(tenantless?'REJECTED · 400':'DENIED · 403',
      tenantless?'An explicitly tenantless endpoint rejects an active tenant context.':'Tenant membership or the required module gate is not satisfied.',[
      step('Verify identity','App + IAM / IdP','The caller has a trusted normalized identity.'),
      step('Evaluate endpoint scope','Kernel contract',tenantless?'Unexpected active tenant on tenantless policy.':'Tenant membership or entitlement guard fails.','blocked'),
      step('Authorize resource','App owned','Not evaluated.','pending'),
      step('Handle request','App owned','Handler does not execute.','pending')
    ]);
    if(scenario==='denied')return completed('DENIED · 403','A valid identity and tenant scope never substitute for product-owned resource authorization.',[
      step('Verify identity','App + IAM / IdP','A trusted identity projection is available.'),
      step('Evaluate endpoint scope','Kernel contract',tenantless?'Authenticated tenantless policy passes.':'Active tenant, membership and module checks pass.'),
      step('Authorize resource','App owned','Resource-specific policy rejects the operation.','blocked'),
      step('Handle request','App owned','Handler does not execute.','pending')
    ]);
    return completed('REQUEST ALLOWED','Illustrative happy path. Real authentication, membership, domain policy and data ownership stay in your application.',[
      step('Verify identity','App + IAM / IdP','A trusted normalized identity is provided.'),
      step('Evaluate endpoint scope','Kernel contract',tenantless?'Authenticated tenantless policy; no implicit tenant.':'Exactly one active tenant, membership and enabled module.'),
      step('Authorize resource','App owned','Application-specific permission and resource scope pass.'),
      step('Handle request','App owned','The application executes tenant-appropriate business logic.')
    ]);
  }
  if(mode==='mutation'){
    if(scenario==='conflict')return completed('CONFLICT · 409','A key reused for a different effective request cannot execute another domain mutation.',[
      step('Authorize attempt','App owned','Authenticate and authorize this attempt.'),
      step('Acquire idempotency','Kernel · JDBC','Same key, different fingerprint: conflict.','blocked'),
      step('Commit domain and intents','App + JDBC','No new write performed.','pending'),
      step('Operate delivery','App owned','No new outbox work created.','pending')
    ]);
    if(scenario==='replay')return completed('SAFE REPLAY','After fresh authorization, the stored safe result is replayed; domain SQL is not repeated.',[
      step('Authorize attempt','App owned','Reauthorize this retry; never reuse old permission.'),
      step('Acquire idempotency','Kernel · JDBC','Matching committed key yields REPLAY.'),
      step('Commit domain and intents','App + JDBC','Skipped: the original transaction already committed.','skipped'),
      step('Operate delivery','App owned','Original event intent may still need delivery/reconciliation.')
    ]);
    return completed('ATOMIC INTENT COMMIT','Inside one product-owned JDBC transaction, persist the domain change, required audit/event intents and safe replay result.',[
      step('Authorize attempt','App owned','Authenticate and authorize before acquisition.'),
      step('Acquire idempotency','Kernel · JDBC','A new key and fingerprint acquire a lease.'),
      step('Commit domain and intents','App + JDBC','Product SQL, event/audit intents and safe replay result commit together.'),
      step('Operate delivery','App owned','Separate at-least-once publisher and deduplicating consumer; not immediate delivery.')
    ]);
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
    guide:guide.guide,guideId,
    checks,
    appOwnership: mode==='core'?'Runtime composition, logging and propagation':
      mode==='request'?'Authentication, membership sources, domain authorization and data':
      'Business SQL, connection lifecycle, delivery transport and recovery'
  };
}
