import puppeteer from 'puppeteer';
import { APP_ROUTES, AppLinks, GlobalParams } from 'repo-depkit-common';
import { compressScreenshotAndDeleteOld, createDirIfNotExists, createScreenshotUncompressed, deleteAllScreenshots, doesFileExist, getFileName, printEstimatedTime } from './helpers';
import { devices } from './devices';

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

// Define command-line arguments using yargs
const argv = yargs(hideBin(process.argv))
  .option('repositoryOwner', {
    alias: 'o',
    description: 'The owner of the repository',
    type: 'string',
    demandOption: false,
  })
  .option('repositoryName', {
    alias: 'r',
    description: 'The name of the repository',
    type: 'string',
    demandOption: false,
  })
  .option('screenshotDir', {
    alias: 'd',
    description: 'The directory to save screenshots',
    type: 'string',
    demandOption: false,
  })
  .option('browserLang', {
    alias: 'b',
    description: 'Language for the browser',
    type: 'string',
    demandOption: false,
  })
  // option to skip existing screenshots
  .option('skipExisting', {
    alias: 's',
    description: 'Skip existing screenshots',
    type: 'boolean',
    demandOption: false,
  })
  .option('baseUrl', {
    alias: 'u',
    description: 'Override base URL (defaults to GitHub Pages URL)',
    type: 'string',
    demandOption: false,
  })
  .help()
  .alias('help', 'h').argv as any;

// Use either environment variables or command-line arguments
const repositoryOwner = argv.repositoryOwner || process.env.REPOSITORY_OWNER;
const repositoryName = argv.repositoryName || process.env.REPOSITORY_NAME;
const screenshotDir = argv.screenshotDir || process.env.SCREENSHOT_DIR;
const skipExisting = argv.skipExisting || process.env.SKIP_EXISTING;
const browserLang = argv.browserLang || process.env.BROWSER_LANG || 'de';
const baseUrlOverride = argv.baseUrl || process.env.BASE_URL;

// check if all required environment variables are set
if (!repositoryOwner || !repositoryName || !screenshotDir) {
  console.error('Please provide the required environment variables or command-line arguments:');
  console.error('ENV: REPOSITORY_OWNER, REPOSITORY_NAME, SCREENSHOT_DIR');
  console.error('CLI: --repositoryOwner, --repositoryName, --screenshotDir');
  if (!repositoryOwner) console.error('Missing: REPOSITORY_OWNER');
  if (!repositoryName) console.error('Missing: REPOSITORY_NAME');
  if (!screenshotDir) console.error('Missing: SCREENSHOT_DIR');
  process.exit(1);
}

const screenshotDirWithSlash = screenshotDir.endsWith('/') ? screenshotDir : screenshotDir + '/';

console.log(`Generating screenshots for ${repositoryOwner}/${repositoryName}`);

const screens: string[] = APP_ROUTES;

const baseUrl = baseUrlOverride || AppLinks.getGithubPagesBaseUrl(repositoryOwner, repositoryName);

const urls = screens.map((screen: string) =>
  baseUrlOverride
    ? `${baseUrlOverride}/${AppLinks.build(screen, [
        { key: GlobalParams.kioskMode, value: true },
        { key: GlobalParams.deviceMock, value: 'iphone' },
      ])}`
    : AppLinks.getGithubPagesUrl(repositoryOwner, repositoryName, screen, [
        { key: GlobalParams.kioskMode, value: true },
        { key: GlobalParams.deviceMock, value: 'iphone' },
      ])
);

(async () => {
  let browser = await puppeteer.launch({
    args: [`--lang=${browserLang}`, '--no-sandbox', '--disable-setuid-sandbox'],
  });

  let totalAmountOfScreenshots = urls.length * devices.length;
  console.log(`Generating ${totalAmountOfScreenshots} screenshots - Urls: ${urls.length}, Devices: ${devices.length}`);

  await createDirIfNotExists(screenshotDir);
  if (!skipExisting) {
    await deleteAllScreenshots(screenshotDir);
  }
  await createDirIfNotExists(screenshotDir);

  let startDate = new Date();
  let currentScreenshot = 0;
  const listFailedScreenshotsUrls = [];

  for (const url of urls) {
    for (const device of devices) {
      currentScreenshot++;
      console.log(`Generating screenshot ${currentScreenshot} of ${totalAmountOfScreenshots}`);
      const fileName = getFileName(url, device, screenshotDirWithSlash, baseUrl);
      const darkMode = false;
      await createDirIfNotExists(fileName);
      if (skipExisting) {
        const fileExists = await doesFileExist(fileName);
        if (fileExists) {
          console.log(`Skipping existing screenshot: ${fileName}`);
          continue;
        }
      }
      try {
        await createScreenshotUncompressed(url, device, fileName, darkMode, browser);
        await compressScreenshotAndDeleteOld(fileName);
      } catch (error: any) {
        console.error(`Error creating screenshot for ${url} with device ${device.name}: ${error.message}`);
        listFailedScreenshotsUrls.push(url);
      }

      printEstimatedTime(startDate, currentScreenshot, totalAmountOfScreenshots);
      console.log('---');
    }
  }

  console.log(`Failed screenshots: ${listFailedScreenshotsUrls.length}`);
  for (const url of listFailedScreenshotsUrls) {
    console.log('- please check: ' + url);
  }

  await browser.close();
  console.log('All screenshots generated');
})();
