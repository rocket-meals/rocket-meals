import { PdfGeneratorOptions, RequestOptions } from './PdfGeneratorInterfaces';
import {GeneratePdfFromHtmlProps, HtmlPdfGeneratorInterface} from "./HtmlPdfGeneratorInterface";
import { default as puppeteerCore } from 'puppeteer-core';
import { EnvVariableHelper } from '../EnvVariableHelper';

export class PuppeteerGenerator implements HtmlPdfGeneratorInterface {
  public static PuppeteerCore: any = puppeteerCore;
  public static PuppeteerForJest: any = undefined;

  public static getPuppeteerLib() {
    return this.PuppeteerForJest || this.PuppeteerCore;
  }

  /**
   * rocket-meals-directus-2         | Error generating PDF: yx: Navigation timeout of 30000 ms exceeded
   * rocket-meals-directus-2         |     at new e (file:///directus/extensions/directus-extension-rocket-meals-bundle/dist/api.js?t=1747127408441:64:5072)
   * rocket-meals-directus-2         |     at e.create (file:///directus/extensions/directus-extension-rocket-meals-bundle/dist/api.js?t=1747127408441:64:4760)
   * rocket-meals-directus-2         |     at new eG (file:///directus/extensions/directus-extension-rocket-meals-bundle/dist/api.js?t=1747127408441:323:1107)
   * rocket-meals-directus-2         |     at dx.setContent (file:///directus/extensions/directus-extension-rocket-meals-bundle/dist/api.js?t=1747127408441:328:4947)
   * rocket-meals-directus-2         |     at async MG.setContent (file:///directus/extensions/directus-extension-rocket-meals-bundle/dist/api.js?t=1747127408441:210:4370)
   * rocket-meals-directus-2         |     at async Z0.generatePdfFromHtmlPuppeteer (file:///directus/extensions/directus-extension-rocket-meals-bundle/dist/api.js?t=1747127408441:535:3742)
   * rocket-meals-directus-2         |     at async e1.generatePdfFromHtml (file:///directus/extensions/directus-extension-rocket-meals-bundle/dist/api.js?t=1747127408441:535:4270)
   * rocket-meals-directus-2         |     at async r1 (file:///directus/extensions/directus-extension-rocket-meals-bundle/dist/api.js?t=1747127408441:535:8881)
   * rocket-meals-directus-2         |     at async EventEmitter.<anonymous> (file:///directus/extensions/directus-extension-rocket-meals-bundle/dist/api.js?t=1747127408441:535:14756)
   * rocket-meals-directus-2         |     at async Promise.all (index 1)
   */

  static async generatePdfFromHtmlPuppeteer(
    data: GeneratePdfFromHtmlProps
  ): Promise<Buffer> {
    const { html, requestOptions, options = {} } = data;
    let browser;
    let puppeteer = PuppeteerGenerator.getPuppeteerLib();

    let isInsideDocker = EnvVariableHelper.isInsideDocker();

    let executablePath = isInsideDocker ? '/usr/bin/chromium' : undefined;

    try {
      browser = await puppeteer.launch({
        executablePath: executablePath,
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-vulkan',
          '--disable-extensions',
          '--disable-background-networking',
          '--disable-breakpad',
          '--disable-client-side-phishing-detection',
          '--disable-component-update',
          '--disable-default-apps',
          '--disable-hang-monitor',
          '--disable-ipc-flooding-protection',
          '--disable-popup-blocking',
          '--disable-prompt-on-repost',
          '--disable-sync',
          '--disable-translate',
          '--disable-logging',
          '--metrics-recording-only',
          '--mute-audio',
          '--no-first-run',
          '--safebrowsing-disable-auto-update',
          '--single-process',
          '--no-zygote',
          '--disable-features=AudioServiceOutOfProcess',
          '--disable-dev-shm-usage', // This helps with memory issues in Docker, since /dev/shm is often too small and causes crashes
        ],
      });

      const page = await browser.newPage();

      // Log failed image loads
      page.on('requestfailed', (request: any) => {
        if (request.resourceType() === 'image') {
          console.error(`Image failed to load: ${request.url()}`);
        }
      });

      //console.log("Bearer token: " + requestOptions.bearerToken);

      if (requestOptions.bearerToken || requestOptions.mockImageResolution) {
        await page.setRequestInterception(true);

        page.on('request', (request: any) => {
          const headers = requestOptions.bearerToken
            ? {
                ...request.headers(),
                Authorization: `Bearer ${requestOptions.bearerToken}`,
              }
            : request.headers();

          if (requestOptions.mockImageResolution && request.resourceType() === 'image') {
            //console.log('Mocking image resolution for:', request.url());

            // Aus URL evtl. Breite/Höhe extrahieren
            const match = request.url().match(/\/(\d+)(?:\/(\d+))?/);
            const width = match?.[1] || '200';
            const height = match?.[2] || match?.[1] || '200';

            // Einfaches SVG mit grauem Hintergrund, Text in der Mitte und Ecken
            const svg = `
                <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
                    <rect width="100%" height="100%" fill="#ccc"/>
                    <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
                          font-family="sans-serif" font-size="20" fill="#666">Image</text>
                    <text x="5" y="15" font-family="sans-serif" font-size="12" fill="#666">TL</text>
                    <text x="${Number(width) - 15}" y="15" font-family="sans-serif" font-size="12" fill="#666">TR</text>
                    <text x="5" y="${Number(height) - 5}" font-family="sans-serif" font-size="12" fill="#666">BL</text>
                    <text x="${Number(width) - 15}" y="${Number(height) - 5}" font-family="sans-serif" font-size="12" fill="#666">BR</text>
                </svg>
            `;

            request.respond({
              status: 200,
              contentType: 'image/svg+xml',
              body: Buffer.from(svg),
            });
            return;
          }

          request.continue({ headers });
        });
      }

      if (isInsideDocker) {
        // print if
      }

      await page.setContent(html, { waitUntil: 'domcontentloaded' });

      // Warten, bis alle Bilder geladen oder fehlgeschlagen sind
      await page.evaluate(() => {
        return Promise.all(
          Array.from(document.images).map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(resolve => {
              img.addEventListener('load', resolve);
              img.addEventListener('error', resolve); // auch Fehler beenden Warten
            });
          })
        );
      });

      const pdfUint8Array = await page.pdf(options);
      return Buffer.from(pdfUint8Array);
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF');
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  public async generatePdfFromHtml(
    data: GeneratePdfFromHtmlProps
  ): Promise<Buffer> {
    return await PuppeteerGenerator.generatePdfFromHtmlPuppeteer(data);
  }
}
