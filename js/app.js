/* =====================================================================
   app.js — Gerador de conteúdo do blog da Tooq
   Estrutura dos arquivos: content-blog/<slug>/<slug>.md
   As imagens são embutidas no próprio .md em base64 (data URI): a capa no
   campo `cover:` do front matter e as do texto como referência no fim do
   arquivo (![alt][imagem-1] … [imagem-1]: data:image/webp;base64,…).

   Rotas (hash):
     #/              Conteúdos (lista dos .md em content-blog)
     #/blog          Prévia do blog (como aparece em tooqtechnology.com/blog)
     #/blog/<slug>   Prévia do artigo
     #/novo          Novo artigo
     #/editar/<slug> Editar artigo existente
   ===================================================================== */
(function () {
  'use strict';

  const { ServerStore, FsStore, DownloadStore, download } = window.Stores;

  /* ------------------------------------------------------------------
     Produtos da Tooq (viram o filtro do blog e o link do produto)
     ------------------------------------------------------------------ */
  const PRODUCTS = [
    { slug: 'compute-storage',        name: 'Compute & Storage',            group: 'Cloud' },
    { slug: 'container-as-a-service', name: 'Container as a Service',       group: 'Cloud' },
    { slug: 'connectivity',           name: 'Connectivity',                 group: 'Cloud' },
    { slug: 'algorithmic-execution',  name: 'Algorithmic Execution Engine', group: 'Managed Services' },
    { slug: 'fixed-income-platform',  name: 'Fixed Income Platform',        group: 'Managed Services' },
    { slug: 'order-routing',          name: 'Order Routing',                group: 'Managed Services' },
    { slug: 'live-market-data',       name: 'Live Market Data API',         group: 'Managed Services' },
    { slug: 'historical-market-data', name: 'Historical Market Data API',   group: 'Managed Services' },
    { slug: 'trading-platform',       name: 'Trading Platform',             group: 'On-premises' },
    { slug: 'hosting-hardware',       name: 'Hosting & Hardware Sourcing',  group: 'On-premises' },
    { slug: 'clock-sync',             name: 'Clock Sync',                   group: 'On-premises' },
  ];
  const SITE = 'https://tooqtechnology.com';
  const productBySlug = (s) => PRODUCTS.find((p) => p.slug === s);
  const productName = (s) => (productBySlug(s) || {}).name || s || '';
  const productUrl = (s) => `${SITE}/products/${s}`;

  /* ------------------------------------------------------------------
     Ícones (traços, 24x24)
     ------------------------------------------------------------------ */
  const ICONS = {
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
    image: '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
    pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    list: '<line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/>',
    grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    arrowLeft: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    updown: '<path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/>',
    bold: '<path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8"/>',
    italic: '<line x1="19" x2="10" y1="4" y2="4"/><line x1="14" x2="5" y1="20" y2="20"/><line x1="15" x2="9" y1="4" y2="20"/>',
    code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    heading: '<path d="M6 12h12"/><path d="M6 20V4"/><path d="M18 20V4"/>',
    quote: '<path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/><path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/>',
    ul: '<line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/>',
    ol: '<line x1="10" x2="21" y1="6" y2="6"/><line x1="10" x2="21" y1="12" y2="12"/><line x1="10" x2="21" y1="18" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    arrowUpRight: '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
    arrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    refresh: '<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    filter: '<path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
    minus: '<path d="M5 12h14"/>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  };
  const icon = (n, cls = '') =>
    `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;

  // ícones sólidos (preenchidos, 24x24) da navegação do CMS
  const SOLID = {
    file: '<path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>',
    image: '<path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>',
    search: '<path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>',
    editNote: '<path d="M3 10h11v2H3v-2zm0-4h11v2H3V6zm0 8h7v2H3v-2zm15.01-1.13.71-.71a1 1 0 0 1 1.41 0l.71.71a1 1 0 0 1 0 1.41l-.71.71-2.12-2.12zm-.71.71L12 18.88V21h2.12l5.3-5.3-2.12-2.12z"/>',
    caret: '<path d="M7 10l5 5 5-5z"/>',
    list: '<path d="M3 4h18v2.4H3zm0 4.53h18v2.4H3zm0 4.54h18v2.4H3zm0 4.53h18V20H3z"/>',
    grid: '<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>',
    user: '<path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zm0 2c-3.34 0-8 1.67-8 5v1.5c0 .55.45 1 1 1h14c.55 0 1-.45 1-1V19c0-3.33-4.66-5-8-5z"/>',
  };
  const solid = (n, cls = '') =>
    `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${SOLID[n]}</svg>`;

  // símbolo da Tooq (dois elos, arquivo oficial TOOQ_Symbol) e marca
  const SYMBOL = '<svg viewBox="0 0 709.97 287.7" fill="currentColor" aria-hidden="true"><path d="M709.76,143.85v-17.11C709.76,56.53,653.23,0,583.02,0h-129.59c-31.99,0-61.12,11.76-83.37,31.18,13.31,15.76,23.38,34.31,29.23,54.65,13.27-16.66,33.7-27.34,56.75-27.34h124.38c40.18,0,72.53,32.35,72.53,72.53v25.66c0,40.18-32.35,72.53-72.53,72.53h-124.37c-2.61.02-5.21-.2-7.81-.43-2.1-.22-4.16-.54-6.2-.94-.44-.09-.87-.18-1.31-.27-1.98-.42-3.93-.91-5.85-1.49-.44-.13-.87-.29-1.31-.43-1.7-.55-3.37-1.16-5.01-1.83-.5-.21-1-.41-1.5-.63-1.54-.67-3.05-1.41-4.53-2.18-.59-.31-1.19-.61-1.77-.93-1.41-.78-2.77-1.63-4.11-2.5-6.59-4.27-12.45-9.56-17.33-15.69-9.87-12.39-15.8-28.08-15.8-45.22v-12.83h0v-17.12c0-38.16-17.15-72.25-43.66-95.45.03-.04.06-.08.09-.11C317.66,11.76,288.54,0,256.55,0H126.74C56.52,0,0,56.52,0,126.74l.22,17.12h0v17.11c0,70.21,56.52,126.74,126.74,126.74h129.59c31.99,0,61.12-11.76,83.37-31.18-13.31-15.76-23.38-34.31-29.23-54.65-13.27,16.66-33.7,27.34-56.75,27.34h-124.38c-40.18,0-72.53-32.35-72.53-72.53v-25.66c0-40.18,32.35-72.53,72.53-72.53h124.37c2.61-.02,5.21.2,7.81.43,2.1.22,4.16.54,6.2.94.44.09.87.18,1.31.27,1.98.42,3.93.91,5.85,1.49.44.13.87.29,1.31.43,1.7.55,3.37,1.16,5.01,1.83.5.21,1,.41,1.5.63,1.54.67,3.05,1.41,4.53,2.18.59.31,1.19.61,1.77.93,1.41.78,2.77,1.63,4.11,2.5,6.59,4.27,12.45,9.56,17.33,15.69,9.87,12.39,15.8,28.08,15.8,45.22v12.83h0v17.12c0,38.16,17.15,72.25,43.66,95.45-.03.04-.06.08-.09.11,22.26,19.42,51.38,31.18,83.37,31.18h129.81c70.21,0,126.74-58.62,126.74-126.74"/></svg>';
  const WORDMARK = '<svg viewBox="0 0 150 40" aria-label="tooq"><text x="0" y="31" font-family="Inter, system-ui, sans-serif" font-size="38" font-weight="700" letter-spacing="-2.5" fill="currentColor">tooq</text></svg>';
  const STACKMARK = '<svg viewBox="0 0 40 40" aria-hidden="true"><text x="2" y="18" font-family="Inter, system-ui, sans-serif" font-size="19" font-weight="700" letter-spacing="-1.5" fill="currentColor">to</text><text x="2" y="37" font-family="Inter, system-ui, sans-serif" font-size="19" font-weight="700" letter-spacing="-1.5" fill="currentColor">oq</text></svg>';

  /* ------------------------------------------------------------------
     Utilidades
     ------------------------------------------------------------------ */
  const h = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const slugify = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  const pad = (n) => String(n).padStart(2, '0');
  const toLocalInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const parseDate = (s) => {
    if (!s) return null;
    const str = String(s).trim();
    const d = /^\d{4}-\d{2}-\d{2}$/.test(str) ? new Date(str + 'T00:00') : new Date(str);
    return isNaN(d) ? null : d;
  };
  const fmtBR = (s) => { const d = parseDate(s); return d ? d.toLocaleDateString('pt-BR') : '—'; };
  const fmtEN = (s) => { const d = parseDate(s); return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''; };
  const readTime = (body) => Math.max(1, Math.round(MD.plain(body).split(' ').filter(Boolean).length / 200));
  const initials = (name) => String(name || '').trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase() || '?';
  const isAbsUrl = (u) => /^(https?:)?\/\/|^data:|^blob:/i.test(u || '');

  let toastTimer;
  function toast(msg, isError) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.toggle('toast--error', !!isError);
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), isError ? 5000 : 3200);
  }

  /* ------------------------------------------------------------------
     Estado
     ------------------------------------------------------------------ */
  const state = {
    store: new DownloadStore(),
    pendingHandle: null,          // handle salvo que ainda precisa de permissão (clique)
    posts: [],
    loading: false,
    cms: { query: '', sort: 'newest', product: '', layout: 'list' },
    blog: { query: '', sort: 'newest', product: '' },
    theme: 'light',
  };
  try { state.cms.layout = localStorage.getItem('tooq.layout') || 'list'; state.theme = localStorage.getItem('tooq.theme') || 'light'; } catch {}

  let editor = null;   // estado do editor aberto
  let justSaved = false; // marca "Arquivo gerado" após re-renderizar
  const app = document.getElementById('app');

  /* ------------------------------------------------------------------
     Posts
     ------------------------------------------------------------------ */
  function postFromFile(file) {
    const { data, body } = MD.parseFrontMatter(file.content);
    const slug = String(data.slug || file.name.replace(/\.md$/i, ''));
    return {
      dir: file.dir || '',
      name: file.name,
      slug,
      title: String(data.title || slug),
      summary: String(data.summary || data.description || ''),
      date: String(data.date || ''),
      author: String(data.author || ''),
      product: String(data.product || ''),
      cover: String(data.cover || data.image || ''),
      coverAlt: String(data.coverAlt || data.cover_alt || ''),
      seoTitle: String(data.seoTitle || data.seo_title || ''),
      seoDescription: String(data.seoDescription || data.seo_description || ''),
      body: body || '',
      mtime: file.mtime || 0,
      coverUrl: '',
      assetMap: {},   // caminho relativo da imagem no texto → URL exibível
    };
  }

  // imagens relativas citadas no texto (![alt](foto.png))
  const bodyImagePaths = (body) => {
    const out = new Set();
    String(body || '').replace(/!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (m, src) => { if (!isAbsUrl(src)) out.add(src.replace(/^\.?\//, '')); return m; });
    return [...out];
  };
  async function resolveBodyImages(post) {
    const dir = post.dir || post.slug;
    for (const path of bodyImagePaths(post.body)) {
      if (post.assetMap[path]) continue;
      try { post.assetMap[path] = await state.store.assetUrl(dir, path); } catch {}
    }
  }
  // troca os src relativos do HTML renderizado pelas URLs resolvidas
  const renderBody = (post) => MD.render(post.body).replace(/<img src="([^"]+)"/g, (m, src) => {
    if (isAbsUrl(src)) return m;
    const key = src.replace(/^\.?\//, '');
    return `<img src="${h((post.assetMap || {})[key] || src)}"`;
  });

  async function resolveCover(post) {
    if (!post.cover) { post.coverUrl = ''; return; }
    if (isAbsUrl(post.cover)) { post.coverUrl = post.cover; return; }
    try { post.coverUrl = await state.store.assetUrl(post.dir || post.slug, post.cover.replace(/^\.?\//, '')); }
    catch { post.coverUrl = ''; }
  }

  async function loadPosts({ silent } = {}) {
    state.loading = true;
    try {
      const files = await state.store.list();
      const posts = files.map(postFromFile);
      await Promise.all(posts.map(async (p) => { await resolveCover(p); await resolveBodyImages(p); }));
      state.posts = posts;
    } catch (e) {
      console.error(e);
      if (!silent) toast('Não consegui ler a pasta: ' + e.message, true);
    }
    state.loading = false;
  }

  const sortPosts = (list, mode) => {
    const t = (p) => (parseDate(p.date) || new Date(p.mtime || 0)).getTime();
    const out = list.slice();
    if (mode === 'oldest') out.sort((a, b) => t(a) - t(b));
    else if (mode === 'title') out.sort((a, b) => a.title.localeCompare(b.title, 'en'));
    else out.sort((a, b) => t(b) - t(a));
    return out;
  };
  // o último artigo é sempre o de data mais recente: ganha a etiqueta "Latest post" e o destaque
  // no topo do blog. No editor, o rascunho entra na conta no lugar da versão salva dele.
  const latestOf = (list) => sortPosts(list, 'newest')[0] || null;
  const isLatest = (p) => {
    const list = state.posts.includes(p) ? state.posts : [p, ...state.posts.filter((x) => x.slug !== p.slug)];
    return latestOf(list) === p;
  };
  const matches = (p, q) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return [p.title, p.summary, p.author, productName(p.product), MD.plain(p.body)].join(' ').toLowerCase().includes(s);
  };

  /* ------------------------------------------------------------------
     Armazenamento
     ------------------------------------------------------------------ */
  async function initStore() {
    const server = await ServerStore.detect();
    if (server) { state.store = server; return; }
    if (FsStore.supported()) {
      const r = await FsStore.restore();
      if (r && r.store) { state.store = r.store; return; }
      if (r && r.handle) { state.pendingHandle = r.handle; }
    }
  }

  async function connectFolder() {
    try {
      state.store = await FsStore.pick();
      state.pendingHandle = null;
      await loadPosts();
      toast(`Pasta "${state.store.handle.name}" conectada.`);
      render();
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      toast('Não foi possível conectar a pasta: ' + e.message, true);
    }
  }

  async function reconnectFolder() {
    try {
      state.store = await FsStore.reconnect(state.pendingHandle);
      state.pendingHandle = null;
      await loadPosts();
      render();
    } catch (e) { toast(e.message, true); }
  }

  async function disconnectFolder() {
    await FsStore.forget();
    state.store = new DownloadStore();
    state.pendingHandle = null;
    state.posts = [];
    render();
  }

  async function loadFolderFallback(files) {
    state.store = new DownloadStore(files);
    await loadPosts();
    toast(`${state.posts.length} artigo(s) carregado(s). Nesse modo, "Gerar arquivo" baixa o .md.`);
    render();
  }

  /* ------------------------------------------------------------------
     Pedaços de interface compartilhados
     ------------------------------------------------------------------ */
  const defaultCoverInner = (post) => `${SYMBOL}<span>${h(productName(post.product) || 'Tooq')}</span>`;
  const coverHtml = (post, cls = '') => post.coverUrl
    ? `<div class="cover ${cls}" data-product="${h(post.product)}"><img src="${h(post.coverUrl)}" alt="${h(post.coverAlt)}" loading="lazy"></div>`
    : `<div class="cover cover--default ${cls}">${defaultCoverInner(post)}</div>`;
  // imagem de capa que não carrega (arquivo movido, URL quebrada) → capa padrão
  document.addEventListener('error', (e) => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement)) return;
    const cover = img.closest('.cover');
    if (!cover || cover.classList.contains('cover--default')) return;
    cover.classList.add('cover--default', 'cover--missing');
    cover.title = 'Imagem não encontrada: ' + img.getAttribute('src');
    cover.innerHTML = defaultCoverInner({ product: cover.dataset.product });
  }, true);

  const bylineHtml = (post, withArrow = true) => `
    <div class="byline">
      <span class="avatar">${h(initials(post.author || 'Author'))}</span>
      <div>
        <div class="byline__name">${h(post.author || 'Author')}</div>
        <div class="byline__meta">${h(fmtEN(post.date) || 'No date')} · ${readTime(post.body)} min read</div>
      </div>
      ${withArrow ? `<span class="byline__arrow">${icon('arrowUpRight')}</span>` : ''}
    </div>`;

  function storeMenuHtml() {
    const s = state.store;
    const dot = s.type === 'server' || s.type === 'fs' ? 'ok' : state.pendingHandle ? 'warn' : '';
    const fsOk = FsStore.supported();
    return `
      <details class="menu">
        <summary class="account" title="${h(s.label)}">
          <span class="status-dot ${dot ? 'status-dot--' + dot : ''}"></span>
          <span class="account__name">tooqtechnology.com</span>
          <span class="avatar avatar--user">${solid('user')}</span>
        </summary>
        <div class="menu__list">
          <div class="menu__head">Pasta content-blog</div>
          <div class="menu__note">${h(s.label)}</div>
          <div class="menu__sep"></div>
          ${state.pendingHandle ? `<button type="button" class="menu__item" data-action="reconnect-fs">${icon('folder')} Reconectar pasta salva</button>` : ''}
          ${fsOk ? `<button type="button" class="menu__item" data-action="connect-fs">${icon('folder')} ${s.type === 'fs' ? 'Trocar pasta' : 'Conectar pasta content-blog'}</button>` : ''}
          <button type="button" class="menu__item" data-action="pick-files">${icon('download')} Carregar pasta (somente leitura)</button>
          <button type="button" class="menu__item" data-action="reload">${icon('refresh')} Recarregar artigos</button>
          ${s.type === 'fs' ? `<button type="button" class="menu__item menu__item--danger" data-action="disconnect-fs">${icon('x')} Desconectar pasta</button>` : ''}
          <div class="menu__sep"></div>
          <div class="menu__note">Dica: <code>node server.js</code> e abra <code>localhost:3000</code> para funcionar em qualquer navegador.</div>
        </div>
      </details>`;
  }

  function shell(content, active) {
    return `
      <header class="topbar">
        <a class="topbar__logo" href="#/" aria-label="Início">${SYMBOL}</a>
        <nav class="topbar__nav">
          <a class="navbtn ${active === 'conteudos' ? 'navbtn--active' : ''}" href="#/">${solid('file')}<span>Conteúdos</span></a>
          <a class="navbtn ${active === 'blog' ? 'navbtn--active' : ''}" href="#/blog">${solid('image')}<span>Blog</span></a>
        </nav>
        <div class="spacer"></div>
        <details class="menu">
          <summary class="btn btn--primary btn--quick"><span>Adição rápida</span>${solid('caret')}</summary>
          <div class="menu__list"><a class="menu__item" href="#/novo">${icon('pen')} Artigo</a></div>
        </details>
        ${storeMenuHtml()}
      </header>
      ${content}`;
  }

  function storeBanner() {
    const s = state.store;
    if (s.type === 'server' || s.type === 'fs') return '';
    if (state.pendingHandle) {
      return `<div class="banner banner--warn">
        <span class="banner__icon">${icon('alert')}</span>
        <div class="banner__text"><strong>A pasta content-blog precisa de permissão.</strong> O navegador pede confirmação a cada sessão.</div>
        <div class="banner__actions"><button type="button" class="btn btn--primary btn--sm" data-action="reconnect-fs">Reconectar pasta</button></div>
      </div>`;
    }
    const fsOk = FsStore.supported();
    return `<div class="banner">
      <span class="banner__icon">${icon('folder')}</span>
      <div class="banner__text">
        <strong>Cada artigo é uma pasta em <code>content-blog/</code> com o .md e as imagens dele.</strong>
        ${fsOk ? 'Conecte a pasta para listar, editar e gerar os arquivos direto nela.' : 'Este navegador não grava em pastas: carregue a pasta para ver os artigos, ou rode <code>node server.js</code> e abra <code>localhost:3000</code>.'}
        ${s.type === 'files' ? '<br>Pasta carregada em modo somente leitura: "Gerar arquivo" baixa o .md para você mover à pasta.' : ''}
      </div>
      <div class="banner__actions">
        ${fsOk ? `<button type="button" class="btn btn--primary btn--sm" data-action="connect-fs">Conectar pasta content-blog</button>` : ''}
        <button type="button" class="btn btn--outline btn--sm" data-action="pick-files">${s.type === 'files' ? 'Recarregar pasta' : 'Carregar pasta'}</button>
      </div>
    </div>`;
  }

  /* ------------------------------------------------------------------
     Conteúdos (lista)
     ------------------------------------------------------------------ */
  function viewList() {
    const c = state.cms;
    let posts = state.posts.filter((p) => matches(p, c.query));
    if (c.product) posts = posts.filter((p) => p.product === c.product);
    posts = sortPosts(posts, c.sort);
    const filtered = !!c.product;
    const sortLabel = { newest: 'Mais recentes', oldest: 'Mais antigos', title: 'Título A–Z' };
    const usedProducts = PRODUCTS.filter((p) => state.posts.some((x) => x.product === p.slug));

    const rows = posts.map((p) => `
      <a class="row" href="#/editar/${encodeURIComponent(p.slug)}">
        <span class="row__title">${h(p.title)}</span>
        <span class="row__date">${fmtBR(p.date)}</span>
        <span class="row__tags">
          ${isLatest(p) ? `<span class="pill pill--solid">Latest post</span>` : ''}
          ${p.product ? `<span class="pill">${h(productName(p.product))}</span>` : ''}
        </span>
      </a>`).join('');

    const tiles = posts.map((p) => `
      <a class="tile" href="#/editar/${encodeURIComponent(p.slug)}">
        <div class="tile__cover">${coverHtml(p)}</div>
        <div class="tile__title">${h(p.title)}</div>
        <div class="tile__meta">${fmtBR(p.date)}${isLatest(p) ? ' · <span class="pill pill--solid">Latest post</span>' : ''}</div>
      </a>`).join('');

    const empty = state.posts.length
      ? `<div class="empty"><strong>Nenhum artigo encontrado</strong>Tente outra busca ou limpe o filtro.</div>`
      : `<div class="empty"><strong>Nenhum artigo ainda</strong>${state.store.type === 'none' ? 'Conecte a pasta content-blog ou ' : ''}Clique em “+ Artigo” para escrever o primeiro.</div>`;

    return shell(`
      <div class="cms">
        <aside class="card cms__side">
          <h2 class="cms__side-title">Coleções</h2>
          <label class="search">${solid('search')}<input type="search" placeholder="Pesquisar em todos" value="${h(c.query)}" data-input="cms-query" aria-label="Pesquisar"></label>
          <a class="collection collection--active" href="#/">${solid('editNote')}<span>Blog</span><span class="collection__count">${state.posts.length}</span></a>
        </aside>
        <main class="cms__main">
          ${storeBanner()}
          <section class="card cms__head">
            <div>
              <h1>Blog</h1>
              <p>Artigos publicados em tooqtechnology.com/blog. Escreva em inglês, como o resto do site.</p>
            </div>
            <a class="btn btn--primary" href="#/novo">${icon('plus')} Artigo</a>
          </section>
          <div class="cms__tools">
            <details class="menu">
              <summary class="toolbtn">Ordenar por ${solid('caret')}</summary>
              <div class="menu__list">
                ${Object.entries(sortLabel).map(([k, v]) => `<button type="button" class="menu__item ${c.sort === k ? 'is-active' : ''}" data-action="cms-sort" data-value="${k}">${c.sort === k ? icon('check') : '<span class="icon"></span>'} ${v}</button>`).join('')}
              </div>
            </details>
            <details class="menu">
              <summary class="toolbtn ${filtered ? 'is-filtered' : ''}">Filtrar por ${solid('caret')}</summary>
              <div class="menu__list">
                <button type="button" class="menu__item ${!filtered ? 'is-active' : ''}" data-action="cms-filter" data-product="">${!filtered ? icon('check') : '<span class="icon"></span>'} Todos</button>
                ${usedProducts.length ? '<div class="menu__sep"></div><div class="menu__head">Produto</div>' : ''}
                ${usedProducts.map((p) => `<button type="button" class="menu__item ${c.product === p.slug ? 'is-active' : ''}" data-action="cms-filter" data-product="${c.product === p.slug ? '' : p.slug}">${c.product === p.slug ? icon('check') : '<span class="icon"></span>'} ${h(p.name)}</button>`).join('')}
              </div>
            </details>
            <button type="button" class="iconbtn ${c.layout === 'list' ? 'is-active' : ''}" data-action="cms-layout" data-value="list" aria-label="Lista">${solid('list')}</button>
            <button type="button" class="iconbtn ${c.layout === 'grid' ? 'is-active' : ''}" data-action="cms-layout" data-value="grid" aria-label="Grade">${solid('grid')}</button>
          </div>
          ${posts.length ? (c.layout === 'grid' ? `<div class="tiles">${tiles}</div>` : `<div class="rows">${rows}</div>`) : empty}
        </main>
      </div>`, 'conteudos');
  }

  /* ------------------------------------------------------------------
     Prévia do blog (site)
     ------------------------------------------------------------------ */
  function siteNav() {
    const t = state.theme;
    return `
      <div class="wrap">
        <nav class="site-nav">
          <a class="site-nav__logo" href="#/blog" aria-label="Tooq">${WORDMARK}</a>
          <div class="site-nav__links">
            <a href="${SITE}" target="_blank" rel="noopener">Products ${icon('chevron')}</a>
            <a href="${SITE}" target="_blank" rel="noopener">Network</a>
            <a href="${SITE}" target="_blank" rel="noopener">Company</a>
            <a href="${SITE}" target="_blank" rel="noopener">Docs ${icon('chevron')}</a>
            <a href="${SITE}" target="_blank" rel="noopener">Guides ${icon('chevron')}</a>
            <a href="#/blog" class="is-active">Blog</a>
          </div>
          <div class="theme-toggle" role="group" aria-label="Tema">
            <button type="button" class="${t === 'light' ? 'is-on' : ''}" data-action="theme" data-value="light" aria-label="Claro">${icon('sun')}</button>
            <button type="button" class="${t === 'dark' ? 'is-on' : ''}" data-action="theme" data-value="dark" aria-label="Escuro">${icon('moon')}</button>
          </div>
        </nav>
      </div>`;
  }

  function siteFooter() {
    const col = (title, items) => `<div><h4>${title}</h4><ul>${items.map((i) => i.startsWith('#') ? `<li class="sub">${i.slice(1)}</li>` : `<li><a href="${SITE}" target="_blank" rel="noopener">${i}</a></li>`).join('')}</ul></div>`;
    return `
      <footer class="site-footer">
        <div class="wrap">
          <div class="site-footer__top">
            <span class="site-footer__mark">${STACKMARK}</span>
            <div class="site-footer__tag">Financial cloud<br>for capital markets.</div>
            <a class="site-footer__cta" href="${SITE}" target="_blank" rel="noopener">Get in touch with us ${icon('arrowRight')}</a>
          </div>
          <div class="site-footer__cols">
            ${col('Cloud', ['Compute & Storage', 'Container as a Service', 'Connectivity'])}
            ${col('Managed Services', ['Algorithmic Execution Engine', 'Fixed Income Platform', 'Order Routing', 'Live Market Data API', 'Historical Market Data API'])}
            ${col('On-premises', ['Trading Platform', 'Hosting & Hardware Sourcing', 'Clock Sync'])}
            ${col('Documentation', ['#Market Data', 'Java', 'C#', 'C++', '#Order Entry', 'C#'])}
          </div>
          <div class="site-footer__bottom">
            <span>© ${new Date().getFullYear()} Tooq Technology</span>
            <nav>
              <a href="${SITE}" target="_blank" rel="noopener">tooqtechnology.com ↗</a>
              <a href="#/blog">Blog</a>
              <a href="${SITE}" target="_blank" rel="noopener">Careers</a>
              <a href="${SITE}" target="_blank" rel="noopener">Terms & Conditions</a>
            </nav>
          </div>
        </div>
      </footer>`;
  }

  const postCardHtml = (p) => `
    <article class="post-card">
      <a class="post-card__cover" href="#/blog/${encodeURIComponent(p.slug)}">${coverHtml(p)}</a>
      <div>${p.product ? `<span class="pill">${h(productName(p.product))}</span>` : ''}</div>
      <h3><a href="#/blog/${encodeURIComponent(p.slug)}">${h(p.title)}</a></h3>
      <p>${h(p.summary)}</p>
      <a href="#/blog/${encodeURIComponent(p.slug)}">${bylineHtml(p)}</a>
    </article>`;

  function viewBlog() {
    const b = state.blog;
    let list = state.posts.filter((p) => matches(p, b.query));
    if (b.product) list = list.filter((p) => p.product === b.product);
    list = sortPosts(list, b.sort);
    const hasFilter = !!(b.query || b.product);
    const latest = hasFilter ? null : latestOf(list);
    const rest = latest ? list.filter((p) => p !== latest) : list;
    const counts = {};
    state.posts.forEach((p) => { counts[p.product] = (counts[p.product] || 0) + 1; });
    const usedProducts = PRODUCTS.filter((p) => counts[p.slug]);

    const content = `
      <div class="site" data-theme="${state.theme}">
        ${siteNav()}
        <section class="site-hero">
          <span class="pill">Read our blog</span>
          <h1>Insights from Tooq</h1>
          <p>Guides to electronic trading, market infrastructure, and Tooq Cloud, from the team that builds and runs it.</p>
        </section>
        <div class="wrap">
          <div class="site-main">
            <aside class="site-side">
              <div>
                <span class="label">Search</span>
                <label class="search">${icon('search')}<input type="search" placeholder="Search articles..." value="${h(b.query)}" data-input="blog-query" aria-label="Search articles"></label>
              </div>
              <div>
                <span class="label">Sort</span>
                <div class="select-wrap">${icon('filter')}
                  <select class="select" data-input="blog-sort" aria-label="Sort">
                    <option value="newest" ${b.sort === 'newest' ? 'selected' : ''}>Newest first</option>
                    <option value="oldest" ${b.sort === 'oldest' ? 'selected' : ''}>Oldest first</option>
                    <option value="title" ${b.sort === 'title' ? 'selected' : ''}>Title A–Z</option>
                  </select>
                </div>
              </div>
              <div>
                <span class="label">Browse by product</span>
                <div class="browse">
                  <button type="button" class="${!b.product ? 'is-active' : ''}" data-action="blog-product" data-value="">All articles <span>${state.posts.length}</span></button>
                  ${usedProducts.map((p) => `<button type="button" class="${b.product === p.slug ? 'is-active' : ''}" data-action="blog-product" data-value="${p.slug}">${h(p.name)} <span>${counts[p.slug]}</span></button>`).join('')}
                </div>
              </div>
            </aside>
            <main>
              ${latest ? `
                <article class="featured">
                  <a class="featured__cover" href="#/blog/${encodeURIComponent(latest.slug)}">${coverHtml(latest)}</a>
                  <div>
                    <div class="featured__tags"><span class="pill pill--solid">Latest post</span>${latest.product ? `<span class="pill">${h(productName(latest.product))}</span>` : ''}</div>
                    <h2><a href="#/blog/${encodeURIComponent(latest.slug)}">${h(latest.title)}</a></h2>
                    <p>${h(latest.summary)}</p>
                    <a href="#/blog/${encodeURIComponent(latest.slug)}">${bylineHtml(latest)}</a>
                  </div>
                </article>` : ''}
              <div class="site-count"><span class="label">${list.length} article${list.length === 1 ? '' : 's'}</span></div>
              ${list.length
                ? (rest.length ? `<div class="post-grid">${rest.map(postCardHtml).join('')}</div>` : '')
                : `<div class="site-empty">${state.posts.length ? 'No articles match your search.' : 'No articles yet. Create one in Conteúdos.'}</div>`}
            </main>
          </div>
        </div>
        ${siteFooter()}
      </div>`;
    return shell(content, 'blog');
  }

  function articleHtml(p, { standalone = true } = {}) {
    return `
      <section class="article-hero">
        <div class="article-hero__in">
          ${standalone ? `<a class="back" href="#/blog">${icon('arrowLeft')} All articles</a>` : ''}
          <div class="article-hero__tags">
            ${isLatest(p) ? `<span class="pill pill--solid">Latest post</span>` : ''}
            ${p.product ? `<a class="pill" href="${productUrl(p.product)}" target="_blank" rel="noopener">${h(productName(p.product))}</a>` : ''}
          </div>
          <h1>${h(p.title) || '<span style="opacity:.35">Title</span>'}</h1>
          ${p.summary ? `<p class="lead">${h(p.summary)}</p>` : ''}
          ${bylineHtml(p, false)}
        </div>
      </section>
      ${p.coverUrl ? `<figure class="article-cover"><div class="cover"><img src="${h(p.coverUrl)}" alt="${h(p.coverAlt)}"></div>${p.coverAlt ? `<figcaption>${h(p.coverAlt)}</figcaption>` : ''}</figure>` : ''}
      <div class="article-body">
        ${p.body.trim() ? `<div class="prose">${renderBody(p)}</div>` : `<p class="prose prose--empty">O texto do artigo aparece aqui.</p>`}
      </div>`;
  }

  function viewArticle(slug) {
    const p = state.posts.find((x) => x.slug === slug);
    if (!p) return shell(`<div class="site" data-theme="${state.theme}">${siteNav()}<div class="wrap"><div class="site-empty" style="margin:40px 0">Article not found. <a href="#/blog">Back to the blog</a>.</div></div></div>`, 'blog');
    return shell(`<div class="site" data-theme="${state.theme}">${siteNav()}${articleHtml(p)}${siteFooter()}</div>`, 'blog');
  }

  /* ------------------------------------------------------------------
     Editor
     ------------------------------------------------------------------ */
  function newDraft() {
    return {
      name: '', slug: '', title: '', summary: '', date: toLocalInput(new Date()), author: '', product: '',
      cover: '', coverAlt: '', seoTitle: '', seoDescription: '', body: '', coverUrl: '', mtime: 0,
      dir: '', assetMap: {},
    };
  }

  function openEditor(slug) {
    const original = slug ? state.posts.find((p) => p.slug === slug) : null;
    if (slug && !original) { toast('Artigo não encontrado.', true); location.hash = '#/'; return ''; }
    editor = {
      draft: original ? { ...original, assetMap: { ...original.assetMap } } : newDraft(),
      original,
      dirty: false,
      savedOnce: justSaved,
      previewMode: 'article',
      bodyMode: 'md',
      coverUrlOpen: false,
      route: location.hash,
    };
    justSaved = false;
    return viewEditor();
  }

  const field = (label, control, help, extra = '') =>
    `<div class="field ${extra}"><span class="label">${label}</span>${control}${help ? `<p class="help">${help}</p>` : ''}</div>`;

  function editorStatusHtml() {
    if (editor.dirty) return `<div class="editor__status editor__status--dirty">Alterações não salvas</div>`;
    if (editor.savedOnce) return `<div class="editor__status editor__status--saved">Arquivo gerado</div>`;
    if (editor.original) return `<div class="editor__status editor__status--path" title="content-blog/${h(postPath(editor.original))}">content-blog/${h(postPath(editor.original))}</div>`;
    return `<div class="editor__status">Novo artigo</div>`;
  }

  function slugLineHtml() {
    const d = editor.draft;
    const slug = currentSlug();
    const size = new Blob([MD.stringifyFrontMatter(frontMatterOf(d, slug), d.body)]).size;
    return `<span>tooqtechnology.com/blog/<b>${h(slug) || '…'}</b></span> · <span>content-blog/<b>${h(currentDir())}/${h(fileName())}</b></span> · <span>${fmtKB(size)}</span>${editor.original ? ' · endereço fixo' : ''}`;
  }
  const postPath = (p) => (p.dir ? p.dir + '/' : '') + p.name;
  const currentSlug = () => editor.original ? editor.original.slug : (slugify(editor.draft.title) || 'novo-artigo');
  const currentDir = () => editor.original ? (editor.original.dir || editor.original.slug) : currentSlug();
  const fileName = () => editor.original ? editor.original.name : `${currentSlug()}.md`;

  function coverBoxHtml() {
    const d = editor.draft;
    return `
      <div class="coverbox">
        <div class="coverbox__thumb">${d.cover ? coverHtml({ coverUrl: d.coverUrl, coverAlt: d.coverAlt, product: d.product }) : coverHtml({ product: d.product })}</div>
        <div class="coverbox__actions">
          <button type="button" class="chip" data-action="cover-pick">Escolha uma imagem</button>
          <button type="button" class="chip" data-action="cover-url-toggle">Inserir de uma URL</button>
          ${d.cover ? `<button type="button" class="chip" style="color:var(--red)" data-action="cover-remove">Remover capa</button>` : ''}
          ${editor.coverUrlOpen ? `<div class="coverbox__url"><input class="input" type="url" placeholder="https://…" data-input="cover-url" aria-label="URL da imagem"><button type="button" class="btn btn--primary btn--sm" data-action="cover-url-apply">Usar</button></div>` : ''}
          ${d.cover ? `<div class="coverbox__info">${d.cover.startsWith('data:') ? `Embutida no .md · ${fmtKB(dataUrlBytes(d.cover))}` : isAbsUrl(d.cover) ? h(d.cover) : `content-blog/${h(currentDir())}/${h(d.cover)}`}</div>` : ''}
        </div>
      </div>`;
  }

  function viewEditor() {
    const d = editor.draft;
    const dateVal = (() => { const dt = parseDate(d.date); return dt ? toLocalInput(dt) : ''; })();
    const productOptions = ['<option value="">— Selecione —</option>'].concat(
      ['Cloud', 'Managed Services', 'On-premises'].map((g) =>
        `<optgroup label="${g}">${PRODUCTS.filter((p) => p.group === g).map((p) => `<option value="${p.slug}" ${d.product === p.slug ? 'selected' : ''}>${h(p.name)}</option>`).join('')}</optgroup>`)
    ).join('');

    return `
      <div class="editor">
        <header class="editor__bar">
          <a class="editor__back" href="#/" data-action="back" aria-label="Voltar">${icon('arrowLeft')}</a>
          <div class="editor__meta">
            <div class="editor__title">Escrevendo na coleção Blog</div>
            <div id="editorStatus">${editorStatusHtml()}</div>
          </div>
          <div class="split">
            <button type="button" class="split__main" data-action="generate">${icon('save')}<span>Gerar arquivo</span></button>
            <details class="menu">
              <summary aria-label="Mais opções">${icon('chevron')}</summary>
              <div class="menu__list">
                <button type="button" class="menu__item" data-action="generate">${icon('save')} Gerar arquivo em content-blog</button>
                <button type="button" class="menu__item" data-action="download">${icon('download')} Baixar .md</button>
                <button type="button" class="menu__item" data-action="copy">${icon('copy')} Copiar Markdown</button>
                <a class="menu__item" href="#/blog/${encodeURIComponent(currentSlug())}" ${editor.original ? '' : 'hidden'}>${icon('eye')} Ver no blog</a>
                ${editor.original && state.store.canDelete ? `<div class="menu__sep"></div><button type="button" class="menu__item menu__item--danger" data-action="delete">${icon('trash')} Excluir artigo</button>` : ''}
              </div>
            </details>
          </div>
          <div class="spacer"></div>
          ${storeMenuHtml()}
        </header>

        <div class="editor__body">
          <form class="editor__form" id="editorForm" autocomplete="off" novalidate>
            ${field('Título',
              `<input class="input" name="title" value="${h(d.title)}" placeholder="Title of the article" required>
               <div class="slugline" id="slugLine">${slugLineHtml()}</div>`,
              'Também vira o endereço do artigo. Depois de publicado, o endereço não muda.', 'field--title')}

            ${field('Resumo',
              `<textarea class="textarea" name="summary" placeholder="">${h(d.summary)}</textarea>`,
              'Uma ou duas frases. Aparece nos cartões do blog e na prévia do LinkedIn.')}

            ${field('Data',
              `<div class="inline-box inline-box--date">
                 <input class="input" type="datetime-local" name="date" value="${dateVal}">
                 <button type="button" class="chip" data-action="date-now">Agora</button>
                 <button type="button" class="chip" data-action="date-clear">Limpar</button>
               </div>`, '')}

            ${field('Autor', `<input class="input" name="author" value="${h(d.author)}" placeholder="">`, '')}

            ${field('Produto',
              `<select class="select" name="product">${productOptions}</select>`,
              'O produto da Tooq de que o artigo trata. Vira o filtro do blog e um link para a página do produto.')}

            ${field('Imagem de capa (opcional)',
              `<div id="coverBox">${coverBoxHtml()}</div>`,
              'Proporção 16:9. A imagem é embutida no próprio .md (base64), redimensionada para até 1600 px e comprimida automaticamente. Sem capa, o blog usa um padrão com o símbolo da Tooq.')}

            ${field('Descrição da imagem de capa (opcional)',
              `<input class="input" name="coverAlt" value="${h(d.coverAlt)}">`,
              'O que aparece na imagem, para leitores de tela. Deixe vazio se a imagem for só decorativa.')}

            ${field('Título para o Google (opcional)',
              `<input class="input" name="seoTitle" value="${h(d.seoTitle)}" maxlength="90">`,
              `<span class="counter" data-counter="seoTitle">${d.seoTitle.length}/60</span>Opcional. Até 60 caracteres. Se vazio, usa o título.`)}

            ${field('Descrição para o Google (opcional)',
              `<textarea class="textarea" name="seoDescription" maxlength="220">${h(d.seoDescription)}</textarea>`,
              `<span class="counter" data-counter="seoDescription">${d.seoDescription.length}/155</span>Opcional. Até 155 caracteres. Se vazio, usa o resumo.`)}

            ${field('Texto',
              `<div class="texto">
                 <div class="texto__bar" role="toolbar" aria-label="Formatação">
                   <button type="button" class="iconbtn" data-action="md" data-cmd="bold" title="Negrito (Ctrl+B)">${icon('bold')}</button>
                   <button type="button" class="iconbtn" data-action="md" data-cmd="italic" title="Itálico (Ctrl+I)">${icon('italic')}</button>
                   <button type="button" class="iconbtn" data-action="md" data-cmd="code" title="Código">${icon('code')}</button>
                   <button type="button" class="iconbtn" data-action="md" data-cmd="link" title="Link (Ctrl+K)">${icon('link')}</button>
                   <details class="menu">
                     <summary class="iconbtn" title="Título">${icon('heading')}${icon('chevron', 'icon--sm')}</summary>
                     <div class="menu__list menu__list--left">
                       <button type="button" class="menu__item" data-action="md" data-cmd="h2">Título de seção (H2)</button>
                       <button type="button" class="menu__item" data-action="md" data-cmd="h3">Subtítulo (H3)</button>
                       <button type="button" class="menu__item" data-action="md" data-cmd="h4">Título menor (H4)</button>
                     </div>
                   </details>
                   <button type="button" class="iconbtn" data-action="md" data-cmd="quote" title="Citação">${icon('quote')}</button>
                   <button type="button" class="iconbtn" data-action="md" data-cmd="ul" title="Lista">${icon('ul')}</button>
                   <button type="button" class="iconbtn" data-action="md" data-cmd="ol" title="Lista numerada">${icon('ol')}</button>
                   <details class="menu">
                     <summary class="iconbtn" title="Inserir">${icon('plus')}${icon('chevron', 'icon--sm')}</summary>
                     <div class="menu__list menu__list--left">
                       <button type="button" class="menu__item" data-action="md" data-cmd="image">${icon('image')} Imagem (embutida no .md)</button>
                       <button type="button" class="menu__item" data-action="md" data-cmd="codeblock">${icon('code')} Bloco de código</button>
                       <button type="button" class="menu__item" data-action="md" data-cmd="table">${icon('grid')} Tabela</button>
                       <button type="button" class="menu__item" data-action="md" data-cmd="hr">${icon('minus')} Separador</button>
                     </div>
                   </details>
                   <label class="texto__mode">
                     <b class="${editor.bodyMode === 'md' ? 'is-on' : ''}">Markdown</b>
                     <span class="switch"><input type="checkbox" data-input="body-mode" ${editor.bodyMode === 'preview' ? 'checked' : ''} aria-label="Alternar prévia do texto"><span></span></span>
                     <b class="${editor.bodyMode === 'preview' ? 'is-on' : ''}">Prévia</b>
                   </label>
                 </div>
                 <textarea class="texto__area" name="body" id="bodyArea" spellcheck="true" ${editor.bodyMode === 'preview' ? 'hidden' : ''}>${h(d.body)}</textarea>
                 <div class="texto__render prose" id="bodyRender" ${editor.bodyMode === 'preview' ? '' : 'hidden'}>${renderBody(d) || '<p class="prose--empty">Nada escrito ainda.</p>'}</div>
               </div>`, '')}
          </form>

          <aside class="editor__preview" id="editorPreview">
            <div class="editor__preview-inner">
              <div class="editor__preview-tools">
                <button type="button" class="fab editor__preview-close" data-action="preview-close" aria-label="Fechar prévia">${icon('x')}</button>
                <button type="button" class="fab" data-action="preview-mode" title="Alternar: artigo / cartões do blog">${icon(editor.previewMode === 'article' ? 'eye' : 'updown')}</button>
              </div>
              <div id="previewContent">${previewHtml()}</div>
            </div>
          </aside>
          <button type="button" class="fab editor__fab-mobile" data-action="preview-open" aria-label="Ver prévia">${icon('eye')}</button>
        </div>
      </div>`;
  }

  function previewHtml() {
    const p = { ...editor.draft, slug: currentSlug() };
    if (editor.previewMode === 'cards') {
      return `
        <div class="preview-cards">
          <div>
            <span class="label">Cartão no blog</span>
            <div class="site" data-theme="${state.theme}">${postCardHtml(p)}</div>
          </div>
          <div>
            <span class="label">Linha em Conteúdos</span>
            <div class="row"><span class="row__title">${h(p.title) || '…'}</span><span class="row__date">${fmtBR(p.date)}</span></div>
          </div>
          <div>
            <span class="label">Resultado no Google</span>
            <div style="font-family:Arial,sans-serif;max-width:600px">
              <div style="font-size:12px;color:#202124">tooqtechnology.com › blog › ${h(p.slug)}</div>
              <div style="font-size:19px;color:#1a0dab;margin:4px 0 2px">${h((p.seoTitle || p.title || 'Title').slice(0, 60))}</div>
              <div style="font-size:13.5px;color:#4d5156;line-height:1.5">${h((p.seoDescription || p.summary || MD.plain(p.body)).slice(0, 155))}</div>
            </div>
          </div>
        </div>`;
    }
    return `<div class="site" data-theme="light">${articleHtml(p, { standalone: false })}</div>`;
  }

  let previewRaf;
  function updatePreview() {
    cancelAnimationFrame(previewRaf);
    previewRaf = requestAnimationFrame(() => {
      const el = document.getElementById('previewContent');
      if (el) el.innerHTML = previewHtml();
      const slug = document.getElementById('slugLine');
      if (slug) slug.innerHTML = slugLineHtml();
      const st = document.getElementById('editorStatus');
      if (st) st.innerHTML = editorStatusHtml();
    });
  }
  function setDirty() { if (!editor.dirty) { editor.dirty = true; editor.savedOnce = false; } }

  function validate() {
    const d = editor.draft;
    const titleField = document.querySelector('.field--title');
    if (!d.title.trim()) {
      titleField && titleField.classList.add('field--invalid');
      document.querySelector('[name="title"]').focus();
      toast('Informe o título do artigo.', true);
      return false;
    }
    titleField && titleField.classList.remove('field--invalid');
    if (!d.date) { toast('Informe a data de publicação.', true); document.querySelector('[name="date"]').focus(); return false; }
    return true;
  }

  async function generate() {
    if (!validate()) return;
    const d = editor.draft;
    let slug = currentSlug();
    if (!editor.original) {
      // slug único para artigos novos
      const base = slugify(d.title) || 'novo-artigo';
      slug = base; let n = 2;
      while (state.posts.some((p) => p.slug === slug || p.dir === slug)) slug = `${base}-${n++}`;
    }
    const dir = editor.original ? (editor.original.dir || slug) : slug;
    const name = editor.original ? editor.original.name : `${slug}.md`;
    const content = MD.stringifyFrontMatter(frontMatterOf(d, slug), d.body);

    try {
      if (state.store.canWrite) {
        await state.store.save(dir, name, content);
        // .md antigo solto na raiz de content-blog → migra para a pasta do artigo
        if (editor.original && !editor.original.dir) await state.store.remove('', editor.original.name).catch(() => {});
        await loadPosts({ silent: true });
        editor.dirty = false;
        justSaved = true;
        toast(`Arquivo gerado: content-blog/${dir}/${name}`);
        const target = `#/editar/${encodeURIComponent(slug)}`;
        if (location.hash !== target) location.hash = target; // hashchange → render
        else render();
      } else {
        await state.store.save(dir, name, content);
        editor.dirty = false; editor.savedOnce = true;
        updatePreview();
        toast(`Download iniciado. Coloque o arquivo em content-blog/${dir}/.`);
      }
    } catch (e) {
      console.error(e);
      toast('Erro ao gerar o arquivo: ' + e.message, true);
    }
  }

  function frontMatterOf(d, slug) {
    return {
      title: d.title.trim(), slug, summary: d.summary.trim(), date: d.date, author: d.author.trim(),
      product: d.product, cover: d.cover.trim(), coverAlt: d.coverAlt.trim(),
      seoTitle: d.seoTitle.trim(), seoDescription: d.seoDescription.trim(),
    };
  }

  async function deletePost() {
    const o = editor.original;
    if (!o) return;
    const what = o.dir ? `a pasta content-blog/${o.dir}/ (com o .md e as imagens)` : `o arquivo content-blog/${o.name}`;
    if (!confirm(`Excluir ${what}?`)) return;
    try {
      await state.store.remove(o.dir, o.name);
      await loadPosts({ silent: true });
      editor = null;
      toast('Artigo excluído.');
      location.hash = '#/';
    } catch (e) { toast(e.message, true); }
  }

  /* --- toolbar do markdown --- */
  function mdCommand(cmd) {
    const ta = document.getElementById('bodyArea');
    if (!ta) return;
    if (editor.bodyMode === 'preview') { setBodyMode('md'); }
    ta.focus();
    const v = ta.value, s = ta.selectionStart, e = ta.selectionEnd;
    const sel = v.slice(s, e);
    let before = v.slice(0, s), after = v.slice(e), ins = '', cs = 0, ce = 0;

    // os marcadores ficam colados no texto: "** palavra **" não vira negrito no Markdown,
    // então espaços da seleção (o duplo clique pega o espaço depois da palavra) ficam de fora
    const wrap = (l, r, ph) => {
      const parts = (sel || ph).split('\n').map((x) => {
        const lead = x.match(/^\s*/)[0];
        const core = x.slice(lead.length).replace(/\s+$/, '');
        return { lead, core, trail: x.slice(lead.length + core.length) };
      });
      const one = parts.length === 1 && parts[0].core ? parts[0] : null;
      // já formatado (marcadores dentro ou em volta da seleção): remove
      if (one && one.core.length > l.length + r.length && one.core.startsWith(l) && one.core.endsWith(r)) {
        const t = one.core.slice(l.length, -r.length);
        ins = one.lead + t + one.trail; cs = s + one.lead.length; ce = cs + t.length; return;
      }
      if (one && !one.lead && !one.trail && before.endsWith(l) && after.startsWith(r)) {
        before = before.slice(0, -l.length); after = after.slice(r.length);
        ins = one.core; cs = s - l.length; ce = cs + one.core.length; return;
      }
      ins = parts.map((x) => (x.core ? x.lead + l + x.core + r + x.trail : x.lead + x.trail)).join('\n');
      if (one) { cs = s + one.lead.length + l.length; ce = cs + one.core.length; } else { cs = s; ce = s + ins.length; }
    };
    const prefixLines = (pfx, numbered) => {
      // expande para linhas inteiras
      const ls = before.lastIndexOf('\n') + 1;
      const le = after.indexOf('\n'); const endIdx = le === -1 ? v.length : e + le;
      const block = v.slice(ls, endIdx);
      const lines = block.split('\n');
      const out = lines.map((l, i) => (numbered ? `${i + 1}. ` : pfx) + l.replace(/^(\s*([-*+]|\d+[.)]|>|#{1,6})\s+)/, ''));
      before = v.slice(0, ls); after = v.slice(endIdx); ins = out.join('\n');
      // linha vazia: só posiciona o cursor depois do prefixo; com conteúdo: seleciona o bloco
      if (!block.trim()) { cs = ce = ls + ins.length; } else { cs = ls; ce = ls + ins.length; }
    };
    const block = (text) => { const nlB = before && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : ''; const nlA = after && !after.startsWith('\n') ? '\n\n' : ''; ins = nlB + text + nlA; cs = s + nlB.length; ce = cs + text.length; };

    switch (cmd) {
      case 'bold': wrap('**', '**', 'bold text'); break;
      case 'italic': wrap('_', '_', 'italic text'); break;
      case 'code': sel.includes('\n') ? block('```\n' + sel + '\n```') : wrap('`', '`', 'code'); break;
      case 'link': { const url = prompt('URL do link:', 'https://'); if (url === null) return; ins = `[${sel || 'link text'}](${url})`; cs = s + 1; ce = cs + (sel || 'link text').length; break; }
      case 'h2': prefixLines('## '); break;
      case 'h3': prefixLines('### '); break;
      case 'h4': prefixLines('#### '); break;
      case 'quote': prefixLines('> '); break;
      case 'ul': prefixLines('- '); break;
      case 'ol': prefixLines('', true); break;
      case 'hr': block('---'); break;
      case 'codeblock': block('```\n' + (sel || 'code') + '\n```'); cs = s + (before.endsWith('\n\n') || !before ? 0 : before.endsWith('\n') ? 1 : 2) + 4; ce = cs + (sel || 'code').length; break;
      case 'table': block('| Column | Column |\n| --- | --- |\n| Cell | Cell |'); break;
      case 'image': document.getElementById('bodyImageInput').click(); return;
      default: return;
    }
    ta.value = before + ins + after;
    ta.setSelectionRange(cs, ce);
    editor.draft.body = ta.value;
    setDirty();
    updatePreview();
  }

  function setBodyMode(mode) {
    editor.bodyMode = mode;
    const ta = document.getElementById('bodyArea'), rd = document.getElementById('bodyRender');
    const cb = document.querySelector('[data-input="body-mode"]');
    if (!ta || !rd) return;
    if (mode === 'preview') { rd.innerHTML = renderBody(editor.draft) || '<p class="prose--empty">Nada escrito ainda.</p>'; rd.hidden = false; ta.hidden = true; }
    else { rd.hidden = true; ta.hidden = false; }
    if (cb) cb.checked = mode === 'preview';
    document.querySelectorAll('.texto__mode b').forEach((b, i) => b.classList.toggle('is-on', (i === 0) === (mode === 'md')));
  }

  /* --- imagens: redimensiona/comprime e devolve data URI para embutir no .md --- */
  const MAX_W = 1600, QUALITY = 0.85;
  const fmtKB = (bytes) => bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
  const dataUrlBytes = (u) => { const i = u.indexOf(','); return i < 0 ? 0 : Math.floor((u.length - i - 1) * 3 / 4); };
  const readAsDataUrl = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error || new Error('Não foi possível ler o arquivo.')); r.readAsDataURL(blob); });
  const loadImg = (url) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Imagem inválida.')); i.src = url; });

  async function embedImage(file) {
    if (!/^image\//.test(file.type)) throw new Error('Escolha um arquivo de imagem.');
    const original = await readAsDataUrl(file);
    // SVG e GIF (animação) vão como estão
    if (/svg|gif/.test(file.type)) return { dataUrl: original, bytes: file.size, note: 'sem conversão' };
    let img;
    try { img = await loadImg(original); } catch { return { dataUrl: original, bytes: file.size, note: 'sem conversão' }; }
    const scale = Math.min(1, MAX_W / img.naturalWidth);
    const w = Math.round(img.naturalWidth * scale), hgt = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = hgt;
    canvas.getContext('2d').drawImage(img, 0, 0, w, hgt);
    // WebP quando o navegador souber codificar; senão JPEG (ou PNG se tiver transparência)
    const wantsAlpha = file.type === 'image/png';
    let out = canvas.toDataURL('image/webp', QUALITY);
    if (!out.startsWith('data:image/webp')) out = canvas.toDataURL(wantsAlpha ? 'image/png' : 'image/jpeg', QUALITY);
    const best = dataUrlBytes(out) < file.size ? out : original;
    return { dataUrl: best, bytes: dataUrlBytes(best), width: w, height: hgt, note: best === out ? `${w}×${hgt}` : 'original mantido' };
  }

  // próxima referência livre no texto: [imagem-N]: data:...
  function nextImageRef(body) {
    let n = 0;
    String(body).replace(/^\s*\[imagem-(\d+)\]:/gm, (m, d) => { n = Math.max(n, +d); return m; });
    return `imagem-${n + 1}`;
  }

  async function insertImage(file) {
    if (!file) return;
    try {
      const { dataUrl, bytes, note } = await embedImage(file);
      const ta = document.getElementById('bodyArea');
      const ref = nextImageRef(editor.draft.body);
      const alt = file.name.replace(/\.[^.]+$/, '');
      const md = `![${alt}][${ref}]`;
      let v = ta ? ta.value : editor.draft.body;
      const s0 = ta ? ta.selectionStart : v.length;
      const nl = v && s0 > 0 && v[s0 - 1] !== '\n' ? '\n\n' : '';
      v = v.slice(0, s0) + nl + md + '\n\n' + v.slice(s0);
      v = v.replace(/\s+$/, '') + `\n\n[${ref}]: ${dataUrl}\n`;   // referência no fim do arquivo
      editor.draft.body = v;
      if (ta) { ta.value = v; const pos = s0 + nl.length + md.length + 2; ta.setSelectionRange(pos, pos); } // cursor depois da linha em branco
      setDirty(); updatePreview();
      toast(`Imagem embutida no .md (${fmtKB(bytes)}, ${note}).`);
    } catch (e) { toast('Erro ao embutir a imagem: ' + e.message, true); }
  }

  async function setCover(file) {
    if (!file) return;
    try {
      const { dataUrl, bytes, note } = await embedImage(file);
      editor.draft.cover = dataUrl;
      editor.draft.coverUrl = dataUrl;
      editor.coverUrlOpen = false;
      if (bytes > 500 * 1024) toast(`Capa embutida com ${fmtKB(bytes)}; o ideal é menos de 500 KB.`);
      else toast(`Capa embutida no .md (${fmtKB(bytes)}, ${note}).`);
      setDirty();
      document.getElementById('coverBox').innerHTML = coverBoxHtml();
      updatePreview();
    } catch (e) { toast('Erro ao salvar a capa: ' + e.message, true); }
  }

  /* ------------------------------------------------------------------
     Render / roteador
     ------------------------------------------------------------------ */
  function render() {
    const hash = location.hash || '#/';
    const m = hash.match(/^#\/([^/]*)\/?(.*)$/);
    const page = m ? m[1] : '', arg = m ? decodeURIComponent(m[2] || '') : '';
    let html;
    const wasEditor = !!editor;
    if (page === 'novo') html = openEditor(null);
    else if (page === 'editar') html = openEditor(arg);
    else {
      editor = null;
      if (page === 'blog') html = arg ? viewArticle(arg) : viewBlog();
      else html = viewList();
    }
    if (html === '') return;
    app.innerHTML = html;
    if (!wasEditor || !editor) window.scrollTo(0, 0);
    document.title = editor
      ? `${editor.draft.title || 'Novo artigo'} · Tooq Blog`
      : page === 'blog' ? 'Blog · Tooq' : 'Conteúdos · Tooq Blog';
  }

  function navigateFromEditor(to) {
    if (editor && editor.dirty && !confirm('Há alterações não salvas. Sair mesmo assim?')) return false;
    if (to) location.hash = to;
    return true;
  }

  /* ------------------------------------------------------------------
     Eventos (delegados)
     ------------------------------------------------------------------ */
  document.addEventListener('click', async (e) => {
    // fecha outros menus abertos
    const openMenus = document.querySelectorAll('details.menu[open]');
    openMenus.forEach((d) => { if (!d.contains(e.target)) d.removeAttribute('open'); });

    const el = e.target.closest('[data-action]');
    if (!el) return;
    const act = el.dataset.action;
    const menu = el.closest('details.menu');
    if (menu && el.tagName === 'BUTTON') menu.removeAttribute('open');

    switch (act) {
      case 'connect-fs': connectFolder(); break;
      case 'reconnect-fs': reconnectFolder(); break;
      case 'disconnect-fs': disconnectFolder(); break;
      case 'pick-files': document.getElementById('dirInput').click(); break;
      case 'reload': await loadPosts(); render(); toast('Artigos recarregados.'); break;
      case 'cms-sort': state.cms.sort = el.dataset.value; render(); break;
      case 'cms-filter': state.cms.product = el.dataset.product || ''; render(); break;
      case 'cms-layout': state.cms.layout = el.dataset.value; try { localStorage.setItem('tooq.layout', state.cms.layout); } catch {} render(); break;
      case 'blog-product': state.blog.product = el.dataset.value || ''; render(); break;
      case 'theme': state.theme = el.dataset.value; try { localStorage.setItem('tooq.theme', state.theme); } catch {} document.querySelectorAll('.site').forEach((s) => s.dataset.theme = state.theme); document.querySelectorAll('.theme-toggle button').forEach((b) => b.classList.toggle('is-on', b.dataset.value === state.theme)); break;

      // editor
      case 'back': e.preventDefault(); navigateFromEditor('#/'); break;
      case 'generate': generate(); break;
      case 'download': if (validate()) download(fileName(), MD.stringifyFrontMatter(frontMatterOf(editor.draft, currentSlug()), editor.draft.body)); break;
      case 'copy': try { await navigator.clipboard.writeText(MD.stringifyFrontMatter(frontMatterOf(editor.draft, currentSlug()), editor.draft.body)); toast('Markdown copiado.'); } catch { toast('Não foi possível copiar.', true); } break;
      case 'delete': deletePost(); break;
      case 'date-now': { const i = document.querySelector('[name="date"]'); i.value = toLocalInput(new Date()); editor.draft.date = i.value; setDirty(); updatePreview(); break; }
      case 'date-clear': { const i = document.querySelector('[name="date"]'); i.value = ''; editor.draft.date = ''; setDirty(); updatePreview(); break; }
      case 'cover-pick': document.getElementById('coverInput').click(); break;
      case 'cover-url-toggle': editor.coverUrlOpen = !editor.coverUrlOpen; document.getElementById('coverBox').innerHTML = coverBoxHtml(); if (editor.coverUrlOpen) document.querySelector('[data-input="cover-url"]').focus(); break;
      case 'cover-url-apply': {
        const i = document.querySelector('[data-input="cover-url"]');
        const url = (i.value || '').trim();
        if (!url) { i.focus(); break; }
        editor.draft.cover = url;
        editor.draft.coverUrl = isAbsUrl(url) ? url : '';
        if (!isAbsUrl(url)) { try { editor.draft.coverUrl = editor.draft.assetMap[url] || await state.store.assetUrl(currentDir(), url.replace(/^\.?\//, '')); } catch {} }
        editor.coverUrlOpen = false; setDirty();
        document.getElementById('coverBox').innerHTML = coverBoxHtml(); updatePreview();
        break;
      }
      case 'cover-remove': editor.draft.cover = ''; editor.draft.coverUrl = ''; setDirty(); document.getElementById('coverBox').innerHTML = coverBoxHtml(); updatePreview(); break;
      case 'md': mdCommand(el.dataset.cmd); break;
      case 'preview-open': document.getElementById('editorPreview').classList.add('is-open'); break;
      case 'preview-close': document.getElementById('editorPreview').classList.remove('is-open'); break;
      case 'preview-mode': editor.previewMode = editor.previewMode === 'article' ? 'cards' : 'article'; el.innerHTML = icon(editor.previewMode === 'article' ? 'eye' : 'updown'); updatePreview(); break;
    }
  });

  // inputs do editor e das buscas
  document.addEventListener('input', (e) => {
    const t = e.target;
    const di = t.dataset.input;
    if (di === 'cms-query') { state.cms.query = t.value; refreshListOnly(); return; }
    if (di === 'blog-query') { state.blog.query = t.value; refreshBlogOnly(); return; }
    if (!editor || !t.name) return;
    const d = editor.draft;
    d[t.name] = t.value;
    const counter = document.querySelector(`[data-counter="${t.name}"]`);
    if (counter) { const max = t.name === 'seoTitle' ? 60 : 155; counter.textContent = `${t.value.length}/${max}`; counter.classList.toggle('is-over', t.value.length > max); }
    if (t.name === 'title') { const f = t.closest('.field'); if (t.value.trim()) f.classList.remove('field--invalid'); document.title = `${t.value || 'Novo artigo'} · Tooq Blog`; }
    setDirty();
    updatePreview();
  });

  document.addEventListener('change', (e) => {
    const t = e.target;
    const di = t.dataset.input;
    if (di === 'blog-sort') { state.blog.sort = t.value; render(); return; }
    if (di === 'body-mode') { setBodyMode(t.checked ? 'preview' : 'md'); return; }
    if (t.id === 'dirInput') { if (t.files.length) loadFolderFallback(t.files); t.value = ''; return; }
    // o input só é limpo depois da leitura: limpar antes invalida o File no Chrome
    if (t.id === 'coverInput') { setCover(t.files[0]).finally(() => { t.value = ''; }); return; }
    if (t.id === 'bodyImageInput') { insertImage(t.files[0]).finally(() => { t.value = ''; }); return; }
    if (editor && (t.name === 'product' || t.name === 'date')) { editor.draft[t.name] = t.value; setDirty(); updatePreview(); }
  });

  document.addEventListener('keydown', (e) => {
    if (!editor) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); generate(); return; }
    if (document.activeElement && document.activeElement.id === 'bodyArea' && mod) {
      const k = e.key.toLowerCase();
      if (k === 'b') { e.preventDefault(); mdCommand('bold'); }
      else if (k === 'i') { e.preventDefault(); mdCommand('italic'); }
      else if (k === 'k') { e.preventDefault(); mdCommand('link'); }
    }
    if (e.key === 'Escape') { const p = document.getElementById('editorPreview'); if (p) p.classList.remove('is-open'); }
  });

  // re-render parcial da lista (mantém foco na busca)
  function refreshListOnly() {
    const main = document.querySelector('.cms__main');
    if (!main) return;
    const tmp = document.createElement('div');
    tmp.innerHTML = viewList();
    main.innerHTML = tmp.querySelector('.cms__main').innerHTML;
  }
  function refreshBlogOnly() {
    const main = document.querySelector('.site-main > main');
    if (!main) return;
    const tmp = document.createElement('div');
    tmp.innerHTML = viewBlog();
    main.innerHTML = tmp.querySelector('.site-main > main').innerHTML;
  }

  window.addEventListener('hashchange', () => {
    if (editor && editor.dirty) {
      const target = location.hash;
      const isEditorRoute = /^#\/(novo|editar)/.test(target);
      const same = isEditorRoute && (target === editor.route);
      if (!same && !confirm('Há alterações não salvas. Sair mesmo assim?')) {
        history.replaceState(null, '', editor.route);
        return;
      }
    }
    render();
    if (editor) editor.route = location.hash;
  });
  window.addEventListener('beforeunload', (e) => { if (editor && editor.dirty) { e.preventDefault(); e.returnValue = ''; } });

  // links externos abertos em nova aba já tratados; atalho: Enter nas buscas não submete nada
  document.addEventListener('submit', (e) => e.preventDefault());

  /* ------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------ */
  (async function boot() {
    app.innerHTML = shell('<div class="cms"><div></div><div class="empty">Carregando…</div></div>', 'conteudos');
    await initStore();
    if (state.store.type !== 'none') await loadPosts({ silent: true });
    render();
    if (editor) editor.route = location.hash;
  })();
})();
