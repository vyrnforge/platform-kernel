// Verify the *exact* published website PowerShell quickstart on Windows JDK 21.
// No local Kernel source or private registry: only the Maven Central 0.3.2 JAR.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtemp,readFile,writeFile,rm,appendFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {developerGuides} from '../src/docs-data.mjs';
import {version} from '../src/data.mjs';

assert.equal(process.platform,'win32','This proof requires an actual Windows runner');
assert.equal(version,'0.3.2','Only the published release is accepted');
const first=developerGuides.find(item=>item.id==='first');
const java=first?.samples.find(item=>item.label==='Java 21');
const windows=first?.samples.find(item=>item.label==='Windows');
assert.equal(java?.filename,'FirstKernelProgram.java');
assert.equal(windows?.language,'powershell');
assert.ok(windows.code.includes('Invoke-WebRequest'), 'Use website PowerShell download');
assert.ok(windows.code.includes("java -cp '.;."), 'Windows classpath must use semicolon');
const jdk=execFileSync('javac',['-version'],{encoding:'utf8',timeout:15000}).trim();
assert.match(jdk,/^javac 21[.\s]/,'Windows verifier must use JDK 21');
const root=await mkdtemp(join(tmpdir(),'kernel-first-win-'));
try{
  await writeFile(join(root,java.filename),java.code+'\n');
  // Wrapper sets fail-fast and quiet transfer; the actual download, javac and
  // java commands below are copied verbatim from the published website sample.
  const script=[
    "$ErrorActionPreference = 'Stop'",
    "$ProgressPreference = 'SilentlyContinue'",
    windows.code,
    "if ($LASTEXITCODE -ne 0) { throw 'Java command exited unsuccessfully' }",
    ''
  ].join('\n');
  await writeFile(join(root,'run-first-program.ps1'),script);
  const output=execFileSync('pwsh',['-NoProfile','-NonInteractive','-File','run-first-program.ps1'],{
    cwd:root,encoding:'utf8',timeout:180000,stdio:['ignore','pipe','pipe']
  }).trim().split(/\r?\n/);
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  assert.equal(output.length,2,'Windows output must contain exactly two UUIDv7 lines');
  for(const line of output)assert.match(line,uuid);
  assert.notEqual(output[0],output[1]);
  const jarName='platform-kernel-'+version+'.jar';
  const bytes=await readFile(join(root,jarName));
  const digest=createHash('sha256').update(bytes).digest('hex');
  // Known independently verified immutable v0.3.2 Maven Central digest from #78.
  assert.equal(digest,'88bd473f9e909d3031b5efce02e1b4189df1d731893190b9910767c3d97eef2e');
  const summary=[
    'Windows PowerShell + JDK 21 published first-program proof: PASS',
    'Website source: site/src/docs-data.mjs first.samples Java 21 and Windows',
    'Published artifact: io.github.vyrnforge:platform-kernel:'+version,
    'Published JAR SHA-256: '+digest,
    'Canonical UUIDv7 output lines: 2',
    'No local library source, IAM, server or database used.'
  ].join('\n');
  console.log(summary);
  if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,summary+'\n');
}finally{
  await rm(root,{recursive:true,force:true});
}
