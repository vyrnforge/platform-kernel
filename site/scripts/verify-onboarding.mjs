// Isolated proof of exactly the website's published v0.3.2 examples.
// Only JDK 21, Node 22, Maven and Gradle needed; no local Kernel source.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtemp,mkdir,readFile,rm,writeFile,appendFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {developerGuides} from '../src/docs-data.mjs';
import {version} from '../src/data.mjs';

const filename='platform-kernel-'+version+'.jar';
const central='https://repo.maven.apache.org/maven2/io/github/vyrnforge/platform-kernel/'+version+'/'+filename;
const first=developerGuides.find(x=>x.id==='first'),install=developerGuides.find(x=>x.id==='install');
assert.equal(version,'0.3.2','candidate releases must not enter the published first-run test');
assert.ok(first&&install);
const java=first.samples.find(x=>x.label==='Java 21');
const maven=install.samples.find(x=>x.label==='Maven');
const gradle=install.samples.find(x=>x.label==='Gradle');
assert.equal(java.filename,'FirstKernelProgram.java');
function run(cmd,args,dir,env=process.env){
  try{return execFileSync(cmd,args,{cwd:dir,env,encoding:'utf8',timeout:180000,stdio:['ignore','pipe','pipe']}).trim();}
  catch(e){throw Error(cmd+' failed:\n'+(e.stdout?.toString()||'')+'\n'+(e.stderr?.toString()||'')+'\n'+e);}
}
async function centralGet(url){
  // Maven Central's public CDN can briefly return 404 even for an immutable
  // published artifact; an independent Windows consumer verified the same JAR
  // while a Linux CI request saw 404. Retry only bounded public-CDN failures,
  // never change registry, version, checksum policy or accepted artifact bytes.
  const transient=new Set([404,408,429,500,502,503,504]);
  let lastError;
  for(let attempt=1;attempt<=4;attempt++){
    try{
      const res=await fetch(url,{signal:AbortSignal.timeout(60000),redirect:'follow'});
      const resolved=new URL(res.url);
      assert.equal(resolved.protocol,'https:');
      assert.equal(resolved.hostname,'repo.maven.apache.org','no mirror or private repository permitted');
      if(res.ok)return res;
      lastError=new Error('Maven Central request failed: '+url+' '+res.status);
      if(!transient.has(res.status))throw lastError;
    }catch(error){
      if(error===lastError&&lastError.message.startsWith('Maven Central request failed:')&&
          !transient.has(Number(lastError.message.split(' ').at(-1))))throw error;
      lastError=error;
    }
    if(attempt===4)throw lastError;
    console.warn('Published artifact Central fetch retry '+attempt+'/3: '+url+' — '+lastError.message);
    await new Promise(resolve=>setTimeout(resolve,500*2**(attempt-1)));
  }
  throw lastError;
}
const root=await mkdtemp(join(tmpdir(),'kernel-v032-first-program-'));
try {
  // Check that a real JDK 21 is used, not only an installed JRE.
  const javac=run('javac',['-version'],root);
  assert.match(javac,/^javac 21[.\s]/);
  const jar=Buffer.from(await (await centralGet(central)).arrayBuffer());
  assert.ok(jar.length>10000,'JAR unexpectedly small');
  const sha256=createHash('sha256').update(jar).digest('hex');
  const sha1=createHash('sha1').update(jar).digest('hex');
  const advertised=(await (await centralGet(central+'.sha1')).text()).trim().match(/^[a-fA-F0-9]{40}/)?.[0]?.toLowerCase();
  assert.equal(sha1,advertised,'Published SHA-1 metadata mismatch');
  await writeFile(join(root,filename),jar);
  await writeFile(join(root,java.filename),java.code+'\n');
  run('javac',['--release','21','-cp',filename,java.filename],root);
  const out=run('java',['-cp','.:'+filename,'FirstKernelProgram'],root).split(/\r?\n/);
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  assert.equal(out.length,2,'exactly two UUIDv7 output lines expected');
  out.forEach(x=>assert.match(x,uuid));
  assert.notEqual(out[0],out[1]);
  console.log('Java 21 CLI: PASS. JAR bytes='+jar.length+' SHA-256='+sha256);
  // Validate the actual on-site request wiring excerpt against the published JAR.
  // Application ports are supplied as typed method arguments, so the snippet
  // remains clearly an excerpt rather than a runnable authentication service.
  const requestGuide=developerGuides.find(x=>x.id==='request');
  const wiring=requestGuide?.samples.find(x=>x.label==='Wiring');
  assert.ok(wiring?.kind.includes('Integration excerpt'),'source-reviewed wiring excerpt missing');
  const wiringLines=wiring.code.split('\n');
  const imports=wiringLines.filter(x=>x.startsWith('import '));
  const body=wiringLines.filter(x=>!x.startsWith('import ')).join('\n');
  const wrapper=imports.join('\n')+'\n\npublic final class RequestWiringCompileProof {\n'+
    '  public static void configure(\n'+
    '      TenantMembershipPort tenantMembershipPort,\n'+
    '      ModuleEntitlementPort moduleEntitlementPort,\n'+
    '      DomainAuthorizationHook domainAuthorizationHook) {\n'+
    body+'\n  }\n}\n';
  await writeFile(join(root,'RequestWiringCompileProof.java'),wrapper);
  run('javac',['--release','21','-cp',filename,'RequestWiringCompileProof.java'],root);
  console.log('Published v'+version+' four-port request-wiring excerpt: COMPILED against anonymous Central JAR');

  // The optional JDBC artifact and existing illustrative Java recipe must also
  // compile against the RELEASED Central distribution, not local JDBC source.
  const jdbcGuide=developerGuides.find(x=>x.id==='jdbc');
  const jdbcSample=jdbcGuide?.samples.find(x=>x.label==='Java recipe');
  assert.ok(jdbcSample?.kind.includes('Integration excerpt'),'JDBC recipe must remain marked illustrative');
  const jdbcArtifact='platform-kernel-jdbc-'+version+'.jar';
  const jdbcUrl='https://repo.maven.apache.org/maven2/io/github/vyrnforge/platform-kernel-jdbc/'+version+'/'+jdbcArtifact;
  const jdbcBytes=Buffer.from(await (await centralGet(jdbcUrl)).arrayBuffer());
  assert.ok(jdbcBytes.length>10000,'optional JDBC JAR unexpectedly small');
  const jdbcSha1=createHash('sha1').update(jdbcBytes).digest('hex');
  const jdbcAdvertised=(await (await centralGet(jdbcUrl+'.sha1')).text()).trim().match(/^[a-fA-F0-9]{40}/)?.[0]?.toLowerCase();
  assert.equal(jdbcSha1,jdbcAdvertised,'published optional JDBC checksum mismatch');
  await writeFile(join(root,jdbcArtifact),jdbcBytes);
  const jdbcWrapper=[
    'import io.vyrnforge.platform.kernel.idempotency.IdempotencyPort;',
    'import io.vyrnforge.platform.kernel.idempotency.IdempotencyRequest;',
    'import io.vyrnforge.platform.kernel.persistence.jdbc.IdempotencyResultCodec;',
    'import io.vyrnforge.platform.kernel.persistence.jdbc.JdbcReliabilityTransaction;',
    'public final class JdbcRecipeCompileProof {',
    '  public static void compose(IdempotencyPort<String> idempotencyPort,',
    '      IdempotencyRequest request, JdbcReliabilityTransaction transactions, String safeResult) {',
    jdbcSample.code,
    '  }',
    '}'
  ].join('\n');
  await writeFile(join(root,'JdbcRecipeCompileProof.java'),jdbcWrapper);
  run('javac',['--release','21','-cp',filename+':'+jdbcArtifact,'JdbcRecipeCompileProof.java'],root);
  console.log('Published v'+version+' optional JDBC recipe: COMPILED against anonymous Central JAR; SHA-1 verified; size='+jdbcBytes.length);





  // Build minimal, anonymous consumer projects from the site's own dependency fragments.
  const mdir=join(root,'maven'),gdir=join(root,'gradle');
  await mkdir(join(mdir,'src','main','java'),{recursive:true});
  await mkdir(join(gdir,'src','main','java'),{recursive:true});
  await writeFile(join(mdir,'src','main','java',java.filename),java.code+'\n');
  await writeFile(join(gdir,'src','main','java',java.filename),java.code+'\n');
  const pom=[
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">',
    '<modelVersion>4.0.0</modelVersion><groupId>example.consumer</groupId><artifactId>first-kernel-program</artifactId><version>1</version>',
    '<properties><maven.compiler.release>21</maven.compiler.release></properties>',
    '<dependencies>',maven.code,'</dependencies>',
    '<build><plugins><plugin><groupId>org.apache.maven.plugins</groupId><artifactId>maven-compiler-plugin</artifactId><version>3.14.1</version></plugin></plugins></build>',
    '</project>'
  ].join('\n');
  await writeFile(join(mdir,'pom.xml'),pom);
  const settings=join(root,'settings.xml');
  await writeFile(settings,'<settings xmlns="http://maven.apache.org/SETTINGS/1.2.0"><localRepository>'+join(root,'m2')+'</localRepository></settings>\n');
  run('mvn',['--batch-mode','--no-transfer-progress','--strict-checksums','--settings',settings,'compile'],mdir);
  assert.ok((await readFile(join(mdir,'target','classes','FirstKernelProgram.class'))).length>0);
  console.log('Maven fragment: PASS on minimal isolated Java 21 consumer');

  await writeFile(join(gdir,'settings.gradle.kts'),'rootProject.name = "first-kernel-program"\n');
  await writeFile(join(gdir,'build.gradle.kts'),'plugins { java }\n'+gradle.code+'\n');
  const env={...process.env,GRADLE_USER_HOME:join(root,'gradle-cache')};
  run('gradle',['--no-daemon','--console=plain','compileJava'],gdir,env);
  assert.ok((await readFile(join(gdir,'build','classes','java','main','FirstKernelProgram.class'))).length>0);
  console.log('Gradle Kotlin DSL fragment: PASS on minimal isolated Java 21 consumer');

  const report='Published v'+version+' onboarding consumer proof\n'+
  'Central URL: '+central+'\n'+
  'Artifact bytes: '+jar.length+'\n'+
  'SHA-256 (computed): '+sha256+'\n'+
  'Central published SHA-1 checksum: verified\n'+
  'Java 21 CLI and two UUIDv7 output lines: PASS\n'+
  'Isolated Maven and Gradle Kotlin DSL compilation: PASS\n'+
  'Exact sample source: site/src/docs-data.mjs\n';
  if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,report);
} finally {
  await rm(root,{recursive:true,force:true});
}
