import * as fs from 'node:fs';
import * as path from 'node:path';
import { FetchIgnoreSelfSignedCertHelper } from './FetchIgnoreSelfSignedCertHelper';

export interface DirectusTypeDownloaderOptions {
  directusInstanceUrl: string;
  adminEmail: string;
  adminPassword: string;
  targetTypesFilePath: string;
}

export class DirectusTypeDownloaderHelper {
  private readonly options: DirectusTypeDownloaderOptions;

  constructor(options: DirectusTypeDownloaderOptions) {
    this.options = options;
  }

  /**
   * Authenticate with Directus and obtain an access token.
   */
  private async getAccessToken(): Promise<string> {
    const { directusInstanceUrl, adminEmail, adminPassword } = this.options;

    console.log('🔐 Authentifiziere bei Directus...');
    const response = await FetchIgnoreSelfSignedCertHelper.fetch(
      `${directusInstanceUrl}/auth/login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Login fehlgeschlagen (HTTP ${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const accessToken = data?.data?.access_token;
    if (!accessToken) {
      throw new Error('Login erfolgreich, aber kein access_token erhalten');
    }
    console.log('✅ Erfolgreich authentifiziert');
    return accessToken;
  }

  /**
   * Download TypeScript types from the generate-types-api endpoint in the
   * Directus bundle. The endpoint uses the same generation logic as the
   * existing generate-types UI module (modules/generate-types/index.js).
   */
  public async downloadTypes(): Promise<void> {
    const { directusInstanceUrl, targetTypesFilePath } = this.options;
    const generateTypesUrl = `${directusInstanceUrl}/generate-types-api/ts`;

    console.log('📡 Lade TypeScript-Typen vom generate-types-api Endpunkt...');

    const accessToken = await this.getAccessToken();

    const response = await FetchIgnoreSelfSignedCertHelper.fetch(generateTypesUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TypeScript-Typen-Download fehlgeschlagen (HTTP ${response.status}): ${errorText}`);
    }

    const typesContent = await response.text();

    if (!typesContent || typesContent.trim().length === 0) {
      throw new Error('TypeScript-Typen-Download fehlgeschlagen – leere Antwort erhalten');
    }

    const targetDir = path.dirname(targetTypesFilePath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    fs.writeFileSync(targetTypesFilePath, typesContent, 'utf-8');
    console.log(`✅ TypeScript-Typen erfolgreich gespeichert: ${targetTypesFilePath}`);
  }
}

