import { DirectusImageHelper, type DatabaseTypes } from 'repo-depkit-common';

/** The fields of a news that decide about its remote image. */
export type NewsRemoteImageState = Pick<DatabaseTypes.News, 'image' | 'image_remote_url' | 'image_remote_url_imported'>;

export enum NewsRemoteImageActionType {
  /** Nothing to do: no remote URL, an uploaded image, or the image is up to date. */
  NONE = 'none',
  /** Import the remote URL as a file and use it as the image (and delete the replaced import). */
  IMPORT = 'import',
  /** The remote URL was removed: drop the imported image. */
  REMOVE = 'remove',
}

export type NewsRemoteImageAction = { type: NewsRemoteImageActionType.NONE } | { type: NewsRemoteImageActionType.IMPORT; url: string; replacedFileId: string | null } | { type: NewsRemoteImageActionType.REMOVE; fileId: string | null };

/**
 * Remote images of news become files, so the app and the module crop them like uploads (a square
 * around the focal point, see `DirectusImageHelper`).
 *
 * `image_remote_url_imported` remembers the URL the current `image` was imported from. It decides:
 * - Remote URL and no image: import it.
 * - Remote URL changed since the import: import the new one, the old import is deleted.
 * - Remote URL removed: the imported image is dropped.
 * - An image without that mark was uploaded by hand and is never touched.
 */
export class NewsRemoteImageHelper {
  static readonly FIELD_IMPORTED = 'image_remote_url_imported';

  static normalizeUrl(url: string | null | undefined): string | null {
    const trimmed = url?.trim();
    return trimmed || null;
  }

  static decide(news: NewsRemoteImageState): NewsRemoteImageAction {
    const url = NewsRemoteImageHelper.normalizeUrl(news.image_remote_url);
    const imported = NewsRemoteImageHelper.normalizeUrl(news.image_remote_url_imported);
    const fileId = DirectusImageHelper.getFileId(news.image);

    if (!url) {
      return imported ? { type: NewsRemoteImageActionType.REMOVE, fileId } : { type: NewsRemoteImageActionType.NONE };
    }
    if (fileId && !imported) {
      return { type: NewsRemoteImageActionType.NONE };
    }
    if (fileId && imported === url) {
      return { type: NewsRemoteImageActionType.NONE };
    }
    return { type: NewsRemoteImageActionType.IMPORT, url, replacedFileId: imported ? fileId : null };
  }

  /**
   * Whether an update sets the image by hand: it carries another `image` than the news has, and not
   * from the import itself (which always writes `image_remote_url_imported` along).
   */
  static isManualImageChange(payload: Partial<NewsRemoteImageState>, currentImages: NewsRemoteImageState['image'][]): boolean {
    if (!('image' in payload) || NewsRemoteImageHelper.FIELD_IMPORTED in payload) {
      return false;
    }
    const newImage = DirectusImageHelper.getFileId(payload.image);
    return currentImages.some(current => DirectusImageHelper.getFileId(current) !== newImage);
  }

  /**
   * Whether an update clears an image that is the import of the remote URL. That is a form that was
   * loaded before the import finished (the news editor sends all fields). Removing it would only
   * import the same URL again, so the image stays.
   */
  static isStaleImportRemoval(payload: Partial<NewsRemoteImageState>, current: NewsRemoteImageState[]): boolean {
    if (!('image' in payload) || DirectusImageHelper.getFileId(payload.image) || NewsRemoteImageHelper.FIELD_IMPORTED in payload) {
      return false;
    }
    return current.length > 0 && current.every(news => !!DirectusImageHelper.getFileId(news.image) && !!NewsRemoteImageHelper.normalizeUrl(news.image_remote_url_imported));
  }

  /** Whether an update or a creation may need an import (or a removal). */
  static isRelevantChange(payload: Partial<NewsRemoteImageState>): boolean {
    if (NewsRemoteImageHelper.FIELD_IMPORTED in payload) {
      return false;
    }
    return 'image_remote_url' in payload || 'image' in payload;
  }

  /** The title of an imported file, so it can be found in the file library. */
  static getFileTitle(news: { id: string; alias?: string | null }): string {
    return `News ${news.alias?.trim() || news.id} (remote image)`;
  }
}
