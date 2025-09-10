import type { Schema } from '../types/schema.js';

/**
 * Check if a collection exists in the context schema.
 * @param collection - The collection to check.
 * @param contextSchema - The context schema.
 * @throws Error if collection doesn't exist.
 */
export function checkCollection(collection: string, contextSchema: Schema) {
	if (collection && !contextSchema[collection]) {
		throw new Error(
			`Collection "${collection}" not found. Use read-collections tool first.`
		);
	}

	return contextSchema[collection];
}
