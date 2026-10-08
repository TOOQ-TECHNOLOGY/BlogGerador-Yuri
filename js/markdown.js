/* =====================================================================
   markdown.js — parser de Markdown e de front matter (YAML simples).
   Sem dependências. Expõe window.MD.
   ===================================================================== */
(function () {
  'use strict';

  const esc = (s) => String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const safeUrl = (u) => {
    const t = String(u).trim();
    if (/^(javascript|vbscript|data:text\/html)/i.test(t)) return '#';
    return t;
  };

  /* ---------- referências: [id]: url (ficam no fim do arquivo; usadas por ![alt][id] e [texto][id]) ---------- */
  const REF_RE = /^[ \t]{0,3}\[([^\]\n]+)\]:[ \t]*(\S+)(?:[ \t]+"[^"\n]*")?[ \t]*$/gm;
  function extractRefs(md) {
    const refs = {};
    const body = String(md).replace(/\r\n?/g, '\n').replace(REF_RE, (m, id, url) => { refs[id.trim().toLowerCase()] = url; return ''; });
    return { refs, body };
  }

  /* ---------- inline ---------- */
  function inline(text, refs = {}) {
    const codes = [];
    let t = esc(text);

    // trechos de código viram placeholders para não sofrerem outras transformações
    t = t.replace(/`([^`\n]+)`/g, (m, c) => {
      codes.push(`<code>${c}</code>`);
      return `\u0000${codes.length - 1}\u0000`;
    });

    t = t.replace(/!\[([^\]]*)\]\[([^\]]+)\]/g,
      (m, alt, id) => refs[id.trim().toLowerCase()] ? `<img src="${safeUrl(refs[id.trim().toLowerCase()])}" alt="${alt}" loading="lazy">` : m);
    t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g,
      (m, alt, src) => `<img src="${safeUrl(src)}" alt="${alt}" loading="lazy">`);
    t = t.replace(/\[([^\]]+)\]\[([^\]]+)\]/g,
      (m, txt, id) => refs[id.trim().toLowerCase()] ? `<a href="${safeUrl(refs[id.trim().toLowerCase()])}" target="_blank" rel="noopener">${txt}</a>` : m);
    t = t.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g,
      (m, txt, href) => `<a href="${safeUrl(href)}" target="_blank" rel="noopener">${txt}</a>`);
    t = t.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/__([^_\n]+)__/g, '<strong>$1</strong>');
    t = t.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, '$1<em>$2</em>');
    t = t.replace(/(^|[^_\w])_([^_\n]+)_(?!\w)/g, '$1<em>$2</em>');
    t = t.replace(/~~([^~\n]+)~~/g, '<del>$1</del>');
    t = t.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');

    t = t.replace(/\u0000(\d+)\u0000/g, (m, i) => codes[+i]);
    return t;
  }

  /* ---------- blocos ---------- */
  const RE = {
    fence: /^```\s*([\w+-]*)\s*$/,
    heading: /^(#{1,6})\s+(.*?)\s*#*\s*$/,
    hr: /^\s*([-*_])(\s*\1){2,}\s*$/,
    quote: /^\s?>/,
    ul: /^\s{0,3}[-*+]\s+/,
    ol: /^\s{0,3}\d+[.)]\s+/,
    table: /^\s*\|.*\|\s*$/,
    blank: /^\s*$/,
  };
  const isBlockStart = (l) =>
    RE.fence.test(l) || RE.heading.test(l) || RE.hr.test(l) || RE.quote.test(l) ||
    RE.ul.test(l) || RE.ol.test(l) || RE.table.test(l);

  function render(md, refs) {
    if (!md) return '';
    if (!refs) { const x = extractRefs(md); refs = x.refs; md = x.body; }
    const lines = String(md).replace(/\r\n?/g, '\n').split('\n');
    const out = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      let m;

      if (RE.blank.test(line)) { i++; continue; }

      if ((m = line.match(RE.fence))) {
        const lang = m[1] || '';
        const buf = [];
        i++;
        while (i < lines.length && !/^```\s*$/.test(lines[i])) { buf.push(lines[i]); i++; }
        i++;
        out.push(`<pre><code${lang ? ` class="language-${esc(lang)}"` : ''}>${esc(buf.join('\n'))}</code></pre>`);
        continue;
      }

      if ((m = line.match(RE.heading))) {
        const n = m[1].length;
        out.push(`<h${n}>${inline(m[2], refs)}</h${n}>`);
        i++;
        continue;
      }

      if (RE.hr.test(line)) { out.push('<hr>'); i++; continue; }

      if (RE.quote.test(line)) {
        const buf = [];
        while (i < lines.length && (RE.quote.test(lines[i]) || (!RE.blank.test(lines[i]) && !isBlockStart(lines[i])))) {
          buf.push(lines[i].replace(/^\s?>\s?/, ''));
          i++;
        }
        out.push(`<blockquote>${render(buf.join('\n'), refs)}</blockquote>`);
        continue;
      }

      if (RE.ul.test(line) || RE.ol.test(line)) {
        const ordered = RE.ol.test(line);
        const re = ordered ? RE.ol : RE.ul;
        const items = [];
        while (i < lines.length && re.test(lines[i])) {
          let item = lines[i].replace(re, '');
          i++;
          while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !RE.ul.test(lines[i]) && !RE.ol.test(lines[i])) {
            item += ' ' + lines[i].trim();
            i++;
          }
          items.push(`<li>${inline(item, refs)}</li>`);
        }
        out.push(ordered ? `<ol>${items.join('')}</ol>` : `<ul>${items.join('')}</ul>`);
        continue;
      }

      if (RE.table.test(line) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
        const cells = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
        const head = cells(line);
        i += 2;
        const rows = [];
        while (i < lines.length && RE.table.test(lines[i])) { rows.push(cells(lines[i])); i++; }
        out.push(
          `<table><thead><tr>${head.map((c) => `<th>${inline(c, refs)}</th>`).join('')}</tr></thead>` +
          `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c, refs)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
        );
        continue;
      }

      // parágrafo
      const buf = [];
      while (i < lines.length && !RE.blank.test(lines[i]) && !isBlockStart(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      if (!buf.length) { // linha que começa um bloco mas não casou acima: trata como texto
        buf.push(lines[i]); i++;
      }
      // cada Enter dentro do parágrafo é uma quebra de linha (o arquivo gravado leva a quebra explícita, ver hardBreaks)
      const html = inline(buf.join('\n'), refs).replace(/( {2,}|\\)?\n/g, '<br>');
      out.push(`<p>${html}</p>`);
    }
    return out.join('\n');
  }

  /* ---------- quebras de linha explícitas ----------
     No Markdown padrão um Enter sozinho não quebra a linha (as linhas se juntam no
     mesmo parágrafo). Ao gravar, as linhas seguidas de um parágrafo ganham dois
     espaços no fim, para o site mostrar a quebra igual à prévia. */
  function hardBreaks(md) {
    const lines = String(md).replace(/\r\n?/g, '\n').split('\n');
    const isText = (l) => l !== undefined && !RE.blank.test(l) && !isBlockStart(l) && !/^[ \t]{0,3}\[[^\]\n]+\]:/.test(l);
    const isQuote = (l) => l !== undefined && RE.quote.test(l) && /\S/.test(l.replace(/^\s?>/, ''));
    let fence = false;
    return lines.map((l, i) => {
      if (/^```/.test(l)) { fence = !fence; return l; }
      const next = lines[i + 1];
      const joined = (isText(l) && isText(next)) || (isQuote(l) && isQuote(next));
      if (fence || !joined || /( {2,}|\\)$/.test(l)) return l;
      return l.replace(/\s+$/, '') + '  ';
    }).join('\n');
  }

  /* ---------- texto puro (para contagem de palavras / prévia de SEO) ---------- */
  function plain(md) {
    return String(md || '')
      .replace(REF_RE, ' ')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/!\[[^\]]*\]\[[^\]]*\]/g, ' ')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/[#>*_`~|-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* ---------- front matter ---------- */
  const FM_RE = /^﻿?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)([\s\S]*)$/;

  function parseValue(v) {
    v = v.trim();
    if (v === '') return '';
    if (/^".*"$/.test(v)) { try { return JSON.parse(v); } catch { return v.slice(1, -1); } }
    if (/^'.*'$/.test(v)) return v.slice(1, -1).replace(/''/g, "'");
    if (v === 'true') return true;
    if (v === 'false') return false;
    if (v === 'null' || v === '~') return '';
    if (/^\[.*\]$/.test(v)) return v.slice(1, -1).split(',').map((s) => parseValue(s)).filter((s) => s !== '');
    return v;
  }

  function parseFrontMatter(raw) {
    const m = String(raw).match(FM_RE);
    if (!m) return { data: {}, body: String(raw) };
    const data = {};
    const lines = m[1].split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const k = l.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
      if (!k) continue;
      let v = k[2];
      // bloco multilinha "|" ou ">"
      if (/^[|>]-?\s*$/.test(v)) {
        const buf = [];
        while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) { buf.push(lines[i + 1].replace(/^\s{2}/, '')); i++; }
        v = buf.join(v.startsWith('|') ? '\n' : ' ');
        data[k[1]] = v;
        continue;
      }
      // lista em linhas "- item"
      if (v === '' && i + 1 < lines.length && /^\s+-\s/.test(lines[i + 1])) {
        const arr = [];
        while (i + 1 < lines.length && /^\s+-\s/.test(lines[i + 1])) { arr.push(parseValue(lines[i + 1].replace(/^\s+-\s/, ''))); i++; }
        data[k[1]] = arr;
        continue;
      }
      data[k[1]] = parseValue(v);
    }
    return { data, body: m[2] };
  }

  function yamlScalar(v) {
    if (typeof v === 'boolean') return String(v);
    const s = String(v);
    if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/.test(s)) return s;            // datas ISO ficam sem aspas
    if (/^[A-Za-z][A-Za-z0-9 .,!?()\/&-]*$/.test(s) && !/^(true|false|null|yes|no|on|off)$/i.test(s) && !/\s$/.test(s) && !/:\s/.test(s) && !/\s#/.test(s)) return s;
    return JSON.stringify(s);
  }

  function stringifyFrontMatter(data, body) {
    const lines = ['---'];
    for (const [k, v] of Object.entries(data)) {
      if (v === undefined || v === null || v === '' || v === false) continue;
      if (Array.isArray(v)) {
        if (!v.length) continue;
        lines.push(`${k}:`);
        v.forEach((item) => lines.push(`  - ${yamlScalar(item)}`));
        continue;
      }
      lines.push(`${k}: ${yamlScalar(v)}`);
    }
    lines.push('---', '');
    return lines.join('\n') + hardBreaks(String(body || '').trim()) + '\n';
  }

  window.MD = { render, inline, plain, esc, parseFrontMatter, stringifyFrontMatter, extractRefs };
})();
