import {build} from 'esbuild';
import {writeFile} from 'node:fs/promises';

// Bundle the same tested public-product router for Pages advanced mode.
await build({entryPoints:['worker/index.js'],outfile:'dist/_worker.js',bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,legalComments:'none'});
// Ordinary HTML and media stay on Pages' static CDN. Only live product HTML
// and private receipt shells need Functions, preserving the Free plan quota.
await writeFile('dist/_routes.json',JSON.stringify({version:1,include:['/products/*','/order/*'],exclude:[]},null,2)+'\n');
console.log('Pages advanced-mode router built; static assets bypass Functions.');
