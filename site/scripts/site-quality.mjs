// Dependency-free, deterministic build/link inventory for UX issue #83.
// External hosts are listed for review but never fetched as flaky PR gates.
import assert from 'node:assert/strict';
import {readFile,readdir,access,appendFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {developerGuides} from '../src/docs-data.mjs';
import {version,candidateVersion,candidateStatus} from '../src/data.mjs';
import {resolveRoute,siteNavigation,referenceTopics} from '../src/routes.mjs';
import {workbenchModes,scenariosFor} from '../src/workbench-data.mjs';

const root=resolve(fileURLToPath(new URL('../..',import.meta.url)));
const site=resolve(root,'site'),dist=resolve(site,'dist');
const urls=[
 '#/',...developerGuides.map(g=>'#/docs/'+g.id),'#/docs/preview',
 ...referenceTopics.map(r=>'#/reference/'+r.id),
 ...workbenchModes.flatMap(mode=>
   (mode.id==='request'?['scoped','tenantless']:['scoped'])
    .flatMap(scope=>scenariosFor(mode.id,scope)
      .map(s=>'#/playground?mode='+mode.id+'&scope='+scope+'&scenario='+s.id)))
];
assert.equal(siteNavigation.length,4,'four destinations only');
assert.equal(new Set(urls).size,urls.length,'duplicate representative route');
for(const hash of urls)assert.notEqual(resolveRoute(hash).page,'notfound','invalid site route '+hash);
assert.equal(candidateStatus,'unpublished','candidate must not be published by changing website');
assert.equal(version,'0.3.2','published source pin requires separately approved release');
assert.equal(candidateVersion,'0.4.0');
const files=await readdir(dist);
for(const required of ['index.html','app.js','app.css'])assert.ok(files.includes(required),'missing asset '+required);
const assets=[];
for(const name of ['app.js','app.css','index.html']){
 const bytes=await readFile(resolve(dist,name));
 assets.push({name,raw:bytes.length,gzip:gzipSync(bytes,{level:9}).length,sha256:createHash('sha256').update(bytes).digest('hex')});
}
const html=await readFile(resolve(dist,'index.html'),'utf8');
assert.ok(html.includes('lang="en"')&&html.includes('name="viewport"'),'missing language/viewport');
assert.ok(html.includes('./app.js')&&html.includes('./app.css'),'missing relative Pages assets');
let internal=0;const hosts=new Set();
for(const md of ['README.md','site/README.md','site/qa/accessibility-baseline.md','site/qa/onboarding-first-program.md',
 'site/qa/request-identity-journey.md','site/qa/jdbc-recovery-journey.md',
 'site/qa/docs-findability-journey.md','site/qa/playground-interaction-journey.md','site/qa/quality-gates-issue-83.md']){
 const full=resolve(root,md),body=await readFile(full,'utf8');
 for(const match of body.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)){
  const target=match[1].trim().split(/\s+"/,1)[0].replace(/^<|>$/g,'');
  if(!target||target.startsWith('#')&&!target.startsWith('#/'))continue;
  if(target.startsWith('#/')){
    assert.notEqual(resolveRoute(target).page,'notfound',md+' has unknown route '+target);
    internal++;continue;
  }
  if(/^https?:\/\//i.test(target)){hosts.add(new URL(target).hostname);continue}
  if(/^[a-z]+:/i.test(target))continue;
  const local=decodeURIComponent(target.split(/[?#]/)[0]);
  if(!local)continue;
  const file=resolve(dirname(full),local);
  assert.ok(file.startsWith(root+'/'),'relative URL escapes repository: '+md+' → '+target);
  await access(file).catch(()=>{throw Error('Broken local Markdown link: '+md+' → '+target)});
  internal++;
 }
}
let budget='advisory only; pending owner baseline acceptance';
try{
 const baseline=JSON.parse(await readFile(resolve(site,'qa/performance-baseline.json'),'utf8'));
 for(const a of assets){const max=baseline.maxGzipBytes?.[a.name];if(max!==undefined)assert.ok(a.gzip<=max,a.name+' gzip '+a.gzip+' exceeds reviewed cap '+max)}
 budget='enforced: '+baseline.basis;
}catch(error){if(error.code!=='ENOENT')throw error}
const md=['## Website build quality (not Lighthouse)',
 '| Asset | Raw bytes | Gzip bytes | SHA-256 |','| --- | ---: | ---: | --- |',
 ...assets.map(a=>'| '+a.name+' | '+a.raw+' | '+a.gzip+' | '+a.sha256+' |'),
 '',
 '- Site route matrix: '+urls.length+' validated routes.',
 '- Markdown local links: '+internal+' checked; '+hosts.size+' external hostnames inventoried, not fetched.',
 '- Bundle budget: '+budget+'.',
 '- Automated browser checks and post-deploy public proof are separate from this source snapshot.',
 '- Does NOT certify WCAG or actual 200%/400% zoom.'
];
console.log('SITE_QUALITY_SNAPSHOT '+JSON.stringify({assets,routeCount:urls.length,internalLinks:internal,externalHostCount:hosts.size,budget}));
if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,md.join('\n')+'\n');
