/* =====================================================================
   server.js — servidor local opcional, sem dependências.

     node server.js            → http://localhost:3000
     PORT=8080 node server.js  → outra porta

   Serve os arquivos estáticos do gerador e expõe uma API mínima para o
   app listar/gravar os artigos em content-blog/ (funciona em qualquer
   navegador). Cada artigo é uma pasta: content-blog/<slug>/<slug>.md + imagens.
   ===================================================================== */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const CONTENT = path.join(ROOT, 'content-blog');
const PORT = Number(process.env.PORT) || 3000;

fs.mkdirSync(CONTENT, { recursive: true });

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.avif': 'image/avif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};

const safeName = (name) => path.basename(decodeURIComponent(name)).replace(/[^\w.\-]/g, '-');
const send = (res, status, body, type) => {
  res.writeHead(status, { 'Content-Type': type || 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};
const readBody = (req) => new Promise((resolve, reject) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => resolve(Buffer.concat(chunks)));
  req.on('error', reject);
});

const safeDir = (dir) => {
  const d = path.basename(String(dir || ''));
  if (!d || d === '.' || d === '..' || d === 'images' || d.startsWith('.')) return '';
  return d.replace(/[^\w.\-]/g, '-');
};

async function api(req, res, url) {
  const resource = url.pathname.replace(/^\/api\//, '');
  const dir = safeDir(url.searchParams.get('dir'));
  const name = url.searchParams.get('name') ? safeName(url.searchParams.get('name')) : '';

  if (resource === 'ping' && req.method === 'GET') return send(res, 200, { ok: true, dir: 'content-blog', layout: 'folder-per-post' });

  // lista: uma pasta por artigo (e .md soltos na raiz, por compatibilidade)
  if (resource === 'posts' && req.method === 'GET') {
    const posts = [];
    const push = (d, f) => {
      const full = path.join(CONTENT, d, f);
      posts.push({ dir: d, name: f, content: fs.readFileSync(full, 'utf8'), mtime: fs.statSync(full).mtimeMs });
    };
    for (const entry of fs.readdirSync(CONTENT, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (entry.name === 'images' || entry.name.startsWith('.')) continue;
        fs.readdirSync(path.join(CONTENT, entry.name)).filter((f) => /\.md$/i.test(f)).forEach((f) => push(entry.name, f));
      } else if (/\.md$/i.test(entry.name)) push('', entry.name);
    }
    return send(res, 200, posts);
  }

  if (resource === 'post') {
    if (!name || !/\.md$/i.test(name)) return send(res, 400, { error: 'Nome de arquivo inválido (precisa terminar em .md).' });
    const folder = path.join(CONTENT, dir);
    const full = path.join(folder, name);
    if (req.method === 'PUT') {
      fs.mkdirSync(folder, { recursive: true });
      fs.writeFileSync(full, await readBody(req));
      console.log(`  gravado  content-blog/${dir ? dir + '/' : ''}${name}`);
      return send(res, 200, { ok: true, dir, name });
    }
    if (req.method === 'DELETE') {
      if (dir) { fs.rmSync(folder, { recursive: true, force: true }); console.log(`  removida content-blog/${dir}/`); }
      else if (fs.existsSync(full)) { fs.unlinkSync(full); console.log(`  removido content-blog/${name}`); }
      return send(res, 200, { ok: true });
    }
  }

  if (resource === 'asset' && req.method === 'PUT' && name) {
    const folder = path.join(CONTENT, dir);
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, name), await readBody(req));
    console.log(`  imagem   content-blog/${dir ? dir + '/' : ''}${name}`);
    return send(res, 200, { ok: true, dir, name });
  }

  send(res, 404, { error: 'Rota não encontrada.' });
}

function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/index.html';
  const full = path.normalize(path.join(ROOT, rel));
  if (!full.startsWith(ROOT + path.sep) || full.includes(path.sep + 'node_modules' + path.sep)) return send(res, 403, 'Proibido', 'text/plain');
  fs.stat(full, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, 'Não encontrado', 'text/plain');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(full).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Content-Length': st.size });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(full).pipe(res);
  });
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) await api(req, res, url);
    else serveStatic(req, res, url);
  } catch (e) {
    console.error(e);
    send(res, 500, { error: e.message });
  }
}).listen(PORT, () => {
  console.log(`\n  Tooq · gerador de blog\n  http://localhost:${PORT}\n  artigos em ${CONTENT}\n`);
});
