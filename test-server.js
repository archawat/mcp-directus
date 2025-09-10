#!/usr/bin/env node

// Simple test to check MCP server tool execution
import { spawn } from 'child_process';

console.log('Testing MCP server with fake data...');

const server = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    DIRECTUS_URL: 'https://demo.directus.io',
    DIRECTUS_TOKEN: 'fake_token_for_test',
    MAX_SCHEMA_COLLECTIONS: '5',
    MAX_SCHEMA_FIELDS_PER_COLLECTION: '10'
  }
});

server.stdout.on('data', (data) => {
  console.log('STDOUT:', data.toString());
});

server.stderr.on('data', (data) => {
  console.log('STDERR:', data.toString());
});

server.on('close', (code) => {
  console.log(`Server exited with code: ${code}`);
});

// Give it 5 seconds then kill
setTimeout(() => {
  console.log('Killing server...');
  server.kill();
}, 5000);