import { z } from 'zod';

// Simplified query schema for MCP to avoid protocol overflow
export const simpleItemQuerySchema = z.object({
	fields: z.array(z.string()).optional().describe('Fields to return'),
	filter: z.record(z.string(), z.any()).optional().describe('Filter object'),
	sort: z.array(z.string()).optional().describe('Sort fields'),
	limit: z.number().optional().describe('Limit results'),
	offset: z.number().optional().describe('Offset for pagination'),
	search: z.string().optional().describe('Search term'),
}).describe('Simplified Directus query parameters');