import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve('dist');
const types = { '.html':'text/html; charset=utf-8', '.js':'application/javascript', '.css':'text/css', '.json':'application/json', '.webp':'image/webp', '.mp4':'video/mp4', '.md':'text/plain; charset=utf-8' };
createServer(async (request,response) => {
  try {
    let path = decodeURIComponent(new URL(request.url,'http://localhost').pathname);
    if (path === '/admin' || path === '/admin/') { response.writeHead(302,{Location:'/admin.html'}); response.end(); return; }
    if (path === '/') path = '/index.html';
    const file = resolve(root, `.${path}`);
    if (!file.startsWith(root + sep) || !(await stat(file)).isFile()) throw new Error('not found');
    response.writeHead(200, { 'Content-Type':types[extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store' });
    response.end(await readFile(file));
  } catch { response.writeHead(404); response.end('Niet gevonden'); }
}).listen(4173,'127.0.0.1', () => console.log('Portfolio: http://127.0.0.1:4173 — Beheer: http://127.0.0.1:4173/admin.html'));
