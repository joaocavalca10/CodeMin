# Graph Render Engine (demo)

## Instalação
1. `npm install`
2. `npm start`
3. Abrir `http://localhost:3000` e informar caminho da pasta a ser analisada (ex: `./meuProjeto`)

## O que faz
- Lê diretório recursivamente
- Cria nodes (folder, html, css, js, pdf, docx, xlsx, pptx, txt, external, other)
- Detecta `<script src>` e `<link rel="stylesheet">` em HTML e liga nodes
- Detecta `a[href]` (cria nó external quando for URL externa)
- Renderiza com Cytoscape com estilo tipo Obsidian
- Exibe JSON no canto superior direito
- Salva posições dos nós (localStorage)

## Extensibilidade
- `adapters/fileSystemAdapter.js` retorna o objeto padrão `{ nodes, edges }`.
- Crie outros adapters (p.ex. fromDatabase, fromNotionExport) que retornem o mesmo formato e use o mesmo renderizador.