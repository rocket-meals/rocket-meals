import { DateHelperTimezone } from 'repo-depkit-common';

export enum SyncForCustomerEnum {
  TEST = 'Test',
  // Real customers
  OSNABRUECK = 'Osnabrück',
  HANNOVER = 'Hannover',
  // Test customer for development purposes
  AACHEN = 'Aachen',
  MUENSTER = 'Münster',
}

export class EnvVariableHelper {
  public static getEnvVariable(name: string): string | undefined {
    let envVariable = process.env[name];
    //if (envVariable == null) {
    //    throw new Error("Environment Variable " + name + " not set.");
    //}
    return envVariable;
  }

  public static isInsideDocker() {
    let isInsideDocker = !process.env.JEST_WORKER_ID; // Falls Jest gesetzt ist, dann ist es ein lokaler Test
    return isInsideDocker;
  }

  static getTimeZoneString(): DateHelperTimezone {
    let envTimeZone = this.getEnvVariable('TZ');
    if (envTimeZone && envTimeZone.length > 0) {
      return envTimeZone as any as DateHelperTimezone;
    }
    return DateHelperTimezone.GERMANY;
  }

  static getFoodSyncMode() {
    return this.getEnvVariable('FOOD_SYNC_MODE'); // Options: "TL1CSV", "TL1WEB", "SWOSY"
  }

  static getFoodSyncTL1FileExportCsvFilePath() {
    return this.getEnvVariable('FOOD_SYNC_TL1FILE_EXPORT_CSV_FILE_PATH');
  }

  static getMarkingSyncTL1FileCreateOnlyFromExportCsvFile() {
    return this.getEnvVariable('MARKING_SYNC_TL1FILE_CREATE_ONLY_FROM_EXPORT_CSV_FILE') === 'true';
  }

  static getFoodSyncTL1FileExportCsvFileEncoding() {
    return (this.getEnvVariable('FOOD_SYNC_TL1FILE_EXPORT_CSV_FILE_ENCODING') || 'latin1') as BufferEncoding;
  }

  static getFoodSyncTL1WebExportUrl() {
    return this.getEnvVariable('FOOD_SYNC_TL1WEB_EXPORT_URL');
  }

  static getHousingContractCsvFilePath() {
    return this.getEnvVariable('HOUSING_CONTRACT_SYNC_TL1FILE_EXPORT_CSV_FILE_PATH');
  }

  static secretCache: string | null = null;
  static getSecret() {
    let secretFromEnv = this.getEnvVariable('SECRET');
    if (secretFromEnv) {
      return secretFromEnv;
    }
    if (!this.secretCache) {
      this.secretCache = 'secret';
    }
    return this.secretCache;
  }

  static getAccessTokenTTL() {
    return this.getEnvVariable('ACCESS_TOKEN_TTL');
  }

  static getRefreshTTL() {
    return this.getEnvVariable('REFRESH_TOKEN_TTL');
  }

  static getFoodImageSyncSwosyApiServerUrl() {
    return this.getEnvVariable('FOOD_IMAGE_SYNC_SWOSY_API_SERVER_URL');
  }

  static getOpenAiToken() {
    return this.getEnvVariable('OPENAI_API_KEY');
  }

  static getMarkingSyncMode() {
    return this.getEnvVariable('MARKING_SYNC_MODE'); // Options: "TL1CSV", "TL1WEB", "SWOSY"
  }

  static getMarkingSyncTL1FileExportCsvFileEncoding(): any {
    return this.getEnvVariable('MARKING_SYNC_TL1FILE_EXPORT_CSV_FILE_ENCODING') || ('utf8' as BufferEncoding);
  }

  static getEnvFieldNameForAutoTranslateApiKey(): string {
    return 'AUTO_TRANSLATE_API_KEY';
  }

  static getAutoTranslateApiKey() {
    return this.getEnvVariable(EnvVariableHelper.getEnvFieldNameForAutoTranslateApiKey());
  }

  static getAdminEmail() {
    return this.getEnvVariable('ADMIN_EMAIL');
  }

  static getAdminPassword() {
    return this.getEnvVariable('ADMIN_PASSWORD');
  }

  static getSyncForCustomer(): SyncForCustomerEnum | null {
    let value = this.getEnvVariable('SYNC_FOR_CUSTOMER');
    // check if value is a valid enum value
    if (Object.values(SyncForCustomerEnum).includes(value as SyncForCustomerEnum)) {
      return value as SyncForCustomerEnum;
    } else {
      return null;
    }
  }
}
