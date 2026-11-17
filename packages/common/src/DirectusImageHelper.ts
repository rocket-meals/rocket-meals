/**
 * Square crops of Directus images, shared by the app and the Rocket Meals module in Directus.
 *
 * The app shows uploaded images as a 1:1 crop that Directus cuts on the server
 * (`fit=cover&width=S&height=S`). When the file has a focal point (`directus_files.focal_point_x/y`,
 * pixels of the original), Directus keeps the square centered on it, else it takes the middle.
 * The module builds its previews with the same URL, so the editor sees the crop the app shows,
 * and it sets the focal point (suggested with smartcrop, adjustable by hand).
 */

/** A file as it comes from Directus: its id, the expanded file, or nothing. */
export type DirectusFileReference = string | { id?: string | null } | null | undefined;

/** A point in pixels of the original image. */
export type ImageFocalPoint = { x: number; y: number };

export type ImageDimensions = { width: number; height: number };

/** A square region in pixels of the original image. */
export type ImageSquareRegion = { left: number; top: number; size: number };

export type SquareAssetUrlOptions = {
  /** Server root, e.g. `https://example.com` or the module's API root `/`. */
  serverUrl: string;
  fileId: string;
  /** Edge length of the square in pixels. */
  size?: number;
  quality?: number;
  useWebp?: boolean;
  /**
   * Overrides the focal point stored on the file. The module uses it to preview a point that is not
   * saved yet. Directus reads both values or none.
   */
  focalPoint?: ImageFocalPoint | null;
  /** Access token as query parameter (needed for images in `<img>` tags on the web). */
  accessToken?: string | null;
  /**
   * Changes the URL when the item changes (e.g. its `date_updated`), so caches load a crop around a
   * new focal point. Directus ignores the parameter.
   */
  version?: string | null;
};

export class DirectusImageHelper {
  static readonly DEFAULT_SQUARE_SIZE = 512;
  static readonly DEFAULT_QUALITY = 80;
  /** Images whose sides differ by at most this share count as square (nothing to crop). */
  static readonly SQUARE_TOLERANCE = 0.02;

  static getFileId(file: DirectusFileReference): string | null {
    if (!file) {
      return null;
    }
    if (typeof file === 'string') {
      return file;
    }
    return file.id ?? null;
  }

  /**
   * The URL of the square crop, the same one the app loads. The order of the parameters stays as it
   * was, so cached images keep their URL.
   */
  static buildSquareAssetUrl(options: SquareAssetUrlOptions): string {
    const size = options.size ?? DirectusImageHelper.DEFAULT_SQUARE_SIZE;
    const quality = options.quality ?? DirectusImageHelper.DEFAULT_QUALITY;
    const root = options.serverUrl.endsWith('/') ? options.serverUrl : `${options.serverUrl}/`;
    const params = [`fit=cover`, `width=${size}`, `height=${size}`, `quality=${quality}`];
    if (options.useWebp) {
      params.push('format=webp');
    }
    if (options.focalPoint) {
      // Directus treats 0 as "not given" and falls back to the file, so the point starts at 1.
      params.push(`focal_point_x=${Math.max(1, Math.round(options.focalPoint.x))}`, `focal_point_y=${Math.max(1, Math.round(options.focalPoint.y))}`);
    }
    if (options.version) {
      params.push(`v=${encodeURIComponent(options.version)}`);
    }
    if (options.accessToken) {
      params.push(`access_token=${encodeURIComponent(options.accessToken)}`);
    }
    return `${root}assets/${encodeURIComponent(options.fileId)}?${params.join('&')}`;
  }

  /**
   * The image of a news (or any item with `image` and `image_remote_url`): the uploaded file first,
   * else the remote URL (e.g. of imported news), else `null`.
   */
  static getItemImageUrl(item: { image?: DirectusFileReference; image_remote_url?: string | null } | null | undefined, buildFileUrl: (fileId: string) => string | null | undefined): string | null {
    const fileId = DirectusImageHelper.getFileId(item?.image);
    if (fileId) {
      const url = buildFileUrl(fileId);
      if (url) {
        return url;
      }
    }
    const remoteUrl = item?.image_remote_url?.trim();
    return remoteUrl || null;
  }

  static isSquare(dimensions: ImageDimensions): boolean {
    const longer = Math.max(dimensions.width, dimensions.height);
    if (longer <= 0) {
      return true;
    }
    return Math.abs(dimensions.width - dimensions.height) / longer <= DirectusImageHelper.SQUARE_TOLERANCE;
  }

  static getCenter(dimensions: ImageDimensions): ImageFocalPoint {
    return { x: Math.round(dimensions.width / 2), y: Math.round(dimensions.height / 2) };
  }

  /**
   * The square Directus cuts for a focal point: as large as the shorter side, centered on the point
   * and pushed back inside the image at the edges.
   */
  static getSquareRegion(dimensions: ImageDimensions, focalPoint: ImageFocalPoint | null | undefined): ImageSquareRegion {
    const size = Math.min(dimensions.width, dimensions.height);
    const point = focalPoint ?? DirectusImageHelper.getCenter(dimensions);
    const left = DirectusImageHelper.clamp(Math.round(point.x - size / 2), 0, dimensions.width - size);
    const top = DirectusImageHelper.clamp(Math.round(point.y - size / 2), 0, dimensions.height - size);
    return { left, top, size };
  }

  /**
   * The focal point moved to the middle of the square it produces. Points near an edge give the same
   * crop as the middle of that square, so storing the middle keeps the point where the crop is.
   */
  static normalizeFocalPoint(dimensions: ImageDimensions, focalPoint: ImageFocalPoint): ImageFocalPoint {
    const region = DirectusImageHelper.getSquareRegion(dimensions, focalPoint);
    return { x: Math.round(region.left + region.size / 2), y: Math.round(region.top + region.size / 2) };
  }

  /**
   * The focal point for a crop found on a scaled copy of the image (e.g. by smartcrop on a small
   * preview): the middle of the crop, scaled back to the original.
   */
  static focalPointFromCrop(crop: { x: number; y: number; width: number; height: number }, analysedDimensions: ImageDimensions, originalDimensions: ImageDimensions): ImageFocalPoint {
    const scaleX = analysedDimensions.width > 0 ? originalDimensions.width / analysedDimensions.width : 1;
    const scaleY = analysedDimensions.height > 0 ? originalDimensions.height / analysedDimensions.height : 1;
    const point = { x: (crop.x + crop.width / 2) * scaleX, y: (crop.y + crop.height / 2) * scaleY };
    return DirectusImageHelper.normalizeFocalPoint(originalDimensions, point);
  }

  static readFocalPoint(file: { focal_point_x?: number | null; focal_point_y?: number | null } | null | undefined): ImageFocalPoint | null {
    if (file?.focal_point_x === null || file?.focal_point_x === undefined || file?.focal_point_y === null || file?.focal_point_y === undefined) {
      return null;
    }
    return { x: file.focal_point_x, y: file.focal_point_y };
  }

  private static clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), Math.max(min, max));
  }
}
