import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Directus } from '../directus.js';
import type { Config } from '../config.js';
import { getSchemaLazy } from '../utils/lazy-schema.js';

export function registerSchemaTools(server: McpServer, _directus: Directus, _config: Config) {
	server.registerTool('directus_read_collections', {
		title: 'Read Collections',
		description:
			'WARNING: Returns full schema (very large). Use directus_list_collections for collection names only, or directus_read_collection_schema for specific collections.',
		inputSchema: {
			collections: z.array(z.string()).optional().describe('Specific collections to include (to reduce size)'),
			fields_only: z.boolean().optional().default(false).describe('Return only field names, not full schema'),
		},
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	}, async ({ collections, fields_only }) => {
		const fullSchema = await getSchemaLazy();
		let schema = fullSchema;

		// Filter to specific collections if requested
		if (collections && collections.length > 0) {
			schema = {};
			for (const collection of collections) {
				if (fullSchema[collection]) {
					schema[collection] = fullSchema[collection];
				}
			}
		}

		// Return only field names if requested
		if (fields_only) {
			const simplified: any = {};
			for (const [collection, fields] of Object.entries(schema)) {
				if (fields && typeof fields === 'object') {
					simplified[collection] = Object.keys(fields as Record<string, any>);
				}
			}
			schema = simplified;
		}

		// Return compact JSON to save tokens
		const itemCount = Object.keys(schema).length;
		return {
			content: [{
				type: 'text',
				text: `Schema (${itemCount} collections):\n${JSON.stringify(schema)}`,
			}],
		};
	});
}
