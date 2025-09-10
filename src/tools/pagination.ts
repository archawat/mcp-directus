import { readItems } from '@directus/sdk';
import * as z from 'zod';
import { defineTool } from '../utils/define.js';
import { collectionExists } from '../utils/lazy-schema.js';
import { formatErrorResponse } from '../utils/response.js';

export const countItemsTool = defineTool('count-items', {
	description: 'Count items in a collection without fetching data. Use for pagination planning.',
	inputSchema: z.object({
		collection: z.string().describe('Collection to count items in'),
		filter: z.record(z.string(), z.any()).optional().describe('Filter conditions for counting')
	}),
	handler: async (directus, { collection, filter }) => {
		try {
			if (!(await collectionExists(collection))) {
				throw new Error(`Collection "${collection}" not found.`);
			}

			// Simple count using readItems with meta
			const result = await directus.request(
				readItems(collection as unknown as never, {
					limit: 1,
					meta: ['total_count'] as any,
					...(filter ? { filter } : {})
				})
			);

			const count = (result as any)?.meta?.total_count || 0;
			return {
				content: [{
					type: 'text',
					text: `Collection "${collection}" contains ${count} items${filter ? ' (with filters)' : ''}.`
				}]
			};
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	},
});

export const getItemSummaryTool = defineTool('get-item-summary', {
	description: 'Get a summary of items with minimal data. Returns only essential fields to reduce tokens.',
	inputSchema: z.object({
		collection: z.string().describe('Collection name'),
		limit: z.number().default(10).describe('Max 20 items for summary'),
		offset: z.number().optional().describe('Offset for pagination'),
		fields: z.array(z.string()).optional().describe('Specific fields to include (recommended)')
	}),
	handler: async (directus, { collection, limit, offset, fields }) => {
		try {
			if (!(await collectionExists(collection))) {
				throw new Error(`Collection "${collection}" not found.`);
			}

			// Use only essential fields if none specified
			const queryFields = fields || ['id'];
			
			const result = await directus.request(
				readItems(collection as unknown as never, {
					fields: queryFields,
					limit: Math.min(limit, 20), // Cap at 20
					offset,
					sort: ['-id'] as any // Most recent first
				})
			);

			return {
				content: [{
					type: 'text',
					text: `Summary (${Array.isArray(result) ? result.length : 1} items, fields: ${queryFields.join(', ')}):\n${JSON.stringify(result)}`
				}]
			};
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	},
});