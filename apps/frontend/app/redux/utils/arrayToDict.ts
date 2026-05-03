
export const arrayToDict = <T>(
	payload: unknown,
	getKey: (item: any, index: number) => string | null
): Record<string, T> => {
	if (!payload) return {};
	if (!Array.isArray(payload)) return payload as Record<string, T>;
	return payload.reduce((acc: Record<string, T>, item: any, index: number) => {
		const key = getKey(item, index);
		if (key) acc[key] = item;
		return acc;
	}, {});
};

export const idKey = (item: any): string | null =>
	item?.id ? String(item.id) : null;
