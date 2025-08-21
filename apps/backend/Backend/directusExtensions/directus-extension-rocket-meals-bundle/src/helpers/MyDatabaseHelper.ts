import {ApiContext} from "./ApiContext";

import {CashregisterHelper} from "./itemServiceHelpers/CashregisterHelper";
import {ItemsServiceHelper} from "./ItemsServiceHelper";
import {CollectionNames} from "repo-depkit-common";
import {DatabaseTypes} from "repo-depkit-common"

import {ServerServiceCreator} from "./ItemsServiceCreator";
import {AppSettingsHelper} from "./itemServiceHelpers/AppSettingsHelper";
import {AutoTranslationSettingsHelper} from "./itemServiceHelpers/AutoTranslationSettingsHelper";
import {WorkflowsRunHelper} from "./itemServiceHelpers/WorkflowsRunHelper";
import {FilesServiceHelper} from "./FilesServiceHelper";
import {EventContext, SchemaOverview} from "@directus/types";
import {ShareServiceHelper} from "./ShareServiceHelper";
import {MyDatabaseHelperInterface} from "./MyDatabaseHelperInterface";
import {EnvVariableHelper} from "./EnvVariableHelper";
import ms from "ms";
import jwt from 'jsonwebtoken';
import {NanoidHelper} from "./NanoidHelper";
import {HelperRegistry} from "./HelperRegistry";

export type MyEventContext = EventContext;

export class MyDatabaseHelper implements MyDatabaseHelperInterface {

    public apiContext: ApiContext;
    public eventContext: MyEventContext | undefined;
    public useLocalServerMode: boolean = false;
    private helperRegistry: HelperRegistry;

    constructor(apiContext: ApiContext, eventContext?: MyEventContext) {
        this.apiContext = apiContext;
        // if available we should use eventContext - https://github.com/directus/directus/discussions/11051
        this.eventContext = eventContext; // stupid typescript error, because of the import
        // its better to use the eventContext, because of reusing the database connection instead of creating a new one
        this.helperRegistry = new HelperRegistry(this);
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
        if(this?.eventContext?.schema){
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
            provider: "default",
        })
        const secret = EnvVariableHelper.getSecret();
        if(!adminUser){
            console.error("Admin user not found")
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

        if(this.useLocalServerMode){
            return defaultServerUrl;
        }

        return EnvVariableHelper.getEnvVariable("PUBLIC_URL") || defaultServerUrl;
    }

    getServerPort(): string {
        let defaultServerPort = "8055";
        return EnvVariableHelper.getEnvVariable("PORT") || defaultServerPort;
    }

    getAppSettingsHelper() {
        return new AppSettingsHelper(this.apiContext);
    }

    getAutoTranslationSettingsHelper() {
        return new AutoTranslationSettingsHelper(this.apiContext);
    }

    getCashregisterHelper() {
        return new CashregisterHelper(this);
    }

    getShareServiceHelper() {
        return new ShareServiceHelper(this);
    }

    getWorkflowsRunsHelper() {
        return new WorkflowsRunHelper(this, CollectionNames.WORKFLOWS_RUNS);
    }

    getFilesHelper(){
        return new FilesServiceHelper(this);
    }

    // Keep the existing generic helper method for backward compatibility
    getItemsServiceHelper<T>(collectionName: CollectionNames) {
        return this.helperRegistry.getHelper<T>(collectionName);
    }

    // Delegate all collection helper methods to the registry
    getAppFeedbacksHelper() {
        return this.helperRegistry.getAppFeedbacksHelper();
    }

    getCollectionDatesLastUpdateHelper() {
        return this.helperRegistry.getCollectionDatesLastUpdateHelper();
    }

    getFoodFeedbacksHelper() {
        return this.helperRegistry.getFoodFeedbacksHelper();
    }

    getFoodsHelper() {
        return this.helperRegistry.getFoodsHelper();
    }

    getFoodFeedbackLabelsHelper() {
        return this.helperRegistry.getFoodFeedbackLabelsHelper();
    }

    getFoodsCategoriesHelper() {
        return this.helperRegistry.getFoodsCategoriesHelper();
    }

    getFoodsAttributesHelper() {
        return this.helperRegistry.getFoodsAttributesHelper();
    }

    getFoodFeedbackLabelEntriesHelper() {
        return this.helperRegistry.getFoodFeedbackLabelEntriesHelper();
    }

    getCanteenFeedbackLabelsHelper() {
        return this.helperRegistry.getCanteenFeedbackLabelsHelper();
    }

    getCanteenFeedbackLabelsEntriesHelper() {
        return this.helperRegistry.getCanteenFeedbackLabelsEntriesHelper();
    }

    getFormsHelper() {
        return this.helperRegistry.getFormsHelper();
    }

    getFormExtractsHelper() {
        return this.helperRegistry.getFormExtractsHelper();
    }

    getFormExtractFormFieldsHelper() {
        return this.helperRegistry.getFormExtractFormFieldsHelper();
    }

    getFormsFieldsHelper() {
        return this.helperRegistry.getFormsFieldsHelper();
    }

    getFormsSubmissionsHelper() {
        return this.helperRegistry.getFormsSubmissionsHelper();
    }

    getFormsAnswersHelper() {
        return this.helperRegistry.getFormsAnswersHelper();
    }

    getFoodoffersHelper() {
        return this.helperRegistry.getFoodoffersHelper();
    }

    getFoodofferCategoriesHelper() {
        return this.helperRegistry.getFoodofferCategoriesHelper();
    }

    getDevicesHelper() {
        return this.helperRegistry.getDevicesHelper();
    }

    getPushNotificationsHelper() {
        return this.helperRegistry.getPushNotificationsHelper();
    }

    getProfilesHelper() {
        return this.helperRegistry.getProfilesHelper();
    }

    getMarkingsHelper() {
        return this.helperRegistry.getMarkingsHelper();
    }

    getMarkingsExclusionsHelper() {
        return this.helperRegistry.getMarkingsExclusionsHelper();
    }

    getCanteensHelper() {
        return this.helperRegistry.getCanteensHelper();
    }

    getApartmentsHelper() {
        return this.helperRegistry.getApartmentsHelper();
    }

    getBuildingsHelper() {
        return this.helperRegistry.getBuildingsHelper();
    }

    getNewsHelper() {
        return this.helperRegistry.getNewsHelper();
    }

    getUsersHelper() {
        return this.helperRegistry.getUsersHelper();
    }

    getUtilizationEntriesHelper() {
        return this.helperRegistry.getUtilizationEntriesHelper();
    }

    getUtilizationGroupsHelper() {
        return this.helperRegistry.getUtilizationGroupsHelper();
    }

    getWashingmachinesHelper() {
        return this.helperRegistry.getWashingmachinesHelper();
    }

    getWashingmachinesJobsHelper() {
        return this.helperRegistry.getWashingmachinesJobsHelper();
    }

    getWorkflowsHelper() {
        return this.helperRegistry.getWorkflowsHelper();
    }

    getMailsHelper() {
        return this.helperRegistry.getMailsHelper();
    }

    getMailsFilesHelper() {
        return this.helperRegistry.getMailsFilesHelper();
    }

    async sendMail(mail: Partial<DatabaseTypes.Mails>) {
        let mailsHelper = this.getMailsHelper();
        return await mailsHelper.createOne(mail);
    }

}
