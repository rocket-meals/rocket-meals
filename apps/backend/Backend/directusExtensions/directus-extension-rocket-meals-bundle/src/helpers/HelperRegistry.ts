import { CollectionNames } from 'repo-depkit-common';
import { ItemsServiceHelper } from './ItemsServiceHelper';
import { MyDatabaseHelperInterface } from './MyDatabaseHelperInterface';
import { BackendHelperFactory } from './BackendHelperFactory';

/**
 * Helper registry that provides type-safe access to all collection helpers
 * This replaces the need for manually writing ~40+ helper methods
 */
export class HelperRegistry {
  private factory: BackendHelperFactory;
  private myDatabaseHelper: MyDatabaseHelperInterface;

  constructor(myDatabaseHelper: MyDatabaseHelperInterface) {
    this.myDatabaseHelper = myDatabaseHelper;
    this.factory = new BackendHelperFactory(myDatabaseHelper);
  }

  // Generic helper method
  getHelper<T>(collectionName: CollectionNames): ItemsServiceHelper<T> {
    return this.factory.createHelper<T>(collectionName);
  }

  // All the specific helper methods that were previously in MyDatabaseHelper
  // These provide type safety and better IDE support
  getAppFeedbacksHelper() {
    return this.getHelper<any>(CollectionNames.APP_FEEDBACKS);
  }

  getCollectionDatesLastUpdateHelper() {
    return this.getHelper<any>(CollectionNames.COLLECTIONS_DATES_LAST_UPDATE);
  }

  getFoodFeedbacksHelper() {
    return this.getHelper<any>(CollectionNames.FOODS_FEEDBACKS);
  }

  getFoodsHelper() {
    return this.getHelper<any>(CollectionNames.FOODS);
  }

  getFoodFeedbackLabelsHelper() {
    return this.getHelper<any>(CollectionNames.FOODS_FEEDBACK_LABELS);
  }

  getFoodsCategoriesHelper() {
    return this.getHelper<any>(CollectionNames.FOODS_CATEGORIES);
  }

  getFoodsAttributesHelper() {
    return this.getHelper<any>(CollectionNames.FOODS_ATTRIBUTES);
  }

  getFoodFeedbackLabelEntriesHelper() {
    return this.getHelper<any>(CollectionNames.FOODS_FEEDBACKS_LABELS_ENTRIES);
  }

  getCanteenFeedbackLabelsHelper() {
    return this.getHelper<any>(CollectionNames.CANTEENS_FEEDBACK_LABELS);
  }

  getCanteenFeedbackLabelsEntriesHelper() {
    return this.getHelper<any>(CollectionNames.CANTEENS_FEEDBACKS_LABELS_ENTRIES);
  }

  getFormsHelper() {
    return this.getHelper<any>(CollectionNames.FORMS);
  }

  getFormExtractsHelper() {
    return this.getHelper<any>(CollectionNames.FORM_EXTRACTS);
  }

  getFormExtractFormFieldsHelper() {
    return this.getHelper<any>(CollectionNames.FORM_EXTRACTS_FORM_FIELDS);
  }

  getFormsFieldsHelper() {
    return this.getHelper<any>(CollectionNames.FORM_FIELDS);
  }

  getFormsSubmissionsHelper() {
    return this.getHelper<any>(CollectionNames.FORM_SUBMISSIONS);
  }

  getFormsAnswersHelper() {
    return this.getHelper<any>(CollectionNames.FORM_ANSWERS);
  }

  getFoodoffersHelper() {
    return this.getHelper<any>(CollectionNames.FOODOFFERS);
  }

  getFoodofferCategoriesHelper() {
    return this.getHelper<any>(CollectionNames.FOODOFFER_CATEGORIES);
  }

  getDevicesHelper() {
    return this.getHelper<any>(CollectionNames.DEVICES);
  }

  getPushNotificationsHelper() {
    return this.getHelper<any>(CollectionNames.PUSH_NOTIFICATIONS);
  }

  getProfilesHelper() {
    return this.getHelper<any>(CollectionNames.PROFILES);
  }

  getMarkingsHelper() {
    return this.getHelper<any>(CollectionNames.MARKINGS);
  }

  getMarkingsExclusionsHelper() {
    return this.getHelper<any>(CollectionNames.MARKINGS_EXCLUSIONS);
  }

  getCanteensHelper() {
    return this.getHelper<any>(CollectionNames.CANTEENS);
  }

  getApartmentsHelper() {
    return this.getHelper<any>(CollectionNames.APARTMENTS);
  }

  getBuildingsHelper() {
    return this.getHelper<any>(CollectionNames.BUILDINGS);
  }

  getNewsHelper() {
    return this.getHelper<any>(CollectionNames.NEWS);
  }

  getUsersHelper() {
    return this.getHelper<any>(CollectionNames.USERS);
  }

  getUtilizationEntriesHelper() {
    return this.getHelper<any>(CollectionNames.UTILIZATION_ENTRIES);
  }

  getUtilizationGroupsHelper() {
    return this.getHelper<any>(CollectionNames.UTILIZATION_GROUPS);
  }

  getWashingmachinesHelper() {
    return this.getHelper<any>(CollectionNames.WASHINGMACHINES);
  }

  getWashingmachinesJobsHelper() {
    return this.getHelper<any>(CollectionNames.WASHINGMACHINES_JOBS);
  }

  getWorkflowsHelper() {
    return this.getHelper<any>(CollectionNames.WORKFLOWS);
  }

  getMailsHelper() {
    return this.getHelper<any>(CollectionNames.MAILS);
  }

  getMailsFilesHelper() {
    return this.getHelper<any>(CollectionNames.MAILS_FILES);
  }

  /**
   * Clear helper cache
   */
  clearCache(): void {
    this.factory.clearCache();
  }
}