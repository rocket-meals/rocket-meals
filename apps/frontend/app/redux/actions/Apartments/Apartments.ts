import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper } from '@/helper/collectionHelper';
import { ServerAPI } from '@/redux/actions/Auth/Auth';

export class ApartmentsHelper extends CollectionHelper<DatabaseTypes.Apartments> {
	constructor(client?: any) {
		super('apartments', client || ServerAPI.getClient());
	}

	// Fetch all apartmanets with optional query overrides
	async fetchApartments(queryOverride: any = {}) {
		const defaultQuery = {
			fields: ['*', 'translations.*'],
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
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItem(id, query);
	}
}
