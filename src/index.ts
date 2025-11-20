#!/usr/bin/env node
import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createConfig } from './config.js';
import { authenticateDirectus, createDirectus } from './directus.js';
import { getTools } from './tools/index.js';
import { toMpcTools } from './utils/to-mpc-tools.js';

// Store config and directus client globally for tools to use
let globalDirectus: any = null;
let globalConfig: any = {};

// Export for tools to access
export function getGlobalDirectus() {
	return globalDirectus;
}

export function getGlobalConfig() {
	return globalConfig;
}

async function main() {
	const config = createConfig();
	globalConfig = config; // Store config globally
	const directus = createDirectus(config);
	
	await authenticateDirectus(directus, config);
	globalDirectus = directus;
	
	const availableTools = getTools(config);

	const server = new Server(
		{
			name: 'Directus MCP Server',
			version: '0.0.1',
		},
		{
			capabilities: {
				tools: {},
			},
		},
	);

	// Manage tool requests
	server.setRequestHandler(
		CallToolRequestSchema,
		async (request: CallToolRequest) => {
			
			try {
				// Find the tool definition among ALL tools
				const tool = availableTools.find((definition) => {
					return definition.name === request.params.name;
				});

				if (!tool) {
					throw new Error(`Unknown tool: ${request.params.name}`);
				}

				// Proceed with execution if permission check passes
				const { inputSchema, handler } = tool;
				const args = inputSchema.parse(request.params.arguments);
				
				// No schema passed - tools will fetch what they need on-demand
				const result = await handler(directus, args, { 
					baseUrl: config.DIRECTUS_URL,
					config: config
				});
				return result;
			}
			catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : JSON.stringify(error);

				return {
					content: [
						{
							type: 'text',
							text: errorMessage,
						},
					],
					isError: true,
				};
			}
		},
	);

	server.setRequestHandler(ListToolsRequestSchema, async () => {
		const tools = toMpcTools(availableTools);
		return { tools };
	});

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

// Wrap in IIFE to use top-level await
(async () => {
	try {
		await main();
	}
	catch (error) {
		console.error('Fatal error in main():', error);
		process.exit(1);
	}
})();
