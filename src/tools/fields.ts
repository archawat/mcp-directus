import {
	createField,
	readField,
	readFields,
	readFieldsByCollection,
	updateField,
} from '@directus/sdk';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Directus } from '../directus.js';
import type { Config } from '../config.js';
import {
	CreateFieldDataSchema,
	UpdateFieldDataSchema,
} from '../types/fields.js';
import {
	formatErrorResponse,
	formatSuccessResponse,
} from '../utils/response.js';
import { invalidateSchemaCache } from '../utils/lazy-schema.js';
import { DEFAULT_FIELD_INTERFACES } from '../constants/defaults.js';

export function registerFieldTools(server: McpServer, directus: Directus, _config: Config) {
	server.registerTool('directus_read_fields', {
		title: 'Read Fields',
		description:
			'Retrieve the field definitions for all collections or a specific collection. Note: This is lots of data and should be used sparingly. Use only if you cannot find the field information you need and you absolutely need to have the raw field definition.',
		inputSchema: {
			collection: z
				.string()
				.optional()
				.describe(
					'Optional: The name (ID) of the collection to retrieve fields for. If omitted, fields for all collections are returned.',
				),
		},
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	}, async ({ collection }) => {
		try {
			const fields = collection
				? await directus.request(readFieldsByCollection(collection))
				: await directus.request(readFields());
			return formatSuccessResponse(fields);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	});

	server.registerTool('directus_read_field', {
		title: 'Read Field',
		description:
			'Retrieve the definition of a specific field within a collection.',
		inputSchema: {
			collection: z
				.string()
				.describe('The name (ID) of the collection the field belongs to.'),
			field: z.string().describe('The name (ID) of the field to retrieve.'),
		},
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	}, async ({ collection, field }) => {
		try {
			const fieldData = await directus.request(readField(collection, field));
			return formatSuccessResponse(fieldData);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	});

	server.registerTool('directus_create_field', {
		title: 'Create Field',
		description: 'Create a new field in a specified collection.',
		inputSchema: {
			collection: z
				.string()
				.describe('The name (ID) of the collection to add the field to.'),
			data: CreateFieldDataSchema.describe(
				'The data for the new field (field name, type, optional schema/meta).',
			),
		},
		annotations: {
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: false,
			openWorldHint: false,
		},
	}, async ({ collection, data }) => {
		try {
			// Set default interfaces based on field type if not specified
			// Build complete meta object with proper defaults to match dashboard behavior
			const defaultInterface = data.meta?.interface || DEFAULT_FIELD_INTERFACES[data.type];
			data.meta = {
				// Set comprehensive defaults to match Directus dashboard behavior
				interface: defaultInterface,
				display: null,
				display_options: null,
				readonly: false,
				hidden: false,
				width: 'full',
				required: false,
				// Merge any user-provided meta properties on top of defaults
				...data.meta,
			};

			const result = await directus.request(createField(collection, data as any));

			// Invalidate schema cache to refresh collection schema
			invalidateSchemaCache();

			return formatSuccessResponse(result);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	});

	server.registerTool('directus_update_field', {
		title: 'Update Field',
		description: 'Update an existing field in a specified collection.',
		inputSchema: {
			collection: z
				.string()
				.describe('The name (ID) of the collection containing the field.'),
			field: z.string().describe('The name (ID) of the field to update.'),
			data: UpdateFieldDataSchema.describe(
				'The partial data to update the field with (type, schema, meta).',
			),
		},
		annotations: {
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	}, async ({ collection, field, data }) => {
		try {
			const result = await directus.request(updateField(collection, field, data as any));
			return formatSuccessResponse(result);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	});
}
