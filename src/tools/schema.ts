import * as z from 'zod';
import { getSchemaLazy } from '../utils/lazy-schema.js';
import { defineTool } from '../utils/define.js';

export default defineTool('read-collections', {
	description:
		'WARNING: Returns full schema (very large). Use list-collections for collection names only, or read-collection-schema for specific collections.',
	inputSchema: z.object({
		collections: z.array(z.string()).optional().describe('Specific collections to include (to reduce size)'),
		fields_only: z.boolean().optional().default(false).describe('Return only field names, not full schema')
	}),
	handler: async (_, { collections, fields_only }) => {
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
				text: `Schema (${itemCount} collections):\n${JSON.stringify(schema)}` 
			}] 
		};
	},
});
