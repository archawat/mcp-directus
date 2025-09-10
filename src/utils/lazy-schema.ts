import type { Directus } from '../directus.js';
import { getGlobalDirectus, getGlobalConfig } from '../index.js';
import { fetchSchema } from './fetch-schema.js';

// Cache for loaded schema
let schemaCache: any = null;

/**
 * Lazily load schema only when needed by tools
 */
export async function getSchemaLazy() {
	if (schemaCache) {
		return schemaCache;
	}

	const directus = getGlobalDirectus() as Directus;
	const config = getGlobalConfig();
	
	if (!directus) {
		throw new Error('Directus client not initialized');
	}

	console.log('Loading schema on-demand...');
	schemaCache = await fetchSchema(directus, config);
	console.log(`Schema cached: ${Object.keys(schemaCache).length} collections`);
	
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