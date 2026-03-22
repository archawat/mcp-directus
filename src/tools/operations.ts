import {
	createOperation,
	deleteOperation,
	readOperation,
	readOperations,
	updateOperation,
} from '@directus/sdk';
import * as z from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Directus } from '../directus.js';
import type { Config } from '../config.js';
import {
	formatErrorResponse,
	formatSuccessResponse,
} from '../utils/response.js';

/**
 * IMPORTANT: Operation Chaining Best Practices
 *
 * 1. UNIQUE CONSTRAINT on resolve/reject:
 *    - Each operation can only be resolved/rejected TO by ONE other operation
 *    - Error: "Value for field 'resolve' in collection 'directus_operations' has to be unique"
 *    - Solution: Create operations WITHOUT resolve/reject first, then update the chain
 *
 * 2. CANNOT SET resolve/reject to null:
 *    - The API expects a string (UUID), not null
 *    - Error: "Invalid input: expected string, received null"
 *    - Solution: Don't try to disconnect, just update the chain to point elsewhere
 *
 * 3. WORKFLOW for inserting an operation into an existing chain:
 *    Step 1: Create new operation WITHOUT resolve/reject
 *    Step 2: Update the PREVIOUS operation's resolve to point to the NEW operation
 *    Step 3: Update the NEW operation's resolve to point to the NEXT operation
 *
 * 4. DATA REFERENCES in conditions/operations:
 *    - Use $last.field for data from the immediately previous operation
 *    - Use {{operation_key.field}} for data from any named operation
 *    - Use {{operation_key[0].field}} for first item from item-read results
 */

export function registerOperationTools(server: McpServer, directus: Directus, _config: Config) {
	server.registerTool('directus_read_operations', {
		title: 'Read Operations',
		description: `Read operations, optionally filtered by flow ID. Returns summary fields by default to reduce token usage.
		Use 'fields' to request additional fields. Use 'limit' to control result count (default: 20).`,
		inputSchema: {
			flow_id: z.string().optional().describe('Filter operations by flow ID'),
			fields: z.array(z.string()).optional().describe('Fields to return. Defaults to summary fields: id, name, key, type, flow, position_x, position_y, resolve, reject. Use ["*"] for all fields.'),
			limit: z.number().optional().describe('Maximum number of operations to return (default: 20)'),
		},
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	}, async ({ flow_id, fields, limit }) => {
		try {
			const query: any = {
				fields: fields || ['id', 'name', 'key', 'type', 'flow', 'position_x', 'position_y', 'resolve', 'reject'],
				limit: limit || 20,
			};

			if (flow_id) {
				query.filter = { flow: { _eq: flow_id } };
			}

			const result = await directus.request(readOperations(query));
			return formatSuccessResponse(result);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	});

	server.registerTool('directus_read_operation', {
		title: 'Read Operation',
		description: `Read a specific operation by ID. Returns summary fields by default.
		Use 'fields' to request additional fields like options.`,
		inputSchema: {
			id: z.string().describe('Operation ID'),
			fields: z.array(z.string()).optional().describe('Fields to return. Defaults to: id, name, key, type, flow, options, position_x, position_y, resolve, reject. Use ["*"] for all fields.'),
		},
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	}, async ({ id, fields }) => {
		try {
			const query: any = {
				fields: fields || ['id', 'name', 'key', 'type', 'flow', 'options', 'position_x', 'position_y', 'resolve', 'reject'],
			};
			const result = await directus.request(readOperation(id, query));
			return formatSuccessResponse(result);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	});

	server.registerTool('directus_create_operation', {
		title: 'Create Operation',
		description: `Create a new operation within a flow.

\u26a0\ufe0f CRITICAL: Operation Chaining Rules

1. UNIQUE CONSTRAINT on resolve/reject:
   - Each operation can only be the target of ONE resolve and ONE reject
   - If you try to set resolve to an operation that's already being resolved to, you'll get:
     Error: "Value for field 'resolve' has to be unique"

2. RECOMMENDED WORKFLOW for adding to existing flows:
   Step 1: Create new operation WITHOUT resolve/reject
   Step 2: Use directus_update_operation on PREVIOUS operation to point to new one
   Step 3: Use directus_update_operation on NEW operation to point to next one

3. CANNOT set resolve/reject to null (API requires string UUID)

4. DATA REFERENCES in operation options:
   - $last.field - data from immediately previous operation
   - {{operation_key.field}} - data from any named operation
   - {{operation_key[0].field}} - first item from item-read arrays

Operation Types: condition, item-read, item-create, item-update, item-delete, exec, mail, request, trigger-flow, log, transform`,
		inputSchema: {
			flow: z.string().describe('Flow ID this operation belongs to'),
			name: z.string().optional().describe('Operation name (optional)'),
			key: z.string().describe('Unique key for this operation (used in data references like {{key.field}})'),
			type: z.string().describe('Operation type: condition, item-read, item-create, item-update, item-delete, exec, mail, request, trigger-flow, log, transform'),
			position_x: z.number().default(0).describe('X position in flow diagram'),
			position_y: z.number().default(0).describe('Y position in flow diagram'),
			options: z.record(z.string(), z.any()).optional().describe('Operation-specific options (varies by type)'),
			resolve: z.string().optional().describe('Operation ID to execute on success. WARNING: Must be unique - use directus_update_operation instead if inserting into chain'),
			reject: z.string().optional().describe('Operation ID to execute on failure. WARNING: Must be unique'),
		},
		annotations: {
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: false,
			openWorldHint: false,
		},
	}, async (input) => {
		try {
			const operationData: any = {
				flow: input.flow,
				key: input.key,
				type: input.type,
				position_x: input.position_x,
				position_y: input.position_y,
			};

			if (input.name) operationData.name = input.name;
			if (input.options) operationData.options = input.options;
			if (input.resolve) operationData.resolve = input.resolve;
			if (input.reject) operationData.reject = input.reject;

			const result = await directus.request(createOperation(operationData));
			return formatSuccessResponse(
				result,
				`Operation "${input.key}" (${input.type}) created in flow ${input.flow}.`,
			);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	});

	server.registerTool('directus_update_operation', {
		title: 'Update Operation',
		description: `Update an existing operation. This is the preferred way to modify operation chains.

USE THIS TOOL TO:
- Link operations together (set resolve/reject after creation)
- Insert new operations into existing chains
- Modify operation options or data references

\u26a0\ufe0f IMPORTANT NOTES:
- Cannot set resolve/reject to null (API requires string UUID)
- To "disconnect" an operation, update the chain to point elsewhere
- Each operation can only be resolved/rejected TO by ONE other operation

WORKFLOW for inserting operation between A \u2192 C:
1. Create new operation B (no resolve/reject)
2. directus_update_operation A: set resolve to B's ID
3. directus_update_operation B: set resolve to C's ID`,
		inputSchema: {
			id: z.string().describe('Operation ID to update'),
			data: z.object({
				name: z.string().optional().describe('Operation name'),
				key: z.string().optional().describe('Unique key (used in {{key.field}} references)'),
				type: z.string().optional().describe('Operation type'),
				position_x: z.number().optional().describe('X position in flow diagram'),
				position_y: z.number().optional().describe('Y position in flow diagram'),
				options: z.record(z.string(), z.any()).optional().describe('Operation options - use $last.field or {{key.field}} for data references'),
				resolve: z.string().optional().describe('Operation ID to execute on success (must be unique target)'),
				reject: z.string().optional().describe('Operation ID to execute on failure (must be unique target)'),
			}).describe('Data to update'),
		},
		annotations: {
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	}, async ({ id, data }) => {
		try {
			const result = await directus.request(updateOperation(id, data as any));
			return formatSuccessResponse(
				result,
				`Operation ${id} updated successfully.`,
			);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	});

	server.registerTool('directus_delete_operation', {
		title: 'Delete Operation',
		description: 'Delete an operation. WARNING: This is destructive.',
		inputSchema: {
			id: z.string().describe('Operation ID to delete'),
		},
		annotations: {
			readOnlyHint: false,
			destructiveHint: true,
			idempotentHint: true,
			openWorldHint: false,
		},
	}, async ({ id }) => {
		try {
			await directus.request(deleteOperation(id));
			return formatSuccessResponse(
				null,
				`Operation ${id} deleted successfully.`,
			);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	});
}
