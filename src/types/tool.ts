import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ZodType } from 'zod';
import type { Config } from '../config.js';
import type { Directus } from '../directus.js';
import type { Schema } from '../types/schema.js';

export interface ToolDefinition<Params = any> {
	name: string;
	description: string;
	inputSchema: ZodType<Params>;
	annotations?: Record<string, any>;
	handler: (
		directus: Directus,
		args: Params,
		ctx?: { schema?: Schema; baseUrl?: string; config?: Config },
	) => Promise<CallToolResult>;
}
