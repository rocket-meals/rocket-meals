import {
  DirectusClient,
  RestClient,
  createItem,
  deleteItem,
  deleteItems,
  readItem,
  readItems,
  readSingleton,
  updateItem,
  updateItems,
  aggregate,
  withToken,
} from '@directus/sdk';
import { 
  DatabaseTypes, 
  BaseCollectionHelper, 
  FilterOperator, 
  BaseQuery, 
  BaseAggregateQuery 
} from 'repo-depkit-common';
import { ServerAPI } from '@/redux/actions/Auth/Auth';

// Re-export types for backward compatibility
export type { FilterOperator } from 'repo-depkit-common';
export type Query<CollectionScheme> = BaseQuery<CollectionScheme>;
export type AggregateQuery<CollectionScheme> = BaseAggregateQuery<CollectionScheme>;

export class CollectionHelper<CollectionScheme> extends BaseCollectionHelper<CollectionScheme> {
  private client: DirectusClient<DatabaseTypes.CustomDirectusTypes> & RestClient<any>;

  constructor(
    collection: string,
    client?: DirectusClient<DatabaseTypes.CustomDirectusTypes> & RestClient<any>
  ) {
    super(collection);
    this.client = client ?? ServerAPI.getClient();
  }

  /**
   * Centralized API call handler for reducing redundancy
   */
  private async handleRequest<T>(
    method: (...args: any[]) => any,
    ...args: any[]
  ): Promise<T> {
    try {
      return await this.client.request<T>(method(this.collection, ...args));
    } catch (error) {
      this.handleError(error, method.name);
    }
  }

  // CRUD Operations - implementing the abstract methods from BaseCollectionHelper
  async readSingletonItem(query?: Query<CollectionScheme>) {
    return this.handleRequest(readSingleton, query);
  }

  async readItems(query?: Query<CollectionScheme>): Promise<CollectionScheme[]> {
    return this.handleRequest(readItems, query);
  }

  async readItem(id: number | string, query?: Query<CollectionScheme>): Promise<CollectionScheme> {
    return this.handleRequest(readItem, id, query);
  }

  async createItem(data: Partial<CollectionScheme>): Promise<CollectionScheme> {
    return this.handleRequest(createItem, data);
  }

  async updateItem(id: number | string, data: Partial<CollectionScheme>): Promise<CollectionScheme> {
    return this.handleRequest(updateItem, id, data);
  }

  async updateItems(
    query: Query<CollectionScheme>,
    data: Partial<CollectionScheme>
  ): Promise<CollectionScheme[]> {
    return this.handleRequest(updateItems, query, data);
  }

  async deleteItem(id: number | string): Promise<void> {
    return this.handleRequest(deleteItem, id);
  }

  async deleteItems(query?: Query<CollectionScheme>): Promise<void> {
    return this.handleRequest(deleteItems, query);
  }

  async aggregateItems(query?: AggregateQuery<CollectionScheme>) {
    return this.handleRequest(aggregate, query);
  }

  // Utility Methods - these are now inherited from BaseCollectionHelper
  // Keeping the static methods for backward compatibility
  static getQueryWithRelatedFields = BaseCollectionHelper.getQueryWithRelatedFields;
  static convertDictToList = BaseCollectionHelper.convertDictToList;
  static convertListToDict = BaseCollectionHelper.convertListToDict;
  static convertListToDictWithListAsValue = BaseCollectionHelper.convertListToDictWithListAsValue;
}
  