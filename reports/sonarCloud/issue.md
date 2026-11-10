# 📊 SonarCloud Issues Report

## Summary

| Category | Total Issues | Shown |
|----------|-------------|-------|
| 🔒 Security | 8 | 8 |
| 🐛 Reliability | 36 | 36 |
| 🔧 Maintainability | 44 | 6 |

**Total issues:** 88 (showing top 50 prioritized by: Security > Reliability > Maintainability)

---

## 🔒 Security (8/8)

- **"npx" can install packages on-demand and run their lifecycle scripts.**
  .github/workflows/frontend-accessibility.yml:46
  https://github.com/rocket-meals/rocket-meals/blob/master/.github/workflows/frontend-accessibility.yml#L46

- **Make sure that no untrusted code is executed from a fork.**
  .github/workflows/store-screenshots.yml:68
  https://github.com/rocket-meals/rocket-meals/blob/master/.github/workflows/store-screenshots.yml#L68

- **Make sure that no untrusted code is executed from a fork.**
  .github/workflows/store-screenshots.yml:124
  https://github.com/rocket-meals/rocket-meals/blob/master/.github/workflows/store-screenshots.yml#L124

- **Make sure that no untrusted code is executed from a fork.**
  .github/workflows/store-screenshots.yml:151
  https://github.com/rocket-meals/rocket-meals/blob/master/.github/workflows/store-screenshots.yml#L151

- **Make sure the "PATH" variable only contains fixed, unwriteable directories.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/extension.config.mjs:100
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/extension.config.mjs#L100

- **Client-Side Request Forgery via unsanitized user input**
  apps/maintenance-server/server.mjs:156
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/maintenance-server/server.mjs#L156

- **CORS Injection via unsanitized user input**
  apps/maintenance-server/server.mjs:197
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/maintenance-server/server.mjs#L197

- **Make sure this weak hash algorithm is not used in a sensitive context here.**
  apps/scripts/store-screenshots-load.ts:55
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/scripts/store-screenshots-load.ts#L55

## 🐛 Reliability (36/36)

- **Provide a compare function that depends on "String.localeCompare", to reliably sort elements alphabetically.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/helpers/UniversityAffiliationHelper.ts:80
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/helpers/UniversityAffiliationHelper.ts#L80

- **Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/app-feedbacks/app-feedback-chat-page.vue:257
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/app-feedbacks/app-feedback-chat-page.vue#L257

- **Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/chats/chat-page.vue:185
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/chats/chat-page.vue#L185

- **Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/chats/chats-page.vue:117
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/chats/chats-page.vue#L117

- **Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/feature-wishes/feature-wish-page.vue:249
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/feature-wishes/feature-wish-page.vue#L249

- **Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/feature-wishes/feature-wishes-page.vue:209
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/feature-wishes/feature-wishes-page.vue#L209

- **Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/food-feedbacks/food-feedback-chat-page.vue:325
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/food-feedbacks/food-feedback-chat-page.vue#L325

- **Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/food-feedbacks/food-feedback-chat-page.vue:324
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/food-feedbacks/food-feedback-chat-page.vue#L324

- **Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/food-feedbacks/food-feedbacks-page.vue:303
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/food-feedbacks/food-feedbacks-page.vue#L303

- **Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/friendship-network/friendship-network-page.vue:367
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/friendship-network/friendship-network-page.vue#L367

- **Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/live-pulse/live-pulse-page.vue:166
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/live-pulse/live-pulse-page.vue#L166

- **Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/live-pulse/live-pulse-page.vue:447
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/live-pulse/live-pulse-page.vue#L447

- **Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/mcp-instruction/mcp-instruction-page.vue:150
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/mcp-instruction/mcp-instruction-page.vue#L150

- **Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/mcp-instruction/mcp-instruction-page.vue:151
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/mcp-instruction/mcp-instruction-page.vue#L151

- **Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/profiles/profile-push-page.vue:125
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/profiles/profile-push-page.vue#L125

- **Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/profiles/profiles-page.vue:74
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/profiles/profiles-page.vue#L74

- **Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/support-chat/support-chat-conversation.vue:110
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/support-chat/support-chat-conversation.vue#L110

- **Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/workflows/workflow-detail-page.vue:80
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/workflows/workflow-detail-page.vue#L80

- **Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/workflows/workflow-detail-page.vue:89
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/workflows/workflow-detail-page.vue#L89

- **Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/workflows/workflow-detail-page.vue:95
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/workflows/workflow-detail-page.vue#L95

- **Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/workflows/workflow-detail-page.vue:123
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/workflows/workflow-detail-page.vue#L123

- **Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/workflows/workflow-detail-page.vue:138
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/workflows/workflow-detail-page.vue#L138

- **Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/workflows/workflow-detail-page.vue:153
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/workflows/workflow-detail-page.vue#L153

- **Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/workflows/workflow-run-drawer.vue:86
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/workflows/workflow-run-drawer.vue#L86

- **Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/workflows/workflows-page.vue:146
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/workflows/workflows-page.vue#L146

- **Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/workflows/workflows-page.vue:167
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/rocket-meals-module/workflows/workflows-page.vue#L167

- **Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator.**
  apps/frontend/app/app/(app)/experimentell/store-versions/index.tsx:92
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/frontend/app/app/(app)/experimentell/store-versions/index.tsx#L92

- **Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator.**
  apps/frontend/app/app/(app)/experimentell/store-versions/index.tsx:93
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/frontend/app/app/(app)/experimentell/store-versions/index.tsx#L93

- **Review this async function: it has no await expression.**
  apps/frontend/app/helper/NotificationHelper.ts:87
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/frontend/app/helper/NotificationHelper.ts#L87

- **Review this async function: it has no await expression.**
  apps/frontend/app/hooks/useUniversityStatusTracking.ts:11
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/frontend/app/hooks/useUniversityStatusTracking.ts#L11

- **Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator.**
  apps/maintenance-server/server.mjs:279
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/maintenance-server/server.mjs#L279

- **Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator.**
  apps/maintenance-server/server.mjs:303
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/maintenance-server/server.mjs#L303

- **Simplify this regular expression to reduce its runtime, as it has super-linear performance due to backtracking.**
  packages/common/src/MarkdownSectionHelper.ts:71
  https://github.com/rocket-meals/rocket-meals/blob/master/packages/common/src/MarkdownSectionHelper.ts#L71

- **Use '[[' instead of '[' for conditional tests. The '[[' construct is safer and more feature-rich.**
  scripts/eas-ios-credentials.sh:24
  https://github.com/rocket-meals/rocket-meals/blob/master/scripts/eas-ios-credentials.sh#L24

- **Use '[[' instead of '[' for conditional tests. The '[[' construct is safer and more feature-rich.**
  scripts/eas-ios-credentials.sh:24
  https://github.com/rocket-meals/rocket-meals/blob/master/scripts/eas-ios-credentials.sh#L24

- **Use '[[' instead of '[' for conditional tests. The '[[' construct is safer and more feature-rich.**
  scripts/eas-ios-credentials.sh:29
  https://github.com/rocket-meals/rocket-meals/blob/master/scripts/eas-ios-credentials.sh#L29

## 🔧 Maintainability (6/44)

- **Redirect this error message to stderr (>&2).**
  .github/actions/geonexia-expo-update/action.yml:135
  https://github.com/rocket-meals/rocket-meals/blob/master/.github/actions/geonexia-expo-update/action.yml#L135

- **Redirect this error message to stderr (>&2).**
  .github/actions/geonexia-expo-update/action.yml:143
  https://github.com/rocket-meals/rocket-meals/blob/master/.github/actions/geonexia-expo-update/action.yml#L143

- **Redirect this error message to stderr (>&2).**
  .github/actions/score-tracker-expo-update/action.yml:135
  https://github.com/rocket-meals/rocket-meals/blob/master/.github/actions/score-tracker-expo-update/action.yml#L135

- **Redirect this error message to stderr (>&2).**
  .github/actions/score-tracker-expo-update/action.yml:143
  https://github.com/rocket-meals/rocket-meals/blob/master/.github/actions/score-tracker-expo-update/action.yml#L143

- **Add a default case (*) to handle unexpected values.**
  .github/actions/stage-changes/action.yml:48
  https://github.com/rocket-meals/rocket-meals/blob/master/.github/actions/stage-changes/action.yml#L48

- **Redirect this error message to stderr (>&2).**
  .github/actions/tag-und-jahr-expo-update/action.yml:126
  https://github.com/rocket-meals/rocket-meals/blob/master/.github/actions/tag-und-jahr-expo-update/action.yml#L126

