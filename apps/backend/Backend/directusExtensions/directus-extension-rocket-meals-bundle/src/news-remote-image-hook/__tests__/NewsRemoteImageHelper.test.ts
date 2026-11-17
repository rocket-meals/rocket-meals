import { describe, expect, it } from '@jest/globals';
import jpeg from 'jpeg-js';
import { NewsRemoteImageActionType, NewsRemoteImageHelper } from '../NewsRemoteImageHelper';
import { ImageFocalPointSuggester } from '../../helpers/ImageFocalPointSuggester';

const URL_A = 'https://example.org/a.jpg';
const URL_B = 'https://example.org/b.jpg';

describe('NewsRemoteImageHelper', () => {
  it('imports a remote URL when there is no image', () => {
    expect(NewsRemoteImageHelper.decide({ image: null, image_remote_url: ` ${URL_A} `, image_remote_url_imported: null })).toEqual({ type: NewsRemoteImageActionType.IMPORT, url: URL_A, replacedFileId: null });
  });

  it('keeps an image uploaded by hand', () => {
    expect(NewsRemoteImageHelper.decide({ image: 'file-1', image_remote_url: URL_A, image_remote_url_imported: null }).type).toBe(NewsRemoteImageActionType.NONE);
  });

  it('keeps an import that is up to date', () => {
    expect(NewsRemoteImageHelper.decide({ image: { id: 'file-1' } as never, image_remote_url: URL_A, image_remote_url_imported: URL_A }).type).toBe(NewsRemoteImageActionType.NONE);
  });

  it('replaces the import when the remote URL changes', () => {
    expect(NewsRemoteImageHelper.decide({ image: 'file-1', image_remote_url: URL_B, image_remote_url_imported: URL_A })).toEqual({ type: NewsRemoteImageActionType.IMPORT, url: URL_B, replacedFileId: 'file-1' });
  });

  it('drops the import when the remote URL is removed, but never an upload', () => {
    expect(NewsRemoteImageHelper.decide({ image: 'file-1', image_remote_url: '', image_remote_url_imported: URL_A })).toEqual({ type: NewsRemoteImageActionType.REMOVE, fileId: 'file-1' });
    expect(NewsRemoteImageHelper.decide({ image: 'file-1', image_remote_url: null, image_remote_url_imported: null }).type).toBe(NewsRemoteImageActionType.NONE);
  });

  it('tells a hand-set image from the import and from a form sending the same image again', () => {
    expect(NewsRemoteImageHelper.isManualImageChange({ image: 'file-2' }, ['file-1'])).toBe(true);
    expect(NewsRemoteImageHelper.isManualImageChange({ image: 'file-1' }, ['file-1'])).toBe(false);
    expect(NewsRemoteImageHelper.isManualImageChange({ image: 'file-2', image_remote_url_imported: URL_A }, ['file-1'])).toBe(false);
    expect(NewsRemoteImageHelper.isManualImageChange({ image_remote_url: URL_A }, ['file-1'])).toBe(false);
  });

  it('keeps an import a form loaded before the import tries to clear', () => {
    expect(NewsRemoteImageHelper.isStaleImportRemoval({ image: null }, [{ image: 'file-1', image_remote_url: URL_A, image_remote_url_imported: URL_A }])).toBe(true);
    expect(NewsRemoteImageHelper.isStaleImportRemoval({ image: null }, [{ image: 'file-1', image_remote_url: URL_A, image_remote_url_imported: null }])).toBe(false);
    expect(NewsRemoteImageHelper.isStaleImportRemoval({ image: 'file-2' }, [{ image: 'file-1', image_remote_url: URL_A, image_remote_url_imported: URL_A }])).toBe(false);
  });

  it('only reacts to changes that are not its own', () => {
    expect(NewsRemoteImageHelper.isRelevantChange({ image_remote_url: URL_A })).toBe(true);
    expect(NewsRemoteImageHelper.isRelevantChange({ image: null })).toBe(true);
    expect(NewsRemoteImageHelper.isRelevantChange({ image: 'file-1', image_remote_url_imported: URL_A })).toBe(false);
  });
});

describe('ImageFocalPointSuggester', () => {
  it('finds a detailed subject on the right of a wide image', async () => {
    const width = 256;
    const height = 144;
    const pixels = Array.from({ length: width * height }, (_, index) => {
      const x = index % width;
      const y = Math.floor(index / width);
      const subject = x > 180 && x < 240 && ((x >> 2) + (y >> 2)) % 2 === 0;
      return subject ? [240, 120, 40, 255] : [90, 90, 110, 255];
    });
    const data = Buffer.from(pixels.flat());
    const encoded = jpeg.encode({ width, height, data }, 90).data;
    const analysed = ImageFocalPointSuggester.decodeJpeg(encoded);
    const focalPoint = await ImageFocalPointSuggester.suggest(analysed, { width: 1920, height: 1080 });
    // The square is pushed to the right edge: its middle is 1920 - 540.
    expect(focalPoint).toEqual({ x: 1380, y: 540 });
  });
});
