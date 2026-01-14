import { DatabaseTypes } from 'repo-depkit-common';

import { CollectionHelper } from '@/helper/collectionHelper';
import { ServerAPI } from '@/redux/actions/Auth/Auth';

export class CollectibleEventParticipantsHelper extends CollectionHelper<DatabaseTypes.CollectibleEventParticipants> {
        constructor(client?: any) {
                super('collectible_event_participants', client || ServerAPI.getClient());
        }

        async fetchParticipationByProfileAndEvent(profileId: string, eventId: string, queryOverride: any = {}) {
                const defaultQuery = {
                        filter: {
                                collectible_event: { _eq: eventId },
                                profile: { _eq: profileId },
                        },
                        limit: 1,
                };

                const query = { ...defaultQuery, ...queryOverride };
                const results = (await this.readItems(query)) as DatabaseTypes.CollectibleEventParticipants[];
                return Array.isArray(results) && results.length > 0 ? results[0] : null;
        }
}
