import { CollectionNames, DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper } from '@/helper/collectionHelper';
import { ServerAPI } from '@/redux/actions/Auth/Auth';

/**
 * Write-only access to `app_usage_events`.
 *
 * The collection grants `create` to the Anonymous policy (which includes Directus' Public
 * role) but no `read`, so events can be logged without a login and cannot be read back from
 * the app. Reporting happens in Directus.
 *
 * Defaults to the public client rather than the authenticated one: `CollectionHelper` would
 * otherwise fall back to `ServerAPI.getClient()`, which throws when auth storage is not
 * initialised — telemetry must never depend on login state.
 */
export class AppUsageEvents extends CollectionHelper<DatabaseTypes.AppUsageEvents> {
	constructor(client?: any) {
		super(CollectionNames.APP_USAGE_EVENTS, client ?? (ServerAPI.getPublicClient() as any));
	}

	async createEvent(data: Partial<DatabaseTypes.AppUsageEvents>) {
		return await this.createItem(data);
	}
}
