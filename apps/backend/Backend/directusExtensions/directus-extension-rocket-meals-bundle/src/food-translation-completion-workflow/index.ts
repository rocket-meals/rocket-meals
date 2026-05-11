import { WorkflowScheduler } from '../workflows-runs-hook';
import { SingleWorkflowRun, WorkflowEnum } from '../workflows-runs-hook/WorkflowRunJobInterface';
import { CollectionNames, DatabaseTypes, LanguageCodes } from 'repo-depkit-common';
import { WORKFLOW_RUN_STATE } from '../helpers/itemServiceHelpers/WorkflowsRunEnum';
import { WorkflowRunContext } from '../helpers/WorkflowRunContext';
import { MyDefineHook } from '../helpers/MyDefineHook';
import { Translator } from '../auto-translation-hook/Translator';
import { TranslatorSettings } from '../auto-translation-hook/TranslatorSettings';
import { DirectusCollectionTranslator, TranslationSchemaContext } from '../auto-translation-hook/DirectusCollectionTranslator';

const SCHEDULE_NAME = 'food-translation-completion-workflow';
const BATCH_SIZE = 100;

class FoodTranslationCompletionWorkflow extends SingleWorkflowRun {
  getWorkflowId(): string {
    return WorkflowEnum.foodTranslationCompletion;
  }

  private isTranslationEmpty(translation: any, fieldsToTranslate: string[]): boolean {
    for (const field of fieldsToTranslate) {
      const value = translation?.[field];
      if (value && typeof value === 'string' && value.trim().length > 0) {
        return false;
      }
    }
    return true;
  }

  async runJob(context: WorkflowRunContext): Promise<Partial<DatabaseTypes.WorkflowsRuns>> {
    await context.logger.appendLog('Starting food translation completion workflow.');

    try {
      // Initialize translator
      const translatorSettings = new TranslatorSettings(context.myDatabaseHelper);
      const translator = new Translator(translatorSettings, context.myDatabaseHelper);
      await translator.init();

      const autoTranslateEnabled = await translatorSettings.isAutoTranslationEnabled();
      if (!autoTranslateEnabled) {
        await context.logger.appendLog('Auto-translation is not enabled. Aborting.');
        return context.logger.getFinalLogWithStateAndParams({
          state: WORKFLOW_RUN_STATE.FAILED,
        });
      }

      // Read all languages
      const languagesHelper = context.myDatabaseHelper.getItemsServiceHelper<DatabaseTypes.Languages>(CollectionNames.LANGUAGES);
      const allLanguages = await languagesHelper.readByQuery({ limit: -1 });

      if (allLanguages.length === 0) {
        await context.logger.appendLog('No languages found in the database. Aborting.');
        return context.logger.getFinalLogWithStateAndParams({
          state: WORKFLOW_RUN_STATE.FAILED,
        });
      }

      // Filter to only non-DE, non-EN languages
      const targetLanguages = allLanguages.filter(
        (lang) => lang.code !== LanguageCodes.DE && lang.code !== LanguageCodes.EN
      );

      if (targetLanguages.length === 0) {
        await context.logger.appendLog('No target languages found (only DE and EN exist). Nothing to do.');
        return context.logger.getFinalLogWithStateAndParams({
          state: WORKFLOW_RUN_STATE.SUCCESS,
        });
      }

      await context.logger.appendLog(
        'Target languages for translation completion: ' +
          targetLanguages.map((l) => l.code).join(', ')
      );

      // Get schema for translation field detection
      const schema = await context.myDatabaseHelper.getSchema();
      const translationSchemaContext: TranslationSchemaContext = {
        schema,
        collectionName: CollectionNames.FOODS,
        translation_field: 'translations',
      };
      const fieldsToTranslate = DirectusCollectionTranslator.getFieldsToTranslate(translationSchemaContext);
      await context.logger.appendLog('Fields to translate: ' + fieldsToTranslate.join(', '));

      // Read all foods with translations
      const foodsHelper = context.myDatabaseHelper.getItemsServiceHelper<DatabaseTypes.Foods>(CollectionNames.FOODS);
      const totalFoods = await foodsHelper.countItems();
      await context.logger.appendLog('Total foods in database: ' + totalFoods);

      let offset = 0;
      let foodsProcessed = 0;
      let foodsUpdated = 0;
      let translationsCreated = 0;
      let translationsUpdated = 0;
      let errorCount = 0;

      while (offset < totalFoods) {
        const foods = await foodsHelper.readByQuery({
          limit: BATCH_SIZE,
          offset,
          fields: ['id', 'translations.*'],
        });

        if (foods.length === 0) {
          break;
        }

        for (const food of foods) {
          foodsProcessed++;

          try {
            const existingTranslations = (food.translations || []) as DatabaseTypes.FoodsTranslations[];

            // Find source translation
            let sourceTranslation: DatabaseTypes.FoodsTranslations | undefined;
            for (const translation of existingTranslations) {
              if (translation.be_source_for_translations) {
                sourceTranslation = translation;
                break;
              }
            }

            // If no source translation found, try to use DE as source
            if (!sourceTranslation) {
              sourceTranslation = existingTranslations.find(
                (t) => t.languages_code === LanguageCodes.DE
              );
            }

            // If still no source translation, skip this food
            if (!sourceTranslation) {
              continue;
            }

            // Check if source translation has any content to translate from
            if (this.isTranslationEmpty(sourceTranslation, fieldsToTranslate)) {
              continue;
            }

            // Detect language field name (languages_code or languages_id)
            const sourceTranslationAsAny = sourceTranslation as any;
            const FIELD_LANGUAGES_ID_OR_CODE = DirectusCollectionTranslator.detectLanguagesIdOrCodeField(sourceTranslationAsAny);
            if (!FIELD_LANGUAGES_ID_OR_CODE) {
              continue;
            }

            const sourceLanguageCode = typeof sourceTranslationAsAny[FIELD_LANGUAGES_ID_OR_CODE] === 'string'
              ? sourceTranslationAsAny[FIELD_LANGUAGES_ID_OR_CODE]
              : sourceTranslationAsAny[FIELD_LANGUAGES_ID_OR_CODE]?.code;

            // Build existing translations map by language code
            const existingByLang: Record<string, DatabaseTypes.FoodsTranslations> = {};
            for (const t of existingTranslations) {
              const tAsAny = t as any;
              const langCode = typeof tAsAny[FIELD_LANGUAGES_ID_OR_CODE] === 'string'
                ? tAsAny[FIELD_LANGUAGES_ID_OR_CODE]
                : tAsAny[FIELD_LANGUAGES_ID_OR_CODE]?.code;
              if (langCode) {
                existingByLang[langCode as string] = t;
              }
            }

            const translationsToCreate: any[] = [];
            const translationsToUpdate: any[] = [];

            for (const targetLang of targetLanguages) {
              const langCode = targetLang.code;
              const existing = existingByLang[langCode];

              if (!existing) {
                // Translation is missing entirely - translate and create
                const translatedItem = await DirectusCollectionTranslator.translateTranslationItem({
                  isSourceTranslation: false,
                  sourceTranslation: sourceTranslationAsAny,
                  language_code: langCode,
                  translator: translator,
                  translatorSettings: translatorSettings,
                  fieldsToTranslate: fieldsToTranslate,
                  FIELD_LANGUAGES_ID_OR_CODE: FIELD_LANGUAGES_ID_OR_CODE,
                  context: translationSchemaContext,
                });

                if (translatedItem) {
                  translationsToCreate.push({
                    foods_id: food.id,
                    ...translatedItem,
                  });
                  translationsCreated++;
                }
              } else if (this.isTranslationEmpty(existing, fieldsToTranslate)) {
                // Translation exists but is empty - translate and update
                const translatedItem = await DirectusCollectionTranslator.translateTranslationItem({
                  isSourceTranslation: false,
                  sourceTranslation: sourceTranslationAsAny,
                  language_code: langCode,
                  translator: translator,
                  translatorSettings: translatorSettings,
                  fieldsToTranslate: fieldsToTranslate,
                  FIELD_LANGUAGES_ID_OR_CODE: FIELD_LANGUAGES_ID_OR_CODE,
                  context: translationSchemaContext,
                });

                if (translatedItem) {
                  translationsToUpdate.push({
                    id: existing.id,
                    ...translatedItem,
                  });
                  translationsUpdated++;
                }
              }
            }

            if (translationsToCreate.length > 0 || translationsToUpdate.length > 0) {
              await foodsHelper.updateOne(food.id, {
                translations: {
                  create: translationsToCreate,
                  update: translationsToUpdate,
                  delete: [],
                },
              } as any);
              foodsUpdated++;
            }
          } catch (err: any) {
            errorCount++;
            await context.logger.appendLog(
              'Error processing food ' + food.id + ': ' + (err?.message || String(err))
            );
          }
        }

        offset += BATCH_SIZE;
        await context.logger.appendLog(
          'Progress: ' + foodsProcessed + '/' + totalFoods +
          ' foods processed, ' + foodsUpdated + ' updated, ' +
          translationsCreated + ' translations created, ' +
          translationsUpdated + ' translations updated'
        );
      }

      await context.logger.appendLog('--- Summary ---');
      await context.logger.appendLog('Foods processed: ' + foodsProcessed);
      await context.logger.appendLog('Foods updated: ' + foodsUpdated);
      await context.logger.appendLog('Translations created: ' + translationsCreated);
      await context.logger.appendLog('Translations updated: ' + translationsUpdated);
      await context.logger.appendLog('Errors: ' + errorCount);
      await context.logger.appendLog('Finished food translation completion workflow.');

      return context.logger.getFinalLogWithStateAndParams({
        state: WORKFLOW_RUN_STATE.SUCCESS,
      });
    } catch (err: any) {
      await context.logger.appendLog('Fatal error: ' + (err?.message || String(err)));
      return context.logger.getFinalLogWithStateAndParams({
        state: WORKFLOW_RUN_STATE.FAILED,
      });
    }
  }
}

export default MyDefineHook.defineHookWithAllTablesExisting(SCHEDULE_NAME, async ({}, apiContext) => {
  // Register workflow for manual triggering only - no automatic cron schedule
  WorkflowScheduler.registerWorkflow(new FoodTranslationCompletionWorkflow());
});
