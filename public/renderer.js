import { cytoscapeStyles } from './styles/index.js';
cytoscape.use(cytoscapeDagre);

// public/renderer.js
(async function () {
  // === Referências DOM ===
  const cyContainer = document.getElementById('cy');
  const jsonView = document.getElementById('jsonView');
  const pathInput = document.getElementById('pathInput');
  const btnLoad = document.getElementById('btnLoad');
  const btnExport = document.getElementById('btnExport');
  const infoPanel = document.getElementById('infoPanel') || criarPainelInfo();
  const searchInput = document.getElementById('searchInput') || criarBarraBusca();
  const loadingSpinner = document.getElementById('loadingSpinner') || criarSpinner();

  // === Aplica um fundo gradiente suave ao container (opcional) ===
  cyContainer.style.background = 'linear-gradient(145deg, #0000 0%, #0000 100%)';
  cyContainer.style.borderRadius = '12px';
  cyContainer.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.02)';

  // === Inicializa o Cytoscape com estilo aprimorado ===
  const cy = cytoscape({
    container: cyContainer,
    elements: [],
    style: cytoscapeStyles,  // <-- USANDO OS ESTILOS IMPORTADOS
    layout: { name: 'preset' }
  });
  function getChildren(node) {
  return node.outgoers('node');
}

function toggleCollapse(node) {
  const collapsed = node.data('collapsed');
  const children = getChildren(node);

  if (!children.length) return;

  cy.batch(() => {

    children.forEach(child => {

      if (collapsed) {
        child.removeClass('hidden');
        child.connectedEdges().removeClass('hidden');
      } else {
        child.addClass('hidden');
        child.connectedEdges().addClass('hidden');
      }

    });

    node.data('collapsed', !collapsed);

  });
}
  // === Zoom automático ao clicar em um nó ===
  cy.on('tap', 'node', function(evt) {
    const node = evt.target;

    cy.animate({
      center: { eles: node },
      zoom: 2
    }, {
      duration: 400
    });
  });

  cy.on('dbltap', 'node', function(evt) {
    const node = evt.target;
    toggleCollapse(node);
  });

  // === Tooltip customizado (caminho completo) ===
  cy.on('mouseover', 'node', function (evt) {
    const node = evt.target;
    const path = node.data('path') || node.data('label');
    cyContainer.setAttribute('title', path);
  });

  // === Painel de informações do nó selecionado ===
  cy.on('select', 'node', function (evt) {
    const node = evt.target;
    const data = node.data();
    infoPanel.innerHTML = `
      <strong>${data.label}</strong><br>
      Tipo: ${data.type || 'desconhecido'}<br>
      Caminho: ${data.path || data.label}<br>
      ID: ${data.id}
    `;
  });

  cy.on('unselect', 'node', function () {
    infoPanel.innerHTML = 'Selecione um nó para ver detalhes';
  });

  // === Busca em tempo real (filtra nós pelo nome) ===
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();

    cy.batch(() => {
      cy.nodes().forEach(node => {
        const label = node.data('label').toLowerCase();

        if (label.includes(query)) {
          node.removeClass('hidden');
        } else {
          node.addClass('hidden');
        }
      });
    });

    const results = cy.nodes().filter(node =>
      node.data('label').toLowerCase().includes(query)
    );

    if (results.length > 0) {
      cy.animate({
        fit: {
          eles: results,
          padding: 80
        }
      }, {
        duration: 500
      });
    }
  });

  // === Carregar grafo a partir da API ===
  async function loadGraph() {
    const folder = pathInput.value.trim();
    if (!folder) return alert('Informe o caminho da pasta');

    mostrarSpinner(true);
    jsonView.textContent = 'Carregando...';

    try {
      const res = await fetch('/api/graph?path=' + encodeURIComponent(folder));
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || res.statusText);
      }

      const data = await res.json();

      // Limpar grafo
      cy.elements().remove();

      // Validar IDs
      data.nodes = data.nodes.filter(n => n.id && n.id.trim() !== '');

      // === ALTERAÇÃO AQUI ===
      // Não sobrescrever o campo 'path' original do nó.
      // Usar os dados exatamente como enviados pelo backend.
      cy.add(data.nodes.map(n => ({
        group: 'nodes',
        data: {
          ...n,
          collapsed: false
        }
      })));

      // Adicionar arestas válidas
      const nodeIds = new Set(data.nodes.map(n => n.id));
      cy.add(data.edges
        .filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
        .map(e => ({
          group: 'edges',
          data: { source: e.source, target: e.target, relation: e.relation }
        }))
      );

      // === LAYOUT FORCE-DIRECTED (COSE) ===
      const layout = cy.layout({
        name: "dagre",
        rankDir: "LR",
        nodeSep: 40,
        rankSep: 200,
        spacingFactor: 1.3,
        animate: false,
        fit: false,
        padding: 30
      });

      layout.run();
      cy.ready(() => {
      const root = cy.nodes()[0]; // ou use um filtro específico

      if (root) {
        cy.animate({
          center: { eles: root },
          zoom: 1.5
        }, {
          duration: 600
        });
      }
    });

      cy.fit(20);
      jsonView.textContent = JSON.stringify(data, null, 2);
    } catch (err) {
      console.error(err);
      alert('Erro ao carregar grafo: ' + err.message);
      jsonView.textContent = 'Erro: ' + err.message;
    } finally {
      mostrarSpinner(false);
    }
  }

  // === Exportar grafo como JSON ===
  btnExport.addEventListener('click', () => {
    const folder = pathInput.value.trim() || 'graph';
    const data = jsonView.textContent || '{}';
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = folder.replace(/[\\/:*?"<>| ]+/g, '_') + '.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  // === Eventos de UI ===
  btnLoad.addEventListener('click', loadGraph);
  pathInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loadGraph();
  });

  // === Funções auxiliares ===
  function criarPainelInfo() {
    const panel = document.createElement('div');
    panel.id = 'infoPanel';
    panel.style.position = 'absolute';
    panel.style.bottom = '10px';
    panel.style.left = '10px';
    panel.style.backgroundColor = 'rgba(255,255,255,0.9)';
    panel.style.padding = '8px 12px';
    panel.style.borderRadius = '8px';
    panel.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
    panel.style.fontSize = '12px';
    panel.style.zIndex = 1000;
    panel.style.backdropFilter = 'blur(4px)';
    panel.innerHTML = 'Selecione um nó para ver detalhes';
    cyContainer.parentNode.appendChild(panel);
    return panel;
  }

  function criarBarraBusca() {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '10px';
    container.style.right = '10px';
    container.style.zIndex = 1000;
    container.innerHTML = '<input type="text" id="searchInput" placeholder="🔍 Buscar nó..." style="padding: 8px 16px; border-radius: 30px; border: 1px solid #d1d5db; width: 220px; box-shadow: 0 2px 6px rgba(0,0,0,0.05); outline: none; font-size: 13px;">';
    cyContainer.parentNode.appendChild(container);
    return document.getElementById('searchInput');
  }

  function criarSpinner() {
    const spinner = document.createElement('div');
    spinner.id = 'loadingSpinner';
    spinner.style.position = 'absolute';
    spinner.style.top = '50%';
    spinner.style.left = '50%';
    spinner.style.transform = 'translate(-50%, -50%)';
    spinner.style.background = 'rgba(0,0,0,0.7)';
    spinner.style.color = 'white';
    spinner.style.padding = '10px 20px';
    spinner.style.borderRadius = '30px';
    spinner.style.zIndex = 2000;
    spinner.style.display = 'none';
    spinner.style.fontSize = '14px';
    spinner.style.backdropFilter = 'blur(4px)';
    spinner.innerHTML = '⏳ Carregando...';
    cyContainer.parentNode.appendChild(spinner);
    return spinner;
  }

  function mostrarSpinner(show) {
    loadingSpinner.style.display = show ? 'block' : 'none';
  }

  // === Botão para centralizar/reajustar ===
  const btnFit = document.createElement('button');
  btnFit.textContent = '⟲ Centralizar';
  btnFit.style.position = 'absolute';
  btnFit.style.bottom = '10px';
  btnFit.style.right = '10px';
  btnFit.style.zIndex = 1000;
  btnFit.style.padding = '8px 14px';
  btnFit.style.border = 'none';
  btnFit.style.borderRadius = '30px';
  btnFit.style.backgroundColor = '#ffffff';
  btnFit.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
  btnFit.style.cursor = 'pointer';
  btnFit.style.fontSize = '13px';
  btnFit.style.fontWeight = '500';
  btnFit.style.color = '#1e293b';
  btnFit.addEventListener('mouseenter', () => btnFit.style.backgroundColor = '#f1f5f9');
  btnFit.addEventListener('mouseleave', () => btnFit.style.backgroundColor = '#ffffff');
  btnFit.addEventListener('click', () => cy.fit(20));
  cyContainer.parentNode.appendChild(btnFit);

  // === Botão para esconder/mostrar o JSON ===
  const btnToggleJson = document.createElement('button');
  btnToggleJson.textContent = '📄 Ocultar JSON';
  btnToggleJson.style.position = 'absolute';
  btnToggleJson.style.top = '50px';
  btnToggleJson.style.left = '10px';
  btnToggleJson.style.zIndex = 1000;
  btnToggleJson.style.padding = '8px 14px';
  btnToggleJson.style.border = 'none';
  btnToggleJson.style.borderRadius = '30px';
  btnToggleJson.style.backgroundColor = '#ffffff';
  btnToggleJson.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
  btnToggleJson.style.cursor = 'pointer';
  btnToggleJson.style.fontSize = '13px';
  btnToggleJson.style.fontWeight = '500';
  btnToggleJson.style.color = '#1e293b';
  btnToggleJson.addEventListener('mouseenter', () => btnToggleJson.style.backgroundColor = '#f1f5f9');
  btnToggleJson.addEventListener('mouseleave', () => btnToggleJson.style.backgroundColor = '#ffffff');

  let jsonVisible = true; // começa visível
  btnToggleJson.addEventListener('click', () => {
    jsonVisible = !jsonVisible;
    jsonView.style.display = jsonVisible ? 'block' : 'none';
    btnToggleJson.textContent = jsonVisible ? '📄 Ocultar JSON' : '📄 Mostrar JSON';
  });

  cyContainer.parentNode.appendChild(btnToggleJson);
})();