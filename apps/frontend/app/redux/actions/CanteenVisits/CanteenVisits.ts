import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper } from '@/helper/collectionHelper';

export class CanteenVisitsHelper extends CollectionHelper<DatabaseTypes.CanteenVisits> {
	constructor(client?: any) {
		super('canteen_visits', client);
	}

	async fetchOwnVisitForDate(canteenId: string, date: string, profileId: string): Promise<DatabaseTypes.CanteenVisits | null> {
		try {
			const results = await this.readItems({
				filter: {
					canteen: { _eq: canteenId },
					date: { _eq: date },
					profile: { _eq: profileId },
				},
				limit: 1,
			} as any);
			return results?.[0] ?? null;
		} catch (error) {
			console.error('Error fetching own canteen visit:', error);
			return null;
		}
	}

	async createVisitForDate(canteenId: string, date: string): Promise<DatabaseTypes.CanteenVisits> {
		return this.createItem({
			canteen: canteenId,
			date,
			status: 'published',
		} as any);
	}

	async deleteVisit(visitId: string): Promise<void> {
		await this.deleteItem(visitId);
	}

	async deleteOwnVisitsForDate(canteenId: string, date: string, profileId: string): Promise<void> {
		const visits = await this.readItems({
			filter: {
				canteen: { _eq: canteenId },
				date: { _eq: date },
				profile: { _eq: profileId },
			},
		} as any);
		const ids = (visits ?? []).map((v: any) => v.id).filter(Boolean);
		if (ids.length === 0) return;
		await this.deleteItems(ids as any);
	}

	async fetchVisitCountForDate(canteenId: string, date: string): Promise<number> {
		try {
			const result: any = await this.aggregateItems({
				aggregate: {
					count: '*',
				},
				query: {
					filter: {
						canteen: { _eq: canteenId },
						date: { _eq: date },
					},
				},
			});
			const count = result?.[0]?.count;
			return typeof count === 'number' ? count : parseInt(count, 10) || 0;
		} catch (error) {
			console.error('Error fetching canteen visit count:', error);
			return 0;
		}
	}

	async fetchFriendVisitCountForDate(canteenId: string, date: string, friendProfileIds: string[]): Promise<number> {
		if (friendProfileIds.length === 0) return 0;
		try {
			const result: any = await this.aggregateItems({
				aggregate: {
					count: '*',
				},
				query: {
					filter: {
						canteen: { _eq: canteenId },
						date: { _eq: date },
						profile: { _in: friendProfileIds },
					},
				},
			});
			const count = result?.[0]?.count;
			return typeof count === 'number' ? count : parseInt(count, 10) || 0;
		} catch (error) {
			console.error('Error fetching friend canteen visit count:', error);
			return 0;
		}
	}
}

/**
 * Extract all friend profile IDs from a list of friendships, excluding the own profile ID.
 */
export function getFriendProfileIds(friendships: DatabaseTypes.Friendships[], ownProfileId: string): string[] {
	const ids = new Set<string>();
	for (const f of friendships) {
		if (f.friendship_status !== 'accepted') continue;
		const requesterId = typeof f.requester_profiles_id === 'string' ? f.requester_profiles_id : (f.requester_profiles_id as DatabaseTypes.Profiles)?.id;
		const receiverId = typeof f.receiver_profiles_id === 'string' ? f.receiver_profiles_id : (f.receiver_profiles_id as DatabaseTypes.Profiles)?.id;
		if (requesterId && requesterId !== ownProfileId) ids.add(requesterId);
		if (receiverId && receiverId !== ownProfileId) ids.add(receiverId);
	}
	return Array.from(ids);
}
