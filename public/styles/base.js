// ============================================
// ESTILOS BASE DO GRAFO
// ============================================
// Este arquivo contém os estilos gerais que se aplicam a todos os nós e arestas,
// independentemente do tipo de arquivo. Aqui você pode definir a aparência padrão,
// efeitos de hover, seleção e classes utilitárias (como .hidden).

export const baseStyles = [
  // ------------------------------------------------------------
  // ESTILO PADRÃO DOS NÓS
  // ------------------------------------------------------------
  {
    selector: 'node',
    style: {
      shape: 'rectangle',          // Forma do nó (pode ser 'ellipse', 'rectangle', etc.)
      width: 'label',                     // Largura automática baseada no texto
      height: 'label',                    // Altura automática baseada no texto
      padding: '10px',                     // Espaço interno entre texto e borda
      label: 'data(label)',                // O texto do nó vem do campo 'label' nos dados
      'text-valign': 'center',              // Alinhamento vertical do texto
      'text-halign': 'center',              // Alinhamento horizontal do texto
      'font-size': 13,                      // Tamanho da fonte
      'text-wrap': 'wrap',                  // Permite quebra de linha
      'text-max-width': 150,                 // Largura máxima do texto antes de quebrar
      color: '#1e293b',                      // Cor do texto
      'background-color': '#ffffff',         // Cor de fundo
      'border-width': 1,                     // Espessura da borda
      'border-color': '#cbd5e1',              // Cor da borda
      'border-opacity': 0.8,                  // Opacidade da borda
      'box-shadow': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      'font-family': 'Inter, system-ui, sans-serif',
      'font-weight': 500,
      'min-zoomed-font-size': 8,              // Tamanho mínimo da fonte quando afastado
      'text-background-opacity': 0,
      'background-opacity': 0.9,
      // Transições suaves para interações
      'transition-property': 'background-color, border-color, shadow-blur, border-width',
      'transition-duration': '0.2s'
    }
  },

  // ------------------------------------------------------------
  // EFEITO HOVER (QUANDO O MOUSE PASSA SOBRE O NÓ)
  // ------------------------------------------------------------
  {
    selector: 'node:hover',
    style: {
      'border-width': 2,
      'border-color': '#f97316',            // Laranja
      'shadow-blur': 10,
      'shadow-color': '#f97316',
      'shadow-opacity': 0.3,
      'overlay-opacity': 0.1
    }
  },

  // ------------------------------------------------------------
  // NÓ SELECIONADO (CLIQUE)
  // ------------------------------------------------------------
  {
    selector: 'node:selected',
    style: {
      'border-width': 3,
      'border-color': '#f97316',
      'overlay-color': '#f97316',
      'overlay-opacity': 0.2,
      'underlay-color': '#f97316',
      'underlay-opacity': 0.1
    }
  },

  // ------------------------------------------------------------
  // CLASSE PARA ESCONDER NÓS (USADA NA BUSCA)
  // ------------------------------------------------------------
    {
      selector: '.hidden',
      style: {
        display: 'none'
      }
    },

    // ------------------------------------------------------------
    // MODO COMPACTO - reduz tamanho e espaçamento dos nós
    // ------------------------------------------------------------
    {
      selector: 'node.compact',
      style: {
        'font-size': 10,
        padding: '4px',
        'text-max-width': 90,
        'background-opacity': 0.95
      }
    },

  // ------------------------------------------------------------
  // ESTILO PADRÃO DAS ARESTAS
  // ------------------------------------------------------------
  {
    selector: 'edge',
    style: {
      width: 2.2,
      'line-color': '#94a3b8',
      'target-arrow-shape': 'triangle',       // Forma da seta na ponta
      'target-arrow-color': '#475569',
      'curve-style': 'bezier',                 // Estilo da curva
      opacity: 0.7,
      'arrow-scale': 1.1
    }
  },

  // ------------------------------------------------------------
  // ARESTAS COM RELAÇÃO ESPECÍFICA (OPCIONAL)
  // ------------------------------------------------------------
  {
    selector: 'edge[relation = "style"]',      // Exemplo: relação de CSS
    style: {
      'line-style': 'dashed',
      'line-color': '#4ade80',
      'target-arrow-color': '#22c55e',
      'line-dash-pattern': [6, 3]
    }
  },
  {
    selector: 'edge[relation = "script"]',     // Exemplo: relação de JavaScript
    style: {
      'line-color': '#60a5fa',
      'target-arrow-color': '#2563eb'
    }
  }
  // Você pode adicionar mais seletores de aresta aqui, por exemplo:
  // { selector: 'edge[relation = "import"]', style: { ... } }



];