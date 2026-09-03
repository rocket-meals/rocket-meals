# 📊 SonarCloud Issues Report

## Summary

| Category | Total Issues | Shown |
|----------|-------------|-------|
| 🔒 Security | 0 | 0 |
| 🐛 Reliability | 0 | 0 |
| 🔧 Maintainability | 10 | 10 |

**Total issues:** 10

---

## 🔧 Maintainability (10/10)

- **Move function 'getDashboardIdOfPanelPayload' to the outer scope.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/dashboard-protection-hook/index.ts:172
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/dashboard-protection-hook/index.ts#L172

- **Move function 'isProtectionActiveFor' to the outer scope.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/dashboard-protection-hook/index.ts:63
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/dashboard-protection-hook/index.ts#L63

- **Move function 'buildForbiddenError' to the outer scope.**
  apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/dashboard-protection-hook/index.ts:67
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/dashboard-protection-hook/index.ts#L67

- **Compare with `undefined` directly instead of using `typeof`.**
  apps/frontend/app/helper/appStateForFeedback.ts:98
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/frontend/app/helper/appStateForFeedback.ts#L98

- **'value' may use Object's default stringification format ('[object Object]') when stringified.**
  apps/frontend/app/helper/appStateForFeedback.ts:103
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/frontend/app/helper/appStateForFeedback.ts#L103

- **Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.**
  apps/frontend/app/helper/AppUsageEventHelper.ts:84
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/frontend/app/helper/AppUsageEventHelper.ts#L84

- **The empty object is useless.**
  apps/frontend/app/helper/AppUsageEventHelper.ts:113
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/frontend/app/helper/AppUsageEventHelper.ts#L113

- **Move this component definition out of the parent component and pass data as props.**
  apps/tag-und-jahr/frontend/app/_layout.tsx:31
  https://github.com/rocket-meals/rocket-meals/blob/master/apps/tag-und-jahr/frontend/app/_layout.tsx#L31

- **Use `export…from` to re-export `FALLBACK_TRANSLATION_LANGUAGE`.**
  packages/common/src/translations/TranslationHelper.ts:211
  https://github.com/rocket-meals/rocket-meals/blob/master/packages/common/src/translations/TranslationHelper.ts#L211

- **`ELIDED_WORDS_BEFORE_APOSTROPHE` should be a `Set`, and use `ELIDED_WORDS_BEFORE_APOSTROPHE.has()` to check existence or non-existence.**
  packages/common/src/translations/TranslationValidationHelper.ts:133
  https://github.com/rocket-meals/rocket-meals/blob/master/packages/common/src/translations/TranslationValidationHelper.ts#L133

