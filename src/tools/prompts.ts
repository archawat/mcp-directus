import { readItems } from '@directus/sdk';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Directus } from '../directus.js';
import type { Config } from '../config.js';
import { itemQuerySchema } from '../types/query.js';
import { formatErrorResponse, formatSuccessResponse } from '../utils/response.js';

export function registerPromptTools(server: McpServer, directus: Directus, config: Config) {
	if (config.MCP_SYSTEM_PROMPT_ENABLED === 'true') {
		server.registerTool('directus_system_prompt', {
			title: 'System Prompt',
			description:
				'IMPORTANT! Call this tool first. It will retrieve important information about your role.',
			inputSchema: {},
			annotations: {
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false,
			},
		}, async () => {
			return {
				content: [{ type: 'text' as const, text: config.MCP_SYSTEM_PROMPT as string }],
			};
		});
	}

	if (config.DIRECTUS_PROMPTS_COLLECTION_ENABLED === 'true') {
		server.registerTool('directus_get_prompts', {
			title: 'Get Prompts',
			description: 'Retrieve the list of prompts available to the user.',
			inputSchema: {
				query: itemQuerySchema.describe(
					'Directus query parameters (filter, sort, fields, limit, deep, etc. You can use the directus_read_collection_schema tool to get the schema of the collection first.)',
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
				if (!config.DIRECTUS_PROMPTS_COLLECTION) {
					throw new Error('DIRECTUS_PROMPTS_COLLECTION is not set');
				}

				const result = await directus.request(readItems(config.DIRECTUS_PROMPTS_COLLECTION as unknown as never, query as any));
				return formatSuccessResponse(result);
			}
			catch (error) {
				return formatErrorResponse(error);
			}
		});
	}
}
