import { createHash, randomUUID } from 'node:crypto';
import { HttpError, validateState, publishedContent, referencedImages, mediaPattern } from './content.mjs';

const jsonFile = (path, value) => ({ path, bytes: Buffer.from(JSON.stringify(value, null, 2) + '\n') });
export function createAdminService({ repo, seed, env = process.env, fetcher = fetch }) {
  const legacyImages = new Set(referencedImages(seed));
  async function deployment() {
    let hook;
    try { hook = new URL(env.NETLIFY_BUILD_HOOK); } catch { return false; }
    if (hook.protocol !== 'https:' || hook.hostname !== 'api.netlify.com' || !hook.pathname.startsWith('/build_hooks/')) return false;
    try { return (await fetcher(hook, { method: 'POST', signal: AbortSignal.timeout(12000) })).ok; } catch { return false; }
  }
  async function state() {
    const file = await repo.readJson('state.json');
    const live = await repo.readJson('published.json');
    return { state: validateState(file?.value || seed), revision: file?.sha || null, publishedRevision: live?.value.revision || null };
  }
  async function save(body, publish = false) {
    const content = validateState(body.state);
    const parent = await repo.head();
    const existing = await repo.readJson('state.json', parent.sha);
    if (body.revision !== (existing?.sha || null)) throw new HttpError(409, 'Er zijn wijzigingen van een andere sessie. Bewaar je tekst en herlaad de pagina.');
    const files = [jsonFile('state.json', content)];
    let publishedRevision;
    if (publish) {
      publishedRevision = randomUUID();
      const published = publishedContent(content, publishedRevision);
      const images = referencedImages(published);
      const paths = images.some(p => mediaPattern.test(p)) ? await repo.listPaths(parent.tree) : new Set();
      for (const path of images) {
        if (!(mediaPattern.test(path) ? paths.has(path) : legacyImages.has(path))) throw new HttpError(400, 'Een afbeelding ontbreekt in GitHub. Upload deze opnieuw.');
      }
      files.push(jsonFile('published.json', published));
    }
    const result = await repo.commit(parent, files, publish ? 'Publiceer portfolio' : 'Bewaar portfolio-concept');
    return { revision: result.files['state.json'], publishedRevision, deploymentStarted: publish ? await deployment() : false };
  }
  async function upload(body) {
    if (typeof body.data !== 'string' || body.data.length > 2800000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(body.data)) throw new HttpError(400, 'De afbeelding is te groot of ongeldig (maximaal 2 MB).');
    const bytes = Buffer.from(body.data, 'base64');
    if (bytes.length > 2 * 1024 * 1024 || bytes.length < 16 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') {
      throw new HttpError(400, 'Upload een geoptimaliseerde WebP-afbeelding van maximaal 2 MB.');
    }
    const path = `media/${createHash('sha256').update(bytes).digest('hex')}.webp`;
    const parent = await repo.head();
    if (!await repo.readFile(path, parent.sha)) await repo.commit(parent, [{ path, bytes }], 'Voeg portfolio-afbeelding toe');
    return { path };
  }
  return { state, save, upload, deployment };
}
