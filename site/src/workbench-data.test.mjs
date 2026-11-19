import test from 'node:test';
import assert from 'node:assert/strict';
import {workbenchModes,workbenchScenarios,getWorkbenchRecipe,scenariosFor} from './workbench-data.mjs';
import {getPublicOutcome} from './public-outcomes.mjs';
import {version,candidateVersion} from './data.mjs';

test('integration helper exposes only publicly supported usage outcomes',()=>{
  assert.deepEqual(workbenchModes.map(x=>x.id),['core','request','mutation']);
  for(const mode of workbenchModes){
    assert.ok(workbenchScenarios[mode.id].length>=2);
    for(const scenario of workbenchScenarios[mode.id]){
      const result=getPublicOutcome(mode.id,'scoped',scenario.id);
      assert.ok(result.outcome&&result.detail&&result.owner&&result.verify);
      assert.ok(!('steps' in result),'public outcomes must never expose internal execution steps');
      assert.ok(!('trace' in result));
    }
  }
});

test('tenantless and scoped security expectations remain public',()=>{
  assert.equal(getPublicOutcome('request','tenantless','unverified').outcome,'DENIED · 401');
  assert.equal(getPublicOutcome('request','tenantless','scope').outcome,'REJECTED · 400');
  assert.match(getPublicOutcome('request','tenantless','scope').detail,/active tenant/);
  assert.equal(getPublicOutcome('request','scoped','scope').outcome,'DENIED · 403');
  assert.equal(getPublicOutcome('request','scoped','cross-tenant').outcome,'NOT FOUND · 404');
  assert.equal(getPublicOutcome('request','scoped','membership').outcome,'DENIED · 403');
  assert.equal(getPublicOutcome('request','scoped','module').outcome,'DENIED · 403');
  assert.match(getPublicOutcome('request','scoped','denied').detail,/resource-owning product authorization/);
  assert.ok(!scenariosFor('request','tenantless').some(x=>['membership','module','cross-tenant'].includes(x.id)));
  assert.throws(()=>getPublicOutcome('request','tenantless','membership'),/not available/);
});

test('JDBC public outcomes keep exact replay and conflict safety',()=>{
  assert.match(getPublicOutcome('mutation','scoped','success').detail,/one product-owned transaction/);
  assert.equal(getPublicOutcome('mutation','scoped','replay').outcome,'SAFE REPLAY');
  assert.match(getPublicOutcome('mutation','scoped','replay').detail,/fresh authorization/);
  assert.equal(getPublicOutcome('mutation','scoped','in-progress').outcome,'IN PROGRESS');
  assert.equal(getPublicOutcome('mutation','scoped','conflict').outcome,'CONFLICT · 409');
  assert.match(getPublicOutcome('mutation','scoped','conflict').detail,/not an automatic JDBC response/);
});

test('generated starter recipes remain pinned to published artifacts',()=>{
  for(const mode of workbenchModes){
    const r=getWorkbenchRecipe(mode.id,'scoped',true);
    assert.equal(r.version,'0.3.2');
    assert.ok(r.maven.includes('platform-kernel'));
    assert.ok(r.maven.includes('<scope>test</scope>'));
    assert.ok(r.maven.includes('<version>'+version+'</version>'));
    assert.ok(!r.maven.includes(candidateVersion));
    assert.ok(!r.java.includes('RequestContextPipeline.tenantless('));
    assert.ok(r.checks.length>=2&&r.appOwnership);
    assert.ok(['first','request','jdbc'].includes(r.guideId));
  }
  assert.deepEqual(getWorkbenchRecipe('core').artifacts,['platform-kernel']);
  assert.deepEqual(getWorkbenchRecipe('request').artifacts,['platform-kernel']);
  assert.deepEqual(getWorkbenchRecipe('mutation').artifacts,['platform-kernel','platform-kernel-jdbc']);
  assert.match(getWorkbenchRecipe('core').java,/UuidV7.generate/);
  assert.match(getWorkbenchRecipe('request','tenantless').java,/EndpointPolicy.tenantless/);
  assert.match(getWorkbenchRecipe('request','scoped').java,/TenantContext.tenant/);
  assert.match(getWorkbenchRecipe('mutation').java,/executeIdempotent/);
});
