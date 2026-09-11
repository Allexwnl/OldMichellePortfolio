import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizeClaims, authenticate } from '../lib/auth.mjs';
import { validateState, publishedContent, imagePath } from '../lib/content.mjs';
import seed from '../content/seed.json' with { type: 'json' };

const env = { ADMIN_EMAILS: 'alexanderzoet@gmail.com,michellejonk17@gmail.com', FIREBASE_PROJECT_ID: 'portfolio-test' };
const claims = { email:'alexanderzoet@gmail.com', email_verified:true, firebase:{ sign_in_provider:'google.com' } };
test('Only the two verified Google accounts are authorized', () => {
  assert.equal(authorizeClaims(claims, env), claims.email);
  assert.equal(authorizeClaims({ ...claims,email:'MICHELLEJONK17@gmail.com' },env), 'MICHELLEJONK17@gmail.com');
  for (const bad of [{ email:'outsider@gmail.com' }, { email_verified:false }, { firebase:{ sign_in_provider:'password' } }, { email:undefined }]) {
    assert.throws(() => authorizeClaims({ ...claims,...bad },env), error => error.status === 403);
  }
  for (const emails of ['', 'only@example.com', 'a@example.com,a@example.com', 'a@example.com,b@example.com,c@example.com']) {
    assert.throws(() => authorizeClaims(claims,{ ADMIN_EMAILS:emails }), error => error.status === 503);
  }
});
test('Missing and forged tokens cannot access the admin API', async () => {
  await assert.rejects(authenticate(new Request('https://portfolio.example/api'),env), error => error.status === 401);
  await assert.rejects(authenticate(new Request('https://portfolio.example/api',{ headers:{ Authorization:'Bearer forged-token' } }),env), error => error.status === 401);
});
test('Content rejects path traversal, remote URLs, executable uploads and duplicates', () => {
  for (const path of ['../.env','media/../state.json','https://example.com/image.webp','javascript:alert(1)','assets/file.svg']) assert.throws(() => imagePath(path));
  const state = structuredClone(seed); state.projects[0].cover = '../secret'; assert.throws(() => validateState(state));
  state.projects = [seed.projects[0],seed.projects[0]]; assert.throws(() => validateState(state));
});
test('Published output strips drafts and unexpected fields', () => {
  const state = structuredClone(seed); state.projects[0].status = 'draft'; state.projects[1].privateNote = 'secret'; state.secret = 'secret';
  const published = publishedContent(state,'revision-1');
  assert.equal(published.projects.length,6);
  assert.ok(!JSON.stringify(published).includes('secret'));
  assert.equal(published.revision,'revision-1');
  const draft = structuredClone(seed.projects[0]); draft.status = 'draft'; draft.cover = ''; draft.images = [];
  assert.equal(validateState({version:1,projects:[draft],timeline:[]}).projects[0].cover,'');
  draft.status = 'published'; assert.throws(() => validateState({version:1,projects:[draft],timeline:[]}));
});
