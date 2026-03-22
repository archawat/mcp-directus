import {
	createFlow,
	deleteFlow,
	readFlow,
	readFlows,
	triggerFlow,
	updateFlow,
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
 * Manual trigger options schema (for reference):
 * - collections: string[] - Collections that can trigger this flow
 * - location: "both" | "collection" | "item" - Where to show the trigger button
 * - requireSelection: boolean - Whether item selection is required on collection page
 * - async: boolean - If true, flow executes asynchronously
 * - requireConfirmation: boolean - If true, shows a confirmation dialog
 * - confirmationDescription: string - Custom text for confirmation dialog
 * - fields: array - Input fields for user data in confirmation dialog
 */

export function registerFlowTools(server: McpServer, directus: Directus, _config: Config) {
	server.registerTool('directus_read_flows', {
		title: 'Read Flows',
		description: `Fetch flows from Directus. Returns summary fields by default to reduce token usage.
		Use 'fields' to request additional fields. Use 'limit' to control result count (default: 20).`,
		inputSchema: {
			trigger: z.enum(['manual', 'webhook', 'schedule', 'operation', 'event']).optional()
				.describe('Optional filter by trigger type. If not specified, returns all flows.'),
			fields: z.array(z.string()).optional()
				.describe('Fields to return. Defaults to summary fields: id, name, status, trigger, description. Use ["*"] for all fields.'),
			limit: z.number().optional()
				.describe('Maximum number of flows to return (default: 20)'),
		},
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	}, async ({ trigger, fields, limit }) => {
		try {
			const query: any = {
				fields: fields || ['id', 'name', 'status', 'trigger', 'description'],
				limit: limit || 20,
			};

			// Only add filter if trigger is specified
			if (trigger) {
				query.filter = {
					trigger: {
						_eq: trigger,
					},
				};
			}

			const result = await directus.request(readFlows(query));

			return formatSuccessResponse(result);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	});

	server.registerTool('directus_read_flow', {
		title: 'Read Flow',
		description: `Retrieve a specific flow by ID. Returns summary fields by default.
		Use 'fields' to request additional fields like options or operations.`,
		inputSchema: {
			id: z.string().describe('Flow ID'),
			fields: z.array(z.string()).optional()
				.describe('Fields to return. Defaults to: id, name, status, trigger, description, options, operation. Use ["*"] for all fields.'),
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
				fields: fields || ['id', 'name', 'status', 'trigger', 'description', 'options', 'operation'],
			};
			const result = await directus.request(readFlow(id, query));
			return formatSuccessResponse(result);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	});

	server.registerTool('directus_create_flow', {
		title: 'Create Flow',
		description: `Create a new automation flow in Directus.

For manual trigger flows, use the following options structure:
- location: "both" | "collection" | "item" - where the trigger button appears
- requireSelection: boolean - whether items must be selected (only for collection/both location)
- collections: string[] - which collections show the trigger button
- async: boolean - whether flow runs asynchronously
- requireConfirmation: boolean - whether to show confirmation dialog
- confirmationDescription: string - text in confirmation dialog
- fields: array - input fields for user data in confirmation dialog`,
		inputSchema: {
			name: z.string().describe('Flow name'),
			icon: z.string().optional().describe('Icon name (e.g., "bolt")'),
			color: z.string().optional().describe('Color hex code'),
			description: z.string().optional().describe('Flow description'),
			status: z.enum(['active', 'inactive']).optional().default('active').describe('Flow status'),
			trigger: z.enum(['manual', 'webhook', 'schedule', 'operation', 'event']).optional()
				.describe('Trigger type'),
			accountability: z.enum(['all', 'activity']).optional().default('all').describe('Accountability level'),
			options: z.record(z.string(), z.any()).optional()
				.describe('Flow options. For manual triggers, includes: location ("both"|"collection"|"item"), requireSelection (boolean), collections (string[]), async (boolean), requireConfirmation (boolean), confirmationDescription (string), fields (array)'),
			operation: z.string().optional().describe('ID of the first operation to execute in this flow'),
		},
		annotations: {
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: false,
			openWorldHint: false,
		},
	}, async (input) => {
		try {
			const flowData: any = {
				name: input.name,
				status: input.status || 'active',
				accountability: input.accountability || 'all',
			};

			if (input.icon) flowData.icon = input.icon;
			if (input.color) flowData.color = input.color;
			if (input.description) flowData.description = input.description;
			if (input.trigger) flowData.trigger = input.trigger;
			if (input.options) flowData.options = input.options;
			if (input.operation) flowData.operation = input.operation;

			const result = await directus.request(createFlow(flowData));
			return formatSuccessResponse(
				result,
				`Flow "${input.name}" created successfully.`,
			);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	});

	server.registerTool('directus_update_flow', {
		title: 'Update Flow',
		description: `Update an existing flow. Use this to link the first operation to the flow after creating it.

For manual trigger flows, options can include:
- location: "both" | "collection" | "item" - where the trigger button appears
- requireSelection: boolean - whether items must be selected (only for collection/both location)
- collections: string[] - which collections show the trigger button
- async: boolean - whether flow runs asynchronously
- requireConfirmation: boolean - whether to show confirmation dialog`,
		inputSchema: {
			id: z.string().describe('Flow ID to update'),
			data: z.object({
				name: z.string().optional().describe('Flow name'),
				icon: z.string().optional().describe('Icon name'),
				color: z.string().optional().describe('Color hex code'),
				description: z.string().optional().describe('Flow description'),
				status: z.enum(['active', 'inactive']).optional().describe('Flow status'),
				trigger: z.enum(['manual', 'webhook', 'schedule', 'operation', 'event']).optional()
					.describe('Trigger type'),
				accountability: z.enum(['all', 'activity']).optional().describe('Accountability level'),
				options: z.record(z.string(), z.any()).optional()
					.describe('Flow options. For manual triggers: location ("both"|"collection"|"item"), requireSelection (boolean), collections (string[]), async (boolean), requireConfirmation (boolean)'),
				operation: z.string().optional().describe('ID of the first operation to execute in this flow'),
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
			const result = await directus.request(updateFlow(id, data as any));
			return formatSuccessResponse(
				result,
				`Flow "${id}" updated successfully.`,
			);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	});

	server.registerTool('directus_delete_flow', {
		title: 'Delete Flow',
		description: 'Delete a flow. WARNING: This is destructive.',
		inputSchema: {
			id: z.string().describe('Flow ID to delete'),
		},
		annotations: {
			readOnlyHint: false,
			destructiveHint: true,
			idempotentHint: true,
			openWorldHint: false,
		},
	}, async ({ id }) => {
		try {
			await directus.request(deleteFlow(id));
			return formatSuccessResponse(
				null,
				`Flow "${id}" deleted successfully.`,
			);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	});

	server.registerTool('directus_trigger_flow', {
		title: 'Trigger Flow',
		description: `Trigger a flow by ID. Rules:
	  - Always call directus_read_flows first and include the FULL flow definition in your reasoning
	  - Always explicitly check if the flow requires selection (options.requireSelection !== false)
	  - Always verify the collection is in the flow's collections list
	  - Always provide a complete data object with all required fields
	  - NEVER skip providing keys when requireSelection is true or undefined`,
		inputSchema: {
			flowDefinition: z
				.record(z.string(), z.any())
				.describe('The full flow definition from the read-flows call.'),
			flowId: z.string().describe('The ID of the flow to trigger'),
			collection: z
				.string()
				.describe('The collection of the items to trigger the flow on.'),
			keys: z
				.array(z.string())
				.describe(
					'The primary keys of the items to trigger the flow on. If the flow requireSelection field is true, you must provide the keys.',
				),
			data: z
				.record(z.string(), z.any())
				.optional()
				.describe(
					'The data to pass to the flow. Should be an object with keys that match the flow *options.fields.fields* property',
				),
		},
		annotations: {
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: false,
			openWorldHint: false,
		},
	}, async (input) => {
		try {
			const { flowDefinition, flowId, collection, keys, data } = input;

			// Validate flow existence
			if (!flowDefinition) {
				throw new Error('Flow definition must be provided');
			}

			// Validate flow ID matches
			if (flowDefinition['id'] !== flowId) {
				throw new Error(
					`Flow ID mismatch: provided ${flowId} but definition has ${flowDefinition['id']}`,
				);
			}

			// Validate collection is valid for this flow
			if (!flowDefinition['options'].collections.includes(collection)) {
				throw new Error(
					`Invalid collection "${collection}". This flow only supports: ${flowDefinition['options'].collections.join(', ')}`,
				);
			}

			// Check if selection is required
			const requiresSelection =
				flowDefinition['options'].requireSelection !== false;

			if (requiresSelection && (!keys || keys.length === 0)) {
				throw new Error(
					'This flow requires selecting at least one item, but no keys were provided',
				);
			}

			// Validate required fields
			if (flowDefinition['options'].fields) {
				const requiredFields = flowDefinition['options'].fields
					.filter((field: any) => field.meta?.required)
					.map((field: any) => field.field);

				for (const fieldName of requiredFields) {
					if (!data || !(fieldName in data)) {
						throw new Error(`Missing required field: ${fieldName}`);
					}
				}
			}

			// All validations passed, trigger the flow
			const result = await directus.request(
				triggerFlow('POST', flowId, { ...data, collection, keys } as any),
			);
			return formatSuccessResponse(result);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	});
}
