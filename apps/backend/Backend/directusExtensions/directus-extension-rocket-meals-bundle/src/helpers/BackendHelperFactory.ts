import { BaseHelperFactory, CollectionNames } from 'repo-depkit-common';
import { ItemsServiceHelper } from './ItemsServiceHelper';
import { MyDatabaseHelperInterface } from './MyDatabaseHelperInterface';

/**
 * Backend-specific helper factory that creates ItemsServiceHelper instances
 */
export class BackendHelperFactory extends BaseHelperFactory {
  private myDatabaseHelper: MyDatabaseHelperInterface;

  constructor(myDatabaseHelper: MyDatabaseHelperInterface) {
    super();
    this.myDatabaseHelper = myDatabaseHelper;
  }

  createHelper<T>(collectionName: CollectionNames): ItemsServiceHelper<T> {
    return this.getCachedHelper<T>(collectionName, () => 
      new ItemsServiceHelper<T>(this.myDatabaseHelper, collectionName)
    );
  }

  /**
   * Creates a specialized helper if one exists, otherwise returns a generic ItemsServiceHelper
   */
  createSpecializedHelper<T>(collectionName: CollectionNames, SpecializedClass?: any): any {
    if (SpecializedClass) {
      return this.getCachedHelper<T>(collectionName, () => 
        new SpecializedClass(this.myDatabaseHelper, collectionName)
      );
    }
    return this.createHelper<T>(collectionName);
  }
}