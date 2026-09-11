import { build } from 'esbuild';
import sharp from 'sharp';
import { mkdir, readFile, writeFile, copyFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createGitHub } from '../lib/github.mjs';
import { validateState, publishedContent, referencedImages, mediaPattern } from '../lib/content.mjs';

// The output directory must be fresh: never let old draft assets survive a subsequent build.
// Only generated dist is removed, after verifying its absolute workspace location.
const { resolve, dirname } = await import('node:path');
const { rm } = await import('node:fs/promises');
const output = resolve('dist');
if (dirname(output) !== process.cwd() || !output.endsWith(`${process.platform === 'win32' ? '\\' : '/'}dist`)) throw new Error('Unexpected build output path');
await rm(output, { recursive: true, force: true });
for (const path of ['dist','dist/css','dist/assets','dist/media','dist/img']) await mkdir(path, { recursive: true });

const seed = validateState(JSON.parse(await readFile('content/seed.json', 'utf8')));
let content = publishedContent(seed, createHash('sha256').update(JSON.stringify(seed)).digest('hex'));
let repo, contentRef;
if (process.env.GITHUB_CONTENT_REPO || process.env.GITHUB_CONTENT_TOKEN) {
  repo = createGitHub();
  contentRef = (await repo.head()).sha;
  const published = await repo.readJson('published.json', contentRef);
  if (published) {
    if (typeof published.value.revision !== 'string') throw new Error('Published content has no revision');
    content = publishedContent(validateState(published.value), published.value.revision);
  }
}
const refs = referencedImages(content);
content.imageSizes = {};
for (const src of [...refs, 'assets/michelle.webp']) {
  const bytes = mediaPattern.test(src)
    ? (await repo?.readFile(src, contentRef))?.bytes
    : await readFile(src);
  if (!bytes) throw new Error(`Published image is missing: ${src}`);
  const { width, height } = await sharp(bytes).metadata();
  content.imageSizes[src] = { width, height };
  await writeFile(`dist/${src}`, bytes);
  for (const width of [640, 1280]) {
    await sharp(bytes).resize({ width, withoutEnlargement: true }).webp({ quality: 82 })
      .toFile(`dist/${src.replace('.webp', `-${width}.webp`)}`);
  }
}
// Existing images must also be available inside the authenticated editor, even if a project
// is removed from the published snapshot. These are the already-public legacy assets only.
for (const file of await readdir('assets')) {
  if (!file.endsWith('.webp')) continue;
  try { await stat(`dist/assets/${file}`); } catch { await copyFile(`assets/${file}`, `dist/assets/${file}`); }
}
for (const file of ['index.html','project.html','admin.html']) {
  let html = await readFile(file, 'utf8');
  html = html.replace('src="src/public.js"', 'src="script.js"').replace('src="src/admin.js"', 'src="admin.js"');
  await writeFile(`dist/${file}`, html);
}
const legacy = {
  'bedrijfsproject.html':'bedrijfskantine', 'rendersBjörnBorg.html':'bjorn-borg', 'guesproject.html':'guess-display',
  'raverun.html':'rave-run', 'happy socks.html':'happy-socks', 'lampproject.html':'lamp-design', 'hotelkamerproject.html':'hotelkamer'
};
const template = await readFile('dist/project.html','utf8');
for (const [file,id] of Object.entries(legacy)) await writeFile(`dist/${file}`, template.replace('class="project-page"', `class="project-page" data-project="${id}"`));
for (const file of ['style.css','css/content.css','css/admin.css','SETUP.md','Untitled design.mp4','img/raverunfilmpje.mp4']) await copyFile(file,`dist/${file}`);
await writeFile('dist/portfolio.json', JSON.stringify(content));
const firebase = { apiKey:process.env.FIREBASE_API_KEY || '', authDomain:process.env.FIREBASE_AUTH_DOMAIN || '',
  projectId:process.env.FIREBASE_PROJECT_ID || '', appId:process.env.FIREBASE_APP_ID || '' };
await writeFile('dist/public-config.json', JSON.stringify({ configured:Object.values(firebase).every(Boolean), firebase }));
await build({ entryPoints: { script:'src/public.js', admin:'src/admin.js' }, outdir:'dist', bundle:true, minify:true, format:'esm', target:['es2022'], legalComments:'none' });
console.log(`Built ${content.projects.length} published projects and ${content.timeline.length} timeline entries. Private drafts and credentials are excluded.`);
