import { authenticate } from '../../lib/auth.mjs';
import { createGitHub } from '../../lib/github.mjs';
import { createAdminService } from '../../lib/admin-service.mjs';
import { HttpError, mediaPattern } from '../../lib/content.mjs';
import seed from '../../content/seed.json' with { type: 'json' };

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
});
export default async function handler(request) {
  try {
    const email = await authenticate(request);
    const url = new URL(request.url);
    if (!['GET', 'POST'].includes(request.method)) throw new HttpError(405, 'Methode niet toegestaan.');
    const origin = request.headers.get('origin');
    if (origin && origin !== url.origin) throw new HttpError(403, 'Dit verzoek komt niet van de beheerpagina.');
    const repo = createGitHub();
    const service = createAdminService({ repo, seed });
    const action = url.searchParams.get('action') || 'state';
    if (request.method === 'GET') {
      if (action === 'state') return json({ ...await service.state(), email });
      if (action === 'media') {
        const path = url.searchParams.get('path');
        if (!mediaPattern.test(path || '')) throw new HttpError(400, 'Ongeldig afbeeldingspad.');
        const file = await repo.readFile(path);
        if (!file) throw new HttpError(404, 'Afbeelding niet gevonden.');
        return new Response(file.bytes, { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
      }
      throw new HttpError(404, 'Onbekende actie.');
    }
    if (!request.headers.get('content-type')?.startsWith('application/json')) throw new HttpError(415, 'JSON vereist.');
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 2900000) throw new HttpError(413, 'Het verzoek is te groot.');
    let body;
    try { body = JSON.parse(raw); } catch { throw new HttpError(400, 'Ongeldige JSON.'); }
    if (action === 'upload') return json(await service.upload(body));
    if (action === 'save' || action === 'publish') return json(await service.save(body, action === 'publish'));
    if (action === 'deploy') {
      const current = await repo.readJson('published.json');
      if (!current) throw new HttpError(400, 'Publiceer eerst de inhoud.');
      return json({ publishedRevision: current.value.revision, deploymentStarted: await service.deployment() });
    }
    throw new HttpError(404, 'Onbekende actie.');
  } catch (error) {
    return json({ error: error instanceof HttpError ? error.message : 'Het verzoek is niet gelukt. Probeer het opnieuw.' }, error instanceof HttpError ? error.status : 500);
  }
}
