import test from 'node:test';
import assert from 'node:assert/strict';
import {documentationVersion, developerGuides, searchDeveloperGuides} from './docs-data.mjs';
import {version, candidateVersion, capabilities, source} from './data.mjs';
import {getWorkbenchTrace,scenariosFor} from './workbench-data.mjs';

test('developer documentation targets the released distribution only', () => {
  assert.equal(documentationVersion, version);
  assert.equal(version, '0.3.2');
  assert.equal(candidateVersion, '0.4.0');
  assert.equal(developerGuides.length, 5);
  const ids = new Set(developerGuides.map(g => g.id));
  assert.equal(ids.size, developerGuides.length);
  for (const guide of developerGuides) {
    assert.match(guide.guide, /^docs\/.+\.md$/);
    assert.match(source(guide.source), /c86eb33a46fae2843c75181c6b395cd0dc6710fe/);
    assert.ok(guide.steps.length >= 3, guide.id+' has actionable steps');
    assert.ok(guide.prerequisite && guide.when && guide.provides && guide.ownership && guide.verify);
    assert.ok(guide.mistakes.length >= 2, guide.id+' has practical troubleshooting');
    for (const sample of guide.samples) {
      assert.ok(sample.code && sample.kind && sample.label && sample.filename && sample.language);
      assert.doesNotMatch(sample.code, /RequestContextPipeline\.tenantless\(|new JacksonRecordCodec\(applicationMapper\)/);
      assert.doesNotMatch(sample.code, /<version>0\.4\.0<\/version>|:0\.4\.0/);
    }
  }
});

test('capability explorer connects every capability to a usage guide', () => {
  assert.equal(capabilities.length, 9);
  for (const capability of capabilities) {
    assert.match(capability.usagePath, /^docs\/.+\.md$/, capability.title);
  }
});

test('installation snippets and testkit scope are correct', () => {
  const install = developerGuides.find(g => g.id === 'install');
  assert.ok(install.samples.some(s => s.label === 'Maven' && s.code.includes('<version>0.3.2</version>')));
  assert.ok(install.samples.some(s => s.label === 'Gradle' && s.code.includes('mavenCentral()')));
  const tests = developerGuides.find(g => g.id === 'assure');
  assert.ok(tests.samples.every(s => s.code.includes('<scope>test</scope>')));
});

test('search reaches verification, ownership, examples and troubleshooting without extra destinations',()=>{
  assert.deepEqual(searchDeveloperGuides('nonexistent-needle-xyz'),[]);
  assert.equal(searchDeveloperGuides('  ').length,developerGuides.length);
  assert.ok(searchDeveloperGuides('classpath separator').some(g=>g.id==='first'));
  assert.ok(searchDeveloperGuides('Flyway').some(g=>g.id==='jdbc'));
  assert.ok(searchDeveloperGuides('DomainAuthorizationHook').some(g=>g.id==='request'));
});

test('first program provides a source-verified main class and reproducible run commands',()=>{
  const first=developerGuides.find(g=>g.id==='first');
  assert.ok(first.samples.find(s=>s.label==='Java 21').code.includes('CorrelationContext.create()'));
  assert.ok(first.samples.find(s=>s.label==='Run').code.includes('javac --release 21'));
  assert.ok(first.samples.find(s=>s.label==='Run').code.includes('repo.maven.apache.org/maven2/io/github/vyrnforge/platform-kernel/0.3.2/'));
  assert.ok(first.samples.find(s=>s.label==='Run').code.includes('curl --fail --location'));
  assert.doesNotMatch(first.samples.find(s=>s.label==='Run').code,/maven-dependency-plugin/);
  assert.equal(first.samples.length,3,'Java, Unix and Windows examples');
  const windows=first.samples.find(s=>s.label==='Windows');
  assert.ok(windows.code.includes('Invoke-WebRequest'),'PowerShell download command');
  assert.ok(windows.code.includes("java -cp '.;."),'Windows classpath separator');
  assert.ok(first.expectedOutput.includes('two lowercase canonical UUIDv7'));
  assert.ok(first.samples.find(s=>s.label==='Java 21').kind.includes('Complete'));
  assert.ok(first.samples.find(s=>s.label==='Run').code.includes('platform-kernel-0.3.2.jar'));
  assert.ok(developerGuides.find(g=>g.id==='install').samples.every(s=>s.kind.includes('fragment')));
});

test('published request guide matches scoped and tenantless Kernel failure semantics',()=>{
  const request=developerGuides.find(g=>g.id==='request');
  assert.equal(request.endpointChoices.length,2);
  assert.equal(request.failureCases.length,8);
  const expected=[
    ['unverified','scoped','AUTHENTICATION_FAILED','401',0],
    ['scope-tenantless','tenantless','INVALID_CONTEXT','400',1],
    ['scope-scoped','scoped','TENANT_REQUIRED','403',1],
    ['cross-tenant','scoped','TENANT_CONTEXT_MISMATCH','404',1],
    ['membership','scoped','TENANT_MEMBERSHIP_REQUIRED','403',2],
    ['module','scoped','MODULE_DISABLED','403',3],
    ['denied','scoped','DOMAIN_ACCESS_DENIED','403',4],
    ['tenantless-denied','tenantless','DOMAIN_ACCESS_DENIED','403',4]
  ];
  for(const [id,scope,code,status,blockedStep] of expected){
    const entry=request.failureCases.find(x=>x.id===id);
    assert.ok(entry, id+' missing from request guide');
    assert.equal(entry.failure,code);
    assert.equal(entry.http,status);
    assert.ok(scenariosFor('request',scope).some(x=>x.id===(entry.scenario||entry.id)));
    const trace=getWorkbenchTrace('request',scope,entry.scenario||entry.id);
    assert.equal(trace.steps.findIndex(s=>s.state==='blocked'),blockedStep,id);
    assert.ok(trace.outcome.includes(status),id+' Playground status drift');
    assert.ok(trace.steps.slice(blockedStep+1).every(s=>s.state==='pending'),id+' later gates must not run');
  }
  const tenantless=getWorkbenchTrace('request','tenantless','success');
  assert.equal(tenantless.steps[2].state,'skipped');
  assert.equal(tenantless.steps[3].state,'skipped');
  assert.equal(tenantless.steps[4].state,'done');
  const wiring=request.samples.find(s=>s.label==='Wiring');
  assert.match(wiring.kind,/Integration excerpt/);
  assert.match(wiring.code,/new RequestContextPipeline<>/);
  for(const port of ['TenantMembershipPort','ModuleEntitlementPort','DomainAuthorizationHook']){
    assert.ok(wiring.code.includes(port),port+' required');
  }
  assert.ok(searchDeveloperGuides('TENANT_CONTEXT_MISMATCH').some(x=>x.id==='request'));
  assert.ok(searchDeveloperGuides('current module key').some(x=>x.id==='request'));
  assert.doesNotMatch(wiring.code,/RequestContextPipeline\\.tenantless\(/);
});


test('published JDBC decisions and consumer conformance connect to one Playground',()=>{
  const jdbc=developerGuides.find(g=>g.id==='jdbc');
  const assure=developerGuides.find(g=>g.id==='assure');
  assert.deepEqual(jdbc.decisionStates.map(x=>x.type),['ACQUIRED','REPLAY','IN_PROGRESS','CONFLICT']);
  assert.deepEqual(jdbc.decisionStates.map(x=>x.id),['success','replay','in-progress','conflict']);
  assert.equal(jdbc.recoveryPaths.length,6);
  for(const state of jdbc.decisionStates){
    const trace=getWorkbenchTrace('mutation','scoped',state.id);
    assert.ok(trace.outcome, state.type);
    assert.ok(state.effect&&state.owner&&state.next&&state.recovery);
  }
  for(const id of ['replay','in-progress','conflict']){
    const outcome=jdbc.decisionStates.find(x=>x.id===id);
    assert.match(outcome.effect,/No new domain SQL or intent/i);
  }
  assert.match(jdbc.decisionStates.find(x=>x.id==='conflict').next,/illustrative HTTP 409 is application-owned/);
  assert.match(jdbc.steps.join(' '),/executeIdempotent/);
  assert.match(jdbc.steps.join(' '),/EVERY attempt/);
  assert.match(jdbc.mistakes.join(' '),/do not blindly abort/i);
  assert.ok(searchDeveloperGuides('DEAD').some(x=>x.id==='jdbc'));
  assert.ok(searchDeveloperGuides('CC-27').some(x=>x.id==='assure'));
  assert.deepEqual(assure.conformanceCases.map(x=>x.id),
    ['CC-14','CC-15','CC-16','CC-17','CC-18','CC-19','CC-20','CC-21','CC-22','CC-27']);
  assert.ok(assure.samples.every(s=>s.code.includes('<scope>test</scope>')));
  assert.doesNotMatch(jdbc.samples.map(s=>s.code).join(' '),/0\.4\.0/);
});
