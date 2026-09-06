import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';

const root = resolve('dist/taji-web/browser');
const backend = new URL(process.env.TAJI_E2E_BACKEND ?? 'http://127.0.0.1:8001');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
http.createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost:4201');
  if (url.pathname.startsWith('/api/')) {
    const proxy = http.request(new URL(request.url, backend), {
      method: request.method, headers: { ...request.headers, host: backend.host },
    }, upstream => { response.writeHead(upstream.statusCode, upstream.headers); upstream.pipe(response); });
    proxy.on('error', () => { response.writeHead(502); response.end('Backend unavailable'); });
    request.pipe(proxy);
    return;
  }
  response.setHeader('Cache-Control', 'no-store');
  if (url.pathname === '/config/app-config.json') {
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ apiBaseUrl: 'http://localhost:4201/api/v1', requestTimeoutMs: 12000 }));
    return;
  }
  try {
    let file = resolve(root, '.' + decodeURIComponent(url.pathname));
    if (file !== root && !file.startsWith(root + sep)) throw new Error('Invalid path');
    if (!(await stat(file).catch(() => null))?.isFile()) {
      if (extname(file)) { response.writeHead(404); response.end(); return; }
      file = resolve(root, 'index.html');
    }
    response.setHeader('Content-Type', mime[extname(file)] ?? 'application/octet-stream');
    response.end(await readFile(file));
  } catch { response.writeHead(404); response.end(); }
}).listen(4201, '127.0.0.1', () => console.log('E2E frontend: http://localhost:4201'));
