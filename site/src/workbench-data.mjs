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

// This module intentionally provides only publicly supported scenario choices
// and released integration recipes. Internal implementation/gate traces do not
// belong in the public website bundle. Refer to released Java contracts for
// security, tenant, transaction and retry obligations.

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
