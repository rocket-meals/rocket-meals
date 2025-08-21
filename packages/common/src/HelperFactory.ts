import { CollectionNames } from './databaseTypes/CollectionNames';
import * as DatabaseTypes from './databaseTypes/types';

/**
 * Interface for helper factory that can create helpers dynamically
 */
export interface IHelperFactory {
  createHelper<T>(collectionName: CollectionNames): any;
}

/**
 * Collection mapping to provide type safety for helper creation
 */
export type CollectionTypeMap = {
  [CollectionNames.APP_FEEDBACKS]: DatabaseTypes.AppFeedbacks;
  [CollectionNames.APP_SETTINGS]: DatabaseTypes.AppSettings;
  [CollectionNames.AUTO_TRANSLATION_SETTINGS]: DatabaseTypes.AutoTranslationSettings;
  [CollectionNames.BUILDINGS]: DatabaseTypes.Buildings;
  [CollectionNames.FOODS]: DatabaseTypes.Foods;
  [CollectionNames.FOODS_FEEDBACKS]: DatabaseTypes.FoodsFeedbacks;
  [CollectionNames.FOODS_CATEGORIES]: DatabaseTypes.FoodsCategories;
  [CollectionNames.FOODS_ATTRIBUTES]: DatabaseTypes.FoodsAttributes;
  [CollectionNames.FOODS_FEEDBACK_LABELS]: DatabaseTypes.FoodsFeedbacksLabels;
  [CollectionNames.FOODS_FEEDBACKS_LABELS_ENTRIES]: DatabaseTypes.FoodsFeedbacksLabelsEntries;
  [CollectionNames.CANTEENS_FEEDBACK_LABELS]: DatabaseTypes.CanteensFeedbacksLabels;
  [CollectionNames.CANTEENS_FEEDBACKS_LABELS_ENTRIES]: DatabaseTypes.CanteensFeedbacksLabelsEntries;
  [CollectionNames.FORMS]: DatabaseTypes.Forms;
  [CollectionNames.FORM_EXTRACTS]: DatabaseTypes.FormExtracts;
  [CollectionNames.FORM_EXTRACTS_FORM_FIELDS]: DatabaseTypes.FormExtractsFormFields;
  [CollectionNames.FORM_FIELDS]: DatabaseTypes.FormFields;
  [CollectionNames.FORM_SUBMISSIONS]: DatabaseTypes.FormSubmissions;
  [CollectionNames.FORM_ANSWERS]: DatabaseTypes.FormAnswers;
  [CollectionNames.FOODOFFERS]: DatabaseTypes.Foodoffers;
  [CollectionNames.FOODOFFER_CATEGORIES]: DatabaseTypes.FoodoffersCategories;
  [CollectionNames.DEVICES]: DatabaseTypes.Devices;
  [CollectionNames.PUSH_NOTIFICATIONS]: DatabaseTypes.PushNotifications;
  [CollectionNames.PROFILES]: DatabaseTypes.Profiles;
  [CollectionNames.MARKINGS]: DatabaseTypes.Markings;
  [CollectionNames.MARKINGS_EXCLUSIONS]: DatabaseTypes.MarkingsExclusions;
  [CollectionNames.CANTEENS]: DatabaseTypes.Canteens;
  [CollectionNames.APARTMENTS]: DatabaseTypes.Apartments;
  [CollectionNames.NEWS]: DatabaseTypes.News;
  [CollectionNames.USERS]: DatabaseTypes.DirectusUsers;
  [CollectionNames.UTILIZATION_ENTRIES]: DatabaseTypes.UtilizationsEntries;
  [CollectionNames.UTILIZATION_GROUPS]: DatabaseTypes.UtilizationsGroups;
  [CollectionNames.WASHINGMACHINES]: DatabaseTypes.Washingmachines;
  [CollectionNames.WASHINGMACHINES_JOBS]: DatabaseTypes.WashingmachinesJobs;
  [CollectionNames.WORKFLOWS]: DatabaseTypes.Workflows;
  [CollectionNames.WORKFLOWS_RUNS]: DatabaseTypes.WorkflowsRuns;
  [CollectionNames.MAILS]: DatabaseTypes.Mails;
  [CollectionNames.MAILS_FILES]: DatabaseTypes.MailsFiles;
  [CollectionNames.COLLECTIONS_DATES_LAST_UPDATE]: DatabaseTypes.CollectionsDatesLastUpdate;
  [CollectionNames.CASHREGISTERS]: DatabaseTypes.Cashregisters;
  [CollectionNames.CASHREGISTERS_TRANSACTIONS]: DatabaseTypes.CashregistersTransactions;
  // Add more mappings as needed
};

/**
 * Helper method name generator for consistency
 */
export class HelperMethodNameGenerator {
  /**
   * Converts collection name to helper method name
   * Example: "foods" -> "getFoodsHelper", "app_feedbacks" -> "getAppFeedbacksHelper"
   */
  static getHelperMethodName(collectionName: CollectionNames): string {
    // Convert snake_case to camelCase and add Helper suffix
    const camelCase = collectionName
      .split('_')
      .map((word, index) => {
        // First word stays lowercase for camelCase, rest are capitalized
        return index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join('');
    
    return `get${camelCase.charAt(0).toUpperCase() + camelCase.slice(1)}Helper`;
  }

  /**
   * Gets all helper method names for all collections
   */
  static getAllHelperMethodNames(): Record<CollectionNames, string> {
    const result = {} as Record<CollectionNames, string>;
    Object.values(CollectionNames).forEach(collection => {
      result[collection] = this.getHelperMethodName(collection);
    });
    return result;
  }
}

/**
 * Base factory class that can be extended by concrete implementations
 */
export abstract class BaseHelperFactory implements IHelperFactory {
  protected helperCache = new Map<CollectionNames, any>();

  abstract createHelper<T>(collectionName: CollectionNames): any;

  /**
   * Gets or creates a cached helper for the given collection
   */
  protected getCachedHelper<T>(collectionName: CollectionNames, createFn: () => any): any {
    if (!this.helperCache.has(collectionName)) {
      this.helperCache.set(collectionName, createFn());
    }
    return this.helperCache.get(collectionName);
  }

  /**
   * Clears the helper cache
   */
  clearCache(): void {
    this.helperCache.clear();
  }
}