import {
	createFlow,
	deleteFlow,
	readFlow,
	readFlows,
	triggerFlow,
	updateFlow
} from '@directus/sdk';

import * as z from 'zod';
import { defineTool } from '../utils/define.js';
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

export const readFlowsTool = defineTool('read-flows', {
	description: 'Fetch flows from Directus. By default returns all flows. Optionally filter by trigger type.',
	annotations: {
		title: 'Read Flows',
		readOnlyHint: true,
	},
	inputSchema: z.object({
		trigger: z.enum(['manual', 'webhook', 'schedule', 'operation', 'event']).optional()
			.describe('Optional filter by trigger type. If not specified, returns all flows.'),
	}),
	handler: async (directus, { trigger }) => {
		try {
			const query: any = {};

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
	},
});

export const triggerFlowTool = defineTool('trigger-flow', {
	description: `Trigger a flow by ID. Rules:
	  - Always call read-flows first and include the FULL flow definition in your reasoning
	  - Always explicitly check if the flow requires selection (options.requireSelection !== false)
	  - Always verify the collection is in the flow's collections list
	  - Always provide a complete data object with all required fields
	  - NEVER skip providing keys when requireSelection is true or undefined`,
	annotations: {
		title: 'Trigger Flow',
	},

	inputSchema: z.object({
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
	}),

	handler: async (directus, input) => {
		try {
			const { flowDefinition, flowId, collection, keys, data } = input;

			// Validate flow existence
			if (!flowDefinition) {
				throw new Error('Flow definition must be provided');
			}

			// Validate flow ID matches
			if (flowDefinition.id !== flowId) {
				throw new Error(
					`Flow ID mismatch: provided ${flowId} but definition has ${flowDefinition.id}`,
				);
			}

			// Validate collection is valid for this flow
			if (!flowDefinition.options.collections.includes(collection)) {
				throw new Error(
					`Invalid collection "${collection}". This flow only supports: ${flowDefinition.options.collections.join(', ')}`,
				);
			}

			// Check if selection is required
			const requiresSelection =
				flowDefinition.options.requireSelection !== false;

			if (requiresSelection && (!keys || keys.length === 0)) {
				throw new Error(
					'This flow requires selecting at least one item, but no keys were provided',
				);
			}

			// Validate required fields
			if (flowDefinition.options.fields) {
				const requiredFields = flowDefinition.options.fields
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
				triggerFlow('POST', flowId, { ...data, collection, keys }),
			);
			return formatSuccessResponse(result);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	},
});

export const readFlowTool = defineTool('read-flow', {
	description: 'Retrieve a specific flow by ID.',
	annotations: {
		title: 'Read Flow',
		readOnlyHint: true,
	},
	inputSchema: z.object({
		id: z.string().describe('Flow ID'),
	}),
	handler: async (directus, { id }) => {
		try {
			const result = await directus.request(readFlow(id));
			return formatSuccessResponse(result);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	},
});

export const createFlowTool = defineTool('create-flow', {
	description: `Create a new automation flow in Directus.

For manual trigger flows, use the following options structure:
- location: "both" | "collection" | "item" - where the trigger button appears
- requireSelection: boolean - whether items must be selected (only for collection/both location)
- collections: string[] - which collections show the trigger button
- async: boolean - whether flow runs asynchronously
- requireConfirmation: boolean - whether to show confirmation dialog
- confirmationDescription: string - text in confirmation dialog
- fields: array - input fields for user data in confirmation dialog`,
	annotations: {
		title: 'Create Flow',
	},
	inputSchema: z.object({
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
	}),
	handler: async (directus, input) => {
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
				`Flow "${input.name}" created successfully.`
			);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	},
});

export const updateFlowTool = defineTool('update-flow', {
	description: `Update an existing flow. Use this to link the first operation to the flow after creating it.

For manual trigger flows, options can include:
- location: "both" | "collection" | "item" - where the trigger button appears
- requireSelection: boolean - whether items must be selected (only for collection/both location)
- collections: string[] - which collections show the trigger button
- async: boolean - whether flow runs asynchronously
- requireConfirmation: boolean - whether to show confirmation dialog`,
	annotations: {
		title: 'Update Flow',
	},
	inputSchema: z.object({
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
	}),
	handler: async (directus, { id, data }) => {
		try {
			const result = await directus.request(updateFlow(id, data));
			return formatSuccessResponse(
				result,
				`Flow "${id}" updated successfully.`
			);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	},
});

export const deleteFlowTool = defineTool('delete-flow', {
	description: 'Delete a flow. WARNING: This is destructive.',
	annotations: {
		title: 'Delete Flow',
		destructiveHint: true,
	},
	inputSchema: z.object({
		id: z.string().describe('Flow ID to delete'),
	}),
	handler: async (directus, { id }) => {
		try {
			await directus.request(deleteFlow(id));
			return formatSuccessResponse(
				null,
				`Flow "${id}" deleted successfully.`
			);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	},
});
