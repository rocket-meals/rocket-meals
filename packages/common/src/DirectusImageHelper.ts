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

/** A region in pixels of the original image. */
export type ImageCropRegion = { left: number; top: number; width: number; height: number };

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
  /** Height in pixels of crops for boxes (about twice the 180 to 220 points of the news list). */
  static readonly BOX_CROP_HEIGHT = 440;
  /** Aspect ratio of the news list box on phones (full width × 180), used to suggest and show its band. */
  static readonly NEWS_LIST_ASPECT_RATIO = 2;

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
    return DirectusImageHelper.buildCroppedAssetUrl({ ...options, width: size, height: size });
  }

  /**
   * The URL of a crop in any format (`fit=cover`), around the file's focal point like the square.
   * Used where a box is not square, e.g. the news list (about 2:1), so the image is cut once and
   * around the focal point instead of a square cut again in the middle.
   */
  static buildCroppedAssetUrl(options: Omit<SquareAssetUrlOptions, 'size'> & { width: number; height: number }): string {
    const quality = options.quality ?? DirectusImageHelper.DEFAULT_QUALITY;
    const root = options.serverUrl.endsWith('/') ? options.serverUrl : `${options.serverUrl}/`;
    const params = [`fit=cover`, `width=${Math.round(options.width)}`, `height=${Math.round(options.height)}`, `quality=${quality}`];
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
   * The size to request for a box on screen: its aspect ratio rounded to quarter steps (between 1:1
   * and 3:1, so a few sizes cover all screens and stay cached) at a fixed height in pixels.
   */
  static getCropSizeForBox(boxWidth: number, boxHeight: number, height: number = DirectusImageHelper.BOX_CROP_HEIGHT): { width: number; height: number } {
    const ratio = boxWidth > 0 && boxHeight > 0 ? boxWidth / boxHeight : 1;
    const rounded = Math.min(Math.max(Math.round(ratio * 4) / 4, 1), 3);
    return { width: Math.round(height * rounded), height };
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
    const region = DirectusImageHelper.getCropRegion(dimensions, 1, focalPoint);
    return { left: region.left, top: region.top, size: region.width };
  }

  /** The region Directus cuts for an aspect ratio (width / height) around a focal point. */
  static getCropRegion(dimensions: ImageDimensions, aspectRatio: number, focalPoint: ImageFocalPoint | null | undefined): ImageCropRegion {
    const fitsHeight = dimensions.width / dimensions.height > aspectRatio;
    const width = fitsHeight ? Math.round(dimensions.height * aspectRatio) : dimensions.width;
    const height = fitsHeight ? dimensions.height : Math.round(dimensions.width / aspectRatio);
    const point = focalPoint ?? DirectusImageHelper.getCenter(dimensions);
    const left = DirectusImageHelper.clamp(Math.round(point.x - width / 2), 0, dimensions.width - width);
    const top = DirectusImageHelper.clamp(Math.round(point.y - height / 2), 0, dimensions.height - height);
    return { left, top, width, height };
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
   * A focal point as the app uses it, moved to where it still changes a crop: across, the middle of
   * the square it produces (popup), in height the middle of the news list band (for landscape and
   * square images, where the square takes the whole height) or of the square (portrait images).
   */
  static normalizeFocalPointForApp(dimensions: ImageDimensions, focalPoint: ImageFocalPoint): ImageFocalPoint {
    const square = DirectusImageHelper.normalizeFocalPoint(dimensions, focalPoint);
    if (dimensions.height > dimensions.width) {
      return square;
    }
    const band = DirectusImageHelper.getCropRegion(dimensions, DirectusImageHelper.NEWS_LIST_ASPECT_RATIO, focalPoint);
    return { x: square.x, y: Math.round(band.top + band.height / 2) };
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

  /**
   * The focal point from two crops found on a scaled copy: the best square (popup, food offers) and
   * the best band in the format of the news list (about 2:1). The square decides where the point is
   * across the image, the band how high it is, so both crops keep their subject. For portrait images
   * the square decides both, because the band lies inside it anyway.
   */
  static focalPointFromCrops(
    square: { x: number; y: number; width: number; height: number },
    band: { x: number; y: number; width: number; height: number } | null,
    analysedDimensions: ImageDimensions,
    originalDimensions: ImageDimensions
  ): ImageFocalPoint {
    const fromSquare = DirectusImageHelper.focalPointFromCrop(square, analysedDimensions, originalDimensions);
    if (!band || originalDimensions.height > originalDimensions.width) {
      return fromSquare;
    }
    const scaleY = analysedDimensions.height > 0 ? originalDimensions.height / analysedDimensions.height : 1;
    return DirectusImageHelper.normalizeFocalPointForApp(originalDimensions, { x: fromSquare.x, y: (band.y + band.height / 2) * scaleY });
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
