// server.js
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { fromFileSystem } = require('./adapters/fileSystemAdapter');
const { fromGitHub } = require('./adapters/githubAdapter'); // <-- importe o adaptador GitHub
const { fromMySql } = require('./adapters/MySqlAdapter');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// Rota única /api/graph
app.get('/api/graph', async (req, res) => {
  const inputPath = String(req.query.path || '').trim();
  if (!inputPath) {
    return res.status(400).json({ error: 'Parâmetro "path" é obrigatório' });
  }

  try {
    let graphData;

    // 1. Verifica se é uma URL do GitHub
    if (inputPath.includes('github.com')) {
      console.log('[api/graph] GitHub URL detectada:', inputPath);
      graphData = await fromGitHub(inputPath);
    } else {
      // 2. Caso contrário, trata como caminho local
      console.log('[api/graph] Caminho local:', inputPath);

      // Resolve o caminho absoluto
      const base = path.isAbsolute(inputPath)
        ? path.resolve(inputPath)
        : path.resolve(process.cwd(), inputPath);

      // Verifica se existe e é diretório
      try {
        const stat = await fs.stat(base);
        if (!stat.isDirectory()) {
          return res.status(400).json({ error: 'O caminho informado não é uma pasta.' });
        }
      } catch (err) {
        return res.status(400).json({ error: 'Pasta não encontrada: ' + base });
      }

      graphData = await fromFileSystem(base);
    }

    res.json(graphData);
  } catch (err) {
    console.error('[api/graph] Erro:', err);
    res.status(500).json({ error: err.message });
  }
});

// Exemplo: obter dados de uma tabela MySQL ou executar uma query
// GET /api/mysql?database=mydb&table=users&limit=100
app.get('/api/mysql', async (req, res) => {
  try {
    const params = {
      host: req.query.host,
      user: req.query.user,
      password: req.query.password,
      database: req.query.database,
      port: req.query.port ? Number(req.query.port) : undefined,
      query: req.query.query,
      table: req.query.table,
      idField: req.query.idField,
      limit: req.query.limit ? Number(req.query.limit) : undefined
    };

    if (!params.database) return res.status(400).json({ error: '`database` is required' });

    const graphData = await fromMySql(params);
    res.json(graphData);
  } catch (err) {
    console.error('[api/mysql] Erro:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running: http://localhost:${PORT}`));