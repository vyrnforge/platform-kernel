import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveRoute,canonicalHash,siteNavigation,referenceTopics} from './routes.mjs';
import {developerGuides} from './docs-data.mjs';

test('four top-level destinations and addressable guide/reference pages',()=>{
  assert.deepEqual(siteNavigation.map(x=>x.id),['home','docs','playground','reference']);
  assert.equal(resolveRoute('').page,'home');
  assert.equal(resolveRoute('#/playground').page,'playground');
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
