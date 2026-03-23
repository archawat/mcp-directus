import { readMe, readUsers } from '@directus/sdk';
import * as z from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Directus } from '../directus.js';
import type { Config } from '../config.js';
import { itemQuerySchema } from '../types/query.js';
import { formatErrorResponse, formatSuccessResponse } from '../utils/response.js';

export function registerUserTools(server: McpServer, directus: Directus, _config: Config) {
	server.registerTool('directus_users_me', {
		title: 'Current User',
		description: 'Retrieve information about the current user',
		inputSchema: {
			fields: z.array(z.string()).describe('Fields to return for the current user'),
		},
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	}, async ({ fields }) => {
		try {
			const me = await directus.request(readMe({ fields }));
			return { content: [{ type: 'text' as const, text: JSON.stringify(me) }] };
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	});

	server.registerTool('directus_read_users', {
		title: 'Read Users',
		description: 'Retrieve information about users.',
		inputSchema: {
			query: itemQuerySchema.describe(
				'Directus query parameters (filter, sort, fields, limit, deep, etc. You can use the read-collections tool to get the schema of the collection first.)',
			),
		},
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	}, async ({ query }) => {
		try {
			const users = await directus.request(readUsers(query as any));
			return formatSuccessResponse(users);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	});
}
