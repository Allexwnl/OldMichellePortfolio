// Invoked in a separate process to exercise the production build without real accounts.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const image = await readFile('assets/michelle.webp');
const path = `media/${createHash('sha256').update(image).digest('hex')}.webp`;
const seed = JSON.parse(await readFile('content/seed.json','utf8'));
const published = { ...seed,revision:'fixture-publication',projects:[
  {...seed.projects[0],cover:path,images:[{src:path,alt:'Published media',caption:''}]},
  {...seed.projects[1],title:'PRIVATE_DRAFT_SENTINEL',status:'draft'}
] };
process.env.GITHUB_CONTENT_REPO = 'fixture/private';
process.env.GITHUB_CONTENT_TOKEN = 'PRIVATE_TOKEN_SENTINEL';
globalThis.fetch = async url => {
  const parsed = new URL(url), route=parsed.pathname;
  if(route.endsWith('/git/ref/heads/main')) return Response.json({object:{sha:'fixture-commit'}});
  if(route.endsWith('/git/commits/fixture-commit')) return Response.json({tree:{sha:'fixture-tree'}});
  if(route.endsWith('/contents/published.json')) return Response.json({type:'file',sha:'fixture-json',encoding:'base64',content:Buffer.from(JSON.stringify(published)).toString('base64')});
  if(route.endsWith(`/contents/${path}`)) return Response.json({type:'file',sha:'fixture-image',encoding:'base64',content:image.toString('base64')});
  throw new Error(`Unexpected build request: ${route}`);
};
await import('../scripts/build.mjs');
const assert=(await import('node:assert/strict')).default;
const {readdir}=await import('node:fs/promises');
const data=JSON.parse(await readFile('dist/portfolio.json','utf8'));
assert.equal(data.projects.length,1); assert.equal(data.revision,'fixture-publication');
assert.equal(data.projects[0].cover,path);
assert.equal((await readdir('dist/media')).length,3);
for(const file of ['portfolio.json','public-config.json','admin.js','script.js']) {
  const text=await readFile(`dist/${file}`,'utf8');
  assert.ok(!text.includes('PRIVATE_DRAFT_SENTINEL')); assert.ok(!text.includes('PRIVATE_TOKEN_SENTINEL'));
}
const output=await readdir('dist');
for(const file of ['state.json','.env','lib','content','netlify','tests']) assert.ok(!output.includes(file));
console.log('Build privacy verified: drafts and credentials excluded; published GitHub media included.');
