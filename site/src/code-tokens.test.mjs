import test from 'node:test';
import assert from 'node:assert/strict';
import {tokenizeCode} from './code-tokens.mjs';
import {developerGuides} from './docs-data.mjs';

test('syntax coloring never alters or executes the displayed source',()=>{
  for(const guide of developerGuides)for(const sample of guide.samples){
    const parts=tokenizeCode(sample.code,sample.language);
    assert.equal(parts.map(x=>x.text).join(''),sample.code,guide.id+'/'+sample.label);
  }
});

test('highlights Java, XML and comments while keeping the literal markup safe',()=>{
  assert.ok(tokenizeCode('public final class A {}','java').some(x=>x.kind==='keyword'));
  assert.ok(tokenizeCode('<dependency><version>0.3.2</version></dependency>','xml').some(x=>x.kind==='tag'));
  assert.ok(tokenizeCode('// no token verification','java').some(x=>x.kind==='comment'));
});
