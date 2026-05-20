import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Config } from '../config.js';
import type { Directus } from '../directus.js';
import { readPreset, readPresets } from '@directus/sdk';
import * as z from 'zod';
import { itemQuerySchema } from '../types/query.js';
import { formatErrorResponse, formatSuccessResponse } from '../utils/response.js';

export function registerPresetTools(server: McpServer, directus: Directus, _config: Config) {
	server.registerTool('directus_read_presets', {
		title: 'Read Presets',
		description: `Retrieve saved presets and bookmarks from directus_presets.
		A preset is a saved view config (target collection + filter + layout/sort). A "bookmark" is a preset with a non-null 'bookmark' name.
		Provide 'id' to fetch a single preset by its primary key (e.g. a bookmark id). Otherwise use 'query.filter' (e.g. { bookmark: { _nnull: true } } for bookmarks only).`,
		inputSchema: {
			id: z.union([z.string(), z.number()]).optional().describe('Optional preset primary key to fetch a single preset/bookmark'),
			query: itemQuerySchema.optional().describe(
				'Directus query parameters (filter, sort, fields, limit, etc.)',
			),
		},
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	}, async ({ id, query }) => {
		try {
			const result = id === undefined
				? await directus.request(readPresets(query as any))
				: await directus.request(readPreset(id as never, query as any));

			return formatSuccessResponse(result);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	});
}
