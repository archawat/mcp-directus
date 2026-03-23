import { createCollection } from '@directus/sdk';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Directus } from '../directus.js';
import type { Config } from '../config.js';
import { getSchemaLazy, invalidateSchemaCache } from '../utils/lazy-schema.js';
import { formatErrorResponse, formatSuccessResponse } from '../utils/response.js';
import { DEFAULT_FIELD_INTERFACES } from '../constants/defaults.js';

export function registerCollectionTools(server: McpServer, directus: Directus, _config: Config) {
	server.registerTool('directus_list_collections', {
		title: 'List Collections',
		description: 'Get just the list of collection names (lightweight). Use directus_read_collections for full schema.',
		inputSchema: {},
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	}, async () => {
		const schema = await getSchemaLazy();
		const collections = Object.keys(schema);

		return {
			content: [{
				type: 'text',
				text: `Available collections (${collections.length}): ${collections.join(', ')}`,
			}],
		};
	});

	server.registerTool('directus_read_collection_schema', {
		title: 'Read Collection Schema',
		description: 'Get detailed schema for a specific collection only.',
		inputSchema: {
			collection: z.string().describe('Collection name to get schema for'),
		},
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	}, async ({ collection }) => {
		const schema = await getSchemaLazy();

		if (!schema[collection]) {
			throw new Error(`Collection "${collection}" not found. Available: ${Object.keys(schema).join(', ')}`);
		}

		// Return compact JSON to save tokens
		return {
			content: [{
				type: 'text',
				text: `Schema for "${collection}":\n${JSON.stringify({ [collection]: schema[collection] })}`,
			}],
		};
	});

	server.registerTool('directus_create_collection', {
		title: 'Create Collection',
		description: 'Create a new collection or folder in Directus. Set is_folder=true to create a folder (no database table), otherwise creates a regular collection with database table.',
		inputSchema: {
			collection: z.string().describe('Unique name for the new collection (lowercase, no spaces)'),
			is_folder: z.boolean().optional().default(false).describe('Set to true to create a folder (metadata only, no database table). Default is false (creates database table).'),
			meta: z.object({
				icon: z.string().optional().describe('Icon name for the collection (e.g., "box", "folder")'),
				note: z.string().optional().describe('Description or note about the collection'),
				hidden: z.boolean().optional().default(false).describe('Whether to hide collection from navigation'),
				singleton: z.boolean().optional().default(false).describe('Whether collection should be singleton (single item)'),
				translations: z.record(z.string(), z.string()).optional().describe('Translations for collection name'),
				archive_field: z.string().optional().describe('Field name to use for archiving (e.g., "status")'),
				archive_value: z.string().optional().describe('Value to set when archiving (e.g., "archived")'),
				unarchive_value: z.string().optional().describe('Value to set when unarchiving (e.g., "draft")'),
				sort_field: z.string().optional().describe('Field to use for manual sorting'),
				accountability: z.enum(['all', 'activity']).optional().default('all').describe('Accountability level'),
				color: z.string().optional().describe('Color for the collection (hex code)'),
			}).optional().describe('Optional collection metadata'),
			schema: z.object({
				name: z.string().optional().describe('Database table name (defaults to collection name)'),
			}).optional().describe('Optional schema configuration. Ignored if is_folder is true.'),
			fields: z.array(z.object({
				field: z.string().describe('Field name'),
				type: z.string().describe('Field type (string, integer, boolean, etc.)'),
				meta: z.record(z.string(), z.any()).optional().describe('Field metadata'),
				schema: z.record(z.string(), z.any()).optional().describe('Field schema'),
			})).optional().describe('Initial fields to create with the collection. Cannot be used with is_folder=true.'),
		},
		annotations: {
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: false,
			openWorldHint: false,
		},
	}, async ({ collection, is_folder, meta, schema, fields }) => {
		try {
			// Validate: cannot have fields with folder
			if (is_folder && fields && fields.length > 0) {
				throw new Error('Cannot create fields with a folder. Folders are metadata-only and have no database table.');
			}

			const collectionData: any = {
				collection,
			};

			if (meta) {
				collectionData.meta = meta;
			}

			// Set schema based on folder flag
			if (is_folder) {
				// Folder: set schema to null (no database table)
				collectionData.schema = null;
			} else {
				// Regular collection: ensure database table is created
				if (schema) {
					collectionData.schema = schema;
				} else {
					collectionData.schema = {
						name: collection,
					};
				}
			}

			// If folder, skip field processing
			if (is_folder) {
				const result = await directus.request(createCollection(collectionData));

				// Invalidate schema cache to refresh permissions
				invalidateSchemaCache();

				return formatSuccessResponse(
					result,
					`Folder "${collection}" created successfully.`,
				);
			}

			// Always ensure collection has a primary key field
			// If no fields provided, create with id field only
			// If fields provided but no primary key, prepend id field
			let fieldsToCreate = fields || [];

			const hasPrimaryKey = fieldsToCreate.some((field: any) =>
				field.schema?.is_primary_key || field.field === 'id',
			);

			if (!hasPrimaryKey) {
				// Add auto-increment integer ID as primary key
				const idField = {
					field: 'id',
					type: 'integer',
					schema: {
						is_primary_key: true,
						has_auto_increment: true,
						is_nullable: false,
					},
					meta: {
						interface: 'input',
						display: null,
						display_options: null,
						readonly: true,
						hidden: true,
						width: 'full',
						required: false,
						special: ['auto-increment'],
					},
				};
				fieldsToCreate = [idField, ...fieldsToCreate];
			}

			// Apply proper meta defaults to all fields
			collectionData.fields = fieldsToCreate.map((field: any) => {
				const defaultInterface = field.meta?.interface || DEFAULT_FIELD_INTERFACES[field.type];
				return {
					...field,
					meta: {
						// Set comprehensive defaults to match Directus dashboard behavior
						interface: defaultInterface,
						display: null,
						display_options: null,
						readonly: false,
						hidden: false,
						width: 'full',
						required: false,
						// Merge any user-provided meta properties on top of defaults
						...field.meta,
					},
				};
			});

			const result = await directus.request(createCollection(collectionData));

			// Invalidate schema cache to refresh permissions for new collection
			invalidateSchemaCache();

			return formatSuccessResponse(
				result,
				`Collection "${collection}" created successfully with ${collectionData.fields.length} fields.`,
			);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	});
}
