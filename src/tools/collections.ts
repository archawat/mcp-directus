import { createCollection } from '@directus/sdk';
import * as z from 'zod';
import { getSchemaLazy, invalidateSchemaCache } from '../utils/lazy-schema.js';
import { defineTool } from '../utils/define.js';
import { formatErrorResponse, formatSuccessResponse } from '../utils/response.js';

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

export const createCollectionTool = defineTool('create-collection', {
	description: 'Create a new collection or folder in Directus. Set is_folder=true to create a folder (no database table), otherwise creates a regular collection with database table.',
	inputSchema: z.object({
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
	}),
	handler: async (directus, input) => {
		try {
			// Validate: cannot have fields with folder
			if (input.is_folder && input.fields && input.fields.length > 0) {
				throw new Error('Cannot create fields with a folder. Folders are metadata-only and have no database table.');
			}

			const collectionData: any = {
				collection: input.collection,
			};

			if (input.meta) {
				collectionData.meta = input.meta;
			}

			// Set schema based on folder flag
			if (input.is_folder) {
				// Folder: set schema to null (no database table)
				collectionData.schema = null;
			} else {
				// Regular collection: ensure database table is created
				if (input.schema) {
					collectionData.schema = input.schema;
				} else {
					collectionData.schema = {
						name: input.collection
					};
				}
			}

			// If folder, skip field processing
			if (input.is_folder) {
				const result = await directus.request(createCollection(collectionData));

				// Invalidate schema cache to refresh permissions
				invalidateSchemaCache();

				return formatSuccessResponse(
					result,
					`Folder "${input.collection}" created successfully.`
				);
			}

			// Default interface mappings
			const defaultInterfaces: Record<string, string> = {
				'm2o': 'select-dropdown-m2o',
				'o2m': 'list-o2m',
				'm2m': 'list-m2m',
				'string': 'input',
				'text': 'input-multiline',
				'integer': 'input',
				'bigInteger': 'input',
				'float': 'input',
				'decimal': 'input',
				'boolean': 'boolean',
				'date': 'datetime',
				'dateTime': 'datetime',
				'time': 'input',
				'timestamp': 'datetime',
				'json': 'input-code',
				'uuid': 'input',
			};

			// Always ensure collection has a primary key field
			// If no fields provided, create with id field only
			// If fields provided but no primary key, prepend id field
			let fieldsToCreate = input.fields || [];

			const hasPrimaryKey = fieldsToCreate.some((field: any) =>
				field.schema?.is_primary_key || field.field === 'id'
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
					}
				};
				fieldsToCreate = [idField, ...fieldsToCreate];
			}

			// Apply proper meta defaults to all fields
			collectionData.fields = fieldsToCreate.map((field: any) => {
				const defaultInterface = field.meta?.interface || defaultInterfaces[field.type];
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
					}
				};
			});

			const result = await directus.request(createCollection(collectionData));

			// Invalidate schema cache to refresh permissions for new collection
			invalidateSchemaCache();

			return formatSuccessResponse(
				result,
				`Collection "${input.collection}" created successfully with ${collectionData.fields.length} fields.`
			);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	},
});