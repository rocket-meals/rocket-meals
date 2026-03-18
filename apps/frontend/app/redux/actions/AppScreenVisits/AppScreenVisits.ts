import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper } from '@/helper/collectionHelper';

export const APP_SCREEN_VISITS_COLLECTION = 'app_screen_visits';

export class AppScreenVisits extends CollectionHelper<DatabaseTypes.AppScreenVisits> {
	constructor(client?: any) {
		super(APP_SCREEN_VISITS_COLLECTION, client);
	}

	async createScreenVisit(data: Pick<DatabaseTypes.AppScreenVisits, 'screen_name'> & { profile?: string | null }) {
		return await this.createItem(data);
	}
}
