import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper } from '@/helper/collectionHelper';
import { ServerAPI } from '@/redux/actions/Auth/Auth';
import { buildTranslationsDeep } from '@/helper/translationLanguageQuery';

export class ApartmentsHelper extends CollectionHelper<DatabaseTypes.Apartments> {
	constructor(client?: any) {
		super('apartments', client);
	}

	// Fetch all apartmanets with optional query overrides
	async fetchApartments(queryOverride: any = {}) {
		const defaultQuery = {
			fields: ['*', 'translations.*'],
			deep: buildTranslationsDeep(),
			limit: -1, // Fetch all
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItems(query);
	}

	async fetchApartmentWithWashingMachines(id: string, queryOverride: any = {}) {
		const defaultQuery = {
			limit: -1,
			fields: ['*', 'washingmachines.*'],
			filter: {
				id,
			},
		};

		const query = { ...defaultQuery, ...queryOverride };

		return await this.readItem(id, query);
	}

	// Fetch a specific apartment by ID
	async fetchApartmentById(id: string, queryOverride: any = {}) {
		const defaultQuery = {
			fields: ['*', 'translations.*'],
			deep: buildTranslationsDeep(),
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItem(id, query);
	}
}
