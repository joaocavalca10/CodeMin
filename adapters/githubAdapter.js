// adapters/githubAdapter.js
const cheerio = require('cheerio');
const mime = require('mime-types');
const path = require('path');
const { normalizeNode, makeEdge } = require('../core/schema');

/**
 * Extrai owner, repo, branch e caminho de uma URL do GitHub.
 * Suporta formatos:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo/tree/branch
 * - https://github.com/owner/repo/tree/branch/path/to/folder
 */
function parseGitHubUrl(url) {
  const regex = /github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/([^\/]+)(?:\/(.*))?)?/;
  const match = url.match(regex);
  if (!match) throw new Error('URL do GitHub inválida');
  const [, owner, repo, branch = 'HEAD', path = ''] = match;
  return { owner, repo, branch, path };
}

/**
 * Obtém o branch padrão do repositório.
 */
async function getDefaultBranch(owner, repo, token) {
  const headers = token ? { Authorization: `token ${token}` } : {};
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  if (!res.ok) throw new Error(`Falha ao buscar info do repo: ${res.statusText}`);
  const data = await res.json();
  return data.default_branch;
}

/**
 * Obtém a árvore recursiva do repositório (inclui todos os arquivos e pastas).
 */
async function getRecursiveTree(owner, repo, branch, token) {
  const headers = token ? { Authorization: `token ${token}` } : {};
  const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Falha ao buscar árvore: ${res.statusText}`);
  const data = await res.json();
  return data.tree; // array de { path, type, sha, size, url, ... }
}

/**
 * Busca o conteúdo bruto de um arquivo via raw.githubusercontent.com.
 */
async function fetchFileContent(owner, repo, branch, filePath, token) {
  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
  const headers = token ? { Authorization: `token ${token}` } : {};
  const res = await fetch(rawUrl, { headers });
  if (!res.ok) return null;
  return res.text();
}

/**
 * Determina o tipo do nó baseado na extensão do arquivo.
 */
function extToType(filename) {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.html':
    case '.htm':
      return 'html';
    case '.js':
      return 'js';
    case '.css':
      return 'css';
    case '.json':
      return 'json';
    case '.png':
    case '.jpg':
    case '.jpeg':
    case '.gif':
    case '.svg':
      return 'image';
    case '.pptx':
      return 'pptx';
    case '.blend':
      return 'blend';
    default:
      const m = mime.lookup(ext);
      if (m && m.startsWith('text')) return 'txt';
      return 'other';
  }
}

/**
 * Resolve um caminho de recurso (src/href) encontrado em um HTML.
 * Retorna { external: url } para recursos externos, ou { repoPath: path } para internos.
 */
function resolveResource(basePath, resourcePath) {
  if (!resourcePath) return null;

  // Recursos externos (http, https, //)
  if (/^(https?:)?\/\//i.test(resourcePath)) {
    return { external: resourcePath };
  }

  // Caminho absoluto dentro do repositório (começa com /)
  if (resourcePath.startsWith('/')) {
    return { repoPath: resourcePath.slice(1) }; // remove a barra inicial
  }

  // Caminho relativo
  const baseDir = path.posix.dirname(basePath);
  const joined = path.posix.join(baseDir, resourcePath);
  const normalized = path.posix.normalize(joined);
  return { repoPath: normalized };
}

/**
 * Adaptador principal: percorre um repositório GitHub e retorna nós e arestas.
 * @param {string|Object} params - URL do GitHub ou objeto com owner, repo, branch, path, token.
 */
async function fromGitHub(params) {
  let owner, repo, branch, pathPrefix = '', token;

  if (typeof params === 'string') {
    const parsed = parseGitHubUrl(params);
    owner = parsed.owner;
    repo = parsed.repo;
    branch = parsed.branch;
    pathPrefix = parsed.path;
  } else {
    owner = params.owner;
    repo = params.repo;
    branch = params.branch;
    pathPrefix = params.path || '';
    token = params.token;
  }

  if (!owner || !repo) throw new Error('Owner e repo são obrigatórios');

  // Se branch não for informado ou for 'HEAD', obtém o branch padrão
  if (!branch || branch === 'HEAD') {
    branch = await getDefaultBranch(owner, repo, token);
  }

  // Obtém a árvore recursiva do branch
  const tree = await getRecursiveTree(owner, repo, branch, token);

  // Filtra os itens pelo pathPrefix (se houver)
  let items = tree;
  if (pathPrefix) {
    const prefix = pathPrefix.endsWith('/') ? pathPrefix : pathPrefix + '/';
    items = tree.filter(item => item.path === pathPrefix || item.path.startsWith(prefix));
  }

  // Mapas para armazenar nós e arestas
  const nodesMap = new Map();
  const edges = [];

  // Utilitário para gerar o ID relativo ao diretório base (__root__)
  function toRel(fullPath) {
    const rel = path.posix.relative(pathPrefix || '', fullPath);
    if (rel === '' || rel === '.') return '__root__';
    return rel;
  }

  // Cria o nó raiz (__root__)
  const rootId = '__root__';
  nodesMap.set(rootId, normalizeNode({
    id: rootId,
    label: pathPrefix ? path.posix.basename(pathPrefix) : `${owner}/${repo}`,
    type: 'folder',
    path: rootId,
    size: 0,
    mtime: Date.now()
  }));

  // Separa diretórios e arquivos
  const dirPaths = new Set();
  const fileItems = [];
  for (const item of items) {
    if (item.type === 'tree') {
      dirPaths.add(item.path);
    } else if (item.type === 'blob') {
      fileItems.push(item);
    }
  }

  // Adiciona nós para todos os diretórios (exceto o raiz, já incluso)
  for (const dirPath of dirPaths) {
    const rel = toRel(dirPath);
    if (rel === '__root__') continue;
    if (!nodesMap.has(rel)) {
      nodesMap.set(rel, normalizeNode({
        id: rel,
        label: path.posix.basename(dirPath),
        type: 'folder',
        path: rel,
        size: 0,
        mtime: Date.now()
      }));
    }
  }

  // Adiciona nós para todos os arquivos
  for (const item of fileItems) {
    const rel = toRel(item.path);
    if (!nodesMap.has(rel)) {
      nodesMap.set(rel, normalizeNode({
        id: rel,
        label: path.posix.basename(item.path),
        type: extToType(item.path),
        path: rel,
        size: item.size || 0,
        mtime: Date.now()
      }));
    }
  }

  // Cria arestas de contém (pasta -> filho)
  function addContainsEdge(parentRel, childRel) {
    if (parentRel && childRel && nodesMap.has(parentRel) && nodesMap.has(childRel)) {
      edges.push(makeEdge(parentRel, childRel, 'contains'));
    }
  }

  for (const rel of nodesMap.keys()) {
    if (rel === '__root__') continue;
    const parentDir = path.posix.dirname(rel);
    const parentRel = parentDir === '.' ? '__root__' : parentDir;
    addContainsEdge(parentRel, rel);
  }

  // Processa arquivos HTML para extrair recursos (scripts, estilos, links)
  const htmlFiles = fileItems.filter(item => /\.(html?|htm)$/i.test(item.path));

  async function processHtmlFile(item) {
    const htmlRel = toRel(item.path);
    const content = await fetchFileContent(owner, repo, branch, item.path, token);
    if (!content) return;

    const $ = cheerio.load(content);
    const resources = [];

    $('script[src]').each((_, el) => {
      const src = $(el).attr('src');
      if (src) resources.push({ type: 'script', src });
    });
    $('link[rel="stylesheet"][href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) resources.push({ type: 'style', href });
    });
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) resources.push({ type: 'link', href });
    });

    for (const res of resources) {
      const srcOrHref = res.src || res.href;
      const resolved = resolveResource(item.path, srcOrHref);
      if (!resolved) continue;

      if (resolved.external) {
        // Recurso externo
        const extId = `external::${resolved.external}`;
        if (!nodesMap.has(extId)) {
          nodesMap.set(extId, normalizeNode({
            id: extId,
            label: resolved.external,
            type: 'external',
            path: resolved.external,
            size: 0,
            mtime: Date.now()
          }));
        }
        edges.push(makeEdge(htmlRel, extId, res.type));
      } else if (resolved.repoPath) {
        // Recurso interno
        const targetRel = toRel(resolved.repoPath);
        if (nodesMap.has(targetRel)) {
          edges.push(makeEdge(htmlRel, targetRel, res.type));
        }
        // Se o recurso não existir na árvore (fora do escopo), ignora
      }
    }
  }

  // Processa HTMLs com limite de concorrência
  const concurrency = 5;
  for (let i = 0; i < htmlFiles.length; i += concurrency) {
    const batch = htmlFiles.slice(i, i + concurrency);
    await Promise.all(batch.map(item => processHtmlFile(item)));
  }

  // Filtra arestas inválidas (por segurança)
  const validEdges = edges.filter(e =>
    e.source && e.target && nodesMap.has(e.source) && nodesMap.has(e.target)
  );

  return {
    nodes: Array.from(nodesMap.values()),
    edges: validEdges
  };
}

module.exports = { fromGitHub };