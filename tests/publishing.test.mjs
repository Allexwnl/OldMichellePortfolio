import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createAdminService } from '../lib/admin-service.mjs';
import { createGitHub } from '../lib/github.mjs';
import seed from '../content/seed.json' with { type:'json' };

function fixture(fetcher = async () => new Response('',{status:200})) {
  const files = new Map(); let serial = 0; let hooks = 0;
  const repo = {
    head: async () => ({sha:String(serial),tree:'tree'}),
    listPaths: async () => new Set(files.keys()),
    readFile: async path => files.get(path) || null,
    readJson: async path => files.has(path) ? {sha:files.get(path).sha,value:JSON.parse(files.get(path).bytes)} : null,
    commit: async (parent,next) => {
      if (parent.sha !== String(serial)) throw Object.assign(new Error('conflict'),{status:409});
      serial++; const result = {};
      for (const file of next) { const sha=createHash('sha256').update(file.bytes).digest('hex'); files.set(file.path,{sha,bytes:file.bytes}); result[file.path]=sha; }
      return {commit:String(serial),files:result};
    }
  };
  const service = createAdminService({repo,seed,env:{NETLIFY_BUILD_HOOK:'https://api.netlify.com/build_hooks/test'}, fetcher:async (...args) => {hooks++;return fetcher(...args);} });
  return {repo,files,service,hooks:() => hooks};
}
test('Saving a private draft never changes the published snapshot or triggers a build', async () => {
  const f=fixture(); const initial=await f.service.state(); assert.equal(initial.state.projects.length,7); assert.equal(initial.revision,null);
  const first=await f.service.save({state:initial.state,revision:null},true);
  const liveBefore=(await f.repo.readFile('published.json')).bytes.toString();
  const edited=structuredClone(initial.state); edited.projects[0].description='Private unfinished text';
  await f.service.save({state:edited,revision:first.revision});
  assert.equal((await f.repo.readFile('published.json')).bytes.toString(),liveBefore);
  assert.ok((await f.repo.readFile('state.json')).bytes.toString().includes('Private unfinished text'));
  assert.equal(f.hooks(),1);
});
test('Publish excludes draft projects and applies ordering, timeline edits and deletion atomically', async () => {
  const f=fixture(); const edited=structuredClone(seed);
  edited.projects[0].status='draft'; edited.projects.reverse(); edited.projects.splice(1,1); edited.timeline[0].period='2024 – 2026';
  const result=await f.service.save({state:edited,revision:null},true);
  const live=(await f.repo.readJson('published.json')).value;
  assert.equal(live.projects.length,5); assert.equal(live.projects[0].id,edited.projects[0].id);
  assert.equal(live.timeline[0].period,'2024 – 2026'); assert.equal(live.revision,result.publishedRevision);
  assert.equal(result.deploymentStarted,true); assert.equal(f.hooks(),1);
});
test('Stale editors cannot overwrite a newer saved revision', async () => {
  const f=fixture(); await f.service.save({state:seed,revision:null});
  await assert.rejects(f.service.save({state:seed,revision:null}),error=>error.status===409);
});
test('A failed build hook still leaves recoverable published content and can be retried', async () => {
  const f=fixture(async()=>new Response('',{status:500}));
  const result=await f.service.save({state:seed,revision:null},true);
  assert.equal(result.deploymentStarted,false); assert.ok(result.publishedRevision);
  assert.ok(await f.repo.readJson('published.json')); assert.equal(await f.service.deployment(),false);
});
test('Media uploads are hashed and invalid media is rejected before a commit', async () => {
  const f=fixture();
  await assert.rejects(f.service.upload({data:Buffer.from('<script>alert(1)</script>').toString('base64')}),error=>error.status===400);
  await assert.rejects(f.service.upload({data:'a'.repeat(2800001)}),error=>error.status===400);
  const {readFile}=await import('node:fs/promises'); const bytes=await readFile('assets/michelle.webp');
  const result=await f.service.upload({data:bytes.toString('base64')});
  assert.match(result.path,/^media\/[a-f0-9]{64}\.webp$/); assert.deepEqual((await f.repo.readFile(result.path)).bytes,bytes);
  assert.equal((await f.service.upload({data:bytes.toString('base64')})).path,result.path);
  assert.equal(f.files.size,1); assert.equal(f.hooks(),0);
});
test('Publishing refuses missing images instead of creating broken live content', async () => {
  const f=fixture(); const state=structuredClone(seed); state.projects[0].cover=`media/${'a'.repeat(64)}.webp`;
  await assert.rejects(f.service.save({state,revision:null},true),error=>error.status===400);
  assert.equal(f.files.size,0); assert.equal(f.hooks(),0);
});
test('GitHub commits use a parent snapshot and a non-forced branch update', async () => {
  const calls=[];
  const api=createGitHub({GITHUB_CONTENT_REPO:'owner/content',GITHUB_CONTENT_TOKEN:'test',GITHUB_CONTENT_BRANCH:'main'},async(url,options)=>{
    calls.push({url,options});
    const body=url.endsWith('/git/blobs')?{sha:'blob'}:url.endsWith('/git/trees')?{sha:'tree'}:url.endsWith('/git/commits')?{sha:'commit'}:{};
    return Response.json(body);
  });
  await api.commit({sha:'parent',tree:'base'},[{path:'state.json',bytes:Buffer.from('{}')}],'save');
  assert.deepEqual(JSON.parse(calls[2].options.body).parents,['parent']);
  assert.deepEqual(JSON.parse(calls[3].options.body),{sha:'commit',force:false});
  assert.equal(JSON.parse(calls[1].options.body).base_tree,'base');
});
