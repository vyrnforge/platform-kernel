import * as esbuild from 'esbuild';
import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
await copyFile('index.html', 'dist/index.html');
const options = {entryPoints:['src/main.jsx'], bundle:true, minify:true, sourcemap:false, target:['es2022'], format:'esm', outfile:'dist/app.js', define:{'process.env.NODE_ENV':JSON.stringify('production')}, jsx:'automatic'};
if (process.argv.includes('--serve')) {
  const ctx=await esbuild.context({...options,minify:false});
  await ctx.watch();
  const server=await ctx.serve({servedir:'dist',host:'127.0.0.1',port:4173});
  console.log('http://127.0.0.1:'+server.port);
} else await esbuild.build(options);
