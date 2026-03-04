// server.js (versão reforçada)
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { fromFileSystem } = require('./adapters/fileSystemAdapter');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/graph', async (req, res) => {
  try {
    const folder = String(req.query.path || '').trim();
    if (!folder) return res.status(400).json({ error: 'path query required' });

    // normalize: se já for absoluto, resolve; se relativo, resolve a partir do cwd
    const base = path.isAbsolute(folder) ? path.resolve(folder) : path.resolve(process.cwd(), folder);

    console.log('[api/graph] requested path (raw):', req.query.path);
    console.log('[api/graph] resolved base:', base);

    // checar existência e se é diretório
    try {
      const stat = await fs.stat(base);
      if (!stat.isDirectory()) {
        return res.status(400).json({ error: 'O caminho informado não é uma pasta.' });
      }
    } catch (err) {
      return res.status(400).json({ error: 'Pasta não encontrada: ' + base });
    }

    // chama o adapter (assume que adapter espera base absoluto)
    const graph = await fromFileSystem(base);
    return res.json(graph);

  } catch (err) {
    console.error('[api/graph] analyze error', err);
    return res.status(500).json({ error: String(err.message || err) });
  }
});

app.listen(PORT, () => console.log(`Server running: http://localhost:${PORT}`));