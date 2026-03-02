import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper } from '@/helper/collectionHelper'; // Your helper
import { ServerAPI } from '@/redux/actions/Auth/Auth'; // Your API client

export class ProfileHelper extends CollectionHelper<DatabaseTypes.Profiles> {
	constructor(client?: any) {
		super('profiles', client || ServerAPI.getClient());
	}

	async fetchProfile(queryOverride: any = {}) {
		// Default query structure
		const defaultQuery = {
			fields: ['*', 'markings.*', 'devices.*', 'buildings_favorites.*', 'buildings_last_visited.*'],
			deep: {},
		};

		// Combine default query with overrides (if any)
		const query = { ...defaultQuery, ...queryOverride };

		// Fetch profiles from the server
		return await this.readItems(query);
	}

	async fetchProfileById(id: string, queryOverride: any = {}) {
		// Default query structure
		const defaultQuery = {
			fields: ['*', 'markings.*', 'devices.*', 'buildings_favorites.*', 'buildings_last_visited.*'],
			deep: {},
		};

		// Combine default query with overrides (if any)
		const query = { ...defaultQuery, ...queryOverride };

		// Fetch profile by ID from the server
		return await this.readItem(id, query);
	}

	async updateProfile(profileData: any) {
		// Update profile data
		// remove "foods_feedbacks" so that it doesn't get updated/overwritten
		delete profileData.foods_feedbacks;

		await this.updateItem(profileData?.id, profileData);

		// Fetch the updated profile with the required fields
		const updatedProfile = await this.fetchProfileById(profileData?.id);
		return updatedProfile;
		// return profileData;
	}
}

export async function deleteProfileRemote(id: string | number) {
	const profileCollectionHelper = new CollectionHelper<DatabaseTypes.Profiles>('profiles');
	await profileCollectionHelper.deleteItem(id);
}
