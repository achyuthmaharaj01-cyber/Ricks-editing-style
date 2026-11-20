import http from 'http'; import fs from 'fs'; import path from 'path';
const root = path.resolve('web'), port = +(process.env.PORT || 8123);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
export const server = http.createServer((q, r) => {
  const p = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(root)) { r.writeHead(403); return r.end(); }
  fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); r.end(d); });
});
if (process.argv[1].endsWith('serve.mjs')) server.listen(port, () => console.log('serving', port));
