import { FormCategories } from '@rocket-meals/shared';
import { CollectionHelper } from '@/helper/collectionHelper';
import { ServerAPI } from '@/redux/actions/Auth/Auth';

export class FormCategoriesHelper extends CollectionHelper<FormCategories> {
  constructor(client?: any) {
    super('form_categories', client || ServerAPI.getClient());
  }

  async fetchFormCategories(queryOverride: any = {}) {
    const defaultQuery = {
      fields: [' * , translations.*'],
      limit: -1,
    };

    const query = { ...defaultQuery, ...queryOverride };
    return await this.readItems(query);
  }

  async fetchFormCategoryById(id: string, queryOverride: any = {}) {
    const defaultQuery = {
      fields: ['*'],
    };

    const query = { ...defaultQuery, ...queryOverride };
    return await this.readItem(id, query);
  }
}
