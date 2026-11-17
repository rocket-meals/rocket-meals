import smartcrop from 'smartcrop';
import jpeg from 'jpeg-js';
import { DirectusImageHelper, type ImageDimensions, type ImageFocalPoint } from 'repo-depkit-common';

/** Small RGBA image as smartcrop reads it. */
export type RgbaImage = { width: number; height: number; data: Uint8Array | Uint8ClampedArray };

/**
 * Suggests the focal point of an image on the server, the same way the news editor does it in the
 * browser: smartcrop looks for the best square, its middle is the focal point.
 *
 * The backend has no canvas, so the pixels come from a small JPEG (Directus scales the file down)
 * decoded with jpeg-js, and smartcrop gets them through its `imageOperations`.
 */
export class ImageFocalPointSuggester {
  /** Edge length of the copy that is analysed, as in the editor. */
  static readonly ANALYSIS_SIZE = 256;

  /** The Directus transformation for the copy that is analysed. */
  static readonly ANALYSIS_TRANSFORMATION = { width: ImageFocalPointSuggester.ANALYSIS_SIZE, height: ImageFocalPointSuggester.ANALYSIS_SIZE, fit: 'inside', format: 'jpg', quality: 80 };

  static decodeJpeg(buffer: Uint8Array): RgbaImage {
    const decoded = jpeg.decode(buffer, { useTArray: true, formatAsRGBA: true });
    return { width: decoded.width, height: decoded.height, data: decoded.data };
  }

  /** The focal point for the original, found on a small copy of it. */
  static async suggest(analysed: RgbaImage, original: ImageDimensions): Promise<ImageFocalPoint> {
    const side = Math.min(analysed.width, analysed.height);
    // The shape of smartcrop's `ImgData`: width, height and the RGBA bytes.
    const imageData = { width: analysed.width, height: analysed.height, data: new Uint8ClampedArray(analysed.data) };
    const imageOperations = {
      open: (image: RgbaImage) => Promise.resolve(image),
      resample: (image: RgbaImage) => Promise.resolve(image),
      getData: () => Promise.resolve(imageData),
    };
    const result = await smartcrop.crop(analysed as unknown as CanvasImageSource, { width: side, height: side, minScale: 1, prescale: false, imageOperations } as never);
    return DirectusImageHelper.focalPointFromCrop(result.topCrop, analysed, original);
  }
}
