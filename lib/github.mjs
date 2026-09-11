import { HttpError } from './content.mjs';

export function createGitHub(env = process.env, fetcher = fetch) {
  const repo = env.GITHUB_CONTENT_REPO;
  const branch = env.GITHUB_CONTENT_BRANCH || 'main';
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo || '') || !env.GITHUB_CONTENT_TOKEN) {
    throw new HttpError(503, 'De privé-inhoudsrepository is nog niet ingesteld. Bekijk SETUP.md.');
  }
  const base = `https://api.github.com/repos/${repo}`;
  async function api(path, method = 'GET', body, missing = false) {
    const response = await fetcher(`${base}${path}`, {
      method, headers: { Authorization: `Bearer ${env.GITHUB_CONTENT_TOKEN}`, Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000)
    });
    if (missing && response.status === 404) return null;
    if (!response.ok) {
      if ([409, 422].includes(response.status)) throw new HttpError(409, 'De inhoud is intussen veranderd. Herlaad de beheerpagina voordat je opnieuw opslaat.');
      if (response.status === 403 || response.status === 429) throw new HttpError(503, 'GitHub weigert het verzoek. Controleer de tokenrechten of probeer het later opnieuw.');
      throw new HttpError(502, `GitHub is niet beschikbaar (${response.status}). Controleer de repository en tokeninstellingen.`);
    }
    return response.status === 204 ? null : response.json();
  }
  async function readFile(path, ref = branch) {
    const result = await api(`/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(ref)}`, 'GET', null, true);
    if (!result) return null;
    if (result.type !== 'file') throw new HttpError(502, 'Een verwacht inhoudsbestand ontbreekt.');
    const blob = result.encoding === 'base64' ? result : await api(`/git/blobs/${result.sha}`);
    return { sha: result.sha, bytes: Buffer.from(blob.content, 'base64') };
  }
  async function readJson(path, ref) {
    const file = await readFile(path, ref);
    return file ? { sha: file.sha, value: JSON.parse(file.bytes.toString('utf8')) } : null;
  }
  async function head() {
    const ref = await api(`/git/ref/heads/${encodeURIComponent(branch)}`);
    const commit = await api(`/git/commits/${ref.object.sha}`);
    return { sha: ref.object.sha, tree: commit.tree.sha };
  }
  async function listPaths(ref) {
    const result = await api(`/git/trees/${encodeURIComponent(ref)}?recursive=1`);
    if (result.truncated) throw new HttpError(503, 'De inhoudsrepository is te groot om volledig te controleren.');
    return new Set(result.tree.filter(item => item.type === 'blob').map(item => item.path));
  }
  async function commit(parent, files, message) {
    const tree = [];
    for (const file of files) {
      const blob = await api('/git/blobs', 'POST', { content: file.bytes.toString('base64'), encoding: 'base64' });
      tree.push({ path: file.path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    const nextTree = await api('/git/trees', 'POST', { base_tree: parent.tree, tree });
    const next = await api('/git/commits', 'POST', { message, tree: nextTree.sha, parents: [parent.sha] });
    await api(`/git/refs/heads/${encodeURIComponent(branch)}`, 'PATCH', { sha: next.sha, force: false });
    return { commit: next.sha, files: Object.fromEntries(tree.map(f => [f.path, f.sha])) };
  }
  return { readFile, readJson, head, listPaths, commit };
}
