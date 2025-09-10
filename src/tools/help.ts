import * as z from 'zod';
import { defineTool } from '../utils/define.js';

export const helpTool = defineTool('help-token-efficient', {
	description: 'Get help on using tools efficiently to minimize token usage.',
	inputSchema: z.object({}),
	handler: async () => {
		const guide = `
TOKEN-EFFICIENT DIRECTUS WORKFLOW:

1. DISCOVER (Lightweight - ~50 tokens each):
   • list-collections → Get collection names
   • count-items → Count items without fetching data

2. EXPLORE (Targeted - ~200-500 tokens each):  
   • get-item-summary → Get minimal data with essential fields only
   • read-collection-schema → Get schema for specific collection

3. QUERY (Controlled - use limits!):
   • read-items → DEFAULT LIMIT: 5 items (use 'limit' parameter)
   • Use 'fields' parameter to get only needed columns
   • Use 'offset' for pagination

4. AVOID (Token-heavy):
   • read-collections without filters (29k+ tokens)
   • read-items without limit (10k+ tokens)

BEST PRACTICES:
- Always use list-collections first to find collection names
- Use count-items to plan pagination  
- Specify 'fields' array to limit columns
- Keep limits under 10-20 items per call
- Use get-item-summary for quick overviews
`;

		return {
			content: [{
				type: 'text',
				text: guide.trim()
			}]
		};
	},
});