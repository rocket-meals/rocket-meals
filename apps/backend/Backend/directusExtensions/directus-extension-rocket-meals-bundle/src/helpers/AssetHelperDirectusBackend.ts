// https://docs.directus.io/reference/files.html#requesting-a-thumbnail
// GET /assets/<file-id>?fit=<fit>&width=<width>&height=<height>&quality=<quality>
// cover: Crop the image to fill the specified dimensions, maintaining aspect ratio
// contain: Fit the image within the specified dimensions, do not crop, leaving blank space
// inside: Fit the image within the specified dimensions, maintaining aspect ratio, crop if necessary
// outside: Fill the specified dimensions, maintaining aspect ratio, do not crop
import { DatabaseTypes } from 'repo-depkit-common';
import { DirectusFileTransformOptions } from './DirectusFilesAssetHelper';

export class AssetHelperTransformOptions {
  static DEFAULT_IMAGE_TRANSFORM: DirectusFileTransformOptions = {
    fit: 'cover',
    width: 512,
    height: 512,
    quality: 100,
  };

  static SMALL_IMAGE_TRANSFORM: DirectusFileTransformOptions = {
    fit: 'cover',
    width: 128,
    height: 128,
    quality: 90,
  };

  static ORIGINAL_IMAGE_TRANSFORM: DirectusFileTransformOptions = {
    fit: undefined,
    width: undefined,
    height: undefined,
    quality: undefined,
  };
}

export class BackendHelperDirectus {
  static getServerUrl(): string | undefined {
    return process.env.PUBLIC_URL;
  }
}

export class AssetHelperDirectusBackend {
  static getAssetImageURL(
    imageID: string | null | undefined | DatabaseTypes.DirectusFiles,
    imageTransform: DirectusFileTransformOptions = AssetHelperTransformOptions.DEFAULT_IMAGE_TRANSFORM,
  ): string | null {
    let usedImageId;

    // maybe imageID is a http:// or https:// url that we can use directly
    if (typeof imageID === 'string' && imageID.startsWith('http')) {
      return imageID;
    }

    // Assuming DirectusFiles is a type and we need to check if imageID is of that type
    if (typeof imageID === 'object' && imageID !== null && 'id' in imageID) {
      usedImageId = imageID.id;
    } else {
      usedImageId = imageID;
    }

    let assetImageUrl = AssetHelperDirectusBackend.getAssetURL(usedImageId);
    if (!assetImageUrl) {
      return null;
    } else {
      const FIT_MODE_DEFAULT = imageTransform.fit;
      const RESOLUTION_WIDTH = imageTransform.width;
      const RESOLUTION_HEIGHT = imageTransform.height;
      const QUALITY = imageTransform.quality;

      // https://docs.directus.io/reference/files.html#requesting-a-thumbnail
      let paramFit = FIT_MODE_DEFAULT ? 'fit=' + FIT_MODE_DEFAULT : null;
      let paramWidth = RESOLUTION_WIDTH ? 'width=' + RESOLUTION_WIDTH : null;
      let paramHeight = RESOLUTION_HEIGHT ? 'height=' + RESOLUTION_HEIGHT : null;
      let paramQuality = QUALITY ? 'quality=' + QUALITY : null;
      let paramAdd = undefined;
      if (paramFit || paramWidth || paramHeight || paramQuality) {
        paramAdd = '?';
        let paramsJoined = [paramFit, paramWidth, paramHeight, paramQuality].filter(param => param !== null).join('&');
        paramAdd += paramsJoined;
      }

      let finalAssetImageUrl = assetImageUrl;
      if (paramAdd) {
        finalAssetImageUrl += paramAdd;
        // so the finalAssetImageUrl will look like this: https://example.com/assets/123?fit=cover&width=512&height=512&quality=100
      }

      return finalAssetImageUrl;
    }
  }

  static getAssetURL(file_id: string | null | undefined): any {
    if (!file_id) {
      return null;
    }
    return BackendHelperDirectus.getServerUrl() + '/assets/' + file_id;
  }
}
