import test from 'node:test';import assert from 'node:assert/strict';import {capabilities,architectures,demos,sections,source} from './data.mjs';
test('all content is present and links are immutable',()=>{assert.equal(capabilities.length,9);assert.equal(architectures.length,4);assert.equal(sections.length,9);for(const c of capabilities)assert.match(source(c.path),/078cb93/);});
test('every scenario has a valid flow endpoint',()=>{for(const d of demos)for(const s of d.scenarios){assert.ok(s.at>=0&&s.at<d.steps.length);assert.ok(s.result&&s.detail);}});
