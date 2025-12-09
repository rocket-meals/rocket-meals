import axios, { AxiosInstance } from 'axios';
import fse from 'fs-extra';
import path from 'path';
import generateTsTypes from 'lib/generateTypes/ts';

export interface DirectusTypesGeneratorOptions {
  directusUrl: string;
  adminEmail: string;
  adminPassword: string;
  outputPath?: string;
  useIntersectionTypes?: boolean;
  sdk11?: boolean;
  logger?: (message: string) => void;
}

export class DirectusTypesGenerator {
  private readonly outputPath: string;
  private readonly useIntersectionTypes: boolean;
  private readonly sdk11: boolean;
  private readonly logger: (message: string) => void;

  constructor(private readonly options: DirectusTypesGeneratorOptions) {
    this.outputPath =
      options.outputPath ??
      path.resolve(
        __dirname,
        '../../../../../../../packages/common/src/databaseTypes/types.ts'
      );
    this.useIntersectionTypes = options.useIntersectionTypes ?? false;
    this.sdk11 = options.sdk11 ?? true;
    this.logger = options.logger ?? (() => undefined);
  }

  public async generateTypes(): Promise<void> {
    this.logger(`Generating Directus types into ${this.outputPath}...`);
    const apiClient = await this.createAuthenticatedApiClient();
    const types = await generateTsTypes(
      apiClient,
      this.useIntersectionTypes,
      this.sdk11
    );

    await fse.ensureDir(path.dirname(this.outputPath));
    await fse.writeFile(this.outputPath, `${types}\n`);
    this.logger('Directus types successfully generated.');
  }

  public getOutputPath(): string {
    return this.outputPath;
  }

  private async createAuthenticatedApiClient(): Promise<AxiosInstance> {
    const loginResponse = await axios.post(
      `${this.options.directusUrl}/auth/login`,
      {
        email: this.options.adminEmail,
        password: this.options.adminPassword,
      }
    );
    const accessToken = loginResponse.data?.data?.access_token;

    if (!accessToken) {
      throw new Error('Could not retrieve Directus access token for type generation');
    }

    return axios.create({
      baseURL: this.options.directusUrl,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }
}
