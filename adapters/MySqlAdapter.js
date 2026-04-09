// adapters/MySqlAdapter.js
// Adapter simples para MySQL: conecta, executa uma query (ou SELECT na tabela) e retorna
// um objeto { nodes, edges } compatível com o resto da aplicação.

const mysql = require('mysql2/promise');
const { normalizeNode, makeEdge } = require('../core/schema');

/**
 * fromMySql(params)
 * params:
 * - host, user, password, database, port
 * - query: SQL a executar (opcional). Se informado, usa a query diretamente.
 * - table: nome da tabela (opcional). Se informado e query ausente, faz SELECT * FROM `table` LIMIT ?
 * - idField: campo a usar como id do nó (opcional)
 * - limit: limite de linhas ao usar `table` (default 200)
 *
 * Retorna: { nodes: [...], edges: [...] }
 */
async function fromMySql(params = {}) {
	const {
		host = 'localhost',
		user = 'root',
		password = '',
		database,
		port = 3306,
		query,
		table,
		idField,
		limit = 200
	} = params;

	if (!database) throw new Error('Parâmetro `database` é obrigatório');
    // Se query e table não forem informados, listamos as tabelas do database

	const conn = await mysql.createConnection({ host, user, password, database, port });
	try {
		let rows = [];

		if (query) {
			const [r] = await conn.execute(query);
			rows = r || [];
		} else if (table) {
			const q = `SELECT * FROM \`${table}\` LIMIT ?`;
			const [r] = await conn.execute(q, [limit]);
			rows = r || [];
		} else {
			// Se não informou query nem table, listar tabelas do database
			try {
				const [tbls] = await conn.execute('SHOW TABLES');
				// Cada linha tem a coluna 'Tables_in_<database>' ou similar
				const tables = tbls.map(r => Object.values(r)[0]);

				const nodes = [];
				const edges = [];

				for (const t of tables) {
					const tableId = `table:${t}`;
					nodes.push(normalizeNode({ id: tableId, label: t, type: 'folder', path: tableId, size: 0, mtime: Date.now() }));

					// tentamos obter colunas para cada tabela
					try {
						const [cols] = await conn.execute(`SHOW COLUMNS FROM \`${t}\``);
						for (const c of cols) {
							const colName = String(c.Field);
							const colId = `table:${t}:col:${colName}`;
							const isPk = String(c.Key || '').toUpperCase() === 'PRI';
							nodes.push(normalizeNode({ id: colId, label: colName, type: isPk ? 'txt' : 'txt', path: `${tableId}/${colName}`, mtime: Date.now(), meta: { columnType: c.Type, primary: isPk } }));
							edges.push(makeEdge(tableId, colId, 'contains'));
						}
					} catch (err) {
						// ignore columns errors for a table
					}
				}

				// agora tentamos obter chaves estrangeiras (FKs) em todo o schema
				try {
					const [fks] = await conn.execute(
						`SELECT TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
						 FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
						 WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
						[database]
					);

					for (const fk of fks) {
						const parentTable = String(fk.TABLE_NAME);
						const parentCol = String(fk.COLUMN_NAME);
						const refTable = String(fk.REFERENCED_TABLE_NAME);
						const refCol = String(fk.REFERENCED_COLUMN_NAME);

						const parentColId = `table:${parentTable}:col:${parentCol}`;
						const refColId = `table:${refTable}:col:${refCol}`;

						// se algum dos nós não existir, criamos um placeholder
						if (!nodes.find(n => String(n.id) === parentColId)) {
							nodes.push(normalizeNode({ id: parentColId, label: parentCol, type: 'txt', path: `table:${parentTable}/${parentCol}`, mtime: Date.now(), meta: {} }));
							edges.push(makeEdge(`table:${parentTable}`, parentColId, 'contains'));
						}
						if (!nodes.find(n => String(n.id) === refColId)) {
							nodes.push(normalizeNode({ id: refColId, label: refCol, type: 'txt', path: `table:${refTable}/${refCol}`, mtime: Date.now(), meta: {} }));
							edges.push(makeEdge(`table:${refTable}`, refColId, 'contains'));
						}

						edges.push(makeEdge(parentColId, refColId, 'fk'));

						// marcar meta fk no nó pai se possível
						const pn = nodes.find(n => String(n.id) === parentColId);
						if (pn) pn.meta = Object.assign({}, pn.meta, { fk: { referenced_table: refTable, referenced_column: refCol } });
					}
				} catch (err) {
					// ignore FK discovery errors
				}

				return { nodes, edges };
			} catch (err) {
				throw new Error('Informe `query` ou `table` em params');
			}
		}

		const nodes = [];
		const edges = [];

        // Para cada linha do resultado, criamos um nó. O ID do nó pode ser baseado no campo idField, ou na coluna 'id', ou um gerado. O label pode ser baseado em 'name', 'title', 'id' ou o próprio ID gerado.
		for (let i = 0; i < rows.length; i++) {
			const row = rows[i];
			let nodeId;

			if (table && idField && row[idField] != null) {
				nodeId = `${table}:${String(row[idField])}`;
			} else if (row.id != null) {
				nodeId = `${table || 'query'}:${String(row.id)}`;
			} else {
				nodeId = `${table || 'query'}:row:${i}`;
			}

			const label = (row.name || row.title || row.id || nodeId).toString();

			nodes.push(normalizeNode({
				id: nodeId,
				label,
				type: 'other',
				path: nodeId,
				size: 0,
				mtime: Date.now(),
				meta: { row }
			}));
		}

		return { nodes, edges };
	} finally {
		try { await conn.end(); } catch {}
	}
}

module.exports = { fromMySql };
 