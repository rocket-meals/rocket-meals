import { itemStatus } from '@/constants/Constants';
import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper } from '@/helper/collectionHelper';
import { ServerAPI } from '@/redux/actions/Auth/Auth';
import { buildTranslationsDeep } from '@/helper/translationLanguageQuery';

export class PopupEventsHelper extends CollectionHelper<DatabaseTypes.PopupEvents> {
	constructor(client?: any) {
		super('popup_events', client);
	}

	async fetchAllPopupEvents(queryOverride: any = {}) {
		const defaultQuery = {
			fields: ['* , translations.*, canteens.*'],
			deep: buildTranslationsDeep(),
			limit: -1,
			filter: {
				_and: [
					{
						status: {
							_eq: itemStatus,
						},
					},
				],
			},
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItems(query);
	}

	async fetchPopupEventsById(id: string, queryOverride: any = {}) {
		const defaultQuery = {
			fields: ['*, translations.*'],
			deep: buildTranslationsDeep(),
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItem(id, query);
	}
}
