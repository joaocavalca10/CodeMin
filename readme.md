# Graph Render Engine (demo)

## Visão geral
Projeto demo para analisar uma pasta de código, extrair relações entre arquivos e renderizar um grafo interativo usando Cytoscape. Ideal para explorar dependências e estrutura de projetos front-end simples.

## Principais características
- Varredura recursiva de diretórios e identificação de tipos de arquivos
- Extração de nós e arestas (ex.: `folder`, `html`, `css`, `js`, `pdf`, `docx`, `xlsx`, `pptx`, `txt`, `external`, `other`)
- Detecção automática de dependências em HTML (`<script src>`, `<link rel="stylesheet">`) e links externos (`a[href]`)
- Visualização com Cytoscape (estilo inspirado no Obsidian)
- Exibição do JSON gerado no canto superior direito
- Persistência das posições dos nós no `localStorage`

## Rápido (Quick Start)
Instale dependências e rode o servidor:

```bash
npm install
npm start
```

Abra `http://localhost:3000` no navegador e informe o caminho da pasta que deseja analisar (ex.: `./meuProjeto`).

## Uso
- Na interface, informe o caminho da pasta a ser analisada.
- O renderer consumirá o adapter disponível (por padrão `adapters/fileSystemAdapter.js`) que deve retornar um objeto com `{ nodes, edges }`.
- Interaja com o grafo; as posições são salvas automaticamente no `localStorage`.

## Adapters
O projeto usa adapters para fornecer os dados ao renderizador. Um adapter deve expor uma função que retorne o objeto padrão:

```js
{
	nodes: [ /* { id, label, type, ... } */ ],
	edges: [ /* { source, target, label?, ... } */ ]
}
```

- `adapters/fileSystemAdapter.js`: adapter padrão que varre o sistema de arquivos.
- É simples adicionar novos adapters (por exemplo: `githubAdapter.js`, `MySqlAdapter.js`) desde que retornem o mesmo formato.

> Existe um arquivo com instruções detalhadas sobre como criar novos adapters: [adapters.md](adapters.md).

Ao criar um adapter, basta seguir o contrato do retorno `{ nodes, edges }` e adaptar a fonte (filesystem, API, export do Notion, etc.). Consulte [adapters.md](adapters.md) para exemplos e padrões recomendados.

## Estrutura do projeto
- `server.js` — servidor express estático / ponto de entrada
- `public/` — cliente (renderer, HTML e estilos)
- `adapters/` — adapters que convertem fontes em `{ nodes, edges }`
- `core/schema.js` — definicoes/transformacoes centrais

## Contribuindo
- Abra uma issue descrevendo a sugestão ou bug.
- Para alterações: faça um fork, crie uma branch com mudanças e abra um pull request.

## Como usar (detalhado)

- Preparação: instale dependências e inicie o servidor:

```bash
npm install
npm start
```

- Acesse `http://localhost:3000` no navegador.
- No campo de entrada informe o caminho da pasta a ser analisada (ex.: `./meuProjeto`) e confirme.
- O frontend solicita os dados ao adapter configurado; quando receber `{ nodes, edges }`, o grafo é renderizado automaticamente.
- Use o painel do grafo para selecionar nós, arrastar, e inspeccionar metadados. O JSON atual está visível no canto superior direito.
- As posições dos nós são salvas no `localStorage` do navegador — para resetar, limpe o armazenamento do site.

## Como funciona (breve)

- Pipeline geral:
	- Adapter: converte a fonte (filesystem, API, export) em um grafo bruto `{ nodes, edges }`.
	- Core/schema: normaliza e enriquece os nós/arestas (tipos, labels, metadados) e aplica regras de filtragem/transforms.
	- Renderer (`public/renderer.js`): consome o grafo normalizado e o exibe com Cytoscape, adicionando estilos, layouts e handlers de interação.

- Detecção de relações:
	- HTML: o adapter/parse detecta `<script src>` e `<link rel="stylesheet">` para criar arestas de dependência entre arquivos.
	- Links: `a[href]` que apontam para URLs externas geram nós do tipo `external`.

- Formato de dados:
	- `nodes`: cada nó deve ter ao menos `id` e `label`. Campos adicionais úteis: `type`, `path`, `size`, `meta`.
	- `edges`: cada aresta deve ter `source` e `target`. Campos opcionais: `label`, `type`.

Se quiser, posso:
- adicionar um exemplo JSON gerado pelo `fileSystemAdapter`;
- incluir um pequeno diagrama mostrando o fluxo adapter → core → renderer;
- adicionar instruções para resetar o `localStorage` via interface.

## Executando localmente (exemplo)
```bash
# instalar
npm install

# rodar servidor
npm start

# testar navegando para
http://localhost:3000
```

## Licença
Consulte o arquivo `LICENSE` deste repositório.
