import {
	createOperation,
	deleteOperation,
	readOperation,
	readOperations,
	updateOperation,
} from '@directus/sdk';
import * as z from 'zod';
import { defineTool } from '../utils/define.js';
import {
	formatErrorResponse,
	formatSuccessResponse,
} from '../utils/response.js';

export const readOperationsTool = defineTool('read-operations', {
	description: 'Read all operations or filter by flow ID.',
	annotations: {
		title: 'Read Operations',
		readOnlyHint: true,
	},
	inputSchema: z.object({
		flow_id: z.string().optional().describe('Filter operations by flow ID'),
	}),
	handler: async (directus, { flow_id }) => {
		try {
			const query = flow_id ? { filter: { flow: { _eq: flow_id } } } : {};
			const result = await directus.request(readOperations(query));
			return formatSuccessResponse(result);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	},
});

export const readOperationTool = defineTool('read-operation', {
	description: 'Read a specific operation by ID.',
	annotations: {
		title: 'Read Operation',
		readOnlyHint: true,
	},
	inputSchema: z.object({
		id: z.string().describe('Operation ID'),
	}),
	handler: async (directus, { id }) => {
		try {
			const result = await directus.request(readOperation(id));
			return formatSuccessResponse(result);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	},
});

export const createOperationTool = defineTool('create-operation', {
	description: 'Create a new operation within a flow. Operations are the steps/actions that execute in a flow.',
	annotations: {
		title: 'Create Operation',
	},
	inputSchema: z.object({
		flow: z.string().describe('Flow ID this operation belongs to'),
		name: z.string().optional().describe('Operation name (optional)'),
		key: z.string().describe('Unique key for this operation'),
		type: z.string().describe('Operation type (e.g., "condition", "item-create", "transform", "request", "log", "mail")'),
		position_x: z.number().default(0).describe('X position in flow diagram'),
		position_y: z.number().default(0).describe('Y position in flow diagram'),
		options: z.record(z.string(), z.any()).optional().describe('Operation-specific options (varies by type)'),
		resolve: z.string().optional().describe('Operation ID to execute on success (next step)'),
		reject: z.string().optional().describe('Operation ID to execute on failure'),
	}),
	handler: async (directus, input) => {
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
				`Operation "${input.key}" (${input.type}) created in flow ${input.flow}.`
			);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	},
});

export const updateOperationTool = defineTool('update-operation', {
	description: 'Update an existing operation.',
	annotations: {
		title: 'Update Operation',
	},
	inputSchema: z.object({
		id: z.string().describe('Operation ID to update'),
		data: z.object({
			name: z.string().optional().describe('Operation name'),
			key: z.string().optional().describe('Unique key'),
			type: z.string().optional().describe('Operation type'),
			position_x: z.number().optional().describe('X position'),
			position_y: z.number().optional().describe('Y position'),
			options: z.record(z.string(), z.any()).optional().describe('Operation options'),
			resolve: z.string().optional().describe('Success operation ID'),
			reject: z.string().optional().describe('Failure operation ID'),
		}).describe('Data to update'),
	}),
	handler: async (directus, { id, data }) => {
		try {
			const result = await directus.request(updateOperation(id, data));
			return formatSuccessResponse(
				result,
				`Operation ${id} updated successfully.`
			);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	},
});

export const deleteOperationTool = defineTool('delete-operation', {
	description: 'Delete an operation. WARNING: This is destructive.',
	annotations: {
		title: 'Delete Operation',
		destructiveHint: true,
	},
	inputSchema: z.object({
		id: z.string().describe('Operation ID to delete'),
	}),
	handler: async (directus, { id }) => {
		try {
			await directus.request(deleteOperation(id));
			return formatSuccessResponse(
				null,
				`Operation ${id} deleted successfully.`
			);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	},
});
