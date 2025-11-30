import { TranslatorSettings } from './TranslatorSettings';
import { EnvVariableHelper } from '../helpers/EnvVariableHelper';
import { MyDatabaseHelper } from '../helpers/MyDatabaseHelper';

export abstract class Translator {
  private readonly logger: any;
  translatorSettings: TranslatorSettings;
  private initialized = false;

  constructor(translatorSettings: TranslatorSettings, myDatabaseHelper: MyDatabaseHelper) {
    this.logger = myDatabaseHelper?.apiContext?.logger;
    this.translatorSettings = translatorSettings;
  }

  async init() {
    //console.log("Initializing Translator");
    let auth_key = await this.getAuthKey();
    if (!auth_key) {
      const message = 'Auth Key not set! Please set the key in .env file: ' + EnvVariableHelper.getEnvFieldNameForAutoTranslateApiKey();
      await this.setSettings(this.getSettingsAuthKeyErrorObject(message));
      return;
    }
    try {
      //console.log("Auth Key found");
      await this.reloadAuthKey(auth_key);
      this.initialized = true;
      let correctObj = await this.getSettingsAuthKeyCorrectObject();
      await this.setSettings(correctObj);
    } catch (error: any) {
      console.log('Error Initializing Translatior');
      console.log(error.toString());
      await this.setSettings(this.getSettingsAuthKeyErrorObject(error));
      this.initialized = false;
    }
  }

  async translate(text: string, source_language: string, destination_language: string) {
    if (!this.initialized) return null;
    const translation = await this.translateImplementation(text, source_language, destination_language);
    await this.reloadUsage(); //update usage stats
    return translation;
  }

  async getSettingsAuthKeyCorrectObject() {
    const usage = await this.getUsage();
    const extra = await this.getExtra();
    return {
      valid_auth_key: true,
      informations: 'Auth Key is valid!',
      ...usage,
      ...extra,
    };
  }

  getSettingsAuthKeyErrorObject(error: any) {
    return {
      auth_key: null,
      valid_auth_key: false,
      informations: 'Auth Key not valid!\n' + error.toString(),
    };
  }

  /** Private Methods */

  async reloadAuthKey(auth_key: string) {
    //console.log("Reload AuthKey");
    await this.reloadAuthKeyImplementation(auth_key);
    await this.reloadUsage();
  }

  async reloadUsage() {
    //console.log("Reload Usage");
    const usage = await this.getUsage();
    const used = usage.used || 0;
    const limit = usage.limit || 0;
    let percentage = 0;
    if (limit > 0) {
      percentage = Math.round((used / limit) * 100);
    }
    await this.setSettings({ percentage: percentage, ...usage });
  }

  async getUsage() {
    return await this.getUsageImplementation();
  }

  async getExtra() {
    return await this.getExtraImplementation();
  }

  async setSettings(newSettings: any) {
    await this.translatorSettings.setSettings(newSettings);
  }

  async getAuthKey() {
    return await this.translatorSettings.getAuthKey();
  }

  abstract translateImplementation(
    text: string,
    source_language: string,
    destination_language: string,
  ): Promise<any>;

  abstract reloadAuthKeyImplementation(auth_key: string): Promise<void>;

  abstract getUsageImplementation(): Promise<any>;

  abstract getExtraImplementation(): Promise<any>;
}
