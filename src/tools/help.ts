import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Directus } from '../directus.js';
import type { Config } from '../config.js';

export function registerHelpTools(server: McpServer, _directus: Directus, _config: Config) {
	server.registerTool('directus_help', {
		title: 'Help',
		description: 'Get help on using tools efficiently to minimize token usage.',
		inputSchema: {},
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	}, async () => {
		const guide = `
TOKEN-EFFICIENT DIRECTUS WORKFLOW:

1. DISCOVER (Lightweight - ~50 tokens each):
   • directus_list_collections → Get collection names
   • directus_count_items → Count items without fetching data

2. EXPLORE (Targeted - ~200-500 tokens each):
   • directus_get_item_summary → Get minimal data with essential fields only
   • directus_read_collection_schema → Get schema for specific collection

3. QUERY (Controlled - use limits!):
   • directus_read_items → DEFAULT LIMIT: 5 items (use 'limit' parameter)
   • Use 'fields' parameter to get only needed columns
   • Use 'offset' for pagination

4. AVOID (Token-heavy):
   • directus_read_collections without filters (29k+ tokens)
   • directus_read_items without limit (10k+ tokens)

BEST PRACTICES:
- Always use directus_list_collections first to find collection names
- Use directus_count_items to plan pagination
- Specify 'fields' array to limit columns
- Keep limits under 10-20 items per call
- Use directus_get_item_summary for quick overviews
`;

		return {
			content: [{
				type: 'text' as const,
				text: guide.trim(),
			}],
		};
	});
}
