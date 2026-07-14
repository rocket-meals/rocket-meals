import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper, Query } from '@/helper/collectionHelper';
import { buildTranslationsDeep } from '@/helper/translationLanguageQuery';

/** A Directus foreign-key field may be returned as a raw ID (string or number) or a full nested object. */
type DirectusForeignKey = string | number | { id?: string | number | null } | null | undefined;

export class BuildingsOrganizationsHelper extends CollectionHelper<DatabaseTypes.BuildingsOrganizations> {
	constructor(client?: any) {
		super('buildings_organizations', client);
	}

	async fetchBuildingsOrganizations(queryOverride?: Query<DatabaseTypes.BuildingsOrganizations>) {
		const defaultQuery = {
			fields: ['*'],
			limit: -1,
		};

		const query = { ...defaultQuery, ...(queryOverride || {}) };
		return await this.readItems(query);
	}
}

export class BuildingsHelper extends CollectionHelper<DatabaseTypes.Buildings> {
	constructor(client?: any) {
		// Pass the collection name and API client
		super('buildings', client);
	}

	// Fetch all buildings with optional query overrides
	async fetchBuildings(queryOverride?: Query<DatabaseTypes.Buildings>) {
		const defaultQuery = {
			fields: ['*', 'translations.*', 'businesshours.*'],
			limit: -1, // Fetch all
			deep: buildTranslationsDeep(),
		};

		const query = { ...defaultQuery, ...(queryOverride || {}) };
		return await this.readItems(query);
	}

	/**
	 * Normalizes a foreign-key field that Directus may return as a string ID,
	 * a numeric ID, or a full nested object. Always returns the ID as a string,
	 * or undefined when the value is absent.
	 */
	private static resolveId(value: DirectusForeignKey): string | undefined {
		if (typeof value === 'string') return value;
		if (typeof value === 'number') return String(value);
		if (value != null && typeof value === 'object') {
			const id = value.id;
			if (typeof id === 'string') return id;
			if (typeof id === 'number') return String(id);
		}
		return undefined;
	}

	/**
	 * Converts the buildings_organizations join table into a dict keyed by building ID.
	 * Each value is the list of full Organizations objects linked to that building.
	 *
	 * @param buildingsOrganizations - rows from the buildings_organizations join table
	 * @param organizationsDict - organizations keyed by their ID
	 * @returns Record mapping each building ID to the array of Organizations linked to it
	 */
	static getBuildingIdToOrganizationsDict(
		buildingsOrganizations: DatabaseTypes.BuildingsOrganizations[],
		organizationsDict: Record<string, DatabaseTypes.Organizations>
	): Record<string, DatabaseTypes.Organizations[]> {
		const result: Record<string, DatabaseTypes.Organizations[]> = {};
		for (const entry of buildingsOrganizations) {
			const buildingId = BuildingsHelper.resolveId(entry.buildings_id as DirectusForeignKey);
			const orgId = BuildingsHelper.resolveId(entry.organizations_id as DirectusForeignKey);
			if (buildingId && orgId) {
				const org = organizationsDict[orgId];
				if (org) {
					if (!result[buildingId]) {
						result[buildingId] = [];
					}
					result[buildingId].push(org);
				}
			}
		}
		return result;
	}

	// Fetch a specific building by ID
	async fetchBuildingById(id: string, queryOverride?: Query<DatabaseTypes.Buildings>) {
		const defaultQuery = {
			fields: ['*', 'translations.*, businesshours.*'],
			deep: buildTranslationsDeep(),
		};

		const query = { ...defaultQuery, ...(queryOverride || {}) };
		return await this.readItem(id, query);
	}

	// Create a new building
	async createBuilding(buildingData: Partial<DatabaseTypes.Buildings>) {
		return await this.createItem(buildingData);
	}

	// Update an existing building
	async updateBuilding(id: string, updatedData: Partial<DatabaseTypes.Buildings>) {
		return await this.updateItem(id, updatedData);
	}

	// Delete a building
	async deleteBuilding(id: string) {
		return await this.deleteItem(id);
	}
}
