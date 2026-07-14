import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper } from '@/helper/collectionHelper';
import { ServerAPI } from '@/redux/actions/Auth/Auth';
import { buildTranslationsDeep } from '@/helper/translationLanguageQuery';

export class CollectibleEventsHelper extends CollectionHelper<DatabaseTypes.CollectibleEvents> {
        constructor(client?: any) {
                super('collectible_events', client);
        }

        async fetchCollectibleEvents(queryOverride: any = {}) {
                const defaultQuery = {
                        fields: ['*', 'translations.*'],
                        deep: buildTranslationsDeep(),
                        sort: ['sort'],
                        limit: 200,
                };

                const query = { ...defaultQuery, ...queryOverride };
                return await this.readItems(query);
        }
}
