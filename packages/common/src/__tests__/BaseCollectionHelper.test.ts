import { BaseCollectionHelper } from '../BaseCollectionHelper';
import { HelperMethodNameGenerator } from '../HelperFactory';
import { CollectionNames } from '../databaseTypes/CollectionNames';

describe('BaseCollectionHelper', () => {
  class TestCollectionHelper extends BaseCollectionHelper<any> {
    async readItems(query?: any): Promise<any[]> {
      return [];
    }
    
    async readItem(id: string | number, query?: any): Promise<any> {
      return {};
    }
    
    async createItem(data: Partial<any>): Promise<any> {
      return {};
    }
    
    async updateItem(id: string | number, data: Partial<any>): Promise<any> {
      return {};
    }
    
    async updateItems(query: any, data: Partial<any>): Promise<any[]> {
      return [];
    }
    
    async deleteItem(id: string | number): Promise<void> {
      return;
    }
    
    async deleteItems(query?: any): Promise<void> {
      return;
    }
  }

  it('should create helper instance with collection name', () => {
    const helper = new TestCollectionHelper('test_collection');
    expect(helper).toBeDefined();
    expect((helper as any).collection).toBe('test_collection');
  });

  it('should provide utility methods', () => {
    const dict = { '1': { id: 1, name: 'test' }, '2': { id: 2, name: 'test2' } };
    const list = BaseCollectionHelper.convertDictToList(dict);
    expect(list).toHaveLength(2);
    expect(list[0]).toEqual({ id: 1, name: 'test' });
  });

  it('should convert list to dict', () => {
    const list = [{ id: 1, name: 'test' }, { id: 2, name: 'test2' }];
    const dict = BaseCollectionHelper.convertListToDict(list, 'id');
    expect(dict['1']).toEqual({ id: 1, name: 'test' });
    expect(dict['2']).toEqual({ id: 2, name: 'test2' });
  });
});

describe('HelperMethodNameGenerator', () => {
  it('should generate correct helper method names', () => {
    expect(HelperMethodNameGenerator.getHelperMethodName(CollectionNames.FOODS))
      .toBe('getFoodsHelper');
    expect(HelperMethodNameGenerator.getHelperMethodName(CollectionNames.APP_FEEDBACKS))
      .toBe('getAppFeedbacksHelper');
    expect(HelperMethodNameGenerator.getHelperMethodName(CollectionNames.FOODS_CATEGORIES))
      .toBe('getFoodsCategoriesHelper');
  });
});