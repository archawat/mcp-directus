import type { Field as DirectusField, Relation as DirectusRelation } from '@directus/types';
import type { Directus } from '../directus.js';
import type { Config } from '../config.js';

import type { Field, Schema } from '../types/schema.js';
import { readFields, readRelations } from '@directus/sdk';
import { stripNullUndefined } from './strip-null-undefined.js';

/**
 * Fetches the fields and relations from the Directus API and returns an unofficial short-hand schema to reduce the tokens used for the LLM.
 * @param directus - The Directus instance.
 * @param config - The configuration for schema limits.
 * @returns The schema.
 */
export async function fetchSchema(directus: Directus, config?: Config): Promise<Schema> {
	try {
		const fields = await directus.request(readFields()) as unknown as DirectusField[];
		const relations = await directus.request(readRelations()) as unknown as DirectusRelation[];
		const schema: Schema = {};

		// Apply configuration limits
		const maxCollections = config?.MAX_SCHEMA_COLLECTIONS ?? 50;
		const maxFieldsPerCollection = config?.MAX_SCHEMA_FIELDS_PER_COLLECTION ?? 100;
		const excludeCollections = new Set(config?.SCHEMA_EXCLUDE_COLLECTIONS ?? []);

		// Count collections and fields to manage size
		const collectionsFieldCount: Record<string, number> = {};
		let totalCollections = 0;

	// Create a lookup for relations by collection and field for faster access
	const relationsLookup: Record<string, Record<string, DirectusRelation>> = {};

	for (const relation of relations) {
		if (!relationsLookup[relation.collection]) {
			relationsLookup[relation.collection] = {};
		}

		relationsLookup[relation.collection]![relation.field] = relation;
	}

	for (const field of fields) {
		// Skip excluded collections
		if (excludeCollections.has(field.collection)) {
			continue;
		}

		// Skip if we've reached max collections
		if (!schema[field.collection] && totalCollections >= maxCollections) {
			continue;
		}

		// Skip if this collection already has too many fields
		if ((collectionsFieldCount[field.collection] || 0) >= maxFieldsPerCollection) {
			continue;
		}

		// Skip system fields/collections, but allow relations targeting directus_files or directus_users
		if (field.meta?.system === true) {
			const fieldRelation = relationsLookup[field.collection]?.[field.field];
			const isFileOrUserRelation = fieldRelation?.related_collection === 'directus_files' || fieldRelation?.related_collection === 'directus_users';

			if (!isFileOrUserRelation) {
				// If it's a system field AND not a file/user relation, skip it
				continue;
			}
		}

		// Also skip directus internal collections themselves, unless it's files or users
		if (field.collection.startsWith('directus_') && field.collection !== 'directus_files' && field.collection !== 'directus_users') {
			continue;
		}

		// Skip UI-only fields
		if (field.type === 'alias' && field.meta?.special?.includes('no-data'))
			continue;

		if (!schema[field.collection]) {
			schema[field.collection] = {};
			totalCollections++;
		}

		// Track field count for this collection
		collectionsFieldCount[field.collection] = (collectionsFieldCount[field.collection] || 0) + 1;

		const schemaField: Field = {
			type: field.type,
			interface: field.meta?.interface ?? undefined,
			primary_key: field.schema?.is_primary_key === true ? true : undefined,
			required: field.meta?.required === true ? true : undefined,
			note: field.meta?.note ?? undefined,
		};

		// If there are choices from the interface, add them to the schema
		if (Array.isArray(field.meta?.options?.['choices']) && field.meta?.options?.['choices'].length > 0) {
			schemaField.choices = field.meta?.options?.['choices'].map((choice: { text: string; value: string }) => ({
				text: choice.text,
				value: choice.value,
			}));
		}

		// Process relationships using both field meta and relations data
		const fieldRelation = relationsLookup[field.collection]?.[field.field];

		if (field.meta?.special) {
			if (field.meta.special.includes('m2o') || field.meta.special.includes('file')) {
				schemaField.relation_type = field.meta.special.includes('file') ? 'file' : 'm2o';

				if (fieldRelation) {
					schemaField.relation_collection = fieldRelation.related_collection;
					schemaField.relation_meta = fieldRelation.meta;
				}
			}
			else if (field.meta.special.includes('o2m')) {
				schemaField.relation_type = 'o2m';

				if (fieldRelation) {
					schemaField.relation_collection = fieldRelation.related_collection;
					schemaField.relation_meta = fieldRelation.meta;
				}
			}
			else if (field.meta.special.includes('m2m') || field.meta.special.includes('files')) {
				schemaField.relation_type = field.meta.special.includes('files') ? 'files' : 'm2m';

				if (fieldRelation) {
					schemaField.relation_collection = fieldRelation.related_collection;
					schemaField.relation_meta = fieldRelation.meta;
				}
			}
			else if (field.meta.special.includes('m2a')) {
				schemaField.relation_type = 'm2a';

				if (fieldRelation) {
					// For M2A, related_collection is null, but one_allowed_collections has the list
					schemaField.relation_collection = stripNullUndefined(fieldRelation.meta?.one_allowed_collections);
					schemaField.relation_meta = stripNullUndefined(fieldRelation.meta);
				}
			}
		}

		// Add the field to the schema
		schema[field.collection]![field.field] = schemaField;
	}

		console.log(`Schema loaded: ${totalCollections} collections, ${Object.values(collectionsFieldCount).reduce((a, b) => a + b, 0)} total fields`);
		
		return schema;
	} catch (error) {
		console.error('Error fetching schema:', error);
		// Return minimal schema on error to prevent complete failure
		return {
			directus_files: {
				id: { type: 'uuid', primary_key: true },
				filename_download: { type: 'string' },
			},
			directus_users: {
				id: { type: 'uuid', primary_key: true },
				email: { type: 'string' },
			},
		};
	}
}
