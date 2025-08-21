/**
 * Base interface for collection helpers that defines common CRUD operations
 * This interface can be implemented by both frontend and backend helpers
 */
export interface IBaseCollectionHelper<T> {
  // CRUD Operations
  readItems(query?: any): Promise<T[]>;
  readItem(id: string | number, query?: any): Promise<T>;
  createItem(data: Partial<T>): Promise<T>;
  updateItem(id: string | number, data: Partial<T>): Promise<T>;
  updateItems(query: any, data: Partial<T>): Promise<T[]>;
  deleteItem(id: string | number): Promise<void>;
  deleteItems(query?: any): Promise<void>;
}

/**
 * Base abstract class that provides common functionality for collection helpers
 * This can be extended by both frontend and backend implementations
 */
export abstract class BaseCollectionHelper<T> implements IBaseCollectionHelper<T> {
  protected collection: string;

  constructor(collection: string) {
    this.collection = collection;
  }

  // Abstract methods that must be implemented by concrete classes
  abstract readItems(query?: any): Promise<T[]>;
  abstract readItem(id: string | number, query?: any): Promise<T>;
  abstract createItem(data: Partial<T>): Promise<T>;
  abstract updateItem(id: string | number, data: Partial<T>): Promise<T>;
  abstract updateItems(query: any, data: Partial<T>): Promise<T[]>;
  abstract deleteItem(id: string | number): Promise<void>;
  abstract deleteItems(query?: any): Promise<void>;

  // Common error handling method
  protected handleError(error: any, operation: string): never {
    console.error(`Error in ${operation} for collection ${this.collection}:`, error);
    throw error;
  }

  // Utility Methods - These can be shared across frontend and backend
  static getQueryWithRelatedFields(fields: string[]) {
    return { fields };
  }

  static convertDictToList<T>(
    dict: Record<string, T | undefined | null> | null | undefined
  ): T[] {
    return dict
      ? (Object.values(dict).filter(Boolean) as T[])
      : [];
  }

  static convertListToDict<T>(
    list: T[],
    key: keyof T
  ): Record<string, T> {
    return list.reduce((dict, item) => {
      const id = item[key];
      if (id) {
        dict[id as unknown as string] = item;
      }
      return dict;
    }, {} as Record<string, T>);
  }

  static convertListToDictWithListAsValue<T>(
    list: T[],
    key: keyof T | ((item: T) => string)
  ): Record<string, T[]> {
    return list.reduce((dict, item) => {
      const id = typeof key === 'function' ? key(item) : item[key];
      const idString = id as string;
      if (!dict[idString]) {
        dict[idString] = [];
      }
      dict[idString].push(item);
      return dict;
    }, {} as Record<string, T[]>);
  }
}