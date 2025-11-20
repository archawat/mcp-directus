import {
	createRelation,
	deleteRelation,
	readRelation,
	readRelations,
	updateRelation,
} from '@directus/sdk';
import * as z from 'zod';
import { defineTool } from '../utils/define.js';
import {
	formatErrorResponse,
	formatSuccessResponse,
} from '../utils/response.js';

export const readRelationsTool = defineTool('read-relations', {
	description: 'Retrieve all relations or relations for a specific collection.',
	inputSchema: z.object({
		collection: z
			.string()
			.optional()
			.describe('Optional: Filter relations by collection name'),
	}),
	handler: async (directus, { collection }) => {
		try {
			const relations = await directus.request(readRelations());

			if (collection) {
				const filtered = relations.filter(
					(rel: any) => rel.many_collection === collection || rel.one_collection === collection
				);
				return formatSuccessResponse(filtered);
			}

			return formatSuccessResponse(relations);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	},
});

export const readRelationTool = defineTool('read-relation', {
	description: 'Retrieve a specific relation by collection and field.',
	inputSchema: z.object({
		collection: z.string().describe('Collection name'),
		field: z.string().describe('Field name'),
	}),
	handler: async (directus, { collection, field }) => {
		try {
			const relation = await directus.request(readRelation(collection, field));
			return formatSuccessResponse(relation);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	},
});

export const createRelationTool = defineTool('create-relation', {
	description: 'Create a new relation between collections. Use this after creating relational fields. IMPORTANT: For M2O relations, specify one_field to create the corresponding O2M field on the parent table (recommended).',
	inputSchema: z.object({
		many_collection: z.string().describe('The "many" side collection name (child table)'),
		many_field: z.string().describe('The foreign key field in the "many" collection (M2O field on child)'),
		one_collection: z.string().optional().describe('The "one" side collection name (parent table for M2O/O2M)'),
		one_field: z.string().optional().describe('RECOMMENDED: The alias field name to create on the parent table (O2M field). If specified, creates a virtual field on the parent showing related children. Example: "products" on a category would show all products in that category.'),
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
	}),
	handler: async (directus, input) => {
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
			let message = `Relation created: ${input.many_collection}.${input.many_field} -> ${input.one_collection || 'any'}`;
			if (input.one_field) {
				message += `\nO2M field created on parent: ${input.one_collection}.${input.one_field}`;
			} else if (input.one_collection) {
				message += `\nNote: No O2M field created on parent table. To add it later, update the relation with one_field parameter.`;
			}

			return formatSuccessResponse(result, message);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	},
});

export const updateRelationTool = defineTool('update-relation', {
	description: 'Update an existing relation between collections.',
	inputSchema: z.object({
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
	}),
	handler: async (directus, { collection, field, data }) => {
		try {
			const result = await directus.request(updateRelation(collection, field, data));
			return formatSuccessResponse(
				result,
				`Relation updated: ${collection}.${field}`
			);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	},
});

export const deleteRelationTool = defineTool('delete-relation', {
	description: 'Delete a relation. WARNING: This is destructive and may break existing data relationships.',
	inputSchema: z.object({
		collection: z.string().describe('The collection name where the relation field exists'),
		field: z.string().describe('The field name of the relation to delete'),
	}),
	handler: async (directus, { collection, field }) => {
		try {
			await directus.request(deleteRelation(collection, field));
			return formatSuccessResponse(
				null,
				`Relation deleted: ${collection}.${field}`
			);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	},
});
