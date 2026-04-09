// adapters/fileSystemAdapter.js

const fs = require('fs').promises;
const path = require('path');
const cheerio = require('cheerio');
const mime = require('mime-types');
const { normalizeNode, makeEdge } = require('../core/schema');

// util: normalize rel path with forward slash
function toRel(base, full) {
  return path.relative(base, full).split(path.sep).join('/');
}

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
      return 'image';
    case '.pptx':
      return 'pptx';
    case '.blend':
      return "blend";
    default:
      const m = mime.lookup(ext);
      if (m && m.startsWith('text')) return 'txt';
      return 'other';
  }
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function readHtmlResources(fullPath) {
  try {
    const raw = await fs.readFile(fullPath, 'utf8');
    const $ = cheerio.load(raw);

    const results = { scripts: [], styles: [], links: [] };

    $('script[src]').each((_, el) => {
      const src = $(el).attr('src');
      if (src) results.scripts.push(src);
    });

    $('link[rel="stylesheet"][href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) results.styles.push(href);
    });

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) results.links.push(href);
    });

    return results;
  } catch {
    return { scripts: [], styles: [], links: [] };
  }
}

async function fromFileSystem(baseDir) {
  const nodesMap = new Map();
  const edges = [];
  const q = [baseDir];
  const baseAbs = path.resolve(baseDir);
  // load .gitignore patterns (simple matching)
  let gitignorePatterns = [];
  try {
    const gitignorePath = path.join(baseAbs, '.gitignore');
    const raw = await fs.readFile(gitignorePath, 'utf8');
    gitignorePatterns = raw
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'))
      .map(p => {
        if (p.endsWith('/')) p = p.slice(0, -1);
        if (p.startsWith('/')) p = p.slice(1);
        return p;
      });
  } catch {
    gitignorePatterns = [];
  }

  function matchesGitignore(rel) {
    if (!rel || rel === '__root__') return false;
    for (const p of gitignorePatterns) {
      if (!p) continue;
      if (rel === p) return true;
      if (rel.startsWith(p + '/')) return true;
      if (rel.split('/').includes(p)) return true;
    }
    return false;
  }

  async function addFileNode(full) {
    const stat = await fs.stat(full);

    let rel = toRel(baseAbs, full);
    if (!rel || rel.trim() === '') {
      rel = '__root__';
    }

    // ignora node_modules, .git e arquivos/pastas do .gitignore, mas só para subníveis (não ignora a raiz mesmo se tiver node_modules ou .git)
    if (rel !== '__root__' && (rel.split('/').includes('node_modules') || rel.split('/').includes('.git') || matchesGitignore(rel))) {
      return null;
    }

    if (!nodesMap.has(rel)) {
      nodesMap.set(rel, normalizeNode({
        id: rel,
        label: rel === '__root__'
          ? path.basename(baseAbs)
          : path.basename(full),
        type: stat.isDirectory()
          ? 'folder'
          : extToType(full),
        path: rel,
        size: stat.isFile() ? stat.size : 0,
        mtime: stat.mtimeMs
      }));
    }

    return rel;
  }

  function resolveResource(htmlFull, resourcePath) {
    if (!resourcePath) return null;

    if (/^(?:https?:)?\/\//i.test(resourcePath)) {
      return { external: resourcePath };
    }

    let candidate;
    if (resourcePath.startsWith('/')) {
      candidate = path.join(baseAbs, resourcePath);
    } else {
      candidate = path.resolve(path.dirname(htmlFull), resourcePath);
    }

    return { candidate };
  }

  while (q.length) {
    const current = q.shift();
    const stat = await fs.stat(current);

    if (!stat.isDirectory()) continue;

    const relDir = await addFileNode(current);
    const dir = await fs.opendir(current);

    for await (const dirent of dir) {
      const full = path.join(current, dirent.name);

      if (dirent.isDirectory()) {
        // não entra em node_modules ou .git, mas adiciona o node e a aresta
        if (dirent.name === 'node_modules' || dirent.name === '.git') continue;
          q.push(full);
          const childRel = await addFileNode(full);
          if (childRel) edges.push(makeEdge(relDir, childRel, 'contains'));
        } else {
          const childRel = await addFileNode(full);
          if (childRel) edges.push(makeEdge(relDir, childRel, 'contains'));

        if (/\.(html?|htm)$/i.test(dirent.name)) {
          const resources = await readHtmlResources(full);

          for (const src of resources.scripts) {
            await handleResource(full, src, 'script');
          }

          for (const href of resources.styles) {
            await handleResource(full, href, 'style');
          }

          for (const href of resources.links) {
            await handleResource(full, href, 'link');
          }
        }
      }
    }
  }

  async function handleResource(htmlFull, resourcePath, relation) {
    const r = resolveResource(htmlFull, resourcePath);
    const sourceRel = toRel(baseAbs, htmlFull) || '__root__';

    if (r?.external) {
      const extId = `external::${r.external}`;

      if (!nodesMap.has(extId)) {
        nodesMap.set(extId, normalizeNode({
          id: extId,
          label: r.external,
          type: 'external',
          path: r.external
        }));
      }

      edges.push(makeEdge(sourceRel, extId, relation));
    }

    else if (r?.candidate && await fileExists(r.candidate)) {
      const targetRel = await addFileNode(r.candidate);
      if (targetRel) edges.push(makeEdge(sourceRel, targetRel, relation));
    }
  }

  const validEdges = edges.filter(e =>
    e.source &&
    e.target &&
    nodesMap.has(e.source) &&
    nodesMap.has(e.target)
  );

  return {
    nodes: Array.from(nodesMap.values()),
    edges: validEdges
  };
}

module.exports = { fromFileSystem };