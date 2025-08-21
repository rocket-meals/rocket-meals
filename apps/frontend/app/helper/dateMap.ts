import { DatabaseTypes } from 'repo-depkit-common';

export const transformUpdateDatesToMap = (
	array: DatabaseTypes.CollectionsDatesLastUpdate[]
): Record<string, string> => {
	const map: Record<string, string> = {};
	array.forEach(item => {
		const updated = item.date_updated ?? item.date_created;
		if (updated) {
			map[item.id] = updated;
		}
	});
	return map;
};
