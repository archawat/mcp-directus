import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Config } from '../config.js';
import type { Directus } from '../directus.js';
import { registerCollectionTools } from './collections.js';
import { registerCommentTools } from './comments.js';
import { registerFieldTools } from './fields.js';
import { registerFileTools } from './files.js';
import { registerFlowTools } from './flows.js';
import { registerHelpTools } from './help.js';
import { registerItemTools } from './items.js';
import { registerMarkdownTools } from './markdown.js';
import { registerOperationTools } from './operations.js';
import { registerPaginationTools } from './pagination.js';
import { registerPresetTools } from './presets.js';
import { registerPromptTools } from './prompts.js';
import { registerRelationTools } from './relations.js';
import { registerSchemaTools } from './schema.js';
import { registerUserTools } from './users.js';

/**
 * Register all Directus tools on the MCP server.
 * Tools listed in config.DISABLE_TOOLS will be disabled after registration.
 */
export function registerAllTools(server: McpServer, directus: Directus, config: Config) {
	// Prompts & help (conditionally registered based on config)
	registerPromptTools(server, directus, config);
	registerHelpTools(server, directus, config);

	// Schema & discovery (lightweight)
	registerCollectionTools(server, directus, config);
	registerSchemaTools(server, directus, config);
	registerPaginationTools(server, directus, config);

	// Field & relation management
	registerFieldTools(server, directus, config);
	registerRelationTools(server, directus, config);

	// Item CRUD
	registerItemTools(server, directus, config);

	// Flow automation
	registerFlowTools(server, directus, config);
	registerOperationTools(server, directus, config);

	// Users & comments
	registerUserTools(server, directus, config);
	registerPresetTools(server, directus, config);
	registerCommentTools(server, directus, config);

	// Files & assets
	registerFileTools(server, directus, config);

	// Utilities
	registerMarkdownTools(server, directus, config);
}
