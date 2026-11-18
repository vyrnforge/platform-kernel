// Guide metadata describes how a consuming Java app would adopt published v0.3.2.
// The authoritative shipped capability descriptions remain in data.mjs.
// No scenario here executes Java, IAM, SQL or an external service in the browser.
export const capabilityGuides=[
  {
    id:'identity',title:'Identity & tenancy',mode:'request',scope:'scoped',scenario:'membership',
    scenarios:['success','unverified','scope','membership'],guideId:'request',
    prepare:[
      'Java 21+ application with the published platform-kernel dependency.',
      'A real token verifier and provider-neutral actor adapter; never trust raw client claims.',
      'Authoritative tenant membership and resource authorization owned by the application.'
    ],
    process:[
      {name:'Verify an actor',owner:'IAM / IdP + application',detail:'Authenticate credentials, then normalize only validated identity into ActorContext.'},
      {name:'Establish one trusted scope',owner:'Kernel request pipeline',detail:'Require the correct active tenant context or an explicitly tenantless policy.'},
      {name:'Apply tenant and domain guards',owner:'Application ports + domain',detail:'Check membership and resource-specific access before reading or writing product data.'}
    ],
    verify:['An unverified identity stops before request policy.','Missing tenant membership denies access; resource decisions remain product-owned.']
  },
  {
    id:'http',title:'API standards',mode:'request',scope:'scoped',scenario:'cross-tenant',
    scenarios:['success','cross-tenant','scope','denied'],guideId:'request',
    prepare:[
      'An HTTP framework integration and the published platform-kernel library.',
      'Trusted request/tenant context and a product-owned error and authorization policy.',
      'Correlation propagation through requests, logs and safe responses.'
    ],
    process:[
      {name:'Adapt the HTTP boundary',owner:'Application framework',detail:'Convert verified framework inputs through the framework-neutral Kernel adapter.'},
      {name:'Enforce request context',owner:'Kernel + product ports',detail:'Apply tenant scope and safe failure mapping without leaking another tenant resource.'},
      {name:'Return safe diagnostics',owner:'Application response layer',detail:'Map approved error codes and correlation IDs while redacting sensitive details.'}
    ],
    verify:['Cross-tenant resource access maps safely to 404 in the documented context.','Never pass raw identity or trust an arbitrary tenant header.']
  },
  {
    id:'ids',title:'IDs & contracts',mode:'core',scope:'scoped',scenario:'success',
    scenarios:['success','no-infrastructure'],guideId:'first',
    prepare:[
      'Java 21+ runtime and the published core dependency.',
      'Application-owned domain identifiers and an explicit correlation propagation policy.',
      'Version-aware consumers for released portable schema contracts.'
    ],
    process:[
      {name:'Create stable technical IDs',owner:'Kernel core',detail:'Use the published UUIDv7 primitives for new technical identifiers.'},
      {name:'Carry context',owner:'Application boundary',detail:'Pass correlation and stable references across application calls and messages.'},
      {name:'Validate contracts',owner:'Consumer integration',detail:'Use released schemas and maintain version compatibility for exchanged payloads.'}
    ],
    verify:['Identifiers are stable and match the documented representation.','Correlation and contract versions are preserved at boundaries.']
  },
  {
    id:'module',title:'Module & feature controls',mode:'request',scope:'scoped',scenario:'module',
    scenarios:['success','module','denied'],guideId:'request',
    prepare:[
      'Published module registry, entitlement and configuration ports.',
      'An authoritative application entitlement store and rollout/configuration sources.',
      'Separate product-owned authorization; feature flags are not permissions.'
    ],
    process:[
      {name:'Register the product module',owner:'Kernel core',detail:'Declare stable module identifiers in the provided registry contracts.'},
      {name:'Resolve effective enablement',owner:'Application-backed port',detail:'Supply current tenant entitlement, configuration and feature data.'},
      {name:'Enforce domain policy',owner:'Product application',detail:'Check resource permissions separately even when a module is enabled.'}
    ],
    verify:['Missing, disabled or future-effective module access is rejected.','A feature flag never grants permission to a domain resource.']
  },
  {
    id:'idempotency',title:'Idempotency',mode:'mutation',scope:'scoped',scenario:'replay',
    scenarios:['success','replay','in-progress','conflict'],guideId:'jdbc',
    prepare:[
      'Published core and optional JDBC adapter, plus an application-owned database and Connection.',
      'Reviewed reliability schema migrations and transaction/rollback handling.',
      'Effective request fingerprints, tenant-scoped keys, retention and fresh authorization per retry.'
    ],
    process:[
      {name:'Authorize and fingerprint',owner:'Product application',detail:'Check the current actor and derive the effective-request fingerprint.'},
      {name:'Acquire the idempotency lease',owner:'Kernel JDBC',detail:'Distinguish ACQUIRED, REPLAY, IN_PROGRESS and CONFLICT.'},
      {name:'Commit or safely replay',owner:'Application + JDBC',detail:'Use one product transaction for domain SQL and required intents; skip new SQL on REPLAY.'}
    ],
    verify:['Replays do not execute duplicate domain SQL.','Concurrent and conflicting retries do not produce another mutation.']
  },
  {
    id:'events',title:'Events & audit',mode:'mutation',scope:'scoped',scenario:'success',
    scenarios:['success','replay'],guideId:'jdbc',
    prepare:[
      'Published JDBC reliability adapter and a product-owned transactional database.',
      'A domain mutation, required audit/event intents and appropriate replay-result handling.',
      'An application-owned outbox publisher, consumer deduplication and recovery procedures.'
    ],
    process:[
      {name:'Make one atomic commitment',owner:'Application + Kernel JDBC',detail:'Persist domain changes and required audit/event intents on the same product-owned Connection.'},
      {name:'Publish after commit',owner:'Application operations',detail:'Use a separate at-least-once worker; a committed intent is not proof of immediate delivery.'},
      {name:'Recover failures',owner:'Application operations',detail:'Monitor claims, deduplicate consumers and reconcile exhausted or DEAD entries.'}
    ],
    verify:['Rollback prevents successful domain writes without their required intents.','Claim fencing, deduplication and DEAD-event reconciliation are verified in the product.']
  },
  {
    id:'observability',title:'Observability & health',mode:null,guideId:'first',
    prepare:[
      'Published core library in a Java 21+ product application.',
      'Application logging, tracing and metrics exporters plus correlation propagation.',
      'Product-owned liveness/readiness endpoints and SLO/health policies.'
    ],
    process:[
      {name:'Attach context',owner:'Kernel contracts + application',detail:'Use CorrelationPropagation and telemetry attribute conventions at trusted boundaries.'},
      {name:'Aggregate readiness',owner:'Kernel HealthAggregator',detail:'Compose health signals without replacing your application-specific readiness policy.'},
      {name:'Export and operate',owner:'Application operations',detail:'Connect your own logging, tracing, metric collectors and alerts.'}
    ],
    verify:['Correlation survives relevant request/job boundaries without leaking secrets.','Readiness and backend exporters are validated in a real consumer.'],
    limitation:'Documentation-led walkthrough: this browser does not collect telemetry or run health checks.'
  },
  {
    id:'files',title:'File references',mode:null,guideId:'first',
    prepare:[
      'Published core FileReference contract and opaque file IDs.',
      'An independent File Storage provider with authoritative grants and byte lifecycle.',
      'Application ownership mapping and permission checks for every file operation.'
    ],
    process:[
      {name:'Keep a stable reference',owner:'Kernel contract',detail:'Represent the external file identifier and optional safe metadata without taking ownership of file bytes.'},
      {name:'Check access at the owner',owner:'File Storage + product',detail:'Resolve resource grants in the authoritative provider; possession of a reference grants no access.'},
      {name:'Use the reference in a domain record',owner:'Product application',detail:'Store references rather than copying file content into Kernel-managed tables.'}
    ],
    verify:['Unapproved actors cannot access a file merely by learning its ID.','The storage service remains authoritative for bytes and lifecycle.'],
    limitation:'Contract-only guide. There is no File Storage client or file execution in this Playground.'
  },
  {
    id:'testkit',title:'Consumer testkit',mode:null,guideId:'assure',testkit:true,
    prepare:[
      'Java 21+ test project with platform-kernel-testkit declared in Maven test scope.',
      'A consuming application’s real ports and integration wiring to verify.',
      'Consumer-owned acceptance tests for tenant, error, transaction and retry boundaries.'
    ],
    process:[
      {name:'Select test-only adapters',owner:'Kernel testkit',detail:'Use deterministic in-memory adapters and fixtures in tests, never in production.'},
      {name:'Exercise application contracts',owner:'Consumer test suite',detail:'Assert guards and failure states around the real consumer’s adapter wiring.'},
      {name:'Verify real integrations separately',owner:'Consumer environment',detail:'Run additional IAM, database, migration and operational checks outside the testkit.'}
    ],
    verify:['Testkit artifacts remain in test scope only.','Green unit tests do not certify production tenant isolation or JDBC behavior.'],
    limitation:'This is guidance about test-scope adapters, not a browser conformance runner.'
  }
];
export const capabilityIds=capabilityGuides.map(x=>x.id);
export function capabilityGuide(id){return capabilityGuides.find(x=>x.id===id)||null;}
export function inferCapability(mode='core',scenario='success'){
  if(mode==='mutation')return scenario==='success'?'events':'idempotency';
  if(mode==='request')return scenario==='module'?'module':scenario==='cross-tenant'?'http':'identity';
  return 'ids';
}
