import { NewsParserInterface, NewsTypeForParser } from './NewsParserInterface';
import { TranslationHelper, TranslationUpdateContext } from '../helpers/TranslationHelper';
import { CollectionNames, DatabaseTypes } from 'repo-depkit-common';
import { WORKFLOW_RUN_STATE } from '../helpers/itemServiceHelpers/WorkflowsRunEnum';
import { WorkflowResultHash } from '../helpers/itemServiceHelpers/WorkflowsRunHelper';
import { HashHelper } from '../helpers/HashHelper';
import { WorkflowRunContext } from '../helpers/WorkflowRunContext';

export class NewsParseSchedule {
  //TODO stringfiy and cache results to reduce dublicate removing from foodOffers and Meals ...
  private readonly context: WorkflowRunContext;
  private readonly parser: NewsParserInterface;

  constructor(context: WorkflowRunContext, parser: NewsParserInterface) {
    this.context = context;
    this.parser = parser;
  }

  async getPreviousHash() {
    return await this.context.myDatabaseHelper.getWorkflowsRunsHelper().getPreviousResultHash(this.context.workflowRun, this.context.logger);
  }

  async parse(): Promise<Partial<DatabaseTypes.WorkflowsRuns>> {
    await this.context.logger.appendLog('Starting sync news parsing');

    try {
      await this.context.logger.appendLog('Getting news items');
      let newsJSONList = await this.parser.getNewsItems(this.context.workflowRun, this.context.logger);
      await this.context.logger.appendLog('Found ' + newsJSONList.length + ' news items');

      let currentHash = new WorkflowResultHash(HashHelper.hashFromObject(newsJSONList));

      let previousMealOffersHash = await this.getPreviousHash();
      if (WorkflowResultHash.isError(previousMealOffersHash)) {
        console.log('Previous Hash is Error');
        await this.context.logger.appendLog('Error: ' + previousMealOffersHash.toString());
        return this.context.logger.getFinalLogWithStateAndParams({
          state: WORKFLOW_RUN_STATE.FAILED,
        });
      }

      let noHash = !previousMealOffersHash;
      let isSameHash = currentHash.isSame(previousMealOffersHash);
      if (noHash || !isSameHash) {
        await this.updateNews(newsJSONList);
      }

      await this.context.logger.appendLog('Finished');
      return await this.context.logger.getFinalLogWithStateAndParams({
        state: WORKFLOW_RUN_STATE.SUCCESS,
        result_hash: currentHash.getHash(),
      });
    } catch (err: any) {
      await this.context.logger.appendLog('Error: ' + err.toString());
    }
    return await this.context.logger.getFinalLogWithStateAndParams({
      state: WORKFLOW_RUN_STATE.FAILED,
    });
  }

  async findOrCreateSingleNews(newsJSON: NewsTypeForParser) {
    let itemService = await this.context.myDatabaseHelper.getNewsHelper();

    const searchJson = {
      external_identifier: newsJSON?.basicNews.external_identifier,
    };

    return await itemService.findOrCreateItem(searchJson, searchJson);
  }

  async updateNewsTranslations(item: DatabaseTypes.News, newsJSON: NewsTypeForParser) {
    const context: TranslationUpdateContext<DatabaseTypes.NewsTranslations> = {
      translationsFromParsing: newsJSON.translations,
      items_primary_field_in_translation_table: 'news_id',
      itemsTablename: CollectionNames.NEWS,
      myDatabaseHelper: this.context.myDatabaseHelper,
    };
    await TranslationHelper.updateItemTranslations(item, context);
  }

  async updateOtherFields(item: DatabaseTypes.News, newsJSON: NewsTypeForParser) {
    let itemService = this.context.myDatabaseHelper.getNewsHelper();
    await itemService.updateOne(item?.id, newsJSON.basicNews);
  }

  async updateNews(newsJSONList: NewsTypeForParser[]) {
    await this.context.logger.appendLog('Updating news items');
    for (let index = 0; index < newsJSONList.length; index++) {
      let newsJSON = newsJSONList[index] as NewsTypeForParser;
      await this.context.logger.appendLog(`Processing news item ${index + 1} of ${newsJSONList.length}`);
      let news = await this.findOrCreateSingleNews(newsJSON);
      if (!!news && news?.id) {
        await this.updateOtherFields(news, newsJSON);
        await this.updateNewsTranslations(news, newsJSON);
      }
    }
  }
}
