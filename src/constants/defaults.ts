/**
 * Default interface mappings for Directus field types.
 * Used when creating fields/collections to match Directus dashboard behavior.
 */
export const DEFAULT_FIELD_INTERFACES: Record<string, string> = {
	m2o: 'select-dropdown-m2o',
	o2m: 'list-o2m',
	m2m: 'list-m2m',
	string: 'input',
	text: 'input-multiline',
	integer: 'input',
	bigInteger: 'input',
	float: 'input',
	decimal: 'input',
	boolean: 'boolean',
	date: 'datetime',
	dateTime: 'datetime',
	time: 'input',
	timestamp: 'datetime',
	json: 'input-code',
	uuid: 'input',
};
