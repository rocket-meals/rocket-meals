/**
 * news-remote-image-hook – turns the remote image of a news (`image_remote_url`, e.g. from the news
 * parsers) into a file, so the app crops it like an upload: a square around the focal point.
 *
 * - After a news is created or its remote URL or image changes, the remote URL is imported into the
 *   folder of `news.image`, smartcrop sets the focal point, and the file becomes the `image`.
 * - A new remote URL replaces the imported image (the old file is deleted), a removed one drops it.
 * - An image uploaded by hand is never replaced (`NewsRemoteImageHelper`).
 * - A workflow catches up every hour: older news and imports that failed (e.g. the site was down).
 *
 * If the import fails nothing changes and the app keeps showing the remote URL.
 */
import { CollectionNames, CronHelper, DatabaseTypes, DirectusImageHelper } from 'repo-depkit-common';
import { MyDatabaseHelper, MyEventContext } from '../helpers/MyDatabaseHelper';
import { MyDefineHook } from '../helpers/MyDefineHook';
import { HookKeysHelper, HookMetaWithKeys } from '../helpers/HookKeysHelper';
import { ImageFocalPointSuggester } from '../helpers/ImageFocalPointSuggester';
import { WorkflowScheduleHelper } from '../workflows-runs-hook';
import { SingleWorkflowRun } from '../workflows-runs-hook/WorkflowRunJobInterface';
import { WorkflowRunContext } from '../helpers/WorkflowRunContext';
import { WORKFLOW_RUN_STATE } from '../helpers/itemServiceHelpers/WorkflowsRunEnum';
import { NewsRemoteImageActionType, NewsRemoteImageHelper, type NewsRemoteImageState } from './NewsRemoteImageHelper';

const HOOK_NAME = 'news-remote-image-hook';
const WORKFLOW_ID = 'news-remote-image-import';
const NEWS_FIELDS = ['id', 'alias', 'image', 'image_remote_url', NewsRemoteImageHelper.FIELD_IMPORTED];

type NewsRow = NewsRemoteImageState & { id: string; alias?: string | null };
type ProcessResult = 'imported' | 'removed' | 'unchanged';

export class NewsRemoteImageImporter {
  constructor(private readonly myDatabaseHelper: MyDatabaseHelper) {}

  /** Imports, replaces or drops the remote image of one news, as `NewsRemoteImageHelper.decide` says. */
  async process(newsId: string): Promise<ProcessResult> {
    const newsHelper = this.myDatabaseHelper.getNewsHelper();
    const news = (await newsHelper.readOne(newsId, { fields: NEWS_FIELDS })) as NewsRow | undefined;
    if (!news) {
      return 'unchanged';
    }
    const action = NewsRemoteImageHelper.decide(news);
    const filesHelper = this.myDatabaseHelper.getFilesHelper();

    if (action.type === NewsRemoteImageActionType.REMOVE) {
      await newsHelper.updateOne(newsId, { image: null, image_remote_url_imported: null });
      await this.deleteFileSafely(action.fileId);
      return 'removed';
    }
    if (action.type !== NewsRemoteImageActionType.IMPORT) {
      return 'unchanged';
    }

    const folder = await this.myDatabaseHelper.getNewsImageFolderId();
    const fileId = String(await filesHelper.importOne(action.url, { title: NewsRemoteImageHelper.getFileTitle(news), folder }));
    await this.setFocalPointSafely(fileId);
    await newsHelper.updateOne(newsId, { image: fileId, image_remote_url_imported: action.url });
    await this.deleteFileSafely(action.replacedFileId);
    return 'imported';
  }

  /** Lets smartcrop choose the square for images that are not square. A failure leaves the middle. */
  private async setFocalPointSafely(fileId: string): Promise<void> {
    try {
      const filesHelper = this.myDatabaseHelper.getFilesHelper();
      const file = await filesHelper.readOne(fileId, { fields: ['id', 'width', 'height'] });
      if (!file?.width || !file?.height || DirectusImageHelper.isSquare({ width: file.width, height: file.height })) {
        return;
      }
      const jpegBuffer = await filesHelper.readFileContent(fileId, ImageFocalPointSuggester.ANALYSIS_TRANSFORMATION);
      const analysed = ImageFocalPointSuggester.decodeJpeg(jpegBuffer);
      const focalPoint = await ImageFocalPointSuggester.suggest(analysed, { width: file.width, height: file.height });
      await filesHelper.updateOne(fileId, { focal_point_x: focalPoint.x, focal_point_y: focalPoint.y });
    } catch (error) {
      console.error(`${HOOK_NAME}: could not set the focal point of ${fileId}`, error);
    }
  }

  private async deleteFileSafely(fileId: string | null): Promise<void> {
    if (!fileId) {
      return;
    }
    try {
      await this.myDatabaseHelper.getFilesHelper().deleteOne(fileId);
    } catch (error) {
      console.error(`${HOOK_NAME}: could not delete the replaced image ${fileId}`, error);
    }
  }
}

/** Catches up every hour: news with a remote URL whose image is missing or from another URL. */
class NewsRemoteImageImportWorkflow extends SingleWorkflowRun {
  getWorkflowId(): string {
    return WORKFLOW_ID;
  }

  async runJob(context: WorkflowRunContext): Promise<Partial<DatabaseTypes.WorkflowsRuns>> {
    const newsHelper = context.myDatabaseHelper.getNewsHelper();
    const candidates = (await newsHelper.readByQuery({
      fields: NEWS_FIELDS,
      filter: { _or: [{ image_remote_url: { _nnull: true } }, { [NewsRemoteImageHelper.FIELD_IMPORTED]: { _nnull: true } }] },
      limit: -1,
    })) as NewsRow[];
    const pending = candidates.filter(news => NewsRemoteImageHelper.decide(news).type !== NewsRemoteImageActionType.NONE);
    await context.logger.appendLog(`${pending.length} of ${candidates.length} news with a remote image need an import or a removal`);

    const importer = new NewsRemoteImageImporter(context.myDatabaseHelper);
    const counts = { imported: 0, removed: 0, unchanged: 0, failed: 0 };
    for (const news of pending) {
      try {
        const result = await importer.process(news.id); // NOSONAR S9382 - sequential on purpose: one download at a time
        counts[result] += 1;
      } catch (error) {
        counts.failed += 1;
        await context.logger.appendLog(`News ${news.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    await context.logger.appendLog(`Imported ${counts.imported}, removed ${counts.removed}, unchanged ${counts.unchanged}, failed ${counts.failed}`);
    return context.logger.getFinalLogWithStateAndParams({ state: counts.failed > 0 && counts.imported + counts.removed === 0 ? WORKFLOW_RUN_STATE.FAILED : WORKFLOW_RUN_STATE.SUCCESS });
  }
}

export default MyDefineHook.defineHookWithAllTablesExisting(HOOK_NAME, ({ filter, action, schedule }, apiContext) => {
  const importer = new NewsRemoteImageImporter(new MyDatabaseHelper(apiContext));

  const processSafely = async (keys: unknown[]) => {
    for (const key of keys) {
      try {
        await importer.process(String(key)); // NOSONAR S9382 - sequential on purpose: one download at a time
      } catch (error) {
        apiContext.logger.error(`${HOOK_NAME}: could not import the remote image of news ${String(key)}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  };

  // An image set by hand is no longer the import, so a later remote URL does not replace it.
  filter(CollectionNames.NEWS + '.items.update', async (input, meta, eventContext: MyEventContext) => {
    const payload = (input ?? {}) as Partial<NewsRemoteImageState>;
    if (!('image' in payload) || NewsRemoteImageHelper.FIELD_IMPORTED in payload) {
      return input;
    }
    try {
      const keys = HookKeysHelper.getKeysFromMeta(meta as HookMetaWithKeys);
      const rows = (await new MyDatabaseHelper(apiContext, eventContext).getNewsHelper().readMany(keys, { fields: ['id', 'image', NewsRemoteImageHelper.FIELD_IMPORTED] })) as NewsRow[];
      if (NewsRemoteImageHelper.isStaleImportRemoval(payload, rows)) {
        const { image: _staleImage, ...rest } = payload;
        return rest;
      }
      if (
        NewsRemoteImageHelper.isManualImageChange(
          payload,
          rows.map(row => row.image)
        )
      ) {
        return { ...payload, [NewsRemoteImageHelper.FIELD_IMPORTED]: null };
      }
    } catch (error) {
      apiContext.logger.error(`${HOOK_NAME}: could not check the image change: ${error instanceof Error ? error.message : String(error)}`);
    }
    return input;
  });

  action(CollectionNames.NEWS + '.items.create', async meta => {
    if (NewsRemoteImageHelper.isRelevantChange((meta.payload ?? {}) as Partial<NewsRemoteImageState>)) {
      await processSafely(HookKeysHelper.getKeysFromMeta(meta as HookMetaWithKeys));
    }
  });

  action(CollectionNames.NEWS + '.items.update', async meta => {
    if (NewsRemoteImageHelper.isRelevantChange((meta.payload ?? {}) as Partial<NewsRemoteImageState>)) {
      await processSafely(HookKeysHelper.getKeysFromMeta(meta as HookMetaWithKeys));
    }
  });

  void WorkflowScheduleHelper.registerScheduleToRunWorkflowRuns({
    workflowRunInterface: new NewsRemoteImageImportWorkflow(),
    myDatabaseHelper: new MyDatabaseHelper(apiContext),
    schedule,
    cronOject: CronHelper.EVERY_HOUR,
  });
});
