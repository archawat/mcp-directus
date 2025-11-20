/**
 * Check if a collection is a Directus system collection
 * @param collection - Collection name to check
 * @returns true if it's a system collection
 */
export function isSystemCollection(collection: string): boolean {
	return collection.startsWith('directus_');
}

/**
 * System collections in Directus
 *
 * Note: Some system collections are modifiable through MCP tools:
 * - directus_flows: Can be created, updated, and deleted via flow tools
 * - directus_operations: Can be created, updated, and deleted via operation tools
 * - directus_fields: Can be created and updated via field tools
 * - directus_relations: Can be created via relation tools
 *
 * Other collections should be treated as read-only or require ALLOW_SYSTEM_MODIFICATIONS=true
 */
export const SYSTEM_COLLECTIONS = [
	'directus_activity',
	'directus_collections',
	'directus_fields',
	'directus_files',
	'directus_folders',
	'directus_migrations',
	'directus_permissions',
	'directus_presets',
	'directus_relations',
	'directus_revisions',
	'directus_roles',
	'directus_sessions',
	'directus_settings',
	'directus_users',
	'directus_webhooks',
	'directus_flows',
	'directus_operations',
	'directus_panels',
	'directus_dashboards',
	'directus_notifications',
	'directus_shares',
] as const;