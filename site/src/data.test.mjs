import test from 'node:test';
import assert from 'node:assert/strict';
import {capabilities,source,version,candidateVersion,candidateStatus,candidatePr,repo} from './data.mjs';

test('all public capability references are release-pinned',()=>{
  assert.equal(version,'0.3.2');
  assert.equal(capabilities.length,9);
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

test('capability descriptions communicate public usage instead of worker internals',()=>{
  const summary=capabilities.map(x=>x.ships).join(' ');
  assert.doesNotMatch(summary,/V3 claim tokens|locks the lease|stale workers/);
  assert.match(summary,/safe replay/);
});
