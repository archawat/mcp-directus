import { createComment, readComments, updateComment } from '@directus/sdk';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Directus } from '../directus.js';
import type { Config } from '../config.js';
import { itemQuerySchema } from '../types/query.js';
import { formatErrorResponse, formatSuccessResponse } from '../utils/response.js';

export function registerCommentTools(server: McpServer, directus: Directus, _config: Config) {
	server.registerTool('directus_read_comments', {
		title: 'Read Comments',
		description: 'Fetch comments from any Directus collection item.',
		inputSchema: {
			query: itemQuerySchema.describe(
				'Directus query parameters (filter, sort, fields, limit, etc.)',
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
			const result = await directus.request(
				readComments(query as any),
			);
			return formatSuccessResponse(result);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	});

	server.registerTool('directus_upsert_comment', {
		title: 'Create or Update Comment',
		description: `Create or update a comment on a collection item. When mentioning users:
	1. First use the directus_read_users tool to retrieve the user's ID
	2. Then format the mention using the exact syntax: @[user-uuid]
	3. Include this formatted mention within your comment text
	Example: "Hey @8cc67ebc-3c52-475a-9ae6-fba26963a9ad, can you take a look at this?"
	IMPORTANT: User mentions MUST use the exact pattern @uuid without any additional characters or formatting. Keep all comments brief and to the point - no more than 2-3 sentences when possible. Focus on essential information only.`,
		inputSchema: {
			id: z.string().optional().describe('The id of the comment to update. If not provided, a new comment will be created.'),
			collection: z.string().describe('The name of the collection the item belongs to'),
			item: z.union([z.string(), z.number()]).describe('The primary key of the item to comment on.'),
			comment: z.string().describe('The comment text.'),
		},
		annotations: {
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: false,
			openWorldHint: false,
		},
	}, async ({ id, collection, item, comment }) => {
		try {
			const result = await (id
				? directus.request(
						updateComment(id, {
							collection,
							item: String(item),
							comment,
						} as any),
					)
				: directus.request(
						createComment({
							collection,
							item: String(item),
							comment,
						} as any),
					));

			return formatSuccessResponse(result);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	});
}
