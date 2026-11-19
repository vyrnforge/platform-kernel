import {scenariosFor} from './workbench-data.mjs';

// Public, source-pinned contract outcomes only. This browser does not model
// the Kernel's internal execution sequence, invoke IAM, or run JDBC.
const requestOutcomes={
  success:{
    outcome:'REQUEST ALLOWED',
    detail:'A verified actor is authorized for the endpoint and resource. The consuming product remains responsible for its own data-access policy.',
    owner:'Application and identity provider',
    verify:'Test trusted identity, permitted scope and resource authorization.'
  },
  unverified:{
    outcome:'DENIED · 401',
    detail:'Unverified credentials must not become trusted actor context. Authentication is performed by the application or identity provider.',
    owner:'Application / IAM or IdP',
    verify:'Reject invalid or expired credentials before creating trusted context.'
  },
  'cross-tenant':{
    outcome:'NOT FOUND · 404',
    detail:'A resource belonging to another tenant must not be disclosed. The published HTTP mapping can return an existence-safe 404.',
    owner:'Application resource owner',
    verify:'Attempt access across tenants and confirm no resource data escapes.'
  },
  membership:{
    outcome:'DENIED · 403',
    detail:'A trusted identity without membership in the active tenant must not access tenant-owned data.',
    owner:'Application membership authority',
    verify:'Deny access when authoritative tenant membership is missing.'
  },
  module:{
    outcome:'DENIED · 403',
    detail:'Disabled or ineffective tenant module entitlement denies access; entitlement never grants resource permission.',
    owner:'Application entitlement authority',
    verify:'Test missing, disabled and future-effective module entitlements.'
  },
  denied:{
    outcome:'DENIED · 403',
    detail:'Verified identity and active module entitlement cannot override resource-owning product authorization.',
    owner:'Resource-owning application',
    verify:'Enforce the resource permission check for every request.'
  }
};
const mutationOutcomes={
  success:{
    outcome:'ATOMIC INTENT COMMIT',
    detail:'For a newly acquired mutation, the application must commit its domain change, required event/audit intents and replay result in one product-owned transaction; delivery follows at least once.',
    owner:'Application transaction and transport',
    verify:'Test rollback, outbox delivery, consumer deduplication and recovery.'
  },
  replay:{
    outcome:'SAFE REPLAY',
    detail:'After fresh authorization, a completed matching key returns its stored result without repeating domain SQL or creating new intents.',
    owner:'Application authorization and JDBC',
    verify:'Confirm an authorized replay never duplicates the mutation.'
  },
  'in-progress':{
    outcome:'IN PROGRESS',
    detail:'A matching in-flight request does not start another mutation. The product must return safe retry guidance.',
    owner:'Application and JDBC',
    verify:'Exercise a concurrent retry without a duplicate write.'
  },
  conflict:{
    outcome:'CONFLICT · 409',
    detail:'A reused key with a different request fingerprint is a conflict. 409 is an illustrative product HTTP mapping, not an automatic JDBC response.',
    owner:'Application and JDBC',
    verify:'Reject conflicting intent without executing new SQL.'
  }
};
export function getPublicOutcome(mode='core',scope='scoped',scenario='success'){
  if(!scenariosFor(mode,scope).some(x=>x.id===scenario))throw Error('Scenario is not available for this mode and scope');
  if(mode==='core')return {
    outcome:'CORE READY',
    detail:scenario==='no-infrastructure'
      ?'The embedded core library needs no hosted Kernel server, IAM, database or broker.'
      :'Use published UUIDv7 and correlation APIs; your application chooses how to propagate context.',
    owner:'Consuming Java application',
    verify:'Compile the released Java 21 example and check unique IDs.'
  };
  if(mode==='request'&&scenario==='scope')return scope==='tenantless'?{
    outcome:'REJECTED · 400',
    detail:'A tenantless endpoint rejects an unexpected active tenant context.',
    owner:'Application endpoint configuration',
    verify:'Send an active tenant to an explicitly tenantless endpoint.'
  }:{
    outcome:'DENIED · 403',
    detail:'A tenant-scoped endpoint requires a trusted active tenant.',
    owner:'Application endpoint configuration',
    verify:'Reject a missing active tenant on a scoped endpoint.'
  };
  const outcomes=mode==='request'?requestOutcomes:mutationOutcomes;
  return outcomes[scenario];
}
