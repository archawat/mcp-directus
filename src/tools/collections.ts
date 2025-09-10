import * as z from 'zod';
import { getSchemaLazy } from '../utils/lazy-schema.js';
import { defineTool } from '../utils/define.js';

export const listCollectionsTool = defineTool('list-collections', {
	description: 'Get just the list of collection names (lightweight). Use read-collections for full schema.',
	inputSchema: z.object({}),
	handler: async () => {
		const schema = await getSchemaLazy();
		const collections = Object.keys(schema);
		
		return { 
			content: [{ 
				type: 'text', 
				text: `Available collections (${collections.length}): ${collections.join(', ')}` 
			}] 
		};
	},
});

export const readCollectionDetailsTool = defineTool('read-collection-schema', {
	description: 'Get detailed schema for a specific collection only.',
	inputSchema: z.object({
		collection: z.string().describe('Collection name to get schema for')
	}),
	handler: async (_, { collection }) => {
		const schema = await getSchemaLazy();
		
		if (!schema[collection]) {
			throw new Error(`Collection "${collection}" not found. Available: ${Object.keys(schema).join(', ')}`);
		}
		
		// Return compact JSON to save tokens
		return { 
			content: [{ 
				type: 'text', 
				text: `Schema for "${collection}":\n${JSON.stringify({ [collection]: schema[collection] })}`
			}] 
		};
	},
});