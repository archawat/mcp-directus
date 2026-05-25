import {
	createField,
	createRelation,
	deleteRelation,
	readRelation,
	readRelations,
	updateRelation,
} from '@directus/sdk';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod';
import type { Config } from '../config.js';
import type { Directus } from '../directus.js';
import { invalidateSchemaCache } from '../utils/lazy-schema.js';
import {
	formatErrorResponse,
	formatSuccessResponse,
} from '../utils/response.js';

export function registerRelationTools(server: McpServer, directus: Directus, _config: Config) {
	server.registerTool('directus_read_relations', {
		title: 'Read Relations',
		description: 'Retrieve all relations or relations for a specific collection.',
		inputSchema: {
			collection: z
				.string()
				.optional()
				.describe('Optional: Filter relations by collection name'),
		},
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	}, async ({ collection }) => {
		try {
			const relations = await directus.request(readRelations());

			if (collection) {
				const filtered = relations.filter(
					(rel: any) => rel.many_collection === collection || rel.one_collection === collection,
				);
				return formatSuccessResponse(filtered);
			}

			return formatSuccessResponse(relations);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	});

	server.registerTool('directus_read_relation', {
		title: 'Read Relation',
		description: 'Retrieve a specific relation by collection and field.',
		inputSchema: {
			collection: z.string().describe('Collection name'),
			field: z.string().describe('Field name'),
		},
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	}, async ({ collection, field }) => {
		try {
			const relation = await directus.request(readRelation(collection, field));
			return formatSuccessResponse(relation);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	});

	server.registerTool('directus_create_relation', {
		title: 'Create Relation',
		description: 'Create a new relation between collections. Use this after creating relational fields. IMPORTANT: For M2O relations, specify one_field to create the corresponding O2M alias field on the parent table (recommended). When one_field + one_collection are both provided, this tool will also POST /fields to create the alias on the parent — mirroring the two-step sequence the Directus admin UI performs.',
		inputSchema: {
			many_collection: z.string().describe('The "many" side collection name (child table)'),
			many_field: z.string().describe('The foreign key field in the "many" collection (M2O field on child)'),
			one_collection: z.string().optional().describe('The "one" side collection name (parent table for M2O/O2M)'),
			one_field: z.string().optional().describe('RECOMMENDED: The alias field name to create on the parent table (O2M/M2M/M2A alias). If specified together with one_collection, the tool will (a) create the directus_relations row, then (b) create the alias directus_fields row on the parent collection with the correct meta.special and meta.interface — exactly what Directus admin UI does in two API calls. Example: "products" on a category would show all products in that category.'),
			one_collection_field: z.string().optional().describe('Field to store collection name (for M2A/polymorphic)'),
			one_allowed_collections: z.array(z.string()).optional().describe('Allowed collections (for M2A/polymorphic)'),
			junction_field: z.string().optional().describe('Junction field (for M2M)'),
			sort_field: z.string().optional().describe('Sort field for ordering related items'),
			one_deselect_action: z.enum(['nullify', 'delete']).optional().default('nullify').describe('Action when deselecting: nullify or delete'),
			meta: z.object({
				one_field: z.string().optional(),
				sort_field: z.string().optional(),
				one_deselect_action: z.string().optional(),
				one_allowed_collections: z.array(z.string()).optional(),
				junction_field: z.string().optional(),
			}).optional().describe('Additional metadata for the relation'),
		},
		annotations: {
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: false,
			openWorldHint: false,
		},
	}, async (input) => {
		try {
			const relationData: any = {
				collection: input.many_collection,
				field: input.many_field,
				related_collection: input.one_collection,
			};

			// Build meta object with relation configuration
			const meta: any = {};

			if (input.one_field) {
				meta.one_field = input.one_field;
			}

			if (input.one_collection_field) {
				meta.one_collection_field = input.one_collection_field;
			}

			if (input.one_allowed_collections) {
				meta.one_allowed_collections = input.one_allowed_collections;
			}

			if (input.junction_field) {
				meta.junction_field = input.junction_field;
			}

			if (input.sort_field) {
				meta.sort_field = input.sort_field;
			}

			if (input.one_deselect_action) {
				meta.one_deselect_action = input.one_deselect_action;
			}

			// Merge with additional meta if provided
			if (input.meta) {
				Object.assign(meta, input.meta);
			}

			if (Object.keys(meta).length > 0) {
				relationData.meta = meta;
			}

			const result = await directus.request(createRelation(relationData));

			// Build informative message
			let message = `Relation row created: ${input.many_collection}.${input.many_field} -> ${input.one_collection || 'any'}`;

			// POST /relations alone does NOT create the alias directus_fields row on the parent.
			// The Directus admin UI makes a separate POST /fields call for the alias — replicate that here.
			if (input.one_field && input.one_collection) {
				const isM2A = !!input.one_collection_field || !!input.one_allowed_collections;
				const isM2M = !isM2A && !!input.junction_field;
				const aliasSpecial = isM2A ? 'm2a' : (isM2M ? 'm2m' : 'o2m');
				const aliasInterface = isM2A ? 'list-m2a' : (isM2M ? 'list-m2m' : 'list-o2m');

				try {
					await directus.request(createField(input.one_collection, {
						field: input.one_field,
						type: 'alias',
						meta: {
							special: [aliasSpecial],
							interface: aliasInterface,
							options: { enableCreate: true, enableSelect: true },
							display: null,
							display_options: null,
							readonly: false,
							hidden: false,
							width: 'full',
							required: false,
						},
					} as any));

					invalidateSchemaCache();
					message += `\nAlias field created on parent: ${input.one_collection}.${input.one_field} (special: ["${aliasSpecial}"], interface: "${aliasInterface}")`;
				}
				catch (error: any) {
					const errMsg = error?.message || String(error);
					message += `\nWARNING: Relation row created successfully, but the alias field on ${input.one_collection}.${input.one_field} was NOT created: ${errMsg}`;
					message += `\nThe alias may already exist, or you may need to create it manually via directus_create_field with type: "alias", meta.special: ["${aliasSpecial}"], meta.interface: "${aliasInterface}".`;
				}
			}
			else if (input.one_collection) {
				message += '\nNote: No alias field created on parent table. Pass one_field to auto-create the alias, or call directus_create_field separately.';
			}

			return formatSuccessResponse(result, message);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	});

	server.registerTool('directus_update_relation', {
		title: 'Update Relation',
		description: 'Update an existing relation between collections.',
		inputSchema: {
			collection: z.string().describe('The collection name where the relation field exists'),
			field: z.string().describe('The field name of the relation'),
			data: z.object({
				one_collection: z.string().optional().describe('The "one" side collection name'),
				one_field: z.string().optional().describe('The field name in the "one" collection'),
				one_collection_field: z.string().optional().describe('Field to store collection name (for M2A)'),
				one_allowed_collections: z.array(z.string()).optional().describe('Allowed collections (for M2A)'),
				junction_field: z.string().optional().describe('Junction field (for M2M)'),
				sort_field: z.string().optional().describe('Sort field for ordering'),
				one_deselect_action: z.enum(['nullify', 'delete']).optional().describe('Action when deselecting'),
				meta: z.object({
					one_field: z.string().optional(),
					sort_field: z.string().optional(),
					one_deselect_action: z.string().optional(),
					one_allowed_collections: z.array(z.string()).optional(),
					junction_field: z.string().optional(),
				}).optional().describe('Additional metadata'),
			}).describe('Relation data to update'),
		},
		annotations: {
			readOnlyHint: false,
			destructiveHint: true,
			idempotentHint: true,
			openWorldHint: false,
		},
	}, async ({ collection, field, data }) => {
		try {
			const result = await directus.request(updateRelation(collection, field, data as any));
			return formatSuccessResponse(
				result,
				`Relation updated: ${collection}.${field}`,
			);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	});

	server.registerTool('directus_delete_relation', {
		title: 'Delete Relation',
		description: 'Delete a relation. WARNING: This is destructive and may break existing data relationships.',
		inputSchema: {
			collection: z.string().describe('The collection name where the relation field exists'),
			field: z.string().describe('The field name of the relation to delete'),
		},
		annotations: {
			readOnlyHint: false,
			destructiveHint: true,
			idempotentHint: true,
			openWorldHint: false,
		},
	}, async ({ collection, field }) => {
		try {
			await directus.request(deleteRelation(collection, field));
			return formatSuccessResponse(
				null,
				`Relation deleted: ${collection}.${field}`,
			);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	});
}
