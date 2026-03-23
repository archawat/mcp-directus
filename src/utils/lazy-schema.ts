import type { Directus } from '../directus.js';
import type { Config } from '../config.js';
import { fetchSchema } from './fetch-schema.js';

// Internal references set via initSchema()
let directusRef: Directus | null = null;
let configRef: Config | undefined;

// Cache for loaded schema
let schemaCache: any = null;

/**
 * Initialize the lazy schema loader with directus client and config.
 * Must be called before any schema access.
 */
export function initSchema(directus: Directus, config: Config) {
	directusRef = directus;
	configRef = config;
}

/**
 * Lazily load schema only when needed by tools
 */
export async function getSchemaLazy() {
	if (schemaCache) {
		return schemaCache;
	}

	if (!directusRef) {
		throw new Error('Schema not initialized. Call initSchema() first.');
	}

	console.error('Loading schema on-demand...');
	schemaCache = await fetchSchema(directusRef, configRef);
	console.error(`Schema cached: ${Object.keys(schemaCache).length} collections`);

	return schemaCache;
}

/**
 * Get schema for a specific collection only
 */
export async function getCollectionSchema(collectionName: string) {
	const schema = await getSchemaLazy();

	if (!schema[collectionName]) {
		throw new Error(`Collection "${collectionName}" not found in schema. Available collections: ${Object.keys(schema).join(', ')}`);
	}

	return schema[collectionName];
}

/**
 * Check if collection exists (lightweight check)
 */
export async function collectionExists(collectionName: string) {
	const schema = await getSchemaLazy();
	return !!schema[collectionName];
}

/**
 * Invalidate schema cache (call after creating/deleting collections)
 * This forces schema to be reloaded on next access, which includes updated permissions
 */
export function invalidateSchemaCache() {
	console.error('Schema cache invalidated - will reload on next access');
	schemaCache = null;
}
