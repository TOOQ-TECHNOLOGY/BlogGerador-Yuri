# Tooq · Gerador de conteúdo do blog

Editor local (HTML, CSS e JavaScript puros) para escrever os artigos do blog
da Tooq. Cada artigo vira uma pasta dentro de `content-blog/` com um único
arquivo `.md` (front matter + Markdown). As imagens ficam embutidas no próprio
`.md`, em base64, então nada mais precisa ser copiado junto:

```
content-blog/
  lorem-ipsum-3/
    lorem-ipsum-3.md
```

O app também mostra os artigos como eles aparecem em tooqtechnology.com/blog,
para conferir antes de publicar.

## Como abrir

Escolha uma das três formas:

| Forma | Navegadores | Gerar arquivo |
| --- | --- | --- |
| `node server.js` e abrir http://localhost:3000 | Todos | Cria a pasta do artigo em `content-blog/` |
| Abrir `index.html` e clicar em **Conectar pasta content-blog** | Chrome, Edge, Opera | Cria a pasta do artigo em `content-blog/` |
| Abrir `index.html` e clicar em **Carregar pasta** | Todos (Firefox, Safari) | Baixa o `.md`; crie a pasta e mova o arquivo |

O servidor não tem dependências: só precisa do Node instalado.

## Telas

- **Conteúdos** (`#/`): lista os `.md` da pasta, com busca, ordenação, filtro por produto e visual em lista ou grade. Clique numa linha para editar.
- **Blog** (`#/blog`): prévia do blog do site, com busca, ordenação, filtro por produto, artigo em destaque e tema claro/escuro. Clique num cartão para ler o artigo.
- **Editor** (`#/novo` ou `#/editar/<slug>`): formulário à esquerda e prévia ao vivo à direita. O botão **Gerar arquivo** (ou `Ctrl+S`) cria a pasta do artigo e grava o `.md` (com as imagens já embutidas). No menu ao lado: baixar `.md`, copiar Markdown, ver no blog, excluir (apaga a pasta inteira).

## Formato do arquivo

```markdown
---
title: Lorem Ipsum
slug: lorem-ipsum
summary: Uma ou duas frases que aparecem nos cartões.
date: 2026-10-06T09:00
author: Patrick Jane
product: connectivity
cover: "data:image/webp;base64,UklGRi…"   # capa embutida
coverAlt: Descrição da imagem para leitores de tela
seoTitle: Título alternativo para o Google
seoDescription: Descrição alternativa para o Google
---
Texto do artigo em Markdown, com imagens por referência:

![Diagrama][imagem-1]

[imagem-1]: data:image/webp;base64,UklGRi…
```

- A pasta e o arquivo usam o slug do título (`artigo-com-capa/artigo-com-capa.md`); o slug não muda depois de gerado.
- Um `.md` por pasta. Arquivos `.md` soltos na raiz de `content-blog/` ainda são lidos e migram para uma pasta na próxima vez que forem salvos.
- Campos vazios não são gravados.
- O último artigo (etiqueta "Latest post" e destaque no topo do blog) é sempre o de `date` mais recente: não há campo para marcar.
- Produtos válidos (`product`): `compute-storage`, `container-as-a-service`, `connectivity`,
  `algorithmic-execution`, `fixed-income-platform`, `order-routing`, `live-market-data`,
  `historical-market-data`, `trading-platform`, `hosting-hardware`, `clock-sync`.
  A lista fica em `js/app.js` (`PRODUCTS`).

## Imagens

As imagens são embutidas no `.md` como data URI (base64), então o artigo é um
arquivo só. Antes de embutir, o app redimensiona para até 1600 px de largura e
converte para WebP com qualidade 0,85 (SVG e GIF vão como estão). O tamanho
resultante aparece ao lado da capa e na linha abaixo do título (tamanho do `.md`).

- **Capa**: vai no campo `cover:` do front matter.
- **Imagens do texto** (menu "+" → Imagem): entram como `![alt][imagem-N]` no ponto
  do cursor, e a definição `[imagem-N]: data:…` fica no fim do arquivo, para o texto
  continuar legível.
- Caminhos relativos (`cover: capa.jpg`) e URLs absolutas continuam funcionando
  para arquivos antigos.
- Base64 aumenta o tamanho em cerca de 33 %. Para a prévia do LinkedIn e do Google
  (`og:image`) o site vai precisar extrair a capa para uma URL pública na hora de publicar.
- Se a capa não for encontrada, o blog mostra a capa padrão com o símbolo da Tooq.

## Estrutura

```
index.html        app
css/style.css     identidade visual (tokens em :root)
js/markdown.js    parser de Markdown e front matter
js/store.js       leitura/gravação da pasta (servidor, File System Access, download)
js/app.js         rotas, telas e editor
server.js         servidor local opcional
content-blog/     uma pasta por artigo: <slug>/<slug>.md (imagens embutidas)
```
