import type { Config } from '../config.js';
import type { ToolDefinition } from '../types/tool.js';
import { createCollectionTool, listCollectionsTool, readCollectionDetailsTool } from './collections.js';
import {
	createFieldTool,
	readFieldTool,
	readFieldsTool,
	updateFieldTool,
} from './fields.js';
import {
	createFlowTool,
	deleteFlowTool,
	readFlowTool,
	readFlowsTool,
	triggerFlowTool,
	updateFlowTool,
} from './flows.js';
import { helpTool } from './help.js';
import {
	createItemTool,
	readItemsTool,
	updateItemTool,
} from './items.js';
import { countItemsTool, getItemSummaryTool } from './pagination.js';
import {
	createOperationTool,
	deleteOperationTool,
	readOperationTool,
	readOperationsTool,
	updateOperationTool,
} from './operations.js';
import { createSystemPrompt, getPromptsTool } from './prompts.js';
import {
	createRelationTool,
	deleteRelationTool,
	readRelationTool,
	readRelationsTool,
	updateRelationTool,
} from './relations.js';
import schemaTool from './schema.js';
import { usersMeTool } from './users.js';

export const getTools = (config: Config) => {
	const toolList: ToolDefinition[] = [
		// System initialization (if enabled)
		...(config.MCP_SYSTEM_PROMPT_ENABLED === 'true' ? [createSystemPrompt(config)] : []),
		
		// Help and guidance
		helpTool,                 // Usage guide for token efficiency
		
		// Lightweight discovery tools (token-efficient)
		listCollectionsTool,      // Just collection names (~50 tokens)
		countItemsTool,           // Count items without fetching (~20 tokens)
		getItemSummaryTool,       // Essential fields only (~200-500 tokens)
		
		// Targeted schema tools
		readCollectionDetailsTool, // Single collection schema (~100-500 tokens)
		schemaTool,               // Full schema (LARGE - use with filters!)

		// Collection management
		createCollectionTool,     // Create new collections
		
		// Field management tools (with safe defaults)
		readFieldsTool,           // Read field definitions (use sparingly)
		readFieldTool,            // Read single field definition
		createFieldTool,          // Create fields (with default interfaces)
		updateFieldTool,          // Update existing fields

		// Relation management tools
		readRelationsTool,        // Read all relations or filter by collection
		readRelationTool,         // Read specific relation
		createRelationTool,       // Create relation after field creation
		updateRelationTool,       // Update existing relation
		deleteRelationTool,       // Delete relation (disabled by default)

		// Flow automation tools
		readFlowsTool,            // Read manually triggerable flows
		readFlowTool,             // Read specific flow by ID
		createFlowTool,           // Create new automation flow
		updateFlowTool,           // Update existing flow
		deleteFlowTool,           // Delete flow (disabled by default)
		triggerFlowTool,          // Trigger a flow with validation

		// Operation management tools (flow steps)
		readOperationsTool,       // Read operations (can filter by flow)
		readOperationTool,        // Read specific operation by ID
		createOperationTool,      // Create operation within a flow
		updateOperationTool,      // Update existing operation
		deleteOperationTool,      // Delete operation (disabled by default)

		// Core functionality with limits
		usersMeTool,              // Get current user (~50 tokens)
		readItemsTool,            // Read items (default limit: 5)
		createItemTool,           // Create items
		updateItemTool,           // Update items
		// deleteItemTool is disabled by default for safety
		
		// Prompts collection (if enabled)
		...(config.DIRECTUS_PROMPTS_COLLECTION_ENABLED === 'true' ? [getPromptsTool(config)] : []),
	];

	// Filter the list of available tools based on config
	const availableTools = toolList.filter(
		(tool) => !config.DISABLE_TOOLS.includes(tool.name),
	);

	return availableTools;
};
