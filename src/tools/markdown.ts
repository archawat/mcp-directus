import * as DOMPurify from 'isomorphic-dompurify';
import { marked } from 'marked';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Directus } from '../directus.js';
import type { Config } from '../config.js';
import { formatErrorResponse } from '../utils/response.js';

export async function markdownToHtml(markdown: string) {
	return DOMPurify.sanitize(await marked.parse(markdown));
}

export async function htmlToMarkdown(html: string) {
	return await marked.parse(html);
}

export function registerMarkdownTools(server: McpServer, _directus: Directus, _config: Config) {
	server.registerTool('directus_markdown', {
		title: 'Markdown Tool',
		description:
			'Convert HTML to Markdown or Markdown to HTML.',
		inputSchema: {
			html: z.string().optional().describe('HTML string to convert to Markdown'),
			markdown: z.string().optional().describe('Markdown string to convert to HTML'),
		},
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	}, async ({ html, markdown: md }) => {
		try {
			if (!html && !md) {
				return formatErrorResponse(new Error('Either html or markdown must be provided'));
			}

			if (html) {
				return {
					content: [{ type: 'text' as const, text: await htmlToMarkdown(html) }],
				};
			}

			if (md) {
				return {
					content: [{ type: 'text' as const, text: await markdownToHtml(md) }],
				};
			}

			return formatErrorResponse(new Error('No input provided'));
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	});
}
