// ============================================
// ESTILOS POR TIPO DE ARQUIVO
// ============================================
// Este arquivo define estilos que se aplicam apenas a nós com um determinado
// valor no campo 'type'. Adicione ou remova objetos conforme necessário.
//
// Formato:
// { selector: 'node[type = "nome-do-tipo"]', style: { propriedade: valor, ... } }
//
// As propriedades de estilo são as mesmas suportadas pelo Cytoscape.js.
// Consulte a documentação: https://js.cytoscape.org/#style
//
// DICA: Você pode usar qualquer campo de dados do nó no seletor, por exemplo:
//   node[extensao = "pdf"]   (se o nó tiver um campo 'extensao')
//   node[tamanho > 1000]     (para nós com campo numérico 'tamanho')
//   node[importante = "true"] (para nós com campo booleano)

export const fileTypeStyles = [
  // ------------------------------------------------------------
  // PASTA
  // ------------------------------------------------------------
  {
    selector: 'node[type = "folder"]',
    style: {
      'background-color': '#334155',        // Cinza escuro
      'color': '#f1f5f9',                    // Texto claro
      'border-color': '#1e293b',
      // Exemplo de ícone (opcional – descomente se quiser usar)
      // 'background-image': 'https://img.icons8.com/ios-filled/24/ffffff/folder-invoices.png',
      // 'background-fit': 'contain',
      // 'background-width': '20px',
      // 'background-height': '20px',
      // 'background-position-x': '10%',
      // 'background-position-y': '50%',
      // 'text-halign': 'left',
      // 'text-margin-x': '30px'
    }
  },

  // ------------------------------------------------------------
  // ARQUIVO HTML
  // ------------------------------------------------------------
  {
    selector: 'node[type = "html"]',
    style: {
      'background-color': '#fff3cd',        // Amarelo claro
      'border-color': '#ffb347',
      'color': '#856404'
    }
  },

  // ------------------------------------------------------------
  // ARQUIVO CSS
  // ------------------------------------------------------------
  {
    selector: 'node[type = "css"]',
    style: {
      'background-color': '#d1e7dd',        // Verde claro
      'border-color': '#0f5132',
      'color': '#0f5132'
    }
  },

  // ------------------------------------------------------------
  // ARQUIVO JAVASCRIPT
  // ------------------------------------------------------------
  {
    selector: 'node[type = "js"]',
    style: {
      'background-color': '#cfe2ff',        // Azul claro
      'border-color': '#084298',
      'color': '#084298'
    }
  },

  // ------------------------------------------------------------
  // ARQUIVO PDF
  // ------------------------------------------------------------
  {
    selector: 'node[type = "pdf"]',
    style: {
      'background-color': '#f8d7da',        // Vermelho claro
      'border-color': '#842029',
      'color': '#842029'
    }
  }

  // ============================================================
  // COMO ADICIONAR NOVOS TIPOS:
  // ============================================================
  // Basta copiar um dos blocos acima, colar abaixo e alterar:
  //   - o valor de 'type' (ex: "docx", "xlsx", "pptx", "external")
  //   - as cores e outras propriedades de estilo.
  //
  // Exemplo para arquivo DOCX:
  // {
  //   selector: 'node[type = "docx"]',
  //   style: {
  //     'background-color': '#d1e7dd',
  //     'border-color': '#0f5132',
  //     'color': '#0f5132'
  //   }
  // },
  //
  // Você também pode usar seletores mais complexos, como:
  //   selector: 'node[type = "folder"][profundidade = 1]'  (pastas de primeiro nível)
  //   selector: 'node[extensao = "json"]'                  (se o adapter fornecer campo 'extensao')
  //
  // Divirta-se!
];