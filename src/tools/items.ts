import { createItem, deleteItem, readItems, updateItem } from '@directus/sdk';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import * as z from 'zod';
import type { Config } from '../config.js';
import type { Directus } from '../directus.js';
import { simpleItemQuerySchema } from '../types/simple-query.js';
import { isSystemCollection } from '../utils/is-system-collection.js';
import { collectionExists, getCollectionSchema } from '../utils/lazy-schema.js';
import { generateCmsLink } from '../utils/links.js';
import {
	formatErrorResponse,
	formatSuccessResponse,
} from '../utils/response.js';

export function registerItemTools(server: McpServer, directus: Directus, config: Config) {
	server.registerTool('directus_read_items', {
		title: 'Read Items',
		description: `Fetch items from any Directus collection.
		IMPORTANT: Use 'limit' parameter to avoid large responses. Default limit is 5.
		Use 'fields' to specify only needed fields to reduce token usage.
		For large datasets, use multiple calls with 'offset' for pagination.`,
		inputSchema: {
			collection: z.string().describe('The name of the collection to read from'),
			query: simpleItemQuerySchema.describe(
				'Query parameters. ALWAYS use limit (default: 5) to avoid large responses.',
			),
		},
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	}, async ({ collection, query }) => {
		try {
			// Check if collection exists (lazy load schema)
			if (!(await collectionExists(collection))) {
				throw new Error(`Collection "${collection}" not found. Use list-collections tool to see available collections.`);
			}

			// Apply default limit to prevent large responses
			const safeQuery = {
				...query,
				limit: query?.limit || 5, // Default to 5 items
			};

			const result = await directus.request(
				readItems(collection as unknown as never, safeQuery as any),
			);

			// Return compact JSON to save tokens
			return {
				content: [{
					type: 'text' as const,
					text: `Found ${Array.isArray(result) ? result.length : 1} items:\n${JSON.stringify(result)}`,
				}],
			};
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	});

	server.registerTool('directus_create_item', {
		title: 'Create Item',
		description:
			'Create an item in a collection. Will return a link to the created item. You should show the link to the user.',
		inputSchema: {
			collection: z.string().describe('The name of the collection to create in'),
			item: z.record(z.string(), z.unknown()).describe('The item data to create'),
			query: simpleItemQuerySchema.optional()
				.describe(
					'Optional query parameters for the created item (e.g., fields)',
				),
		},
		annotations: {
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: false,
			openWorldHint: false,
		},
	}, async ({ collection, item, query }) => {
		try {
			// Check if collection exists and get primary key
			if (!(await collectionExists(collection))) {
				throw new Error(`Collection "${collection}" not found.`);
			}

			// Check if trying to modify system collection without permission
			if (isSystemCollection(collection) && !config.ALLOW_SYSTEM_MODIFICATIONS) {
				throw new Error(`Modifications to system collection "${collection}" are disabled for safety. Set ALLOW_SYSTEM_MODIFICATIONS=true to enable.`);
			}

			const collectionSchema = await getCollectionSchema(collection);
			const primaryKeyField = Object.keys(collectionSchema).find(
				field => collectionSchema[field].primary_key,
			) || 'id';

			const result = await directus.request(
				createItem(collection, item as any, query),
			);

			const id = result[primaryKeyField as any];

			return formatSuccessResponse(
				result,
				`Item created: ${generateCmsLink({ baseUrl: config.DIRECTUS_URL, type: 'item', collection, id: String(id ?? '') })}`,
			);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	});

	server.registerTool('directus_update_item', {
		title: 'Update Item',
		description:
			'Update an existing item in a collection. Will return a link to the created item. You should show the link to the user.',
		inputSchema: {
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
		},
		annotations: {
			readOnlyHint: false,
			destructiveHint: true,
			idempotentHint: true,
			openWorldHint: false,
		},
	}, async ({ collection, id, data, query }) => {
		try {
			if (!(await collectionExists(collection))) {
				throw new Error(`Collection "${collection}" not found.`);
			}

			// Check if trying to modify system collection without permission
			if (isSystemCollection(collection) && !config.ALLOW_SYSTEM_MODIFICATIONS) {
				throw new Error(`Modifications to system collection "${collection}" are disabled for safety. Set ALLOW_SYSTEM_MODIFICATIONS=true to enable.`);
			}

			const collectionSchema = await getCollectionSchema(collection);
			const primaryKeyField = Object.keys(collectionSchema).find(
				field => collectionSchema[field].primary_key,
			) || 'id';

			const result = await directus.request(
				updateItem(collection, id, data, query),
			);
			return formatSuccessResponse(
				result,
				`Item updated: ${generateCmsLink({ baseUrl: config.DIRECTUS_URL, type: 'item', collection, id: String(result[primaryKeyField as any] ?? '') })}`,
			);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	});

	server.registerTool('directus_delete_item', {
		title: 'Delete Item',
		description:
			'Delete a single item from a collection. Please confirm with the user before deleting.',
		inputSchema: {
			collection: z
				.string()
				.describe('The name of the collection to delete from'),
			id: z
				.union([z.string(), z.number()])
				.describe('The primary key of the item to delete'),
		},
		annotations: {
			readOnlyHint: false,
			destructiveHint: true,
			idempotentHint: true,
			openWorldHint: false,
		},
	}, async ({ collection, id }) => {
		try {
			if (!(await collectionExists(collection))) {
				throw new Error(`Collection "${collection}" not found.`);
			}
			const result = await directus.request(deleteItem(collection, id));
			return formatSuccessResponse(result);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	});
}
