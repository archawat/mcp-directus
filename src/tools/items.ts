import { createItem, deleteItem, readItems, updateItem } from '@directus/sdk';

import * as z from 'zod';
import { simpleItemQuerySchema } from '../types/simple-query.js';
import { defineTool } from '../utils/define.js';
import { collectionExists, getCollectionSchema } from '../utils/lazy-schema.js';
import { generateCmsLink } from '../utils/links.js';
import {
	formatErrorResponse,
	formatSuccessResponse,
} from '../utils/response.js';

export const readItemsTool = defineTool('read-items', {
	description: `Fetch items from any Directus collection. 
		IMPORTANT: Use 'limit' parameter to avoid large responses. Default limit is 5.
		Use 'fields' to specify only needed fields to reduce token usage.
		For large datasets, use multiple calls with 'offset' for pagination.`,
	annotations: {
		title: 'Read Items',
		readOnlyHint: true,
	},
	inputSchema: z.object({
		collection: z.string().describe('The name of the collection to read from'),
		query: simpleItemQuerySchema.describe(
			'Query parameters. ALWAYS use limit (default: 5) to avoid large responses.',
		),
	}),
	handler: async (directus, query) => {
		try {
			const { collection, query: queryParams } = query;
			
			// Check if collection exists (lazy load schema)
			if (!(await collectionExists(collection))) {
				throw new Error(`Collection "${collection}" not found. Use list-collections tool to see available collections.`);
			}

			// Apply default limit to prevent large responses
			const safeQuery = {
				...queryParams,
				limit: queryParams?.limit || 5, // Default to 5 items
			};

			const result = await directus.request(
				readItems(collection as unknown as never, safeQuery),
			);
			
			// Return compact JSON to save tokens
			return {
				content: [{
					type: 'text',
					text: `Found ${Array.isArray(result) ? result.length : 1} items:\n${JSON.stringify(result)}`
				}]
			};
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	},
});

export const createItemTool = defineTool('create-item', {
	description:
		'Create an item in a collection. Will return a link to the created item. You should show the link to the user.',
	annotations: {
		title: 'Create Item',
	},

	inputSchema: z.object({
		collection: z.string().describe('The name of the collection to create in'),
		item: z.record(z.string(), z.unknown()).describe('The item data to create'),
		query: simpleItemQuerySchema.optional()
			.describe(
				'Optional query parameters for the created item (e.g., fields)',
			),
	}),
	handler: async (directus, input, ctx) => {
		try {
			const { collection, item, query } = input;
			
			// Check if collection exists and get primary key
			if (!(await collectionExists(collection))) {
				throw new Error(`Collection "${collection}" not found.`);
			}
			
			const collectionSchema = await getCollectionSchema(collection);
			const primaryKeyField = Object.keys(collectionSchema).find(
				field => collectionSchema[field].primary_key
			) || 'id';

			const result = await directus.request(
				createItem(collection, item, query),
			);

			const id = result[primaryKeyField as any];

			return formatSuccessResponse(
				result,
				`Item created: ${generateCmsLink({ baseUrl: (ctx?.baseUrl || '') as string, type: 'item', collection, id: id ?? '' })}`,
			);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	},
});

export const updateItemTool = defineTool('update-item', {
	description:
		'Update an existing item in a collection. Will return a link to the created item. You should show the link to the user.',
	annotations: {
		title: 'Update Item',
		destructiveHint: true,
	},

	inputSchema: z.object({
		collection: z.string().describe('The name of the collection to update in'),
		id: z
			.union([z.string(), z.number()])
			.describe('The primary key of the item to update'),
		data: z
			.record(z.string(), z.unknown())
			.describe('The partial item data to update'),
		query: simpleItemQuerySchema.optional()
			.describe(
				'Optional query parameters for the updated item (e.g., fields)',
			),
	}),
	handler: async (directus, input, ctx) => {
		try {
			const { collection, id, data, query } = input;
			
			if (!(await collectionExists(collection))) {
				throw new Error(`Collection "${collection}" not found.`);
			}
			
			const collectionSchema = await getCollectionSchema(collection);
			const primaryKeyField = Object.keys(collectionSchema).find(
				field => collectionSchema[field].primary_key
			) || 'id';
			
			const result = await directus.request(
				updateItem(collection, id, data, query),
			);
			return formatSuccessResponse(
				result,
				`Item updated: ${generateCmsLink({ baseUrl: (ctx?.baseUrl || ''), type: 'item', collection, id: result[primaryKeyField as any] ?? '' })}`,
			);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	},
});

export const deleteItemTool = defineTool('delete-item', {
	description:
		'Delete a single item from a collection. Please confirm with the user before deleting.',
	annotations: {
		title: 'Delete Item',
		destructiveHint: true,
	},
	inputSchema: z.object({
		collection: z
			.string()
			.describe('The name of the collection to delete from'),
		id: z
			.union([z.string(), z.number()])
			.describe('The primary key of the item to delete'),
	}),
	handler: async (directus, input) => {
		try {
			const { collection, id } = input;
			
			if (!(await collectionExists(collection))) {
				throw new Error(`Collection "${collection}" not found.`);
			}
			const result = await directus.request(deleteItem(collection, id));
			return formatSuccessResponse(result);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	},
});
