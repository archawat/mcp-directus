import { Buffer } from 'node:buffer';
import {
	importFile,
	readAssetArrayBuffer,
	readFile,
	readFiles,
	readFolders,
	updateFilesBatch,
} from '@directus/sdk';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Directus } from '../directus.js';
import type { Config } from '../config.js';
import { FileSchema } from '../types/files.js';
import { itemQuerySchema } from '../types/query.js';
import {
	formatErrorResponse,
	formatResourceResponse,
	formatSuccessResponse,
} from '../utils/response.js';

export function registerFileTools(server: McpServer, directus: Directus, _config: Config) {
	server.registerTool('directus_read_files', {
		title: 'Read Files',
		description:
			"Read file (asset) metadata. Provide a query to list multiple files' metadata. Provide 'id' to get a single file's metadata. Provide 'id' and 'raw: true' to get a single file's raw content (Base64 encoded).",
		inputSchema: {
			query: itemQuerySchema
				.optional()
				.describe(
					'Directus query parameters (filter, sort, fields, limit, deep, etc.) for file metadata.',
				),
			id: z
				.string()
				.optional()
				.describe(
					'The ID of the specific file. Omit to retrieve all files.',
				),
			raw: z
				.boolean()
				.optional()
				.describe(
					"If true, fetch raw file content (requires 'id'). Content will be Base64 encoded and returned in the 'blob' field with the correct MIME type.",
				),
		},
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	}, async ({ query, id, raw }) => {
		try {
			// Case 1: Get a single file (with or without raw content)
			if (id) {
				// Default to all fields if raw to ensure we get type and filename
				const fieldsForMetadata = raw ? ['*'] : query?.fields;

				const metadataQuery = fieldsForMetadata
					? { fields: fieldsForMetadata }
					: undefined;

				const metadata = await directus.request(readFile(id, metadataQuery));

				if (!metadata) {
					return formatErrorResponse(`File with ID ${id} not found.`);
				}

				// If raw content requested, get base64 (usually for image analysis or vision tool use)
				if (raw) {
					// Check if this is an image and if we have dimensions
					const isImage = metadata['type']?.toString().startsWith('image/');
					const width = Number(metadata['width']) || 0;
					const height = Number(metadata['height']) || 0;

					// If image exceeds 1200px in any dimension, apply resize parameter
					let assetRequest;

					if (isImage && (width > 1200 || height > 1200)) {
						// Calculate which dimension to constrain
						const transforms = width > height
							? [['resize', { width: 800, fit: 'contain' }]]
							: [['resize', { height: 800, fit: 'contain' }]];

						assetRequest = readAssetArrayBuffer(id, {
							transforms: transforms as [string, ...any[]][],
						});
					}
					else {
						assetRequest = readAssetArrayBuffer(id);
					}

					const fileData = await directus.request<ArrayBuffer>(assetRequest);
					const fileBuffer = Buffer.from(fileData);
					const base64Content = fileBuffer.toString('base64');
					const sizeInBytes = fileBuffer.byteLength;

					// The fallback here is janky and certain to fail if the asset is missing a type and it's not an image. Should we just throw an errror?
					const mimeType = metadata['type'] || 'image/jpeg';

					return formatResourceResponse(
						`directus://files/${id}/raw`,
						mimeType as string,
						base64Content,
						true,
						sizeInBytes,
					);
				}

				return formatSuccessResponse(metadata);
			}

			// Case 2: Query all files
			const files = await directus.request(
				query ? readFiles(query as any) : readFiles(),
			);
			return formatSuccessResponse(files);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	});

	server.registerTool('directus_update_files', {
		title: 'Update Files',
		description: 'Update the metadata of existing file(s) in Directus.',
		inputSchema: {
			data: z
				.array(FileSchema)
				.describe(
					'An array of objects containing the id and fields to update (e.g., title, description, tags, folder).',
				),
		},
		annotations: {
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	}, async ({ data }) => {
		try {
			if (Object.keys(data).length === 0) {
				return formatErrorResponse(
					"The 'data' object cannot be empty. Provide at least one field to update.",
				);
			}

			const result = await directus.request(updateFilesBatch(data as any));
			return formatSuccessResponse(result);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	});

	server.registerTool('directus_import_file', {
		title: 'Import File',
		description:
			"Import a file to Directus from a web URL. Optionally include 'data' for file metadata (title, folder, etc.).",
		inputSchema: {
			url: z.string().describe('URL of the file to import.'),
			data: FileSchema,
		},
		annotations: {
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: false,
			openWorldHint: true,
		},
	}, async ({ url, data }) => {
		try {
			const result = await directus.request(
				importFile(url, (data || {}) as any),
			);
			return formatSuccessResponse(result);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	});

	server.registerTool('directus_read_folders', {
		title: 'Read Folders',
		description: 'Read the metadata of existing folders in Directus.',
		inputSchema: {
			query: itemQuerySchema.optional(),
		},
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	}, async ({ query }) => {
		try {
			const result = await directus.request(readFolders(query as any));
			return formatSuccessResponse(result);
		}
		catch (error) {
			return formatErrorResponse(error);
		}
	});
}
