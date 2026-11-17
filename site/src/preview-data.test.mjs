import test from 'node:test';
import assert from 'node:assert/strict';
import {preview,searchPreview} from './preview-data.mjs';
import {version,candidateVersion} from './data.mjs';
import {resolveRoute,siteNavigation} from './routes.mjs';
import {tokenizeCode} from './code-tokens.mjs';

test('prepublication guide is a real website docs route, without new primary destination',()=>{
  assert.equal(resolveRoute('#/docs/preview').page,'docs');
  assert.equal(resolveRoute('#/docs/preview').id,'preview');
  assert.deepEqual(siteNavigation.map(x=>x.id),['home','docs','playground','reference']);
  assert.equal(version,'0.3.2');
  assert.equal(preview.version,candidateVersion);
  assert.equal(preview.status,'NOT RELEASED');
});

test('candidate examples are separated from published installation guidance',()=>{
  assert.equal(preview.published,version);
  assert.ok(preview.samples.some(x=>x.code.includes('RequestContextPipeline.tenantless(')));
  assert.ok(preview.samples.some(x=>x.code.includes('new JacksonRecordCodec(appMapper)')));
  assert.ok(preview.samples.some(x=>x.code.includes('platform-kernel-testkit')&&x.code.includes('<scope>test</scope>')));
  for(const sample of preview.samples){
    assert.equal(tokenizeCode(sample.code,sample.language).map(x=>x.text).join(''),sample.code);
  }
  assert.ok(preview.checks.length>=7);
  assert.ok(searchPreview('ObjectMapper'));
  assert.ok(searchPreview('192/512/512'));
  assert.equal(searchPreview('unlikely-preview-needle-zzz'),false);
});
