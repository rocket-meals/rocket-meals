import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper } from '@/helper/collectionHelper';
import { ServerAPI } from '@/redux/actions/Auth/Auth';

export class FoodOfferInfoItemsHelper extends CollectionHelper<DatabaseTypes.FoodofferInfoItems> {
  constructor(client?: any) {
    super('foodoffer_info_items', client || ServerAPI.getClient());
  }

  async fetchFoodOfferInfoItems(queryOverride: any = {}) {
    const defaultQuery = {
      fields: ['*', 'info_item.*', 'info_item.name.*', 'info_item.name.translations.*', 'info_item.image.*'],
      limit: -1,
    };
    const query = { ...defaultQuery, ...queryOverride };
    return await this.readItems(query);
  }
}
