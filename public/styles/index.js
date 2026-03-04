// ============================================
// PONTO DE ENTRADA DOS ESTILOS
// ============================================
// Este arquivo simplesmente importa os estilos base e os específicos
// e os combina em um único array para ser usado no Cytoscape.

import { baseStyles } from './base.js';
import { fileTypeStyles } from './fileTypes.js';

// A ordem dos estilos importa: estilos mais específicos devem vir depois dos gerais.
// Como os seletores de tipo (node[type="..."]) são mais específicos que apenas 'node',
// eles sobrescreverão as propriedades definidas no estilo base.
export const cytoscapeStyles = [...baseStyles, ...fileTypeStyles];