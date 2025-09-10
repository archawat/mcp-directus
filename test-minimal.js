#!/usr/bin/env node

// Minimal test to identify what's causing the crash
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

async function main() {
  console.log('Starting minimal MCP server...');
  
  const server = new Server(
    {
      name: 'Test MCP Server',
      version: '0.0.1',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Add a simple tool
  server.setRequestHandler('tools/list', async () => {
    return {
      tools: [
        {
          name: 'test-tool',
          description: 'A simple test tool',
          inputSchema: {
            type: 'object',
            properties: {
              message: { type: 'string' }
            }
          }
        }
      ]
    };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log('Minimal server connected');
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});