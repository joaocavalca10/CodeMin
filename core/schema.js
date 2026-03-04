// core/schema.js
// Exporta helpers e o shape esperado (informativo)

module.exports = {
  // nodes: array of { id, label, type, path, size?, mtime?, meta? }
  // edges: array of { source, target, relation }
  // allowed types: folder, txt, pdf, docx, xlsx, pptx, html, css, js, external, other

  normalizeNode(node) {
    return {
      id: String(node.id),
      label: node.label || String(node.id),
      type: node.type || 'other',
      path: node.path || node.id,
      size: node.size || 0,
      mtime: node.mtime || null,
      meta: node.meta || {}
    };
  },

  makeEdge(source, target, relation = 'link') {
    return { source: String(source), target: String(target), relation };
  }
};