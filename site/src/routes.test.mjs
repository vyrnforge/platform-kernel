import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveRoute,canonicalHash,siteNavigation,referenceTopics} from './routes.mjs';
import {developerGuides} from './docs-data.mjs';
import {readFileSync} from 'node:fs';

test('four top-level destinations and addressable guide/reference pages',()=>{
  assert.deepEqual(siteNavigation.map(x=>x.id),['home','docs','playground','reference']);
  assert.equal(resolveRoute('').page,'home');
  assert.equal(resolveRoute('#/playground').page,'playground');
  assert.equal(resolveRoute('#/playground').mode,'core');
  assert.deepEqual(
    ['request','scoped','membership'],
    [resolveRoute('#/playground?mode=request&scope=scoped&scenario=membership').mode,
     resolveRoute('#/playground?mode=request&scope=scoped&scenario=membership').scope,
     resolveRoute('#/playground?mode=request&scope=scoped&scenario=membership').scenario]
  );
  assert.equal(resolveRoute('#/playground?mode=request&scope=tenantless&scenario=membership').scenario,'success');
  assert.equal(resolveRoute('#/playground?mode=unknown&scenario=invalid').mode,'core');
  assert.equal(resolveRoute('#/docs/preview').id,'preview');
  assert.equal(resolveRoute('#/docs/preview').page,'docs');
  for(const guide of developerGuides){
    const x=resolveRoute('#/docs/'+guide.id);
    assert.equal(x.page,'docs');
    assert.equal(x.id,guide.id);
  }
  for(const topic of referenceTopics){
    const x=resolveRoute('#/reference/'+topic.id);
    assert.equal(x.page,'reference');
    assert.equal(x.id,topic.id);
  }
});

test('legacy section links resolve to one canonical destination',()=>{
  assert.equal(canonicalHash('#docs'),'#/docs/install');
  assert.equal(resolveRoute('#start').id,'install');
  assert.equal(resolveRoute('#workbench').page,'playground');
  assert.equal(resolveRoute('#demo').page,'playground');
  assert.equal(resolveRoute('#capabilities').id,'capabilities');
  assert.equal(resolveRoute('#architecture').id,'architecture');
  assert.equal(resolveRoute('#next').id,'releases');
  assert.equal(resolveRoute('#product').id,'architecture');
  assert.equal(resolveRoute('#usecases').page,'playground');
  assert.equal(resolveRoute('#content').page,'home');
});

test('unknown paths recover through an explicit not-found page',()=>{
  assert.equal(resolveRoute('#/docs/not-a-guide').page,'notfound');
  assert.equal(resolveRoute('#/reference/obsolete').page,'notfound');
  assert.equal(resolveRoute('#/secret').page,'notfound');
});


test('contextual documentation deep links are valid, bounded, and preserve query for navigation',()=>{
  const route=resolveRoute('#/docs/request?section=failures&q=TENANT_CONTEXT_MISMATCH');
  assert.equal(route.page,'docs');
  assert.equal(route.id,'request');
  assert.equal(route.section,'failures');
  assert.equal(route.searchQuery,'TENANT_CONTEXT_MISMATCH');
  const sample=resolveRoute('#/docs/first?section=example&sample=2&q=PowerShell');
  assert.equal(sample.sampleIndex,2);
  assert.equal(sample.section,'example');
  assert.equal(resolveRoute('#/docs/first?section=evil&sample=99').section,'overview');
  assert.equal(resolveRoute('#/docs/first?section=evil&sample=99').sampleIndex,null);
  assert.equal(resolveRoute('#/docs/preview?section=example').title.includes('NOT RELEASED'),true);
  assert.equal(resolveRoute('#/docs/preview?section=example').section,'overview');
  assert.equal(resolveRoute('#/docs/none?section=steps').page,'notfound');
  assert.equal(resolveRoute('#/docs/first?q='+('x'.repeat(150))).searchQuery.length,120);
});

test('private site package metadata cannot be mistaken for a published Java version',()=>{
  const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
  const lock=JSON.parse(readFileSync(new URL('../package-lock.json',import.meta.url),'utf8'));
  assert.equal(pkg.private,true);
  assert.equal(pkg.version,'0.0.0');
  assert.equal(lock.version,pkg.version);
  assert.equal(lock.packages[''].version,pkg.version);
});


test('invalid Playground URLs recover visibly without running nonexistent scenarios',()=>{
  const unknown=resolveRoute('#/playground?mode=unsupported&scope=tenantless&scenario=anything');
  assert.equal(unknown.page,'playground');
  assert.equal(unknown.mode,'core');
  assert.equal(unknown.scope,'scoped');
  assert.equal(unknown.scenario,'success');
  assert.match(unknown.recovery,/Unknown application pattern/);
  assert.match(unknown.recovery,/Unsupported endpoint scope/);
  assert.match(unknown.recovery,/Scenario unavailable/);
  const notAvailable=resolveRoute('#/playground?mode=request&scope=tenantless&scenario=membership');
  assert.equal(notAvailable.mode,'request');
  assert.equal(notAvailable.scope,'tenantless');
  assert.equal(notAvailable.scenario,'success');
  assert.match(notAvailable.recovery,/Scenario unavailable/);
  assert.equal(resolveRoute('#/playground?mode=request&scope=scoped&scenario=membership').recovery,null);
  assert.equal(resolveRoute('#/playground').recovery,null);
  const unsupportedScope=resolveRoute('#/playground?mode=mutation&scope=tenantless&scenario=replay');
  assert.equal(unsupportedScope.scope,'scoped');
  assert.equal(unsupportedScope.scenario,'replay');
  assert.match(unsupportedScope.recovery,/Unsupported endpoint scope/);
});

test('capability links resolve to the actual guide and supported scenario',()=>{
  const shared=resolveRoute('#/playground?cap=identity');
  assert.deepEqual([shared.mode,shared.scope,shared.capabilityId,shared.scenario],
    ['request','scoped','identity','membership']);
  assert.equal(shared.recovery,null);
  const replay=resolveRoute('#/playground?cap=idempotency');
  assert.deepEqual([replay.mode,replay.capabilityId,replay.scenario],['mutation','idempotency','replay']);
  assert.equal(replay.recovery,null);

  const mismatched=resolveRoute('#/playground?cap=module&mode=request&scope=scoped&scenario=cross-tenant');
  assert.equal(mismatched.capabilityId,'module');
  assert.equal(mismatched.scenario,'module');
  assert.match(mismatched.recovery,/Scenario unavailable for this capability/);

  const tenantlessMismatch=resolveRoute('#/playground?cap=module&mode=request&scope=tenantless&scenario=module');
  assert.equal(tenantlessMismatch.scenario,'success');
  assert.match(tenantlessMismatch.recovery,/Scenario unavailable for this pattern and scope/);

  const legacyDomainDenial=resolveRoute('#/playground?mode=request&scope=tenantless&scenario=denied');
  assert.equal(legacyDomainDenial.capabilityId,'http');
  assert.equal(legacyDomainDenial.scenario,'denied');
  assert.equal(legacyDomainDenial.recovery,null);

  const contract=resolveRoute('#/playground?cap=files');
  assert.equal(contract.capabilityId,'files');
  assert.equal(contract.mode,'core');
  assert.equal(contract.recovery,null);
  const incompatible=resolveRoute('#/playground?cap=files&mode=request&scenario=success');
  assert.equal(incompatible.capabilityId,'identity');
  assert.match(incompatible.recovery,/Capability and integration pattern do not match/);
});
