# 📊 SonarCloud Issues Report

## Summary

| Category | Total Issues | Shown |
|----------|-------------|-------|
| 🔒 Security | 14 | 14 |
| 🐛 Reliability | 6841 | 36 |
| 🔧 Maintainability | 10000 | 0 |

**Total issues:** 16855 (showing top 50 prioritized by: Security > Reliability > Maintainability)

---

## 🔒 Security (14/14)

- **inputs.previous-commit-sha is vulnerable to script injection: values of inputs are provided by whoever triggers the workflow. Change this action to not use user-controlled data directly in a run block, for example by assigning this expression to an environment variable.**
  .github/actions/check-build-number/action.yml:34
  https://github.com/rocket-meals/rocket-meals/blob/master/.github/actions/check-build-number/action.yml#L34

- **inputs.working-directory is vulnerable to script injection: values of inputs are provided by whoever triggers the workflow. Change this action to not use user-controlled data directly in a run block, for example by assigning this expression to an environment variable.**
  .github/actions/check-build-number/action.yml:42
  https://github.com/rocket-meals/rocket-meals/blob/master/.github/actions/check-build-number/action.yml#L42

- **inputs.working-directory is vulnerable to script injection: values of inputs are provided by whoever triggers the workflow. Change this action to not use user-controlled data directly in a run block, for example by assigning this expression to an environment variable.**
  .github/actions/check-build-number/action.yml:43
  https://github.com/rocket-meals/rocket-meals/blob/master/.github/actions/check-build-number/action.yml#L43

- **inputs.ref_name is vulnerable to script injection: values of inputs are provided by whoever triggers the workflow. Change this action to not use user-controlled data directly in a run block, for example by assigning this expression to an environment variable.**
  .github/actions/geonexia-expo-update/action.yml:184
  https://github.com/rocket-meals/rocket-meals/blob/master/.github/actions/geonexia-expo-update/action.yml#L184

- **inputs.ref_name is vulnerable to script injection: values of inputs are provided by whoever triggers the workflow. Change this action to not use user-controlled data directly in a run block, for example by assigning this expression to an environment variable.**
  .github/actions/geonexia-expo-update/action.yml:184
  https://github.com/rocket-meals/rocket-meals/blob/master/.github/actions/geonexia-expo-update/action.yml#L184

- **inputs.ref_name is vulnerable to script injection: values of inputs are provided by whoever triggers the workflow. Change this action to not use user-controlled data directly in a run block, for example by assigning this expression to an environment variable.**
  .github/actions/score-tracker-expo-update/action.yml:184
  https://github.com/rocket-meals/rocket-meals/blob/master/.github/actions/score-tracker-expo-update/action.yml#L184

- **inputs.ref_name is vulnerable to script injection: values of inputs are provided by whoever triggers the workflow. Change this action to not use user-controlled data directly in a run block, for example by assigning this expression to an environment variable.**
  .github/actions/score-tracker-expo-update/action.yml:184
  https://github.com/rocket-meals/rocket-meals/blob/master/.github/actions/score-tracker-expo-update/action.yml#L184

- **Review this potentially hard-coded password.**
  apps/backend-sync/src/SyncDatabaseSchema.ts:45
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend-sync/src/SyncDatabaseSchema.ts#L45

- **Change this code to not log user-controlled data.**
  apps/backend/sync/importSchema.js:234
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/sync/importSchema.js#L234

- **Change this code to not log user-controlled data.**
  apps/backend/sync/importSchema.js:237
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/sync/importSchema.js#L237

- **Change this code to not log user-controlled data.**
  apps/backend/sync/importSchema.js:240
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/sync/importSchema.js#L240

- **Ensure that tainted data is validated before being used to construct a client-side request URL.**
  apps/geonexia/frontend/helpers/h3/libh3.js:117
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/geonexia/frontend/helpers/h3/libh3.js#L117

- **Ensure that tainted data is validated before being used to construct a client-side request URL.**
  apps/geonexia/frontend/helpers/h3/libh3.js:132
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/geonexia/frontend/helpers/h3/libh3.js#L132

- **Ensure that tainted data is validated before being used to construct a client-side request URL.**
  apps/geonexia/frontend/helpers/h3/libh3.js:147
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/geonexia/frontend/helpers/h3/libh3.js#L147

## 🐛 Reliability (36/6841)

- **Prefer `Number.isFinite` over `isFinite`.**
  apps/frontend/app/app/(app)/map/components/JoggingOverlay.tsx:140
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/frontend/app/app/(app)/map/components/JoggingOverlay.tsx#L140

- **React Hook "usePlatformHelper" is called in function "handleNativeLogin" that is neither a React function component nor a custom React Hook function. React component names must start with an uppercase letter. React Hook names must start with the word "use".**
  apps/frontend/app/helper/authHelper.ts:38
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/frontend/app/helper/authHelper.ts#L38

- **React Hook "usePlatformHelper" is called in function "getIsLandScape" that is neither a React function component nor a custom React Hook function. React component names must start with an uppercase letter. React Hook names must start with the word "use".**
  apps/frontend/app/helper/DeviceHelper.ts:115
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/frontend/app/helper/DeviceHelper.ts#L115

- **React Hook "usePlatformHelper" is called in function "getDeviceInformationWithoutPushToken" that is neither a React function component nor a custom React Hook function. React component names must start with an uppercase letter. React Hook names must start with the word "use".**
  apps/frontend/app/helper/DeviceHelper.ts:144
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/frontend/app/helper/DeviceHelper.ts#L144

- **React Hook "usePlatformHelper" cannot be called in a class component. React Hooks must be called in a React function component or a custom React Hook function.**
  apps/frontend/app/helper/NotificationHelper.ts:75
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/frontend/app/helper/NotificationHelper.ts#L75

- **React Hook "usePlatformHelper" cannot be called at the top level. React Hooks must be called in a React function component or a custom React Hook function.**
  apps/frontend/app/helper/SystemActionHelper.ts:6
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/frontend/app/helper/SystemActionHelper.ts#L6

- **Prefer `Number.parseInt` over `parseInt`.**
  apps/frontend/app/redux/actions/CanteenVisits/CanteenVisits.ts:92
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/frontend/app/redux/actions/CanteenVisits/CanteenVisits.ts#L92

- **Prefer `Number.parseInt` over `parseInt`.**
  apps/frontend/app/redux/actions/CanteenVisits/CanteenVisits.ts:117
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/frontend/app/redux/actions/CanteenVisits/CanteenVisits.ts#L117

- **Prefer `Number.isFinite` over `isFinite`.**
  apps/geonexia/frontend/app/activities/[id].tsx:187
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/geonexia/frontend/app/activities/[id].tsx#L187

- **Prefer `Number.parseInt` over `parseInt`.**
  apps/geonexia/frontend/app/billboard-config/index.tsx:68
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/geonexia/frontend/app/billboard-config/index.tsx#L68

- **Prefer `String#replaceAll()` over `String#replace()`.**
  apps/geonexia/frontend/app/billboard-config/index.tsx:114
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/geonexia/frontend/app/billboard-config/index.tsx#L114

- **Prefer `String#replaceAll()` over `String#replace()`.**
  apps/geonexia/frontend/app/billboard-config/index.tsx:487
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/geonexia/frontend/app/billboard-config/index.tsx#L487

- **Prefer `Number.parseInt` over `parseInt`.**
  apps/geonexia/frontend/app/billboard-config/index.tsx:495
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/geonexia/frontend/app/billboard-config/index.tsx#L495

- **Prefer `Number.parseInt` over `parseInt`.**
  apps/geonexia/frontend/app/billboard-config/index.tsx:496
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/geonexia/frontend/app/billboard-config/index.tsx#L496

- **Prefer `String#replaceAll()` over `String#replace()`.**
  apps/geonexia/frontend/app/hex-texture-config/index.tsx:108
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/geonexia/frontend/app/hex-texture-config/index.tsx#L108

- **Prefer `String#replaceAll()` over `String#replace()`.**
  apps/geonexia/frontend/app/hex-texture-config/index.tsx:510
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/geonexia/frontend/app/hex-texture-config/index.tsx#L510

- **Prefer `Number.parseInt` over `parseInt`.**
  apps/geonexia/frontend/app/hex-texture-config/index.tsx:518
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/geonexia/frontend/app/hex-texture-config/index.tsx#L518

- **Prefer `Number.parseInt` over `parseInt`.**
  apps/geonexia/frontend/app/hex-texture-config/index.tsx:519
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/geonexia/frontend/app/hex-texture-config/index.tsx#L519

- **Provide a compare function that depends on "String.localeCompare", to reliably sort elements alphabetically.**
  apps/geonexia/frontend/app/index.tsx:1868
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/geonexia/frontend/app/index.tsx#L1868

- **Prefer `Number.parseInt` over `parseInt`.**
  apps/geonexia/frontend/app/index.tsx:111
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/geonexia/frontend/app/index.tsx#L111

- **Prefer `Number.parseFloat` over `parseFloat`.**
  apps/geonexia/frontend/app/index.tsx:1170
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/geonexia/frontend/app/index.tsx#L1170

- **Prefer `Number.isFinite` over `isFinite`.**
  apps/geonexia/frontend/app/index.tsx:766
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/geonexia/frontend/app/index.tsx#L766

- **Prefer `Number.parseInt` over `parseInt`.**
  apps/geonexia/frontend/app/index.tsx:60
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/geonexia/frontend/app/index.tsx#L60

- **Provide a compare function that depends on "String.localeCompare", to reliably sort elements alphabetically.**
  apps/geonexia/frontend/app/index.tsx:2836
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/geonexia/frontend/app/index.tsx#L2836

- **Prefer `Number.isFinite` over `isFinite`.**
  apps/geonexia/frontend/app/index.tsx:916
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/geonexia/frontend/app/index.tsx#L916

- **Prefer `String#replaceAll()` over `String#replace()`.**
  apps/geonexia/frontend/components/SettingsListBillboard/index.tsx:72
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/geonexia/frontend/components/SettingsListBillboard/index.tsx#L72

- **Prefer `String#replaceAll()` over `String#replace()`.**
  apps/geonexia/frontend/components/SettingsListHexTile/index.tsx:84
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/geonexia/frontend/components/SettingsListHexTile/index.tsx#L84

- **Prefer `Number.parseInt` over `parseInt`.**
  apps/geonexia/frontend/components/SpeechSettingsModal.tsx:119
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/geonexia/frontend/components/SpeechSettingsModal.tsx#L119

- **Prefer `Number.isNaN` over `isNaN`.**
  apps/geonexia/frontend/components/SpeechSettingsModal.tsx:120
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/geonexia/frontend/components/SpeechSettingsModal.tsx#L120

- **Prefer `Number.parseInt` over `parseInt`.**
  apps/geonexia/frontend/components/SpeechSettingsModal.tsx:158
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/geonexia/frontend/components/SpeechSettingsModal.tsx#L158

- **Prefer `Number.isNaN` over `isNaN`.**
  apps/geonexia/frontend/components/SpeechSettingsModal.tsx:159
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/geonexia/frontend/components/SpeechSettingsModal.tsx#L159

- **Provide a compare function that depends on "String.localeCompare", to reliably sort elements alphabetically.**
  apps/geonexia/frontend/helpers/ActivityMapRebuildHelper.ts:466
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/geonexia/frontend/helpers/ActivityMapRebuildHelper.ts#L466

- **Prefer `String#codePointAt()` over `String#charCodeAt()`.**
  apps/geonexia/frontend/helpers/ActivityMapRebuildHelper.ts:353
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/geonexia/frontend/helpers/ActivityMapRebuildHelper.ts#L353

- **Prefer `Number.isFinite` over `isFinite`.**
  apps/geonexia/frontend/helpers/ActivityStatsHelper.ts:24
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/geonexia/frontend/helpers/ActivityStatsHelper.ts#L24

- **Prefer `Number.parseInt` over `parseInt`.**
  apps/geonexia/frontend/helpers/h3/h3core.js:242
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/geonexia/frontend/helpers/h3/h3core.js#L242

- **Prefer `Number.parseInt` over `parseInt`.**
  apps/geonexia/frontend/helpers/h3/h3core.js:243
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/geonexia/frontend/helpers/h3/h3core.js#L243

