# 📊 SonarCloud Issues Report

## Summary

| Category | Total Issues | Shown |
|----------|-------------|-------|
| 🔒 Security | 2 | 2 |
| 🐛 Reliability | 5 | 5 |
| 🔧 Maintainability | 11 | 11 |

**Total issues:** 18

---

## 🔒 Security (2/2)

- **Client-Side Request Forgery via unsanitized user input**
  apps/maintenance-server/server.mjs:156
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/maintenance-server/server.mjs#L156

- **CORS Injection via unsanitized user input**
  apps/maintenance-server/server.mjs:197
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/maintenance-server/server.mjs#L197

## 🐛 Reliability (5/5)

- **Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator.**
  apps/frontend/app/app/(app)/experimentell/store-versions/index.tsx:92
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/frontend/app/app/(app)/experimentell/store-versions/index.tsx#L92

- **Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator.**
  apps/frontend/app/app/(app)/experimentell/store-versions/index.tsx:93
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/frontend/app/app/(app)/experimentell/store-versions/index.tsx#L93

- **Async method 'handleNotification' has no 'await' expression.**
  apps/frontend/app/helper/NotificationHelper.ts:87
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/frontend/app/helper/NotificationHelper.ts#L87

- **Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator.**
  apps/maintenance-server/server.mjs:279
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/maintenance-server/server.mjs#L279

- **Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator.**
  apps/maintenance-server/server.mjs:303
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/maintenance-server/server.mjs#L303

## 🔧 Maintainability (11/11)

- **Refactor this function to reduce its Cognitive Complexity from 18 to the 15 allowed.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/feature-wishes-hook/index.ts:76
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/feature-wishes-hook/index.ts#L76

- **'raw.id' will use Object's default stringification format ('[object Object]') when stringified.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/helpers/action-recommendations/ActionRecommendationPrompt.ts:114
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/helpers/action-recommendations/ActionRecommendationPrompt.ts#L114

- **Move this array "reverse" operation to a separate statement or replace it with "toReversed".**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/helpers/action-recommendations/ActionRecommendationService.ts:209
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/helpers/action-recommendations/ActionRecommendationService.ts#L209

- **Extract the assignment of "messagesByItem[item]" from this expression.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/helpers/action-recommendations/ActionRecommendationService.ts:214
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/helpers/action-recommendations/ActionRecommendationService.ts#L214

- **Refactor this code to not use nested template literals.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/helpers/action-recommendations/ActionRecommendationService.ts:161
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/helpers/action-recommendations/ActionRecommendationService.ts#L161

- **Extract this nested ternary operation into an independent statement.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/helpers/action-recommendations/ActionRecommendationService.ts:171
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/helpers/action-recommendations/ActionRecommendationService.ts#L171

- **Extract this nested ternary operation into an independent statement.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/helpers/rocket-meals-module/LivePulseHelper.ts:810
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/helpers/rocket-meals-module/LivePulseHelper.ts#L810

- **Replace this union type with a type alias.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/helpers/rocket-meals-module/LivePulseHelper.ts:689
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/helpers/rocket-meals-module/LivePulseHelper.ts#L689

- **Async method 'handleNotification' has no 'await' expression.**
  apps/frontend/app/helper/NotificationHelper.ts:87
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/frontend/app/helper/NotificationHelper.ts#L87

- **Move function 'setCorsHeaders' to the outer scope.**
  apps/maintenance-server/server.mjs:193
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/maintenance-server/server.mjs#L193

- **Move function 'sendJson' to the outer scope.**
  apps/maintenance-server/server.mjs:205
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/maintenance-server/server.mjs#L205

