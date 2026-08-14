# 📊 SonarCloud Issues Report

## Summary

| Category | Total Issues | Shown |
|----------|-------------|-------|
| 🔒 Security | 13 | 13 |
| 🐛 Reliability | 13 | 13 |
| 🔧 Maintainability | 95 | 24 |

**Total issues:** 121 (showing top 50 prioritized by: Security > Reliability > Maintainability)

---

## 🔒 Security (13/13)

- **Lifecycle scripts are enabled by default in Yarn v2+.**
  .github/actions/tag-und-jahr-expo-update/action.yml:47
  https://github.com/rocket-meals/rocket-meals/blob/master/.github/actions/tag-und-jahr-expo-update/action.yml#L47

- **Lifecycle scripts are enabled by default in Yarn v2+.**
  .github/workflows/backend-schema-sync-pull.yml:55
  https://github.com/rocket-meals/rocket-meals/blob/master/.github/workflows/backend-schema-sync-pull.yml#L55

- **Lifecycle scripts are enabled by default in Yarn v2+.**
  .github/workflows/backend-schema-sync-pull.yml:52
  https://github.com/rocket-meals/rocket-meals/blob/master/.github/workflows/backend-schema-sync-pull.yml#L52

- **Make sure that no untrusted code is executed from a fork.**
  .github/workflows/ios-submit-review-geonexia.yml:39
  https://github.com/rocket-meals/rocket-meals/blob/master/.github/workflows/ios-submit-review-geonexia.yml#L39

- **Make sure that no untrusted code is executed from a fork.**
  .github/workflows/ios-submit-review-rocket-meals.yml:35
  https://github.com/rocket-meals/rocket-meals/blob/master/.github/workflows/ios-submit-review-rocket-meals.yml#L35

- **Make sure that no untrusted code is executed from a fork.**
  .github/workflows/ios-submit-review-score-tracker.yml:39
  https://github.com/rocket-meals/rocket-meals/blob/master/.github/workflows/ios-submit-review-score-tracker.yml#L39

- **Make sure that no untrusted code is executed from a fork.**
  .github/workflows/ios-submit-review-tag-und-jahr.yml:39
  https://github.com/rocket-meals/rocket-meals/blob/master/.github/workflows/ios-submit-review-tag-und-jahr.yml#L39

- **Verify the origin of the received message.**
  apps/frontend/app/components/MyMap/index.web.tsx:43
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/frontend/app/components/MyMap/index.web.tsx#L43

- **LLMs running this code with faulty CLI arguments can escape file system restrictions. Refactor this code to validate the constructed path before accessing the file system.**
  apps/scripts/store-metadata-extract.ts:82
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/scripts/store-metadata-extract.ts#L82

- **A path canonicalized from CLI-controlled data must be validated before use.**
  apps/scripts/store-metadata-extract.ts:82
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/scripts/store-metadata-extract.ts#L82

- **Change this code to prevent confidential data from leaking in logs.**
  apps/scripts/store-metadata-extract.ts:83
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/scripts/store-metadata-extract.ts#L83

- **Change this code to not log user-controlled data.**
  apps/scripts/submit-ios-review.ts:372
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/scripts/submit-ios-review.ts#L372

- **Verify the origin of the received message.**
  packages/common-ui/src/components/MyMap/index.web.tsx:141
  https://github.com/rocket-meals/rocket-meals/blob/master/packages/common-ui/src/components/MyMap/index.web.tsx#L141

## 🐛 Reliability (13/13)

- **Simplify this regular expression to reduce its runtime, as it has super-linear performance due to backtracking.**
  apps/score-tracker/frontend/helpers/ImageSearch.ts:168
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/score-tracker/frontend/helpers/ImageSearch.ts#L168

- **Prefer `Number.parseInt` over `parseInt`.**
  apps/scripts/check-build-version.ts:11
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/scripts/check-build-version.ts#L11

- **Prefer `Number.parseInt` over `parseInt`.**
  apps/scripts/check-build-version.ts:23
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/scripts/check-build-version.ts#L23

- **Simplify this regular expression to reduce its runtime, as it has super-linear performance due to backtracking.**
  apps/scripts/store-metadata-diff.ts:48
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/scripts/store-metadata-diff.ts#L48

- **Provide a compare function that depends on "String.localeCompare", to reliably sort elements alphabetically.**
  apps/scripts/store-metadata-extract.ts:53
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/scripts/store-metadata-extract.ts#L53

- **Simplify this regular expression to reduce its runtime, as it has super-linear performance due to backtracking.**
  packages/common-ui/src/components/CustomMarkdown/MarkdownLinkHelper.ts:83
  https://github.com/rocket-meals/rocket-meals/blob/master/packages/common-ui/src/components/CustomMarkdown/MarkdownLinkHelper.ts#L83

- **Simplify this regular expression to reduce its runtime, as it has super-linear performance due to backtracking.**
  packages/common/licenses/collectLicenses.ts:153
  https://github.com/rocket-meals/rocket-meals/blob/master/packages/common/licenses/collectLicenses.ts#L153

- **Prefer `String#codePointAt()` over `String#charCodeAt()`.**
  packages/common/src/CompressionHelper.ts:54
  https://github.com/rocket-meals/rocket-meals/blob/master/packages/common/src/CompressionHelper.ts#L54

- **Prefer `String#codePointAt()` over `String#charCodeAt()`.**
  packages/common/src/CompressionHelper.ts:74
  https://github.com/rocket-meals/rocket-meals/blob/master/packages/common/src/CompressionHelper.ts#L74

- **Simplify this regular expression to reduce its runtime, as it has super-linear performance due to backtracking.**
  packages/common/src/CompressionHelper.ts:153
  https://github.com/rocket-meals/rocket-meals/blob/master/packages/common/src/CompressionHelper.ts#L153

- **Prefer `String#codePointAt()` over `String#charCodeAt()`.**
  packages/common/src/CompressionHelper.ts:189
  https://github.com/rocket-meals/rocket-meals/blob/master/packages/common/src/CompressionHelper.ts#L189

- **Prefer `String.fromCodePoint()` over `String.fromCharCode()`.**
  packages/common/src/CompressionHelper.ts:196
  https://github.com/rocket-meals/rocket-meals/blob/master/packages/common/src/CompressionHelper.ts#L196

- **Prefer `String.fromCodePoint()` over `String.fromCharCode()`.**
  packages/common/src/CompressionHelper.ts:236
  https://github.com/rocket-meals/rocket-meals/blob/master/packages/common/src/CompressionHelper.ts#L236

## 🔧 Maintainability (24/95)

- **Refactor this function to reduce its Cognitive Complexity from 27 to the 15 allowed.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/files-without-folder-report-schedule/index.ts:29
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/files-without-folder-report-schedule/index.ts#L29

- **Refactor this function to reduce its Cognitive Complexity from 31 to the 15 allowed.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/food-sync-hook/ParseSchedule.ts:1248
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/food-sync-hook/ParseSchedule.ts#L1248

- **Async method 'resolveFoodofferToCreateOrLog' has too many parameters (8). Maximum allowed is 7.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/food-sync-hook/ParseSchedule.ts:1324
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/food-sync-hook/ParseSchedule.ts#L1324

- **Refactor this function to reduce its Cognitive Complexity from 19 to the 15 allowed.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/helpers/TranslationHelper.ts:353
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/helpers/TranslationHelper.ts#L353

- **Extract this nested ternary operation into an independent statement.**
  apps/frontend/app/components/Login/LoginDebugPanel.tsx:63
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/frontend/app/components/Login/LoginDebugPanel.tsx#L63

- **Do not use Array index in keys**
  apps/frontend/app/components/Login/LoginDebugPanel.tsx:74
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/frontend/app/components/Login/LoginDebugPanel.tsx#L74

- **Refactor this code to not use nested template literals.**
  apps/frontend/app/helper/authHelper.ts:267
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/frontend/app/helper/authHelper.ts#L267

- **The empty object is useless.**
  apps/frontend/app/redux/actions/FoodOffers/FoodOffers.ts:200
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/frontend/app/redux/actions/FoodOffers/FoodOffers.ts#L200

- **Remove this useless assignment to variable "liveSpeedKmh".**
  apps/geonexia/frontend/app/index.tsx:4338
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/geonexia/frontend/app/index.tsx#L4338

- **Prefer `.at(…)` over `[….length - index]`.**
  apps/geonexia/frontend/app/index.tsx:5436
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/geonexia/frontend/app/index.tsx#L5436

- **Refactor this function to reduce its Cognitive Complexity from 19 to the 15 allowed.**
  apps/geonexia/frontend/app/index.tsx:5390
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/geonexia/frontend/app/index.tsx#L5390

- **Remove this unused import of 'GameType'.**
  apps/score-tracker/frontend/app/games/[id].tsx:38
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/score-tracker/frontend/app/games/[id].tsx#L38

- **Remove this unused import of 'setGameTypeIcon'.**
  apps/score-tracker/frontend/app/games/[id].tsx:21
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/score-tracker/frontend/app/games/[id].tsx#L21

- **Refactor this code to not use nested template literals.**
  apps/score-tracker/frontend/app/games/[id].tsx:90
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/score-tracker/frontend/app/games/[id].tsx#L90

- **Extract this nested ternary operation into an independent statement.**
  apps/score-tracker/frontend/app/games/index.tsx:281
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/score-tracker/frontend/app/games/index.tsx#L281

- **Extract this nested ternary operation into an independent statement.**
  apps/score-tracker/frontend/app/games/index.tsx:284
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/score-tracker/frontend/app/games/index.tsx#L284

- **Refactor this code to not use nested template literals.**
  apps/score-tracker/frontend/app/games/index.tsx:206
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/score-tracker/frontend/app/games/index.tsx#L206

- **Refactor this function to reduce its Cognitive Complexity from 20 to the 15 allowed.**
  apps/score-tracker/frontend/app/index.tsx:110
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/score-tracker/frontend/app/index.tsx#L110

- **Extract this nested ternary operation into an independent statement.**
  apps/score-tracker/frontend/app/index.tsx:197
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/score-tracker/frontend/app/index.tsx#L197

- **Refactor this code to not use nested template literals.**
  apps/score-tracker/frontend/app/index.tsx:197
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/score-tracker/frontend/app/index.tsx#L197

- **Remove this unused import of 'resetAll'.**
  apps/score-tracker/frontend/app/match/index.tsx:49
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/score-tracker/frontend/app/match/index.tsx#L49

- **Refactor this code to not use nested template literals.**
  apps/score-tracker/frontend/app/match/index.tsx:431
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/score-tracker/frontend/app/match/index.tsx#L431

- **Remove this useless assignment to variable "friends".**
  apps/score-tracker/frontend/app/match/index.tsx:1370
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/score-tracker/frontend/app/match/index.tsx#L1370

- **Remove this useless assignment to variable "categoryValues".**
  apps/score-tracker/frontend/app/match/index.tsx:1374
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/score-tracker/frontend/app/match/index.tsx#L1374

