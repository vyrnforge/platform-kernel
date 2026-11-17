import test from 'node:test';
import assert from 'node:assert/strict';
import {capabilities,architectures,source,version,candidateVersion,candidateStatus,candidatePr,repo} from './data.mjs';

test('all public capability and topology references are release-pinned',()=>{
  assert.equal(version,'0.3.2');
  assert.equal(capabilities.length,9);
  assert.equal(architectures.length,4);
  for(const capability of capabilities){
    assert.match(source(capability.path),/c86eb33a46fae2843c75181c6b395cd0dc6710fe/);
    assert.match(capability.usagePath,/^docs\/.+\.md$/);
    assert.ok(capability.title&&capability.ships&&capability.needs);
  }
});

test('published and candidate releases remain separately described',()=>{
  assert.equal(candidateVersion,'0.4.0');
  assert.equal(candidateStatus,'unpublished');
  assert.equal(candidatePr,repo+'/pull/65');
});

test('topologies retain domain independence and no required Kernel runtime',()=>{
  assert.ok(architectures.every(a=>a.products.length>0&&a.note));
  assert.ok(architectures.every(a=>!a.description.includes('mandatory kernel server')));
});
