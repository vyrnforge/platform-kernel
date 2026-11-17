import test from 'node:test';
import assert from 'node:assert/strict';
import {workbenchModes,workbenchScenarios,getWorkbenchTrace,getWorkbenchRecipe,scenariosFor} from './workbench-data.mjs';
import {version,candidateVersion} from './data.mjs';

test('workbench offers exactly the three supported adoption patterns',()=>{
  assert.deepEqual(workbenchModes.map(x=>x.id),['core','request','mutation']);
  for(const mode of workbenchModes){
    assert.ok(workbenchScenarios[mode.id].length>=2);
    for(const entry of workbenchScenarios[mode.id]){
      const t=getWorkbenchTrace(mode.id,'scoped',entry.id);
      assert.ok(t.outcome&&t.detail);
      assert.ok(t.steps.length>=3);
      assert.ok(t.steps.every(s=>s.name&&s.owner&&s.check&&s.description&&['done','pending','blocked','skipped'].includes(s.state)));
    }
  }
});

test('tenantless requests remain authenticated, scoped requests fail closed',()=>{
  const unauth=getWorkbenchTrace('request','tenantless','unverified');
  assert.equal(unauth.outcome,'DENIED · 401');
  assert.equal(unauth.steps[0].state,'blocked');
  const tenantless=getWorkbenchTrace('request','tenantless','scope');
  assert.equal(tenantless.outcome,'REJECTED · 400');
  assert.match(tenantless.detail,/active tenant/);
  assert.equal(getWorkbenchTrace('request','tenantless','success').steps[2].state,'skipped');
  assert.equal(getWorkbenchTrace('request','tenantless','success').steps[3].state,'skipped');
  const scoped=getWorkbenchTrace('request','scoped','scope');
  assert.equal(scoped.outcome,'DENIED · 403');
  assert.equal(scoped.steps[1].state,'blocked');
  assert.match(getWorkbenchTrace('request','scoped','denied').detail,/product-owned resource authorization/);
  assert.equal(getWorkbenchTrace('request','scoped','cross-tenant').outcome,'NOT FOUND · 404');
  assert.equal(getWorkbenchTrace('request','scoped','cross-tenant').steps[1].state,'blocked');
  assert.equal(getWorkbenchTrace('request','scoped','membership').steps[2].state,'blocked');
  assert.equal(getWorkbenchTrace('request','scoped','module').steps[3].state,'blocked');
  assert.equal(getWorkbenchTrace('request','scoped','denied').steps[4].state,'blocked');
  assert.equal(getWorkbenchTrace('request','scoped','denied').steps[5].state,'pending');
  assert.ok(!scenariosFor('request','tenantless').some(x=>x.id==='membership'||x.id==='module'||x.id==='cross-tenant'));
  assert.throws(()=>getWorkbenchTrace('request','tenantless','membership'),/not available/);
});

test('JDBC dry-run illustrates replay and conflict without claiming live execution',()=>{
  const original=getWorkbenchTrace('mutation','scoped','success');
  assert.match(original.detail,/one product-owned JDBC transaction/i);
  const replay=getWorkbenchTrace('mutation','scoped','replay');
  assert.equal(replay.outcome,'SAFE REPLAY');
  assert.equal(replay.steps[2].state,'skipped');
  const inProgress=getWorkbenchTrace('mutation','scoped','in-progress');
  assert.equal(inProgress.outcome,'IN PROGRESS');
  assert.equal(inProgress.steps[1].state,'blocked');
  assert.equal(inProgress.steps[2].state,'pending');
  const conflict=getWorkbenchTrace('mutation','scoped','conflict');
  assert.equal(conflict.outcome,'CONFLICT · 409');
  assert.equal(conflict.steps[1].state,'blocked');
});

test('generated starter recipes are pinned to published three-JAR contracts',()=>{
  for(const mode of workbenchModes){
    const r=getWorkbenchRecipe(mode.id,'scoped',true);
    assert.equal(r.version,'0.3.2');
    assert.ok(r.maven.includes('platform-kernel'));
    assert.ok(r.maven.includes('<scope>test</scope>'));
    assert.ok(r.maven.includes('<version>'+version+'</version>'));
    assert.ok(!r.maven.includes(candidateVersion));
    assert.ok(!r.java.includes('RequestContextPipeline.tenantless('));
    assert.ok(r.checks.length>=2);
    assert.ok(r.appOwnership);
    assert.ok(['first','request','jdbc'].includes(r.guideId));
    assert.ok(!('guide' in r),'Playground should not link to repository Markdown');
  }
  assert.deepEqual(getWorkbenchRecipe('core').artifacts,['platform-kernel']);
  assert.deepEqual(getWorkbenchRecipe('request').artifacts,['platform-kernel']);
  assert.deepEqual(getWorkbenchRecipe('mutation').artifacts,['platform-kernel','platform-kernel-jdbc']);
  assert.match(getWorkbenchRecipe('core').java,/UuidV7.generate/);
  assert.match(getWorkbenchRecipe('request','tenantless').java,/EndpointPolicy.tenantless/);
  assert.match(getWorkbenchRecipe('request','scoped').java,/TenantContext.tenant/);
  assert.match(getWorkbenchRecipe('mutation').java,/executeIdempotent/);
});
