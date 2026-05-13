import { chromium } from 'playwright';
import * as fs from 'node:fs';
import * as path from 'node:path';

const EMAIL_INPUT_SELECTOR = 'input[type="email"], input[name="email"], #email';
const PASSWORD_INPUT_SELECTOR = 'input[type="password"], input[name="password"], #password';
const SUBMIT_BUTTON_SELECTOR = 'button[type="submit"], [type="submit"], button:has-text("Sign In"), button:has-text("Login"), button:has-text("Anmelden")';
const DOWNLOAD_BUTTON_SELECTOR = 'button:has-text("Download"), a:has-text("Download"), [data-test="download"], .download-button';

import { DirectusCredentials } from './DirectusDatabaseSync';

export interface DirectusTypeDownloaderOptions extends DirectusCredentials {
  targetTypesFilePath: string;
}

export class DirectusTypeDownloaderHelper {
  private readonly options: DirectusTypeDownloaderOptions;

  constructor(options: DirectusTypeDownloaderOptions) {
    this.options = options;
  }

  public async downloadTypes(): Promise<void> {
    const { directusInstanceUrl, adminEmail, adminPassword, targetTypesFilePath } = this.options;

    const loginUrl = `${directusInstanceUrl}/admin/login`;
    const generateTypesUrl = `${directusInstanceUrl}/admin/generate-types/ts`;

    console.log('🌐 Starte Browser für TypeScript-Typen-Download...');
    console.log(`📡 Ziel-URL: ${generateTypesUrl}`);

    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext({
        ignoreHTTPSErrors: true,
      });
      const page = await context.newPage();

      // Login
      console.log(`🔐 Navigiere zur Login-Seite: ${loginUrl}`);
      await page.goto(loginUrl, { waitUntil: 'networkidle' });

      console.log('✏️  Fülle Login-Formular aus...');
      await page.fill(EMAIL_INPUT_SELECTOR, adminEmail);
      await page.fill(PASSWORD_INPUT_SELECTOR, adminPassword);
      await page.click(SUBMIT_BUTTON_SELECTOR);

      console.log('⏳ Warte auf erfolgreichen Login...');
      await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 30000 });
      console.log('✅ Erfolgreich eingeloggt');

      // Navigate to generate-types page
      console.log(`🔗 Navigiere zur Typen-Generierungs-Seite: ${generateTypesUrl}`);
      await page.goto(generateTypesUrl, { waitUntil: 'networkidle' });

      // Wait for the Download button to be visible (up to 30 seconds)
      console.log('⏳ Warte auf Download-Button...');
      await page.waitForSelector(DOWNLOAD_BUTTON_SELECTOR, { state: 'visible', timeout: 30000 });

      // The button is visible immediately but disabled while types are being generated.
      // Wait until it becomes enabled before clicking.
      console.log('⏳ Warte bis Download-Button aktiviert ist...');
      await page.waitForFunction(
        () => {
          const el = Array.from(document.querySelectorAll('button, a')).find(
            b => b.textContent?.trim().toLowerCase().includes('download')
          ) as HTMLButtonElement | HTMLAnchorElement | undefined;
          return el !== undefined && !(el as HTMLButtonElement).disabled && !el.hasAttribute('disabled');
        },
        { timeout: 60000 }
      );

      // Click Download button and capture the download
      console.log('📥 Klicke Download-Button...');
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click(DOWNLOAD_BUTTON_SELECTOR),
      ]);

      console.log('💾 Speichere heruntergeladene Datei...');
      const downloadPath = await download.path();
      if (!downloadPath) {
        throw new Error('Download fehlgeschlagen – kein Dateipfad erhalten');
      }

      const targetDir = path.dirname(targetTypesFilePath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      fs.copyFileSync(downloadPath, targetTypesFilePath);
      console.log(`✅ TypeScript-Typen erfolgreich gespeichert: ${targetTypesFilePath}`);
    } finally {
      await browser.close();
    }
  }
}
