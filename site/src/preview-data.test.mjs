import test from 'node:test';
import assert from 'node:assert/strict';
import {preview,searchPreview} from './preview-data.mjs';
import {version,candidateVersion} from './data.mjs';
import {resolveRoute,siteNavigation} from './routes.mjs';

test('legacy preview link remains a release-status page without a new primary route',()=>{
  assert.equal(resolveRoute('#/docs/preview').page,'docs');
  assert.equal(resolveRoute('#/docs/preview').id,'preview');
  assert.deepEqual(siteNavigation.map(x=>x.id),['home','docs','playground','reference']);
  assert.equal(version,'0.3.2');
  assert.equal(preview.version,candidateVersion);
  assert.equal(preview.status,'NOT RELEASED');
  assert.equal(preview.published,version);
});

test('public release status does not bundle future code examples or engineering design',()=>{
  assert.equal(preview.samples,undefined);
  assert.equal(preview.changes,undefined);
  assert.equal(preview.checks,undefined);
  assert.match(preview.summary,/under review/);
  assert.ok(preview.guidance.some(x=>x.includes('Maven Central')));
  assert.ok(searchPreview('release status'));
  assert.ok(searchPreview('0.4.0'));
  assert.equal(searchPreview('JacksonRecordCodec'),false);
  assert.equal(searchPreview('ObjectMapper'),false);
  assert.equal(searchPreview('unlikely-preview-needle-zzz'),false);
});
