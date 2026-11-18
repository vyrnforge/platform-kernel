// Main-only deploy gate: verify the public Pages URL serves the EXACT JS/CSS
// from the just-deployed build, not merely a successful upload/deploy API call.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {appendFile} from 'node:fs/promises';
const [pageUrl,expectedJs,expectedCss]=process.argv.slice(2);
assert.ok(pageUrl&&/^[a-f0-9]{64}$/.test(expectedJs||'')&&/^[a-f0-9]{64}$/.test(expectedCss||''),
  'Usage: node site/scripts/verify-deployment.mjs <url> <js_sha256> <css_sha256>');
const base=new URL(pageUrl);
assert.equal(base.protocol,'https:','Pages URL must be HTTPS');
assert.ok(base.pathname.endsWith('/'),'Pages base must end with a slash');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function fetchAsset(relative,attempt){
 const url=new URL(relative,base);
 url.searchParams.set('qa_provenance',String(attempt)+'-'+expectedJs.slice(0,12));
 const response=await fetch(url,{headers:{'cache-control':'no-cache'},redirect:'follow',signal:AbortSignal.timeout(12000)});
 assert.ok(response.ok,'HTTP '+response.status+' for '+url.origin+url.pathname);
 assert.equal(new URL(response.url).protocol,'https:','unexpected plaintext redirect');
 return Buffer.from(await response.arrayBuffer());
}
let last;
for(let attempt=1;attempt<=9;attempt++){
 try{
  const html=(await fetchAsset('index.html',attempt)).toString('utf8');
  assert.ok(html.includes('./app.js')&&html.includes('./app.css'),'index missing bundled asset references');
  const [js,css]=await Promise.all([fetchAsset('app.js',attempt),fetchAsset('app.css',attempt)]);
  assert.equal(digest(js),expectedJs,'public app.js differs from exact built artifact');
  assert.equal(digest(css),expectedCss,'public app.css differs from exact built artifact');
  const summary=['### Public Pages verification','- URL: '+base.href,
   '- Published JS SHA-256: '+expectedJs,'- Published CSS SHA-256: '+expectedCss,
   '- Verified exact asset provenance: PASS (attempt '+attempt+')',
   '- This is deployment evidence, not a human UX or WCAG acceptance test.'].join('\n')+'\n';
  if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,summary);
  console.log('PUBLIC_PAGES_SHA256_MATCH '+JSON.stringify({url:base.href,attempt,js:expectedJs,css:expectedCss}));
  process.exit(0);
 }catch(error){last=error;console.error('Pages propagation attempt '+attempt+': '+error.message);if(attempt<9)await pause(10000)}
}
throw Error('Public Pages asset SHA-256 did not match the just-deployed build after bounded retries: '+last);
