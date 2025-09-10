import type { Config } from '../config.js';
import type { ToolDefinition } from '../types/tool.js';
import { listCollectionsTool, readCollectionDetailsTool } from './collections.js';
import {
	createFieldTool,
	readFieldTool,
	readFieldsTool,
	updateFieldTool,
} from './fields.js';
import { helpTool } from './help.js';
import {
	createItemTool,
	readItemsTool,
	updateItemTool,
} from './items.js';
import { countItemsTool, getItemSummaryTool } from './pagination.js';
import schemaTool from './schema.js';
import { usersMeTool } from './users.js';

export const getTools = (config: Config) => {
	const toolList: ToolDefinition[] = [
		// Help and guidance
		helpTool,                 // Usage guide for token efficiency
		
		// Lightweight discovery tools (token-efficient)
		listCollectionsTool,      // Just collection names (~50 tokens)
		countItemsTool,           // Count items without fetching (~20 tokens)
		getItemSummaryTool,       // Essential fields only (~200-500 tokens)
		
		// Targeted schema tools
		readCollectionDetailsTool, // Single collection schema (~100-500 tokens)
		schemaTool,               // Full schema (LARGE - use with filters!)
		
		// Field management tools (with safe defaults)
		readFieldsTool,           // Read field definitions (use sparingly)
		readFieldTool,            // Read single field definition
		createFieldTool,          // Create fields (with default interfaces)
		updateFieldTool,          // Update existing fields
		
		// Core functionality with limits
		usersMeTool,              // Get current user (~50 tokens)
		readItemsTool,            // Read items (default limit: 5)
		createItemTool,           // Create items
		updateItemTool,           // Update items
		// deleteItemTool is disabled by default for safety
	];

	// Filter the list of available tools based on config
	const availableTools = toolList.filter(
		(tool) => !config.DISABLE_TOOLS.includes(tool.name),
	);

	return availableTools;
};
