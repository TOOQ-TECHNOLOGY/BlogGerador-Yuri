/* =====================================================================
   store.js — onde os arquivos .md moram.

   Estrutura: uma pasta por artigo dentro de content-blog/, com o .md e
   as imagens daquele post lado a lado:

     content-blog/
       lorem-ipsum-3/
         lorem-ipsum-3.md
         capa.jpg
         diagrama.png

   (Arquivos .md soltos na raiz de content-blog/ ainda são lidos, por
   compatibilidade, e migram para uma pasta quando salvos de novo.)

   Três backends, escolhidos automaticamente nesta ordem:
     1. ServerStore   → `node server.js` rodando (qualquer navegador)
     2. FsStore       → pasta content-blog conectada via File System Access
                        API (Chrome / Edge, funciona até abrindo o index.html
                        direto do disco)
     3. DownloadStore → fallback: lê a pasta por <input webkitdirectory> e
                        "Gerar arquivo" baixa o .md para você mover à pasta

   Interface comum (dir = nome da pasta do artigo, '' = raiz):
     type, label, canWrite, canDelete
     list()                  → [{ dir, name, content, mtime }]
     save(dir, name, text)   → grava content-blog/<dir>/<name>
     remove(dir, name)       → apaga a pasta do artigo (ou o arquivo, se na raiz)
     saveAsset(dir, file)    → grava content-blog/<dir>/<nome> e devolve '<nome>'
     assetUrl(dir, path)     → URL exibível para um caminho relativo à pasta
   ===================================================================== */
(function () {
  'use strict';

  const safeName = (name) => String(name).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\w.\-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'arquivo';
  const join = (dir, p) => (dir ? dir + '/' : '') + p;

  /* ---------- IndexedDB mínimo (guarda o handle da pasta) ---------- */
  const IDB = {
    open() {
      return new Promise((res, rej) => {
        const r = indexedDB.open('tooq-blog-generator', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('kv');
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
    },
    async get(key) {
      const db = await this.open();
      return new Promise((res, rej) => {
        const t = db.transaction('kv', 'readonly').objectStore('kv').get(key);
        t.onsuccess = () => res(t.result);
        t.onerror = () => rej(t.error);
      });
    },
    async set(key, val) {
      const db = await this.open();
      return new Promise((res, rej) => {
        const t = db.transaction('kv', 'readwrite').objectStore('kv').put(val, key);
        t.onsuccess = () => res();
        t.onerror = () => rej(t.error);
      });
    },
    async del(key) {
      const db = await this.open();
      return new Promise((res, rej) => {
        const t = db.transaction('kv', 'readwrite').objectStore('kv').delete(key);
        t.onsuccess = () => res();
        t.onerror = () => rej(t.error);
      });
    },
  };

  function download(name, data, type) {
    const blob = data instanceof Blob ? data : new Blob([data], { type: type || 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  /* ---------- 1. servidor local ---------- */
  class ServerStore {
    constructor(info) { this.type = 'server'; this.label = `Servidor local · ${info.dir || 'content-blog'}`; this.canWrite = true; this.canDelete = true; }
    static async detect() {
      if (location.protocol === 'file:') return null;
      try {
        const r = await fetch('/api/ping', { cache: 'no-store' });
        if (!r.ok) return null;
        const j = await r.json();
        return j && j.ok ? new ServerStore(j) : null;
      } catch { return null; }
    }
    _q(dir, name) { return `?dir=${encodeURIComponent(dir || '')}&name=${encodeURIComponent(name)}`; }
    async list() { const r = await fetch('/api/posts', { cache: 'no-store' }); if (!r.ok) throw new Error('Falha ao listar'); return r.json(); }
    async save(dir, name, content) { const r = await fetch('/api/post' + this._q(dir, name), { method: 'PUT', headers: { 'Content-Type': 'text/markdown' }, body: content }); if (!r.ok) throw new Error(await r.text()); }
    async remove(dir, name) { const r = await fetch('/api/post' + this._q(dir, name), { method: 'DELETE' }); if (!r.ok) throw new Error(await r.text()); }
    async saveAsset(dir, file) {
      const name = safeName(file.name);
      const r = await fetch('/api/asset' + this._q(dir, name), { method: 'PUT', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file });
      if (!r.ok) throw new Error(await r.text());
      return (await r.json()).name;
    }
    async assetUrl(dir, path) {
      const enc = (p) => p.split('/').map(encodeURIComponent).join('/');
      const url = '/content-blog/' + enc(join(dir, path));
      const ok = await fetch(url, { method: 'HEAD', cache: 'no-store' }).then((r) => r.ok).catch(() => false);
      if (ok) return url;
      // compatibilidade: imagem antiga na raiz (content-blog/images/...)
      if (dir) { const alt = '/content-blog/' + enc(path); if (await fetch(alt, { method: 'HEAD', cache: 'no-store' }).then((r) => r.ok).catch(() => false)) return alt; }
      throw new Error('não encontrado');
    }
  }

  /* ---------- 2. File System Access API ---------- */
  class FsStore {
    constructor(handle) { this.type = 'fs'; this.handle = handle; this.label = `Pasta conectada · ${handle.name}`; this.canWrite = true; this.canDelete = true; this._urls = new Map(); }
    static supported() { return typeof window.showDirectoryPicker === 'function' && window.isSecureContext; }
    static async pick() {
      const handle = await window.showDirectoryPicker({ id: 'tooq-content-blog', mode: 'readwrite' });
      await IDB.set('dirHandle', handle).catch(() => {});
      return new FsStore(handle);
    }
    /** Devolve { store } se a permissão já estiver concedida, { handle } se precisar de um clique, ou null. */
    static async restore() {
      let handle = null;
      try { handle = await IDB.get('dirHandle'); } catch { return null; }
      if (!handle) return null;
      try {
        const p = await handle.queryPermission({ mode: 'readwrite' });
        if (p === 'granted') return { store: new FsStore(handle) };
        return { handle };
      } catch { return null; }
    }
    static async reconnect(handle) {
      const p = await handle.requestPermission({ mode: 'readwrite' });
      if (p !== 'granted') throw new Error('Permissão negada');
      return new FsStore(handle);
    }
    static async forget() { await IDB.del('dirHandle').catch(() => {}); }

    async _dir(dir, create) {
      if (!dir) return this.handle;
      return this.handle.getDirectoryHandle(dir, { create: !!create });
    }
    async list() {
      const out = [];
      const readMd = async (dirName, dirHandle) => {
        for await (const [name, entry] of dirHandle.entries()) {
          if (entry.kind !== 'file' || !/\.md$/i.test(name)) continue;
          const f = await entry.getFile();
          out.push({ dir: dirName, name, content: await f.text(), mtime: f.lastModified });
        }
      };
      for await (const [name, entry] of this.handle.entries()) {
        if (entry.kind === 'directory') { if (name !== 'images' && !name.startsWith('.')) await readMd(name, entry); }
        else if (/\.md$/i.test(name)) { const f = await entry.getFile(); out.push({ dir: '', name, content: await f.text(), mtime: f.lastModified }); }
      }
      return out;
    }
    async save(dir, name, content) {
      const d = await this._dir(dir, true);
      const fh = await d.getFileHandle(name, { create: true });
      const w = await fh.createWritable();
      await w.write(content);
      await w.close();
    }
    async remove(dir, name) {
      if (dir) await this.handle.removeEntry(dir, { recursive: true });
      else await this.handle.removeEntry(name);
    }
    async saveAsset(dir, file) {
      const d = await this._dir(dir, true);
      const name = safeName(file.name);
      const fh = await d.getFileHandle(name, { create: true });
      const w = await fh.createWritable();
      await w.write(file);
      await w.close();
      this._urls.delete(join(dir, name));
      return name;
    }
    async _fileUrl(rel) {
      if (this._urls.has(rel)) return this._urls.get(rel);
      const parts = rel.split('/').filter(Boolean);
      let d = this.handle;
      for (const p of parts.slice(0, -1)) d = await d.getDirectoryHandle(p);
      const fh = await d.getFileHandle(parts[parts.length - 1]);
      const url = URL.createObjectURL(await fh.getFile());
      this._urls.set(rel, url);
      return url;
    }
    async assetUrl(dir, path) {
      try { return await this._fileUrl(join(dir, path)); }
      catch (e) { if (dir) return this._fileUrl(path); throw e; }
    }
  }

  /* ---------- 3. fallback: leitura por input + download ---------- */
  class DownloadStore {
    constructor(files) {
      this.type = files && files.length ? 'files' : 'none';
      this.files = Array.from(files || []);
      this.label = this.files.length ? 'Pasta carregada (somente leitura) · gera por download' : 'Nenhuma pasta conectada · gera por download';
      this.canWrite = false; this.canDelete = false;
      this._urls = new Map();
    }
    _rel(f) { return (f.webkitRelativePath || f.name).split('/').slice(1); } // remove o nome da pasta escolhida
    async list() {
      const out = [];
      for (const f of this.files) {
        const rel = this._rel(f);
        if (!/\.md$/i.test(f.name) || rel.length > 2) continue;
        if (rel.length === 2 && (rel[0] === 'images' || rel[0].startsWith('.'))) continue;
        out.push({ dir: rel.length === 2 ? rel[0] : '', name: f.name, content: await f.text(), mtime: f.lastModified });
      }
      return out;
    }
    async save(dir, name, content) { download(name, content); }
    async remove() { throw new Error('Sem pasta conectada: apague a pasta do artigo manualmente em content-blog/.'); }
    async saveAsset(dir, file) {
      const name = safeName(file.name);
      download(name, file, file.type);
      this._urls.set(join(dir, name), URL.createObjectURL(file));
      return name;
    }
    async assetUrl(dir, path) {
      const tryRel = (rel) => {
        if (this._urls.has(rel)) return this._urls.get(rel);
        const f = this.files.find((x) => this._rel(x).join('/') === rel);
        if (!f) return null;
        const url = URL.createObjectURL(f);
        this._urls.set(rel, url);
        return url;
      };
      const url = tryRel(join(dir, path)) || (dir ? tryRel(path) : null);
      if (!url) throw new Error('não encontrado');
      return url;
    }
  }

  window.Stores = { ServerStore, FsStore, DownloadStore, download, safeName };
})();
