import { DirectusImageHelper } from 'repo-depkit-common';

describe('DirectusImageHelper', () => {
  const landscape = { width: 1920, height: 1080 };

  it('builds the square URL the app has always loaded', () => {
    expect(DirectusImageHelper.buildSquareAssetUrl({ serverUrl: 'https://example.com', fileId: 'abc', size: 512, quality: 80 })).toBe('https://example.com/assets/abc?fit=cover&width=512&height=512&quality=80');
    expect(DirectusImageHelper.buildSquareAssetUrl({ serverUrl: '/', fileId: 'abc', useWebp: true })).toBe('/assets/abc?fit=cover&width=512&height=512&quality=80&format=webp');
  });

  it('can preview a focal point that is not saved yet', () => {
    expect(DirectusImageHelper.buildSquareAssetUrl({ serverUrl: '/', fileId: 'abc', focalPoint: { x: 0, y: 540.4 } })).toBe('/assets/abc?fit=cover&width=512&height=512&quality=80&focal_point_x=1&focal_point_y=540');
  });

  it('adds a version so a new focal point is not hidden by caches', () => {
    expect(DirectusImageHelper.buildSquareAssetUrl({ serverUrl: '/', fileId: 'abc', version: '2026-01-01T10:00:00' })).toBe('/assets/abc?fit=cover&width=512&height=512&quality=80&v=2026-01-01T10%3A00%3A00');
  });

  it('prefers the uploaded file over the remote URL', () => {
    const build = (id: string) => `file:${id}`;
    expect(DirectusImageHelper.getItemImageUrl({ image: 'a', image_remote_url: 'https://remote' }, build)).toBe('file:a');
    expect(DirectusImageHelper.getItemImageUrl({ image: { id: 'b' }, image_remote_url: null }, build)).toBe('file:b');
    expect(DirectusImageHelper.getItemImageUrl({ image: null, image_remote_url: ' https://remote ' }, build)).toBe('https://remote');
    expect(DirectusImageHelper.getItemImageUrl({ image: null, image_remote_url: '' }, build)).toBeNull();
  });

  it('cuts the same square as Directus around the focal point', () => {
    expect(DirectusImageHelper.getSquareRegion(landscape, null)).toEqual({ left: 420, top: 0, size: 1080 });
    expect(DirectusImageHelper.getSquareRegion(landscape, { x: 100, y: 500 })).toEqual({ left: 0, top: 0, size: 1080 });
    expect(DirectusImageHelper.getSquareRegion(landscape, { x: 1900, y: 500 })).toEqual({ left: 840, top: 0, size: 1080 });
    expect(DirectusImageHelper.getSquareRegion({ width: 1000, height: 2000 }, { x: 500, y: 1800 })).toEqual({ left: 0, top: 1000, size: 1000 });
  });

  it('turns a smartcrop result on a small copy into a focal point of the original', () => {
    const point = DirectusImageHelper.focalPointFromCrop({ x: 100, y: 0, width: 288, height: 288 }, { width: 512, height: 288 }, landscape);
    expect(point).toEqual({ x: 915, y: 540 });
    expect(DirectusImageHelper.normalizeFocalPoint(landscape, { x: 10, y: 10 })).toEqual({ x: 540, y: 540 });
  });

  it('knows square images and reads focal points', () => {
    expect(DirectusImageHelper.isSquare({ width: 1080, height: 1080 })).toBe(true);
    expect(DirectusImageHelper.isSquare({ width: 1080, height: 1070 })).toBe(true);
    expect(DirectusImageHelper.isSquare(landscape)).toBe(false);
    expect(DirectusImageHelper.readFocalPoint({ focal_point_x: 3, focal_point_y: 4 })).toEqual({ x: 3, y: 4 });
    expect(DirectusImageHelper.readFocalPoint({ focal_point_x: 3, focal_point_y: null })).toBeNull();
  });
});
