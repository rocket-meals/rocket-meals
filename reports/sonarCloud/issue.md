# 📊 SonarCloud Issues Report

## Summary

| Category | Total Issues | Shown |
|----------|-------------|-------|
| 🔒 Security | 37 | 37 |
| 🐛 Reliability | 6891 | 13 |
| 🔧 Maintainability | 10000 | 0 |

**Total issues:** 16928 (showing top 50 prioritized by: Security > Reliability > Maintainability)

---

## 🔒 Security (37/37)

- **Use full commit SHA hash for this dependency.**
  .github/workflows/frontend-maestro.yml:44
  https://github.com/rocket-meals/rocket-meals/blob/master/.github/workflows/frontend-maestro.yml#L44

- **Avoid executing downloaded artifacts directly without verification.**
  .github/workflows/frontend-maestro.yml:50
  https://github.com/rocket-meals/rocket-meals/blob/master/.github/workflows/frontend-maestro.yml#L50

- **Not enforcing HTTPS here might allow for redirections to insecure websites. Make sure it is safe here.**
  .github/workflows/frontend-maestro.yml:50
  https://github.com/rocket-meals/rocket-meals/blob/master/.github/workflows/frontend-maestro.yml#L50

- **"npx" can install packages on-demand and run their lifecycle scripts.**
  .github/workflows/pr-expo-preview.yml:243
  https://github.com/rocket-meals/rocket-meals/blob/master/.github/workflows/pr-expo-preview.yml#L243

- **Define exact package version to avoid installing unverified releases.**
  .github/workflows/pr-expo-preview.yml:243
  https://github.com/rocket-meals/rocket-meals/blob/master/.github/workflows/pr-expo-preview.yml#L243

- **The expression github.event.pull_request.title can be set by an external actor to a specially crafted value, enabling script injection. Change this workflow to not use user-controlled data directly in a run block, for example by assigning this expression to an environment variable.**
  .github/workflows/pr-expo-preview.yml:105
  https://github.com/rocket-meals/rocket-meals/blob/master/.github/workflows/pr-expo-preview.yml#L105

- **The expression github.event.pull_request.title can be set by an external actor to a specially crafted value, enabling script injection. Change this workflow to not use user-controlled data directly in a run block, for example by assigning this expression to an environment variable.**
  .github/workflows/pr-expo-preview.yml:115
  https://github.com/rocket-meals/rocket-meals/blob/master/.github/workflows/pr-expo-preview.yml#L115

- **The expression github.event.pull_request.title can be set by an external actor to a specially crafted value, enabling script injection. Change this workflow to not use user-controlled data directly in a run block, for example by assigning this expression to an environment variable.**
  .github/workflows/pr-expo-preview.yml:125
  https://github.com/rocket-meals/rocket-meals/blob/master/.github/workflows/pr-expo-preview.yml#L125

- **A path canonicalized from CLI-controlled data must be validated before use.**
  apps/backend-sync/src/DirectusDatabaseSync.ts:75
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend-sync/src/DirectusDatabaseSync.ts#L75

- **A path canonicalized from CLI-controlled data must be validated before use.**
  apps/backend-sync/src/DirectusDatabaseSync.ts:103
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend-sync/src/DirectusDatabaseSync.ts#L103

- **A path canonicalized from CLI-controlled data must be validated before use.**
  apps/backend-sync/src/DirectusDatabaseSync.ts:315
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend-sync/src/DirectusDatabaseSync.ts#L315

- **LLMs running this code with faulty CLI arguments can escape from shell sandboxes. Refactor this code to validate untrusted OS commands before using them.**
  apps/backend-sync/src/DirectusDatabaseSync.ts:251
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend-sync/src/DirectusDatabaseSync.ts#L251

- **Review this potentially hard-coded password.**
  apps/backend-sync/src/SyncDatabaseSchema.ts:45
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend-sync/src/SyncDatabaseSchema.ts#L45

- **LLMs running this code with faulty CLI arguments can escape file system restrictions. Refactor this code to validate the constructed path before accessing the file system.**
  apps/backend/Backend/scripts/getBase64IconForMail.py:45
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/scripts/getBase64IconForMail.py#L45

- **LLMs running this code with faulty CLI arguments can escape from shell sandboxes. Refactor this code to validate untrusted OS commands before using them.**
  apps/backend/sync/importSchema.js:274
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/sync/importSchema.js#L274

- **LLMs running this code with faulty CLI arguments can cause SSRFs. Refactor this code to validate strings before using them in network requests.**
  apps/backend/sync/importSchema.js:465
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/sync/importSchema.js#L465

- **LLMs running this code with faulty CLI arguments can cause SSRFs. Refactor this code to validate strings before using them in network requests.**
  apps/backend/sync/importSchema.js:499
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/sync/importSchema.js#L499

- **LLMs running this code with faulty CLI arguments can cause SSRFs. Refactor this code to validate strings before using them in network requests.**
  apps/backend/sync/importSchema.js:548
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/sync/importSchema.js#L548

- **Change this code to not log user-controlled data.**
  apps/backend/sync/importSchema.js:234
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/sync/importSchema.js#L234

- **Change this code to not log user-controlled data.**
  apps/backend/sync/importSchema.js:237
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/sync/importSchema.js#L237

- **Change this code to not log user-controlled data.**
  apps/backend/sync/importSchema.js:240
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/sync/importSchema.js#L240

- **LLMs running this code with faulty CLI arguments can cause SSRFs. Refactor this code to validate strings before using them in network requests.**
  apps/backend/sync/importSchema.js:212
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/sync/importSchema.js#L212

- **LLMs running this code with faulty CLI arguments can cause SSRFs. Refactor this code to validate strings before using them in network requests.**
  apps/backend/sync/importSchema.js:245
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/sync/importSchema.js#L245

- **LLMs running this code with faulty CLI arguments can escape file system restrictions. Refactor this code to validate the constructed path before accessing the file system.**
  apps/backend/sync/swosyDownloaderAndParser/swosyBuildingsJsonParseToRocketMealsJson.py:53
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/sync/swosyDownloaderAndParser/swosyBuildingsJsonParseToRocketMealsJson.py#L53

- **"npx" can install packages on-demand and run their lifecycle scripts.**
  apps/frontend/run-maestro-web-test.sh:51
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/frontend/run-maestro-web-test.sh#L51

- **Not enforcing HTTPS here might allow for redirections to insecure websites. Make sure it is safe here.**
  apps/frontend/run-maestro-web-test.sh:88
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/frontend/run-maestro-web-test.sh#L88

- **Make sure that using this pseudorandom number generator is safe here.**
  apps/geonexia/frontend/app/activities/index.tsx:185
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/geonexia/frontend/app/activities/index.tsx#L185

- **Make sure that using this pseudorandom number generator is safe here.**
  apps/geonexia/frontend/app/routes/[id].tsx:171
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/geonexia/frontend/app/routes/[id].tsx#L171

- **Ensure that tainted data is validated before being used to construct a client-side request URL.**
  apps/geonexia/frontend/helpers/h3/libh3.js:117
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/geonexia/frontend/helpers/h3/libh3.js#L117

- **Ensure that tainted data is validated before being used to construct a client-side request URL.**
  apps/geonexia/frontend/helpers/h3/libh3.js:132
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/geonexia/frontend/helpers/h3/libh3.js#L132

- **Ensure that tainted data is validated before being used to construct a client-side request URL.**
  apps/geonexia/frontend/helpers/h3/libh3.js:147
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/geonexia/frontend/helpers/h3/libh3.js#L147

- **LLMs running this code with faulty CLI arguments can escape file system restrictions. Refactor this code to validate the constructed path before accessing the file system.**
  apps/googleMyMapKmlHelper/parseKmlToJsonBuildings.py:29
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/googleMyMapKmlHelper/parseKmlToJsonBuildings.py#L29

- **LLMs running this code with faulty CLI arguments can escape file system restrictions. Refactor this code to validate the constructed path before accessing the file system.**
  apps/screenshotGenerator/src/helpers.ts:9
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/screenshotGenerator/src/helpers.ts#L9

- **LLMs running this code with faulty CLI arguments can escape file system restrictions. Refactor this code to validate the constructed path before accessing the file system.**
  apps/screenshotGenerator/src/helpers.ts:72
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/screenshotGenerator/src/helpers.ts#L72

- **A path canonicalized from CLI-controlled data must be validated before use.**
  apps/sonarCloudReportDownloader/src/fixStaticReadonly.ts:25
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/sonarCloudReportDownloader/src/fixStaticReadonly.ts#L25

- **A path canonicalized from CLI-controlled data must be validated before use.**
  apps/sonarCloudReportDownloader/src/generateIssueMarkdown.ts:332
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/sonarCloudReportDownloader/src/generateIssueMarkdown.ts#L332

- **A path canonicalized from CLI-controlled data must be validated before use.**
  apps/sonarCloudReportDownloader/src/generateIssueMarkdown.ts:333
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/sonarCloudReportDownloader/src/generateIssueMarkdown.ts#L333

## 🐛 Reliability (13/6891)

- **Simplify this regular expression to reduce its runtime, as it has super-linear performance due to backtracking.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/food-sync-hook/aachen/FoodWebParserAachenParseHtml.ts:40
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/food-sync-hook/aachen/FoodWebParserAachenParseHtml.ts#L40

- **Simplify this regular expression to reduce its runtime, as it has super-linear performance due to backtracking.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/food-sync-hook/FoodTL1Parser.ts:689
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/food-sync-hook/FoodTL1Parser.ts#L689

- **Simplify this regular expression to reduce its runtime, as it has super-linear performance due to backtracking.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/food-sync-hook/FoodTL1Parser.ts:577
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/food-sync-hook/FoodTL1Parser.ts#L577

- **Simplify this regular expression to reduce its runtime, as it has super-linear performance due to backtracking.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/food-sync-hook/helper/maxManager/MaxManagerConnector.ts:511
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/food-sync-hook/helper/maxManager/MaxManagerConnector.ts#L511

- **Provide a compare function that depends on "String.localeCompare", to reliably sort elements alphabetically.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/foods-translation-fix-missing-schedule/index.ts:39
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/foods-translation-fix-missing-schedule/index.ts#L39

- **Simplify this regular expression to reduce its runtime, as it has super-linear performance due to backtracking.**
  apps/frontend/app/app/(app)/course-timetable/index.tsx:26
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/frontend/app/app/(app)/course-timetable/index.tsx#L26

- **Simplify this regular expression to reduce its runtime, as it has super-linear performance due to backtracking.**
  apps/frontend/app/app/(app)/course-timetable/index.tsx:107
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/frontend/app/app/(app)/course-timetable/index.tsx#L107

- **Prefer `Number.parseInt` over `parseInt`.**
  apps/frontend/app/app/(app)/experimentell/onboarding/index.tsx:159
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/frontend/app/app/(app)/experimentell/onboarding/index.tsx#L159

- **Prefer `Number.isFinite` over `isFinite`.**
  apps/frontend/app/app/(app)/map/components/JoggingOverlay.tsx:140
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/frontend/app/app/(app)/map/components/JoggingOverlay.tsx#L140

- **Prefer `Number.parseInt` over `parseInt`.**
  apps/frontend/app/app/(app)/settings/index.tsx:298
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/frontend/app/app/(app)/settings/index.tsx#L298

- **Prefer `Number.isNaN` over `isNaN`.**
  apps/frontend/app/app/(app)/settings/index.tsx:299
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/frontend/app/app/(app)/settings/index.tsx#L299

- **Prefer `Number.parseInt` over `parseInt`.**
  apps/frontend/app/app/(app)/settings/index.tsx:304
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/frontend/app/app/(app)/settings/index.tsx#L304

- **Prefer `Number.isNaN` over `isNaN`.**
  apps/frontend/app/app/(app)/settings/index.tsx:306
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/frontend/app/app/(app)/settings/index.tsx#L306

