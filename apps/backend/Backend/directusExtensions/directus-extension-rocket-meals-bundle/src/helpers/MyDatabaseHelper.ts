import {ApiContext} from './ApiContext';

import {CashregisterHelper} from './itemServiceHelpers/CashregisterHelper';
import {ItemsServiceHelper} from './ItemsServiceHelper';
import {CollectionFieldNames, CollectionNames, DatabaseTypes} from 'repo-depkit-common';

import {ServerServiceCreator} from './ItemsServiceCreator';
import {AppSettingsHelper} from './itemServiceHelpers/AppSettingsHelper';
import {AutoTranslationSettingsHelper} from './itemServiceHelpers/AutoTranslationSettingsHelper';
import {WorkflowsRunHelper} from './itemServiceHelpers/WorkflowsRunHelper';
import {FilesServiceHelper} from './FilesServiceHelper';
import {EventContext, SchemaOverview} from '@directus/types';
import {ShareServiceHelper} from './ShareServiceHelper';
import {MyDatabaseHelperInterface} from './MyDatabaseHelperInterface';
import {EnvVariableHelper} from './EnvVariableHelper';
import ms from 'ms';
import jwt from 'jsonwebtoken';
import {NanoidHelper} from './NanoidHelper';
import {DirectusFieldsServiceHelper} from "./DirectusFieldsServiceHelper";
import {UserHelper} from "./UserHelper";
import {DevicesServiceHelper} from "./DevicesServiceHelper";

export type MyEventContext = EventContext;

export class MyDatabaseHelper implements MyDatabaseHelperInterface {
  public apiContext: ApiContext;
  public eventContext: MyEventContext | undefined;
  public useLocalServerMode: boolean = false;

  constructor(apiContext: ApiContext, eventContext?: MyEventContext) {
    this.apiContext = apiContext;
    // if available we should use eventContext - https://github.com/directus/directus/discussions/11051
    this.eventContext = eventContext; // stupid typescript error, because of the import
    // its better to use the eventContext, because of reusing the database connection instead of creating a new one
  }

  /**
   * Should be used for downloading files, as traefik does not support the public external url
   */
  public cloneWithInternalServerMode(): MyDatabaseHelper {
    let newInstance = new MyDatabaseHelper(this.apiContext, this.eventContext);
    newInstance.useLocalServerMode = true;
    return newInstance;
  }

  async getSchema(): Promise<SchemaOverview> {
    if (this?.eventContext?.schema) {
      return this.eventContext.schema;
    } else {
      return await this.apiContext.getSchema();
    }
  }

  async getAdminBearerToken(): Promise<string | undefined> {
    let usersHelper = await this.getUsersHelper();
    let adminEmail = EnvVariableHelper.getAdminEmail();
    let adminUser = await usersHelper.findFirstItem({
      email: adminEmail,
      provider: 'default',
    });
    const secret = EnvVariableHelper.getSecret();
    if (!adminUser) {
      console.error('Admin user not found');
      return undefined;
    }

    const refreshToken = await NanoidHelper.getNanoid(64);
    const msRefreshTokenTTL: number = ms(String(EnvVariableHelper.getRefreshTTL())) || 0;
    const refreshTokenExpiration = new Date(Date.now() + msRefreshTokenTTL);

    let knex = this.apiContext.database;

    // Insert session into Directus
    await knex('directus_sessions').insert({
      token: refreshToken,
      user: adminUser.id, // Required, cannot be NULL
      expires: refreshTokenExpiration,
      ip: null,
      user_agent: null,
      origin: null,
    });

    // JWT payload
    const tokenPayload = {
      id: adminUser.id,
      role: adminUser.role,
      app_access: true,
      admin_access: true,
      session: refreshToken, // Attach the session
    };

    // Sign JWT with Directus secret
    // @ts-ignore - this is a workaround for the typescript error
    const accessToken = jwt.sign(tokenPayload, secret, {
      expiresIn: EnvVariableHelper.getAccessTokenTTL(),
      issuer: 'directus',
    });

    return `${accessToken}`;
  }

  async getServerInfo() {
    const serverServiceCreator = new ServerServiceCreator(this.apiContext);
    return await serverServiceCreator.getServerInfo();
  }

  getServerUrl(): string {
    let defaultServerUrl = 'http://127.0.0.1'; // https://github.com/directus/directus/blob/9bd3b2615bb6bc5089ffcf14d141406e7776dd0e/docs/self-hosted/quickstart.md?plain=1#L97
    // could be also: http://rocket-meals-directus:8055/server/info but we stick to the default localhost
    // TODO: Fix traefik and use the public url support

    let defaultServerPort = this.getServerPort();
    if (defaultServerPort) {
      defaultServerUrl += `:${defaultServerPort}`;
    }

    if (this.useLocalServerMode) {
      return defaultServerUrl;
    }

    return EnvVariableHelper.getEnvVariable('PUBLIC_URL') || defaultServerUrl;
  }

  getServerPort(): string {
    let defaultServerPort = '8055';
    return EnvVariableHelper.getEnvVariable('PORT') || defaultServerPort;
  }

  getAppSettingsHelper() {
    return new AppSettingsHelper(this.apiContext);
  }

  getAutoTranslationSettingsHelper() {
    return new AutoTranslationSettingsHelper(this.apiContext);
  }

  getAppFeedbacksHelper() {
    return new ItemsServiceHelper<DatabaseTypes.AppFeedbacks>(this, CollectionNames.APP_FEEDBACKS);
  }

  getCashregisterHelper() {
    return new CashregisterHelper(this);
  }

  getCollectionDatesLastUpdateHelper() {
    return new ItemsServiceHelper<DatabaseTypes.CollectionsDatesLastUpdate>(this, CollectionNames.COLLECTIONS_DATES_LAST_UPDATE);
  }

  getCollectibleEventsHelper() {
    return new ItemsServiceHelper<DatabaseTypes.CollectibleEvents>(this, CollectionNames.COLLECTIBLE_EVENTS);
  }

  getFoodFeedbacksHelper() {
    return new ItemsServiceHelper<DatabaseTypes.FoodsFeedbacks>(this, CollectionNames.FOODS_FEEDBACKS);
  }

  getFoodsHelper() {
    return new ItemsServiceHelper<DatabaseTypes.Foods>(this, CollectionNames.FOODS);
  }

  getFoodFeedbackLabelsHelper() {
    return new ItemsServiceHelper<DatabaseTypes.FoodsFeedbacksLabels>(this, CollectionNames.FOODS_FEEDBACK_LABELS);
  }

  getFoodsCategoriesHelper() {
    return new ItemsServiceHelper<DatabaseTypes.FoodsCategories>(this, CollectionNames.FOODS_CATEGORIES);
  }

  getFoodsAttributesHelper() {
    return new ItemsServiceHelper<DatabaseTypes.FoodsAttributes>(this, CollectionNames.FOODS_ATTRIBUTES);
  }

  getFoodFeedbackLabelEntriesHelper() {
    return new ItemsServiceHelper<DatabaseTypes.FoodsFeedbacksLabelsEntries>(this, CollectionNames.FOODS_FEEDBACKS_LABELS_ENTRIES);
  }

  getCanteenFeedbackLabelsHelper() {
    return new ItemsServiceHelper<DatabaseTypes.CanteensFeedbacksLabels>(this, CollectionNames.CANTEENS_FEEDBACK_LABELS);
  }

  getCanteenFeedbackLabelsEntriesHelper() {
    return new ItemsServiceHelper<DatabaseTypes.CanteensFeedbacksLabelsEntries>(this, CollectionNames.CANTEENS_FEEDBACKS_LABELS_ENTRIES);
  }

  getFormsHelper() {
    return new ItemsServiceHelper<DatabaseTypes.Forms>(this, CollectionNames.FORMS);
  }

  getFormExtractsHelper() {
    return new ItemsServiceHelper<DatabaseTypes.FormExtracts>(this, CollectionNames.FORM_EXTRACTS);
  }

  getFormExtractFormFieldsHelper() {
    return new ItemsServiceHelper<DatabaseTypes.FormExtractsFormFields>(this, CollectionNames.FORM_EXTRACTS_FORM_FIELDS);
  }

  getFormsFieldsHelper() {
    return new ItemsServiceHelper<DatabaseTypes.FormFields>(this, CollectionNames.FORM_FIELDS);
  }

  getFormsSubmissionsHelper() {
    return new ItemsServiceHelper<DatabaseTypes.FormSubmissions>(this, CollectionNames.FORM_SUBMISSIONS);
  }

  getFormsAnswersHelper() {
    return new ItemsServiceHelper<DatabaseTypes.FormAnswers>(this, CollectionNames.FORM_ANSWERS);
  }

  getFoodoffersHelper() {
    return new ItemsServiceHelper<DatabaseTypes.Foodoffers>(this, CollectionNames.FOODOFFERS);
  }

  getFoodofferCategoriesHelper() {
    return new ItemsServiceHelper<DatabaseTypes.FoodoffersCategories>(this, CollectionNames.FOODOFFER_CATEGORIES);
  }

  getDevicesHelper() {
    return new DevicesServiceHelper(this, CollectionNames.DEVICES);
  }

  getPushNotificationsHelper() {
    return new ItemsServiceHelper<DatabaseTypes.PushNotifications>(this, CollectionNames.PUSH_NOTIFICATIONS);
  }

  getProfilesHelper() {
    return new ItemsServiceHelper<DatabaseTypes.Profiles>(this, CollectionNames.PROFILES);
  }

  getMarkingsHelper() {
    return new ItemsServiceHelper<DatabaseTypes.Markings>(this, CollectionNames.MARKINGS);
  }

  getMarkingsExclusionsHelper() {
    return new ItemsServiceHelper<DatabaseTypes.MarkingsExclusions>(this, CollectionNames.MARKINGS_EXCLUSIONS);
  }

  getCanteensHelper() {
    return new ItemsServiceHelper<DatabaseTypes.Canteens>(this, CollectionNames.CANTEENS);
  }

  getApartmentsHelper() {
    return new ItemsServiceHelper<DatabaseTypes.Apartments>(this, CollectionNames.APARTMENTS);
  }

  getBuildingsHelper() {
    return new ItemsServiceHelper<DatabaseTypes.Buildings>(this, CollectionNames.BUILDINGS);
  }

  getNewsHelper() {
    return new ItemsServiceHelper<DatabaseTypes.News>(this, CollectionNames.NEWS);
  }

  getUsersHelper() {
    return new UserHelper(this, CollectionNames.USERS);
  }

  getShareServiceHelper() {
    return new ShareServiceHelper(this);
  }

  getUtilizationEntriesHelper() {
    return new ItemsServiceHelper<DatabaseTypes.UtilizationsEntries>(this, CollectionNames.UTILIZATION_ENTRIES);
  }

  getUtilizationGroupsHelper() {
    return new ItemsServiceHelper<DatabaseTypes.UtilizationsGroups>(this, CollectionNames.UTILIZATION_GROUPS);
  }

  getWashingmachinesHelper() {
    return new ItemsServiceHelper<DatabaseTypes.Washingmachines>(this, CollectionNames.WASHINGMACHINES);
  }

  getWashingmachinesJobsHelper() {
    return new ItemsServiceHelper<DatabaseTypes.WashingmachinesJobs>(this, CollectionNames.WASHINGMACHINES_JOBS);
  }

  getWorkflowsHelper() {
    return new ItemsServiceHelper<DatabaseTypes.Workflows>(this, CollectionNames.WORKFLOWS);
  }

  getWorkflowsRunsHelper() {
    return new WorkflowsRunHelper(this, CollectionNames.WORKFLOWS_RUNS);
  }

  getItemsServiceHelper<T>(collectionName: CollectionNames) {
    return new ItemsServiceHelper<T>(this, collectionName);
  }

  async sendMail(mail: Partial<DatabaseTypes.Mails>) {
    let mailsHelper = this.getMailsHelper();
    return await mailsHelper.createOne(mail);
  }

  getMailsHelper() {
    return new ItemsServiceHelper<DatabaseTypes.Mails>(this, CollectionNames.MAILS);
  }

  getMailsFilesHelper() {
    return new ItemsServiceHelper<DatabaseTypes.MailsFiles>(this, CollectionNames.MAILS_FILES);
  }

  getFilesHelper() {
    return new FilesServiceHelper(this);
  }

  getFieldsServiceHelper() {
    return new DirectusFieldsServiceHelper(this);
  }

  async getFoodsImageFolderId(): Promise<string | undefined> {
    console.log('MyDatabaseHelper.getFoodsImageFolderId - fieldsMeta:');
    let fieldsServiceHelper = this.getFieldsServiceHelper();
    const folder = await fieldsServiceHelper.getFolderIdForFileFieldInCollection(CollectionNames.FOODS, CollectionFieldNames[CollectionNames.FOODS].IMAGE);
    console.log('MyDatabaseHelper.getFoodsImageFolderId - folder:');
    console.log(folder);
    return folder || undefined;
  }
}
