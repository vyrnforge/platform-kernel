import test from 'node:test';
import assert from 'node:assert/strict';
import {documentationVersion, developerGuides} from './docs-data.mjs';
import {version, candidateVersion, capabilities, source} from './data.mjs';

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
    assert.ok(guide.prerequisite && guide.when && guide.ownership && guide.verify);
    for (const sample of guide.samples) {
      assert.ok(sample.code && sample.kind && sample.label);
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
