#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createConfig } from './config.js';
import { authenticateDirectus, createDirectus } from './directus.js';
import { registerAllTools } from './tools/index.js';
import { initSchema } from './utils/lazy-schema.js';

async function main() {
	const config = createConfig();
	const directus = createDirectus(config);

	await authenticateDirectus(directus, config);

	// Initialize lazy schema loader with directus client and config
	initSchema(directus, config);

	const server = new McpServer(
		{
			name: 'directus-mcp-server',
			version: '2.0.0',
		},
		{
			capabilities: {
				tools: {},
			},
		},
	);

	// Register all tools — SDK handles dispatch automatically
	registerAllTools(server, directus, config);

	// Disable tools specified in config
	const registeredTools = (server as any)._registeredTools as Record<string, { disable: () => void }> | undefined;
	if (registeredTools) {
		for (const toolName of config.DISABLE_TOOLS) {
			if (registeredTools[toolName]) {
				registeredTools[toolName].disable();
			}
		}
	}

	const transport = new StdioServerTransport();

	const connectPromise = server.connect(transport);
	const timeoutPromise = new Promise<never>((_, reject) => {
		setTimeout(() => reject(new Error('MCP connection timeout after 30 seconds')), 30000);
	});

	await Promise.race([connectPromise, timeoutPromise]);
}

// Add process error handlers to prevent crashes
process.on('uncaughtException', (error) => {
	console.error('Uncaught exception:', error);
	process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
	console.error('Unhandled rejection at:', promise, 'reason:', reason);
	process.exit(1);
});

(async () => {
	try {
		await main();
	}
	catch (error) {
		console.error('Fatal error in main():', error);
		process.exit(1);
	}
})();
